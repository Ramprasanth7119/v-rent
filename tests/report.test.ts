/**
 * The shortlist report's safety checks: one price per listing type, a market
 * comparison that reconciles with its own contracts, and neighbourhood answers
 * that never turn a failure into "none nearby".
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DemoListing } from '../lib/phase1/data';
import { normaliseDeal } from '../lib/phase1/pricing';
import { MIN_SAMPLE, NEIGHBOURS, marketPosition, quantile } from '../lib/phase1/market-position';
import { MARKET_MONTHS, type Transaction } from '../lib/phase1/market';
import { amenityEvidence, countText, nearestText, placeEvidence, toReportProperty, validateMarket, validateProperty } from '../lib/phase1/report';
import { fetchTheme } from '../lib/phase1/amenities';

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

const codes = (l: DemoListing) => validateProperty(l).filter((i) => i.severity === 'error').map((i) => i.code);

let seq = 0;
const contract = (over: Partial<Transaction>): Transaction => {
  seq += 1;
  return {
    id: `t-${seq}`, project: 'Elsewhere', street: 'Nowhere Road', district: 1, bedrooms: 3,
    sizeBand: '', sizeSqft: 1100, month: MARKET_MONTHS[seq % MARKET_MONTHS.length], monthlyRent: 5000, ...over,
  };
};
const many = (n: number, over: Partial<Transaction>) => Array.from({ length: n }, (_, k) => contract({ monthlyRent: 4600 + k * 50, ...over }));

describe('listing type and price', () => {
  it('saves a sale without the rent the wizard kept in memory', () => {
    const saved = normaliseDeal({ dealType: 'sale' as const, monthlyRent: 4200, salePriceSgd: 1_350_000 });
    expect(saved.monthlyRent).toBe(0);
    expect(saved.salePriceSgd).toBe(1_350_000);
  });

  it('saves a rental without a sale price', () => {
    const saved = normaliseDeal({ dealType: 'rent' as const, monthlyRent: 4200, salePriceSgd: 1_350_000 });
    expect(saved.monthlyRent).toBe(4200);
    expect('salePriceSgd' in saved).toBe(false);
  });

  it('maps a rental to a rent and no sale price, and a sale the other way', () => {
    const rent = toReportProperty(listing());
    expect([rent.deal, rent.askingRent, rent.salePrice]).toEqual(['rent', 5200, null]);
    const sale = toReportProperty(listing({ dealType: 'sale', monthlyRent: 0, salePriceSgd: 2_150_000 }));
    expect([sale.deal, sale.askingRent, sale.salePrice]).toEqual(['sale', null, 2_150_000]);
  });

  it('refuses a sale record that still carries a rent, rather than choosing one', () => {
    expect(codes(listing({ dealType: 'sale', monthlyRent: 4200, salePriceSgd: 1_350_000 }))).toContain('sale_has_rent');
  });

  it('refuses a rental that carries a sale price', () => {
    expect(codes(listing({ salePriceSgd: 1_350_000 }))).toContain('rent_has_sale_price');
  });

  it('catches a sale price typed as a rent, and a rent typed as a sale price', () => {
    expect(codes(listing({ monthlyRent: 1_350_000 }))).toContain('rent_implausible');
    expect(codes(listing({ dealType: 'sale', monthlyRent: 0, salePriceSgd: 4200 }))).toContain('sale_implausible');
  });

  it('passes clean rentals and clean sales', () => {
    expect(codes(listing())).toEqual([]);
    expect(codes(listing({ dealType: 'sale', monthlyRent: 0, salePriceSgd: 2_150_000 }))).toEqual([]);
  });

  it('checks the district against the postal code and the floor area against the rent', () => {
    expect(codes(listing({ district: 13 }))).toContain('district_mismatch');
    expect(codes(listing({ sizeSqft: 102 }))).toContain('psf_implausible');
  });

  it('warns, without blocking, when the address has no map position', () => {
    const issues = validateProperty(listing({ lat: undefined, lng: undefined }));
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(issues.map((i) => i.code)).toContain('not_located');
  });
});

describe('comparable selection', () => {
  it('uses the same development when it has enough contracts', () => {
    const rows = [...many(MIN_SAMPLE, { project: 'Sky Habitat', district: 20 }), ...many(30, { district: 20 })];
    const m = marketPosition(listing(), rows);
    expect(m.status).toBe('ok');
    if (m.status !== 'ok') return;
    expect(m.basis).toBe('development');
    expect(m.basisLabel).toBe('Same development · 3 bed · 900–1,300 sqft');
    expect(m.local).toBe(true);
    expect(validateMarket(listing(), m)).toEqual([]);
  });

  it('widens to the district, then nearby districts, then the island, and says so', () => {
    const district = marketPosition(listing(), [...many(3, { project: 'Sky Habitat', district: 20 }), ...many(12, { district: 20 })]);
    expect(district.status === 'ok' && district.basis).toBe('district');

    const nearby = marketPosition(listing(), many(12, { district: NEIGHBOURS[20][0] }));
    expect(nearby.status === 'ok' && nearby.basis).toBe('nearby');
    expect(nearby.status === 'ok' && nearby.local).toBe(false);

    const island = marketPosition(listing(), many(12, { district: 22 }));
    expect(island.status).toBe('ok');
    if (island.status !== 'ok') return;
    expect(island.basis).toBe('island');
    expect(island.basisLabel.startsWith('Singapore-wide')).toBe(true);
    expect(island.fallbackNote).toMatch(/Local sample insufficient/);
  });

  it('never pads the sample with other bedroom counts or sizes', () => {
    const rows = [...many(12, { district: 20, bedrooms: 2 }), ...many(12, { district: 20, sizeSqft: 2000 }), ...many(12, { district: 20 })];
    const m = marketPosition(listing(), rows);
    if (m.status !== 'ok') throw new Error('expected a comparison');
    expect(m.rows.every((r) => r.bedrooms === 3 && r.sizeSqft >= m.band!.min && r.sizeSqft <= m.band!.max)).toBe(true);
    expect(m.sample).toBe(12);
  });

  it('does not compare an HDB flat or a landed home with condominium contracts', () => {
    const rows = many(40, { district: 20 });
    expect(marketPosition(listing({ propertyType: 'HDB' }), rows)).toMatchObject({ status: 'unavailable', reason: 'category' });
    expect(marketPosition(listing({ propertyType: 'Landed' }), rows)).toMatchObject({ status: 'unavailable', reason: 'category' });
  });

  it('does not compare a sale with rental contracts', () => {
    expect(marketPosition(listing({ dealType: 'sale', monthlyRent: 0, salePriceSgd: 2e6 }), many(40, { district: 20 }))).toMatchObject({ status: 'unavailable', reason: 'sale' });
  });

  it('reports unavailable rather than inventing a market when there are no contracts', () => {
    expect(marketPosition(listing(), [])).toMatchObject({ status: 'unavailable', reason: 'no_contracts' });
  });

  it('uses a true median, and every figure reconciles with the contracts', () => {
    const rows = [1000, 1100, 1200].flatMap((s) => many(5, { district: 20, sizeSqft: s }));
    const m = marketPosition(listing(), rows);
    if (m.status !== 'ok') throw new Error('expected a comparison');
    expect(m.medianPsf).toBeCloseTo(quantile(m.rows.map((r) => r.monthlyRent / r.sizeSqft), 0.5), 2);
    expect(m.trendCounts.reduce((a, b) => a + b, 0)).toBe(m.sample);
    expect(validateMarket(listing(), m)).toEqual([]);
  });

  it('flags a comparison whose figures have been tampered with', () => {
    const m = marketPosition(listing(), many(20, { district: 20 }));
    if (m.status !== 'ok') throw new Error('expected a comparison');
    const broken = { ...m, sample: m.sample + 5, medianPsf: m.medianPsf + 1 };
    const found = validateMarket(listing(), broken).map((i) => i.code);
    expect(found).toContain('sample_mismatch');
    expect(found).toContain('median_psf');
  });

  it('keeps the district neighbour table symmetric', () => {
    for (const [d, list] of Object.entries(NEIGHBOURS)) {
      for (const n of list) expect(NEIGHBOURS[n]).toContain(Number(d));
    }
  });
});

describe('neighbourhood evidence', () => {
  const ok = { status: 'ok' as const, kind: 'healthcare' as const, radius: 5000, source: 'MOH', retrievedAt: '2026-09-15T01:00:00Z' };

  it('says none only when the dataset answered with nothing', () => {
    const e = placeEvidence({ ...ok, items: [] }, true, 'healthcare');
    expect(nearestText(e, 'None within 5 km')).toEqual({ kind: 'none', text: 'None within 5 km' });
  });

  it('says data unavailable when the dataset failed or never answered', () => {
    expect(nearestText(placeEvidence({ status: 'failed', kind: 'healthcare', reason: 'timeout' }, true, 'healthcare'), 'None')).toEqual({ kind: 'unknown', text: 'Data unavailable' });
    expect(nearestText(placeEvidence(undefined, true, 'healthcare'), 'None')).toEqual({ kind: 'unknown', text: 'Data unavailable' });
    expect(amenityEvidence(null, true, 'hawker').state).toBe('unavailable');
  });

  it('says unable to verify when the address has no map position', () => {
    expect(nearestText(placeEvidence({ ...ok, items: [] }, false, 'healthcare'), 'None')).toEqual({ kind: 'unknown', text: 'Unable to verify' });
  });

  it('does not print a count from an incomplete list as if it were complete', () => {
    const e = placeEvidence({ ...ok, kind: 'schools', items: [], pending: 40 }, true, 'schools');
    expect(e.state).toBe('partial');
    expect(countText(e, 0)).toBe('Unable to verify');
    expect(countText(e, 2)).toBe('2+');
  });

  it('drops distances that are not distances', () => {
    const e = placeEvidence({ ...ok, items: [{ name: 'X', metres: Number.NaN, lat: 1.3, lng: 103.8 }, { name: 'Y', metres: 900, lat: 1.3, lng: 103.8 }] }, true, 'healthcare');
    expect(e.items.map((i) => i.name)).toEqual(['Y']);
  });
});

describe('OneMap theme failures', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('throws on a refused request instead of returning an empty neighbourhood', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('denied', { status: 401 })));
    await expect(fetchTheme('moh_hospitals', 1.35, 103.85, 5000, 'token')).rejects.toThrow(/401/);
  });

  it('throws on an unreadable answer, and returns [] only for a real empty result', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'bad token' }), { status: 200 })));
    await expect(fetchTheme('moh_hospitals', 1.35, 103.85, 5000, 'token')).rejects.toThrow(/refused/);

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ SrchResults: [{ FeatCount: 0 }] }), { status: 200 })));
    await expect(fetchTheme('moh_hospitals', 1.35, 103.85, 5000, 'token')).resolves.toEqual([]);
  });
});
