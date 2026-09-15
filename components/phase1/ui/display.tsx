"use client";

/**
 * Display pieces added with the design system: the KPI tile, a tooltip that
 * escapes clipping containers, and the vertical timeline.
 */

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, X } from 'lucide-react';
import { cx } from './primitives';
import { CountUp } from './viz';
import { Sparkline } from './charts';
import { Skeleton } from './feedback';

/* --------------------------------------------------------------------- KPI */

/**
 * One number, a short label and a small trend. No paragraph underneath: the
 * label says what it is and the trend says whether it is moving the right way.
 */
export function KPI({
  label, value, decimals = 0, prefix = '', suffix = '', compact = false, delta, href, icon, tone = 'default', of, className = '', spark, sub,
}: {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** 12,400 shown as 12.4K. */
  compact?: boolean;
  /** Percentage change and whether up is good. `label` is read in the tooltip. */
  delta?: { pct: number; upIsGood?: boolean; label?: string } | null;
  href?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'warning' | 'danger' | 'success';
  /** A denominator shown small after the value, "23 / 30". */
  of?: number;
  className?: string;
  /** A small trend line under the number. */
  spark?: { data: number[]; tone?: 'primary' | 'success' | 'danger' | 'neutral' | 'accent' };
  /** One quiet line under the value, e.g. "vs last week". */
  sub?: React.ReactNode;
}) {
  const big = compact && value >= 10_000;
  const shown = big ? value / 1000 : value;
  const deltaGood = delta ? (delta.pct === 0 ? null : (delta.pct > 0) === (delta.upIsGood ?? true)) : null;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-medium text-p1-text-3">{label}</span>
        {icon && <span className="shrink-0 text-p1-text-3" aria-hidden>{icon}</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={cx(
          'text-[28px] font-semibold leading-none tracking-[-0.025em]',
          tone === 'warning' ? 'text-p1-warning' : tone === 'danger' ? 'text-p1-danger' : tone === 'success' ? 'text-p1-success' : 'text-p1-text',
        )}>
          <CountUp value={shown} decimals={big ? 1 : decimals} prefix={prefix} suffix={big ? `K${suffix}` : suffix} />
          {typeof of === 'number' && <span className="ml-1 text-[15px] font-medium text-p1-text-3 tabular-nums">/ {of}</span>}
        </span>
        {delta && (
          <span
            className={cx(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[12px] font-semibold tabular-nums',
              deltaGood === null ? 'bg-p1-subtle text-p1-text-3' : deltaGood ? 'bg-p1-success-soft text-p1-success' : 'bg-p1-danger-soft text-p1-danger',
            )}
            title={delta.label}
          >
            {delta.pct > 0 ? <ArrowUpRight size={12} aria-hidden /> : delta.pct < 0 ? <ArrowDownRight size={12} aria-hidden /> : null}
            {Math.abs(delta.pct)}%
            {delta.label && <span className="sr-only"> {delta.label}</span>}
          </span>
        )}
      </div>
      {(spark || sub) && (
        <div className="mt-3 flex items-end justify-between gap-3">
          {sub ? <span className="min-w-0 truncate text-[12.5px] text-p1-text-3">{sub}</span> : <span />}
          {spark && spark.data.length > 1 && <Sparkline data={spark.data} tone={spark.tone ?? 'primary'} width={96} height={30} />}
        </div>
      )}
    </>
  );

  const cls = cx('block min-w-0 rounded-xl border border-p1-border bg-p1-surface px-4 py-3.5', href && 'p1-lift-hover hover:border-p1-border-strong', className);
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function KPISkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-p1-border bg-p1-surface px-4 py-3.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- tooltip */

/**
 * A tooltip rendered into the body so a sidebar or a table's overflow cannot
 * clip it. Shown on hover and on keyboard focus; the trigger is described by
 * it for screen readers.
 */
export function Tooltip({
  content, children, side = 'top', disabled = false, delay = 250,
}: {
  content: React.ReactNode; children: React.ReactElement<React.HTMLAttributes<HTMLElement>>; side?: 'top' | 'right' | 'bottom'; disabled?: boolean; delay?: number;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const show = useCallback((el: HTMLElement) => {
    if (disabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setPos(side === 'right'
        ? { x: r.right + 10, y: r.top + r.height / 2 }
        : side === 'bottom'
          ? { x: r.left + r.width / 2, y: r.bottom + 8 }
          : { x: r.left + r.width / 2, y: r.top - 8 });
    }, delay);
  }, [disabled, side, delay]);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setPos(null);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!pos) return;
    const onScroll = () => setPos(null);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [pos]);

  const child = React.Children.only(children);
  const trigger = React.cloneElement(child, {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { child.props.onMouseEnter?.(e); show(e.currentTarget); },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { child.props.onMouseLeave?.(e); hide(); },
    onFocus: (e: React.FocusEvent<HTMLElement>) => { child.props.onFocus?.(e); show(e.currentTarget); },
    onBlur: (e: React.FocusEvent<HTMLElement>) => { child.props.onBlur?.(e); hide(); },
    'aria-describedby': pos ? id : child.props['aria-describedby'],
  });

  const transform = side === 'right' ? 'translate(0, -50%)' : side === 'bottom' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';

  return (
    <>
      {trigger}
      {pos && typeof document !== 'undefined' && createPortal(
        <div
          id={id}
          role="tooltip"
          className="p1 p1-portal p1-tip pointer-events-none fixed z-[120] max-w-[260px] rounded-md px-2.5 py-1.5 text-[12.5px] font-medium leading-4 shadow-p1-md"
          style={{ left: pos.x, top: pos.y, transform, background: 'var(--p1-text)', color: 'var(--p1-bg)' }}
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  );
}

/* ---------------------------------------------------------------- timeline */

export type TimelineState = 'done' | 'current' | 'upcoming' | 'failed';

export interface TimelineItem {
  key: string;
  label: React.ReactNode;
  state: TimelineState;
  /** When it happened, or when it is expected. */
  at?: React.ReactNode;
  /** One line under the label. Used for the current step and for a failure reason. */
  detail?: React.ReactNode;
  action?: React.ReactNode;
}

export function Timeline({ items, className = '' }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cx('relative', className)}>
      {items.map((t, i) => {
        const last = i === items.length - 1;
        return (
          <li key={t.key} className="relative flex gap-4 pb-6 last:pb-0" aria-current={t.state === 'current' ? 'step' : undefined}>
            {!last && (
              <span
                className={cx('absolute left-[13px] top-7 bottom-0 w-px', t.state === 'done' ? 'bg-p1-success' : 'bg-p1-border')}
                aria-hidden
              />
            )}
            <span
              className={cx(
                'relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                t.state === 'done' && 'bg-p1-success text-white dark:text-p1-bg',
                t.state === 'failed' && 'bg-p1-danger text-white dark:text-p1-bg',
                t.state === 'current' && 'border-2 border-p1-primary bg-p1-surface text-p1-primary shadow-[0_0_0_4px_var(--p1-primary-soft)]',
                t.state === 'upcoming' && 'border border-p1-border-strong bg-p1-surface text-p1-text-3',
              )}
              aria-hidden
            >
              {t.state === 'done' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="p1-check"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              ) : t.state === 'failed' ? <X size={14} strokeWidth={3} /> : t.state === 'current' ? (
                <span className="h-2.5 w-2.5 rounded-full bg-p1-primary" />
              ) : <span className="h-1.5 w-1.5 rounded-full bg-p1-border-strong" />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className={cx(
                  'text-[14px] leading-6',
                  t.state === 'current' ? 'font-semibold text-p1-text' : t.state === 'done' ? 'font-medium text-p1-text' : t.state === 'failed' ? 'font-semibold text-p1-danger' : 'text-p1-text-3',
                )}>
                  {t.label}
                  <span className="sr-only">{{ done: ' — done', current: ' — in progress', upcoming: ' — not started', failed: ' — failed' }[t.state]}</span>
                </span>
                {t.at && <span className="text-[12.5px] tabular-nums text-p1-text-3">{t.at}</span>}
              </div>
              {t.detail && <div className={cx('mt-0.5 text-[13px] leading-5', t.state === 'failed' ? 'text-p1-danger' : 'text-p1-text-2')}>{t.detail}</div>}
              {t.action && <div className="mt-2.5">{t.action}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** A green tick that draws itself, for a completed action. */
export function SuccessCheck({ size = 56, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={cx('vr-pop inline-flex items-center justify-center rounded-full bg-p1-success-soft text-p1-success', className)} style={{ width: size, height: size }} aria-hidden>
      <svg width={size * 0.46} height={size * 0.46} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="p1-check"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
  );
}
