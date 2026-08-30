"use client";

/**
 * V-RENT Phase 1 component kit.
 * Every screen in the prototype is built from these pieces, so the product reads as one thing.
 * All controls are at least 44px tall; all text is at least 12px; nothing depends on colour alone.
 */

import React, { useId, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight, ChevronLeft, Check, AlertCircle, AlertTriangle, Info, CheckCircle2,
  Search, X, HelpCircle, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Inbox,
} from 'lucide-react';
import { Tone, TONE_CLASS } from './status';

/* ------------------------------------------------------------------ helpers */

export const cx = (...a: unknown[]) => a.filter((x) => typeof x === 'string' && x).join(' ');

export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cx('animate-spin', className)} aria-hidden />;
}

/* ------------------------------------------------------------------- button */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'danger' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  block?: boolean;
}

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:   'bg-p1-primary text-p1-primary-on hover:bg-p1-primary-hover shadow-p1-sm',
  secondary: 'bg-p1-primary-soft text-p1-primary hover:bg-p1-border dark:text-p1-text',
  outline:   'border border-p1-border-strong bg-p1-surface text-p1-text hover:bg-p1-subtle',
  ghost:     'text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text',
  accent:    'bg-p1-accent text-p1-accent-on hover:bg-p1-accent-hover shadow-p1-sm font-semibold',
  danger:    'bg-p1-danger text-white hover:opacity-90 shadow-p1-sm',
  link:      'text-p1-accent-text underline-offset-4 hover:underline px-0 h-auto',
};

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-lg',
  md: 'h-11 px-4.5 text-[14px] gap-2 rounded-lg',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, block, className = '', disabled, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,box-shadow,transform,opacity] duration-150 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
        BTN_VARIANT[variant], variant !== 'link' && BTN_SIZE[size], block && 'w-full', className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : leftIcon && <span className="shrink-0" aria-hidden>{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="shrink-0" aria-hidden>{rightIcon}</span>}
    </button>
  );
});

/** A Link styled exactly like a Button. */
export function LinkButton({
  href, variant = 'primary', size = 'md', leftIcon, rightIcon, block, className = '', children,
}: { href: string; variant?: ButtonVariant; size?: ButtonSize; leftIcon?: React.ReactNode; rightIcon?: React.ReactNode; block?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors duration-150 cursor-pointer',
        BTN_VARIANT[variant], variant !== 'link' && BTN_SIZE[size], block && 'w-full', className,
      )}
    >
      {leftIcon && <span className="shrink-0" aria-hidden>{leftIcon}</span>}
      {children}
      {rightIcon && <span className="shrink-0" aria-hidden>{rightIcon}</span>}
    </Link>
  );
}

