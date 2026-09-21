/**
 * The floor plans, which are not photographs.
 *
 * Kept apart from the photograph store because a floor plan is frequently a
 * PDF, and the photograph pipeline re-encodes everything it is given as JPEG —
 * which would either fail outright or quietly turn a vector drawing into a
 * blurry raster. A plan is a document rather than a picture: its value is in
 * the dimensions printed on it, and every re-encoding makes those harder to
 * read. So it is stored as it arrived, byte for byte.
 *
 * There can be several. This held exactly one per listing, on the assumption
 * that a flat has a floor plan the way it has an address — but a maisonette has
 * two storeys and a plan for each, a development hands out a stack plan beside
 * the unit plan, and an agent scanning a printed brochure gets one page at a
 * time. One slot meant the second upload silently replaced the first. Each plan
 * is now its own document under its own opaque id, and the listing carries the
 * list.
 *
 * Server only.
 */

import { randomBytes } from 'node:crypto';
import { store } from '../store/driver';
import { FLOORPLAN_TYPES, MAX_FLOOR_PLANS, MAX_FLOORPLAN_BYTES, type FloorPlanNote } from './floorplan';

/* The limits and the types are in `floorplan.ts`, which the browser can read
   too; re-exported here so the route keeps one import. */
export {
  FLOORPLAN_ACCEPT, FLOORPLAN_TYPES, MAX_FLOOR_PLANS, MAX_FLOORPLAN_BYTES, type FloorPlanNote,
} from './floorplan';

export interface StoredFloorPlan {
  /** `owner:listing:plan` — unique across the collection. */
  id: string;
  /** Opaque, and the only part of the id a browser is ever given. */
  planId: string;
  ownerId: string;
  listingId: string;
  /** Base64, as it arrived. */
  data: string;
  contentType: string;
  /** What the agent called it, for the download filename. */
  filename: string;
  bytes: number;
  at: string;
}

const plans = store<StoredFloorPlan>('floorplans');

const key = (ownerId: string, listingId: string, planId: string) => `${ownerId}:${listingId}:${planId}`;

const note = (p: StoredFloorPlan): FloorPlanNote =>
  ({ id: p.planId, filename: p.filename, contentType: p.contentType, bytes: p.bytes, at: p.at });

/** Oldest first, so the order on screen is the order they were added. */
const byAge = (a: { at: string }, b: { at: string }) => a.at.localeCompare(b.at);

/** Ids are opaque, so a filename from a browser never reaches a path. */
const safeName = (raw: string, extension: string) => {
  const base = raw.replace(/\.[^.]+$/, '').replace(/[^\w -]/g, '').trim().slice(0, 60);
  return `${base || 'floor-plan'}.${extension}`;
};

export type FloorPlanRefusal = 'wrong_type' | 'too_large' | 'empty' | 'too_many';

/**
 * Add one to the listing's set.
 *
 * Returns the refusal rather than throwing, because every caller wants to tell
 * the agent which of the four things went wrong.
 */
export async function saveFloorPlan(
  ownerId: string,
  listingId: string,
  file: File,
): Promise<{ ok: true; plan: StoredFloorPlan; notes: FloorPlanNote[] } | { ok: false; reason: FloorPlanRefusal }> {
  const extension = FLOORPLAN_TYPES[file.type];
  if (!extension) return { ok: false, reason: 'wrong_type' };
  if (file.size > MAX_FLOORPLAN_BYTES) return { ok: false, reason: 'too_large' };
  if (file.size === 0) return { ok: false, reason: 'empty' };

  const existing = await listFloorPlans(ownerId, listingId);
  if (existing.length >= MAX_FLOOR_PLANS) return { ok: false, reason: 'too_many' };

  const bytes = Buffer.from(await file.arrayBuffer());
  const planId = randomBytes(8).toString('hex');
  const plan: StoredFloorPlan = {
    id: key(ownerId, listingId, planId),
    planId,
    ownerId,
    listingId,
    data: bytes.toString('base64'),
    contentType: file.type,
    filename: safeName(file.name || 'floor-plan', extension),
    bytes: file.size,
    at: new Date().toISOString(),
  };
  await plans.put(plan);
  return { ok: true, plan, notes: [...existing, plan].sort(byAge).map(note) };
}

/** Every plan on a listing, oldest first. */
export async function listFloorPlans(ownerId: string, listingId: string): Promise<StoredFloorPlan[]> {
  try {
    const found = await plans.find({ ownerId, listingId });
    return found.sort(byAge);
  } catch {
    return [];
  }
}

/** What the listing needs to know: which plans there are, and how big each is. */
export async function floorPlanNotes(ownerId: string, listingId: string): Promise<FloorPlanNote[]> {
  return (await listFloorPlans(ownerId, listingId)).map(note);
}

export async function readFloorPlan(ownerId: string, listingId: string, planId: string): Promise<StoredFloorPlan | null> {
  try {
    return await plans.get(key(ownerId, listingId, planId));
  } catch {
    return null;
  }
}

/** Remove one, and report what is left so the listing can be brought into line. */
export async function deleteFloorPlan(ownerId: string, listingId: string, planId: string): Promise<FloorPlanNote[]> {
  try {
    await plans.remove(key(ownerId, listingId, planId));
  } catch {
    /* nothing stored under that id */
  }
  return floorPlanNotes(ownerId, listingId);
}

/** A token in the URL so a plan cannot be enumerated by listing id alone. */
export const floorPlanToken = () => randomBytes(8).toString('hex');
