/**
 * The floor plan: what may be uploaded, and what a listing records about it.
 *
 * The pure half, split out for the same reason `video.ts` is split from
 * `cloudinary.ts`: the control that picks the file has to know the limits
 * before it offers the button, and it runs in the browser, where the store —
 * which reaches for `node:crypto` and the database — cannot be imported.
 *
 * No imports, so anything may read it.
 */

/**
 * Generous for a scan, tight enough to stay inside the request body limit the
 * hosting platform imposes. An architect's PDF is usually well under a
 * megabyte; a phone photograph of a printed plan is the large case.
 */
export const MAX_FLOORPLAN_BYTES = 4 * 1024 * 1024;

/**
 * Enough for a two-storey unit, its stack plan and a scanned brochure, and few
 * enough that the listing page stays a listing page rather than a document
 * folder.
 */
export const MAX_FLOOR_PLANS = 6;

export const FLOORPLAN_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const FLOORPLAN_ACCEPT = Object.keys(FLOORPLAN_TYPES).join(',');

/** What a listing records: that a plan exists, and enough to name and fetch it. */
export interface FloorPlanNote {
  /** Opaque, and the only part of the stored key a browser is given. */
  id: string;
  filename: string;
  contentType: string;
  bytes: number;
  at: string;
}

const MB = 1024 * 1024;

/**
 * Why this file cannot be uploaded, addressed to the agent holding it.
 *
 * Checked in the browser before anything is sent, so picking the wrong file
 * costs a second rather than an upload. The route checks the same things again
 * on arrival, because a browser is not where a rule is enforced.
 */
export function floorPlanProblem(file: { type: string; size: number }): string | null {
  if (file.size === 0) return 'That file is empty.';
  if (!FLOORPLAN_TYPES[file.type]) return 'A floor plan has to be a PDF, JPEG, PNG or WebP. That file is something else.';
  if (file.size > MAX_FLOORPLAN_BYTES) {
    return `That file is ${(file.size / MB).toFixed(1)} MB. The limit is ${MAX_FLOORPLAN_BYTES / MB} MB — export it at a smaller size.`;
  }
  return null;
}

/** `1.2 MB`, matching how the video states its own size. */
export const floorPlanSize = (bytes: number) =>
  (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** The address one plan is served from. */
export const floorPlanHref = (ownerId: string, listingId: string, plan: FloorPlanNote) =>
  `/api/phase1/floorplan?owner=${encodeURIComponent(ownerId)}&listing=${encodeURIComponent(listingId)}&plan=${encodeURIComponent(plan.id)}&v=${encodeURIComponent(plan.at)}`;
