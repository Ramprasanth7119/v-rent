/** GET /api/auth/session — who is signed in, if anyone. */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  return NextResponse.json({ user });
}
