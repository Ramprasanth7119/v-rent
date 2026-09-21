/**
 * POST /api/payments/intents — open a payment for the signed-in agent.
 *
 * The client must send an Idempotency-Key header. Fifty agents clicking Pay at
 * the same instant produce fifty intents; one agent clicking Pay five times
 * produces one, because all five carry the same key.
 *
 * Who is paying is read from the session cookie and never from the body. It
 * used to be taken from the body, which was harmless while the only thing on
 * sale was a subscription the agent activated on their own screen. It stopped
 * being harmless the moment a payment could add credit to a named account: an
 * account id in a request body is an invitation to name somebody else's.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { TokenBucket } from '../../../../lib/payments/concurrency';
import { PAYMENTS } from '../../../../lib/payments/config';
import { PaymentError, createIntent, toPublicIntent } from '../../../../lib/payments/service';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = new TokenBucket(PAYMENTS.rateLimit.capacity, PAYMENTS.rateLimit.refillPerSecond);

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

async function POST_handler(req: Request) {
  const retryAfter = limiter.take(clientKey(req));
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: 'Too many payment attempts, please wait a moment.', code: 'rate_limited' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    );
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Body must be JSON', code: 'bad_body' }, { status: 400 });
  }

  const idempotencyKey = req.headers.get('idempotency-key') ?? '';
  const origin = req.headers.get('origin') ?? new URL(req.url).origin;

  try {
    const intent = await createIntent({
      provider: String(body.provider ?? ''),
      planCode: String(body.planCode ?? ''),
      /* From the cookie. The body is not consulted for identity, so a payment
         can only ever be opened against the account that opened it. */
      agentId: user.id,
      agentEmail: user.email,
      agentName: user.fullName,
      idempotencyKey,
      origin,
    });
    return NextResponse.json(toPublicIntent(intent), {
      status: 201,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (err) {
    if (err instanceof PaymentError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error('[payments] create intent failed', err);
    return NextResponse.json({ error: 'Could not start the payment', code: 'internal' }, { status: 500 });
  }
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
