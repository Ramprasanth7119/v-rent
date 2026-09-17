/**
 * The dashboard's arithmetic, in one place and free of React.
 *
 * Every panel on the dashboard reads these functions and nothing else, so the
 * hero, the metric cards, the chart, the funnel and the ranking cannot
 * disagree about a number. Two kinds of figure are kept strictly apart:
 *
 *  - **Records** — enquiries, viewings, lets. These are stored rows in the
 *    active workspace (the agent's own with Demo Data OFF, the demo account's
 *    with it ON) and are counted exactly, in both modes. A zero is a zero.
 *
 *  - **Traffic** — views and saves. Nothing counts these for a real listing
 *    yet, so `trend` and friends report `measured: false` and every screen says
 *    so instead of drawing a flat line. Only demo listings carry a modelled
 *    series. A listing earns no traffic before the day it was published.
 *
 * Days are Singapore calendar days. Windows end today and run backwards; the
 * comparison is always the same-length window immediately before.
 */

import type { DemoListing } from './data';
import type { Enquiry } from './workspace';
import type { ViewingSlot } from './tools';
import { isMeasured, metricRate, viewsSeries } from './performance';
import { enquiryTime } from './enquiries';

const DAY = 86_400_000;
const SG_OFFSET = 8 * 3_600_000;

/** Singapore calendar day number. Two instants on the same SG date share it. */
export const sgDayNo = (t: number) => Math.floor((t + SG_OFFSET) / DAY);
const isoDayNo = (iso: string) => sgDayNo(new Date(`${iso}T12:00:00+08:00`).getTime());

/* ------------------------------------------------------------------ ranges */

export type Range = '7D' | '30D' | '90D' | '12M';
export type DashMetric = 'views' | 'saves' | 'enquiries' | 'viewings';

export const RANGES: Record<Range, { days: number; bucket: number; phrase: string }> = {
  '7D': { days: 7, bucket: 1, phrase: '7 days' },
  '30D': { days: 30, bucket: 1, phrase: '30 days' },
  /* Longer windows are drawn in whole weeks: ninety daily points is a smudge,
     and a week is the rhythm rentals actually move in. */
  '90D': { days: 91, bucket: 7, phrase: '90 days' },
  '12M': { days: 364, bucket: 7, phrase: '12 months' },
};

export const TRAFFIC: ReadonlySet<DashMetric> = new Set(['views', 'saves']);

/* ------------------------------------------------------------ daily series */

/**
 * One listing's daily views or saves, oldest first, ending today. Saves are a
 * fraction per day and only rounded once they are summed. `viewsSeries`
 * already reads nothing before the listing was published.
 */
function listingDaily(l: DemoListing, metric: 'views' | 'saves', days: number): number[] {
  const rate = metric === 'views' ? 1 : metricRate(l, 'saves');
  return viewsSeries(l, days).map((v) => v * rate);
}

/** Whether any listing in the set has traffic figures at all. */
export const trafficMeasured = (listings: DemoListing[]) => listings.some(isMeasured);

function trafficDaily(listings: DemoListing[], metric: 'views' | 'saves', days: number): number[] {
  const out = new Array<number>(days).fill(0);
  for (const l of listings) {
    if (!isMeasured(l)) continue;
    listingDaily(l, metric, days).forEach((v, i) => { out[i] += v; });
  }
  return out;
}

/** Counts of dated records per day, oldest first, ending today. Future dates are not counted. */
function countDaily(dayNos: number[], days: number, now: Date): number[] {
  const out = new Array<number>(days).fill(0);
  const today = sgDayNo(now.getTime());
  for (const d of dayNos) {
    const i = days - 1 - (today - d);
    if (i >= 0 && i < days) out[i] += 1;
  }
  return out;
}

/** A booked viewing's day: the day it takes place. */
const viewingDays = (slots: ViewingSlot[]) => slots.filter((s) => s.booking).map((s) => isoDayNo(s.date));
const enquiryDays = (enquiries: Enquiry[]) =>
  enquiries.map(enquiryTime).filter((t) => Number.isFinite(t)).map(sgDayNo);

export interface Sources {
  listings: DemoListing[];
  enquiries: Enquiry[];
  slots: ViewingSlot[];
  now: Date;
}

