/**
 * Where one rental sits against the contracts it is competing with.
 *
 * An agent sending a shortlist is asked the same question about every property
 * on it — "is that a fair rent" — and the honest answer is a comparison, not an
 * assertion. This picks the comparison set, and every figure the report prints
 * about the market (the median, the quartiles, the chart, the contracts table,
 * the trend) is computed from that one set, so the numbers on different pages
 * cannot quietly describe different samples.
 *
 * The set is the nearest one with enough contracts in it, widening a step at a
 * time: the same development, the same street, the same postal district, the
 * districts around it, and finally the whole island. Every step keeps the same
 * bedroom count, the same floor-area band and the same kind of home, because a
 * three-bedroom HDB flat is not made comparable with a condominium by being
 * nearby. When the local steps are too thin the set says so, in words the
 * report prints.
 *
 * The outlook is a straight-line fit through the twelve monthly medians,
 * extended three months. It is labelled indicative wherever it appears: a
 * regression over a year of a thin market is a direction, not a valuation.
 */

import type { DemoListing } from './data';
import { MARKET_MONTHS, TRANSACTIONS, monthLabel, type Transaction } from './market';
import { dealOf } from './pricing';

export type Basis = 'development' | 'street' | 'district' | 'nearby' | 'island';

export const BASIS_ORDER: Basis[] = ['development', 'street', 'district', 'nearby', 'island'];

export const BASIS_NAME: Record<Basis, string> = {
  development: 'Same development',
  street: 'Same street',
  district: 'Same district',
  nearby: 'Nearby districts',
  island: 'Singapore-wide',
};

/** Fewer than this and a median says more about one lease than about the market. */
export const MIN_SAMPLE = 10;
/** Below this even the island-wide fallback is not worth printing. */
export const MIN_FALLBACK = 3;
/** Floor-area band either side of the unit. */
export const SIZE_BAND = 0.2;

/**
 * Postal districts that share a boundary. Used for the fourth step; published
 * district maps, read by hand, kept symmetric (a test checks that).
 */
export const NEIGHBOURS: Record<number, number[]> = {
  1: [2, 6, 7], 2: [1, 3, 4, 6], 3: [2, 4, 5, 9, 10], 4: [2, 3, 5], 5: [3, 4, 10, 21, 22],
  6: [1, 2, 7, 9], 7: [1, 6, 8, 9, 12], 8: [7, 9, 11, 12], 9: [3, 6, 7, 8, 10, 11],
  10: [3, 5, 9, 11, 21], 11: [8, 9, 10, 12, 20, 21], 12: [7, 8, 11, 13, 20], 13: [12, 14, 19, 20],
  14: [13, 15, 16, 19], 15: [14, 16], 16: [14, 15, 17, 18], 17: [16, 18], 18: [16, 17, 19],
  19: [13, 14, 18, 20, 28], 20: [11, 12, 13, 19, 21, 26, 28], 21: [5, 10, 11, 20, 23, 26],
  22: [5, 23, 24], 23: [21, 22, 24, 25, 26], 24: [22, 23, 25], 25: [23, 24, 26, 27],
  26: [20, 21, 23, 25, 27, 28], 27: [25, 26, 28], 28: [19, 20, 26, 27],
};

/** The kinds of home the held contracts describe. */
export const PRIVATE_NON_LANDED: DemoListing['propertyType'][] = ['Condominium', 'Apartment', 'Executive Condominium'];

export interface Comparable extends Transaction {
  psf: number;
  /** 0 closest in floor area; used with recency to order the contracts table. */
  closeness: number;
}

export interface MarketPosition {
  status: 'ok';
  basis: Basis;
  /** "Same district · 3 bed · 850–1,250 sqft" */
  basisLabel: string;
  /** "District 13, Macpherson and Potong Pasir" style scope, without the filters. */
  scope: string;
  /** False when the set had to leave the district. */
  local: boolean;
  /** Printed beside a fallback: why the comparison is not local. */
  fallbackNote: string | null;
  /** The size band the filter used, exactly as printed. Null when sizes were not restricted. */
  band: { min: number; max: number } | null;
  /** How many contracts each narrower step found, for the method note. */
  tried: { basis: Basis; count: number }[];
  /** The contracts, most relevant first, then newest. `sample === rows.length` always. */
  rows: Comparable[];
  sample: number;
  period: { from: string; to: string };

  medianRent: number;
  lowRent: number;
  highRent: number;
  minPsf: number;
  q1Psf: number;
  medianPsf: number;
  q3Psf: number;
  maxPsf: number;

  unitRent: number;
  unitPsf: number;
  /** Unit rate against the median rate, per square foot, to one decimal. */
  deltaPct: number;
  verdict: 'below' | 'in line' | 'above';

  /** Median rent each month of the window; 0 where nothing was lodged. */
  trend: number[];
  trendCounts: number[];
  trendLabels: string[];
  /** Latest four monthly medians against the earliest four, as a percentage. */
  changePct: number | null;
  /** Indicative only. Rounded to fifty dollars. */
  outlook: { label: string; value: number }[];
  confidence: 'good' | 'fair' | 'thin';
}

