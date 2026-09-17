"use client";

/**
 * The live listings doing the most work, photographed.
 *
 * The ranking says what it ranks by. With traffic measured (the demo
 * account) that is views over seven days; without it, it is the enquiries
 * and viewings actually recorded over thirty, and no view count is shown.
 */

import Link from 'next/link';
import React from 'react';
import { Building2, CalendarCheck, Eye, MessageSquare, Plus } from 'lucide-react';
import { Delta, LinkButton, cx } from '../kit';
import { PropertyImage } from '../PropertyImage';
import { ListingPerformance, rankListings } from '../../../lib/phase1/dashboard';
import { LISTING_STATUS_LABEL } from '../../../lib/phase1/data';
import { coverPhoto } from '../../../lib/phase1/photos';
import { districtLabel } from '../../../lib/phase1/districts';
import { priceLabel } from '../../../lib/phase1/pricing';
import { ACCENT, Panel, PanelEmpty, Pill } from './parts';

export function TopListings({ perf, ownerId, className = '' }: { perf: ListingPerformance[]; ownerId?: string; className?: string }) {
  const { rows, byViews } = rankListings(perf);
  const top = rows.slice(0, 4);
  const score = (p: ListingPerformance) => (byViews ? p.views7d : p.enquiries30d + p.viewings);
  const max = Math.max(1, ...top.map(score));

  return (
    <Panel
      id="top-h"
      title="Top performing listings"
      meta={top.length ? (byViews ? 'By views, last 7 days' : 'By enquiries and viewings, last 30 days') : undefined}
      href="/phase1/listings"
      linkLabel="All listings"
      className={className}
    >
      {top.length === 0 ? (
        <PanelEmpty
          icon={<Building2 size={18} />}
          title="No live listings yet"
          body="Your listings are ranked here once they are live on the tenant site."
          action={<LinkButton href="/phase1/listings/new" size="sm" leftIcon={<Plus size={14} />}>New listing</LinkButton>}
        />
      ) : (
        <ul className="vr-stagger grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:gap-4 sm:px-5 sm:pb-5 xl:grid-cols-4">
          {top.map((p, i) => {
            const price = priceLabel(p.l);
            const pct = Math.round((score(p) / max) * 100);
            return (
              <li key={p.l.id} className="min-w-0">
                <Link
                  href={`/phase1/listings/${p.l.id}`}
                  className="group flex h-full flex-row overflow-hidden rounded-xl sm:flex-col border border-p1-border bg-p1-surface transition-[border-color,box-shadow] duration-200 hover:border-p1-border-strong hover:shadow-p1-md"
                >
                  <span className="relative block w-[116px] shrink-0 overflow-hidden sm:w-auto">
                    <PropertyImage
                      seed={p.l.reference + p.l.project}
                      src={coverPhoto(ownerId, p.l)}
                      alt={`${p.l.project}, ${districtLabel(p.l.district)}`}
                      rounded="rounded-none"
                      className="h-full min-h-[132px] w-full transition-transform sm:h-auto sm:min-h-0 sm:aspect-[16/10] duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                    <span className="absolute left-2.5 top-2.5 hidden sm:block"><Pill accent="green" className="shadow-p1-sm">{LISTING_STATUS_LABEL.published}</Pill></span>
                    <span className="absolute right-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center rounded-md bg-p1-surface/95 px-1.5 text-[11.5px] font-bold tabular-nums text-p1-text shadow-p1-sm">
                      #{i + 1}
                    </span>
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col p-3 sm:p-3.5">
                    <span className="block truncate text-[14px] font-semibold text-p1-text group-hover:text-p1-primary">{p.l.project}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-p1-text-3">
                      {districtLabel(p.l.district)} · {p.l.bedrooms} bed · {p.l.sizeSqft.toLocaleString('en-SG')} sqft
                    </span>
                    <span className="mt-2 block text-[14px] font-bold text-p1-text">
                      {price.amount}<span className="text-[12px] font-normal text-p1-text-3">{price.suffix}</span>
                    </span>

                    <span className="mt-auto block pt-3">
                      <span className="flex items-center justify-between gap-2 text-[12px] text-p1-text-2">
                        {byViews ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Eye size={13} aria-hidden className="text-p1-text-3" />
                            <span className="font-semibold tabular-nums text-p1-text">{p.views7d.toLocaleString('en-SG')}</span> views
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-3">
                            <span className="inline-flex items-center gap-1"><MessageSquare size={13} aria-hidden className="text-p1-text-3" /><span className="font-semibold tabular-nums text-p1-text">{p.enquiries30d}</span><span className="sr-only"> enquiries</span></span>
                            <span className="inline-flex items-center gap-1"><CalendarCheck size={13} aria-hidden className="text-p1-text-3" /><span className="font-semibold tabular-nums text-p1-text">{p.viewings}</span><span className="sr-only"> viewings</span></span>
                          </span>
                        )}
                        {byViews
                          ? p.growthPct !== null && <Delta pct={p.growthPct} since="previous 7 days" />
                          : <span className="text-[11.5px] text-p1-text-3">30 days</span>}
                      </span>
                      <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full bg-p1-subtle">
                        <span className={cx('vr-grow block h-full rounded-full', byViews ? ACCENT.blue.bar : ACCENT.violet.bar)} style={{ width: `${Math.max(3, pct)}%` }} />
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
