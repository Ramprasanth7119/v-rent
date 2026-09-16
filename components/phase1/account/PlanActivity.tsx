"use client";

/**
 * What the plan is carrying: four figures, then two charts.
 *
 * Every figure says where it comes from. Enquiries are counted from the
 * enquiry records, so they are real in either data set. Views are only shown
 * where they are counted — the demo account's are modelled and marked so; the
 * agent's own are not counted until the tenant site records traffic, and the
 * panel says that instead of drawing a flat line at zero.
 *
 * Views and enquiries are never put on one chart: they differ by two orders of
 * magnitude and a shared axis would flatten one of them.
 */

import React, { useMemo, useState } from 'react';
import { CalendarClock, Eye, Info, MessageSquare, Building2 } from 'lucide-react';
import {
  AreaChart, Card, CardHead, CountUp, Delta, EmptyState, IconTile, Sparkline, Tooltip, cx, useInView,
} from '../kit';

export function ModelledChip() {
  return (
    <Tooltip content="Views are modelled for the demo account until the tenant site records its own traffic.">
      <span tabIndex={0} className="inline-flex items-center gap-1 rounded-md bg-p1-subtle px-1.5 py-0.5 text-[11px] font-medium text-p1-text-3">
        <Info size={10.5} aria-hidden /> Modelled
      </span>
    </Tooltip>
  );
}

function Tile({ icon, tone, label, children, foot, className = '', delay = 0 }: {
  icon: React.ReactNode; tone: 'primary' | 'info' | 'success' | 'accent'; label: string;
  children: React.ReactNode; foot?: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <Card padding="none" className={cx('vr-rise flex min-w-0 flex-col p-4 transition-shadow sm:p-5 duration-200 hover:shadow-p1-md', className)} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2.5">
        <IconTile tone={tone} size="sm" className="hidden sm:inline-flex">{icon}</IconTile>
        <span className="text-[12.5px] font-medium leading-tight text-p1-text-2 sm:truncate sm:text-[13px]">{label}</span>
      </div>
      <div className="mt-3">{children}</div>
      {foot && <div className="mt-auto pt-3">{foot}</div>}
    </Card>
  );
}

const big = 'font-p1display text-[26px] sm:text-[30px] font-bold leading-none tracking-[-0.025em] tabular-nums text-p1-text';

export function AccountKPIs({
  published, inWorkspace, views, enquiries, renewal,
}: {
  published: number;
  inWorkspace: number;
  /** Null when views are not counted for this workspace. */
  views: { total: number; prior: number; series: number[] } | null;
  enquiries: { total: number; prior: number; weeks: number[] };
  /** Null when no payment is on record. */
  renewal: { daysLeft: number; elapsedPct: number } | null;
}) {
  const pct = (now: number, before: number) => (before === 0 ? (now > 0 ? 100 : 0) : Math.round(((now - before) / before) * 100));

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <Tile icon={<Building2 size={14} />} tone="primary" label="Live on V-RENT" delay={40}
        foot={<p className="text-[12.5px] text-p1-text-3">of {inWorkspace} {inWorkspace === 1 ? 'listing' : 'listings'} in your workspace</p>}>
        <span className={big}><CountUp value={published} /></span>
      </Tile>

      <Tile icon={<Eye size={14} />} tone="info" label="Views, 30 days" delay={80}
        foot={views
          ? <Sparkline data={views.series} height={30} width={200} stretch className="w-full" tone="primary" label="Daily views over the last 30 days" />
          : <p className="text-[12.5px] leading-5 text-p1-text-3">Counted once the tenant site records traffic.</p>}>
        {views ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className={big}><CountUp value={views.total} /></span>
            {views.prior > 0 && <Delta pct={pct(views.total, views.prior)} since="previous 30 days" />}
            <ModelledChip />
          </div>
        ) : <span className="font-p1display text-[18px] font-semibold leading-tight text-p1-text-3 sm:text-[22px]">Not counted yet</span>}
      </Tile>

      <Tile icon={<MessageSquare size={14} />} tone="success" label="Enquiries, 30 days" delay={120}
        foot={<Sparkline data={enquiries.weeks} height={30} width={200} stretch className="w-full" tone="success" label="Enquiries per week over the last 12 weeks" />}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={big}><CountUp value={enquiries.total} /></span>
          {enquiries.prior > 0 && <Delta pct={pct(enquiries.total, enquiries.prior)} since="previous 30 days" />}
        </div>
      </Tile>

      <Tile icon={<CalendarClock size={14} />} tone="accent" label="Until renewal" delay={160}
        foot={renewal ? (
          <div>
            <div className="h-1.5 overflow-hidden rounded-full bg-p1-subtle" role="progressbar" aria-valuenow={renewal.elapsedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Share of the plan year used">
              <div className="acct-fill h-full rounded-full bg-p1-accent" style={{ width: `${renewal.elapsedPct}%` }} />
            </div>
            <p className="mt-1.5 text-[12.5px] text-p1-text-3">{renewal.elapsedPct}% of the plan year used</p>
          </div>
        ) : <p className="text-[12.5px] leading-5 text-p1-text-3">Shown once a payment is on record.</p>}>
        {renewal
          ? <span className={big}><CountUp value={renewal.daysLeft} /><span className="ml-1.5 text-[15px] font-medium text-p1-text-3">days</span></span>
          : <span className="font-p1display text-[18px] font-semibold leading-tight text-p1-text-3 sm:text-[22px]">Not on record</span>}
      </Tile>
    </div>
  );
}