export interface MarketUnavailable {
  status: 'unavailable';
  reason: 'sale' | 'category' | 'no_rent' | 'no_size' | 'no_contracts';
  /** Client-facing, one sentence. */
  message: string;
}

export type MarketResult = MarketPosition | MarketUnavailable;

/* ---------------------------------------------------------------- maths */

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Linear-interpolation quantile, the definition spreadsheets use. */
export function quantile(values: number[], q: number): number {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 0) return 0;
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** Least-squares slope and intercept over the months that have a median. */
function fit(values: number[]): { slope: number; intercept: number } {
  const points = values.map((v, i) => [i, v] as const).filter(([, v]) => v > 0);
  if (points.length < 3) return { slope: 0, intercept: mean(values.filter(Boolean)) };
  const n = points.length;
  const sx = points.reduce((a, [x]) => a + x, 0);
  const sy = points.reduce((a, [, y]) => a + y, 0);
  const sxy = points.reduce((a, [x, y]) => a + x * y, 0);
  const sxx = points.reduce((a, [x]) => a + x * x, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return { slope: 0, intercept: sy / n };
  const slope = (n * sxy - sx * sy) / denom;
  return { slope, intercept: (sy - slope * sx) / n };
}

const nextMonths = (count: number): string[] => {
  const last = MARKET_MONTHS[MARKET_MONTHS.length - 1];
  const [year, month] = last.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const total = year * 12 + (month - 1) + i + 1;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
  });
};

const norm = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
const dd = (d: number) => String(d).padStart(2, '0');
const sqft = (n: number) => n.toLocaleString('en-SG');

/* ------------------------------------------------------------ selection */

