/**
 * Payment orchestration — the only module a route handler talks to.
 *
 * Invariants this file exists to hold:
 *   - the amount is always looked up server-side from the plan catalogue, never
 *     read from the request body;
 *   - one idempotency key produces exactly one intent, no matter how many
 *     concurrent requests carry it;
 *   - a subscription is activated by a verified webhook and nothing else;
 *   - webhook handling is idempotent and order-independent.
 */

import { randomBytes } from 'node:crypto';
import { PLANS } from '../phase1/data';
import { PAYMENTS, PAYNOW, PAYNOW_LIMITS, estimateFeeCents } from './config';
import { getProvider } from './index';
import { money, taxLineFor } from './money';
import { buildPayNowPayload, renderQr } from './paynow-qr';
import { canTransition, claimEvent, claimIdempotencyKey, getIntent, putIntent, withIntent } from './store';
import type { CreateIntentInput, PaymentIntent, ProviderId, ProviderSession, VerifiedEvent } from './types';

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

/** Crockford-ish base32, no vowels, so a reference read aloud over the phone survives. */
function newRef(): string {
  const alphabet = '0123456789BCDFGHJKLMNPQRSTVWXZ';
  const bytes = randomBytes(8);
  let tail = '';
  for (const b of bytes) tail += alphabet[b % alphabet.length];
  const d = new Date();
  const stamp =
    `${String(d.getFullYear()).slice(2)}` +
    `${String(d.getMonth() + 1).padStart(2, '0')}` +
    `${String(d.getDate()).padStart(2, '0')}`;
  return `VR${stamp}${tail}`; // 18 chars, fits the 25-char PayNow reference field.
}

export function planByCode(code: string) {
  return PLANS.find((p) => p.code === code) ?? null;
}

/**
 * Sandbox stand-in for a provider we have no credentials for. It returns the
 * same ProviderSession shape, so every downstream path is the production path.
 */
async function sandboxSession(provider: ProviderId, input: CreateIntentInput): Promise<ProviderSession> {
  const expiresAt = Date.now() + PAYMENTS.qrTtlMinutes * 60_000;
  if (provider === 'paynow') {
    const payload = buildPayNowPayload({
      uen: PAYNOW.uen || '202512345K',
      merchantName: PAYNOW.merchantName,
      amountCents: input.subtotalCents,
      reference: input.ref,
      expiresAt: new Date(expiresAt),
    });
    return { providerRef: input.ref, qr: { payload, dataUrl: await renderQr(payload) }, expiresAt };
  }
  return {
    providerRef: `sandbox_${provider}_${input.ref}`,
    redirectUrl: `/phase1/payment/sandbox?ref=${encodeURIComponent(input.ref)}&provider=${provider}`,
    expiresAt: Date.now() + 30 * 60_000,
  };
}

export interface CreateIntentRequest {
  provider: string;
  planCode: string;
  agentId: string;
  agentEmail: string;
  agentName: string;
  idempotencyKey: string;
  origin: string;
}

