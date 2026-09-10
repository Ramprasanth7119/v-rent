/**
 * Razorpay Singapore — hosted Payment Link.
 *
 * A Payment Link is used rather than the in-page Checkout script because the
 * agent then enters card details on Razorpay's own page: V-RENT never touches
 * a PAN, which keeps us in PCI-DSS SAQ-A rather than SAQ-D.
 *
 * Razorpay SG carries both rails we care about — cards at 2.90% + S$0.40 and
 * PayNow at 0.60% + S$0.30 — so one merchant account covers both options.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { RAZORPAY } from '../config';
import { providerFetch } from '../http';
import type { CreateIntentInput, PaymentProvider, ProviderSession, VerifiedEvent } from '../types';

interface PaymentLinkResponse {
  id: string;
  short_url: string;
  expire_by?: number;
}

export const razorpayProvider: PaymentProvider = {
  id: 'razorpay',
  label: 'Card via Razorpay',

  isConfigured() {
    return Boolean(RAZORPAY.keyId && RAZORPAY.keySecret && RAZORPAY.webhookSecret);
  },

  async createSession(input: CreateIntentInput): Promise<ProviderSession> {
    const expiresAt = Date.now() + 30 * 60_000;
    const auth = Buffer.from(`${RAZORPAY.keyId}:${RAZORPAY.keySecret}`).toString('base64');

    const link = (await providerFetch(`${RAZORPAY.apiBase}/payment_links`, {
      method: 'POST',
      headers: { authorization: `Basic ${auth}` },
      // Razorpay dedupes on reference_id, so a retried POST cannot open a second link.
      idempotencyKey: input.ref,
      body: JSON.stringify({
        amount: input.subtotalCents,
        currency: 'SGD',
        accept_partial: false,
        reference_id: input.ref,
        description: `V-RENT ${input.planCode} plan, 12 months`,
        customer: { name: input.agentName, email: input.agentEmail },
        notify: { email: true, sms: false },
        reminder_enable: true,
        callback_url: input.returnUrl,
        callback_method: 'get',
        expire_by: Math.floor(expiresAt / 1000),
        notes: { ref: input.ref, agent_id: input.agentId, plan: input.planCode },
      }),
    })) as PaymentLinkResponse;

    return { providerRef: link.id, redirectUrl: link.short_url, expiresAt };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedEvent | null> {
    const signature = headers.get('x-razorpay-signature');
    // Razorpay guarantees this id is unique per event — it is our replay key.
    const eventId = headers.get('x-razorpay-event-id');
    if (!signature || !eventId) return null;

    const secret = RAZORPAY.webhookSecret || 'sandbox-razorpay-secret';
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const body = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        payment_link?: { entity?: { reference_id?: string; id?: string } };
        payment?: { entity?: { id?: string; error_description?: string; notes?: { ref?: string } } };
      };
    };

    const ref =
      body.payload?.payment_link?.entity?.reference_id ?? body.payload?.payment?.entity?.notes?.ref;
    if (!ref) return null;

    const event = body.event ?? '';
    const status =
      event === 'payment_link.paid' || event === 'payment.captured'
        ? 'paid'
        : event === 'payment_link.expired'
          ? 'expired'
          : event === 'payment_link.cancelled'
            ? 'cancelled'
            : 'failed';

    return {
      eventId,
      ref,
      status,
      providerRef: body.payload?.payment_link?.entity?.id ?? body.payload?.payment?.entity?.id ?? null,
      reason: body.payload?.payment?.entity?.error_description ?? null,
    };
  },
};

/** Signs a body exactly as Razorpay would. Used by the load test only. */
export function signRazorpay(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}
