/**
 * Every request the API actually served.
 *
 * Operations needs this for three questions that nothing else answers: is
 * anything failing, is anything slow, and who did that. A log of decisions —
 * the audit trail — cannot answer them, because most of what goes wrong never
 * becomes a decision: a photograph upload that 500s, a CEA lookup timing out
 * against data.gov.sg, one account hammering the address search.
 *
 * Recorded at the handler rather than in middleware, because middleware runs
 * before the handler and therefore knows neither the status it returned nor how
 * long it took — the two things worth knowing. `logged()` wraps a route export
 * and leaves its signature alone.
 *
 * What is kept is deliberately thin: method, route, status, duration, and who
 * was signed in. No bodies, no query strings, no headers. A request log that
 * quietly accumulates other people's telephone numbers is a liability, not an
 * instrument.
 *
 * Server only.
 */


/* The row shape lives in `reqlog-labels` so a client component can use it
   without pulling `node:fs` into the browser bundle. */
export type { RequestRow } from './reqlog-labels';
import type { RequestRow } from './reqlog-labels';
import { store } from '../store/driver';

/** A working week of traffic at prototype volumes. Oldest rows fall off. */
const MAX_ROWS = 4000;

const rows = store<RequestRow>('requests');

/**
 * Writing a file on every request would make the log the slowest thing in the
 * product. Rows accumulate in memory and are written in batches; a crash loses
 * at most the last second of traffic, which for an instrument is the right
 * trade.
 */
let buffer: RequestRow[] = [];
let flushing: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

const FLUSH_AFTER_MS = 1000;
const FLUSH_AT_ROWS = 25;

async function flush(): Promise<void> {
  if (buffer.length === 0) return;
  const pending = buffer;
  buffer = [];
  try {
    await rows.appendCapped(pending, MAX_ROWS, 'at');
  } catch {
    // A log that cannot write must not take the request down with it.
  }
}

function schedule() {
  if (buffer.length >= FLUSH_AT_ROWS) {
    if (timer) { clearTimeout(timer); timer = null; }
    flushing = (flushing ?? Promise.resolve()).then(flush);
    return;
  }
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flushing = (flushing ?? Promise.resolve()).then(flush);
  }, FLUSH_AFTER_MS);
}

/** Newest first, with anything still in memory included. */
export async function readRequests(): Promise<RequestRow[]> {
  const stored = await rows.list({ sort: { field: 'at', dir: -1 }, limit: MAX_ROWS });
  return [...buffer, ...stored].slice(0, MAX_ROWS);
}

/* --------------------------------------------------------------- recording */

/**
 * Collapse the requested path back to the route that served it.
 *
 * `/api/phase1/photos/abc/lst-3/p9` and `/api/phase1/photos/def/lst-1/p2` are
 * the same endpoint, and a log that lists them separately cannot tell you that
 * the endpoint is slow. Anything that looks like an identifier becomes a
 * placeholder; anything that looks like a word is part of the route.
 */
const IDENTIFIER = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|(?:lst|imp|oth|agt|pay|enq|sl|feat|slot|tkt)-[\w-]+|\d{4,}|[0-9a-f]{16,})$/i;

export function routeOf(pathname: string): string {
  return pathname
    .split('/')
    .map((segment) => (IDENTIFIER.test(segment) ? '[id]' : segment))
    .join('/');
}

let counter = 0;
const nextId = () => `rq_${Date.now().toString(36)}${(counter += 1).toString(36)}`;

export function push(row: Omit<RequestRow, 'id'>) {
  buffer.unshift({ ...row, id: nextId() });
  if (buffer.length > MAX_ROWS) buffer.length = MAX_ROWS;
  schedule();
}

/* ---------------------------------------------------------------- wrapper */

/**
 * The actor is read from the session cookie rather than passed in, so wrapping
 * a route needs no change inside it. It is a cookie read and an HMAC check, not
 * a database round trip.
 */
async function actorOf(): Promise<{ actor?: string; role: RequestRow['role'] }> {
  try {
    const { currentUser } = await import('../auth/session');
    const user = await currentUser();
    if (!user) return { role: 'anonymous' };
    return { actor: user.email, role: user.role === 'admin' ? 'admin' : 'agent' };
  } catch {
    return { role: 'anonymous' };
  }
}

type Handler<A extends unknown[]> = (req: Request, ...rest: A) => Promise<Response> | Response;

/**
 * Wrap a route export so the call is recorded. The signature is preserved
 * exactly, which is what lets Next's own route type checking still apply.
 *
 * A handler that throws is recorded as a 500 and the error is re-thrown — the
 * log observes, it does not intervene.
 */
export function logged<A extends unknown[]>(handler: Handler<A>): Handler<A> {
  return async (req: Request, ...rest: A) => {
    const started = Date.now();
    const at = new Date(started).toISOString();
    const { pathname } = new URL(req.url);

    try {
      const res = await handler(req, ...rest);
      const { actor, role } = await actorOf();
      push({
        at,
        method: req.method,
        route: routeOf(pathname),
        path: pathname,
        status: res.status,
        ms: Date.now() - started,
        actor,
        role,
      });
      return res;
    } catch (err) {
      push({
        at,
        method: req.method,
        route: routeOf(pathname),
        path: pathname,
        status: 500,
        ms: Date.now() - started,
        role: 'anonymous',
        error: err instanceof Error ? err.message : 'Unhandled error',
      });
      throw err;
    }
  };
}
