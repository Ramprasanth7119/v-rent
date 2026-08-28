"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PageHead, SpecNote, StepRail } from '../../../components/phase1/bits';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { sgd } from '../../../lib/phase1/data';
import { Check, CreditCard, Smartphone, Loader2, ShieldCheck } from 'lucide-react';

type Stage = 'choose' | 'redirect' | 'waiting' | 'done';

export default function CheckoutPage() {
  const router = useRouter();
  const { state, set } = useDemo();
  const [method, setMethod] = useState<'PayNow' | 'Card'>('PayNow');
  const [stage, setStage] = useState<Stage>(state.subscription === 'active' ? 'done' : 'choose');

  const plan = state.plan;
  if (!plan) {
    return (
      <>
        <PageHead module="M10 · Subscription and Payments" title="Payment" />
        <Card>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No plan selected yet.{' '}
            <button onClick={() => router.push('/phase1/plans')} className="font-semibold text-brand-gold underline">
              Choose a plan
            </button>{' '}
            first.
          </p>
        </Card>
      </>
    );
  }

  const fee = method === 'PayNow' ? plan.priceYearSgd * 0.013 : plan.priceYearSgd * 0.034 + 0.5;
  const cardFee = plan.priceYearSgd * 0.034 + 0.5;
  const paynowFee = plan.priceYearSgd * 0.013;

  const activate = () => {
    setStage('done');
    set({ subscription: 'active', paymentMethod: method });
  };

  return (
    <>
      <PageHead
        module="M10 · Subscription and Payments"
        title="Payment"
        blurb="The screen the browser returns to is never what activates a subscription. Only a verified webhook does that."
      />
      <StepRail
        current={5}
        steps={[
          { label: 'Account', done: true },
          { label: 'Verify', done: true },
          { label: 'Profile', done: true },
          { label: 'Approval', done: true },
          { label: 'Plan', done: true },
          { label: 'Listings', done: state.subscription === 'active' },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          {stage === 'choose' && (
            <>
              <div className="mb-4 text-sm font-semibold text-foreground">Payment method</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['PayNow', 'Card'] as const).map((m) => {
                  const on = method === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        on ? 'border-brand-gold bg-brand-gold/5 ring-2 ring-brand-gold/20' : 'border-border hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {m === 'PayNow' ? <Smartphone size={15} className="text-brand-gold" /> : <CreditCard size={15} className="text-neutral-400" />}
                        <span className="text-sm font-medium text-foreground">{m}</span>
                        {m === 'PayNow' && (
                          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                            Cheaper
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                        {m === 'PayNow'
                          ? 'Instant bank transfer. Processing 1.3%'
                          : 'Visa, Mastercard, Amex. Processing 3.4% + S$0.50'}
                      </div>
                      <div className="mt-1.5 text-xs font-medium tabular-nums text-foreground">
                        Cost to us: {sgd(Math.round(m === 'PayNow' ? paynowFee : cardFee))}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <p className="text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                  Steering renewals to PayNow saves{' '}
                  <strong className="tabular-nums">{sgd(Math.round(cardFee - paynowFee))}</strong> per agent
                  per year on this plan. Across a few hundred agents that is a real margin line, which is
                  why PayNow is presented as a first-class choice rather than a fallback.
                </p>
              </div>

              <Button className="mt-5 w-full" variant="gold" size="lg" onClick={() => setStage('redirect')}>
                Continue to secure checkout
              </Button>
              <p className="mt-2.5 text-center text-[11px] text-neutral-500 dark:text-neutral-400">
                Card details are entered on the payment provider&apos;s hosted page and never reach our servers.
              </p>
            </>
          )}

          {stage === 'redirect' && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900">
                <ShieldCheck size={19} className="text-brand-gold" />
              </div>
              <div className="text-sm font-semibold text-foreground">Hosted checkout</div>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                In the real product the agent is now on the payment provider&apos;s page. This prototype
                stands in for that step.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="gold" onClick={() => setStage('waiting')}>Simulate successful payment</Button>
                <Button variant="outline" onClick={() => setStage('choose')}>Cancel</Button>
              </div>
            </div>
          )}

          {stage === 'waiting' && (
            <div className="py-8 text-center">
              <Loader2 size={26} className="mx-auto mb-4 animate-spin text-brand-gold" />
              <div className="text-sm font-semibold text-foreground">Confirming payment…</div>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                The browser has returned from checkout, but nothing has been granted yet. The application
                is polling its own API and waiting for the provider&apos;s signed webhook to arrive.
              </p>
              <Button className="mt-5" variant="gold" onClick={activate}>
                Deliver the verified webhook
              </Button>
              <p className="mt-2.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                This button is the point of the screen — access is granted here, not on the redirect.
              </p>
            </div>
          )}

          {stage === 'done' && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Check size={20} strokeWidth={3} />
              </div>
              <div className="text-sm font-semibold text-foreground">Subscription active</div>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                {plan.name} plan, paid by {state.paymentMethod}. Invoice issued and receipt emailed.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="gold" onClick={() => router.push('/phase1/dashboard')}>Go to dashboard</Button>
                <Button variant="outline" onClick={() => router.push('/phase1/listings/new')}>Create a listing</Button>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <Card>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Order</div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">{plan.name}, 12 months</span>
              <span className="font-semibold tabular-nums text-foreground">{sgd(plan.priceYearSgd)}</span>
            </div>
            <div className="mt-2 border-t border-border pt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
              Prices shown before GST. Invoice format depends on whether V-RENT is GST-registered —
              open question O2.
            </div>
          </Card>

          <Card>
            <div className="mb-2 text-xs font-semibold text-foreground">What the server does</div>
            <ol className="space-y-2 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              <li><span className="font-mono text-neutral-400">1.</span> Verifies the webhook signature before parsing the body</li>
              <li><span className="font-mono text-neutral-400">2.</span> Stores the raw payload, so a dispute months later has evidence</li>
              <li><span className="font-mono text-neutral-400">3.</span> Ignores replays via a unique provider event id</li>
              <li><span className="font-mono text-neutral-400">4.</span> Activates the subscription and grants entitlement</li>
              <li><span className="font-mono text-neutral-400">5.</span> Reconciles against the provider daily and alerts on divergence</li>
            </ol>
          </Card>
        </div>
      </div>

      <SpecNote>
        Webhooks arrive more than once and out of order — it is normal to be told an invoice was paid
        before being told the subscription was created. Handlers are therefore idempotent and guard on
        current state. Bugs in this module cost money in both directions, which is why it and listing
        management are the critical path.
      </SpecNote>
    </>
  );
}
