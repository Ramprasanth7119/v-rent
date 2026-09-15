/**
 * The shortlist report's data layer: what goes in, and whether it is fit to
 * print.
 *
 * The printed report is only as trustworthy as the least reliable figure on it,
 * and a PDF cannot be corrected once it has been forwarded. So before a single
 * sheet is laid out, every property is mapped into one normalised shape and
 * checked, and the report refuses to print while anything is wrong:
 *
 *   listing record ─► ReportProperty (one price, by deal type)
 *                  ─► validateProperty   the particulars an agent typed
 *                  ─► validateMarket     the comparison is internally consistent
 *                  ─► placeEvidence      each neighbourhood answer, classified
 *
 * Neighbourhood lookups are never fatal: a government dataset having a bad
 * afternoon should not stop an agent sending a shortlist. They are, however,
 * never allowed to read as "nothing nearby" when the truth is "we could not
 * check" — that distinction is the whole point of `placeEvidence`.
 *
 * Pure and client-safe: no fetches, no storage.
 */

import type { DemoListing } from './data';
import type { AmenityGroup } from './amenities';
import type { Place, PlaceKind, PlacesLookup } from './places';
import { districtFromPostal } from './onemap';
import { dealOf, type DealType } from './pricing';
import { BASIS_ORDER, MIN_FALLBACK, NEIGHBOURS, quantile, type MarketResult } from './market-position';
import { MARKET_MONTHS } from './market';

/* ================================================================ mapping */

/** One property as the report reads it. Exactly one of the two prices is set. */
export interface ReportProperty {
  listing: DemoListing;
  deal: DealType;
  /** Monthly rent in S$, for a rental. Null for a sale. */
  askingRent: number | null;
  /** Asking price in S$, for a sale. Null for a rental. */
  salePrice: number | null;
  /** Rent per sq ft per month, or price per sq ft. Null without a floor area. */
  psf: number | null;
  located: boolean;
}

export function toReportProperty(l: DemoListing): ReportProperty {
  const deal = dealOf(l);
  const askingRent = deal === 'rent' && l.monthlyRent > 0 ? l.monthlyRent : null;
  const salePrice = deal === 'sale' && (l.salePriceSgd ?? 0) > 0 ? l.salePriceSgd! : null;
  const price = askingRent ?? salePrice;
  return {
    listing: l,
    deal,
    askingRent,
    salePrice,
    psf: price && l.sizeSqft > 0 ? price / l.sizeSqft : null,
    located: isInSingapore(l.lat, l.lng),
  };
}

export const isInSingapore = (lat?: number, lng?: number) =>
  typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)
  && lat > 1.1 && lat < 1.5 && lng > 103.5 && lng < 104.2;

/* ============================================================= validation */

export type IssueArea = 'listing type' | 'price' | 'particulars' | 'location' | 'market';

export interface Issue {
  severity: 'error' | 'warning';
  area: IssueArea;
  code: string;
  /** Written for the agent: what is wrong, in their terms. */
  message: string;
  /** What to do about it. */
  fix?: string;
}

const money = (n: number) => `S$${Math.round(n).toLocaleString('en-SG')}`;
const FURNISHING = ['Unfurnished', 'Partially furnished', 'Fully furnished'];
const TYPES = ['Condominium', 'HDB', 'Apartment', 'Landed', 'Executive Condominium'];

/* Bounds wide enough for a Good Class Bungalow and a room in a walk-up, and
   narrow enough to catch a sale price in the rent field or a rent in the price. */
const RENT_MIN = 300;
const RENT_MAX = 80_000;
const SALE_MIN = 100_000;

const EDIT = 'Open the listing, check the figure and save it again.';

/**
 * The listing's own particulars. Reads the raw record, not the normalised
 * one, because a conflict between the two prices is exactly what has to be
 * seen rather than resolved by picking one.
 */
