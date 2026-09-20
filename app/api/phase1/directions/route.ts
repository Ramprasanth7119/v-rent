/**
 * GET /api/phase1/directions?fromLat=&fromLng=&toLat=&toLng=&mode=walk|drive
 *
 * The route from a property to one nearby place, for the line drawn on the
 * wizard's map when an agent clicks a place.
 *
 * Server-side so the OneMap token stays here, and rate limited per account
 * because this is the one lookup in the feature an agent can fire repeatedly
 * by clicking down a list. Signed-in agents only. Demo Data never reaches it.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { TokenBucket } from '../../../../lib/payments/concurrency';
import { directionsBetween, isRouteMode } from '../../../../lib/phase1/directions';
import { inSingapore } from '../../../../lib/phase1/nearby';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** One request to OneMap each, and an agent clicking down a list makes a few. */
const limiter = new TokenBucket(20, 1);

async function GET_handler(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });
  }

  const retryAfter = limiter.take(user.id);
  if (retryAfter !== null) {
    return NextResponse.json(
      { status: 'failed', reason: 'Too many lookups. Wait a moment.' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    );
  }

  const params = new URL(req.url).searchParams;
  const from = { lat: Number(params.get('fromLat')), lng: Number(params.get('fromLng')) };
  const to = { lat: Number(params.get('toLat')), lng: Number(params.get('toLng')) };
  if (!inSingapore(from.lat, from.lng) || !inSingapore(to.lat, to.lng)) {
    return NextResponse.json({ status: 'failed', reason: 'Both points must be in Singapore.' }, { status: 400 });
  }

  const mode = params.get('mode') ?? 'walk';
  if (!isRouteMode(mode)) {
    return NextResponse.json({ status: 'failed', reason: 'Unknown travel mode.' }, { status: 400 });
  }

  return NextResponse.json(await directionsBetween(from, to, mode));
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
