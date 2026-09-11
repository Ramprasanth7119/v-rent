/**
 * Payment intent storage.
 *
 * Held in memory and written through to disk, so a payment in flight survives
 * a restart — a POC that loses an open checkout every time the dev server
 * reloads cannot demonstrate the thing it exists to demonstrate.
 *
 * The interface is deliberately narrow so this can be replaced by Postgres
 * without touching a route:
 *
 *   withIntent   -> SELECT ... FOR UPDATE inside a transaction
 *   claimIdempotencyKey -> INSERT ... ON CONFLICT DO NOTHING RETURNING
 *   claimEvent   -> INSERT INTO webhook_events (event_id) ON CONFLICT DO NOTHING
 *
 * Every mutation goes through `withIntent`, which holds a per-ref lock, so two
 * concurrent webhooks for the same payment can never interleave a read-modify-write.
 */

import { readFileSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { KeyedMutex } from './concurrency';
import { ALLOWED_TRANSITIONS, type IntentStatus, type PaymentIntent } from './types';

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DATA_DIR, 'payments.json');

interface Persisted {
  intents: [string, PaymentIntent][];
  idempotency: [string, { ref: string; at: number }][];
  events: [string, number][];
}

/**
 * Read once, synchronously, at module load.
 *
 * Synchronous because `getIntent` is synchronous and every caller expects it
 * to be; one small read at start-up is a better trade than making the whole
 * surface async for a file that is a few kilobytes.
 */
function hydrate(): Pick<StoreShape, 'intents' | 'idempotency' | 'events'> {
  try {
    const raw = JSON.parse(readFileSync(FILE, 'utf8')) as Persisted;
    return {
      intents: new Map(raw.intents ?? []),
      idempotency: new Map(raw.idempotency ?? []),
      events: new Map(raw.events ?? []),
    };
  } catch {
    return { intents: new Map(), idempotency: new Map(), events: new Map() };
  }
}

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
    ...hydrate(),
    locks: new KeyedMutex(),
    lastSweep: Date.now(),
  });

/**
 * Write the whole store out.
 *
 * Always called with the relevant lock held, and written to a sibling file
 * then renamed, so a crash mid-write leaves the previous state rather than a
 * truncated file. Failure is logged and swallowed: losing the durable copy of
 * a payment is bad, but failing the payment because the disk is full is worse.
 */
async function persist(): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const body: Persisted = {
      intents: [...store.intents],
      idempotency: [...store.idempotency],
      events: [...store.events],
    };
    const tmp = `${FILE}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(body), 'utf8');
    await rename(tmp, FILE);
  } catch (err) {
    console.error('[v-rent] payment store could not be written', err);
  }
}

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
    await persist();
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
      await persist();
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
    await persist();
    return { claimed: true, existingRef: ref };
  });
}

/** True the first time an event id is seen; false for every redelivery. */
export async function claimEvent(eventId: string): Promise<boolean> {
  return store.locks.run(`event:${eventId}`, async () => {
    if (store.events.has(eventId)) return false;
    store.events.set(eventId, Date.now());
    await persist();
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
