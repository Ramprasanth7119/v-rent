"use client";

import { useRouter } from 'next/navigation';
import { Check, Lock, Sparkles } from 'lucide-react';
import {
  Button, LinkButton, Card, PageHeader, Callout, Stepper, PresenterNote, cx,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { INCUMBENT_PRICING, PLANS, sgd } from '../../../lib/phase1/data';

const STEPS = [
  { label: 'Create account' }, { label: 'Verify contact' }, { label: 'Professional details' },
  { label: 'CEA verification' }, { label: 'Approval' }, { label: 'Subscribe' }, { label: 'Payment' }, { label: 'Start listing' },
];

function friendly(label: string, value: string) {
  if (label === 'Featured slots') {
    return value === 'None' ? 'No featured slots' : `${value.replace(/\s*\(Phase 6\)/, '')} featured slots — coming in a later phase`;
  }
  return `${value} ${label.toLowerCase()}`;
}

export default function PlansPage() {
  const router = useRouter();
  const { state, set } = useDemo();
  const locked = state.approval !== 'approved';

  const completed = (i: number) => [
    true,
    state.emailVerified && state.mobileVerified,
    state.profileSubmitted,
    state.profileSubmitted,
    state.approval === 'approved',
    !!state.plan,
    state.subscription === 'active',
    false,
  ][i];

  return (
    <>
      <PageHeader
        eyebrow="Subscription"
        title="Choose the plan that fits your portfolio"
        description="One flat yearly price with your listing quota included. No credits, no boosts, no surprises. Upgrade or downgrade at any time."
      />
      <Stepper steps={STEPS} current={5} completed={completed} />

      {locked && (
        <Callout tone="warning" title="Plans open once your application is approved" className="mb-6"
          action={<LinkButton href="/phase1/status" variant="outline" size="sm">View application status</LinkButton>}>
          Only verified CEA-registered agents can subscribe. Your application status shows what is outstanding.
        </Callout>
      )}

      <div className="vr-stagger grid gap-5 md:grid-cols-3" role="radiogroup" aria-label="Plans">
        {PLANS.map((p) => {
          const selected = state.plan?.code === p.code;
          const recommended = !!p.highlight;
          return (
            <Card
              key={p.code}
              padding="lg"
              className={cx('relative flex flex-col', recommended && 'border-2 border-p1-accent shadow-p1-md', selected && 'ring-2 ring-p1-accent/40')}
            >
              {recommended && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Pill tone="accent" className="h-7 px-3 text-[13px] shadow-p1-sm"><Sparkles size={13} aria-hidden /> Most agents choose this</Pill>
                </span>
              )}
              <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-p1-text-3">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-p1display text-[40px] font-medium leading-none tracking-tight text-p1-text tabular-nums">{sgd(p.priceYearSgd)}</span>
                <span className="text-[15px] text-p1-text-2">/year</span>
              </div>
              <div className="mt-1.5 text-[14px] text-p1-text-3">about {sgd(Math.round(p.priceYearSgd / 12))} a month</div>

              <ul className="mt-6 flex-1 space-y-3">
                {p.entitlements.map((e) => (
                  <li key={e.key} className="flex items-start gap-2.5 text-[14px] leading-5 text-p1-text-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-p1-success-soft text-p1-success" aria-hidden><Check size={12} strokeWidth={3} /></span>
                    <span><span className="font-semibold text-p1-text">{e.value.replace(/\s*\(Phase 6\)/, '')}</span> {friendly(e.label, e.value).replace(/^\S+\s/, '').replace(/^days\s/, '')}</span>
                  </li>
                ))}
              </ul>

              {selected ? (
                <Button className="mt-6" variant="outline" size="lg" block disabled leftIcon={<Check size={16} />}>Current plan</Button>
              ) : (
                <Button
                  className="mt-6" variant={recommended ? 'accent' : 'primary'} size="lg" block disabled={locked}
                  leftIcon={locked ? <Lock size={16} /> : undefined}
                  onClick={() => { set({ plan: p }); router.push('/phase1/checkout'); }}
                >
                  Choose {p.name}
                </Button>
              )}
              {selected && <p className="mt-2 text-center text-[13px] text-p1-text-3">You are on this plan. Choose another card to change.</p>}
            </Card>
          );
        })}
      </div>

      <Card className="mt-8" padding="lg">
        <h2 className="text-[17px] font-semibold text-p1-text">Compare with PropertyGuru</h2>
        <p className="mt-1 text-[14px] text-p1-text-2">Published agent package prices, verified 28 August 2026 (after GST).</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {INCUMBENT_PRICING.map((c) => (
            <div key={c.name} className="rounded-xl border border-p1-border bg-p1-subtle/60 p-4">
              <div className="text-[13px] font-medium text-p1-text-2">{c.name}</div>
              <div className="mt-1 text-[24px] font-semibold tabular-nums text-p1-danger">{sgd(c.priceYearSgd)}<span className="text-[13px] font-normal text-p1-text-3">/yr</span></div>
              <div className="mt-0.5 text-[13px] text-p1-text-3">{c.note}</div>
            </div>
          ))}
          <div className="rounded-xl border-2 border-p1-accent bg-p1-accent-soft/50 p-4">
            <div className="text-[13px] font-medium text-p1-text-2">V-RENT, all plans</div>
            <div className="mt-1 text-[24px] font-semibold tabular-nums text-p1-success">{sgd(PLANS[0].priceYearSgd)}–{sgd(PLANS[2].priceYearSgd)}<span className="text-[13px] font-normal text-p1-text-3">/yr</span></div>
            <div className="mt-0.5 text-[13px] text-p1-text-3">quota included, no credits</div>
          </div>
        </div>
        <p className="mt-4 text-[13px] leading-5 text-p1-text-3">
          Incumbents charge for visibility (credits, refreshes and boosted placement), not for listing management. V-RENT prices are indicative and subject to client confirmation.
        </p>
      </Card>

      <PresenterNote>
        Plan limits are stored as keyed entitlements against a plan version (for example <code>active_listing_limit = 30</code>), not as columns. Adding a plan or changing a limit is an administrative form, not a database migration. Subscriptions reference a plan version, so repricing never changes what an existing subscriber bought. Final commercial terms are open question Q5.
      </PresenterNote>
    </>
  );
}
