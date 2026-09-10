"use client";

/**
 * Agent command centre.
 *
 * Reads top to bottom as the working day does: what is my position, what needs
 * me, what is my inventory earning, what did I touch last. Every number is a
 * link into the workflow that changes it — nothing here is decoration.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  LinkButton, Card, SectionCard, PageHeader, MetricStrip, Metric, EmptyState, Menu,
  MiniBars, HBars, cx } from '../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../components/phase1/status';
import { useListingActions, ListingActionDialogs } from '../../../components/phase1/listing/actions';
import { PropertyCell, daysUntil } from '../../../components/phase1/listing/ListingCard';
import { HealthRing } from '../../../components/phase1/listing/health';
import { StatsInline, Pulse } from '../../../components/phase1/listing/pulse';
import { useDemo, TODAY, preferredName } from '../../../lib/phase1/DemoContext';
import { DemoListing, sgd } from '../../../lib/phase1/data';
import { priceLabel } from '../../../lib/phase1/pricing';
import { listingStats, totals, weeklyInsight, districtName } from '../../../lib/phase1/performance';
import { listingHealth } from '../../../lib/phase1/health';
import {
  Plus, Upload, Check, X, ChevronRight, Lightbulb, Building2, CircleDashed, CreditCard,
  Eye, MessageSquare, CalendarClock, ArrowRight, Camera, ShieldAlert, Gavel, TrendingUp, Percent } from 'lucide-react';

type Tone = 'danger' | 'warning' | 'info';

interface ActionRow {
  key: string;
  listing?: DemoListing;
  title: string;
  why: string;
  tone: Tone;
  href: string;
  cta: string;
  icon: React.ReactNode;
}

const DOT: Record<Tone, string> = { danger: 'bg-p1-danger', warning: 'bg-p1-warning', info: 'bg-p1-info' };

export default function DashboardPage() {
  const { state, set, gate, canPublish, activeListings, listingLimit } = useDemo();
  const a = useListingActions();
  const [showControls, setShowControls] = useState(false);

  // Singapore names commonly lead with the family name, so a first token is the wrong address.
  const name = preferredName(state.profile.fullName);
  const dateLine = TODAY.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hour = TODAY.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const live = useMemo(() => state.listings.filter((l) => !l.archived), [state.listings]);
  const drafts = live.filter((l) => l.status === 'draft');
  const published = live.filter((l) => l.status === 'published');
  const quotaPct = listingLimit ? Math.min(100, Math.round((activeListings / listingLimit) * 100)) : 0;

  const t = useMemo(() => totals(live), [live]);
  const conversion = t.views30d ? Math.round((t.enquiries30d / t.views30d) * 1000) / 10 : 0;
  const prev7 = t.series.slice(0, 7).reduce((n, v) => n + v, 0);
  const last7 = t.series.slice(7).reduce((n, v) => n + v, 0);
  const viewTrend = prev7 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;
  const newEnquiries = state.enquiries.filter((e) => e.status === 'new').length;
  const expiringSoon = published.filter((l) => (daysUntil(l.expiresAt, TODAY) ?? 99) <= 30);
  const insight = useMemo(() => weeklyInsight(live), [live]);

  /** Everything that needs the agent, ordered by consequence. */
  const actions: ActionRow[] = [
    ...(!state.ceaValid ? [{
      key: 'cea', title: 'Your CEA registration has lapsed', why: 'Publication is paused until the public register shows a valid registration.',
      tone: 'danger' as const, href: '/phase1/status', cta: 'Open verification', icon: <ShieldAlert size={15} />,
    }] : []),
    ...(state.subscription === 'past_due' ? [{
      key: 'billing', title: 'Renewal payment failed', why: 'Listings stay live during the grace period. Update the payment method before it ends.',
      tone: 'danger' as const, href: '/phase1/checkout', cta: 'Fix payment', icon: <CreditCard size={15} />,
    }] : []),
    ...live.filter((l) => l.status === 'rejected').map((l) => ({
      key: `rej-${l.id}`, listing: l, title: `${l.project} ${l.unitNo} was rejected`, why: l.rejectionReason ?? 'Rejected in moderation.',
      tone: 'danger' as const, href: `/phase1/listings/new?edit=${l.id}`, cta: 'Correct it', icon: <Gavel size={15} />,
    })),
    ...(newEnquiries ? [{
      key: 'enq', title: `${newEnquiries} enquir${newEnquiries === 1 ? 'y is' : 'ies are'} waiting for a reply`, why: 'Tenants who enquired in the last two days have not heard back.',
      tone: 'warning' as const, href: '/phase1/performance', cta: 'Open enquiries', icon: <MessageSquare size={15} />,
    }] : []),
    ...drafts.filter((l) => l.images === 0).map((l) => ({
      key: `pho-${l.id}`, listing: l, title: `${l.project} ${l.unitNo} has no photographs`, why: 'A listing without photos cannot be published and gets almost no enquiries.',
      tone: 'warning' as const, href: `/phase1/listings/new?edit=${l.id}&step=media`, cta: 'Add photos', icon: <Camera size={15} />,
    })),
    ...expiringSoon.map((l) => ({
      key: `exp-${l.id}`, listing: l, title: `${l.project} ${l.unitNo} expires in ${daysUntil(l.expiresAt, TODAY)} days`, why: 'It comes off the tenant site on expiry and releases its quota slot.',
      tone: (daysUntil(l.expiresAt, TODAY) ?? 99) <= 7 ? ('danger' as const) : ('warning' as const), href: `/phase1/listings/${l.id}`, cta: 'Review', icon: <CalendarClock size={15} />,
    })),
    ...live.filter((l) => l.status === 'pending_review').map((l) => ({
      key: `pen-${l.id}`, listing: l, title: `${l.project} ${l.unitNo} is with a moderator`, why: 'Usually reviewed within one business day. No action needed from you.',
      tone: 'info' as const, href: `/phase1/listings/${l.id}`, cta: 'View', icon: <Gavel size={15} />,
    })),
  ];

  const ranked = useMemo(
    () => published.map((l) => ({ l, s: listingStats(l) })).sort((x, y) => y.s.enquiries7d - x.s.enquiries7d),
    [published],
  );
  const weakest = useMemo(
    () => [...live].filter((l) => l.status !== 'expired').sort((x, y) => listingHealth(x).score - listingHealth(y).score).slice(0, 3),
    [live],
  );
  const recent = useMemo(
    () => [...live].sort((x, y) => (y.updatedAt ?? y.createdAt).localeCompare(x.updatedAt ?? x.createdAt)).slice(0, 5),
    [live],
  );

  return (
    <>
      <PageHeader
        eyebrow={dateLine}
        title={`${greeting}, ${name}`}
        description={actions.length
          ? `${actions.length} item${actions.length === 1 ? '' : 's'} need${actions.length === 1 ? 's' : ''} you today. The rest of your portfolio is running.`
          : 'Nothing needs you today. Your listings are live and your account is in order.'}
        actions={
          <>
            <LinkButton href="/phase1/listings/import" variant="outline" leftIcon={<Upload size={16} />}>Import listings</LinkButton>
            <LinkButton href="/phase1/listings/new" variant="accent" leftIcon={<Plus size={16} />}>Create listing</LinkButton>
          </>
        }
      />

      <MetricStrip cols={6} className="mb-5">
        <Metric label="Active" value={listingLimit ? `${activeListings}/${listingLimit}` : '—'} icon={<Building2 size={15} />}
          tone={listingLimit && activeListings >= listingLimit ? 'danger' : 'default'}
          hint={listingLimit ? `${listingLimit - activeListings} slots left` : 'No plan yet'} href="/phase1/listings?status=published" />
        <Metric label="Drafts" value={drafts.length} icon={<CircleDashed size={15} />} hint="Not submitted" href="/phase1/listings?status=draft" />
        <Metric label="Expiring" value={expiringSoon.length} icon={<CalendarClock size={15} />}
          tone={expiringSoon.length ? 'warning' : 'default'} hint="Within 30 days" href="/phase1/listings?status=published" />
        <Metric label="Enquiries" value={newEnquiries} icon={<MessageSquare size={15} />}
          tone={newEnquiries ? 'info' : 'default'} hint="Awaiting reply" href="/phase1/performance" />
        <Metric label="Views, 7 days" value={t.views7d.toLocaleString()} icon={<Eye size={15} />}
          delta={{ value: `${viewTrend > 0 ? '+' : ''}${viewTrend}%`, good: viewTrend >= 0, label: 'week on week' }}
          hint="All live listings" href="/phase1/performance" />
        <Metric label="Enquiry rate" value={`${conversion}%`} icon={<Percent size={15} />}
          tone={conversion >= 5 ? 'success' : conversion >= 3 ? 'default' : 'warning'} hint="Per 100 views" href="/phase1/performance" />
      </MetricStrip>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <SectionCard
            title="Needs you"
            description={actions.length ? `${actions.length} item${actions.length === 1 ? '' : 's'}, most consequential first` : undefined}
            padding="none"
          >
            {actions.length === 0 ? (
              <EmptyState compact icon={<Check size={20} />} title="Nothing outstanding" description="Every listing is healthy and your account is in order." />
            ) : (
              <ul className="divide-y divide-p1-border">
                {actions.map((r) => (
                  <li key={r.key} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-5 py-3.5 sm:flex-nowrap sm:items-center sm:px-6">
                    <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full sm:mt-0', DOT[r.tone])} aria-hidden />
                    <span className="shrink-0 text-p1-text-3" aria-hidden>{r.icon}</span>
                    <div className="min-w-0 flex-1 basis-[16rem]">
                      <div className="text-[14px] font-medium text-p1-text">{r.title}</div>
                      <div className="mt-0.5 text-[13px] leading-5 text-p1-text-2">{r.why}</div>
                    </div>
                    <LinkButton href={r.href} size="sm" variant={r.tone === 'danger' ? 'primary' : 'outline'} className="shrink-0 max-sm:ml-8">
                      {r.cta}
                    </LinkButton>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Ready to publish?"
            description="Every listing must pass these five checks before it goes live."
            actions={
              <span className={cx('inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold', canPublish ? 'border-p1-success-border bg-p1-success-soft text-p1-success' : 'border-p1-danger-border bg-p1-danger-soft text-p1-danger')}>
                {canPublish ? <Check size={14} strokeWidth={3} aria-hidden /> : <X size={14} strokeWidth={3} aria-hidden />}
                {canPublish ? 'All checks passed' : 'Action needed'}
              </span>
            }
            padding="none"
          >
            <ul className="divide-y divide-p1-border">
              {gate.map((g) => (
                <li key={g.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-5 py-3.5 sm:flex-nowrap sm:px-6">
                  <span className={cx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', g.pass ? 'bg-p1-success-soft text-p1-success' : 'bg-p1-danger-soft text-p1-danger')} aria-hidden>
                    {g.pass ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                  </span>
                  <div className="min-w-0 flex-1 basis-[14rem]">
                    <div className="text-[14px] font-medium text-p1-text">{g.label}<span className="sr-only">{g.pass ? ' — passed' : ' — failed'}</span></div>
                    <div className="mt-0.5 text-[13px] text-p1-text-2">{g.detail}</div>
                  </div>
                  {!g.pass && g.fixHref && <LinkButton href={g.fixHref} variant="link" className="shrink-0 text-[13px] font-semibold max-sm:ml-9">{g.fixLabel ?? 'Fix'}</LinkButton>}
                </li>
              ))}
            </ul>
          </SectionCard>

          {published.length > 0 && (
            <SectionCard
              title="Listing performance"
              description="Last 7 days across everything live"
              actions={<LinkButton href="/phase1/performance" variant="link" className="text-[13px]">Full report <ArrowRight size={13} aria-hidden /></LinkButton>}
            >
              <div className="grid gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
                <div>
                  <div className="text-[12.5px] font-medium text-p1-text-3">Views, 14 days</div>
                  <MiniBars data={t.series} height={72} className="mt-2" label="Daily views across all live listings over the last 14 days" />
                  <dl className="mt-3 space-y-1.5 text-[13px]">
                    <div className="flex justify-between gap-2"><dt className="text-p1-text-2">Enquiries</dt><dd className="font-semibold tabular-nums text-p1-text">{t.enquiries7d}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-p1-text-2">Saves</dt><dd className="font-semibold tabular-nums text-p1-text">{t.saves}</dd></div>
                  </dl>
                </div>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-p1-text-3">Enquiries by listing</div>
                  <HBars className="mt-2.5" rows={ranked.slice(0, 4).map(({ l, s }) => ({ label: `${l.project} ${l.unitNo}`, hint: districtName(l.district), value: s.enquiries7d }))} />
                </div>
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="Recently updated"
            padding="none"
            actions={<LinkButton href="/phase1/listings" variant="link" className="text-[13px]">All listings <ArrowRight size={13} aria-hidden /></LinkButton>}
          >
            <ul className="divide-y divide-p1-border">
              {recent.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <Link href={`/phase1/listings/${l.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <PropertyCell l={l} sub={`${l.unitNo} · ${priceLabel(l).amount}${priceLabel(l).suffix} · ${districtName(l.district)}`} />
                  </Link>
                  {l.status === 'published' || l.status === 'paused' || l.status === 'expired'
                    ? <StatsInline listing={l} className="hidden shrink-0 lg:inline-flex" />
                    : <span className="hidden shrink-0 text-[12.5px] text-p1-text-3 lg:inline">Updated {(l.updatedAt ?? l.createdAt).slice(5).replace('-', '/')}</span>}
                  <HealthRing listing={l} size={30} className="hidden shrink-0 sm:inline-flex" />
                  <StatusBadge kind="listing" value={l.status} size="sm" className="shrink-0" />
                  <Menu items={a.menuFor(l, { includeView: true })} label={`Actions for ${l.project}`} />
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="space-y-4">
          {insight && (
            <Card className="border-p1-accent/40 bg-p1-accent-soft/40">
              <div className="flex items-start gap-3">
                <Lightbulb size={18} className="mt-0.5 shrink-0 text-p1-accent-text" aria-hidden />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-p1-accent-text">This week</div>
                  <div className="mt-1 text-[14.5px] font-semibold leading-6 text-p1-text">{insight.headline}</div>
                  <p className="mt-1.5 text-[13px] leading-5 text-p1-text-2">{insight.detail}</p>
                  {insight.href && (
                    <LinkButton href={insight.href} size="sm" variant="outline" className="mt-3">Act on this</LinkButton>
                  )}
                </div>
              </div>
            </Card>
          )}

          <SectionCard title="Weakest listings" description="Lowest Listing Health" padding="none">
            <ul className="divide-y divide-p1-border">
              {weakest.map((l) => {
                const h = listingHealth(l);
                return (
                  <li key={l.id}>
                    <Link href={`/phase1/listings/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-p1-subtle/60">
                      <HealthRing listing={l} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-p1-text">{l.project}</span>
                        <span className="block truncate text-[12.5px] text-p1-text-2">{h.missing[0]?.fix ?? 'Nothing missing'}</span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-p1-text-3" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          {ranked[0] && (
            <SectionCard title="Best performer" description="Most enquiries this week" padding="sm">
              <Link href={`/phase1/listings/${ranked[0].l.id}`} className="block rounded-lg hover:bg-p1-subtle/60">
                <PropertyCell l={ranked[0].l} sub={`${ranked[0].l.unitNo} · ${districtName(ranked[0].l.district)}`} />
              </Link>
              <div className="mt-3 flex items-center justify-between border-t border-p1-border pt-3 text-[13px]">
                <span className="text-p1-text-2"><span className="font-semibold tabular-nums text-p1-text">{ranked[0].s.enquiries7d}</span> enquiries · <span className="font-semibold tabular-nums text-p1-text">{ranked[0].s.views7d}</span> views</span>
                <Pulse listing={ranked[0].l} showSpark={false} />
              </div>
            </SectionCard>
          )}

          <Card padding="sm">
            <div className="flex items-center gap-2 text-[13.5px] font-semibold text-p1-text"><TrendingUp size={15} className="text-p1-text-3" aria-hidden /> Quota</div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-p1display text-[24px] font-medium tabular-nums text-p1-text">{activeListings}<span className="text-[14px] text-p1-text-3"> / {listingLimit || '—'}</span></span>
              <Pill tone={quotaPct >= 100 ? 'danger' : quotaPct >= 80 ? 'warning' : 'neutral'}>{state.plan?.name ?? 'No plan'}</Pill>
            </div>
            {listingLimit > 0 ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-p1-subtle" aria-hidden>
                <div className={cx('h-full rounded-full', quotaPct >= 100 ? 'bg-p1-danger' : quotaPct >= 80 ? 'bg-p1-warning' : 'bg-p1-primary dark:bg-p1-info')} style={{ width: `${quotaPct}%` }} />
              </div>
            ) : (
              <p className="mt-2 text-[12.5px] leading-5 text-p1-text-3">No plan is active, so no quota is allocated. These listings cannot be published yet.</p>
            )}
            <LinkButton href="/phase1/plans" variant="link" size="sm" className="mt-2 text-[13px]">Change plan</LinkButton>
          </Card>


        </div>
      </div>

      <ListingActionDialogs a={a} />

    </>
  );
}
