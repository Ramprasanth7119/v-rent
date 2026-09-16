"use client";

/**
 * The portfolio at a glance — the first thing on the page and the only thing
 * the agent has to read.
 *
 * One figure is given the room: views over the last seven days, the number
 * that says whether the week is working. The four that give it context sit
 * beside it on a hairline grid, each one a link to the screen that acts on it.
 * Nothing here is a card in its own right, because four cards would make four
 * headlines and the eye would have nowhere to land.
 */

import Link from 'next/link';
import React from 'react';
import { Building2, Bookmark, MessageSquare, Eye, Gauge, Info } from 'lucide-react';
import { Card, CountUp, Sparkline, Tooltip, cx } from '../kit';
import { Delta, IconTile, TileTone } from './parts';

interface Cell {
  key: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone: TileTone;
  href: string;
  /** Drawn under the figure, 0–100. For a quantity with a ceiling. */
  bar?: { pct: number; tone: string };
}

export function PortfolioSnapshot({
  views7d, prev7d, series, activeListings, listingLimit, saves30d, newEnquiries, quality, qualityOf,
}: {
  views7d: number;
  prev7d: number;
  /** Daily views, oldest first. Fourteen days. */
  series: number[];
  activeListings: number;
  listingLimit: number;
  saves30d: number;
  newEnquiries: number;
  /** Average listing health across live listings, or null when none are live. */
  quality: number | null;
  qualityOf: number;
}) {
  const trend = prev7d ? Math.round(((views7d - prev7d) / prev7d) * 100) : 0;
  const quotaPct = listingLimit ? Math.min(100, Math.round((activeListings / listingLimit) * 100)) : 0;

  const cells: Cell[] = [
    {
      key: 'listings',
      label: 'Active listings',
      value: activeListings,
      sub: listingLimit ? `of ${listingLimit} slots` : 'no plan yet',
      icon: <Building2 size={15} />,
      tone: 'primary',
      href: '/phase1/listings?status=published',
      bar: listingLimit ? { pct: quotaPct, tone: quotaPct >= 100 ? 'bg-p1-danger' : quotaPct >= 80 ? 'bg-p1-warning' : 'bg-p1-primary' } : undefined,
    },
    {
      key: 'saves',
      label: 'Saves, 30 days',
      value: saves30d.toLocaleString('en-SG'),
      sub: 'tenants who kept a listing',
      icon: <Bookmark size={15} />,
      tone: 'accent',
      href: '/phase1/performance',
    },
    {
      key: 'enquiries',
      label: 'New enquiries',
      value: newEnquiries,
      sub: newEnquiries ? 'waiting for a reply' : 'nothing unanswered',
      icon: <MessageSquare size={15} />,
      tone: newEnquiries ? 'info' : 'neutral',
      href: '/phase1/enquiries',
    },
    {
      key: 'quality',
      label: 'Listing quality',
      value: quality === null ? '—' : `${quality}%`,
      sub: quality === null ? 'no live listings' : `average of ${qualityOf} live`,
      icon: <Gauge size={15} />,
      tone: quality === null ? 'neutral' : quality >= 85 ? 'success' : quality >= 60 ? 'accent' : 'danger',
      href: '/phase1/listings',
      bar: quality === null ? undefined : { pct: quality, tone: quality >= 85 ? 'bg-p1-success' : quality >= 60 ? 'bg-p1-warning' : 'bg-p1-danger' },
    },
  ];

  return (
    <Card padding="none" as="section" aria-label="Portfolio at a glance" className="vr-rise overflow-hidden bg-p1-border">
      <div className="grid gap-px lg:grid-cols-[minmax(0,384px)_minmax(0,1fr)]">
        {/* ------------------------------------------------- the one figure */}
        <div className="bg-p1-surface p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <IconTile tone="primary" size="sm"><Eye size={14} /></IconTile>
            <span className="text-[13px] font-medium text-p1-text-2">Views, last 7 days</span>
            <Tooltip content="Views, saves and enquiries are modelled from each listing until the tenant site has recorded its own traffic.">
              <span tabIndex={0} className="ml-auto inline-flex items-center gap-1 rounded-md bg-p1-subtle px-1.5 py-0.5 text-[11px] font-medium text-p1-text-3">
                <Info size={10.5} aria-hidden /> Modelled
              </span>
            </Tooltip>
          </div>

          <div className="mt-3.5 flex flex-wrap items-end gap-x-3 gap-y-2">
            <CountUp value={views7d} className="font-p1display text-[42px] font-bold leading-[0.95] tracking-[-0.03em] text-p1-text sm:text-[48px]" />
            <Delta pct={trend} since="previous 7 days" className="mb-1.5" />
          </div>
          <p className="mt-2 text-[13px] text-p1-text-3">
            {prev7d ? <>{prev7d.toLocaleString('en-SG')} in the seven days before</> : 'No views recorded in the week before'}
          </p>

          <Sparkline data={series} width={360} height={58} stretch className="mt-5 w-full" label={`Daily views over ${series.length} days`} />
        </div>

        {/* ----------------------------------------------------- the context */}
        <div className="grid grid-cols-2 gap-px bg-p1-border sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {cells.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              className="group flex flex-col bg-p1-surface p-4 transition-colors hover:bg-p1-subtle/50 sm:p-5"
            >
              <IconTile tone={c.tone} size="sm">{c.icon}</IconTile>
              <span className="mt-3 font-p1display text-[26px] font-bold leading-none tracking-[-0.02em] text-p1-text">{c.value}</span>
              <span className="mt-2 text-[12.5px] font-medium text-p1-text-2">{c.label}</span>
              {c.sub && <span className="mt-0.5 text-[11.5px] text-p1-text-3">{c.sub}</span>}
              {c.bar && (
                <span className="mt-auto block pt-3" aria-hidden>
                  <span className="block h-1 w-full overflow-hidden rounded-full bg-p1-subtle">
                    <span className={cx('vr-grow block h-full rounded-full', c.bar.tone)} style={{ width: `${c.bar.pct}%` }} />
                  </span>
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
