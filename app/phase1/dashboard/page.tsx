"use client";

/**
 * The agent's dashboard.
 *
 * Built to answer two questions in the first three seconds: how is the
 * portfolio doing, and what should I do next. So the page opens with one
 * figure given room — views this week — and the four numbers that put it in
 * context; then the chart that lets the agent interrogate it, with everything
 * waiting on them beside it; then the properties themselves, photographed,
 * because this is a property product and not a reporting tool; and last the
 * shape of the month and the people who wrote in.
 *
 * Every panel is a component under `components/phase1/dashboard`. This file
 * decides what the numbers are and in what order they are asked for; it draws
 * almost nothing itself.
 */

import { useMemo } from 'react';
import {
  LinkButton, Callout,
} from '../../../components/phase1/kit';
import {
  AccountCard, AttentionCenter, AttentionItem, ConversionPanel, EnquiryFeed, InsightCard,
  ListingRanking, PerformancePanel, PortfolioSnapshot, PropertyShowcase,
} from '../../../components/phase1/dashboard';
import { daysUntil } from '../../../components/phase1/listing/ListingCard';
import { useSession } from '../../../lib/phase1/SessionContext';
import { useDemo, TODAY, preferredName } from '../../../lib/phase1/DemoContext';
import { listingStats, totals, weeklyInsight } from '../../../lib/phase1/performance';
import { listingHealth } from '../../../lib/phase1/health';
import { usualName } from '../../../lib/phase1/display-name';
import { useEnquiries } from '../../../lib/phase1/useEnquiries';
import { enquiryTime, readStage } from '../../../lib/phase1/enquiries';
import {
  Plus, MessageSquare, CalendarClock, Camera, ShieldAlert, CreditCard, Gavel, CalendarX, Clock,
} from 'lucide-react';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const FULL_DAY = new Intl.DateTimeFormat('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' });
const MONTH_MS = 30 * 86_400_000;

