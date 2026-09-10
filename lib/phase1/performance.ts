/**
 * Listing performance and enquiries for the Phase 1 prototype.
 *
 * The public site does not exist yet, so nothing here is measured. Values are
 * derived deterministically from the listing reference so the same listing
 * always shows the same numbers, and the dashboard reads coherently.
 */

import { DemoListing } from './data';

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export interface ListingStats {
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

const ZERO: ListingStats = { views7d: 0, views30d: 0, enquiries7d: 0, enquiries30d: 0, saves: 0, series: Array(14).fill(0), trendPct: 0, conversion: 0 };

/** Rough attractiveness multiplier so numbers make sense against rent and photos. */
function appeal(l: DemoListing) {
  const photoFactor = l.images >= 12 ? 1.35 : l.images >= 8 ? 1.1 : l.images >= 4 ? 0.85 : 0.5;
  const rentFactor = l.monthlyRent > 12000 ? 0.55 : l.monthlyRent > 7000 ? 0.8 : l.monthlyRent > 4500 ? 1 : 1.2;
  return photoFactor * rentFactor;
}

export function listingStats(l: DemoListing): ListingStats {
  if (l.status === 'draft' || l.status === 'pending_review' || l.status === 'rejected') return ZERO;
  const h = hash(l.reference);
  const a = appeal(l);
  const base = 14 + (h % 26); // daily views baseline
  const series = Array.from({ length: 14 }, (_, i) => {
    const g = hash(l.reference + ':' + i);
    const weekend = i % 7 === 5 || i % 7 === 6 ? 1.25 : 1;
    const drift = l.status === 'expired' ? Math.max(0.15, 1 - i / 12) : l.status === 'paused' ? (i > 8 ? 0.15 : 1) : 1;
    return Math.round(base * a * weekend * drift * (0.7 + (g % 60) / 100));
  });
  const views7d = series.slice(7).reduce((n, v) => n + v, 0);
  const prev7 = series.slice(0, 7).reduce((n, v) => n + v, 0);
  const views30d = Math.round((views7d + prev7) * 2.1 + (h % 40));
  const rate = 0.03 + ((h >> 3) % 5) / 100; // 3–7% enquiry rate
  const enquiries7d = Math.max(0, Math.round(views7d * rate));
  const prevEnq = Math.max(0, Math.round(prev7 * rate));
  const enquiries30d = Math.round(views30d * rate);
  const saves = Math.round(views30d * (0.08 + ((h >> 5) % 6) / 100));
  const trendPct = prevEnq === 0 ? (enquiries7d > 0 ? 100 : 0) : Math.round(((enquiries7d - prevEnq) / prevEnq) * 100);
  const conversion = views30d ? Math.round((enquiries30d / views30d) * 1000) / 10 : 0;
  return { views7d, views30d, enquiries7d, enquiries30d, saves, series, trendPct, conversion };
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
    { views7d: 0, views30d: 0, enquiries7d: 0, enquiries30d: 0, saves: 0, series: Array(14).fill(0) as number[] },
  );
}

/* --------------------------------------------------------------- enquiries */

export type { Enquiry, EnquiryStatus } from './workspace';
import type { Enquiry, EnquiryStatus } from './workspace';

export const enquiriesFor = (all: Enquiry[], listingId: string) => all.filter((e) => e.listingId === listingId);

export const ENQUIRY_STATUS: Record<EnquiryStatus, { label: string; tone: 'info' | 'success' | 'warning' | 'neutral' }> = {
  new: { label: 'New', tone: 'info' },
  replied: { label: 'Replied', tone: 'neutral' },
  viewing: { label: 'Viewing booked', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
};

/* ---------------------------------------------------------------- insight */

const DISTRICT_NAMES: Record<number, string> = {
  1: 'Marina Bay', 3: 'Tiong Bahru', 5: 'Buona Vista', 9: 'Orchard', 10: 'Bukit Timah', 12: 'Balestier', 14: 'Eunos',
  15: 'East Coast', 16: 'Bedok', 18: 'Tampines', 19: 'Sengkang', 22: 'Jurong', 28: 'Seletar',
};

export const districtName = (d: number) => DISTRICT_NAMES[d] ?? `District ${d}`;

/** One sentence the agent can act on, derived from the data rather than invented. */
export function weeklyInsight(listings: DemoListing[]): { headline: string; detail: string; href?: string } | null {
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
    };
  }
  const fewPhotos = live.filter((l) => l.images < 8);
  if (fewPhotos.length) {
    return {
      headline: `${fewPhotos.length} live listing${fewPhotos.length === 1 ? ' has' : 's have'} fewer than 8 photos.`,
      detail: 'Listings with 10 or more photos receive roughly twice the views. Adding photos is the quickest lift available this week.',
      href: `/phase1/listings/${fewPhotos[0].id}`,
    };
  }
  return null;
}