export function validateProperty(l: DemoListing): Issue[] {
  const out: Issue[] = [];
  const err = (area: IssueArea, code: string, message: string, fix = EDIT) => out.push({ severity: 'error', area, code, message, fix });
  const warn = (area: IssueArea, code: string, message: string, fix?: string) => out.push({ severity: 'warning', area, code, message, fix });

  /* ---- listing type and price */
  if (l.dealType !== undefined && l.dealType !== 'rent' && l.dealType !== 'sale') {
    err('listing type', 'deal_unknown', `The listing type "${String(l.dealType)}" is not rent or sale.`);
  }
  const deal = dealOf(l);
  const sale = l.salePriceSgd ?? 0;
  if (deal === 'rent') {
    if (sale > 0) {
      err('listing type', 'rent_has_sale_price',
        `This listing is marked for rent but also carries a sale price of ${money(sale)}. The report will not choose between them.`,
        'Open the listing, confirm it is a rental and save it again. Saving clears the stray sale price.');
    }
    if (!(l.monthlyRent > 0)) err('price', 'rent_missing', 'This rental has no asking rent.');
    else if (l.monthlyRent > RENT_MAX) {
      err('price', 'rent_implausible', `${money(l.monthlyRent)} is not a plausible monthly rent. It looks like a sale price.`,
        'If the property is for sale, change the listing type. Otherwise correct the rent.');
    } else if (l.monthlyRent < RENT_MIN) err('price', 'rent_implausible', `${money(l.monthlyRent)} a month is below any residential rent.`);
  } else {
    if (l.monthlyRent > 0) {
      err('listing type', 'sale_has_rent',
        `This listing is marked for sale but also carries a monthly rent of ${money(l.monthlyRent)}. The report will not choose between them.`,
        'Open the listing, confirm it is for sale and save it again. Saving clears the stray rent.');
    }
    if (!(sale > 0)) err('price', 'sale_missing', 'This sale listing has no asking price.');
    else if (sale < SALE_MIN) {
      err('price', 'sale_implausible', `${money(sale)} is not a plausible sale price. It looks like a monthly rent.`,
        'If the property is for rent, change the listing type. Otherwise correct the price.');
    }
  }

  /* ---- particulars */
  if (!l.address?.trim()) err('particulars', 'address_missing', 'The address is missing.');
  if (!/^\d{6}$/.test(l.postalCode ?? '')) {
    err('particulars', 'postal_invalid', `"${l.postalCode || 'blank'}" is not a six-digit Singapore postal code.`);
  } else {
    const fromPostal = districtFromPostal(l.postalCode);
    if (fromPostal === 0) err('particulars', 'postal_unknown', `Postal code ${l.postalCode} does not belong to any postal district.`);
    else if (fromPostal !== l.district) {
      err('particulars', 'district_mismatch',
        `The listing says District ${l.district}, but postal code ${l.postalCode} is in District ${fromPostal}.`,
        'Re-select the address in the listing so the district is taken from the postal code.');
    }
  }
  if (!TYPES.includes(l.propertyType)) err('particulars', 'type_unknown', `"${l.propertyType}" is not a recognised property type.`);
  if (!(l.sizeSqft > 0)) err('particulars', 'size_missing', 'The floor area is missing.');
  else if (l.sizeSqft < 100 || l.sizeSqft > 30_000) {
    err('particulars', 'size_implausible', `${l.sizeSqft.toLocaleString('en-SG')} sq ft is outside any residential floor area. Check whether it was entered in square metres.`);
  }
  if (!Number.isInteger(l.bedrooms) || l.bedrooms < 0 || l.bedrooms > 12) err('particulars', 'bedrooms_invalid', `${l.bedrooms} is not a valid number of bedrooms.`);
  if (!Number.isInteger(l.bathrooms) || l.bathrooms < 1 || l.bathrooms > 12) err('particulars', 'bathrooms_invalid', `${l.bathrooms} is not a valid number of bathrooms.`);
  if (!FURNISHING.includes(l.furnishing)) err('particulars', 'furnishing_invalid', 'The furnishing is not recorded.');
  if (!/^\d{4}-\d{2}-\d{2}/.test(l.availableFrom ?? '') || Number.isNaN(Date.parse(l.availableFrom))) {
    err('particulars', 'availability_invalid', 'The availability date is missing or not a date.');
  }
  if (deal === 'rent' && !(l.minLeaseMonths > 0)) err('particulars', 'lease_missing', 'The minimum lease is not recorded.');

  /* Rate per square foot catches a floor area typed in square metres even when
     both numbers are individually plausible. */
  if (deal === 'rent' && l.monthlyRent > 0 && l.sizeSqft > 0) {
    const rate = l.monthlyRent / l.sizeSqft;
    if (rate < 0.8 || rate > 25) {
      err('price', 'psf_implausible', `The rent works out at S$${rate.toFixed(2)} per sq ft a month, outside any Singapore rental. Check the rent and the floor area.`);
    }
  }

  /* ---- location: never fatal, but the reader is told */
  if (!isInSingapore(l.lat, l.lng)) {
    warn('location', 'not_located', 'The address has not been matched to a map position, so distances to transport, schools and amenities cannot be verified.',
      'Re-select the address in the listing to place it on the map.');
  }
  return out;
}

