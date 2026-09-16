/**
 * Listing performance and enquiries for the Phase 1 prototype.
 *
 * The public site does not exist yet, so no view, save or search is counted
 * anywhere. The figures below therefore exist only for the demo account
 * (Demo Data ON), where they are derived deterministically from the listing
 * reference so the same listing always shows the same numbers and the
 * dashboard reads coherently.
 *
 * For the agent's own listings they are not invented: `listingStats` returns
 * `measured: false` and zeros, and every screen shows "Not measured yet".
 * Enquiry counts are a different matter — those are real records, read from
 * the workspace, not from here.
 */

import { DemoListing } from './data';
import { isDemoId } from './report-data/demo-workspace';
import { TODAY } from './workspace';

/** Whether traffic figures exist for this listing. Only the demo account's do, until the public site counts them. */
export const isMeasured = (l: Pick<DemoListing, 'id'>) => isDemoId(l.id);

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export interface ListingStats {
  /** False when nothing is counted for this listing; every figure is then zero and must not be shown as data. */
  measured: boolean;
  /** Views over the last 7 and 30 days. */
  views7d: number;
  views30d: number;
  enquiries7d: number;
  enquiries30d: number;
  saves: number;
  /** Daily views for the last 14 days, oldest first. */
  series: number[];
  /** Week-on-week change in enquiries, as a percentage. */
  trendPct: number;
  /** Enquiries per 100 views, over 30 days. */
  conversion: number;
}

const ZERO: ListingStats = { measured: true, views7d: 0, views30d: 0, enquiries7d: 0, enquiries30d: 0, saves: 0, series: Array(14).fill(0), trendPct: 0, conversion: 0 };

/** Rough attractiveness multiplier so numbers make sense against rent and photos. */
function appeal(l: DemoListing) {
  const photoFactor = l.images >= 12 ? 1.35 : l.images >= 8 ? 1.1 : l.images >= 4 ? 0.85 : 0.5;
  const rentFactor = l.monthlyRent > 12000 ? 0.55 : l.monthlyRent > 7000 ? 0.8 : l.monthlyRent > 4500 ? 1 : 1.2;
  return photoFactor * rentFactor;
}

/**
 * Daily views for the last `days` days, oldest first.
 *
 * Counted back from today with the same index the fourteen-day series uses, so
 * the most recent fortnight reads identically however long a window is asked
 * for and a reader switching 7D → 90D never sees yesterday change.
 */
export function viewsSeries(l: DemoListing, days = 14): number[] {
  if (!isMeasured(l)) return Array(days).fill(0);
  if (l.status === 'draft' || l.status === 'pending_review' || l.status === 'rejected') return Array(days).fill(0);
  const h = hash(l.reference);
  const a = appeal(l);
  const base = 14 + (h % 26); // daily views baseline
  // A listing is not seen before it went live: days before its publication date count nothing.
  const live = l.publishedAt ? Math.floor((TODAY.getTime() - new Date(l.publishedAt).getTime()) / 86_400_000) : Infinity;
  return Array.from({ length: days }, (_, j) => {
    const ago = days - 1 - j;
    if (ago > live) return 0;
    const i = 13 - ago;
    const g = hash(l.reference + ':' + i);
    const weekday = ((i % 7) + 7) % 7;
    const weekend = weekday === 5 || weekday === 6 ? 1.25 : 1;
    const drift = l.status === 'expired' ? Math.max(0.15, Math.min(1, 1 - i / 12)) : l.status === 'paused' ? (i > 8 ? 0.15 : 1) : 1;
    return Math.round(base * a * weekend * drift * (0.7 + (g % 60) / 100));
  });
}

/** What the agent can plot. Saves and enquiries are a share of views. */
export type Metric = 'views' | 'saves' | 'enquiries';

/** Share of views that become a save or an enquiry, fixed per listing. */
export function metricRate(l: DemoListing, metric: Metric): number {
  if (metric === 'views') return 1;
  const h = hash(l.reference);
  return metric === 'saves' ? 0.08 + ((h >> 5) % 6) / 100 : 0.03 + ((h >> 3) % 5) / 100;
}

const UNMEASURED: ListingStats = { ...ZERO, measured: false };

export function listingStats(l: DemoListing): ListingStats {
  if (!isMeasured(l)) return UNMEASURED;
  if (l.status === 'draft' || l.status === 'pending_review' || l.status === 'rejected') return ZERO;
  const series = viewsSeries(l, 14);
  const views7d = series.slice(7).reduce((n, v) => n + v, 0);
  const prev7 = series.slice(0, 7).reduce((n, v) => n + v, 0);
  const views30d = viewsSeries(l, 30).reduce((n, v) => n + v, 0);
  const rate = metricRate(l, 'enquiries');
  const enquiries7d = Math.max(0, Math.round(views7d * rate));
  const prevEnq = Math.max(0, Math.round(prev7 * rate));
  const enquiries30d = Math.round(views30d * rate);
  const saves = Math.round(views30d * metricRate(l, 'saves'));
  const trendPct = prevEnq === 0 ? (enquiries7d > 0 ? 100 : 0) : Math.round(((enquiries7d - prevEnq) / prevEnq) * 100);
  const conversion = views30d ? Math.round((enquiries30d / views30d) * 1000) / 10 : 0;
  return { measured: true, views7d, views30d, enquiries7d, enquiries30d, saves, series, trendPct, conversion };
}

