"use client";

/**
 * The Insights charts.
 *
 * Drawn by hand in SVG, like the rest of this product's figures, and for the
 * same reasons: no charting library's defaults look like anything but a
 * charting library, every mark here has to read the theme tokens so it survives
 * the dark theme, and the whole module has to stay light enough to open twenty
 * times a day.
 *
 * Three decisions are worth stating, because they are the ones that separate
 * these from the usual dashboard graphics.
 *
 * **They are measured, not scaled.** The plot is laid out in real pixels
 * against the width the container actually has, rather than drawn into a fixed
 * viewBox and stretched. A stretched viewBox takes its axis labels with it, and
 * ten-pixel type inside a 760-unit box rendered into a 340-pixel phone column
 * comes out at four and a half pixels. Measuring costs a ResizeObserver and
 * buys a chart that is legible on a phone.
 *
 * **A gap is a gap.** A month with no lodged contracts is missing, not zero. It
 * breaks the line rather than dragging it to the floor, and the tooltip says
 * "no contracts" rather than "$0".
 *
 * **Every figure answers a question.** The panel that holds a chart carries the
 * question in its header. One that cannot be given a question is decoration,
 * and decoration was the thing this redesign was for removing.
 *
 * Colour comes from the six-step categorical order on `.p1-ins`, assigned by
 * the entity and never by rank, so removing one project from a comparison does
 * not repaint the two that remain. Identity is never carried by colour alone:
 * two or more series always get a legend, and up to four are directly labelled
 * as well.
 */

import React, { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cx } from '../kit';
import { useInView } from '../ui/viz';

/* ------------------------------------------------------------- primitives */

/** The six categorical steps, in fixed order. */
export const SERIES_VARS = [
  'var(--ins-s1)', 'var(--ins-s2)', 'var(--ins-s3)',
  'var(--ins-s4)', 'var(--ins-s5)', 'var(--ins-s6)',
] as const;

export const SERIES_SOFT_VARS = [
  'var(--ins-s1-soft)', 'var(--ins-s2-soft)', 'var(--ins-s3-soft)',
  'var(--ins-s4-soft)', 'var(--ins-s5-soft)', 'var(--ins-s6-soft)',
] as const;

/** The colour for slot `i`. A seventh series folds back rather than inventing a hue. */
export const seriesColour = (i: number) => SERIES_VARS[i % SERIES_VARS.length];
export const seriesSoft = (i: number) => SERIES_SOFT_VARS[i % SERIES_SOFT_VARS.length];

/** The container's width in CSS pixels, so the plot can be laid out in them. */
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setW(el.getBoundingClientRect().width);
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Axis ticks a reader recognises.
 *
 * Snapped to 1, 2 or 5 times a power of ten, so the gridlines fall on $500 and
 * $1,000 rather than on $437 — which is what dividing the range by four gives
 * you, and what makes a chart look computed rather than drawn.
 */
function niceTicks(lo: number, hi: number, count = 4): number[] {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / Math.max(1, count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const n = raw / magnitude;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * magnitude;
  const first = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = first; v <= hi + step * 0.001; v += step) out.push(Number(v.toFixed(6)));
  return out.length ? out : [lo, hi];
}

/** A smooth path, tightened so a spike stays a spike and never overshoots. */
function smooth(pts: { x: number; y: number }[]): string {
  if (!pts.length) return '';
  if (pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  let d = `M${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.26;
    d += ` C${(p1.x + (p2.x - p0.x) * t).toFixed(2)} ${(p1.y + (p2.y - p0.y) * t).toFixed(2)}`
      + ` ${(p2.x - (p3.x - p1.x) * t).toFixed(2)} ${(p2.y - (p3.y - p1.y) * t).toFixed(2)}`
      + ` ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/** Runs of consecutive readings, so a missing month breaks the line. */
function runs(points: (number | null)[]): { from: number; values: number[] }[] {
  const out: { from: number; values: number[] }[] = [];
  let current: { from: number; values: number[] } | null = null;
  points.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) { current = null; return; }
    if (!current) { current = { from: i, values: [] }; out.push(current); }
    current.values.push(v);
  });
  return out;
}