/**
 * The comparison checked against itself. None of these should ever fail; if
 * one does the calculation is wrong, and a wrong market figure in a client
 * document is worse than none, so it blocks.
 */
export function validateMarket(l: DemoListing, m: MarketResult): Issue[] {
  if (m.status !== 'ok') return [];
  const out: Issue[] = [];
  const bad = (code: string, message: string) => out.push({ severity: 'error', area: 'market', code, message, fix: 'This is a calculation fault, not a listing problem. Report it; the report cannot be printed until it is fixed.' });
  const close = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

  if (m.sample !== m.rows.length) bad('sample_mismatch', `The comparison claims ${m.sample} contracts but holds ${m.rows.length}.`);
  if (m.rows.length < MIN_FALLBACK) bad('sample_small', 'The comparison has too few contracts to publish.');
  if (m.rows.some((r) => r.bedrooms !== l.bedrooms)) bad('rows_bedrooms', 'A comparable contract has a different bedroom count from the property.');
  if (m.band && m.rows.some((r) => r.sizeSqft < m.band!.min || r.sizeSqft > m.band!.max)) bad('rows_band', 'A comparable contract falls outside the printed size band.');
  if (m.basis === 'development' && m.rows.some((r) => r.project.toLowerCase() !== l.project.toLowerCase())) bad('rows_scope', 'A "same development" contract is from another development.');
  if (m.basis === 'district' && m.rows.some((r) => r.district !== l.district)) bad('rows_scope', 'A "same district" contract is from another district.');
  if (m.basis === 'nearby') {
    const ok = new Set([l.district, ...(NEIGHBOURS[l.district] ?? [])]);
    if (m.rows.some((r) => !ok.has(r.district))) bad('rows_scope', 'A "nearby districts" contract is from a district that is not nearby.');
  }
  if (!m.basisLabel.startsWith({ development: 'Same development', street: 'Same street', district: 'Same district', nearby: 'Nearby districts', island: 'Singapore-wide' }[m.basis])) {
    bad('basis_label', 'The printed comparison basis does not match the basis used.');
  }
  if (BASIS_ORDER.indexOf(m.basis) < 0) bad('basis_unknown', 'The comparison basis is not recognised.');

  const psfs = m.rows.map((r) => r.monthlyRent / r.sizeSqft);
  if (!close(m.medianPsf, quantile(psfs, 0.5), 0.006)) bad('median_psf', 'The median rate per sq ft does not match its contracts.');
  if (!close(m.medianRent, quantile(m.rows.map((r) => r.monthlyRent), 0.5), 1)) bad('median_rent', 'The median rent does not match its contracts.');
  if (!(m.minPsf <= m.q1Psf && m.q1Psf <= m.medianPsf && m.medianPsf <= m.q3Psf && m.q3Psf <= m.maxPsf)) bad('quartiles', 'The quartiles are out of order.');
  if (!close(m.unitPsf, l.monthlyRent / l.sizeSqft, 0.006)) bad('unit_psf', 'The property\'s rate per sq ft is not its rent divided by its floor area.');
  if (m.unitRent !== l.monthlyRent) bad('unit_rent', 'The rent compared is not the listing\'s asking rent.');
  const delta = ((l.monthlyRent / l.sizeSqft - quantile(psfs, 0.5)) / quantile(psfs, 0.5)) * 100;
  if (!close(m.deltaPct, delta, 0.06)) bad('delta', 'The difference from the market does not follow from the two rates.');
  const verdict = m.deltaPct <= -4 ? 'below' : m.deltaPct >= 4 ? 'above' : 'in line';
  if (verdict !== m.verdict) bad('verdict', 'The market position wording does not match the difference.');
  if (m.trendCounts.reduce((a, b) => a + b, 0) !== m.sample) bad('trend_counts', 'The monthly trend does not account for every contract.');
  if (m.trend.length !== MARKET_MONTHS.length) bad('trend_length', 'The trend does not cover the twelve-month window.');
  if (m.outlook.some((o) => !Number.isFinite(o.value) || o.value <= 0)) bad('outlook', 'The indicative trend produced an invalid figure.');
  return out;
}

/* ============================================================== evidence */

