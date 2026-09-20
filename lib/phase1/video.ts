/**
 * The video tour: what may be uploaded, and where it goes.
 *
 * Video is the one piece of media this product cannot carry itself. A walk
 * through a three-bedroom flat is tens of megabytes before it is anything
 * useful, and the path every other upload takes — browser to our route, route
 * to the store — has a hard ceiling well below that: a request body of 4.5 MB
 * on the hosting, and a document of 16 MB in the database. Re-encoding would
 * not save it either; the file is simply the wrong order of magnitude.
 *
 * So the file never touches our server. The browser uploads it straight to
 * Cloudinary using a signature this application issues, and what comes back to
 * us is a record of where it landed. Cloudinary then does the part that
 * actually matters to a tenant on a phone — transcoding to something that
 * streams, and producing a poster frame.
 *
 * Optional, throughout. Most listings will never have one, and a listing
 * without a video is not an incomplete listing.
 *
 * This module is the pure half: the limits, the checks and the naming. The
 * half that holds a credential is `cloudinary.ts`.
 */

/**
 * 100 MB, which is what Cloudinary accepts from a browser on its ordinary
 * plans. A one-minute walkthrough from a phone is comfortably inside it; a
 * fifteen-minute unedited recording is not, and should not be advertised.
 */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/**
 * What a phone produces and what a browser can play. MOV is on the list
 * because it is what an iPhone records; Cloudinary converts it on the way in.
 */
export const VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-m4v': 'm4v',
};

export const VIDEO_ACCEPT = Object.keys(VIDEO_TYPES).join(',');

/** Recorded on the listing once the upload has landed and been confirmed. */
export interface VideoNote {
  /** Cloudinary's identifier, which is what deletes and transforms it. */
  publicId: string;
  /** The delivery address of the streaming copy. */
  url: string;
  /** A frame from the video, for the place in the gallery it occupies. */
  posterUrl: string;
  bytes: number;
  /** Whole seconds, rounded. Absent when Cloudinary did not report it. */
  durationSec?: number;
  format: string;
  at: string;
}

const MB = 1024 * 1024;

/**
 * Why this file cannot be uploaded, addressed to the agent holding it.
 *
 * Checked here before a signature is issued, so an agent who picked the wrong
 * file is told in the same second rather than after a two-minute upload.
 */
export function videoProblem(file: { type: string; size: number; name?: string }): string | null {
  if (file.size === 0) return 'That file is empty.';
  if (!VIDEO_TYPES[file.type]) {
    return 'A video tour has to be an MP4, MOV, WebM or M4V. That file is something else.';
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return `That video is ${(file.size / MB).toFixed(0)} MB. The limit is ${MAX_VIDEO_BYTES / MB} MB — trim it, or export it at a lower resolution.`;
  }
  return null;
}

/**
 * Where a listing's video lives inside the Cloudinary account.
 *
 * Built on the server from the session's owner and the listing, never from
 * anything the browser sent, and then signed — so a browser that alters it
 * invalidates the signature rather than writing over somebody else's asset.
 * One video per listing, so the id is stable and a replacement overwrites
 * rather than accumulating.
 */
export function videoPublicId(ownerId: string, listingId: string): string {
  const safe = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, '');
  return `vrent/listings/${safe(ownerId)}/${safe(listingId)}/tour`;
}

/** `2:05`, or `0:48`. Blank when the length was never reported. */
export function videoLength(seconds: number | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '';
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** `12.4 MB`, matching how the floor plan states its own size. */
export const videoSize = (bytes: number) =>
  (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
