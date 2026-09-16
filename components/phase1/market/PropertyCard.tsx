"use client";

/**
 * The property card.
 *
 * The photograph leads and the price is the strongest text on it. Beneath that
 * one line of facts and one line of place — anything more belongs on the
 * listing itself. Save is always reachable; the verified mark is small.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, ShieldCheck, TrainFront, Camera } from 'lucide-react';
import type { MarketListing } from '../../../lib/phase1/marketplace';
import { PropertyImage } from '../PropertyImage';
import { Tooltip, cx } from '../kit';
import { useSaved, savedKey } from './saved';
import { facts, isNew, isSale, mrt, place, price } from './format';
import { TODAY } from '../../../lib/phase1/workspace';

export const homeHref = (m: Pick<MarketListing, 'ownerId' | 'listing'>) => `/phase1/homes/${m.ownerId}/${m.listing.id}`;

export function SaveButton({ ownerId, listingId, className = '', size = 'md', withLabel = false }: { ownerId: string; listingId: string; className?: string; size?: 'sm' | 'md'; withLabel?: boolean }) {
  const { isSaved, toggle, ready } = useSaved();
  const key = savedKey(ownerId, listingId);
  const on = ready && isSaved(key);
  const [pop, setPop] = useState(0);

  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const now = toggle(key);
    if (now) setPop((n) => n + 1);
  };

  if (withLabel) {
    return (
      <button type="button" onClick={click} aria-pressed={on} className={cx('p1-press inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-p1-border-strong bg-p1-surface px-3 text-[13.5px] font-medium text-p1-text hover:bg-p1-subtle', className)}>
        <Heart key={pop} size={16} className={cx(on ? 'fill-p1-danger text-p1-danger' : 'text-p1-text-2', pop > 0 && on && 'p1-heart-pop')} aria-hidden />
        {on ? 'Saved' : 'Save'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={on}
      aria-label={on ? 'Remove from saved homes' : 'Save this home'}
      className={cx(
        'p1-press flex cursor-pointer items-center justify-center rounded-full bg-p1-surface/95 shadow-p1-sm ring-1 ring-black/5 backdrop-blur hover:bg-p1-surface',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        className,
      )}
    >
      <Heart key={pop} size={size === 'sm' ? 15 : 17} strokeWidth={2} className={cx('transition-colors duration-150', on ? 'fill-p1-danger text-p1-danger' : 'text-p1-text', pop > 0 && on && 'p1-heart-pop')} aria-hidden />
    </button>
  );
}

export function PropertyCard({
  item, today = TODAY, active = false, onHover, variant = 'default', priority = false,
}: {
  item: MarketListing;
  today?: Date;
  active?: boolean;
  onHover?: (hovering: boolean) => void;
  /** `row` for the dense list beside the map on a narrow desktop. */
  variant?: 'default' | 'row';
  priority?: boolean;
}) {
  const l = item.listing;
  const p = price(l);
  const station = mrt(l);
  const href = homeHref(item);
  const fresh = isNew(l, today);

  if (variant === 'row') {
    return (
      <article
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
        className={cx('group relative flex gap-3 rounded-xl border bg-p1-surface p-2.5 transition-[border-color,box-shadow] duration-200', active ? 'border-p1-primary shadow-p1-md' : 'border-p1-border hover:border-p1-border-strong hover:shadow-p1-sm')}
      >
        <Link href={href} className="relative block w-32 shrink-0 overflow-hidden rounded-lg sm:w-40" aria-label={`${l.project}, ${p.amount}${p.unit}`}>
          <PropertyImage seed={l.reference + l.project} src={item.thumbs[0]} alt="" rounded="rounded-lg" className="aspect-[4/3] h-full w-full" />
        </Link>
        <div className="min-w-0 flex-1 py-0.5 pr-8">
          <div className="font-p1display text-[17px] font-bold tracking-[-0.015em] tabular-nums text-p1-primary">{p.amount}<span className="text-[13px] font-medium text-p1-text-3">{p.unit}</span></div>
          <div className="mt-0.5 text-[13px] text-p1-text-2">{facts(l)}</div>
          <Link href={href} className="mt-1.5 block truncate text-[14px] font-medium text-p1-text after:absolute after:inset-0">{l.project}</Link>
          <div className="truncate text-[12.5px] text-p1-text-3">{place(l)}</div>
        </div>
        <SaveButton ownerId={item.ownerId} listingId={l.id} size="sm" className="absolute right-2.5 top-2.5 z-[1] shadow-none ring-p1-border" />
      </article>
    );
  }

  return (
    <article
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={cx(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-p1-surface transition-[border-color,box-shadow,transform] duration-200 ease-out',
        active ? 'border-p1-primary shadow-p1-md' : 'border-p1-border hover:-translate-y-0.5 hover:shadow-p1-md',
      )}
    >
      <div className="relative">
        <PropertyImage seed={l.reference + l.project} src={item.thumbs[0]} alt="" rounded="rounded-none" className="aspect-[4/3] w-full" eager={priority} />
        <div className="pointer-events-none absolute left-3 top-3 flex gap-1.5">
          {fresh && <span className="rounded-md bg-p1-surface/95 px-2 py-1 text-[11.5px] font-semibold text-p1-text shadow-p1-sm">New</span>}
          {isSale(l) && <span className="rounded-md bg-p1-text/85 px-2 py-1 text-[11.5px] font-semibold text-p1-bg">For sale</span>}
        </div>
        {item.photos.length > 1 && (
          <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[11.5px] font-medium tabular-nums text-white">
            <Camera size={11} aria-hidden /> {item.photos.length}
          </span>
        )}
        <SaveButton ownerId={item.ownerId} listingId={l.id} className="absolute right-3 top-3 z-[2]" />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <div className="flex items-start justify-between gap-2">
          {/* The product's blue, as on the agent's own cards. A tenant and an
              agent looking at the same flat should see the same price in the
              same colour. */}
          <div className="font-p1display text-[20px] font-bold leading-7 tracking-[-0.02em] tabular-nums text-p1-primary">
            {p.amount}<span className="ml-0.5 text-[13.5px] font-medium text-p1-text-3">{p.unit}</span>
          </div>
          {item.agent.verified && (
            <Tooltip content="Listed by a CEA-verified agent">
              <span className="relative z-[2] mt-1 inline-flex items-center gap-1 rounded-md bg-p1-success-soft px-1.5 py-0.5 text-[11.5px] font-semibold text-p1-success" tabIndex={0}>
                <ShieldCheck size={12} aria-hidden /> Verified
              </span>
            </Tooltip>
          )}
        </div>
        <div className="text-[13.5px] text-p1-text-2">{facts(l)}</div>
        <Link href={href} className="mt-2.5 truncate text-[15px] font-medium text-p1-text after:absolute after:inset-0 after:z-[1] focus-visible:outline-none">
          {l.project}
        </Link>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-p1-text-3">
          <span className="truncate">{place(l)}</span>
          {station && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex min-w-0 items-center gap-1 truncate"><TrainFront size={12} className="shrink-0" aria-hidden />{station}</span>
            </>
          )}
        </div>
      </div>
      {/* The whole card is the link; this ring shows keyboard focus on it. */}
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-p1-primary group-has-[a:focus-visible]:ring-2" aria-hidden />
    </article>
  );
}
