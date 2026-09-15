/**
 * What sits around an address, from OneMap's theme service.
 *
 * OneMap publishes government datasets as "themes" — hawker centres from the
 * Singapore Food Agency, parks from NParks, hospitals from MOH — each queryable
 * by a bounding box. That is exactly the question a tenant asks about a flat,
 * so the neighbourhood screen is a handful of theme queries around one point
 * rather than a database we would have to maintain and get wrong.
 *
 * The theme service needs a registered token. Without one the screen says so
 * instead of pretending the area has no amenities in it.
 */

import { fetchWithTimeout } from '../http';

const THEMES = 'https://www.onemap.gov.sg/api/public/themesvc/retrieveTheme';

export interface AmenityGroup {
  key: string;
  label: string;
  /** The OneMap theme behind it, named so the source is checkable. */
  source: string;
  items: Amenity[];
}

export interface Amenity {
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** Metres from the point asked about. */
  metres: number;
}

/**
 * The themes worth putting in front of an agent, in the order a tenant asks
 * about them. Every one of these is confirmed to answer on the public service.
 */
const CATALOGUE: { key: string; label: string; query: string; source: string }[] = [
  { key: 'hawker', label: 'Hawker centres', query: 'ssot_hawkercentres', source: 'Singapore Food Agency' },
  { key: 'parks', label: 'Parks and nature', query: 'nparks_parks', source: 'National Parks Board' },
  { key: 'sport', label: 'Sport facilities', query: 'sportsg_sport_facilities', source: 'Sport Singapore' },
  { key: 'clinics', label: 'Polyclinics', query: 'vaccination_polyclinics', source: 'Ministry of Health' },
  { key: 'hospitals', label: 'Hospitals', query: 'moh_hospitals', source: 'Ministry of Health' },
  { key: 'libraries', label: 'Libraries', query: 'libraries', source: 'National Library Board' },
  { key: 'community', label: 'Community clubs', query: 'communityclubs', source: "People's Association" },
  { key: 'schools', label: 'Private education', query: 'cpe_pei_premises', source: 'Committee for Private Education' },
];

export const AMENITY_KEYS = CATALOGUE.map((c) => c.key);

/** Metres between two points on the island. Flat earth is fine over 2km. */
export function metresBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = (bLat - aLat) * 111_320;
  const dLng = (bLng - aLng) * 111_320 * Math.cos((aLat * Math.PI) / 180);
  return Math.round(Math.hypot(dLat, dLng));
}

interface ThemeRow {
  NAME?: string;
  DESCRIPTION?: string;
  ADDRESSSTREETNAME?: string;
  ADDRESSBLOCKHOUSENUMBER?: string;
  ADDRESSPOSTALCODE?: string;
  ADDRESSBUILDINGNAME?: string;
  LatLng?: string;
}

/**
 * A degree of latitude is about 111km, so the box is the radius converted into
 * degrees. OneMap wants it as minLat,minLng,maxLat,maxLng.
 */
function extents(lat: number, lng: number, metres: number): string {
  const dLat = metres / 111_320;
  const dLng = metres / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng].map((n) => n.toFixed(6)).join(',');
}

/**
 * OneMap gives a theme's position in one of two shapes, and which one depends
 * on whether the underlying dataset holds points or polygons:
 *
 *   hawker centres  "1.28390,103.85000"          — latitude first
 *   parks           "[[103.88455,1.34664], ...]" — longitude first, a ring
 *
 * Reading the second as the first produced a latitude of 103, which failed the
 * distance check and silently dropped every park, every nature reserve and
 * anything else stored as an area. Rather than keep a list of which theme is
 * which, disambiguate by value: Singapore sits at roughly 1.2–1.5 north and
 * 103.6–104.1 east, and those ranges do not overlap.
 */
function parsePoint(raw: string): { lat: number; lng: number } | null {
  let a: number;
  let b: number;

  if (raw.trim().startsWith('[')) {
    try {
      // A ring of coordinates; its first vertex is close enough for a walk.
      const ring = JSON.parse(raw) as unknown;
      const first = Array.isArray(ring) && Array.isArray(ring[0]) ? ring[0] : null;
      if (!first) return null;
      [a, b] = (Array.isArray(first[0]) ? first[0] : first).map(Number) as [number, number];
    } catch {
      return null;
    }
  } else {
    [a, b] = raw.split(',').map(Number) as [number, number];
  }

  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const [lat, lng] = a > 100 ? [b, a] : [a, b];
  if (lat < 1.1 || lat > 1.5 || lng < 103.5 || lng > 104.2) return null;
  return { lat, lng };
}

