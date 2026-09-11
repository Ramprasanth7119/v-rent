"use client";

/**
 * Listing detail.
 *
 * Order follows what the agent is actually checking: is it live and healthy →
 * what does it earn → what does it say → who asked → is it compliant → what happened.
 * Every mutation goes through `useListingActions`, the same path the listings
 * page and the cards use, so there is one publish gate in the product.
 */

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Button, LinkButton, Card, SectionCard, PageHeader, Callout, Field, FieldGrid, Tabs, KeyValue, EmptyState,
  Menu, Metric, MetricStrip, MiniBars, SkeletonPage, cx } from '../../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../../components/phase1/status';
import { Gallery } from '../../../../components/phase1/PropertyImage';
import { useListingActions, ListingActionDialogs } from '../../../../components/phase1/listing/actions';
import { HealthPanel, HealthRing } from '../../../../components/phase1/listing/health';
import { PublicPreview } from '../../../../components/phase1/listing/PublicPreview';
import { listingPhotos } from '../../../../lib/phase1/photos';
import { useSession } from '../../../../lib/phase1/SessionContext';
import { useDemo } from '../../../../lib/phase1/DemoContext';
import { sgd } from '../../../../lib/phase1/data';
import { LISTING_ACTIVITY, DEFAULT_ACTIVITY, AMENITIES } from '../../../../lib/phase1/agents';
import { listingStats, enquiriesFor, ENQUIRY_STATUS, districtName } from '../../../../lib/phase1/performance';
import {
  ArrowLeft, Bed, Bath, Maximize, Sofa, Pencil, Eye, Lock, Check, X, ShieldCheck, Building2, Send, Play, Pause,
  RotateCcw, Eye as EyeIcon, MessageSquare, Bookmark, TrendingUp, CalendarDays, TrainFront, MapPin, Percent } from 'lucide-react';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
const district = (n: number) => `D${String(n).padStart(2, '0')}`;

const TABS = ['overview', 'performance', 'enquiries', 'compliance', 'activity', 'preview'] as const;
type Tab = (typeof TABS)[number];

export default function ListingDetailPage() {
  return (
    <Suspense fallback={<SkeletonPage metrics={4} />}>
      <ListingDetailBody />
    </Suspense>
  );
}

