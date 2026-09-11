/** GET /api/auth/session — who is signed in, if anyone. */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function GET_handler() {
  const user = await currentUser();
  return NextResponse.json({ user });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
