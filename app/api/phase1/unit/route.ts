/**
 * GET /api/phase1/unit?postalCode=018987&unit=12-34[&exclude=lst-1]
 *
 * What the platform already knows about one unit, for the agent typing its
 * number into the create form.
 *
 * The account comes from the session, never from the query, so an agent can
 * only ever be told about their own listings — everybody else's presence is
 * reduced to a count before it leaves the server.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { lookupUnit } from '../../../../lib/phase1/unit-lookup';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function GET_handler(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });
  }

  const url = new URL(req.url);
  const postalCode = (url.searchParams.get('postalCode') ?? '').trim().slice(0, 12);
  const unit = (url.searchParams.get('unit') ?? '').trim().slice(0, 24);
  const exclude = (url.searchParams.get('exclude') ?? '').trim().slice(0, 64) || undefined;

  if (!postalCode || !unit) {
    return NextResponse.json(
      { error: 'A postal code and a unit number are both needed.', code: 'bad_request' },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await lookupUnit(user, postalCode, unit, exclude));
  } catch (err) {
    console.error('[v-rent] unit lookup failed:', err);
    return NextResponse.json(
      { error: 'The unit could not be checked just now.', code: 'unavailable' },
      { status: 503 },
    );
  }
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
