"use client";

/**
 * The portfolio trend: four figures that are also the chart's tabs.
 *
 * Choosing a figure draws it, in that figure's own colour. The headline on each
 * tab is the sum of the line it draws, and the dashed line is the same
 * arithmetic on the period before, so the change printed on the tab is the gap
 * you can see between the two.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Info, LineChart } from 'lucide-react';
import { AreaChart, CountUp, Delta, Segmented, StackedBars, Tooltip, cx } from '../kit';
import { dayLabels, foldWeekly, pctChange, type KpiKey, type PortfolioWindow, type WindowDays } from './model';
import { MEASURE } from './palette';

const TABS: { key: KpiKey; label: string }[] = [
  { key: 'views', label: 'Views' },
  { key: 'saves', label: 'Saves' },
  { key: 'enquiries', label: 'Enquiries' },
  { key: 'rate', label: 'Enquiry rate' },
];

type Shape = 'area' | 'bars';

/** True below the small breakpoint. False on the server and on first paint, so hydration matches. */
function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

/* Bars read one value per column, so ninety days are folded into weeks; a rate is averaged, a count is summed. */
function toBars(current: number[], labels: string[], days: number, metric: KpiKey) {
  if (days <= 30) return { labels, values: current };
  const values: number[] = [];
  const weekLabels: string[] = [];
  for (let i = days % 7; i < days; i += 7) {
    const chunk = current.slice(i, i + 7);
    const total = chunk.reduce((n, v) => n + v, 0);
    values.push(metric === 'rate' ? Math.round((total / chunk.length) * 10) / 10 : Math.round(total));
    weekLabels.push(`w/c ${labels[i]}`);
  }
  return { labels: weekLabels, values };
}

export function TrendPanel({ data, days, today, waiting }: {
  data: PortfolioWindow; days: WindowDays; today: Date; waiting: number;
}) {
  const [metric, setMetric] = useState<KpiKey>('views');
  const [compare, setCompare] = useState(true);
  const [shape, setShape] = useState<Shape>('area');
  const narrow = useNarrow();
  const labels = useMemo(() => dayLabels(days, today), [days, today]);
  const tab = TABS.find((t) => t.key === metric)!;
  const colour = MEASURE[metric].colour;
  const { current, previous } = data.series[metric];
  const bars = useMemo(() => toBars(current, labels, days, metric), [current, labels, days, metric]);
  const fmt = (n: number) => (metric === 'rate' ? `${n.toFixed(1)}%` : Math.round(n).toLocaleString('en-SG'));
  const panelId = 'perf-trend-panel';

  return (
    <section aria-labelledby="perf-trend-h" className="overflow-hidden rounded-2xl border border-p1-border bg-p1-surface shadow-p1-sm">
      <h2 id="perf-trend-h" className="sr-only">Portfolio trend</h2>

      <div role="tablist" aria-label="Figure to chart" className="grid grid-cols-2 border-b border-p1-border lg:grid-cols-4">
        {TABS.map((t, i) => {
          const on = t.key === metric;
          const m = MEASURE[t.key];
          const value = data.totals[t.key];
          const pct = pctChange(value, data.previous[t.key]);
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`perf-tab-${t.key}`}
              aria-selected={on}
              aria-controls={panelId}
              onClick={() => setMetric(t.key)}
              className={cx(
                'group relative min-w-0 cursor-pointer px-4 pb-4 pt-4 text-left transition-[background-color] duration-300 focus-visible:z-[1] focus-visible:shadow-[inset_0_0_0_2px_var(--p1-ring)] focus-visible:outline-none sm:px-5',
                i % 2 === 1 && 'border-l border-p1-border',
                i >= 2 && 'border-t border-p1-border lg:border-t-0',
                i === 2 && 'lg:border-l',
                !on && 'hover:bg-p1-subtle/70',
              )}
              style={on ? { background: `linear-gradient(to bottom, ${m.soft}, var(--p1-surface) 85%)` } : undefined}
            >
              {/* The selected figure carries its colour along the top edge, the same colour its line is drawn in. */}
              <span
                aria-hidden
                className={cx('absolute inset-x-0 top-0 h-[3px] origin-left transition-transform duration-300 ease-[var(--p1-ease)]', on ? 'scale-x-100' : 'scale-x-0')}
                style={{ background: m.colour }}
              />
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-p1-text-3">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: m.colour, opacity: on ? 1 : 0.7 }} />
                <span className={on ? 'text-p1-text-2' : undefined}>{t.label}</span>
              </span>
              <span className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className={cx('font-p1display text-[26px] font-bold leading-none tracking-[-0.03em] sm:text-[30px]', on ? 'text-p1-text' : 'text-p1-text-2')}>
                  <CountUp key={`${t.key}-${days}`} value={value} decimals={t.key === 'rate' ? 1 : 0} suffix={t.key === 'rate' ? '%' : ''} duration={700} />
                </span>
                <Delta pct={pct} since={`previous ${days} days`} />
              </span>
              <span className="mt-2.5 flex min-h-6 items-end justify-between gap-2">
                <TabFoot kind={t.key} data={data} waiting={waiting} />
              </span>
            </button>
          );
        })}
      </div>

      <div id={panelId} role="tabpanel" aria-labelledby={`perf-tab-${metric}`} className="px-2 pb-3 pt-4 sm:px-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-3">
          <p className="flex items-center gap-2 text-[13px] text-p1-text-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: colour }} />
            <span className="font-semibold text-p1-text">{tab.label}</span>
            <span className="text-p1-text-3">· {shape === 'bars' && days > 30 ? 'weekly' : 'daily'}, last {days} days</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<Shape>
              label="Chart style"
              size="sm"
              value={shape}
              onChange={setShape}
              options={[
                { key: 'area', label: <span className="sr-only sm:not-sr-only">Trend</span>, icon: <LineChart size={13} aria-hidden /> },
                { key: 'bars', label: <span className="sr-only sm:not-sr-only">Bars</span>, icon: <BarChart3 size={13} aria-hidden /> },
              ]}
            />
            <button
              type="button"
              role="switch"
              aria-checked={compare && shape === 'area'}
              disabled={shape === 'bars'}
              title={shape === 'bars' ? 'The comparison is drawn on the trend view' : undefined}
              onClick={() => setCompare((c) => !c)}
              className={cx(
                'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[12px] font-medium transition-colors focus-visible:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none',
                shape === 'bars' ? 'cursor-not-allowed border-p1-border text-p1-text-3 opacity-50'
                  : compare ? 'cursor-pointer border-p1-border-strong bg-p1-subtle text-p1-text' : 'cursor-pointer border-p1-border text-p1-text-3 hover:text-p1-text',
              )}
            >
              <span aria-hidden className={cx('w-3.5 border-t-[1.5px] border-dashed', compare ? 'border-p1-text-2' : 'border-p1-text-3')} />
              Previous {days} days
            </button>
            <Tooltip content="Views, saves and enquiries for the demo account are modelled from each listing, the same way every time. Your own listings are counted once the tenant site is live." side="bottom">
              <span tabIndex={0} className="inline-flex h-8 items-center gap-1 rounded-full bg-p1-subtle px-2.5 text-[12px] font-medium text-p1-text-3">
                <Info size={12} aria-hidden /> Modelled
              </span>
            </Tooltip>
          </div>
        </div>
        {shape === 'bars' ? (
          <div className="px-3 pb-1 pt-2">
            <StackedBars
              key={`${metric}-${days}`}
              height={narrow ? 170 : 206}
              labels={bars.labels}
              valueLabel={fmt}
              series={[{ label: tab.label, values: bars.values, colour }]}
            />
          </div>
        ) : (
          <AreaChart
            key={`${metric}-${days}-${compare}-${narrow}`}
            width={narrow ? 360 : 720}
            height={narrow ? 220 : 250}
            labels={labels}
            dots={days <= 7}
            markPeak={!compare && days <= 30}
            valueLabel={fmt}
            series={[
              { label: `Last ${days} days`, points: current, colour },
              ...(compare ? [{ label: `Previous ${days} days`, points: previous, ghost: true }] : []),
            ]}
          />
        )}
      </div>
    </section>
  );
}