function ListingDetailBody() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { state, gate, canPublish } = useDemo();
  const { user } = useSession();
  const a = useListingActions();

  const requested = params.get('tab');
  const fromUrl = (v: string | null): Tab => (TABS.includes(v as Tab) ? (v as Tab) : 'overview');
  /**
   * The tab is chosen by the reader, but a `?tab=` link — a notification, or the
   * actions menu — must win even when the page is already mounted. Adjusting the
   * state during render is React's documented alternative to an effect here.
   */
  const [ui, setUi] = useState<{ param: string | null; tab: Tab }>({ param: requested, tab: fromUrl(requested) });
  if (ui.param !== requested) setUi({ param: requested, tab: fromUrl(requested) });
  const tab = ui.tab;
  const setTab = (t: Tab) => setUi({ param: requested, tab: t });

  const listing = state.listings.find((l) => l.id === id);

  if (!listing) {
    return (
      <>
        <PageHeader eyebrow="Listings" title="Listing not found" crumbs={[{ label: 'Listings', href: '/phase1/listings' }, { label: 'Not found' }]} />
        <Card>
          <EmptyState
            icon={<Building2 size={26} />}
            title="This listing is not in the current walkthrough"
            description="A reset may have cleared it. Go back to your listings to continue."
            action={<LinkButton href="/phase1/listings" variant="outline" leftIcon={<ArrowLeft size={16} />}>Back to my listings</LinkButton>}
          />
        </Card>
      </>
    );
  }

  const l = listing;
  const stats = listingStats(l);
  const enquiries = enquiriesFor(state.enquiries, l.id);
  const newEnquiries = enquiries.filter((e) => e.status === 'new').length;
  const activity = LISTING_ACTIVITY[l.reference] ?? DEFAULT_ACTIVITY;
  const amenities = l.amenities?.length ? l.amenities : AMENITIES.slice(0, 4 + (l.sizeSqft % 4));
  const psf = (l.monthlyRent / l.sizeSqft).toFixed(2);
  const isLive = l.status === 'published' || l.status === 'paused' || l.status === 'expired';
  const editHref = `/phase1/listings/new?edit=${l.id}`;

  /** One primary action per state; everything else is in the menu. */
  const primary =
    l.status === 'draft' || l.status === 'rejected' ? (
      <Button variant="primary" leftIcon={canPublish ? <Send size={16} /> : <Lock size={16} />} onClick={() => a.setPending({ kind: 'publish', listing: l })}>
        {l.status === 'rejected' ? 'Resubmit' : 'Publish'}
      </Button>
    ) : l.status === 'paused' ? (
      <Button variant="primary" leftIcon={<Play size={16} />} onClick={() => a.resume(l)}>Resume</Button>
    ) : l.status === 'expired' ? (
      <Button variant="primary" leftIcon={<RotateCcw size={16} />} onClick={() => a.setPending({ kind: 'renew', listing: l })}>Renew for 90 days</Button>
    ) : (
      <Button variant="outline" leftIcon={<Pause size={16} />} onClick={() => a.setPending({ kind: 'pause', listing: l })}>Pause</Button>
    );

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Listings', href: '/phase1/listings' }, { label: l.reference }]}
        title={l.project}
        description={`${l.unitNo} · ${l.address}, Singapore ${l.postalCode}`}
        meta={
          <>
            <StatusBadge kind="listing" value={l.status} size="lg" />
            <Pill>{district(l.district)} {districtName(l.district)}</Pill>
            <Pill>{l.reference}</Pill>
            <Pill>{l.propertyType}</Pill>
            <HealthRing listing={l} size={30} showLabel className="ml-1" />
          </>
        }
        actions={
          <>
            <LinkButton href={editHref} variant="outline" leftIcon={<Pencil size={16} />}>Edit</LinkButton>
            {primary}
            <Menu items={a.menuFor(l)} label={`More actions for ${l.project}`} size="md" />
          </>
        }
      />

      {l.status === 'rejected' && l.rejectionReason && (
        <Callout tone="danger" title="Rejected in moderation" className="mb-5"
          action={<LinkButton href={editHref} variant="outline" size="sm">Correct the listing</LinkButton>}>
          {l.rejectionReason} Fix it, then resubmit — it goes through the same checks as a new listing.
        </Callout>
      )}

      {l.status === 'expired' && (
        <Callout tone="warning" title="This listing has expired" className="mb-5">
          It is no longer visible to tenants and has released its quota slot. Renewing puts it live for another 90 days and
          takes a slot again.
        </Callout>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Gallery seed={l.reference + l.project} count={Math.max(1, l.images)} srcs={listingPhotos(user?.id, l)} />

          <Card>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-p1display text-[34px] font-medium leading-none tabular-nums text-p1-text">{sgd(l.monthlyRent)}</span>
                  <span className="text-[15px] text-p1-text-2">per month</span>
                </div>
                <div className="mt-2 text-[14px] text-p1-text-2">S${psf} psf · minimum {l.minLeaseMonths}-month lease · available from {fmtDate(l.availableFrom)}</div>
              </div>
              {isLive && stats.views30d > 0 && (
                <div className="text-right">
                  <div className="text-[13px] text-p1-text-3">Last 7 days</div>
                  <div className="text-[15px] font-semibold tabular-nums text-p1-text">{stats.views7d} views · {stats.enquiries7d} enquiries</div>
                </div>
              )}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-p1-border pt-5 sm:grid-cols-4">
              {[
                { icon: Bed, label: 'Bedrooms', value: l.bedrooms },
                { icon: Bath, label: 'Bathrooms', value: l.bathrooms },
                { icon: Maximize, label: 'Floor area', value: `${l.sizeSqft.toLocaleString()} sqft` },
                { icon: Sofa, label: 'Furnishing', value: l.furnishing.replace(' furnished', '') },
              ].map((f) => (
                <div key={f.label} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-p1-subtle text-p1-accent-text" aria-hidden><f.icon size={18} /></span>
                  <div className="min-w-0">
                    <div className="text-[13px] text-p1-text-3">{f.label}</div>
                    <div className="truncate text-[15px] font-semibold text-p1-text">{f.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="none">
            <div className="px-5 sm:px-6">
              <Tabs<Tab>
                value={tab}
                onChange={setTab}
                label="Listing sections"
                items={[
                  { key: 'overview', label: 'Overview' },
                  { key: 'performance', label: 'Performance' },
                  { key: 'enquiries', label: 'Enquiries', count: enquiries.length },
                  { key: 'compliance', label: 'Compliance' },
                  { key: 'activity', label: 'Activity', count: activity.length },
                  { key: 'preview', label: 'Tenant view' },
                ]}
              />
            </div>
            <div className={cx(tab === 'preview' ? 'p-3 sm:p-4' : 'p-5 sm:p-6')}>
              {tab === 'overview' && (
                <>
                  <h2 className="text-[14px] font-semibold text-p1-text">Description</h2>
                  <p className="mt-1.5 whitespace-pre-line text-[15px] leading-7 text-p1-text">
                    {l.description ?? <span className="text-p1-text-3">No description recorded yet. Listings with a written description receive noticeably more enquiries.</span>}
                  </p>
                  <h2 className="mt-6 text-[14px] font-semibold text-p1-text">Listing information</h2>
                  <FieldGrid cols={3} className="mt-2.5">
                    <Field label="Property type" value={l.propertyType} />
                    <Field label="Unit" value={l.unitNo} mono />
                    <Field label="Postal code" value={l.postalCode} mono />
                    <Field label="Available from" value={fmtDate(l.availableFrom)} />
                    <Field label="Minimum lease" value={`${l.minLeaseMonths} months`} />
                    <Field label="Deposit" value={typeof l.depositMonths === 'number' ? `${l.depositMonths} month${l.depositMonths === 1 ? '' : 's'}` : 'Not stated'} />
                    <Field label="Nearest MRT" value={l.nearestMrt ?? 'Not stated'} />
                    <Field label="Floor plan" value={l.hasFloorPlan ? 'Attached' : 'Not attached'} />
                    <Field label="Photos" value={`${l.images}`} />
                  </FieldGrid>
                  <h2 className="mt-6 text-[14px] font-semibold text-p1-text">Amenities</h2>
                  <div className="mt-2 flex flex-wrap gap-2">{amenities.map((x) => <Pill key={x}>{x}</Pill>)}</div>
                </>
              )}

              {tab === 'performance' && (
                isLive && stats.views30d > 0 ? (
                  <>
                    <MetricStrip cols={4}>
                      <Metric label="Views" value={stats.views30d.toLocaleString()} icon={<EyeIcon size={15} />} hint="Last 30 days" />
                      <Metric label="Enquiries" value={stats.enquiries30d} icon={<MessageSquare size={15} />} hint="Last 30 days"
                        delta={{ value: `${stats.trendPct > 0 ? '+' : ''}${stats.trendPct}%`, good: stats.trendPct >= 0, label: 'week on week' }} />
                      <Metric label="Saves" value={stats.saves} icon={<Bookmark size={15} />} hint="Shortlisted by a tenant" />
                      <Metric label="Enquiry rate" value={`${stats.conversion}%`} icon={<Percent size={15} />}
                        tone={stats.conversion >= 5 ? 'success' : stats.conversion >= 3 ? 'default' : 'warning'} hint="Per 100 views" />
                    </MetricStrip>
                    <h2 className="mt-6 text-[14px] font-semibold text-p1-text">Daily views, last 14 days</h2>
                    <MiniBars data={stats.series} height={88} className="mt-3" label={`Daily views for ${l.project} over the last 14 days`} />
                    <div className="mt-2 flex justify-between text-[12px] text-p1-text-3"><span>14 days ago</span><span>Today</span></div>
                    <Callout tone="neutral" compact className="mt-5">
                      The public tenant site opens in Phase 2, so these figures are not yet measured. What is being reviewed
                      here is the report an agent gets, and where it sits.
                    </Callout>
                  </>
                ) : (
                  <EmptyState
                    icon={<TrendingUp size={22} />}
                    title="No traffic yet"
                    description={l.status === 'draft' || l.status === 'pending_review' || l.status === 'rejected'
                      ? 'Views and enquiries start once the listing is published.'
                      : 'This listing has not been seen yet.'}
                    action={(l.status === 'draft' || l.status === 'rejected') && (
                      <Button variant="primary" leftIcon={<Send size={15} />} onClick={() => a.setPending({ kind: 'publish', listing: l })}>Publish now</Button>
                    )}
                  />
                )
              )}

              {tab === 'enquiries' && (
                enquiries.length === 0 ? (
                  <EmptyState
                    icon={<MessageSquare size={22} />}
                    title="No enquiries for this listing"
                    description="Enquiries from the share link and the tenant site land here, with the tenant's budget and move-in date."
                  />
                ) : (
                  <ul className="divide-y divide-p1-border">
                    {enquiries.map((e) => (
                      <li key={e.id} className={cx('flex gap-3 py-4 first:pt-0 last:pb-0', e.status === 'new' && '-mx-3 rounded-lg bg-p1-info-soft/25 px-3')}>
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full" aria-hidden style={{ background: e.status === 'new' ? 'var(--p1-info)' : 'var(--p1-border-strong)' }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[14px] font-semibold text-p1-text">{e.name}</span>
                            <Pill tone={ENQUIRY_STATUS[e.status].tone}>{ENQUIRY_STATUS[e.status].label}</Pill>
                            <span className="text-[12.5px] text-p1-text-3">via {e.channel}</span>
                            <time className="ml-auto text-[12.5px] tabular-nums text-p1-text-3">{e.at}</time>
                          </div>
                          <p className="mt-1 text-[14px] leading-6 text-p1-text">{e.message}</p>
                          {(e.budget || e.moveIn) && (
                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-p1-text-2">
                              {e.budget && <span>Budget {sgd(e.budget)}/mo</span>}
                              {e.moveIn && <span className="inline-flex items-center gap-1"><CalendarDays size={12} aria-hidden /> Move-in {fmtDate(e.moveIn)}</span>}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {tab === 'compliance' && (
                <>
                  <div className="rounded-xl border border-p1-border bg-p1-subtle/50 p-4 sm:p-5">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <ShieldCheck size={18} className="text-p1-accent-text" aria-hidden />
                      <span className="text-[15px] font-semibold text-p1-text">Compliance snapshot</span>
                      {isLive
                        ? <Pill tone="success" className="ml-auto">Frozen at publication</Pill>
                        : <Pill className="ml-auto">Captured on publish</Pill>}
                    </div>
                    <FieldGrid cols={2}>
                      <Field label="Salesperson" value={l.agent} />
                      <Field label="CEA registration no." value={state.profile.ceaNumber} mono />
                      <Field label="Agency" value={state.profile.agency} />
                      <Field label="Agency licence no." value={state.profile.agencyLicence} mono />
                    </FieldGrid>
                    {l.publishedAt && <div className="mt-4 border-t border-p1-border pt-3 text-[13px] text-p1-text-3">Captured {fmtDate(l.publishedAt)}. Shown from this copy, never from the live profile.</div>}
                  </div>
                  <p className="mt-4 text-[14px] leading-6 text-p1-text-2">
                    Singapore advertising rules require the salesperson name, registration number and agency licence number on
                    every property advertisement. These are frozen when a listing goes live, so a later change of agency never
                    alters an advertisement that was correct when published.
                  </p>
                </>
              )}

              {tab === 'activity' && (
                <ol className="space-y-5">
                  {activity.map((x, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', x.actor === 'system' ? 'bg-p1-text-3' : 'bg-p1-accent')} aria-hidden />
                        {i < activity.length - 1 && <span className="mt-1 w-px flex-1 bg-p1-border" aria-hidden />}
                      </div>
                      <div className="min-w-0 pb-1">
                        <div className="text-[14px] text-p1-text">{x.what}</div>
                        <div className="mt-0.5 text-[13px] text-p1-text-3">{x.at} · {x.actor === 'system' ? 'System' : x.actor}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {tab === 'preview' && (
                <>
                  <p className="mb-3 px-1 text-[13px] text-p1-text-2">
                    Exactly what a tenant sees on the share link, rendered from this listing record.
                  </p>
                  <PublicPreview listing={l} agent={state.profile} photos={listingPhotos(user?.id, l)} />
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <SectionCard title="Listing Health" padding="sm">
            <HealthPanel listing={l} fixHref={(section) => `${editHref}&step=${section}`} />
          </SectionCard>

          <SectionCard
            title="Publication checklist"
            description={canPublish ? 'All checks passed' : 'Action needed before publishing'}
            padding="sm"
            icon={canPublish ? <Check size={18} className="text-p1-success" /> : <X size={18} className="text-p1-danger" />}
          >
            <ul className="divide-y divide-p1-border">
              {gate.map((g) => (
                <li key={g.id} className="flex items-start gap-3 py-3">
                  <span className={cx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', g.pass ? 'bg-p1-success-soft text-p1-success' : 'bg-p1-danger-soft text-p1-danger')} aria-hidden>
                    {g.pass ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-p1-text">{g.label}<span className="sr-only">{g.pass ? ' — passed' : ' — failed'}</span></div>
                    <div className="mt-0.5 text-[13px] text-p1-text-2">{g.detail}</div>
                    {!g.pass && g.fixHref && <Link href={g.fixHref} className="mt-1 inline-block text-[13px] font-semibold text-p1-accent-text underline-offset-4 hover:underline">{g.fixLabel} →</Link>}
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Where it is" padding="sm">
            <ul className="space-y-2 text-[13.5px] text-p1-text">
              <li className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-p1-text-3" aria-hidden />{l.address}, Singapore {l.postalCode}</li>
              <li className="flex items-center gap-2"><Building2 size={15} className="shrink-0 text-p1-text-3" aria-hidden />{district(l.district)} · {districtName(l.district)}</li>
              {l.nearestMrt && <li className="flex items-center gap-2"><TrainFront size={15} className="shrink-0 text-p1-text-3" aria-hidden />{l.nearestMrt}</li>}
            </ul>
          </SectionCard>

          <SectionCard title="Record" padding="sm">
            <KeyValue rows={[
              { k: 'Created', v: fmtDate(l.createdAt) },
              ...(l.publishedAt ? [{ k: 'Published', v: fmtDate(l.publishedAt) }] : []),
              ...(l.expiresAt ? [{ k: 'Expires', v: fmtDate(l.expiresAt) }] : []),
              { k: 'Photos', v: l.images },
              ...(newEnquiries ? [{ k: 'New enquiries', v: newEnquiries }] : []),
              { k: 'Last updated', v: fmtDate(l.updatedAt ?? l.createdAt) },
            ]} />
            <Button variant="outline" size="sm" block className="mt-3" leftIcon={<Eye size={15} />} onClick={() => setTab('preview')}>
              See the tenant view
            </Button>
          </SectionCard>
        </div>
      </div>

      <ListingActionDialogs a={a} />

    </>
  );
}
