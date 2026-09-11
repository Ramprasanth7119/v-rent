/**
 * GET /api/phase1/address/reverse?lat=1.28&lng=103.85
 *
 * What is at a point on the map. Backs the "drop a pin" half of the address
 * step; the typed half is the sibling route.
 *
 * Server-side for the same three reasons as the search proxy: the OneMap key
 * stays off the client, the traffic is rate limited per account, and the shape
 * that comes back is ours. Signed-in agents only.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../../lib/auth/session';
import { TokenBucket } from '../../../../../lib/payments/concurrency';
import { reverseGeocode } from '../../../../../lib/phase1/onemap';
import { logged } from '../../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A pin drag fires on release, not continuously, so this is generous. */
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
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));

  // Singapore, generously bounded. A point outside it is a bug or a probe,
  // and either way is not worth a call to a government service.
  const inSingapore = lat > 1.1 && lat < 1.5 && lng > 103.5 && lng < 104.15;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inSingapore) {
    return NextResponse.json({ status: 'failed', reason: 'That point is not in Singapore.' }, { status: 400 });
  }

  return NextResponse.json(await reverseGeocode(lat, lng));
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