/** Small weekly bars in a measure's colour. */
function MiniWeeks({ data, colour }: { data: number[]; colour: string }) {
  const max = Math.max(1, ...data);
  return (
    <span className="hidden h-6 items-end gap-[2px] sm:flex" aria-hidden>
      {data.slice(-10).map((v, i) => (
        <span key={i} className="w-[5px] rounded-[1.5px]" style={{ height: `${Math.max(12, (v / max) * 100)}%`, background: colour, opacity: 0.35 + 0.65 * (v / max) }} />
      ))}
    </span>
  );
}

/** The line under each figure. Different on each tab, because each figure needs a different kind of context. */
function TabFoot({ kind, data, waiting }: { kind: KpiKey; data: PortfolioWindow; waiting: number }) {
  const { totals, previous, series } = data;
  if (kind === 'views') {
    return (
      <>
        <span className="truncate text-[12px] text-p1-text-3">{previous.views.toLocaleString('en-SG')} before</span>
        <MiniWeeks data={foldWeekly(series.views.current)} colour={MEASURE.views.colour} />
      </>
    );
  }
  if (kind === 'saves') {
    const per100 = totals.views ? Math.round((totals.saves / totals.views) * 1000) / 10 : 0;
    return (
      <>
        <span className="truncate text-[12px] text-p1-text-3">{per100} per 100 views</span>
        <MiniWeeks data={foldWeekly(series.saves.current)} colour={MEASURE.saves.colour} />
      </>
    );
  }
  if (kind === 'enquiries') {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[12px] text-p1-text-2">
        {waiting > 0 && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: MEASURE.enquiries.colour }} />}
        {waiting ? `${waiting} waiting for a reply` : 'None waiting for a reply'}
      </span>
    );
  }
  // Now against before, as two bars on the same scale: the change is visible without reading either number.
  const top = Math.max(totals.rate, previous.rate, 0.1);
  return (
    <span className="grid w-full max-w-[160px] gap-1" aria-hidden>
      {[{ v: totals.rate, c: MEASURE.rate.colour }, { v: previous.rate, c: 'var(--p1-border-strong)' }].map((b, i) => (
        <span key={i} className="h-1.5 overflow-hidden rounded-full bg-p1-subtle">
          <span className="block h-full rounded-full transition-[width] duration-700 ease-[var(--p1-ease)]" style={{ width: `${(b.v / top) * 100}%`, background: b.c }} />
        </span>
      ))}
    </span>
  );
}
