"use client";

/**
 * The plan, answered at a glance: what the agent is on, what it costs, when it
 * renews and how it is paid. Nothing here needs a click to find.
 *
 * The renewal date is the last payment on record plus a year. An account with
 * no payment on record says so rather than showing a date nobody set.
 */

import Link from 'next/link';
import { ArrowRight, Check, CreditCard, Plus } from 'lucide-react';
import { CountUp } from '../kit';
import { INK_BUTTON, InkFact, InkLabel, InkPanel, InkStatus } from './InkPanel';
import type { PlanOption } from '../../../lib/phase1/data';
import type { SubscriptionStatus } from '../../../lib/phase1/workspace';
import { sgDate } from '../../../lib/phase1/format';

const STATUS: Record<SubscriptionStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  active: { label: 'Active', tone: 'success' },
  past_due: { label: 'Payment failed', tone: 'warning' },
  expired: { label: 'Expired', tone: 'danger' },
  none: { label: 'Awaiting payment', tone: 'neutral' },
};

export function PlanHero({
  plan, subscription, paymentMethod, renewal, daysToRenewal, receiptsTo, showActions = true,
}: {
  plan: PlanOption;
  subscription: SubscriptionStatus;
  paymentMethod: 'PayNow' | 'Card' | null;
  renewal: Date | null;
  daysToRenewal: number | null;
  receiptsTo: string;
  showActions?: boolean;
}) {
  const status = STATUS[subscription];
  const monthly = Math.round(plan.priceYearSgd / 12);

  return (
    <InkPanel aria-labelledby="plan-hero-h" className="vr-rise flex min-h-[300px] flex-col p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <InkLabel>Your V-RENT plan</InkLabel>
        <InkStatus tone={status.tone} icon={subscription === 'active' ? <Check size={12} strokeWidth={3} aria-hidden /> : undefined}>
          {status.label}
        </InkStatus>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h2 id="plan-hero-h" className="font-p1display text-[40px] font-bold leading-none tracking-[-0.03em] sm:text-[48px]">
            {plan.name}
          </h2>
          <p className="mt-2 text-[13px] text-white/60">{plan.entitlements.find((e) => e.key === 'active_listing_limit')?.value} live listings · 12-month term</p>
        </div>
        <div className="text-left sm:text-right">
          <div className="flex items-baseline gap-1.5 sm:justify-end">
            <span className="font-p1display text-[34px] font-bold leading-none tracking-[-0.02em]">
              <CountUp value={plan.priceYearSgd} prefix="S$" />
            </span>
            <span className="text-[14px] text-white/60">/ year</span>
          </div>
          <p className="mt-1.5 text-[13px] tabular-nums text-white/60">S${monthly} a month, billed yearly</p>
        </div>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[var(--p1-ink-line)] pt-5 sm:grid-cols-3">
        <InkFact label="Next renewal">
          {renewal ? (
            <span suppressHydrationWarning>
              {sgDate(renewal)}
              {daysToRenewal !== null && <span className="mt-0.5 block text-[12.5px] font-normal text-white/55">in {daysToRenewal} days</span>}
            </span>
          ) : <span className="font-normal text-white/55">Not on record yet</span>}
        </InkFact>
        <InkFact label="Paid by">
          {paymentMethod
            ? <span className="inline-flex items-center gap-1.5"><CreditCard size={14} aria-hidden className="text-white/60" />{paymentMethod}</span>
            : <span className="font-normal text-white/55">No method on file</span>}
        </InkFact>
        <InkFact label="Receipts to" className="col-span-2 sm:col-span-1">
          <span title={receiptsTo}>{receiptsTo || '—'}</span>
        </InkFact>
      </dl>

      {showActions && (
        <div className="mt-auto flex flex-wrap gap-2 pt-7">
          <Link href="/phase1/plans" className={INK_BUTTON.primary}>
            Change plan <ArrowRight size={15} aria-hidden />
          </Link>
          <Link href="/phase1/listings/new" className={INK_BUTTON.ghost}>
            <Plus size={15} aria-hidden /> New listing
          </Link>
        </div>
      )}
    </InkPanel>
  );
}

/** The same panel for an account that has not chosen a plan. */
export function NoPlanHero() {
  return (
    <InkPanel aria-labelledby="plan-hero-h" className="vr-rise flex min-h-[260px] flex-col p-6 sm:p-8">
      <InkLabel>Your V-RENT plan</InkLabel>
      <h2 id="plan-hero-h" className="mt-5 font-p1display text-[36px] font-bold leading-none tracking-[-0.03em] sm:text-[44px]">No plan yet</h2>
      <p className="mt-3 max-w-md text-[14.5px] leading-6 text-white/70">
        A plan sets how many listings you can keep live. Choose one to start publishing, then pay for it here.
      </p>
      <div className="mt-auto pt-7">
        <Link href="/phase1/plans" className={INK_BUTTON.primary}>Choose a plan <ArrowRight size={15} aria-hidden /></Link>
      </div>
    </InkPanel>
  );
}