/* ------------------------------------------------------------------ legend */

export interface LegendItem { label: string; colour: string; hint?: string }

export function Legend({ items, className = '' }: { items: LegendItem[]; className?: string }) {
  if (items.length < 2) return null;
  return (
    <ul className={cx('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {items.map((s) => (
        <li key={s.label} className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-p1-text-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.colour }} aria-hidden />
          <span className="truncate">{s.label}</span>
          {s.hint && <span className="shrink-0 text-p1-text-3">{s.hint}</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * The same numbers as a table, for a screen reader and for anyone who wants the
 * figures rather than the shape. Hidden visually, present in the document.
 *
 * The `sr-only` class goes on a wrapping div and never on the table itself. A
 * table is not obliged to honour a width smaller than its own content, so
 * `width: 1px` does nothing to it: the table lays out at its full natural
 * width, stays in flow, and pushes the document sideways — a horizontal
 * scrollbar on every page carrying a chart, caused by the very markup that was
 * supposed to be invisible. A block-level div does honour it, and clips.
 */
function DataTableFallback({
  caption, labels, series, valueLabel,
}: {
  caption: string;
  labels: string[];
  series: { label: string; points: (number | null)[] }[];
  valueLabel: (n: number) => string;
}) {
  return (
    <div className="sr-only">
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Period</th>
          {series.map((s) => <th key={s.label} scope="col">{s.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {labels.map((l, i) => (
          <tr key={l + i}>
            <th scope="row">{l}</th>
            {series.map((s) => (
              <td key={s.label}>{s.points[i] === null || s.points[i] === undefined ? 'No contracts' : valueLabel(s.points[i] as number)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

/* -------------------------------------------------------------- trend chart */

export interface TrendSeries {
  key: string;
  label: string;
  /** Null where the period carried no contracts. */
  points: (number | null)[];
  /** Slot in the categorical order. Tied to the entity, never to its rank. */
  slot: number;
}

/**
 * The module's main figure: one or more series across the same months.
 *
 * Drawn as an area when there is a single series — the fill carries the sense
 * of a level — and as plain lines when several are being compared, because
 * stacked translucent fills stop being readable at three.
 */
export function TrendChart({
  labels,
  series,
  kind = 'auto',
  height = 260,
  valueLabel = (n: number) => n.toLocaleString('en-SG'),
  reference,
  caption,
  emptyMessage = 'No contracts in this period.',
  className = '',
}: {
  labels: string[];
  series: TrendSeries[];
  /** 'bars' suits a count; 'area' a level; 'auto' picks by series count. */
  kind?: 'auto' | 'area' | 'line' | 'bars';
  height?: number;
  valueLabel?: (n: number) => string;
  /** A horizontal line the series should be read against, e.g. the period median. */
  reference?: { value: number; label: string } | null;
  caption: string;
  emptyMessage?: React.ReactNode;
  className?: string;
}) {
  const [holder, width] = useWidth<HTMLDivElement>();
  const [inViewRef, seen] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, '');

  const shape = kind === 'auto' ? (series.length > 1 ? 'line' : 'area') : kind;

  const all = series.flatMap((s) => s.points).filter((v): v is number => v !== null && Number.isFinite(v));
  const hasData = all.length > 0;

  /* Room for the widest tick label, so a five-figure rent never overhangs the
     plot. Measured from the text rather than guessed at a constant. */
  const padL = Math.min(78, Math.max(40, valueLabel(Math.max(...(hasData ? all : [0]))).length * 7.2 + 14));
  const padR = 14;
  const padT = 16;
  const padB = 30;
  const W = Math.max(0, width);
  const H = height;
  const plotW = Math.max(0, W - padL - padR);
  const plotH = Math.max(0, H - padT - padB);

  /* Bars are measured from zero; a level is not, because starting a rent axis
     at zero flattens a year of movement into a straight line. */
  const rawMin = hasData ? Math.min(...all) : 0;
  const rawMax = hasData ? Math.max(...all) : 1;
  const pad = (rawMax - rawMin) * 0.18 || Math.max(1, rawMax * 0.1);
  const lo = shape === 'bars' ? 0 : Math.max(0, rawMin - pad);
  const hi = shape === 'bars' ? rawMax * 1.12 : rawMax + pad;
  const span = hi - lo || 1;

  const n = Math.max(1, labels.length - 1);
  const x = useCallback(
    (i: number) => padL + (labels.length === 1 ? plotW / 2 : (i / n) * plotW),
    [padL, plotW, n, labels.length],
  );
  const y = useCallback((v: number) => padT + (1 - (v - lo) / span) * plotH, [padT, plotH, lo, span]);

  const ticks = useMemo(() => niceTicks(lo, hi, 4), [lo, hi]);

  /* Every label if they fit, otherwise the first, the last and an even spread
     between — never a rotated axis, which nobody reads. */
  const labelEvery = useMemo(() => {
    if (!labels.length || plotW <= 0) return 1;
    const widest = Math.max(...labels.map((l) => l.length)) * 6 + 16;
    return Math.max(1, Math.ceil((labels.length * widest) / Math.max(1, plotW)));
  }, [labels, plotW]);

  const pick = useCallback((clientX: number, rect: DOMRect) => {
    if (plotW <= 0 || !labels.length) return null;
    const rel = clientX - rect.left - padL;
    const i = Math.round((rel / plotW) * n);
    return Math.max(0, Math.min(labels.length - 1, i));
  }, [labels.length, n, padL, plotW]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    setHover(pick(e.clientX, e.currentTarget.getBoundingClientRect()));
  };

  /* Keyboard: the plot is one control and the arrow keys walk the readings,
     which is the same thing hovering does with a mouse. */
  const onKey = (e: React.KeyboardEvent) => {
    if (!labels.length) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setHover((h) => {
        const next = (h ?? (e.key === 'ArrowRight' ? -1 : labels.length)) + (e.key === 'ArrowRight' ? 1 : -1);
        return Math.max(0, Math.min(labels.length - 1, next));
      });
    }
    if (e.key === 'Home') { e.preventDefault(); setHover(0); }
    if (e.key === 'End') { e.preventDefault(); setHover(labels.length - 1); }
    if (e.key === 'Escape') setHover(null);
  };

  const describe = `${caption}. ${series.map((s) => {
    const real = s.points.filter((v): v is number => v !== null);
    if (!real.length) return `${s.label}: no contracts`;
    return `${s.label}: from ${valueLabel(real[0])} to ${valueLabel(real[real.length - 1])}`;
  }).join('. ')}`;

  return (
    <div ref={inViewRef} className={cx('w-full', className)}>
      <div ref={holder} className="relative w-full" style={{ height: H }}>
        {!hasData ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-ins-line bg-ins-inset px-6 text-center">
            <p className="max-w-xs text-[13px] leading-5 text-p1-text-3">{emptyMessage}</p>
          </div>
        ) : W === 0 ? null : (
          <>
            {/* Laid out in real pixels against the measured width, but handed to
                the DOM as a percentage with that width as its viewBox. In the
                steady state the two agree and the type is drawn at its own size;
                in the frame after a resize, before the observer has re-rendered,
                the drawing scales by the difference instead of overflowing its
                panel and having its right-hand axis clipped away. */}
            <svg
              width="100%"
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={describe}
              tabIndex={0}
              onKeyDown={onKey}
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={() => setHover(null)}
              onBlur={() => setHover(null)}
              className="block touch-pan-y rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-p1-primary"
            >
              <defs>
                {series.map((s) => (
                  <linearGradient key={s.key} id={`${uid}-f${s.slot}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={seriesColour(s.slot)} stopOpacity="0.26" />
                    <stop offset="100%" stopColor={seriesColour(s.slot)} stopOpacity="0.02" />
                  </linearGradient>
                ))}
              </defs>

              {/* Gridlines and the value axis. Recessive: the data has to win. */}
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--ins-grid)" strokeWidth="1" />
                  <text x={padL - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ins-axis)" className="tabular-nums">
                    {valueLabel(t)}
                  </text>
                </g>
              ))}

              {/* The line the series is meant to be read against. */}
              {reference && reference.value >= lo && reference.value <= hi && (
                <g>
                  <line
                    x1={padL} x2={W - padR} y1={y(reference.value)} y2={y(reference.value)}
                    stroke="var(--p1-text-3)" strokeWidth="1.25" strokeDasharray="5 4" opacity={seen ? 0.85 : 0}
                    style={{ transition: 'opacity 420ms ease 520ms' }}
                  />
                  <text
                    x={W - padR} y={y(reference.value) - 6} textAnchor="end"
                    fontSize="10.5" fontWeight="600" fill="var(--p1-text-3)"
                    opacity={seen ? 1 : 0} style={{ transition: 'opacity 420ms ease 520ms' }}
                  >
                    {reference.label}
                  </text>
                </g>
              )}

              {shape === 'bars' ? (
                series.map((s) => {
                  /* Two pixels of surface between neighbours, so adjacent bars
                     read as two marks rather than as one striped block. */
                  const slotW = plotW / Math.max(1, labels.length);
                  const barW = Math.max(3, Math.min(34, slotW - 6));
                  return (
                    <g key={s.key}>
                      {s.points.map((v, i) => {
                        if (v === null) return null;
                        const top = y(v);
                        const h = Math.max(0, padT + plotH - top);
                        return (
                          <rect
                            key={i}
                            x={x(i) - barW / 2}
                            y={seen ? top : padT + plotH}
                            width={barW}
                            height={seen ? h : 0}
                            rx={Math.min(4, barW / 2)}
                            fill={seriesColour(s.slot)}
                            opacity={hover === null || hover === i ? 1 : 0.42}
                            style={{
                              transition: reducedMotion()
                                ? 'opacity 140ms ease'
                                : `y 620ms cubic-bezier(.16,1,.3,1) ${i * 28}ms, height 620ms cubic-bezier(.16,1,.3,1) ${i * 28}ms, opacity 140ms ease`,
                            }}
                          />
                        );
                      })}
                    </g>
                  );
                })
              ) : (
                series.map((s) => {
                  const segments = runs(s.points);
                  return (
                    <g key={s.key}>
                      {segments.map((run) => {
                        const pts = run.values.map((v, k) => ({ x: x(run.from + k), y: y(v) }));
                        const d = smooth(pts);
                        return (
                          <g key={run.from}>
                            {shape === 'area' && pts.length > 1 && (
                              <path
                                d={`${d} L${pts[pts.length - 1].x.toFixed(2)} ${(padT + plotH).toFixed(2)} L${pts[0].x.toFixed(2)} ${(padT + plotH).toFixed(2)} Z`}
                                fill={`url(#${uid}-f${s.slot})`}
                                className={cx('p1-viz-fade', seen && 'is-in')}
                                style={{ animationDelay: '220ms' }}
                              />
                            )}
                            <path
                              d={d}
                              fill="none"
                              stroke={seriesColour(s.slot)}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={cx('p1-viz-draw', seen && 'is-in')}
                              style={{ animationDelay: `${s.slot * 80}ms` }}
                            />
                            {/* A single reading has no line to carry it. */}
                            {pts.length === 1 && (
                              <circle cx={pts[0].x} cy={pts[0].y} r="4" fill={seriesColour(s.slot)} />
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })
              )}

              {/* The crosshair and the marks on it. */}
              {hover !== null && (
                <line
                  x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + plotH}
                  stroke="var(--ins-line-strong)" strokeWidth="1" strokeDasharray="3 4"
                />
              )}
              {hover !== null && shape !== 'bars' && series.map((s) => {
                const v = s.points[hover];
                if (v === null || v === undefined) return null;
                return (
                  <circle
                    key={s.key}
                    cx={x(hover)} cy={y(v)} r="5"
                    fill={seriesColour(s.slot)}
                    stroke="var(--ins-panel)" strokeWidth="2"
                  />
                );
              })}

              {/* Time axis. */}
              {labels.map((l, i) => (
                /* A stepped label too close to the last one gives way to it. */
                (i === labels.length - 1 || (i % labelEvery === 0 && labels.length - 1 - i >= labelEvery)) && (
                  <text
                    key={l + i}
                    x={x(i)}
                    y={H - 9}
                    textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
                    fontSize="11"
                    fill="var(--ins-axis)"
                  >
                    {l}
                  </text>
                )
              ))}
            </svg>

            {hover !== null && (
              <div
                role="status"
                className="ins-swap pointer-events-none absolute z-10 min-w-[148px] max-w-[230px] rounded-xl border border-ins-line bg-ins-raised px-3 py-2 shadow-ins-raised"
                style={{
                  left: Math.max(4, Math.min(W - 160, x(hover) - 74)),
                  top: padT + 4,
                }}
              >
                <div className="text-[11.5px] font-semibold text-p1-text-3">{labels[hover]}</div>
                {series.map((s) => {
                  const v = s.points[hover];
                  return (
                    <div key={s.key} className="mt-1 flex items-center gap-2 text-[12.5px]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: seriesColour(s.slot) }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-p1-text-2">{s.label}</span>
                      <span className={cx('shrink-0 font-semibold tabular-nums', v === null || v === undefined ? 'text-p1-text-3' : 'text-p1-text')}>
                        {v === null || v === undefined ? 'None' : valueLabel(v)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {series.length > 1 && (
        <Legend className="mt-3" items={series.map((s) => ({ label: s.label, colour: seriesColour(s.slot) }))} />
      )}

      <DataTableFallback caption={caption} labels={labels} series={series} valueLabel={valueLabel} />
    </div>
  );
}

/* ------------------------------------------------------------ distribution */

export interface DistributionBin { label: string; count: number; from: number; to: number }

/**
 * Where the market actually sits, rather than where its middle is.
 *
 * A median tells an agent one number; the shape around it tells them whether
 * the number means anything. Two thousand contracts spread evenly across four
 * price bands and two thousand piled into one are the same median and a
 * completely different negotiation.
 *
 * The bar containing the median is marked, so the reader can see the statistic
 * standing inside its own distribution.
 */
export function DistributionChart({
  bins,
  markAt,
  markLabel,
  height = 170,
  countLabel = (n: number) => `${n} contract${n === 1 ? '' : 's'}`,
  caption,
  className = '',
}: {
  bins: DistributionBin[];
  /** A value to highlight the containing bar for, e.g. the median. */
  markAt?: number | null;
  markLabel?: string;
  height?: number;
  countLabel?: (n: number) => string;
  caption: string;
  className?: string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...bins.map((b) => b.count));
  const total = bins.reduce((n, b) => n + b.count, 0);
  const markedIndex = markAt === null || markAt === undefined
    ? -1
    : bins.findIndex((b, i) => markAt >= b.from && (i === bins.length - 1 ? markAt <= b.to : markAt < b.to));

  if (!bins.length) {
    return (
      <div className={cx('flex items-center justify-center rounded-xl border border-dashed border-ins-line bg-ins-inset px-6 py-8 text-center', className)}>
        <p className="text-[13px] text-p1-text-3">Not enough contracts to show a distribution.</p>
      </div>
    );
  }

  return (
    <div ref={ref} className={cx('w-full', className)}>
      <div className="flex items-end gap-[3px]" style={{ height }} onPointerLeave={() => setHover(null)}>
        {bins.map((b, i) => {
          const pct = (b.count / max) * 100;
          const marked = i === markedIndex;
          return (
            <div
              key={b.label}
              className="group relative flex h-full min-w-0 flex-1 cursor-default flex-col justify-end"
              onPointerEnter={() => setHover(i)}
              onPointerDown={() => setHover(i)}
            >
              <div
                className="w-full rounded-t-[4px]"
                style={{
                  height: seen ? `${Math.max(b.count ? 3 : 0, pct)}%` : '0%',
                  background: marked ? 'var(--ins-s1)' : 'color-mix(in srgb, var(--ins-s1) 34%, var(--ins-panel))',
                  outline: marked ? '1px solid color-mix(in srgb, var(--ins-s1) 70%, transparent)' : undefined,
                  opacity: hover === null || hover === i ? 1 : 0.5,
                  transition: reducedMotion()
                    ? 'opacity 140ms ease'
                    : `height 560ms cubic-bezier(.16,1,.3,1) ${i * 26}ms, opacity 140ms ease`,
                }}
              />
              {hover === i && (
                <div className="ins-swap pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[190px] -translate-x-1/2 rounded-lg border border-ins-line bg-ins-raised px-2.5 py-1.5 shadow-ins-raised">
                  <div className="text-[11.5px] font-semibold text-p1-text">{b.label}</div>
                  <div className="text-[12px] text-p1-text-2">
                    {countLabel(b.count)}
                    {total > 0 && <span className="text-p1-text-3"> · {Math.round((b.count / total) * 100)}%</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-start justify-between gap-3 text-[11px] text-p1-text-3">
        <span className="tabular-nums">{bins[0].label.split('–')[0].trim()}</span>
        {markedIndex >= 0 && markLabel && (
          <span className="inline-flex items-center gap-1.5 font-medium text-p1-text-2">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: 'var(--ins-s1)' }} aria-hidden />
            {markLabel}
          </span>
        )}
        <span className="tabular-nums">{bins[bins.length - 1].label.split('–').slice(-1)[0].trim()}</span>
      </div>

      {/* Wrapped, for the reason given on `DataTableFallback`. */}
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead><tr><th scope="col">Band</th><th scope="col">Contracts</th></tr></thead>
          <tbody>
            {bins.map((b) => <tr key={b.label}><th scope="row">{b.label}</th><td>{b.count}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- proportion */

export interface Segment { key: string; label: string; value: number; slot: number; hint?: string }

/**
 * A mix on one line: what share of contracts each unit size took.
 *
 * One bar rather than a pie, because the reader's question is "which is the
 * biggest and by how much", and comparing arc lengths is the one thing the eye
 * is worst at. Segments are separated by two pixels of surface so they read as
 * parts rather than as a gradient, and each segment over a tenth of the whole
 * is labelled inside itself.
 */
export function ProportionBar({
  segments,
  height = 30,
  valueLabel = (n: number) => n.toLocaleString('en-SG'),
  caption,
  legend = true,
  inline = true,
  className = '',
}: {
  segments: Segment[];
  height?: number;
  valueLabel?: (n: number) => string;
  caption: string;
  /**
   * Off only where the thing directly below already names every segment in
   * words beside its own colour — a labelled table under the bar is the
   * legend, and printing the same four counts twice is noise, not redundancy.
   */
  legend?: boolean;
  /** Percentages inside the segments. Off for a bar too thin to hold them. */
  inline?: boolean;
  className?: string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const total = segments.reduce((n, s) => n + s.value, 0);

  if (!total) {
    return <p className={cx('text-[13px] text-p1-text-3', className)}>No contracts to break down.</p>;
  }

  return (
    <div ref={ref} className={className}>
      <div
        className="flex w-full overflow-hidden rounded-lg"
        style={{ height, gap: 2 }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`${caption}: ${segments.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(', ')}`}
      >
        {segments.map((s, i) => {
          const pct = (s.value / total) * 100;
          return (
            <div
              key={s.key}
              onPointerEnter={() => setHover(s.key)}
              className="relative flex min-w-0 items-center justify-center overflow-hidden first:rounded-l-lg last:rounded-r-lg"
              style={{
                width: seen ? `${pct}%` : '0%',
                background: seriesColour(s.slot),
                opacity: hover === null || hover === s.key ? 1 : 0.55,
                transition: reducedMotion()
                  ? 'opacity 140ms ease'
                  : `width 620ms cubic-bezier(.16,1,.3,1) ${i * 60}ms, opacity 140ms ease`,
              }}
              title={`${s.label} — ${valueLabel(s.value)} (${Math.round(pct)}%)`}
            >
              {inline && pct >= 11 && (
                <span className="truncate px-1 text-[11px] font-semibold text-white mix-blend-luminosity">
                  {Math.round(pct)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
      {legend && (
      <ul className="mt-2.5 grid gap-x-4 gap-y-1.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))' }}>
        {segments.map((s) => (
          <li
            key={s.key}
            onPointerEnter={() => setHover(s.key)}
            onPointerLeave={() => setHover(null)}
            className={cx('flex items-center gap-2 rounded px-1 py-0.5 text-[12.5px] transition-colors', hover === s.key && 'bg-ins-inset')}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: seriesColour(s.slot) }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-p1-text-2">{s.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-p1-text">{valueLabel(s.value)}</span>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------- comparison metric */

export interface RangePoint {
  key: string;
  label: string;
  value: number | null;
  slot: number;
}

/**
 * One metric across the developments being compared, on a shared scale.
 *
 * This is the row that makes a comparison a comparison rather than a table. The
 * numbers are still printed — the reader wants the figure — but they are
 * *placed*, on one axis, so "$5,400 against $6,200" is a distance rather than
 * a subtraction the agent does in their head in front of a client.
 *
 * The better end is named in words. Cheaper is better on a rent and worse on a
 * yield, and a row that only shades a cell leaves the reader guessing which.
 */
export function RangeRow({
  label,
  points,
  valueLabel = (n: number) => n.toLocaleString('en-SG'),
  better = 'low',
  betterLabel,
  hint,
  className = '',
}: {
  label: string;
  points: RangePoint[];
  valueLabel?: (n: number) => string;
  /** Which end of the scale is the favourable one, or 'none' where neither is. */
  better?: 'low' | 'high' | 'none';
  betterLabel?: string;
  hint?: React.ReactNode;
  className?: string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const real = points.filter((p): p is RangePoint & { value: number } => p.value !== null);
  const lo = real.length ? Math.min(...real.map((p) => p.value)) : 0;
  const hi = real.length ? Math.max(...real.map((p) => p.value)) : 1;
  const span = hi - lo || 1;
  /* A single reading, or several identical ones, sits in the middle rather than
     at one end — the scale has no meaning with nothing to span. */
  const at = (v: number) => (real.length < 2 || hi === lo ? 50 : 8 + ((v - lo) / span) * 84);

  const best = better === 'none' || real.length < 2
    ? null
    : [...real].sort((a, b) => (better === 'low' ? a.value - b.value : b.value - a.value))[0];

  return (
    <div ref={ref} className={cx('py-3.5', className)}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[13px] font-medium text-p1-text">{label}</span>
        {betterLabel && better !== 'none' && (
          <span className="text-[11.5px] text-p1-text-3">{betterLabel}</span>
        )}
      </div>

      {/* The figure sits over its own marker rather than in a tidy row
          underneath. A column of numbers that does not line up with the dots it
          describes makes the reader do the matching, which is the work this row
          exists to remove. `clamp` keeps a label at either extreme inside the
          track instead of hanging off the end of the panel. */}
      <div className="relative h-[46px]">
        {real.map((p, i) => (
          <span
            key={`${p.key}-v`}
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold tabular-nums text-p1-text"
            style={{
              left: `clamp(30px, ${seen ? at(p.value) : 50}%, calc(100% - 30px))`,
              transition: reducedMotion() ? 'none' : `left 560ms cubic-bezier(.16,1,.3,1) ${i * 70}ms`,
            }}
          >
            {valueLabel(p.value)}
          </span>
        ))}

        <div className="absolute inset-x-0 bottom-2 h-[3px] rounded-full bg-ins-inset ring-1 ring-inset ring-ins-line" aria-hidden />
        {real.map((p, i) => (
          <span
            key={p.key}
            className="absolute bottom-2 flex h-4 w-4 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full ring-2 ring-ins-panel"
            style={{
              left: `${seen ? at(p.value) : 50}%`,
              background: seriesColour(p.slot),
              transition: reducedMotion() ? 'none' : `left 560ms cubic-bezier(.16,1,.3,1) ${i * 70}ms`,
            }}
            title={`${p.label}: ${valueLabel(p.value)}`}
          >
            {best?.key === p.key && (
              <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
            )}
          </span>
        ))}
      </div>

      {/* The key names each development in words. Colour identifies a mark; it
          is never the only thing that does. */}
      <ul className="mt-2 grid gap-x-4 gap-y-1" style={{ gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, points.length))}, minmax(0, 1fr))` }}>
        {points.map((p) => (
          <li key={p.key} className="flex min-w-0 items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: seriesColour(p.slot) }} aria-hidden />
            <span className="min-w-0 truncate text-[12px] text-p1-text-2">{p.label}</span>
            {p.value === null ? (
              <span className="shrink-0 text-[12px] text-p1-text-3">No data</span>
            ) : best?.key === p.key ? (
              <span className="shrink-0 rounded-full bg-p1-success-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-p1-success">
                Best
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {hint && <p className="mt-1.5 text-[11.5px] leading-4 text-p1-text-3">{hint}</p>}
    </div>
  );
}

/* --------------------------------------------------------------- sparkline */

/**
 * The shape of a series, small enough to sit inside a metric tile.
 *
 * Gaps break it, like the full chart. No axes, no labels: it is there to say
 * "rising", "flat" or "all over the place" in the corner of the eye, and the
 * figure beside it carries the value.
 */
export function MiniTrend({
  points,
  slot = 0,
  width = 96,
  height = 26,
  label,
  className = '',
}: {
  points: (number | null)[];
  slot?: number;
  width?: number;
  height?: number;
  label: string;
  className?: string;
}) {
  const real = points.filter((v): v is number => v !== null);
  if (real.length < 2) return null;
  const lo = Math.min(...real);
  const hi = Math.max(...real);
  const span = hi - lo || 1;
  const n = Math.max(1, points.length - 1);
  const x = (i: number) => (i / n) * (width - 3) + 1.5;
  const y = (v: number) => height - 2.5 - ((v - lo) / span) * (height - 5);

  const d = runs(points)
    .map((run) => run.values.map((v, k) => `${k ? 'L' : 'M'}${x(run.from + k).toFixed(1)},${y(v).toFixed(1)}`).join(' '))
    .join(' ');
  /* Typed explicitly: `reduce` would otherwise take its accumulator from the
     array’s own element type, which here includes null. */
  const lastIndex = points.reduce<number>((acc, v, i) => (v === null ? acc : i), -1);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cx('overflow-visible', className)} role="img" aria-label={label}>
      <path d={d} fill="none" stroke={seriesColour(slot)} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      {lastIndex >= 0 && (
        <circle cx={x(lastIndex)} cy={y(points[lastIndex] as number)} r="2.5" fill={seriesColour(slot)} />
      )}
    </svg>
  );
}

/* ------------------------------------------------------------- walk gauge */

/**
 * A distance read as a walk.
 *
 * Minutes rather than metres, because that is the unit the conversation with a
 * tenant happens in, and a bar against a ceiling rather than a bare figure,
 * because "nine minutes" only means something beside "and the far one is
 * eighteen".
 */
export function WalkBar({
  minutes,
  ceiling = 20,
  label,
  className = '',
}: {
  minutes: number;
  ceiling?: number;
  label?: string;
  className?: string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const pct = Math.min(100, (minutes / ceiling) * 100);
  const close = minutes <= 5;
  return (
    <div ref={ref} className={cx('flex items-center gap-2', className)}>
      <div className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-ins-inset">
        <div
          className="h-full rounded-full"
          style={{
            width: seen ? `${pct}%` : '0%',
            background: close ? 'var(--p1-success)' : 'var(--ins-s1)',
            transition: reducedMotion() ? 'none' : 'width 560ms cubic-bezier(.16,1,.3,1)',
          }}
        />
      </div>
      <span className={cx('shrink-0 text-[12px] font-semibold tabular-nums', close ? 'text-p1-success' : 'text-p1-text-2')}>
        {minutes} min
      </span>
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}

/** Re-exported so a screen imports one module for every figure it draws. */
export { useInView };
