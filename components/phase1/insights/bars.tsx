"use client";

/**
 * Bars and shares for the Insights screens.
 *
 * `BarList`     a ranking: many categories, one measure, read left to right.
 *               Horizontal, because a development name does not fit under a
 *               vertical bar.
 * `GroupedBars` a few categories, a few series, one shared zero baseline —
 *               "three-bedrooms here against three-bedrooms there".
 * `ShareDonut`  a small number of parts of one whole. Never a time series.
 *
 * All three take their colours from the `.p1-ins` categorical ramp by slot, so
 * a development or a measure keeps its colour from one chart to the next.
 */

import React, { useState } from 'react';
import { cx } from '../kit';
import { Donut, useInView } from '../ui/viz';
import { seriesColour, seriesSoft } from './charts';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const EASE = 'cubic-bezier(.16,1,.3,1)';

/* ---------------------------------------------------------------- ranking */

export interface BarItem {
  key: string;
  label: string;
  /** A second line under the label: district, count, basis. */
  sub?: React.ReactNode;
  /** Null when there is too little evidence for a figure. */
  value: number | null;
  /** Printed at the end of the row. Defaults to `valueLabel(value)`. */
  display?: React.ReactNode;
  slot?: number;
  /** Draw this row at full strength and the rest softer — "yours", "selected". */
  marked?: boolean;
  onSelect?: () => void;
  /** Accessible name for `onSelect`. */
  selectLabel?: string;
}

