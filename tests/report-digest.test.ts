/**
 * The client report's visual figures.
 *
 * Every range, board and signal must come from the evidence passed in: a range
 * needs two observations, a missing source is left out rather than drawn empty,
 * and with no contracts connected nothing market-based appears at all.
 */

import { describe, expect, it } from 'vitest';
import { SEED_LISTINGS, type DemoListing } from '../lib/phase1/data';
import { marketPosition } from '../lib/phase1/market-position';
import { developmentOf, marketHistory, rangePosition } from '../lib/phase1/report-insights';
import { demoCompeting, demoContracts, demoDevelopment } from '../lib/phase1/report-data/demo';
import { analyseProperty } from '../lib/phase1/property-insight';
import { demoDataProvider } from '../lib/phase1/report-data/demo';
import { originalDataProvider } from '../lib/phase1/report-data/original';
import {
  bearingOf, cityDistanceKm, competitionBands, developmentBoard, inShort, priceLadder, radarPoints, recentLeases, rentBand, signalsFor,
  type SignalInput,
} from '../lib/phase1/report-digest';

const TODAY = new Date('2026-09-16T10:00:00+08:00');
const sail = SEED_LISTINGS.find((l) => l.project.startsWith('The Sail'))!;

function evidence(l: DemoListing, mode: 'demo' | 'none') {
  const contracts = mode === 'demo' ? demoContracts(l) : [];
  const dev = mode === 'demo' ? demoDevelopment(l) : developmentOf(l);
  const market = marketPosition(l, contracts);
  const history = marketHistory(l, contracts, dev);
  const competing = mode === 'demo' ? demoCompeting(l, TODAY) : null;
  const comp = competing && competing.status === 'ok' ? competing : null;
  const m = market.status === 'ok' ? market : null;
  const insight = analyseProperty({
    listing: l, market, history, competing: comp,
    mrt: { state: 'verified', nearest: { name: 'Downtown MRT Station', metres: 320 } },
    primaries: { state: 'verified', within1km: 1 },
    hawker: { state: 'verified', nearest: null },
    unavailable: [], development: dev, earlier: [], heldContracts: contracts.length,
    illustrative: mode === 'demo', activeSource: 'illustrative demo listings', today: TODAY,
  });
  const input: SignalInput = {
    market: m, range: m ? rangePosition(m, l.sizeSqft) : null, competing: comp, insight,
    station: { name: 'Downtown MRT Station', metres: 320 }, stationNote: 'None within 2 km',
    notCompared: 'Verified contract records not connected',
  };
  return { contracts, market: m, history: history.status === 'ok' ? history : null, comp, input };
}

describe('the comparable rent band', () => {
  it('applies the middle half of comparable rates to the floor area', () => {
    const { market } = evidence(sail, 'demo');
    const band = rentBand(market, sail.sizeSqft)!;
    expect(band.low).toBe(Math.round((market!.q1Psf * sail.sizeSqft) / 50) * 50);
    expect(band.high).toBe(Math.round((market!.q3Psf * sail.sizeSqft) / 50) * 50);
    expect(band.low).toBeLessThan(band.high);
    expect(band.place).toBe(band.at < 0 ? 'below' : band.at > 1 ? 'above' : 'within');
  });

  it('is absent without a comparison or a floor area', () => {
    expect(rentBand(null, 1000)).toBeNull();
    const { market } = evidence(sail, 'demo');
    expect(rentBand(market, 0)).toBeNull();
  });
});

describe('the price ladder', () => {
  it('draws each source only from its own observations', () => {
    const { contracts, comp } = evidence(sail, 'demo');
    const ladder = priceLadder(sail, contracts, comp)!;
    const own = contracts.filter((t) => t.project === sail.project && t.bedrooms === sail.bedrooms).map((t) => t.monthlyRent);
    const dev = ladder.rows.find((r) => r.key === 'development')!;
    expect(dev.count).toBe(own.length);
    expect(dev.low).toBe(Math.min(...own));
    expect(dev.high).toBe(Math.max(...own));
    const listings = ladder.rows.find((r) => r.key === 'listings')!;
    expect(listings.count).toBe(comp!.items.length);
    expect(ladder.asking).toBe(sail.monthlyRent);
    for (const r of ladder.rows) expect(r.low <= r.median && r.median <= r.high).toBe(true);
  });

  it('shows nothing when no contracts are connected and nothing is advertised', () => {
    expect(priceLadder(sail, [], null)).toBeNull();
  });

  it('never compares a sale with leases', () => {
    const sale: DemoListing = { ...sail, dealType: 'sale', salePriceSgd: 2_400_000 };
    const ladder = priceLadder(sale, demoContracts(sail), null);
    expect(ladder).toBeNull();
  });
});

