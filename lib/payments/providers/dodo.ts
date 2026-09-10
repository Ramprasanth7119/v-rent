/**
 * Dodo Payments — merchant of record.
 *
 * The commercial difference matters more than the code: with Dodo, Dodo is the
 * seller on the agent's receipt. It collects and remits GST/VAT/sales tax in
 * every jurisdiction it sells into, absorbs chargebacks, and pays V-RENT a net
 * amount as a supplier. That removes a tax obligation and adds a margin cost.
 *
 * Webhooks follow the Standard Webhooks spec: headers webhook-id,
 * webhook-timestamp, webhook-signature, signed over "id.timestamp.body".
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { DODO } from '../config';
import { providerFetch } from '../http';
import type { CreateIntentInput, PaymentProvider, ProviderSession, VerifiedEvent } from '../types';

interface CheckoutResponse {
  session_id?: string;
  checkout_url?: string;
  payment_link?: string;
  payment_id?: string;
}

export const dodoProvider: PaymentProvider = {
  id: 'dodo',
  label: 'Card via Dodo',

  isConfigured() {
    return Boolean(DODO.apiKey && DODO.webhookSecret);
  },

  async createSession(input: CreateIntentInput): Promise<ProviderSession> {
    const expiresAt = Date.now() + 30 * 60_000;

    const session = (await providerFetch(`${DODO.apiBase}/checkouts`, {
      method: 'POST',
      headers: { authorization: `Bearer ${DODO.apiKey}` },
      idempotencyKey: input.ref,
      body: JSON.stringify({
        product_cart: [{ product_id: input.planCode, quantity: 1 }],
        customer: { email: input.agentEmail, name: input.agentName },
        billing_currency: 'SGD',
        return_url: input.returnUrl,
        // Metadata is the only thing that survives the round trip, so our ref lives here.
        metadata: { ref: input.ref, agent_id: input.agentId, plan: input.planCode },
      }),
    })) as CheckoutResponse;

    const url = session.checkout_url ?? session.payment_link;
    if (!url) throw new Error('Dodo did not return a checkout URL');

    return { providerRef: session.session_id ?? session.payment_id ?? input.ref, redirectUrl: url, expiresAt };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedEvent | null> {
    const id = headers.get('webhook-id');
    const timestamp = headers.get('webhook-timestamp');
    const signatureHeader = headers.get('webhook-signature');
    if (!id || !timestamp || !signatureHeader) return null;

    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(age) || age > 300) return null;

    const rawSecret = DODO.webhookSecret || 'whsec_sandbox';
    // Standard Webhooks secrets are "whsec_" + base64 of the raw key bytes.
    const key = rawSecret.startsWith('whsec_')
      ? Buffer.from(rawSecret.slice(6), 'base64')
      : Buffer.from(rawSecret);

    const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64');

    // The header carries a space-separated list of "v1,<sig>" so keys can rotate.
    const match = signatureHeader.split(' ').some((part) => {
      const value = part.startsWith('v1,') ? part.slice(3) : part;
      const a = Buffer.from(value);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    });
    if (!match) return null;

    const body = JSON.parse(rawBody) as {
      type?: string;
      data?: { metadata?: { ref?: string }; payment_id?: string; error_message?: string };
    };
    const ref = body.data?.metadata?.ref;
    if (!ref) return null;

    const type = body.type ?? '';
    const status =
      type === 'payment.succeeded' || type === 'subscription.active'
        ? 'paid'
        : type === 'payment.cancelled'
          ? 'cancelled'
          : type === 'payment.failed'
            ? 'failed'
            : 'failed';

    return { eventId: id, ref, status, providerRef: body.data?.payment_id ?? null, reason: body.data?.error_message ?? null };
  },
};

/** Signs a body exactly as Dodo would. Used by the load test only. */
export function signDodo(id: string, timestamp: string, rawBody: string, secret: string): string {
  const key = secret.startsWith('whsec_') ? Buffer.from(secret.slice(6), 'base64') : Buffer.from(secret);
  return 'v1,' + createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64');
}
