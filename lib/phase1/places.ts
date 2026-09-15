/**
 * The places a tenant asks about before a viewing: the train, the schools, the
 * hospital, and where to take visitors at the weekend.
 *
 * Each comes from the body that publishes it, read when a report is prepared,
 * rather than from a table somebody typed in once and stopped maintaining:
 *
 *  - **Stations** — the Land Transport Authority's station exit dataset on
 *    data.gov.sg. Exits rather than station centroids, because the walk a
 *    tenant takes ends at the nearest entrance, and at an interchange that can
 *    be three hundred metres from the middle of the station.
 *  - **Schools** — the Ministry of Education's school directory on data.gov.sg.
 *    It carries postal codes but no coordinates, so each school is placed once
 *    through OneMap and the point is kept: a school does not move.
 *  - **Healthcare and attractions** — OneMap themes published by the Ministry
 *    of Health, the Singapore Tourism Board and the National Heritage Board.
 *
 * The two national datasets change a few times a year, so they are held for a
 * month — in memory for a warm instance, in the store for a cold one — and a
 * failed refresh falls back to the copy already held rather than to nothing.
 *
 * Server only.
 */

import { fetchWithTimeout } from '../http';
import { store } from '../store/driver';
import { fetchTheme, metresBetween } from './amenities';
import { plainName, titleCase } from './names';

export type PlaceKind = 'mrt' | 'schools' | 'healthcare' | 'attractions';
export const PLACE_KINDS: PlaceKind[] = ['mrt', 'schools', 'healthcare', 'attractions'];

export interface Place {
  name: string;
  /** A second line: the exit for a station, the level for a school. */
  detail?: string;
  /** Straight-line metres from the point asked about. */
  metres: number;
  lat: number;
  lng: number;
}

export type PlacesLookup =
  | {
    status: 'ok';
    kind: PlaceKind;
    radius: number;
    items: Place[];
    source: string;
    /** When the underlying dataset was read: today for live themes, the download date for held datasets. */
    retrievedAt: string;
    /** Schools not yet placed on the map, so the reader knows the list may be short. */
    pending?: number;
    /** Sources inside this kind that did not answer, e.g. polyclinics when hospitals did. */
    missing?: string[];
  }
  | { status: 'no_token' | 'failed'; kind: PlaceKind; reason: string };

const MONTH = 30 * 86_400_000;
const inSingapore = (lat: number, lng: number) => lat > 1.1 && lat < 1.5 && lng > 103.5 && lng < 104.2;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/* ------------------------------------------------------------- caching */

interface CacheDoc { id: string; fetchedAt: string; payload: unknown }
const cache = store<CacheDoc>('geocache');
const memo = new Map<string, { at: number; value: unknown }>();

/**
 * Memory, then the store, then the network — and a stale copy when the network
 * fails, because last month's station list is right and an empty one is not.
 */
async function held<T>(id: string, load: () => Promise<T>): Promise<{ value: T; at: number }> {
  const hit = memo.get(id);
  if (hit && Date.now() - hit.at < MONTH) return { value: hit.value as T, at: hit.at };

  const doc = await cache.get(id).catch(() => null);
  const docAt = doc ? Date.parse(doc.fetchedAt) : 0;
  if (doc && Date.now() - docAt < MONTH) {
    memo.set(id, { at: docAt, value: doc.payload });
    return { value: doc.payload as T, at: docAt };
  }

  try {
    const value = await load();
    const now = new Date();
    memo.set(id, { at: now.getTime(), value });
    await cache.put({ id, fetchedAt: now.toISOString(), payload: value }).catch(() => undefined);
    return { value, at: now.getTime() };
  } catch (err) {
    if (doc) return { value: doc.payload as T, at: docAt };
    throw err;
  }
}

