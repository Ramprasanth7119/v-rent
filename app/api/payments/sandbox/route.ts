/**
 * POST /api/payments/sandbox — stands in for the provider, in sandbox mode only.
 *
 * It builds a payload in the provider's real shape, signs it with the same
 * secret the verifier uses, and pushes it through the same verify-then-apply
 * path a live webhook takes. Nothing here shortcuts the state machine, so the
 * demo exercises the production code rather than a parallel happy path.
 *
 * Returns 404 whenever PAYMENTS_MODE=live, so it cannot exist in production.
 */

import { NextResponse } from 'next/server';
import { getProvider, isProviderId } from '../../../../lib/payments';
import { DODO, PAYMENTS, PAYNOW, RAZORPAY } from '../../../../lib/payments/config';
import { signDodo } from '../../../../lib/payments/providers/dodo';
import { signPayNowCallback } from '../../../../lib/payments/providers/paynow';
import { signRazorpay } from '../../../../lib/payments/providers/razorpay';
import { applyWebhook } from '../../../../lib/payments/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!PAYMENTS.sandbox) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { ref, provider, outcome } = (await req.json()) as {
    ref?: string;
    provider?: string;
    outcome?: 'paid' | 'failed';
  };

  if (!ref || !provider || !isProviderId(provider)) {
    return NextResponse.json({ error: 'ref and provider are required' }, { status: 400 });
  }

  const impl = getProvider(provider);
  if (!impl) return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });

  const success = outcome !== 'failed';
  const eventId = `sbx_${provider}_${ref}_${success ? 'ok' : 'fail'}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const headers = new Headers();
  let body: string;

  if (provider === 'paynow') {
    body = JSON.stringify({
      reference: ref,
      status: success ? 'credited' : 'failed',
      reason: success ? null : 'sandbox_declined',
    });
    headers.set('x-vrent-event-id', eventId);
    headers.set('x-vrent-timestamp', timestamp);
    headers.set('x-vrent-signature', signPayNowCallback(body, timestamp, PAYNOW.webhookSecret || 'sandbox-paynow-secret'));
  } else if (provider === 'razorpay') {
    body = JSON.stringify({
      event: success ? 'payment_link.paid' : 'payment.failed',
      payload: {
        payment_link: { entity: { id: `plink_sbx_${ref}`, reference_id: ref } },
        payment: { entity: { id: `pay_sbx_${ref}`, notes: { ref }, error_description: success ? null : 'sandbox_declined' } },
      },
    });
    headers.set('x-razorpay-event-id', eventId);
    headers.set('x-razorpay-signature', signRazorpay(body, RAZORPAY.webhookSecret || 'sandbox-razorpay-secret'));
  } else {
    body = JSON.stringify({
      type: success ? 'payment.succeeded' : 'payment.failed',
      data: { payment_id: `dodo_sbx_${ref}`, metadata: { ref }, error_message: success ? null : 'sandbox_declined' },
    });
    headers.set('webhook-id', eventId);
    headers.set('webhook-timestamp', timestamp);
    headers.set('webhook-signature', signDodo(eventId, timestamp, body, DODO.webhookSecret || 'whsec_sandbox'));
  }

  const event = await impl.verifyWebhook(body, headers);
  if (!event) {
    return NextResponse.json({ error: 'Sandbox signature failed to verify' }, { status: 500 });
  }

  const result = await applyWebhook(event);
  return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
}
