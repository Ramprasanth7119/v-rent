/**
 * What is around a property, in the shape the listing wizard shows it.
 *
 * The agent filling in an address is answering the question a tenant asks
 * first — "what is near it?" — and the datasets that answer it are already in
 * this codebase: station exits and the school directory in `places`, the
 * government themes in `amenities`. This module is the vocabulary those two
 * speak into: one category list, one place shape, one way of writing a
 * distance. The server adapter is `nearby-sources`; the illustrative set for
 * Demo Data is `nearby-demo`. Both return what is declared here.
 *
 * Deliberately free of server imports so the wizard can hold the types and the
 * demo set without dragging the OneMap token into the browser bundle.
 *
 * Only categories a real published dataset answers for are listed. Shopping
 * malls, supermarkets, convenience stores, bus stops and preschools are all
 * asked about by tenants and none of them are published by the sources this
 * application reads, so they are absent rather than guessed at.
 */

export type NearbyCategory = 'transport' | 'schools' | 'healthcare' | 'food' | 'parks' | 'community';

/** One place, however it was found. Straight-line metres from the property. */
export interface NearbyPlace {
  name: string;
  category: NearbyCategory;
  /** A second line: the station exit, the school's level, the kind of facility. */
  detail?: string;
  lat: number;
  lng: number;
  distanceMetres: number;
  address?: string;
}

export type NearbyGroup =
  | {
    category: NearbyCategory;
    status: 'ok';
    /** How far out the search went, so "none" can be stated with a bound. */
    radiusMetres: number;
    items: NearbyPlace[];
    /** Who publishes it, named so the agent can check it. */
    source: string;
  }
  /* A source that did not answer is not an empty neighbourhood. Naming the
     category and the reason keeps the two apart on screen. */
  | { category: NearbyCategory; status: 'unavailable'; reason: string };

export interface NearbyLookup {
  origin: { lat: number; lng: number; postal?: string };
  /** `demo` is the illustrative set; `live` came from the published datasets. */
  mode: 'live' | 'demo';
  groups: NearbyGroup[];
  retrievedAt: string;
}

/**
 * The categories, in the order an agent reads them, with the label used on
 * screen and the dataset behind each one. Everything that renders a category
 * reads this: there is one place to change a name or add a source.
 */
export const NEARBY_CATEGORIES: {
  key: NearbyCategory;
  /** The section heading. */
  label: string;
  /** How the count reads: "9 clinics and hospitals within 5 km". */
  noun: string;
  /** Who publishes it. Printed under the section. */
  source: string;
}[] = [
  { key: 'transport', label: 'MRT and LRT', noun: 'stations', source: 'Land Transport Authority station exits, via data.gov.sg' },
  { key: 'schools', label: 'Schools', noun: 'schools', source: 'Ministry of Education school directory, via data.gov.sg' },
  { key: 'healthcare', label: 'Healthcare', noun: 'clinics and hospitals', source: 'Ministry of Health, via OneMap' },
  { key: 'food', label: 'Food', noun: 'hawker centres and markets', source: 'Singapore Food Agency, via OneMap' },
  { key: 'parks', label: 'Parks and sport', noun: 'parks and sport facilities', source: 'National Parks Board and Sport Singapore, via OneMap' },
  { key: 'community', label: 'Community', noun: 'libraries and clubs', source: "National Library Board and the People's Association, via OneMap" },
];

export const NEARBY_CATEGORY_KEYS: NearbyCategory[] = NEARBY_CATEGORIES.map((c) => c.key);

export const isNearbyCategory = (raw: string): raw is NearbyCategory =>
  (NEARBY_CATEGORY_KEYS as string[]).includes(raw);

export const nearbyCategory = (key: NearbyCategory) => NEARBY_CATEGORIES.find((c) => c.key === key)!;

/**
 * A distance a person can act on.
 *
 * Metres to the nearest ten below a kilometre, one decimal above it: the
 * measurement is a straight line between two points and writing it as "437 m"
 * would claim a precision the walk does not have.
 *
 * No walking time. Turning a straight line into minutes means guessing at a
 * route, and a flat across the road from a station with an expressway between
 * them would be told it is an eight-minute walk when it is twenty.
 */
export function formatDistance(metres: number): string {
  if (!Number.isFinite(metres) || metres < 0) return '—';
  if (metres < 1000) return `${Math.max(10, Math.round(metres / 10) * 10)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

/**
 * A travel time, from a route that was actually measured.
 *
 * Only ever called with the seconds a routing service returned. There is
 * deliberately no helper that turns metres into minutes: that is the guess
 * this feature refuses to make.
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} hr ${rest} min` : `${Math.floor(minutes / 60)} hr`;
}

/**
 * The radii an agent can narrow a category to.
 *
 * Offered rather than fixed because the useful distance depends on what is
 * being looked at: a hawker centre 400 metres away is the one they will eat
 * at, and the nearest hospital is worth naming at five kilometres. Only the
 * radii a category actually searched are offered — narrowing a list is honest,
 * widening it past what was fetched would quietly show a short answer.
 */
export const NEARBY_RADII = [500, 1000, 2000, 5000];

export const radiusOptions = (searched: number): number[] => {
  const inside = NEARBY_RADII.filter((r) => r < searched);
  return [...inside, searched];
};

/** "500 m", "2 km" — the radius as it reads in the selector. */
export const formatRadius = (metres: number): string =>
  (metres < 1000 ? `${metres} m` : `${Number((metres / 1000).toFixed(1))} km`);

/** The places in a group inside a chosen radius, nearest first. */
export function placesWithin(group: NearbyGroup | undefined, radiusMetres: number): NearbyPlace[] {
  if (!group || group.status !== 'ok') return [];
  return group.items.filter((p) => p.distanceMetres <= radiusMetres);
}

/** Singapore, with room for the outlying islands. The same bound the map route uses. */
export const inSingapore = (lat: number, lng: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat > 1.1 && lat < 1.5 && lng > 103.5 && lng < 104.15;

/** Metres between two points on the island. Flat earth is fine over a few kilometres. */
export function metresApart(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = (bLat - aLat) * 111_320;
  const dLng = (bLng - aLng) * 111_320 * Math.cos((aLat * Math.PI) / 180);
  return Math.round(Math.hypot(dLat, dLng));
}

/** One place's identity, for selection and for React keys. */
export const placeKey = (p: NearbyPlace): string => `${p.category}|${p.name}|${p.distanceMetres}`;

export const groupOf = (lookup: NearbyLookup, key: NearbyCategory): NearbyGroup | undefined =>
  lookup.groups.find((g) => g.category === key);

/** True when every source failed — an outage, rather than a quiet neighbourhood. */
export function nearbyAllUnavailable(lookup: NearbyLookup): boolean {
  return lookup.groups.length > 0 && lookup.groups.every((g) => g.status === 'unavailable');
}

/** The point a lookup was made for, rounded so the same building is the same key. */
export const nearbyKey = (lat: number, lng: number, postal?: string): string =>
  `${lat.toFixed(5)},${lng.toFixed(5)},${postal ?? ''}`;
