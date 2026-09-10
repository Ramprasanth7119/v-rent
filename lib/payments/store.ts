/**
 * Payment intent storage.
 *
 * The interface is deliberately narrow so the in-memory implementation below
 * can be replaced by Postgres without touching a route:
 *
 *   withIntent   -> SELECT ... FOR UPDATE inside a transaction
 *   claimIdempotencyKey -> INSERT ... ON CONFLICT DO NOTHING RETURNING
 *   claimEvent   -> INSERT INTO webhook_events (event_id) ON CONFLICT DO NOTHING
 *
 * Every mutation goes through `withIntent`, which holds a per-ref lock, so two
 * concurrent webhooks for the same payment can never interleave a read-modify-write.
 */

import { KeyedMutex } from './concurrency';
import { ALLOWED_TRANSITIONS, type IntentStatus, type PaymentIntent } from './types';

const INTENT_TTL_MS = 24 * 60 * 60 * 1000;
const EVENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface StoreShape {
  intents: Map<string, PaymentIntent>;
  /** idempotency key -> intent ref */
  idempotency: Map<string, { ref: string; at: number }>;
  /** provider event id -> first-seen timestamp */
  events: Map<string, number>;
  locks: KeyedMutex;
  lastSweep: number;
}

/**
 * Next.js dev hot-reloads modules; a plain module-level Map would be recreated
 * mid-session and lose in-flight payments. Pinning it to globalThis keeps one
 * store per process.
 */
const g = globalThis as unknown as { __vrentPaymentStore?: StoreShape };

const store: StoreShape =
  g.__vrentPaymentStore ??
  (g.__vrentPaymentStore = {
    intents: new Map(),
    idempotency: new Map(),
    events: new Map(),
    locks: new KeyedMutex(),
    lastSweep: Date.now(),
  });

/** Drops rows past their TTL. Amortised: runs at most once a minute, on write. */
function sweep(now: number) {
  if (now - store.lastSweep < 60_000) return;
  store.lastSweep = now;
  for (const [ref, intent] of store.intents) {
    if (now - intent.updatedAt > INTENT_TTL_MS) store.intents.delete(ref);
  }
  for (const [key, v] of store.idempotency) {
    if (now - v.at > INTENT_TTL_MS) store.idempotency.delete(key);
  }
  for (const [id, at] of store.events) {
    if (now - at > EVENT_TTL_MS) store.events.delete(id);
  }
}

export async function putIntent(intent: PaymentIntent): Promise<void> {
  await store.locks.run(`intent:${intent.ref}`, async () => {
    store.intents.set(intent.ref, intent);
    sweep(Date.now());
  });
}

export function getIntent(ref: string): PaymentIntent | null {
  const intent = store.intents.get(ref);
  if (!intent) return null;
  // Lazily expire a QR nobody paid, so the poller sees a terminal state.
  if (intent.status === 'awaiting_payment' && Date.now() > intent.expiresAt) {
    return { ...intent, status: 'expired' };
  }
  return intent;
}

/**
 * Runs `fn` while holding the lock for one intent. `fn` returns the next
 * version of the row, or null to leave it unchanged.
 */
export async function withIntent<T>(
  ref: string,
  fn: (current: PaymentIntent | null) => Promise<{ next?: PaymentIntent; result: T }>,
): Promise<T> {
  return store.locks.run(`intent:${ref}`, async () => {
    const current = store.intents.get(ref) ?? null;
    const { next, result } = await fn(current);
    if (next) {
      store.intents.set(ref, next);
      sweep(Date.now());
    }
    return result;
  });
}

/**
 * Claims an idempotency key. The first caller gets `{ claimed: true }` and must
 * create the intent; every later caller with the same key gets the ref of the
 * intent the first one created. This is what makes a double-clicked Pay button,
 * or a browser POST retry, produce one payment instead of two.
 */
export async function claimIdempotencyKey(
  key: string,
  ref: string,
): Promise<{ claimed: boolean; existingRef: string }> {
  return store.locks.run(`idem:${key}`, async () => {
    const existing = store.idempotency.get(key);
    if (existing) return { claimed: false, existingRef: existing.ref };
    store.idempotency.set(key, { ref, at: Date.now() });
    return { claimed: true, existingRef: ref };
  });
}

/** True the first time an event id is seen; false for every redelivery. */
export async function claimEvent(eventId: string): Promise<boolean> {
  return store.locks.run(`event:${eventId}`, async () => {
    if (store.events.has(eventId)) return false;
    store.events.set(eventId, Date.now());
    return true;
  });
}

export function canTransition(from: IntentStatus, to: IntentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Test and ops helper. Never called by a route. */
export function statsSnapshot() {
  const byStatus: Record<string, number> = {};
  for (const i of store.intents.values()) byStatus[i.status] = (byStatus[i.status] ?? 0) + 1;
  return {
    intents: store.intents.size,
    idempotencyKeys: store.idempotency.size,
    events: store.events.size,
    liveLocks: store.locks.size,
    byStatus,
  };
}
