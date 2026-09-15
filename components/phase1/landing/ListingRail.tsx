"use client";

/**
 * A row of homes that scrolls sideways. Arrows on a desktop, a swipe on a
 * phone, and each card snaps into place so a half-card never rests at the edge.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MarketListing } from '../../../lib/phase1/marketplace';
import { PropertyCard } from '../market/PropertyCard';
import { cx } from '../kit';

export function ListingRail({ items, label }: { items: MarketListing[]; label: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const page = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.85, behavior: 'smooth' });

  const arrow = 'absolute top-[34%] z-10 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-p1-surface text-p1-text shadow-p1-lg ring-1 ring-p1-border transition-[opacity,transform] duration-200 hover:scale-105 disabled:pointer-events-none disabled:opacity-0 md:flex';

  return (
    <div className="relative">
      <button type="button" onClick={() => page(-1)} disabled={edges.start} aria-label="Previous homes" className={cx(arrow, '-left-5')}><ChevronLeft size={20} /></button>
      <ul
        ref={track}
        onScroll={measure}
        aria-label={label}
        className="p1-noscrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
      >
        {items.map((m, i) => (
          <li key={`${m.ownerId}/${m.listing.id}`} className="w-[78%] shrink-0 snap-start sm:w-[46%] md:w-[31%] xl:w-[calc(25%-12px)]">
            <PropertyCard item={m} priority={i < 4} />
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => page(1)} disabled={edges.end} aria-label="More homes" className={cx(arrow, '-right-5')}><ChevronRight size={20} /></button>
    </div>
  );
}
