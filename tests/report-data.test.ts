/**
 * The report's Demo Data switch and the two providers behind it.
 *
 * ON must mean the property's original data and OFF the demo data, never the
 * other way round. Original data must never be topped up with demo figures when
 * a lookup fails, demo figures must never reach a server or the listing, and
 * both must survive the same consistency checks before a page is printed.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DemoListing } from '../lib/phase1/data';
import { MARKET_MONTHS, TRANSACTIONS } from '../lib/phase1/market';
import type { MarketPosition } from '../lib/phase1/market-position';
import { validateMarket } from '../lib/phase1/report';
import { validateCompeting, validateHistory, type CompetingSet, type MarketHistory } from '../lib/phase1/report-insights';
import {
  DEMO_ID_PREFIX, DEMO_NOTICE, demoDataProvider, isDemoDataOn, originalDataProvider, providerFor, withDemoData,
} from '../lib/phase1/report-data';

const listing = (over: Partial<DemoListing> = {}): DemoListing => ({
  id: 'lst-t',
  reference: 'VR-1',
  agent: 'Agent',
  project: 'Sky Habitat',
  address: '7 Bishan Street 15 Sky Habitat Singapore 573908',
  postalCode: '573908',
  unitNo: '#21-05',
  district: 20,
  lat: 1.3525,
  lng: 103.8517,
  propertyType: 'Condominium',
  bedrooms: 3,
  bathrooms: 2,
  sizeSqft: 1100,
  dealType: 'rent',
  monthlyRent: 5200,
  availableFrom: '2026-10-01',
  minLeaseMonths: 12,
  furnishing: 'Partially furnished',
  status: 'published',
  images: 0,
  createdAt: '2026-09-01',
  ...over,
});

/* A held development, one the reference does not know, a small one-bedroom and a large four-bedroom. */
const RENTALS = [
  listing(),
  listing({ id: 'lst-u', project: 'Parkview Lofts', address: '18 Jalan Kemaman Parkview Lofts Singapore 329321', postalCode: '329321', district: 12, bedrooms: 2, sizeSqft: 780, monthlyRent: 3900 }),
  listing({ id: 'lst-s', project: 'Linden Suites', address: '3 Mount Sinai Rise Singapore 276956', postalCode: '276956', district: 10, bedrooms: 1, sizeSqft: 484, monthlyRent: 3300, unitNo: '#05-11' }),
  listing({ id: 'lst-l', project: 'Grange Heights', address: '22 Grange Road Singapore 249586', postalCode: '249586', district: 10, bedrooms: 4, sizeSqft: 1830, monthlyRent: 11500, unitNo: '' }),
];

afterEach(() => { vi.unstubAllGlobals(); });

describe('the Demo Data switch', () => {
  it('uses the original data when ON and the demo data when OFF', () => {
    expect(providerFor(true)).toBe(originalDataProvider);
    expect(providerFor(true).mode).toBe('original');
    expect(providerFor(false)).toBe(demoDataProvider);
    expect(providerFor(false).mode).toBe('demo');
  });

  it('is ON unless the address turns it off', () => {
    expect(isDemoDataOn(new URLSearchParams(''))).toBe(true);
    expect(isDemoDataOn(new URLSearchParams('ids=lst-1&demo=on'))).toBe(true);
    expect(isDemoDataOn(new URLSearchParams('ids=lst-1&demo=off'))).toBe(false);
  });

  it('changes only its own parameter', () => {
    const off = new URLSearchParams(withDemoData('ids=lst-1,lst-2&mode=detailed', false));
    expect(off.get('demo')).toBe('off');
    expect(off.get('ids')).toBe('lst-1,lst-2');
    expect(off.get('mode')).toBe('detailed');
    const on = new URLSearchParams(withDemoData(off.toString(), true));
    expect(on.has('demo')).toBe(false);
    expect(on.get('mode')).toBe('detailed');
  });

  it('shows the demo notice only in demo mode', () => {
    expect(originalDataProvider.notice).toBeNull();
    expect(demoDataProvider.notice).toBe(DEMO_NOTICE);
  });
});

describe('original data', () => {
  it('draws history, comparables and trend from the held contracts', () => {
    const l = listing();
    expect(originalDataProvider.contracts(l)).toBe(TRANSACTIONS);
    const held = new Set(TRANSACTIONS.map((t) => t.id));
    const position = originalDataProvider.position(l) as MarketPosition;
    const history = originalDataProvider.history(l) as MarketHistory;
    expect(position.status).toBe('ok');
    expect(position.rows.every((r) => held.has(r.id))).toBe(true);
    expect(history.rows.every((r) => held.has(r.id))).toBe(true);
    expect([...position.rows, ...history.rows].some((r) => r.id.startsWith(DEMO_ID_PREFIX))).toBe(false);
  });

  it('keeps a failed lookup failed instead of filling it with demo data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const l = listing();
    expect(await originalDataProvider.places(l, 'mrt')).toEqual({ status: 'failed', kind: 'mrt', reason: 'No answer' });
    expect(await originalDataProvider.around(l)).toBeNull();
    expect(await originalDataProvider.competing(l)).toEqual({ status: 'failed', reason: 'No answer' });
  });

  it('uses the photographs the agent uploaded', () => {
    expect(originalDataProvider.photos('u-1', listing({ photos: ['p-1', 'p-2'] }))).toEqual([
      '/api/phase1/photos/u-1/lst-t/p-1', '/api/phase1/photos/u-1/lst-t/p-2',
    ]);
  });
});

