"use client";

/**
 * The plan the agent is on, and how much of it is used. Shown once, at the top
 * of the subscription screens, so the plan name and the quota are never
 * repeated further down the page.
 */

import { CreditCard } from 'lucide-react';
import { Card, LinkButton, cx } from '../kit';
import { StatusBadge } from '../status';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { sgd } from '../../../lib/phase1/data';

export function CurrentPlanCard({ className = '', showAction = true }: { className?: string; showAction?: boolean }) {
  const { state, activeListings, listingLimit } = useDemo();
  const plan = state.plan;
  const pct = listingLimit ? Math.min(100, Math.round((activeListings / listingLimit) * 100)) : 0;
  const left = Math.max(0, listingLimit - activeListings);

  if (!plan) {
    return (
      <Card className={cx('flex flex-wrap items-center justify-between gap-4', className)}>
        <div>
          <div className="text-[13px] font-medium text-p1-text-3">Current plan</div>
          <div className="mt-1 text-[18px] font-semibold text-p1-text">No plan yet</div>
          <p className="mt-0.5 text-[13.5px] text-p1-text-3">Choose a plan to start publishing listings.</p>
        </div>
        {showAction && <LinkButton href="/phase1/plans">Choose a plan</LinkButton>}
      </Card>
    );
  }

  return (
    <Card padding="none" className={className}>
      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-center sm:gap-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] font-medium text-p1-text-3">
            Current plan <StatusBadge kind="subscription" value={state.subscription} size="sm" />
          </div>
          <div className="mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.02em] text-p1-text">{plan.name}</div>
          <div className="mt-1.5 text-[13px] tabular-nums text-p1-text-3">{sgd(plan.priceYearSgd)} a year</div>
        </div>

        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13.5px] text-p1-text-2">
              <span className="font-semibold tabular-nums text-p1-text">{activeListings}</span> of {listingLimit} listings live
            </span>
            <span className={cx('text-[13px] font-medium tabular-nums', left === 0 ? 'text-p1-danger' : 'text-p1-text-3')}>
              {left === 0 ? 'No slots left' : `${left} ${left === 1 ? 'slot' : 'slots'} remaining`}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-p1-subtle" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Listing slots used">
            <div className={cx('vr-grow h-full rounded-full', pct >= 100 ? 'bg-p1-danger' : pct >= 80 ? 'bg-p1-warning' : 'bg-p1-primary')} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[12.5px] text-p1-text-3">
            <CreditCard size={13} aria-hidden />
            {state.paymentMethod ? `Paid by ${state.paymentMethod} · renews yearly` : 'No payment method on file'}
          </div>
        </div>

        {showAction && (
          <LinkButton href="/phase1/plans" variant={pct >= 80 ? 'primary' : 'outline'} className="sm:justify-self-end">
            {pct >= 80 ? 'Upgrade' : 'Change plan'}
          </LinkButton>
        )}
      </div>
    </Card>
  );
}
