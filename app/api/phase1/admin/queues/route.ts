/**
 * GET /api/phase1/admin/queues — how much is waiting, for the sidebar badges.
 *
 * Counts only, and staff only. A badge that says five when two things are
 * waiting is worse than no badge, so the moderation figure is the real queue
 * rather than a fixture.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../../lib/auth/session';
import { moderationQueue } from '../../../../../lib/phase1/admin-moderation';
import { pendingCount } from '../../../../../lib/phase1/admin-verification';
import { logged } from '../../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function GET_handler() {
  const staff = await currentUser();
  if (!staff || staff.role !== 'admin') {
    return NextResponse.json({ error: 'Not found.', code: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({
    moderation: (await moderationQueue()).length,
    verification: await pendingCount(),
  });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
