/**
 * Listing photographs, on disk.
 *
 * Files live outside the JSON store — a 5 MB photograph inside a document that
 * is read and rewritten on every keystroke would be absurd. The workspace keeps
 * only the ordered list of file names; the bytes sit under `.data/uploads`,
 * keyed by account and listing so one agent's files can never be addressed
 * through another agent's listing.
 *
 * Production swaps this for object storage with pre-signed uploads. The shape
 * of what the rest of the application sees — an ordered list of ids — does not
 * change.
 */

import { randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** What an agent may upload, and how much of it. */
export const MAX_PHOTOS_PER_LISTING = 6;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * Accepted formats. HEIC is on the list because it is what an iPhone produces
 * by default and an agent should not have to know that.
 */
export const ACCEPTED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export const ACCEPT_ATTRIBUTE = Object.keys(ACCEPTED_TYPES).join(',');

const UPLOAD_ROOT = path.join(process.cwd(), '.data', 'uploads');

/** Ids are generated here, so a name from the browser never reaches the disk. */
const SAFE_ID = /^[0-9a-f]{16}\.(jpg|png|webp|heic|heif)$/;

function listingDir(ownerId: string, listingId: string): string {
  // Both come from our own records, but a path is a path: refuse anything that
  // could climb out of the upload root.
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(ownerId) || !/^[A-Za-z0-9._-]{1,64}$/.test(listingId)) {
    throw new Error('bad path segment');
  }
  return path.join(UPLOAD_ROOT, ownerId, listingId);
}

export interface RejectedPhoto {
  name: string;
  reason: 'too_large' | 'wrong_type' | 'over_limit';
}

export interface SaveResult {
  saved: string[];
  rejected: RejectedPhoto[];
}

/**
 * Write what is acceptable and report what is not.
 *
 * A partial success is the right outcome here: an agent who selects seven
 * photographs, one of them a screenshot, should end up with the six good ones
 * and a clear note about the seventh — not an error and an empty listing.
 */
export async function savePhotos(
  ownerId: string,
  listingId: string,
  existing: string[],
  files: File[],
): Promise<SaveResult> {
  const dir = listingDir(ownerId, listingId);
  await mkdir(dir, { recursive: true });

  const saved: string[] = [];
  const rejected: RejectedPhoto[] = [];
  let room = MAX_PHOTOS_PER_LISTING - existing.length;

  for (const file of files) {
    const name = file.name || 'photograph';
    const ext = ACCEPTED_TYPES[file.type];

    if (!ext) {
      rejected.push({ name, reason: 'wrong_type' });
      continue;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      rejected.push({ name, reason: 'too_large' });
      continue;
    }
    if (room <= 0) {
      rejected.push({ name, reason: 'over_limit' });
      continue;
    }

    const id = `${randomBytes(8).toString('hex')}.${ext}`;
    await writeFile(path.join(dir, id), Buffer.from(await file.arrayBuffer()));
    saved.push(id);
    room -= 1;
  }

  return { saved, rejected };
}

/** The bytes and content type for one stored photograph. */
export async function readPhoto(
  ownerId: string,
  listingId: string,
  photoId: string,
): Promise<{ body: Buffer; type: string } | null> {
  if (!SAFE_ID.test(photoId)) return null;
  try {
    const body = await readFile(path.join(listingDir(ownerId, listingId), photoId));
    const ext = photoId.split('.').pop() ?? '';
    const type = Object.entries(ACCEPTED_TYPES).find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream';
    return { body, type };
  } catch {
    return null;
  }
}

export async function deletePhoto(ownerId: string, listingId: string, photoId: string): Promise<void> {
  if (!SAFE_ID.test(photoId)) return;
  await rm(path.join(listingDir(ownerId, listingId), photoId), { force: true });
}

/**
 * Files on disk that no listing refers to any more.
 *
 * Called after a listing's photo list changes, so a removed photograph does not
 * sit on disk indefinitely — and, more to the point, so it stops being
 * retrievable by anyone who noted its URL.
 */
export async function pruneOrphans(ownerId: string, listingId: string, keep: string[]): Promise<void> {
  try {
    const files = await readdir(listingDir(ownerId, listingId));
    await Promise.all(
      files.filter((f) => !keep.includes(f)).map((f) => deletePhoto(ownerId, listingId, f)),
    );
  } catch {
    /* nothing uploaded for this listing yet */
  }
}

/** Every file for a listing is removed when the listing itself is. */
export async function deleteListingPhotos(ownerId: string, listingId: string): Promise<void> {
  await rm(listingDir(ownerId, listingId), { recursive: true, force: true });
}
