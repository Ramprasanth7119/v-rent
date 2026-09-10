/**
 * Concurrency primitives for the payment layer.
 *
 * The payment routes are the one place in V-RENT where two requests can race
 * over the same row: an agent double-clicks "Pay", the browser retries a POST,
 * or a provider redelivers a webhook while the first delivery is still running.
 * Everything here exists to make those races boring.
 *
 * Single process only. On more than one instance, swap `KeyedMutex` for a
 * Redis lock (SET NX PX) or a Postgres advisory lock — the call sites do not
 * change, only the implementation of `run`.
 */

/** Serialises work per key. Different keys run in parallel; the same key queues. */
export class KeyedMutex {
  private tails = new Map<string, Promise<unknown>>();

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    // Swallow the predecessor's rejection so one failure cannot poison the queue.
    const mine = previous.then(() => fn(), () => fn());
    // Keep a settled-only handle as the next waiter's predecessor.
    const tail = mine.then(
      () => undefined,
      () => undefined,
    );
    this.tails.set(key, tail);
    try {
      return await mine;
    } finally {
      // Only clear if nobody queued behind us, otherwise we would drop the chain.
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }

  get size() {
    return this.tails.size;
  }
}

/** Caps how many operations may be in flight at once. */
export class Semaphore {
  private active = 0;
  private queue: (() => void)[] = [];

  constructor(private readonly limit: number) {
    if (limit < 1) throw new Error('Semaphore limit must be >= 1');
  }

  async acquire(): Promise<() => void> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active -= 1;
      const next = this.queue.shift();
      if (next) next();
    };
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  get inFlight() {
    return this.active;
  }

  get waiting() {
    return this.queue.length;
  }
}

/** Token bucket. Used to keep one abusive client from starving the other 99. */
export class TokenBucket {
  private buckets = new Map<string, { tokens: number; last: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {}

  /** Returns null when allowed, or the number of seconds to wait when denied. */
  take(key: string, cost = 1): number | null {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, last: now };
    const elapsed = (now - bucket.last) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsed * this.refillPerSecond);
    bucket.last = now;

    if (bucket.tokens < cost) {
      this.buckets.set(key, bucket);
      return Math.max(1, Math.ceil((cost - bucket.tokens) / this.refillPerSecond));
    }
    bucket.tokens -= cost;
    this.buckets.set(key, bucket);

    // Cheap eviction so the map cannot grow without bound under a spray of IPs.
    if (this.buckets.size > 10_000) {
      for (const [k, v] of this.buckets) {
        if (now - v.last > 60_000) this.buckets.delete(k);
      }
    }
    return null;
  }
}
