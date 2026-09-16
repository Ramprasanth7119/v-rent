"use client";

/**
 * One thing worth knowing this week.
 *
 * The figure is set large because the figure is the point; the sentence under
 * it says what it is about and the paragraph says what to do. There is exactly
 * one insight, chosen by the data — a list of five would be a report, and a
 * report is not something anyone reads on a dashboard.
 */

import Link from 'next/link';
import React from 'react';
import { ChevronRight, Lightbulb } from 'lucide-react';
import { Card } from '../kit';
import { Insight } from '../../../lib/phase1/performance';

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Card padding="sm" as="section" aria-labelledby="insight-h" className="border-p1-accent-soft bg-p1-accent-soft/40">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-p1-accent-soft text-p1-accent-text" aria-hidden>
          <Lightbulb size={13} />
        </span>
        <h2 id="insight-h" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-p1-accent-text">Insight</h2>
      </div>

      {insight.figure ? (
        <>
          <p className="mt-3 text-[13.5px] font-medium text-p1-text">{insight.subject}</p>
          <p className="mt-1 font-p1display text-[32px] font-bold leading-none tracking-[-0.02em] text-p1-text">{insight.figure}</p>
          <p className="mt-1.5 text-[13px] text-p1-text-2">{insight.caption}</p>
        </>
      ) : (
        <p className="mt-3 text-[13.5px] font-medium leading-5 text-p1-text">{insight.headline}</p>
      )}

      <p className="mt-2.5 border-t border-p1-accent-soft pt-2.5 text-[12.5px] leading-[1.5] text-p1-text-3">{insight.detail}</p>

      {insight.href && (
        <Link href={insight.href} className="mt-2.5 inline-flex items-center gap-0.5 text-[13px] font-medium text-p1-primary hover:underline underline-offset-4">
          Take a look <ChevronRight size={13} aria-hidden />
        </Link>
      )}
    </Card>
  );
}