/* ------------------------------------------------------ enquiries per week */

export function EnquiryWeeks({ weeks, labels, className = '' }: { weeks: number[]; labels: string[]; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...weeks);
  const top = max <= 4 ? max : Math.ceil(max / 2) * 2;
  const ticks = top <= 4 ? Array.from({ length: top + 1 }, (_, i) => i) : [0, top / 2, top];
  const total = weeks.reduce((n, v) => n + v, 0);
  const busiest = weeks.indexOf(Math.max(...weeks));

  return (
    <Card as="section" aria-labelledby="enq-weeks-h" padding="none" className={cx('vr-rise flex flex-col', className)}>
      <div className="p-5 pb-0">
        <CardHead id="enq-weeks-h" title="Enquiries received" sub="Per week, last 12 weeks · from your enquiry records" />
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-p1display text-[30px] font-bold leading-none tabular-nums text-p1-text"><CountUp value={total} /></span>
          <span className="text-[12.5px] text-p1-text-3">
            {total > 0 ? `in 12 weeks · busiest was the week to ${labels[busiest]}` : 'in 12 weeks'}
          </span>
        </div>
      </div>

      {total === 0 ? (
        <EmptyState compact icon={<MessageSquare size={18} />} title="No enquiries in the last 12 weeks" description="Enquiries from tenants appear here, week by week, as they arrive." />
      ) : (
        <div ref={ref} className="relative mt-4 px-5 pb-4" onMouseLeave={() => setHover(null)}>
          <div className="relative h-[180px] pl-7">
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 flex items-center" style={{ bottom: `${(t / top) * 100}%` }} aria-hidden>
                <span className="w-6 -translate-y-px pr-1.5 text-right text-[10.5px] tabular-nums text-p1-text-3">{t}</span>
                <span className={cx('h-px flex-1', t === 0 ? 'bg-p1-border' : 'border-t border-dashed border-p1-border')} />
              </div>
            ))}
            <ul className="relative flex h-full items-end gap-1.5 sm:gap-2" aria-label="Enquiries per week">
              {weeks.map((v, i) => (
                <li key={i} className="flex h-full flex-1 items-end">
                  <button
                    type="button"
                    className="group relative flex h-full w-full items-end justify-center focus-visible:outline-none"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    aria-label={`Week to ${labels[i]}: ${v} ${v === 1 ? 'enquiry' : 'enquiries'}`}
                  >
                    <span
                      className={cx(
                        'block w-full max-w-[28px] origin-bottom rounded-t-[4px] transition-[transform,background-color] duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none',
                        i === weeks.length - 1 ? 'bg-p1-success' : 'bg-p1-success/45',
                        hover === i && 'bg-p1-success',
                        seen ? 'scale-y-100' : 'scale-y-0',
                      )}
                      style={{ height: v === 0 ? '2px' : `${(v / top) * 100}%`, transitionDelay: seen ? `${i * 35}ms` : '0ms' }}
                    />
                    {hover === i && (
                      <span className="p1-tip pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-p1-text px-2 py-1 text-[11.5px] font-medium text-p1-surface shadow-p1-md"
                        style={{ bottom: `calc(${v === 0 ? 0 : (v / top) * 100}% + 4px)` }}>
                        {v} · wk to {labels[i]}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-2 flex justify-between pl-7 text-[10.5px] text-p1-text-3" aria-hidden>
            <span>{labels[0]}</span>
            <span>{labels[Math.floor(labels.length / 2)]}</span>
            <span>{labels[labels.length - 1]}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------ views, 30 days */

export function ViewsPanel({ series, labels, className = '' }: { series: number[] | null; labels: string[]; className?: string }) {
  const total = useMemo(() => (series ?? []).reduce((n, v) => n + v, 0), [series]);
  return (
    <Card as="section" aria-labelledby="views-h" padding="none" className={cx('vr-rise flex flex-col', className)}>
      <div className="p-5 pb-0">
        <CardHead id="views-h" title="Portfolio views" sub="Every listing on your plan, last 30 days">
          {series && <ModelledChip />}
        </CardHead>
        {series && (
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3">
            <span className="font-p1display text-[30px] font-bold leading-none tabular-nums text-p1-text"><CountUp value={total} /></span>
            <span className="text-[12.5px] text-p1-text-3">views · {Math.round(total / 30).toLocaleString('en-SG')} a day on average</span>
          </div>
        )}
      </div>
      {series ? (
        <>
          {/* A phone would shrink the plotted chart's axis text past reading; a band carries the shape instead. */}
          <div className="px-5 pb-5 pt-4 sm:hidden">
            <Sparkline data={series} height={96} width={320} stretch className="w-full" label="Daily views over the last 30 days" />
            <div className="mt-2 flex justify-between text-[11.5px] text-p1-text-3" aria-hidden>
              <span>{labels[0]}</span><span>peak {Math.max(...series).toLocaleString('en-SG')} a day</span><span>{labels[labels.length - 1]}</span>
            </div>
          </div>
          <div className="hidden px-2 pb-3 pt-7 sm:block">
            <AreaChart height={210} labels={labels} markPeak series={[{ label: 'Views', points: series, tone: 'primary' }]} />
          </div>
        </>
      ) : (
        <EmptyState
          compact
          className="my-auto"
          icon={<Eye size={18} />}
          title="Views are not counted yet"
          description="The tenant site does not record traffic in this build. Your listings' views will chart here once it does — nothing is estimated for your own portfolio."
        />
      )}
    </Card>
  );
}
