"use client";

/**
 * The pieces every sign-in and account screen is built from.
 *
 * They sit on top of the kit rather than beside it: fields are the kit's
 * `TextInput` and `PasswordInput`, the action is the kit's `Button`. What is
 * here is only what an authentication flow has that other forms do not: steps
 * that slide, an action that ends in a check, and a refusal that is said once,
 * where the eye already is.
 */

import React from 'react';
import { AlertCircle, ArrowRight, Info } from 'lucide-react';
import { Button, cx } from '../kit';

export function AuthHeader({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <header>
      <h1 className="font-p1display text-[26px] font-bold leading-[1.15] tracking-[-0.025em] text-p1-text text-balance sm:text-[30px]">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-[14.5px] leading-6 text-p1-text-2">{subtitle}</p>}
    </header>
  );
}

/**
 * One step of a flow. Keyed by the caller, so a new step mounts and slides in
 * from the side it came from: forward from the right, back from the left.
 */
export function AuthStep({ dir, children, className = '' }: { dir: 'fwd' | 'back' | 'none'; children: React.ReactNode; className?: string }) {
  return (
    <div data-dir={dir} className={cx('p1-auth-step', className)}>
      {children}
    </div>
  );
}

/**
 * A message about the form as a whole, as opposed to one field.
 *
 * Remount it (change its `key`) to say the same thing again: a refused
 * sign-in that shows an unchanged banner looks as if nothing happened.
 */
export function AuthFeedback({
  tone,
  children,
  action,
}: {
  tone: 'danger' | 'warning' | 'info';
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const Icon = tone === 'info' ? Info : AlertCircle;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx(
        'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13.5px] leading-5 text-p1-text',
        tone === 'danger' && 'p1-auth-shake border-p1-danger-border bg-p1-danger-soft',
        tone === 'warning' && 'p1-auth-in border-p1-warning-border bg-p1-warning-soft',
        tone === 'info' && 'p1-auth-in border-p1-info-border bg-p1-info-soft',
      )}
    >
      <Icon
        size={17}
        className={cx('mt-px shrink-0', tone === 'danger' ? 'text-p1-danger' : tone === 'warning' ? 'text-p1-warning' : 'text-p1-info')}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        {children}
        {action && <div className="mt-1.5">{action}</div>}
      </div>
    </div>
  );
}

/** "Step 2 of 3", said aloud when it changes, drawn as segments that fill. */
export function AuthProgress({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="mb-7">
      <p className="flex items-baseline justify-between gap-3 text-[12.5px]" aria-live="polite">
        <span className="font-semibold uppercase tracking-[0.06em] text-p1-primary">
          Step {step} of {labels.length}
        </span>
        <span className="truncate text-p1-text-3">{labels[step - 1]}</span>
      </p>
      <div className="mt-2.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }} aria-hidden>
        {labels.map((l, i) => (
          <span key={l} className="h-1 overflow-hidden rounded-full bg-p1-subtle">
            <span
              className="block h-full origin-left rounded-full bg-p1-primary transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{ transform: `scaleX(${i < step ? 1 : 0})` }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

/** A check that draws itself. */
export function DrawnCheck({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className={className} aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="p1-auth-check" />
    </svg>
  );
}

export type SubmitStatus = 'idle' | 'loading' | 'success';

/**
 * The primary action of a step: idle → working → done.
 *
 * It keeps its size through all three, so nothing below it moves, and it stays
 * disabled once done because the page is already on its way somewhere else.
 */
export function AuthSubmit({
  status = 'idle',
  children,
  busyLabel,
  doneLabel,
  disabled,
  arrow = true,
  type = 'submit',
  onClick,
}: {
  status?: SubmitStatus;
  children: React.ReactNode;
  busyLabel?: string;
  doneLabel?: string;
  disabled?: boolean;
  arrow?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
}) {
  const done = status === 'success';
  return (
    <Button
      type={type}
      onClick={onClick}
      variant="primary"
      size="lg"
      block
      loading={status === 'loading'}
      disabled={disabled || done}
      rightIcon={status === 'idle' && arrow ? <ArrowRight size={17} /> : undefined}
      className={cx('p1-auth-cta', done && 'bg-p1-success! text-p1-primary-on! opacity-100!')}
    >
      {done ? (
        <span className="inline-flex items-center gap-2">
          <DrawnCheck />
          {doneLabel ?? children}
        </span>
      ) : status === 'loading' ? (busyLabel ?? children) : children}
    </Button>
  );
}

/** The address a step is acting on, with the way back to change it. */
export function EmailChip({ email, onChange }: { email: string; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-p1-border bg-p1-subtle/70 py-2 pl-2.5 pr-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-p1-primary-soft text-[13px] font-semibold uppercase text-p1-primary" aria-hidden>
        {email.charAt(0) || '?'}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-p1-text">{email}</span>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 cursor-pointer rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-p1-primary hover:bg-p1-primary-soft"
      >
        Change<span className="sr-only"> email address</span>
      </button>
    </div>
  );
}

/** The plain text link used under forms: "New to V-RENT? Create an account". */
export const authLink =
  'font-semibold text-p1-primary underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-p1-primary';

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
