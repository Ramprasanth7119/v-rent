/**
 * What the report says about its numbers.
 *
 * The analytical sheets used to print a figure and leave the reader to work
 * out what it meant. Everything here turns figures the report already holds
 * into either a small derived set (a development's history, the listings a
 * property competes with) or a short sentence, so the wording is decided once,
 * tested, and never claims more than the data behind it.
 *
 * Every sentence follows three rules:
 *  - it restates a figure printed elsewhere in the report;
 *  - it describes and never recommends ("above the median", not "overpriced");
 *  - a missing or failed input produces no sentence, never a zero.
 *
 * Pure and client-safe. `competingSet` also runs on the server, where the live
 * listings are.
 */

import type { DemoListing } from './data';
import { DISTRICTS } from './districts';
import { MARKET_MONTHS, MARKET_SOURCE, PROJECTS, TRANSACTIONS, monthLabel, type Project, type Transaction } from './market';
import {
  BASIS_NAME, NEIGHBOURS, PRIVATE_NON_LANDED, SIZE_BAND, quantile, type MarketPosition, type MarketResult,
} from './market-position';
import { dealOf, type DealType } from './pricing';
import type { EvidenceState, Issue } from './report';

/* ================================================================ wording */

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const dd = (n: number) => String(n).padStart(2, '0');
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const money = (n: number) => `S$${Math.round(n).toLocaleString('en-SG')}`;
const psf2 = (n: number) => `S$${n.toFixed(2)}`;
const sqft = (n: number) => `${Math.round(n).toLocaleString('en-SG')} sqft`;
const pct = (n: number) => `${Math.abs(n).toFixed(1)}%`;
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`;
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const metresText = (m: number) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`);
const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' });
const dayText = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '' : DAY.format(new Date(t)).replace('Sept', 'Sep');
};
/** "4.8% above", "2.1% below", or "in line with". */
const against = (d: number) => (Math.abs(d) < 0.05 ? 'in line with' : `${pct(d)} ${d > 0 ? 'above' : 'below'}`);

export const TYPE_NOUN: Record<DemoListing['propertyType'], string> = {
  Condominium: 'condominium',
  HDB: 'HDB flat',
  Apartment: 'apartment',
  Landed: 'landed home',
  'Executive Condominium': 'executive condominium',
};
export const layoutText = (beds: number) => (beds === 0 ? 'Studio' : `${beds}-bedroom`);
export const areaName = (d: number) => DISTRICTS[d]?.name ?? `District ${dd(d)}`;

/* ============================================================ particulars */

/** "#21-05" is on level 21. Null for a landed home, a blank or anything unreadable. */
export function floorLevel(unitNo?: string): number | null {
  const m = /^\s*#?\s*(\d{1,3})\s*-\s*[0-9A-Za-z]+\s*$/.exec(unitNo ?? '');
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n > 0 && n < 100 ? n : null;
}

export const STATUS_TEXT: Record<DemoListing['status'], string> = {
  draft: 'Draft, not yet published',
  pending_review: 'In review',
  published: 'Live on V-RENT',
  paused: 'Paused',
  rejected: 'Not published',
  expired: 'Expired',
  suspended: 'Suspended',
};

export function listingStatusText(l: DemoListing): string {
  if (l.status === 'published' && l.publishedAt && dayText(l.publishedAt)) return `Live on V-RENT since ${dayText(l.publishedAt)}`;
  return STATUS_TEXT[l.status] ?? 'Not stated';
}

/* ============================================================ development */

/** The held development record, matched on name and district so a namesake elsewhere never answers. */
export function developmentOf(l: DemoListing): Project | null {
  return PROJECTS.find((p) => norm(p.name) === norm(l.project) && p.district === l.district) ?? null;
}

/** Fewer contracts than this in a year is not a history. */
export const MIN_HISTORY = 6;

export interface HistoryPoint { month: string; label: string; count: number; medianPsf: number | null }

export interface MarketHistory {
  status: 'ok';
  /** The development when it has enough contracts; otherwise its postal district. */
  scope: 'development' | 'district';
  scopeLabel: string;
  /** Every contract in scope and window, newest first. All unit sizes. */
  rows: (Transaction & { psf: number })[];
  points: HistoryPoint[];
  sample: number;
  /** Contracts with the property's bedroom count. */
  sameBeds: number;
  medianPsf: number;
  /** Median rate, latest six months against the earliest six. Null when either half is thin. */
  changePct: number | null;
  period: { from: string; to: string };
}

export interface HistoryUnavailable {
  status: 'unavailable';
  reason: 'sale' | 'category' | 'no_contracts';
  message: string;
}

export type HistoryResult = MarketHistory | HistoryUnavailable;

/**
 * What has leased in this building, or failing that this district, over the
 * contract window. Unit-level history does not exist in lodged contracts, which
 * identify a floor band at most, so this is the nearest honest history.
 */
