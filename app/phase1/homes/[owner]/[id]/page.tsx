/**
 * One home, public. What a stranger may see is decided in the marketplace
 * store: a published or paused listing, never anything else.
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { marketListing, similarListings } from '../../../../../lib/phase1/marketplace';
import { listingMetadata } from '../../../../../lib/phase1/listing-metadata';
import { PropertyDetail } from '../../../../../components/phase1/market/PropertyDetail';
import { Nearby, NearbySkeleton } from '../../../../../components/phase1/market/Nearby';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ owner: string; id: string }> }) {
  const { owner, id } = await params;
  return listingMetadata(owner, id);
}

export default async function HomePage({ params }: { params: Promise<{ owner: string; id: string }> }) {
  const { owner, id } = await params;
  const item = await marketListing(owner, id);
  if (!item) notFound();
  const similar = await similarListings(item, 4);
  const l = item.listing;

  return (
    <PropertyDetail
      item={item}
      similar={similar}
      nearby={l.lat !== undefined && l.lng !== undefined ? (
        <Suspense fallback={<NearbySkeleton />}>
          <Nearby lat={l.lat} lng={l.lng} postal={l.postalCode} />
        </Suspense>
      ) : undefined}
    />
  );
}
