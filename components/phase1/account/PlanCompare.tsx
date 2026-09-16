"use client";

/**
 * The three plans side by side, read against the agent's own portfolio.
 *
 * No "most popular" ribbons and no struck-through prices: each plan is its
 * price, its allowance and what a change would mean for the listings the agent
 * already has live. A plan that would not hold the current portfolio says so.
 */

import Link from 'next/link';
import { ArrowRight, Check, TriangleAlert } from 'lucide-react';
import { Card, SectionHead, cx } from '../kit';
import type { PlanOption } from '../../../lib/phase1/data';
import { sgd } from '../../../lib/phase1/data';

const limitOf = (p: PlanOption) => Number(p.entitlements.find((e) => e.key === 'active_listing_limit')?.value ?? 0);
const value = (p: PlanOption, key: string) => p.entitlements.find((e) => e.key === key)?.value ?? '—';

const ROWS: { key: string; label: string }[] = [
  { key: 'active_listing_limit', label: 'Live listings' },
  { key: 'images_per_listing', label: 'Photos per listing' },
  { key: 'listing_duration_days', label: 'Listing runs for' },
];

export function PlanCompare({ plans, current, used }: { plans: PlanOption[]; current: PlanOption | null; used: number }) {
  const currentLimit = current ? limitOf(current) : 0;

  return (
    <section aria-labelledby="compare-h">
      <SectionHead id="compare-h" title="Compare plans" hint="Every plan is billed yearly. GST is confirmed at checkout." />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
        {plans.map((p, i) => {
          const mine = current?.code === p.code;
          const limit = limitOf(p);
          const diff = limit - currentLimit;
          const tooSmall = limit < used;
          return (
            <li key={p.code} className={cx('vr-rise w-[82%] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none', mine && 'order-first md:order-none')} style={{ animationDelay: `${i * 60}ms` }}>
              <Card
                as="article"
                padding="none"
                aria-current={mine ? 'true' : undefined}
                className={cx(
                  'flex h-full flex-col transition-[box-shadow,border-color] duration-200',
                  mine ? 'border-p1-primary shadow-p1-md ring-1 ring-p1-primary' : 'hover:border-p1-border-strong hover:shadow-p1-md',
                )}
              >
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-p1display text-[18px] font-semibold text-p1-text">{p.name}</h3>
                    {mine && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-p1-primary-soft px-2.5 py-0.5 text-[12px] font-semibold text-p1-primary">
                        <Check size={12} strokeWidth={3} aria-hidden /> Your plan
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-p1display text-[30px] font-bold leading-none tracking-[-0.02em] tabular-nums text-p1-text">{sgd(p.priceYearSgd)}</span>
                    <span className="text-[13px] text-p1-text-3">/ year</span>
                  </div>
                  <p className="mt-1 text-[12.5px] tabular-nums text-p1-text-3">{sgd(Math.round(p.priceYearSgd / 12))} a month equivalent</p>
                </div>

                <dl className="border-y border-p1-border">
                  {ROWS.map((r) => (
                    <div key={r.key} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13.5px] [&+&]:border-t [&+&]:border-p1-border">
                      <dt className="text-p1-text-3">{r.label}</dt>
                      <dd className="font-semibold tabular-nums text-p1-text">{value(p, r.key)}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-auto flex flex-col gap-3 p-5">
                  {!mine && current && (
                    <p className={cx('flex items-start gap-1.5 text-[12.5px] leading-5', tooSmall ? 'text-p1-warning' : 'text-p1-text-2')}>
                      {tooSmall
                        ? <><TriangleAlert size={14} aria-hidden className="mt-0.5 shrink-0" />Holds {limit}; you have {used} using slots now.</>
                        : diff > 0
                          ? <>{diff} more live listings than {current.name}.</>
                          : <>{Math.abs(diff)} fewer live listings than {current.name} — room for your {used}.</>}
                    </p>
                  )}
                  {mine ? (
                    <span className="inline-flex h-10 items-center justify-center rounded-lg bg-p1-subtle text-[14px] font-medium text-p1-text-3">Current plan</span>
                  ) : (
                    <Link
                      href="/phase1/plans"
                      className={cx(
                        'group inline-flex h-10 items-center justify-center gap-2 rounded-lg text-[14px] font-medium transition-colors',
                        diff > 0 || !current ? 'bg-p1-primary text-p1-primary-on hover:bg-p1-primary-hover' : 'border border-p1-border-strong bg-p1-surface text-p1-text hover:bg-p1-subtle',
                      )}
                    >
                      {current ? `Change to ${p.name}` : `Choose ${p.name}`}
                      <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
