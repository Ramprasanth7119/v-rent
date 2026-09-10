/**
 * Where a listing's photographs live, for whoever is rendering them.
 *
 * Client-safe: it builds paths and nothing else. Whether the caller may
 * actually fetch one is decided by the route, from the listing's status and
 * the session.
 */

import { DemoListing } from './data';

export const photoSrc = (ownerId: string, listingId: string, photoId: string, size: 'full' | 'thumb' = 'full') =>
  `/api/phase1/photos/${ownerId}/${listingId}/${photoId}${size === 'thumb' ? '?size=thumb' : ''}`;

/** Every photograph on a listing, in display order. Empty when there are none. */
export function listingPhotos(ownerId: string | undefined, listing: DemoListing): string[] {
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
  const first = (listing.photos ?? [])[0];
  return ownerId && first ? photoSrc(ownerId, listing.id, first, size) : undefined;
}
