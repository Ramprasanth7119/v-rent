"use client";

/**
 * What needs the agent, then what has happened.
 *
 * The waiting items come first because they are the only rows here that ask
 * for something; each carries the action that clears it. Below them, the
 * portfolio's recent events, newest first — only things that have happened,
 * each read from a stored record.
 */

import Link from 'next/link';
import React from 'react';
import { ArrowRight, Building2, CalendarCheck, CheckCircle2, Gavel, KeyRound, MessageSquare, XCircle } from 'lucide-react';
import { cx } from '../kit';
import { DemoListing } from '../../../lib/phase1/data';
import { ActivityEvent, ActivityKind } from '../../../lib/phase1/dashboard';
import { sgRelative } from '../../../lib/phase1/format';
import { ACCENT, Accent, AccentTile, Panel } from './parts';

export type AttentionTone = 'danger' | 'warning' | 'info';

export interface AttentionItem {
  key: string;
  title: string;
  why: string;
  tone: AttentionTone;
  href: string;
  cta: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const TONE: Record<AttentionTone, Accent> = { danger: 'red', warning: 'amber', info: 'slate' };

const KIND: Record<ActivityKind, { label: string; accent: Accent; icon: React.ComponentType<{ size?: number }> }> = {
  enquiry: { label: 'New enquiry', accent: 'violet', icon: MessageSquare },
  viewing: { label: 'Viewing booked', accent: 'amber', icon: CalendarCheck },
  let: { label: 'Tenancy let', accent: 'green', icon: KeyRound },
  lost: { label: 'Enquiry closed', accent: 'slate', icon: XCircle },
  published: { label: 'Listing published', accent: 'blue', icon: Building2 },
  rejected: { label: 'Listing needs changes', accent: 'red', icon: Gavel },
};

export function ActivityPanel({
  attention, events, byId, now, className = '',
}: {
  attention: AttentionItem[];
  events: ActivityEvent[];
  byId: Map<string, DemoListing>;
  now: Date;
  className?: string;
}) {
  const urgent = attention.filter((a) => a.tone === 'danger').length;

  return (
    <Panel
      id="activity-h"
      title="Recent activity"
      href="/phase1/enquiries"
      linkLabel="Inbox"
      className={className}
    >
      {attention.length > 0 && (
        <div className="px-3 pb-2">
          <p className="flex items-center gap-2 px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-p1-text-3">
            Needs you
            <span className={cx('rounded-full px-1.5 py-px text-[10.5px] tabular-nums tracking-normal', urgent ? ACCENT.red.pill : ACCENT.slate.pill)}>
              {urgent ? `${urgent} urgent` : attention.length}
            </span>
          </p>
          <ul className="space-y-1">
            {attention.map((a) => (
              <li key={a.key}>
                <Link
                  href={a.href}
                  className="group flex items-center gap-3 rounded-xl border border-p1-border bg-p1-bg/60 px-3 py-2 transition-colors hover:border-p1-border-strong hover:bg-p1-subtle/70"
                >
                  <AccentTile accent={TONE[a.tone]} size="sm"><a.icon size={14} /></AccentTile>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-p1-text" title={a.title}>{a.title}</span>
                    <span className="block truncate text-[11.5px] text-p1-text-3" title={a.why}>{a.why}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-p1-primary">
                    {a.cta}<ArrowRight size={12} aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {events.length === 0 ? (
        attention.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
            <span className="vr-pop flex h-10 w-10 items-center justify-center rounded-full bg-p1-success-soft text-p1-success" aria-hidden>
              <CheckCircle2 size={20} />
            </span>
            <p className="mt-3 text-[13.5px] font-semibold text-p1-text">Nothing new yet</p>
            <p className="mt-1 max-w-[30ch] text-[12.5px] leading-5 text-p1-text-3">Enquiries, viewings and listing decisions appear here as they happen.</p>
          </div>
        )
      ) : (
        <ol className={cx('vr-stagger flex-1 px-5 pb-3', attention.length > 0 && 'border-t border-p1-border pt-2')}>
          {events.map((ev, i) => {
            const k = KIND[ev.kind];
            const l = byId.get(ev.listingId);
            const last = i === events.length - 1;
            return (
              <li key={ev.id} className="relative">
                {!last && <span aria-hidden className="absolute bottom-0 left-[13.5px] top-9 w-px bg-p1-border" />}
                <Link href={ev.href} className="group flex items-start gap-3 rounded-lg py-2">
                  <AccentTile accent={k.accent} size="sm" className="relative"><k.icon size={14} /></AccentTile>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-p1-text group-hover:text-p1-primary">
                        {k.label}
                        {ev.open && <span className="ml-1.5 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-p1-primary align-middle" aria-label="waiting on you" />}
                      </span>
                      <time suppressHydrationWarning dateTime={new Date(ev.at).toISOString()} className="shrink-0 text-[11.5px] tabular-nums text-p1-text-3">
                        {sgRelative(new Date(ev.at), now)}
                      </time>
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-p1-text-3">
                      {[ev.person, l ? l.project : 'Listing removed'].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
