/**
 * Which storey a home is on.
 *
 * Singapore unit numbers are `#floor-unit`, so the storey is already in the
 * number an agent typed and asking for it again would be asking them to
 * contradict themselves. But the unit number does not reach a tenant — it
 * identifies somebody's front door and is stripped before a listing is
 * advertised — while the storey very much does: it is one of the things people
 * filter by, and the difference between a second floor and a thirty-second is
 * most of what they are picturing.
 *
 * So the floor is read from the unit number once, on the way out, and carried
 * as a figure of its own. This module is the single place that knows how to
 * read one, used by the agent's filters, the tenant's filters and the report.
 *
 * Pure. Safe in a browser and on a server.
 */

import type { DemoListing } from './data';

export type FloorBand = 'any' | 'low' | 'mid' | 'high';

/**
 * The storey, or null when the number does not carry one.
 *
 * Landed houses and shophouses have no unit number, and a blank is not a
 * ground floor — it is an unknown, and a filter that treats it as 1 quietly
 * files every terrace house under "low floor".
 */
export function floorFromUnit(unitNo?: string): number | null {
  if (!unitNo) return null;
  const match = unitNo.replace(/\s/g, '').match(/^#?(\d{1,3})-/);
  if (!match) return null;
  const floor = Number(match[1]);
  return Number.isFinite(floor) ? floor : null;
}

/**
 * The storey of a listing, from whichever of the two it carries.
 *
 * An agent's own record has the unit number; a listing that has been published
 * to the marketplace has had it removed and carries `floorLevel` instead. One
 * function reads both, so no caller has to know which kind it is holding.
 */
export const floorOf = (listing: Pick<DemoListing, 'unitNo' | 'floorLevel'>): number | null =>
  listing.floorLevel ?? floorFromUnit(listing.unitNo);

export const FLOOR_BANDS: Record<Exclude<FloorBand, 'any'>, { label: string; test: (f: number) => boolean }> = {
  low: { label: 'Low floor (1–5)', test: (f) => f <= 5 },
  mid: { label: 'Mid floor (6–20)', test: (f) => f > 5 && f <= 20 },
  high: { label: 'High floor (21+)', test: (f) => f > 20 },
};

/** Whether a listing sits in the band, and false when its storey is unknown. */
export function inFloorBand(listing: Pick<DemoListing, 'unitNo' | 'floorLevel'>, band: FloorBand): boolean {
  if (band === 'any') return true;
  const floor = floorOf(listing);
  return floor === null ? false : FLOOR_BANDS[band].test(floor);
}

/** "12th floor", for a screen that states it rather than filters by it. */
export function floorLabel(listing: Pick<DemoListing, 'unitNo' | 'floorLevel'>): string | null {
  const floor = floorOf(listing);
  if (floor === null) return null;
  const ord = floor % 100 >= 11 && floor % 100 <= 13 ? 'th'
    : floor % 10 === 1 ? 'st'
      : floor % 10 === 2 ? 'nd'
        : floor % 10 === 3 ? 'rd' : 'th';
  return `${floor}${ord} floor`;
}
