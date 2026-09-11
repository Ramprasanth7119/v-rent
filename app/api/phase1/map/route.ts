/**
 * GET /api/phase1/map?lat=1.2807&lng=103.8526
 *
 * A map image of one point, fetched from OneMap on the server so the API token
 * stays there. Public: the same image appears on a shared listing page, which
 * has no session.
 *
 * Coordinates are the whole input, and they are bounded to Singapore — this is
 * not a general-purpose image proxy.
 */

import { NextResponse } from 'next/server';
import { fetchStaticMap } from '../../../../lib/phase1/onemap';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Singapore, with room for the outlying islands. */
const BOUNDS = { minLat: 1.13, maxLat: 1.51, minLng: 103.55, maxLng: 104.14 };

async function GET_handler(req: Request) {
  const params = new URL(req.url).searchParams;
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  // OneMap refuses anything above 512 x 512.
  const width = Math.min(512, Math.max(160, Number(params.get('w')) || 512));
  const height = Math.min(512, Math.max(120, Number(params.get('h')) || 288));

  const inSingapore =
    Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat
    && lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;
  if (!inSingapore) return new NextResponse('Not found', { status: 404 });

  const image = await fetchStaticMap(lat, lng, { width, height });
  if (!image) return new NextResponse('Not found', { status: 404 });

  return new NextResponse(new Uint8Array(image.body), {
    headers: {
      'content-type': image.type,
      // A point on a map does not move. Cache hard.
      'cache-control': 'public, max-age=604800, immutable',
    },
  });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
