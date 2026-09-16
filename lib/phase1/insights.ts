/**
 * The statistics behind the Insights module.
 *
 * Every figure on the five Insights screens is derived here, from the contract
 * set in `./market` and nothing else. The module exists so that the screens
 * hold layout and the arithmetic is in one place that can be read, argued with
 * and eventually pointed at URA's feed instead — when `MARKET_SOURCE.live`
 * turns true, not one of these functions changes.
 *
 * Two rules run through all of it.
 *
 * A statistic is only returned when enough contracts stand behind it. A median
 * of two leases is not a median, and a screen that prints one anyway teaches an
 * agent to quote it. Where the evidence is too thin the function returns
 * `null`, and the screen is expected to say so rather than draw a zero — a zero
 * is a number, and this is the absence of one.
 *
 * Movement is measured between the first and last thirds of a period rather
 * than between two single months, because one month's median in one project
 * moves on whichever two units happened to let that month.
 */

import {
  MARKET_MONTHS, PROJECTS, TRANSACTIONS, median, type Project, type Transaction,
} from './market';
import { districtName } from './performance';

/**
 * A district, written the way an agent says it.
 *
 * `districtName` falls back to "District 20" for a district it has no name for,
 * which beside the code renders as "D20 District 20". Where there is no name,
 * the code alone is the whole of what is known.
 */
export function districtLabel(d: number): string {
  const code = `D${String(d).padStart(2, '0')}`;
  const name = districtName(d);
  return name === `District ${d}` ? code : `${code} ${name}`;
}

/* ------------------------------------------------------------- thresholds */

/**
 * The fewest contracts behind a median we will print. Below this the spread is
 * wider than the statistic, so the screen says how many there were instead.
 */
export const MIN_FOR_MEDIAN = 4;

/** The fewest months with contracts in them before a trend line means anything. */
export const MIN_FOR_TREND = 5;

/* ------------------------------------------------------------------ shapes */

/** What the reader is looking at on the trend chart. */
export type TrendMetric = 'rent' | 'psf' | 'volume';

export const TREND_METRICS: { key: TrendMetric; label: string; question: string }[] = [
  { key: 'rent', label: 'Median rent', question: 'What is a unit here letting for?' },
  { key: 'psf', label: 'Rent per sqft', question: 'Is that dear or cheap for the space?' },
  { key: 'volume', label: 'Contracts', question: 'How much is actually moving?' },
];

/** The windows the held dataset can honestly answer for. */
export type Period = '3' | '6' | '12';

export const PERIOD_OPTIONS: { key: Period; label: string; full: string }[] = [
  { key: '3', label: '3M', full: 'Last 3 months' },
  { key: '6', label: '6M', full: 'Last 6 months' },
  { key: '12', label: '12M', full: 'Last 12 months' },
];

export interface Filters {
  project: string;
  district: string;
  beds: string;
  months: Period;
  query: string;
}

export const EMPTY_FILTERS: Filters = { project: 'all', district: 'all', beds: 'all', months: '12', query: '' };

export function countFilters(f: Filters): number {
  let n = 0;
  if (f.project !== 'all') n += 1;
  if (f.district !== 'all') n += 1;
  if (f.beds !== 'all') n += 1;
  if (f.query.trim()) n += 1;
  return n;
}

/* ---------------------------------------------------------------- helpers */

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export const psfOf = (t: Transaction) => t.monthlyRent / t.sizeSqft;

/** The value below which `p` of the set falls. Linear between the two straddling readings. */
export function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  if (s.length === 1) return s[0];
  const at = (s.length - 1) * Math.min(1, Math.max(0, p));
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return s[lo] + (s[hi] - s[lo]) * (at - lo);
}

/** Where one reading sits in a set, 0–100. What "this unit is dear" actually means. */
export function rankOf(value: number, xs: number[]): number | null {
  if (xs.length < MIN_FOR_MEDIAN) return null;
  const below = xs.filter((x) => x < value).length;
  return Math.round((below / xs.length) * 100);
}

