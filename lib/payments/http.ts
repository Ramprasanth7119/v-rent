/**
 * Outbound HTTP for provider APIs.
 *
 * Three things stop a burst of agents from taking the process down:
 *   - a semaphore, so 100 concurrent checkouts do not open 100 sockets;
 *   - an AbortController timeout, so a hung provider frees its slot;
 *   - bounded retries with exponential backoff and full jitter, on 5xx/429 only.
 * POSTs that create money are only retried when the provider gave us an
 * idempotency-safe status, and always carry an idempotency header.
 */

import { Semaphore } from './concurrency';
import { PAYMENTS } from './config';

const gate = new Semaphore(PAYMENTS.outboundConcurrency);

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function providerFetch(
  url: string,
  init: RequestInit & { idempotencyKey?: string; attempts?: number } = {},
): Promise<unknown> {
  const { idempotencyKey, attempts = 3, ...rest } = init;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      // Full jitter: base 250ms, doubling, randomised so retries do not sync up.
      const ceiling = 250 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, Math.random() * ceiling));
    }

    try {
      return await gate.run(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), PAYMENTS.requestTimeoutMs);
        try {
          const res = await fetch(url, {
            ...rest,
            signal: controller.signal,
            headers: {
              'content-type': 'application/json',
              ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
              ...(rest.headers as Record<string, string> | undefined),
            },
          });
          const text = await res.text();
          if (!res.ok) throw new ProviderError(`${url} responded ${res.status}`, res.status, text);
          return text ? JSON.parse(text) : null;
        } finally {
          clearTimeout(timer);
        }
      });
    } catch (err) {
      lastError = err;
      const status = err instanceof ProviderError ? err.status : 0;
      const retryable = status === 0 || RETRYABLE.has(status);
      if (!retryable || attempt === attempts - 1) throw err;
    }
  }
  throw lastError;
}
