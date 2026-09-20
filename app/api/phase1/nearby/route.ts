/**
 * GET /api/phase1/nearby?lat=1.28&lng=103.85[&postal=018987][&category=transport,schools]
 *
 * What is around a property, for the listing wizard's "What's nearby" section.
 *
 * Server-side for the same reasons as the other address routes: the OneMap
 * token stays here, the traffic to two government services is rate limited per
 * account, and the shape that comes back is ours rather than theirs.
 *
 * Signed-in agents only — it is a panel on the listing form, not a public
 * points-of-interest API for anyone who finds the URL. Demo Data never reaches
 * this route; with the switch on the wizard uses the illustrative set instead.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { TokenBucket } from '../../../../lib/payments/concurrency';
import { inSingapore, isNearbyCategory, type NearbyCategory } from '../../../../lib/phase1/nearby';
import { nearbyAround } from '../../../../lib/phase1/nearby-sources';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* The school directory places postal codes through OneMap on a cold cache. */
export const maxDuration = 20;

/** Each call is up to seven requests to two government services, so this is tight. */
const limiter = new TokenBucket(10, 0.5);

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
  if (!inSingapore(lat, lng)) {
    return NextResponse.json({ status: 'failed', reason: 'That point is not in Singapore.' }, { status: 400 });
  }

  /* An unknown category is a caller mistake worth naming, not one to ignore:
     silently dropping it would answer with fewer sections than were asked for. */
  const asked = (params.get('category') ?? '').split(',').map((c) => c.trim()).filter(Boolean);
  const unknown = asked.filter((c) => !isNearbyCategory(c));
  if (unknown.length) {
    return NextResponse.json(
      { status: 'failed', reason: `Unknown category: ${unknown.join(', ')}.` },
      { status: 400 },
    );
  }

  const postal = /^\d{6}$/.test(params.get('postal') ?? '') ? params.get('postal')! : undefined;
  const categories = asked.filter(isNearbyCategory) as NearbyCategory[];

  return NextResponse.json(await nearbyAround(lat, lng, { postal, categories }));
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
