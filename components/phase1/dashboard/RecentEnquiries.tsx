"use client";

/**
 * Who asked, about which property, where it stands, and how long ago.
 *
 * Ordered the way the inbox orders by default — what needs the agent first,
 * newest within that — so this list and Enquiries never disagree about what
 * is at the top. The property is shown, not just named.
 */

import Link from 'next/link';
import React from 'react';
import { Building2, ChevronRight, MessageSquare } from 'lucide-react';
import { Avatar, cx } from '../kit';
import { PropertyImage } from '../PropertyImage';
import { DemoListing } from '../../../lib/phase1/data';
import { Enquiry, EnquiryStatus } from '../../../lib/phase1/workspace';
import { sgRelative } from '../../../lib/phase1/format';
import { coverPhoto } from '../../../lib/phase1/photos';
import { districtLabel } from '../../../lib/phase1/districts';
import { STATUS_LABEL, enquiryTime } from '../../../lib/phase1/enquiries';
import { DemoBadge } from '../DemoDataSwitch';
import { Accent, Panel, PanelEmpty, Pill } from './parts';

const STATUS_ACCENT: Record<EnquiryStatus, Accent> = { new: 'blue', replied: 'amber', viewing: 'violet', closed: 'green' };

/** A property thumbnail at list size, or a mark when there is no photograph to shrink. */
export function Thumb({ l, ownerId, own, className = 'h-10 w-12' }: { l?: DemoListing; ownerId?: string; own: boolean; className?: string }) {
  const src = l && own ? coverPhoto(ownerId, l) : undefined;
  if (l && src) {
    return <PropertyImage seed={l.reference + l.project} src={src} alt="" rounded="rounded-lg" className={cx('shrink-0', className)} />;
  }
  return (
    <span aria-hidden className={cx('flex shrink-0 items-center justify-center rounded-lg border border-p1-border bg-p1-subtle text-p1-text-3', className)}>
      <Building2 size={15} />
    </span>
  );
}

export function RecentEnquiries({
  enquiries, byId, isOwn, ownerId, now, demo, total, className = '',
}: {
  enquiries: Enquiry[];
  byId: Map<string, DemoListing>;
  isOwn: (listingId: string) => boolean;
  ownerId?: string;
  now: Date;
  demo: boolean;
  total: number;
  className?: string;
}) {
  return (
    <Panel
      id="enq-h"
      title={<span className="inline-flex items-center gap-2">Recent enquiries{demo && <DemoBadge />}</span>}
      meta={total ? `${total} in total` : undefined}
      href="/phase1/enquiries"
      className={className}
    >
      {enquiries.length === 0 ? (
        <PanelEmpty
          icon={<MessageSquare size={18} />}
          title="No enquiries yet"
          body="Tenants who write about a live listing appear here, with the property they asked about."
        />
      ) : (
        <>
          <div aria-hidden className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_88px_16px] gap-4 border-y border-p1-border bg-p1-bg/60 px-5 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-p1-text-3 sm:grid">
            <span>Client</span><span>Property</span><span>Status</span><span />
          </div>
          <ul className="vr-stagger divide-y divide-p1-border border-b border-p1-border sm:border-b-0">
            {enquiries.map((e) => {
              const l = byId.get(e.listingId);
              const fresh = e.status === 'new';
              const label = e.status === 'closed' && e.outcome === 'let' ? 'Let' : STATUS_LABEL[e.status];
              const accent: Accent = e.status === 'closed' && e.outcome !== 'let' ? 'slate' : STATUS_ACCENT[e.status];
              return (
                <li key={e.id}>
                  <Link
                    href={`/phase1/enquiries?enquiry=${encodeURIComponent(e.id)}`}
                    className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3 transition-colors hover:bg-p1-subtle/60 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_88px_16px]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="relative shrink-0">
                        <Avatar name={e.name} size="sm" tone={fresh ? 'primary' : 'neutral'} />
                        {fresh && <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-p1-primary ring-2 ring-p1-surface" />}
                      </span>
                      <span className="min-w-0">
                        <span className={cx('block truncate text-[13.5px] text-p1-text', fresh ? 'font-semibold' : 'font-medium')}>
                          {e.name}{fresh && <span className="sr-only"> (unanswered)</span>}
                        </span>
                        <span suppressHydrationWarning className="block text-[11.5px] tabular-nums text-p1-text-3">{sgRelative(new Date(enquiryTime(e)), now)}</span>
                      </span>
                    </span>

                    <span className="justify-self-end sm:hidden"><Pill accent={accent}>{label}</Pill></span>

                    <span className="col-span-2 flex min-w-0 items-center gap-2.5 sm:col-span-1">
                      <Thumb l={l} ownerId={ownerId} own={isOwn(e.listingId)} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-p1-text">{l ? l.project : 'Listing removed'}</span>
                        {l && <span className="block truncate text-[11.5px] text-p1-text-3">{districtLabel(l.district)}</span>}
                      </span>
                    </span>

                    <span className="hidden sm:block"><Pill accent={accent}>{label}</Pill></span>
                    <ChevronRight size={16} aria-hidden className="hidden text-p1-text-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-p1-primary sm:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