/** data.gov.sg hands out a signed link to the file rather than the file itself. */
async function download(datasetId: string): Promise<Response> {
  const poll = await fetchWithTimeout(
    `https://api-open.data.gov.sg/v1/public/api/datasets/${datasetId}/poll-download`,
    { cache: 'no-store', timeoutMs: 8000 },
  );
  if (!poll.ok) throw new Error(`data.gov.sg answered ${poll.status}.`);
  const body = (await poll.json()) as { data?: { url?: string } };
  if (!body.data?.url) throw new Error('data.gov.sg did not return a download link.');

  const file = await fetchWithTimeout(body.data.url, { cache: 'no-store', timeoutMs: 10_000 });
  if (!file.ok) throw new Error(`The dataset download answered ${file.status}.`);
  return file;
}

/* -------------------------------------------------------------- stations */

const STATION_EXITS = 'd_b39d3a0871985372d7e1637193335da5';

interface Station { name: string; exits: { code: string; lat: number; lng: number }[] }

function stations(): Promise<{ value: Station[]; at: number }> {
  return held('lta-station-exits', async () => {
    const geo = (await (await download(STATION_EXITS)).json()) as {
      features?: { geometry?: { coordinates?: number[] }; properties?: { STATION_NA?: string; EXIT_CODE?: string } }[];
    };

    const byName = new Map<string, Station>();
    for (const f of geo.features ?? []) {
      const [lng, lat] = f.geometry?.coordinates ?? [];
      const raw = f.properties?.STATION_NA;
      if (!raw || !Number.isFinite(lat) || !Number.isFinite(lng) || !inSingapore(lat, lng)) continue;

      const name = titleCase(raw.replace(/\s+STATION$/i, ''));
      const station = byName.get(name) ?? { name, exits: [] };
      station.exits.push({ code: (f.properties?.EXIT_CODE ?? '').trim(), lat: round6(lat), lng: round6(lng) });
      byName.set(name, station);
    }

    // A file with a handful of stations in it is a broken download, not a network.
    if (byName.size < 100) throw new Error('The station exit dataset came back incomplete.');
    return [...byName.values()];
  });
}

async function stationsAround(lat: number, lng: number, radius: number): Promise<{ items: Place[]; at: number }> {
  const { value: all, at } = await stations();
  const measured = all.map((s) => {
    const nearest = s.exits
      .map((e) => ({ e, metres: metresBetween(lat, lng, e.lat, e.lng) }))
      .sort((a, b) => a.metres - b.metres)[0];
    return {
      name: titleCase(s.name),
      detail: nearest.e.code || undefined,
      metres: nearest.metres,
      lat: nearest.e.lat,
      lng: nearest.e.lng,
    };
  }).sort((a, b) => a.metres - b.metres);

  /* The nearest station is always worth stating, even when it is a bus ride
     away; "nothing within two kilometres" is not an answer to "how far". */
  const within = measured.filter((p) => p.metres <= radius);
  return { items: (within.length ? within : measured.slice(0, 1)).slice(0, 5), at };
}

/* --------------------------------------------------------------- schools */

const SCHOOL_DIRECTORY = 'https://data.gov.sg/api/action/datastore_search'
  + '?resource_id=d_688b934f82c1059ed0a6993d2a829089&limit=1000&fields=school_name,postal_code,mainlevel_code';

interface School { name: string; postal: string; level: string }

const LEVEL: Record<string, string> = {
  PRIMARY: 'Primary',
  'SECONDARY (S1-S5)': 'Secondary',
  'SECONDARY (S1-S4)': 'Secondary',
  'JUNIOR COLLEGE': 'Junior college',
  'MIXED LEVEL (S1-JC2)': 'Secondary and JC',
  'MIXED LEVEL (S1-S5, JC1-JC2)': 'Secondary and JC',
  'MIXED LEVEL (P1-S4)': 'Primary and secondary',
  'CENTRALISED INSTITUTE': 'Centralised institute',
};

