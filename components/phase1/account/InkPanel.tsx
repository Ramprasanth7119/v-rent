/**
 * The deep panel the Account screens open on.
 *
 * The landing page's night sky and skyline, cut down to a card: the plan on
 * Subscription and the registration on Profile & CEA both sit on it, so the
 * two things an agent pays for and is licensed under read as V-RENT's own
 * rather than as rows in a settings form. Everything inside is white ink; the
 * helpers below keep that ink consistent.
 */

import React from 'react';
import { Skyline } from '../landing/Skyline';
import { cx } from '../kit';

export function InkPanel({ children, className = '', as: Tag = 'section', ...rest }: React.HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'article' | 'div';
}) {
  return (
    <Tag
      className={cx(
        'relative isolate overflow-hidden rounded-2xl text-white shadow-p1-lg',
        'bg-[linear-gradient(135deg,var(--p1-ink-from)_0%,var(--p1-ink-mid)_55%,var(--p1-ink-to)_100%)]',
        'ring-1 ring-inset ring-[var(--p1-ink-line)]',
        className,
      )}
      {...rest}
    >
      <Skyline className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[120px] w-full opacity-70 sm:h-[150px]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_70%_at_88%_0%,var(--p1-ink-glow),transparent_70%)]" />
      {children}
    </Tag>
  );
}

/** A small uppercase label on the panel. */
export function InkLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white/60', className)}>{children}</div>;
}

/** One fact on the panel: a quiet label over a firm value. */
export function InkFact({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('min-w-0', className)}>
      <dt className="text-[12px] text-white/55">{label}</dt>
      <dd className="mt-1 truncate text-[14.5px] font-semibold text-white [&:has(.block)]:whitespace-normal">{children}</dd>
    </div>
  );
}

const INK_TONE = {
  success: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30',
  warning: 'bg-amber-400/15 text-amber-200 ring-amber-300/30',
  danger: 'bg-rose-400/15 text-rose-200 ring-rose-300/30',
  neutral: 'bg-white/10 text-white/80 ring-white/20',
} as const;

/** A status on the panel. A dot and a word, never colour alone. */
export function InkStatus({ tone, children, icon }: { tone: keyof typeof INK_TONE; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset', INK_TONE[tone])}>
      {icon ?? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Buttons that sit on the panel: a white primary and a glass secondary. */
export const INK_BUTTON = {
  primary: 'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-[14px] font-semibold text-[#0B1220] shadow-sm transition-[background-color,transform] duration-150 hover:bg-white/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
  ghost: 'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white/10 px-4 text-[14px] font-medium text-white ring-1 ring-inset ring-white/20 backdrop-blur transition-[background-color,transform] duration-150 hover:bg-white/15 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
} as const;