function daily(src: Sources, metric: DashMetric, days: number): number[] {
  switch (metric) {
    case 'views':
    case 'saves':
      return trafficDaily(src.listings, metric, days);
    case 'enquiries':
      return countDaily(enquiryDays(src.enquiries), days, src.now);
    case 'viewings':
      return countDaily(viewingDays(src.slots), days, src.now);
  }
}

const bucketed = (values: number[], size: number) => {
  if (size === 1) return values;
  const out: number[] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size).reduce((n, v) => n + v, 0));
  return out;
};

const sum = (a: number[]) => a.reduce((n, v) => n + v, 0);

const DAY_LABEL = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' });

export interface TrendSeries {
  metric: DashMetric;
  range: Range;
  /** False for a traffic metric when no listing is measured. Nothing else should be shown then. */
  measured: boolean;
  points: number[];
  /** The window before, bucketed the same way, point for point. */
  prevPoints: number[];
  /** The label of each point: the day, or the last day of the week it sums. */
  labels: string[];
  total: number;
  prevTotal: number;
  /** Change against the window before, in whole percent. Null when the window before had nothing to compare with. */
  changePct: number | null;
}

/** One metric over one window, with the window before it for comparison. */
export function trend(src: Sources, metric: DashMetric, range: Range): TrendSeries {
  const { days, bucket } = RANGES[range];
  const measured = !TRAFFIC.has(metric) || trafficMeasured(src.listings);
  const both = measured ? daily(src, metric, days * 2) : new Array<number>(days * 2).fill(0);
  const current = both.slice(days);
  const before = both.slice(0, days);
  const points = bucketed(current, bucket).map((v) => Math.round(v));
  const total = Math.round(sum(current));
  const prevTotal = Math.round(sum(before));
  const today = src.now.getTime();
  const labels = points.map((_, i) => {
    const lastDayIndex = Math.min(days - 1, (i + 1) * bucket - 1);
    return DAY_LABEL.format(new Date(today - (days - 1 - lastDayIndex) * DAY));
  });
  return {
    metric, range, measured, points, labels, total, prevTotal,
    prevPoints: bucketed(before, bucket).map((v) => Math.round(v)),
    changePct: prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null,
  };
}

/* ------------------------------------------------------------ per listing */

export interface ListingPerformance {
  l: DemoListing;
  measured: boolean;
  views7d: number;
  prevViews7d: number;
  views30d: number;
  saves30d: number;
  /** Enquiry records about this listing in the last 30 days. */
  enquiries30d: number;
  /** Booked viewings of this listing that fall in the last 30 days or are still to come. */
  viewings: number;
  /** Daily views, fourteen days, oldest first. Zeros when not measured. */
  spark: number[];
  /** Views this week against last, in whole percent. Null without a base to compare. */
  growthPct: number | null;
  /** Enquiries per 100 views over 30 days. Null when not measured or not viewed. */
  rate: number | null;
}

export function listingPerformance(src: Sources): ListingPerformance[] {
  const today = sgDayNo(src.now.getTime());
  const enquiriesBy = new Map<string, number>();
  for (const e of src.enquiries) {
    const t = enquiryTime(e);
    if (Number.isFinite(t) && today - sgDayNo(t) < 30) enquiriesBy.set(e.listingId, (enquiriesBy.get(e.listingId) ?? 0) + 1);
  }
  const viewingsBy = new Map<string, number>();
  for (const s of src.slots) {
    if (!s.booking) continue;
    if (today - isoDayNo(s.date) < 30) viewingsBy.set(s.listingId, (viewingsBy.get(s.listingId) ?? 0) + 1);
  }

  return src.listings.map((l) => {
    const measured = isMeasured(l);
    const views30 = measured ? listingDaily(l, 'views', 30) : [];
    const saves30 = measured ? listingDaily(l, 'saves', 30) : [];
    const views7d = Math.round(sum(views30.slice(23)));
    const prevViews7d = Math.round(sum(views30.slice(16, 23)));
    const views30d = Math.round(sum(views30));
    const enquiries30d = enquiriesBy.get(l.id) ?? 0;
    return {
      l,
      measured,
      views7d,
      prevViews7d,
      views30d,
      saves30d: Math.round(sum(saves30)),
      enquiries30d,
      viewings: viewingsBy.get(l.id) ?? 0,
      spark: measured ? views30.slice(16).map((v) => Math.round(v)) : new Array<number>(14).fill(0),
      growthPct: measured && prevViews7d >= 10 ? Math.round(((views7d - prevViews7d) / prevViews7d) * 100) : null,
      rate: measured && views30d > 0 ? Math.round((enquiries30d / views30d) * 1000) / 10 : null,
    };
  });
}

