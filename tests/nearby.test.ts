/**
 * "What's nearby" on the listing wizard.
 *
 * The rules worth holding still are the ones that would go quietly wrong: a
 * distance that claims more precision than a straight line has, a radius
 * selector that widens past what was actually searched, a demo neighbourhood
 * leaking into the live path, and nearby places being written into a listing
 * where they would go stale.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  NEARBY_CATEGORIES, NEARBY_CATEGORY_KEYS, formatDistance, formatDuration, formatRadius, groupOf, isNearbyCategory,
  metresApart, nearbyAllUnavailable, nearbyKey, placeKey, placesWithin, radiusOptions,
  type NearbyGroup, type NearbyLookup,
} from '../lib/phase1/nearby';
import { decodePolyline, isRouteMode } from '../lib/phase1/directions';
import { demoDirections, demoNearby } from '../lib/phase1/nearby-demo';

const ROOT = path.join(__dirname, '..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

/* 787E Woodlands Crescent, and a flat in the centre of town to compare it to. */
const WOODLANDS = { lat: 1.444921, lng: 103.802297, postal: '735787' };
const TANJONG_PAGAR = { lat: 1.276, lng: 103.8458, postal: '088539' };

describe('distances', () => {
  it('rounds to a precision a straight line can support', () => {
    expect(formatDistance(450)).toBe('450 m');
    /* 437 metres as the crow flies is not 437 metres of pavement. */
    expect(formatDistance(437)).toBe('440 m');
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(1234)).toBe('1.2 km');
    expect(formatDistance(2400)).toBe('2.4 km');
  });

  it('never shows nothing, and never shows a negative', () => {
    expect(formatDistance(3)).toBe('10 m');
    expect(formatDistance(-1)).toBe('—');
    expect(formatDistance(Number.NaN)).toBe('—');
  });

  it('measures the island flat, and agrees with itself', () => {
    expect(metresApart(WOODLANDS.lat, WOODLANDS.lng, WOODLANDS.lat, WOODLANDS.lng)).toBe(0);
    const north = metresApart(1.3, 103.8, 1.309, 103.8);
    expect(north).toBeGreaterThan(950);
    expect(north).toBeLessThan(1050);
  });
});

describe('the radius selector', () => {
  it('offers only radii inside what was actually searched', () => {
    expect(radiusOptions(2000)).toEqual([500, 1000, 2000]);
    expect(radiusOptions(5000)).toEqual([500, 1000, 2000, 5000]);
    /* Never wider than the lookup: that would show a short list as a full one. */
    for (const searched of [500, 1000, 2000, 5000]) {
      for (const option of radiusOptions(searched)) expect(option).toBeLessThanOrEqual(searched);
      expect(radiusOptions(searched)).toContain(searched);
    }
  });

  it('writes a radius the way the selector reads', () => {
    expect(formatRadius(500)).toBe('500 m');
    expect(formatRadius(1000)).toBe('1 km');
    expect(formatRadius(2000)).toBe('2 km');
    expect(formatRadius(5000)).toBe('5 km');
  });

  it('narrows a list without touching what was fetched', () => {
    const group: NearbyGroup = {
      category: 'parks', status: 'ok', radiusMetres: 2000, source: 'x',
      items: [300, 900, 1800].map((m) => ({ name: `P${m}`, category: 'parks' as const, lat: 1.3, lng: 103.8, distanceMetres: m })),
    };
    expect(placesWithin(group, 2000)).toHaveLength(3);
    expect(placesWithin(group, 1000)).toHaveLength(2);
    expect(placesWithin(group, 500)).toHaveLength(1);
    expect(group.status === 'ok' && group.items).toHaveLength(3);
  });

  it('shows nothing for a category that did not answer', () => {
    const failed: NearbyGroup = { category: 'food', status: 'unavailable', reason: 'OneMap answered 503.' };
    expect(placesWithin(failed, 5000)).toEqual([]);
    expect(placesWithin(undefined, 5000)).toEqual([]);
  });
});

describe('categories', () => {
  it('names a source for every one of them', () => {
    expect(NEARBY_CATEGORIES.length).toBeGreaterThan(0);
    for (const c of NEARBY_CATEGORIES) {
      expect(c.label.length, c.key).toBeGreaterThan(0);
      expect(c.noun.length, c.key).toBeGreaterThan(0);
      expect(c.source.length, c.key).toBeGreaterThan(8);
    }
    expect(new Set(NEARBY_CATEGORY_KEYS).size).toBe(NEARBY_CATEGORIES.length);
  });

  it('accepts only the categories it publishes', () => {
    for (const key of NEARBY_CATEGORY_KEYS) expect(isNearbyCategory(key)).toBe(true);
    /* Asked about by tenants, not published by any source this app reads. */
    for (const made of ['malls', 'supermarkets', 'bus', 'preschools', '', 'TRANSPORT']) {
      expect(isNearbyCategory(made), made).toBe(false);
    }
  });
});

