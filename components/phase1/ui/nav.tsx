"use client";

/**
 * Progress navigation: the stepper used by wizards and the onboarding journey.
 */

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cx } from './primitives';
import { ProgressBar } from './surface';

export interface Step { label: string; description?: string; href?: string; effort?: string }

export function Stepper({ steps, current, completed, className = '', compact = false, onSelect }: { steps: Step[]; current: number; completed?: (i: number) => boolean; className?: string; compact?: boolean; onSelect?: (i: number) => void }) {
  const isDone = (i: number) => (completed ? completed(i) : i < current);
  return (
    <nav aria-label="Progress" className={cx('mb-5', className)}>
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-semibold text-p1-text">Step {current + 1} of {steps.length} · {steps[current]?.label}</span>
          {steps[current + 1] && <span className="text-p1-text-3">Next: {steps[current + 1].label}</span>}
        </div>
        <ProgressBar value={((current + 1) / steps.length) * 100} size="sm" className="mt-2" />
      </div>
      <ol className={cx('hidden sm:flex sm:items-start', compact && 'gap-1')}>
        {steps.map((s, i) => {
          const done = isDone(i);
          const active = i === current;
          const clickable = (s.href && done) || (onSelect && (done || i < current));
          const inner = (
            <>
              <span className={cx('flex shrink-0 items-center justify-center rounded-full border-2 font-semibold transition-colors', compact ? 'h-6 w-6 text-[11px]' : 'h-7 w-7 text-[12px]',
                done ? 'border-p1-success bg-p1-success text-white' : active ? 'border-p1-primary bg-p1-primary text-white dark:border-p1-accent dark:bg-p1-accent dark:text-p1-accent-on' : 'border-p1-border-strong bg-p1-surface text-p1-text-3')}>
                {done ? <Check size={13} strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cx('block truncate leading-5', compact ? 'text-[12.5px]' : 'text-[13.5px]', active ? 'font-semibold text-p1-text' : done ? 'font-medium text-p1-text-2' : 'text-p1-text-3')}>
                  {s.label}
                  {done && <span className="sr-only"> (completed)</span>}
                  {active && <span className="sr-only"> (current step)</span>}
                </span>
                {!compact && s.description && <span className="hidden text-[12px] text-p1-text-3 lg:block">{s.description}</span>}
              </span>
            </>
          );
          return (
            <li key={s.label} className="flex min-w-0 items-start gap-2 sm:flex-1" aria-current={active ? 'step' : undefined}>
              {clickable && s.href ? (
                <Link href={s.href} className="flex min-w-0 items-center gap-2.5 rounded-lg hover:underline underline-offset-4">{inner}</Link>
              ) : clickable && onSelect ? (
                <button type="button" onClick={() => onSelect(i)} className="flex min-w-0 items-center gap-2.5 rounded-lg text-left hover:underline underline-offset-4 cursor-pointer">{inner}</button>
              ) : (
                <span className="flex min-w-0 items-center gap-2.5">{inner}</span>
              )}
              {i < steps.length - 1 && <span className={cx('mx-2 hidden h-0.5 flex-1 rounded-full sm:block', compact ? 'mt-3' : 'mt-3.5', done ? 'bg-p1-success' : 'bg-p1-border')} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
