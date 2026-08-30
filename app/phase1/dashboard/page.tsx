"use client";

import Link from 'next/link';
import { Plus, Upload, Check, X, ChevronRight, Lightbulb, SlidersHorizontal, Building2, FileText, CircleDashed, CreditCard, ChevronDown } from 'lucide-react';
import {
  Button, LinkButton, Card, SectionCard, PageHeader, StatCard, PresenterNote, EmptyState, cx,
} from '../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../components/phase1/status';
import { PropertyImage } from '../../../components/phase1/PropertyImage';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { sgd } from '../../../lib/phase1/data';
import { LISTING_ACTIVITY } from '../../../lib/phase1/agents';

const TODAY = new Date('2026-08-28');

export default function DashboardPage() {
  const { state, set, gate, canPublish, activeListings, listingLimit } = useDemo();
  const first = state.profile.fullName.split(' ')[0];

  const drafts = state.listings.filter((l) => l.status === 'draft');
  const published = state.listings.filter((l) => l.status === 'published');
  const quotaPct = listingLimit ? Math.min(100, Math.round((activeListings / listingLimit) * 100)) : 0;

  const attention = [
    ...state.listings.filter((l) => l.status === 'rejected').map((l) => ({ l, why: l.rejectionReason ?? 'Rejected in moderation', tone: 'danger' as const })),
    ...drafts.filter((l) => l.images === 0).map((l) => ({ l, why: 'Draft has no photographs yet', tone: 'warning' as const })),
    ...state.listings.filter((l) => l.status === 'pending_review').map((l) => ({ l, why: 'Waiting for a moderator', tone: 'info' as const })),
    ...published.filter((l) => l.expiresAt && (new Date(l.expiresAt).getTime() - TODAY.getTime()) / 86400000 <= 30)
      .map((l) => ({ l, why: `Expires on ${l.expiresAt}`, tone: 'warning' as const })),
  ];

  const activity = [
    { at: '2026-08-28 09:40', what: 'Rivercove Residences submitted for review' },
    { at: '2026-08-27 16:05', what: 'Parc Esta saved as a draft' },
    ...(LISTING_ACTIVITY['VR-24081'] ?? []).slice(0, 3).map((a) => ({ at: a.at, what: `The Sail @ Marina Bay — ${a.what}` })),
  ];

  const fewPhotos = state.listings.filter((l) => l.images < 5 && l.status !== 'expired').length;
  const recent = [...state.listings].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)).slice(0, 5);

  const needs = attention.length;

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Good morning, ${first}`}
        description={needs ? `${needs} listing${needs === 1 ? '' : 's'} need${needs === 1 ? 's' : ''} your attention today.` : 'Everything is in order. Nothing needs your attention right now.'}
        actions={<>
          <LinkButton href="/phase1/listings/import" variant="outline" leftIcon={<Upload size={16} />}>Bulk import</LinkButton>
          <LinkButton href="/phase1/listings/new" variant="accent" leftIcon={<Plus size={16} />}>Create listing</LinkButton>
        </>}
      />

      <div className="vr-stagger mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active listings" icon={<Building2 size={16} />} value={listingLimit ? `${activeListings} / ${listingLimit}` : '—'}
          hint={listingLimit ? `${listingLimit - activeListings} remaining on ${state.plan?.name}` : 'Choose a plan to get a quota'}
          progress={listingLimit ? quotaPct : undefined} tone={listingLimit && activeListings >= listingLimit ? 'danger' : 'default'} href="/phase1/listings" />
        <StatCard label="Published" icon={<Check size={16} />} value={published.length} hint="Visible once the public site opens" tone="success" />
        <StatCard label="Drafts" icon={<CircleDashed size={16} />} value={drafts.length} hint="Saved, not yet submitted" />
        <StatCard label="Plan" icon={<CreditCard size={16} />} value={state.plan?.name ?? 'None'} hint={<StatusBadge kind="subscription" value={state.subscription} size="sm" />} href="/phase1/plans" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <SectionCard
            title="Ready to publish?"
            description="Every listing must pass these checks before it goes live."
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
                <li key={g.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-5 py-3.5 sm:px-6 sm:flex-nowrap">
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

          <SectionCard title="Needs your attention" description={needs ? `${needs} item${needs === 1 ? '' : 's'}` : undefined} padding="none">
            {needs === 0 ? (
              <EmptyState compact icon={<Check size={20} />} title="Nothing outstanding" description="All your listings are in good shape." />
            ) : (
              <ul className="divide-y divide-p1-border">
                {attention.map(({ l, why, tone }) => (
                  <li key={l.id + why}>
                    <Link href={`/phase1/listings/${l.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-p1-subtle/60 sm:px-6">
                      <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', { danger: 'bg-p1-danger', warning: 'bg-p1-warning', info: 'bg-p1-info' }[tone])} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium text-p1-text">{l.project} <span className="font-normal text-p1-text-3">{l.unitNo}</span></div>
                        <div className="mt-0.5 text-[13px] text-p1-text-2">{why}</div>
                      </div>
                      <StatusBadge kind="listing" value={l.status} size="sm" className="hidden sm:inline-flex" />
                      <ChevronRight size={16} className="shrink-0 text-p1-text-3" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Recent activity" padding="none">
            <ol className="divide-y divide-p1-border">
              {activity.map((a, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-3 sm:px-6">
                  <FileText size={16} className="mt-0.5 shrink-0 text-p1-text-3" aria-hidden />
                  <div className="min-w-0 flex-1 text-[14px] text-p1-text">{a.what}</div>
                  <time className="shrink-0 text-[13px] tabular-nums text-p1-text-3">{a.at}</time>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Recent listings" padding="none" actions={<LinkButton href="/phase1/listings" variant="link" className="text-[13px]">View all</LinkButton>}>
            <ul className="divide-y divide-p1-border">
              {recent.map((l) => (
                <li key={l.id}>
                  <Link href={`/phase1/listings/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-p1-subtle/60">
                    <PropertyImage seed={l.reference + l.project} variant={0} className="h-11 w-16 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium text-p1-text">{l.project}</div>
                      <div className="text-[13px] text-p1-text-2">{l.unitNo} · {sgd(l.monthlyRent)}/mo</div>
                    </div>
                    <StatusBadge kind="listing" value={l.status} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>

          <Card className="border-p1-accent/40 bg-p1-accent-soft/40">
            <div className="flex items-start gap-3">
              <Lightbulb size={18} className="mt-0.5 shrink-0 text-p1-accent-text" aria-hidden />
              <div>
                <div className="text-[14px] font-semibold text-p1-text">Recommendations</div>
                <ul className="mt-2 space-y-2 text-[13px] leading-5 text-p1-text-2">
                  <li>{fewPhotos} listing{fewPhotos === 1 ? ' has' : 's have'} fewer than 5 photos. Listings with 10 or more photos receive noticeably more enquiries.</li>
                  <li>{drafts.length} draft{drafts.length === 1 ? '' : 's'} could be published today with your remaining quota.</li>
                </ul>
              </div>
            </div>
          </Card>

          <details className="group rounded-2xl border border-dashed border-p1-border bg-p1-surface">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[14px] font-medium text-p1-text-2 hover:text-p1-text">
              <SlidersHorizontal size={15} aria-hidden /> Presenter controls <Pill tone="neutral">Prototype</Pill>
              <ChevronDown size={15} className="ml-auto transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-p1-border px-4 py-3">
              <p className="mb-3 text-[13px] text-p1-text-3">Break each publish condition to show the gate refusing publication.</p>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" aria-pressed={!state.ceaValid} onClick={() => set({ ceaValid: !state.ceaValid })}>{state.ceaValid ? 'Lapse the CEA registration' : 'Restore CEA registration'}</Button>
                <Button size="sm" variant="outline" aria-pressed={state.subscription !== 'active'} onClick={() => set({ subscription: state.subscription === 'active' ? 'expired' : 'active' })}>{state.subscription === 'active' ? 'Expire the subscription' : 'Reactivate subscription'}</Button>
                <Button size="sm" variant="outline" aria-pressed={state.subscription === 'past_due'} onClick={() => set({ subscription: state.subscription === 'past_due' ? 'active' : 'past_due' })}>{state.subscription === 'past_due' ? 'Clear the failed payment' : 'Fail the renewal payment'}</Button>
                <Button size="sm" variant="outline" aria-pressed={state.approval === 'suspended'} onClick={() => set({ approval: state.approval === 'suspended' ? 'approved' : 'suspended' })}>{state.approval === 'suspended' ? 'Reinstate the agent' : 'Suspend the agent'}</Button>
              </div>
              <p className="mt-3 text-[13px] text-p1-text-3">A failed renewal moves the agent to past due; publication is still allowed during the grace period (length is open question O5).</p>
            </div>
          </details>
        </div>
      </div>

      <PresenterNote>
        Everything on this screen is derived from one entitlement service; no screen counts listings for itself. Denials are structured — the service returns the reason, current usage and the applicable limit, so the interface can say “30 of 30 listings used on Professional” rather than “forbidden”.
      </PresenterNote>
    </>
  );
}
