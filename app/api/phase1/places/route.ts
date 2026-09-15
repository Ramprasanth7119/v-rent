/**
 * GET /api/phase1/places?kind=mrt&lat=1.28&lng=103.85[&postal=018987]
 *
 * One kind of place around one point — stations, schools, healthcare or
 * attractions — for the shortlist report. One kind per request, so the report
 * can show each arriving rather than wait on the slowest.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { TokenBucket } from '../../../../lib/payments/concurrency';
import { PLACE_KINDS, placesAround, type PlaceKind } from '../../../../lib/phase1/places';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/* A report of eight properties asks four kinds each, all at once. */
const limiter = new TokenBucket(48, 2);

async function GET_handler(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const kind = params.get('kind') as PlaceKind;
  if (!PLACE_KINDS.includes(kind)) {
    return NextResponse.json({ status: 'failed', reason: 'Unknown kind of place.' }, { status: 400 });
  }

  const retryAfter = limiter.take(user.id);
  if (retryAfter !== null) {
    return NextResponse.json(
      { status: 'failed', kind, reason: 'Too many lookups. Wait a moment.' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    );
  }

  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const inSingapore = lat > 1.1 && lat < 1.5 && lng > 103.5 && lng < 104.15;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inSingapore) {
    return NextResponse.json({ status: 'failed', kind, reason: 'That point is not in Singapore.' }, { status: 400 });
  }

  const postal = (params.get('postal') ?? '').trim().slice(0, 6) || undefined;
  return NextResponse.json(await placesAround(kind, lat, lng, { postal }));
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
