/**
 * The report's reading of its numbers: the development history, where the
 * asking rate sits, the competing listings, and the sentences built from them.
 * Each must follow from the figures, never say more than they do, and never
 * turn a missing answer into a zero.
 */

import { describe, expect, it } from 'vitest';
import type { DemoListing } from '../lib/phase1/data';
import { MARKET_MONTHS, type Transaction } from '../lib/phase1/market';
import { marketPosition, type MarketPosition } from '../lib/phase1/market-position';
import {
  MIN_ACTIVE, competingSet, decisionSummary, earlierListings, floorLevel, keyTakeaways, marketHistory, positioning,
  rangePosition, validateCompeting, validateHistory, type ActiveListing, type InsightInput,
} from '../lib/phase1/report-insights';

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

let seq = 0;
const contract = (over: Partial<Transaction>): Transaction => {
  seq += 1;
  return {
    id: `t-${seq}`, project: 'Sky Habitat', street: 'Bishan Street 15', district: 20, bedrooms: 3,
    sizeBand: '', sizeSqft: 1100, month: MARKET_MONTHS[seq % MARKET_MONTHS.length], monthlyRent: 5000, ...over,
  };
};
/* Twelve contracts at 4,600 to 5,150 a month on 1,100 sqft: S$4.18 to S$4.68 psf. */
const comps = Array.from({ length: 12 }, (_, k) => contract({ monthlyRent: 4600 + k * 50 }));
const market = (l: DemoListing) => marketPosition(l, comps) as MarketPosition;

const today = new Date('2026-09-16T09:00:00+08:00');
const input = (l: DemoListing, over: Partial<InsightInput> = {}): InsightInput => ({
  listing: l,
  market: marketPosition(l, comps),
  history: marketHistory(l, comps),
  competing: null,
  mrt: { state: 'verified', nearest: { name: 'Bishan MRT Station', metres: 600 } },
  primaries: { state: 'verified', within1km: 2 },
  hawker: { state: 'verified', nearest: null },
  unavailable: [],
  development: null,
  today,
  ...over,
});
const allText = (i: InsightInput) => {
  const s = decisionSummary(i);
  return [positioning(i), ...keyTakeaways(i), ...s.standsOut, ...s.consider, s.position.headline, s.position.detail, s.bottomLine].join('\n');
};

describe('particulars', () => {
  it('reads the floor level from a unit number and nothing else', () => {
    expect(floorLevel('#21-05')).toBe(21);
    expect(floorLevel('03-118')).toBe(3);
    expect(floorLevel('—')).toBeNull();
    expect(floorLevel('')).toBeNull();
    expect(floorLevel('#B1-02')).toBeNull();
  });

  it('finds earlier V-RENT listings of the same unit only', () => {
    const now = listing();
    const before = listing({ id: 'lst-old', monthlyRent: 4900, publishedAt: '2025-06-01T00:00:00Z', status: 'expired' });
    const neighbour = listing({ id: 'lst-nb', unitNo: '#21-06' });
    const found = earlierListings(now, [now, before, neighbour]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ asking: 4900, deal: 'rent', status: 'expired' });
  });
});

describe('development history', () => {
  it('uses the development when it has contracts, and every figure reconciles', () => {
    const l = listing();
    const h = marketHistory(l);
    expect(h.status).toBe('ok');
    if (h.status !== 'ok') return;
    expect(h.scope).toBe('development');
    expect(h.rows.every((r) => r.project === 'Sky Habitat')).toBe(true);
    expect(h.points).toHaveLength(12);
    expect(h.points.reduce((a, p) => a + p.count, 0)).toBe(h.sample);
    expect(validateHistory(l, h)).toEqual([]);
  });

  it('falls back to the district, and says so, when the development is not held', () => {
    const l = listing({ project: 'An Unlisted Residence' });
    const h = marketHistory(l);
    expect(h.status === 'ok' && h.scope).toBe('district');
    if (h.status === 'ok') expect(h.rows.every((r) => r.district === 20)).toBe(true);
  });

  it('is unavailable, not empty, for a sale, an HDB flat or a district with no contracts', () => {
    expect(marketHistory(listing({ dealType: 'sale', monthlyRent: 0, salePriceSgd: 2_150_000 }))).toMatchObject({ status: 'unavailable', reason: 'sale' });
    expect(marketHistory(listing({ propertyType: 'HDB' }))).toMatchObject({ status: 'unavailable', reason: 'category' });
    expect(marketHistory(listing({ project: 'Nowhere', district: 17 }))).toMatchObject({ status: 'unavailable', reason: 'no_contracts' });
  });

  it('flags a history whose rows no longer match its figures', () => {
    const l = listing();
    const h = marketHistory(l);
    if (h.status !== 'ok') throw new Error('expected a history');
    expect(validateHistory(l, { ...h, rows: h.rows.slice(1) }).map((i) => i.code)).toContain('history_sample');
    expect(validateHistory(l, { ...h, medianPsf: h.medianPsf + 1 }).map((i) => i.code)).toContain('history_median');
  });
});

