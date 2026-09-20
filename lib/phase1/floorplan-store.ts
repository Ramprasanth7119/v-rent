/**
 * The floor plan, which is not a photograph.
 *
 * It is kept apart from the photograph store for two reasons that both matter.
 * A floor plan is frequently a PDF, and the photograph pipeline re-encodes
 * everything it is given as JPEG — which would either fail or silently turn a
 * vector drawing into a blurry raster. And there is exactly one per listing,
 * where photographs are a gallery of up to six, so the shape of the record is
 * different: one document, replaced when a new one is uploaded.
 *
 * It is stored as it arrived, byte for byte. A plan is a document rather than a
 * picture: its value is in the dimensions printed on it, and every re-encoding
 * makes those harder to read.
 *
 * Server only.
 */

import { randomBytes } from 'node:crypto';
import { store } from '../store/driver';

/**
 * Generous for a scan, tight enough to stay inside the request body limit the
 * hosting platform imposes. An architect's PDF is usually well under a
 * megabyte; a phone photograph of a printed plan is the large case.
 */
export const MAX_FLOORPLAN_BYTES = 4 * 1024 * 1024;

export const FLOORPLAN_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const FLOORPLAN_ACCEPT = Object.keys(FLOORPLAN_TYPES).join(',');

export interface StoredFloorPlan {
  id: string;
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

const key = (ownerId: string, listingId: string) => `${ownerId}:${listingId}`;

/** Ids are opaque, so a filename from a browser never reaches a path. */
const safeName = (raw: string, extension: string) => {
  const base = raw.replace(/\.[^.]+$/, '').replace(/[^\w -]/g, '').trim().slice(0, 60);
  return `${base || 'floor-plan'}.${extension}`;
};

export type FloorPlanRefusal = 'wrong_type' | 'too_large' | 'empty';

/**
 * Store one, replacing whatever was there.
 *
 * Returns the refusal rather than throwing, because every caller wants to tell
 * the agent which of the two things went wrong.
 */
export async function saveFloorPlan(
  ownerId: string,
  listingId: string,
  file: File,
): Promise<{ ok: true; plan: StoredFloorPlan } | { ok: false; reason: FloorPlanRefusal }> {
  const extension = FLOORPLAN_TYPES[file.type];
  if (!extension) return { ok: false, reason: 'wrong_type' };
  if (file.size > MAX_FLOORPLAN_BYTES) return { ok: false, reason: 'too_large' };
  if (file.size === 0) return { ok: false, reason: 'empty' };

  const bytes = Buffer.from(await file.arrayBuffer());
  const plan: StoredFloorPlan = {
    id: key(ownerId, listingId),
    ownerId,
    listingId,
    data: bytes.toString('base64'),
    contentType: file.type,
    filename: safeName(file.name || 'floor-plan', extension),
    bytes: file.size,
    at: new Date().toISOString(),
  };
  await plans.put(plan);
  return { ok: true, plan };
}

export async function readFloorPlan(ownerId: string, listingId: string): Promise<StoredFloorPlan | null> {
  try {
    return await plans.get(key(ownerId, listingId));
  } catch {
    return null;
  }
}

/** What the listing needs to know: that there is one, and how big it is. */
export async function floorPlanSummary(ownerId: string, listingId: string) {
  const plan = await readFloorPlan(ownerId, listingId);
  return plan ? { filename: plan.filename, contentType: plan.contentType, bytes: plan.bytes, at: plan.at } : null;
}

export async function deleteFloorPlan(ownerId: string, listingId: string): Promise<void> {
  try {
    await plans.remove(key(ownerId, listingId));
  } catch {
    /* nothing stored for this listing */
  }
}

/** A token in the URL so a plan cannot be enumerated by listing id alone. */
export const floorPlanToken = () => randomBytes(8).toString('hex');
