"use client";

/**
 * Subscription.
 *
 * The plan and its usage lead, once. Below it, either the checkout for a plan
 * that is not yet paid for — method, then the provider's page, then the
 * confirmation — or, for a subscription already running, the billing details.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Smartphone, ShieldCheck, Lock, Info } from 'lucide-react';
import {
  Button, LinkButton, Card, ChoiceCard, EmptyState, Spinner, SuccessCheck, Tooltip,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { CurrentPlanCard } from '../../../components/phase1/account/CurrentPlanCard';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { sgd } from '../../../lib/phase1/data';

type Stage = 'choose' | 'redirect' | 'waiting' | 'done';

export default function CheckoutPage() {
  const router = useRouter();
  const { state, set } = useDemo();
  const [method, setMethod] = useState<'PayNow' | 'Card'>('PayNow');
  const [stage, setStage] = useState<Stage>(state.subscription === 'active' ? 'done' : 'choose');
  const [justActivated, setJustActivated] = useState(false);

  const plan = state.plan;

  const heading = (
    <h1 className="vr-rise mb-5 text-[24px] font-semibold tracking-[-0.02em] text-p1-text sm:text-[28px]">Subscription</h1>
  );

  if (!plan) {
    return (
      <>
        {heading}
        <Card>
          <EmptyState title="No plan selected yet" description="Choose a plan, then pay for it here."
            action={<LinkButton href="/phase1/plans">Choose a plan</LinkButton>} />
        </Card>
      </>
    );
  }

  const paynowFee = plan.priceYearSgd * 0.013;
  const cardFee = plan.priceYearSgd * 0.034 + 0.5;

  const activate = () => {
    setStage('done');
    setJustActivated(true);
    set({ subscription: 'active', paymentMethod: method });
  };

  return (
    <div className="mx-auto max-w-4xl">
      {heading}
      <CurrentPlanCard className="vr-rise mb-5" showAction={stage === 'done'} />

      {stage === 'done' ? (
        justActivated ? (
          <Card padding="lg">
            <div className="flex flex-col items-center py-4 text-center" role="status">
              <SuccessCheck />
              <h2 className="mt-4 text-[20px] font-semibold text-p1-text">Your subscription is active</h2>
              <p className="mt-1 max-w-sm text-[14px] text-p1-text-3">A receipt has been sent to {state.profile.email}.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button onClick={() => router.push('/phase1/listings/new')}>Create a listing</Button>
                <Button variant="outline" onClick={() => router.push('/phase1/dashboard')}>Go to dashboard</Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card padding="none" as="section" aria-labelledby="billing-h">
            <h2 id="billing-h" className="px-5 py-4 text-[15px] font-semibold text-p1-text">Billing</h2>
            <dl className="divide-y divide-p1-border border-t border-p1-border">
              {[
                ['Amount', `${sgd(plan.priceYearSgd)} a year`],
                ['Payment method', state.paymentMethod ?? '—'],
                ['Receipts sent to', state.profile.email],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-5 py-3.5 text-[14px]">
                  <dt className="text-p1-text-3">{k}</dt>
                  <dd className="truncate font-medium text-p1-text">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {stage === 'choose' && (
              <Card padding="none" as="section" aria-labelledby="pay-h" className="p1-in">
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <h2 id="pay-h" className="text-[15px] font-semibold text-p1-text">Payment method</h2>
                  <Tooltip content={`What V-RENT pays to process it: PayNow 1.3% (${sgd(Math.round(paynowFee))}), card 3.4% + S$0.50 (${sgd(Math.round(cardFee))}). Your price is the same.`}>
                    <button type="button" className="inline-flex items-center gap-1 text-[12.5px] text-p1-text-3 hover:text-p1-text">
                      <Info size={13} aria-hidden /> Processing fees
                    </button>
                  </Tooltip>
                </div>
                <div className="border-t border-p1-border p-5">
                  <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
                    <ChoiceCard
                      selected={method === 'PayNow'} onSelect={() => setMethod('PayNow')}
                      icon={<Smartphone size={19} />} title="PayNow" badge={<Pill tone="success">Recommended</Pill>}
                      description="Bank transfer by QR code."
                    />
                    <ChoiceCard
                      selected={method === 'Card'} onSelect={() => setMethod('Card')}
                      icon={<CreditCard size={19} />} title="Card"
                      description="Visa, Mastercard, Amex."
                    />
                  </div>
                  <Button className="mt-5" size="lg" block leftIcon={<Lock size={16} />} onClick={() => setStage('redirect')}>
                    Continue to secure checkout
                  </Button>
                </div>
              </Card>
            )}

            {stage === 'redirect' && (
              <Card padding="lg" className="p1-in">
                <div className="flex flex-col items-center py-4 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-p1-primary-soft text-p1-primary" aria-hidden><ShieldCheck size={24} /></span>
                  <h2 className="mt-4 text-[18px] font-semibold text-p1-text">On the payment provider&apos;s page</h2>
                  <p className="mt-1 max-w-sm text-[14px] text-p1-text-3">In the live product payment is completed here. This prototype stands in for it.</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button onClick={() => setStage('waiting')}>Simulate successful payment</Button>
                    <Button variant="outline" onClick={() => setStage('choose')}>Cancel</Button>
                  </div>
                </div>
              </Card>
            )}

            {stage === 'waiting' && (
              <Card padding="lg" className="p1-in">
                <div className="flex flex-col items-center py-4 text-center" role="status" aria-live="polite">
                  <Spinner size={28} className="text-p1-primary" />
                  <h2 className="mt-4 text-[18px] font-semibold text-p1-text">Confirming your payment</h2>
                  <p className="mt-1 max-w-sm text-[14px] text-p1-text-3">Your subscription starts once the provider confirms it.</p>
                  <div className="mt-6 flex flex-col items-center gap-2">
                    <Button onClick={activate}>Deliver the verified webhook</Button>
                    <Pill>Prototype control</Pill>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <aside className="min-w-0">
            <Card as="section" aria-labelledby="order-h">
              <h2 id="order-h" className="text-[13px] font-medium text-p1-text-3">Order summary</h2>
              <div className="mt-3 flex items-baseline justify-between text-[14px]">
                <span className="text-p1-text-2">{plan.name}, 12 months</span>
                <span className="tabular-nums text-p1-text">{sgd(plan.priceYearSgd)}</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between text-[14px]">
                <span className="text-p1-text-2">GST</span>
                <span className="text-p1-text-3">To be confirmed</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-p1-border pt-3">
                <span className="text-[14px] font-semibold text-p1-text">Total today</span>
                <span className="text-[22px] font-semibold tabular-nums tracking-[-0.02em] text-p1-text">{sgd(plan.priceYearSgd)}</span>
              </div>
              <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-5 text-p1-text-3">
                <Lock size={13} className="mt-0.5 shrink-0" aria-hidden /> Renews yearly, with a reminder 30 days before. Cancel any time.
              </p>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
