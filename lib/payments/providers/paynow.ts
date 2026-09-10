/**
 * PayNow — direct rail, no gateway in the middle.
 *
 * V-RENT generates a dynamic QR against its own corporate UEN. The agent scans
 * it in any Singapore banking app and the money lands in V-RENT's bank account
 * with our reference attached. There is no card network and no chargeback.
 *
 * Confirmation does not arrive from a card processor; it arrives from whatever
 * watches the bank account. Two production shapes, same route:
 *   a) a PSP that resells PayNow (Razorpay SG, HitPay, Stripe) posts its own webhook;
 *   b) a bank corporate API / statement poller matches the credit by reference
 *      and posts to this endpoint itself.
 * Either way the callback is signed with PAYNOW_WEBHOOK_SECRET, so this file
 * only has to know one contract.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { PAYMENTS, PAYNOW } from '../config';
import { buildPayNowPayload, renderQr } from '../paynow-qr';
import type { CreateIntentInput, PaymentProvider, ProviderSession, VerifiedEvent } from '../types';

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const paynowProvider: PaymentProvider = {
  id: 'paynow',
  label: 'PayNow',

  isConfigured() {
    return Boolean(PAYNOW.uen && PAYNOW.webhookSecret);
  },

  async createSession(input: CreateIntentInput): Promise<ProviderSession> {
    const expiresAt = Date.now() + PAYMENTS.qrTtlMinutes * 60_000;
    // A sandbox UEN keeps the QR structurally valid for a demo without exposing a real one.
    const uen = PAYNOW.uen || '202512345K';
    const payload = buildPayNowPayload({
      uen,
      merchantName: PAYNOW.merchantName,
      amountCents: input.subtotalCents,
      reference: input.ref,
      expiresAt: new Date(expiresAt),
    });
    return {
      providerRef: input.ref, // PayNow has no order id; our reference is the key.
      qr: { payload, dataUrl: await renderQr(payload) },
      expiresAt,
    };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedEvent | null> {
    const signature = headers.get('x-vrent-signature');
    const eventId = headers.get('x-vrent-event-id');
    const timestamp = headers.get('x-vrent-timestamp');
    if (!signature || !eventId || !timestamp) return null;

    // Reject stale signatures so a captured callback cannot be replayed later.
    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(age) || age > 300) return null;

    const secret = PAYNOW.webhookSecret || 'sandbox-paynow-secret';
    const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
    if (!safeEqual(signature, expected)) return null;

    const body = JSON.parse(rawBody) as {
      reference?: string;
      status?: string;
      amount_cents?: number;
      reason?: string;
    };
    if (!body.reference) return null;

    return {
      eventId,
      ref: body.reference,
      status: body.status === 'credited' ? 'paid' : body.status === 'expired' ? 'expired' : 'failed',
      providerRef: body.reference,
      reason: body.reason ?? null,
    };
  },
};

/** Exported so the load test and the bank-side worker can sign identically. */
export function signPayNowCallback(rawBody: string, timestamp: string, secret: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}
