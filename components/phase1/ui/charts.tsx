"use client";

/**
 * Small, dependency-free charts: sparkline, horizontal bars, ring.
 * Colours come from tokens so they hold in both themes.
 */

import React, { useId } from 'react';
import { cx } from './primitives';

export function Sparkline({ data, width = 120, height = 32, className = '', tone = 'primary', fill = true, label }: { data: number[]; width?: number; height?: number; className?: string; tone?: 'primary' | 'success' | 'danger' | 'neutral' | 'accent'; fill?: boolean; label?: string }) {
  const id = useId();
  const max = Math.max(1, ...data);
  const min = Math.min(...data);
  const range = Math.max(1, max - min);
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const pts = data.map((v, i) => [i * step, height - 2 - ((v - min) / range) * (height - 4)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const stroke = { primary: 'var(--p1-primary)', success: 'var(--p1-success)', danger: 'var(--p1-danger)', neutral: 'var(--p1-text-3)', accent: 'var(--p1-accent)' }[tone];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cx('shrink-0 overflow-visible', className)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && pts.length > 1 && <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />}
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.25" fill={stroke} />}
    </svg>
  );
}

/** Vertical mini bar chart for daily series. */
export function MiniBars({ data, height = 48, className = '', label, highlightLast = 7 }: { data: number[]; height?: number; className?: string; label?: string; highlightLast?: number }) {
  const max = Math.max(1, ...data);
  return (
    <div className={cx('flex items-end gap-[3px]', className)} style={{ height }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {data.map((v, i) => (
        <span key={i} className={cx('flex-1 rounded-sm', i >= data.length - highlightLast ? 'bg-p1-primary dark:bg-p1-info' : 'bg-p1-border-strong')} style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
      ))}
    </div>
  );
}

export function HBars({ rows, className = '', tone = 'primary', valueLabel = (n: number) => String(n) }: { rows: { label: string; value: number; hint?: string }[]; className?: string; tone?: 'primary' | 'accent'; valueLabel?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className={cx('space-y-2.5', className)}>
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[13px]">
          <span className="truncate text-p1-text-2">{r.label}{r.hint && <span className="ml-1.5 text-p1-text-3">{r.hint}</span>}</span>
          <span className="font-semibold tabular-nums text-p1-text">{valueLabel(r.value)}</span>
          <span className="col-span-2 h-2 overflow-hidden rounded-full bg-p1-subtle" aria-hidden>
            <span className={cx('block h-full rounded-full', tone === 'accent' ? 'bg-p1-accent' : 'bg-p1-primary dark:bg-p1-info')} style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Ring gauge used for Listing Health. */
export function Ring({ value, size = 44, stroke = 4, tone = 'success', className = '', children }: { value: number; size?: number; stroke?: number; tone?: 'success' | 'warning' | 'danger' | 'primary'; className?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  const color = { success: 'var(--p1-success)', warning: 'var(--p1-warning)', danger: 'var(--p1-danger)', primary: 'var(--p1-primary)' }[tone];
  return (
    <span className={cx('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--p1-subtle)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  );
}
