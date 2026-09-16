"use client";

/**
 * The chart panels beyond the trend line. Each shape is chosen for the one
 * question it answers best:
 *
 *  - a donut for "what share comes from where" (parts of one whole);
 *  - stacked weekly bars for "which unit sizes draw demand, and is it moving";
 *  - a week-by-weekday grid for "when do tenants look".
 *
 * All three read the same modelled series as the rest of the page.
 */

import React, { useMemo, useState } from 'react';
import { CalendarDays, MapPin, BedDouble } from 'lucide-react';
import { Donut, EmptyState, StackedBars, cx, useInView } from '../kit';
import type { DemoListing } from '../../../lib/phase1/data';
import { districtName, metricRate, portfolioSeries, viewsSeries } from '../../../lib/phase1/performance';
import type { Ranked } from './panels';
import { MEASURE, ramp } from './palette';

/* Validated categorical palette from the tokens, in its validated order. */
const CAT = ['var(--p1-chart-1)', 'var(--p1-chart-3)', 'var(--p1-chart-2)', 'var(--p1-chart-4)', 'var(--p1-chart-5)', 'var(--p1-border-strong)'];

const WEEKS = 12;
const DAY_MS = 86_400_000;
const SHORT = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' });

function PanelHead({ id, icon, title, sub }: { id: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-p1-subtle text-p1-text-2">{icon}</span>
      <div className="min-w-0">
        <h2 id={id} className="text-[15px] font-semibold tracking-[-0.01em] text-p1-text">{title}</h2>
        <p className="mt-0.5 text-[12.5px] text-p1-text-3">{sub}</p>
      </div>
    </div>
  );
}

const shell = 'rounded-2xl border border-p1-border bg-p1-surface p-5 shadow-p1-sm';

/* ------------------------------------------------------------ district donut */

