/**
 * Performance, as the screen reads it.
 *
 * Every figure is drawn from `lib/phase1/performance` — `viewsSeries`,
 * `metricRate`, `portfolioSeries` — so this page, the dashboard panel and the
 * listing pages agree. Nothing here decides whether traffic exists: for the
 * agent's own listings (Demo Data OFF) those functions return zeros and
 * `measured` is false, and the screen shows that honestly instead of a chart.
 *
 * A window is always compared with the window immediately before it, using
 * the same arithmetic on the same series.
 */

import type { DemoListing } from '../../../lib/phase1/data';
import { isMeasured, metricRate, portfolioSeries, viewsSeries, type Metric } from '../../../lib/phase1/performance';

export type WindowDays = 7 | 30 | 90;
export type KpiKey = Metric | 'rate';

const sum = (xs: number[]) => xs.reduce((n, v) => n + v, 0);

export const pctChange = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 100) : 0);

/** Enquiries per 100 views, to one decimal. */
export const rateOf = (enquiries: number, views: number) => (views ? Math.round((enquiries / views) * 1000) / 10 : 0);

export interface ListingWindow {
  views: number;
  saves: number;
  enquiries: number;
  rate: number;
  prevEnquiries: number;
  prevViews: number;
  /** Daily views in the window, oldest first. */
  series: number[];
}

export function listingWindow(l: DemoListing, days: WindowDays): ListingWindow {
  const both = viewsSeries(l, days * 2);
  const cur = sum(both.slice(days));
  const prev = sum(both.slice(0, days));
  const enq = metricRate(l, 'enquiries');
  const enquiries = Math.round(cur * enq);
  return {
    views: cur,
    saves: Math.round(cur * metricRate(l, 'saves')),
    enquiries,
    rate: rateOf(enquiries, cur),
    prevEnquiries: Math.round(prev * enq),
    prevViews: prev,
    series: both.slice(days),
  };
}

export interface PortfolioWindow {
  measured: boolean;
  totals: Record<KpiKey, number>;
  previous: Record<KpiKey, number>;
  /** Daily values for the window and the one before it, per metric. */
  series: Record<KpiKey, { current: number[]; previous: number[] }>;
}

export function portfolioWindow(listings: DemoListing[], days: WindowDays): PortfolioWindow {
  const split = (m: Metric) => {
    const both = portfolioSeries(listings, m, days * 2);
    return { current: both.slice(days), previous: both.slice(0, days) };
  };
  const views = split('views');
  const saves = split('saves');
  const enquiries = split('enquiries');
  const dailyRate = (e: number[], v: number[]) => e.map((x, i) => rateOf(x, v[i]));
  const rate = {
    current: dailyRate(enquiries.current, views.current),
    previous: dailyRate(enquiries.previous, views.previous),
  };

  const t = (s: { current: number[]; previous: number[] }, which: 'current' | 'previous') => Math.round(sum(s[which]));
  const totals = { views: t(views, 'current'), saves: t(saves, 'current'), enquiries: t(enquiries, 'current'), rate: 0 };
  const previous = { views: t(views, 'previous'), saves: t(saves, 'previous'), enquiries: t(enquiries, 'previous'), rate: 0 };
  totals.rate = rateOf(totals.enquiries, totals.views);
  previous.rate = rateOf(previous.enquiries, previous.views);

  return {
    measured: listings.some(isMeasured),
    totals,
    previous,
    series: { views, saves, enquiries, rate },
  };
}

/** A long series folded into weekly totals, so a 90-day sparkline stays legible. */
export function foldWeekly(xs: number[]): number[] {
  if (xs.length <= 30) return xs;
  const out: number[] = [];
  for (let i = xs.length % 7; i < xs.length; i += 7) out.push(sum(xs.slice(i, i + 7)));
  return out;
}

const DAY = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' });

/** Date labels for a window ending on `today`, oldest first. */
export function dayLabels(days: number, today: Date): string[] {
  return Array.from({ length: days }, (_, i) => DAY.format(new Date(today.getTime() - (days - 1 - i) * 86_400_000)));
}

export const windowLabel = (days: WindowDays) => `${days} days`;
