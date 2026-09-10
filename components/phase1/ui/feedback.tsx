"use client";

/**
 * Empty, error and loading states. Each explains what is empty, why, and what to do next.
 */

import React from 'react';
import { Inbox, AlertCircle } from 'lucide-react';
import { cx, Button } from './primitives';

export function EmptyState({ icon, title, description, action, compact = false, className = '' }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; compact?: boolean; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center text-center', compact ? 'py-4' : 'py-12 sm:py-14', className)}>
      <span className={cx('flex items-center justify-center rounded-xl bg-p1-subtle text-p1-text-3', compact ? 'h-10 w-10' : 'h-14 w-14')} aria-hidden>{icon ?? <Inbox size={compact ? 18 : 24} />}</span>
      <h3 className={cx('font-semibold text-p1-text', compact ? 'mt-3 text-[14.5px]' : 'mt-4 text-[17px]')}>{title}</h3>
      {description && <p className="mt-1 max-w-md text-[13.5px] leading-6 text-p1-text-2">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something didn't work", description, retry, className = '' }: { title?: string; description?: React.ReactNode; retry?: () => void; className?: string }) {
  return (
    <EmptyState className={className} icon={<AlertCircle size={24} className="text-p1-danger" />} title={title}
      description={description ?? 'Your information is still here. Please try again in a moment.'}
      action={retry && <Button variant="outline" onClick={retry}>Try again</Button>} />
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cx('p1-skeleton', className)} aria-hidden />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-p1-border bg-p1-surface p-5">
      <Skeleton className="h-3.5 w-1/3" />
      <Skeleton className="mt-3 h-7 w-1/2" />
      <Skeleton className="mt-3 h-3 w-2/3" />
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
      <Skeleton className="mb-2 h-3 w-24" />
      <Skeleton className="mb-6 h-8 w-64" />
      {metrics > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-p1-border bg-p1-border lg:grid-cols-4">
          {Array.from({ length: metrics }).map((_, i) => <div key={i} className="bg-p1-surface p-4"><Skeleton className="h-3 w-20" /><Skeleton className="mt-3 h-7 w-16" /></div>)}
        </div>
      )}
      {table && <SkeletonTable />}
    </div>
  );
}
