/**
 * The agent dashboard.
 *
 * Every figure on it comes from `lib/phase1/dashboard` over the one workspace
 * the global Demo Data switch selects. The demo account carries modelled
 * traffic; a real account does not, and must never be shown a zero for it.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  activity, listingPerformance, portfolioSummary, rankListings, Sources, sgDayNo, trend, upcomingSlots,
} from '../lib/phase1/dashboard';
import { demoWorkspace } from '../lib/phase1/report-data';
import { SEED_LISTINGS } from '../lib/phase1/data';
import { DEFAULT_NOTIFICATIONS } from '../lib/phase1/workspace';

const NOW = new Date('2026-09-16T10:00:00+08:00');
const ROOT = path.join(__dirname, '..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

const identity = {
  profile: {
    fullName: 'Tan Wei Ming', email: 'agent@example.test', mobile: '', ceaNumber: 'R123456A',
    agency: 'Example Realty', agencyLicence: 'L3000000A', bio: '', experienceYears: '',
  },
  notifications: { ...DEFAULT_NOTIFICATIONS },
  emailVerified: true,
};

const demo = demoWorkspace(identity, NOW);
const demoSrc: Sources = { listings: demo.listings, enquiries: demo.enquiries, slots: demo.tools.slots, now: NOW };
/* A real account: the same shape of listings, none of them demo records, no traffic counted. */
const realSrc: Sources = { listings: SEED_LISTINGS, enquiries: demo.enquiries.slice(0, 3), slots: [], now: NOW };

describe('demo account (Demo Data ON)', () => {
  it('has measured traffic, and the chart headline is the sum of what is drawn', () => {
    const t = trend(demoSrc, 'views', '30D');
    expect(t.measured).toBe(true);
    expect(t.total).toBeGreaterThan(0);
    expect(t.points.length).toBe(30);
    expect(Math.abs(t.points.reduce((n, v) => n + v, 0) - t.total)).toBeLessThanOrEqual(30);
  });

  it('ranks the live listings by views', () => {
    const { rows, byViews } = rankListings(listingPerformance(demoSrc));
    expect(byViews).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.l.status).toBe('published');
    for (let i = 1; i < rows.length; i += 1) expect(rows[i - 1].views7d).toBeGreaterThanOrEqual(rows[i].views7d);
  });

  it('lists the same upcoming viewings the figure counts, soonest first', () => {
    const list = upcomingSlots(demoSrc.slots, NOW);
    expect(list.length).toBe(portfolioSummary(demoSrc).upcomingViewings);
    const today = sgDayNo(NOW.getTime());
    for (const s of list) {
      expect(s.booking).toBeTruthy();
      expect(sgDayNo(new Date(`${s.date}T12:00:00+08:00`).getTime())).toBeGreaterThanOrEqual(today);
    }
    for (let i = 1; i < list.length; i += 1) {
      expect(`${list[i - 1].date}${list[i - 1].start}` <= `${list[i].date}${list[i].start}`).toBe(true);
    }
  });

  it('shows only activity that has happened, newest first, pointing at real records', () => {
    const events = activity(demoSrc, 6);
    expect(events.length).toBeGreaterThan(0);
    expect(events.length).toBeLessThanOrEqual(6);
    const ids = new Set(demo.listings.map((l) => l.id));
    for (let i = 0; i < events.length; i += 1) {
      expect(events[i].at).toBeLessThanOrEqual(NOW.getTime());
      if (i) expect(events[i - 1].at).toBeGreaterThanOrEqual(events[i].at);
      expect(ids.has(events[i].listingId)).toBe(true);
      expect(events[i].href.startsWith('/phase1/')).toBe(true);
    }
  });
});

describe('real account (Demo Data OFF)', () => {
  it('reports traffic as not measured, never as a counted zero', () => {
    const t = trend(realSrc, 'views', '30D');
    expect(t.measured).toBe(false);
    expect(portfolioSummary(realSrc).measured).toBe(false);
    expect(portfolioSummary(realSrc).rate).toBeNull();
  });

  it('still counts its records exactly', () => {
    const t = trend(realSrc, 'enquiries', '90D');
    expect(t.measured).toBe(true);
    expect(portfolioSummary(realSrc).awaitingReply).toBe(realSrc.enquiries.filter((e) => e.status === 'new').length);
  });

  it('ranks listings by recorded enquiries and viewings, not by views', () => {
    const { byViews, rows } = rankListings(listingPerformance(realSrc));
    expect(byViews).toBe(false);
    for (const r of rows) {
      expect(r.measured).toBe(false);
      expect(r.rate).toBeNull();
    }
  });

  it('has no upcoming viewings without a diary', () => {
    expect(upcomingSlots([], NOW)).toEqual([]);
  });
});

describe('the dashboard screen', () => {
  const files = [
    'app/phase1/dashboard/page.tsx',
    ...readdirSync(path.join(ROOT, 'components/phase1/dashboard')).map((f) => `components/phase1/dashboard/${f}`),
  ];

  it('adds no switch of its own and brings no data set of its own', () => {
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/<DemoDataSwitch\b|setDemoDataOn|useDemoDataOn/);
      expect(src, f).not.toMatch(/SEED_LISTINGS|demoWorkspace|Math\.random/);
    }
  });

  it('reads its figures from the dashboard arithmetic', () => {
    const page = read('app/phase1/dashboard/page.tsx');
    expect(page).toMatch(/portfolioSummary\(src\)/);
    expect(page).toMatch(/listingPerformance\(src\)/);
    expect(page).toMatch(/activity\(src/);
  });

  it('offers views on the chart only when they are measured', () => {
    const chart = read('components/phase1/dashboard/PerformanceChart.tsx');
    expect(chart).toMatch(/const measured = trafficMeasured\(src\.listings\);/);
    expect(chart).toMatch(/measured \? \['views', 'enquiries', 'viewings'\] : \['enquiries', 'viewings'\]/);
  });

  it('keeps traffic out of the headline figures', () => {
    expect(read('components/phase1/dashboard/KpiRow.tsx')).not.toMatch(/views|saves/i);
  });
});
