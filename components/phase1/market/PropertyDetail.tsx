"use client";

/**
 * A single home, as a tenant sees it.
 *
 * The photographs first, then the three facts a tenant decides on — price,
 * place, size — then the way to act. On a desktop the enquiry panel stays in
 * view beside the page; on a phone it becomes a bar at the bottom. The rest is
 * in sections the visitor can jump between rather than one long read.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bath, BedDouble, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Copy, Grid2x2, Mail, MapPin, MessageSquare,
  Pause, Phone, Ruler, Share2, ShieldCheck, Sofa, TrainFront, X, BadgeCheck, KeyRound,
} from 'lucide-react';
import type { MarketListing } from '../../../lib/phase1/marketplace';
import { districtCode, districtLabel } from '../../../lib/phase1/districts';
import { sgDate } from '../../../lib/phase1/format';
import { PropertyImage } from '../PropertyImage';
import { PropertyMap } from '../listing/PropertyMap';
import { EnquiryForm } from '../listing/EnquiryForm';
import { Dialog } from '../overlays';
import { Button, cx } from '../kit';
import { PropertyCard, SaveButton } from './PropertyCard';
import { bedLabel, isSale, mrt, price, propertyNoun } from './format';

/* ------------------------------------------------------------- lightbox */

function Lightbox({ photos, start, onClose, title }: { photos: string[]; start: number; onClose: () => void; title: string }) {
  const [i, setI] = useState(start);
  const [dir, setDir] = useState<'next' | 'back'>('next');
  const step = useCallback((d: number) => { setDir(d > 0 ? 'next' : 'back'); setI((x) => (x + d + photos.length) % photos.length); }, [photos.length]);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [onClose, step]);

  return (
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`${title} photographs`} className="p1-overlay fixed inset-0 z-[110] flex flex-col bg-[#05080f]/95 text-white focus:outline-none">
      <div className="flex h-14 shrink-0 items-center justify-between px-4 sm:px-6">
        <span className="text-[14px] font-medium tabular-nums text-white/80">{i + 1} / {photos.length}</span>
        <button type="button" onClick={onClose} aria-label="Close photographs" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-white/10"><X size={20} /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={i} src={photos[i]} alt={`Photograph ${i + 1} of ${photos.length}`} className={cx('max-h-full max-w-full rounded-lg object-contain', dir === 'next' ? 'p1-step-next' : 'p1-step-back')} />
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Previous photograph" className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:left-4"><ChevronLeft size={22} /></button>
            <button type="button" onClick={() => step(1)} aria-label="Next photograph" className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:right-4"><ChevronRight size={22} /></button>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 py-4">
          {photos.map((p, j) => (
            <button key={p} type="button" onClick={() => { setDir(j > i ? 'next' : 'back'); setI(j); }} aria-label={`Photograph ${j + 1}`} aria-current={j === i || undefined}
              className={cx('h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded-md transition-opacity', j === i ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-90')}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.includes('?') ? p : `${p}?size=thumb`} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailGallery({ item }: { item: MarketListing }) {
  const [open, setOpen] = useState<number | null>(null);
  const { photos } = item;
  const l = item.listing;
  const seed = l.reference + l.project;

  if (photos.length === 0) {
    return <PropertyImage seed={seed} rounded="rounded-2xl" className="aspect-[16/9] w-full sm:aspect-[21/9]" label eager />;
  }

  const frame = (idx: number, className: string, eager = false) => (
    <button type="button" onClick={() => setOpen(idx)} className={cx('group relative block cursor-zoom-in overflow-hidden', className)} aria-label={`Open photograph ${idx + 1} of ${photos.length}`}>
      <PropertyImage seed={seed} variant={idx} src={idx === 0 ? photos[idx] : item.thumbs[idx]} alt="" rounded="rounded-none" className="h-full w-full" eager={eager} />
      <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" aria-hidden />
    </button>
  );

  return (
    <div className="relative">
      {photos.length >= 3 ? (
        <div className="grid h-[260px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-[420px]">
          {frame(0, 'col-span-4 row-span-2 sm:col-span-3', true)}
          {frame(1, 'hidden sm:block')}
          {frame(2, 'hidden sm:block')}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl">{frame(0, 'aspect-[16/9] w-full sm:aspect-[21/9]', true)}</div>
      )}
      {photos.length > 1 && (
        <button type="button" onClick={() => setOpen(0)} className="p1-press absolute bottom-3 right-3 inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-p1-surface px-3 text-[13px] font-medium text-p1-text shadow-p1-md ring-1 ring-p1-border hover:bg-p1-subtle">
          <Grid2x2 size={15} aria-hidden /> All {photos.length} photos
        </button>
      )}
      {open !== null && <Lightbox photos={photos} start={open} onClose={() => setOpen(null)} title={l.project} />}
    </div>
  );
}

/* ------------------------------------------------------------ sections */

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'location', label: 'Location' },
  { id: 'agent', label: 'Agent' },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

function useSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-140px 0px -55% 0px' },
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [ids]);
  return active;
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[130px] border-t border-p1-border py-8" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="mb-4 text-[18px] font-semibold tracking-[-0.015em] text-p1-text">{title}</h2>
      {children}
    </section>
  );
}

