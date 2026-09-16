"use client";

/**
 * The figures at the top of an Insights screen.
 *
 * A metric here is four things, and it is not allowed on the page without all
 * four: what is being measured, the figure, what the figure is *about*, and how
 * it moved. "Median rent $5,400" is a number on a dashboard; "Median rent, 3
 * bedrooms at Martin Modern, last 6 months, $5,400, +4.2%" is something an
 * agent can say out loud to a landlord. The `subject` line is what turns one
 * into the other, and it is why these are tiles rather than a bare strip.
 *
 * The other rule is about absence. A metric whose evidence is too thin takes
 * `value={null}` and renders an em dash with the reason beside it. It never
 * renders a zero: a zero is a reading, and this is the absence of one.
 */

import React from 'react';
import { cx } from '../kit';
import { CountUp } from '../ui/viz';
import { seriesColour, seriesSoft } from './charts';

export type MetricTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

/* The icon chip's two colours. Soft fill, full-strength glyph — the treatment
   the rest of the workspace already uses for a status pill. */
const CHIP: Record<MetricTone, string> = {
  neutral: 'bg-p1-subtle text-p1-text-2',
  primary: 'bg-p1-primary-soft text-p1-primary',
  accent: 'bg-p1-accent-soft text-p1-accent-text',
  success: 'bg-p1-success-soft text-p1-success',
  warning: 'bg-p1-warning-soft text-p1-warning',
  danger: 'bg-p1-danger-soft text-p1-danger',
  info: 'bg-p1-info-soft text-p1-info',
};

export interface Delta {
  /** Percentage change. Null when the series was too short to measure. */
  pct: number | null;
  /** What it is measured against, e.g. "vs the first third of the period". */
  label: string;
  /** Whether a rise is good news. Rents rising is good for a landlord, not a tenant. */
  riseIsGood?: boolean;
}

/**
 * The movement chip.
 *
 * Direction is carried by an arrow glyph as well as by colour, so it survives
 * a colourblind reader, a greyscale print and forced-colours mode.
 */
export function DeltaChip({ delta, className = '' }: { delta: Delta; className?: string }) {
  if (delta.pct === null) {
    return (
      <span className={cx('text-[12px] text-p1-text-3', className)} title="Too few months carrying contracts to measure a movement">
        Not measurable
      </span>
    );
  }
  const flat = Math.abs(delta.pct) < 0.05;
  const good = delta.riseIsGood === false ? delta.pct < 0 : delta.pct > 0;
  const tone = flat ? 'text-p1-text-3' : good ? 'text-p1-success' : 'text-p1-danger';
  const arrow = flat ? '→' : delta.pct > 0 ? '↑' : '↓';
  return (
    <span className={cx('inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums', tone, className)} title={delta.label}>
      <span aria-hidden>{arrow}</span>
      {delta.pct > 0 ? '+' : ''}{delta.pct.toFixed(1)}%
      <span className="sr-only">{delta.label}</span>
    </span>
  );
}

export function InsightMetric({
  label,
  subject,
  value,
  unavailable = 'Too few contracts',
  prefix = '',
  suffix = '',
  decimals = 0,
  icon,
  tone = 'neutral',
  delta,
  hint,
  emphasis = false,
  accent,
  children,
  className = '',
}: {
  label: string;
  /** What the figure is about: the project, the size, the window. */
  subject?: React.ReactNode;
  /** Null when the evidence is too thin to state one. */
  value: number | null;
  /** Said in place of the figure when it is null. */
  unavailable?: React.ReactNode;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon?: React.ReactNode;
  tone?: MetricTone;
  delta?: Delta;
  hint?: React.ReactNode;
  /** The one figure the screen is really about. */
  emphasis?: boolean;
  /**
   * The measure's colour slot — rent, volume, per sqft, your portfolio — so a
   * figure wears the same colour as its line on the charts below. Overrides
   * `tone` for the icon and draws the tile's accent edge.
   */
  accent?: number;
  /** A sparkline or other small figure under the number. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border bg-ins-panel p-4 shadow-ins transition-[box-shadow,transform] duration-200 hover:shadow-ins-raised sm:p-[18px]',
        emphasis && accent === undefined ? 'border-p1-primary/35 ring-1 ring-p1-primary/15' : 'border-ins-line',
        className,
      )}
    >
      {accent !== undefined && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
          style={{ background: `linear-gradient(90deg, ${seriesColour(accent)}, color-mix(in srgb, ${seriesColour(accent)} 25%, transparent))` }}
        />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11.5px] font-medium uppercase tracking-[0.05em] text-p1-text-3">{label}</div>
          {subject && <div className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-p1-text-3">{subject}</div>}
        </div>
        {icon && (
          <span
            className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', accent === undefined && CHIP[tone])}
            style={accent === undefined ? undefined : { background: seriesSoft(accent), color: seriesColour(accent) }}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {value === null ? (
          <span className="text-[22px] font-semibold leading-none text-p1-text-3" title={typeof unavailable === 'string' ? unavailable : undefined}>
            &mdash;
          </span>
        ) : (
          <span
            className={cx(
              'font-p1display font-bold leading-none tracking-[-0.025em] text-p1-text',
              emphasis ? 'text-[30px] sm:text-[34px]' : 'text-[24px] sm:text-[27px]',
            )}
          >
            <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
          </span>
        )}
        {delta && value !== null && <DeltaChip delta={delta} />}
      </div>

      {(hint || value === null) && (
        <div className="mt-1.5 text-[12px] leading-4 text-p1-text-3">
          {value === null ? unavailable : hint}
        </div>
      )}

      {children && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

/**
 * The row the metrics sit in.
 *
 * `repeat(auto-fit, minmax(…))` rather than a breakpoint ladder: six metrics on
 * a wide screen become three and then two as the column narrows, without a
 * class list that has to be kept in step with how many the screen passes.
 */
export function MetricRail({
  children,
  min = 180,
  index,
  className = '',
}: {
  children: React.ReactNode;
  /** The narrowest a tile may become before the row wraps. */
  min?: number;
  index?: number;
  className?: string;
}) {
  return (
    <div
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`,
        ...(index === undefined ? {} : ({ '--i': index } as React.CSSProperties)),
      }}
      className={cx('grid gap-3', index !== undefined && 'ins-rise', className)}
    >
      {children}
    </div>
  );
}
