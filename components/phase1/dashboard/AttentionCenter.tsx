"use client";

/**
 * What is waiting on the agent.
 *
 * Ordered by consequence, one row per thing rather than one row per listing,
 * and every row carries the action that clears it — the point of the panel is
 * that nothing here needs a second screen to understand. Severity is carried
 * by a coloured rail and the icon, never by colour alone: the row also says
 * what will happen if it is left.
 */

import Link from 'next/link';
import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Card, cx } from '../kit';
import { IconTile, TileTone } from './parts';

export type AttentionTone = 'danger' | 'warning' | 'info';

export interface AttentionItem {
  key: string;
  title: string;
  why: string;
  tone: AttentionTone;
  href: string;
  cta: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const RAIL: Record<AttentionTone, string> = {
  danger: 'bg-p1-danger',
  warning: 'bg-p1-warning',
  info: 'bg-p1-border-strong',
};

const TILE: Record<AttentionTone, TileTone> = { danger: 'danger', warning: 'accent', info: 'neutral' };

export function AttentionCenter({ items }: { items: AttentionItem[] }) {
  const urgent = items.filter((i) => i.tone === 'danger').length;

  return (
    <Card padding="none" as="section" aria-labelledby="attention-h" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 id="attention-h" className="text-[15px] font-semibold text-p1-text">Needs attention</h2>
        {items.length > 0 && (
          <span className="flex items-center gap-1.5">
            {urgent > 0 && (
              <span className="rounded-full bg-p1-danger-soft px-2 py-0.5 text-[11.5px] font-semibold text-p1-danger">{urgent} urgent</span>
            )}
            <span className="rounded-full bg-p1-subtle px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-p1-text-2">{items.length}</span>
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="border-t border-p1-border px-5 py-8 text-center">
          <span className="vr-pop mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-p1-success-soft text-p1-success" aria-hidden>
            <Check size={22} strokeWidth={2.5} />
          </span>
          <div className="mt-3 text-[14.5px] font-semibold text-p1-text">You&apos;re all caught up</div>
          <p className="mx-auto mt-1 max-w-[30ch] text-[13px] leading-5 text-p1-text-3">
            Everything that needed you is handled. New items appear here the moment something does.
          </p>
        </div>
      ) : (
        <ul className="vr-stagger divide-y divide-p1-border border-t border-p1-border">
          {items.map((r) => (
            <li key={r.key}>
              <Link href={r.href} className="group relative flex items-center gap-3 py-3 pl-5 pr-4 transition-colors hover:bg-p1-subtle/60">
                <span aria-hidden className={cx('absolute inset-y-1.5 left-0 w-[3px] rounded-r-full transition-opacity', RAIL[r.tone], r.tone === 'info' ? 'opacity-60' : 'opacity-100')} />
                <IconTile tone={TILE[r.tone]} size="md"><r.icon size={16} /></IconTile>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold leading-5 text-p1-text">{r.title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-[1.35] text-p1-text-3">{r.why}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 self-center text-[12.5px] font-medium text-p1-primary">
                  {r.cta}
                  <ArrowRight size={13} aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
