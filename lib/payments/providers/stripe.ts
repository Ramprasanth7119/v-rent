/**
 * Stripe, in test mode.
 *
 * The scope names Stripe for checkout and subscription state and says plainly
 * that no real money is collected during the proof of concept. That is enforced
 * here rather than trusted: a key that does not begin `sk_test_` is refused, so
 * the POC cannot charge anybody even if a live key is pasted into the
 * environment by mistake.
 *
 * A hosted Checkout Session is used rather than an in-page card form, so card
 * details are entered on Stripe's own page and V-RENT never touches a card
 * number — the difference between PCI-DSS SAQ-A and SAQ-D.
 *
 * No SDK: Stripe's REST API is form-encoded HTTPS, and one fetch is cheaper
 * than a dependency.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { STRIPE } from '../config';
import { providerFetch } from '../http';
import type { CreateIntentInput, IntentStatus, PaymentProvider, ProviderSession, VerifiedEvent } from '../types';

interface CheckoutSession {
  id: string;
  url?: string;
  expires_at?: number;
}

/** Stripe wants form encoding, including for nested fields. */
function form(fields: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

/** Which of our statuses a Stripe event means. Anything else is ignored. */
const EVENT_STATUS: Record<string, IntentStatus> = {
  'checkout.session.completed': 'paid',
  'checkout.session.async_payment_succeeded': 'paid',
  'checkout.session.async_payment_failed': 'failed',
  'checkout.session.expired': 'expired',
  'payment_intent.payment_failed': 'failed',
};

export const stripeProvider: PaymentProvider = {
  id: 'stripe',
  label: 'Card via Stripe',

  isConfigured() {
    // Test keys only, deliberately. See the note at the top of this file.
    return STRIPE.secretKey.startsWith('sk_test_') && Boolean(STRIPE.webhookSecret);
  },

  async createSession(input: CreateIntentInput): Promise<ProviderSession> {
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + 30 * 60;

    const session = (await providerFetch(`${STRIPE.apiBase}/checkout/sessions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${STRIPE.secretKey}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      // Stripe dedupes on this key, so a retried POST cannot open a second
      // session and charge an agent twice.
      idempotencyKey: input.ref,
      body: form({
        mode: 'payment',
        'line_items[0][quantity]': 1,
        'line_items[0][price_data][currency]': 'sgd',
        'line_items[0][price_data][unit_amount]': input.subtotalCents,
        'line_items[0][price_data][product_data][name]': `V-RENT ${input.planCode} plan`,
        'line_items[0][price_data][product_data][description]': '12 months, billed yearly',
        customer_email: input.agentEmail,
        client_reference_id: input.ref,
        'metadata[ref]': input.ref,
        'metadata[agent_id]': input.agentId,
        'metadata[plan]': input.planCode,
        success_url: `${input.returnUrl}?ref=${encodeURIComponent(input.ref)}&outcome=success`,
        cancel_url: `${input.returnUrl}?ref=${encodeURIComponent(input.ref)}&outcome=cancelled`,
        expires_at: expiresAtSeconds,
      }),
    })) as CheckoutSession;

    return {
      providerRef: session.id,
      redirectUrl: session.url,
      expiresAt: (session.expires_at ?? expiresAtSeconds) * 1000,
    };
  },

  /**
   * Stripe signs `t=<timestamp>,v1=<hmac>` over `timestamp.rawBody`. The body
   * must be verified before it is parsed, and the timestamp checked, or a
   * captured webhook could be replayed indefinitely.
   */
  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedEvent | null> {
    const header = headers.get('stripe-signature');
    if (!header) return null;

    const parts = Object.fromEntries(
      header.split(',').map((pair) => {
        const [k, v] = pair.split('=');
        return [k?.trim(), v?.trim()];
      }),
    ) as { t?: string; v1?: string };
    if (!parts.t || !parts.v1) return null;

    // Five minutes, which is Stripe's own recommendation.
    const ageSeconds = Math.abs(Date.now() / 1000 - Number(parts.t));
    if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return null;

    const expected = createHmac('sha256', STRIPE.webhookSecret)
      .update(`${parts.t}.${rawBody}`)
      .digest('hex');
    const given = Buffer.from(parts.v1, 'utf8');
    const mine = Buffer.from(expected, 'utf8');
    if (given.length !== mine.length || !timingSafeEqual(given, mine)) return null;

    let event: {
      id?: string;
      type?: string;
      data?: { object?: { id?: string; client_reference_id?: string; metadata?: Record<string, string>; last_payment_error?: { message?: string } } };
    };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return null;
    }

    const status = EVENT_STATUS[event.type ?? ''];
    const object = event.data?.object;
    const ref = object?.client_reference_id ?? object?.metadata?.ref;
    if (!status || !event.id || !ref) return null;

    return {
      eventId: event.id,
      ref,
      status,
      providerRef: object?.id ?? null,
      reason: object?.last_payment_error?.message ?? null,
    };
  },
};
