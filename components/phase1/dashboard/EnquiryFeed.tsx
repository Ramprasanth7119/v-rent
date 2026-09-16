"use client";

/**
 * Who asked, about what, and how long ago.
 *
 * The property is shown, not just named: an agent with eleven listings reads a
 * photograph faster than a project name, and the thumbnail is the only reason
 * this reads as a property product rather than an inbox. Unanswered enquiries
 * sort first and carry a dot, because the cost of this list is a tenant who
 * waited.
 */

import Link from 'next/link';
import React from 'react';
import { ArrowRight, Building2, MessageSquare } from 'lucide-react';
import { Avatar, Card, cx } from '../kit';
import { PropertyImage } from '../PropertyImage';
import { DemoListing } from '../../../lib/phase1/data';
import { Enquiry } from '../../../lib/phase1/workspace';
import { sgRelative } from '../../../lib/phase1/format';
import { coverPhoto } from '../../../lib/phase1/photos';
import { enquiryTime, readStage } from '../../../lib/phase1/enquiries';
import { DemoBadge } from '../DemoDataSwitch';
import { NextAction } from '../enquiries/parts';

export function EnquiryFeed({
  enquiries, byId, isOwn, ownerId, now, demo = false, replied, total,
}: {
  enquiries: Enquiry[];
  byId: Map<string, DemoListing>;
  /** Only the agent's own listings have photographs to show. */
  isOwn: (listingId: string) => boolean;
  ownerId?: string;
  now: Date;
  /** The demo set is on screen. */
  demo?: boolean;
  /** Enquiries that have had a reply, of `total` in the workspace. */
  replied: number;
  total: number;
}) {
  const rate = total ? Math.round((replied / total) * 100) : null;
  const photo = (l: DemoListing) => (isOwn(l.id) ? coverPhoto(ownerId, l) : undefined);

  return (
    <Card padding="none" as="section" aria-labelledby="enq-h" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <h2 id="enq-h" className="flex items-center gap-2 text-[15px] font-semibold text-p1-text">Recent enquiries{demo && <DemoBadge />}</h2>
          {rate !== null && (
            <p className="mt-0.5 text-[12px] text-p1-text-3">
              <span className="font-semibold tabular-nums text-p1-text-2">{rate}%</span> answered, all time
            </p>
          )}
        </div>
        <Link href="/phase1/enquiries" className="shrink-0 text-[13px] font-medium text-p1-primary hover:underline underline-offset-4">View all</Link>
      </div>

      {enquiries.length === 0 ? (
        <div className="border-t border-p1-border px-5 py-8 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-p1-border bg-p1-subtle text-p1-text-3" aria-hidden>
            <MessageSquare size={19} />
          </span>
          <div className="mt-3 text-[14px] font-semibold text-p1-text">No enquiries yet</div>
          <p className="mx-auto mt-1 max-w-[30ch] text-[13px] leading-5 text-p1-text-3">
            Tenants who write about a live listing land here, with the property they asked about.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-p1-border border-t border-p1-border">
          {enquiries.map((e) => {
            const l = byId.get(e.listingId);
            const fresh = e.status === 'new';
            const r = readStage(e, now);
            return (
              <li key={e.id}>
                <Link href={`/phase1/enquiries?enquiry=${encodeURIComponent(e.id)}`} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-p1-subtle/60">
                  <span className="relative shrink-0">
                    <Avatar name={e.name} size="sm" tone={fresh ? 'primary' : 'neutral'} />
                    {fresh && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-p1-primary ring-2 ring-p1-surface" aria-hidden />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cx('truncate text-[13.5px] text-p1-text', fresh ? 'font-semibold' : 'font-medium')}>
                        {e.name}{fresh && <span className="sr-only"> (unanswered)</span>}
                      </span>
                      <span suppressHydrationWarning className="shrink-0 text-[12px] tabular-nums text-p1-text-3">{sgRelative(new Date(enquiryTime(e)), now)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-p1-text-3">
                      {l ? l.project : 'Listing removed'}
                    </span>
                    <NextAction r={r} small className="mt-0.5" />
                  </span>

                  {l && (photo(l)
                    ? (
                      <PropertyImage
                        seed={l.reference + l.project}
                        src={photo(l)}
                        alt=""
                        rounded="rounded-lg"
                        className="h-11 w-11 shrink-0"
                      />
                    )
                    : (
                      /* The stand-in drawing is a building at the size of a
                         photograph; shrunk to a thumbnail it is illegible, so a
                         listing without one gets a mark instead of a smudge. */
                      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-p1-border bg-p1-subtle text-p1-text-3">
                        <Building2 size={16} />
                      </span>
                    )
                  )}
                  <ArrowRight size={14} aria-hidden className="shrink-0 text-p1-text-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
