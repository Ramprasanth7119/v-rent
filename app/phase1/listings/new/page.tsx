"use client";

/**
 * Create or edit a listing — a guided task, five steps long.
 *
 * Each step asks one thing: where it is, what it is, the terms, the
 * photographs, and a last look before it goes live. The stepper stays in view,
 * the listing takes shape in a preview beside the form, and a field that is
 * missing says so on the field rather than greying out the button. A new
 * listing is kept on this device as it is typed, so a closed tab is not lost
 * work; photographs cannot be kept that way and the screen says so.
 *
 * Everything the old seven-step flow did is still here: OneMap address search
 * and map picking, the unit lookup, the building template, photograph upload
 * on save, the publish gate, and the edit and resubmit paths.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Button, LinkButton, Callout, TextInput, TextArea, SelectInput, EmptyState, Spinner, Segmented, Tooltip, cx,
} from '../../../../components/phase1/kit';
import { StatusBadge } from '../../../../components/phase1/status';
import { ConfirmDialog } from '../../../../components/phase1/overlays';
import { useToast } from '../../../../components/phase1/Toast';
import { MAX_MB, MAX_PHOTOS, PhotoNote, PhotoUploader, Shot, pendingFiles, photoUrl, savedIds } from '../../../../components/phase1/listing/PhotoUploader';
import { uploadPhotos } from '../../../../components/phase1/listing/upload';
import { PropertyMap } from '../../../../components/phase1/listing/PropertyMap';
import { LocationPicker } from '../../../../components/phase1/listing/LocationPicker';
import { NearbyPlaces } from '../../../../components/phase1/listing/NearbyPlaces';
import { FloorPlanUpload, type FloorPlanNote } from '../../../../components/phase1/listing/FloorPlanUpload';
import { VideoUpload } from '../../../../components/phase1/listing/VideoUpload';
import { MediaSection } from '../../../../components/phase1/listing/MediaSection';
import type { VideoNote } from '../../../../lib/phase1/video';
import { PropertyTypePicker } from '../../../../components/phase1/listing/PropertyTypePicker';
import { ChipPicker } from '../../../../components/phase1/listing/ChipPicker';
import { EligibilityPicker } from '../../../../components/phase1/listing/EligibilityPicker';
import { type EipEligibility, hasEligibility } from '../../../../lib/phase1/eip';
import { broadTypeFor, categoryFromBroad, type PropertyCategory } from '../../../../lib/phase1/property-types';
import { PropertyImage } from '../../../../components/phase1/PropertyImage';
import { useSession } from '../../../../lib/phase1/SessionContext';
import { useDemo, TODAY_ISO, preferredName } from '../../../../lib/phase1/DemoContext';
import { DemoListing, ListingStatus, sgd } from '../../../../lib/phase1/data';
import type { UnitFacts, UnitLookup } from '../../../../lib/phase1/unit-lookup';
import { DealType, dealOf, normaliseDeal } from '../../../../lib/phase1/pricing';
import type { AddressMatch as OneMapMatch } from '../../../../lib/phase1/onemap';
import { districtCode, districtLabel } from '../../../../lib/phase1/districts';
import { sgDate } from '../../../../lib/phase1/format';
import { AMENITIES, FITTINGS } from '../../../../lib/phase1/agents';
import { POLICY_NOTE, firstIssueMessage, reviewText } from '../../../../lib/phase1/content-policy';
import {
  Check, X, MapPin, Search, Lock, ChevronLeft, ArrowRight, ShieldCheck, Sparkles, SearchX, Send, Save, Map as MapIcon,
  Type as TypeIcon, Wand2, Pencil, Undo2, CheckCircle2, CircleAlert, ImagePlus, Building2, Sofa,
} from 'lucide-react';

const STEPS = [
  { key: 'address', label: 'Address', ask: 'Where is the property?', hint: 'Search the address or postal code, or point at it on the map.' },
  { key: 'property', label: 'Property', ask: 'Tell tenants about the unit', hint: 'Unit number, size and layout — the filters most searches use.' },
  { key: 'terms', label: 'Terms', ask: 'Set the price and terms', hint: 'The asking price, when it is available, and a short description.' },
  { key: 'photos', label: 'Media', ask: 'Add the photographs', hint: 'Photographs are needed. The floor plan and a video tour are optional.' },
  { key: 'review', label: 'Review', ask: 'Check and publish', hint: 'A last look at what tenants will see.' },
] as const;

type PropertyType = DemoListing['propertyType'];
type Furnishing = DemoListing['furnishing'];
type AddressMatch = OneMapMatch;

/**
 * `?step=` accepts the Listing Health section names used by the health panel,
 * the dashboard and the listing screen, and a 1-based number.
 */
const SECTION_STEP: Record<string, number> = {
  deal: 0, type: 0, property: 0, address: 0, location: 0,
  details: 1, unit: 1, amenities: 1,
  pricing: 2, terms: 2, rent: 2, price: 2, description: 2,
  media: 3, photos: 3,
  review: 4, publish: 4,
};

function stepFromParam(raw: string | null): number {
  if (!raw) return 0;
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= STEPS.length) return n - 1;
  return SECTION_STEP[raw.trim().toLowerCase()] ?? 0;
}

/* Offered in the dropdowns; anything beyond them is typed in. */
const LAYOUT_CHOICES = ['0', '1', '2', '3', '4', '5', '6'];

const DRAFT_KEY = 'vrent_listing_draft';

interface LocalDraft {
  at: string;
  deal: DealType; addr: AddressMatch | null; query: string; unitNo: string; beds: string; baths: string; sqft: string;
  propertyType: PropertyType; rent: string; salePrice: string; furnishing: Furnishing; lease: string; availableFrom: string;
  desc: string; amenities: string[]; fittings: string[]; step: number;
}