/* --------------------------------------------------------------- portfolio */

export interface PortfolioSummary {
  measured: boolean;
  views7d: number;
  prevViews7d: number;
  views30d: number;
  saves30d: number;
  /** Fourteen days of portfolio views, for the hero sparkline. */
  viewsSpark: number[];
  enquiries30d: number;
  prevEnquiries30d: number;
  /** Thirty days of enquiry records per day. */
  enquirySpark: number[];
  awaitingReply: number;
  /** Booked viewings still to come. */
  upcomingViewings: number;
  /** Booked viewings that took place in the last 30 days. */
  heldViewings: number;
  /** Enquiries closed as let, whose last movement was in the last 30 days. */
  lets30d: number;
  /** Enquiries per 100 views over 30 days. Null when traffic is not measured. */
  rate: number | null;
}

export function portfolioSummary(src: Sources): PortfolioSummary {
  const live = src.listings;
  const measured = trafficMeasured(live);
  const views = measured ? trafficDaily(live, 'views', 30) : new Array<number>(30).fill(0);
  const saves = measured ? trafficDaily(live, 'saves', 30) : [];
  const enq = countDaily(enquiryDays(src.enquiries), 60, src.now);
  const today = sgDayNo(src.now.getTime());

  let upcoming = 0;
  let held = 0;
  for (const s of src.slots) {
    if (!s.booking) continue;
    const d = isoDayNo(s.date);
    if (d >= today) upcoming += 1;
    else if (today - d < 30) held += 1;
  }

  const lets30d = src.enquiries.filter((e) => {
    if (e.status !== 'closed' || e.outcome !== 'let') return false;
    const t = new Date(e.lastActionAt ?? e.at).getTime();
    return Number.isFinite(t) && today - sgDayNo(t) < 30;
  }).length;

  const views30d = Math.round(sum(views));
  const enquiries30d = sum(enq.slice(30));

  return {
    measured,
    views7d: Math.round(sum(views.slice(23))),
    prevViews7d: Math.round(sum(views.slice(16, 23))),
    views30d,
    saves30d: Math.round(sum(saves)),
    viewsSpark: views.slice(16).map((v) => Math.round(v)),
    enquiries30d,
    prevEnquiries30d: sum(enq.slice(0, 30)),
    enquirySpark: enq.slice(30),
    awaitingReply: src.enquiries.filter((e) => e.status === 'new').length,
    upcomingViewings: upcoming,
    heldViewings: held,
    lets30d,
    rate: measured && views30d > 0 ? Math.round((enquiries30d / views30d) * 1000) / 10 : null,
  };
}

/* ------------------------------------------------------------------ funnel */

export interface FunnelStep {
  key: 'views' | 'saves' | 'enquiries' | 'viewings' | 'lets';
  label: string;
  value: number;
  /** This stage as a share of the one before, in percent. Null for the first stage, or when the one before is zero. */
  stepPct: number | null;
}

/**
 * Thirty days, from first look to a signed tenancy. Traffic stages are left
 * out entirely when nothing is measured, rather than drawn at zero, so the
 * funnel of a real account starts at the first thing that is actually counted.
 */
export function funnel(s: PortfolioSummary): FunnelStep[] {
  const raw: Omit<FunnelStep, 'stepPct'>[] = [
    ...(s.measured ? [
      { key: 'views' as const, label: 'Views', value: s.views30d },
      { key: 'saves' as const, label: 'Saves', value: s.saves30d },
    ] : []),
    { key: 'enquiries', label: 'Enquiries', value: s.enquiries30d },
    { key: 'viewings', label: 'Viewings', value: s.heldViewings + s.upcomingViewings },
    { key: 'lets', label: 'Let', value: s.lets30d },
  ];
  return raw.map((r, i) => ({
    ...r,
    stepPct: i === 0 || raw[i - 1].value === 0 ? null : Math.round((r.value / raw[i - 1].value) * 1000) / 10,
  }));
}

/* ---------------------------------------------------------------- capacity */

export interface Capacity {
  live: number;
  paused: number;
  limit: number;
  available: number;
  /** Used share of the allowance, 0–100. Null without a plan. */
  pct: number | null;
}

