/**
 * The link preview for a public listing — what WhatsApp, Telegram and a search
 * engine draw when the address is pasted. Shared by the marketplace page and
 * the older share link that forwards to it.
 *
 * Server only.
 */

import type { Metadata } from 'next';
import { marketListing } from './marketplace';

export async function listingMetadata(owner: string, id: string): Promise<Metadata> {
  const found = await marketListing(owner, id);
  if (!found) return { title: 'Listing not available — V-RENT' };
  const l = found.listing;
  const sale = l.dealType === 'sale';
  const priceText = sale ? `S$${(l.salePriceSgd ?? 0).toLocaleString('en-SG')}` : `S$${l.monthlyRent.toLocaleString('en-SG')} per month`;
  const image = found.photos[0]
    ?? (l.lat !== undefined && l.lng !== undefined ? `/api/phase1/map?lat=${l.lat}&lng=${l.lng}&w=512&h=268` : undefined);
  const title = `${l.bedrooms} bedroom ${l.propertyType} ${sale ? 'for sale' : 'for rent'} in ${l.project}`;
  const description = `${l.address}, Singapore ${l.postalCode}. ${priceText}.`;
  return {
    title: `${title} — V-RENT`,
    description,
    openGraph: { title, description, type: 'website', siteName: 'V-RENT', images: image ? [{ url: image, alt: title }] : undefined },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : undefined },
  };
}
