/**
 * The public page behind a share link.
 *
 * Share links were sent before the tenant site existed, and every one of them
 * must keep working. The listing now lives at its marketplace address, so a
 * share link forwards there — carrying the same rule about what a stranger may
 * see, which the marketplace store applies: published and paused listings
 * only, and a plain not-found for anything else.
 *
 * The preview metadata stays here too, so a link pasted into WhatsApp draws its
 * card even from a client that reads the first response without following it.
 */

import { notFound, permanentRedirect } from 'next/navigation';
import { marketListing } from '../../../../../lib/phase1/marketplace';
import { listingMetadata } from '../../../../../lib/phase1/listing-metadata';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ owner: string; id: string }> }) {
  const { owner, id } = await params;
  return listingMetadata(owner, id);
}

export default async function SharedListingPage({ params }: { params: Promise<{ owner: string; id: string }> }) {
  const { owner, id } = await params;
  const found = await marketListing(owner, id);
  if (!found) notFound();
  permanentRedirect(`/phase1/homes/${owner}/${id}`);
}
