"use client";

/**
 * Listing card and table row. The property is the hero; chrome is limited to
 * status, health, pulse, and one menu.
 */

import React from 'react';
import Link from 'next/link';
import { Bed, Bath, Maximize, Camera, AlertCircle } from 'lucide-react';
import { DemoListing, sgd } from '../../../lib/phase1/data';
import { PropertyImage } from '../PropertyImage';
import { coverPhoto } from '../../../lib/phase1/photos';
import { DEAL_LABEL, dealOf, priceLabel } from '../../../lib/phase1/pricing';
import { useSession } from '../../../lib/phase1/SessionContext';
import { StatusBadge } from '../status';
import { Menu, MenuItem, cx } from '../kit';
import { HealthRing } from './health';
import { Pulse, StatsInline } from './pulse';
import { isMeasured } from '../../../lib/phase1/performance';
import { sgDate, sgDateShort } from '../../../lib/phase1/format';

export const fmtDate = (d: string) => sgDate(d);
/* Pinned to Singapore in `lib/phase1/format`, so the server and the browser
   agree and a date-only value does not slip back a day. */
export const fmtShort = sgDateShort;
export const district = (n: number) => `D${String(n).padStart(2, '0')}`;

export function daysUntil(iso: string | undefined, today: Date) {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - today.getTime()) / 86400000);
}

export function ListingCard({ l, menu, today, href }: { l: DemoListing; menu: (MenuItem | 'divider')[]; today: Date; href?: string }) {
  const { user } = useSession();
  const to = href ?? `/phase1/listings/${l.id}`;
  const expiring = l.status === 'published' ? daysUntil(l.expiresAt, today) : null;
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl bg-p1-surface shadow-p1-sm ring-1 ring-p1-border transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-p1-md">
      <Link href={to} className="relative block overflow-hidden bg-p1-primary" aria-label={`${l.project} ${l.unitNo}`}>
        {/* 1.5% and 300ms. A photograph that leaps is a photograph the eye
            follows instead of reading the card under it. */}
        <PropertyImage seed={l.reference + l.project} variant={0} rounded="rounded-none" src={coverPhoto(user?.id, l)} alt="" className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]" />
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5"><StatusBadge kind="listing" value={l.status} size="sm" className="shadow-p1-sm" /></div>
        <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[11.5px] font-medium text-white backdrop-blur"><Camera size={11} aria-hidden /> {l.images}</span>
        {l.images === 0 && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-[12px] font-medium text-white">No photos yet</span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {/* Name, then place, then facts, then the figure — the order every
            reference board uses, and the order an agent scanning a grid reads
            in: which property, where, what shape, how much. The price moved to
            the foot of the card and turned blue, because across the reference
            set the price is the one number allowed to carry the accent. */}
        <div className="flex items-start justify-between gap-2">
          <Link href={to} className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-p1-text">{l.project} <span className="font-normal text-p1-text-2">{l.unitNo}</span></div>
            <div className="truncate text-[13px] text-p1-text-3">{l.address} · {district(l.district)}</div>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <HealthRing listing={l} size={34} />
            <Menu items={menu} label={`Actions for ${l.project}`} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12.5px] text-p1-text-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-p1-subtle px-2.5 py-1"><Bed size={13} className="text-p1-text-3" aria-hidden />{l.bedrooms}<span className="sr-only"> bedrooms</span></span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-p1-subtle px-2.5 py-1"><Bath size={13} className="text-p1-text-3" aria-hidden />{l.bathrooms}<span className="sr-only"> bathrooms</span></span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-p1-subtle px-2.5 py-1"><Maximize size={13} className="text-p1-text-3" aria-hidden />{l.sizeSqft.toLocaleString()} sqft</span>
          <span className="inline-flex items-center rounded-full bg-p1-subtle px-2.5 py-1 text-p1-text-3">{l.propertyType}</span>
        </div>
        {l.status === 'rejected' && l.rejectionReason && (
          <p className="mt-2.5 flex items-start gap-1.5 rounded-md bg-p1-danger-soft px-2.5 py-1.5 text-[12.5px] leading-5 text-p1-danger"><AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden />{l.rejectionReason}</p>
        )}
        {/* Not `mt-auto`. Cards in a row stretch to the tallest, and pushing
            this block to the floor opened a hole in the middle of every card
            shorter than its neighbour. Packed to the top, the slack falls
            below the last line, where a border already says the card ends and
            it reads as padding instead of a gap. */}
        <div className="mt-3.5 flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5 border-t border-p1-border pt-3">
          <div className="font-p1display text-[19px] font-bold leading-6 tracking-[-0.02em] text-p1-primary">
            <span className="tabular-nums">{priceLabel(l).amount}</span>
            <span className="text-[12.5px] font-medium text-p1-text-3">{priceLabel(l).suffix && ` ${priceLabel(l).suffix}`}</span>
          </div>
          {expiring !== null && expiring <= 30 ? (
            <span className={cx('text-[12px] font-medium', expiring <= 7 ? 'text-p1-danger' : 'text-p1-warning')}>Expires in {expiring} day{expiring === 1 ? '' : 's'}</span>
          ) : (l.status === 'published' || l.status === 'paused') && isMeasured(l) ? <Pulse listing={l} showSpark={false} /> : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {l.status === 'published' || l.status === 'paused' || l.status === 'expired' ? <StatsInline listing={l} /> : <span className="text-[12px] text-p1-text-3">Updated {fmtShort(l.updatedAt ?? l.createdAt)}</span>}
        </div>
      </div>
    </article>
  );
}

/** Compact property cell used by tables: thumbnail, name, address. */
export function PropertyCell({ l, href, sub }: { l: DemoListing; href?: string; sub?: React.ReactNode }) {
  const { user } = useSession();
  const inner = (
    <>
      <PropertyImage seed={l.reference + l.project} variant={0} src={coverPhoto(user?.id, l)} alt="" className="h-11 w-[60px] shrink-0 rounded-md" />
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold text-p1-text">{l.project}</span>
        <span className="block truncate text-[12.5px] text-p1-text-3">{sub ?? <>{l.unitNo} · {l.address} · {district(l.district)}</>}</span>
      </span>
    </>
  );
  return href ? <Link href={href} className="flex items-center gap-3">{inner}</Link> : <span className="flex items-center gap-3">{inner}</span>;
}