function directory(): Promise<{ value: School[]; at: number }> {
  return held('moe-school-directory', async () => {
    const res = await fetchWithTimeout(SCHOOL_DIRECTORY, { cache: 'no-store', timeoutMs: 8000 });
    if (!res.ok) throw new Error(`The school directory answered ${res.status}.`);
    const body = (await res.json()) as {
      result?: { records?: { school_name?: string; postal_code?: string; mainlevel_code?: string }[] };
    };
    const schools = (body.result?.records ?? []).flatMap((r) => {
      const postal = (r.postal_code ?? '').trim().padStart(6, '0');
      if (!r.school_name || !/^\d{6}$/.test(postal)) return [];
      const code = (r.mainlevel_code ?? '').trim().toUpperCase();
      return [{ name: titleCase(r.school_name), postal, level: LEVEL[code] ?? titleCase(code) }];
    });
    if (schools.length < 100) throw new Error('The school directory came back incomplete.');
    return schools;
  });
}

/** A postal code placed once. `found: false` is kept too, so a miss is not retried every time. */
interface Geocode { id: string; lat: number; lng: number; found: boolean; at: string }
const geocodes = store<Geocode>('geocodes');
const placed = new Map<string, Geocode>();

async function knownPoints(): Promise<Map<string, Geocode>> {
  if (placed.size === 0) {
    for (const g of await geocodes.list().catch(() => [] as Geocode[])) placed.set(g.id, g);
  }
  return placed;
}

async function geocodePostal(postal: string, token: string | undefined): Promise<Geocode | 'throttled' | null> {
  const url = new URL('https://www.onemap.gov.sg/api/common/elastic/search');
  url.searchParams.set('searchVal', postal);
  url.searchParams.set('returnGeom', 'Y');
  url.searchParams.set('getAddrDetails', 'N');
  url.searchParams.set('pageNum', '1');

  const res = await fetchWithTimeout(url, {
    headers: token ? { Authorization: token } : undefined,
    cache: 'no-store',
    timeoutMs: 5000,
  });
  if (res.status === 429) return 'throttled';
  if (!res.ok) return null;

  const body = (await res.json()) as { results?: { LATITUDE?: string; LONGITUDE?: string }[] };
  const first = body.results?.[0];
  const lat = Number(first?.LATITUDE);
  const lng = Number(first?.LONGITUDE);
  const found = Number.isFinite(lat) && Number.isFinite(lng) && inSingapore(lat, lng);
  return {
    id: `postal-${postal}`,
    lat: found ? round6(lat) : 0,
    lng: found ? round6(lng) : 0,
    found,
    at: new Date().toISOString(),
  };
}

