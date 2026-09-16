/**
 * The Performance screen's arithmetic.
 *
 * Its headline figures must be the sums of the lines it draws, the comparison
 * must be the same arithmetic on the period before, and the agent's own
 * listings must never produce a figure.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { demoWorkspace } from '../lib/phase1/report-data';
import { SEED_LISTINGS } from '../lib/phase1/data';
import { DEFAULT_NOTIFICATIONS } from '../lib/phase1/workspace';
import { foldWeekly, listingWindow, pctChange, portfolioWindow, rateOf } from '../components/phase1/performance/model';

const NOW = new Date('2026-09-16T10:00:00+08:00');
const identity = {
  profile: {
    fullName: 'Tan Wei Ming', email: 'agent@example.test', mobile: '', ceaNumber: 'R123456A',
    agency: 'Example Realty', agencyLicence: 'L3000000A', bio: '', experienceYears: '',
  },
  notifications: { ...DEFAULT_NOTIFICATIONS },
  emailVerified: true,
};
const sum = (xs: number[]) => xs.reduce((n, v) => n + v, 0);

describe('demo account (Demo Data ON)', () => {
  const live = demoWorkspace(identity, NOW).listings.filter((l) => l.status === 'published');

  it.each([7, 30, 90] as const)('headline figures are the sums of the drawn lines over %i days', (days) => {
    const p = portfolioWindow(live, days);
    expect(p.measured).toBe(true);
    expect(p.series.views.current).toHaveLength(days);
    expect(p.series.views.previous).toHaveLength(days);
    expect(p.totals.views).toBe(Math.round(sum(p.series.views.current)));
    expect(p.previous.views).toBe(Math.round(sum(p.series.views.previous)));
    expect(p.totals.views).toBeGreaterThan(0);
    expect(p.totals.rate).toBe(rateOf(p.totals.enquiries, p.totals.views));
  });

  it('per-listing views add up to the portfolio line', () => {
    const p = portfolioWindow(live, 30);
    const perListing = sum(live.map((l) => listingWindow(l, 30).views));
    expect(perListing).toBe(p.totals.views);
  });
});

describe('agent\'s own listings (Demo Data OFF)', () => {
  const real = SEED_LISTINGS.map((l) => ({ ...l, status: 'published' as const }));

  it('are not measured and produce no figures', () => {
    const p = portfolioWindow(real, 30);
    expect(p.measured).toBe(false);
    expect(Object.values(p.totals).every((v) => v === 0)).toBe(true);
    for (const l of real) {
      const w = listingWindow(l, 30);
      expect(w.views + w.saves + w.enquiries).toBe(0);
    }
  });

  it('the screen shows the real-records view whenever nothing is measured', () => {
    const src = readFileSync(path.join(__dirname, '../app/phase1/performance/PerformanceView.tsx'), 'utf8');
    expect(src).toMatch(/const measured = live\.length > 0 && portfolio\.measured;/);
    expect(src).toMatch(/!measured \? \(\s*<LiveView/);
    // Data comes from the workspace provider only — no page-level demo switch or data source.
    expect(src).not.toMatch(/useDemoDataOn|demoWorkspace|fetch\(/);
  });
});

describe('helpers', () => {
  it('compares against the period before', () => {
    expect(pctChange(120, 100)).toBe(20);
    expect(pctChange(5, 0)).toBe(0);
  });

  it('folds a long series into weeks and leaves a short one alone', () => {
    expect(foldWeekly([1, 2, 3])).toEqual([1, 2, 3]);
    const ninety = Array.from({ length: 90 }, () => 1);
    const weeks = foldWeekly(ninety);
    expect(weeks).toHaveLength(12);
    expect(weeks.every((w) => w === 7)).toBe(true);
  });
});