export async function fetchTheme(
  query: string,
  lat: number,
  lng: number,
  radius: number,
  token: string,
): Promise<Amenity[]> {
  const url = new URL(THEMES);
  url.searchParams.set('queryName', query);
  url.searchParams.set('extents', extents(lat, lng, radius));

  const res = await fetchWithTimeout(url, { headers: { Authorization: token }, cache: 'no-store', timeoutMs: 9000 });
  /* A refusal or an outage is not an empty neighbourhood. Returning [] here
     once printed "No hospital within 5 km" for addresses beside a hospital,
     so anything but a well-formed answer is an error the caller must name. */
  if (!res.ok) throw new Error(`OneMap answered ${res.status} for ${query}.`);

  const body = (await res.json().catch(() => null)) as { SrchResults?: (ThemeRow & { FeatCount?: number })[]; error?: string } | null;
  if (!body || !Array.isArray(body.SrchResults)) {
    throw new Error(body?.error ? `OneMap refused ${query}: ${body.error}` : `OneMap sent an unreadable answer for ${query}.`);
  }
  const rows = body.SrchResults;

  return rows.flatMap((r) => {
    // The first element is the theme's own metadata, not a place.
    if (r.FeatCount !== undefined || !r.LatLng) return [];
    const point = parsePoint(r.LatLng);
    if (!point) return [];
    const distance = metresBetween(lat, lng, point.lat, point.lng);
    if (distance > radius) return [];

    const address = [
      r.ADDRESSBLOCKHOUSENUMBER,
      r.ADDRESSSTREETNAME || r.ADDRESSBUILDINGNAME,
      r.ADDRESSPOSTALCODE ? `Singapore ${r.ADDRESSPOSTALCODE}` : '',
    ].filter(Boolean).join(' ');

    return [{
      name: (r.NAME || r.DESCRIPTION || 'Unnamed').trim(),
      address: address.trim(),
      lat: point.lat,
      lng: point.lng,
      metres: distance,
    }];
  }).sort((a, b) => a.metres - b.metres);
}

export type AmenityLookup =
  /* `missing` names the themes that did not answer in time. A panel showing
     seven categories and saying so is worth more than an empty one. */
  | { status: 'ok'; radius: number; groups: AmenityGroup[]; missing: string[]; retrievedAt: string }
  | { status: 'no_token'; reason: string }
  | { status: 'failed'; reason: string };

export async function amenitiesAround(lat: number, lng: number, radius: number): Promise<AmenityLookup> {
  const token = process.env.ONEMAP_TOKEN;
  if (!token) {
    return {
      status: 'no_token',
      reason: 'The OneMap theme service needs a registered key, and one is not configured on this server.',
    };
  }

  // One request per theme, all at once: eight sequential round trips to a
  // government service is the difference between half a second and four.
  //
  // Settled rather than all: fired together these occasionally trip OneMap's
  // throttle, and one theme timing out used to take the whole panel down with
  // it. Each category stands or falls on its own now.
  const settled = await Promise.allSettled(
    CATALOGUE.map(async (c) => ({
      key: c.key,
      label: c.label,
      source: c.source,
      items: (await fetchTheme(c.query, lat, lng, radius, token)).slice(0, 12),
    })),
  );

  const groups: AmenityGroup[] = [];
  const missing: string[] = [];
  settled.forEach((outcome, i) => {
    if (outcome.status === 'fulfilled') groups.push(outcome.value);
    else missing.push(CATALOGUE[i].label);
  });

  // Nothing at all came back: that is an outage, not a partial answer.
  if (groups.length === 0) {
    const first = settled[0];
    const reason = first && first.status === 'rejected' && first.reason instanceof Error
      ? first.reason.message
      : 'The theme service did not answer.';
    return { status: 'failed', reason };
  }

  return { status: 'ok', radius, groups, missing, retrievedAt: new Date().toISOString() };
}
