/**
 * The client shortlist's AI Analysis and its page breaks.
 *
 * The analysis may only restate what the document holds: it names the window
 * it could use instead of pretending to five years, it never states a future
 * figure, it says plainly when the evidence is missing, and across a shortlist
 * it compares without ranking. The page packer keeps blocks whole.
 */

import { describe, expect, it } from 'vitest';
import { SEED_LISTINGS, type DemoListing } from '../lib/phase1/data';
import { marketPosition } from '../lib/phase1/market-position';
import { developmentOf, marketHistory } from '../lib/phase1/report-insights';
import { demoContracts, demoDevelopment } from '../lib/phase1/report-data/demo';
import {
  INSUFFICIENT_OUTLOOK, analyseProperty, shortlistInsights, unavailableReason, type AnalysisInput, type ShortlistEntry,
} from '../lib/phase1/property-insight';
import { chunk, packPages } from '../lib/phase1/paginate';

const TODAY = new Date('2026-09-16T10:00:00+08:00');
const sail = SEED_LISTINGS.find((l) => l.project.startsWith('The Sail'))!;
const hdb = SEED_LISTINGS.find((l) => l.propertyType === 'HDB')!;

/** The analysis input the report builds, from demo contracts or from none. */
function input(l: DemoListing, contracts: 'demo' | 'none', over: Partial<AnalysisInput> = {}): AnalysisInput {
  const held = contracts === 'demo' ? demoContracts(l) : [];
  const dev = contracts === 'demo' ? demoDevelopment(l) : developmentOf(l);
  return {
    listing: l,
    market: marketPosition(l, held),
    history: marketHistory(l, held, dev),
    competing: null,
    mrt: { state: 'verified', nearest: { name: 'Downtown MRT Station', metres: 320 } },
    primaries: { state: 'verified', within1km: 1 },
    hawker: { state: 'verified', nearest: null },
    unavailable: [],
    development: dev,
    earlier: [],
    heldContracts: held.length,
    illustrative: contracts === 'demo',
    activeSource: 'illustrative demo listings',
    today: TODAY,
    ...over,
  };
}

const allText = (i: ReturnType<typeof analyseProperty>) => [
  i.historical.headline, i.historical.detail, i.historical.summary, i.historical.short,
  i.current.headline, i.current.detail, i.current.summary, i.current.short,
  i.outlook.headline, i.outlook.detail, i.outlook.summary, i.outlook.short, ...i.outlook.drivers,
  ...i.factors.map((f) => f.text), ...i.limitations,
].join(' ');

describe('the AI Analysis of one property', () => {
  it('names the window it used rather than claiming five years', () => {
    const a = analyseProperty(input(sail, 'demo'));
    expect(a.window?.months).toBe(12);
    expect(a.historical.detail).toMatch(/Five-year records are not held; the verified window is the 12 months/);
    expect(a.limitations.join(' ')).toMatch(/five-year history is not held/);
  });

  it('places the asking rent on the comparable range it was compared with', () => {
    const i = input(sail, 'demo');
    const m = i.market;
    if (m.status !== 'ok') throw new Error('expected a comparison');
    const a = analyseProperty(i);
    expect(a.current.place).not.toBeNull();
    expect(a.current.detail).toContain(`S$${m.medianPsf.toFixed(2)}`);
    expect(a.current.detail).toContain(`${m.sample} comparable contracts`);
  });

  it('reads a direction from the trend and never states a future figure', () => {
    const i = input(sail, 'demo');
    const a = analyseProperty(i);
    const m = i.market.status === 'ok' ? i.market : null;
    expect(a.outlook.supported).toBe(true);
    const move = m!.changePct!;
    expect(a.outlook.direction).toBe(Math.abs(move) < 1.5 ? 'stable' : move > 0 ? 'firm' : 'soft');
    expect(a.outlook.detail).not.toMatch(/S\$/);
    expect(allText(a)).not.toMatch(/\b(will (rise|fall|reach)|guarantee|yield|ROI|return on)/i);
    for (const o of m!.outlook) expect(allText(a)).not.toContain(o.label);
  });

  it('keeps to three to five considerations, one per topic', () => {
    const a = analyseProperty(input(sail, 'demo'));
    expect(a.factors.length).toBeGreaterThanOrEqual(3);
    expect(a.factors.length).toBeLessThanOrEqual(5);
    expect(new Set(a.factors.map((f) => f.topic)).size).toBe(a.factors.length);
  });

  it('says the evidence is insufficient when no contract records are connected', () => {
    const a = analyseProperty(input(sail, 'none'));
    expect(a.historical.headline).toBe('Insufficient verified history');
    expect(a.historical.detail).toMatch(/not yet connected/);
    expect(a.outlook.supported).toBe(false);
    expect(a.outlook.detail).toBe(INSUFFICIENT_OUTLOOK);
    expect(a.confidence.level).toBe('insufficient');
    expect(a.current.place).toBeNull();
    expect(unavailableReason({ listing: sail, market: marketPosition(sail, []), heldContracts: 0 })).toBe('Verified contract records not connected');
  });

  it('does not compare an HDB flat with condominium contracts, and says why', () => {
    const a = analyseProperty(input(hdb, 'demo'));
    expect(a.current.place).toBeNull();
    expect(a.current.detail).toMatch(/^HDB rental records are not held/);
    expect(a.outlook.detail).toBe(INSUFFICIENT_OUTLOOK);
  });

  it('gives a sale no rental history and no outlook', () => {
    const sale: DemoListing = { ...sail, id: 'sale-1', dealType: 'sale', salePriceSgd: 1_880_000, monthlyRent: 0 };
    const a = analyseProperty(input(sale, 'demo'));
    expect(a.historical.detail).toMatch(/Sale transaction records are not held/);
    expect(a.outlook.detail).toBe(INSUFFICIENT_OUTLOOK);
    expect(a.limitations.join(' ')).toMatch(/not benchmarked against sales/);
  });

  it('reports a dataset that did not answer as a limitation, not as nothing nearby', () => {
    const a = analyseProperty(input(sail, 'demo', { mrt: { state: 'unavailable', nearest: null }, unavailable: ['Transport'] }));
    expect(a.factors.some((f) => f.topic === 'Connectivity')).toBe(false);
    expect(a.limitations.join(' ')).toMatch(/Transport data was unavailable/);
  });
});