export async function createIntent(req: CreateIntentRequest): Promise<PaymentIntent> {
  const provider = getProvider(req.provider);
  if (!provider) throw new PaymentError(`Unknown payment provider ${req.provider}`, 400, 'unknown_provider');

  const plan = planByCode(req.planCode);
  if (!plan) throw new PaymentError(`Unknown plan ${req.planCode}`, 400, 'unknown_plan');
  if (!req.idempotencyKey) throw new PaymentError('Idempotency-Key header is required', 400, 'missing_idempotency_key');

  // Price comes from the catalogue. A client-supplied amount is never trusted.
  const totalCents = Math.round(plan.priceYearSgd * 100);

  // PayNow caps a customer at S$2,000 a day, so a plan priced above that cannot go
  // through it. Fail here with something an agent can act on, not at the bank app.
  if (provider.id === 'paynow' && totalCents > PAYNOW_LIMITS.maxCentsPerDay) {
    throw new PaymentError(
      'PayNow is limited to S$2,000 per day, which does not cover this plan. Please pay by card.',
      400,
      'paynow_limit_exceeded',
    );
  }

  const candidateRef = newRef();
  const { claimed, existingRef } = await claimIdempotencyKey(req.idempotencyKey, candidateRef);

  if (!claimed) {
    // Someone else already created (or is creating) this intent. Read the row
    // under its own lock rather than calling the provider a second time.
    const existing = await withIntent(existingRef, async (current) => ({ result: current }));
    if (existing) return existing;
    throw new PaymentError('Payment is still being created, retry shortly', 409, 'creation_in_progress');
  }

  const ref = candidateRef;
  const tax = taxLineFor(PAYMENTS.taxTreatment, totalCents);
  const now = Date.now();

  const draft: PaymentIntent = {
    ref,
    provider: provider.id,
    status: 'created',
    planCode: plan.code,
    agentId: req.agentId,
    total: money(totalCents),
    subtotal: money(totalCents - tax.cents),
    tax,
    providerFeeCents: estimateFeeCents(provider.id, totalCents),
    providerRef: null,
    redirectUrl: null,
    qr: null,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + PAYMENTS.qrTtlMinutes * 60_000,
    lastEventId: null,
    failureReason: null,
  };
  // Persist before the network call, so a provider timeout still leaves a row
  // that reconciliation can find and close out.
  await putIntent(draft);

  const input: CreateIntentInput = {
    provider: provider.id,
    planCode: plan.code,
    agentId: req.agentId,
    agentEmail: req.agentEmail,
    agentName: req.agentName,
    subtotalCents: totalCents,
    ref,
    returnUrl: `${req.origin}/phase1/payment?ref=${encodeURIComponent(ref)}`,
  };

  let session: ProviderSession;
  try {
    session =
      PAYMENTS.sandbox || !provider.isConfigured()
        ? await sandboxSession(provider.id, input)
        : await provider.createSession(input);
  } catch (err) {
    await withIntent(ref, async (current) => {
      if (!current) return { result: null };
      return {
        next: { ...current, status: 'failed', failureReason: 'provider_unavailable', updatedAt: Date.now() },
        result: null,
      };
    });
    throw new PaymentError(
      err instanceof Error ? err.message : 'Payment provider unavailable',
      502,
      'provider_unavailable',
    );
  }

  return withIntent(ref, async (current) => {
    const base = current ?? draft;
    // A webhook can beat the create response back to us. If it did, leave it alone.
    if (base.status !== 'created') return { result: base };
    const next: PaymentIntent = {
      ...base,
      status: 'awaiting_payment',
      providerRef: session.providerRef,
      redirectUrl: session.redirectUrl ?? null,
      qr: session.qr ?? null,
      expiresAt: session.expiresAt,
      updatedAt: Date.now(),
    };
    return { next, result: next };
  });
}

export function readIntent(ref: string): PaymentIntent | null {
  return getIntent(ref);
}

export interface WebhookOutcome {
  applied: boolean;
  reason: 'applied' | 'duplicate' | 'unknown_ref' | 'illegal_transition';
  status?: PaymentIntent['status'];
}

/**
 * Applies a verified webhook. Safe to call any number of times with the same
 * event, and safe to call with events that arrive in the wrong order.
 */
export async function applyWebhook(event: VerifiedEvent): Promise<WebhookOutcome> {
  const first = await claimEvent(event.eventId);
  if (!first) return { applied: false, reason: 'duplicate' };

  return withIntent<WebhookOutcome>(event.ref, async (current) => {
    if (!current) return { result: { applied: false, reason: 'unknown_ref' as const } };
    if (!canTransition(current.status, event.status)) {
      // Already terminal, or a late failure chasing a success. Keep the first answer.
      return { result: { applied: false, reason: 'illegal_transition' as const, status: current.status } };
    }
    const next: PaymentIntent = {
      ...current,
      status: event.status,
      providerRef: event.providerRef ?? current.providerRef,
      failureReason: event.status === 'paid' ? null : event.reason,
      lastEventId: event.eventId,
      updatedAt: Date.now(),
    };
    return { next, result: { applied: true, reason: 'applied' as const, status: next.status } };
  });
}

/** Trimmed shape sent to the browser. */
export function toPublicIntent(intent: PaymentIntent) {
  return {
    ref: intent.ref,
    provider: intent.provider,
    status: intent.status,
    planCode: intent.planCode,
    totalCents: intent.total.cents,
    subtotalCents: intent.subtotal.cents,
    currency: intent.total.currency,
    tax: intent.tax,
    providerFeeCents: intent.providerFeeCents,
    redirectUrl: intent.redirectUrl,
    qr: intent.qr,
    expiresAt: intent.expiresAt,
    failureReason: intent.failureReason,
  };
}
