"use client";

/**
 * Small pieces shared by the reports screens: the "modelled" badge, quick
 * filter pills, an identity cell, a flat funnel and a CSV helper.
 */

import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip, cx } from '../../kit';

/** A figure that is not measured says so in a word, with the reason on hover. */
export function ModelledBadge({ note }: { note: string }) {
  return (
    <Tooltip content={note}>
      <span tabIndex={0} className="inline-flex items-center gap-1 rounded-md bg-p1-warning-soft px-1.5 py-0.5 text-[11.5px] font-medium text-p1-warning">
        <Info size={11} aria-hidden /> Modelled
      </span>
    </Tooltip>
  );
}

export interface QuickOption { key: string; label: string; on: boolean; onSelect: () => void; count?: number }

/** One row of mutually-understood shortcuts. Scrolls sideways on a phone rather than wrapping into a wall. */
export function QuickFilters({ options, label }: { options: QuickOption[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="p1-noscrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={o.on}
          onClick={o.onSelect}
          className={cx(
            'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-[background-color,border-color,color] duration-150',
            o.on ? 'border-p1-text bg-p1-text text-p1-bg' : 'border-p1-border bg-p1-surface text-p1-text-2 hover:border-p1-border-strong hover:text-p1-text',
          )}
        >
          {o.label}
          {typeof o.count === 'number' && <span className={cx('tabular-nums', o.on ? 'opacity-70' : 'text-p1-text-3')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export const initialsOf = (value: string) => {
  const name = value.split('@')[0].replace(/[._-]+/g, ' ').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
};

/** An account shown as a person: initials, then the address. */
export function IdentityCell({ email, sub, tone = 'neutral' }: { email: string; sub?: React.ReactNode; tone?: 'neutral' | 'primary' }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold', tone === 'primary' ? 'bg-p1-primary-soft text-p1-primary' : 'bg-p1-subtle text-p1-text-2')}
        aria-hidden
      >
        {initialsOf(email)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] text-p1-text">{email}</span>
        {sub && <span className="block truncate text-[12px] text-p1-text-3">{sub}</span>}
      </span>
    </span>
  );
}

/** A funnel drawn flat: one bar per stage, the largest single fall marked. */
export function FlatFunnel({ stages }: { stages: { label: string; value: number }[] }) {
  const top = stages[0]?.value || 1;
  const worst = stages.reduce((acc, s, i) => {
    if (i === 0) return acc;
    const lost = stages[i - 1].value - s.value;
    return lost > acc.lost ? { i, lost } : acc;
  }, { i: -1, lost: -1 });

  return (
    <ol className="space-y-3">
      {stages.map((s, i) => {
        const pct = (s.value / top) * 100;
        const prev = i === 0 ? null : stages[i - 1].value;
        const lostPct = prev ? Math.round(((prev - s.value) / prev) * 100) : 0;
        const isWorst = i === worst.i;
        return (
          <li key={s.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-4 shrink-0 text-right text-[11.5px] tabular-nums text-p1-text-3">{i + 1}</span>
                <span className="truncate font-medium text-p1-text">{s.label}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-3 tabular-nums">
                {prev !== null && (
                  <span className={cx('text-[12px]', isWorst ? 'font-semibold text-p1-danger' : 'text-p1-text-3')}>−{lostPct}%</span>
                )}
                <span className="font-semibold text-p1-text">{s.value.toLocaleString('en-SG')}</span>
              </span>
            </div>
            <div className="ml-6 h-2 overflow-hidden rounded-full bg-p1-subtle">
              <div
                className={cx('vr-grow h-full rounded-full', isWorst ? 'bg-p1-danger' : 'bg-p1-primary')}
                style={{ width: `${pct}%`, animationDelay: `${i * 60}ms` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Download rows as a spreadsheet-safe CSV, with a byte-order mark so Excel reads the accents. */
export function downloadCsv(filename: string, head: string[], rows: (string | number)[][]) {
  const text = [head, ...rows]
    .map((row) => row.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** A labelled value inside a detail drawer. */
export function DetailRow({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-2.5 text-[13.5px]">
      <dt className="text-p1-text-3">{label}</dt>
      <dd className={cx('min-w-0 break-words text-p1-text', mono && 'font-mono text-[12.5px]')}>{children}</dd>
    </div>
  );
}
