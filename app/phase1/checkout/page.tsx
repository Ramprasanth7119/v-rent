"use client";

/**
 * Subscription.
 *
 * For a running subscription this is the account's business view: the plan
 * and its allowance first, then what the plan is carrying — enquiries, views
 * where they are counted, and the properties holding its slots — then the
 * other plans read against that portfolio, and the payments on record.
 *
 * For a plan not yet paid for, the same plan panel sits above the checkout:
 * method, then the provider's page, then the confirmation. That flow is
 * unchanged.
 *
 * Everything is read from the workspace the Demo Data switch selects, through
 * `useDemo` and `useEnquiries`. There is no demo branch on this page: with the
 * switch ON the records are the demo account's, with it OFF the agent's own,
 * and a figure that is not counted for the agent's own is shown as not counted.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Smartphone, ShieldCheck, Lock, Info } from 'lucide-react';
import {
  Button, Card, ChoiceCard, PageHeader, Spinner, SuccessCheck, Tooltip,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { DemoBadge } from '../../../components/phase1/DemoDataSwitch';
import { NoPlanHero, PlanHero } from '../../../components/phase1/account/PlanHero';
import { AllowancePanel } from '../../../components/phase1/account/AllowancePanel';
import { AccountKPIs, EnquiryWeeks, ViewsPanel } from '../../../components/phase1/account/PlanActivity';
import { PlanListings, type PlanListing } from '../../../components/phase1/account/PlanListings';
import { PlanCompare } from '../../../components/phase1/account/PlanCompare';
import { BillingActivity } from '../../../components/phase1/account/BillingActivity';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { useSession } from '../../../lib/phase1/SessionContext';
import { useEnquiries } from '../../../lib/phase1/useEnquiries';
import { PLANS, sgd } from '../../../lib/phase1/data';
import { enquiryTime } from '../../../lib/phase1/enquiries';
import { isMeasured, listingStats, portfolioSeries } from '../../../lib/phase1/performance';
import {
  SLOT_STATUSES, billingHistory, daysUntilDate, enquiryWeeks, nextRenewal, slotUsage, termBetween, weekLabels,
} from '../../../lib/phase1/account';

type Stage = 'choose' | 'redirect' | 'waiting' | 'done';

const DAY = 86_400_000;
const DAY_LABEL = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' });

export default function CheckoutPage() {
  const router = useRouter();
  const { state, set, listingLimit, demo, openedAt } = useDemo();
  const { user } = useSession();
  const inbox = useEnquiries();
  const [method, setMethod] = useState<'PayNow' | 'Card'>('PayNow');
  const [stage, setStage] = useState<Stage>(state.subscription === 'active' ? 'done' : 'choose');
  const [justActivated, setJustActivated] = useState(false);

  const plan = state.plan;
  const now = openedAt;
  // The switch can bring in a workspace whose subscription is already running.
  const running = stage === 'done' || state.subscription === 'active';

  /* ------------------------------------------------------------ figures */

  const live = useMemo(() => state.listings.filter((l) => !l.archived), [state.listings]);
  const usage = useMemo(() => slotUsage(live, listingLimit), [live, listingLimit]);
  const billing = useMemo(() => billingHistory(state.alerts, PLANS), [state.alerts]);
  const renewal = useMemo(() => (state.subscription === 'active' || state.subscription === 'past_due' ? nextRenewal(billing) : null), [billing, state.subscription]);
  const term = useMemo(() => {
    if (!renewal) return null;
    const start = new Date(renewal);
    start.setFullYear(start.getFullYear() - 1);
    return termBetween(start, renewal, now);
  }, [renewal, now]);

  const holding = useMemo(() => live.filter((l) => SLOT_STATUSES.includes(l.status)), [live]);
  const counted = holding.some(isMeasured);

  const views = useMemo(() => {
    if (!counted) return null;
    const sixty = portfolioSeries(holding, 'views', 60);
    const series = sixty.slice(30);
    return { series, total: series.reduce((n, v) => n + v, 0), prior: sixty.slice(0, 30).reduce((n, v) => n + v, 0) };
  }, [counted, holding]);

  const enquiries = useMemo(() => {
    const t = now.getTime();
    let total = 0;
    let prior = 0;
    for (const e of inbox.enquiries) {
      const at = enquiryTime(e);
      if (at > t || Number.isNaN(at)) continue;
      if (t - at <= 30 * DAY) total += 1;
      else if (t - at <= 60 * DAY) prior += 1;
    }
    return { total, prior, weeks: enquiryWeeks(inbox.enquiries, now) };
  }, [inbox.enquiries, now]);

  const labels30 = useMemo(() => Array.from({ length: 30 }, (_, i) => DAY_LABEL.format(new Date(now.getTime() - (29 - i) * DAY))), [now]);
  const labelsWeeks = useMemo(() => weekLabels(now), [now]);

  const listingCards = useMemo<PlanListing[]>(() => {
    const perListing = new Map<string, number>();
    for (const e of inbox.enquiries) perListing.set(e.listingId, (perListing.get(e.listingId) ?? 0) + 1);
    return holding
      .map((l) => ({ l, enquiries: perListing.get(l.id) ?? 0, views30d: isMeasured(l) ? listingStats(l).views30d : null }))
      .sort((a, b) => (b.views30d ?? -1) - (a.views30d ?? -1) || b.enquiries - a.enquiries || String(b.l.publishedAt ?? '').localeCompare(String(a.l.publishedAt ?? '')))
      .slice(0, 6);
  }, [holding, inbox.enquiries]);

  const header = (
    <PageHeader
      title="Subscription"
      description="Your plan, what it is carrying, and the payments on record."
      meta={demo ? <DemoBadge title={inbox.notice ?? undefined} /> : undefined}
    />
  );

  /* ------------------------------------------------------------ no plan */

  if (!plan) {
    return (
      <div className="mx-auto max-w-[1180px] space-y-8">
        {header}
        <NoPlanHero />
        <PlanCompare plans={PLANS} current={null} used={usage.used} />
      </div>
    );
  }

  const paynowFee = plan.priceYearSgd * 0.013;
  const cardFee = plan.priceYearSgd * 0.034 + 0.5;

  const activate = () => {
    setStage('done');
    setJustActivated(true);
    set({ subscription: 'active', paymentMethod: method });
  };

  const heroRow = (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-5">
      <PlanHero
        plan={plan}
        subscription={running ? state.subscription : 'none'}
        paymentMethod={state.paymentMethod}
        renewal={renewal}
        daysToRenewal={renewal ? daysUntilDate(renewal, now) : null}
        receiptsTo={state.profile.email}
        showActions={running}
      />
      <AllowancePanel usage={usage} />
    </div>
  );

  /* ------------------------------------------------- running subscription */

  if (running) {
    return (
      <div className="mx-auto max-w-[1180px]">
        {header}

        {justActivated && (
          <Card padding="lg" className="p1-in mb-5">
            <div className="flex flex-col items-center py-2 text-center sm:flex-row sm:gap-5 sm:text-left" role="status">
              <SuccessCheck size={48} />
              <div className="mt-3 flex-1 sm:mt-0">
                <h2 className="text-[18px] font-semibold text-p1-text">Your subscription is active</h2>
                <p className="mt-0.5 text-[14px] text-p1-text-3">A receipt has been sent to {state.profile.email}.</p>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:mt-0">
                <Button onClick={() => router.push('/phase1/listings/new')}>Create a listing</Button>
                <Button variant="outline" onClick={() => router.push('/phase1/dashboard')}>Go to dashboard</Button>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-8 sm:space-y-10">
          <div className="space-y-4 lg:space-y-5">
            {heroRow}
            <AccountKPIs
              published={usage.published}
              inWorkspace={live.length}
              views={views}
              enquiries={enquiries}
              renewal={term ? { daysLeft: term.daysLeft, elapsedPct: term.elapsedPct } : null}
            />
          </div>

          <section aria-label="Activity" className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2 lg:gap-5">
            <EnquiryWeeks weeks={enquiries.weeks} labels={labelsWeeks} />
            <ViewsPanel series={views?.series ?? null} labels={labels30} />
          </section>

          <PlanListings items={listingCards} used={usage.used} ownerId={user?.id} />

          <PlanCompare plans={PLANS} current={plan} used={usage.used} />

          <BillingActivity rows={billing} paymentMethod={state.paymentMethod} receiptsTo={state.profile.email} />
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------ checkout */

  return (
    <div className="mx-auto max-w-[1180px]">
      {header}
      <div className="mb-6">{heroRow}</div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
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
          <Card as="section" aria-labelledby="order-h" className="lg:sticky lg:top-24">
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
              <span className="font-p1display text-[24px] font-bold tabular-nums tracking-[-0.02em] text-p1-text">{sgd(plan.priceYearSgd)}</span>
            </div>
            <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-5 text-p1-text-3">
              <Lock size={13} className="mt-0.5 shrink-0" aria-hidden /> Renews yearly, with a reminder 30 days before. Cancel any time.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