/**
 * - verified:    the dataset answered; an empty list really means none in range
 * - partial:     it answered, but part of it is missing, so "none" cannot be said
 * - unavailable: the dataset failed, timed out or is not configured
 * - unverified:  the address has no map position, so nothing could be measured
 */
export type EvidenceState = 'verified' | 'partial' | 'unavailable' | 'unverified';

export interface Evidence<T> {
  state: EvidenceState;
  items: T[];
  retrievedAt?: string;
  /** Plain words for the reader when the state is not verified. */
  note?: string;
}

export const EVIDENCE_TEXT: Record<Exclude<EvidenceState, 'verified'>, string> = {
  partial: 'Unable to verify',
  unavailable: 'Data unavailable',
  unverified: 'Unable to verify',
};

export function placeEvidence(lookup: PlacesLookup | undefined, located: boolean, kind: PlaceKind): Evidence<Place> {
  if (!located) return { state: 'unverified', items: [], note: 'The address has not been matched to a map position.' };
  if (!lookup) return { state: 'unavailable', items: [], note: 'The dataset did not answer while the report was prepared.' };
  if (lookup.status !== 'ok') return { state: 'unavailable', items: [], note: 'The dataset did not answer while the report was prepared.' };
  if (lookup.kind !== kind) return { state: 'unavailable', items: [], note: 'The dataset returned an unexpected answer.' };

  /* Anything that is not a sensible distance is dropped rather than printed. */
  const limit = kind === 'mrt' ? Infinity : lookup.radius;
  const items = lookup.items
    .filter((p) => p && typeof p.name === 'string' && p.name.trim() && Number.isFinite(p.metres) && p.metres >= 0 && p.metres <= limit)
    .sort((a, b) => a.metres - b.metres);

  if ((lookup.pending ?? 0) > 0) {
    return { state: 'partial', items, retrievedAt: lookup.retrievedAt, note: `${lookup.pending} schools could not be placed on the map in time, so this list may be incomplete.` };
  }
  if ((lookup.missing ?? []).length > 0) {
    return { state: 'partial', items, retrievedAt: lookup.retrievedAt, note: `${lookup.missing!.join(' and ')} data did not answer, so this list may be incomplete.` };
  }
  return { state: 'verified', items, retrievedAt: lookup.retrievedAt };
}

/** One category of the everyday-amenities lookup. `around` undefined = still waiting or timed out. */
export function amenityEvidence(
  around: { groups: AmenityGroup[]; missing: string[]; retrievedAt?: string } | null | undefined,
  located: boolean,
  key: string,
): Evidence<AmenityGroup['items'][number]> {
  if (!located) return { state: 'unverified', items: [], note: 'The address has not been matched to a map position.' };
  if (!around) return { state: 'unavailable', items: [], note: 'The amenity datasets did not answer while the report was prepared.' };
  const group = around.groups.find((g) => g.key === key);
  if (!group) return { state: 'unavailable', items: [], note: 'This dataset did not answer while the report was prepared.' };
  const items = group.items
    .filter((a) => Number.isFinite(a.metres) && a.metres >= 0)
    .sort((a, b) => a.metres - b.metres);
  return { state: 'verified', items, retrievedAt: around.retrievedAt };
}

/** The line to print for "the nearest X": a place, a verified none, or why we cannot say. */
export function nearestText<T extends { name: string }>(e: Evidence<T>, noneText: string, pick: (items: T[]) => T | undefined = (i) => i[0]):
  { kind: 'item'; item: T } | { kind: 'none' | 'unknown'; text: string } {
  const item = pick(e.items);
  if (item) return { kind: 'item', item };
  if (e.state === 'verified') return { kind: 'none', text: noneText };
  return { kind: 'unknown', text: EVIDENCE_TEXT[e.state] };
}

/** A count that is only a count when the evidence is complete. */
export function countText(e: Evidence<unknown>, n: number): string {
  if (e.state === 'verified') return String(n);
  if (e.state === 'partial') return n > 0 ? `${n}+` : EVIDENCE_TEXT.partial;
  return EVIDENCE_TEXT[e.state];
}

/* ================================================================ totals */

export interface ReportCheck {
  property: ReportProperty;
  market: MarketResult;
  issues: Issue[];
}

export const blocking = (checks: ReportCheck[]) => checks.flatMap((c) => c.issues.filter((i) => i.severity === 'error').map((i) => ({ ...i, listing: c.property.listing })));
