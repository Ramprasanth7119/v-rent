/**
 * The way from the property to one nearby place.
 *
 * Everything else in this feature is a straight line, which is honest about
 * being one. This is the exception: OneMap's routing service walks or drives
 * the actual road network and returns the distance, the time it takes and the
 * line to draw, so a route summary is measured rather than guessed at.
 *
 * One route at a time, asked for when an agent clicks a place. Routing every
 * place in a list would be forty requests to a government service to answer a
 * question nobody asked.
 *
 * Server only — it reads ONEMAP_TOKEN.
 */

import { fetchWithTimeout } from '../http';

const ROUTING = 'https://www.onemap.gov.sg/api/public/routingsvc/route';

export type RouteMode = 'walk' | 'drive';
export const ROUTE_MODES: RouteMode[] = ['walk', 'drive'];
export const isRouteMode = (raw: string): raw is RouteMode => (ROUTE_MODES as string[]).includes(raw);

export type RouteResult =
  | {
    status: 'ok';
    mode: RouteMode;
    /** Along the road or path, not as the crow flies. */
    distanceMetres: number;
    seconds: number;
    /** The line to draw, as [lat, lng] pairs. */
    path: [number, number][];
    /** `demo` is the illustrative set; `live` came from OneMap. */
    source: 'live' | 'demo';
  }
  | { status: 'no_token' | 'failed'; mode: RouteMode; reason: string };

/**
 * OneMap returns the line as a Google-encoded polyline at five decimal places.
 * Small enough to decode here rather than take a dependency for.
 */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0;
      let shift = 0;
      let byte = 0;
      do {
        byte = encoded.charCodeAt(index) - 63;
        index += 1;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta; else lng += delta;
    }
    points.push([Math.round(lat * 10) / 1e6, Math.round(lng * 10) / 1e6]);
  }
  return points;
}

export async function directionsBetween(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: RouteMode,
): Promise<RouteResult> {
  const token = process.env.ONEMAP_TOKEN;
  if (!token) return { status: 'no_token', mode, reason: 'OneMap is not configured on this server.' };

  const url = new URL(ROUTING);
  url.searchParams.set('start', `${from.lat.toFixed(6)},${from.lng.toFixed(6)}`);
  url.searchParams.set('end', `${to.lat.toFixed(6)},${to.lng.toFixed(6)}`);
  url.searchParams.set('routeType', mode);

  try {
    const res = await fetchWithTimeout(url, { headers: { Authorization: token }, cache: 'no-store', timeoutMs: 9000 });
    if (!res.ok) return { status: 'failed', mode, reason: `OneMap answered ${res.status}.` };

    const body = (await res.json().catch(() => null)) as {
      route_geometry?: string;
      route_summary?: { total_distance?: number; total_time?: number };
      status_message?: string;
    } | null;

    const summary = body?.route_summary;
    const distanceMetres = Number(summary?.total_distance);
    const seconds = Number(summary?.total_time);
    if (!body?.route_geometry || !Number.isFinite(distanceMetres) || !Number.isFinite(seconds)) {
      /* No route is a real answer — an island with no footpath to it — and it
         is not the same as the service being down. Both say so plainly. */
      return { status: 'failed', mode, reason: body?.status_message || 'No route was found between those points.' };
    }

    return {
      status: 'ok',
      mode,
      distanceMetres: Math.round(distanceMetres),
      seconds: Math.round(seconds),
      path: decodePolyline(body.route_geometry),
      source: 'live',
    };
  } catch (err) {
    return { status: 'failed', mode, reason: err instanceof Error ? err.message : 'The routing service did not answer.' };
  }
}
