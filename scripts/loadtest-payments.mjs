/**
 * Concurrency check for the payment endpoints.
 *
 *   node scripts/loadtest-payments.mjs [baseUrl] [users]
 *
 * It does not measure throughput — it measures correctness while the routes are
 * under simultaneous load, which is the thing that actually breaks payment code:
 *
 *   1  100 agents check out at once            -> 100 distinct payments, no 5xx
 *   2  one agent double-clicks 25 times        -> exactly 1 payment
 *   3  every webhook delivered 3 times at once -> applied exactly once each
 *   4  "paid" and "failed" race for one payment-> the first terminal state sticks
 *   5  400 status polls at once                -> every one answered
 *   6  one abusive IP floods the create route  -> throttled, others unaffected
 *
 * Virtual users carry distinct X-Forwarded-For values because the rate limiter
 * is per client IP; 100 real agents are 100 addresses, not one.
 */

import { createHmac, randomUUID } from 'node:crypto';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const USERS = Number(process.argv[3] ?? 100);

const SECRETS = {
  paynow: process.env.PAYNOW_WEBHOOK_SECRET || 'sandbox-paynow-secret',
  razorpay: process.env.RAZORPAY_WEBHOOK_SECRET || 'sandbox-razorpay-secret',
  dodo: process.env.DODO_WEBHOOK_SECRET || 'whsec_sandbox',
};

const PLANS = ['starter', 'professional', 'premium'];
const PROVIDERS = ['paynow', 'razorpay', 'dodo'];

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

/**
 * Bounded fan-out. Node's own socket pool, not the server, is the first thing
 * to give way when the harness opens a thousand sockets at once, so the test
 * keeps its own concurrency honest and measures the server instead of itself.
 */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor;
      cursor += 1;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

const pct = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]);
};

async function createIntent({ ip, idempotencyKey, provider, planCode }) {
  const started = Date.now();
  const res = await fetch(`${BASE}/api/payments/intents`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
      'x-forwarded-for': ip,
    },
    body: JSON.stringify({
      provider,
      planCode,
      agentId: `agent-${ip}`,
      agentEmail: `agent-${ip}@example.com`,
      agentName: 'Load Test Agent',
    }),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body, ms: Date.now() - started };
}

