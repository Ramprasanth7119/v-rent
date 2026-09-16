/**
 * The Insights section.
 *
 * The rankings and signals are worked out from the same contracts as every
 * other figure, never state a number with too little behind it, and the
 * market figures are only ever drawn where the global Demo Data switch allows.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  EMPTY_FILTERS, MIN_FOR_MEDIAN, districtRanking, marketSignals, projectRanking, selectTransactions,
} from '../lib/phase1/insights';
import { PROJECTS, TRANSACTIONS } from '../lib/phase1/market';

const ROOT = path.join(__dirname, '..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

describe('district ranking', () => {
  const ranks = districtRanking('12');

  it('covers every district with contracts, dearest per sqft first', () => {
    const withContracts = new Set(TRANSACTIONS.map((t) => t.district));
    expect(new Set(ranks.map((r) => r.district))).toEqual(withContracts);
    for (let i = 1; i < ranks.length; i += 1) {
      expect((ranks[i - 1].medianPsf ?? 0)).toBeGreaterThanOrEqual(ranks[i].medianPsf ?? 0);
    }
  });

  it('adds up to the whole contract set', () => {
    const total = selectTransactions({ ...EMPTY_FILTERS, months: '12' }).length;
    expect(ranks.reduce((n, r) => n + r.contracts, 0)).toBe(total);
  });
});

describe('development ranking', () => {
  it('is busiest first and withholds a median from a thin set', () => {
    const rows = selectTransactions({ ...EMPTY_FILTERS, months: '3' });
    const ranks = projectRanking(rows);
    for (let i = 1; i < ranks.length; i += 1) expect(ranks[i - 1].contracts).toBeGreaterThanOrEqual(ranks[i].contracts);
    for (const r of ranks) {
      if (r.contracts < MIN_FOR_MEDIAN) expect(r.medianRent).toBeNull();
      const p = PROJECTS.find((x) => x.name === r.name);
      expect(r.per100).toBeCloseTo(((r.contracts / (p?.units ?? 1)) * 100), 1);
    }
  });

  it('is empty for no contracts', () => {
    expect(projectRanking([])).toEqual([]);
  });
});

describe('market signals', () => {
  it('names real districts and developments, and links to where they can be checked', () => {
    const signals = marketSignals('12');
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.length).toBeLessThanOrEqual(3);
    for (const s of signals) {
      expect(s.href.startsWith('/phase1/')).toBe(true);
      expect(s.detail).not.toMatch(/NaN|undefined|null/);
    }
    const busiest = signals.find((s) => s.key === 'busiest');
    if (busiest) expect(PROJECTS.some((p) => p.name === busiest.headline)).toBe(true);
  });
});

describe('the market figures follow the Demo Data switch', () => {
  it('gates Transactions and Compare in their layout', () => {
    expect(read('app/phase1/market/layout.tsx')).toMatch(/MarketDataGate/);
    expect(read('components/phase1/MarketDataGate.tsx')).toMatch(/useMarketAvailable\(\)/);
  });

  it('shows the Overview market sections and the Neighbourhood district panel only when available', () => {
    for (const f of ['app/phase1/insights/page.tsx', 'app/phase1/neighbourhood/page.tsx']) {
      const src = read(f);
      expect(src).toMatch(/useMarketAvailable\(\)/);
      expect(src).toMatch(/MarketUnavailable/);
    }
  });

  it('decides availability from the feed or the switch, nothing else', () => {
    const src = read('components/phase1/insights/states.tsx');
    expect(src).toMatch(/return MARKET_SOURCE\.live \|\| demo;/);
  });

  it('adds no switch of its own', () => {
    for (const f of [
      'app/phase1/insights/page.tsx', 'app/phase1/market/transactions/page.tsx', 'app/phase1/market/compare/page.tsx',
      'app/phase1/neighbourhood/page.tsx', 'app/phase1/reports/page.tsx',
    ]) {
      expect(read(f)).not.toMatch(/<DemoDataSwitch\b|setDemoDataOn/);
    }
  });
});