describe('the demo neighbourhood (Demo Data ON)', () => {
  const demo = demoNearby(WOODLANDS.lat, WOODLANDS.lng, WOODLANDS.postal);

  it('says it is demo data', () => {
    expect(demo.mode).toBe('demo');
    for (const g of demo.groups) expect(g.status === 'ok' && g.source).toMatch(/demo/i);
  });

  it('answers every category, nearest first', () => {
    expect(demo.groups.map((g) => g.category)).toEqual(NEARBY_CATEGORY_KEYS);
    for (const g of demo.groups) {
      expect(g.status, g.category).toBe('ok');
      if (g.status !== 'ok') continue;
      expect(g.items.length, g.category).toBeGreaterThan(0);
      for (let i = 1; i < g.items.length; i += 1) {
        expect(g.items[i - 1].distanceMetres).toBeLessThanOrEqual(g.items[i].distanceMetres);
      }
    }
  });

  it('places every point where its distance says it is', () => {
    for (const g of demo.groups) {
      if (g.status !== 'ok') continue;
      for (const p of g.items) {
        expect(p.distanceMetres, p.name).toBe(metresApart(WOODLANDS.lat, WOODLANDS.lng, p.lat, p.lng));
        /* Inside what the category claims to have searched, so the radius
           selector narrows a list rather than hiding everything. */
        expect(p.distanceMetres, p.name).toBeLessThanOrEqual(g.radiusMetres);
        expect(p.category).toBe(g.category);
      }
    }
  });

  it('is the same neighbourhood every time, and a different one elsewhere', () => {
    expect(demoNearby(WOODLANDS.lat, WOODLANDS.lng, WOODLANDS.postal)).toEqual(demo);
    const other = demoNearby(TANJONG_PAGAR.lat, TANJONG_PAGAR.lng, TANJONG_PAGAR.postal);
    const names = (l: NearbyLookup) => l.groups.flatMap((g) => (g.status === 'ok' ? g.items.map((p) => p.name) : []));
    expect(names(other)).not.toEqual(names(demo));
  });

  it('has something to show at the tightest radius the selector offers', () => {
    for (const g of demo.groups) {
      if (g.status !== 'ok') continue;
      expect(placesWithin(g, g.radiusMetres).length, g.category).toBe(g.items.length);
    }
  });
});

describe('unavailable is not empty', () => {
  it('knows an outage from a quiet neighbourhood', () => {
    const out: NearbyLookup = {
      origin: WOODLANDS, mode: 'live', retrievedAt: '2026-01-01T00:00:00.000Z',
      groups: NEARBY_CATEGORY_KEYS.map((category): NearbyGroup => ({ category, status: 'unavailable', reason: 'no answer' })),
    };
    expect(nearbyAllUnavailable(out)).toBe(true);

    const quiet: NearbyLookup = {
      ...out,
      groups: NEARBY_CATEGORY_KEYS.map((category): NearbyGroup => ({ category, status: 'ok', radiusMetres: 2000, items: [], source: 's' })),
    };
    expect(nearbyAllUnavailable(quiet)).toBe(false);
    expect(groupOf(quiet, 'transport')?.status).toBe('ok');
  });

  it('asks again when the address moves', () => {
    expect(nearbyKey(1.3, 103.8, '018987')).not.toBe(nearbyKey(1.31, 103.8, '018987'));
    expect(nearbyKey(1.3, 103.8, '018987')).toBe(nearbyKey(1.3, 103.8, '018987'));
  });
});

describe('the route to a place', () => {
  it('writes a measured time, and refuses an unmeasured one', () => {
    expect(formatDuration(0)).toBe('under a minute');
    expect(formatDuration(480)).toBe('8 min');
    expect(formatDuration(3600)).toBe('1 hr');
    expect(formatDuration(4500)).toBe('1 hr 15 min');
    expect(formatDuration(Number.NaN)).toBe('—');
    expect(formatDuration(-5)).toBe('—');
  });

  it('accepts only the travel modes OneMap is asked for', () => {
    expect(isRouteMode('walk')).toBe(true);
    expect(isRouteMode('drive')).toBe(true);
    for (const made of ['fly', 'pt', '', 'WALK']) expect(isRouteMode(made), made).toBe(false);
  });

  it('decodes a OneMap polyline back onto the island', () => {
    /* The opening of a real walking route returned by the routing service. */
    const points = decodePolyline('sc|FkvkxRHIPMZSj@]LG`@UFEDEBCDKDODQ?M?E');
    expect(points.length).toBeGreaterThan(5);
    for (const [lat, lng] of points) {
      expect(lat).toBeGreaterThan(1.1);
      expect(lat).toBeLessThan(1.5);
      expect(lng).toBeGreaterThan(103.5);
      expect(lng).toBeLessThan(104.2);
    }
    /* Each step is a step, not a jump across the island. */
    for (let i = 1; i < points.length; i += 1) {
      expect(metresApart(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])).toBeLessThan(500);
    }
    expect(decodePolyline('')).toEqual([]);
  });

  it('draws a demo route that starts and ends where it says', () => {
    const from = { lat: WOODLANDS.lat, lng: WOODLANDS.lng };
    const to = { lat: 1.4404, lng: 103.8006 };
    const leg = demoDirections(from, to, 'walk');
    expect(leg.status).toBe('ok');
    if (leg.status !== 'ok') return;

    expect(leg.source).toBe('demo');
    expect(leg.path[0]).toEqual([from.lat, from.lng]);
    expect(leg.path.at(-1)).toEqual([to.lat, to.lng]);
    /* A route round the block is longer than the line across it. */
    expect(leg.distanceMetres).toBeGreaterThan(metresApart(from.lat, from.lng, to.lat, to.lng));
    expect(leg.seconds).toBeGreaterThan(0);

    const drive = demoDirections(from, to, 'drive');
    expect(drive.status === 'ok' && drive.seconds).toBeLessThan(leg.seconds);
    expect(demoDirections(from, to, 'walk')).toEqual(leg);
  });

  it('gives every place a stable identity to select it by', () => {
    const one = { name: 'Admiralty', category: 'transport' as const, lat: 1.44, lng: 103.8, distanceMetres: 767 };
    expect(placeKey(one)).toBe(placeKey({ ...one }));
    expect(placeKey(one)).not.toBe(placeKey({ ...one, distanceMetres: 768 }));
  });
});

