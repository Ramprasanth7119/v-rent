/**
 * What is around a home, found on the server and streamed into the listing.
 *
 * A server component behind `<Suspense>`: the national datasets can take a few
 * seconds on a cold cache and the rest of the listing should not wait for
 * them. A source that does not answer says so rather than showing nothing,
 * which would read to a tenant as "there are no schools here".
 *
 * The search itself is `nearbyAround` — the same six categories, from the same
 * published datasets, that the agent saw while writing the listing. A tenant
 * and the agent advertising to them now read the same neighbourhood.
 *
 * Server only: it holds the OneMap token's side of the call.
 */

import { Skeleton } from '../kit';
import { NEARBY_CATEGORIES } from '../../../lib/phase1/nearby';
import { nearbyAround } from '../../../lib/phase1/nearby-sources';
import { demoNearby } from '../../../lib/phase1/nearby-demo';
import { demoDataOnServer } from '../../../lib/phase1/report-data/server';
import { NearbyPanel } from './NearbyPanel';

export async function Nearby({ lat, lng, postal, label }: { lat: number; lng: number; postal?: string; label?: string }) {
  /* The one switch, read here as every other server reader reads it. With it
     on nothing is asked of a live source, so the illustrative set is built
     instead — and the panel above it already carries the demo badge. */
  const demo = await demoDataOnServer();
  const lookup = demo ? demoNearby(lat, lng, postal) : await nearbyAround(lat, lng, { postal });

  return <NearbyPanel lat={lat} lng={lng} label={label} lookup={lookup} demo={demo} />;
}

export function NearbySkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-p1-border bg-p1-surface" aria-busy="true" aria-label="Loading what is nearby">
      <div className="flex border-b border-p1-border">
        {NEARBY_CATEGORIES.map((c) => (
          <div key={c.key} className="flex min-w-[88px] flex-1 flex-col items-center gap-1.5 px-3 py-3">
            <Skeleton className="h-[19px] w-[19px] rounded-md" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      <div>
        <div className="space-y-4 p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-3.5 w-10" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[280px] rounded-none sm:h-[340px]" />
      </div>
    </div>
  );
}
