/**
 * GET /api/phase1/neighbourhood?lat=1.28&lng=103.85&radius=1000
 *
 * What sits around an address. Eight OneMap theme queries, run server-side for
 * the same reasons as the address routes: the OneMap key stays off the client,
 * the traffic is rate limited per account, and the shape that comes back is
 * ours rather than eight different government schemas.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { TokenBucket } from '../../../../lib/payments/concurrency';
import { amenitiesAround } from '../../../../lib/phase1/amenities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Each call is eight requests to OneMap, so this is deliberately tight. */
const limiter = new TokenBucket(8, 0.5);

export async function GET(req: Request) {
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
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const radius = Math.min(2000, Math.max(300, Number(params.get('radius')) || 1000));

  const inSingapore = lat > 1.1 && lat < 1.5 && lng > 103.5 && lng < 104.15;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inSingapore) {
    return NextResponse.json({ status: 'failed', reason: 'That point is not in Singapore.' }, { status: 400 });
  }

  return NextResponse.json(await amenitiesAround(lat, lng, radius));
}
