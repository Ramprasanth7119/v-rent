/**
 * Listing Health — a completeness score every listing carries.
 *
 * It is not a ranking signal. It tells the agent what is missing and how
 * much each item matters, so the fix is always one click away.
 */

import { DemoListing } from './data';

export interface HealthItem {
  key: string;
  label: string;
  /** Points this item contributes when satisfied. */
  weight: number;
  ok: boolean;
  /** Short instruction when not ok. */
  fix: string;
  /** Wizard step or section that fixes it. */
  section: 'media' | 'description' | 'details' | 'pricing' | 'property';
}

export interface ListingHealth {
  score: number;
  tier: 'strong' | 'good' | 'weak';
  items: HealthItem[];
  missing: HealthItem[];
}

export function listingHealth(l: DemoListing): ListingHealth {
  const desc = l.description ?? '';
  const items: HealthItem[] = [
    { key: 'photos_min', label: 'At least 5 photos', weight: 20, ok: l.images >= 5, fix: `Add ${Math.max(0, 5 - l.images)} more photo${5 - l.images === 1 ? '' : 's'}`, section: 'media' },
    { key: 'photos_full', label: '10 or more photos', weight: 15, ok: l.images >= 10, fix: `Add ${Math.max(0, 10 - l.images)} more to reach 10`, section: 'media' },
    { key: 'floor_plan', label: 'Floor plan attached', weight: 10, ok: !!l.hasFloorPlan, fix: 'Attach a floor plan', section: 'media' },
    { key: 'description', label: 'Description of 120+ characters', weight: 15, ok: desc.length >= 120, fix: desc.length ? `Write ${120 - desc.length} more characters` : 'Write a description', section: 'description' },
    { key: 'amenities', label: 'Amenities listed', weight: 10, ok: (l.amenities?.length ?? 0) >= 3, fix: 'Select at least 3 amenities', section: 'description' },
    { key: 'furnishing', label: 'Furnishing stated', weight: 5, ok: !!l.furnishing, fix: 'State the furnishing level', section: 'details' },
    { key: 'unit', label: 'Unit number recorded', weight: 10, ok: !!l.unitNo && l.unitNo !== '#—', fix: 'Add the unit number', section: 'property' },
    { key: 'availability', label: 'Availability date set', weight: 5, ok: !!l.availableFrom, fix: 'Set the move-in date', section: 'pricing' },
    { key: 'deposit', label: 'Deposit terms stated', weight: 5, ok: typeof l.depositMonths === 'number', fix: 'State the deposit', section: 'pricing' },
    { key: 'nearby', label: 'Nearest MRT named', weight: 5, ok: !!l.nearestMrt, fix: 'Name the nearest MRT station', section: 'description' },
  ];
  const score = items.reduce((n, i) => n + (i.ok ? i.weight : 0), 0);
  const tier = score >= 85 ? 'strong' : score >= 60 ? 'good' : 'weak';
  return { score, tier, items, missing: items.filter((i) => !i.ok) };
}

export const HEALTH_TONE: Record<ListingHealth['tier'], 'success' | 'warning' | 'danger'> = {
  strong: 'success',
  good: 'warning',
  weak: 'danger',
};
