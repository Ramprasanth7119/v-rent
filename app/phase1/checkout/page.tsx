"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CreditCard, Smartphone, ShieldCheck, Lock } from 'lucide-react';
import {
  Button, LinkButton, Card, SectionCard, PageHeader, Callout, ChoiceCard, Stepper, KeyValue, PresenterNote, Spinner, EmptyState,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { sgd } from '../../../lib/phase1/data';

type Stage = 'choose' | 'redirect' | 'waiting' | 'done';

const STEPS = [
  { label: 'Create account' }, { label: 'Verify contact' }, { label: 'Professional details' },
  { label: 'CEA verification' }, { label: 'Approval' }, { label: 'Subscribe' }, { label: 'Payment' }, { label: 'Start listing' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { state, set } = useDemo();
  const [method, setMethod] = useState<'PayNow' | 'Card'>('PayNow');
  const [stage, setStage] = useState<Stage>(state.subscription === 'active' ? 'done' : 'choose');

  const completed = (i: number) => [
    true, state.emailVerified && state.mobileVerified, state.profileSubmitted, state.profileSubmitted,
    state.approval === 'approved', !!state.plan, state.subscription === 'active', false,
  ][i];

  const plan = state.plan;
  if (!plan) {
    return (
      <>
        <PageHeader eyebrow="Subscription" title="Payment" />
        <Card>
          <EmptyState title="No plan selected yet" description="Choose a plan first, then come back here to pay."
            action={<LinkButton href="/phase1/plans" variant="accent">Choose a plan</LinkButton>} />
        </Card>
      </>
    );
  }

  const paynowFee = plan.priceYearSgd * 0.013;
  const cardFee = plan.priceYearSgd * 0.034 + 0.5;

  const activate = () => {
    setStage('done');
    set({ subscription: 'active', paymentMethod: method });
  };

  return (
    <>
      <PageHeader
        eyebrow="Subscription"
        title="Payment"
        description="Pay securely on our payment provider's page. Your subscription is activated the moment the payment is confirmed."
      />
      <Stepper steps={STEPS} current={6} completed={completed} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {stage === 'choose' && (
            <SectionCard title="How would you like to pay?" description="Both options are processed by our payment provider. Card details never reach V-RENT.">
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
                <ChoiceCard
                  selected={method === 'PayNow'} onSelect={() => setMethod('PayNow')}
                  icon={<Smartphone size={20} />} title="PayNow" badge={<Pill tone="success">Recommended</Pill>}
                  description="Instant bank transfer by QR code. No card needed."
                />
                <ChoiceCard
                  selected={method === 'Card'} onSelect={() => setMethod('Card')}
                  icon={<CreditCard size={20} />} title="Credit or debit card"
                  description="Visa, Mastercard and American Express."
                />
              </div>
              <p className="mt-3 text-[13px] text-p1-text-3">
                Processing cost to V-RENT: PayNow 1.3% ({sgd(Math.round(paynowFee))}) · Card 3.4% + S$0.50 ({sgd(Math.round(cardFee))}). Your price is the same either way.
              </p>
              <Button className="mt-6" variant="accent" size="lg" block leftIcon={<Lock size={16} />} onClick={() => setStage('redirect')}>
                Continue to secure checkout
              </Button>
            </SectionCard>
          )}

          {stage === 'redirect' && (
            <Card padding="lg">
              <div className="py-6 text-center">
                <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-p1-primary-soft text-p1-primary" aria-hidden><ShieldCheck size={30} /></span>
                <h2 className="text-[20px] font-semibold text-p1-text">You are now on the payment provider&apos;s page</h2>
                <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-p1-text-2">
                  In the real product the agent completes payment here. This prototype stands in for that step.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button variant="primary" size="lg" onClick={() => setStage('waiting')}>Simulate successful payment</Button>
                  <Button variant="outline" size="lg" onClick={() => setStage('choose')}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}

          {stage === 'waiting' && (
            <Card padding="lg">
              <div className="py-6 text-center" role="status" aria-live="polite">
                <Spinner size={32} className="mx-auto mb-5 text-p1-accent" />
                <h2 className="text-[20px] font-semibold text-p1-text">Confirming your payment…</h2>
                <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-p1-text-2">
                  This usually takes a few seconds. Your subscription is activated only once the provider confirms the payment.
                </p>
                <div className="mt-6 flex flex-col items-center gap-2">
                  <Button variant="primary" size="lg" onClick={activate}>Deliver the verified webhook</Button>
                  <Pill tone="neutral">Prototype control</Pill>
                </div>
              </div>
            </Card>
          )}

          {stage === 'done' && (
            <Card padding="lg">
              <div className="py-6 text-center">
                <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-p1-success-soft text-p1-success" aria-hidden><CheckCircle2 size={32} /></span>
                <h2 className="text-[22px] font-semibold text-p1-text">Your subscription is active</h2>
                <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-p1-text-2">
                  {plan.name} plan, paid by {state.paymentMethod ?? method}. A receipt has been emailed to {state.profile.email}.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button variant="accent" size="lg" onClick={() => router.push('/phase1/dashboard')}>Go to dashboard</Button>
                  <Button variant="outline" size="lg" onClick={() => router.push('/phase1/listings/new')}>Create a listing</Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <SectionCard title="Order summary">
            <KeyValue rows={[
              { k: `${plan.name} plan`, v: '12 months' },
              { k: 'Subtotal', v: sgd(plan.priceYearSgd) },
              { k: 'GST', v: <span className="text-p1-text-3">To be confirmed</span> },
            ]} />
            <div className="mt-3 flex items-baseline justify-between border-t border-p1-border pt-3">
              <span className="text-[15px] font-semibold text-p1-text">Total today</span>
              <span className="text-[22px] font-semibold tabular-nums text-p1-text">{sgd(plan.priceYearSgd)}</span>
            </div>
            <p className="mt-3 flex items-start gap-2 text-[13px] text-p1-text-3"><Lock size={14} className="mt-0.5 shrink-0" aria-hidden /> Secure checkout. Card details are entered on the provider&apos;s page and never stored by V-RENT.</p>
          </SectionCard>
          <Callout tone="info" title="Renews automatically in 12 months">You will be reminded by email 30 days before renewal and can cancel at any time.</Callout>
        </div>
      </div>

      <PresenterNote>
        The screen the browser returns to never activates a subscription; only a verified webhook does. The server verifies the webhook signature before parsing, stores the raw payload for later disputes, ignores replays via the provider event id, then activates the subscription and grants entitlement, and reconciles against the provider daily. Webhooks arrive out of order, so handlers are idempotent. Invoice format depends on whether V-RENT is GST-registered (open question O2).
      </PresenterNote>
    </>
  );
}
