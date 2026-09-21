"use client";

/**
 * Form controls. Every control is labelled, 44px tall, and reports errors next to the field.
 */

import React, { useId, useState } from 'react';
import { Check, AlertCircle, HelpCircle, Search, X, Eye, EyeOff } from 'lucide-react';
import { cx } from './primitives';

export function FormField({
  label, hint, error, required, optional, children, id, className = '', help, counter,
}: {
  label: string; hint?: React.ReactNode; error?: string; required?: boolean; optional?: boolean;
  children: (id: string, describedBy?: string) => React.ReactNode; id?: string; className?: string; help?: string; counter?: React.ReactNode;
}) {
  const auto = useId();
  const fid = id ?? auto;
  const hintId = hint ? `${fid}-hint` : undefined;
  const errId = error ? `${fid}-err` : undefined;
  return (
    <div className={cx('w-full', className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <label htmlFor={fid} className="text-[13.5px] font-medium text-p1-text">
            {label}
            {required && <span className="text-p1-danger" aria-hidden> *</span>}
            {optional && <span className="ml-1.5 text-[12px] font-normal text-p1-text-3">Optional</span>}
          </label>
          {help && <HelpTip text={help} />}
        </div>
        {counter && <span className="text-[12px] tabular-nums text-p1-text-3">{counter}</span>}
      </div>
      {children(fid, [hintId, errId].filter(Boolean).join(' ') || undefined)}
      {error ? (
        <p id={errId} className="mt-1.5 flex items-start gap-1.5 text-[13px] text-p1-danger" role="alert"><AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden />{error}</p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-[12.5px] leading-5 text-p1-text-3">{hint}</p>
      ) : null}
    </div>
  );
}

export const INPUT_BASE = 'p1-field w-full rounded-lg border bg-p1-surface px-3.5 text-[14px] text-p1-text placeholder:text-p1-text-3 transition-[border-color,box-shadow] duration-150 focus:border-p1-primary focus:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-p1-subtle disabled:opacity-70';
const border = (error?: string) => (error ? 'border-p1-danger focus:border-p1-danger focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--p1-danger)_22%,transparent)]' : 'border-p1-border-strong hover:border-p1-text-3/60');

type Common = { label: string; hint?: React.ReactNode; error?: string; help?: string; optional?: boolean; containerClassName?: string; counter?: React.ReactNode };

export function TextInput({
  label, hint, error, required, optional, help, leftIcon, rightSlot, className = '', containerClassName, counter, ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & Common & { leftIcon?: React.ReactNode; rightSlot?: React.ReactNode }) {
  return (
    <FormField label={label} hint={hint} error={error} required={required} optional={optional} help={help} id={rest.id} className={containerClassName} counter={counter}>
      {(id, by) => (
        <div className="relative">
          {leftIcon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-p1-text-3" aria-hidden>{leftIcon}</span>}
          <input
            id={id} aria-describedby={by} aria-invalid={!!error || undefined} aria-required={required || undefined}
            className={cx(INPUT_BASE, 'h-11', leftIcon && 'pl-10', rightSlot && 'pr-16', border(error), className)}
            {...rest}
          />
          {rightSlot && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-p1-text-3">{rightSlot}</span>}
        </div>
      )}
    </FormField>
  );
}

/**
 * A password field with a reveal.
 *
 * The button is inside the field rather than beside it, is a real button so a
 * keyboard reaches it, and says which of the two states it will move to — a
 * control labelled only "show" is ambiguous once the password is already
 * visible. Revealing is per-field and resets when the page is left, so nothing
 * is remembered that should not be.
 */
export function PasswordInput({
  label, hint, error, required, optional, help, leftIcon, className = '', containerClassName, ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & Common & { leftIcon?: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  return (
    <FormField label={label} hint={hint} error={error} required={required} optional={optional} help={help} id={rest.id} className={containerClassName}>
      {(id, by) => (
        <div className="relative">
          {leftIcon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-p1-text-3" aria-hidden>{leftIcon}</span>}
          <input
            id={id}
            type={shown ? 'text' : 'password'}
            aria-describedby={by}
            aria-invalid={!!error || undefined}
            aria-required={required || undefined}
            className={cx(INPUT_BASE, 'h-11 pr-11', leftIcon && 'pl-10', border(error), className)}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-pressed={shown}
            aria-label={shown ? 'Hide password' : 'Show password'}
            title={shown ? 'Hide password' : 'Show password'}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-p1-text-3 transition-colors hover:bg-p1-subtle hover:text-p1-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-p1-primary"
          >
            {shown ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
          </button>
        </div>
      )}
    </FormField>
  );
}

export function TextArea({
  label, hint, error, required, optional, help, className = '', containerClassName, counter, ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & Common) {
  return (
    <FormField label={label} hint={hint} error={error} required={required} optional={optional} help={help} id={rest.id} className={containerClassName} counter={counter}>
      {(id, by) => (
        <textarea id={id} aria-describedby={by} aria-invalid={!!error || undefined} className={cx(INPUT_BASE, 'py-2.5 leading-6', border(error), className)} {...rest} />
      )}
    </FormField>
  );
}

export function SelectInput({
  label, hint, error, required, optional, help, options, className = '', containerClassName, ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & Common & { options: { value: string | number; label: string }[] }) {
  return (
    <FormField label={label} hint={hint} error={error} required={required} optional={optional} help={help} id={rest.id} className={containerClassName}>
      {(id, by) => (
        <div className="relative">
          <select id={id} aria-describedby={by} aria-invalid={!!error || undefined} className={cx(INPUT_BASE, 'h-11 appearance-none pr-10', border(error), className)} {...rest}>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Chevron />
        </div>
      )}
    </FormField>
  );
}

function Chevron() {
  return <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-p1-text-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
}

/** Bare select without a visible label, for toolbars. */
export function InlineSelect<T extends string>({ label, value, onChange, options, className = '', icon }: { label: string; value: T; onChange: (v: T) => void; options: { key: T; label: string }[]; className?: string; icon?: React.ReactNode }) {
  const id = useId();
  return (
    <div className={cx('relative', className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-p1-text-3" aria-hidden>{icon}</span>}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={cx(INPUT_BASE, 'h-10 w-auto appearance-none border-p1-border-strong pr-9 text-[13.5px]', icon ? 'pl-9' : 'pl-3')}>
        {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
      <Chevron />
    </div>
  );
}

export function Checkbox({ label, hint, className = '', ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={rest.id ?? id} className={cx('flex cursor-pointer items-start gap-3 py-1', className)}>
      <input id={rest.id ?? id} type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-p1-border-strong accent-[var(--p1-primary)]" {...rest} />
      <span className="text-[14px] leading-5 text-p1-text">
        {label}
        {hint && <span className="block text-[12.5px] text-p1-text-3">{hint}</span>}
      </span>
    </label>
  );
}

/** Accessible switch. */
export function Toggle({ checked, onChange, label, description, className = '' }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; description?: React.ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={cx('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <div id={`${id}-l`} className="text-[14px] font-medium text-p1-text">{label}</div>
        {description && <div id={`${id}-d`} className="mt-0.5 text-[13px] leading-5 text-p1-text-2">{description}</div>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-labelledby={`${id}-l`} aria-describedby={description ? `${id}-d` : undefined} onClick={() => onChange(!checked)}
        className="flex h-11 shrink-0 items-center gap-2.5 rounded-lg px-1 cursor-pointer">
        <span className={cx('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-p1-success' : 'bg-p1-border-strong')} aria-hidden>
          <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]', checked ? 'left-[22px]' : 'left-0.5')} />
        </span>
        <span className="w-6 text-[13px] font-medium text-p1-text-2">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

/** Segmented control for a small set of exclusive options (view mode, ranges). */
export function Segmented<T extends string>({ options, value, onChange, label, className = '', size = 'md' }: { options: { key: T; label: React.ReactNode; icon?: React.ReactNode }[]; value: T; onChange: (k: T) => void; label: string; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div role="group" aria-label={label} className={cx('inline-flex shrink-0 rounded-lg border border-p1-border-strong bg-p1-surface p-0.5', className)}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button key={o.key} type="button" aria-pressed={on} onClick={() => onChange(o.key)}
            className={cx('inline-flex items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors cursor-pointer', size === 'sm' ? 'h-8' : 'h-9',
              on ? 'bg-p1-primary text-p1-primary-on' : 'text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text')}>
            {o.icon && <span aria-hidden>{o.icon}</span>}{o.label}
          </button>
        );
      })}
    </div>
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
        'w-full rounded-xl border p-4 text-left transition-[border-color,background-color,box-shadow] disabled:opacity-50 cursor-pointer',
        selected ? 'border-p1-primary bg-p1-primary-soft/50 ring-1 ring-p1-primary dark:border-p1-info dark:ring-p1-info' : 'border-p1-border bg-p1-surface hover:border-p1-border-strong',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon && <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-p1-primary text-white dark:bg-p1-info' : 'bg-p1-subtle text-p1-text-2')} aria-hidden>{icon}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-p1-text">{title}</span>
            {badge}
          </div>
          {description && <div className="mt-0.5 text-[13px] leading-5 text-p1-text-2">{description}</div>}
          {children}
        </div>
        <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-p1-primary bg-p1-primary text-white dark:border-p1-info dark:bg-p1-info' : 'border-p1-border-strong')} aria-hidden>
          {selected && <Check size={12} strokeWidth={3} />}
        </span>
      </div>
    </button>
  );
}

export function HelpTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      {/* A 28px target around a 14px mark: the negative margin keeps it taking
          the same 20px of the line it sits on. */}
      <button type="button" aria-label={`Help: ${text}`} className="-m-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-p1-text-3 hover:text-p1-text">
        <HelpCircle size={14} aria-hidden />
      </button>
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 w-60 -translate-x-1/2 rounded-lg bg-p1-text px-3 py-2 text-[12.5px] leading-5 text-p1-bg opacity-0 shadow-p1-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {text}
      </span>
    </span>
  );
}

export const SearchInput = React.forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; label?: string; autoFocus?: boolean; size?: 'sm' | 'md'; onKeyDown?: React.KeyboardEventHandler<HTMLInputElement> }>(function SearchInput(
  { value, onChange, placeholder = 'Search', className = '', label = 'Search', autoFocus, size = 'md', onKeyDown }, ref,
) {
  const id = useId();
  return (
    <div className={cx('relative', className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-p1-text-3" aria-hidden />
      <input ref={ref} id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} onKeyDown={onKeyDown}
        className={cx(INPUT_BASE, size === 'sm' ? 'h-10 text-[13.5px]' : 'h-11', 'border-p1-border-strong pl-10 pr-10 hover:border-p1-text-3 [&::-webkit-search-cancel-button]:hidden')} />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-p1-text-3 hover:bg-p1-subtle hover:text-p1-text cursor-pointer">
          <X size={15} aria-hidden />
        </button>
      )}
    </div>
  );
});
