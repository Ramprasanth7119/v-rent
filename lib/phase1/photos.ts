/**
 * Where a listing's photographs live, for whoever is rendering them.
 *
 * Client-safe: it builds paths and nothing else. Whether the caller may
 * actually fetch one is decided by the route, from the listing's status and
 * the session.
 */

import { DemoListing } from './data';
import { DEMO_PREFIX, isDemoId } from './report-data/demo-workspace';

export const photoSrc = (ownerId: string, listingId: string, photoId: string, size: 'full' | 'thumb' = 'full') =>
  `/api/phase1/photos/${ownerId}/${listingId}/${photoId}${size === 'thumb' ? '?size=thumb' : ''}`;

/**
 * The demo account's photographs: one static file per seed listing, served
 * from `public/demo/properties`. They are Unsplash photographs (free licence),
 * stored with the app so a walkthrough never depends on a third-party server,
 * and they are only ever returned for a `demo-` listing — a real listing shows
 * its own uploads or the honest stand-in, never one of these.
 */
const DEMO_PHOTOS = new Set(Array.from({ length: 12 }, (_, i) => `lst-${i + 1}`));

function demoPhoto(listing: DemoListing, size: 'full' | 'thumb'): string | undefined {
  const seed = listing.id.slice(DEMO_PREFIX.length);
  return DEMO_PHOTOS.has(seed) ? `/demo/properties/${seed}${size === 'thumb' ? '-thumb' : ''}.jpg` : undefined;
}

/** Every photograph on a listing, in display order. Empty when there are none. */
export function listingPhotos(ownerId: string | undefined, listing: DemoListing): string[] {
  if (isDemoId(listing.id)) {
    const one = demoPhoto(listing, 'full');
    return one ? [one] : [];
  }
  if (!ownerId) return [];
  return (listing.photos ?? []).map((id) => photoSrc(ownerId, listing.id, id));
}

/**
 * The cover, or undefined when the listing has no photographs yet.
 *
 * Cards and rows get the small derivative: a list of twelve listings has no
 * business pulling twelve full-size photographs, least of all on a phone.
 */
export function coverPhoto(
  ownerId: string | undefined,
  listing: DemoListing,
  size: 'full' | 'thumb' = 'thumb',
): string | undefined {
  if (isDemoId(listing.id)) return demoPhoto(listing, size);
  const first = (listing.photos ?? [])[0];
  return ownerId && first ? photoSrc(ownerId, listing.id, first, size) : undefined;
}
