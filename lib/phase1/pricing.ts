/**
 * What a listing costs, and how to say it.
 *
 * A rental and a sale are the same record with a different number on it, and
 * the number differs by three orders of magnitude — S$4,200 a month against
 * S$1,850,000. Every screen that shows a price goes through here so none of
 * them has to remember which kind it is holding.
 */

import { DemoListing, sgd } from './data';

export type DealType = 'rent' | 'sale';

export const DEAL_LABEL: Record<DealType, string> = {
  rent: 'For rent',
  sale: 'For sale',
};

/** Rent is the default: V-RENT started as a rental platform and most stock is. */
export const dealOf = (l: DemoListing): DealType => l.dealType ?? 'rent';

/** The figure to show, whichever kind of listing this is. */
export const priceOf = (l: DemoListing): number =>
  (dealOf(l) === 'sale' ? l.salePriceSgd ?? 0 : l.monthlyRent);

/** "S$4,200 /month" or "S$1,850,000". */
export function priceLabel(l: DemoListing): { amount: string; suffix: string } {
  return dealOf(l) === 'sale'
    ? { amount: sgd(priceOf(l)), suffix: '' }
    : { amount: sgd(l.monthlyRent), suffix: '/month' };
}

/** Per square foot, which means different things for the two kinds. */
export function psf(l: DemoListing): string | null {
  if (!l.sizeSqft) return null;
  const value = priceOf(l) / l.sizeSqft;
  return dealOf(l) === 'sale'
    ? `S$${Math.round(value).toLocaleString('en-SG')} psf`
    : `S$${value.toFixed(2)} psf per month`;
}

/**
 * Sorting and filtering across both kinds needs one comparable number.
 * A sale price is divided down so a mixed list does not put every sale above
 * every rental; the ratio is arbitrary but consistent.
 */
export const comparablePrice = (l: DemoListing): number =>
  (dealOf(l) === 'sale' ? priceOf(l) / 300 : l.monthlyRent);