export function BarList({
  items,
  caption,
  slot = 0,
  max,
  valueLabel = (n: number) => n.toLocaleString('en-SG'),
  missingLabel = 'Too few contracts',
  emptyMessage = 'Nothing to rank.',
  className = '',
}: {
  items: BarItem[];
  caption: string;
  slot?: number;
  /** The value a full bar stands for. Defaults to the largest value. */
  max?: number;
  valueLabel?: (n: number) => string;
  missingLabel?: string;
  emptyMessage?: React.ReactNode;
  className?: string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const top = max ?? Math.max(0, ...items.map((i) => i.value ?? 0));
  const anyMarked = items.some((i) => i.marked);

  if (!items.length) {
    return <p className={cx('py-8 text-center text-[13px] text-p1-text-3', className)}>{emptyMessage}</p>;
  }

  return (
    <div ref={ref} className={className}>
      <ul className="space-y-3" aria-label={caption} onPointerLeave={() => setHover(null)}>
        {items.map((it, i) => {
          const s = it.slot ?? slot;
          const pct = !it.value || top <= 0 ? 0 : Math.max(2, (it.value / top) * 100);
          const dim = (hover !== null && hover !== it.key) || (anyMarked && !it.marked && hover === null);
          const body = (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] font-medium text-p1-text">
                  {it.label}
                  {it.sub && <span className="ml-1.5 font-normal text-p1-text-3">{it.sub}</span>}
                </span>
                <span className={cx('shrink-0 text-[13px] tabular-nums', it.value === null ? 'text-p1-text-3' : 'font-semibold text-p1-text')}>
                  {it.value === null ? missingLabel : (it.display ?? valueLabel(it.value))}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: seriesSoft(s) }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: seen ? `${pct}%` : '0%',
                    background: seriesColour(s),
                    opacity: dim ? 0.45 : 1,
                    transition: reducedMotion()
                      ? 'opacity 140ms ease'
                      : `width 700ms ${EASE} ${i * 45}ms, opacity 160ms ease`,
                  }}
                />
              </div>
            </>
          );
          return (
            <li key={it.key} onPointerEnter={() => setHover(it.key)}>
              {it.onSelect ? (
                <button
                  type="button"
                  onClick={it.onSelect}
                  aria-label={it.selectLabel}
                  className="-mx-2 block w-[calc(100%+1rem)] cursor-pointer rounded-lg px-2 py-1 text-left transition-colors hover:bg-ins-inset focus-visible:outline-2 focus-visible:outline-p1-primary"
                >
                  {body}
                </button>
              ) : (
                <div className="py-1">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------ grouped bars */

export interface GroupSeries {
  key: string;
  label: string;
  slot: number;
  /** One per category. Null where there is too little evidence. */
  values: (number | null)[];
}

function niceMax(v: number): { top: number; step: number } {
  if (v <= 0) return { top: 1, step: 1 };
  const raw = v / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  return { top: Math.ceil(v / step) * step, step };
}

export function GroupedBars({
  categories,
  series,
  caption,
  height = 240,
  valueLabel = (n: number) => n.toLocaleString('en-SG'),
  tickLabel,
  missingLabel = 'Too few contracts',
  className = '',
}: {
  categories: string[];
  series: GroupSeries[];
  caption: string;
  height?: number;
  valueLabel?: (n: number) => string;
  /** A shorter form for the axis, e.g. "$6k". */
  tickLabel?: (n: number) => string;
  missingLabel?: string;
  className?: string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const { top, step } = niceMax(Math.max(0, ...all));
  const ticks: number[] = [];
  for (let t = 0; t <= top + step / 1000; t += step) ticks.push(t);
  const tick = tickLabel ?? valueLabel;

  if (!all.length) {
    return (
      <div className={cx('flex items-center justify-center rounded-xl border border-dashed border-ins-line bg-ins-inset px-6 text-center', className)} style={{ height }}>
        <p className="max-w-xs text-[13px] leading-5 text-p1-text-3">Not enough contracts to compare at these sizes.</p>
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <div className="relative" style={{ height }}>
        {/* the scale, from zero */}
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute inset-x-0 flex items-center"
            style={{ bottom: `${(t / top) * 100}%`, transform: 'translateY(50%)' }}
            aria-hidden
          >
            <span className="w-11 shrink-0 pr-2 text-right text-[11px] tabular-nums text-p1-text-3">{tick(t)}</span>
            <span className={cx('h-px flex-1', t === 0 ? 'bg-ins-line-strong' : 'bg-ins-grid')} />
          </div>
        ))}

        <div className="absolute inset-y-0 left-11 right-0 flex" onPointerLeave={() => setHover(null)}>
          {categories.map((c, ci) => (
            <div
              key={c}
              className={cx('relative flex h-full min-w-0 flex-1 items-end justify-center gap-[3px] rounded-t-lg px-[6%] transition-colors sm:px-[10%]', hover === ci && 'bg-ins-inset/70')}
              onPointerEnter={() => setHover(ci)}
              onPointerDown={() => setHover(ci)}
            >
              {series.map((s, si) => {
                const v = s.values[ci];
                return (
                  <div key={s.key} className="flex h-full min-w-0 max-w-9 flex-1 flex-col justify-end">
                    {v === null ? (
                      <div className="h-1 rounded-full border border-dashed" style={{ borderColor: seriesColour(s.slot) }} title={`${s.label}: ${missingLabel}`} />
                    ) : (
                      <div
                        className="w-full rounded-t-[5px]"
                        style={{
                          height: seen ? `${(v / top) * 100}%` : '0%',
                          background: seriesColour(s.slot),
                          opacity: hover === null || hover === ci ? 1 : 0.55,
                          transition: reducedMotion()
                            ? 'opacity 140ms ease'
                            : `height 700ms ${EASE} ${ci * 70 + si * 40}ms, opacity 160ms ease`,
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {hover === ci && (
                <div className="ins-swap pointer-events-none absolute left-1/2 top-1 z-10 w-max min-w-[160px] max-w-[240px] -translate-x-1/2 rounded-lg border border-ins-line bg-ins-raised px-3 py-2 shadow-ins-raised">
                  <div className="mb-1 text-[12px] font-semibold text-p1-text">{c}</div>
                  {series.map((s) => (
                    <div key={s.key} className="flex items-center gap-2 py-0.5 text-[12px]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: seriesColour(s.slot) }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-p1-text-2">{s.label}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-p1-text">
                        {s.values[ci] === null ? '—' : valueLabel(s.values[ci] as number)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="ml-11 mt-2 flex">
        {categories.map((c) => (
          <span key={c} className="min-w-0 flex-1 truncate text-center text-[12px] font-medium text-p1-text-2">{c}</span>
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {series.map((s) => (
          <li key={s.key} className="flex min-w-0 items-center gap-2 text-[12.5px] text-p1-text-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: seriesColour(s.slot) }} aria-hidden />
            <span className="truncate">{s.label}</span>
          </li>
        ))}
      </ul>

      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr><th scope="col">Size</th>{series.map((s) => <th key={s.key} scope="col">{s.label}</th>)}</tr>
          </thead>
          <tbody>
            {categories.map((c, ci) => (
              <tr key={c}>
                <th scope="row">{c}</th>
                {series.map((s) => <td key={s.key}>{s.values[ci] === null ? missingLabel : valueLabel(s.values[ci] as number)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ donut */

export interface Share { key: string; label: string; value: number; slot: number }

/** Parts of one whole — at most six, or it stops being readable. */
export function ShareDonut({
  shares,
  centre,
  caption,
  size = 164,
  className = '',
}: {
  shares: Share[];
  centre: React.ReactNode;
  caption?: React.ReactNode;
  size?: number;
  className?: string;
}) {
  const shown = shares.filter((s) => s.value > 0);
  if (!shown.length) {
    return <p className={cx('py-8 text-center text-[13px] text-p1-text-3', className)}>Nothing to break down.</p>;
  }
  return (
    <Donut
      className={cx('justify-center', className)}
      size={size}
      thickness={22}
      centre={centre}
      caption={caption}
      slices={shown.map((s) => ({ label: s.label, value: s.value, colour: seriesColour(s.slot) }))}
    />
  );
}
