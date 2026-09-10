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
import { DUPLICATE_WITHIN, PhotoQuality, hammingDistance, processPhoto } from './image';

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

/**
 * Ids are generated here, so a name from the browser never reaches the disk.
 * Everything is stored as JPEG whatever arrived, because everything is
 * re-encoded on the way in.
 */
const SAFE_ID = /^[0-9a-f]{16}\.jpg$/;

/** The small derivative sits beside the main one under the same id. */
const thumbName = (id: string) => id.replace(/\.jpg$/, '.sm.jpg');

/** Per-photograph findings, kept beside the files rather than in the workspace. */
export interface PhotoMeta extends PhotoQuality {
  width: number;
  height: number;
  /** The id of the photograph this one duplicates, when it does. */
  duplicateOf?: string;
}

type MetaFile = Record<string, PhotoMeta>;

async function readMeta(dir: string): Promise<MetaFile> {
  try {
    return JSON.parse(await readFile(path.join(dir, 'meta.json'), 'utf8')) as MetaFile;
  } catch {
    return {};
  }
}

async function writeMeta(dir: string, meta: MetaFile) {
  await writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
}

/** What was found about each photograph on a listing. */
export async function photoMeta(ownerId: string, listingId: string): Promise<MetaFile> {
  try {
    return await readMeta(listingDir(ownerId, listingId));
  } catch {
    return {};
  }
}

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
  reason: 'too_large' | 'wrong_type' | 'over_limit' | 'unreadable';
}

/** Something worth telling the agent, that is not a refusal. */
export interface PhotoWarning {
  id: string;
  name: string;
  issue: 'dark' | 'blurry' | 'duplicate';
}

export interface SaveResult {
  saved: string[];
  rejected: RejectedPhoto[];
  warnings: PhotoWarning[];
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
  const meta = await readMeta(dir);

  const saved: string[] = [];
  const rejected: RejectedPhoto[] = [];
  const warnings: PhotoWarning[] = [];
  let room = MAX_PHOTOS_PER_LISTING - existing.length;

  for (const file of files) {
    const name = file.name || 'photograph';

    if (!ACCEPTED_TYPES[file.type]) {
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

    // Decoding is the real test of whether this is a photograph. A renamed
    // document with the right content-type header fails here.
    const processed = await processPhoto(Buffer.from(await file.arrayBuffer()));
    if (!processed) {
      rejected.push({ name, reason: 'unreadable' });
      continue;
    }

    const id = `${randomBytes(8).toString('hex')}.jpg`;
    await writeFile(path.join(dir, id), processed.main);
    await writeFile(path.join(dir, thumbName(id)), processed.thumb);

    // The same photograph twice is the third most common reason a listing is
    // sent back, and the agent almost never did it on purpose.
    const twin = Object.entries(meta).find(
      ([otherId, other]) => [...existing, ...saved].includes(otherId)
        && hammingDistance(other.hash, processed.quality.hash) <= DUPLICATE_WITHIN,
    );

    meta[id] = {
      ...processed.quality,
      width: processed.width,
      height: processed.height,
      duplicateOf: twin?.[0],
    };

    if (twin) warnings.push({ id, name, issue: 'duplicate' });
    else if (processed.quality.dark) warnings.push({ id, name, issue: 'dark' });
    else if (processed.quality.blurry) warnings.push({ id, name, issue: 'blurry' });

    saved.push(id);
    room -= 1;
  }

  await writeMeta(dir, meta);
  return { saved, rejected, warnings };
}

/** The bytes and content type for one stored photograph. */
export async function readPhoto(
  ownerId: string,
  listingId: string,
  photoId: string,
  size: 'full' | 'thumb' = 'full',
): Promise<{ body: Buffer; type: string } | null> {
  if (!SAFE_ID.test(photoId)) return null;
  const dir = listingDir(ownerId, listingId);
  const file = size === 'thumb' ? thumbName(photoId) : photoId;
  try {
    return { body: await readFile(path.join(dir, file)), type: 'image/jpeg' };
  } catch {
    // A photograph stored before the thumbnail existed still has its full size.
    if (size === 'thumb') return readPhoto(ownerId, listingId, photoId, 'full');
    return null;
  }
}

export async function deletePhoto(ownerId: string, listingId: string, photoId: string): Promise<void> {
  if (!SAFE_ID.test(photoId)) return;
  const dir = listingDir(ownerId, listingId);
  await rm(path.join(dir, photoId), { force: true });
  await rm(path.join(dir, thumbName(photoId)), { force: true });
  const meta = await readMeta(dir);
  if (meta[photoId]) {
    delete meta[photoId];
    await writeMeta(dir, meta);
  }
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
    const wanted = new Set([...keep, ...keep.map(thumbName), 'meta.json']);
    await Promise.all(
      files.filter((f) => !wanted.has(f)).map((f) => deletePhoto(ownerId, listingId, f)),
    );
  } catch {
    /* nothing uploaded for this listing yet */
  }
}

/** Every file for a listing is removed when the listing itself is. */
export async function deleteListingPhotos(ownerId: string, listingId: string): Promise<void> {
  await rm(listingDir(ownerId, listingId), { recursive: true, force: true });
}
