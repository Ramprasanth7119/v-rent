"use client";

/**
 * The property side of Performance: the listing that is working, the one
 * sentence worth acting on, every live listing ranked, where enquiries come
 * from, and which listings need a lift.
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, ChevronRight, Lightbulb, MapPin, Trophy } from 'lucide-react';
import { CountUp, Delta, Radial, Segmented, Sparkline, cx, useInView } from '../kit';
import { PropertyImage } from '../PropertyImage';
import { StatusBadge } from '../status';
import { HealthRing } from '../listing/health';
import type { DemoListing } from '../../../lib/phase1/data';
import { priceLabel } from '../../../lib/phase1/pricing';
import { coverPhoto } from '../../../lib/phase1/photos';
import { districtName, type Insight } from '../../../lib/phase1/performance';
import { listingHealth } from '../../../lib/phase1/health';
import { foldWeekly, pctChange, type ListingWindow, type WindowDays } from './model';
import { MEASURE } from './palette';

export interface Ranked { l: DemoListing; w: ListingWindow }

const price = (l: DemoListing) => {
  const p = priceLabel(l);
  return `${p.amount}${p.suffix}`;
};

/* --------------------------------------------------------------- spotlight */

/** The best-performing listing, led by its photograph. */
export function Spotlight({ item, ownerId, days }: { item: Ranked; ownerId?: string; days: WindowDays }) {
  const { l, w } = item;
  const saveRate = w.views ? Math.round((w.saves / w.views) * 100) : 0;
  const enqOfSaves = w.saves ? Math.round((w.enquiries / w.saves) * 100) : 0;
  return (
    <Link
      href={`/phase1/listings/${l.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-p1-border bg-p1-surface shadow-p1-sm transition-[box-shadow,border-color] duration-200 hover:border-p1-border-strong hover:shadow-p1-md focus-visible:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <PropertyImage
          seed={l.reference + l.project}
          src={coverPhoto(ownerId, l, 'full')}
          alt=""
          rounded="rounded-none"
          className="h-full w-full transition-transform duration-500 ease-[var(--p1-ease)] group-hover:scale-[1.03] motion-reduce:transform-none"
        />
        {/* A scrim for the caption only; the photograph stays readable above it. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-sm">
          <Trophy size={12} aria-hidden /> Top listing · {days} days
        </span>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="font-p1display text-[19px] font-bold leading-tight tracking-[-0.01em]">{l.project}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-white/80">
            <MapPin size={12} aria-hidden /> {l.unitNo} · {districtName(l.district)} · {price(l)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-p1-border border-b border-p1-border">
        {[
          { k: 'Views', v: w.views, d: 0, c: MEASURE.views.text },
          { k: 'Enquiries', v: w.enquiries, d: 0, c: MEASURE.enquiries.text },
          { k: 'Rate', v: w.rate, d: 1, s: '%', c: MEASURE.rate.text },
        ].map((m) => (
          <div key={m.k} className="px-3 py-3 text-center">
            <div className="font-p1display text-[19px] font-bold leading-none" style={{ color: m.c }}>
              <CountUp value={m.v} decimals={m.d} suffix={m.s ?? ''} duration={700} />
            </div>
            <div className="mt-1 text-[12px] text-p1-text-3">{m.k}</div>
          </div>
        ))}
      </div>

      {/* The tenant's path on this one listing, with the share that carried on at each step. */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-[12.5px]" aria-label="From views to enquiries">
          {[
            { n: w.views.toLocaleString('en-SG'), k: 'views', m: MEASURE.views },
            { n: String(w.saves), k: 'saves', m: MEASURE.saves, pct: saveRate },
            { n: String(w.enquiries), k: 'enquiries', m: MEASURE.enquiries, pct: enqOfSaves },
          ].map((c) => (
            <React.Fragment key={c.k}>
              {c.pct !== undefined && (
                <li aria-hidden className="inline-flex items-center whitespace-nowrap text-[11.5px] tabular-nums text-p1-text-3">
                  <ChevronRight size={12} />{c.pct}%
                </li>
              )}
              <li className="whitespace-nowrap rounded-md px-2 py-1 font-semibold tabular-nums" style={{ background: c.m.soft, color: c.m.text }}>
                {c.n} <span className="font-medium opacity-80">{c.k}</span>
              </li>
            </React.Fragment>
          ))}
        </ol>

        {/* Its own daily views, so the top listing's run is visible, not only its total. */}
        <div className="mt-auto">
          <div className="mb-1 flex items-baseline justify-between text-[11.5px] text-p1-text-3">
            <span>Daily views</span>
            <span className="tabular-nums">peak {Math.max(0, ...w.series).toLocaleString('en-SG')}</span>
          </div>
          <SpotBars data={w.series} />
        </div>

        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-p1-primary">
          Open listing <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

function SpotBars({ data }: { data: number[] }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const max = Math.max(1, ...data);
  return (
    <div ref={ref} className="flex h-12 items-end gap-[2px]" aria-hidden>
      {data.map((v, i) => (
        <span
          key={i}
          className="min-w-0 flex-1 rounded-t-[2px]"
          style={{
            height: seen ? `${Math.max(4, (v / max) * 100)}%` : '4%',
            background: MEASURE.views.colour,
            opacity: 0.3 + 0.7 * (v / max),
            transition: `height 600ms cubic-bezier(.16,1,.3,1) ${Math.min(i * 12, 500)}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- insight */

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <section aria-labelledby="perf-insight-h" className="relative overflow-hidden rounded-2xl border border-p1-border bg-p1-surface p-5 shadow-p1-sm">
      {/* A quiet wash in the accent, so the one sentence to act on reads as different from the figures around it. */}
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-p1-accent-soft blur-2xl" />
      <div className="relative">
        <h2 id="perf-insight-h" className="flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-p1-accent-text">
          <Lightbulb size={13} aria-hidden /> This week
        </h2>
        {insight.figure ? (
          <>
            <p className="mt-3 font-p1display text-[40px] font-extrabold leading-none tracking-[-0.035em] text-p1-text">{insight.figure}</p>
            <p className="mt-1.5 text-[14px] font-medium text-p1-text">{insight.subject} <span className="font-normal text-p1-text-2">{insight.caption}</span></p>
          </>
        ) : (
          <p className="mt-3 text-[15px] font-semibold text-p1-text">{insight.headline}</p>
        )}
        <p className="mt-2 text-[13px] leading-5 text-p1-text-3">{insight.detail}</p>
        {insight.href && (
          <Link href={insight.href} className="mt-4 inline-flex items-center gap-1 rounded text-[13px] font-semibold text-p1-text hover:text-p1-primary focus-visible:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none">
            Act on this <ArrowUpRight size={14} aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- leaderboard */

type SortKey = 'enquiries' | 'views' | 'rate';

/** A change, unless the period before had too few enquiries for a percentage to mean anything. */
function Trend({ pct, few, days, className = '' }: { pct: number; few: boolean; days: number; className?: string }) {
  if (few) {
    return (
      <span className={cx('inline-flex rounded-md px-1.5 py-0.5 text-[12px] font-semibold', className)} style={{ background: MEASURE.rate.soft, color: MEASURE.rate.text }} title={`Too few enquiries in the previous ${days} days to compare`}>
        New
      </span>
    );
  }
  return <Delta pct={pct} since={`previous ${days} days`} className={className} />;
}

export function Leaderboard({ rows, ownerId, days }: { rows: Ranked[]; ownerId?: string; days: WindowDays }) {
  const [sort, setSort] = useState<SortKey>('enquiries');
  const [ref, seen] = useInView<HTMLUListElement>();
  const sorted = useMemo(() => [...rows].sort((a, b) => b.w[sort] - a.w[sort]), [rows, sort]);
  const top = Math.max(0.1, ...rows.map((r) => r.w[sort]));
  const fmt = (n: number) => (sort === 'rate' ? `${n.toFixed(1)}%` : n.toLocaleString('en-SG'));

  return (
    <section aria-labelledby="perf-rank-h" className="overflow-hidden rounded-2xl border border-p1-border bg-p1-surface shadow-p1-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-p1-border px-5 py-4">
        <div>
          <h2 id="perf-rank-h" className="text-[15px] font-semibold tracking-[-0.01em] text-p1-text">Listing ranking</h2>
          <p className="mt-0.5 text-[12.5px] text-p1-text-3">{rows.length} live listing{rows.length === 1 ? '' : 's'} · last {days} days</p>
        </div>
        <Segmented<SortKey>
          label="Rank by"
          size="sm"
          value={sort}
          onChange={setSort}
          options={[{ key: 'enquiries', label: 'Enquiries' }, { key: 'views', label: 'Views' }, { key: 'rate', label: 'Rate' }]}
        />
      </div>

      {/* Column labels, for the width where there are columns. */}
      <div aria-hidden className="hidden grid-cols-[28px_minmax(0,1fr)_minmax(120px,200px)_72px_72px_88px_20px] items-center gap-4 border-b border-p1-border bg-p1-subtle/50 px-5 py-2 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-p1-text-3 lg:grid">
        <span>#</span><span>Listing</span><span>{sort === 'rate' ? 'Enquiry rate' : sort === 'views' ? 'Views' : 'Enquiries'}</span>
        <span className="text-right">Views</span><span className="text-right">Enq.</span><span className="text-right">Trend</span><span />
      </div>

      <ul ref={ref} className="divide-y divide-p1-border">
        {sorted.map(({ l, w }, i) => {
          const pct = pctChange(w.enquiries, w.prevEnquiries);
          const share = (w[sort] / top) * 100;
          return (
            <li key={l.id}>
              <Link
                href={`/phase1/listings/${l.id}`}
                className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors duration-150 hover:bg-p1-subtle/60 focus-visible:bg-p1-subtle focus-visible:outline-none sm:px-5 lg:grid-cols-[28px_minmax(0,1fr)_minmax(120px,200px)_72px_72px_88px_20px] lg:gap-4"
              >
                <span className="hidden font-p1display text-[14px] font-bold tabular-nums text-p1-text-3 lg:block">{i + 1}</span>

                <span className="flex min-w-0 items-center gap-3">
                  <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg">
                    <PropertyImage
                      seed={l.reference + l.project}
                      src={coverPhoto(ownerId, l)}
                      alt=""
                      rounded="rounded-lg"
                      className="h-full w-full transition-transform duration-300 group-hover:scale-[1.06] motion-reduce:transform-none"
                    />
                    <span className="absolute left-1 top-1 rounded bg-black/55 px-1 text-[10.5px] font-bold leading-4 text-white lg:hidden">{i + 1}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold text-p1-text">{l.project}</span>
                      {l.status !== 'published' && <StatusBadge kind="listing" value={l.status} size="sm" showHelp={false} />}
                    </span>
                    <span className="block truncate text-[12.5px] text-p1-text-3">
                      {l.unitNo} · {districtName(l.district)} · {l.bedrooms} bd · {price(l)}
                    </span>
                  </span>
                </span>

                {/* Phone: the one figure being ranked by, and its change. */}
                <span className="text-right lg:hidden">
                  <span className="block font-p1display text-[16px] font-bold tabular-nums text-p1-text">{fmt(w[sort])}</span>
                  <Trend pct={pct} few={w.prevEnquiries < 3} days={days} className="mt-0.5" />
                </span>

                {/* The ranked figure as a bar, scaled to the top listing. */}
                <span className="col-span-2 flex items-center gap-2.5 lg:col-span-1">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-p1-subtle">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        background: MEASURE[sort].colour,
                        width: seen ? `${Math.max(2, share)}%` : '0%',
                        opacity: 0.45 + 0.55 * (share / 100),
                        transition: `width 760ms cubic-bezier(.16,1,.3,1) ${Math.min(i, 8) * 45}ms`,
                      }}
                    />
                  </span>
                  <span className="hidden w-12 shrink-0 text-right text-[13px] font-semibold tabular-nums text-p1-text lg:inline">{fmt(w[sort])}</span>
                </span>

                <span className="hidden text-right text-[13.5px] tabular-nums text-p1-text-2 lg:block">{w.views.toLocaleString('en-SG')}</span>
                <span className="hidden text-right text-[13.5px] tabular-nums text-p1-text-2 lg:block">{w.enquiries}</span>
                <span className="hidden flex-col items-end gap-1 lg:flex">
                  <Sparkline data={foldWeekly(w.series)} tone={pct < 0 ? 'neutral' : 'success'} width={72} height={20} label={`Daily views for ${l.project}`} />
                  <Trend pct={pct} few={w.prevEnquiries < 3} days={days} />
                </span>
                <ArrowRight size={15} className="hidden text-p1-text-3 transition-transform duration-200 group-hover:translate-x-0.5 lg:block" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------- lift */

/** The weakest listings, each with the one thing most likely to help. */
export function NeedsLift({ rows, all, days }: { rows: Ranked[]; all: Ranked[]; days: WindowDays }) {
  const scores = all.map(({ l }) => listingHealth(l).score);
  const avg = scores.length ? Math.round(scores.reduce((n, v) => n + v, 0) / scores.length) : 0;
  const strong = all.filter(({ l }) => listingHealth(l).tier === 'strong').length;
  return (
    <section aria-labelledby="perf-lift-h" className="overflow-hidden rounded-2xl border border-p1-border bg-p1-surface shadow-p1-sm">
      <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <h2 id="perf-lift-h" className="text-[15px] font-semibold tracking-[-0.01em] text-p1-text">Needs a lift</h2>
          <p className="mt-0.5 text-[12.5px] text-p1-text-3">Fewest enquiries in the last {days} days</p>
          <p className="mt-2 text-[12.5px] text-p1-text-2">
            <span className="font-semibold tabular-nums text-p1-text">{strong} of {all.length}</span> live listings have strong health
          </p>
        </div>
        {/* Portfolio completeness: the lever an agent controls directly. */}
        <Radial
          value={avg}
          size={76}
          thickness={7}
          tone={avg >= 80 ? 'success' : avg >= 60 ? 'accent' : 'danger'}
          label={<span className="font-p1display text-[17px] font-bold leading-none tabular-nums text-p1-text">{avg}%</span>}
          sublabel="health"
        />
      </div>
      <ul className="divide-y divide-p1-border border-t border-p1-border">
        {rows.map(({ l, w }) => {
          const fix = [...listingHealth(l).missing].sort((a, b) => b.weight - a.weight)[0];
          return (
            <li key={l.id}>
              <Link
                href={fix ? `/phase1/listings/new?edit=${l.id}` : `/phase1/listings/${l.id}`}
                className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-p1-subtle/60 focus-visible:bg-p1-subtle focus-visible:outline-none"
              >
                <HealthRing listing={l} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-p1-text">{l.project} <span className="font-normal text-p1-text-3">{l.unitNo}</span></span>
                  <span className="block truncate text-[12.5px] text-p1-text-3">
                    {w.enquiries} enquiries · {w.views.toLocaleString('en-SG')} views
                  </span>
                </span>
                <span className={cx('hidden shrink-0 rounded-md px-2 py-1 text-[12px] font-medium sm:inline', fix ? 'bg-p1-subtle text-p1-text-2' : 'text-p1-text-3')}>
                  {fix ? fix.fix : 'Complete'}
                </span>
                <ArrowRight size={15} className="shrink-0 text-p1-text-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
