/**
 * POST /api/payments/webhooks/:provider — the only thing that marks a payment paid.
 *
 * Order of operations is not negotiable:
 *   1. read the RAW body as text (parsing first would break the signature);
 *   2. verify the signature in constant time;
 *   3. dedupe on the provider event id;
 *   4. apply a forward-only state transition under a per-payment lock;
 *   5. answer 200 quickly — providers retry on anything else, and a slow
 *      handler turns one retry into a stampede.
 *
 * An unverifiable body gets 401 and is never parsed. A verified event for an
 * unknown reference still gets 200, because asking the provider to retry
 * forever against a reference we do not have helps nobody; it is logged for
 * reconciliation instead.
 */

import { NextResponse } from 'next/server';
import { getProvider } from '../../../../../lib/payments';
import { applyWebhook } from '../../../../../lib/payments/service';
import { logged } from '../../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 1_000_000;

async function POST_handler(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: providerId } = await ctx.params;
  const provider = getProvider(providerId);
  if (!provider) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  }

  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let event;
  try {
    event = await provider.verifyWebhook(raw, req.headers);
  } catch (err) {
    console.error(`[payments] ${providerId} webhook verification threw`, err);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (!event) {
    // Signature mismatch, missing headers, or a stale timestamp.
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
  }

  const outcome = await applyWebhook(event);

  if (outcome.reason === 'unknown_ref') {
    console.warn(`[payments] ${providerId} event ${event.eventId} references unknown payment ${event.ref}`);
  }

  return NextResponse.json(
    { received: true, applied: outcome.applied, reason: outcome.reason, status: outcome.status ?? event.status },
    { status: 200, headers: { 'cache-control': 'no-store' } },
  );
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
