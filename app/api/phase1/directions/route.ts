/**
 * GET /api/phase1/directions?fromLat=&fromLng=&toLat=&toLng=&mode=walk|drive
 *
 * The route from a property to one nearby place, for the line drawn on the
 * wizard's map when an agent clicks a place.
 *
 * Server-side so the OneMap token stays here, and rate limited because this is
 * the one lookup in the feature that can be fired repeatedly by clicking down
 * a list.
 *
 * Open to anyone, deliberately. It began as an agent-only route for the
 * listing wizard; the public listing page draws the same line from the same
 * two points, and a tenant working out how far the station is has no account
 * and will not be asked for one. Nothing here is private — two coordinates in
 * and a public road route back — so the gate would protect nothing and only
 * cost the tenant the answer. The budget it does protect is OneMap's, which is
 * why the limiter is keyed per caller rather than removed: a signed-in agent
 * by account, everyone else by address.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { TokenBucket } from '../../../../lib/payments/concurrency';
import { directionsBetween, isRouteMode } from '../../../../lib/phase1/directions';
import { inSingapore } from '../../../../lib/phase1/nearby';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** One request to OneMap each, and clicking down a list makes a few. */
const limiter = new TokenBucket(20, 1);

/**
 * Who to charge the request to. An account where there is one, otherwise the
 * address the request arrived from — the first hop in `x-forwarded-for`, which
 * is the client as far as the proxy in front of this is concerned. A caller
 * behind a shared address shares a bucket; that is the cost of not asking
 * strangers to sign in, and the bucket is generous enough to absorb it.
 */
const callerOf = (req: Request, userId?: string) =>
  userId ?? (req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous');

async function GET_handler(req: Request) {
  const user = await currentUser();

  const retryAfter = limiter.take(callerOf(req, user?.id));
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
