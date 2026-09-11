/**
 * POST /api/payments/intents — open a payment for the signed-in agent.
 *
 * The client must send an Idempotency-Key header. Fifty agents clicking Pay at
 * the same instant produce fifty intents; one agent clicking Pay five times
 * produces one, because all five carry the same key.
 */

import { NextResponse } from 'next/server';
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
      // In production these come from the session, never from the body. The
      // prototype has no auth, so the demo identity is accepted as a fallback.
      agentId: String(body.agentId ?? 'demo-agent'),
      agentEmail: String(body.agentEmail ?? 'agent@example.com'),
      agentName: String(body.agentName ?? 'V-RENT agent'),
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
