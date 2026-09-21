"use client";

/**
 * Agent payment.
 *
 * Two things are sold here, on the same rails and through the same states: a
 * year of the product, and a pack of reveal credit. One screen rather than two,
 * because the hard parts — a QR that expires, a hosted page that redirects back,
 * a poll that has to survive the agent switching to their banking app — are the
 * same either way, and a second copy of them would be a second set of bugs.
 * Which one is being bought comes from `?buy=`, and changes only the wording
 * and the amount.
 *
 * Three rails behind one screen:
 *   PayNow    a dynamic QR against V-RENT's own UEN — cheapest, instant, no chargebacks
 *   Razorpay  hosted Payment Link for cards — V-RENT stays the merchant
 *   Dodo      hosted checkout, merchant of record — Dodo owns the tax and the risk
 *
 * The browser never decides that a payment succeeded. It opens an intent, shows
 * the QR or hands off to the hosted page, then polls; only a signed webhook on
 * the server moves the payment to paid.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowUpRight, Building2, CheckCircle2, CreditCard, Globe2, Lock, QrCode,
  RefreshCw, ShieldCheck, Smartphone, Sparkles, XCircle } from 'lucide-react';
import {
  Button, LinkButton, Card, SectionCard, PageHeader, Callout, ChoiceCard,
  KeyValue, Spinner, EmptyState, cx } from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { useToast } from '../../../components/phase1/Toast';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { PLANS } from '../../../lib/phase1/data';
import { creditPackByCode, namesIn } from '../../../lib/phase1/credits';
import { formatSgd, isSettled, usePayment, usePaymentStatus, type PublicIntent } from '../../../lib/payments/client';
import type { ProviderId } from '../../../lib/payments/types';

interface MethodCard {
  id: ProviderId;
  title: string;
  description: string;
  icon: React.ReactNode;
  costLine: string;
  badge?: React.ReactNode;
}

const METHODS: MethodCard[] = [
  {
    id: 'paynow',
    title: 'PayNow',
    description: 'Scan the QR in any Singapore banking app. Money arrives in seconds.',
    icon: <Smartphone size={20} />,
    costLine: '0.60% + S$0.30 to V-RENT',
    badge: <Pill tone="success">Cheapest</Pill>,
  },
  {
    id: 'razorpay',
    title: 'Card — Razorpay',
    description: 'Visa, Mastercard, AMEX and Apple Pay on Razorpay Singapore.',
    icon: <CreditCard size={20} />,
    costLine: '2.90% + S$0.40 to V-RENT',
  },
  {
    id: 'dodo',
    title: 'Card — Dodo',
    description: 'Merchant of record. Dodo invoices the agent and handles the tax.',
    icon: <Globe2 size={20} />,
    costLine: 'about 6% + S$0.55 to V-RENT',
    badge: <Pill tone="neutral">Tax handled</Pill>,
  },
];

function Countdown({ expiresAt }: { expiresAt: number }) {
  const [left, setLeft] = useState(() => Math.max(0, expiresAt - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, expiresAt - Date.now())), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <span className="tabular-nums">
      {m}:{String(s).padStart(2, '0')}
    </span>
  );
}

function PaymentScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { state, set, demo } = useDemo();
  const { push } = useToast();

  const plan = state.plan ?? PLANS[1];

  /**
   * What is being bought.
   *
   * A pack code in the address means credit; anything else means the plan the
   * account is on. Only the code travels — the price is looked up again on the
   * server, from the same catalogue, and the number shown here is checked
   * against the one the intent comes back with.
   */
  const buying = params.get('buy') ?? '';
  /* Memoised so the callbacks below depend on one stable object rather than on
     three values derived from it, which is also what lets the compiler keep
     their memoisation. */
  const pack = useMemo(() => creditPackByCode(buying), [buying]);
  const buyingCredit = pack !== null;
  const priceCents = pack ? pack.priceCents : Math.round(plan.priceYearSgd * 100);

  // Razorpay caps PayNow at S$2,000 per customer per day. Hide the option on a
  // plan above that rather than let the agent hit the ceiling at the bank.
  const paynowAllowed = priceCents <= 200_000;

  const [method, setMethod] = useState<ProviderId>(paynowAllowed ? 'paynow' : 'razorpay');
  const { intent, setIntent, start, reset, starting, error } = usePayment();

  /**
   * Coming back from a hosted checkout, the provider appends ?ref=. The result
   * is never trusted from the URL — the ref only tells us which payment to poll.
   */
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (!ref) return;
    fetch(`/api/payments/intents/${encodeURIComponent(ref)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PublicIntent | null) => {
        if (data) {
          setIntent(data);
          setMethod(data.provider);
        }
      })
      .catch(() => undefined);
  }, [setIntent]);

  const onSettled = useCallback(
    (settledIntent: PublicIntent) => {
      setIntent(settledIntent);
      if (settledIntent.status === 'paid') {
        /* Credit is added by the server on the verified webhook, so there is
           nothing to switch on here — the balance is already higher than this
           page knows. A plan is the one that changes the account on screen. */
        if (!pack) {
          set({ subscription: 'active', paymentMethod: settledIntent.provider === 'paynow' ? 'PayNow' : 'Card' });
        }
        push({
          tone: 'success',
          title: 'Payment confirmed',
          body: pack ? `${pack.name} added to your balance.` : `${plan.name} plan is active.`,
        });
      } else if (settledIntent.status === 'expired') {
        push({ tone: 'warn', title: 'The QR expired', body: 'Start a new payment to get a fresh code.' });
      } else if (settledIntent.status === 'failed') {
        push({ tone: 'error', title: 'Payment failed', body: settledIntent.failureReason ?? 'The provider declined it.' });
      }
    },
    [pack, plan.name, push, set, setIntent],
  );

  const pollRef = intent && !isSettled(intent.status) ? intent.ref : null;
  const { polling } = usePaymentStatus(pollRef, onSettled);

  const begin = useCallback(async () => {
    /* Demo data is somebody else's portfolio shown on this account's screen.
       Nothing is charged and no provider is called: the result is drawn so the
       flow can be walked through, and said to be drawn. */
    if (demo) {
      if (pack) {
        /* The balance is the account's own and is not part of the demo
           portfolio, so there is nothing here to move. Saying so is better
           than showing a number that would be gone on the next screen. */
        push({
          tone: 'info',
          title: 'Demo payment — nothing was charged',
          body: 'Reveal credit is bought on your own account. Turn Demo data off to buy it.',
        });
      } else {
        set({ subscription: 'active', paymentMethod: method === 'paynow' ? 'PayNow' : 'Card' });
        push({ tone: 'info', title: 'Demo payment — nothing was charged', body: 'Turn Demo data off to pay for your own plan.' });
      }
      return;
    }
    const created = await start({ provider: method, planCode: pack ? pack.code : plan.code });
    // A hosted provider hands back a URL. PayNow hands back a QR and stays here.
    if (created?.redirectUrl) window.location.href = created.redirectUrl;
  }, [demo, method, pack, plan.code, push, set, start]);

  const feeLine = useMemo(() => METHODS.find((m) => m.id === method)?.costLine ?? '', [method]);

  const paid = intent?.status === 'paid';
  const awaiting = intent?.status === 'awaiting_payment';
  const failedish = intent && ['failed', 'expired', 'cancelled'].includes(intent.status);

  return (
    <>
      <PageHeader
        eyebrow={buyingCredit ? 'Reveal credit' : 'Subscription'}
        title={pack ? `Buy ${pack.name}` : 'Pay for your plan'}
        description={
          pack
            ? `${formatSgd(pack.priceCents)} for ${namesIn(pack)} names behind the agents who have opened your listings. Credit does not expire, and a name you have already revealed is never charged again.`
            : 'Choose how you would like to pay. Your price is the same on every method — the difference is what it costs V-RENT to collect.'
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {!intent && (
            <SectionCard
              title="How would you like to pay?"
              description="Card details are entered on the provider's own page and never reach V-RENT."
            >
              <div className="grid gap-3" role="radiogroup" aria-label="Payment method">
                {METHODS.map((m) => {
                  const blocked = m.id === 'paynow' && !paynowAllowed;
                  return (
                    <ChoiceCard
                      key={m.id}
                      selected={method === m.id}
                      onSelect={() => setMethod(m.id)}
                      disabled={blocked}
                      icon={m.icon}
                      title={m.title}
                      badge={blocked ? <Pill tone="neutral">Over the daily limit</Pill> : m.badge}
                      description={
                        <>
                          {blocked
                            ? 'PayNow allows S$2,000 per person per day, less than this costs.'
                            : m.description}
                          <span className="mt-1 block text-p1-text-3">{m.costLine}</span>
                        </>
                      }
                    />
                  );
                })}
              </div>

              {error && (
                <Callout tone="danger" title="That did not go through" className="mt-4">
                  {error}
                </Callout>
              )}

              <Button
                className="mt-6"
                variant="primary"
                size="lg"
                block
                disabled={starting}
                leftIcon={starting ? <Spinner size={16} /> : <Lock size={16} />}
                onClick={begin}
              >
                {starting ? 'Opening secure checkout…' : `Pay ${formatSgd(priceCents)}`}
              </Button>
              <p className="mt-3 text-center text-[13px] text-p1-text-3">
                Processing cost to V-RENT on this method: {feeLine}.
              </p>
            </SectionCard>
          )}

          {awaiting && intent.qr && (
            <SectionCard
              title="Scan to pay with PayNow"
              description="Open your banking app, choose Scan & Pay, and point it at this code. The amount and reference are already filled in."
            >
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <div className="rounded-2xl border border-p1-border bg-white p-3 shadow-p1-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={intent.qr.dataUrl} alt="PayNow QR code for this payment" width={280} height={280} />
                </div>
                <div className="min-w-0 flex-1">
                  <KeyValue
                    rows={[
                      { k: 'Amount', v: <span className="font-semibold tabular-nums">{formatSgd(intent.totalCents)}</span> },
                      { k: 'Reference', v: <code className="font-mono text-[13px]">{intent.ref}</code> },
                      { k: 'Paid to', v: 'V-RENT (UEN on the QR)' },
                      { k: 'Code expires in', v: <Countdown expiresAt={intent.expiresAt} /> },
                    ]}
                  />
                  <div
                    className="mt-4 flex items-center gap-2 rounded-lg border border-p1-border bg-p1-subtle/60 px-3 py-2.5 text-[13px] text-p1-text-2"
                    role="status"
                    aria-live="polite"
                  >
                    {polling ? <Spinner size={14} className="text-p1-primary dark:text-p1-info" /> : <QrCode size={14} />}
                    {polling ? 'Waiting for your bank to confirm the transfer…' : 'Checking…'}
                  </div>
                  <p className="mt-3 text-[13px] leading-5 text-p1-text-3">
                    Keep this page open. {buyingCredit ? 'Your balance goes up' : 'Your subscription switches on'} by
                    itself the moment the transfer reaches V-RENT&apos;s account — usually within a few seconds.
                  </p>
                  <Button className="mt-4" variant="outline" size="sm" onClick={reset}>
                    Cancel and choose another method
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}

          {awaiting && !intent.qr && (
            <Card padding="lg">
              <div className="py-6 text-center" role="status" aria-live="polite">
                <span
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-p1-primary-soft text-p1-primary"
                  aria-hidden
                >
                  <ShieldCheck size={30} />
                </span>
                <h2 className="text-[20px] font-semibold text-p1-text">Finishing on the provider&apos;s page</h2>
                <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-p1-text-2">
                  If the window did not open, use the button below. This page keeps checking and updates
                  itself as soon as the payment is confirmed.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {intent.redirectUrl && (
                    <LinkButton href={intent.redirectUrl} variant="primary" size="lg">
                      Open the payment page <ArrowUpRight size={16} />
                    </LinkButton>
                  )}
                  <Button variant="outline" size="lg" onClick={reset}>
                    Start over
                  </Button>
                </div>
                <div className="mt-5 flex items-center justify-center gap-2 text-[13px] text-p1-text-3">
                  {polling && <Spinner size={13} />} Reference {intent.ref}
                </div>
              </div>
            </Card>
          )}

          {paid && (
            <Card padding="lg">
              <div className="py-6 text-center">
                <span
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-p1-success-soft text-p1-success"
                  aria-hidden
                >
                  <CheckCircle2 size={32} />
                </span>
                <h2 className="text-[22px] font-semibold text-p1-text">
                  {pack ? 'Credit added' : 'Your subscription is active'}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-p1-text-2">
                  {pack
                    ? `${namesIn(pack)} names, ${formatSgd(intent.totalCents)} paid by ${intent.provider === 'paynow' ? 'PayNow' : 'card'}.`
                    : `${plan.name} plan, ${formatSgd(intent.totalCents)} paid by ${intent.provider === 'paynow' ? 'PayNow' : 'card'}.`}
                  {' '}A receipt is on its way to {state.profile.email}.
                </p>
                <p className="mt-2 text-[13px] text-p1-text-3">Reference {intent.ref}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {pack ? (
                    <Button
                      variant="primary"
                      size="lg"
                      leftIcon={<Sparkles size={16} />}
                      onClick={() => { router.push('/phase1/listings'); router.refresh(); }}
                    >
                      Reveal who has been looking
                    </Button>
                  ) : (
                    <>
                      <Button variant="primary" size="lg" onClick={() => router.push('/phase1/dashboard')}>
                        Go to dashboard
                      </Button>
                      <Button variant="outline" size="lg" onClick={() => router.push('/phase1/listings/new')}>
                        Create a listing
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}

          {failedish && (
            <Card padding="lg">
              <EmptyState
                icon={<XCircle size={28} />}
                title={intent.status === 'expired' ? 'That code expired' : 'The payment did not go through'}
                description={
                  intent.status === 'expired'
                    ? 'PayNow codes are single use and time limited. Start again to get a fresh one.'
                    : (intent.failureReason ?? 'No money has left your account. You can try again or use another method.')
                }
                action={
                  <Button variant="primary" leftIcon={<RefreshCw size={16} />} onClick={reset}>
                    Try again
                  </Button>
                }
              />
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <SectionCard title="Order summary">
            <KeyValue
              rows={[
                pack
                  ? { k: 'Reveal credit', v: `${namesIn(pack)} names` }
                  : { k: `${plan.name} plan`, v: '12 months' },
                {
                  k: intent ? 'Before GST' : 'Price',
                  v: formatSgd(intent ? intent.subtotalCents : priceCents),
                },
                {
                  k: intent?.tax.label ?? 'GST',
                  v: intent ? formatSgd(intent.tax.cents) : <span className="text-p1-text-3">Set by tax status</span>,
                },
              ]}
            />
            <div className="mt-3 flex items-baseline justify-between border-t border-p1-border pt-3">
              <span className="text-[15px] font-semibold text-p1-text">Total</span>
              <span className="text-[22px] font-semibold tabular-nums text-p1-text">
                {formatSgd(intent ? intent.totalCents : priceCents)}
              </span>
            </div>
            <p className="mt-3 flex items-start gap-2 text-[13px] text-p1-text-3">
              <Lock size={14} className="mt-0.5 shrink-0" aria-hidden />
              V-RENT never sees your card number. PayNow moves money bank to bank with no card at all.
            </p>
          </SectionCard>

          {intent?.tax.remittedBy === 'merchant-of-record' && (
            <Callout tone="info" title="Dodo is the seller on your receipt">
              Dodo Payments collects and files the GST on this sale. Your invoice will show Dodo, not V-RENT.
            </Callout>
          )}

          {buyingCredit ? (
            <Callout tone="info" title="Bought once, not a subscription" icon={<Sparkles size={18} />}>
              Credit sits on your account until it is spent. Nothing renews, and a name you have already revealed is
              never charged for twice.
            </Callout>
          ) : (
            <Callout tone="info" title="Renews in 12 months" icon={<Building2 size={18} />}>
              You will be reminded by email 30 days before renewal and can cancel at any time.
            </Callout>
          )}

          <div
            className={cx(
              'rounded-xl border border-p1-border bg-p1-subtle/50 px-4 py-3 text-[13px] leading-5 text-p1-text-3',
            )}
          >
            <span className="font-semibold text-p1-text-2">Internal only:</span> estimated cost of collection{' '}
            {intent ? formatSgd(intent.providerFeeCents) : '—'} on this method.
          </div>
        </div>
      </div>

    </>
  );
}

/**
 * `useSearchParams` needs a boundary to suspend against while the address is
 * read, which is also the right place to say nothing rather than flash a
 * half-built form.
 */
export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Spinner size={20} /></div>}>
      <PaymentScreen />
    </Suspense>
  );
}
