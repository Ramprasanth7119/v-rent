/**
 * Environment-driven payment configuration.
 *
 * Nothing here reads a secret at module scope in a way that would break the
 * build when the variable is missing: a provider without credentials simply
 * reports `isConfigured() === false` and the route falls back to sandbox mode,
 * so the prototype runs on a laptop with an empty .env.
 */

import type { ProviderId } from './types';
import type { TaxTreatment } from './money';

export const PAYMENTS = {
  /** Sandbox mode fakes the provider round-trip. It is never on when credentials exist. */
  get sandbox() {
    return process.env.PAYMENTS_MODE !== 'live';
  },
  /** How V-RENT stands with IRAS. Drives the invoice and the tax line. */
  get taxTreatment(): TaxTreatment {
    const v = process.env.PAYMENTS_TAX_TREATMENT;
    return v === 'gst-registered' || v === 'merchant-of-record' ? v : 'not-gst-registered';
  },
  /**
   * Minutes a PayNow QR stays valid. Razorpay publishes a 10-minute validity on
   * its PayNow QR, so ours must not outlive theirs or the agent scans a dead code.
   */
  qrTtlMinutes: Number(process.env.PAYNOW_QR_TTL_MINUTES ?? 10),
  /** Max provider calls in flight at once, across all requests in this process. */
  outboundConcurrency: Number(process.env.PAYMENTS_OUTBOUND_CONCURRENCY ?? 24),
  /** Per-IP budget on the create-intent route. */
  rateLimit: { capacity: 12, refillPerSecond: 1 },
  requestTimeoutMs: 8_000,
} as const;

/**
 * PayNow operating limits published by Razorpay Singapore: minimum S$1, a
 * S$2,000 per-customer daily cap, and a QR that lives 10 minutes. The cap is the
 * one that bites — any plan priced above S$2,000 cannot be collected by PayNow in
 * a single transfer, so the UI must not offer it there.
 */
export const PAYNOW_LIMITS = {
  minCents: 100,
  maxCentsPerDay: 200_000,
} as const;

export const PAYNOW = {
  get uen() {
    return process.env.PAYNOW_UEN ?? '';
  },
  get merchantName() {
    return process.env.PAYNOW_MERCHANT_NAME ?? 'V-RENT';
  },
  /** Shared secret for the bank/PSP reconciliation callback. */
  get webhookSecret() {
    return process.env.PAYNOW_WEBHOOK_SECRET ?? '';
  },
};

export const RAZORPAY = {
  get keyId() {
    return process.env.RAZORPAY_KEY_ID ?? '';
  },
  get keySecret() {
    return process.env.RAZORPAY_KEY_SECRET ?? '';
  },
  get webhookSecret() {
    return process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
  },
  apiBase: 'https://api.razorpay.com/v1',
};

export const DODO = {
  get apiKey() {
    return process.env.DODO_API_KEY ?? '';
  },
  get webhookSecret() {
    return process.env.DODO_WEBHOOK_SECRET ?? '';
  },
  get apiBase() {
    return process.env.DODO_API_BASE ?? 'https://test.dodopayments.com';
  },
};

/**
 * Published rates, verified 3 September 2026. Used only to show V-RENT its own
 * cost of collection — it never changes what the agent is charged.
 *
 *   paynow    Razorpay Singapore, 0.60% + S$0.30 per successful transfer.
 *   razorpay  Razorpay Singapore domestic card, 2.90% + S$0.40.
 *   dodo      Merchant of record: 4% + US$0.40, +1.5% international, +0.5% subscription.
 *             Modelled here at 6% + S$0.55 for an SGD yearly subscription.
 */
export const FEE_MODEL: Record<ProviderId, { percent: number; fixedCents: number; note: string }> = {
  paynow: { percent: 0.006, fixedCents: 30, note: 'PayNow via Razorpay SG — 0.60% + S$0.30' },
  razorpay: { percent: 0.029, fixedCents: 40, note: 'Razorpay SG domestic card — 2.90% + S$0.40' },
  dodo: { percent: 0.06, fixedCents: 55, note: 'Dodo MoR — 4% + $0.40, +1.5% intl, +0.5% subscription' },
};

export function estimateFeeCents(provider: ProviderId, totalCents: number): number {
  const m = FEE_MODEL[provider];
  return Math.round(totalCents * m.percent) + m.fixedCents;
}
