"use client";

import { Heart } from 'lucide-react';
import type { MarketListing } from '../../../lib/phase1/marketplace';
import { EmptyState, LinkButton, SkeletonPropertyCard } from '../kit';
import { PropertyCard } from './PropertyCard';
import { savedKey, useSaved } from './saved';

export function SavedView({ items }: { items: MarketListing[] }) {
  const { ids, ready } = useSaved();
  const saved = ids
    .map((key) => items.find((m) => savedKey(m.ownerId, m.listing.id) === key))
    .filter((m): m is MarketListing => Boolean(m));
  const gone = ready ? ids.length - saved.length : 0;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-p1-text">Saved homes</h1>
      {ready && saved.length > 0 && <p className="mt-1 text-[14px] text-p1-text-3">{saved.length} saved on this device</p>}

      {!ready ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonPropertyCard key={i} />)}</div>
      ) : saved.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-p1-border bg-p1-surface">
          <EmptyState
            icon={<Heart size={22} />}
            title="Nothing saved yet"
            description="Tap the heart on any home to keep it here."
            action={<LinkButton href="/phase1/homes/search">Browse homes</LinkButton>}
          />
        </div>
      ) : (
        <ul className="vr-stagger mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {saved.map((m) => <li key={savedKey(m.ownerId, m.listing.id)}><PropertyCard item={m} /></li>)}
        </ul>
      )}
      {gone > 0 && <p className="mt-5 text-[13px] text-p1-text-3">{gone} saved {gone === 1 ? 'home is' : 'homes are'} no longer on the market.</p>}
    </div>
  );
}