export function marketPosition(listing: DemoListing, contracts: Transaction[] = TRANSACTIONS): MarketResult {
  if (dealOf(listing) === 'sale') {
    return { status: 'unavailable', reason: 'sale', message: 'This property is for sale. Rental contract comparisons do not apply, and sale transaction evidence is not included in this report.' };
  }
  if (!PRIVATE_NON_LANDED.includes(listing.propertyType)) {
    return {
      status: 'unavailable',
      reason: 'category',
      message: listing.propertyType === 'HDB'
        ? 'Comparable HDB rental contracts are not held on the platform, and private condominium contracts are not a fair comparison for an HDB flat.'
        : 'Comparable landed-home rental contracts are not held on the platform, and condominium contracts are not a fair comparison for a landed home.',
    };
  }
  if (!(listing.monthlyRent > 0)) {
    return { status: 'unavailable', reason: 'no_rent', message: 'No asking rent is recorded, so the property cannot be compared with the market.' };
  }
  if (!(listing.sizeSqft > 0)) {
    return { status: 'unavailable', reason: 'no_size', message: 'No floor area is recorded, so a rent per square foot cannot be compared.' };
  }

  const beds = listing.bedrooms;
  const size = listing.sizeSqft;
  /* The band is rounded first and then used as the filter, so the printed
     "850–1,250 sqft" is exactly the rule the contracts passed. */
  const band = { min: Math.round((size * (1 - SIZE_BAND)) / 50) * 50, max: Math.round((size * (1 + SIZE_BAND)) / 50) * 50 };
  const window = new Set(MARKET_MONTHS);
  const eligible = contracts.filter((t) => window.has(t.month) && t.bedrooms === beds && t.sizeSqft > 0 && t.monthlyRent > 0);
  const inBand = (t: Transaction) => t.sizeSqft >= band.min && t.sizeSqft <= band.max;

  const project = norm(listing.project);
  const address = norm(listing.address);
  const nearby = new Set([listing.district, ...(NEIGHBOURS[listing.district] ?? [])]);

  const scopes: Record<Basis, { test: (t: Transaction) => boolean; scope: string }> = {
    development: { test: (t) => norm(t.project) === project, scope: listing.project },
    street: { test: (t) => address.includes(norm(t.street)), scope: 'Same street' },
    district: { test: (t) => t.district === listing.district, scope: `District ${dd(listing.district)}` },
    nearby: {
      test: (t) => nearby.has(t.district),
      scope: `Districts ${[...nearby].sort((a, b) => a - b).map(dd).join(', ')}`,
    },
    island: { test: () => true, scope: 'Singapore' },
  };

  const tried: { basis: Basis; count: number }[] = [];
  let chosen: { basis: Basis; rows: Transaction[]; banded: boolean } | null = null;
  for (const basis of BASIS_ORDER) {
    const rows = eligible.filter((t) => scopes[basis].test(t) && inBand(t));
    tried.push({ basis, count: rows.length });
    if (rows.length >= MIN_SAMPLE) { chosen = { basis, rows, banded: true }; break; }
  }
  /* Last resort: the whole island at any size. Said plainly in the label. */
  if (!chosen && eligible.length >= MIN_SAMPLE) chosen = { basis: 'island', rows: eligible, banded: false };
  if (!chosen) {
    const best = [...tried].reverse().find((t) => t.count >= MIN_FALLBACK);
    if (best) chosen = { basis: best.basis, rows: eligible.filter((t) => scopes[best.basis].test(t) && inBand(t)), banded: true };
  }
  if (!chosen || chosen.rows.length === 0) {
    return { status: 'unavailable', reason: 'no_contracts', message: `Too few ${beds}-bedroom contracts of a similar size have been lodged to compare this property with the market.` };
  }

  const { basis, banded } = chosen;
  const unitPsfRaw = listing.monthlyRent / size;
  const rows: Comparable[] = chosen.rows
    .map((t) => ({ ...t, psf: t.monthlyRent / t.sizeSqft, closeness: Math.abs(t.sizeSqft - size) / size }))
    .sort((a, b) => {
      const tier = (c: Comparable) => (c.closeness <= 0.05 ? 0 : c.closeness <= 0.1 ? 1 : c.closeness <= SIZE_BAND ? 2 : 3);
      return tier(a) - tier(b) || b.month.localeCompare(a.month) || a.closeness - b.closeness;
    });

  const rents = rows.map((r) => r.monthlyRent);
  const psfs = rows.map((r) => r.psf);
  const medianPsfRaw = quantile(psfs, 0.5);
  const deltaPct = round1(((unitPsfRaw - medianPsfRaw) / medianPsfRaw) * 100);

  const trendCounts = MARKET_MONTHS.map((m) => rows.filter((r) => r.month === m).length);
  const trend = MARKET_MONTHS.map((m) => {
    const monthRents = rows.filter((r) => r.month === m).map((r) => r.monthlyRent);
    return monthRents.length ? Math.round(quantile(monthRents, 0.5)) : 0;
  });
  const real = trend.filter(Boolean);
  const span = Math.max(1, Math.round(real.length / 3));
  const changePct = real.length >= 6
    ? round1(((mean(real.slice(-span)) - mean(real.slice(0, span))) / mean(real.slice(0, span))) * 100)
    : null;
  const { slope, intercept } = fit(trend);
  const outlook = real.length >= 6
    ? nextMonths(3).map((m, i) => ({
      label: monthLabel(m),
      value: Math.max(0, Math.round((intercept + slope * (MARKET_MONTHS.length + i)) / 50) * 50),
    }))
    : [];

  const local = basis === 'development' || basis === 'street' || basis === 'district';
  const narrower = tried.filter((t) => BASIS_ORDER.indexOf(t.basis) < BASIS_ORDER.indexOf(basis) && t.basis !== 'street');
  const fallbackNote = local && banded
    ? null
    : `Local sample insufficient: ${narrower.map((t) => `${t.count} in the ${t.basis === 'development' ? 'same development' : t.basis === 'district' ? `same district` : 'nearby districts'}`).join(', ')}${banded ? '' : `, and ${tried[tried.length - 1].count} island-wide within the size band`}.`;

  return {
    status: 'ok',
    basis,
    basisLabel: `${BASIS_NAME[basis]} · ${beds} bed · ${banded ? `${sqft(band.min)}–${sqft(band.max)} sqft` : 'all sizes'}`,
    scope: scopes[basis].scope,
    local: local && banded,
    fallbackNote,
    band: banded ? band : null,
    tried,
    rows,
    sample: rows.length,
    period: { from: monthLabel(MARKET_MONTHS[0]), to: monthLabel(MARKET_MONTHS[MARKET_MONTHS.length - 1]) },

    medianRent: Math.round(quantile(rents, 0.5)),
    lowRent: Math.min(...rents),
    highRent: Math.max(...rents),
    minPsf: round2(Math.min(...psfs)),
    q1Psf: round2(quantile(psfs, 0.25)),
    medianPsf: round2(medianPsfRaw),
    q3Psf: round2(quantile(psfs, 0.75)),
    maxPsf: round2(Math.max(...psfs)),

    unitRent: listing.monthlyRent,
    unitPsf: round2(unitPsfRaw),
    deltaPct,
    verdict: deltaPct <= -4 ? 'below' : deltaPct >= 4 ? 'above' : 'in line',

    trend,
    trendCounts,
    trendLabels: MARKET_MONTHS.map(monthLabel),
    changePct,
    outlook,
    confidence: rows.length >= 60 ? 'good' : rows.length >= 20 ? 'fair' : 'thin',
  };
}

export const VERDICT_LABEL: Record<MarketPosition['verdict'], string> = {
  below: 'Below comparable-market median',
  'in line': 'In line with comparable-market median',
  above: 'Above comparable-market median',
};

export const CONFIDENCE_NOTE: Record<MarketPosition['confidence'], string> = {
  good: 'A full year of comparable contracts supports this comparison.',
  fair: 'A moderate sample. Treat the monthly figures as approximate.',
  thin: 'Few comparable contracts. Use this as context for discussion, not as a valuation.',
};
