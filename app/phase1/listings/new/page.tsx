"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Button, LinkButton, Card, SectionCard, PageHeader, ProgressBar, Callout, TextInput, TextArea, SelectInput,
  Checkbox, Field, FieldGrid, Stepper, EmptyState, cx } from '../../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../../components/phase1/status';
import { ConfirmDialog } from '../../../../components/phase1/overlays';
import { useToast } from '../../../../components/phase1/Toast';
import { PhotoNote, PhotoUploader, Shot, pendingFiles, photoUrl, savedIds } from '../../../../components/phase1/listing/PhotoUploader';
import { PropertyMap } from '../../../../components/phase1/listing/PropertyMap';
import { useSession } from '../../../../lib/phase1/SessionContext';
import { useDemo, TODAY_ISO, preferredName } from '../../../../lib/phase1/DemoContext';
import { DemoListing, ListingStatus, sgd } from '../../../../lib/phase1/data';
import { DealType, dealOf } from '../../../../lib/phase1/pricing';
import type { AddressMatch as OneMapMatch } from '../../../../lib/phase1/onemap';
import { districtName } from '../../../../lib/phase1/performance';
import { AMENITIES } from '../../../../lib/phase1/agents';
import {
  Check, X, MapPin, Search, Lock, ChevronLeft, ChevronRight, ShieldCheck, Lightbulb, Camera, Sparkles,
  SearchX, Send, Save, KeyRound, Tag } from 'lucide-react';

const STEPS = [
  { label: 'Sale or rent', description: 'What this listing is' },
  { label: 'Property', description: 'Find the address' },
  { label: 'Unit', description: 'Unit and size' },
  { label: 'Rental terms', description: 'Rent and lease' },
  { label: 'Description', description: 'Text and amenities' },
  { label: 'Photos', description: 'At least one' },
  { label: 'Review', description: 'Check and publish' },
];


type PropertyType = DemoListing['propertyType'];
type Furnishing = DemoListing['furnishing'];

/**
 * A matched property. The create flow picks one from the OneMap search; the
 * edit flow reconstructs it from the listing, which was matched when it was
 * first created, so no coordinates are carried.
 */
type AddressMatch = OneMapMatch;

/**
 * `?step=` accepts the Listing Health section names, because that is what the
 * health panel, the dashboard action centre and the listing detail screen link
 * with. A 1-based step number is accepted too, matching "Step 3 of 6" on screen.
 */
const SECTION_STEP: Record<string, number> = {
  deal: 0, type: 0,
  property: 1, address: 1,
  details: 2, unit: 2,
  pricing: 3, terms: 3, rent: 3, price: 3,
  description: 4, amenities: 4,
  media: 5, photos: 5,
  review: 6, publish: 6,
};

function stepFromParam(raw: string | null): number {
  if (!raw) return 0;
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= STEPS.length) return n - 1;
  return SECTION_STEP[raw.trim().toLowerCase()] ?? 0;
}

export default function NewListingPage() {
  // useSearchParams needs a boundary; the wizard reads `edit` and `step` from it.
  return (
    <Suspense fallback={null}>
      <ListingWizard />
    </Suspense>
  );
}

function ListingWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const { push } = useToast();
  const { user } = useSession();
  const { gate, canPublish, addListing, updateListing, state } = useDemo();

  // Edit mode is decided once, from the URL. The listing is looked up in the
  // same in-memory store the rest of the workspace reads, so a link from the
  // dashboard, the health panel or the listing menu all land on real values.
  const editId = params.get('edit');
  const [editing] = useState<DemoListing | null>(
    () => (editId ? state.listings.find((l) => l.id === editId) ?? null : null),
  );
  const missing = Boolean(editId) && !editing;

  const [step, setStep] = useState(() => stepFromParam(params.get('step')));
  const [deal, setDeal] = useState<DealType>(() => dealOf(editing ?? ({} as DemoListing)));
  const [salePrice, setSalePrice] = useState(() => String(editing?.salePriceSgd ?? 1350000));
  const [query, setQuery] = useState(() => editing?.address ?? '');
  const [addr, setAddr] = useState<AddressMatch | null>(() => (editing
    ? {
        label: editing.address,
        street: editing.address,
        postal: editing.postalCode,
        project: editing.project,
        district: editing.district,
        lat: editing.lat,
        lng: editing.lng,
      }
    : null));
  const [unitNo, setUnitNo] = useState(() => editing?.unitNo ?? '');
  const [beds, setBeds] = useState(() => String(editing?.bedrooms ?? 2));
  const [baths, setBaths] = useState(() => String(editing?.bathrooms ?? 2));
  const [sqft, setSqft] = useState(() => String(editing?.sizeSqft ?? 850));
  const [propertyType, setPropertyType] = useState<PropertyType>(() => editing?.propertyType ?? 'Condominium');
  const [rent, setRent] = useState(() => String(editing?.monthlyRent ?? 4200));
  const [furnishing, setFurnishing] = useState<Furnishing>(() => editing?.furnishing ?? 'Partially furnished');
  const [lease, setLease] = useState(() => String(editing?.minLeaseMonths ?? 12));
  const [availableFrom, setAvailableFrom] = useState(() => editing?.availableFrom ?? '2026-10-01');
  const [desc, setDesc] = useState(() => editing?.description
    ?? 'Bright unit with unblocked views, five minutes to the MRT. Available for immediate viewing.');
  const [amenities, setAmenities] = useState<string[]>(() => editing?.amenities ?? ['Air conditioning', 'Swimming pool']);
  // Editing restores the photographs already on the server; creating starts empty.
  const [shots, setShots] = useState<Shot[]>(
    () => (editing?.photos ?? []).map((id) => ({ kind: 'saved', id }) as Shot),
  );
  const [uploading, setUploading] = useState(false);
  const [photoNotes, setPhotoNotes] = useState<PhotoNote[]>([]);
  /** Building facts taken from a previous listing, or from the one being edited. */
  const [carried, setCarried] = useState<Pick<DemoListing, 'nearestMrt' | 'tenure' | 'builtYear'>>(() => ({
    nearestMrt: editing?.nearestMrt,
    tenure: editing?.tenure,
    builtYear: editing?.builtYear,
  }));
  const [confirmPublish, setConfirmPublish] = useState(false);

  /**
   * Address search runs against OneMap while the agent types. Debounced, and a
   * response is ignored once a newer query has gone out — otherwise a slow
   * answer for "mar" lands on top of the results for "marina".
   *
   * Nothing is set synchronously here: what to show is derived below, so the
   * effect only ever schedules the request.
   */
  const [matches, setMatches] = useState<AddressMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedTerm, setSearchedTerm] = useState('');
  const searchSeq = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (addr || term.length < 3) return;

    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/phase1/address?q=${encodeURIComponent(term)}`);
        const body = (await res.json()) as { results?: AddressMatch[] };
        if (seq !== searchSeq.current) return;
        setMatches(body.results ?? []);
      } catch {
        if (seq === searchSeq.current) setMatches([]);
      } finally {
        if (seq === searchSeq.current) {
          setSearchedTerm(term);
          setSearching(false);
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, addr]);

  /**
   * A property template: what this agent already recorded about this building.
   *
   * Agents list many units in the same condominium, and everything that is true
   * of the building rather than the unit — the district, the station, the
   * tenure, the year it was completed, most of the amenities — is the same
   * every time. Offering it beats asking for it again, and it is offered rather
   * than applied because the previous listing might have been wrong.
   */
  const template = useMemo(() => {
    if (!addr) return null;
    const sameBuilding = state.listings
      .filter((l) => !l.archived && l.id !== editing?.id)
      .filter((l) => l.postalCode === addr.postal || l.project.toLowerCase() === addr.project.toLowerCase())
      .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
    return sameBuilding[0] ?? null;
  }, [addr, state.listings, editing?.id]);

  const [templateUsed, setTemplateUsed] = useState(false);

  const applyTemplate = () => {
    if (!template) return;
    setPropertyType(template.propertyType);
    if (template.amenities?.length) setAmenities(template.amenities);
    if (template.nearestMrt || template.tenure || template.builtYear) {
      // Carried onto the saved record through `fields()` below.
      setCarried({
        nearestMrt: template.nearestMrt,
        tenure: template.tenure,
        builtYear: template.builtYear,
      });
    }
    setTemplateUsed(true);
    push({
      tone: 'success',
      title: 'Filled in from your last listing here',
      body: `Taken from ${template.project} ${template.unitNo}. Change anything that differs for this unit.`,
    });
  };

  const term = query.trim();
  const showMatches = !addr && term.length >= 3 && searchedTerm === term ? matches : [];
  const noMatches = !addr && searchedTerm === term && term.length >= 3 && matches.length === 0 && !searching;

  /** Unit numbers arrive in several shapes; normalise on write. */
  const normalisedUnit = unitNo ? '#' + unitNo.replace(/^#/, '').replace(/^unit\s*/i, '').trim() : '';

  const canAdvance = [
    true,
    !!addr,
    !!normalisedUnit && !!sqft,
    deal === 'sale' ? !!salePrice : !!rent,
    desc.trim().length >= 20,
    shots.length > 0,
    true,
  ][step];
  const progress = Math.round(((step + (canAdvance ? 1 : 0)) / STEPS.length) * 100);

  /**
   * Photographs for a listing that already exists go to the server as soon as
   * they are chosen; for one still being created there is nothing to attach
   * them to, so they are held and uploaded by `commitPhotos` after the save.
   */
  const onPhotos = async (next: Shot[], added: File[]) => {
    setShots(next);

    if (!editing) return;                       // create flow: upload on save
    if (added.length > 0) {
      setUploading(true);
      try {
        const form = new FormData();
        form.append('listingId', editing.id);
        added.forEach((f) => form.append('file', f));
        const res = await fetch('/api/phase1/photos', { method: 'POST', body: form });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as {
          photos: string[];
          rejected?: { name: string; reason: string }[];
          warnings?: PhotoNote[];
        };
        setShots(body.photos.map((id) => ({ kind: 'saved', id }) as Shot));
        setPhotoNotes(body.warnings ?? []);
        if (body.rejected?.length) {
          push({ tone: 'warn', title: 'Some photographs were not added', body: body.rejected.map((r) => r.name).join(', ') });
        } else {
          push({ tone: 'success', title: added.length === 1 ? 'Photograph added' : `${added.length} photographs added` });
        }
      } catch {
        push({ tone: 'error', title: 'Upload failed', body: 'The photographs were not saved. Try again in a moment.' });
        setShots(shots);
      } finally {
        setUploading(false);
      }
      return;
    }

    // A reorder or a removal: send the new ordering.
    setUploading(true);
    try {
      await fetch('/api/phase1/photos?remove=1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listingId: editing.id, photos: savedIds(next) }),
      });
    } finally {
      setUploading(false);
    }
  };

  /** Send the held files once the new listing has an id. */
  const commitPhotos = async (listingId: string) => {
    const files = pendingFiles(shots);
    if (files.length === 0) return;
    const form = new FormData();
    form.append('listingId', listingId);
    files.forEach((f) => form.append('file', f));
    try {
      const res = await fetch('/api/phase1/photos', { method: 'POST', body: form });
      const body = (await res.json().catch(() => null)) as { warnings?: PhotoNote[] } | null;
      if (body?.warnings?.length) {
        push({
          tone: 'warn',
          title: 'Some photographs are worth a second look',
          body: body.warnings.map((w) => w.name).join(', '),
        });
      }
    } catch {
      push({ tone: 'warn', title: 'Listing saved without photographs', body: 'The upload did not go through. Open the listing and add them again.' });
    }
  };

  /** Everything the form owns, shared by the create and the edit paths. */
  const fields = () => ({
    description: desc,
    project: addr!.project,
    address: addr!.label,
    postalCode: addr!.postal,
    unitNo: normalisedUnit,
    district: addr!.district,
    lat: addr!.lat,
    lng: addr!.lng,
    propertyType,
    bedrooms: Number(beds),
    bathrooms: Number(baths),
    sizeSqft: Number(sqft),
    dealType: deal,
    monthlyRent: Number(rent),
    salePriceSgd: deal === 'sale' ? Number(salePrice) : undefined,
    availableFrom,
    minLeaseMonths: Number(lease),
    furnishing,
    amenities,
    nearestMrt: carried.nearestMrt,
    tenure: carried.tenure,
    builtYear: carried.builtYear,
    images: shots.length,
    photos: savedIds(shots),
    updatedAt: TODAY_ISO,
  });

  const build = (status: 'published' | 'draft'): DemoListing => ({
    id: `lst-${Math.random().toString(36).slice(2, 8)}`,
    reference: `VR-${24110 + state.listings.length}`,
    agent: preferredName(state.profile.fullName),
    ...fields(),
    status,
    createdAt: TODAY_ISO,
    publishedAt: status === 'published' ? TODAY_ISO : undefined,
    expiresAt: status === 'published' ? '2026-11-26' : undefined,
  });

  const saveDraft = async () => {
    if (!addr) return;
    const listing = build('draft');
    addListing(listing);
    await commitPhotos(listing.id);
    push({ tone: 'success', title: 'Draft saved', body: 'You can finish and publish it from My listings.' });
    router.push('/phase1/listings');
  };

  const publish = async () => {
    setConfirmPublish(false);
    if (!addr) return;
    const listing = build(canPublish ? 'published' : 'draft');
    addListing(listing);
    await commitPhotos(listing.id);
    push(canPublish
      ? { tone: 'success', title: 'Listing published', body: `${addr.project} is now live.` }
      : { tone: 'warn', title: 'Saved as draft', body: 'Publication is blocked — see the checklist.' });
    router.push('/phase1/listings');
  };

  /* --------------------------------------------------------------- editing */

  /** Save the edit without changing where the listing sits in its lifecycle. */
  const saveChanges = () => {
    if (!addr || !editing) return;
    updateListing(editing.id, fields());
    push({ tone: 'success', title: 'Changes saved', body: `${addr.project} ${normalisedUnit} has been updated.` });
    router.push(`/phase1/listings/${editing.id}`);
  };

  /** A corrected listing goes back to the moderation queue, not straight live. */
  const resubmit = () => {
    if (!addr || !editing) return;
    updateListing(editing.id, { ...fields(), status: 'pending_review' as ListingStatus, rejectionReason: undefined });
    push({ tone: 'success', title: 'Sent for review', body: 'A moderator will look at the corrected listing.' });
    router.push(`/phase1/listings/${editing.id}`);
  };

  /** Publishing a draft from the edit flow uses the same gate as a new listing. */
  const publishEdit = () => {
    setConfirmPublish(false);
    if (!addr || !editing) return;
    updateListing(editing.id, {
      ...fields(),
      status: 'published' as ListingStatus,
      publishedAt: TODAY_ISO,
      expiresAt: '2026-11-26',
    });
    push({ tone: 'success', title: 'Listing published', body: `${addr.project} ${normalisedUnit} is now live.` });
    router.push(`/phase1/listings/${editing.id}`);
  };

  const toggleAmenity = (a: string) => setAmenities((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));


  if (missing) {
    return (
      <>
        <PageHeader crumbs={[{ label: 'Listings', href: '/phase1/listings' }, { label: 'Edit listing' }]} title="Edit listing" />
        <EmptyState
          icon={<SearchX size={22} />}
          title="That listing is no longer here"
          description="It may have been archived, or the walkthrough was reset since the link was made."
          action={<LinkButton href="/phase1/listings">Back to listings</LinkButton>}
        />
      </>
    );
  }

  return (
    <>
      {editing ? (
        <PageHeader
          crumbs={[
            { label: 'Listings', href: '/phase1/listings' },
            { label: editing.reference, href: `/phase1/listings/${editing.id}` },
            { label: 'Edit' },
          ]}
          eyebrow={`Editing ${editing.reference}`}
          title={`${editing.project} ${editing.unitNo}`}
          description={editing.status === 'rejected'
            ? 'Correct what the moderator flagged, then send it back for review.'
            : 'Change any step and save. Every step is reachable from the list beside the form.'}
          meta={<>
            <StatusBadge kind="listing" value={editing.status} />
            <span className="text-[13px] text-p1-text-3">Last updated {editing.updatedAt ?? editing.createdAt}</span>
          </>}
        />
      ) : (
        <PageHeader
          crumbs={[{ label: 'Listings', href: '/phase1/listings' }, { label: 'Create listing' }]}
          eyebrow="New listing"
          title="Create a listing"
          description="Six short steps. Your progress is saved as you go, so you can come back later."
          meta={<span className="inline-flex items-center gap-1.5 text-[13px] text-p1-text-3"><Check size={14} className="text-p1-success" aria-hidden /> Draft saved just now</span>}
        />
      )}

      {editing?.status === 'rejected' && editing.rejectionReason && (
        <Callout tone="danger" title="Why this listing was rejected" className="mb-4">{editing.rejectionReason}</Callout>
      )}

      {/* Editing a complete listing means every step is already valid, so all of
          them are reachable; creating one walks forward as each step passes. */}
      <Stepper
        steps={STEPS}
        current={step}
        completed={(i) => (editing ? i !== step : i < step)}
        onSelect={editing ? setStep : undefined}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {step === 0 && (
            <SectionCard
              title="What is this listing?"
              description="It decides what the rest of the form asks you, and how a tenant or buyer finds it."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {(['rent', 'sale'] as DealType[]).map((option) => {
                  const chosen = deal === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDeal(option)}
                      aria-pressed={chosen}
                      className={cx(
                        'flex flex-col items-start rounded-xl border-2 p-5 text-left transition-colors cursor-pointer',
                        chosen ? 'border-p1-accent bg-p1-accent-soft/40' : 'border-p1-border hover:border-p1-border-strong hover:bg-p1-subtle/50',
                      )}
                    >
                      <span className={cx('flex h-11 w-11 items-center justify-center rounded-lg', chosen ? 'bg-p1-accent text-p1-accent-on' : 'bg-p1-subtle text-p1-text-3')} aria-hidden>
                        {option === 'rent' ? <KeyRound size={20} /> : <Tag size={20} />}
                      </span>
                      <span className="mt-3.5 text-[16px] font-semibold text-p1-text">
                        {option === 'rent' ? 'For rent' : 'For sale'}
                      </span>
                      <span className="mt-1 text-[13.5px] leading-5 text-p1-text-2">
                        {option === 'rent'
                          ? 'A monthly rent, a minimum lease and an availability date.'
                          : 'An asking price. No lease terms.'}
                      </span>
                    </button>
                  );
                })}
              </div>
              {editing && (
                <Callout tone="warning" className="mt-5" compact>
                  Changing this on a live listing changes where it appears in search. Anyone who saved the old link
                  still reaches it.
                </Callout>
              )}
            </SectionCard>
          )}

          {step === 1 && (
            <SectionCard title="Find the property" description="Search by postal code, block and street, or building name. Matched against OneMap, the Singapore Land Authority's official address register, so every listing sits on a real property.">
              <TextInput label="Address or postal code" leftIcon={<Search size={17} />} value={query}
                onChange={(e) => { setQuery(e.target.value); setAddr(null); }}
                placeholder="A six-digit postal code, or “2 Marina Boulevard”" autoComplete="off"
                hint={searching ? 'Searching OneMap…' : 'A postal code identifies one building in Singapore, so it fills in the rest.'} />
              {showMatches.length > 0 && (
                <ul className="mt-2 overflow-hidden rounded-xl border border-p1-border" role="listbox" aria-label="Address matches">
                  {showMatches.map((m) => (
                    <li key={m.postal}>
                      <button type="button" role="option" aria-selected={false} onClick={() => { setAddr(m); setQuery(m.label); }}
                        className="flex w-full items-center gap-3 border-b border-p1-border px-4 py-3 text-left last:border-b-0 hover:bg-p1-subtle cursor-pointer">
                        <MapPin size={17} className="shrink-0 text-p1-accent-text" aria-hidden />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-medium text-p1-text">{m.label}</span>
                          <span className="block text-[13px] text-p1-text-3">Singapore {m.postal} · {m.project}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {noMatches && (
                <p className="mt-2 text-[13px] text-p1-text-3">
                  Nothing in the address register matches that. Check the spelling, or try the six-digit postal code.
                </p>
              )}
              {addr && (
                <div className="mt-4 rounded-xl border border-p1-success-border bg-p1-success-soft/60 p-4">
                  <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-p1-text"><Check size={16} className="text-p1-success" aria-hidden /> Property matched</div>
                  <FieldGrid cols={2}>
                    <Field label="Project" value={addr.project} />
                    <Field label="Postal code" value={addr.postal} mono />
                    <Field label="District" value={addr.district ? `D${String(addr.district).padStart(2, '0')} ${districtName(addr.district)}` : 'Not in a postal district'} />
                    <Field label="Address" value={addr.label} />
                  </FieldGrid>
                  <PropertyMap className="mt-4" lat={addr.lat} lng={addr.lng} label={addr.label} height={200} />

                  {template && !templateUsed && (
                    <div className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-p1-accent/40 bg-p1-accent-soft/40 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[13.5px] font-semibold text-p1-text">
                          <Sparkles size={14} className="text-p1-accent-text" aria-hidden />
                          You have listed here before
                        </div>
                        <p className="mt-1 text-[13.5px] leading-5 text-p1-text-2">
                          {template.project} {template.unitNo} has the property type
                          {template.nearestMrt ? ', nearest station' : ''}
                          {template.tenure ? ', tenure' : ''} and amenities already recorded. Copy them across and
                          change what differs for this unit.
                        </p>
                      </div>
                      <Button size="sm" variant="accent" onClick={applyTemplate}>Use those details</Button>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          )}

          {step === 2 && (
            <SectionCard title="Unit details" description="These appear on the listing and help tenants filter by size.">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput label="Unit number" required value={unitNo} onChange={(e) => setUnitNo(e.target.value)} placeholder="12-34"
                  hint={normalisedUnit ? <>Will be shown as <span className="font-mono text-p1-text">{normalisedUnit}</span></> : 'Floor and unit, for example 12-34'} />
                <TextInput label="Floor area (sqft)" required inputMode="numeric" value={sqft} onChange={(e) => setSqft(e.target.value.replace(/\D/g, ''))} hint="Strata area as shown on the lease" />
                <SelectInput label="Property type" value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                  options={['Condominium', 'HDB', 'Apartment', 'Landed', 'Executive Condominium'].map((v) => ({ value: v, label: v }))} />
                <SelectInput label="Bedrooms" value={beds} onChange={(e) => setBeds(e.target.value)}
                  options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} bedroom${n > 1 ? 's' : ''}` }))} />
                <SelectInput label="Bathrooms" value={baths} onChange={(e) => setBaths(e.target.value)}
                  options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n} bathroom${n > 1 ? 's' : ''}` }))} />
              </div>
            </SectionCard>
          )}

          {step === 3 && (
            <SectionCard
              title={deal === 'sale' ? 'Price' : 'Rental terms'}
              description={deal === 'sale' ? 'What the seller is asking.' : 'Set the asking rent and the terms you will accept.'}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                {deal === 'sale' ? (
                  <TextInput label="Asking price" required inputMode="numeric" value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value.replace(/\D/g, ''))}
                    leftIcon={<span className="text-[14px] font-semibold">S$</span>}
                    hint={salePrice && sqft ? `About S$${Math.round(Number(salePrice) / Number(sqft)).toLocaleString('en-SG')} per sqft` : undefined} />
                ) : (
                  <TextInput label="Monthly rent" required inputMode="numeric" value={rent} onChange={(e) => setRent(e.target.value.replace(/\D/g, ''))}
                    leftIcon={<span className="text-[14px] font-semibold">S$</span>} hint={rent && sqft ? `About S$${(Number(rent) / Number(sqft)).toFixed(2)} per sqft` : undefined} />
                )}
                {deal === 'rent' && (
                  <SelectInput label="Minimum lease" value={lease} onChange={(e) => setLease(e.target.value)}
                    options={[{ value: '6', label: '6 months' }, { value: '12', label: '12 months' }, { value: '24', label: '24 months' }]} />
                )}
                <SelectInput label="Furnishing" value={furnishing} onChange={(e) => setFurnishing(e.target.value as Furnishing)}
                  options={['Unfurnished', 'Partially furnished', 'Fully furnished'].map((v) => ({ value: v, label: v }))} />
                <TextInput label={deal === 'sale' ? 'Available to view from' : 'Available from'} type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
              </div>
            </SectionCard>
          )}

          {step === 4 && (
            <SectionCard title="Description and amenities" description="A clear description and the right amenities are what tenants search for.">
              <TextArea label="Description" required rows={5} value={desc} onChange={(e) => setDesc(e.target.value)}
                hint={<span className={cx(desc.trim().length < 20 && 'text-p1-warning')}>{desc.length} characters · at least 20. Do not include phone numbers or email addresses — tenants enquire through V-RENT.</span>} />
              <fieldset className="mt-6">
                <legend className="mb-2 text-[14px] font-medium text-p1-text">Amenities</legend>
                <div className="grid gap-x-6 sm:grid-cols-2">
                  {AMENITIES.map((a) => <Checkbox key={a} label={a} checked={amenities.includes(a)} onChange={() => toggleAmenity(a)} />)}
                </div>
              </fieldset>
            </SectionCard>
          )}

          {step === 5 && (
            <SectionCard
              title="Photographs"
              description={`Up to ${6} per listing, ${5} MB each. Listings with a full set get noticeably more enquiries.`}
            >
              <PhotoUploader
                shots={shots}
                onChange={(next, added) => void onPhotos(next, added)}
                ownerId={user?.id ?? ''}
                listingId={editing?.id}
                busy={uploading}
                notes={photoNotes}
              />
              {!editing && shots.length > 0 && (
                <p className="mt-3 text-[13px] leading-5 text-p1-text-3">
                  These upload when you save the listing.
                </p>
              )}
            </SectionCard>
          )}

          {step === 6 && (
            <SectionCard title="Review and publish" description="Check the details below. You can go back to any step.">
              <FieldGrid cols={2}>
                <Field label="Property" value={addr ? `${addr.project}, ${normalisedUnit}` : '—'} />
                <Field label="Address" value={addr ? `${addr.label}, Singapore ${addr.postal}` : '—'} />
                <Field label={deal === 'sale' ? 'Asking price' : 'Rent'} value={deal === 'sale' ? sgd(Number(salePrice || 0)) : `${sgd(Number(rent || 0))} per month`} />
                <Field label="Configuration" value={`${beds} bed · ${baths} bath · ${Number(sqft).toLocaleString()} sqft · ${propertyType}`} />
                <Field label={deal === 'sale' ? 'Available' : 'Lease'} value={deal === 'sale' ? `From ${availableFrom}` : `Minimum ${lease} months · from ${availableFrom}`} />
                <Field label="Furnishing" value={furnishing} />
              </FieldGrid>
              <div className="mt-5">
                <div className="mb-2 text-[13px] font-medium text-p1-text-3">Amenities</div>
                <div className="flex flex-wrap gap-2">{amenities.length ? amenities.map((a) => <Pill key={a}>{a}</Pill>) : <span className="text-[13px] text-p1-text-3">None selected</span>}</div>
              </div>
              <div className="mt-5">
                <div className="mb-2 text-[13px] font-medium text-p1-text-3">Photographs ({shots.length})</div>
                {shots.length === 0 ? (
                  <p className="text-[13px] text-p1-text-3">None yet. A listing cannot be published without at least one.</p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {shots.map((sh, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={sh.kind === 'saved' ? sh.id : sh.url}
                        src={sh.kind === 'pending' ? sh.url : editing ? photoUrl(user?.id ?? '', editing.id, sh.id) : ''}
                        alt={`Photograph ${i + 1}`}
                        className="h-16 w-24 shrink-0 rounded-md object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-6 rounded-xl border border-p1-border bg-p1-subtle/50 p-4">
                <div className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-p1-text"><ShieldCheck size={16} className="text-p1-accent-text" aria-hidden /> Your details on this advertisement</div>
                <p className="text-[15px] text-p1-text">{state.profile.fullName} · {state.profile.ceaNumber} · {state.profile.agency} ({state.profile.agencyLicence})</p>
                <p className="mt-2 text-[13px] leading-5 text-p1-text-2">Required on every advertisement by CEA rules. They are frozen onto the listing when it goes live, so a later change of agency does not alter this advertisement.</p>
              </div>
              <div className="mt-6 rounded-xl border border-p1-border p-4">
                <div className="mb-2 text-[14px] font-semibold text-p1-text">{canPublish ? 'Ready to publish' : 'Publication is blocked'}</div>
                <ul className="divide-y divide-p1-border">
                  {gate.map((g) => (
                    <li key={g.id} className="flex items-start gap-3 py-2.5">
                      <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', g.pass ? 'bg-p1-success-soft text-p1-success' : 'bg-p1-danger-soft text-p1-danger')} aria-hidden>{g.pass ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}</span>
                      <span className="min-w-0 flex-1 text-[14px] text-p1-text">{g.label}<span className="sr-only">{g.pass ? ' — passed' : ' — failed'}</span>
                        {!g.pass && g.fixHref && <Link href={g.fixHref} className="ml-2 text-[13px] font-semibold text-p1-accent-text underline-offset-4 hover:underline">{g.fixLabel} →</Link>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </SectionCard>
          )}

          {/* Action bar */}
          <Card padding="sm" className="sticky bottom-20 mt-4 lg:bottom-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" leftIcon={<ChevronLeft size={16} />} disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
              <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:px-4">
                <div className="mb-1 text-[13px] text-p1-text-3">Step {step + 1} of {STEPS.length}</div>
                <ProgressBar value={progress} size="sm" />
              </div>
              {editing ? (
                /* Saving is available from every step: a deep link that lands on
                   photographs should not force a walk through the other five. */
                <div className="flex flex-wrap gap-2">
                  {step < STEPS.length - 1 && (
                    <Button variant="ghost" rightIcon={<ChevronRight size={16} />} onClick={() => setStep((s) => s + 1)}>Continue</Button>
                  )}
                  <Button variant="outline" leftIcon={<Save size={16} />} disabled={!addr} onClick={saveChanges}>Save changes</Button>
                  {editing.status === 'rejected' && (
                    <Button variant="accent" leftIcon={<Send size={16} />} disabled={!addr} onClick={resubmit}>Resubmit for review</Button>
                  )}
                  {editing.status === 'draft' && (
                    <Button variant="accent" leftIcon={!canPublish ? <Lock size={16} /> : <Check size={16} />} disabled={!canPublish || !addr} onClick={() => setConfirmPublish(true)}>
                      {canPublish ? 'Publish listing' : 'Publication blocked'}
                    </Button>
                  )}
                </div>
              ) : step < STEPS.length - 1 ? (
                <Button variant="accent" rightIcon={<ChevronRight size={16} />} disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>Continue</Button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void saveDraft()}>Save as draft</Button>
                  <Button variant="accent" size="md" leftIcon={!canPublish ? <Lock size={16} /> : <Check size={16} />} disabled={!canPublish} onClick={() => setConfirmPublish(true)}>
                    {canPublish ? 'Publish listing' : 'Publication blocked'}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="hidden space-y-4 lg:block">
          <SectionCard title="Your progress" padding="sm">
            <ol className="space-y-2.5">
              {STEPS.map((s, i) => {
                const done = editing ? i !== step : i < step;
                const row = (
                  <>
                    <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold', done ? 'bg-p1-success text-white' : i === step ? 'bg-p1-accent text-p1-accent-on' : 'bg-p1-subtle text-p1-text-3')} aria-hidden>{done ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
                    <span className={cx(i === step ? 'font-semibold text-p1-text' : done ? 'text-p1-text-2' : 'text-p1-text-3')}>{s.label}</span>
                  </>
                );
                return (
                  <li key={s.label} className="text-[14px]">
                    {editing ? (
                      <button type="button" onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-1 py-0.5 text-left hover:bg-p1-subtle">{row}</button>
                    ) : (
                      <span className="flex items-center gap-2.5 px-1 py-0.5">{row}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </SectionCard>
          <SectionCard title="Tips" padding="sm" icon={<Lightbulb size={17} />}>
            <ul className="space-y-3 text-[13px] leading-5 text-p1-text-2">
              <li className="flex gap-2"><Sparkles size={14} className="mt-0.5 shrink-0 text-p1-accent-text" aria-hidden />Lead with what a tenant cannot see in the photos: quiet stack, no west sun, walking time to the MRT.</li>
              <li className="flex gap-2"><Camera size={14} className="mt-0.5 shrink-0 text-p1-accent-text" aria-hidden />Shoot in daylight with the lights on. Ten or more photos get more enquiries.</li>
              <li className="flex gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-p1-accent-text" aria-hidden />Your CEA details are added automatically — no need to type them into the description.</li>
            </ul>
          </SectionCard>
          {!canPublish && <Callout tone="warning" title="Publication is currently blocked">You can still save a draft and publish once the checklist passes.</Callout>}
        </div>
      </div>

      <ConfirmDialog open={confirmPublish} onClose={() => setConfirmPublish(false)} onConfirm={editing ? publishEdit : () => void publish()}
        title="Publish this listing?" description="It goes live immediately and uses one listing slot on your plan." confirmLabel="Publish listing" />

    </>
  );
}
