"use client";

/**
 * The properties holding the plan's slots.
 *
 * This is what the subscription is paying for, so it is shown as property —
 * photographed, priced, placed — rather than as a count. Each card carries the
 * enquiries on record for it and, where views are counted, its views.
 */

import Link from 'next/link';
import { ArrowUpRight, BedDouble, Eye, MessageSquare, Ruler } from 'lucide-react';
import { Card, SectionHead, cx } from '../kit';
import { PropertyImage } from '../PropertyImage';
import { StatusChip } from '../bits';
import type { DemoListing } from '../../../lib/phase1/data';
import { coverPhoto } from '../../../lib/phase1/photos';
import { districtCode, districtLabel } from '../../../lib/phase1/districts';
import { priceLabel } from '../../../lib/phase1/pricing';
import { floorLabel } from '../../../lib/phase1/floor';

export interface PlanListing {
  l: DemoListing;
  enquiries: number;
  /** Null when views are not counted for this listing. */
  views30d: number | null;
}

export function PlanListings({ items, used, ownerId }: { items: PlanListing[]; used: number; ownerId?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="plan-props-h">
      <SectionHead
        id="plan-props-h"
        title="Holding your slots"
        hint={items.length < used ? `The ${items.length} most viewed of ${used} listings using your allowance` : `The ${used} ${used === 1 ? 'listing' : 'listings'} using your allowance`}
        href="/phase1/listings"
        linkLabel="Manage listings"
      />
      <ul className="vr-stagger -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3">
        {items.map(({ l, enquiries, views30d }) => {
          const price = priceLabel(l);
          return (
            <li key={l.id} className="w-[82%] shrink-0 snap-start sm:w-auto">
              <Card as="article" padding="none" className="group h-full overflow-hidden transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-p1-md">
                <Link href={`/phase1/listings/${l.id}`} className="flex h-full flex-col focus-visible:outline-none">
                  <div className="relative overflow-hidden">
                    <PropertyImage
                      seed={l.reference + l.project}
                      src={coverPhoto(ownerId, l, 'thumb')}
                      alt={`${l.project}, ${districtLabel(l.district)}`}
                      rounded="rounded-none"
                      className="aspect-[16/10] w-full transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                    <span className="absolute left-3 top-3"><StatusChip status={l.status} /></span>
                    <span className="absolute bottom-3 right-3 rounded-md bg-p1-surface/95 px-2 py-1 text-[12px] font-semibold text-p1-text shadow-p1-sm">
                      {price.amount}<span className="font-normal text-p1-text-3">{price.suffix}</span>
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-semibold text-p1-text">{l.project}</h3>
                        <p className="mt-0.5 truncate text-[12.5px] text-p1-text-3">{districtCode(l.district)} · {districtLabel(l.district)}{floorLabel(l) ? ` · ${floorLabel(l)}` : ''}</p>
                      </div>
                      <ArrowUpRight size={16} aria-hidden className="mt-0.5 shrink-0 text-p1-text-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-p1-primary" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 text-[12.5px] text-p1-text-2">
                      <span className="inline-flex items-center gap-1"><BedDouble size={13} aria-hidden className="text-p1-text-3" />{l.bedrooms} bed</span>
                      <span className="inline-flex items-center gap-1"><Ruler size={13} aria-hidden className="text-p1-text-3" />{l.sizeSqft.toLocaleString('en-SG')} sqft</span>
                    </div>
                    <div className="mt-auto pt-3.5">
                      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-p1-border bg-p1-border">
                        <div className="bg-p1-surface px-3 py-2">
                          <dt className="flex items-center gap-1 text-[11.5px] text-p1-text-3"><Eye size={11} aria-hidden /> Views, 30d</dt>
                          <dd className={cx('mt-0.5 text-[15px] font-semibold tabular-nums', views30d === null ? 'text-p1-text-3' : 'text-p1-text')}>
                            {views30d === null ? 'Not counted' : views30d.toLocaleString('en-SG')}
                          </dd>
                        </div>
                        <div className="bg-p1-surface px-3 py-2">
                          <dt className="flex items-center gap-1 text-[11.5px] text-p1-text-3"><MessageSquare size={11} aria-hidden /> Enquiries</dt>
                          <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-p1-text">{enquiries}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </Link>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
