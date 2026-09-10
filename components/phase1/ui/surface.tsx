"use client";

/**
 * Surfaces and page structure: cards, page header, metric strip, callouts, read-only fields.
 */

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { cx } from './primitives';
import { Tone, TONE_CLASS } from '../status';

/* -------------------------------------------------------------------- card */

export function Card({
  children, className = '', padding = 'md', interactive = false, elevated = false, as: Tag = 'div', ...rest
}: React.HTMLAttributes<HTMLElement> & { padding?: 'none' | 'sm' | 'md' | 'lg'; interactive?: boolean; elevated?: boolean; as?: 'div' | 'section' | 'article' | 'li' }) {
  const pad = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6 sm:p-7' }[padding];
  return (
    <Tag
      className={cx(
        'rounded-xl border',
        !/(^|\s)border-/.test(className) && 'border-p1-border',
        !/(^|\s)bg-/.test(className) && 'bg-p1-surface',
        !/(^|\s)text-(white|p1-)/.test(className) && 'text-p1-text',
        elevated && 'shadow-p1-md',
        interactive && 'transition-[box-shadow,border-color] duration-150 hover:border-p1-border-strong hover:shadow-p1-sm',
        pad, className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Card with a titled header row. Header is compact so the content dominates. */
export function SectionCard({
  title, description, actions, children, footer, className = '', padding = 'md', icon, id,
}: {
  title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode;
  footer?: React.ReactNode; className?: string; padding?: 'none' | 'sm' | 'md' | 'lg'; icon?: React.ReactNode; id?: string;
}) {
  return (
    <Card padding="none" className={className} as="section" id={id}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-p1-border px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-p1-subtle text-p1-text-2" aria-hidden>{icon}</span>}
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold leading-5 text-p1-text">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] leading-5 text-p1-text-3">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className={{ none: '', sm: 'p-4', md: 'p-5', lg: 'p-6 sm:p-7' }[padding]}>{children}</div>
      {footer && <div className="rounded-b-xl border-t border-p1-border bg-p1-subtle/50 px-5 py-3.5">{footer}</div>}
    </Card>
  );
}

/* ------------------------------------------------------------- page header */

export interface Crumb { label: string; href?: string }

export function Breadcrumbs({ items, className = '' }: { items: Crumb[]; className?: string }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className={cx('mb-2', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-p1-text-3">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {c.href ? <Link href={c.href} className="rounded hover:text-p1-text hover:underline underline-offset-4">{c.label}</Link> : <span className="font-medium text-p1-text-2" aria-current="page">{c.label}</span>}
            {i < items.length - 1 && <ChevronRight size={13} className="text-p1-border-strong" aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Page header. Level 1 of the hierarchy: what page am I on.
 * `size="lg"` for landing-style pages; the default suits working screens.
 */
export function PageHeader({
  eyebrow, title, description, actions, crumbs, meta, className = '', size = 'md', avatar,
}: {
  eyebrow?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode;
  crumbs?: Crumb[]; meta?: React.ReactNode; className?: string; size?: 'md' | 'lg'; avatar?: React.ReactNode;
}) {
  return (
    <header className={cx('vr-rise mb-5 sm:mb-6', className)}>
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 max-w-3xl items-start gap-4">
          {avatar}
          <div className="min-w-0">
            {eyebrow && <div className="mb-1.5 text-[12.5px] font-semibold text-p1-text-3">{eyebrow}</div>}
            <h1 className={cx('font-p1display font-medium leading-[1.15] tracking-[-0.01em] text-p1-text text-balance', size === 'lg' ? 'text-[30px] sm:text-[36px]' : 'text-[26px] sm:text-[30px]')}>{title}</h1>
            {description && <p className="mt-1.5 max-w-2xl text-[14px] leading-6 text-p1-text-2">{description}</p>}
            {meta && <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
      </div>
    </header>
  );
}

export function SectionTitle({ children, hint, actions, className = '', as: Tag = 'h2' }: { children: React.ReactNode; hint?: React.ReactNode; actions?: React.ReactNode; className?: string; as?: 'h2' | 'h3' }) {
  return (
    <div className={cx('mb-3 flex flex-wrap items-end justify-between gap-2', className)}>
      <div>
        <Tag className="text-[15px] font-semibold text-p1-text">{children}</Tag>
        {hint && <p className="mt-0.5 text-[13px] text-p1-text-3">{hint}</p>}
      </div>
      {actions}
    </div>
  );
}

/* ------------------------------------------------------------ metric strip */

const VALUE_TONE: Record<Tone | 'default', string> = {
  default: 'text-p1-text', neutral: 'text-p1-text', success: 'text-p1-success', warning: 'text-p1-warning', danger: 'text-p1-danger', info: 'text-p1-info', accent: 'text-p1-accent-text',
};

/**
 * One bordered strip of metrics separated by hairlines, instead of a row of cards.
 * Each metric answers "why should I care" through its hint, and links to the workflow.
 */
export function MetricStrip({ children, className = '', cols }: { children: React.ReactNode; className?: string; cols?: 2 | 3 | 4 | 5 | 6 }) {
  const n = cols ?? React.Children.count(children);
  const grid = { 2: 'grid-cols-2', 3: 'grid-cols-2 md:grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4', 5: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5', 6: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6' }[Math.min(6, Math.max(2, n)) as 2 | 3 | 4 | 5 | 6];
  return (
    <div className={cx('grid overflow-hidden rounded-xl border border-p1-border bg-p1-surface p1-strip', grid, className)}>
      {children}
    </div>
  );
}

export function Metric({
  label, value, hint, tone = 'default', href, delta, icon, className = '', emphasis = false,
}: {
  label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: Tone | 'default'; href?: string;
  delta?: { value: string; good?: boolean; label?: string }; icon?: React.ReactNode; className?: string; emphasis?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12.5px] font-medium text-p1-text-3">{label}</span>
        {icon && <span className="shrink-0 text-p1-text-3" aria-hidden>{icon}</span>}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className={cx('text-[26px] font-semibold leading-none tracking-tight tabular-nums', emphasis ? 'font-p1display text-[30px] font-medium' : '', VALUE_TONE[tone])}>{value}</span>
        {delta && (
          <span className={cx('text-[12px] font-semibold tabular-nums', delta.good === false ? 'text-p1-danger' : delta.good ? 'text-p1-success' : 'text-p1-text-3')} title={delta.label}>{delta.value}</span>
        )}
      </div>
      {hint && <div className="mt-1.5 truncate text-[12.5px] text-p1-text-3">{hint}</div>}
    </>
  );
  const cls = cx('block min-w-0 px-4 py-3.5 sm:px-5', href && 'transition-colors hover:bg-p1-subtle/60', className);
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Stand-alone stat card, kept for admin overview tiles. */
export function StatCard({
  label, value, hint, tone = 'neutral', icon, progress, href, className = '', delta,
}: {
  label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: Tone | 'default'; icon?: React.ReactNode;
  progress?: number; href?: string; className?: string; delta?: { value: string; good?: boolean };
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-p1-text-3">{label}</span>
        {icon && <span className="text-p1-text-3" aria-hidden>{icon}</span>}
      </div>
      <div className={cx('mt-2 text-[26px] font-semibold leading-none tracking-tight tabular-nums', VALUE_TONE[tone])}>{value}</div>
      {(hint || delta) && (
        <div className="mt-2 flex items-center gap-2 text-[12.5px] text-p1-text-3">
          {delta && <span className={cx('font-semibold', delta.good === false ? 'text-p1-danger' : delta.good ? 'text-p1-success' : '')}>{delta.value}</span>}
          {hint}
        </div>
      )}
      {typeof progress === 'number' && <ProgressBar value={progress} className="mt-3" size="sm" tone={progress >= 100 ? 'danger' : progress >= 80 ? 'warning' : 'info'} />}
    </>
  );
  const cls = cx('block rounded-xl border border-p1-border bg-p1-surface p-4', href && 'transition-colors hover:border-p1-border-strong hover:bg-p1-subtle/40', className);
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function ProgressBar({ value, tone = 'info', className = '', label, size = 'md' }: { value: number; tone?: Tone; className?: string; label?: string; size?: 'sm' | 'md' }) {
  const v = Math.max(0, Math.min(100, value));
  const fill = { neutral: 'bg-p1-text-3', success: 'bg-p1-success', warning: 'bg-p1-warning', danger: 'bg-p1-danger', info: 'bg-p1-primary dark:bg-p1-info', accent: 'bg-p1-accent' }[tone];
  return (
    <div className={className}>
      {label && <div className="mb-1.5 flex items-baseline justify-between text-[13px]"><span className="text-p1-text-2">{label}</span><span className="font-medium tabular-nums text-p1-text">{Math.round(v)}%</span></div>}
      <div className={cx('w-full overflow-hidden rounded-full bg-p1-subtle', size === 'sm' ? 'h-1.5' : 'h-2')} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cx('h-full rounded-full transition-[width] duration-500', fill)} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- callout */

export function Callout({
  tone = 'info', title, children, action, className = '', icon, compact = false,
}: { tone?: 'info' | 'success' | 'warning' | 'danger' | 'accent' | 'neutral'; title?: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; className?: string; icon?: React.ReactNode; compact?: boolean }) {
  const Icon = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: AlertCircle, accent: Info, neutral: Info }[tone];
  return (
    <div role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'} className={cx('flex flex-wrap items-start gap-3 rounded-lg border sm:flex-nowrap', compact ? 'px-3 py-2.5' : 'px-4 py-3', TONE_CLASS[tone], className)}>
      <span className="mt-0.5 shrink-0" aria-hidden>{icon ?? <Icon size={17} />}</span>
      <div className="min-w-0 flex-1 basis-[14rem] text-p1-text">
        {title && <div className="text-[14px] font-semibold leading-5">{title}</div>}
        {children && <div className={cx('text-[13.5px] leading-5 text-p1-text-2', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action && <div className="shrink-0 max-sm:w-full max-sm:pl-8">{action}</div>}
    </div>
  );
}

/* --------------------------------------------------------------- read-only */

export function Field({ label, value, mono = false, className = '' }: { label: string; value: React.ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[12.5px] font-medium text-p1-text-3">{label}</dt>
      <dd className={cx('mt-0.5 break-words text-[14.5px] text-p1-text', mono && 'font-mono text-[13.5px]')}>{value}</dd>
    </div>
  );
}

export function FieldGrid({ children, cols = 2, className = '' }: { children: React.ReactNode; cols?: 1 | 2 | 3 | 4; className?: string }) {
  return <dl className={cx('grid gap-x-6 gap-y-4', { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4' }[cols], className)}>{children}</dl>;
}

export function KeyValue({ rows, className = '', dense = false }: { rows: { k: React.ReactNode; v: React.ReactNode }[]; className?: string; dense?: boolean }) {
  return (
    <dl className={cx('divide-y divide-p1-border', className)}>
      {rows.map((r, i) => (
        <div key={i} className={cx('flex items-start justify-between gap-4 text-[13.5px]', dense ? 'py-1.5' : 'py-2.5')}>
          <dt className="text-p1-text-2">{r.k}</dt>
          <dd className="text-right font-medium text-p1-text">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------------------------------------------------- presenter note */

/** Collapsed note for the presenter. Rendered as a footnote so the product reads as a product. */
export function PresenterNote({ children, title = 'Presenter note' }: { children: React.ReactNode; title?: string }) {
  return (
    <details className="group mt-10 border-t border-dashed border-p1-border pt-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[12px] font-medium text-p1-text-3 hover:text-p1-text">
        <Info size={13} aria-hidden /> {title}
        <ChevronRight size={13} className="transition-transform group-open:rotate-90" aria-hidden />
      </summary>
      <div className="mt-2 max-w-3xl text-[13px] leading-6 text-p1-text-2">{children}</div>
    </details>
  );
}