describe('recent leases and the development board', () => {
  it('marks the highest and lowest rate among the newest leases', () => {
    const { history } = evidence(sail, 'demo');
    const leases = recentLeases(history, sail)!;
    expect(leases.rows.length).toBeLessThanOrEqual(10);
    const months = leases.rows.map((r) => r.month);
    expect([...months].sort().reverse()).toEqual(months);
    const high = leases.rows.find((r) => r.mark === 'high')!;
    const low = leases.rows.find((r) => r.mark === 'low')!;
    expect(high.psf).toBe(Math.max(...leases.rows.map((r) => r.psf)));
    expect(low.psf).toBe(Math.min(...leases.rows.map((r) => r.psf)));
  });

  it('puts the property’s development first and needs a neighbour to compare with', () => {
    const { contracts } = evidence(sail, 'demo');
    const board = developmentBoard(sail, contracts);
    expect(board.length).toBeGreaterThanOrEqual(2);
    expect(board[0].subject).toBe(true);
    expect(board[0].project).toBe(sail.project);
    for (const r of board) expect(r.lowPsf <= r.medianPsf && r.medianPsf <= r.highPsf).toBe(true);
    expect(developmentBoard(sail, contracts.filter((t) => t.project === sail.project))).toEqual([]);
    expect(developmentBoard(sail, [])).toEqual([]);
  });

  it('groups what is advertised by how near it is', () => {
    const { comp } = evidence(sail, 'demo');
    const bands = competitionBands(comp);
    expect(bands.reduce((n, b) => n + b.count, 0)).toBe(comp!.items.length);
    expect(competitionBands(null)).toEqual([]);
  });
});

describe('the neighbourhood diagram', () => {
  it('measures bearings clockwise from north', () => {
    const o = { lat: 1.3, lng: 103.8 };
    expect(bearingOf(o, { lat: 1.31, lng: 103.8 })).toBe(0);
    expect(bearingOf(o, { lat: 1.3, lng: 103.81 })).toBe(90);
    expect(bearingOf(o, { lat: 1.29, lng: 103.8 })).toBe(180);
    expect(bearingOf(o, { lat: 1.3, lng: 103.79 })).toBe(270);
  });

  it('measures the straight-line distance to the city centre', () => {
    expect(cityDistanceKm(1.284, 103.8514)).toBe(0);
    expect(cityDistanceKm(1.4371, 103.7865)).toBeCloseTo(18.5, 0);
    expect(cityDistanceKm(null, 103.8)).toBeNull();
  });

  it('plots only located places within the radius, and nothing for an unplaced address', () => {
    const groups = [{ kind: 'schools' as const, items: [
      { name: 'Near', metres: 400, lat: 1.303, lng: 103.8 },
      { name: 'Far', metres: 2600, lat: 1.323, lng: 103.8 },
      { name: 'Unplaced', metres: 300 },
    ] }];
    expect(radarPoints({ lat: 1.3, lng: 103.8 }, groups).map((p) => p.name)).toEqual(['Near']);
    expect(radarPoints({ lat: null, lng: null }, groups)).toEqual([]);
  });
});

describe('the AI read-out', () => {
  it('draws every signal from the evidence behind it', () => {
    const { input } = evidence(sail, 'demo');
    const s = signalsFor(input);
    expect(s.price.dial).not.toBeNull();
    expect(s.price.caption).toContain('vs comparable median');
    expect(s.access.value).toBe('4 min walk');
    expect(s.evidence.bars).toBeGreaterThanOrEqual(2);
    const text = inShort(sail, input);
    expect(text).toMatch(/usual range for similar homes/);
    expect(text).toContain('Downtown MRT Station');
    expect(text).not.toMatch(/\b(will|guarantee|best|recommend)\b/i);
  });

  it('says plainly when nothing can be compared', () => {
    const { input } = evidence(sail, 'none');
    const s = signalsFor({ ...input, station: null });
    expect(s.price).toMatchObject({ value: 'Not compared', dial: null, tone: 'none' });
    expect(s.momentum.direction).toBeNull();
    expect(s.access.value).toBe('No station');
    expect(s.evidence.bars).toBe(1);
    expect(inShort(sail, { ...input, station: null })).toMatch(/not yet compared with verified lease records\.$/);
  });
});

describe('demo data for every kind of home', () => {
  const flat: DemoListing = { ...sail, id: 'demo-flat', propertyType: 'HDB', project: 'Blk 123 Tampines Street 11', bedrooms: 3, sizeSqft: 1001, monthlyRent: 3200 };

  it('compares an HDB flat with generated contracts of its own kind', () => {
    const m = demoDataProvider.position(flat);
    expect(m.status).toBe('ok');
    if (m.status === 'ok') {
      expect(m.sample).toBeGreaterThanOrEqual(20);
      expect(m.rows.every((r) => r.project === flat.project || r.project.startsWith('Blk '))).toBe(true);
    }
    expect(demoDataProvider.history(flat).status).toBe('ok');
  });

  it('keeps the type rule for the original data', () => {
    expect(originalDataProvider.position(flat)).toMatchObject({ status: 'unavailable', reason: 'category' });
  });
});