export function capacity(listings: DemoListing[], limit: number): Capacity {
  const current = listings.filter((l) => !l.archived);
  const live = current.filter((l) => l.status === 'published').length;
  const paused = current.filter((l) => l.status === 'paused').length;
  return {
    live,
    paused,
    limit,
    available: Math.max(0, limit - live - paused),
    pct: limit > 0 ? Math.min(100, Math.round(((live + paused) / limit) * 100)) : null,
  };
}

/* ---------------------------------------------------------------- insights */

export interface DashInsight {
  id: string;
  tone: 'positive' | 'watch' | 'neutral';
  /** The figure the sentence turns on. */
  figure: string;
  title: string;
  detail: string;
  href: string;
  listing?: DemoListing;
}

const days = (from: Date, iso?: string) =>
  iso ? Math.ceil((new Date(iso).getTime() - from.getTime()) / DAY) : null;

/**
 * Observations the data supports, strongest first. Each rule states what it
 * measured; none of them extrapolate beyond the agent's own records, and the
 * traffic rules simply do not fire when traffic is not measured.
 */
export function insights(perf: ListingPerformance[], summary: PortfolioSummary, cap: Capacity, now: Date): DashInsight[] {
  const out: DashInsight[] = [];
  const live = perf.filter((p) => p.l.status === 'published');

  if (summary.measured && live.length > 0) {
    const top = [...live].sort((a, b) => b.views7d - a.views7d)[0];
    if (top.views7d > 0 && summary.views7d > 0) {
      const share = Math.round((top.views7d / summary.views7d) * 100);
      out.push({
        id: 'top', tone: 'positive', figure: `${share}%`, listing: top.l,
        title: `${top.l.project} drew ${share}% of this week's views`,
        detail: `${top.views7d.toLocaleString('en-SG')} of ${summary.views7d.toLocaleString('en-SG')} views across ${live.length} live listings.`,
        href: `/phase1/listings/${top.l.id}`,
      });
    }

    const growing = live.filter((p) => p.growthPct !== null && p.growthPct >= 15).sort((a, b) => (b.growthPct ?? 0) - (a.growthPct ?? 0))[0];
    if (growing && growing.l.id !== top?.l.id) {
      out.push({
        id: 'growth', tone: 'positive', figure: `+${growing.growthPct}%`, listing: growing.l,
        title: `${growing.l.project} is gaining attention`,
        detail: `${growing.views7d} views this week against ${growing.prevViews7d} the week before.`,
        href: `/phase1/listings/${growing.l.id}`,
      });
    }

    const sorted = [...live].sort((a, b) => a.views30d - b.views30d);
    const median = sorted[Math.floor(sorted.length / 2)]?.views30d ?? 0;
    const lagging = summary.rate !== null
      ? live
        .filter((p) => p.rate !== null && p.views30d >= median && p.views30d >= 100 && p.rate < summary.rate! / 2)
        .sort((a, b) => b.views30d - a.views30d)[0]
      : undefined;
    if (lagging) {
      out.push({
        id: 'lag', tone: 'watch', figure: `${lagging.rate!.toFixed(1)}`, listing: lagging.l,
        title: `${lagging.l.project} is seen but rarely enquired about`,
        detail: `${lagging.enquiries30d} enquiries from ${lagging.views30d.toLocaleString('en-SG')} views, against ${summary.rate!.toFixed(1)} per 100 across the portfolio. Photographs, price and description are the usual levers.`,
        href: `/phase1/listings/new?edit=${lagging.l.id}`,
      });
    }
  }

  const expiring = live
    .map((p) => ({ p, d: days(now, p.l.expiresAt) }))
    .filter((x): x is { p: ListingPerformance; d: number } => x.d !== null && x.d >= 0 && x.d <= 14)
    .sort((a, b) => a.d - b.d)[0];
  if (expiring) {
    out.push({
      id: 'expiry', tone: 'watch', figure: `${expiring.d}d`, listing: expiring.p.l,
      title: `${expiring.p.l.project} comes off the site ${expiring.d === 0 ? 'today' : `in ${expiring.d} day${expiring.d === 1 ? '' : 's'}`}`,
      detail: 'Renew it to keep its enquiries coming, or let it lapse to free the slot.',
      href: `/phase1/listings/${expiring.p.l.id}`,
    });
  }

  const thin = live.filter((p) => p.l.images > 0 && p.l.images < 5)[0];
  if (thin) {
    out.push({
      id: 'photos', tone: 'watch', figure: String(thin.l.images), listing: thin.l,
      title: `${thin.l.project} has only ${thin.l.images} photograph${thin.l.images === 1 ? '' : 's'}`,
      detail: 'Listings with a full set of photographs are the ones tenants keep and write about.',
      href: `/phase1/listings/new?edit=${thin.l.id}&step=photos`,
    });
  }

  if (cap.pct !== null && cap.pct >= 80) {
    out.push({
      id: 'capacity', tone: cap.available === 0 ? 'watch' : 'neutral', figure: `${cap.pct}%`,
      title: cap.available === 0 ? 'Every listing slot is in use' : `${cap.available} listing slot${cap.available === 1 ? '' : 's'} left`,
      detail: `${cap.live + cap.paused} of ${cap.limit} slots are taken by live and paused listings.`,
      href: '/phase1/plans',
    });
  }

  return out.slice(0, 4);
}

