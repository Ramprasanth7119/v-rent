/**
 * POST /api/phase1/workspace/reset
 *
 * Returns the workspace to its seeded state. This is the presenter's Reset
 * button: it exists so a demonstration can be run twice in a row from a clean
 * portfolio without touching the account or the CEA verification behind it.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../../lib/auth/session';
import { resetWorkspace } from '../../../../../lib/phase1/workspace-store';
import { logged } from '../../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function POST_handler() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });
  }
  return NextResponse.json({ workspace: await resetWorkspace(user) });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
