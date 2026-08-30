"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Button, IconButton, Card, SectionCard, PageHeader, ProgressBar, Callout, TextInput, TextArea, SelectInput, Checkbox,
  Field, FieldGrid, Stepper, PresenterNote, cx,
} from '../../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../../components/phase1/status';
import { ConfirmDialog } from '../../../../components/phase1/overlays';
import { useToast } from '../../../../components/phase1/Toast';
import { PropertyImage } from '../../../../components/phase1/PropertyImage';
import { useDemo } from '../../../../lib/phase1/DemoContext';
import { DemoListing, sgd } from '../../../../lib/phase1/data';
import { AMENITIES } from '../../../../lib/phase1/agents';
import {
  Check, X, MapPin, Search, Lock, Upload, ChevronLeft, ChevronRight, Trash2, ShieldCheck, Lightbulb, Camera, Sparkles,
} from 'lucide-react';

const STEPS = [
  { label: 'Property', description: 'Find the address' },
  { label: 'Unit', description: 'Unit and size' },
  { label: 'Rental terms', description: 'Rent and lease' },
  { label: 'Description', description: 'Text and amenities' },
  { label: 'Photos', description: 'At least one' },
  { label: 'Review', description: 'Check and publish' },
];

const ONEMAP_RESULTS = [
  { label: '11 NORMANTON PARK', postal: '119003', project: 'Normanton Park', district: 5, lat: 1.2884, lng: 103.7907 },
  { label: '2 MARINA BOULEVARD', postal: '018987', project: 'The Sail @ Marina Bay', district: 1, lat: 1.2809, lng: 103.8543 },
  { label: '118A RIVERVALE DRIVE', postal: '541118', project: 'Rivervale Delta', district: 19, lat: 1.3899, lng: 103.9021 },
];

type PropertyType = DemoListing['propertyType'];
type Furnishing = DemoListing['furnishing'];

