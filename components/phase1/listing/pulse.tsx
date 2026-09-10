"use client";

/**
 * Performance Pulse — compact enquiry trend and inline stats for a listing.
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Eye, MessageSquare, Bookmark } from 'lucide-react';
import { DemoListing } from '../../../lib/phase1/data';
import { listingStats } from '../../../lib/phase1/performance';
import { Sparkline, cx } from '../kit';

export function Pulse({ listing, className = '', showSpark = true }: { listing: DemoListing; className?: string; showSpark?: boolean }) {
  const s = listingStats(listing);
  const live = listing.status === 'published' || listing.status === 'paused' || listing.status === 'expired';
  if (!live || s.views30d === 0) return <span className={cx('text-[12.5px] text-p1-text-3', className)}>No traffic yet</span>;
  const up = s.trendPct > 0, flat = s.trendPct === 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className={cx('inline-flex items-center gap-2', className)} title={`${s.enquiries7d} enquiries in the last 7 days, ${s.trendPct > 0 ? '+' : ''}${s.trendPct}% week on week`}>
      {showSpark && <Sparkline data={s.series} width={56} height={20} tone={up ? 'success' : flat ? 'neutral' : 'danger'} fill={false} />}
      <span className={cx('inline-flex items-center gap-1 text-[12.5px] font-semibold tabular-nums', up ? 'text-p1-success' : flat ? 'text-p1-text-3' : 'text-p1-danger')}>
        <Icon size={13} aria-hidden />{s.trendPct > 0 ? '+' : ''}{s.trendPct}%
      </span>
      <span className="text-[12px] text-p1-text-3">enquiries</span>
    </span>
  );
}

export function StatsInline({ listing, className = '', period = '7d' }: { listing: DemoListing; className?: string; period?: '7d' | '30d' }) {
  const s = listingStats(listing);
  const views = period === '7d' ? s.views7d : s.views30d;
  const enq = period === '7d' ? s.enquiries7d : s.enquiries30d;
  return (
    <span className={cx('inline-flex items-center gap-3 text-[12.5px] tabular-nums text-p1-text-2', className)}>
      <span className="inline-flex items-center gap-1" title={`Views, last ${period === '7d' ? '7' : '30'} days`}><Eye size={13} className="text-p1-text-3" aria-hidden />{views}<span className="sr-only"> views</span></span>
      <span className="inline-flex items-center gap-1" title={`Enquiries, last ${period === '7d' ? '7' : '30'} days`}><MessageSquare size={13} className="text-p1-text-3" aria-hidden />{enq}<span className="sr-only"> enquiries</span></span>
      <span className="hidden items-center gap-1 sm:inline-flex" title="Saves"><Bookmark size={13} className="text-p1-text-3" aria-hidden />{s.saves}<span className="sr-only"> saves</span></span>
    </span>
  );
}
