/**
 * The illustrative set of nearby places, for Demo Data ON.
 *
 * The global Demo Data switch means one thing throughout this application:
 * with it on, nothing is read from a live source and nothing is written to the
 * database. So the wizard does not call the nearby endpoint in demo mode — it
 * builds a plausible neighbourhood here instead, and labels it as demo on
 * screen.
 *
 * Seeded by the address, so the same property shows the same neighbourhood on
 * every machine, in every screenshot, and after every reload. The places are
 * placed on real bearings at real distances from the property, which keeps the
 * distances internally consistent without implying that any of them exist.
 *
 * Pure, and free of server imports: this runs in the browser.
 */

import {
  NEARBY_CATEGORIES, metresApart,
  type NearbyCategory, type NearbyGroup, type NearbyLookup, type NearbyPlace,
} from './nearby';
import type { RouteMode, RouteResult } from './directions';

const CREDIT = 'Illustrative demo data';

type Rand = () => number;

function seeded(key: string): Rand {
  let a = 0;
  for (let i = 0; i < key.length; i += 1) a = (Math.imul(a ^ key.charCodeAt(i), 2654435761) >>> 0);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (r: Rand, lo: number, hi: number) => lo + r() * (hi - lo);

/** Several stems without repeats, so two places in one list never share a name. */
function draw(r: Rand, pool: readonly string[], n: number): string[] {
  const rest = [...pool];
  const out: string[] = [];
  while (out.length < n && rest.length) out.push(rest.splice(Math.floor(r() * rest.length), 1)[0]);
  return out;
}

/* Invented place-name stems. Deliberately not the names of real estates: a
   demo neighbourhood should not be mistaken for a survey of a real one. */
const STEMS = [
  'Northbrook', 'Westmead', 'Riverstone', 'Oakridge', 'Maplewood', 'Elmhurst',
  'Brightwater', 'Stonebridge', 'Ashcombe', 'Larkspur', 'Hollins', 'Greywell',
];

/** A point `metres` away on `bearing` degrees, so the distance shown is the distance drawn. */
function toward(lat: number, lng: number, metres: number, bearing: number) {
  const rad = (bearing * Math.PI) / 180;
  return {
    lat: Math.round((lat + (metres * Math.cos(rad)) / 111_320) * 1e6) / 1e6,
    lng: Math.round((lng + (metres * Math.sin(rad)) / (111_320 * Math.cos((lat * Math.PI) / 180))) * 1e6) / 1e6,
  };
}

const RADIUS: Record<NearbyCategory, number> = {
  transport: 2000, schools: 2000, healthcare: 5000, food: 2000, parks: 2000, community: 2000,
};

/**
 * What each category is made of, as `[suffix, detail, nearest, furthest]`.
 *
 * Long enough that narrowing the radius in the wizard visibly shortens the
 * list, and spread so that every radius on the selector has something in it.
 */
const SHAPE: Record<NearbyCategory, [string, string, number, number][]> = {
  transport: [
    ['MRT', 'Exit A', 280, 620],
    ['MRT', 'Exit B', 900, 1400],
    ['MRT', 'Exit C', 1500, 1950],
    ['LRT', 'Exit A', 700, 1300],
  ],
  schools: [
    ['Primary School', 'Primary', 260, 650],
    ['Primary School', 'Primary', 800, 1400],
    ['Secondary School', 'Secondary', 420, 900],
    ['Secondary School', 'Secondary', 1100, 1700],
    ['Junior College', 'Junior college', 1300, 1950],
  ],
  healthcare: [
    ['Polyclinic', 'Polyclinic', 700, 1600],
    ['Medical Centre', 'Polyclinic', 1700, 3200],
    ['General Hospital', 'Hospital', 2400, 4600],
  ],
  food: [
    ['Food Centre', 'Hawker centre', 180, 480],
    ['Market and Food Centre', 'Hawker centre', 520, 950],
    ['Hawker Centre', 'Hawker centre', 1100, 1900],
  ],
  parks: [
    ['Park', 'Park', 150, 460],
    ['Park Connector', 'Park', 300, 900],
    ['Sports Centre', 'Sport', 600, 1300],
    ['Nature Park', 'Park', 1200, 1950],
    ['Swimming Complex', 'Sport', 900, 1800],
  ],
  community: [
    ['Community Club', 'Community club', 250, 700],
    ['Public Library', 'Library', 600, 1500],
    ['Community Centre', 'Community club', 1200, 1900],
  ],
};

/**
 * A neighbourhood for one address.
 *
 * Every category answers, because the point of the demo set is to show the
 * screen working; the empty and unavailable states are what the live sources
 * produce, and they are exercised with Demo Data off.
 */
export function demoNearby(lat: number, lng: number, postal?: string): NearbyLookup {
  const seed = postal && /^\d{6}$/.test(postal) ? postal : `${lat.toFixed(4)},${lng.toFixed(4)}`;

  const groups: NearbyGroup[] = NEARBY_CATEGORIES.map(({ key }): NearbyGroup => {
    const r = seeded(`nearby|${key}|${seed}`);
    const stems = draw(r, STEMS, SHAPE[key].length);
    const items = SHAPE[key]
      .map(([suffix, detail, lo, hi], i): NearbyPlace => {
        const point = toward(lat, lng, between(r, lo, hi), between(r, 0, 360));
        return {
          name: `${stems[i] ?? STEMS[i % STEMS.length]} ${suffix}`,
          category: key,
          detail,
          lat: point.lat,
          lng: point.lng,
          /* Measured back from the placed point, so the number on screen and
             the pin on the map can never disagree. */
          distanceMetres: metresApart(lat, lng, point.lat, point.lng),
        };
      })
      .sort((a, b) => a.distanceMetres - b.distanceMetres);

    return { category: key, status: 'ok', radiusMetres: RADIUS[key], items, source: CREDIT };
  });

  return {
    origin: { lat, lng, postal },
    mode: 'demo',
    groups,
    /* Fixed rather than "now": a demo screen that changes every render is a
       demo screen nobody can screenshot twice. */
    retrievedAt: '2026-01-01T00:00:00.000Z',
  };
}

/* -------------------------------------------------------------- routing */

/**
 * Roads are not straight, and a route is longer than the line between its
 * ends. These are the ratios a demo route is drawn with, and the speeds it is
 * timed at — walking pace, and a drive slow enough to allow for junctions.
 */
const DETOUR = { walk: 1.25, drive: 1.35 };
const METRES_PER_MINUTE = { walk: 78, drive: 420 };

/**
 * An illustrative route between two demo points.
 *
 * Demo Data does not reach the routing service either, so the line is drawn
 * here: out to one side and back, the way a path around a block goes, with the
 * distance and time derived from it. Labelled `demo` all the way to the
 * screen, where it appears under the panel's demo badge.
 */
export function demoDirections(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: RouteMode,
): RouteResult {
  const straight = metresApart(from.lat, from.lng, to.lat, to.lng);
  const r = seeded(`route|${mode}|${from.lat},${from.lng}|${to.lat},${to.lng}`);

  /* One bend, a little off the midpoint and to a random side, so the line
     reads as a route rather than as the straight line it is measured from. */
  const side = r() < 0.5 ? 1 : -1;
  const swing = (straight * between(r, 0.08, 0.16) * side) / 111_320;
  const bend: [number, number] = [
    Math.round(((from.lat + to.lat) / 2 - swing) * 1e6) / 1e6,
    Math.round(((from.lng + to.lng) / 2 + swing) * 1e6) / 1e6,
  ];

  const distanceMetres = Math.round(straight * DETOUR[mode]);
  return {
    status: 'ok',
    mode,
    distanceMetres,
    seconds: Math.round((distanceMetres / METRES_PER_MINUTE[mode]) * 60),
    path: [[from.lat, from.lng], bend, [to.lat, to.lng]],
    source: 'demo',
  };
}