export function marketHistory(l: DemoListing, contracts: Transaction[] = TRANSACTIONS, dev: Project | null = developmentOf(l)): HistoryResult {
  if (dealOf(l) === 'sale') return { status: 'unavailable', reason: 'sale', message: 'Sale transaction history is not held on the platform.' };
  if (!PRIVATE_NON_LANDED.includes(l.propertyType)) {
    return { status: 'unavailable', reason: 'category', message: `Rental contract history for ${l.propertyType === 'HDB' ? 'HDB flats' : 'landed homes'} is not held on the platform.` };
  }
  const window = new Set(MARKET_MONTHS);
  const held = contracts.filter((t) => window.has(t.month) && t.sizeSqft > 0 && t.monthlyRent > 0);
  const devRows = dev ? held.filter((t) => norm(t.project) === norm(dev.name)) : [];
  const districtRows = held.filter((t) => t.district === l.district);
  const scope = devRows.length >= MIN_HISTORY ? 'development' : districtRows.length >= MIN_HISTORY ? 'district' : null;
  if (!scope) {
    return { status: 'unavailable', reason: 'no_contracts', message: 'Too few lodged contracts are held for this development or district to show a history.' };
  }

  const rows = (scope === 'development' ? devRows : districtRows)
    .map((t) => ({ ...t, psf: t.monthlyRent / t.sizeSqft }))
    .sort((a, b) => b.month.localeCompare(a.month) || a.id.localeCompare(b.id));
  const points = MARKET_MONTHS.map((month) => {
    const inMonth = rows.filter((r) => r.month === month);
    return { month, label: monthLabel(month), count: inMonth.length, medianPsf: inMonth.length ? round2(quantile(inMonth.map((r) => r.psf), 0.5)) : null };
  });
  const half = (first: boolean) => rows.filter((r) => (MARKET_MONTHS.indexOf(r.month) < 6) === first).map((r) => r.psf);
  const early = half(true);
  const late = half(false);
  const changePct = early.length >= 3 && late.length >= 3
    ? round1(((quantile(late, 0.5) - quantile(early, 0.5)) / quantile(early, 0.5)) * 100)
    : null;

  return {
    status: 'ok',
    scope,
    scopeLabel: scope === 'development' ? dev!.name : `District ${dd(l.district)}`,
    rows,
    points,
    sample: rows.length,
    sameBeds: rows.filter((r) => r.bedrooms === l.bedrooms).length,
    medianPsf: round2(quantile(rows.map((r) => r.psf), 0.5)),
    changePct,
    period: { from: monthLabel(MARKET_MONTHS[0]), to: monthLabel(MARKET_MONTHS[MARKET_MONTHS.length - 1]) },
  };
}

export interface MixRow { bedrooms: number; count: number; medianSize: number; medianRent: number; medianPsf: number }

/** What leases in the development, by bedroom count. */
export function bedroomMix(h: MarketHistory): MixRow[] {
  return [...new Set(h.rows.map((r) => r.bedrooms))].sort((a, b) => a - b).map((bedrooms) => {
    const rows = h.rows.filter((r) => r.bedrooms === bedrooms);
    return {
      bedrooms,
      count: rows.length,
      medianSize: Math.round(quantile(rows.map((r) => r.sizeSqft), 0.5)),
      medianRent: Math.round(quantile(rows.map((r) => r.monthlyRent), 0.5)),
      medianPsf: round2(quantile(rows.map((r) => r.psf), 0.5)),
    };
  });
}

export function historyNotes(l: DemoListing, h: MarketHistory): string[] {
  const where = h.scope === 'development' ? 'in the development' : `in District ${dd(l.district)}`;
  const out: string[] = [];
  if (h.changePct !== null) {
    out.push(Math.abs(h.changePct) < 1.5
      ? `Median rent per sq ft ${where} was broadly flat between the first and second half of the period (${signed(h.changePct)}).`
      : `Median rent per sq ft ${where} ${h.changePct > 0 ? 'rose' : 'fell'} ${pct(h.changePct)} between the first and second half of the period.`);
  }
  const homes = `${layoutText(l.bedrooms).toLowerCase()} homes`;
  out.push(h.sameBeds === 0
    ? `None of the ${h.sample} contracts ${where} were for ${homes}.`
    : `${h.sameBeds} of the ${h.sample} contracts ${where} ${h.sameBeds === 1 ? 'was' : 'were'} for ${homes}.`);
  if (dealOf(l) === 'rent' && l.monthlyRent > 0 && l.sizeSqft > 0 && h.medianPsf > 0) {
    const d = round1(((l.monthlyRent / l.sizeSqft - h.medianPsf) / h.medianPsf) * 100);
    out.push(`This property's asking rate is ${against(d)} the ${h.scope} median of ${psf2(h.medianPsf)} psf.`);
  }
  return out;
}

