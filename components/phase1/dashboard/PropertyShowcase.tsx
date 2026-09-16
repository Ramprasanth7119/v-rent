"use client";

/**
 * Your properties — the part of the dashboard that looks like a property
 * product rather than an analytics one.
 *
 * The listing doing the most work this week is given a photograph at a size
 * worth looking at, with its numbers beneath it; the others follow as compact
 * rows so the section stays one idea. Every figure is the listing's own, and
 * the ranking is views over seven days — stated, so nobody has to guess what
 * "top" means.
 */

import Link from 'next/link';
import React from 'react';
import { ArrowRight, Bath, BedDouble, Bookmark, Eye, MessageSquare, Ruler, Sparkles } from 'lucide-react';
import { Card, cx } from '../kit';
import { PropertyImage } from '../PropertyImage';
import { StatusChip } from '../bits';
import { DemoListing } from '../../../lib/phase1/data';
import { ListingStats } from '../../../lib/phase1/performance';
import { coverPhoto } from '../../../lib/phase1/photos';
import { districtLabel } from '../../../lib/phase1/districts';
import { priceLabel } from '../../../lib/phase1/pricing';
import { Delta, SectionHead } from './parts';

export interface ShowcaseItem { l: DemoListing; s: ListingStats }

function Spec({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-p1-text-2">
      <span className="text-p1-text-3" aria-hidden>{icon}</span>{children}
    </span>
  );
}

function Figure({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: number; delta?: number }) {
  return (
    <div className="bg-p1-surface px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-p1-text-3">
        <span aria-hidden>{icon}</span>{label}
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-p1display text-[20px] font-bold leading-none tabular-nums text-p1-text">{value.toLocaleString('en-SG')}</span>
        {typeof delta === 'number' && <Delta pct={delta} since="previous 7 days" />}
      </div>
    </div>
  );
}

export function PropertyShowcase({ items, ownerId, liveCount }: { items: ShowcaseItem[]; ownerId?: string; liveCount: number }) {
  if (items.length === 0) return null;
  const [best, ...rest] = items;
  const price = priceLabel(best.l);

  return (
    <section aria-labelledby="props-h">
      <SectionHead
        id="props-h"
        title="Your properties"
        hint={`${liveCount} live on the tenant site · ranked by views over the last 7 days`}
        href="/phase1/listings"
        linkLabel="All listings"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------------- spotlight */}
        <Card padding="none" as="article" className="group vr-rise overflow-hidden">
          <Link href={`/phase1/listings/${best.l.id}`} className="block">
            <div className="relative overflow-hidden">
              <PropertyImage
                seed={best.l.reference + best.l.project}
                src={coverPhoto(ownerId, best.l, 'full')}
                alt={`${best.l.project}, ${districtLabel(best.l.district)}`}
                rounded="rounded-none"
                eager
                label
                className="aspect-[16/9] w-full transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              />
              <span className="absolute left-3 top-3"><StatusChip status={best.l.status} /></span>
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-p1-surface/95 px-2 py-1 text-[11.5px] font-semibold text-p1-text shadow-p1-sm">
                <Sparkles size={12} className="text-p1-accent-text" aria-hidden /> Best this week
              </span>
            </div>

            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <h3 className="truncate font-p1display text-[19px] font-semibold tracking-[-0.01em] text-p1-text">{best.l.project}</h3>
                  <p className="mt-0.5 truncate text-[13px] text-p1-text-3">{best.l.unitNo} · {districtLabel(best.l.district)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-p1display text-[20px] font-bold tracking-[-0.01em] text-p1-primary">{price.amount}</span>
                  <span className="text-[13px] text-p1-text-3">{price.suffix}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <Spec icon={<BedDouble size={14} />}>{best.l.bedrooms} bed</Spec>
                <Spec icon={<Bath size={14} />}>{best.l.bathrooms} bath</Spec>
                <Spec icon={<Ruler size={14} />}>{best.l.sizeSqft.toLocaleString('en-SG')} sqft</Spec>
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-3 gap-px border-t border-p1-border bg-p1-border">
            <Figure icon={<Eye size={12} />} label="Views, 7 days" value={best.s.views7d} />
            <Figure icon={<Bookmark size={12} />} label="Saves, 30 days" value={best.s.saves} />
            <Figure icon={<MessageSquare size={12} />} label="Enquiries, 7 days" value={best.s.enquiries7d} delta={best.s.trendPct} />
          </div>
        </Card>

        {/* ------------------------------------------------------ the others */}
        <ul className="vr-stagger grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {rest.map(({ l, s }) => {
            const p = priceLabel(l);
            return (
              <li key={l.id}>
                <Link
                  href={`/phase1/listings/${l.id}`}
                  className={cx(
                    'group flex items-stretch gap-3 overflow-hidden rounded-xl border border-p1-border bg-p1-surface p-2.5',
                    'transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-p1-border-strong hover:shadow-p1-md',
                  )}
                >
                  <PropertyImage
                    seed={l.reference + l.project}
                    src={coverPhoto(ownerId, l)}
                    alt=""
                    rounded="rounded-lg"
                    className="h-[84px] w-[104px] shrink-0"
                  />
                  <span className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold text-p1-text">{l.project}</span>
                      <span className="mt-0.5 block truncate text-[12px] text-p1-text-3">
                        {districtLabel(l.district)} · {l.bedrooms} bed · {l.sizeSqft.toLocaleString('en-SG')} sqft
                      </span>
                    </span>
                    <span className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="text-[13.5px] font-semibold text-p1-primary">
                        {p.amount}<span className="font-normal text-p1-text-3">{p.suffix}</span>
                      </span>
                      <span className="flex items-center gap-3 text-[12px] text-p1-text-2">
                        <span className="inline-flex items-center gap-1"><Eye size={12} className="text-p1-text-3" aria-hidden /><span className="font-semibold tabular-nums">{s.views7d}</span></span>
                        <span className="inline-flex items-center gap-1"><MessageSquare size={12} className="text-p1-text-3" aria-hidden /><span className="font-semibold tabular-nums">{s.enquiries7d}</span></span>
                      </span>
                    </span>
                  </span>
                  <ArrowRight size={15} aria-hidden className="mt-1 shrink-0 self-start text-p1-text-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