/* ---------------------------------------------------------------- activity */

export type ActivityKind = 'enquiry' | 'viewing' | 'let' | 'lost' | 'published' | 'rejected';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  at: number;
  /** The tenant, for events a person caused. */
  person?: string;
  listingId: string;
  href: string;
  /** Whether it still waits on the agent. */
  open: boolean;
}

/** What happened across the portfolio, newest first. Only events that have happened; nothing scheduled. */
export function activity(src: Sources, limit = 7): ActivityEvent[] {
  const now = src.now.getTime();
  const out: ActivityEvent[] = [];
  const valid = (t: number) => Number.isFinite(t) && t <= now;

  for (const e of src.enquiries) {
    const href = `/phase1/enquiries?enquiry=${encodeURIComponent(e.id)}`;
    const at = enquiryTime(e);
    if (valid(at)) out.push({ id: `e-${e.id}`, kind: 'enquiry', at, person: e.name, listingId: e.listingId, href, open: e.status === 'new' });
    if (e.status === 'closed' && e.outcome) {
      const t = new Date(e.lastActionAt ?? '').getTime();
      if (valid(t)) out.push({ id: `c-${e.id}`, kind: e.outcome, at: t, person: e.name, listingId: e.listingId, href, open: false });
    }
  }
  for (const s of src.slots) {
    if (!s.booking || s.listingId === 'any') continue;
    const t = new Date(s.booking.at).getTime();
    if (valid(t)) out.push({ id: `v-${s.id}`, kind: 'viewing', at: t, person: s.booking.name, listingId: s.listingId, href: '/phase1/viewings', open: false });
  }
  for (const l of src.listings) {
    const pub = new Date(l.publishedAt ?? '').getTime();
    if (l.status === 'published' && valid(pub)) out.push({ id: `p-${l.id}`, kind: 'published', at: pub, listingId: l.id, href: `/phase1/listings/${l.id}`, open: false });
    const rev = new Date(l.reviewedAt ?? '').getTime();
    if (l.status === 'rejected' && valid(rev)) out.push({ id: `r-${l.id}`, kind: 'rejected', at: rev, listingId: l.id, href: `/phase1/listings/new?edit=${l.id}`, open: true });
  }

  return out.sort((a, b) => b.at - a.at).slice(0, limit);
}

/* ---------------------------------------------------------------- viewings */

/**
 * Booked slots from today on, soonest first. The same rule as
 * `portfolioSummary().upcomingViewings`, so the count and the list agree.
 */
export function upcomingSlots(slots: ViewingSlot[], now: Date): ViewingSlot[] {
  const today = sgDayNo(now.getTime());
  return slots
    .filter((s) => s.booking && isoDayNo(s.date) >= today)
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
}

/* ----------------------------------------------------------------- ranking */

/**
 * Live listings, best first, and what they are ranked by. Views over seven
 * days when traffic is measured; otherwise the enquiries and viewings actually
 * recorded over thirty days, never a view count of zero.
 */
export function rankListings(perf: ListingPerformance[]): { rows: ListingPerformance[]; byViews: boolean } {
  const live = perf.filter((p) => p.l.status === 'published');
  const byViews = live.some((p) => p.measured);
  const rows = [...live].sort((a, b) => (byViews
    ? b.views7d - a.views7d || b.enquiries30d - a.enquiries30d
    : b.enquiries30d + b.viewings - (a.enquiries30d + a.viewings) || a.l.project.localeCompare(b.l.project)));
  return { rows, byViews };
}