export function developmentNotes(l: DemoListing, dev: Project, h: HistoryResult, today: Date): string[] {
  const out: string[] = [];
  if (l.tenure && l.tenure !== dev.tenure) {
    out.push(`The listing records ${l.tenure} tenure; the development record shows ${dev.tenure}. Confirm before relying on either.`);
  }
  if (l.builtYear && l.builtYear !== dev.built) {
    out.push(`The listing records completion in ${l.builtYear}; the development record shows ${dev.built}. Confirm before relying on either.`);
  }
  if (h.status === 'ok' && h.scope === 'development' && dealOf(l) === 'rent') {
    const same = h.rows.filter((r) => r.bedrooms === l.bedrooms);
    const layout = layoutText(l.bedrooms).toLowerCase();
    if (same.length >= 3 && l.sizeSqft > 0) {
      const median = Math.round(quantile(same.map((r) => r.sizeSqft), 0.5));
      const d = round1(((l.sizeSqft - median) / median) * 100);
      out.push(Math.abs(d) < 3
        ? `At ${sqft(l.sizeSqft)}, the unit is close to the median ${layout} contract here (${sqft(median)}).`
        : `At ${sqft(l.sizeSqft)}, the unit is ${pct(d)} ${d > 0 ? 'larger' : 'smaller'} than the median ${layout} contract here (${sqft(median)}).`);
    }
    const top = [...bedroomMix(h)].sort((a, b) => b.count - a.count || a.bedrooms - b.bedrooms)[0];
    out.push(`${h.sample} lease contracts were lodged here in twelve months; ${layoutText(top.bedrooms).toLowerCase()} homes were leased most often (${top.count}).`);
  }
  const age = today.getFullYear() - dev.built;
  out.push(`Completed in ${dev.built}${age > 0 ? `, about ${count(age, 'year')} ago` : ''}, with ${dev.units.toLocaleString('en-SG')} units.`);
  if (dev.tenure === 'Freehold') out.push('Freehold tenure.');
  return out.slice(0, 3);
}

/* =========================================================== unit history */

export interface UnitListing { date: string; asking: number; deal: DealType; status: DemoListing['status'] }

