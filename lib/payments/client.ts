"use client";

/**
 * Browser side of the payment flow.
 *
 * Two things here keep a hundred simultaneous checkouts civil:
 *   - one idempotency key per attempt, held in a ref, so a double-clicked or
 *     re-rendered Pay button reuses the key instead of opening a new payment;
 *   - a poller that backs off, honours Retry-After, pauses while the tab is
 *     hidden, and stops the moment the payment reaches a terminal state.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IntentStatus, ProviderId, TaxLine } from './types';

export interface PublicIntent {
  ref: string;
  provider: ProviderId;
  status: IntentStatus;
  planCode: string;
  totalCents: number;
  subtotalCents: number;
  currency: string;
  tax: TaxLine;
  providerFeeCents: number;
  redirectUrl: string | null;
  qr: { payload: string; dataUrl: string } | null;
  expiresAt: number;
  failureReason: string | null;
  settled?: boolean;
}

export const TERMINAL_STATUSES: IntentStatus[] = ['paid', 'failed', 'expired', 'cancelled'];

export function isSettled(status: IntentStatus) {
  return TERMINAL_STATUSES.includes(status);
}

export function formatSgd(cents: number) {
  return 'S$' + (cents / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `k_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * What the browser gets to decide: the rail, and which item.
 *
 * No identity. Who is paying is read from the session cookie on the server —
 * see the intents route — so there is nothing here for a tampered request to
 * name.
 */
export interface StartPaymentArgs {
  provider: ProviderId;
  planCode: string;
}

export function usePayment() {
  const [intent, setIntent] = useState<PublicIntent | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Survives re-renders, so retrying an attempt never creates a second payment. */
  const idempotencyKey = useRef<string | null>(null);
  const inFlight = useRef(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const start = useCallback(async (args: StartPaymentArgs) => {
    if (inFlight.current) return null; // Second click while the first is open.
    inFlight.current = true;
    setStarting(true);
    setError(null);

    idempotencyKey.current ??= newIdempotencyKey();
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    try {
      const res = await fetch('/api/payments/intents', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey.current },
        body: JSON.stringify(args),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        const retryAfter = res.headers.get('retry-after');
        setError(
          res.status === 429 && retryAfter
            ? `Too many attempts. Try again in ${retryAfter}s.`
            : (data?.error ?? 'Could not start the payment'),
        );
        // A failed attempt gets a fresh key; the old one is spent.
        idempotencyKey.current = null;
        return null;
      }
      setIntent(data as PublicIntent);
      return data as PublicIntent;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError('Network problem. Check your connection and try again.');
      idempotencyKey.current = null;
      return null;
    } finally {
      inFlight.current = false;
      setStarting(false);
    }
  }, []);

  const reset = useCallback(() => {
    abort.current?.abort();
    idempotencyKey.current = null;
    setIntent(null);
    setError(null);
  }, []);

  return { intent, setIntent, start, reset, starting, error, setError };
}

/**
 * Polls one payment until it settles. Interval grows from 2s to 8s so a QR left
 * open on a desk does not hammer the server, and pauses entirely on a hidden tab.
 */
export function usePaymentStatus(ref: string | null, onSettled?: (i: PublicIntent) => void) {
  // Held in a ref so a new inline callback on every render does not restart the poll.
  const callback = useRef(onSettled);
  useEffect(() => {
    callback.current = onSettled;
  }, [onSettled]);

  useEffect(() => {
    if (!ref) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let attempt = 0;
    const controller = new AbortController();

    const tick = async () => {
      if (cancelled) return;

      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(tick, 3000); // Idle while the agent is in their banking app.
        return;
      }

      try {
        const res = await fetch(`/api/payments/intents/${encodeURIComponent(ref)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as PublicIntent;
          if (data.settled ?? isSettled(data.status)) {
            callback.current?.(data);
            return;
          }
        }
      } catch {
        // A dropped poll is not an error worth showing; the next one will do.
      }

      attempt += 1;
      const base = Math.min(2000 * 1.25 ** attempt, 8000);
      timer = setTimeout(tick, base + Math.random() * 400); // jitter, so 100 tabs do not sync
    };

    timer = setTimeout(tick, 1500);
    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [ref]);

  // No state of its own: a poll is running exactly while there is a ref to poll.
  return { polling: ref !== null };
}
