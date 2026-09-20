/**
 * Where the nearby places actually come from.
 *
 * An adapter, not a new provider. Everything here is already fetched, parsed
 * and cached somewhere else in this codebase:
 *
 *  - **Transport, schools and healthcare** — `places.placesAround`, which reads
 *    the LTA station-exit file and the MOE school directory from data.gov.sg,
 *    holds them for a month, and places schools through OneMap once each.
 *  - **Food, parks and community** — `amenities.fetchTheme`, one bounding-box
 *    query per government theme on OneMap's theme service.
 *
 * This module's only job is to ask them in one go and answer in the one shape
 * the wizard understands. A source that fails is reported as that source
 * failing; nothing is filled in from anywhere else, and nothing is invented.
 *
 * Server only — it reads ONEMAP_TOKEN through the modules above.
 */

import { fetchTheme, type Amenity } from './amenities';
import { plainName } from './names';
import { placesAround, type PlaceKind, type PlacesLookup } from './places';
import {
  NEARBY_CATEGORY_KEYS, nearbyCategory,
  type NearbyCategory, type NearbyGroup, type NearbyLookup, type NearbyPlace,
} from './nearby';

/**
 * At most this many per category.
 *
 * Enough that narrowing the radius in the wizard still leaves a list worth
 * reading, short enough that the answer stays a summary rather than a
 * directory of every park in the north of the island.
 */
const PER_CATEGORY = 12;

/**
 * How far out each category looks — the widest the agent can then ask for.
 *
 * Transport, schools and healthcare are set by `places` and repeated here only
 * so the answer can state what it searched; the theme categories are set here.
 * Healthcare reaches furthest because hospitals are sparse and the nearest one
 * is worth naming wherever it is.
 */
const RADIUS: Record<NearbyCategory, number> = {
  transport: 2000,
  schools: 2000,
  healthcare: 5000,
  food: 2000,
  parks: 2000,
  community: 2000,
};

/** The categories served by `places`, and the kind each one asks for. */
const FROM_PLACES: Partial<Record<NearbyCategory, PlaceKind>> = {
  transport: 'mrt',
  schools: 'schools',
  healthcare: 'healthcare',
};

/** The categories served by OneMap themes, and the themes behind each. */
const FROM_THEMES: Partial<Record<NearbyCategory, { query: string; detail: string }[]>> = {
  food: [{ query: 'ssot_hawkercentres', detail: 'Hawker centre' }],
  parks: [
    { query: 'nparks_parks', detail: 'Park' },
    { query: 'sportsg_sport_facilities', detail: 'Sport' },
  ],
  community: [
    { query: 'libraries', detail: 'Library' },
    { query: 'communityclubs', detail: 'Community club' },
  ],
};

/**
 * Placing every school on the map takes as long as it is given. A report can
 * afford six seconds; an agent waiting on a form cannot, so the wizard settles
 * for the schools already placed plus whatever this budget buys.
 */
const SCHOOL_BUDGET_MS = 2500;

const unavailable = (category: NearbyCategory, reason: string): NearbyGroup =>
  ({ category, status: 'unavailable', reason });

function fromPlaces(category: NearbyCategory, lookup: PlacesLookup): NearbyGroup {
  if (lookup.status !== 'ok') {
    return unavailable(
      category,
      lookup.status === 'no_token' ? 'OneMap is not configured on this server.' : lookup.reason,
    );
  }

  return {
    category,
    status: 'ok',
    radiusMetres: lookup.radius,
    source: nearbyCategory(category).source,
    items: lookup.items.slice(0, PER_CATEGORY).map((p): NearbyPlace => ({
      name: p.name,
      category,
      detail: p.detail,
      lat: p.lat,
      lng: p.lng,
      distanceMetres: p.metres,
    })),
  };
}

/**
 * One category made of one or more themes.
 *
 * Settled rather than all: fired together these occasionally trip OneMap's
 * throttle, and a library outage should not take the community clubs with it.
 * Every theme failing is the category failing; some failing is a shorter list.
 */
async function fromThemes(
  category: NearbyCategory,
  sources: { query: string; detail: string }[],
  lat: number,
  lng: number,
  token: string,
): Promise<NearbyGroup> {
  const radiusMetres = RADIUS[category];
  const settled = await Promise.allSettled(
    sources.map(async (s) => ({ detail: s.detail, rows: await fetchTheme(s.query, lat, lng, radiusMetres, token) })),
  );
  if (settled.every((r) => r.status === 'rejected')) {
    const first = settled[0];
    const reason = first && first.status === 'rejected' && first.reason instanceof Error
      ? first.reason.message
      : 'The theme service did not answer.';
    return unavailable(category, reason);
  }

  const seen = new Set<string>();
  const items = settled
    .flatMap((r) => (r.status === 'fulfilled'
      ? r.value.rows.map((a: Amenity) => ({ ...a, detail: r.value.detail }))
      : []))
    .sort((a, b) => a.metres - b.metres)
    .flatMap((a): NearbyPlace[] => {
      const name = plainName(a.name);
      const key = name.toLowerCase();
      /* The same park appears once per polygon in the NParks theme; the same
         club appears under two names. The nearest copy is the one that counts. */
      if (!name || seen.has(key)) return [];
      seen.add(key);
      return [{
        name,
        category,
        detail: a.detail,
        lat: a.lat,
        lng: a.lng,
        distanceMetres: a.metres,
        address: a.address || undefined,
      }];
    })
    .slice(0, PER_CATEGORY);

  return { category, status: 'ok', radiusMetres, items, source: nearbyCategory(category).source };
}

/**
 * Everything around one point, from the published datasets.
 *
 * All six categories at once — they are independent lookups against two
 * different services and running them in sequence would put a station list
 * behind a school directory for no reason.
 */
export async function nearbyAround(
  lat: number,
  lng: number,
  options: { postal?: string; categories?: NearbyCategory[] } = {},
): Promise<NearbyLookup> {
  const wanted = options.categories?.length ? options.categories : NEARBY_CATEGORY_KEYS;
  const token = process.env.ONEMAP_TOKEN;

  const groups = await Promise.all(wanted.map(async (category): Promise<NearbyGroup> => {
    try {
      const kind = FROM_PLACES[category];
      if (kind) {
        return fromPlaces(category, await placesAround(kind, lat, lng, {
          postal: options.postal,
          budgetMs: kind === 'schools' ? SCHOOL_BUDGET_MS : undefined,
        }));
      }

      const themes = FROM_THEMES[category];
      if (!themes) return unavailable(category, 'No dataset is configured for this category.');
      if (!token) return unavailable(category, 'OneMap is not configured on this server.');
      return await fromThemes(category, themes, lat, lng, token);
    } catch (err) {
      return unavailable(category, err instanceof Error ? err.message : 'The lookup failed.');
    }
  }));

  return {
    origin: { lat, lng, postal: options.postal },
    mode: 'live',
    groups,
    retrievedAt: new Date().toISOString(),
  };
}