async function schoolsAround(
  lat: number,
  lng: number,
  radius: number,
  postal: string | undefined,
  budgetMs: number,
): Promise<{ items: Place[]; pending: number; at: number }> {
  const { value: schools, at } = await directory();
  const points = await knownPoints();
  const token = process.env.ONEMAP_TOKEN || undefined;

  /* Place the schools not yet on the map, nearest postal sector first, for as
     long as the budget allows. Sectors are numbered roughly by area, so this
     settles the schools that matter to this address before the rest. */
  const sector = postal && /^\d{6}$/.test(postal) ? Number(postal.slice(0, 2)) : null;
  const gap = (p: string) => (sector === null ? 0 : Math.abs(Number(p.slice(0, 2)) - sector));
  const queue = [...new Set(schools.map((s) => s.postal))]
    .filter((p) => !points.has(`postal-${p}`))
    .sort((a, b) => gap(a) - gap(b));

  const deadline = Date.now() + budgetMs;
  let throttled = false;
  const worker = async () => {
    while (queue.length && !throttled && Date.now() < deadline) {
      const next = queue.shift()!;
      try {
        const g = await geocodePostal(next, token);
        if (g === 'throttled') { throttled = true; break; }
        if (g) {
          points.set(g.id, g);
          await geocodes.put(g).catch(() => undefined);
        }
      } catch {
        /* A timeout on one school is not a reason to stop placing the others. */
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);

  let pending = 0;
  const items: Place[] = [];
  for (const s of schools) {
    const g = points.get(`postal-${s.postal}`);
    if (!g) { pending += 1; continue; }
    if (!g.found) continue;
    const metres = metresBetween(lat, lng, g.lat, g.lng);
    if (metres <= radius) items.push({ name: titleCase(s.name), detail: s.level, metres, lat: g.lat, lng: g.lng });
  }
  items.sort((a, b) => a.metres - b.metres);
  return { items: items.slice(0, 14), pending, at };
}

/* ------------------------------------------------------- OneMap themes */

class NoToken extends Error {}

async function themes(
  lat: number,
  lng: number,
  radius: number,
  sources: { query: string; detail: string }[],
  limit: number,
): Promise<{ items: Place[]; missing: string[] }> {
  const token = process.env.ONEMAP_TOKEN;
  if (!token) throw new NoToken('OneMap is not configured on this server.');

  const settled = await Promise.allSettled(
    sources.map(async (s) => (await fetchTheme(s.query, lat, lng, radius, token)).map((a) => ({ ...a, detail: s.detail }))),
  );
  if (settled.every((r) => r.status === 'rejected')) throw new Error('The theme service did not answer.');

  const missing = sources.filter((_, i) => settled[i].status === 'rejected').map((s) => s.detail);
  const seen = new Set<string>();
  const items = settled
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .map((a) => ({ ...a, name: plainName(a.name) }))
    .sort((a, b) => a.metres - b.metres)
    .filter((a) => {
      const key = a.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map((a) => ({ name: a.name, detail: a.detail, metres: a.metres, lat: a.lat, lng: a.lng }));
  return { items, missing };
}

/* ----------------------------------------------------------------- entry */

export async function placesAround(
  kind: PlaceKind,
  lat: number,
  lng: number,
  options: { postal?: string; budgetMs?: number } = {},
): Promise<PlacesLookup> {
  try {
    switch (kind) {
      case 'mrt': {
        const radius = 2000;
        const { items, at } = await stationsAround(lat, lng, radius);
        return {
          status: 'ok', kind, radius, items,
          source: 'Land Transport Authority station exits, via data.gov.sg',
          retrievedAt: new Date(at).toISOString(),
        };
      }
      case 'schools': {
        const radius = 2000;
        const { items, pending, at } = await schoolsAround(lat, lng, radius, options.postal, options.budgetMs ?? 6000);
        return {
          status: 'ok', kind, radius, items, pending,
          source: 'Ministry of Education school directory, via data.gov.sg, placed with OneMap',
          retrievedAt: new Date(at).toISOString(),
        };
      }
      case 'healthcare': {
        const radius = 5000;
        const { items, missing } = await themes(lat, lng, radius, [
          { query: 'moh_hospitals', detail: 'Hospital' },
          { query: 'vaccination_polyclinics', detail: 'Polyclinic' },
        ], 8);
        return {
          status: 'ok', kind, radius, items, missing,
          source: 'Ministry of Health, via OneMap',
          retrievedAt: new Date().toISOString(),
        };
      }
      case 'attractions': {
        /* Wider than the rest: the board's list is weighted to the centre, and a
           Punggol flat with nothing inside six kilometres still has a weekend. */
        const radius = 8000;
        const { items, missing } = await themes(lat, lng, radius, [
          { query: 'tourism', detail: 'Attraction' },
          { query: 'museum', detail: 'Museum' },
        ], 6);
        return {
          status: 'ok', kind, radius, items, missing,
          source: 'Singapore Tourism Board and National Heritage Board, via OneMap',
          retrievedAt: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    if (err instanceof NoToken) return { status: 'no_token', kind, reason: err.message };
    return { status: 'failed', kind, reason: err instanceof Error ? err.message : 'The lookup failed.' };
  }
}