describe('the wiring', () => {
  const panel = read('components/phase1/listing/NearbyPlaces.tsx');
  const sources = read('lib/phase1/nearby-sources.ts');
  const route = read('app/api/phase1/nearby/route.ts');
  const wizard = read('app/phase1/listings/new/page.tsx');

  it('reads the one global Demo Data switch and adds none of its own', () => {
    expect(panel).toMatch(/useDemo\(\)/);
    expect(panel).not.toMatch(/<DemoDataSwitch\b|setDemoDataOn|useDemoDataOn/);
  });

  it('never fetches in demo mode, and never falls back to demo data in live mode', () => {
    /* The guard that keeps the illustrative set off the network. */
    expect(panel).toMatch(/if \(demo \|\| held \|\| !key/);
    for (const [name, src] of [['nearby-sources', sources], ['route', route]] as const) {
      expect(src, name).not.toMatch(/nearby-demo|demoNearby/);
    }
  });

  it('never turns a straight-line distance into a travel time', () => {
    /* The one honest source of minutes is a routing service that walked the
       network. Nothing in the live path may derive them from metres, and the
       panel may only print the seconds a route came back with. */
    expect(sources).not.toMatch(/formatDuration|seconds\s*[:=]/);
    /* Every travel time printed anywhere in the feature comes from a route. */
    for (const src of [panel, read('components/phase1/listing/NearbyMap.tsx')]) {
      for (const call of src.match(/formatDuration\([^)]*\)/g) ?? []) {
        expect(call).toMatch(/\.seconds/);
      }
    }
    expect(panel).toMatch(/formatDuration\(route\.seconds\)/);
    /* And the list rows, which are straight lines, show only a distance. */
    const rows = panel.slice(panel.indexOf('function PlaceList'));
    expect(rows).toMatch(/formatDistance\(place\.distanceMetres\)/);
    expect(rows).not.toMatch(/formatDuration/);
  });

  it('checks the point and the category before calling anyone', () => {
    expect(route).toMatch(/inSingapore\(lat, lng\)/);
    expect(route).toMatch(/isNearbyCategory/);
    expect(route).toMatch(/currentUser\(\)/);
    expect(route).toMatch(/TokenBucket/);
  });

  it('checks both ends and the mode before routing, and keeps the token server-side', () => {
    const directions = read('app/api/phase1/directions/route.ts');
    expect(directions).toMatch(/inSingapore\(from\.lat, from\.lng\) \|\| !inSingapore\(to\.lat, to\.lng\)/);
    expect(directions).toMatch(/isRouteMode\(mode\)/);
    expect(directions).toMatch(/currentUser\(\)/);
    expect(directions).toMatch(/TokenBucket/);
    expect(directions).not.toMatch(/nearby-demo|demoDirections/);
    /* The token is read on the server and never handed to the browser. */
    expect(read('lib/phase1/directions.ts')).toMatch(/process\.env\.ONEMAP_TOKEN/);
    expect(panel).not.toMatch(/ONEMAP_TOKEN/);
  });

  it('shows nearby places on the address step of both create and edit', () => {
    /* One wizard serves both; `?edit=` fills the address in, and the panel
       hangs off that address rather than off which path was taken. */
    expect(wizard).toMatch(/<NearbyPlaces/);
    expect(wizard).toMatch(/const editId = params\.get\('edit'\)/);
  });

  it('keeps nearby places out of everything that is saved', () => {
    /* Stored places go stale; a station opens and the listing still says the
       old one. The listing holds the address, and the places are looked up. */
    const draft = wizard.slice(wizard.indexOf('interface LocalDraft'), wizard.indexOf('export default function'));
    expect(draft).not.toMatch(/nearby/i);
    expect(read('lib/phase1/data.ts').slice(0, 12_000)).not.toMatch(/nearbyPlaces/);
  });
});
