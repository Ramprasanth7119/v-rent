/**
 * The filter set, modelled on what Singapore agents already use.
 *
 * 99.co and PropertyGuru have converged on much the same list — price and price
 * per square foot, bedrooms, bathrooms, floor area, tenure, built year, floor
 * level and nearest MRT — because it is what people actually narrow by here.
 * A few of them only make sense on one side of the market: furnishing and the
 * availability date are rental questions, tenure and built year are sale ones,
 * and the panel follows that rather than showing everything to everybody.
 *
 * Pure functions, so the same predicate serves the list, the counts and the
 * shortlist export.
 */

import { DemoListing } from '../../../lib/phase1/data';
import { comparablePrice, dealOf, priceOf } from '../../../lib/phase1/pricing';
/* The storey is read in one place for the whole product; see `lib/phase1/floor`. */
export { FLOOR_BANDS, floorOf, inFloorBand, floorLabel } from '../../../lib/phase1/floor';
import { FLOOR_BANDS, inFloorBand } from '../../../lib/phase1/floor';

export type DealFilter = 'any' | 'rent' | 'sale';
export type { FloorBand } from '../../../lib/phase1/floor';
import type { FloorBand } from '../../../lib/phase1/floor';

export interface ListingFilters {
  deal: DealFilter;
  beds: string;
  baths: string;
  type: string;
  district: string;
  /** Monthly rent, or asking price on a sale. Blank means open-ended. */
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
  furnishing: string;
  tenure: string;
  floor: FloorBand;
  mrt: string;
  /** Available within this many days. Rentals only. */
  available: string;
}

export const EMPTY_FILTERS: ListingFilters = {
  deal: 'any',
  beds: 'any',
  baths: 'any',
  type: 'any',
  district: 'any',
  priceMin: '',
  priceMax: '',
  areaMin: '',
  areaMax: '',
  furnishing: 'any',
  tenure: 'any',
  floor: 'any',
  mrt: 'any',
  available: 'any',
};

export const AVAILABILITY = [
  { key: '30', label: 'Within 30 days' },
  { key: '60', label: 'Within 60 days' },
  { key: '90', label: 'Within 90 days' },
];

export const TENURES = ['Freehold', '99-year leasehold', '999-year leasehold'];
export const FURNISHINGS = ['Unfurnished', 'Partially furnished', 'Fully furnished'];

const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(/\D/g, '')));

/** Does this listing survive the filters? */
export function matches(l: DemoListing, f: ListingFilters, today: Date): boolean {
  if (f.deal !== 'any' && dealOf(l) !== f.deal) return false;
  if (f.type !== 'any' && l.propertyType !== f.type) return false;
  if (f.district !== 'any' && l.district !== Number(f.district)) return false;

  if (f.beds !== 'any') {
    const wanted = f.beds === '5+' ? 5 : Number(f.beds);
    if (f.beds === '5+' ? l.bedrooms < 5 : l.bedrooms !== wanted) return false;
  }
  if (f.baths !== 'any') {
    const wanted = f.baths === '4+' ? 4 : Number(f.baths);
    if (f.baths === '4+' ? l.bathrooms < 4 : l.bathrooms !== wanted) return false;
  }

  // Price is compared in the listing's own terms — a rent against rents, an
  // asking price against asking prices — so a mixed list does not filter one
  // kind out by accident.
  const price = f.deal === 'any' ? comparablePrice(l) : priceOf(l);
  const min = num(f.priceMin);
  const max = num(f.priceMax);
  if (min !== null && price < min) return false;
  if (max !== null && price > max) return false;

  const areaMin = num(f.areaMin);
  const areaMax = num(f.areaMax);
  if (areaMin !== null && l.sizeSqft < areaMin) return false;
  if (areaMax !== null && l.sizeSqft > areaMax) return false;

  if (f.furnishing !== 'any' && l.furnishing !== f.furnishing) return false;
  if (f.tenure !== 'any' && (l.tenure ?? '') !== f.tenure) return false;
  if (f.mrt !== 'any' && (l.nearestMrt ?? '') !== f.mrt) return false;

  if (!inFloorBand(l, f.floor)) return false;

  if (f.available !== 'any') {
    if (!l.availableFrom) return false;
    const when = new Date(`${l.availableFrom}T00:00:00+08:00`).getTime();
    if (Number.isNaN(when)) return false;
    const limit = today.getTime() + Number(f.available) * 86_400_000;
    if (when > limit) return false;
  }

  return true;
}

const sgd = (n: number) => `S$${n.toLocaleString('en-SG')}`;

/** One chip per active filter, so what is narrowing the list is never hidden. */
export function activeChips(
  f: ListingFilters,
  set: (patch: Partial<ListingFilters>) => void,
): { label: string; clear: () => void }[] {
  const chips: { label: string; clear: () => void }[] = [];
  const add = (label: string, patch: Partial<ListingFilters>) => chips.push({ label, clear: () => set(patch) });

  if (f.deal !== 'any') add(f.deal === 'sale' ? 'For sale' : 'For rent', { deal: 'any' });
  if (f.type !== 'any') add(f.type, { type: 'any' });
  if (f.beds !== 'any') add(f.beds === '5+' ? '5+ bedrooms' : `${f.beds} bedroom${f.beds === '1' ? '' : 's'}`, { beds: 'any' });
  if (f.baths !== 'any') add(f.baths === '4+' ? '4+ bathrooms' : `${f.baths} bathroom${f.baths === '1' ? '' : 's'}`, { baths: 'any' });
  if (f.district !== 'any') add(`D${String(f.district).padStart(2, '0')}`, { district: 'any' });

  const min = num(f.priceMin);
  const max = num(f.priceMax);
  if (min !== null || max !== null) {
    const label = min !== null && max !== null ? `${sgd(min)}–${sgd(max)}`
      : min !== null ? `From ${sgd(min)}`
      : `Up to ${sgd(max as number)}`;
    add(label, { priceMin: '', priceMax: '' });
  }

  const aMin = num(f.areaMin);
  const aMax = num(f.areaMax);
  if (aMin !== null || aMax !== null) {
    const label = aMin !== null && aMax !== null ? `${aMin.toLocaleString()}–${aMax.toLocaleString()} sqft`
      : aMin !== null ? `From ${aMin.toLocaleString()} sqft`
      : `Up to ${(aMax as number).toLocaleString()} sqft`;
    add(label, { areaMin: '', areaMax: '' });
  }

  if (f.furnishing !== 'any') add(f.furnishing, { furnishing: 'any' });
  if (f.tenure !== 'any') add(f.tenure, { tenure: 'any' });
  if (f.floor !== 'any') add(FLOOR_BANDS[f.floor].label, { floor: 'any' });
  if (f.mrt !== 'any') add(f.mrt, { mrt: 'any' });
  if (f.available !== 'any') add(AVAILABILITY.find((a) => a.key === f.available)?.label ?? '', { available: 'any' });

  return chips;
}

export const activeCount = (f: ListingFilters): number =>
  activeChips(f, () => {}).length;
