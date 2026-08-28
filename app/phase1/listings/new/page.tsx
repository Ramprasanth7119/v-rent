"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input, Textarea, Select } from '../../../../components/ui/Input';
import { PageHead, GateRow, SpecNote, Field } from '../../../../components/phase1/bits';
import { useDemo } from '../../../../lib/phase1/DemoContext';
import { sgd } from '../../../../lib/phase1/data';
import { Check, MapPin, Image as ImageIcon, Lock, Search } from 'lucide-react';

const STEPS = ['Address', 'Unit', 'Terms', 'Photos', 'Review'];

const ONEMAP_RESULTS = [
  { label: '11 NORMANTON PARK', postal: '119003', project: 'Normanton Park', district: 5, lat: 1.2884, lng: 103.7907 },
  { label: '2 MARINA BOULEVARD', postal: '018987', project: 'The Sail @ Marina Bay', district: 1, lat: 1.2809, lng: 103.8543 },
  { label: '118A RIVERVALE DRIVE', postal: '541118', project: 'Rivervale Delta', district: 19, lat: 1.3899, lng: 103.9021 },
];

export default function NewListingPage() {
  const router = useRouter();
  const { gate, canPublish, addListing, state } = useDemo();
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState('');
  const [addr, setAddr] = useState<(typeof ONEMAP_RESULTS)[number] | null>(null);
  const [unitNo, setUnitNo] = useState('');
  const [beds, setBeds] = useState('2');
  const [baths, setBaths] = useState('2');
  const [sqft, setSqft] = useState('850');
  const [rent, setRent] = useState('4200');
  const [furnishing, setFurnishing] = useState('Partially furnished');
  const [lease, setLease] = useState('12');
  const [desc, setDesc] = useState('Bright unit with unblocked views, five minutes to the MRT. Available for immediate viewing.');
  const [photos, setPhotos] = useState(0);

  const matches = query.length > 1
    ? ONEMAP_RESULTS.filter((r) => r.label.toLowerCase().includes(query.toLowerCase()) || r.postal.includes(query))
    : [];

  /** Unit numbers arrive in several shapes; normalise on write. */
  const normalisedUnit = unitNo
    ? '#' + unitNo.replace(/^#/, '').replace(/^unit\s*/i, '').trim()
    : '';

  const canAdvance = [!!addr, !!normalisedUnit, !!rent, photos > 0, true][step];

  const publish = () => {
    if (!addr) return;
    addListing({
      id: `lst-${Math.random().toString(36).slice(2, 8)}`,
      reference: `VR-${24110 + state.listings.length}`,
      agent: state.profile.fullName,
      project: addr.project,
      address: addr.label,
      postalCode: addr.postal,
      unitNo: normalisedUnit,
      district: addr.district,
      propertyType: 'Condominium',
      bedrooms: Number(beds),
      bathrooms: Number(baths),
      sizeSqft: Number(sqft),
      monthlyRent: Number(rent),
      availableFrom: '2026-10-01',
      minLeaseMonths: Number(lease),
      furnishing: furnishing as 'Unfurnished' | 'Partially furnished' | 'Fully furnished',
      status: canPublish ? 'published' : 'draft',
      images: photos,
      createdAt: '2026-08-28',
      publishedAt: canPublish ? '2026-08-28' : undefined,
      expiresAt: canPublish ? '2026-11-26' : undefined,
    });
    router.push('/phase1/listings');
  };

  return (
    <>
      <PageHead module="M12 · Listing Management" title="Create a listing" />

      {/* wizard rail */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
                i === step
                  ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                  : i < step
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'border-border text-neutral-400'
              }`}
            >
              {i < step ? <Check size={11} strokeWidth={3} /> : <span className="tabular-nums">{i + 1}</span>}
              {s}
            </button>
            {i < STEPS.length - 1 && <span className="text-neutral-300 dark:text-neutral-700">›</span>}
          </div>
        ))}
        <span className="ml-auto text-[11px] text-neutral-400">Draft saved automatically</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          {step === 0 && (
            <>
              <div className="mb-1 text-sm font-semibold text-foreground">Find the property</div>
              <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
                Address search uses OneMap, the Singapore Land Authority&apos;s authoritative dataset.
              </p>
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setAddr(null); }}
                  placeholder="Try “Normanton”, “Marina” or a postal code"
                  className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground placeholder-neutral-400 focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/10"
                />
              </div>
              {matches.length > 0 && !addr && (
                <div className="mt-2 overflow-hidden rounded-lg border border-border">
                  {matches.map((m) => (
                    <button
                      key={m.postal}
                      onClick={() => { setAddr(m); setQuery(m.label); }}
                      className="flex w-full items-center gap-2.5 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                      <MapPin size={14} className="flex-shrink-0 text-brand-gold" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium text-foreground">{m.label}</span>
                        <span className="block text-[11px] text-neutral-500">
                          Singapore {m.postal} · {m.project}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {addr && (
                <div className="mt-4 rounded-lg border border-border bg-neutral-50 p-3.5 dark:bg-neutral-950/40">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Project" value={addr.project} />
                    <Field label="Postal code" value={<span className="font-mono">{addr.postal}</span>} />
                    <Field label="Postal district" value={`D${String(addr.district).padStart(2, '0')}`} />
                    <Field label="Coordinates" value={<span className="font-mono text-xs">{addr.lat}, {addr.lng}</span>} />
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                    An existing property record was matched on postal code, so this listing attaches to it
                    rather than creating a duplicate. Coordinates are stored as a PostGIS point.
                  </p>
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <div className="mb-4 text-sm font-semibold text-foreground">Unit details</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Input
                    label="Unit number"
                    value={unitNo}
                    onChange={(e) => setUnitNo(e.target.value)}
                    placeholder="12-34, #12-34 or Unit 12-34"
                  />
                  {normalisedUnit && (
                    <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                      Stored as <span className="font-mono text-foreground">{normalisedUnit}</span> — normalised on write
                    </p>
                  )}
                </div>
                <Input label="Floor area (sqft)" value={sqft} onChange={(e) => setSqft(e.target.value.replace(/\D/g, ''))} />
                <Select label="Bedrooms" value={beds} onChange={(e) => setBeds(e.target.value)}
                  options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} bedroom${n > 1 ? 's' : ''}` }))} />
                <Select label="Bathrooms" value={baths} onChange={(e) => setBaths(e.target.value)}
                  options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n}` }))} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-4 text-sm font-semibold text-foreground">Rental terms</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Monthly rent (S$)" value={rent} onChange={(e) => setRent(e.target.value.replace(/\D/g, ''))} />
                <Select label="Minimum lease" value={lease} onChange={(e) => setLease(e.target.value)}
                  options={[{ value: '6', label: '6 months' }, { value: '12', label: '12 months' }, { value: '24', label: '24 months' }]} />
                <Select label="Furnishing" value={furnishing} onChange={(e) => setFurnishing(e.target.value)}
                  options={['Unfurnished', 'Partially furnished', 'Fully furnished'].map((v) => ({ value: v, label: v }))} />
                <Input label="Available from" type="date" defaultValue="2026-10-01" />
              </div>
              <div className="mt-4">
                <Textarea label="Description" rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} />
                <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                  Sanitised on the server. Client-side cleaning is a convenience, not a security control.
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="mb-1 text-sm font-semibold text-foreground">Photographs</div>
              <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
                Uploaded straight to object storage using a pre-signed URL, so large files never pass
                through the API.
              </p>
              <button
                onClick={() => setPhotos((n) => Math.min(30, n + 6))}
                className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-9 transition-colors hover:border-brand-gold/50 hover:bg-brand-gold/5"
              >
                <ImageIcon size={22} className="mb-2 text-neutral-400" />
                <span className="text-xs font-medium text-foreground">Click to simulate adding photographs</span>
                <span className="mt-1 text-[11px] text-neutral-500">JPEG, PNG, HEIC or WebP · up to 10 MB each</span>
              </button>
              {photos > 0 && (
                <>
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {Array.from({ length: photos }).map((_, i) => (
                      <div key={i} className="relative flex aspect-[4/3] items-center justify-center rounded-lg bg-neutral-100 text-[10px] text-neutral-400 dark:bg-neutral-900">
                        {i === 0 ? 'Cover' : i + 1}
                        <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                          <Check size={8} strokeWidth={3} />
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950/40">
                    <div className="text-[11px] font-semibold text-foreground">Processed on upload</div>
                    <ul className="mt-1.5 space-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                      <li>File type verified by signature, not by extension</li>
                      <li>Scanned for malware — unusable until it passes</li>
                      <li>EXIF stripped, including GPS coordinates</li>
                      <li>AVIF and WebP derivatives at four widths</li>
                    </ul>
                  </div>
                </>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div className="mb-4 text-sm font-semibold text-foreground">Review and publish</div>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Property" value={addr ? `${addr.project}, ${normalisedUnit}` : '—'} />
                <Field label="Address" value={addr ? `${addr.label}, S(${addr.postal})` : '—'} />
                <Field label="Rent" value={`${sgd(Number(rent || 0))} per month`} />
                <Field label="Configuration" value={`${beds} bed · ${baths} bath · ${sqft} sqft`} />
                <Field label="Lease" value={`Minimum ${lease} months`} />
                <Field label="Furnishing" value={furnishing} />
              </div>

              <div className="mt-5 rounded-lg border border-border bg-neutral-50 p-3.5 dark:bg-neutral-950/40">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Compliance snapshot — frozen at publication
                </div>
                <p className="mt-1.5 text-xs text-foreground">
                  {state.profile.fullName} · {state.profile.ceaNumber} · {state.profile.agency} (
                  {state.profile.agencyLicence})
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  Copied onto the listing, not read live from the profile. If this agent later changes
                  agency, advertisements already published keep displaying the licence number that was
                  correct when they went live.
                </p>
              </div>
            </>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < 4 ? (
              <Button variant="gold" disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>Continue</Button>
            ) : (
              <Button variant="gold" size="lg" leftIcon={!canPublish ? <Lock size={14} /> : undefined} onClick={publish}>
                {canPublish ? 'Publish listing' : 'Save as draft — publication blocked'}
              </Button>
            )}
          </div>
        </Card>

        <Card className={canPublish ? '' : 'border-red-300/60 dark:border-red-900/60'}>
          <div className="mb-2 text-xs font-semibold text-foreground">Publish gate</div>
          <p className="mb-2 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            Evaluated on the server when you press publish, not here.
          </p>
          <div>
            {gate.map((g) => (
              <GateRow key={g.id} pass={g.pass} label={g.label} detail={g.detail} fixHref={g.fixHref} fixLabel={g.fixLabel} />
            ))}
          </div>
        </Card>
      </div>

      <SpecNote>
        Two browser tabs pressing publish at the same moment, against a single remaining quota slot, must
        produce exactly one published listing. That concurrency case is one of the four mandatory tests
        in the specification.
      </SpecNote>
    </>
  );
}
