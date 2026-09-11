/**
 * Outbound requests, with a deadline.
 *
 * Every call this product makes to somebody else's server — the CEA register on
 * data.gov.sg, OneMap for addresses and maps — is a call it cannot control the
 * speed of. `fetch` has no default timeout, so a government service having a
 * slow afternoon becomes a request of ours that hangs until the platform kills
 * it, and the user gets a 500 instead of the honest "that lookup did not come
 * back" every one of these screens already knows how to show.
 *
 * That matters most exactly where it is least visible: on a serverless runtime
 * a hung fetch burns the whole function budget and takes the response with it.
 *
 * Server only.
 */

/** Long enough for a slow government service, short enough to still answer. */
export const DEFAULT_TIMEOUT_MS = 6000;

export class TimeoutError extends Error {
  constructor(public readonly url: string, public readonly ms: number) {
    super(`No response from ${url} within ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * `fetch`, but it gives up.
 *
 * Any signal the caller passes is honoured as well as the deadline, so an
 * upstream cancellation still propagates.
 */
export async function fetchWithTimeout(
  url: string | URL,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } catch (err) {
    // An abort we caused is a timeout; an abort the caller caused is theirs.
    if (err instanceof Error && err.name === 'AbortError' && !signal?.aborted) {
      throw new TimeoutError(String(url), timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
