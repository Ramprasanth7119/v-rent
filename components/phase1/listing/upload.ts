/**
 * Sending photographs to a listing.
 *
 * One request per photograph. The hosting platform refuses a request body over
 * 4.5 MB, which three phone photographs sent together already exceed, and one
 * photograph that fails should not take the others with it.
 *
 * A photograph over the send limit is scaled down in the browser first. The
 * server re-encodes every photograph at 1,600 pixels wide anyway, so nothing
 * visible is lost. A format the browser cannot decode (HEIC outside Safari) is
 * sent as it is and the server decides.
 */

import type { PhotoNote } from './PhotoUploader';

/** Under the platform's 4.5 MB request limit, with room for the form around it. */
const SEND_LIMIT = 4 * 1024 * 1024;
const LONG_EDGE = 2560;

export interface UploadOutcome {
  /** The listing's photographs after the last successful upload; null when none succeeded. */
  photos: string[] | null;
  warnings: PhotoNote[];
  /** Names the server looked at and refused (wrong type, unreadable, over the limit). */
  rejected: string[];
  /** Photographs that never reached the listing, with the reason in plain words. */
  failed: { name: string; message: string }[];
}

async function fitForSending(file: File): Promise<File> {
  if (file.size <= SEND_LIMIT || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    for (const quality of [0.9, 0.82, 0.72]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= SEND_LIMIT) {
        return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photograph'}.jpg`, { type: 'image/jpeg' });
      }
    }
  } catch {
    /* not decodable here: send the original and let the server decide */
  }
  return file;
}

type Answer = { photos?: string[]; rejected?: { name: string }[]; warnings?: PhotoNote[]; error?: string };

export async function uploadPhotos(listingId: string, files: File[]): Promise<UploadOutcome> {
  const outcome: UploadOutcome = { photos: null, warnings: [], rejected: [], failed: [] };
  for (const original of files) {
    const name = original.name || 'Photograph';
    try {
      const form = new FormData();
      form.append('listingId', listingId);
      form.append('file', await fitForSending(original));
      const res = await fetch('/api/phase1/photos', { method: 'POST', body: form });
      const body = (await res.json().catch(() => null)) as Answer | null;
      if (!res.ok || !body?.photos) {
        outcome.failed.push({
          name,
          message: body?.error
            ?? (res.status === 413 ? `${name} is too large to upload. Try a smaller photograph.` : `The server could not save ${name} (error ${res.status}).`),
        });
        continue;
      }
      outcome.photos = body.photos;
      outcome.warnings.push(...(body.warnings ?? []));
      outcome.rejected.push(...(body.rejected ?? []).map((r) => r.name));
    } catch {
      outcome.failed.push({ name, message: 'The upload did not reach the server. Check your connection and try again.' });
    }
  }
  return outcome;
}