const unitKey = (u?: string) => (u ?? '').replace(/[\s#]/g, '').toUpperCase();

/** Earlier V-RENT listings of the same unit in this workspace: asking figures, not transactions. */
export function earlierListings(l: DemoListing, all: DemoListing[]): UnitListing[] {
  const unit = unitKey(l.unitNo);
  if (!unit || unit === '—' || !l.postalCode) return [];
  return all
    .filter((x) => x.id !== l.id && x.postalCode === l.postalCode && unitKey(x.unitNo) === unit)
    .map((x) => ({ date: x.publishedAt ?? x.createdAt, asking: dealOf(x) === 'sale' ? x.salePriceSgd ?? 0 : x.monthlyRent, deal: dealOf(x), status: x.status }))
    .filter((x) => x.asking > 0 && x.date)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/* ========================================================= price position */

export type RangePlace = 'below' | 'within' | 'above';

export const RANGE_LABEL: Record<RangePlace, string> = {
  below: 'Below observed comparable range',
  within: 'Within observed comparable range',
  above: 'Above observed comparable range',
};

export interface RangePosition {
  place: RangePlace;
  band: 'Lower quarter' | 'Middle half' | 'Upper quarter';
  /** Share of comparable contracts with a lower rate, whole per cent. */
  higherThanPct: number;
  medianSize: number;
  sizeDeltaPct: number;
}

export function rangePosition(m: MarketPosition, sizeSqft: number): RangePosition {
  const psfs = m.rows.map((r) => r.psf);
  const unit = m.unitRent / sizeSqft;
  const medianSize = Math.round(quantile(m.rows.map((r) => r.sizeSqft), 0.5));
  return {
    place: unit < Math.min(...psfs) ? 'below' : unit > Math.max(...psfs) ? 'above' : 'within',
    band: unit < quantile(psfs, 0.25) ? 'Lower quarter' : unit > quantile(psfs, 0.75) ? 'Upper quarter' : 'Middle half',
    higherThanPct: Math.round((psfs.filter((v) => v < unit).length / psfs.length) * 100),
    medianSize,
    sizeDeltaPct: round1(((sizeSqft - medianSize) / medianSize) * 100),
  };
}

export function positionNotes(m: MarketPosition, r: RangePosition): string[] {
  const out = [`The asking rate of ${psf2(m.unitPsf)} psf is ${against(m.deltaPct)} the comparable median of ${psf2(m.medianPsf)} psf.`];
  out.push(r.higherThanPct === 0
    ? `It is not higher than any of the ${m.sample} comparable contracts.`
    : r.higherThanPct === 100
      ? `It is higher than every one of the ${m.sample} comparable contracts.`
      : `It is higher than ${r.higherThanPct}% of the ${m.sample} comparable contracts.`);
  out.push(r.place === 'within'
    ? `It sits in the ${r.band.toLowerCase()} of the observed range; the middle half of contracts let at ${psf2(m.q1Psf)} to ${psf2(m.q3Psf)} psf.`
    : `It is ${r.place} the observed range of ${psf2(m.minPsf)} to ${psf2(m.maxPsf)} psf.`);
  out.push(`Comparable monthly rents ranged from ${money(m.lowRent)} to ${money(m.highRent)}, with a median of ${money(m.medianRent)}.`);
  return out;
}

export function sizeNote(l: DemoListing, r: RangePosition): string {
  return Math.abs(r.sizeDeltaPct) < 3
    ? `At ${sqft(l.sizeSqft)}, this property is close to the median size of the comparable contracts (${sqft(r.medianSize)}).`
    : `At ${sqft(l.sizeSqft)}, this property is ${pct(r.sizeDeltaPct)} ${r.sizeDeltaPct > 0 ? 'larger' : 'smaller'} than the median comparable contract (${sqft(r.medianSize)}).`;
}

/** How one comparable contract relates to the property, for the contracts table. */
export function matchOf(l: DemoListing, t: Transaction): string {
  if (norm(t.project) === norm(l.project)) return 'Same development';
  if (` ${norm(l.address)} `.includes(` ${norm(t.street)} `)) return 'Same street';
  if (t.district === l.district) return 'Same district';
  if ((NEIGHBOURS[l.district] ?? []).includes(t.district)) return 'Nearby district';
  return 'Other district';
}

export function trendNotes(m: MarketPosition): { direction: string; activity: string } {
  const direction = m.changePct === null
    ? 'Too few months had contracts to describe a direction.'
    : Math.abs(m.changePct) < 1.5
      ? `Median rents for comparable homes were broadly flat over the period (${signed(m.changePct)}, latest four months against the earliest four).`
      : `Median rents for comparable homes ${m.changePct > 0 ? 'rose' : 'fell'} ${pct(m.changePct)} over the period (latest four months against the earliest four).`;
  const early = m.trendCounts.slice(0, 6).reduce((a, b) => a + b, 0);
  const late = m.trendCounts.slice(6).reduce((a, b) => a + b, 0);
  const split = early > 0 && Math.abs(late - early) / early < 0.2
    ? 'Activity was similar in both halves of the year.'
    : late > early ? 'More were lodged in the second half of the year.' : 'Fewer were lodged in the second half of the year.';
  const activity = `${count(m.sample, 'comparable contract')} lodged over twelve months, between ${Math.min(...m.trendCounts)} and ${Math.max(...m.trendCounts)} a month. ${split}`;
  return { direction, activity };
}

/* ======================================================= competing listings */

/** A live listing reduced to its figures. Who advertises it never leaves the server. */
export interface ActiveListing {
  project: string;
  district: number;
  propertyType: DemoListing['propertyType'];
  bedrooms: number;
  sizeSqft: number;
  deal: DealType;
  price: number;
  publishedAt?: string;
}

export type ActiveMatch = 'Same district' | 'Nearby district' | 'Other district';

export interface CompetingItem extends ActiveListing { psf: number; daysListed: number | null; match: ActiveMatch }

export interface CompetingSet {
  status: 'ok';
  deal: DealType;
  basis: 'nearby' | 'island';
  basisLabel: string;
  band: { min: number; max: number };
  items: CompetingItem[];
  sample: number;
  /** Rent per sq ft a month, or price per sq ft. Null without a floor area or price. */
  unitPsf: number | null;
  /** Only with at least MIN_ACTIVE listings. */
  medianPsf: number | null;
  deltaPct: number | null;
  /** Listings asking less per sq ft than the property. */
  lowerPsfCount: number;
  retrievedAt: string;
}

export type CompetingResult = CompetingSet | { status: 'failed'; reason: string };

/** Below this a median of asking prices describes a handful of landlords, not a market. */
export const MIN_ACTIVE = 5;

const kindOf = (t: DemoListing['propertyType']) => (PRIVATE_NON_LANDED.includes(t) ? 'private' : t);
const priceOf = (l: DemoListing) => (dealOf(l) === 'sale' ? l.salePriceSgd ?? 0 : l.monthlyRent);

export function toActive(l: DemoListing): ActiveListing {
  return {
    project: l.project, district: l.district, propertyType: l.propertyType, bedrooms: l.bedrooms,
    sizeSqft: l.sizeSqft, deal: dealOf(l), price: priceOf(l), publishedAt: l.publishedAt,
  };
}

const bandFor = (size: number) => ({ min: Math.round((size * (1 - SIZE_BAND)) / 50) * 50, max: Math.round((size * (1 + SIZE_BAND)) / 50) * 50 });

/**
 * Live listings a client would weigh against this one: the same deal, the same
 * kind of home, the same bedroom count and the same size band the comparable
 * contracts use. Nearby districts first, the island when those are too few. A
 * median is only given when there are enough listings for it to mean anything.
 */
export function competingSet(target: DemoListing, pool: ActiveListing[], now: Date): CompetingSet {
  const deal = dealOf(target);
  const band = bandFor(target.sizeSqft);
  const price = priceOf(target);
  const eligible = pool.filter((p) => p.deal === deal && kindOf(p.propertyType) === kindOf(target.propertyType)
    && p.bedrooms === target.bedrooms && p.sizeSqft >= band.min && p.sizeSqft <= band.max && p.price > 0 && p.sizeSqft > 0);
  const near = new Set([target.district, ...(NEIGHBOURS[target.district] ?? [])]);
  const nearby = eligible.filter((p) => near.has(p.district));
  const basis = nearby.length >= MIN_ACTIVE ? 'nearby' : 'island';
  const rank: Record<ActiveMatch, number> = { 'Same district': 0, 'Nearby district': 1, 'Other district': 2 };
  const items: CompetingItem[] = (basis === 'nearby' ? nearby : eligible)
    .map((p) => ({
      ...p,
      psf: p.price / p.sizeSqft,
      daysListed: p.publishedAt && !Number.isNaN(Date.parse(p.publishedAt)) ? Math.max(0, Math.floor((now.getTime() - Date.parse(p.publishedAt)) / 86_400_000)) : null,
      match: (p.district === target.district ? 'Same district' : near.has(p.district) ? 'Nearby district' : 'Other district') as ActiveMatch,
    }))
    .sort((a, b) => rank[a.match] - rank[b.match] || Math.abs(a.sizeSqft - target.sizeSqft) - Math.abs(b.sizeSqft - target.sizeSqft));

  const unitRaw = price > 0 && target.sizeSqft > 0 ? price / target.sizeSqft : null;
  const tidy = (v: number) => (deal === 'rent' ? round2(v) : Math.round(v));
  const psfs = items.map((x) => x.psf);
  const medianRaw = items.length >= MIN_ACTIVE ? quantile(psfs, 0.5) : null;
  return {
    status: 'ok',
    deal,
    basis,
    basisLabel: `${basis === 'nearby' ? 'Same and nearby districts' : 'Singapore-wide'} · ${target.bedrooms} bed · ${band.min.toLocaleString('en-SG')}–${band.max.toLocaleString('en-SG')} sqft`,
    band,
    items,
    sample: items.length,
    unitPsf: unitRaw === null ? null : tidy(unitRaw),
    medianPsf: medianRaw === null ? null : tidy(medianRaw),
    deltaPct: medianRaw !== null && unitRaw !== null ? round1(((unitRaw - medianRaw) / medianRaw) * 100) : null,
    lowerPsfCount: unitRaw === null ? 0 : psfs.filter((v) => v < unitRaw).length,
    retrievedAt: now.toISOString(),
  };
}

export function competingStatement(c: CompetingSet): string {
  if (c.medianPsf !== null && c.deltaPct !== null) {
    return `Priced ${against(c.deltaPct)} the median of ${c.sample} comparable active listings, per sq ft.`;
  }
  return `${count(c.sample, 'comparable active listing')} found; at least ${MIN_ACTIVE} are needed for a median comparison.`;
}

export function competingNotes(c: CompetingSet): string[] {
  const out: string[] = [];
  const what = c.deal === 'rent' ? 'rent' : 'price';
  if (c.unitPsf !== null && c.sample === 1) {
    out.push(`The one comparable listing asks a ${c.lowerPsfCount === 1 ? 'lower' : 'higher'} ${what} per sq ft than this property.`);
  } else if (c.unitPsf !== null) {
    out.push(c.lowerPsfCount === 0
      ? `None of the ${count(c.sample, 'listing')} asks a lower ${what} per sq ft than this property.`
      : `${c.lowerPsfCount} of the ${count(c.sample, 'listing')} ${c.lowerPsfCount === 1 ? 'asks' : 'ask'} a lower ${what} per sq ft than this property.`);
  }
  const days = c.items.map((x) => x.daysListed).filter((d): d is number => d !== null);
  if (days.length >= 3) out.push(`Comparable listings have been live for a median of ${count(Math.round(quantile(days, 0.5)), 'day')}.`);
  if (c.basis === 'island') out.push('Too few comparable listings were live in the same and nearby districts, so listings across Singapore are shown.');
  return out;
}

/* ============================================================= validation */

const fault = (code: string, message: string): Issue => ({
  severity: 'error', area: 'market', code, message,
  fix: 'This is a calculation fault, not a listing problem. Report it; the report cannot be printed until it is fixed.',
});

/** The history checked against its own contracts, like the comparison is. */
export function validateHistory(l: DemoListing, h: HistoryResult, dev: Project | null = developmentOf(l)): Issue[] {
  if (h.status !== 'ok') return [];
  const out: Issue[] = [];
  const window = new Set(MARKET_MONTHS);
  if (h.sample !== h.rows.length) out.push(fault('history_sample', 'The history claims a different number of contracts than it holds.'));
  if (h.points.reduce((a, p) => a + p.count, 0) !== h.sample) out.push(fault('history_counts', 'The monthly history does not account for every contract.'));
  if (h.rows.some((r) => !window.has(r.month))) out.push(fault('history_window', 'A history contract falls outside the twelve-month window.'));
  if (h.scope === 'development') {
    if (!dev || h.rows.some((r) => norm(r.project) !== norm(dev.name))) out.push(fault('history_scope', 'A development history contract is from another development.'));
  }
  if (h.scope === 'district' && h.rows.some((r) => r.district !== l.district)) out.push(fault('history_scope', 'A district history contract is from another district.'));
  if (Math.abs(h.medianPsf - quantile(h.rows.map((r) => r.monthlyRent / r.sizeSqft), 0.5)) > 0.006) out.push(fault('history_median', 'The history median does not match its contracts.'));
  if (h.sameBeds !== h.rows.filter((r) => r.bedrooms === l.bedrooms).length) out.push(fault('history_beds', 'The same-bedroom count does not match the contracts.'));
  return out;
}

/** Competing listings are a secondary source: a set that fails these is left out, never printed. */
export function validateCompeting(l: DemoListing, c: CompetingResult): Issue[] {
  if (c.status !== 'ok') return [];
  const out: Issue[] = [];
  const band = bandFor(l.sizeSqft);
  const deal = dealOf(l);
  if (c.sample !== c.items.length) out.push(fault('active_sample', 'The listing count does not match the listings.'));
  if (c.deal !== deal || c.items.some((x) => x.deal !== deal)) out.push(fault('active_deal', 'A competing listing has a different listing type.'));
  if (c.items.some((x) => x.bedrooms !== l.bedrooms || kindOf(x.propertyType) !== kindOf(l.propertyType))) out.push(fault('active_kind', 'A competing listing is a different kind of home.'));
  if (c.items.some((x) => x.sizeSqft < band.min || x.sizeSqft > band.max)) out.push(fault('active_band', 'A competing listing is outside the size band.'));
  if ((c.medianPsf === null) !== (c.sample < MIN_ACTIVE)) out.push(fault('active_threshold', 'A median was given for too few listings, or withheld from enough.'));
  if (c.medianPsf !== null) {
    const median = quantile(c.items.map((x) => x.price / x.sizeSqft), 0.5);
    const tol = deal === 'rent' ? 0.006 : 1;
    if (Math.abs(c.medianPsf - median) > tol) out.push(fault('active_median', 'The competing median does not match its listings.'));
    const price = priceOf(l);
    if (c.deltaPct !== null && price > 0 && Math.abs(c.deltaPct - ((price / l.sizeSqft - median) / median) * 100) > 0.06) {
      out.push(fault('active_delta', 'The competing difference does not follow from the two rates.'));
    }
  }
  return out;
}

/* =============================================================== insights */

export interface Nearby { name: string; metres: number }

export interface InsightInput {
  listing: DemoListing;
  market: MarketResult;
  history: HistoryResult;
  competing: CompetingSet | null;
  mrt: { state: EvidenceState; nearest: Nearby | null };
  primaries: { state: EvidenceState; within1km: number };
  hawker: { state: EvidenceState; nearest: Nearby | null };
  /** Datasets that did not answer, by reader-facing name. */
  unavailable: string[];
  development: Project | null;
  today: Date;
  /** Replaces the closing sentence about where the market figures come from. Undefined keeps the dataset's own wording. */
  marketNote?: string | null;
  /** How competing listings are described. Listings live on V-RENT unless said otherwise. */
  activeSource?: string;
}

const known = (s: EvidenceState) => s === 'verified' || s === 'partial';
const nearestStation = (i: InsightInput) => (known(i.mrt.state) ? i.mrt.nearest : null);

/** One line for the cover: what and where, and the station only when it is close and measured. */
export function positioning(i: InsightInput): string {
  const l = i.listing;
  const station = nearestStation(i);
  const size = l.sizeSqft > 0 ? ` of ${sqft(l.sizeSqft)}` : '';
  const near = station && station.metres <= 1000 ? `, about ${metresText(station.metres)} from ${station.name}` : '';
  return `${layoutText(l.bedrooms)} ${TYPE_NOUN[l.propertyType]}${size} in ${areaName(l.district)}${near}.`;
}

/** Three or four facts for the at-a-glance sheet. */
export function keyTakeaways(i: InsightInput): string[] {
  const l = i.listing;
  const out: string[] = [];
  const m = i.market.status === 'ok' ? i.market : null;
  const station = nearestStation(i);

  if (m) {
    const r = rangePosition(m, l.sizeSqft);
    const where = r.place === 'within' ? 'within the observed comparable range' : `${r.place} the observed comparable range`;
    out.push(`The asking rent is ${where}, ${against(m.deltaPct)} the median rate per sq ft.`);
    out.push(Math.abs(r.sizeDeltaPct) < 3
      ? `The floor area is close to the median of the selected comparables (${sqft(r.medianSize)}).`
      : `The floor area is ${pct(r.sizeDeltaPct)} ${r.sizeDeltaPct > 0 ? 'larger' : 'smaller'} than the median of the selected comparables (${sqft(r.medianSize)}).`);
  } else if (i.market.status === 'unavailable') {
    out.push(i.market.reason === 'sale'
      ? 'Sale transaction evidence is not held, so the asking price is not compared with transactions.'
      : i.market.message);
  }
  if (!m && i.competing && i.competing.deltaPct !== null) {
    out.push(`The asking ${i.competing.deal === 'rent' ? 'rent' : 'price'} per sq ft is ${against(i.competing.deltaPct)} the median of ${i.competing.sample} comparable ${i.activeSource ?? 'listings live on V-RENT'}.`);
  }
  if (station) out.push(`The nearest MRT or LRT station, ${station.name}, is approximately ${metresText(station.metres)} away.`);
  else if (i.mrt.state === 'verified') out.push('No MRT or LRT station lies within 2 km.');
  if (m) {
    out.push(m.local
      ? `${m.sample} comparable contracts were available for the selected criteria (${BASIS_NAME[m.basis].toLowerCase()}).`
      : `The local sample was insufficient, so ${m.sample} contracts from ${m.basis === 'island' ? 'across Singapore' : 'nearby districts'} were used.`);
  } else if (i.primaries.state === 'verified') {
    out.push(i.primaries.within1km === 0 ? 'No primary school lies within 1 km.' : `${count(i.primaries.within1km, 'primary school')} ${i.primaries.within1km === 1 ? 'lies' : 'lie'} within 1 km.`);
  }
  return out.slice(0, 4);
}

export interface DecisionSummary {
  standsOut: string[];
  consider: string[];
  position: { headline: string; detail: string; tone: 'below' | 'in line' | 'above' | 'none' };
  bottomLine: string;
}

export function decisionSummary(i: InsightInput): DecisionSummary {
  const l = i.listing;
  const deal = dealOf(l);
  const m = i.market.status === 'ok' ? i.market : null;
  const r = m ? rangePosition(m, l.sizeSqft) : null;
  const station = nearestStation(i);
  const c = i.competing;
  const dev = i.development;
  const layout = `${layoutText(l.bedrooms)} ${TYPE_NOUN[l.propertyType]}`;
  const what = deal === 'rent' ? 'rent' : 'price';

  /* ---- why it stands out: the strongest measured facts first, plain facts to fill */
  const good: string[] = [];
  if (m && m.verdict === 'below') good.push(`Asking rate is ${pct(m.deltaPct)} below the comparable median.`);
  if (m && m.verdict === 'in line') good.push(`Asking rate is within 4% of the comparable median (${signed(m.deltaPct)}).`);
  if (station && station.metres <= 800) good.push(`${station.name} is about ${metresText(station.metres)} away, roughly a ${Math.max(1, Math.round(station.metres / 80))}-minute walk.`);
  if (i.primaries.state === 'verified' && i.primaries.within1km >= 2) good.push(`${i.primaries.within1km} primary schools within 1 km.`);
  if (r && r.sizeDeltaPct >= 5) good.push(`Floor area is ${pct(r.sizeDeltaPct)} larger than the comparable median.`);
  if (c && c.deltaPct !== null && c.deltaPct <= -4) good.push(`Asking ${what} per sq ft is ${pct(c.deltaPct)} below the median of ${c.sample} comparable active listings.`);
  if (i.hawker.state === 'verified' && i.hawker.nearest && i.hawker.nearest.metres <= 500) good.push(`${i.hawker.nearest.name} is about ${metresText(i.hawker.nearest.metres)} away.`);
  if (dev?.tenure === 'Freehold') good.push('Freehold development.');
  if (dev && i.today.getFullYear() - dev.built <= 5) good.push(`Completed in ${dev.built}.`);
  if (l.furnishing === 'Fully furnished' && deal === 'rent') good.push('Fully furnished.');
  if (good.length < 3) good.push(`${layout}, ${sqft(l.sizeSqft)}, ${count(l.bathrooms, 'bathroom')}.`);
  if (good.length < 3 && dayText(l.availableFrom)) good.push(`${deal === 'rent' ? 'Available' : 'Viewings'} from ${dayText(l.availableFrom)}.`);

  /* ---- what to consider */
  const care: string[] = [];
  if (dev && l.tenure && l.tenure !== dev.tenure) care.push(`Listing tenure differs from the development record (${dev.tenure}); confirm it.`);
  if (m && m.verdict === 'above') {
    care.push(r && r.place === 'above'
      ? `Asking rate is ${pct(m.deltaPct)} above the comparable median, and above every comparable contract.`
      : `Asking rate is ${pct(m.deltaPct)} above the comparable median.`);
  }
  if (i.unavailable.length) {
    const names = i.unavailable.map((n, k) => (k === 0 ? n : n.toLowerCase()));
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    care.push(`${list} data ${names.length === 1 ? 'was' : 'were'} unavailable when prepared.`);
  }
  if (m && !m.local) care.push(`Local sample insufficient: contracts from ${m.basis === 'island' ? 'across Singapore' : 'nearby districts'} were used.`);
  if (m && m.local && m.confidence === 'thin') care.push(`The comparable sample is small (${m.sample} contracts).`);
  if (!m && i.market.status === 'unavailable') {
    care.push(i.market.reason === 'sale' ? 'No sale transaction evidence is held; the price is not benchmarked against transactions.' : 'No comparable contracts are held for this kind of home.');
  }
  if (c && c.deltaPct !== null && c.deltaPct >= 4) care.push(`Asking ${what} per sq ft is ${pct(c.deltaPct)} above the median of ${c.sample} comparable active listings.`);
  if (c && c.deltaPct === null && c.lowerPsfCount > 0) care.push(`${c.lowerPsfCount} of ${count(c.sample, 'comparable active listing')} ${c.lowerPsfCount === 1 ? 'asks' : 'ask'} less per sq ft.`);
  if (i.mrt.state === 'verified' && !i.mrt.nearest) care.push('No MRT or LRT station within 2 km.');
  if (station && station.metres > 1200) care.push(`Nearest MRT or LRT station is about ${metresText(station.metres)} away.`);
  if (r && r.sizeDeltaPct <= -10) care.push(`Floor area is ${pct(r.sizeDeltaPct)} smaller than the comparable median.`);
  if (deal === 'rent' && l.minLeaseMonths >= 24) care.push(`Minimum lease of ${l.minLeaseMonths} months.`);
  if (i.unavailable.length) care.push(`${i.unavailable.join(' and ')} data ${i.unavailable.length === 1 ? 'was' : 'were'} unavailable when prepared.`);
  if (care.length === 0) care.push('Confirm availability, terms and condition with the agent before committing.');

  /* ---- market position, one statement */
  let position: DecisionSummary['position'];
  if (m && r) {
    const detail = `${against(m.deltaPct)} the comparable median rate per sq ft · ${m.sample} contracts · ${m.basisLabel}`;
    position = { headline: RANGE_LABEL[r.place], detail: `${detail.charAt(0).toUpperCase()}${detail.slice(1)}`, tone: m.verdict };
  } else if (deal === 'sale') {
    position = {
      headline: 'Not benchmarked against transactions',
      detail: c && c.deltaPct !== null
        ? `Sale transaction evidence is not held. Against ${c.sample} comparable ${i.activeSource ?? 'listings live on V-RENT'}, the asking price per sq ft is ${against(c.deltaPct)} their median.`
        : 'Sale transaction evidence is not held on the platform.',
      tone: 'none',
    };
  } else {
    position = { headline: 'Comparison unavailable', detail: i.market.status === 'unavailable' ? i.market.message : '', tone: 'none' };
  }

  /* ---- bottom line */
  const price = deal === 'rent' ? `${money(l.monthlyRent)} a month` : money(l.salePriceSgd ?? 0);
  const article = /^[aeiou8]|^1[18]-/i.test(layout) ? 'an' : 'a';
  const parts = [`${l.project} is ${article} ${layout.charAt(0).toLowerCase()}${layout.slice(1)} of ${sqft(l.sizeSqft)} in ${areaName(l.district)}, asking ${price}.`];
  if (m && r) {
    const where = r.place === 'within' ? 'within the observed comparable range' : `${r.place} the observed comparable range`;
    parts.push(`Its asking rate of ${psf2(m.unitPsf)} psf is ${against(m.deltaPct)} the median of ${m.sample} comparable contracts and ${where}.`);
  }
  if (deal === 'sale') parts.push('No sale transaction evidence is held, so this report does not benchmark the price against transactions.');
  if (station) parts.push(`The nearest MRT or LRT station is about ${metresText(station.metres)} away.`);
  const sourceNote = i.marketNote === undefined
    ? (MARKET_SOURCE.live ? null : 'Market figures are indicative and come from an illustrative dataset, not live URA data.')
    : i.marketNote;
  if (m && sourceNote) parts.push(sourceNote);

  return { standsOut: good.slice(0, 3), consider: care.slice(0, 3), position, bottomLine: parts.join(' ') };
}
