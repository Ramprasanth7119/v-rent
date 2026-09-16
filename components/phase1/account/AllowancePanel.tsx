"use client";

/**
 * The listing allowance: the one thing a V-RENT plan actually meters.
 *
 * A ring for how full it is, the two numbers that matter beside it, and one
 * bar that splits the used slots into live and paused so the agent can see
 * what is holding them. Listings that do not take a slot — drafts, listings
 * in review — are named underneath, because "why is my count lower than my
 * listings page?" is the question this panel otherwise raises.
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CountUp, Radial, cx } from '../kit';
import type { SlotUsage } from '../../../lib/phase1/account';
import { usageTone } from '../../../lib/phase1/account';

const WAITING_LABEL: Record<string, string> = {
  pending_review: 'in review',
  draft: 'draft',
  rejected: 'needs changes',
  expired: 'expired',
  suspended: 'suspended',
};

export function AllowancePanel({ usage, className = '' }: { usage: SlotUsage; className?: string }) {
  const tone = usageTone(usage.pct);
  const fill = tone === 'danger' ? 'bg-p1-danger' : tone === 'warning' ? 'bg-p1-warning' : 'bg-p1-primary';
  const paused = tone === 'danger' ? 'bg-p1-danger/45' : tone === 'warning' ? 'bg-p1-warning/45' : 'bg-p1-primary/40';
  const w = (n: number) => (usage.limit ? `${(n / usage.limit) * 100}%` : '0%');

  return (
    <Card as="section" aria-labelledby="allow-h" className={cx('vr-rise flex flex-col', className)} padding="lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="allow-h" className="text-[15px] font-semibold text-p1-text">Listing allowance</h2>
          <p className="mt-0.5 text-[12.5px] text-p1-text-3">Live and paused listings each hold a slot</p>
        </div>
        <span className={cx(
          'shrink-0 rounded-md px-2 py-1 text-[12px] font-semibold',
          tone === 'danger' ? 'bg-p1-danger-soft text-p1-danger' : tone === 'warning' ? 'bg-p1-warning-soft text-p1-warning' : 'bg-p1-success-soft text-p1-success',
        )}>
          {usage.available === 0 ? 'Full' : tone === 'warning' ? 'Nearly full' : 'Room to grow'}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <Radial
          value={usage.used}
          max={usage.limit || 1}
          size={124}
          thickness={11}
          tone={tone}
          label={<span className="font-p1display text-[26px] font-bold leading-none tabular-nums text-p1-text"><CountUp value={usage.pct} suffix="%" /></span>}
          sublabel="in use"
        />
        <dl className="grid flex-1 grid-cols-1 gap-3">
          <div>
            <dt className="text-[12px] text-p1-text-3">Used</dt>
            <dd className="font-p1display text-[24px] font-bold leading-tight tabular-nums text-p1-text">
              <CountUp value={usage.used} /><span className="ml-1 text-[14px] font-medium text-p1-text-3">/ {usage.limit}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-p1-text-3">Available</dt>
            <dd className={cx('font-p1display text-[24px] font-bold leading-tight tabular-nums', usage.available === 0 ? 'text-p1-danger' : 'text-p1-text')}>
              <CountUp value={usage.available} />
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6">
        <div
          className="flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-p1-subtle"
          role="img"
          aria-label={`${usage.published} live and ${usage.paused} paused of ${usage.limit} slots`}
        >
          {usage.published > 0 && <span className={cx('acct-fill h-full rounded-full', fill)} style={{ width: w(usage.published) }} />}
          {usage.paused > 0 && <span className={cx('acct-fill h-full rounded-full', paused)} style={{ width: w(usage.paused), animationDelay: '120ms' }} />}
        </div>
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-p1-text-2">
          <li className="flex items-center gap-1.5"><span aria-hidden className={cx('h-2 w-2 rounded-full', fill)} />{usage.published} live</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className={cx('h-2 w-2 rounded-full', paused)} />{usage.paused} paused</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full bg-p1-border-strong" />{usage.available} free</li>
        </ul>
      </div>

      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-p1-border pt-4 text-[12.5px]">
          <span className="text-p1-text-3">
            {usage.waiting.length > 0
              ? <>Not using a slot: {usage.waiting.map((x) => `${x.count} ${WAITING_LABEL[x.status] ?? x.status}`).join(' · ')}</>
              : 'Every listing in your workspace is counted above'}
          </span>
          {tone !== 'primary' && (
            <Link href="/phase1/plans" className="group inline-flex items-center gap-1 font-medium text-p1-primary hover:underline underline-offset-4">
              More slots <ArrowRight size={13} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