/**
 * One metric across the whole portfolio, day by day. Every panel that plots a
 * window reads this, so the chart, its headline and its change are the one
 * arithmetic rather than three that nearly agree.
 */
export function portfolioSeries(listings: DemoListing[], metric: Metric, days: number): number[] {
  const out = Array(days).fill(0) as number[];
  for (const l of listings) {
    const r = metricRate(l, metric);
    viewsSeries(l, days).forEach((v, i) => { out[i] += v * r; });
  }
  return out.map((v) => (metric === 'views' ? Math.round(v) : Math.round(v * 10) / 10));
}

export function totals(listings: DemoListing[]) {
  return listings.reduce(
    (acc, l) => {
      const s = listingStats(l);
      acc.views7d += s.views7d;
      acc.views30d += s.views30d;
      acc.enquiries7d += s.enquiries7d;
      acc.enquiries30d += s.enquiries30d;
      acc.saves += s.saves;
      s.series.forEach((v, i) => (acc.series[i] += v));
      return acc;
    },
    {
      /** True when at least one listing has counted traffic; false means every figure here is a placeholder zero. */
      measured: listings.some(isMeasured),
      views7d: 0, views30d: 0, enquiries7d: 0, enquiries30d: 0, saves: 0, series: Array(14).fill(0) as number[],
    },
  );
}

/* --------------------------------------------------------------- enquiries */

export type { Enquiry, EnquiryStatus } from './workspace';
import type { Enquiry, EnquiryStatus } from './workspace';

export const enquiriesFor = (all: Enquiry[], listingId: string) => all.filter((e) => e.listingId === listingId);

export const ENQUIRY_STATUS: Record<EnquiryStatus, { label: string; tone: 'info' | 'success' | 'warning' | 'neutral' }> = {
  new: { label: 'New', tone: 'info' },
  replied: { label: 'Contacted', tone: 'neutral' },
  viewing: { label: 'Viewing', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
};

/* ---------------------------------------------------------------- insight */

const DISTRICT_NAMES: Record<number, string> = {
  1: 'Marina Bay', 3: 'Tiong Bahru', 5: 'Buona Vista', 9: 'Orchard', 10: 'Bukit Timah', 12: 'Balestier', 14: 'Eunos',
  15: 'East Coast', 16: 'Bedok', 18: 'Tampines', 19: 'Sengkang', 22: 'Jurong', 28: 'Seletar',
};

export const districtName = (d: number) => DISTRICT_NAMES[d] ?? `District ${d}`;

export interface Insight {
  headline: string;
  detail: string;
  href?: string;
  /** The figure the headline turns on, for a panel that wants to set it large. */
  figure?: string;
  /** What the figure is about, in three or four words. */
  subject?: string;
  /** The rest of the headline once the figure has been lifted out of it. */
  caption?: string;
}

/** One sentence the agent can act on, derived from the data rather than invented. */
export function weeklyInsight(listings: DemoListing[]): Insight | null {
  const live = listings.filter((l) => l.status === 'published');
  if (!live.length) return null;

  const byDistrict = new Map<number, { enq: number; prev: number }>();
  for (const l of live) {
    const s = listingStats(l);
    const prev = Math.round(s.enquiries7d / (1 + s.trendPct / 100));
    const cur = byDistrict.get(l.district) ?? { enq: 0, prev: 0 };
    byDistrict.set(l.district, { enq: cur.enq + s.enquiries7d, prev: cur.prev + prev });
  }
  let best: { d: number; pct: number; enq: number } | null = null;
  for (const [d, v] of byDistrict) {
    if (v.prev === 0) continue;
    const pct = Math.round(((v.enq - v.prev) / v.prev) * 100);
    if (!best || pct > best.pct) best = { d, pct, enq: v.enq };
  }
  if (best && best.pct > 0) {
    return {
      headline: `Your ${districtName(best.d)} listings received ${best.pct}% more enquiries this week.`,
      detail: `${best.enq} enquiries across District ${best.d}. Tenants searching there are converting well right now, so a draft in the same area is worth publishing.`,
      href: `/phase1/listings?district=${best.d}`,
      figure: `+${best.pct}%`,
      subject: `${districtName(best.d)} listings`,
      caption: 'more enquiries this week',
    };
  }
  const fewPhotos = live.filter((l) => l.images < 8);
  if (fewPhotos.length) {
    return {
      headline: `${fewPhotos.length} live listing${fewPhotos.length === 1 ? ' has' : 's have'} fewer than 8 photos.`,
      detail: 'Listings with 10 or more photos receive roughly twice the views. Adding photos is the quickest lift available this week.',
      href: `/phase1/listings/${fewPhotos[0].id}`,
      figure: String(fewPhotos.length),
      subject: `live listing${fewPhotos.length === 1 ? '' : 's'}`,
      caption: 'with fewer than 8 photographs',
    };
  }
  return null;
}
