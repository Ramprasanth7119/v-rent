/**
 * One home, public. What a stranger may see is decided in the marketplace
 * store: a published or paused listing, never anything else.
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { marketListing, marketListings, similarListings } from '../../../../../lib/phase1/marketplace';
import { listingMetadata } from '../../../../../lib/phase1/listing-metadata';
import { PropertyDetail } from '../../../../../components/phase1/market/PropertyDetail';
import { ViewBeacon } from '../../../../../components/phase1/market/ViewBeacon';
import { Nearby, NearbySkeleton } from '../../../../../components/phase1/market/Nearby';
import { JsonLd } from '../../../../../components/phase1/market/JsonLd';
import { RecordView } from '../../../../../components/phase1/market/RecordView';
import { breadcrumbJsonLd, listingJsonLd } from '../../../../../lib/phase1/market-jsonld';
import { absolute, publicOrigin } from '../../../../../lib/phase1/public-origin';
import { districtLabel } from '../../../../../lib/phase1/districts';
import { PriceContextPanel } from '../../../../../components/phase1/market/PriceContext';
import { priceContext } from '../../../../../lib/phase1/market-compare';

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

  /* Cached for the request, so asking for the whole stock here costs nothing
     the similar-homes lookup has not already paid for. */
  const context = priceContext(item, await marketListings());

  const origin = await publicOrigin();
  const url = absolute(origin, `/phase1/homes/${owner}/${id}`);
  const sale = l.dealType === 'sale';

  return (
    <>
    <JsonLd data={[
      listingJsonLd(item, url),
      breadcrumbJsonLd([
        { name: sale ? 'Buy' : 'Rent', url: absolute(origin, `/phase1/homes/search${sale ? '?deal=sale' : ''}`) },
        { name: districtLabel(l.district), url: absolute(origin, `/phase1/homes/d/${l.district}`) },
        { name: l.project, url },
      ]),
    ]} />
    <RecordView ownerId={owner} listingId={id} />
    {/* Counted when an agent opens it; see `lib/phase1/views.ts`. */}
    <ViewBeacon ownerId={owner} listingId={id} />
    <PropertyDetail
      item={item}
      similar={similar}
      priceContext={<PriceContextPanel context={context} />}
      nearby={l.lat !== undefined && l.lng !== undefined ? (
        <Suspense fallback={<NearbySkeleton />}>
          <Nearby lat={l.lat} lng={l.lng} postal={l.postalCode} label={l.project} />
        </Suspense>
      ) : undefined}
    />
    </>
  );
}
