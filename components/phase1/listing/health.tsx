"use client";

/**
 * Listing Health — V-RENT's completeness signature.
 * Compact ring for rows and cards; full checklist with fixes for the detail page.
 */

import React from 'react';
import Link from 'next/link';
import { Check, Circle, ArrowRight } from 'lucide-react';
import { DemoListing } from '../../../lib/phase1/data';
import { listingHealth, HEALTH_TONE, ListingHealth } from '../../../lib/phase1/health';
import { Ring, cx } from '../kit';

const TEXT: Record<ListingHealth['tier'], string> = { strong: 'text-p1-success', good: 'text-p1-warning', weak: 'text-p1-danger' };
const LABEL: Record<ListingHealth['tier'], string> = { strong: 'Strong', good: 'Good', weak: 'Needs work' };

export function HealthRing({ listing, size = 36, showLabel = false, className = '' }: { listing: DemoListing; size?: number; showLabel?: boolean; className?: string }) {
  const h = listingHealth(listing);
  const title = h.missing.length ? `${h.score}% Listing Health · missing: ${h.missing.slice(0, 3).map((m) => m.label.toLowerCase()).join(', ')}${h.missing.length > 3 ? '…' : ''}` : `${h.score}% Listing Health · complete`;
  return (
    <span className={cx('inline-flex items-center gap-2', className)} title={title}>
      <Ring value={h.score} size={size} stroke={size > 40 ? 4 : 3} tone={HEALTH_TONE[h.tier]}>
        <span className={cx('font-semibold tabular-nums', size > 40 ? 'text-[13px]' : 'text-[10.5px]', TEXT[h.tier])}>{h.score}</span>
      </Ring>
      {showLabel && (
        <span className="min-w-0">
          <span className="block text-[13px] font-medium leading-4 text-p1-text">{h.score}% health</span>
          <span className={cx('block text-[12px] leading-4', TEXT[h.tier])}>{LABEL[h.tier]}{h.missing.length ? ` · ${h.missing.length} to fix` : ''}</span>
        </span>
      )}
      <span className="sr-only">Listing health {h.score} percent, {LABEL[h.tier]}</span>
    </span>
  );
}

/** Full checklist. `fixHref` receives the section and returns a link, so the wizard can deep-link. */
export function HealthPanel({ listing, fixHref, className = '' }: { listing: DemoListing; fixHref?: (section: string) => string; className?: string }) {
  const h = listingHealth(listing);
  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        <Ring value={h.score} size={64} stroke={5} tone={HEALTH_TONE[h.tier]}>
          <span className={cx('font-p1display text-[20px] font-medium tabular-nums', TEXT[h.tier])}>{h.score}</span>
        </Ring>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-p1-text">{h.score}% Listing Health</div>
          <div className={cx('text-[13px]', TEXT[h.tier])}>{LABEL[h.tier]}{h.missing.length ? ` · ${h.missing.length} item${h.missing.length === 1 ? '' : 's'} would lift it` : ' · nothing missing'}</div>
          <div className="mt-1 text-[12.5px] leading-5 text-p1-text-3">
            {h.missing.length
              ? 'Complete listings receive around twice the enquiries. Fix the items below, largest first.'
              : 'Everything a tenant looks for is present. Nothing is holding this listing back.'}
          </div>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-p1-border">
        {[...h.missing, ...h.items.filter((i) => i.ok)].map((i) => (
          <li key={i.key} className="flex items-center gap-3 py-2">
            <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', i.ok ? 'bg-p1-success-soft text-p1-success' : 'border border-dashed border-p1-border-strong text-p1-text-3')} aria-hidden>
              {i.ok ? <Check size={11} strokeWidth={3} /> : <Circle size={6} />}
            </span>
            <span className={cx('min-w-0 flex-1 text-[13.5px]', i.ok ? 'text-p1-text-3' : 'text-p1-text')}>
              {i.ok ? i.label : i.fix}
            </span>
            <span className="text-[12px] tabular-nums text-p1-text-3">{i.ok ? '' : `+${i.weight}`}</span>
            {!i.ok && fixHref && (
              <Link href={fixHref(i.section)} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-p1-primary hover:bg-p1-subtle dark:text-p1-info">Fix <ArrowRight size={12} aria-hidden /></Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
