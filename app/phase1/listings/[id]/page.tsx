"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Button, LinkButton, Card, SectionCard, PageHeader, Callout, Field, FieldGrid, Tabs, KeyValue, EmptyState, PresenterNote, cx,
} from '../../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../../components/phase1/status';
import { ConfirmDialog } from '../../../../components/phase1/overlays';
import { useToast } from '../../../../components/phase1/Toast';
import { Gallery, PropertyImage } from '../../../../components/phase1/PropertyImage';
import { useDemo } from '../../../../lib/phase1/DemoContext';
import { sgd } from '../../../../lib/phase1/data';
import { LISTING_ACTIVITY, DEFAULT_ACTIVITY, AMENITIES } from '../../../../lib/phase1/agents';
import {
  ArrowLeft, Bed, Bath, Maximize, Sofa, Copy, Pause, Play, Pencil, Eye, EyeOff, Lock, Check, X, ShieldCheck, BarChart3, Building2,
} from 'lucide-react';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
const district = (n: number) => `D${String(n).padStart(2, '0')}`;

type Tab = 'details' | 'compliance' | 'activity';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { push } = useToast();
  const { state, setListingStatus, addListing, gate, canPublish } = useDemo();
  const [tab, setTab] = useState<Tab>('details');
  const [publicPreview, setPublicPreview] = useState(false);
  const [confirm, setConfirm] = useState<null | 'publish' | 'pause'>(null);

  const listing = state.listings.find((l) => l.id === id);

  if (!listing) {
    return (
      <>
        <PageHeader eyebrow="Listings" title="Listing not found" crumbs={[{ label: 'Listings', href: '/phase1/listings' }, { label: 'Not found' }]} />
        <Card>
          <EmptyState icon={<Building2 size={26} />} title="This listing is not in the current walkthrough"
            description="A reset may have cleared it. Go back to your listings to continue."
            action={<LinkButton href="/phase1/listings" variant="outline" leftIcon={<ArrowLeft size={16} />}>Back to my listings</LinkButton>} />
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
      id: `lst-c${state.listings.length + 1}-${listing.id}`,
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
    setConfirm(null);
    if (!canPublish) {
      push({ tone: 'warn', title: 'Publication blocked', body: 'One or more checks failed. See the publication checklist.' });
      return;
    }
    setListingStatus(listing.id, 'published');
    push({ tone: 'success', title: 'Listing published', body: 'Compliance snapshot frozen at publication.' });
  };

  const pause = () => {
    setConfirm(null);
    setListingStatus(listing.id, 'paused');
    push({ tone: 'info', title: 'Listing paused', body: 'Tenants will not see it until you resume.' });
  };

  const resume = () => {
    setListingStatus(listing.id, 'published');
    push({ tone: 'success', title: 'Listing resumed' });
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Listings', href: '/phase1/listings' }, { label: listing.reference }]}
        title={listing.project}
        description={`${listing.unitNo} · ${listing.address}, Singapore ${listing.postalCode}`}
        meta={<><StatusBadge kind="listing" value={listing.status} size="lg" /><Pill>{district(listing.district)}</Pill><Pill>{listing.reference}</Pill><Pill>{listing.propertyType}</Pill></>}
        actions={
          <>
            <Button variant="outline" leftIcon={<Pencil size={16} />}>Edit</Button>
            <Button variant="outline" leftIcon={<Copy size={16} />} onClick={clone}>Clone</Button>
            {listing.status === 'published' && <Button variant="outline" leftIcon={<Pause size={16} />} onClick={() => setConfirm('pause')}>Pause</Button>}
            {listing.status === 'paused' && <Button variant="primary" leftIcon={<Play size={16} />} onClick={resume}>Resume</Button>}
            {(listing.status === 'draft' || listing.status === 'rejected') && (
              <Button variant="accent" leftIcon={!canPublish ? <Lock size={16} /> : <Check size={16} />} onClick={() => setConfirm('publish')}>Publish</Button>
            )}
          </>
        }
      />

      {listing.status === 'rejected' && listing.rejectionReason && (
        <Callout tone="danger" title="Rejected in moderation" className="mb-5">
          {listing.rejectionReason} Correct the listing, then press Publish to resubmit — it goes through the same checks as a new listing.
        </Callout>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Gallery seed={listing.reference + listing.project} count={Math.max(1, listing.images)} />

          <Card>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-p1display text-[34px] font-medium leading-none tabular-nums text-p1-text">{sgd(listing.monthlyRent)}</span>
                  <span className="text-[15px] text-p1-text-2">per month</span>
                </div>
                <div className="mt-2 text-[14px] text-p1-text-2">S${psf} psf · minimum {listing.minLeaseMonths}-month lease · available from {fmtDate(listing.availableFrom)}</div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-p1-border pt-5 sm:grid-cols-4">
              {[
                { icon: Bed, label: 'Bedrooms', value: listing.bedrooms },
                { icon: Bath, label: 'Bathrooms', value: listing.bathrooms },
                { icon: Maximize, label: 'Floor area', value: `${listing.sizeSqft.toLocaleString()} sqft` },
                { icon: Sofa, label: 'Furnishing', value: listing.furnishing.replace(' furnished', '') },
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
              <Tabs<Tab> value={tab} onChange={setTab} label="Listing sections" items={[
                { key: 'details', label: 'Details' },
                { key: 'compliance', label: 'Compliance' },
                { key: 'activity', label: 'Activity', count: activity.length },
              ]} />
            </div>
            <div className="p-5 sm:p-6">
              {tab === 'details' && (
                <>
                  <p className="text-[15px] leading-7 text-p1-text">{listing.description ?? 'No description recorded for this listing yet.'}</p>
                  <FieldGrid cols={2} className="mt-6">
                    <Field label="Property type" value={listing.propertyType} />
                    <Field label="Available from" value={fmtDate(listing.availableFrom)} />
                    <Field label="Postal code" value={listing.postalCode} mono />
                    <Field label="Unit" value={listing.unitNo} mono />
                  </FieldGrid>
                  <div className="mt-6">
                    <div className="mb-2 text-[13px] font-medium text-p1-text-3">Amenities</div>
                    <div className="flex flex-wrap gap-2">{amenities.map((a) => <Pill key={a}>{a}</Pill>)}</div>
                  </div>
                </>
              )}

              {tab === 'compliance' && (
                <>
                  <div className="rounded-xl border border-p1-border bg-p1-subtle/50 p-4 sm:p-5">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <ShieldCheck size={18} className="text-p1-accent-text" aria-hidden />
                      <span className="text-[15px] font-semibold text-p1-text">Compliance snapshot</span>
                      {listing.status === 'published' || listing.status === 'paused' || listing.status === 'expired'
                        ? <Pill tone="success" className="ml-auto">Frozen at publication</Pill>
                        : <Pill className="ml-auto">Captured on publish</Pill>}
                    </div>
                    <FieldGrid cols={2}>
                      <Field label="Salesperson" value={listing.agent} />
                      <Field label="CEA registration no." value={state.profile.ceaNumber} mono />
                      <Field label="Agency" value={state.profile.agency} />
                      <Field label="Agency licence no." value={state.profile.agencyLicence} mono />
                    </FieldGrid>
                    {listing.publishedAt && <div className="mt-4 border-t border-p1-border pt-3 text-[13px] text-p1-text-3">Captured {fmtDate(listing.publishedAt)}. Shown from this copy, never from the live profile.</div>}
                  </div>
                  <p className="mt-4 text-[14px] leading-6 text-p1-text-2">
                    Singapore advertising rules require the salesperson name, registration number and agency licence number on every
                    property advertisement. These are frozen when a listing goes live, so a later change of agency never alters an
                    advertisement that was correct when published.
                  </p>
                </>
              )}

              {tab === 'activity' && (
                <ol className="space-y-5">
                  {activity.map((a, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', a.actor === 'system' ? 'bg-p1-text-3' : 'bg-p1-accent')} aria-hidden />
                        {i < activity.length - 1 && <span className="mt-1 w-px flex-1 bg-p1-border" aria-hidden />}
                      </div>
                      <div className="min-w-0 pb-1">
                        <div className="text-[14px] text-p1-text">{a.what}</div>
                        <div className="mt-0.5 text-[13px] text-p1-text-3">{a.at} · {a.actor === 'system' ? 'System' : a.actor}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <SectionCard title="Publication checklist" description={canPublish ? 'All checks passed' : 'Action needed before publishing'} padding="sm"
            icon={canPublish ? <Check size={18} className="text-p1-success" /> : <X size={18} className="text-p1-danger" />}>
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

          <SectionCard title="Listing timeline" padding="sm">
            <KeyValue rows={[
              { k: 'Created', v: fmtDate(listing.createdAt) },
              ...(listing.publishedAt ? [{ k: 'Published', v: fmtDate(listing.publishedAt) }] : []),
              ...(listing.expiresAt ? [{ k: 'Expires', v: fmtDate(listing.expiresAt) }] : []),
              { k: 'Photos', v: listing.images },
              { k: 'Last updated', v: fmtDate(listing.updatedAt ?? listing.createdAt) },
            ]} />
          </SectionCard>

          <SectionCard title="Public preview" description="How tenants will see it" padding="sm"
            actions={<Button size="sm" variant="outline" leftIcon={publicPreview ? <EyeOff size={14} /> : <Eye size={14} />} onClick={() => setPublicPreview((v) => !v)} aria-pressed={publicPreview}>{publicPreview ? 'Hide' : 'Show'}</Button>}>
            {publicPreview ? (
              <PreviewCard seed={listing.reference + listing.project} project={listing.project} price={sgd(listing.monthlyRent)}
                meta={`${listing.bedrooms} bed · ${listing.bathrooms} bath · ${listing.sizeSqft.toLocaleString()} sqft`} district={district(listing.district)}
                agent={listing.agent} cea={state.profile.ceaNumber} />
            ) : (
              <p className="text-[13px] text-p1-text-3">The public property site opens in Phase 2. Preview what this listing will look like there.</p>
            )}
          </SectionCard>

          <Card padding="sm" className="border-dashed">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-p1-text-2"><BarChart3 size={16} aria-hidden /> Performance</div>
            <p className="mt-1 text-[13px] leading-5 text-p1-text-3">Views, impressions and enquiries appear here once the public site opens in Phase 2. Views are recorded from day one so this opens with history.</p>
          </Card>
        </div>
      </div>

      <ConfirmDialog open={confirm === 'publish'} onClose={() => setConfirm(null)} onConfirm={publish}
        title="Publish this listing?" description="The listing goes live immediately and your agent details are frozen onto it as required by CEA advertising rules."
        confirmLabel="Publish listing" />
      <ConfirmDialog open={confirm === 'pause'} onClose={() => setConfirm(null)} onConfirm={pause}
        title="Pause this listing?" description="Tenants will not see it until you resume. Your quota slot is kept." confirmLabel="Pause listing" />

      <PresenterNote>
        This screen reads from one listing record and one compliance snapshot. Publishing here runs exactly the same gate as the
        create wizard and bulk import — there is one publish path in the system, not three.
      </PresenterNote>
    </>
  );
}

/** A miniature of the Phase 2 public listing card. */
function PreviewCard({ seed, project, price, meta, district, agent, cea }: { seed: string; project: string; price: string; meta: string; district: string; agent: string; cea: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-p1-border bg-p1-surface">
      <div className="relative">
        <PropertyImage seed={seed} variant={0} rounded="rounded-none" className="aspect-[16/10] w-full" />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[12px] font-medium text-white"><ShieldCheck size={12} aria-hidden /> Verified agent</span>
      </div>
      <div className="p-3">
        <div className="text-[16px] font-semibold tabular-nums text-p1-text">{price}<span className="text-[12px] font-normal text-p1-text-3">/mo</span></div>
        <div className="mt-0.5 truncate text-[14px] font-medium text-p1-text">{project}</div>
        <div className="mt-0.5 text-[12px] text-p1-text-2">{meta} · {district}</div>
        <div className="mt-2 border-t border-p1-border pt-2 text-[12px] text-p1-text-3">{agent} · CEA {cea}</div>
      </div>
    </div>
  );
}