export default function NewListingPage() {
  const router = useRouter();
  const { push } = useToast();
  const { gate, canPublish, addListing, state } = useDemo();
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState('');
  const [addr, setAddr] = useState<(typeof ONEMAP_RESULTS)[number] | null>(null);
  const [unitNo, setUnitNo] = useState('');
  const [beds, setBeds] = useState('2');
  const [baths, setBaths] = useState('2');
  const [sqft, setSqft] = useState('850');
  const [propertyType, setPropertyType] = useState<PropertyType>('Condominium');
  const [rent, setRent] = useState('4200');
  const [furnishing, setFurnishing] = useState<Furnishing>('Partially furnished');
  const [lease, setLease] = useState('12');
  const [availableFrom, setAvailableFrom] = useState('2026-10-01');
  const [desc, setDesc] = useState('Bright unit with unblocked views, five minutes to the MRT. Available for immediate viewing.');
  const [amenities, setAmenities] = useState<string[]>(['Air conditioning', 'Swimming pool']);
  const [photos, setPhotos] = useState<number[]>([]);
  const [uploading, setUploading] = useState<number | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const matches = query.length > 1
    ? ONEMAP_RESULTS.filter((r) => r.label.toLowerCase().includes(query.toLowerCase()) || r.postal.includes(query))
    : [];

  /** Unit numbers arrive in several shapes; normalise on write. */
  const normalisedUnit = unitNo ? '#' + unitNo.replace(/^#/, '').replace(/^unit\s*/i, '').trim() : '';

  const canAdvance = [!!addr, !!normalisedUnit && !!sqft, !!rent, desc.trim().length >= 20, photos.length > 0, true][step];
  const progress = Math.round(((step + (canAdvance ? 1 : 0)) / STEPS.length) * 100);

  const simulateUpload = () => {
    if (uploading !== null) return;
    setUploading(0);
    const start = Date.now();
    const tick = () => {
      const pct = Math.min(100, Math.round(((Date.now() - start) / 1200) * 100));
      setUploading(pct);
      if (pct < 100) setTimeout(tick, 60);
      else {
        setPhotos((p) => { const base = p.length; return [...p, ...Array.from({ length: 6 }, (_, i) => base + i)]; });
        setTimeout(() => setUploading(null), 200);
        push({ tone: 'success', title: '6 photos added', body: 'Scanned and processed. Drag the order to choose a cover.' });
      }
    };
    setTimeout(tick, 60);
  };

  const move = (i: number, d: -1 | 1) => setPhotos((p) => {
    const j = i + d; if (j < 0 || j >= p.length) return p;
    const n = [...p]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  const build = (status: 'published' | 'draft'): DemoListing => ({
    id: `lst-${Math.random().toString(36).slice(2, 8)}`,
    reference: `VR-${24110 + state.listings.length}`,
    agent: state.profile.fullName,
    description: desc,
    project: addr!.project,
    address: addr!.label,
    postalCode: addr!.postal,
    unitNo: normalisedUnit,
    district: addr!.district,
    propertyType,
    bedrooms: Number(beds),
    bathrooms: Number(baths),
    sizeSqft: Number(sqft),
    monthlyRent: Number(rent),
    availableFrom,
    minLeaseMonths: Number(lease),
    furnishing,
    status,
    images: photos.length,
    createdAt: '2026-08-28',
    updatedAt: '2026-08-28',
    publishedAt: status === 'published' ? '2026-08-28' : undefined,
    expiresAt: status === 'published' ? '2026-11-26' : undefined,
  });

  const saveDraft = () => {
    if (!addr) return;
    addListing(build('draft'));
    push({ tone: 'success', title: 'Draft saved', body: 'You can finish and publish it from My listings.' });
    router.push('/phase1/listings');
  };

  const publish = () => {
    setConfirmPublish(false);
    if (!addr) return;
    addListing(build(canPublish ? 'published' : 'draft'));
    push(canPublish
      ? { tone: 'success', title: 'Listing published', body: `${addr.project} is now live.` }
      : { tone: 'warn', title: 'Saved as draft', body: 'Publication is blocked — see the checklist.' });
    router.push('/phase1/listings');
  };

  const toggleAmenity = (a: string) => setAmenities((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Listings', href: '/phase1/listings' }, { label: 'Create listing' }]}
        eyebrow="New listing"
        title="Create a listing"
        description="Six short steps. Your progress is saved as you go, so you can come back later."
        meta={<span className="inline-flex items-center gap-1.5 text-[13px] text-p1-text-3"><Check size={14} className="text-p1-success" aria-hidden /> Draft saved just now</span>}
      />

      <Stepper steps={STEPS} current={step} completed={(i) => i < step} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {step === 0 && (
            <SectionCard title="Find the property" description="Search by street name or postal code. We match against Singapore's official address register so every listing sits on a real property.">
              <TextInput label="Address or postal code" leftIcon={<Search size={17} />} value={query}
                onChange={(e) => { setQuery(e.target.value); setAddr(null); }}
                placeholder="Try “Normanton”, “Marina” or a postal code" autoComplete="off" />
              {matches.length > 0 && !addr && (
                <ul className="mt-2 overflow-hidden rounded-xl border border-p1-border" role="listbox" aria-label="Address matches">
                  {matches.map((m) => (
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
              {query.length > 1 && matches.length === 0 && !addr && (
                <p className="mt-2 text-[13px] text-p1-text-3">No matches. Check the spelling or try the six-digit postal code.</p>
              )}
              {addr && (
                <div className="mt-4 rounded-xl border border-p1-success-border bg-p1-success-soft/60 p-4">
                  <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-p1-text"><Check size={16} className="text-p1-success" aria-hidden /> Property matched</div>
                  <FieldGrid cols={2}>
                    <Field label="Project" value={addr.project} />
                    <Field label="Postal code" value={addr.postal} mono />
                    <Field label="District" value={`D${String(addr.district).padStart(2, '0')}`} />
                    <Field label="Address" value={addr.label} />
                  </FieldGrid>
                </div>
              )}
            </SectionCard>
          )}

          {step === 1 && (
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

          {step === 2 && (
            <SectionCard title="Rental terms" description="Set the asking rent and the terms you will accept.">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput label="Monthly rent" required inputMode="numeric" value={rent} onChange={(e) => setRent(e.target.value.replace(/\D/g, ''))}
                  leftIcon={<span className="text-[14px] font-semibold">S$</span>} hint={rent && sqft ? `About S$${(Number(rent) / Number(sqft)).toFixed(2)} per sqft` : undefined} />
                <SelectInput label="Minimum lease" value={lease} onChange={(e) => setLease(e.target.value)}
                  options={[{ value: '6', label: '6 months' }, { value: '12', label: '12 months' }, { value: '24', label: '24 months' }]} />
                <SelectInput label="Furnishing" value={furnishing} onChange={(e) => setFurnishing(e.target.value as Furnishing)}
                  options={['Unfurnished', 'Partially furnished', 'Fully furnished'].map((v) => ({ value: v, label: v }))} />
                <TextInput label="Available from" type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
              </div>
            </SectionCard>
          )}

          {step === 3 && (
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

          {step === 4 && (
            <SectionCard title="Photos" description="Listings with 10 or more photos get noticeably more enquiries. The first photo is the cover.">
              <button type="button" onClick={simulateUpload} disabled={uploading !== null}
                className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-p1-border-strong bg-p1-subtle/40 px-4 py-10 text-center transition-colors hover:border-p1-accent hover:bg-p1-accent-soft/40 disabled:opacity-60 cursor-pointer">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-p1-primary-soft text-p1-primary" aria-hidden><Upload size={22} /></span>
                <span className="mt-3 text-[15px] font-semibold text-p1-text">Drag photos here or browse</span>
                <span className="mt-1 text-[13px] text-p1-text-3">JPEG, PNG, HEIC or WebP · up to 10 MB each · up to 30 photos</span>
                <Pill className="mt-3">Prototype: click adds 6 sample photos</Pill>
              </button>
              {uploading !== null && (
                <div className="mt-4">
                  <ProgressBar value={uploading} label="Uploading 6 photos" tone="accent" />
                </div>
              )}
              {photos.length > 0 && (
                <>
                  <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Uploaded photos">
                    {photos.map((v, i) => (
                      <li key={v} className="overflow-hidden rounded-xl border border-p1-border bg-p1-surface">
                        <div className="relative">
                          <PropertyImage seed={'new' + (addr?.postal ?? '')} variant={v} rounded="rounded-none" className="aspect-[4/3] w-full" />
                          {i === 0 && <Pill tone="accent" className="absolute left-2 top-2">Cover</Pill>}
                          <span className="absolute bottom-2 right-2"><StatusBadge kind="check" value="verified" size="sm" showHelp={false} /></span>
                        </div>
                        <div className="flex items-center justify-between gap-1 px-1.5 py-1">
                          <div className="flex">
                            <IconButton size="sm" label={`Move photo ${i + 1} earlier`} onClick={() => move(i, -1)} disabled={i === 0}><ChevronLeft size={16} /></IconButton>
                            <IconButton size="sm" label={`Move photo ${i + 1} later`} onClick={() => move(i, 1)} disabled={i === photos.length - 1}><ChevronRight size={16} /></IconButton>
                          </div>
                          <span className="text-[12px] text-p1-text-3">Photo {i + 1}</span>
                          <IconButton size="sm" label={`Remove photo ${i + 1}`} onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="text-p1-danger hover:text-p1-danger"><Trash2 size={15} /></IconButton>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 flex items-center gap-1.5 text-[13px] text-p1-text-3"><Camera size={14} aria-hidden /> {photos.length} photo{photos.length === 1 ? '' : 's'} · every photo is checked for viruses and location data is removed before it is shown.</p>
                </>
              )}
            </SectionCard>
          )}

          {step === 5 && (
            <SectionCard title="Review and publish" description="Check the details below. You can go back to any step.">
              <FieldGrid cols={2}>
                <Field label="Property" value={addr ? `${addr.project}, ${normalisedUnit}` : '—'} />
                <Field label="Address" value={addr ? `${addr.label}, Singapore ${addr.postal}` : '—'} />
                <Field label="Rent" value={`${sgd(Number(rent || 0))} per month`} />
                <Field label="Configuration" value={`${beds} bed · ${baths} bath · ${Number(sqft).toLocaleString()} sqft · ${propertyType}`} />
                <Field label="Lease" value={`Minimum ${lease} months · from ${availableFrom}`} />
                <Field label="Furnishing" value={furnishing} />
              </FieldGrid>
              <div className="mt-5">
                <div className="mb-2 text-[13px] font-medium text-p1-text-3">Amenities</div>
                <div className="flex flex-wrap gap-2">{amenities.length ? amenities.map((a) => <Pill key={a}>{a}</Pill>) : <span className="text-[13px] text-p1-text-3">None selected</span>}</div>
              </div>
              <div className="mt-5">
                <div className="mb-2 text-[13px] font-medium text-p1-text-3">Photos ({photos.length})</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {photos.map((v) => <PropertyImage key={v} seed={'new' + (addr?.postal ?? '')} variant={v} className="h-16 w-24 shrink-0" />)}
                </div>
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
              {step < STEPS.length - 1 ? (
                <Button variant="accent" rightIcon={<ChevronRight size={16} />} disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>Continue</Button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={saveDraft}>Save as draft</Button>
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
              {STEPS.map((s, i) => (
                <li key={s.label} className="flex items-center gap-2.5 text-[14px]">
                  <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold', i < step ? 'bg-p1-success text-white' : i === step ? 'bg-p1-accent text-p1-accent-on' : 'bg-p1-subtle text-p1-text-3')} aria-hidden>{i < step ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
                  <span className={cx(i === step ? 'font-semibold text-p1-text' : i < step ? 'text-p1-text-2' : 'text-p1-text-3')}>{s.label}</span>
                </li>
              ))}
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

      <ConfirmDialog open={confirmPublish} onClose={() => setConfirmPublish(false)} onConfirm={publish}
        title="Publish this listing?" description="It goes live immediately and uses one listing slot on your plan." confirmLabel="Publish listing" />

      <PresenterNote>
        Address search uses OneMap, the Singapore Land Authority dataset; a match on postal code attaches the listing to the existing
        property record rather than creating a duplicate, with coordinates stored as a PostGIS point. Photos upload straight to object
        storage via pre-signed URLs, are type-checked by signature, malware-scanned, EXIF-stripped and rendered at four widths. Two tabs
        pressing publish against the last quota slot must produce exactly one published listing — a mandatory concurrency test.
      </PresenterNote>
    </>
  );
}
