/**
 * GET /api/phase1/address?q=018987
 *
 * Proxies the OneMap search so the token stays on the server when one is
 * configured, the traffic is rate limited, and the response shape is ours
 * rather than OneMap's shouty upper-case one.
 *
 * Signed-in agents only: it is a form field on the listing wizard, not a public
 * geocoder for anyone who finds the URL.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { TokenBucket } from '../../../../lib/payments/concurrency';
import { searchAddress } from '../../../../lib/phase1/onemap';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Generous for someone typing, tight enough not to hammer a government service. */
const limiter = new TokenBucket(20, 1);

async function GET_handler(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });
  }

  const retryAfter = limiter.take(user.id);
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: 'Too many lookups. Wait a moment.', code: 'rate_limited' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    );
  }

  const q = new URL(req.url).searchParams.get('q') ?? '';
  return NextResponse.json({ results: await searchAddress(q) });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
