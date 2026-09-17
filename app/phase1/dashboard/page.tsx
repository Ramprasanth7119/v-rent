"use client";

/**
 * The agent's dashboard.
 *
 * Read top to bottom in the order an agent asks: how am I doing (four counted
 * figures), how is it trending (one chart) beside what needs me and what just
 * happened, then the people — who wrote in and who is coming to a viewing —
 * and last the properties doing the most work.
 *
 * Every figure comes from `lib/phase1/dashboard`, over the one workspace the
 * global Demo Data switch selects, so nothing here branches on the mode.
 * Traffic that nothing counts is never drawn as a zero.
 *
 * Every panel is a component under `components/phase1/dashboard`; this file
 * decides the numbers and the order, and draws almost nothing itself.
 */

import { useMemo } from 'react';
import { LinkButton, Callout } from '../../../components/phase1/kit';
import {
  ActivityPanel, AttentionItem, KpiRow, PerformanceChart, RecentEnquiries, TopListings, UpcomingViewings,
} from '../../../components/phase1/dashboard';
import { daysUntil } from '../../../components/phase1/listing/ListingCard';
import { useSession } from '../../../lib/phase1/SessionContext';
import { useDemo, TODAY, preferredName } from '../../../lib/phase1/DemoContext';
import { activity, listingPerformance, portfolioSummary, Sources, upcomingSlots } from '../../../lib/phase1/dashboard';
import { usualName } from '../../../lib/phase1/display-name';
import { useEnquiries } from '../../../lib/phase1/useEnquiries';
import { enquiryTime, readStage } from '../../../lib/phase1/enquiries';
import {
  Plus, MessageSquare, CalendarClock, CalendarDays, Camera, ShieldAlert, CreditCard, Gavel, CalendarX, Clock,
} from 'lucide-react';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const FULL_DAY = new Intl.DateTimeFormat('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' });

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

  const newEnquiries = inbox.enquiries.filter((e) => e.status === 'new');
  const expiring = published.filter((l) => (daysUntil(l.expiresAt, TODAY) ?? 99) <= 30);
  const soonest = expiring.reduce<number | null>((m, l) => { const d = daysUntil(l.expiresAt, TODAY) ?? 99; return m === null ? d : Math.min(m, d); }, null);

  /* One set of sources for every figure on the page. */
  const src: Sources = useMemo(
    () => ({ listings: live, enquiries: inbox.enquiries, slots: state.tools.slots, now: inbox.now }),
    [live, inbox.enquiries, state.tools.slots, inbox.now],
  );
  const summary = useMemo(() => portfolioSummary(src), [src]);
  const perf = useMemo(() => listingPerformance(src), [src]);
  const upcoming = useMemo(() => upcomingSlots(state.tools.slots, inbox.now), [state.tools.slots, inbox.now]);

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

  /* Same order as the inbox's default: what needs the agent first, newest within that. */
  const latestEnquiries = useMemo(
    () => [...inbox.enquiries]
      .sort((x, y) => readStage(x, inbox.now).rank - readStage(y, inbox.now).rank || enquiryTime(y) - enquiryTime(x))
      .slice(0, 5),
    [inbox.enquiries, inbox.now],
  );

  const failing = gate.filter((g) => !g.pass);
  const urgent = attention.filter((a) => a.tone === 'danger').length;
  /* The rail beside the chart holds about six rows; what is waiting takes its share first. */
  const events = useMemo(() => activity(src, Math.max(3, 6 - attention.length)), [src, attention.length]);

  return (
    <>
      {/* ----------------------------------------------------------- header */}
      <header className="vr-rise mb-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 sm:mb-6">
        <div className="min-w-0">
          <h1 suppressHydrationWarning className="font-p1display text-[24px] font-bold tracking-[-0.025em] text-p1-text sm:text-[28px]">
            {greeting}, {first}
          </h1>
          <p className="mt-0.5 text-[13.5px] text-p1-text-3">
            {attention.length === 0
              ? 'Here\u2019s what\u2019s happening with your properties today.'
              : <>{plural(attention.length, 'thing needs', 'things need')} you today{urgent ? <>, <span className="font-medium text-p1-danger">{urgent} urgent</span></> : ''}.</>}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="hidden h-10 items-center gap-2 rounded-lg border border-p1-border bg-p1-surface px-3 text-[13px] font-medium tabular-nums text-p1-text-2 shadow-p1-sm sm:inline-flex">
            <CalendarDays size={15} aria-hidden className="text-p1-text-3" />
            {FULL_DAY.format(TODAY)}
          </span>
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

      <div className="space-y-4 sm:space-y-5">
        <KpiRow
          activeListings={activeListings}
          listingLimit={listingLimit}
          enquiries30d={summary.enquiries30d}
          prevEnquiries30d={summary.prevEnquiries30d}
          awaitingReply={summary.awaitingReply}
          upcomingViewings={summary.upcomingViewings}
          heldViewings={summary.heldViewings}
          lets30d={summary.lets30d}
        />

        {/* ------------------------------------------ trend, and what is new */}
        <div className="vr-rise grid grid-cols-[minmax(0,1fr)] gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_360px]" style={{ animationDelay: '60ms' }}>
          <PerformanceChart src={src} />
          <ActivityPanel attention={attention} events={events} byId={inbox.byId} now={inbox.now} />
        </div>

        {/* ------------------------------------------------------ the people */}
        <div className="vr-rise grid grid-cols-[minmax(0,1fr)] gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" style={{ animationDelay: '110ms' }}>
          <RecentEnquiries
            enquiries={latestEnquiries}
            byId={inbox.byId}
            isOwn={inbox.isOwn}
            ownerId={user?.id}
            now={inbox.now}
            demo={inbox.demo}
            total={inbox.enquiries.length}
          />
          <UpcomingViewings
            slots={upcoming}
            all={state.tools.slots}
            byId={inbox.byId}
            ownerId={user?.id}
            now={inbox.now}
          />
        </div>

        {/* -------------------------------------------------- the properties */}
        <div className="vr-rise" style={{ animationDelay: '160ms' }}>
          <TopListings perf={perf} ownerId={user?.id} />
        </div>
      </div>
    </>
  );
}
