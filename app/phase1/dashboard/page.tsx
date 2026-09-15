"use client";

/**
 * The agent's dashboard.
 *
 * Built to answer two questions in the first three seconds: what do I need to
 * know, and what should I do next. So the order is four numbers, then the
 * things waiting on the agent — grouped, one line each, with the action beside
 * them — then one chart, then the listings that are working and the people who
 * asked. Account standing appears only when it blocks something; otherwise it
 * is a single quiet card.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  LinkButton, Card, KPI, EmptyState, AreaChart, Segmented, Callout, Avatar, Tooltip, cx,
} from '../../../components/phase1/kit';
import { daysUntil } from '../../../components/phase1/listing/ListingCard';
import { PropertyImage } from '../../../components/phase1/PropertyImage';
import { coverPhoto } from '../../../lib/phase1/photos';
import { useSession } from '../../../lib/phase1/SessionContext';
import { useDemo, TODAY, preferredName } from '../../../lib/phase1/DemoContext';
import { priceLabel } from '../../../lib/phase1/pricing';
import { listingStats, totals, weeklyInsight } from '../../../lib/phase1/performance';
import { districtLabel } from '../../../lib/phase1/districts';
import { sgDate, sgRelative } from '../../../lib/phase1/format';
import { usualName } from '../../../lib/phase1/display-name';
import {
  Plus, ArrowRight, Building2, Eye, MessageSquare, CalendarClock, Camera, ShieldAlert, CreditCard, Gavel, CalendarX,
  Clock, Check, Lightbulb, ChevronRight, Info, Sparkles,
} from 'lucide-react';

type Tone = 'danger' | 'warning' | 'info';

interface Attention {
  key: string;
  title: string;
  why: string;
  tone: Tone;
  href: string;
  cta: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const TONE_ICON: Record<Tone, string> = {
  danger: 'bg-p1-danger-soft text-p1-danger',
  warning: 'bg-p1-warning-soft text-p1-warning',
  info: 'bg-p1-subtle text-p1-text-2',
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const DAY = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' });

export default function DashboardPage() {
  const { state, gate, canPublish, activeListings, listingLimit, saveError } = useDemo();
  const { user } = useSession();
  const [metric, setMetric] = useState<'views' | 'enquiries'>('views');

  const first = usualName(state.profile.fullName) || preferredName(state.profile.fullName);
  // Singapore's hour on both sides, so the server render and the browser agree.
  const hour = Number(new Intl.DateTimeFormat('en-SG', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Singapore' }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const live = useMemo(() => state.listings.filter((l) => !l.archived), [state.listings]);
  const byId = useMemo(() => new Map(live.map((l) => [l.id, l])), [live]);
  const published = useMemo(() => live.filter((l) => l.status === 'published'), [live]);

  const t = useMemo(() => totals(live), [live]);
  const prev7 = t.series.slice(0, 7).reduce((n, v) => n + v, 0);
  const viewTrend = prev7 ? Math.round(((t.views7d - prev7) / prev7) * 100) : 0;

  /* Enquiries a day, from each listing's own views and enquiry rate. */
  const enquirySeries = useMemo(() => {
    const out = Array(14).fill(0) as number[];
    for (const l of live) {
      const s = listingStats(l);
      const rate = s.views30d ? s.enquiries30d / s.views30d : 0;
      s.series.forEach((v, i) => { out[i] += v * rate; });
    }
    return out.map((v) => Math.round(v * 10) / 10);
  }, [live]);
  const enqPrev = enquirySeries.slice(0, 7).reduce((n, v) => n + v, 0);
  const enqLast = enquirySeries.slice(7).reduce((n, v) => n + v, 0);

  const labels = useMemo(() => Array.from({ length: 14 }, (_, i) => DAY.format(new Date(TODAY.getTime() - (13 - i) * 86_400_000))), []);

  const newEnquiries = state.enquiries.filter((e) => e.status === 'new');
  const expiring = published.filter((l) => (daysUntil(l.expiresAt, TODAY) ?? 99) <= 30);
  const soonest = expiring.reduce<number | null>((m, l) => { const d = daysUntil(l.expiresAt, TODAY) ?? 99; return m === null ? d : Math.min(m, d); }, null);
  const insight = useMemo(() => weeklyInsight(live), [live]);

  /**
   * What is waiting on the agent, most consequential first. Like items are one
   * row — "3 listings have no photographs" — rather than three rows that say
   * the same thing.
   */
  const attention: Attention[] = useMemo(() => {
    const rows: Attention[] = [];
    if (!state.ceaValid) rows.push({ key: 'cea', title: 'CEA registration has lapsed', why: 'Publishing is paused until the register shows it valid again.', tone: 'danger', href: '/phase1/status', cta: 'Review', icon: ShieldAlert });
    if (state.subscription === 'past_due') rows.push({ key: 'billing', title: 'Renewal payment failed', why: 'Listings stay live during the grace period.', tone: 'danger', href: '/phase1/checkout', cta: 'Fix payment', icon: CreditCard });
    for (const l of live.filter((x) => x.status === 'rejected')) {
      rows.push({ key: `rej-${l.id}`, title: `${l.project} ${l.unitNo} needs changes`, why: l.rejectionReason ?? 'Rejected in moderation.', tone: 'danger', href: `/phase1/listings/new?edit=${l.id}`, cta: 'Fix', icon: Gavel });
    }
    if (newEnquiries.length) rows.push({ key: 'enq', title: `${plural(newEnquiries.length, 'enquiry', 'enquiries')} waiting for a reply`, why: 'Tenants who have not heard back yet.', tone: 'warning', href: '/phase1/enquiries', cta: 'Reply', icon: MessageSquare });
    if (expiring.length) rows.push({ key: 'exp', title: `${plural(expiring.length, 'listing expires', 'listings expire')} within ${soonest !== null && soonest <= 7 ? '7' : '30'} days`, why: 'Expired listings come off the tenant site and free their slot.', tone: soonest !== null && soonest <= 7 ? 'danger' : 'warning', href: '/phase1/listings?status=published', cta: 'Review', icon: CalendarClock });
    const noPhotos = live.filter((l) => l.status === 'draft' && l.images === 0);
    if (noPhotos.length) rows.push({ key: 'pho', title: `${plural(noPhotos.length, 'draft has', 'drafts have')} no photographs`, why: 'A listing needs at least one photograph to publish.', tone: 'warning', href: noPhotos.length === 1 ? `/phase1/listings/new?edit=${noPhotos[0].id}&step=photos` : '/phase1/listings?status=draft', cta: 'Add photos', icon: Camera });
    const expired = live.filter((l) => l.status === 'expired');
    if (expired.length) rows.push({ key: 'old', title: `${plural(expired.length, 'listing has', 'listings have')} expired`, why: 'Renew to relist, or archive to tidy up.', tone: 'info', href: '/phase1/listings?status=expired', cta: 'Review', icon: CalendarX });
    const pending = live.filter((l) => l.status === 'pending_review');
    if (pending.length) rows.push({ key: 'pen', title: `${plural(pending.length, 'listing is', 'listings are')} with a moderator`, why: 'Usually reviewed within one business day. Nothing to do.', tone: 'info', href: '/phase1/listings?status=pending_review', cta: 'View', icon: Clock });
    return rows;
  }, [state.ceaValid, state.subscription, live, newEnquiries.length, expiring.length, soonest]);

  const top = useMemo(
    () => published.map((l) => ({ l, s: listingStats(l) })).sort((x, y) => y.s.enquiries7d - x.s.enquiries7d || y.s.views7d - x.s.views7d).slice(0, 3),
    [published],
  );
  const latestEnquiries = useMemo(
    () => [...state.enquiries].sort((x, y) => (x.status === 'new' ? 0 : 1) - (y.status === 'new' ? 0 : 1) || y.at.localeCompare(x.at)).slice(0, 5),
    [state.enquiries],
  );

  const failing = gate.filter((g) => !g.pass);
  const quotaPct = listingLimit ? Math.min(100, Math.round((activeListings / listingLimit) * 100)) : 0;
  const urgent = attention.filter((a) => a.tone === 'danger').length;

  return (
    <>
      {/* ----------------------------------------------------------- header */}
      <header className="vr-rise mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 suppressHydrationWarning className="text-[24px] font-semibold tracking-[-0.02em] text-p1-text sm:text-[28px]">{greeting}, {first}</h1>
          <p className="mt-1 text-[14px] text-p1-text-3">
            {attention.length === 0
              ? 'Everything is in order. Your portfolio at a glance.'
              : <>{plural(attention.length, 'thing needs', 'things need')} you today{urgent ? <>, <span className="font-medium text-p1-danger">{urgent} urgent</span></> : ''}.</>}
          </p>
        </div>
        <LinkButton href="/phase1/listings/new" leftIcon={<Plus size={16} />}>New listing</LinkButton>
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

      {/* ------------------------------------------------------------- KPIs */}
      <section aria-label="Portfolio at a glance" className="vr-stagger mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="Active listings" value={activeListings} of={listingLimit || undefined} icon={<Building2 size={16} />} href="/phase1/listings?status=published" tone={listingLimit && activeListings >= listingLimit ? 'danger' : 'default'} />
        <KPI label="Views, 7 days" value={t.views7d} compact icon={<Eye size={16} />} delta={{ pct: viewTrend, label: 'against the previous 7 days' }} href="/phase1/performance" />
        <KPI label="New enquiries" value={newEnquiries.length} icon={<MessageSquare size={16} />} href="/phase1/enquiries" />
        <KPI label="Expiring soon" value={expiring.length} icon={<CalendarClock size={16} />} tone={expiring.length ? 'warning' : 'default'} href="/phase1/listings?status=published" />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* ---------------------------------------------- needs attention */}
          <Card padding="none" as="section" aria-labelledby="attention-h">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <h2 id="attention-h" className="text-[15px] font-semibold text-p1-text">Needs attention</h2>
              {attention.length > 0 && <span className="rounded-full bg-p1-subtle px-2 py-0.5 text-[12px] font-semibold tabular-nums text-p1-text-2">{attention.length}</span>}
            </div>
            {attention.length === 0 ? (
              <div className="flex items-center gap-3 border-t border-p1-border px-5 py-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-p1-success-soft text-p1-success" aria-hidden><Check size={17} /></span>
                <div>
                  <div className="text-[14px] font-medium text-p1-text">You&apos;re all caught up</div>
                  <div className="text-[13px] text-p1-text-3">New items appear here the moment something needs you.</div>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-p1-border border-t border-p1-border">
                {attention.map((r) => (
                  <li key={r.key}>
                    <Link href={r.href} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-p1-subtle/60">
                      <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONE_ICON[r.tone])} aria-hidden><r.icon size={15} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block line-clamp-2 text-[14px] font-medium text-p1-text sm:truncate">{r.title}</span>
                        <span className="hidden truncate text-[12.5px] text-p1-text-3 sm:block">{r.why}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-p1-primary">
                        {r.cta}<ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* -------------------------------------------------- performance */}
          <Card padding="none" as="section" aria-labelledby="perf-h">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
              <div className="flex items-center gap-2">
                <h2 id="perf-h" className="text-[15px] font-semibold text-p1-text">Listing performance</h2>
                <Tooltip content="Views and enquiries are modelled from each listing until the tenant site has recorded two weeks of traffic.">
                  <span tabIndex={0} className="inline-flex items-center gap-1 rounded-md bg-p1-subtle px-1.5 py-0.5 text-[11.5px] font-medium text-p1-text-3"><Info size={11} aria-hidden /> Modelled</span>
                </Tooltip>
              </div>
              <Segmented<'views' | 'enquiries'>
                label="Metric"
                size="sm"
                value={metric}
                onChange={setMetric}
                options={[{ key: 'views', label: 'Views' }, { key: 'enquiries', label: 'Enquiries' }]}
              />
            </div>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-5 pt-2">
              <span className="text-[13px] text-p1-text-3">Last 14 days</span>
              <span className="text-[13px] text-p1-text-2"><span className="font-semibold tabular-nums text-p1-text">{(metric === 'views' ? t.views7d + prev7 : Math.round(enqPrev + enqLast)).toLocaleString('en-SG')}</span> {metric}</span>
              <span className="text-[13px] text-p1-text-2"><span className="font-semibold tabular-nums text-p1-text">{t.saves.toLocaleString('en-SG')}</span> saves, 30 days</span>
            </div>
            <div className="px-3 pb-3 pt-1">
              {published.length === 0 ? (
                <EmptyState compact title="No live listings yet" description="Performance appears once a listing is published." />
              ) : (
                <AreaChart
                  key={metric}
                  height={220}
                  labels={labels}
                  series={[metric === 'views'
                    ? { label: 'Views', points: t.series, tone: 'primary' }
                    : { label: 'Enquiries', points: enquirySeries, tone: 'success' }]}
                  valueLabel={(n) => (metric === 'views' ? Math.round(n).toLocaleString('en-SG') : String(Math.round(n * 10) / 10))}
                />
              )}
            </div>
          </Card>

          {/* ---------------------------------------------- top performing */}
          {top.length > 0 && (
            <section aria-labelledby="top-h">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="top-h" className="text-[15px] font-semibold text-p1-text">Top performing</h2>
                <Link href="/phase1/performance" className="inline-flex items-center gap-1 text-[13px] font-medium text-p1-primary hover:underline underline-offset-4">Performance <ArrowRight size={13} aria-hidden /></Link>
              </div>
              <ul className="vr-stagger grid gap-4 sm:grid-cols-3">
                {top.map(({ l, s }, i) => {
                  const p = priceLabel(l);
                  return (
                    <li key={l.id}>
                      <Link href={`/phase1/listings/${l.id}`} className="group block overflow-hidden rounded-xl border border-p1-border bg-p1-surface transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-p1-border-strong hover:shadow-p1-md">
                        <div className="relative">
                          <PropertyImage seed={l.reference + l.project} src={coverPhoto(user?.id, l)} alt="" rounded="rounded-none" className="aspect-[16/10] w-full" />
                          {i === 0 && <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-p1-surface/95 px-1.5 py-0.5 text-[11.5px] font-semibold text-p1-text shadow-p1-sm"><Sparkles size={11} className="text-p1-accent-text" aria-hidden /> Best this week</span>}
                        </div>
                        <div className="p-3.5">
                          <div className="truncate text-[14px] font-semibold text-p1-text">{l.project}</div>
                          <div className="truncate text-[12.5px] text-p1-text-3">{p.amount}{p.suffix} · {districtLabel(l.district)}</div>
                          <div className="mt-2.5 flex items-center gap-4 border-t border-p1-border pt-2.5 text-[12.5px] text-p1-text-2">
                            <span className="inline-flex items-center gap-1.5"><Eye size={13} className="text-p1-text-3" aria-hidden /><span className="font-semibold tabular-nums text-p1-text">{s.views7d}</span></span>
                            <span className="inline-flex items-center gap-1.5"><MessageSquare size={13} className="text-p1-text-3" aria-hidden /><span className="font-semibold tabular-nums text-p1-text">{s.enquiries7d}</span></span>
                            <span className="ml-auto tabular-nums text-p1-text-3">{s.conversion}%</span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        {/* ---------------------------------------------------------- rail */}
        <div className="min-w-0 space-y-5">
          <Card padding="none" as="section" aria-labelledby="enq-h">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <h2 id="enq-h" className="text-[15px] font-semibold text-p1-text">Recent enquiries</h2>
              <Link href="/phase1/enquiries" className="text-[13px] font-medium text-p1-primary hover:underline underline-offset-4">View all</Link>
            </div>
            {latestEnquiries.length === 0 ? (
              <div className="border-t border-p1-border px-5 py-6 text-center">
                <div className="text-[14px] font-medium text-p1-text">No enquiries yet</div>
                <div className="mt-0.5 text-[13px] text-p1-text-3">Your listing activity will appear here.</div>
              </div>
            ) : (
              <ul className="divide-y divide-p1-border border-t border-p1-border">
                {latestEnquiries.map((e) => {
                  const l = byId.get(e.listingId);
                  const fresh = e.status === 'new';
                  return (
                    <li key={e.id}>
                      <Link href="/phase1/enquiries" className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-p1-subtle/60">
                        <span className="relative">
                          <Avatar name={e.name} size="sm" tone={fresh ? 'primary' : 'neutral'} />
                          {fresh && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-p1-primary ring-2 ring-p1-surface" aria-hidden />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className={cx('truncate text-[13.5px] text-p1-text', fresh ? 'font-semibold' : 'font-medium')}>{e.name}{fresh && <span className="sr-only"> (new)</span>}</span>
                            <span className="shrink-0 text-[12px] tabular-nums text-p1-text-3">{sgRelative(e.at, TODAY)}</span>
                          </span>
                          <span className="block truncate text-[12.5px] text-p1-text-3">{l ? l.project : 'Listing removed'} · {e.channel}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card padding="sm" as="section" aria-labelledby="plan-h">
            <div className="flex items-center justify-between gap-2">
              <h2 id="plan-h" className="text-[13px] font-medium text-p1-text-3">{state.plan ? `${state.plan.name} plan` : 'No plan'}</h2>
              <Link href={state.plan ? '/phase1/checkout' : '/phase1/plans'} className="text-[13px] font-medium text-p1-primary hover:underline underline-offset-4">{state.plan ? 'Manage' : 'Choose a plan'}</Link>
            </div>
            {listingLimit > 0 ? (
              <>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-[22px] font-semibold tabular-nums tracking-[-0.02em] text-p1-text">{Math.max(0, listingLimit - activeListings)}</span>
                  <span className="text-[13px] text-p1-text-3">of {listingLimit} listing slots free</span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-p1-subtle" role="progressbar" aria-valuenow={quotaPct} aria-valuemin={0} aria-valuemax={100} aria-label="Listing slots used">
                  <div className={cx('vr-grow h-full rounded-full', quotaPct >= 100 ? 'bg-p1-danger' : quotaPct >= 80 ? 'bg-p1-warning' : 'bg-p1-primary')} style={{ width: `${quotaPct}%` }} />
                </div>
              </>
            ) : (
              <p className="mt-1.5 text-[13px] leading-5 text-p1-text-2">Choose a plan to start publishing.</p>
            )}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-p1-border pt-3 text-[12.5px]">
              <span className="text-p1-text-3">CEA registration</span>
              {state.ceaValid
                ? <span className="font-medium text-p1-text-2">Valid to {sgDate(state.ceaValidUntil)}</span>
                : <Link href="/phase1/status" className="font-medium text-p1-danger">Lapsed</Link>}
            </div>
          </Card>

          {insight && (
            <Card padding="sm" as="section">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-p1-accent-soft text-p1-accent-text" aria-hidden><Lightbulb size={15} /></span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium leading-5 text-p1-text">{insight.headline}</p>
                  {insight.href && (
                    <Link href={insight.href} className="mt-1.5 inline-flex items-center gap-0.5 text-[13px] font-medium text-p1-primary hover:underline underline-offset-4">
                      Take a look <ChevronRight size={13} aria-hidden />
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
