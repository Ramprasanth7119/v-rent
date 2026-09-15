"use client";

/**
 * Progress navigation: the stepper used by wizards and the onboarding journey.
 *
 * Numbered "01 Address" steps on a single line. A phone gets the current step,
 * a count and a bar, because seven labels do not fit across 390px.
 */

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cx } from './primitives';

export interface Step { label: string; description?: string; href?: string; effort?: string }

export function Stepper({ steps, current, completed, className = '', compact = false, onSelect }: { steps: Step[]; current: number; completed?: (i: number) => boolean; className?: string; compact?: boolean; onSelect?: (i: number) => void }) {
  const isDone = (i: number) => (completed ? completed(i) : i < current);
  const pct = Math.round(((current + 1) / steps.length) * 100);
  return (
    <nav aria-label="Progress" className={cx('mb-5', className)}>
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-semibold text-p1-text">{steps[current]?.label}</span>
          <span className="tabular-nums text-p1-text-3">Step {current + 1} of {steps.length}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-p1-subtle" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
          <div className="h-full rounded-full bg-p1-primary transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ol className={cx('hidden items-center sm:flex', compact ? 'gap-1' : 'gap-2')}>
        {steps.map((s, i) => {
          const done = isDone(i);
          const active = i === current;
          const clickable = (s.href && done) || (onSelect && (done || i < current));
          const inner = (
            <>
              <span className={cx(
                'flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1 text-[11.5px] font-semibold tabular-nums transition-colors duration-200',
                done ? 'bg-p1-success-soft text-p1-success' : active ? 'bg-p1-primary text-p1-primary-on' : 'bg-p1-subtle text-p1-text-3',
              )}>
                {done && !active ? <Check size={12} strokeWidth={3} aria-hidden /> : String(i + 1).padStart(2, '0')}
              </span>
              <span className={cx('whitespace-nowrap text-[13px]', active ? 'font-semibold text-p1-text' : done ? 'font-medium text-p1-text-2' : 'text-p1-text-3')}>
                {s.label}
                {done && <span className="sr-only"> (completed)</span>}
                {active && <span className="sr-only"> (current step)</span>}
              </span>
            </>
          );
          return (
            <li key={s.label} className={cx('flex min-w-0 items-center', i < steps.length - 1 && 'flex-1')} aria-current={active ? 'step' : undefined}>
              {clickable && s.href ? (
                <Link href={s.href} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-p1-subtle">{inner}</Link>
              ) : clickable && onSelect ? (
                <button type="button" onClick={() => onSelect(i)} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-p1-subtle">{inner}</button>
              ) : (
                <span className="flex items-center gap-2 px-1 py-1">{inner}</span>
              )}
              {i < steps.length - 1 && (
                <span className="mx-2 h-px min-w-4 flex-1 overflow-hidden bg-p1-border" aria-hidden>
                  <span className={cx('block h-full origin-left bg-p1-success transition-transform duration-300 ease-out', done ? 'scale-x-100' : 'scale-x-0')} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
