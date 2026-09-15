"use client";

/**
 * Empty, error and loading states. Each says what is empty or what went wrong,
 * and what to do next — in two short lines, not a paragraph.
 */

import React from 'react';
import { Inbox, CloudOff } from 'lucide-react';
import { cx, Button } from './primitives';

export function EmptyState({ icon, title, description, action, compact = false, className = '' }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; compact?: boolean; className?: string }) {
  return (
    <div className={cx('p1-in flex flex-col items-center text-center', compact ? 'px-4 py-6' : 'px-6 py-12 sm:py-16', className)}>
      <span className={cx('flex items-center justify-center rounded-xl border border-p1-border bg-p1-subtle text-p1-text-3', compact ? 'h-10 w-10' : 'h-12 w-12')} aria-hidden>{icon ?? <Inbox size={compact ? 18 : 22} />}</span>
      <h3 className={cx('font-semibold text-p1-text', compact ? 'mt-3 text-[14px]' : 'mt-4 text-[16px]')}>{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13.5px] leading-5 text-p1-text-3">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** What happened, and what the person can do about it. Never just "something went wrong". */
export function ErrorState({
  title = "We couldn't load this", description, retry, className = '', compact = false,
}: { title?: string; description?: React.ReactNode; retry?: () => void; className?: string; compact?: boolean }) {
  return (
    <EmptyState compact={compact} className={className} icon={<CloudOff size={compact ? 18 : 22} className="text-p1-danger" />} title={title}
      description={description ?? 'Check your connection and try again. Nothing you entered has been lost.'}
      action={retry && <Button variant="outline" size="sm" onClick={retry}>Try again</Button>} />
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cx('p1-skeleton', className)} aria-hidden />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-p1-border bg-p1-surface p-5" aria-hidden>
      <Skeleton className="h-3.5 w-1/3" />
      <Skeleton className="mt-3 h-7 w-1/2" />
      <Skeleton className="mt-3 h-3 w-2/3" />
    </div>
  );
}

/** Property-card shaped: image, price, facts, address. */
export function SkeletonPropertyCard({ className = '' }: { className?: string }) {
  return (
    <div className={cx('overflow-hidden rounded-2xl border border-p1-border bg-p1-surface', className)} aria-hidden>
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="mt-2.5 h-3.5 w-3/5" />
        <Skeleton className="mt-4 h-3.5 w-4/5" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
    </div>
  );
}

/** Table-shaped skeleton: header line and N rows of varied widths. */
export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-p1-border bg-p1-surface" aria-hidden>
      <div className="flex gap-6 border-b border-p1-border bg-p1-subtle/60 px-4 py-3">
        <Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-20" /><Skeleton className="ml-auto h-3 w-14" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-p1-border px-4 py-3 last:border-b-0">
          <Skeleton className="h-10 w-14 rounded-md" />
          <div className="flex-1"><Skeleton className="h-3.5 w-2/5" /><Skeleton className="mt-2 h-3 w-3/5" /></div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

/** Page-shaped skeleton used as a Suspense fallback. */
export function SkeletonPage({ metrics = 4, table = true }: { metrics?: number; table?: boolean }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-6 h-8 w-56" />
      {metrics > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: metrics }).map((_, i) => <div key={i} className="rounded-xl border border-p1-border bg-p1-surface p-4"><Skeleton className="h-3 w-20" /><Skeleton className="mt-3 h-7 w-16" /></div>)}
        </div>
      )}
      {table && <SkeletonTable />}
    </div>
  );
}
