"use client";

/**
 * The frame the three media uploads share.
 *
 * Photographs, floor plan and video are three different things with three
 * different rules, and the agent has to be able to tell at a glance which one
 * they are looking at, whether it is required, and what it will accept before
 * they go and find a file. Drawing each of them differently made the step read
 * as a pile of controls; one frame makes it read as a list of three.
 */

import type { ReactNode } from 'react';
import { cx } from '../kit';

export function MediaSection({
  icon,
  title,
  limits,
  optional = false,
  children,
  className = '',
}: {
  icon: ReactNode;
  title: string;
  /** What it accepts and how much — stated before anything is chosen. */
  limits: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('rounded-xl border border-p1-border bg-p1-surface', className)}>
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-p1-border px-4 py-3">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-p1-text">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-p1-subtle text-p1-text-2" aria-hidden>{icon}</span>
          {title}
          {/* Said rather than implied. An agent who does not know a section is
              optional will treat every one of them as a reason not to publish. */}
          <span className={cx(
            'rounded-full px-2 py-0.5 text-[11px] font-medium',
            optional ? 'bg-p1-subtle text-p1-text-3' : 'bg-p1-primary-soft text-p1-primary',
          )}>
            {optional ? 'Optional' : 'Required'}
          </span>
        </h3>
        <span className="text-[12px] text-p1-text-3">{limits}</span>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
