"use client";

import React from 'react';
import Link from 'next/link';
import { Check, X, Circle } from 'lucide-react';
import { ListingStatus, LISTING_STATUS_LABEL } from '../../lib/phase1/data';

/** Section heading used at the top of every demo screen. */
export function PageHead({
  module,
  title,
  blurb,
  actions,
}: {
  module: string;
  title: string;
  blurb?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
      <div className="min-w-0">
        <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-brand-gold mb-2">
          {module}
        </div>
        <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground text-balance">
          {title}
        </h1>
        {blurb && (
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed">
            {blurb}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

/** Small labelled statistic. */
export function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const toneCls = {
    default: 'text-foreground',
    good: 'text-emerald-600 dark:text-emerald-400',
    warn: 'text-amber-600 dark:text-amber-400',
    bad: 'text-red-600 dark:text-red-400',
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight ${toneCls}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{sub}</div>}
    </div>
  );
}

/** Pass / fail row used by the publish gate. */
export function GateRow({
  pass,
  label,
  detail,
  fixHref,
  fixLabel,
}: {
  pass: boolean;
  label: string;
  detail: string;
  fixHref?: string;
  fixLabel?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
      <span
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
          pass
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
            : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
        }`}
      >
        {pass ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{detail}</div>
      </div>
      {!pass && fixHref && (
        <Link
          href={fixHref}
          className="flex-shrink-0 text-xs font-semibold text-brand-gold hover:underline whitespace-nowrap mt-0.5"
        >
          {fixLabel} →
        </Link>
      )}
    </div>
  );
}

/** Coloured status chip for listing state. */
export function StatusChip({ status }: { status: ListingStatus }) {
  const cls: Record<ListingStatus, string> = {
    draft: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    pending_review: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400',
    published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
    paused: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400',
    expired: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls[status]}`}
    >
      {LISTING_STATUS_LABEL[status]}
    </span>
  );
}

/** Match-outcome chip for the CEA verification queue. */
export function MatchChip({ match }: { match: 'strong' | 'weak' | 'not_found' | 'expired' }) {
  const map = {
    strong: { t: 'Strong match', c: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' },
    weak: { t: 'Weak match', c: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400' },
    not_found: { t: 'Not found', c: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400' },
    expired: { t: 'Expired', c: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400' },
  }[match];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${map.c}`}>
      {map.t}
    </span>
  );
}

/** Numbered progress rail for the onboarding journey. */
export function StepRail({
  steps,
  current,
}: {
  steps: { label: string; done: boolean }[];
  current: number;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 mb-7 text-xs">
      {steps.map((s, i) => {
        const active = i === current;
        return (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
                active
                  ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                  : s.done
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'border-border text-neutral-400'
              }`}
            >
              {s.done ? <Check size={11} strokeWidth={3} /> : <Circle size={9} />}
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="text-neutral-300 dark:text-neutral-700">›</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Explains what part of the specification a screen demonstrates. */
export function SpecNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-border bg-neutral-50/60 dark:bg-neutral-950/30 p-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-neutral-400 mb-1.5">
        Specification note
      </div>
      <div className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{children}</div>
    </div>
  );
}

/** Read-only field display. */
export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}
