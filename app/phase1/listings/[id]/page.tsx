"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { PageHead, StatusChip, GateRow, Field, SpecNote } from '../../../../components/phase1/bits';
import { Gallery, PropertyImage } from '../../../../components/phase1/PropertyImage';
import { useToast } from '../../../../components/phase1/Toast';
import { useDemo } from '../../../../lib/phase1/DemoContext';
import { sgd } from '../../../../lib/phase1/data';
import { LISTING_ACTIVITY, DEFAULT_ACTIVITY, AMENITIES } from '../../../../lib/phase1/agents';
import {
  ArrowLeft, Bed, Bath, Maximize, Calendar, Sofa, MapPin, Copy, Pause, Play,
  Pencil, Eye, Lock, Check, ShieldCheck, Clock,
} from 'lucide-react';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { push } = useToast();
  const { state, setListingStatus, addListing, gate, canPublish } = useDemo();
  const [tab, setTab] = useState<'details' | 'compliance' | 'activity'>('details');
  const [publicPreview, setPublicPreview] = useState(false);

  const listing = state.listings.find((l) => l.id === id);

  if (!listing) {
    return (
      <>
        <PageHead module="M12 · Listing Management" title="Listing not found" />
        <Card className="py-12 text-center">
          <p className="text-sm text-neutral-500">
            This listing is not in the current demo state — a reset may have cleared it.
          </p>
          <Link href="/phase1/listings">
            <Button className="mt-4" variant="outline">Back to my listings</Button>
          </Link>
        </Card>
      </>
    );
  }

  const activity = LISTING_ACTIVITY[listing.reference] ?? DEFAULT_ACTIVITY;
  const amenities = AMENITIES.slice(0, 4 + (listing.sizeSqft % 4));
  const psf = (listing.monthlyRent / listing.sizeSqft).toFixed(2);

  const clone = () => {
    addListing({
      ...listing,
      id: `lst-${Math.random().toString(36).slice(2, 8)}`,
      reference: `VR-${24110 + state.listings.length}`,
      unitNo: '#—',
      status: 'draft',
      publishedAt: undefined,
      expiresAt: undefined,
      rejectionReason: undefined,
    });
    push({ tone: 'success', title: 'Listing cloned', body: 'A new draft was created without the compliance snapshot.' });
    router.push('/phase1/listings');
  };

  const publish = () => {
    if (!canPublish) {
      push({ tone: 'warn', title: 'Publication blocked', body: 'One or more gate conditions failed. See the panel on the right.' });
      return;
    }
    setListingStatus(listing.id, 'published');
    push({ tone: 'success', title: 'Listing published', body: 'Compliance snapshot frozen at publication.' });
  };

  return (
    <>
      <Link
        href="/phase1/listings"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-brand-gold"
      >
        <ArrowLeft size={13} /> My listings
      </Link>

      <PageHead
        module={`M12 · ${listing.reference}`}
        title={listing.project}
        blurb={`${listing.unitNo} · ${listing.address}, Singapore ${listing.postalCode}`}
        actions={
          <>
            <Button variant="ghost" leftIcon={<Copy size={13} />} onClick={clone}>Clone</Button>
            <Button variant="outline" leftIcon={<Pencil size={13} />}>Edit</Button>
            {listing.status === 'published' && (
              <Button variant="outline" leftIcon={<Pause size={13} />}
                onClick={() => { setListingStatus(listing.id, 'paused'); push({ tone: 'info', title: 'Listing paused' }); }}>
                Pause
              </Button>
            )}
            {listing.status === 'paused' && (
              <Button variant="gold" leftIcon={<Play size={13} />}
                onClick={() => { setListingStatus(listing.id, 'published'); push({ tone: 'success', title: 'Listing resumed' }); }}>
                Resume
              </Button>
            )}
            {(listing.status === 'draft' || listing.status === 'rejected') && (
              <Button variant="gold" leftIcon={!canPublish ? <Lock size={13} /> : undefined} onClick={publish}>
                Publish
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <Gallery seed={listing.reference + listing.project} count={Math.max(1, listing.images)} />

          {/* headline facts */}
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                    {sgd(listing.monthlyRent)}
                  </span>
                  <span className="text-sm text-neutral-500">per month</span>
                </div>
                <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  S${psf} psf · minimum {listing.minLeaseMonths}-month lease
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusChip status={listing.status} />
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
                  D{String(listing.district).padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
              {[
                { icon: Bed, label: 'Bedrooms', value: listing.bedrooms },
                { icon: Bath, label: 'Bathrooms', value: listing.bathrooms },
                { icon: Maximize, label: 'Floor area', value: `${listing.sizeSqft.toLocaleString()} sqft` },
                { icon: Sofa, label: 'Furnishing', value: listing.furnishing.replace(' furnished', '') },
              ].map((f) => (
                <div key={f.label} className="flex items-start gap-2.5">
                  <f.icon size={15} className="mt-0.5 flex-shrink-0 text-brand-gold" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500">{f.label}</div>
                    <div className="truncate text-sm font-medium text-foreground">{f.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* tabs */}
          <Card className="p-0">
            <div className="flex border-b border-border">
              {([
                ['details', 'Details'],
                ['compliance', 'Compliance'],
                ['activity', 'Activity'],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`relative px-5 py-3 text-xs font-medium transition-colors ${
                    tab === k ? 'text-foreground' : 'text-neutral-500 hover:text-foreground'
                  }`}
                >
                  {label}
                  {tab === k && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-gold" />}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === 'details' && (
                <>
                  <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                    {listing.description ?? 'No description recorded for this listing yet.'}
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field label="Property type" value={listing.propertyType} />
                    <Field label="Available from" value={listing.availableFrom} />
                    <Field label="Postal code" value={<span className="font-mono">{listing.postalCode}</span>} />
                    <Field label="Unit" value={<span className="font-mono">{listing.unitNo}</span>} />
                  </div>
                  <div className="mt-5">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Amenities</div>
                    <div className="flex flex-wrap gap-1.5">
                      {amenities.map((a) => (
                        <span key={a} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
                          {a}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-neutral-400">
                      Selected from a controlled vocabulary, so Phase 2 can build search facets from them.
                    </p>
                  </div>
                </>
              )}

              {tab === 'compliance' && (
                <>
                  <div className="rounded-lg border border-border bg-neutral-50 p-4 dark:bg-neutral-950/40">
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-brand-gold" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                        Compliance snapshot
                      </span>
                      {listing.status === 'published' ? (
                        <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          Frozen
                        </span>
                      ) : (
                        <span className="ml-auto rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          Captured on publish
                        </span>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Salesperson" value={listing.agent} />
                      <Field label="CEA registration no." value={<span className="font-mono">{state.profile.ceaNumber}</span>} />
                      <Field label="Agency" value={state.profile.agency} />
                      <Field label="Agency licence no." value={<span className="font-mono">{state.profile.agencyLicence}</span>} />
                    </div>
                    {listing.publishedAt && (
                      <div className="mt-3 border-t border-border pt-3 text-[11px] text-neutral-500">
                        Captured {listing.publishedAt}. Rendered from this copy, never from the live profile.
                      </div>
                    )}
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                    Advertising rules require the salesperson name, registration number and agency licence
                    number on every property advertisement. Freezing them at publication means that if this
                    agent later moves agency, advertisements already live keep showing the licence that was
                    correct when they went out — which matters both for compliance and as evidence if a
                    listing is ever disputed.
                  </p>
                </>
              )}

              {tab === 'activity' && (
                <ol className="space-y-4">
                  {activity.map((a, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-gold" />
                        {i < activity.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                      </div>
                      <div className="min-w-0 pb-1">
                        <div className="text-xs text-foreground">{a.what}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-500">
                          <span className="font-mono">{a.at}</span>
                          <span className={a.actor === 'system' ? 'text-neutral-400' : 'text-brand-gold'}>{a.actor}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>

          {listing.status === 'rejected' && listing.rejectionReason && (
            <Card className="border-red-300/60 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/20">
              <div className="text-xs font-semibold text-foreground">Rejected in moderation</div>
              <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">{listing.rejectionReason}</p>
              <p className="mt-2 text-[11px] text-neutral-500">
                Correct the listing and resubmit. A specific reason produces a fix; a bare rejection produces a support ticket.
              </p>
            </Card>
          )}
        </div>

        {/* right rail */}
        <div className="space-y-3">
          <Card className={canPublish ? '' : 'border-red-300/60 dark:border-red-900/60'}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Publish gate</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${canPublish ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {canPublish ? 'Passing' : 'Blocked'}
              </span>
            </div>
            <div>
              {gate.map((g) => (
                <GateRow key={g.id} pass={g.pass} label={g.label} detail={g.detail} fixHref={g.fixHref} fixLabel={g.fixLabel} />
              ))}
            </div>
          </Card>

          <Card>
            <button
              onClick={() => setPublicPreview((v) => !v)}
              className="flex w-full items-center gap-2 text-left"
            >
              <Eye size={14} className="text-brand-gold" />
              <span className="flex-1 text-xs font-semibold text-foreground">Phase 2 public preview</span>
              <span className="text-[10px] text-neutral-400">{publicPreview ? 'Hide' : 'Show'}</span>
            </button>
            {publicPreview && (
              <div className="mt-3 overflow-hidden rounded-lg border border-border">
                <PreviewCard
                  seed={listing.reference + listing.project}
                  project={listing.project}
                  price={sgd(listing.monthlyRent)}
                  meta={`${listing.bedrooms} bed · ${listing.bathrooms} bath · ${listing.sizeSqft} sqft`}
                  district={`D${String(listing.district).padStart(2, '0')}`}
                  agent={listing.agent}
                  cea={state.profile.ceaNumber}
                />
              </div>
            )}
            <p className="mt-2.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              Rendered from the public read model that already exists in Phase 1 — which is why Phase 2 is
              exposure and caching rather than a new API.
            </p>
          </Card>

          <Card>
            <div className="mb-2.5 text-xs font-semibold text-foreground">Lifecycle</div>
            <div className="space-y-2.5 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-500">Created</span>
                <span className="font-mono text-foreground">{listing.createdAt}</span>
              </div>
              {listing.publishedAt && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-neutral-500">Published</span>
                  <span className="font-mono text-foreground">{listing.publishedAt}</span>
                </div>
              )}
              {listing.expiresAt && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-neutral-500">Expires</span>
                  <span className="font-mono text-foreground">{listing.expiresAt}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-500">Photographs</span>
                <span className="font-mono text-foreground">{listing.images}</span>
              </div>
            </div>
          </Card>

          <Card className="border-dashed">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-500">Performance — Phase 2</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              Views, impressions and enquiries appear here once the public site exists. View events are
              captured from day one so this chart opens with history rather than empty.
            </p>
          </Card>
        </div>
      </div>

      <SpecNote>
        This screen reads from one listing record and one compliance snapshot. Note that publishing here
        runs exactly the same gate as the create wizard and bulk import — there is one publish path in the
        system, not three.
      </SpecNote>
    </>
  );
}

/** A miniature of the Phase 2 public listing card. */
function PreviewCard({
  seed, project, price, meta, district, agent, cea,
}: { seed: string; project: string; price: string; meta: string; district: string; agent: string; cea: string }) {
  return (
    <div className="bg-card">
      <div className="relative">
        <PropertyImage seed={seed} variant={0} rounded="rounded-none" className="aspect-[16/10] w-full" />
        <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white backdrop-blur">
          Verified agent
        </span>
      </div>
      <div className="p-3">
        <div className="text-sm font-semibold tabular-nums text-foreground">{price}<span className="text-[10px] font-normal text-neutral-400">/mo</span></div>
        <div className="mt-0.5 truncate text-xs font-medium text-foreground">{project}</div>
        <div className="mt-0.5 text-[10px] text-neutral-500">{meta} · {district}</div>
        <div className="mt-2 border-t border-border pt-2 text-[9px] leading-tight text-neutral-500">
          {agent} · CEA {cea}
        </div>
      </div>
    </div>
  );
}