export function DistrictDonut({ rows, days }: { rows: Ranked[]; days: number }) {
  const slices = useMemo(() => {
    const m = new Map<number, number>();
    for (const { l, w } of rows) m.set(l.district, (m.get(l.district) ?? 0) + w.enquiries);
    const sorted = [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const head = sorted.slice(0, 5).map(([d, v], i) => ({ label: `${districtName(d)} · D${String(d).padStart(2, '0')}`, value: v, colour: CAT[i] }));
    const rest = sorted.slice(5).reduce((n, [, v]) => n + v, 0);
    return rest ? [...head, { label: 'Other districts', value: rest, colour: CAT[5] }] : head;
  }, [rows]);
  const total = slices.reduce((n, s) => n + s.value, 0);
  const lead = slices[0];

  return (
    <section aria-labelledby="perf-donut-h" className={shell}>
      <PanelHead id="perf-donut-h" icon={<MapPin size={15} />} title="Where enquiries come from" sub={`Share of enquiries by district · last ${days} days`} />
      {total === 0 ? (
        <EmptyState compact title="No enquiries in this period" description="Try a longer period." />
      ) : (
        <Donut
          className="mt-5 justify-center sm:justify-start"
          size={176}
          thickness={24}
          slices={slices}
          centre={(
            <>
              <span className="font-p1display text-[26px] font-bold leading-none tabular-nums text-p1-text">{total.toLocaleString('en-SG')}</span>
              <span className="mt-1 text-[11.5px] text-p1-text-3">enquiries</span>
            </>
          )}
          caption={lead && `${lead.label.split(' · ')[0]} brings ${Math.round((lead.value / total) * 100)}% of all enquiries.`}
        />
      )}
    </section>
  );
}

/* ------------------------------------------------------- unit-size demand */

const BANDS: { label: string; test: (l: DemoListing) => boolean; colour: string }[] = [
  { label: '1–2 bedrooms', test: (l) => l.bedrooms <= 2, colour: 'var(--p1-chart-4)' },
  { label: '3 bedrooms', test: (l) => l.bedrooms === 3, colour: 'var(--p1-chart-5)' },
  { label: '4+ bedrooms', test: (l) => l.bedrooms >= 4, colour: 'var(--p1-chart-2)' },
];

/** Weekly totals over the last twelve weeks, oldest first. */
function weekly(daily: number[]): number[] {
  return Array.from({ length: WEEKS }, (_, w) => daily.slice(w * 7, w * 7 + 7).reduce((n, v) => n + v, 0));
}

function weekLabels(today: Date): string[] {
  return Array.from({ length: WEEKS }, (_, w) => `w/c ${SHORT.format(new Date(today.getTime() - (WEEKS * 7 - 1 - w * 7) * DAY_MS))}`);
}

export function UnitSizeDemand({ live, today }: { live: DemoListing[]; today: Date }) {
  const { series, totals } = useMemo(() => {
    const out = BANDS.map((b) => {
      const daily = Array(WEEKS * 7).fill(0) as number[];
      for (const l of live.filter(b.test)) {
        const r = metricRate(l, 'enquiries');
        viewsSeries(l, WEEKS * 7).forEach((v, i) => { daily[i] += v * r; });
      }
      return { label: b.label, colour: b.colour, values: weekly(daily).map((v) => Math.round(v)) };
    }).filter((s) => s.values.some((v) => v > 0));
    return { series: out, totals: out.map((s) => s.values.reduce((n, v) => n + v, 0)) };
  }, [live]);
  const labels = useMemo(() => weekLabels(today), [today]);
  const all = totals.reduce((n, v) => n + v, 0);
  const leadIdx = totals.indexOf(Math.max(...totals));

  return (
    <section aria-labelledby="perf-units-h" className={shell}>
      <PanelHead id="perf-units-h" icon={<BedDouble size={15} />} title="Demand by unit size" sub={`Enquiries per week · last ${WEEKS} weeks`} />
      {all === 0 ? (
        <EmptyState compact title="No enquiries in the last 12 weeks" />
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {series.map((s, i) => (
              <div key={s.label} className="min-w-0">
                <div className="font-p1display text-[20px] font-bold leading-none tabular-nums" style={{ color: s.colour }}>
                  {Math.round((totals[i] / all) * 100)}<span className="text-[13px] font-semibold text-p1-text-3">%</span>
                </div>
                <div className={cx('mt-1 text-[12px]', i === leadIdx ? 'font-medium text-p1-text-2' : 'text-p1-text-3')}>{s.label}</div>
              </div>
            ))}
          </div>
          <StackedBars className="mt-4" height={150} labels={labels} series={series} valueLabel={(n) => `${n}`} />
        </>
      )}
    </section>
  );
}

/* --------------------------------------------------------- browse calendar */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Monday-first weekday of a moment, in Singapore. */
const sgWeekday = (d: Date) => (new Date(d.getTime() + 8 * 3_600_000).getUTCDay() + 6) % 7;

export function BrowseCalendar({ live, today }: { live: DemoListing[]; today: Date }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [tip, setTip] = useState<string | null>(null);

  const { grid, avg, max, min, bestDay } = useMemo(() => {
    const days = WEEKS * 7;
    const daily = portfolioSeries(live, 'views', days);
    // Rows are weekdays, columns are weeks ending this week; a cell outside the window stays empty.
    const g: ({ v: number; date: Date } | null)[][] = WEEKDAYS.map(() => Array(WEEKS).fill(null));
    const lastWeekday = sgWeekday(today);
    daily.forEach((v, i) => {
      const date = new Date(today.getTime() - (days - 1 - i) * DAY_MS);
      const agoDays = days - 1 - i;
      const col = WEEKS - 1 - Math.floor((agoDays + (6 - lastWeekday)) / 7);
      if (col >= 0) g[sgWeekday(date)][col] = { v, date };
    });
    const sums = Array(7).fill(0) as number[];
    const counts = Array(7).fill(0) as number[];
    g.forEach((row, d) => row.forEach((c) => { if (c) { sums[d] += c.v; counts[d] += 1; } }));
    const a = sums.map((s, d) => (counts[d] ? Math.round(s / counts[d]) : 0));
    const seenDays = daily.filter((v) => v > 0);
    return { grid: g, avg: a, max: Math.max(1, ...daily), min: seenDays.length ? Math.min(...seenDays) : 0, bestDay: a.indexOf(Math.max(...a)) };
  }, [live, today]);
  const avgMax = Math.max(1, ...avg);

  // Stretched between the quietest and busiest day with any views, so a steady week still shows its shape.
  const shade = (v: number) => (v === 0 ? 'var(--p1-subtle)' : ramp(MEASURE.views.colour, max > min ? (v - min) / (max - min) : 1));

  return (
    <section aria-labelledby="perf-cal-h" className={shell}>
      <PanelHead id="perf-cal-h" icon={<CalendarDays size={15} />} title="When tenants browse" sub={`Daily views, by weekday · last ${WEEKS} weeks`} />

      <div ref={ref} className="mt-4 flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex gap-2">
            <div className="flex shrink-0 flex-col gap-[3px] text-[10.5px] leading-none text-p1-text-3">
              {WEEKDAYS.map((d) => <span key={d} className="flex flex-1 items-center">{d}</span>)}
            </div>
            <div
              role="img"
              aria-label={`Average daily views: ${WEEKDAYS.map((d, i) => `${d} ${avg[i]}`).join(', ')}`}
              className="grid min-w-0 flex-1 gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`, gridTemplateRows: 'repeat(7, minmax(0, 1fr))', gridAutoFlow: 'row' }}
            >
              {grid.map((row, d) => row.map((c, w) => (
                <div
                  key={`${d}-${w}`}
                  onMouseEnter={() => c && setTip(`${WEEKDAYS[d]} ${SHORT.format(c.date)} — ${c.v.toLocaleString('en-SG')} views`)}
                  onMouseLeave={() => setTip(null)}
                  className="aspect-square rounded-[3px] transition-[opacity,transform] duration-300 hover:ring-2 hover:ring-p1-text motion-reduce:transition-none"
                  style={{
                    background: c ? shade(c.v) : 'transparent',
                    opacity: seen ? 1 : 0,
                    transform: seen ? 'none' : 'scale(.6)',
                    transitionDelay: `${w * 22 + d * 8}ms`,
                  }}
                />
              )))}
            </div>
          </div>
          <p className="mt-2 min-h-5 text-[12px] text-p1-text-3" aria-live="polite">
            {tip ?? <>Busiest on <span className="font-medium text-p1-text-2">{WEEKDAYS[bestDay]}</span>, about {avg[bestDay].toLocaleString('en-SG')} views a day</>}
          </p>
        </div>

        {/* The same grid, averaged per weekday: the answer without reading every cell. */}
        <ul className="hidden w-24 shrink-0 flex-col justify-between gap-[3px] sm:flex" aria-hidden>
          {avg.map((v, d) => (
            <li key={d} className="flex flex-1 items-center gap-1.5">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-p1-subtle">
                <span
                  className="block h-full rounded-full"
                  style={{ background: MEASURE.views.colour, opacity: d === bestDay ? 1 : 0.45, width: seen ? `${(v / avgMax) * 100}%` : '0%', transition: `width 700ms cubic-bezier(.16,1,.3,1) ${d * 50}ms` }}
                />
              </span>
              <span className="w-7 text-right text-[10.5px] tabular-nums text-p1-text-3">{v}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
