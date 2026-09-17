"use client";

/**
 * Four figures, one row.
 *
 * Every figure is a counted record — listings, enquiries, viewings, lets — so
 * each reads the same with Demo Data ON or OFF, and a zero is a real zero.
 * Traffic, which nothing counts for a real listing yet, is deliberately not
 * one of them: it lives on the chart, which can say "not measured".
 */

import Link from 'next/link';
import React from 'react';
import { ArrowDownRight, ArrowUpRight, Building2, CalendarCheck, KeyRound, MessageSquare, Minus } from 'lucide-react';
import { CountUp, cx } from '../kit';
import { ACCENT, Accent, AccentTile } from './parts';

interface Kpi {
  key: string;
  label: string;
  value: number;
  sub: React.ReactNode;
  accent: Accent;
  icon: React.ReactNode;
  href: string;
  /** Change against the window before, when there was one to compare with. */
  change?: number | null;
  /** Used share of a ceiling, 0–100. */
  fill?: number | null;
}

function Change({ pct }: { pct: number }) {
  const flat = Math.abs(pct) < 1;
  const Icon = flat ? Minus : pct > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums',
        flat ? 'bg-p1-subtle text-p1-text-2' : pct > 0 ? 'bg-p1-success-soft text-p1-success' : 'bg-p1-danger-soft text-p1-danger',
      )}
    >
      <Icon size={12} aria-hidden />
      {flat ? 'Level' : `${Math.abs(pct)}%`}
      <span className="sr-only"> against the previous 30 days</span>
    </span>
  );
}

export function KpiRow({
  activeListings, listingLimit, enquiries30d, prevEnquiries30d, awaitingReply, upcomingViewings, heldViewings, lets30d,
}: {
  activeListings: number;
  listingLimit: number;
  enquiries30d: number;
  prevEnquiries30d: number;
  awaitingReply: number;
  upcomingViewings: number;
  heldViewings: number;
  lets30d: number;
}) {
  const kpis: Kpi[] = [
    {
      key: 'listings',
      label: 'Active listings',
      value: activeListings,
      sub: listingLimit ? `${activeListings} of ${listingLimit} slots used` : 'No plan yet',
      accent: 'blue',
      icon: <Building2 size={18} />,
      href: '/phase1/listings?status=published',
      fill: listingLimit ? Math.min(100, Math.round((activeListings / listingLimit) * 100)) : null,
    },
    {
      key: 'enquiries',
      label: 'Enquiries, 30 days',
      value: enquiries30d,
      sub: awaitingReply
        ? <><span className="font-semibold text-p1-text-2">{awaitingReply}</span> awaiting reply</>
        : 'Nothing awaiting a reply',
      accent: 'violet',
      icon: <MessageSquare size={18} />,
      href: awaitingReply ? '/phase1/enquiries?status=new' : '/phase1/enquiries',
      change: prevEnquiries30d > 0 ? Math.round(((enquiries30d - prevEnquiries30d) / prevEnquiries30d) * 100) : null,
    },
    {
      key: 'viewings',
      label: 'Upcoming viewings',
      value: upcomingViewings,
      sub: `${heldViewings} held in the last 30 days`,
      accent: 'amber',
      icon: <CalendarCheck size={18} />,
      href: '/phase1/viewings',
    },
    {
      key: 'lets',
      label: 'Tenancies let',
      value: lets30d,
      sub: 'Closed as let · last 30 days',
      accent: 'green',
      icon: <KeyRound size={18} />,
      href: '/phase1/enquiries?status=closed',
    },
  ];

  return (
    <section aria-label="Key figures" className="vr-stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {kpis.map((k) => (
        <Link
          key={k.key}
          href={k.href}
          className={cx(
            'group relative flex min-w-0 flex-col rounded-2xl border border-p1-border bg-p1-surface p-4 shadow-p1-sm sm:px-5',
            'transition-[box-shadow,border-color] duration-200 hover:border-p1-border-strong hover:shadow-p1-md',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-p1-primary',
          )}
        >
          <span className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-3.5">
            <AccentTile accent={k.accent} size="lg">{k.icon}</AccentTile>
            <span className="w-full min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <CountUp value={k.value} className="font-p1display text-[24px] font-bold leading-none tracking-[-0.025em] text-p1-text tabular-nums sm:text-[26px]" />
                {typeof k.change === 'number' && <Change pct={k.change} />}
              </span>
              <span className="mt-1 block text-[12.5px] font-medium leading-tight text-p1-text-2 sm:truncate">{k.label}</span>
            </span>
          </span>
          <span className="mt-2 text-[11.5px] leading-snug text-p1-text-3 sm:mt-2.5 sm:truncate">{k.sub}</span>
          {typeof k.fill === 'number' && (
            <span aria-hidden className="mt-auto block pt-2.5"><span className="block h-1 w-full overflow-hidden rounded-full bg-p1-subtle">
              <span
                className={cx('vr-grow block h-full rounded-full', k.fill >= 100 ? ACCENT.red.bar : ACCENT[k.accent].bar)}
                style={{ width: `${Math.max(2, k.fill)}%` }}
              />
            </span></span>
          )}
        </Link>
      ))}
    </section>
  );
}
