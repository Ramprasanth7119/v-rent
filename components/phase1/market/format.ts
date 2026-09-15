/**
 * How the marketplace says a price, a size and a place. Client-safe.
 */

import type { DemoListing } from '../../../lib/phase1/data';
import { districtCode, districtLabel } from '../../../lib/phase1/districts';

export const isSale = (l: DemoListing) => (l.dealType ?? 'rent') === 'sale';

/** "S$4,200" with "/mo", or "S$1.35M" for a sale. */
export function price(l: DemoListing): { amount: string; unit: string } {
  if (isSale(l)) {
    const v = l.salePriceSgd ?? 0;
    const amount = v >= 1_000_000
      ? `S$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 2).replace(/\.?0+$/, '')}M`
      : `S$${v.toLocaleString('en-SG')}`;
    return { amount, unit: '' };
  }
  return { amount: `S$${l.monthlyRent.toLocaleString('en-SG')}`, unit: '/mo' };
}

/** The short form a map pin can carry: "S$4.2k", "S$1.4M". */
export function pinPrice(l: DemoListing): string {
  const v = isSale(l) ? l.salePriceSgd ?? 0 : l.monthlyRent;
  if (v >= 1_000_000) return `S$${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 1_000) return `S$${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `S$${v}`;
}

export const bedLabel = (n: number) => (n === 0 ? 'Studio' : `${n} bed`);

export function facts(l: DemoListing): string {
  return [bedLabel(l.bedrooms), `${l.bathrooms} bath`, l.sizeSqft ? `${l.sizeSqft.toLocaleString('en-SG')} sqft` : null]
    .filter(Boolean)
    .join(' · ');
}

export const place = (l: DemoListing) => `${districtCode(l.district)} · ${districtLabel(l.district)}`;

/** "Newton (DT11)" becomes "Newton MRT"; an LRT keeps its name. */
export function mrt(l: DemoListing): string | null {
  if (!l.nearestMrt) return null;
  const name = l.nearestMrt.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return /\b(MRT|LRT)\b/.test(name) ? name : `${name} MRT`;
}

/** Listed in the last week. */
export function isNew(l: DemoListing, today: Date): boolean {
  const at = l.publishedAt ?? l.createdAt;
  if (!at) return false;
  return (today.getTime() - new Date(at).getTime()) / 86_400_000 <= 7;
}

export const propertyNoun = (l: DemoListing) =>
  l.propertyType === 'HDB' ? 'HDB flat' : l.propertyType === 'Landed' ? 'Landed house' : l.propertyType;
