/**
 * The figures behind the client report's visual pages, worked out once.
 *
 * The client report shows a property the way a client reads it: a price band,
 * a ladder of price ranges, what has leased recently, how neighbouring
 * developments compare, what else is advertised, a neighbourhood diagram and a
 * short AI read-out. This module turns the evidence the report already holds
 * (lodged contracts, the market position, the development history, current
 * listings, measured places) into those shapes. The renderer draws them and
 * never calculates.
 *
 * The same rules as `property-insight` hold:
 *
 *  - every figure comes from the evidence passed in; nothing is estimated;
 *  - a range needs at least two observations, and a missing one is left out
 *    rather than drawn empty;
 *  - nothing here ranks properties, values them or states a future figure.
 *    The comparable band is where the middle half of comparable leases would
 *    place a home of this size today, labelled as such, and is not a valuation.
 *
 * Pure and client-safe.
 */

import type { DemoListing } from './data';
import type { Transaction } from './market';
import { NEIGHBOURS, SIZE_BAND, quantile, type MarketPosition } from './market-position';
import { dealOf } from './pricing';
import type { PropertyInsight } from './property-insight';
import {
  TYPE_NOUN, layoutText, metresText, type ActiveMatch, type CompetingSet, type MarketHistory, type RangePosition,
} from './report-insights';