describe('where the asking rate sits', () => {
  it('places a rate above, within or below the observed range', () => {
    expect(rangePosition(market(listing({ monthlyRent: 5200 })), 1100).place).toBe('above');
    expect(rangePosition(market(listing({ monthlyRent: 4900 })), 1100)).toMatchObject({ place: 'within', band: 'Middle half' });
    expect(rangePosition(market(listing({ monthlyRent: 4500 })), 1100)).toMatchObject({ place: 'below', higherThanPct: 0 });
  });

  it('counts the share of contracts at a lower rate', () => {
    /* 4,900 is above 4,600 … 4,850: six of twelve. */
    expect(rangePosition(market(listing({ monthlyRent: 4900 })), 1100).higherThanPct).toBe(50);
  });
});

describe('competing listings', () => {
  const active = (over: Partial<ActiveListing>): ActiveListing => ({
    project: 'Jadescape', district: 20, propertyType: 'Condominium', bedrooms: 3, sizeSqft: 1100, deal: 'rent', price: 5000,
    publishedAt: '2026-09-01T00:00:00Z', ...over,
  });

  it('keeps only the same deal, kind of home, bedroom count and size band', () => {
    const pool = [
      active({}),
      active({ deal: 'sale', price: 2_000_000 }),
      active({ bedrooms: 2 }),
      active({ propertyType: 'HDB' }),
      active({ sizeSqft: 2000 }),
      active({ propertyType: 'Executive Condominium', price: 4800 }),
    ];
    const c = competingSet(listing(), pool, today);
    expect(c.sample).toBe(2);
    expect(c.items.every((x) => x.deal === 'rent' && x.bedrooms === 3)).toBe(true);
    expect(validateCompeting(listing(), c)).toEqual([]);
  });

  it(`withholds a median below ${MIN_ACTIVE} listings, and gives it at ${MIN_ACTIVE}`, () => {
    const few = competingSet(listing(), [active({}), active({ price: 5400 })], today);
    expect(few.medianPsf).toBeNull();
    expect(few.deltaPct).toBeNull();
    const enough = competingSet(listing(), [4600, 4800, 5000, 5200, 5400].map((price) => active({ price })), today);
    expect(enough.basis).toBe('nearby');
    expect(enough.medianPsf).toBeCloseTo(5000 / 1100, 2);
    expect(enough.deltaPct).toBe(4);
    expect(validateCompeting(listing(), enough)).toEqual([]);
  });

  it('rejects a set that includes a different kind of home', () => {
    const c = competingSet(listing(), [active({})], today);
    const tampered = { ...c, items: [{ ...c.items[0], bedrooms: 2 }] };
    expect(validateCompeting(listing(), tampered).map((i) => i.code)).toContain('active_kind');
  });
});

describe('insight sentences', () => {
  it('never uses rental wording for a sale', () => {
    const sale = listing({ dealType: 'sale', monthlyRent: 0, salePriceSgd: 2_150_000 });
    const text = allText(input(sale));
    expect(text).not.toMatch(/\brent|\/mo|a month|lease/i);
    expect(text).toMatch(/not benchmarked|not held/i);
  });

  it('says nothing about the station when the dataset did not answer', () => {
    const i = input(listing(), { mrt: { state: 'unavailable', nearest: null } });
    expect(allText(i)).not.toMatch(/MRT|station/i);
    expect(decisionSummary({ ...i, unavailable: ['Transport'] }).consider.join(' ')).toMatch(/Transport data was unavailable/);
  });

  it('says there is no station only when the dataset answered with none', () => {
    const i = input(listing(), { mrt: { state: 'verified', nearest: null } });
    expect(keyTakeaways(i).join(' ')).toMatch(/No MRT or LRT station lies within 2 km/);
  });

  it('describes an above-median rent as a consideration, in neutral words', () => {
    const s = decisionSummary(input(listing({ monthlyRent: 5200 })));
    expect(s.position.headline).toBe('Above observed comparable range');
    expect(s.consider.join(' ')).toMatch(/above the comparable median/);
    expect(allText(input(listing({ monthlyRent: 5200 })))).not.toMatch(/overpriced|fair value|excellent|investment|guarantee/i);
  });

  it('names the station on the cover only when it is measured and close', () => {
    expect(positioning(input(listing()))).toBe('3-bedroom condominium of 1,100 sqft in Bishan, about 600 m from Bishan MRT Station.');
    expect(positioning(input(listing(), { mrt: { state: 'verified', nearest: { name: 'Far Station', metres: 1800 } } }))).not.toMatch(/Far Station/);
  });

  it('keeps each list short', () => {
    const s = decisionSummary(input(listing()));
    expect(keyTakeaways(input(listing())).length).toBeLessThanOrEqual(4);
    expect(s.standsOut.length).toBeGreaterThan(0);
    expect(s.standsOut.length).toBeLessThanOrEqual(3);
    expect(s.consider.length).toBeGreaterThan(0);
    expect(s.consider.length).toBeLessThanOrEqual(3);
  });
});