function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* dismissed */ }
  };
  return (
    <button type="button" onClick={() => void share()} className="p1-press inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-p1-border-strong bg-p1-surface px-3 text-[13.5px] font-medium text-p1-text hover:bg-p1-subtle" aria-live="polite">
      {copied ? <><Check size={16} className="text-p1-success" aria-hidden /> Link copied</> : <><Share2 size={16} className="text-p1-text-2" aria-hidden /> Share</>}
    </button>
  );
}

function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 320;
  return (
    <div>
      <p className={cx('whitespace-pre-line text-[15px] leading-7 text-p1-text-2', !open && long && 'line-clamp-4')}>{text}</p>
      {long && <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 cursor-pointer text-[14px] font-medium text-p1-text underline underline-offset-4 hover:text-p1-primary">{open ? 'Show less' : 'Read more'}</button>}
    </div>
  );
}

/* ---------------------------------------------------------------- page */

export function PropertyDetail({ item, similar, nearby }: { item: MarketListing; similar: MarketListing[]; nearby?: React.ReactNode }) {
  const l = item.listing;
  const a = item.agent;
  const p = price(l);
  const sale = isSale(l);
  const paused = l.status === 'paused';
  const station = mrt(l);
  const [enquiry, setEnquiry] = useState<null | 'viewing' | 'message'>(null);
  const spy = useSpy(SECTION_IDS);
  const initials = a.name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const facts = [
    { icon: BedDouble, label: bedLabel(l.bedrooms).replace(' bed', ` bedroom${l.bedrooms === 1 ? '' : 's'}`) },
    { icon: Bath, label: `${l.bathrooms} bathroom${l.bathrooms === 1 ? '' : 's'}` },
    { icon: Ruler, label: `${l.sizeSqft.toLocaleString('en-SG')} sqft` },
    { icon: Sofa, label: l.furnishing },
  ];

  const details: [string, string][] = [
    ['Property type', propertyNoun(l)],
    [sale ? 'Available to view' : 'Available from', sgDate(l.availableFrom)],
    ...(!sale ? [['Minimum lease', `${l.minLeaseMonths} months`] as [string, string]] : []),
    ...(!sale && typeof l.depositMonths === 'number' ? [['Deposit', `${l.depositMonths} month${l.depositMonths === 1 ? '' : 's'}`] as [string, string]] : []),
    ['Floor area', `${l.sizeSqft.toLocaleString('en-SG')} sqft`],
    ...(l.sizeSqft ? [[sale ? 'Price per sqft' : 'Rent per sqft', sale ? `S$${Math.round((l.salePriceSgd ?? 0) / l.sizeSqft).toLocaleString('en-SG')}` : `S$${(l.monthlyRent / l.sizeSqft).toFixed(2)}`] as [string, string]] : []),
    ...(l.tenure ? [['Tenure', l.tenure] as [string, string]] : []),
    ...(l.builtYear ? [['Completed', String(l.builtYear)] as [string, string]] : []),
  ];

  const openEnquiry = (kind: 'viewing' | 'message') => setEnquiry(kind);
  const firstName = a.callName || 'the agent';
  const fullAddress = l.address.includes(l.postalCode) ? l.address : `${l.address}, Singapore ${l.postalCode}`;

  return (
    <div className="pb-28 lg:pb-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-5 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-p1-text-3">
          <ol className="flex flex-wrap items-center gap-1">
            <li><Link href="/phase1/homes/search" className="hover:text-p1-text">{sale ? 'Buy' : 'Rent'}</Link></li>
            <li aria-hidden><ChevronRight size={13} /></li>
            <li><Link href={`/phase1/homes/search?district=${l.district}${sale ? '&deal=sale' : ''}`} className="hover:text-p1-text">{districtLabel(l.district)}</Link></li>
            <li aria-hidden><ChevronRight size={13} /></li>
            <li className="truncate text-p1-text-2" aria-current="page">{l.project}</li>
          </ol>
        </nav>

        {paused && (
          <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-p1-warning-border bg-p1-warning-soft px-4 py-3">
            <Pause size={17} className="mt-0.5 shrink-0 text-p1-warning" aria-hidden />
            <div className="text-[14px] text-p1-text"><span className="font-semibold">Off the market for now.</span> <span className="text-p1-text-2">The agent has paused this listing. Ask them whether it is coming back.</span></div>
          </div>
        )}

        <DetailGallery item={item} />

        <div className="mt-6 grid gap-x-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            {/* ------------------------------------------------ headline */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-p1display text-[30px] font-bold leading-tight tracking-[-0.025em] tabular-nums text-p1-primary sm:text-[34px]">
                  {p.amount}<span className="ml-1 text-[16px] font-normal text-p1-text-3">{sale ? '' : '/ month'}</span>
                </div>
                <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.015em] text-p1-text">{l.project}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-p1-text-2">
                  <span className="inline-flex items-start gap-1.5"><MapPin size={14} className="mt-[3px] shrink-0 text-p1-text-3" aria-hidden /><span>{fullAddress} <span className="whitespace-nowrap text-p1-text-3">· {districtCode(l.district)} {districtLabel(l.district)}</span></span></span>
                </p>
              </div>
              <div className="flex gap-2">
                <SaveButton ownerId={item.ownerId} listingId={l.id} withLabel />
                <ShareButton title={`${l.project} — ${p.amount}${p.unit}`} />
              </div>
            </div>

            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-[14.5px] text-p1-text">
              {facts.map((f) => <li key={f.label} className="inline-flex items-center gap-2"><f.icon size={18} className="text-p1-text-3" aria-hidden />{f.label}</li>)}
            </ul>

            <ul className="mt-5 flex flex-wrap gap-2">
              {a.verified && <li className="inline-flex items-center gap-1.5 rounded-lg bg-p1-success-soft px-2.5 py-1.5 text-[13px] font-medium text-p1-success"><ShieldCheck size={15} aria-hidden /> CEA-verified agent</li>}
              {l.reviewedAt && <li className="inline-flex items-center gap-1.5 rounded-lg bg-p1-subtle px-2.5 py-1.5 text-[13px] font-medium text-p1-text-2"><BadgeCheck size={15} aria-hidden /> Reviewed by V-RENT</li>}
              {l.lat !== undefined && <li className="inline-flex items-center gap-1.5 rounded-lg bg-p1-subtle px-2.5 py-1.5 text-[13px] font-medium text-p1-text-2"><MapPin size={15} aria-hidden /> Address matched to OneMap</li>}
            </ul>

            {/* ------------------------------------------- section nav */}
            <nav aria-label="On this page" className="sticky top-[65px] z-20 mt-8 -mx-4 border-b border-p1-border bg-p1-bg/95 px-4 backdrop-blur sm:mx-0 sm:px-0">
              <ul className="p1-noscrollbar flex gap-1 overflow-x-auto">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} aria-current={spy === s.id ? 'location' : undefined}
                      className={cx('relative flex h-12 items-center whitespace-nowrap px-3 text-[14px] font-medium transition-colors', spy === s.id ? 'text-p1-text' : 'text-p1-text-3 hover:text-p1-text')}>
                      {s.label}
                      <span className={cx('absolute inset-x-3 bottom-0 h-0.5 origin-center rounded-full bg-p1-primary transition-transform duration-200', spy === s.id ? 'scale-x-100' : 'scale-x-0')} aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <Section id="overview" title="Overview">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                {details.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[12.5px] text-p1-text-3">{k}</dt>
                    <dd className="mt-0.5 text-[14.5px] font-medium text-p1-text">{v}</dd>
                  </div>
                ))}
              </dl>
              {l.description && <div className="mt-6"><Description text={l.description} /></div>}
            </Section>

            <Section id="amenities" title="Amenities">
              {(l.amenities?.length ?? 0) === 0 ? (
                <p className="text-[14px] text-p1-text-3">The agent has not listed amenities. Ask them what the development offers.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  {l.amenities!.map((am) => (
                    <li key={am} className="flex items-center gap-3 text-[14.5px] text-p1-text">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-p1-subtle text-p1-text-2" aria-hidden><Check size={14} /></span>{am}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section id="location" title="Location">
              {station && (
                <p className="mb-4 inline-flex items-center gap-2 text-[14.5px] text-p1-text"><TrainFront size={17} className="text-p1-text-3" aria-hidden /> Nearest station: <span className="font-medium">{station}</span></p>
              )}
              {l.lat !== undefined && l.lng !== undefined ? (
                <PropertyMap lat={l.lat} lng={l.lng} label={fullAddress} height={280} />
              ) : (
                <p className="text-[14px] text-p1-text-3">This address has no map position yet.</p>
              )}
              {nearby && <div className="mt-4">{nearby}</div>}
            </Section>

            <Section id="agent" title="Listed by">
              <div className="flex flex-col gap-5 rounded-2xl border border-p1-border bg-p1-surface p-5 sm:flex-row sm:items-center">
                <Link href={`/phase1/homes/agent/${a.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-p1-primary-soft text-[18px] font-semibold text-p1-primary" aria-hidden>{initials}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[16px] font-semibold text-p1-text">{a.name}{a.verified && <BadgeCheck size={17} className="text-p1-success" aria-label="CEA verified" />}</span>
                    <span className="block truncate text-[13.5px] text-p1-text-2">{a.agency}</span>
                    <span className="block text-[12.5px] tabular-nums text-p1-text-3">CEA {a.ceaNumber}{a.agencyLicence && ` · Licence ${a.agencyLicence}`}</span>
                  </span>
                </Link>
                <div className="flex gap-2">
                  {a.mobile && <a href={`tel:${a.mobile.replace(/\s/g, '')}`} className="p1-press inline-flex h-10 items-center gap-2 rounded-lg border border-p1-border-strong px-3.5 text-[14px] font-medium text-p1-text hover:bg-p1-subtle"><Phone size={15} aria-hidden /> Call</a>}
                  <Link href={`/phase1/homes/agent/${a.id}`} className="p1-press inline-flex h-10 items-center rounded-lg border border-p1-border-strong px-3.5 text-[14px] font-medium text-p1-text hover:bg-p1-subtle">View profile</Link>
                </div>
              </div>
            </Section>
          </div>

          {/* ------------------------------------------------ enquiry panel */}
          <aside className="hidden lg:block">
            <div className="sticky top-[89px] rounded-2xl border border-p1-border bg-p1-surface p-5 shadow-p1-md">
              <div className="font-p1display text-[24px] font-bold tracking-[-0.02em] tabular-nums text-p1-primary">{p.amount}<span className="ml-1 text-[14px] font-normal text-p1-text-3">{sale ? '' : '/ month'}</span></div>
              <div className="mt-1 flex items-center gap-1.5 text-[13.5px] text-p1-text-2">
                <CalendarDays size={14} className="text-p1-text-3" aria-hidden />
                {sale ? 'Viewings from' : 'Available'} {sgDate(l.availableFrom)}
                {!sale && <span className="text-p1-text-3">· {l.minLeaseMonths}-month lease</span>}
              </div>

              <div className="mt-5 grid gap-2">
                <Button size="lg" block leftIcon={<KeyRound size={16} />} onClick={() => openEnquiry('viewing')} disabled={paused}>Schedule a viewing</Button>
                <Button size="lg" variant="outline" block leftIcon={<MessageSquare size={16} />} onClick={() => openEnquiry('message')}>Message {firstName}</Button>
              </div>

              <div className="mt-5 flex items-center gap-3 border-t border-p1-border pt-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-p1-primary-soft text-[13px] font-semibold text-p1-primary" aria-hidden>{initials}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-[14px] font-semibold text-p1-text"><span className="truncate">{a.name}</span>{a.verified && <BadgeCheck size={15} className="shrink-0 text-p1-success" aria-label="CEA verified" />}</span>
                  <span className="block truncate text-[12.5px] text-p1-text-3">{a.agency}</span>
                </span>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-p1-text-3"><Clock size={13} aria-hidden /> Enquiries go straight to the agent. No account needed.</p>
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="border-t border-p1-border pt-8" aria-labelledby="similar-h">
            <h2 id="similar-h" className="mb-5 text-[18px] font-semibold tracking-[-0.015em] text-p1-text">Similar homes</h2>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((m) => <li key={`${m.ownerId}/${m.listing.id}`}><PropertyCard item={m} /></li>)}
            </ul>
          </section>
        )}

        <p className="mt-10 border-t border-p1-border pt-4 text-[12px] leading-5 text-p1-text-3">
          Advertised by {a.registeredName} ({a.ceaNumber}) of {a.agency}{a.agencyLicence && `, licence ${a.agencyLicence}`}. Listing {l.reference}.
          {' '}{a.email && <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1 hover:text-p1-text"><Mail size={11} aria-hidden /> {a.email}</a>}
          {' '}<button type="button" onClick={() => void navigator.clipboard?.writeText(l.reference)} className="inline-flex cursor-pointer items-center gap-1 hover:text-p1-text"><Copy size={11} aria-hidden /> Copy reference</button>
        </p>
      </div>

      {/* --------------------------------------------- phone: action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-p1-border bg-p1-surface/95 backdrop-blur lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-p1display text-[18px] font-bold tabular-nums text-p1-primary">{p.amount}<span className="text-[13px] font-normal text-p1-text-3">{p.unit}</span></div>
            <div className="truncate text-[12.5px] text-p1-text-3">{bedLabel(l.bedrooms)} · {districtLabel(l.district)}</div>
          </div>
          {a.mobile && <a href={`tel:${a.mobile.replace(/\s/g, '')}`} aria-label={`Call ${a.name}`} className="p1-press flex h-11 w-11 items-center justify-center rounded-lg border border-p1-border-strong text-p1-text"><Phone size={18} aria-hidden /></a>}
          <Button size="lg" leftIcon={<MessageSquare size={16} />} onClick={() => openEnquiry('message')}>Enquire</Button>
        </div>
      </div>

      <Dialog
        open={enquiry !== null}
        onClose={() => setEnquiry(null)}
        title={enquiry === 'viewing' ? 'Schedule a viewing' : `Message ${firstName}`}
        description={`${l.project} · ${p.amount}${p.unit}`}
      >
        {enquiry && (
          <EnquiryForm
            bare
            ownerId={item.ownerId}
            listingId={l.id}
            agentName={firstName}
            initialMessage={enquiry === 'viewing' ? `Hi ${firstName}, I would like to view ${l.project}. I am free this week — which times suit you?` : `Hi ${firstName}, is ${l.project} still available?`}
          />
        )}
      </Dialog>
    </div>
  );
}
