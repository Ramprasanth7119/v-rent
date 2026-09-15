"use client";

/**
 * Plans.
 *
 * The current plan and its usage first, then the three plans side by side.
 * Each entitlement is a number with its meaning one hover away, rather than a
 * sentence under every card.
 */

import { useRouter } from 'next/navigation';
import { Check, Info, Lock } from 'lucide-react';
import { Button, Callout, Card, LinkButton, Tooltip, cx } from '../../../components/phase1/kit';
import { CurrentPlanCard } from '../../../components/phase1/account/CurrentPlanCard';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { INCUMBENT_PRICING, PLANS, sgd } from '../../../lib/phase1/data';

const TERMS: Record<string, { label: string; help: string }> = {
  active_listing_limit: { label: 'Active listings', help: 'Published and paused listings count towards this. Drafts do not.' },
  images_per_listing: { label: 'Photos per listing', help: 'How many photographs one listing can carry.' },
  listing_duration_days: { label: 'Listing runs for', help: 'How long a listing stays live before it needs renewing.' },
  featured_slots: { label: 'Featured slots', help: 'Listings you can feature at no extra charge. Arrives in a later phase.' },
};

const clean = (v: string) => v.replace(/\s*\(Phase 6\)/, '');

export default function PlansPage() {
  const router = useRouter();
  const { state, set } = useDemo();
  const locked = state.approval !== 'approved';

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="vr-rise mb-5 text-[24px] font-semibold tracking-[-0.02em] text-p1-text sm:text-[28px]">Plans</h1>

      {state.plan && <CurrentPlanCard className="vr-rise mb-6" showAction={false} />}

      {locked && (
        <Callout tone="warning" compact className="mb-5"
          action={<LinkButton href="/phase1/status" variant="outline" size="sm">View status</LinkButton>}>
          Plans open once your application is approved.
        </Callout>
      )}

      <div className="vr-stagger grid gap-4 md:grid-cols-3" role="list" aria-label="Plans">
        {PLANS.map((p) => {
          const current = state.plan?.code === p.code;
          const recommended = Boolean(p.highlight);
          return (
            <Card
              key={p.code}
              role="listitem"
              padding="none"
              className={cx('relative flex flex-col transition-[border-color,box-shadow] duration-200', recommended ? 'border-p1-primary shadow-p1-md' : 'hover:border-p1-border-strong')}
            >
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold text-p1-text">{p.name}</span>
                  {current ? (
                    <span className="rounded-md bg-p1-subtle px-2 py-0.5 text-[12px] font-medium text-p1-text-2">Current</span>
                  ) : recommended ? (
                    <span className="rounded-md bg-p1-primary-soft px-2 py-0.5 text-[12px] font-medium text-p1-primary">Most agents</span>
                  ) : null}
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-p1-text">{sgd(p.priceYearSgd)}</span>
                  <span className="text-[14px] text-p1-text-3">/ year</span>
                </div>
                <div className="mt-1 text-[13px] tabular-nums text-p1-text-3">About {sgd(Math.round(p.priceYearSgd / 12))} a month</div>
              </div>

              <dl className="flex-1 divide-y divide-p1-border border-t border-p1-border">
                {p.entitlements.map((e) => {
                  const term = TERMS[e.key] ?? { label: e.label, help: e.label };
                  const none = e.value === 'None';
                  return (
                    <div key={e.key} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13.5px]">
                      <dt className="flex items-center gap-1.5 text-p1-text-2">
                        {term.label}
                        <Tooltip content={term.help}>
                          <button type="button" aria-label={`About ${term.label.toLowerCase()}`} className="flex h-5 w-5 items-center justify-center rounded-full text-p1-text-3 hover:text-p1-text">
                            <Info size={13} aria-hidden />
                          </button>
                        </Tooltip>
                      </dt>
                      <dd className={cx('font-semibold tabular-nums', none ? 'text-p1-text-3' : 'text-p1-text')}>{none ? '—' : clean(e.value)}</dd>
                    </div>
                  );
                })}
              </dl>

              <div className="border-t border-p1-border p-5">
                {current ? (
                  <Button variant="outline" block disabled leftIcon={<Check size={16} />}>Your plan</Button>
                ) : (
                  <Button
                    variant={recommended ? 'primary' : 'outline'} block disabled={locked}
                    leftIcon={locked ? <Lock size={15} /> : undefined}
                    onClick={() => { set({ plan: p }); router.push('/phase1/checkout'); }}
                  >
                    {state.plan ? `Switch to ${p.name}` : `Choose ${p.name}`}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-p1-border bg-p1-surface px-5 py-3.5 text-[13px]">
        <span className="font-medium text-p1-text-2">For comparison</span>
        {INCUMBENT_PRICING.map((c) => (
          <span key={c.name} className="text-p1-text-3">{c.name} <span className="font-semibold tabular-nums text-p1-text">{sgd(c.priceYearSgd)}</span>/yr</span>
        ))}
        <Tooltip content="Published agent package prices, verified 28 August 2026, after GST. V-RENT prices are indicative and subject to client confirmation.">
          <button type="button" className="ml-auto inline-flex items-center gap-1 text-p1-text-3 hover:text-p1-text"><Info size={13} aria-hidden /> Source</button>
        </Tooltip>
      </div>
    </div>
  );
}