export default function NewListingPage() {
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
  const { gate, canPublish, addListing, updateListing, state, activeListings, listingLimit, demo } = useDemo();

  const editId = params.get('edit');
  const [editing] = useState<DemoListing | null>(
    () => (editId ? state.listings.find((l) => l.id === editId) ?? null : null),
  );
  const missing = Boolean(editId) && !editing;

  const [step, setStep] = useState(() => stepFromParam(params.get('step')));
  const [direction, setDirection] = useState<'next' | 'back'>('next');
  const [tried, setTried] = useState<Record<number, boolean>>({});
  const [deal, setDeal] = useState<DealType>(() => dealOf(editing ?? ({} as DemoListing)));
  const [salePrice, setSalePrice] = useState(() => (editing?.salePriceSgd ? String(editing.salePriceSgd) : ''));
  const [query, setQuery] = useState(() => editing?.address ?? '');
  const [addr, setAddr] = useState<AddressMatch | null>(() => (editing
    ? { label: editing.address, street: editing.address, postal: editing.postalCode, project: editing.project, district: editing.district, lat: editing.lat, lng: editing.lng }
    : null));
  const [addrMode, setAddrMode] = useState<'search' | 'map'>('search');
  const [unitNo, setUnitNo] = useState(() => editing?.unitNo ?? '');
  const [unitKnown, setUnitKnown] = useState<UnitLookup | null>(null);
  const [unitChecking, setUnitChecking] = useState(false);
  const [unitFilled, setUnitFilled] = useState(false);
  const [beds, setBeds] = useState(() => String(editing?.bedrooms ?? 2));
  const [baths, setBaths] = useState(() => String(editing?.bathrooms ?? 2));
  const [sqft, setSqft] = useState(() => (editing?.sizeSqft ? String(editing.sizeSqft) : ''));
  const [propertyType, setPropertyType] = useState<PropertyType>(() => editing?.propertyType ?? 'Condominium');
  const [category, setCategory] = useState<PropertyCategory>(
    () => (editing?.propertyCategory as PropertyCategory) ?? categoryFromBroad(editing?.propertyType ?? 'Condominium'),
  );
  const [subtype, setSubtype] = useState<string>(() => editing?.propertySubtype ?? '');

  /* One choice sets all three: the exact classification the agent picked, the
     category it came from, and the broad type every existing filter reads. */
  const chooseType = (next: PropertyCategory, chosen: string) => {
    setCategory(next);
    setSubtype(chosen);
    setPropertyType(broadTypeFor(next, chosen) as PropertyType);
  };
  const [rent, setRent] = useState(() => (editing?.monthlyRent ? String(editing.monthlyRent) : ''));
  const [furnishing, setFurnishing] = useState<Furnishing>(() => editing?.furnishing ?? 'Partially furnished');
  const [furnishingNote, setFurnishingNote] = useState(() => editing?.furnishingNote ?? '');
  const [eligibility, setEligibility] = useState<EipEligibility>(
    () => ({ ethnic: (editing?.eligibility?.ethnic ?? []) as EipEligibility['ethnic'], citizenship: (editing?.eligibility?.citizenship ?? []) as EipEligibility['citizenship'] }),
  );
  const [lease, setLease] = useState(() => String(editing?.minLeaseMonths ?? 12));
  const [availableFrom, setAvailableFrom] = useState(() => editing?.availableFrom ?? TODAY_ISO);
  const [desc, setDesc] = useState(() => editing?.description ?? '');
  const [amenities, setAmenities] = useState<string[]>(() => editing?.amenities ?? []);
  const [fittings, setFittings] = useState<string[]>(() => editing?.fittings ?? []);
  const [floorPlan, setFloorPlan] = useState<FloorPlanNote | null>(() => editing?.floorPlan ?? null);
  const [video, setVideo] = useState<VideoNote | null>(() => editing?.video ?? null);
  const [shots, setShots] = useState<Shot[]>(() => (editing?.photos ?? []).map((id) => ({ kind: 'saved', id }) as Shot));
  const [uploading, setUploading] = useState(false);
  const [photoNotes, setPhotoNotes] = useState<PhotoNote[]>([]);
  const [carried, setCarried] = useState<Pick<DemoListing, 'nearestMrt' | 'tenure' | 'builtYear'>>(() => ({
    nearestMrt: editing?.nearestMrt, tenure: editing?.tenure, builtYear: editing?.builtYear,
  }));
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [committing, setCommitting] = useState(false);

  /* ------------------------------------------------ on-device autosave */

  const [restorable, setRestorable] = useState<LocalDraft | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (editing) { hydrated.current = true; return; }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const d = raw ? (JSON.parse(raw) as LocalDraft) : null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- offered once, after mount
      if (d && (d.addr || d.desc || d.unitNo)) setRestorable(d);
    } catch { /* storage blocked or unreadable: start clean */ }
    hydrated.current = true;
  }, [editing]);

  const restore = (d: LocalDraft) => {
    setDeal(d.deal); setAddr(d.addr); setQuery(d.query); setUnitNo(d.unitNo); setBeds(d.beds); setBaths(d.baths); setSqft(d.sqft);
    setPropertyType(d.propertyType); setRent(d.rent); setSalePrice(d.salePrice); setFurnishing(d.furnishing); setLease(d.lease);
    setAvailableFrom(d.availableFrom); setDesc(d.desc); setAmenities(d.amenities); setFittings(d.fittings ?? []); setStep(Math.min(d.step, 3));
    setRestorable(null);
    push({ tone: 'success', title: 'Draft restored', body: 'Photographs are not kept between visits — add them again.' });
  };
  const discard = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* nothing to remove */ } setRestorable(null); };

  useEffect(() => {
    if (editing || !hydrated.current || restorable) return;
    if (!addr && !desc && !unitNo) return;
    const t = setTimeout(() => {
      const d: LocalDraft = { at: new Date().toISOString(), deal, addr, query, unitNo, beds, baths, sqft, propertyType, rent, salePrice, furnishing, lease, availableFrom, desc, amenities, fittings, step };
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); setSavedAt(d.at); } catch { /* not kept; nothing to say */ }
    }, 600);
    return () => clearTimeout(t);
  }, [editing, restorable, deal, addr, query, unitNo, beds, baths, sqft, propertyType, rent, salePrice, furnishing, lease, availableFrom, desc, amenities, fittings, step]);

  const clearLocalDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* nothing to clear */ } };

  /* --------------------------------------------------- address search */

  const [matches, setMatches] = useState<AddressMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedTerm, setSearchedTerm] = useState('');
  const [cursor, setCursor] = useState(-1);
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
        setCursor(-1);
      } catch {
        if (seq === searchSeq.current) setMatches([]);
      } finally {
        if (seq === searchSeq.current) { setSearchedTerm(term); setSearching(false); }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, addr]);

  /** What this agent already recorded about this building. Offered, not applied. */
  const template = useMemo(() => {
    if (!addr) return null;
    return state.listings
      .filter((l) => !l.archived && l.id !== editing?.id)
      .filter((l) => l.postalCode === addr.postal || l.project.toLowerCase() === addr.project.toLowerCase())
      .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))[0] ?? null;
  }, [addr, state.listings, editing?.id]);
  const [templateUsed, setTemplateUsed] = useState(false);

  const applyTemplate = () => {
    if (!template) return;
    setPropertyType(template.propertyType);
    setCategory((template.propertyCategory as PropertyCategory) ?? categoryFromBroad(template.propertyType));
    if (template.propertySubtype) setSubtype(template.propertySubtype);
    if (template.amenities?.length) setAmenities(template.amenities);
    if (template.fittings?.length) setFittings(template.fittings);
    if (template.nearestMrt || template.tenure || template.builtYear) {
      setCarried({ nearestMrt: template.nearestMrt, tenure: template.tenure, builtYear: template.builtYear });
    }
    setTemplateUsed(true);
    push({ tone: 'success', title: 'Building details copied', body: `From ${template.project} ${template.unitNo}. Change anything that differs.` });
  };

  const term = query.trim();
  const showMatches = !addr && term.length >= 3 && searchedTerm === term ? matches : [];
  const noMatches = !addr && searchedTerm === term && term.length >= 3 && matches.length === 0 && !searching;

  const pickAddress = (m: AddressMatch) => { setAddr(m); setQuery(m.label); setMatches([]); };

  /* ------------------------------------------------------ unit lookup */

  const normalisedUnit = unitNo ? '#' + unitNo.replace(/^#/, '').replace(/^unit\s*/i, '').trim() : '';

  useEffect(() => {
    let live = true;
    const unit = normalisedUnit.replace('#', '');
    const postal = addr?.postal;
    const timer = setTimeout(async () => {
      if (!live) return;
      if (!postal || unit.length < 3) { setUnitKnown(null); setUnitChecking(false); return; }
      setUnitChecking(true);
      try {
        const q = new URLSearchParams({ postalCode: postal, unit });
        if (editing?.id) q.set('exclude', editing.id);
        const res = await fetch(`/api/phase1/unit?${q.toString()}`, { cache: 'no-store' });
        if (!live) return;
        setUnitKnown(res.ok ? ((await res.json()) as UnitLookup) : null);
      } catch {
        if (live) setUnitKnown(null);
      } finally {
        if (live) setUnitChecking(false);
      }
    }, 450);
    return () => { live = false; clearTimeout(timer); };
  }, [addr?.postal, normalisedUnit, editing?.id]);

  const fillFromUnit = (facts: UnitFacts) => {
    setSqft(String(facts.sizeSqft));
    setBeds(String(facts.bedrooms));
    setBaths(String(facts.bathrooms));
    setPropertyType(facts.propertyType);
    setCategory(categoryFromBroad(facts.propertyType));
    setFurnishing(facts.furnishing);
    if (facts.amenities.length) setAmenities(facts.amenities);
    if (facts.nearestMrt || facts.tenure || facts.builtYear) {
      setCarried({ nearestMrt: facts.nearestMrt, tenure: facts.tenure, builtYear: facts.builtYear });
    }
    setUnitFilled(true);
    push({ tone: 'success', title: `Filled in from ${facts.unitNo}`, body: 'Size, layout and fittings carried across.' });
  };

  /* -------------------------------------------------------- validation */

  const priceValue = deal === 'sale' ? salePrice : rent;
  const errors: Record<string, string | undefined>[] = [
    { addr: addr ? undefined : 'Choose the property from the results, or pick it on the map.' },
    {
      unit: normalisedUnit ? undefined : 'Add the unit number, for example 12-34.',
      type: subtype ? undefined : 'Choose the property type.',
      sqft: Number(sqft) > 0 ? undefined : 'Add the floor area in square feet.',
    },
    {
      price: Number(priceValue) > 0 ? undefined : deal === 'sale' ? 'Add the asking price.' : 'Add the monthly rent.',
      /* Length first: an agent who has written three words needs telling that
         before they are told anything about policy. */
      desc: desc.trim().length >= 20
        ? firstIssueMessage(desc) ?? undefined
        : `Write at least 20 characters (${desc.trim().length} so far).`,
    },
    { photos: shots.length > 0 ? undefined : 'Add at least one photograph.' },
    {},
  ];
  const stepValid = (i: number) => Object.values(errors[i]).every((e) => !e);
  const err = (i: number, key: string) => (tried[i] ? errors[i][key] : undefined);
  const completed = (i: number) => (editing ? stepValid(i) : i < step && stepValid(i));

  const go = (to: number) => {
    setDirection(to > step ? 'next' : 'back');
    setStep(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const next = () => {
    if (!stepValid(step)) {
      setTried((t) => ({ ...t, [step]: true }));
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus());
      return;
    }
    go(step + 1);
  };
  const reachable = (i: number) => Boolean(editing) || i <= step || STEPS.slice(0, i).every((_, j) => stepValid(j));

  /* ---------------------------------------------------------- photos */

  const onPhotos = async (nextShots: Shot[], added: File[]) => {
    setShots(nextShots);
    // The demo account is never written to the server, photographs included; they stay as previews.
    if (!editing || demo) return;
    if (added.length > 0) {
      setUploading(true);
      try {
        const result = await uploadPhotos(editing.id, added);
        /* What the server holds is the truth; previews of anything it did not keep are dropped. */
        setShots(result.photos ? result.photos.map((id) => ({ kind: 'saved', id }) as Shot) : shots);
        setPhotoNotes(result.warnings);
        const kept = added.length - result.failed.length - result.rejected.length;
        if (result.failed.length) {
          const more = result.failed.length > 1 ? ` ${result.failed.length} photographs were not saved.` : '';
          push({ tone: 'error', title: kept > 0 ? 'Some photographs were not uploaded' : 'Upload failed', body: `${result.failed[0].message}${more}` });
        } else if (result.rejected.length) {
          push({ tone: 'warn', title: 'Some photographs were not added', body: result.rejected.join(', ') });
        } else {
          push({ tone: 'success', title: added.length === 1 ? 'Photograph added' : `${added.length} photographs added` });
        }
      } finally {
        setUploading(false);
      }
      return;
    }
    setUploading(true);
    try {
      await fetch('/api/phase1/photos?remove=1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listingId: editing.id, photos: savedIds(nextShots) }),
      });
    } finally {
      setUploading(false);
    }
  };

  const commitPhotos = async (listingId: string) => {
    const files = pendingFiles(shots);
    if (files.length === 0 || demo) return;
    const result = await uploadPhotos(listingId, files);
    if (result.failed.length) {
      push({
        tone: 'warn',
        title: result.photos ? 'Some photographs were not uploaded' : 'Listing saved without photographs',
        body: `${result.failed[0].message} Open the listing and add them again.`,
      });
    } else if (result.warnings.length) {
      push({ tone: 'warn', title: 'Some photographs are worth a second look', body: result.warnings.map((w) => w.name).join(', ') });
    }
  };

  /* ------------------------------------------------------------ saving */

  const fields = () => normaliseDeal({
    description: desc,
    project: addr!.project,
    address: addr!.label,
    postalCode: addr!.postal,
    unitNo: normalisedUnit,
    district: addr!.district,
    lat: addr!.lat,
    lng: addr!.lng,
    propertyType,
    propertyCategory: category,
    propertySubtype: subtype || undefined,
    furnishingNote: furnishing === 'Other' ? furnishingNote.trim() || undefined : undefined,
    eligibility: category === 'hdb' && hasEligibility(eligibility) ? eligibility : undefined,
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
    fittings,
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
    if (!addr || committing) return;
    setCommitting(true);
    try {
      const listing = build('draft');
      addListing(listing);
      await commitPhotos(listing.id);
      clearLocalDraft();
      push({ tone: 'success', title: 'Draft saved', body: 'Finish and publish it from My listings.' });
      router.push('/phase1/listings');
    } catch {
      push({ tone: 'error', title: 'The draft was not saved', body: 'Your photographs did not finish uploading. Try again in a moment.' });
      setCommitting(false);
    }
  };

  const publish = async () => {
    if (!addr || committing) return;
    setCommitting(true);
    try {
      const listing = build(canPublish ? 'published' : 'draft');
      addListing(listing);
      await commitPhotos(listing.id);
      clearLocalDraft();
      setConfirmPublish(false);
      push(canPublish
        ? { tone: 'success', title: 'Listing published', body: `${addr.project} is now live.` }
        : { tone: 'warn', title: 'Saved as draft', body: 'Publication is blocked — see the checklist.' });
      router.push('/phase1/listings');
    } catch {
      push({ tone: 'error', title: 'The listing was not published', body: 'Your photographs did not finish uploading. Try again in a moment.' });
      setCommitting(false);
    }
  };

  const saveChanges = () => {
    if (!addr || !editing) return;
    updateListing(editing.id, fields());
    push({ tone: 'success', title: 'Changes saved', body: `${addr.project} ${normalisedUnit} has been updated.` });
    router.push(`/phase1/listings/${editing.id}`);
  };

  const resubmit = () => {
    if (!addr || !editing) return;
    updateListing(editing.id, { ...fields(), status: 'pending_review' as ListingStatus, rejectionReason: undefined });
    push({ tone: 'success', title: 'Sent for review', body: 'A moderator will look at the corrected listing.' });
    router.push(`/phase1/listings/${editing.id}`);
  };

  const publishEdit = () => {
    setConfirmPublish(false);
    if (!addr || !editing) return;
    updateListing(editing.id, { ...fields(), status: 'published' as ListingStatus, publishedAt: TODAY_ISO, expiresAt: '2026-11-26' });
    push({ tone: 'success', title: 'Listing published', body: `${addr.project} ${normalisedUnit} is now live.` });
    router.push(`/phase1/listings/${editing.id}`);
  };

  /* Re-read on every change: the list is short and the check is a handful of
     regular expressions over a paragraph. */
  const descIssues = useMemo(() => reviewText(desc), [desc]);


  if (missing) {
    return (
      <EmptyState
        icon={<SearchX size={22} />}
        title="That listing is no longer here"
        description="It may have been archived since the link was made."
        action={<LinkButton href="/phase1/listings">Back to listings</LinkButton>}
      />
    );
  }

  const cover = shots[0] ? (shots[0].kind === 'pending' ? shots[0].url : editing ? photoUrl(user?.id ?? '', editing.id, shots[0].id) : undefined) : undefined;
  const priceShown = Number(priceValue) > 0 ? (deal === 'sale' ? sgd(Number(salePrice)) : sgd(Number(rent))) : null;
  const S = STEPS[step];
  const lastStep = step === STEPS.length - 1;
  const psfHint = Number(priceValue) > 0 && Number(sqft) > 0
    ? deal === 'sale' ? `About S$${Math.round(Number(salePrice) / Number(sqft)).toLocaleString('en-SG')} psf` : `About S$${(Number(rent) / Number(sqft)).toFixed(2)} psf a month`
    : undefined;

  return (
    <>
      {/* ------------------------------------------------------------ title */}
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <Link href={editing ? `/phase1/listings/${editing.id}` : '/phase1/listings'} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-lg text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text">
          <ChevronLeft size={18} aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-semibold tracking-[-0.02em] text-p1-text sm:text-[24px]">
            {editing ? `${editing.project} ${editing.unitNo}` : 'New listing'}
          </h1>
        </div>
        {editing && <StatusBadge kind="listing" value={editing.status} size="sm" />}
        {!editing && savedAt && (
          <Tooltip content="Kept in this browser as you type. Photographs are not kept.">
            <span tabIndex={0} className="p1-in inline-flex items-center gap-1.5 text-[12.5px] text-p1-text-3"><CheckCircle2 size={14} className="text-p1-success" aria-hidden /> Saved on this device</span>
          </Tooltip>
        )}
      </header>

      {restorable && (
        <Callout tone="info" className="mb-4" title="Pick up where you left off?"
          action={<div className="flex gap-2"><Button size="sm" variant="ghost" onClick={discard}>Discard</Button><Button size="sm" leftIcon={<Undo2 size={14} />} onClick={() => restore(restorable)}>Restore</Button></div>}>
          {restorable.addr?.project ?? 'An unfinished listing'} · started {sgDate(restorable.at)}
        </Callout>
      )}

      {editing?.status === 'rejected' && editing.rejectionReason && (
        <Callout tone="danger" compact className="mb-4" title="What the moderator flagged">{editing.rejectionReason}</Callout>
      )}

      {/* --------------------------------------------------------- stepper */}
      <nav aria-label="Steps" data-print-hide className="sticky top-14 z-20 -mx-4 mb-6 border-b border-p1-border bg-p1-bg/90 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <ol className="p1-noscrollbar flex h-14 items-center gap-1 overflow-x-auto">
          {STEPS.map((s, i) => {
            const active = i === step;
            const done = completed(i) && !active;
            const canGo = reachable(i) && !active;
            const inner = (
              <>
                <span className={cx('flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11.5px] font-semibold tabular-nums transition-colors duration-200',
                  active ? 'bg-p1-primary text-p1-primary-on' : done ? 'bg-p1-success-soft text-p1-success' : 'bg-p1-subtle text-p1-text-3')}>
                  {done ? <Check size={12} strokeWidth={3} aria-hidden /> : String(i + 1).padStart(2, '0')}
                </span>
                <span className={cx('whitespace-nowrap text-[13.5px]', active ? 'font-semibold text-p1-text' : done ? 'font-medium text-p1-text-2' : 'text-p1-text-3', !active && 'hidden sm:inline')}>{s.label}</span>
              </>
            );
            return (
              <li key={s.key} className={cx('flex items-center', i < STEPS.length - 1 && 'flex-1')} aria-current={active ? 'step' : undefined}>
                {canGo
                  ? <button type="button" onClick={() => go(i)} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-p1-subtle">{inner}<span className="sr-only">{done ? ' (done)' : ''}</span></button>
                  : <span className="flex items-center gap-2 px-1.5 py-1">{inner}</span>}
                {i < STEPS.length - 1 && (
                  <span className="mx-1 h-px min-w-3 flex-1 overflow-hidden bg-p1-border" aria-hidden>
                    <span className={cx('block h-full origin-left bg-p1-success transition-transform duration-300 ease-out', completed(i) ? 'scale-x-100' : 'scale-x-0')} />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div key={step} className={direction === 'next' ? 'p1-step-next' : 'p1-step-back'}>
            <div className="mb-5">
              <p className="text-[12.5px] font-medium tabular-nums text-p1-text-3">Step {step + 1} of {STEPS.length}</p>
              <h2 className="mt-0.5 text-[20px] font-semibold tracking-[-0.015em] text-p1-text">{S.ask}</h2>
              <p className="mt-0.5 text-[14px] text-p1-text-3">{S.hint}</p>
            </div>

            <div className="rounded-2xl border border-p1-border bg-p1-surface p-5 sm:p-6">
              {/* ------------------------------------------------ 1 address */}
              {step === 0 && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Segmented<DealType>
                      label="Rent or sale"
                      value={deal}
                      onChange={setDeal}
                      options={[{ key: 'rent', label: 'For rent' }, { key: 'sale', label: 'For sale' }]}
                    />
                    <Segmented<'search' | 'map'>
                      label="How to find the property"
                      size="sm"
                      value={addrMode}
                      onChange={setAddrMode}
                      options={[{ key: 'search', label: 'Search', icon: <TypeIcon size={14} /> }, { key: 'map', label: 'Map', icon: <MapIcon size={14} /> }]}
                    />
                  </div>

                  {addrMode === 'search' ? (
                    <div>
                      <div className="relative">
                        <TextInput
                          label="Address or postal code"
                          leftIcon={<Search size={17} />}
                          value={query}
                          onChange={(e) => { setQuery(e.target.value); setAddr(null); }}
                          onKeyDown={(e) => {
                            if (!showMatches.length) return;
                            if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(showMatches.length - 1, c + 1)); }
                            if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
                            if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); pickAddress(showMatches[cursor]); }
                          }}
                          placeholder="e.g. 018987 or 2 Marina Boulevard"
                          autoComplete="off"
                          role="combobox"
                          aria-expanded={showMatches.length > 0}
                          aria-controls="address-matches"
                          rightSlot={searching ? <Spinner size={14} /> : undefined}
                          error={err(0, 'addr')}
                          hint={!addr ? 'Matched against OneMap, the Singapore Land Authority register.' : undefined}
                        />
                      </div>
                      {showMatches.length > 0 && (
                        <ul id="address-matches" className="p1-panel mt-2 overflow-hidden rounded-xl border border-p1-border bg-p1-elevated shadow-p1-md" role="listbox" aria-label="Address matches">
                          {showMatches.map((m, i) => (
                            <li key={`${m.postal}-${i}`} role="option" aria-selected={i === cursor}>
                              <button type="button" onClick={() => pickAddress(m)} onMouseEnter={() => setCursor(i)}
                                className={cx('flex w-full cursor-pointer items-center gap-3 border-b border-p1-border px-4 py-2.5 text-left last:border-b-0', i === cursor ? 'bg-p1-subtle' : 'hover:bg-p1-subtle')}>
                                <MapPin size={16} className="shrink-0 text-p1-text-3" aria-hidden />
                                <span className="min-w-0">
                                  <span className="block truncate text-[14px] font-medium text-p1-text">{m.project || m.label}</span>
                                  <span className="block truncate text-[12.5px] text-p1-text-3">{m.label} · {m.postal}</span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {noMatches && (
                        <p className="mt-2 text-[13px] text-p1-text-3">
                          No match in the address register. Try the postal code, or{' '}
                          <button type="button" onClick={() => setAddrMode('map')} className="cursor-pointer font-medium text-p1-primary underline-offset-4 hover:underline">pick it on the map</button>.
                        </p>
                      )}
                    </div>
                  ) : (
                    <LocationPicker initial={{ lat: addr?.lat, lng: addr?.lng }} onPick={(m) => { setAddr(m); setQuery(m.label); }} />
                  )}

                  {addr && (
                    <div className="p1-in overflow-hidden rounded-xl border border-p1-success-border">
                      <div className="flex items-start gap-3 bg-p1-success-soft/60 px-4 py-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-p1-success text-white dark:text-p1-bg" aria-hidden>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="p1-check"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14.5px] font-semibold text-p1-text">{addr.project}</div>
                          <div className="text-[13px] text-p1-text-2">{addr.label} · {addr.postal}{addr.district ? ` · ${districtCode(addr.district)} ${districtLabel(addr.district)}` : ''}</div>
                        </div>
                        <button type="button" onClick={() => { setAddr(null); setQuery(''); }} className="shrink-0 cursor-pointer text-[13px] font-medium text-p1-text-2 hover:text-p1-text">Change</button>
                      </div>
                      {addrMode === 'search' && addr.lat !== undefined && <PropertyMap lat={addr.lat} lng={addr.lng} label={addr.label} height={180} className="rounded-none border-0 border-t" />}
                    </div>
                  )}

                  {addr && template && !templateUsed && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-p1-primary/25 bg-p1-primary-soft px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2.5 text-[13.5px] text-p1-text">
                        <Sparkles size={15} className="shrink-0 text-p1-primary" aria-hidden />
                        <span>You have listed here before — copy the building details from {template.unitNo}?</span>
                      </div>
                      <Button size="sm" variant="primary" onClick={applyTemplate}>Copy details</Button>
                    </div>
                  )}

                  {/* Keyed on the point, so changing the address drops the
                      previous neighbourhood rather than leaving it on screen. */}
                  {addr && (
                    <NearbyPlaces
                      key={`${addr.lat},${addr.lng}`}
                      lat={addr.lat}
                      lng={addr.lng}
                      postal={addr.postal}
                      label={addr.project || addr.label}
                    />
                  )}

                  {editing && <p className="text-[13px] text-p1-text-3">Changing this on a live listing changes where it appears in search.</p>}
                </div>
              )}

              {/* ----------------------------------------------- 2 property */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextInput
                      label="Unit number"
                      required
                      value={unitNo}
                      onChange={(e) => { setUnitNo(e.target.value); setUnitFilled(false); }}
                      placeholder="12-34"
                      rightSlot={unitChecking ? <Spinner size={14} /> : undefined}
                      error={err(1, 'unit')}
                      /* One line. The long version of this note was read as a
                         warning rather than as reassurance, which is the
                         opposite of what it is for. */
                      hint={
                        <span className="flex items-start gap-1.5">
                          <ShieldCheck size={13} className="mt-0.5 shrink-0 text-p1-success" aria-hidden />
                          <span>
                            Kept private — never shown to tenants, on the advertisement or in reports. For your records
                            only{normalisedUnit ? <>, saved as <span className="font-medium text-p1-text">{normalisedUnit}</span></> : null}.
                          </span>
                        </span>
                      }
                    />
                    <TextInput label="Floor area" required inputMode="numeric" value={sqft} onChange={(e) => setSqft(e.target.value.replace(/\D/g, ''))} rightSlot="sqft" error={err(1, 'sqft')} placeholder="850" />
                  </div>

                  {unitKnown && (unitKnown.yours || unitKnown.sameStack || unitKnown.othersAdvertising > 0) && (
                    <div className="grid gap-3">
                      {unitKnown.yours && !unitKnown.yours.archived && unitKnown.yours.status !== 'expired' && unitKnown.yours.status !== 'rejected' ? (
                        <Callout tone="warning" title="You already advertise this unit" action={<LinkButton size="sm" variant="outline" href={`/phase1/listings/${unitKnown.yours.listingId}`}>Open it</LinkButton>}>
                          {unitKnown.yours.reference} · {sgd(unitKnown.yours.monthlyRent)}/month. Edit that listing unless this is a different unit.
                        </Callout>
                      ) : unitKnown.yours ? (
                        <Callout tone="info" title="You have let this unit before"
                          action={!unitFilled ? <Button size="sm" variant="outline" leftIcon={<Wand2 size={14} />} onClick={() => fillFromUnit(unitKnown.yours!)}>Fill in</Button> : undefined}>
                          {unitKnown.yours.sizeSqft.toLocaleString('en-SG')} sqft · {unitKnown.yours.bedrooms} bed · {unitKnown.yours.bathrooms} bath · {unitKnown.yours.furnishing}
                        </Callout>
                      ) : unitKnown.sameStack ? (
                        <Callout tone="neutral" title={`Same stack as ${unitKnown.sameStack.unitNo}`}
                          action={!unitFilled ? <Button size="sm" variant="outline" leftIcon={<Wand2 size={14} />} onClick={() => fillFromUnit(unitKnown.sameStack!)}>Use its layout</Button> : undefined}>
                          {unitKnown.sameStack.sizeSqft.toLocaleString('en-SG')} sqft · {unitKnown.sameStack.bedrooms} bed · {unitKnown.sameStack.bathrooms} bath
                        </Callout>
                      ) : null}
                      {unitKnown.othersAdvertising > 0 && (
                        <Callout tone="neutral" compact>
                          {unitKnown.othersAdvertising === 1 ? 'Another agent advertises' : `${unitKnown.othersAdvertising} other agents advertise`} this unit. Nothing is blocked.
                        </Callout>
                      )}
                    </div>
                  )}

                  <div className="grid gap-5 sm:grid-cols-3">
                    <PropertyTypePicker
                      category={category}
                      subtype={subtype || undefined}
                      onChange={chooseType}
                      required
                      error={err(1, 'type')}
                    />
                    {/* Studios have none and a good class bungalow has nine,
                        so the list runs further than the old one and ends in a
                        box rather than in a ceiling. */}
                    <SelectInput label="Bedrooms" value={LAYOUT_CHOICES.includes(beds) ? beds : 'other'} onChange={(e) => setBeds(e.target.value === 'other' ? '' : e.target.value)}
                      options={[...LAYOUT_CHOICES.map((n) => ({ value: n, label: n === '0' ? 'Studio' : n })), { value: 'other', label: 'Other' }]} />
                    <SelectInput label="Bathrooms" value={LAYOUT_CHOICES.includes(baths) ? baths : 'other'} onChange={(e) => setBaths(e.target.value === 'other' ? '' : e.target.value)}
                      options={[...LAYOUT_CHOICES.filter((n) => n !== '0').map((n) => ({ value: n, label: n })), { value: 'other', label: 'Other' }]} />
                  </div>

                  {(!LAYOUT_CHOICES.includes(beds) || !LAYOUT_CHOICES.includes(baths)) && (
                    <div className="grid gap-5 sm:grid-cols-2">
                      {!LAYOUT_CHOICES.includes(beds) && (
                        <TextInput label="How many bedrooms" inputMode="numeric" value={beds}
                          onChange={(e) => setBeds(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="6" />
                      )}
                      {!LAYOUT_CHOICES.includes(baths) && (
                        <TextInput label="How many bathrooms" inputMode="numeric" value={baths}
                          onChange={(e) => setBaths(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="5" />
                      )}
                    </div>
                  )}

                  <ChipPicker
                    icon={<Building2 size={15} />}
                    legend="Facilities in the development"
                    suggestions={AMENITIES}
                    value={amenities}
                    onChange={setAmenities}
                    placeholder="Bowling alley, tennis court…"
                    hint="Shared facilities everybody living here can use. Tenants filter on these."
                  />

                  {/* What is in the unit, as opposed to what the block has.
                      "Partially furnished" means different things to different
                      agents; this is where that is settled before a viewing. */}
                  <ChipPicker
                    icon={<Sofa size={15} />}
                    legend="Included in the unit"
                    suggestions={FITTINGS}
                    value={fittings}
                    onChange={setFittings}
                    placeholder="Piano, bidet, water purifier…"
                    hint="Appliances and fittings that come with the unit. Shown beside the furnishing you set on the next step."
                  />

                  {/* HDB blocks carry an ethnic quota, so an HDB flat has a
                      real answer to "who may take this" and nothing else does. */}
                  {category === 'hdb' && (
                    <EligibilityPicker value={eligibility} onChange={setEligibility} />
                  )}
                </div>
              )}

              {/* -------------------------------------------------- 3 terms */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    {deal === 'sale' ? (
                      <TextInput label="Asking price" required inputMode="numeric" value={salePrice ? Number(salePrice).toLocaleString('en-SG') : ''}
                        onChange={(e) => setSalePrice(e.target.value.replace(/\D/g, ''))} leftIcon={<span className="text-[14px] font-medium">S$</span>}
                        placeholder="1,350,000" error={err(2, 'price')} hint={psfHint} />
                    ) : (
                      <TextInput label="Monthly rent" required inputMode="numeric" value={rent ? Number(rent).toLocaleString('en-SG') : ''}
                        onChange={(e) => setRent(e.target.value.replace(/\D/g, ''))} leftIcon={<span className="text-[14px] font-medium">S$</span>}
                        placeholder="4,200" error={err(2, 'price')} hint={psfHint} />
                    )}
                    <TextInput label={deal === 'sale' ? 'Viewings from' : 'Available from'} type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
                    <SelectInput label="Furnishing" value={furnishing} onChange={(e) => setFurnishing(e.target.value as Furnishing)}
                      options={['Unfurnished', 'Partially furnished', 'Fully furnished', 'Other'].map((v) => ({ value: v, label: v }))} />
                    {furnishing === 'Other' && (
                      <TextInput
                        label="Describe the furnishing"
                        value={furnishingNote}
                        onChange={(e) => setFurnishingNote(e.target.value.slice(0, 80))}
                        placeholder="White goods only, tenant brings the rest"
                        hint="Shown to tenants in place of the three standard words."
                      />
                    )}
                    {deal === 'rent' && (
                      <SelectInput label="Minimum lease" value={lease} onChange={(e) => setLease(e.target.value)}
                        options={[{ value: '6', label: '6 months' }, { value: '12', label: '12 months' }, { value: '24', label: '24 months' }]} />
                    )}
                  </div>
                  <TextArea
                    label="Description"
                    required
                    rows={5}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Quiet stack, no west sun, five minutes' walk to the MRT…"
                    counter={`${desc.trim().length}`}
                    error={err(2, 'desc')}
                    hint={
                      <>
                        What photographs cannot show. Three things are not allowed and will stop the listing
                        publishing: wording that excludes or prefers people by race, nationality or religion;
                        suggestive or flirtatious wording; and your own phone number or email — tenants enquire
                        through V-RENT so the lead is recorded.
                        {category === 'hdb' && ' If the block has an ethnic quota, set who the flat is open to on the previous step rather than writing it here.'}
                      </>
                    }
                  />
                  {/* Shown while the agent is still typing rather than held
                      back until they press Continue: a description is rewritten
                      far more willingly before it feels finished. */}
                  {descIssues.length > 0 && (
                    <Callout tone="warning" title={descIssues.length === 1 ? 'This cannot be published as written' : `${descIssues.length} things cannot be published as written`}>
                      <ul className="space-y-1.5">
                        {descIssues.map((i) => (
                          <li key={`${i.kind}:${i.phrase}`}>
                            <span className="font-medium">“{i.phrase}”</span> — {i.message}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[12.5px]">{POLICY_NOTE}</p>
                    </Callout>
                  )}
                </div>
              )}

              {/* -------------------------------------------------- 4 media */}
              {/* Three uploads, three sections. They were one block once, and
                  an agent with a PDF floor plan would drop it into the photo
                  grid, which rejected it. Separating them says which file
                  belongs where before anybody goes looking for one. */}
              {step === 3 && (
                <div className="space-y-4">
                  <div data-invalid={err(3, 'photos') ? 'true' : undefined} tabIndex={err(3, 'photos') ? -1 : undefined}>
                    <MediaSection icon={<ImagePlus size={15} />} title="Property photographs" limits={`JPEG, PNG, WebP or HEIC · up to ${MAX_PHOTOS} files of ${MAX_MB} MB`}>
                      <PhotoUploader shots={shots} onChange={(n, added) => void onPhotos(n, added)} ownerId={user?.id ?? ''} listingId={editing?.id} busy={uploading} notes={photoNotes} />
                      {err(3, 'photos') && <p role="alert" className="mt-3 flex items-center gap-1.5 text-[13px] text-p1-danger"><CircleAlert size={14} aria-hidden />{err(3, 'photos')}</p>}
                      {!editing && shots.length > 0 && <p className="mt-3 text-[12.5px] text-p1-text-3">Photographs upload when you save or publish.</p>}
                    </MediaSection>
                  </div>

                  <FloorPlanUpload
                    listingId={editing?.id ?? null}
                    ownerId={user?.id ?? ''}
                    plan={floorPlan}
                    onChange={setFloorPlan}
                  />

                  <VideoUpload listingId={editing?.id ?? null} video={video} onChange={setVideo} />
                </div>
              )}

              {/* ------------------------------------------------- 5 review */}
              {step === 4 && (
                <div className="space-y-6">
                  <dl className="divide-y divide-p1-border rounded-xl border border-p1-border">
                    {[
                      { k: 'Address', v: addr ? `${addr.project}${normalisedUnit ? `, ${normalisedUnit}` : ''} · ${addr.postal}` : '—', to: 0 },
                      { k: 'Unit', v: `${beds} bed · ${baths} bath · ${Number(sqft || 0).toLocaleString('en-SG')} sqft · ${subtype || propertyType}`, to: 1 },
                      { k: deal === 'sale' ? 'Price' : 'Rent', v: priceShown ? `${priceShown}${deal === 'rent' ? ` a month · ${lease}-month lease` : ''}` : '—', to: 2 },
                      { k: 'Available', v: `${sgDate(availableFrom)} · ${furnishing}`, to: 2 },
                      /* The two optional uploads are listed whether or not
                         they are there, so an agent who meant to attach a plan
                         sees that they did not. */
                      { k: 'Media', v: [
                        `${shots.length} ${shots.length === 1 ? 'photo' : 'photos'}`,
                        floorPlan ? 'floor plan' : 'no floor plan',
                        video ? 'video tour' : 'no video',
                      ].join(' · '), to: 3 },
                      { k: 'Facilities', v: amenities.length ? amenities.join(', ') : 'None listed', to: 1 },
                      { k: 'In the unit', v: fittings.length ? fittings.join(', ') : 'None listed', to: 1 },
                    ].map((r) => (
                      <div key={r.k} className="flex items-start gap-4 px-4 py-3">
                        <dt className="w-24 shrink-0 text-[13px] text-p1-text-3">{r.k}</dt>
                        <dd className="min-w-0 flex-1 text-[14px] text-p1-text">{r.v}</dd>
                        <button type="button" onClick={() => go(r.to)} className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[13px] font-medium text-p1-primary hover:underline underline-offset-4"><Pencil size={12} aria-hidden /> Edit</button>
                      </div>
                    ))}
                  </dl>

                  <div>
                    <h3 className="mb-2 text-[14px] font-semibold text-p1-text">Publishing checklist</h3>
                    <ul className="space-y-1.5">
                      {[...gate, { id: 'fields', label: 'Listing details complete', pass: STEPS.slice(0, 4).every((_, i) => stepValid(i)), detail: '', fixHref: undefined, fixLabel: undefined }].map((g) => (
                        <li key={g.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                          <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', g.pass ? 'bg-p1-success-soft text-p1-success' : 'bg-p1-danger-soft text-p1-danger')} aria-hidden>
                            {g.pass ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                          </span>
                          <span className="min-w-0 flex-1 text-[14px] text-p1-text">{g.label}<span className="sr-only">{g.pass ? ' — passed' : ' — not yet'}</span></span>
                          {!g.pass && g.fixHref && <Link href={g.fixHref} className="shrink-0 text-[13px] font-medium text-p1-primary hover:underline underline-offset-4">{g.fixLabel}</Link>}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-p1-subtle px-4 py-3">
                    <ShieldCheck size={16} className="mt-0.5 shrink-0 text-p1-text-3" aria-hidden />
                    <div className="min-w-0 text-[13px] leading-5">
                      <div className="font-medium text-p1-text">{state.profile.fullName} · {state.profile.ceaNumber} · {state.profile.agency}{state.profile.agencyLicence && ` (${state.profile.agencyLicence})`}</div>
                      <div className="text-p1-text-3">Printed on the advertisement, as CEA rules require.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------ actions */}
          <div data-print-hide className="sticky bottom-16 z-10 mt-5 flex items-center gap-2 rounded-xl border border-p1-border bg-p1-surface/95 p-2.5 shadow-p1-md backdrop-blur lg:bottom-4">
            <Button variant="ghost" leftIcon={<ChevronLeft size={16} />} disabled={step === 0} onClick={() => go(step - 1)}>Back</Button>
            <div className="flex-1" />
            {editing ? (
              <>
                <Button variant={lastStep ? 'outline' : 'ghost'} leftIcon={<Save size={15} />} disabled={!addr} onClick={saveChanges} className="max-sm:px-3">
                  <span className="max-sm:sr-only">Save changes</span>
                </Button>
                {!lastStep && <Button rightIcon={<ArrowRight size={16} />} onClick={next}>Continue</Button>}
                {lastStep && editing.status === 'rejected' && <Button leftIcon={<Send size={15} />} disabled={!addr} onClick={resubmit}>Resubmit</Button>}
                {lastStep && editing.status === 'draft' && (
                  <Button leftIcon={canPublish ? <Check size={16} /> : <Lock size={15} />} disabled={!canPublish || !addr || !STEPS.slice(0, 4).every((_, i) => stepValid(i))} onClick={() => setConfirmPublish(true)}>
                    {canPublish ? 'Publish' : 'Blocked'}
                  </Button>
                )}
              </>
            ) : !lastStep ? (
              <>
                {addr && <Button variant="ghost" loading={committing} onClick={() => void saveDraft()} className="hidden sm:inline-flex">Save draft</Button>}
                <Button rightIcon={<ArrowRight size={16} />} onClick={next}>Continue</Button>
              </>
            ) : (
              <>
                <Button variant="outline" loading={committing} disabled={!addr} onClick={() => void saveDraft()}>Save draft</Button>
                <Button leftIcon={canPublish ? <Check size={16} /> : <Lock size={15} />} disabled={!canPublish || committing || !STEPS.slice(0, 4).every((_, i) => stepValid(i))} onClick={() => setConfirmPublish(true)}>
                  {canPublish ? 'Publish' : 'Publishing blocked'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------- preview */}
        <aside className="hidden lg:block" aria-label="Preview">
          <div className="sticky top-[136px] space-y-3">
            <p className="text-[12.5px] font-medium text-p1-text-3">Preview</p>
            <div className="overflow-hidden rounded-2xl border border-p1-border bg-p1-surface">
              <PropertyImage seed={(addr?.project ?? 'new') + normalisedUnit} src={cover} alt="" rounded="rounded-none" className="aspect-[4/3] w-full" label={!cover} />
              <div className="p-4">
                <div className={cx('text-[19px] font-semibold tracking-[-0.02em] tabular-nums', priceShown ? 'text-p1-text' : 'text-p1-text-3')}>
                  {priceShown ?? 'S$ —'}{deal === 'rent' && <span className="ml-0.5 text-[13px] font-normal text-p1-text-3">/mo</span>}
                </div>
                <div className="text-[13px] text-p1-text-2">{beds} bed · {baths} bath{Number(sqft) > 0 ? ` · ${Number(sqft).toLocaleString('en-SG')} sqft` : ''}</div>
                <div className={cx('mt-2 truncate text-[14.5px] font-medium', addr ? 'text-p1-text' : 'text-p1-text-3')}>{addr?.project ?? 'Property not chosen'}</div>
                <div className="truncate text-[12.5px] text-p1-text-3">{addr?.district ? `${districtCode(addr.district)} · ${districtLabel(addr.district)}` : 'District appears once matched'}</div>
              </div>
            </div>
            {!canPublish && (
              <p className="flex items-start gap-2 rounded-xl border border-p1-warning-border bg-p1-warning-soft px-3 py-2.5 text-[12.5px] leading-5 text-p1-text-2">
                <Lock size={13} className="mt-0.5 shrink-0 text-p1-warning" aria-hidden />
                Publishing is blocked right now. You can still save a draft.
              </p>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmPublish}
        onClose={() => { if (!committing) setConfirmPublish(false); }}
        onConfirm={editing ? publishEdit : () => void publish()}
        loading={committing}
        icon={<Send size={19} />}
        title="Publish this listing?"
        description={committing ? 'Uploading your photographs. This stays open until they are stored.' : 'Tenants can find it as soon as you publish.'}
        confirmLabel={committing ? 'Publishing…' : 'Publish listing'}
      >
        <div className="overflow-hidden rounded-xl border border-p1-border">
          <div className="flex items-center gap-3 p-3">
            <PropertyImage seed={(addr?.project ?? 'new') + normalisedUnit} src={cover} alt="" rounded="rounded-lg" className="h-14 w-[72px] shrink-0" />
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold text-p1-text">{addr?.project ?? 'New listing'}{normalisedUnit ? ` ${normalisedUnit}` : ''}</div>
              <div className="truncate text-[13px] text-p1-text-3">{priceShown ?? '—'}{deal === 'rent' ? ' / month' : ''} · {beds} bed{addr?.district ? ` · ${districtCode(addr.district)}` : ''}</div>
            </div>
          </div>
          {listingLimit > 0 && (
            <div className="border-t border-p1-border bg-p1-bg/60 px-3 py-2.5">
              <div className="flex items-baseline justify-between text-[12.5px]">
                <span className="text-p1-text-2">Listing slots after publishing</span>
                <span className="font-semibold tabular-nums text-p1-text">{Math.min(listingLimit, activeListings + (editing?.status === 'published' ? 0 : 1))} of {listingLimit}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-p1-subtle">
                <div className="h-full rounded-full bg-p1-primary transition-[width] duration-500" style={{ width: `${Math.min(100, ((activeListings + 1) / listingLimit) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
        <p className="mt-3 text-[12.5px] leading-5 text-p1-text-3">A moderator reviews it after it goes live. You can pause it at any time.</p>
      </ConfirmDialog>
    </>
  );
}