function signedWebhook(provider, ref, outcome, eventSuffix = '') {
  const eventId = `lt_${provider}_${ref}_${outcome}${eventSuffix}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const success = outcome === 'paid';
  let body;
  const headers = { 'content-type': 'application/json' };

  if (provider === 'paynow') {
    body = JSON.stringify({ reference: ref, status: success ? 'credited' : 'failed', reason: success ? null : 'declined' });
    headers['x-vrent-event-id'] = eventId;
    headers['x-vrent-timestamp'] = timestamp;
    headers['x-vrent-signature'] = createHmac('sha256', SECRETS.paynow).update(`${timestamp}.${body}`).digest('hex');
  } else if (provider === 'razorpay') {
    body = JSON.stringify({
      event: success ? 'payment_link.paid' : 'payment.failed',
      payload: {
        payment_link: { entity: { id: `plink_${ref}`, reference_id: ref } },
        payment: { entity: { id: `pay_${ref}`, notes: { ref }, error_description: success ? null : 'declined' } },
      },
    });
    headers['x-razorpay-event-id'] = eventId;
    headers['x-razorpay-signature'] = createHmac('sha256', SECRETS.razorpay).update(body).digest('hex');
  } else {
    body = JSON.stringify({
      type: success ? 'payment.succeeded' : 'payment.failed',
      data: { payment_id: `dodo_${ref}`, metadata: { ref }, error_message: success ? null : 'declined' },
    });
    const key = SECRETS.dodo.startsWith('whsec_')
      ? Buffer.from(SECRETS.dodo.slice(6), 'base64')
      : Buffer.from(SECRETS.dodo);
    headers['webhook-id'] = eventId;
    headers['webhook-timestamp'] = timestamp;
    headers['webhook-signature'] =
      'v1,' + createHmac('sha256', key).update(`${eventId}.${timestamp}.${body}`).digest('base64');
  }
  return { provider, body, headers };
}

async function postWebhook({ provider, body, headers }) {
  const started = Date.now();
  const res = await fetch(`${BASE}/api/payments/webhooks/${provider}`, { method: 'POST', headers, body });
  const parsed = await res.json().catch(() => null);
  return { status: res.status, body: parsed, ms: Date.now() - started };
}

async function main() {
  console.log(`\nPayment concurrency check — ${BASE}, ${USERS} simultaneous agents\n`);

  // 1 — a burst of independent checkouts.
  const burst = await mapLimit(
    Array.from({ length: USERS }, (_, i) => i),
    Math.min(USERS, 256),
    (i) =>
      createIntent({
        ip: `10.1.${Math.floor(i / 250)}.${i % 250}`,
        idempotencyKey: randomUUID(),
        provider: PROVIDERS[i % PROVIDERS.length],
        planCode: PLANS[i % PLANS.length],
      }),
  );
  const created = burst.filter((r) => r.status === 201);
  const serverErrors = burst.filter((r) => r.status >= 500);
  const refs = created.map((r) => r.body.ref);
  const latencies = burst.map((r) => r.ms);

  check(`${USERS} concurrent checkouts all created`, created.length === USERS, `${created.length}/${USERS} created`);
  check('no 5xx under burst', serverErrors.length === 0, `${serverErrors.length} server errors`);
  check('every payment got a unique reference', new Set(refs).size === refs.length, `${new Set(refs).size} unique`);
  check(
    'PayNow QRs were generated',
    created.filter((r) => r.body.provider === 'paynow').every((r) => r.body.qr?.dataUrl?.startsWith('data:image/png')),
  );
  check(
    'hosted providers returned a checkout URL',
    created.filter((r) => r.body.provider !== 'paynow').every((r) => typeof r.body.redirectUrl === 'string'),
  );
  check(
    'GST split adds up on every intent',
    created.every((r) => r.body.subtotalCents + r.body.tax.cents === r.body.totalCents),
  );
  console.log(`      latency p50 ${pct(latencies, 50)}ms · p95 ${pct(latencies, 95)}ms · max ${Math.max(...latencies)}ms`);

  // 2 — the same agent hammering the button with one idempotency key.
  const sharedKey = randomUUID();
  const doubleClicks = await Promise.all(
    Array.from({ length: 25 }, () =>
      createIntent({ ip: '10.9.9.9', idempotencyKey: sharedKey, provider: 'paynow', planCode: 'professional' }),
    ),
  );
  const clickRefs = new Set(doubleClicks.filter((r) => r.body?.ref).map((r) => r.body.ref));
  check('25 simultaneous clicks produced one payment', clickRefs.size === 1, `${clickRefs.size} payments created`);

  // 3 — triple delivery of every webhook, all at once.
  const deliveries = [];
  for (const r of created) {
    const event = signedWebhook(r.body.provider, r.body.ref, 'paid');
    deliveries.push(event, event, event); // same event id three times over
  }
  const webhookResults = await mapLimit(deliveries, 256, postWebhook);
  const appliedByRef = new Map();
  for (let i = 0; i < webhookResults.length; i += 1) {
    const ref = created[Math.floor(i / 3)].body.ref;
    if (webhookResults[i].body?.applied) appliedByRef.set(ref, (appliedByRef.get(ref) ?? 0) + 1);
  }
  const overApplied = [...appliedByRef.values()].filter((n) => n !== 1);
  check('every webhook answered 200', webhookResults.every((r) => r.status === 200));
  check(
    'each payment applied exactly once despite 3x delivery',
    appliedByRef.size === created.length && overApplied.length === 0,
    `${appliedByRef.size}/${created.length} applied once`,
  );
  console.log(`      webhook latency p95 ${pct(webhookResults.map((r) => r.ms), 95)}ms`);

  // 4 — a late failure racing a success on a fresh payment.
  const racer = await createIntent({
    ip: '10.8.8.8',
    idempotencyKey: randomUUID(),
    provider: 'razorpay',
    planCode: 'starter',
  });
  const raceRef = racer.body.ref;
  await Promise.all([
    postWebhook(signedWebhook('razorpay', raceRef, 'paid')),
    postWebhook(signedWebhook('razorpay', raceRef, 'failed')),
    postWebhook(signedWebhook('razorpay', raceRef, 'failed', '_b')),
  ]);
  const raced = await fetch(`${BASE}/api/payments/intents/${raceRef}`).then((r) => r.json());
  check('a terminal state is never overwritten', raced.status === 'paid', `ended as ${raced.status}`);

  // 5 — the poll endpoint under fan-out.
  const pollTargets = refs.slice(0, Math.min(refs.length, 100));
  const pollJobs = pollTargets.flatMap((ref) => [ref, ref, ref, ref]);
  const polls = await mapLimit(pollJobs, 256, (ref) =>
    fetch(`${BASE}/api/payments/intents/${ref}`, { cache: 'no-store' }),
  );
  check(`${polls.length} concurrent status polls all answered`, polls.every((r) => r.ok));

  // 6 — a forged signature must never move money.
  const forged = await fetch(`${BASE}/api/payments/webhooks/razorpay`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-razorpay-event-id': 'forged', 'x-razorpay-signature': 'deadbeef' },
    body: JSON.stringify({ event: 'payment_link.paid', payload: { payment_link: { entity: { reference_id: refs[0] } } } }),
  });
  check('an unsigned webhook is rejected', forged.status === 401, `got ${forged.status}`);

  // 7 — PayNow's S$2,000 daily cap is enforced server-side, not just hidden in the UI.
  const overCap = await createIntent({
    ip: '10.55.55.55',
    idempotencyKey: randomUUID(),
    provider: 'paynow',
    planCode: 'premium', // S$2,388
  });
  check(
    'PayNow is refused above its S$2,000 daily cap',
    overCap.status === 400 && overCap.body?.code === 'paynow_limit_exceeded',
    `got ${overCap.status} ${overCap.body?.code ?? ''}`,
  );

  // 8 — one noisy client is throttled without hurting anyone else.
  const flood = await Promise.all(
    Array.from({ length: 40 }, () =>
      createIntent({ ip: '10.66.66.66', idempotencyKey: randomUUID(), provider: 'paynow', planCode: 'starter' }),
    ),
  );
  const throttled = flood.filter((r) => r.status === 429).length;
  const bystander = await createIntent({
    ip: '10.77.77.77',
    idempotencyKey: randomUUID(),
    provider: 'paynow',
    planCode: 'starter',
  });
  check('a flooding IP is rate limited', throttled > 0, `${throttled}/40 throttled`);
  check('other agents are unaffected by the flood', bystander.status === 201, `bystander got ${bystander.status}`);

  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nLoad test could not run:', err.message);
  console.error('Is the dev server up?  npm run dev\n');
  process.exit(1);
});
