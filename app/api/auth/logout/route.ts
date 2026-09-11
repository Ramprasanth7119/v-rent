/** POST /api/auth/logout — clear the session cookie. */

import { NextResponse } from 'next/server';
import { endSession } from '../../../../lib/auth/session';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function POST_handler() {
  await endSession();
  return NextResponse.json({ ok: true });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
