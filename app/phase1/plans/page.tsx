"use client";

import { useRouter } from 'next/navigation';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PageHead, SpecNote, StepRail } from '../../../components/phase1/bits';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { INCUMBENT_PRICING, PLANS, sgd } from '../../../lib/phase1/data';
import { Check, Lock } from 'lucide-react';

export default function PlansPage() {
  const router = useRouter();
  const { state, set } = useDemo();
  const locked = state.approval !== 'approved';

  return (
    <>
      <PageHead
        module="M9 · Plans and Entitlements"
        title="Choose a plan"
        blurb="Plan names, prices and limits below are placeholders. They demonstrate the mechanism — final commercial terms are open question Q5."
      />
      <StepRail
        current={4}
        steps={[
          { label: 'Account', done: true },
          { label: 'Verify', done: true },
          { label: 'Profile', done: true },
          { label: 'Approval', done: state.approval === 'approved' },
          { label: 'Plan', done: !!state.plan },
          { label: 'Listings', done: false },
        ]}
      />

      {locked && (
        <Card className="mb-5 border-amber-300/60 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <Lock size={15} className="flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-neutral-700 dark:text-neutral-300">
              Subscription is only offered to approved agents. Approve the application first on the{' '}
              <button onClick={() => router.push('/phase1/status')} className="font-semibold text-brand-gold underline">
                application status
              </button>{' '}
              screen.
            </p>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const selected = state.plan?.code === p.code;
          return (
            <Card
              key={p.code}
              className={`relative flex flex-col ${
                selected ? 'border-brand-gold ring-2 ring-brand-gold/20' : ''
              } ${p.highlight && !selected ? 'border-brand-navy/30' : ''}`}
            >
              {p.highlight && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-brand-navy px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {p.highlight}
                </span>
              )}
              <div className="text-sm font-semibold text-foreground">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {sgd(p.priceYearSgd)}
                </span>
                <span className="text-xs text-neutral-500">/year</span>
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                about {sgd(Math.round(p.priceYearSgd / 12))} a month
              </div>

              <ul className="mt-4 flex-1 space-y-2.5">
                {p.entitlements.map((e) => (
                  <li key={e.key} className="flex items-start gap-2 text-xs">
                    <Check size={13} className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-neutral-600 dark:text-neutral-400">
                      <span className="font-medium text-foreground">{e.value}</span> — {e.label}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-md bg-neutral-100 px-2.5 py-2 dark:bg-neutral-900">
                <div className="font-mono text-[10px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {p.entitlements.map((e) => (
                    <div key={e.key}>
                      {e.key} = {e.value}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="mt-4"
                variant={selected ? 'outline' : 'gold'}
                disabled={locked}
                onClick={() => {
                  set({ plan: p });
                  router.push('/phase1/checkout');
                }}
              >
                {selected ? 'Selected' : 'Choose ' + p.name}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <div className="mb-3 text-sm font-semibold text-foreground">For comparison</div>
        <div className="space-y-2">
          {INCUMBENT_PRICING.map((p) => (
            <div key={p.name} className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">
                {p.name} <span className="text-xs text-neutral-400">— {p.note}</span>
              </span>
              <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                {sgd(p.priceYearSgd)}/yr
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          Verified 28 August 2026. Note that neither incumbent charges for listing management itself —
          they charge for visibility through credits, refreshes and promoted placement. Our position is
          a flat price with quota included.
        </p>
      </Card>

      <SpecNote>
        Entitlements are stored as keyed rows against a plan version, not as columns. Adding a plan or
        changing a limit is an administrative form, not a database migration — which is what makes the
        unanswered commercial questions safe to defer. Subscriptions reference a plan <em>version</em>,
        so repricing never retroactively changes what an existing subscriber bought.
      </SpecNote>
    </>
  );
}