describe('demo data', () => {
  it('never asks a server, and never touches the listing', async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error('no network in demo mode'));
    vi.stubGlobal('fetch', fetchSpy);
    for (const l of RENTALS) {
      const before = structuredClone(l);
      const frozen = Object.freeze({ ...l });
      demoDataProvider.position(frozen);
      demoDataProvider.history(frozen);
      demoDataProvider.development(frozen);
      demoDataProvider.earlier(frozen, [frozen]);
      for (const kind of ['mrt', 'schools', 'healthcare', 'attractions'] as const) await demoDataProvider.places(frozen, kind);
      await demoDataProvider.around(frozen);
      await demoDataProvider.competing(frozen);
      expect(l).toEqual(before);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('has no route to persistence', () => {
    const source = readFileSync(join(__dirname, '../lib/phase1/report-data/demo.ts'), 'utf8');
    expect(source).not.toMatch(/\bfetch\(|store\/driver|workspace-store|localStorage|sessionStorage|\/api\//);
  });

  it('generates contracts of its own, never the held ones', () => {
    const held = new Set(TRANSACTIONS.map((t) => t.id));
    for (const l of RENTALS) {
      const rows = demoDataProvider.contracts(l);
      expect(rows.length).toBeGreaterThan(30);
      expect(rows.every((r) => r.id.startsWith(DEMO_ID_PREFIX) && !held.has(r.id))).toBe(true);
    }
  });

  it('keeps rent, size and rate per sq ft consistent', () => {
    const window = new Set(MARKET_MONTHS);
    for (const l of RENTALS) {
      for (const t of demoDataProvider.contracts(l)) {
        expect(window.has(t.month)).toBe(true);
        expect(t.monthlyRent % 50).toBe(0);
        const psf = t.monthlyRent / t.sizeSqft;
        expect(psf).toBeGreaterThan(1.5);
        expect(psf).toBeLessThan(20);
        const [low, high] = t.sizeBand.match(/\d+/g)!.map(Number);
        expect(t.sizeSqft).toBeGreaterThanOrEqual(low);
        expect(t.sizeSqft).toBeLessThanOrEqual(high);
      }
    }
  });

  it('passes the same market and history checks as original data', () => {
    for (const l of RENTALS) {
      const position = demoDataProvider.position(l);
      const history = demoDataProvider.history(l);
      expect(position.status).toBe('ok');
      expect(history.status).toBe('ok');
      expect(validateMarket(l, position)).toEqual([]);
      expect(validateHistory(l, history, demoDataProvider.development(l))).toEqual([]);
      const m = position as MarketPosition;
      expect(m.basis).toBe('development');
      expect((history as MarketHistory).scope).toBe('development');
      /* A coherent year: every month has contracts, so the trend, its change and the indicative months all exist. */
      expect(m.trendCounts.every((n) => n > 0)).toBe(true);
      expect(m.changePct).not.toBeNull();
      expect(m.outlook).toHaveLength(3);
      expect(Math.abs(m.deltaPct)).toBeLessThan(15);
    }
  });

  it('is the same for the same property every time', () => {
    const l = RENTALS[1];
    expect(JSON.stringify(demoDataProvider.position(l))).toBe(JSON.stringify(demoDataProvider.position({ ...l })));
  });

  it('produces competing listings that pass their checks', async () => {
    for (const l of [...RENTALS, listing({ id: 'lst-sale', dealType: 'sale', monthlyRent: 0, salePriceSgd: 1_880_000 })]) {
      const c = await demoDataProvider.competing(l);
      expect(c.status).toBe('ok');
      expect(validateCompeting(l, c)).toEqual([]);
      expect((c as CompetingSet).medianPsf).not.toBeNull();
    }
  });

  it('describes a plausible neighbourhood, nearest first and within each radius', async () => {
    const l = RENTALS[1];
    for (const kind of ['mrt', 'schools', 'healthcare', 'attractions'] as const) {
      const got = await demoDataProvider.places(l, kind);
      if (got.status !== 'ok') throw new Error(`${kind} did not answer`);
      expect(got.items.length).toBeGreaterThan(0);
      expect(got.items.map((p) => p.metres)).toEqual([...got.items.map((p) => p.metres)].sort((a, b) => a - b));
      expect(got.items.every((p) => p.metres <= got.radius)).toBe(true);
    }
    const schools = await demoDataProvider.places(l, 'schools');
    const health = await demoDataProvider.places(l, 'healthcare');
    expect(schools.status === 'ok' && schools.items.some((s) => s.detail === 'Primary') && schools.items.some((s) => s.detail === 'Secondary')).toBe(true);
    expect(health.status === 'ok' && health.items.some((s) => s.detail === 'Hospital') && health.items.some((s) => s.detail === 'Polyclinic')).toBe(true);
    const around = await demoDataProvider.around(l);
    expect(around?.groups.map((g) => g.key)).toEqual(['hawker', 'parks', 'sport', 'libraries', 'community']);
  });

  it('names the station from the development reference when it has one', async () => {
    const got = await demoDataProvider.places(listing(), 'mrt');
    expect(got.status === 'ok' && got.items.some((s) => s.name === 'Bishan MRT Station' && s.metres === 7 * 80)).toBe(true);
  });

  it('uses no photographs', () => {
    expect(demoDataProvider.photos('u-1', listing({ photos: ['p-1'] }))).toEqual([]);
  });

  it('does not turn a sale into a rental comparison', () => {
    const sale = listing({ dealType: 'sale', monthlyRent: 0, salePriceSgd: 1_880_000 });
    expect(demoDataProvider.position(sale).status).toBe('unavailable');
    expect(demoDataProvider.history(sale).status).toBe('unavailable');
  });
});