const round50 = (n: number) => Math.round(n / 50) * 50;
const round2 = (n: number) => Math.round(n * 100) / 100;
const median = (xs: number[]) => quantile(xs, 0.5);
const pct = (n: number) => `${Math.abs(n).toFixed(1)}%`;
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`;
const psfOf = (t: Transaction) => t.monthlyRent / t.sizeSqft;
/** Straight-line minutes on foot at 80 m a minute, as the rest of the report counts them. */
export const walkMinutes = (m: number) => Math.max(1, Math.round(m / 80));

/** Raffles Place, the reference point for "distance to the city". */
const CITY = { lat: 1.284, lng: 103.8514 };

/** Straight-line kilometres to Raffles Place, to one decimal. Null for an address with no map position. */
export function cityDistanceKm(lat?: number | null, lng?: number | null): number | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const dy = (lat - CITY.lat) * 111_320;
  const dx = (lng - CITY.lng) * 111_320 * Math.cos((CITY.lat * Math.PI) / 180);
  return Math.round(Math.hypot(dx, dy) / 100) / 10;
}

/* ============================================================ rent band */

export interface RentBand {
  low: number;
  median: number;
  high: number;
  /** Where the asking rent sits: 0 at the low end, 1 at the high end; outside the band it runs past either end. */
  at: number;
  place: 'below' | 'within' | 'above';
}

/**
 * The middle half of comparable rates, applied to this home's floor area. It
 * reads "homes like this lease for about this much", which is what a client
 * asks first; it is labelled as a comparison, not a valuation.
 */
export function rentBand(m: MarketPosition | null, sizeSqft: number): RentBand | null {
  if (!m || !(sizeSqft > 0)) return null;
  const low = round50(m.q1Psf * sizeSqft);
  const high = round50(m.q3Psf * sizeSqft);
  if (!(high > low)) return null;
  const at = (m.unitRent - low) / (high - low);
  return { low, median: round50(m.medianPsf * sizeSqft), high, at, place: at < 0 ? 'below' : at > 1 ? 'above' : 'within' };
}

/* =========================================================== price ladder */

export interface LadderRow {
  key: 'development' | 'nearby' | 'listings';
  label: string;
  /** What the row holds, in a few words. */
  sub: string;
  count: number;
  low: number;
  median: number;
  high: number;
  lowPsf: number;
  medianPsf: number;
  highPsf: number;
}

export interface PriceLadder {
  deal: 'rent' | 'sale';
  rows: LadderRow[];
  asking: number;
  askingPsf: number | null;
}

const rowOf = (key: LadderRow['key'], label: string, sub: string, prices: number[], rates: number[]): LadderRow | null => {
  if (prices.length < 2) return null;
  return {
    key, label, sub, count: prices.length,
    low: Math.min(...prices), median: Math.round(median(prices)), high: Math.max(...prices),
    lowPsf: round2(Math.min(...rates)), medianPsf: round2(median(rates)), highPsf: round2(Math.max(...rates)),
  };
};

/**
 * Up to three ranges against the asking price: similar homes leased in the
 * same development, similar homes leased in neighbouring developments, and
 * similar homes advertised now. Leases are compared only with a rental.
 */
export function priceLadder(l: DemoListing, contracts: Transaction[], competing: CompetingSet | null): PriceLadder | null {
  const deal = dealOf(l);
  const asking = deal === 'rent' ? l.monthlyRent : l.salePriceSgd ?? 0;
  if (!(asking > 0)) return null;
  const rows: (LadderRow | null)[] = [];
  const size = l.sizeSqft > 0 ? l.sizeSqft : 0;
  if (deal === 'rent') {
    const alike = contracts.filter((t) => t.bedrooms === l.bedrooms && t.sizeSqft > 0 && t.monthlyRent > 0);
    const own = alike.filter((t) => t.project === l.project);
    rows.push(rowOf('development', 'This development', `${layoutText(l.bedrooms)} leases`, own.map((t) => t.monthlyRent), own.map(psfOf)));
    const near = new Set([l.district, ...(NEIGHBOURS[l.district] ?? [])]);
    const others = alike.filter((t) => t.project !== l.project && near.has(t.district)
      && (!size || Math.abs(t.sizeSqft - size) <= size * SIZE_BAND));
    rows.push(rowOf('nearby', 'Nearby developments', 'Similar size, leased', others.map((t) => t.monthlyRent), others.map(psfOf)));
  }
  if (competing && competing.items.length) {
    rows.push(rowOf('listings', 'Advertised now', 'Similar homes, asking', competing.items.map((x) => x.price), competing.items.map((x) => x.psf)));
  }
  const kept = rows.filter((r): r is LadderRow => r !== null);
  if (!kept.length) return null;
  return { deal, rows: kept, asking, askingPsf: size ? round2(asking / size) : null };
}

/* ========================================================= recent leases */

export interface LeaseRow extends Transaction { psf: number; mark: 'high' | 'low' | null }

export interface RecentLeases {
  rows: LeaseRow[];
  /** "3-bedroom homes" or "all layouts", as printed. */
  scope: string;
  /** How many contracts the rows were chosen from. */
  of: number;
}

/**
 * The newest contracts in the history's scope, with the highest and lowest
 * rate among them marked. Same-layout homes when there are enough of them.
 */
export function recentLeases(h: MarketHistory | null, l: DemoListing, limit = 10): RecentLeases | null {
  if (!h || !h.rows.length) return null;
  const same = h.rows.filter((r) => r.bedrooms === l.bedrooms);
  const pool = same.length >= 5 ? same : h.rows;
  const newest = [...pool].sort((a, b) => b.month.localeCompare(a.month)).slice(0, limit);
  const rates = newest.map((r) => r.psf);
  const hi = Math.max(...rates);
  const lo = Math.min(...rates);
  const hiAt = rates.indexOf(hi);
  const loAt = rates.indexOf(lo);
  return {
    rows: newest.map((r, k) => ({ ...r, mark: hi === lo ? null : k === hiAt ? 'high' : k === loAt ? 'low' : null })),
    scope: pool === same ? `${layoutText(l.bedrooms)} homes` : 'all layouts',
    of: pool.length,
  };
}

/* ===================================================== development board */

export interface BoardRow {
  project: string;
  district: number;
  subject: boolean;
  count: number;
  medianRent: number;
  medianPsf: number;
  lowPsf: number;
  highPsf: number;
  /** YYYY-MM of the newest contract. */
  latest: string;
}

/**
 * The property's development and its neighbours, each summarised from its own
 * contracts for the same layout: the estate comparison a client uses to see
 * whether the building is priced like its neighbours.
 */
export function developmentBoard(l: DemoListing, contracts: Transaction[], max = 6): BoardRow[] {
  if (dealOf(l) !== 'rent') return [];
  const alike = contracts.filter((t) => t.bedrooms === l.bedrooms && t.sizeSqft > 0 && t.monthlyRent > 0);
  const byProject = new Map<string, Transaction[]>();
  for (const t of alike) byProject.set(t.project, [...(byProject.get(t.project) ?? []), t]);
  const rows: BoardRow[] = [...byProject.entries()]
    .filter(([, ts]) => ts.length >= 2)
    .map(([project, ts]) => {
      const rates = ts.map(psfOf);
      return {
        project,
        district: ts[0].district,
        subject: project === l.project,
        count: ts.length,
        medianRent: round50(median(ts.map((t) => t.monthlyRent))),
        medianPsf: round2(median(rates)),
        lowPsf: round2(Math.min(...rates)),
        highPsf: round2(Math.max(...rates)),
        latest: ts.map((t) => t.month).sort().slice(-1)[0] ?? '',
      };
    })
    .sort((a, b) => Number(b.subject) - Number(a.subject) || b.count - a.count || a.project.localeCompare(b.project));
  /* One development on its own is not a comparison. */
  return rows.length >= 2 ? rows.slice(0, max) : [];
}

/* ============================================================ competition */

export interface CompetitionBand { match: ActiveMatch; count: number; low: number; median: number; high: number }

/** What similar homes ask, grouped by how near they are. */
export function competitionBands(c: CompetingSet | null): CompetitionBand[] {
  if (!c || !c.items.length) return [];
  const order: ActiveMatch[] = ['Same district', 'Nearby district', 'Other district'];
  return order
    .map((match) => {
      const prices = c.items.filter((x) => x.match === match).map((x) => x.price);
      return prices.length
        ? { match, count: prices.length, low: Math.min(...prices), median: Math.round(median(prices)), high: Math.max(...prices) }
        : null;
    })
    .filter((b): b is CompetitionBand => b !== null);
}

/* ======================================================= neighbourhood map */

export type RadarKind = 'transport' | 'schools' | 'healthcare' | 'daily';

export interface RadarPoint { kind: RadarKind; name: string; metres: number; /** Degrees clockwise from north. */ bearing: number }

/** Degrees clockwise from north, from one point to another, on a flat local grid. */
export function bearingOf(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const dy = to.lat - from.lat;
  const dx = (to.lng - from.lng) * Math.cos((from.lat * Math.PI) / 180);
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  return Math.round(((deg % 360) + 360) % 360);
}

/** Every measured place within `radius` metres, placed by its true bearing. */
export function radarPoints(
  origin: { lat?: number | null; lng?: number | null },
  groups: { kind: RadarKind; items: { name: string; metres: number; lat?: number; lng?: number }[] }[],
  radius = 2000,
): RadarPoint[] {
  if (typeof origin.lat !== 'number' || typeof origin.lng !== 'number') return [];
  const from = { lat: origin.lat, lng: origin.lng };
  return groups.flatMap((g) => g.items
    .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number' && p.metres >= 0 && p.metres <= radius)
    .map((p) => ({ kind: g.kind, name: p.name, metres: p.metres, bearing: bearingOf(from, { lat: p.lat!, lng: p.lng! }) })));
}

/* ============================================================== AI signals */

export type SignalTone = 'good' | 'watch' | 'neutral' | 'none';

export interface Signals {
  price: {
    value: string; caption: string; tone: SignalTone;
    /** 0–1 along below | within | above, or null when there is nothing to place. */
    dial: number | null;
  };
  momentum: { value: string; caption: string; tone: SignalTone; direction: 'up' | 'flat' | 'down' | null };
  access: { value: string; caption: string; tone: SignalTone; metres: number | null };
  evidence: { value: string; caption: string; tone: SignalTone; bars: 1 | 2 | 3 };
}

export interface SignalInput {
  market: MarketPosition | null;
  range: RangePosition | null;
  competing: CompetingSet | null;
  insight: PropertyInsight;
  station: { name: string; metres: number } | null;
  /** Why the station is missing, as the location lookup put it. */
  stationNote: string;
  notCompared: string;
}

/** The dial runs below (0–0.2), within (0.2–0.8) and above (0.8–1). */
const dialOf = (r: RangePosition) => (r.place === 'below' ? 0.1 : r.place === 'above' ? 0.9 : 0.2 + (r.higherThanPct / 100) * 0.6);

/** Four read-at-a-glance signals, each from a figure printed elsewhere in the report. */
export function signalsFor(i: SignalInput): Signals {
  const { market: m, range: r, competing: c, insight } = i;

  const price: Signals['price'] = m && r
    ? {
      value: r.place === 'within' ? 'Within range' : r.place === 'below' ? 'Below range' : 'Above range',
      caption: `${signed(m.deltaPct)} vs comparable median`,
      tone: r.place === 'above' ? 'watch' : 'good',
      dial: dialOf(r),
    }
    : c && c.deltaPct !== null
      ? { value: 'Listings only', caption: `${signed(c.deltaPct)} vs homes advertised now`, tone: 'neutral', dial: null }
      : { value: 'Not compared', caption: i.notCompared, tone: 'none', dial: null };

  const dir = insight.outlook.direction;
  const momentum: Signals['momentum'] = insight.outlook.supported && m && m.changePct !== null
    ? {
      value: dir === 'firm' ? 'Firm' : dir === 'soft' ? 'Easing' : 'Steady',
      caption: `${signed(m.changePct)} in comparable rents, ${m.trend.length} months`,
      tone: dir === 'soft' ? 'watch' : 'good',
      direction: dir === 'firm' ? 'up' : dir === 'soft' ? 'down' : 'flat',
    }
    : { value: 'No clear trend', caption: 'Not enough verified records', tone: 'none', direction: null };

  const s = i.station;
  const access: Signals['access'] = s
    ? {
      value: s.metres <= 2000 ? `${walkMinutes(s.metres)} min walk` : metresText(s.metres),
      caption: s.name,
      tone: s.metres <= 800 ? 'good' : s.metres > 1200 ? 'watch' : 'neutral',
      metres: s.metres,
    }
    : { value: 'No station', caption: i.stationNote, tone: 'none', metres: null };

  const level = insight.confidence.level;
  const evidence: Signals['evidence'] = {
    value: insight.confidence.label,
    caption: insight.confidence.reason,
    tone: level === 'moderate' ? 'good' : level === 'limited' ? 'watch' : 'none',
    bars: level === 'moderate' ? 3 : level === 'limited' ? 2 : 1,
  };
  return { price, momentum, access, evidence };
}

/**
 * The analysis in one plain sentence: what the home is, how it is priced, how
 * the market has moved, how far the station is. Each part appears only when the
 * evidence for it does.
 */
export function inShort(l: DemoListing, i: SignalInput): string {
  const noun = `${layoutText(l.bedrooms).toLowerCase()} ${TYPE_NOUN[l.propertyType]}`;
  const what = `A ${noun}`.replace(/^A ([aeiou])/i, 'An $1');
  const { market: m, range: r, competing: c } = i;
  const deal = dealOf(l) === 'rent' ? 'rent' : 'price';
  const priced = m && r
    ? r.place === 'within'
      ? `with an asking ${deal} inside the usual range for similar homes`
      : `with an asking ${deal} ${r.place} the usual range for similar homes (${signed(m.deltaPct)} vs the median)`
    : c && c.deltaPct !== null
      ? `asking ${pct(c.deltaPct)} ${c.deltaPct >= 0 ? 'more' : 'less'} per sq ft than similar homes advertised now`
      : 'not yet compared with verified lease records';
  const dir = i.insight.outlook.supported ? i.insight.outlook.direction : null;
  const market = dir === 'firm' ? 'in a firm rental market' : dir === 'soft' ? 'where rents have eased' : dir === 'stable' ? 'in a steady rental market' : '';
  const s = i.station;
  const reach = s ? (s.metres <= 2000 ? `${walkMinutes(s.metres)} minutes' walk from ${s.name}` : `about ${metresText(s.metres)} from ${s.name}`) : '';
  return `${[`${what} ${priced}`, market, reach].filter(Boolean).join(', ')}.`;
}