/** Square icon-only button with a mandatory accessible label. */
export function IconButton({
  label, size = 'md', variant = 'ghost', className = '', children, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: 'sm' | 'md'; variant?: 'ghost' | 'outline' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors cursor-pointer disabled:opacity-50',
        size === 'sm' ? 'h-9 w-9' : 'h-11 w-11',
        variant === 'outline' ? 'border border-p1-border-strong bg-p1-surface text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text' : 'text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ surface */

export function Card({
  children, className = '', padding = 'md', interactive = false, as: Tag = 'div', ...rest
}: React.HTMLAttributes<HTMLElement> & { padding?: 'none' | 'sm' | 'md' | 'lg'; interactive?: boolean; as?: 'div' | 'section' | 'article' }) {
  const pad = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' }[padding];
  return (
    <Tag
      className={cx(
        'rounded-2xl border shadow-p1-sm',
        !/(^|\s)border-/.test(className) && 'border-p1-border',
        !/(^|\s)bg-/.test(className) && 'bg-p1-surface',
        !/(^|\s)text-(white|p1-)/.test(className) && 'text-p1-text',
        interactive && 'transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-p1-border-strong hover:shadow-p1-md',
        pad, className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Card with a titled header row. */
export function SectionCard({
  title, description, actions, children, footer, className = '', padding = 'md', icon,
}: {
  title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode;
  footer?: React.ReactNode; className?: string; padding?: 'none' | 'sm' | 'md' | 'lg'; icon?: React.ReactNode;
}) {
  return (
    <Card padding="none" className={className} as="section">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-p1-border px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          {icon && <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-p1-primary-soft text-p1-primary dark:text-p1-text" aria-hidden>{icon}</span>}
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold leading-6 text-p1-text">{title}</h2>
            {description && <p className="mt-0.5 text-[14px] leading-5 text-p1-text-2">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className={{ none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' }[padding]}>{children}</div>
      {footer && <div className="border-t border-p1-border bg-p1-subtle/60 px-5 py-4 sm:px-6 rounded-b-2xl">{footer}</div>}
    </Card>
  );
}

/* -------------------------------------------------------------- page header */

export interface Crumb { label: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-p1-text-3">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {c.href ? <Link href={c.href} className="hover:text-p1-text hover:underline underline-offset-4">{c.label}</Link> : <span className="font-medium text-p1-text-2" aria-current="page">{c.label}</span>}
            {i < items.length - 1 && <ChevronRight size={14} className="text-p1-border-strong" aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({
  eyebrow, title, description, actions, crumbs, meta, className = '',
}: {
  eyebrow?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode;
  crumbs?: Crumb[]; meta?: React.ReactNode; className?: string;
}) {
  return (
    <header className={cx('vr-rise mb-6 sm:mb-8', className)}>
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && <div className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-p1-accent-text">{eyebrow}</div>}
          <h1 className="font-p1display text-[30px] font-medium leading-[1.15] tracking-[-0.01em] text-p1-text sm:text-[36px] text-balance">{title}</h1>
          {description && <p className="mt-2 text-[15px] leading-6 text-p1-text-2 max-w-2xl">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
      </div>
    </header>
  );
}

export function SectionTitle({ children, hint, actions, className = '' }: { children: React.ReactNode; hint?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('mb-3 flex flex-wrap items-end justify-between gap-2', className)}>
      <div>
        <h2 className="text-[17px] font-semibold text-p1-text">{children}</h2>
        {hint && <p className="mt-0.5 text-[13px] text-p1-text-3">{hint}</p>}
      </div>
      {actions}
    </div>
  );
}

/* ---------------------------------------------------------------- stat card */

export function StatCard({
  label, value, hint, tone = 'neutral', icon, progress, href, className = '', delta,
}: {
  label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: Tone | 'default'; icon?: React.ReactNode;
  progress?: number; href?: string; className?: string; delta?: { value: string; good?: boolean };
}) {
  const valueCls = tone === 'default' || tone === 'neutral' ? 'text-p1-text' : { success: 'text-p1-success', warning: 'text-p1-warning', danger: 'text-p1-danger', info: 'text-p1-info', accent: 'text-p1-accent-text' }[tone];
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-p1-text-2">{label}</span>
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-p1-subtle text-p1-text-3" aria-hidden>{icon}</span>}
      </div>
      <div className={cx('mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums', valueCls)}>{value}</div>
      {(hint || delta) && (
        <div className="mt-2 flex items-center gap-2 text-[13px] text-p1-text-3">
          {delta && <span className={cx('font-medium', delta.good === false ? 'text-p1-danger' : delta.good ? 'text-p1-success' : '')}>{delta.value}</span>}
          {hint}
        </div>
      )}
      {typeof progress === 'number' && <ProgressBar value={progress} className="mt-3" tone={progress >= 100 ? 'danger' : progress >= 80 ? 'warning' : 'accent'} />}
    </>
  );
  const cls = cx('block rounded-2xl border border-p1-border bg-p1-surface p-5 shadow-p1-sm', href && 'transition-[box-shadow,border-color] hover:border-p1-border-strong hover:shadow-p1-md', className);
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function ProgressBar({ value, tone = 'accent', className = '', label, size = 'md' }: { value: number; tone?: Tone; className?: string; label?: string; size?: 'sm' | 'md' }) {
  const v = Math.max(0, Math.min(100, value));
  const fill = { neutral: 'bg-p1-text-3', success: 'bg-p1-success', warning: 'bg-p1-warning', danger: 'bg-p1-danger', info: 'bg-p1-info', accent: 'bg-p1-accent' }[tone];
  return (
    <div className={className}>
      {label && <div className="mb-1.5 flex items-baseline justify-between text-[13px]"><span className="text-p1-text-2">{label}</span><span className="font-medium tabular-nums text-p1-text">{Math.round(v)}%</span></div>}
      <div className={cx('w-full overflow-hidden rounded-full bg-p1-subtle', size === 'sm' ? 'h-1.5' : 'h-2.5')} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cx('h-full rounded-full transition-[width] duration-500', fill)} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ callout */

export function Callout({
  tone = 'info', title, children, action, className = '', icon,
}: { tone?: 'info' | 'success' | 'warning' | 'danger' | 'accent' | 'neutral'; title?: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  const Icon = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: AlertCircle, accent: Info, neutral: Info }[tone];
  return (
    <div role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'} className={cx('flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3.5 sm:flex-nowrap', TONE_CLASS[tone], className)}>
      <span className="mt-0.5 shrink-0" aria-hidden>{icon ?? <Icon size={18} />}</span>
      <div className="min-w-0 flex-1 basis-[14rem] text-p1-text">
        {title && <div className="text-[14px] font-semibold leading-5">{title}</div>}
        {children && <div className={cx('text-[14px] leading-5 text-p1-text-2', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action && <div className="shrink-0 max-sm:w-full max-sm:pl-8">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- form bits */

export function FormField({
  label, hint, error, required, children, id, className = '', help,
}: { label: string; hint?: React.ReactNode; error?: string; required?: boolean; children: (id: string, describedBy?: string) => React.ReactNode; id?: string; className?: string; help?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  const hintId = hint ? `${fid}-hint` : undefined;
  const errId = error ? `${fid}-err` : undefined;
  return (
    <div className={cx('w-full', className)}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label htmlFor={fid} className="text-[14px] font-medium text-p1-text">
          {label}{required && <span className="text-p1-danger" aria-hidden> *</span>}
        </label>
        {help && <HelpTip text={help} />}
      </div>
      {children(fid, [hintId, errId].filter(Boolean).join(' ') || undefined)}
      {error ? (
        <p id={errId} className="mt-1.5 flex items-start gap-1.5 text-[13px] text-p1-danger" role="alert"><AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden />{error}</p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-[13px] text-p1-text-3">{hint}</p>
      ) : null}
    </div>
  );
}

const INPUT_BASE = 'w-full rounded-[10px] border bg-p1-surface px-3.5 text-[15px] text-p1-text placeholder:text-p1-text-3 transition-colors disabled:cursor-not-allowed disabled:bg-p1-subtle disabled:opacity-70';

export function TextInput({
  label, hint, error, required, help, leftIcon, className = '', containerClassName, ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: React.ReactNode; error?: string; help?: string; leftIcon?: React.ReactNode; containerClassName?: string }) {
  return (
    <FormField label={label} hint={hint} error={error} required={required} help={help} id={rest.id} className={containerClassName}>
      {(id, by) => (
        <div className="relative">
          {leftIcon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-p1-text-3" aria-hidden>{leftIcon}</span>}
          <input
            id={id} aria-describedby={by} aria-invalid={!!error || undefined} aria-required={required || undefined}
            className={cx(INPUT_BASE, 'h-11', leftIcon && 'pl-10', error ? 'border-p1-danger' : 'border-p1-border-strong hover:border-p1-text-3', className)}
            {...rest}
          />
        </div>
      )}
    </FormField>
  );
}

export function TextArea({
  label, hint, error, required, help, className = '', containerClassName, ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: React.ReactNode; error?: string; help?: string; containerClassName?: string }) {
  return (
    <FormField label={label} hint={hint} error={error} required={required} help={help} id={rest.id} className={containerClassName}>
      {(id, by) => (
        <textarea id={id} aria-describedby={by} aria-invalid={!!error || undefined} className={cx(INPUT_BASE, 'py-2.5 leading-6', error ? 'border-p1-danger' : 'border-p1-border-strong hover:border-p1-text-3', className)} {...rest} />
      )}
    </FormField>
  );
}

export function SelectInput({
  label, hint, error, required, help, options, className = '', containerClassName, ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: React.ReactNode; error?: string; help?: string; options: { value: string | number; label: string }[]; containerClassName?: string }) {
  return (
    <FormField label={label} hint={hint} error={error} required={required} help={help} id={rest.id} className={containerClassName}>
      {(id, by) => (
        <div className="relative">
          <select id={id} aria-describedby={by} aria-invalid={!!error || undefined} className={cx(INPUT_BASE, 'h-11 appearance-none pr-10', error ? 'border-p1-danger' : 'border-p1-border-strong hover:border-p1-text-3', className)} {...rest}>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-p1-text-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
      )}
    </FormField>
  );
}

export function Checkbox({ label, hint, className = '', ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={rest.id ?? id} className={cx('flex cursor-pointer items-start gap-3 py-1', className)}>
      <input id={rest.id ?? id} type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-p1-border-strong accent-[var(--p1-primary)]" {...rest} />
      <span className="text-[14px] leading-5 text-p1-text">
        {label}
        {hint && <span className="block text-[13px] text-p1-text-3">{hint}</span>}
      </span>
    </label>
  );
}

/** Big, obvious selectable option (payment method, plan, policy). */
export function ChoiceCard({
  selected, onSelect, title, description, icon, badge, className = '', children, disabled,
}: { selected: boolean; onSelect: () => void; title: React.ReactNode; description?: React.ReactNode; icon?: React.ReactNode; badge?: React.ReactNode; className?: string; children?: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button" role="radio" aria-checked={selected} onClick={onSelect} disabled={disabled}
      className={cx(
        'w-full rounded-xl border-2 p-4 text-left transition-[border-color,background-color,box-shadow] disabled:opacity-50 cursor-pointer',
        selected ? 'border-p1-accent bg-p1-accent-soft/60 shadow-p1-sm' : 'border-p1-border bg-p1-surface hover:border-p1-border-strong',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon && <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-p1-accent text-p1-accent-on' : 'bg-p1-subtle text-p1-text-2')} aria-hidden>{icon}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-p1-text">{title}</span>
            {badge}
          </div>
          {description && <div className="mt-0.5 text-[13px] leading-5 text-p1-text-2">{description}</div>}
          {children}
        </div>
        <span className={cx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-p1-accent bg-p1-accent text-p1-accent-on' : 'border-p1-border-strong')} aria-hidden>
          {selected && <Check size={14} strokeWidth={3} />}
        </span>
      </div>
    </button>
  );
}

export function HelpTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button type="button" aria-label={`Help: ${text}`} className="flex h-5 w-5 items-center justify-center rounded-full text-p1-text-3 hover:text-p1-text">
        <HelpCircle size={15} aria-hidden />
      </button>
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 w-60 -translate-x-1/2 rounded-lg bg-p1-text px-3 py-2 text-[13px] leading-5 text-p1-bg opacity-0 shadow-p1-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {text}
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------- read-only */

export function Field({ label, value, mono = false, className = '' }: { label: string; value: React.ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[13px] font-medium text-p1-text-3">{label}</dt>
      <dd className={cx('mt-0.5 text-[15px] text-p1-text break-words', mono && 'font-mono text-[14px]')}>{value}</dd>
    </div>
  );
}

export function FieldGrid({ children, cols = 2, className = '' }: { children: React.ReactNode; cols?: 1 | 2 | 3 | 4; className?: string }) {
  return <dl className={cx('grid gap-x-6 gap-y-4', { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4' }[cols], className)}>{children}</dl>;
}

/* ------------------------------------------------------------------ stepper */

export interface Step { label: string; description?: string; href?: string }

export function Stepper({ steps, current, completed, className = '' }: { steps: Step[]; current: number; completed?: (i: number) => boolean; className?: string }) {
  const isDone = (i: number) => (completed ? completed(i) : i < current);
  return (
    <nav aria-label="Progress" className={cx('mb-6 sm:mb-8', className)}>
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-semibold text-p1-text">Step {current + 1} of {steps.length} · {steps[current]?.label}</span>
          {steps[current + 1] && <span className="text-p1-text-3">Next: {steps[current + 1].label}</span>}
        </div>
        <ProgressBar value={((current + 1) / steps.length) * 100} size="sm" className="mt-2" />
      </div>
      <ol className="hidden sm:flex sm:items-start">
        {steps.map((s, i) => {
          const done = isDone(i);
          const active = i === current;
          const inner = (
            <>
              <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-semibold transition-colors',
                done ? 'border-p1-success bg-p1-success text-white' : active ? 'border-p1-accent bg-p1-accent text-p1-accent-on' : 'border-p1-border-strong bg-p1-surface text-p1-text-3')}>
                {done ? <Check size={15} strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cx('block text-[14px] font-medium leading-5', active ? 'text-p1-text' : done ? 'text-p1-text-2' : 'text-p1-text-3')}>
                  {s.label}
                  {done && <span className="sr-only"> (completed)</span>}
                  {active && <span className="sr-only"> (current step)</span>}
                </span>
                {s.description && <span className="hidden text-[12px] text-p1-text-3 lg:block">{s.description}</span>}
              </span>
            </>
          );
          return (
            <li key={s.label} className="flex items-start gap-3 sm:flex-1" aria-current={active ? 'step' : undefined}>
              {s.href && done ? <Link href={s.href} className="flex items-center gap-3 rounded-lg hover:underline underline-offset-4">{inner}</Link> : <span className="flex items-center gap-3">{inner}</span>}
              {i < steps.length - 1 && <span className={cx('mx-3 mt-4 hidden h-0.5 flex-1 rounded-full sm:block', done ? 'bg-p1-success' : 'bg-p1-border')} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---------------------------------------------------------- search + filter */

export function SearchInput({ value, onChange, placeholder = 'Search', className = '', label = 'Search', autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; label?: string; autoFocus?: boolean }) {
  const id = useId();
  return (
    <div className={cx('relative', className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-p1-text-3" aria-hidden />
      <input id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
        className={cx(INPUT_BASE, 'h-11 border-p1-border-strong pl-10 pr-10 hover:border-p1-text-3')} />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-p1-text-3 hover:bg-p1-subtle hover:text-p1-text">
          <X size={15} aria-hidden />
        </button>
      )}
    </div>
  );
}

export function FilterChips<T extends string>({ options, value, onChange, label = 'Filter' }: { options: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void; label?: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button key={o.key} type="button" aria-pressed={on} onClick={() => onChange(o.key)}
            className={cx('inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors cursor-pointer',
              on ? 'border-p1-primary bg-p1-primary text-p1-primary-on' : 'border-p1-border bg-p1-surface text-p1-text-2 hover:border-p1-border-strong hover:text-p1-text')}>
            {o.label}
            {typeof o.count === 'number' && <span className={cx('rounded-full px-1.5 text-[12px] tabular-nums', on ? 'bg-white/20' : 'bg-p1-subtle text-p1-text-3')}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Toolbar that holds search, chips and view controls with consistent spacing. */
export function FilterBar({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('mb-4 flex flex-col gap-3 rounded-2xl border border-p1-border bg-p1-surface p-3 shadow-p1-sm sm:p-4', className)}>{children}</div>;
}

export function SortButton<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  const id = useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">Sort by</label>
      <ArrowUpDown size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-p1-text-3" aria-hidden />
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={cx(INPUT_BASE, 'h-11 w-auto appearance-none border-p1-border-strong pl-9 pr-9 text-[14px]')}>
        {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-p1-text-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
    </div>
  );
}

/* --------------------------------------------------------------- pagination */

export function usePagination<T>(rows: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safe = Math.min(page, pages);
  const slice = rows.slice((safe - 1) * pageSize, safe * pageSize);
  return { page: safe, pages, setPage, slice, total: rows.length, from: rows.length ? (safe - 1) * pageSize + 1 : 0, to: Math.min(safe * pageSize, rows.length) };
}

export function Pagination({ page, pages, onChange, from, to, total, className = '' }: { page: number; pages: number; onChange: (p: number) => void; from: number; to: number; total: number; className?: string }) {
  if (total === 0) return null;
  return (
    <nav aria-label="Pagination" className={cx('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="text-[13px] text-p1-text-3">Showing <span className="font-medium text-p1-text">{from}–{to}</span> of <span className="font-medium text-p1-text">{total}</span></p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1} leftIcon={<ChevronLeft size={15} />} aria-label="Previous page">Previous</Button>
        <div className="hidden items-center gap-1 sm:flex">
          {Array.from({ length: pages }).map((_, i) => (
            <button key={i} type="button" onClick={() => onChange(i + 1)} aria-current={page === i + 1 ? 'page' : undefined}
              className={cx('h-9 min-w-9 rounded-lg px-2 text-[13px] font-medium tabular-nums cursor-pointer', page === i + 1 ? 'bg-p1-primary text-p1-primary-on' : 'text-p1-text-2 hover:bg-p1-subtle')}>
              {i + 1}
            </button>
          ))}
        </div>
        <span className="px-2 text-[13px] tabular-nums text-p1-text-3 sm:hidden">{page} / {pages}</span>
        <Button variant="outline" size="sm" onClick={() => onChange(page + 1)} disabled={page >= pages} rightIcon={<ChevronRight size={15} />} aria-label="Next page">Next</Button>
      </div>
    </nav>
  );
}

/* --------------------------------------------------------------- data table */

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right';
  width?: string;
  hideBelow?: 'sm' | 'md' | 'lg';
}

export function DataTable<T>({
  columns, rows, rowKey, onRowClick, sort, onSort, empty, caption, minWidth = 640, rowClassName,
}: {
  columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void;
  sort?: { key: string; dir: 'asc' | 'desc' }; onSort?: (key: string) => void; empty?: React.ReactNode; caption?: string; minWidth?: number; rowClassName?: (r: T) => string;
}) {
  const hide = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };
  return (
    <div className="overflow-x-auto rounded-2xl border border-p1-border bg-p1-surface shadow-p1-sm">
      <table className="w-full border-collapse text-left text-[14px]" style={{ minWidth }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-p1-border bg-p1-subtle/60">
            {columns.map((c) => {
              const sortable = !!c.sortValue && !!onSort;
              const active = sort?.key === c.key;
              return (
                <th key={c.key} scope="col" style={{ width: c.width }} aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cx('px-4 py-3 text-[13px] font-semibold text-p1-text-2', c.align === 'right' && 'text-right', c.hideBelow && hide[c.hideBelow])}>
                  {sortable ? (
                    <button type="button" onClick={() => onSort!(c.key)} className={cx('inline-flex items-center gap-1 rounded hover:text-p1-text cursor-pointer', c.align === 'right' && 'flex-row-reverse')}>
                      {c.header}
                      {active ? (sort!.dir === 'asc' ? <ArrowUp size={13} aria-hidden /> : <ArrowDown size={13} aria-hidden />) : <ArrowUpDown size={13} className="opacity-40" aria-hidden />}
                    </button>
                  ) : c.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-p1-border">
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-10">{empty ?? <EmptyState compact title="Nothing to show" />}</td></tr>
          ) : rows.map((r) => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cx('transition-colors', onRowClick && 'cursor-pointer hover:bg-p1-subtle/70', rowClassName?.(r))}>
              {columns.map((c) => (
                <td key={c.key} className={cx('px-4 py-3.5 align-middle text-p1-text', c.align === 'right' && 'text-right', c.hideBelow && hide[c.hideBelow])}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ----------------------------------------------------------- empty / states */

export function EmptyState({ icon, title, description, action, compact = false, className = '' }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; compact?: boolean; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center text-center', compact ? 'py-4' : 'py-12 sm:py-16', className)}>
      <span className={cx('flex items-center justify-center rounded-2xl bg-p1-subtle text-p1-text-3', compact ? 'h-11 w-11' : 'mb-1 h-14 w-14')} aria-hidden>{icon ?? <Inbox size={compact ? 20 : 26} />}</span>
      <h3 className={cx('font-semibold text-p1-text', compact ? 'mt-3 text-[15px]' : 'mt-4 text-[18px]')}>{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-[14px] leading-6 text-p1-text-2">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something didn't work", description, retry, className = '' }: { title?: string; description?: React.ReactNode; retry?: () => void; className?: string }) {
  return (
    <EmptyState className={className} icon={<AlertCircle size={26} className="text-p1-danger" />} title={title}
      description={description ?? 'Your information is still here. Please try again in a moment.'}
      action={retry && <Button variant="outline" onClick={retry}>Try again</Button>} />
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cx('p1-skeleton', className)} aria-hidden />;
}

export function SkeletonCard() {
  return (
    <Card>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-3 h-7 w-1/2" />
      <Skeleton className="mt-3 h-3 w-2/3" />
    </Card>
  );
}

/* ----------------------------------------------------------------- avatar */

export function Avatar({ name, size = 'md', className = '' }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const initials = name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const sz = { sm: 'h-8 w-8 text-[12px]', md: 'h-10 w-10 text-[14px]', lg: 'h-14 w-14 text-[18px]', xl: 'h-20 w-20 text-[26px]' }[size];
  return <span className={cx('inline-flex shrink-0 items-center justify-center rounded-full bg-p1-primary font-semibold text-white', sz, className)} aria-hidden>{initials}</span>;
}

/* ------------------------------------------------------------------- tabs */

export function Tabs<T extends string>({ items, value, onChange, label = 'Sections', className = '' }: { items: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void; label?: string; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cx('flex gap-1 overflow-x-auto border-b border-p1-border', className)}>
      {items.map((t) => {
        const on = t.key === value;
        return (
          <button key={t.key} role="tab" type="button" aria-selected={on} onClick={() => onChange(t.key)}
            className={cx('relative -mb-px flex h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-[14px] font-medium transition-colors cursor-pointer',
              on ? 'border-p1-accent text-p1-text' : 'border-transparent text-p1-text-2 hover:text-p1-text')}>
            {t.label}
            {typeof t.count === 'number' && <span className="rounded-full bg-p1-subtle px-1.5 text-[12px] tabular-nums text-p1-text-3">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------- key/value list */

export function KeyValue({ rows, className = '' }: { rows: { k: React.ReactNode; v: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cx('divide-y divide-p1-border', className)}>
      {rows.map((r, i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-2.5 text-[14px]">
          <dt className="text-p1-text-2">{r.k}</dt>
          <dd className="text-right font-medium text-p1-text">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------------------------------------------------- presenter note */

/** Discreet, collapsible note for the presenter. Hidden by default so the product reads as a product. */
export function PresenterNote({ children, title = 'Presenter note' }: { children: React.ReactNode; title?: string }) {
  return (
    <details className="group mt-8 rounded-xl border border-dashed border-p1-border bg-p1-subtle/40 px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-medium text-p1-text-3 hover:text-p1-text">
        <Info size={14} aria-hidden /> {title}
        <ChevronRight size={14} className="ml-auto transition-transform group-open:rotate-90" aria-hidden />
      </summary>
      <div className="mt-2 text-[13px] leading-6 text-p1-text-2">{children}</div>
    </details>
  );
}
