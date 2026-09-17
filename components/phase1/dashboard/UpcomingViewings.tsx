"use client";

/**
 * The next viewings in the diary: when, where, and who is coming.
 *
 * Read from the booked slots the Viewings screen manages, with the same rule
 * the figure above uses — a booked slot from today onwards — so the count and
 * the list agree.
 */

import Link from 'next/link';
import React from 'react';
import { CalendarPlus, ChevronRight } from 'lucide-react';
import { LinkButton, cx } from '../kit';
import { DemoListing } from '../../../lib/phase1/data';
import type { ViewingSlot } from '../../../lib/phase1/tools';
import { sgDayNo } from '../../../lib/phase1/dashboard';
import { districtLabel } from '../../../lib/phase1/districts';
import { ACCENT, Panel, PanelEmpty, Pill, clockLabel } from './parts';
import { Thumb } from './RecentEnquiries';

const WEEKDAY = new Intl.DateTimeFormat('en-SG', { weekday: 'narrow', timeZone: 'Asia/Singapore' });
const DATE_NO = new Intl.DateTimeFormat('en-SG', { day: 'numeric', timeZone: 'Asia/Singapore' });
const DAY_NAME = new Intl.DateTimeFormat('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' });
const dayNoOf = (iso: string) => sgDayNo(new Date(`${iso}T12:00:00+08:00`).getTime());

/**
 * The next seven days of the diary: booked viewings and slots still open, per
 * day. Read from every published slot, not only the booked ones.
 */
function WeekStrip({ all, today }: { all: ViewingSlot[]; today: number }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const n = today + i;
    const onDay = all.filter((s) => dayNoOf(s.date) === n);
    return {
      n,
      at: new Date(n * 86_400_000 + 4 * 3_600_000),
      booked: onDay.filter((s) => s.booking).length,
      open: onDay.filter((s) => !s.booking).length,
    };
  });
  const booked = days.reduce((a, d) => a + d.booked, 0);
  const open = days.reduce((a, d) => a + d.open, 0);

  return (
    <div className="px-5 pb-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-semibold text-p1-text-2">Next 7 days</span>
        <span className="text-[11.5px] tabular-nums text-p1-text-3">{booked} booked · {open} open</span>
      </div>
      <ol className="mt-2.5 grid grid-cols-7 gap-1.5" aria-label={`Next 7 days: ${booked} viewings booked, ${open} slots open`}>
        {days.map((d, i) => (
          <li
            key={d.n}
            className={cx(
              'flex flex-col items-center rounded-lg border py-1.5',
              i === 0 ? 'border-p1-primary/40 bg-p1-primary-soft' : 'border-p1-border',
            )}
            title={`${d.booked} booked, ${d.open} open`}
          >
            <span className="text-[10.5px] font-medium text-p1-text-3">{WEEKDAY.format(d.at)}</span>
            <span className={cx('text-[13px] font-semibold tabular-nums', i === 0 ? 'text-p1-primary' : 'text-p1-text')}>{DATE_NO.format(d.at)}</span>
            <span aria-hidden className="mt-1 flex h-1.5 items-center gap-0.5">
              {Array.from({ length: Math.min(3, d.booked) }).map((_, j) => <span key={`b${j}`} className={cx('h-1.5 w-1.5 rounded-full', ACCENT.amber.dot)} />)}
              {Array.from({ length: Math.min(3 - Math.min(3, d.booked), d.open) }).map((_, j) => <span key={`o${j}`} className="h-1.5 w-1.5 rounded-full border border-p1-border-strong" />)}
            </span>
          </li>
        ))}
      </ol>
      <p aria-hidden className="mt-2 flex items-center gap-3 text-[11px] text-p1-text-3">
        <span className="inline-flex items-center gap-1"><span className={cx('h-1.5 w-1.5 rounded-full', ACCENT.amber.dot)} />Booked</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full border border-p1-border-strong" />Open slot</span>
      </p>
    </div>
  );
}

export function UpcomingViewings({
  slots, all, byId, ownerId, now, className = '',
}: {
  /** Already filtered and ordered by `upcomingSlots`. */
  slots: ViewingSlot[];
  /** Every slot in the diary, booked or open. */
  all: ViewingSlot[];
  byId: Map<string, DemoListing>;
  ownerId?: string;
  now: Date;
  className?: string;
}) {
  const today = sgDayNo(now.getTime());
  const hasSlots = all.length > 0;
  const shown = slots.slice(0, 5);

  return (
    <Panel
      id="view-h"
      title="Upcoming viewings"
      meta={slots.length ? `${slots.length} booked` : undefined}
      href="/phase1/viewings"
      className={className}
    >
      {hasSlots && <WeekStrip all={all} today={today} />}
      {shown.length === 0 ? (
        <PanelEmpty
          icon={<CalendarPlus size={18} />}
          title="No viewings booked"
          body={hasSlots ? 'Tenants can book the open slots you have published.' : 'Publish viewing slots so tenants can book a time.'}
          action={<LinkButton href="/phase1/viewings" size="sm" variant="outline">{hasSlots ? 'Open diary' : 'Add slots'}</LinkButton>}
        />
      ) : (
        <ul className="vr-stagger space-y-2 border-t border-p1-border px-3 pb-3 pt-3">
          {shown.map((s) => {
            const d = dayNoOf(s.date) - today;
            const day = d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : DAY_NAME.format(new Date(`${s.date}T12:00:00+08:00`));
            const l = s.listingId === 'any' ? undefined : byId.get(s.listingId);
            return (
              <li key={s.id}>
                <Link
                  href="/phase1/viewings"
                  className="group flex items-center gap-3 rounded-xl border border-p1-border px-3 py-2.5 transition-colors hover:border-p1-border-strong hover:bg-p1-subtle/60"
                >
                  <span className={cx(
                    'flex w-[68px] shrink-0 flex-col items-center justify-center rounded-lg py-1.5 text-center',
                    d === 0 ? 'bg-p1-accent-soft' : 'bg-p1-subtle',
                  )}>
                    <span className="text-[12.5px] font-bold leading-tight tabular-nums text-p1-text">{clockLabel(s.start)}</span>
                    <span className={cx('mt-0.5 text-[10.5px] font-medium leading-tight', d === 0 ? 'text-p1-accent-text' : 'text-p1-text-3')}>{day}</span>
                  </span>
                  <Thumb l={l} ownerId={ownerId} own={Boolean(l)} className="h-10 w-12" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-p1-text">
                      {l ? l.project : s.listingId === 'any' ? 'Tenant’s choice of listing' : 'Listing removed'}
                    </span>
                    <span className="block truncate text-[11.5px] text-p1-text-3">
                      {s.booking?.name}{l ? ` · ${districtLabel(l.district)}` : ''}
                    </span>
                  </span>
                  <Pill accent={d === 0 ? 'amber' : 'blue'} className="hidden min-[420px]:inline-flex">{d === 0 ? 'Today' : 'Upcoming'}</Pill>
                  <ChevronRight size={16} aria-hidden className="shrink-0 text-p1-text-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-p1-primary" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
