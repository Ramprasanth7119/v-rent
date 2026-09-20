/**
 * GET   /api/phase1/workspace  — the signed-in agent's workspace
 * PATCH /api/phase1/workspace  — merge a change into it
 *
 * The account is taken from the session cookie, never from the body, so an
 * agent can only ever read and write their own workspace.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { TokenBucket } from '../../../../lib/payments/concurrency';
import { loadWorkspace, patchWorkspace } from '../../../../lib/phase1/workspace-store';
import { sanitisePatch, type WorkspaceState } from '../../../../lib/phase1/workspace';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Generous: the browser saves after edits, not on every keystroke. */
const limiter = new TokenBucket(30, 2);

const unauthorised = () =>
  NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });

/**
 * The workspace without the identities of the agents who have viewed it.
 *
 * A view record names the account that made it, and the directory hands the
 * browser every agent's name against their account id — so shipping the raw
 * records here would let anybody join the two and read for nothing the names
 * the reveal exists to sell. The count is not secret and travels; the ids do
 * not leave the server except through `/api/phase1/views`, which masks what
 * has not been paid for.
 *
 * Reveals go the same way. What has been bought is on that route too, beside
 * the card it bought.
 */
function forBrowser(w: WorkspaceState): WorkspaceState {
  return { ...w, views: [], reveals: [] };
}

async function GET_handler() {
  const user = await currentUser();
  if (!user) return unauthorised();
  return NextResponse.json({ workspace: forBrowser(await loadWorkspace(user)) });
}

async function PATCH_handler(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorised();

  const retryAfter = limiter.take(user.id);
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: 'Too many changes at once. Try again in a moment.', code: 'rate_limited' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.', code: 'bad_request' }, { status: 400 });
  }

  const patch = sanitisePatch(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to change.', code: 'empty_patch' }, { status: 400 });
  }

  return NextResponse.json({ workspace: forBrowser(await patchWorkspace(user, patch)) });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
export const PATCH = logged(PATCH_handler);
