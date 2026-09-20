"use client";

/**
 * Performance for the agent's own listings (Demo Data OFF).
 *
 * Nothing counts views or saves until the tenant site is live, so none are
 * drawn and none are estimated. What is real is shown in full: the listings
 * themselves, the enquiries stored against them, the viewings booked, and the
 * completeness of each listing.
 */

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, Building2, CalendarCheck, HeartPulse, MessageSquare } from 'lucide-react';
import { KPI, LinkButton, cx } from '../kit';
import { PropertyImage } from '../PropertyImage';
import { StatusBadge } from '../status';
import { HealthRing } from '../listing/health';
import type { DemoListing } from '../../../lib/phase1/data';
import type { Enquiry } from '../../../lib/phase1/workspace';
import { priceLabel } from '../../../lib/phase1/pricing';
import { coverPhoto } from '../../../lib/phase1/photos';
import { districtName, enquiriesFor } from '../../../lib/phase1/performance';
import { listingHealth } from '../../../lib/phase1/health';

export function LiveView({ live, enquiries, waiting, ownerId }: {
  live: DemoListing[]; enquiries: Enquiry[]; waiting: number; ownerId?: string;
}) {
  const rows = useMemo(() => live
    .map((l) => {
      const mine = enquiriesFor(enquiries, l.id);
      return { l, enquiries: mine.length, viewings: mine.filter((e) => e.status === 'viewing').length, health: listingHealth(l).score };
    })
    .sort((a, b) => b.enquiries - a.enquiries || b.health - a.health), [live, enquiries]);

  const published = live.filter((l) => l.status === 'published').length;
  const viewings = enquiries.filter((e) => e.status === 'viewing').length;
  const avgHealth = rows.length ? Math.round(rows.reduce((n, r) => n + r.health, 0) / rows.length) : 0;
  const topEnq = Math.max(1, ...rows.map((r) => r.enquiries));

  return (
    <div className="vr-stagger space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KPI label="Live listings" value={published} of={live.length} icon={<Building2 size={17} />} iconTone="primary" sub="Published of all live" href="/phase1/listings?status=published" />
        <KPI label="Enquiries" value={enquiries.length} icon={<MessageSquare size={17} />} iconTone="success" sub={waiting ? `${waiting} waiting for a reply` : 'None waiting'} href="/phase1/enquiries" />
        <KPI label="Viewings booked" value={viewings} icon={<CalendarCheck size={17} />} iconTone="accent" sub="From your enquiries" href="/phase1/viewings" />
        <KPI label="Average listing health" value={avgHealth} suffix="%" icon={<HeartPulse size={17} />} iconTone="info" tone={avgHealth >= 80 ? 'success' : 'default'} sub="Photos, description, terms" />
      </div>

      {/* Traffic: stated, not drawn. The frame keeps the page's shape without pretending to be a chart. */}
      <section aria-labelledby="perf-unmeasured-h" className="relative overflow-hidden rounded-2xl border border-p1-border bg-p1-surface shadow-p1-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'linear-gradient(to bottom, var(--p1-border) 1px, transparent 1px)',
            backgroundSize: '100% 44px',
            maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
          }}
        />
        <div className="relative flex flex-col items-center px-6 py-12 text-center sm:py-14">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-p1-border bg-p1-surface text-p1-text-3 shadow-p1-sm" aria-hidden>
            <BarChart3 size={22} />
          </span>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-p1-subtle px-2.5 py-1 text-[12px] font-medium text-p1-text-2">
            <span className="h-1.5 w-1.5 rounded-full bg-p1-text-3" aria-hidden /> Not measured yet
          </span>
          <h2 id="perf-unmeasured-h" className="mt-3 font-p1display text-[19px] font-bold tracking-[-0.01em] text-p1-text">Views, saves and enquiry rate</h2>
          <p className="mt-1.5 max-w-md text-[13.5px] leading-5 text-p1-text-3">
            These are counted once the tenant site is live. Until then nothing is estimated for your listings, so there is no trend to chart. Your enquiries below are real.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <LinkButton href="/phase1/enquiries" variant="outline" size="sm">Open enquiries</LinkButton>
          </div>
          <p className="mt-3 text-[12px] text-p1-text-3">To preview this report with sample figures, turn on Demo data in the header.</p>
        </div>
      </section>

      <section aria-labelledby="perf-own-h" className="overflow-hidden rounded-2xl border border-p1-border bg-p1-surface shadow-p1-sm">
        <div className="border-b border-p1-border px-5 py-4">
          <h2 id="perf-own-h" className="text-[15px] font-semibold tracking-[-0.01em] text-p1-text">Your live listings</h2>
          <p className="mt-0.5 text-[12.5px] text-p1-text-3">Ranked by enquiries received</p>
        </div>
        <ul className="divide-y divide-p1-border">
          {rows.map(({ l, enquiries: n, viewings: v }) => {
            const p = priceLabel(l);
            return (
              <li key={l.id}>
                <Link href={`/phase1/listings/${l.id}`} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-p1-subtle/60 focus-visible:bg-p1-subtle focus-visible:outline-none sm:px-5 md:grid-cols-[minmax(0,1fr)_minmax(100px,180px)_auto_auto]">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg">
                      <PropertyImage seed={l.reference + l.project} src={coverPhoto(ownerId, l)} alt="" rounded="rounded-lg" className="h-full w-full transition-transform duration-300 group-hover:scale-[1.06] motion-reduce:transform-none" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-semibold text-p1-text">{l.project}</span>
                        {l.status !== 'published' && <StatusBadge kind="listing" value={l.status} size="sm" showHelp={false} />}
                      </span>
                      <span className="block truncate text-[12.5px] text-p1-text-3">{districtName(l.district)} · {p.amount}{p.suffix}</span>
                    </span>
                  </span>
                  <span className="hidden h-2 overflow-hidden rounded-full bg-p1-subtle md:block" aria-hidden>
                    <span className={cx('block h-full rounded-full', n ? 'bg-p1-success' : '')} style={{ width: `${(n / topEnq) * 100}%` }} />
                  </span>
                  <span className="text-right">
                    <span className="block text-[14px] font-semibold tabular-nums text-p1-text">{n} <span className="font-normal text-p1-text-3">enq.</span></span>
                    <span className="block text-[12px] tabular-nums text-p1-text-3">{v} viewing{v === 1 ? '' : 's'}</span>
                  </span>
                  <span className="hidden items-center gap-3 md:flex">
                    <HealthRing listing={l} size={32} />
                    <ArrowRight size={15} className="text-p1-text-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