describe('shortlist insights', () => {
  const entry = (l: DemoListing, contracts: 'demo' | 'none'): ShortlistEntry => {
    const i = input(l, contracts);
    return { name: l.project, listing: l, market: i.market, history: i.history, insight: analyseProperty(i), station: i.mrt.nearest, heldContracts: i.heldContracts };
  };

  it('compares factually and never ranks', () => {
    const condos = SEED_LISTINGS.filter((l) => l.propertyType === 'Condominium').slice(0, 3);
    const out = shortlistInsights([...condos.map((l) => entry(l, 'demo')), entry(hdb, 'demo')]);
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(6);
    expect(out.join(' ')).not.toMatch(/\b(best|winner|recommend|top pick|better value|should)\b/i);
    expect(out.join(' ')).toContain('HDB rental records are not held');
  });

  it('has nothing to compare for a single property', () => {
    expect(shortlistInsights([entry(sail, 'demo')])).toEqual([]);
  });
});

describe('page breaks', () => {
  const cap = { portrait: 900, landscape: 600 };

  it('fills a page and starts the next when a block does not fit', () => {
    const pages = packPages([400, 400, 400].map((height) => ({ height, orientation: 'portrait' as const })), cap, 20);
    expect(pages.map((p) => p.items)).toEqual([[0, 1], [2]]);
    expect(pages[0].used).toBe(820);
  });

  it('honours forced breaks and changes of orientation', () => {
    const pages = packPages([
      { height: 100, orientation: 'portrait' },
      { height: 100, orientation: 'portrait', breakBefore: true },
      { height: 100, orientation: 'landscape' },
      { height: 100, orientation: 'portrait' },
    ], cap, 20);
    expect(pages.map((p) => [p.orientation, p.items])).toEqual([
      ['portrait', [0]], ['portrait', [1]], ['landscape', [2]], ['portrait', [3]],
    ]);
  });

  it('keeps a heading with the block after it', () => {
    const pages = packPages([
      { height: 800, orientation: 'portrait' },
      { height: 40, orientation: 'portrait', keepWithNext: true },
      { height: 200, orientation: 'portrait' },
    ], cap, 20);
    expect(pages.map((p) => p.items)).toEqual([[0], [1, 2]]);
  });

  it('gives an oversized block its own page and reports it', () => {
    const pages = packPages([{ height: 100, orientation: 'portrait' }, { height: 1200, orientation: 'portrait' }], cap, 20);
    expect(pages).toHaveLength(2);
    expect(pages[1].overflow).toBe(true);
    expect(pages[0].overflow).toBe(false);
  });

  it('splits long tables into runs', () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 3, 2)).toEqual([[1, 2, 3], [4, 5], [6, 7]]);
    expect(chunk([], 3)).toEqual([]);
  });
});