export default function DashboardPage() {
  const { state, gate, canPublish, activeListings, listingLimit, saveError } = useDemo();
  const { user } = useSession();
  /* The inbox every screen reads, so this page and Enquiries always count the same records. */
  const inbox = useEnquiries();

  const first = usualName(state.profile.fullName) || preferredName(state.profile.fullName);
  // Singapore's hour on both sides, so the server render and the browser agree.
  const hour = Number(new Intl.DateTimeFormat('en-SG', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Singapore' }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const live = useMemo(() => state.listings.filter((l) => !l.archived), [state.listings]);
  const published = useMemo(() => live.filter((l) => l.status === 'published'), [live]);

  const t = useMemo(() => totals(live), [live]);
  const prev7 = t.series.slice(0, 7).reduce((n, v) => n + v, 0);

  const newEnquiries = inbox.enquiries.filter((e) => e.status === 'new');
  const expiring = published.filter((l) => (daysUntil(l.expiresAt, TODAY) ?? 99) <= 30);
  const soonest = expiring.reduce<number | null>((m, l) => { const d = daysUntil(l.expiresAt, TODAY) ?? 99; return m === null ? d : Math.min(m, d); }, null);
  const insight = useMemo(() => weeklyInsight(live), [live]);

  /* Listing quality is the average of the completeness score every listing
     already carries, over the ones that are live. It is not a new metric — it
     is the one on each listing page, added up. */
  const quality = useMemo(() => {
    if (!published.length) return null;
    return Math.round(published.reduce((n, l) => n + listingHealth(l).score, 0) / published.length);
  }, [published]);

  /* Viewings are counted, not modelled: a booking in the diary in the last
     thirty days. An agent with no published slots has none, and the panel
     says why rather than showing a bare nought. */
  const viewings30d = useMemo(
    () => state.tools.slots.filter((s) => s.booking && TODAY.getTime() - new Date(s.booking.at).getTime() <= MONTH_MS).length,
    [state.tools.slots],
  );

  /**
   * What is waiting on the agent, most consequential first. Like items are one
   * row — "3 listings have no photographs" — rather than three rows that say
   * the same thing.
   */
  const attention: AttentionItem[] = useMemo(() => {
    const rows: AttentionItem[] = [];
    if (!state.ceaValid) rows.push({ key: 'cea', title: 'CEA registration has lapsed', why: 'Publishing is paused until the register shows it valid again.', tone: 'danger', href: '/phase1/status', cta: 'Review', icon: ShieldAlert });
    if (state.subscription === 'past_due') rows.push({ key: 'billing', title: 'Renewal payment failed', why: 'Listings stay live during the grace period.', tone: 'danger', href: '/phase1/checkout', cta: 'Fix payment', icon: CreditCard });
    for (const l of live.filter((x) => x.status === 'rejected')) {
      rows.push({ key: `rej-${l.id}`, title: `${l.project} ${l.unitNo} needs changes`, why: l.rejectionReason ?? 'Rejected in moderation.', tone: 'danger', href: `/phase1/listings/new?edit=${l.id}`, cta: 'Fix', icon: Gavel });
    }
    if (newEnquiries.length) rows.push({ key: 'enq', title: `${plural(newEnquiries.length, 'enquiry', 'enquiries')} waiting for a reply`, why: 'Tenants who have not heard back yet.', tone: 'warning', href: '/phase1/enquiries?status=new', cta: 'Reply', icon: MessageSquare });
    if (expiring.length) rows.push({ key: 'exp', title: `${plural(expiring.length, 'listing expires', 'listings expire')} within ${soonest !== null && soonest <= 7 ? '7' : '30'} days`, why: 'Expired listings come off the tenant site and free their slot.', tone: soonest !== null && soonest <= 7 ? 'danger' : 'warning', href: '/phase1/listings?status=published', cta: 'Review', icon: CalendarClock });
    const noPhotos = live.filter((l) => l.status === 'draft' && l.images === 0);
    if (noPhotos.length) rows.push({ key: 'pho', title: `${plural(noPhotos.length, 'draft has', 'drafts have')} no photographs`, why: 'A listing needs at least one photograph to publish.', tone: 'warning', href: noPhotos.length === 1 ? `/phase1/listings/new?edit=${noPhotos[0].id}&step=photos` : '/phase1/listings?status=draft', cta: 'Add photos', icon: Camera });
    const expired = live.filter((l) => l.status === 'expired');
    if (expired.length) rows.push({ key: 'old', title: `${plural(expired.length, 'listing has', 'listings have')} expired`, why: 'Renew to relist, or archive to tidy up.', tone: 'info', href: '/phase1/listings?status=expired', cta: 'Review', icon: CalendarX });
    const pending = live.filter((l) => l.status === 'pending_review');
    if (pending.length) rows.push({ key: 'pen', title: `${plural(pending.length, 'listing is', 'listings are')} with a moderator`, why: 'Usually reviewed within one business day. Nothing to do.', tone: 'info', href: '/phase1/listings?status=pending_review', cta: 'View', icon: Clock });
    return rows;
  }, [state.ceaValid, state.subscription, live, newEnquiries.length, expiring.length, soonest]);

  /* One ordering — views over seven days — feeds both the showcase and the
     ranking, so the property given the photograph is the one at the top of
     the bars. */
  const ranked = useMemo(
    () => published.map((l) => ({ l, s: listingStats(l) })).sort((x, y) => y.s.views7d - x.s.views7d || y.s.enquiries7d - x.s.enquiries7d),
    [published],
  );
  /* Same order as the inbox's default: what needs the agent first, newest within that. */
  const latestEnquiries = useMemo(
    () => [...inbox.enquiries]
      .sort((x, y) => readStage(x, inbox.now).rank - readStage(y, inbox.now).rank || enquiryTime(y) - enquiryTime(x))
      .slice(0, 5),
    [inbox.enquiries, inbox.now],
  );

  const aside = (
    <>
      <EnquiryFeed
        enquiries={latestEnquiries}
        byId={inbox.byId}
        isOwn={inbox.isOwn}
        ownerId={user?.id}
        now={inbox.now}
        demo={inbox.demo}
        replied={inbox.enquiries.filter((e) => e.status !== 'new').length}
        total={inbox.enquiries.length}
      />
      <AccountCard
        planName={state.plan?.name ?? null}
        subscription={state.subscription}
        ceaValid={state.ceaValid}
        ceaValidUntil={state.ceaValidUntil}
        paymentMethod={state.paymentMethod}
      />
      {insight && <InsightCard insight={insight} />}
    </>
  );

  const failing = gate.filter((g) => !g.pass);
  const urgent = attention.filter((a) => a.tone === 'danger').length;

  return (
    <>
      {/* ----------------------------------------------------------- header */}
      <header className="vr-rise mb-5 flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
        <div className="min-w-0">
          <h1 suppressHydrationWarning className="font-p1display text-[26px] font-bold tracking-[-0.025em] text-p1-text sm:text-[32px]">
            {greeting}, {first}
          </h1>
          <p className="mt-1 text-[14px] text-p1-text-3">
            {attention.length === 0
              ? 'Your portfolio at a glance. Nothing is waiting on you.'
              : <>{plural(attention.length, 'thing needs', 'things need')} you today{urgent ? <>, <span className="font-medium text-p1-danger">{urgent} urgent</span></> : ''}.</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] tabular-nums text-p1-text-3 sm:inline">{FULL_DAY.format(TODAY)}</span>
          <LinkButton href="/phase1/listings/new" leftIcon={<Plus size={16} />}>New listing</LinkButton>
        </div>
      </header>

      {saveError && <Callout tone="danger" compact className="mb-5">{saveError}</Callout>}

      {!canPublish && (
        <Callout
          tone="warning"
          compact
          className="mb-5"
          title={`Publishing is blocked — ${failing[0]?.label.toLowerCase() ?? 'a check is failing'}`}
          action={failing[0]?.fixHref ? <LinkButton href={failing[0].fixHref} size="sm" variant="outline">{failing[0].fixLabel ?? 'Fix'}</LinkButton> : undefined}
        >
          {failing.length > 1 ? `${failing.length - 1} more ${failing.length - 1 === 1 ? 'check' : 'checks'} also need attention.` : failing[0]?.detail}
        </Callout>
      )}

      <div className="space-y-5">
        {/* --------------------------------------------------------- at a glance */}
        <PortfolioSnapshot
          views7d={t.views7d}
          prev7d={prev7}
          series={t.series}
          activeListings={activeListings}
          listingLimit={listingLimit}
          saves30d={t.saves}
          newEnquiries={newEnquiries.length}
          quality={quality}
          qualityOf={published.length}
        />

        {/* ------------------------------------------- performance and actions */}
        <div className="vr-rise grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_344px]" style={{ animationDelay: '60ms' }}>
          <PerformancePanel listings={live} today={TODAY} />
          <AttentionCenter items={attention} />
        </div>

        {/* ------------------------------------------------------- properties */}
        {ranked.length > 0 && (
          <div className="vr-rise" style={{ animationDelay: '110ms' }}>
            <PropertyShowcase items={ranked.slice(0, 5)} ownerId={user?.id} liveCount={published.length} />
          </div>
        )}

        {/* ------------------------------------------------ shape of the month */}
        <div className="vr-rise" style={{ animationDelay: '160ms' }}>
          {published.length > 0 ? (
            <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_344px]">
              <div className="min-w-0 space-y-5">
                <ConversionPanel
                  views={t.views30d}
                  saves={t.saves}
                  enquiries={t.enquiries30d}
                  viewings={viewings30d}
                  hasSlots={state.tools.slots.length > 0}
                />
                <ListingRanking rows={ranked.slice(0, 5)} />
              </div>
              <div className="min-w-0 space-y-5">{aside}</div>
            </div>
          ) : (
            /* With nothing live there is no month to show, so the three cards
               that would sit in the rail take the width rather than leaving a
               column of air beside them. */
            <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">{aside}</div>
          )}
        </div>
      </div>
    </>
  );
}