/** The months in the window, oldest first. */
export function monthsIn(period: Period): string[] {
  return MARKET_MONTHS.slice(Math.max(0, MARKET_MONTHS.length - Number(period)));
}

/* ------------------------------------------------------------- filtering */

export function matchesBeds(t: Transaction, beds: string): boolean {
  if (beds === 'all') return true;
  return beds === '4' ? t.bedrooms >= 4 : String(t.bedrooms) === beds;
}

export function selectTransactions(f: Filters, source: Transaction[] = TRANSACTIONS): Transaction[] {
  const window = monthsIn(f.months);
  const from = window[0];
  const q = f.query.trim().toLowerCase();
  return source
    .filter((t) => {
      if (f.project !== 'all' && t.project !== f.project) return false;
      if (f.district !== 'all' && String(t.district) !== f.district) return false;
      if (!matchesBeds(t, f.beds)) return false;
      if (t.month < from) return false;
      if (q && !`${t.project} ${t.street}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => b.month.localeCompare(a.month) || b.monthlyRent - a.monthlyRent);
}

/* ------------------------------------------------------------- the snapshot */

export interface Snapshot {
  /** Contracts behind everything below. */
  count: number;
  months: string[];
  /** Null where fewer than `MIN_FOR_MEDIAN` contracts stand behind it. */
  medianRent: number | null;
  medianPsf: number | null;
  medianSize: number | null;
  /** The middle half of the market, which is what "typical" actually means. */
  q1Rent: number | null;
  q3Rent: number | null;
  lowRent: number | null;
  highRent: number | null;
  /** Percentage change across the window, or null when the series is too short. */
  movementPct: number | null;
  /** The most recent contract in the window. */
  latest: Transaction | null;
  /** One reading per month in the window. Null where that month had nothing. */
  rentByMonth: (number | null)[];
  psfByMonth: (number | null)[];
  volumeByMonth: number[];
  /** How many distinct developments the contracts came from. */
  projects: number;
}

export function snapshot(rows: Transaction[], period: Period): Snapshot {
  const months = monthsIn(period);
  const rents = rows.map((r) => r.monthlyRent);
  const psfs = rows.map(psfOf);
  const sizes = rows.map((r) => r.sizeSqft);
  const enough = rows.length >= MIN_FOR_MEDIAN;

  const perMonth = months.map((m) => rows.filter((r) => r.month === m));
  const rentByMonth = perMonth.map((set) => (set.length ? median(set.map((r) => r.monthlyRent)) : null));
  const psfByMonth = perMonth.map((set) => (
    set.length ? Number((mean(set.map(psfOf))).toFixed(2)) : null
  ));
  const volumeByMonth = perMonth.map((set) => set.length);

  /* Measured between the first and last thirds, and only when there are enough
     months carrying contracts for the two ends to be averages rather than
     single readings. */
  const movementPct = (() => {
    const real = rentByMonth.filter((v): v is number => v !== null);
    if (real.length < MIN_FOR_TREND) return null;
    const span = Math.max(1, Math.round(real.length / 3));
    const start = mean(real.slice(0, span));
    const end = mean(real.slice(-span));
    if (!start) return null;
    return Math.round(((end - start) / start) * 1000) / 10;
  })();

  return {
    count: rows.length,
    months,
    medianRent: enough ? median(rents) : null,
    medianPsf: enough ? Number(mean(psfs).toFixed(2)) : null,
    medianSize: enough ? Math.round(median(sizes)) : null,
    q1Rent: enough ? Math.round(percentile(rents, 0.25)) : null,
    q3Rent: enough ? Math.round(percentile(rents, 0.75)) : null,
    lowRent: rows.length ? Math.min(...rents) : null,
    highRent: rows.length ? Math.max(...rents) : null,
    movementPct,
    latest: rows.length ? rows.reduce((a, b) => (b.month > a.month ? b : a), rows[0]) : null,
    rentByMonth,
    psfByMonth,
    volumeByMonth,
    projects: new Set(rows.map((r) => r.project)).size,
  };
}

/** The series for one metric, with the months that carry it. */
export function seriesFor(s: Snapshot, metric: TrendMetric): (number | null)[] {
  if (metric === 'psf') return s.psfByMonth;
  if (metric === 'volume') return s.volumeByMonth;
  return s.rentByMonth;
}

/* --------------------------------------------------------- distributions */

export interface Bin {
  /** Inclusive lower edge. */
  from: number;
  /** Exclusive upper edge, except on the last bin. */
  to: number;
  count: number;
  label: string;
}

/**
 * A histogram over a set of readings.
 *
 * Edges are rounded to a readable step rather than to whatever the range
 * divides into, because "$4,500 – $4,999" is a price band an agent recognises
 * and "$4,487 – $4,913" is an artefact of the arithmetic.
 */
export function histogram(values: number[], opts: { bins?: number; step?: number; label: (from: number, to: number) => string }): Bin[] {
  if (values.length < 2) return [];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (hi === lo) return [];

  const target = opts.bins ?? 10;
  const raw = (hi - lo) / target;
  const step = opts.step ?? (() => {
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const normalised = raw / magnitude;
    const snapped = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
    return snapped * magnitude;
  })();

  const first = Math.floor(lo / step) * step;
  const last = Math.floor(hi / step) * step;
  const out: Bin[] = [];
  for (let edge = first; edge <= last; edge += step) {
    const top = edge + step;
    const isLast = edge === last;
    out.push({
      from: edge,
      to: top,
      label: opts.label(edge, top),
      count: values.filter((v) => v >= edge && (isLast ? v <= top : v < top)).length,
    });
  }
  return out;
}

export interface BedroomBand {
  beds: number;
  label: string;
  count: number;
  medianRent: number | null;
  medianPsf: number | null;
  medianSize: number | null;
  share: number;
}

/** The unit mix behind a set of contracts: what actually lets, and for what. */
export function bedroomMix(rows: Transaction[]): BedroomBand[] {
  const total = rows.length || 1;
  return ([1, 2, 3, 4] as const).map((beds) => {
    const set = rows.filter((r) => (beds === 4 ? r.bedrooms >= 4 : r.bedrooms === beds));
    const enough = set.length >= MIN_FOR_MEDIAN;
    return {
      beds,
      label: beds === 4 ? '4+ bed' : `${beds} bed`,
      count: set.length,
      medianRent: enough ? median(set.map((r) => r.monthlyRent)) : null,
      medianPsf: enough ? Number(mean(set.map(psfOf)).toFixed(2)) : null,
      medianSize: enough ? Math.round(median(set.map((r) => r.sizeSqft))) : null,
      share: set.length / total,
    };
  }).filter((b) => b.count > 0);
}

/* ------------------------------------------------------------ one contract */

export interface ContractContext {
  /** Where this rent sits among comparable contracts, 0–100. */
  rankInProject: number | null;
  rankInDistrict: number | null;
  /** The project median for the same bedroom count, over the whole held period. */
  projectMedian: number | null;
  districtMedian: number | null;
  psf: number;
  comparables: number;
}

/**
 * What one contract means beside its neighbours.
 *
 * This is the whole reason a row opens: a rent on its own is a number, and a
 * rent against the same bedroom count in the same development is an argument
 * an agent can take to a landlord.
 */
export function contextFor(t: Transaction, source: Transaction[] = TRANSACTIONS): ContractContext {
  const sameBeds = (x: Transaction) => (t.bedrooms >= 4 ? x.bedrooms >= 4 : x.bedrooms === t.bedrooms);
  const inProject = source.filter((x) => x.project === t.project && sameBeds(x));
  const inDistrict = source.filter((x) => x.district === t.district && sameBeds(x));
  return {
    rankInProject: rankOf(t.monthlyRent, inProject.map((x) => x.monthlyRent)),
    rankInDistrict: rankOf(t.monthlyRent, inDistrict.map((x) => x.monthlyRent)),
    projectMedian: inProject.length >= MIN_FOR_MEDIAN ? median(inProject.map((x) => x.monthlyRent)) : null,
    districtMedian: inDistrict.length >= MIN_FOR_MEDIAN ? median(inDistrict.map((x) => x.monthlyRent)) : null,
    psf: psfOf(t),
    comparables: inProject.length,
  };
}

/* ------------------------------------------------------------- by project */

export interface ProjectInsight {
  project: Project;
  snapshot: Snapshot;
  mix: BedroomBand[];
  /**
   * Contracts a year per hundred units. A thousand-unit development lodging
   * forty leases is quiet; a sixty-unit one lodging twenty is not, and the
   * absolute count says the opposite of both.
   */
  turnoverPer100: number | null;
  /** Years since completion, at the end of the held period. */
  age: number;
}

export function projectInsight(name: string, beds: string, period: Period = '12'): ProjectInsight | null {
  const project = PROJECTS.find((p) => p.name === name);
  if (!project) return null;
  const rows = selectTransactions({ ...EMPTY_FILTERS, project: name, beds, months: period });
  const yearRows = selectTransactions({ ...EMPTY_FILTERS, project: name, beds, months: '12' });
  const thisYear = Number(MARKET_MONTHS[MARKET_MONTHS.length - 1].slice(0, 4));
  return {
    project,
    snapshot: snapshot(rows, period),
    mix: bedroomMix(rows),
    turnoverPer100: project.units ? Number(((yearRows.length / project.units) * 100).toFixed(1)) : null,
    age: Math.max(0, thisYear - project.built),
  };
}

/* ------------------------------------------------------------ by district */

export interface DistrictInsight {
  district: number;
  contracts: number;
  medianRent: number | null;
  medianPsf: number | null;
  movementPct: number | null;
  projects: string[];
  rentByMonth: (number | null)[];
}

/**
 * The market around a place, at the only geography the contract set carries.
 *
 * URA publishes a district, not a neighbourhood, so this is a district figure
 * and the screen says so. Offering a "Tampines median" computed from whichever
 * developments happen to sit in D18 would be a different claim than the data
 * supports.
 */
export function districtInsight(district: number, period: Period = '12'): DistrictInsight {
  const rows = selectTransactions({ ...EMPTY_FILTERS, district: String(district), months: period });
  const s = snapshot(rows, period);
  return {
    district,
    contracts: rows.length,
    medianRent: s.medianRent,
    medianPsf: s.medianPsf,
    movementPct: s.movementPct,
    projects: [...new Set(rows.map((r) => r.project))].sort(),
    rentByMonth: s.rentByMonth,
  };
}

/** Every district the contract set covers, so a selector never offers an empty one. */
export const COVERED_DISTRICTS: number[] = [...new Set(PROJECTS.map((p) => p.district))].sort((a, b) => a - b);

/* ------------------------------------------------------- the market at large */

export interface MarketPulse {
  contracts: number;
  medianRent: number | null;
  medianPsf: number | null;
  movementPct: number | null;
  projects: number;
  districts: number;
  busiestDistrict: { district: number; contracts: number } | null;
  rentByMonth: (number | null)[];
}

/** The headline for the Insights landing: the whole held set, last twelve months. */
export function marketPulse(): MarketPulse {
  const rows = selectTransactions({ ...EMPTY_FILTERS, months: '12' });
  const s = snapshot(rows, '12');
  const byDistrict = new Map<number, number>();
  for (const r of rows) byDistrict.set(r.district, (byDistrict.get(r.district) ?? 0) + 1);
  const busiest = [...byDistrict.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    contracts: rows.length,
    medianRent: s.medianRent,
    medianPsf: s.medianPsf,
    movementPct: s.movementPct,
    projects: s.projects,
    districts: byDistrict.size,
    busiestDistrict: busiest ? { district: busiest[0], contracts: busiest[1] } : null,
    rentByMonth: s.rentByMonth,
  };
}

/* ------------------------------------------------------------- rankings */

export interface DistrictRank {
  district: number;
  label: string;
  contracts: number;
  medianRent: number | null;
  medianPsf: number | null;
  movementPct: number | null;
}

/** Every covered district over the window, dearest first. The Overview's bar chart. */
export function districtRanking(period: Period = '12'): DistrictRank[] {
  return COVERED_DISTRICTS
    .map((d) => {
      const rows = selectTransactions({ ...EMPTY_FILTERS, district: String(d), months: period });
      const s = snapshot(rows, period);
      return {
        district: d,
        label: districtLabel(d),
        contracts: rows.length,
        medianRent: s.medianRent,
        medianPsf: s.medianPsf,
        movementPct: s.movementPct,
      };
    })
    .filter((r) => r.contracts > 0)
    .sort((a, b) => (b.medianPsf ?? 0) - (a.medianPsf ?? 0));
}

export interface ProjectRank {
  name: string;
  district: number;
  contracts: number;
  medianRent: number | null;
  medianPsf: number | null;
  /** Contracts in the window per hundred units. */
  per100: number | null;
}

/** The developments behind a set of contracts, busiest first. */
export function projectRanking(rows: Transaction[]): ProjectRank[] {
  const by = new Map<string, Transaction[]>();
  for (const r of rows) by.set(r.project, [...(by.get(r.project) ?? []), r]);
  return [...by.entries()]
    .map(([name, set]) => {
      const p = PROJECTS.find((x) => x.name === name);
      const enough = set.length >= MIN_FOR_MEDIAN;
      return {
        name,
        district: set[0].district,
        contracts: set.length,
        medianRent: enough ? median(set.map((r) => r.monthlyRent)) : null,
        medianPsf: enough ? Number(mean(set.map(psfOf)).toFixed(2)) : null,
        per100: p?.units ? Number(((set.length / p.units) * 100).toFixed(1)) : null,
      };
    })
    .sort((a, b) => b.contracts - a.contracts || a.name.localeCompare(b.name));
}

/* -------------------------------------------------------------- signals */

export interface MarketSignal {
  key: string;
  /** Which series colour the signal belongs to: rent, volume, psf. */
  slot: number;
  label: string;
  headline: string;
  detail: string;
  href: string;
}

/**
 * The three things worth saying about the held market, each worked out from
 * the same contracts as the charts beside it. A signal needs enough evidence
 * behind it or it is left out, so the list can be shorter than three.
 */
export function marketSignals(period: Period = '12'): MarketSignal[] {
  const out: MarketSignal[] = [];
  const districts = districtRanking(period);

  const movers = districts.filter((d) => d.movementPct !== null && d.contracts >= MIN_FOR_MEDIAN * 3);
  const riser = [...movers].sort((a, b) => (b.movementPct ?? 0) - (a.movementPct ?? 0))[0];
  if (riser && (riser.movementPct ?? 0) > 0) {
    out.push({
      key: 'riser',
      slot: 0,
      label: 'Fastest-rising district',
      headline: riser.label,
      detail: `Median rent up ${riser.movementPct?.toFixed(1)}% across the period, on ${riser.contracts} contracts.`,
      href: `/phase1/market/transactions?district=${riser.district}`,
    });
  }

  const projects = projectRanking(selectTransactions({ ...EMPTY_FILTERS, months: period }))
    .filter((p) => p.per100 !== null);
  const busiest = [...projects].sort((a, b) => (b.per100 ?? 0) - (a.per100 ?? 0))[0];
  if (busiest) {
    out.push({
      key: 'busiest',
      slot: 1,
      label: 'Most active development',
      headline: busiest.name,
      detail: `${busiest.per100} contracts per 100 units — ${busiest.contracts} leases in ${period} months.`,
      href: `/phase1/market/compare?add=${encodeURIComponent(busiest.name)}`,
    });
  }

  const top = districts[0];
  const bottom = districts[districts.length - 1];
  if (top?.medianPsf && bottom?.medianPsf && top !== bottom) {
    out.push({
      key: 'spread',
      slot: 2,
      label: 'Widest price gap',
      headline: `$${top.medianPsf.toFixed(2)} vs $${bottom.medianPsf.toFixed(2)} psf`,
      detail: `${top.label} against ${bottom.label} — ${Math.round((top.medianPsf / bottom.medianPsf - 1) * 100)}% dearer for the same space.`,
      href: '/phase1/market/transactions',
    });
  }
  return out;
}
