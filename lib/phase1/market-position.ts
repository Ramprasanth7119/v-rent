/**
 * Where one unit sits against the market it is competing in.
 *
 * An agent sending a shortlist is asked the same question about every property
 * on it — "is that a fair rent" — and the honest answer is a comparison, not an
 * assertion. This works one out from the lodged contracts in `market.ts`,
 * taking the closest comparison that has enough rows in it: same project, same
 * bedroom count and a size band either side, widening to the district and then
 * to the island only when there is too little to say anything.
 *
 * The outlook is a straight-line fit over the last twelve monthly medians,
 * extended three months. That is a modest claim and it is stated as one: a
 * regression over a year of a thin market is a direction, not a forecast, and
 * the confidence note says so rather than implying a precision nobody has.
 */

import type { DemoListing } from './data';
import { MARKET_MONTHS, TRANSACTIONS, median, monthLabel, type Transaction } from './market';

export type Basis = 'project' | 'district' | 'island';

export interface MarketPosition {
  /** How close the comparison is; shown so nobody over-reads a thin sample. */
  basis: Basis;
  basisLabel: string;
  /** How many lodged contracts the figures come from. */
  sample: number;
  medianRent: number;
  lowRent: number;
  highRent: number;
  medianPsf: number;
  /** This unit's rent per square foot. */
  unitPsf: number;
  /**
   * How far this unit sits from the market, measured per square foot.
   *
   * Not on the monthly rent: a 936 sqft two-bedroom compared against a median
   * that includes 657 sqft two-bedrooms comes out forty per cent "above the
   * market" when it is nothing of the sort. Per square foot is size-neutral,
   * and it is the number agents argue in.
   */
  deltaPct: number;
  /** Plain-words verdict on that difference. */
  verdict: 'below' | 'in line' | 'above';
  /** Median rent for each of the last twelve months; zero where nothing let. */
  trend: number[];
  trendLabels: string[];
  /** Percentage change across the period, first third against last third. */
  changePct: number | null;
  /** Projected median for the next three months, and the months they are. */
  outlook: { label: string; value: number }[];
  /** How much weight the projection deserves. */
  confidence: 'good' | 'fair' | 'thin';
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Least-squares slope and intercept over (index, value) pairs. */
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

export function marketPosition(listing: DemoListing): MarketPosition | null {
  const beds = listing.bedrooms;

  /* Closest comparison first, widening only when the sample is too thin to
     take a median from. A size band as well as a bedroom count, because a
     two-bedroom can be 650 square feet or 950 and the rent follows the floor
     area at least as closely as it follows the room count. */
  const size = listing.sizeSqft;
  const inBand = (t: Transaction) => size > 0 && Math.abs(t.sizeSqft - size) / size <= 0.18;
  const bandLabel = size > 0 ? `${Math.round((size * 0.82) / 50) * 50}–${Math.round((size * 1.18) / 50) * 50} sqft` : '';

  const candidates: { basis: Basis; label: string; rows: Transaction[] }[] = [
    {
      basis: 'project',
      label: `${listing.project} · ${beds} bed · ${bandLabel}`,
      rows: TRANSACTIONS.filter((t) => t.project === listing.project && t.bedrooms === beds && inBand(t)),
    },
    {
      basis: 'project',
      label: `${listing.project} · ${beds} bed`,
      rows: TRANSACTIONS.filter((t) => t.project === listing.project && t.bedrooms === beds),
    },
    {
      basis: 'district',
      label: `District ${String(listing.district).padStart(2, '0')} · ${beds} bed · ${bandLabel}`,
      rows: TRANSACTIONS.filter((t) => t.district === listing.district && t.bedrooms === beds && inBand(t)),
    },
    {
      basis: 'district',
      label: `District ${String(listing.district).padStart(2, '0')} · ${beds} bed`,
      rows: TRANSACTIONS.filter((t) => t.district === listing.district && t.bedrooms === beds),
    },
    {
      basis: 'island',
      label: `Singapore · ${beds} bed · ${bandLabel}`,
      rows: TRANSACTIONS.filter((t) => t.bedrooms === beds && inBand(t)),
    },
    {
      basis: 'island',
      label: `Singapore · ${beds} bed`,
      rows: TRANSACTIONS.filter((t) => t.bedrooms === beds),
    },
  ];

  const chosen = candidates.find((c) => c.rows.length >= 12) ?? candidates[candidates.length - 1];
  if (chosen.rows.length === 0) return null;

  const rents = chosen.rows.map((t) => t.monthlyRent);
  const medianRent = median(rents);
  const psfs = chosen.rows.map((t) => t.monthlyRent / t.sizeSqft);

  const trend = MARKET_MONTHS.map((m) => median(chosen.rows.filter((t) => t.month === m).map((t) => t.monthlyRent)));
  const real = trend.filter(Boolean);
  const span = Math.max(1, Math.round(real.length / 3));
  const changePct = real.length >= 4
    ? Math.round(((mean(real.slice(-span)) - mean(real.slice(0, span))) / mean(real.slice(0, span))) * 1000) / 10
    : null;

  const { slope, intercept } = fit(trend);
  const outlook = nextMonths(3).map((m, i) => ({
    label: monthLabel(m),
    // Rounded to the nearest fifty, because a rent is negotiated in fifties and
    // a projection quoted to the dollar invites a precision it does not have.
    value: Math.max(0, Math.round((intercept + slope * (MARKET_MONTHS.length + i)) / 50) * 50),
  }));

  const medianPsf = Number(mean(psfs).toFixed(2));
  const unitPsf = listing.sizeSqft ? Number((listing.monthlyRent / listing.sizeSqft).toFixed(2)) : 0;
  const deltaPct = medianPsf && unitPsf
    ? Math.round(((unitPsf - medianPsf) / medianPsf) * 1000) / 10
    : 0;

  return {
    basis: chosen.basis,
    basisLabel: chosen.label,
    sample: chosen.rows.length,
    medianRent,
    lowRent: Math.min(...rents),
    highRent: Math.max(...rents),
    medianPsf,
    unitPsf,
    deltaPct,
    verdict: deltaPct <= -4 ? 'below' : deltaPct >= 4 ? 'above' : 'in line',
    trend,
    trendLabels: MARKET_MONTHS.map(monthLabel),
    changePct,
    outlook,
    confidence: chosen.rows.length >= 60 ? 'good' : chosen.rows.length >= 20 ? 'fair' : 'thin',
  };
}

export const CONFIDENCE_NOTE: Record<MarketPosition['confidence'], string> = {
  good: 'Drawn from a full year of lodged contracts; the direction is reliable, the exact figure is not a promise.',
  fair: 'A moderate sample. Treat the direction as indicative and the monthly figures as approximate.',
  thin: 'Few comparable contracts were lodged. This is context for a conversation, not a valuation.',
};

export const VERDICT_NOTE: Record<MarketPosition['verdict'], string> = {
  below: 'priced under the market for comparable units',
  'in line': 'priced in line with comparable units',
  above: 'priced above the market for comparable units',
};
