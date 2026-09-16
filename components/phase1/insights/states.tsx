"use client";

/**
 * The states an Insights screen spends real time in.
 *
 * Three of them, and they are deliberately different from one another, because
 * confusing them is how a product loses an agent's trust:
 *
 *   `InsightEmpty`       the query was answered and the answer is "nothing
 *                        matches". There is something the reader can do about
 *                        it, so the state says what.
 *   `DataUnavailable`    we could not get the figures. This is not the same as
 *                        there being none, and it must never be drawn as a
 *                        zero — a zero is a reading.
 *   `ChartSkeleton`      the figures are on their way.
 *
 * The shimmer on the skeleton is the one looping animation in the module, and
 * it stops for a reader who has asked their system for less movement.
 */

import React from 'react';
import { SearchX, WifiOff, ShieldAlert, RotateCcw, LineChart } from 'lucide-react';
import { Button, cx } from '../kit';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { MARKET_SOURCE } from '../../../lib/phase1/market';

export function InsightEmpty({
  title,
  description,
  action,
  icon,
  className = '',
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-ins-inset text-p1-text-3" aria-hidden>
        {icon ?? <SearchX size={20} />}
      </span>
      <p className="text-[15px] font-semibold text-p1-text">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-5 text-p1-text-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * The lookup did not come back.
 *
 * `reason` is the service's own words where there are any: "OneMap did not
 * answer in time" tells an agent whether to retry, and "something went wrong"
 * does not. `kind` separates a configuration problem, which nobody on this
 * screen can fix, from a failure that is worth trying again.
 */
export function DataUnavailable({
  title = 'Data unavailable',
  reason,
  kind = 'failed',
  onRetry,
  className = '',
}: {
  title?: React.ReactNode;
  reason?: React.ReactNode;
  kind?: 'failed' | 'not_configured';
  onRetry?: () => void;
  className?: string;
}) {
  const configured = kind === 'not_configured';
  return (
    <div
      role="alert"
      className={cx(
        'flex flex-col items-start gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-center',
        configured
          ? 'border-p1-warning-border bg-p1-warning-soft'
          : 'border-p1-danger-border bg-p1-danger-soft',
        className,
      )}
    >
      <span
        className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', configured ? 'text-p1-warning' : 'text-p1-danger')}
        aria-hidden
      >
        {configured ? <ShieldAlert size={20} /> : <WifiOff size={20} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-p1-text">{title}</p>
        <p className="mt-0.5 text-[13px] leading-5 text-p1-text-2">
          {reason ?? 'The figures could not be retrieved, so none are shown. This is not the same as there being none.'}
        </p>
      </div>
      {onRetry && !configured && (
        <Button size="sm" variant="outline" leftIcon={<RotateCcw size={14} />} onClick={onRetry} className="shrink-0">
          Try again
        </Button>
      )}
    </div>
  );
}

/** A figure's place on the page while it is being worked out. */
export function ChartSkeleton({ height = 240, className = '' }: { height?: number; className?: string }) {
  return (
    <div className={cx('w-full', className)} aria-hidden>
      <div className="p1-skeleton w-full rounded-xl" style={{ height }} />
      <div className="mt-3 flex gap-3">
        <span className="p1-skeleton h-3 w-24 rounded-full" />
        <span className="p1-skeleton h-3 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function MetricSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))' }}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-ins-line bg-ins-panel p-4">
          <span className="p1-skeleton block h-2.5 w-20 rounded-full" />
          <span className="p1-skeleton mt-3 block h-7 w-28 rounded-lg" />
          <span className="p1-skeleton mt-2.5 block h-2.5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Cards on their way in — the floor-plan grid and the report gallery. */
export function CardGridSkeleton({ count = 6, aspect = '4 / 3' }: { count?: number; aspect?: string }) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))' }}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-ins-line bg-ins-panel">
          <span className="p1-skeleton block w-full" style={{ aspectRatio: aspect }} />
          <div className="p-4">
            <span className="p1-skeleton block h-3 w-24 rounded-full" />
            <span className="p1-skeleton mt-2.5 block h-2.5 w-32 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Whether the market figures may be shown.
 *
 * The contract set is illustrative until the URA feed is live, so it is demo
 * data: shown with Demo Data ON, and never with it OFF.
 */
export function useMarketAvailable(): boolean {
  const { demo } = useDemo();
  return MARKET_SOURCE.live || demo;
}

/** The market section of a screen, when there is no market data to put in it. */
export function MarketUnavailable({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  return (
    <div
      role="status"
      className={cx(
        'flex flex-col items-start gap-3 rounded-2xl border border-dashed border-ins-line-strong bg-ins-inset sm:flex-row sm:items-center',
        compact ? 'px-4 py-3.5' : 'px-5 py-5',
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ins-panel text-p1-text-3 ring-1 ring-ins-line" aria-hidden>
        <LineChart size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-p1-text">Data unavailable</p>
        <p className="mt-0.5 text-[13px] leading-5 text-p1-text-2">
          Rental contract data is not connected yet, so no market figures are shown.
          {!compact && ' Turn on Demo Data in the header to preview this view with illustrative contracts.'}
        </p>
      </div>
    </div>
  );
}
