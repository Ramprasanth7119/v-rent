"use client";

/**
 * Dashboard-local pieces.
 *
 * `IconTile`, `Delta`, `SectionHead` and `CardHead` began here and were
 * promoted into the shared kit; they are re-exported so the panels in this
 * folder import from one place. `Panel`, `Pill` and the accent map are the
 * dashboard's own and stay here, so nothing outside the dashboard changes.
 */

import Link from 'next/link';
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cx } from '../kit';

export { IconTile, Delta, SectionHead, CardHead } from '../kit';
export type { TileTone } from '../kit';

/**
 * The four accents the dashboard is allowed. Each one belongs to one kind of
 * thing — listings blue, enquiries violet, viewings amber, lets green — and
 * keeps it on every panel, so a colour means the same thing wherever it is.
 */
export type Accent = 'blue' | 'violet' | 'amber' | 'green' | 'red' | 'slate';

export const ACCENT: Record<Accent, { tile: string; pill: string; dot: string; bar: string }> = {
  blue: {
    tile: 'bg-p1-primary-soft text-p1-primary',
    pill: 'bg-p1-primary-soft text-p1-primary ring-p1-primary/20',
    dot: 'bg-p1-primary',
    bar: 'bg-p1-primary',
  },
  violet: {
    tile: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
    pill: 'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/25',
    dot: 'bg-violet-500 dark:bg-violet-400',
    bar: 'bg-violet-500 dark:bg-violet-400',
  },
  amber: {
    tile: 'bg-p1-accent-soft text-p1-accent-text',
    pill: 'bg-p1-accent-soft text-p1-accent-text ring-p1-accent/25',
    dot: 'bg-p1-accent',
    bar: 'bg-p1-accent',
  },
  green: {
    tile: 'bg-p1-success-soft text-p1-success',
    pill: 'bg-p1-success-soft text-p1-success ring-p1-success/20',
    dot: 'bg-p1-success',
    bar: 'bg-p1-success',
  },
  red: {
    tile: 'bg-p1-danger-soft text-p1-danger',
    pill: 'bg-p1-danger-soft text-p1-danger ring-p1-danger/20',
    dot: 'bg-p1-danger',
    bar: 'bg-p1-danger',
  },
  slate: {
    tile: 'bg-p1-subtle text-p1-text-2',
    pill: 'bg-p1-subtle text-p1-text-2 ring-p1-border-strong/60',
    dot: 'bg-p1-text-3',
    bar: 'bg-p1-text-3',
  },
};

/** A square icon chip in one of the dashboard accents. */
export function AccentTile({ accent, size = 'md', children, className = '' }: {
  accent: Accent; size?: 'sm' | 'md' | 'lg'; children: React.ReactNode; className?: string;
}) {
  const box = { sm: 'h-7 w-7 rounded-lg', md: 'h-9 w-9 rounded-[10px]', lg: 'h-11 w-11 rounded-xl' }[size];
  return (
    <span aria-hidden className={cx('inline-flex shrink-0 items-center justify-center', box, ACCENT[accent].tile, className)}>
      {children}
    </span>
  );
}

/** A compact status pill. The word carries the meaning; the colour only repeats it. */
export function Pill({ accent, children, className = '' }: { accent: Accent; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex shrink-0 items-center rounded-md px-2 py-[3px] text-[11.5px] font-semibold leading-none ring-1 ring-inset', ACCENT[accent].pill, className)}>
      {children}
    </span>
  );
}

/**
 * Every dashboard card: one border, one radius, one padding, one header
 * height. The header is a fixed row so headings line up across a grid row.
 */
export function Panel({
  id, title, meta, href, linkLabel = 'View all', action, children, className = '', bodyClassName = '',
}: {
  id: string;
  title: React.ReactNode;
  /** A short line beside the title, in muted text. */
  meta?: React.ReactNode;
  href?: string;
  linkLabel?: string;
  /** A control in place of, or before, the link. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cx('flex min-w-0 flex-col overflow-hidden rounded-2xl border border-p1-border bg-p1-surface shadow-p1-sm', className)}
    >
      <header className="flex min-h-[60px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 id={id} className="truncate text-[15px] font-semibold tracking-[-0.01em] text-p1-text">{title}</h2>
          {meta && <span className="truncate text-[12px] text-p1-text-3">{meta}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {href && (
            <Link href={href} className="inline-flex items-center gap-0.5 rounded-md text-[12.5px] font-medium text-p1-primary underline-offset-4 hover:underline">
              {linkLabel}<ChevronRight size={14} aria-hidden />
            </Link>
          )}
        </div>
      </header>
      <div className={cx('flex min-h-0 flex-1 flex-col', bodyClassName)}>{children}</div>
    </section>
  );
}

/** A quiet, centred empty state sized for a dashboard card rather than a page. */
export function PanelEmpty({ icon, title, body, action }: {
  icon: React.ReactNode; title: string; body?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
      <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl border border-p1-border bg-p1-subtle text-p1-text-3">{icon}</span>
      <p className="mt-3 text-[13.5px] font-semibold text-p1-text">{title}</p>
      {body && <p className="mt-1 max-w-[34ch] text-[12.5px] leading-5 text-p1-text-3">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** A small native select, sized for a card header or a toolbar. */
export function CompactSelect<T extends string>({
  label, value, options, onChange, icon, className = '',
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cx('relative inline-flex min-w-0', className)}>
      <span className="sr-only">{label}</span>
      {icon && <span aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-p1-text-3">{icon}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cx(
          'h-9 w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg border border-p1-border-strong bg-p1-surface pr-8 text-[13px] font-medium text-p1-text-2',
          'transition-colors hover:bg-p1-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-p1-primary',
          icon ? 'pl-8' : 'pl-3',
        )}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-p1-text-3" />
    </label>
  );
}

const TIME = new Intl.DateTimeFormat('en-SG', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Singapore' });

/** "18:30" → "6:30 PM". Slot times are stored as Singapore wall-clock times. */
export function clockLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  return TIME.format(new Date(`2026-01-01T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+08:00`)).replace(/\s?([ap])m$/i, (_, p: string) => ` ${p.toUpperCase()}M`);
}
