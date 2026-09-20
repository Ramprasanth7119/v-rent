"use client";

/**
 * Search: the results and the map, side by side on a desktop and one at a
 * time on a phone.
 *
 * Every filter lives in the URL, so a search can be shared, bookmarked or
 * reloaded and comes back the same. Filtering happens here rather than on the
 * server because the whole live stock is already on the page; that stops being
 * true at a few hundred listings, when this becomes a paged query.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Bookmark, ChevronDown, List, Map as MapIcon, SlidersHorizontal, X } from 'lucide-react';
import type { MarketListing } from '../../../lib/phase1/marketplace';
import { DISTRICTS, districtCode, districtLabel } from '../../../lib/phase1/districts';
import { Button, EmptyState, SearchInput, SelectMenu, cx } from '../kit';
import { Drawer } from '../overlays';
import { useToast } from '../Toast';
import { PropertyCard, homeHref } from './PropertyCard';
import { MapPanel, type MapItem } from './MapPanel';
import { isSale, pinPrice } from './format';
import { FLOOR_BANDS, type FloorBand, inFloorBand } from '../../../lib/phase1/floor';
import { PROPERTY_CATEGORIES, categoryOf, type PropertyCategory } from '../../../lib/phase1/property-types';

type Sort = 'newest' | 'price_asc' | 'price_desc' | 'size';
interface Filters {
  q: string; deal: 'rent' | 'sale'; district: string; beds: string; type: string; min: string; max: string; sort: Sort;
  /** Which storey. Read from the listing's floor, never from a unit number. */
  floor: FloorBand;
  baths: string;
  furnishing: string;
  /** Floor area, square feet. Blank means open-ended. */
  sizeMin: string;
  /** The exact classification, when a tenant narrows that far. */
  category: string;
  subtype: string;
}
type Bounds = { north: number; south: number; east: number; west: number };

const TYPES = ['Condominium', 'HDB', 'Apartment', 'Executive Condominium', 'Landed'];
const BEDS = ['any', '1', '2', '3', '4+'];
const BATHS = ['any', '1', '2', '3+'];
const FURNISHINGS = ['Unfurnished', 'Partially furnished', 'Fully furnished'];
const FLOORS: { key: FloorBand; label: string }[] = [
  { key: 'any', label: 'Any floor' },
  ...(Object.keys(FLOOR_BANDS) as Exclude<FloorBand, 'any'>[]).map((k) => ({ key: k as FloorBand, label: FLOOR_BANDS[k].label })),
];
const SORTS: { key: Sort; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'price_asc', label: 'Price, low to high' },
  { key: 'price_desc', label: 'Price, high to low' },
  { key: 'size', label: 'Largest first' },
];

const priceOf = (m: MarketListing) => (isSale(m.listing) ? m.listing.salePriceSgd ?? 0 : m.listing.monthlyRent);

function readFilters(p: URLSearchParams): Filters {
  const sort = p.get('sort') as Sort;
  return {
    q: p.get('q') ?? '',
    deal: p.get('deal') === 'sale' ? 'sale' : 'rent',
    district: p.get('district') ?? '',
    beds: BEDS.includes(p.get('beds') ?? '') ? p.get('beds')! : 'any',
    type: TYPES.includes(p.get('type') ?? '') ? p.get('type')! : '',
    min: (p.get('min') ?? '').replace(/\D/g, ''),
    max: (p.get('max') ?? '').replace(/\D/g, ''),
    sort: SORTS.some((s) => s.key === sort) ? sort : 'newest',
    floor: FLOORS.some((x) => x.key === p.get('floor')) ? (p.get('floor') as FloorBand) : 'any',
    baths: BATHS.includes(p.get('baths') ?? '') ? p.get('baths')! : 'any',
    furnishing: FURNISHINGS.includes(p.get('furnishing') ?? '') ? p.get('furnishing')! : '',
    sizeMin: (p.get('sizeMin') ?? '').replace(/\D/g, ''),
    category: PROPERTY_CATEGORIES.some((c) => c.key === p.get('category')) ? p.get('category')! : '',
    subtype: (p.get('subtype') ?? '').slice(0, 60),
  };
}

function toQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.deal === 'sale') p.set('deal', 'sale');
  if (f.district) p.set('district', f.district);
  if (f.beds !== 'any') p.set('beds', f.beds);
  if (f.type) p.set('type', f.type);
  if (f.min) p.set('min', f.min);
  if (f.max) p.set('max', f.max);
  if (f.sort !== 'newest') p.set('sort', f.sort);
  if (f.floor !== 'any') p.set('floor', f.floor);
  if (f.baths !== 'any') p.set('baths', f.baths);
  if (f.furnishing) p.set('furnishing', f.furnishing);
  if (f.sizeMin) p.set('sizeMin', f.sizeMin);
  if (f.category) p.set('category', f.category);
  if (f.subtype) p.set('subtype', f.subtype);
  return p.toString();
}

const money = (n: number, sale: boolean) => (sale
  ? n >= 1_000_000 ? `S$${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : `S$${Math.round(n / 1000)}k`
  : n >= 1000 ? `S$${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `S$${n}`);

/* --------------------------------------------------------------- popover */

function FilterPopover({ label, active, children, width = 'w-72' }: { label: string; active: boolean; children: (close: () => void) => React.ReactNode; width?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div ref={root} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog"
        className={cx('p1-press inline-flex h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-[13.5px] font-medium',
          active ? 'border-p1-text bg-p1-text text-p1-bg' : 'border-p1-border-strong bg-p1-surface text-p1-text hover:bg-p1-subtle')}>
        {label}
        <ChevronDown size={14} className={cx('transition-transform duration-200', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div role="dialog" aria-label={label} className={cx('p1-panel absolute left-0 top-full z-50 mt-2 rounded-xl border border-p1-border bg-p1-elevated p-4 shadow-p1-lg', width)}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cx('h-9 cursor-pointer rounded-lg border px-3 text-[13.5px] font-medium transition-colors duration-150',
        on ? 'border-p1-primary bg-p1-primary-soft text-p1-primary' : 'border-p1-border-strong bg-p1-surface text-p1-text-2 hover:text-p1-text')}>
      {children}
    </button>
  );
}

function PriceFields({ f, set }: { f: Filters; set: (p: Partial<Filters>) => void }) {
  const sale = f.deal === 'sale';
  const presets = sale
    ? [[0, 1_000_000], [1_000_000, 2_000_000], [2_000_000, 0]]
    : [[0, 3000], [3000, 5000], [5000, 8000], [8000, 0]];
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {(['min', 'max'] as const).map((k) => (
          <label key={k} className="block">
            <span className="mb-1 block text-[12px] font-medium text-p1-text-3">{k === 'min' ? 'Minimum' : 'Maximum'}</span>
            <span className="relative block">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-p1-text-3">S$</span>
              <input inputMode="numeric" value={f[k] ? Number(f[k]).toLocaleString('en-SG') : ''} placeholder="Any"
                onChange={(e) => set({ [k]: e.target.value.replace(/\D/g, '') })}
                className="p1-field h-10 w-full rounded-lg border border-p1-border-strong bg-p1-surface pl-8 pr-2 text-[14px] tabular-nums text-p1-text placeholder:text-p1-text-3 focus:border-p1-primary focus:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none" />
            </span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {presets.map(([lo, hi]) => {
          const on = f.min === (lo ? String(lo) : '') && f.max === (hi ? String(hi) : '');
          const label = !lo ? `Under ${money(hi, sale)}` : !hi ? `${money(lo, sale)}+` : `${money(lo, sale)}–${money(hi, sale)}`;
          return <Chip key={label} on={on} onClick={() => set({ min: lo ? String(lo) : '', max: hi ? String(hi) : '' })}>{label}</Chip>;
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ view */

export function SearchView({ items }: { items: MarketListing[] }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const { push } = useToast();
  const [f, setF] = useState<Filters>(() => readFilters(new URLSearchParams(params.toString())));
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [sheet, setSheet] = useState(false);

  const set = (patch: Partial<Filters>) => setF((cur) => ({ ...cur, ...patch }));

  /* The URL follows the filters so a search can be shared, but quietly: the
     browser's own history API updates the address in place (Next keeps
     `useSearchParams` in step with it), with no request to the server, no new
     history entry per keystroke, and nothing at all when the query has not
     changed. A router navigation here re-rendered the page on the server after
     every change, and one still in flight when the visitor opened a listing
     was aborted mid-navigation. */
  useEffect(() => {
    const qs = toQuery(f);
    const next = `${pathname}${qs ? `?${qs}` : ''}`;
    if (next === `${window.location.pathname}${window.location.search}`) return;
    const t = setTimeout(() => window.history.replaceState(window.history.state, '', next), 250);
    return () => clearTimeout(t);
  }, [f, pathname]);

  const results = useMemo(() => {
    const tokens = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const min = Number(f.min) || 0;
    const max = Number(f.max) || Infinity;
    return items
      .filter((m) => (f.deal === 'sale') === isSale(m.listing))
      .filter((m) => !f.district || String(m.listing.district) === f.district)
      .filter((m) => f.beds === 'any' || (f.beds === '4+' ? m.listing.bedrooms >= 4 : m.listing.bedrooms === Number(f.beds)))
      .filter((m) => !f.type || m.listing.propertyType === f.type)
      .filter((m) => priceOf(m) >= min && priceOf(m) <= max)
      .filter((m) => inFloorBand(m.listing, f.floor))
      .filter((m) => f.baths === 'any' || (f.baths === '3+' ? m.listing.bathrooms >= 3 : m.listing.bathrooms === Number(f.baths)))
      .filter((m) => !f.furnishing || m.listing.furnishing === f.furnishing)
      .filter((m) => !f.sizeMin || m.listing.sizeSqft >= Number(f.sizeMin))
      .filter((m) => !f.category || m.listing.propertyCategory === f.category)
      .filter((m) => !f.subtype || m.listing.propertySubtype === f.subtype)
      .filter((m) => {
        if (!tokens.length) return true;
        const l = m.listing;
        const d = DISTRICTS[l.district];
        const hay = [l.project, l.address, l.postalCode, districtCode(l.district), d?.name, d?.areas, l.nearestMrt, l.propertyType].join(' ').toLowerCase();
        return tokens.every((t) => hay.includes(t));
      })
      .filter((m) => !bounds || (m.listing.lat !== undefined && m.listing.lng !== undefined
        && m.listing.lat <= bounds.north && m.listing.lat >= bounds.south && m.listing.lng <= bounds.east && m.listing.lng >= bounds.west))
      .sort((a, b) => f.sort === 'price_asc' ? priceOf(a) - priceOf(b)
        : f.sort === 'price_desc' ? priceOf(b) - priceOf(a)
        : f.sort === 'size' ? b.listing.sizeSqft - a.listing.sizeSqft
        : (b.listing.publishedAt ?? b.listing.createdAt).localeCompare(a.listing.publishedAt ?? a.listing.createdAt));
  }, [items, f, bounds]);

  const pins: MapItem[] = useMemo(() => results
    .filter((m) => m.listing.lat !== undefined && m.listing.lng !== undefined)
    .map((m) => ({ key: `${m.ownerId}/${m.listing.id}`, lat: m.listing.lat!, lng: m.listing.lng!, label: pinPrice(m.listing), href: homeHref(m) })), [results]);

  // The map reframes when the filters change, not when the visitor pans it.
  const fitKey = `${f.deal}|${f.district}|${f.beds}|${f.type}|${f.min}|${f.max}|${f.q}|${f.floor}|${f.baths}|${f.furnishing}|${f.sizeMin}`;

  const sale = f.deal === 'sale';
  const priceLabel = f.min || f.max
    ? `${f.min ? money(Number(f.min), sale) : 'Any'} – ${f.max ? money(Number(f.max), sale) : 'Any'}`
    : 'Price';
  const extras = [f.type, f.district, f.floor !== 'any', f.baths !== 'any', f.furnishing, f.sizeMin, f.category, f.subtype];
  const moreCount = extras.filter(Boolean).length;
  const activeCount = [f.min || f.max, f.beds !== 'any', ...extras].filter(Boolean).length;

  const chips = [
    ...(f.district ? [{ label: `${districtCode(Number(f.district))} ${districtLabel(Number(f.district))}`, clear: () => set({ district: '' }) }] : []),
    ...(f.min || f.max ? [{ label: priceLabel, clear: () => set({ min: '', max: '' }) }] : []),
    ...(f.beds !== 'any' ? [{ label: `${f.beds} bed`, clear: () => set({ beds: 'any' }) }] : []),
    ...(f.type ? [{ label: f.type, clear: () => set({ type: '' }) }] : []),
    ...(f.floor !== 'any' ? [{ label: FLOOR_BANDS[f.floor].label, clear: () => set({ floor: 'any' as FloorBand }) }] : []),
    ...(f.baths !== 'any' ? [{ label: `${f.baths} bath`, clear: () => set({ baths: 'any' }) }] : []),
    ...(f.furnishing ? [{ label: f.furnishing, clear: () => set({ furnishing: '' }) }] : []),
    ...(f.sizeMin ? [{ label: `${Number(f.sizeMin).toLocaleString()} sqft and up`, clear: () => set({ sizeMin: '' }) }] : []),
    ...(f.category && !f.subtype ? [{ label: categoryOf(f.category)?.label ?? f.category, clear: () => set({ category: '' }) }] : []),
    ...(f.subtype ? [{ label: f.subtype, clear: () => set({ subtype: '' }) }] : []),
    ...(bounds ? [{ label: 'Map area', clear: () => setBounds(null) }] : []),
  ];
  const clearAll = () => {
    setF((cur) => ({ ...cur, q: '', district: '', beds: 'any', type: '', min: '', max: '', floor: 'any', baths: 'any', furnishing: '', sizeMin: '', category: '', subtype: '' }));
    setBounds(null);
  };

  const saveSearch = () => {
    try {
      const key = 'vrent_saved_searches';
      const list = JSON.parse(localStorage.getItem(key) ?? '[]') as { q: string; at: string }[];
      const qs = toQuery(f);
      localStorage.setItem(key, JSON.stringify([{ q: qs, at: new Date().toISOString() }, ...list.filter((s) => s.q !== qs)].slice(0, 20)));
      push({ tone: 'success', title: 'Search saved', body: 'Kept on this device.' });
    } catch {
      push({ tone: 'error', title: 'Search not saved', body: 'This browser is blocking storage.' });
    }
  };

  const selectPin = (key: string) => {
    setActive(key);
    if (view === 'list') document.getElementById(`home-${key.replace('/', '-')}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const selected = view === 'map' && active ? results.find((m) => `${m.ownerId}/${m.listing.id}` === active) : null;

  const moreFilters = (
    <div className="space-y-6">
      {/* Two levels: the kind of property, then the exact classification for
          somebody who knows they want a 4A and not a 4 Generic. */}
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-p1-text">Property type</legend>
        <div className="flex flex-wrap gap-1.5">
          <Chip on={!f.category} onClick={() => set({ category: '', subtype: '' })}>Any</Chip>
          {PROPERTY_CATEGORIES.map((c) => (
            <Chip key={c.key} on={f.category === c.key} onClick={() => set({ category: f.category === c.key ? '' : c.key, subtype: '' })}>
              {c.label}
            </Chip>
          ))}
        </div>
        {f.category && (
          <div className="mt-2.5 max-h-40 overflow-y-auto rounded-lg border border-p1-border p-2">
            {(categoryOf(f.category as PropertyCategory)?.groups ?? []).map((g, gi) => (
              <div key={g.label ?? gi} className={cx(gi > 0 && 'mt-2')}>
                {g.label && <div className="mb-1 text-[11px] font-semibold text-p1-text-3">{g.label}</div>}
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((item) => (
                    <Chip key={item} on={f.subtype === item} onClick={() => set({ subtype: f.subtype === item ? '' : item })}>{item}</Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-p1-text">District</legend>
        <SelectMenu variant="button" hideLabel label="District" value={f.district} onChange={(v) => set({ district: v })}
          options={[{ value: '', label: 'Any district' }, ...Object.entries(DISTRICTS).map(([d, v]) => ({ value: d, label: `${districtCode(Number(d))} · ${v.name}`, hint: v.areas }))]} />
      </fieldset>
      {/* The storey a home is on, which is the part of a unit number that says
          something about the home rather than about which door it is. */}
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-p1-text">Floor</legend>
        <div className="flex flex-wrap gap-1.5">
          {FLOORS.map((x) => (
            <Chip key={x.key} on={f.floor === x.key} onClick={() => set({ floor: x.key })}>
              {x.key === 'any' ? 'Any' : x.label.replace(/ \(.*\)$/, '')}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-p1-text">Bathrooms</legend>
        <div className="flex flex-wrap gap-1.5">
          {BATHS.map((b) => (
            <Chip key={b} on={f.baths === b} onClick={() => set({ baths: b })}>{b === 'any' ? 'Any' : b}</Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-p1-text">Furnishing</legend>
        <div className="flex flex-wrap gap-1.5">
          <Chip on={!f.furnishing} onClick={() => set({ furnishing: '' })}>Any</Chip>
          {FURNISHINGS.map((x) => (
            <Chip key={x} on={f.furnishing === x} onClick={() => set({ furnishing: f.furnishing === x ? '' : x })}>
              {x.replace('Partially furnished', 'Partial').replace('Fully furnished', 'Fully')}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-p1-text">Floor area</legend>
        <label className="block">
          <span className="sr-only">Minimum floor area in square feet</span>
          <input
            inputMode="numeric"
            value={f.sizeMin}
            onChange={(e) => set({ sizeMin: e.target.value.replace(/\D/g, '').slice(0, 5) })}
            placeholder="Minimum sqft"
            className="h-10 w-full rounded-lg border border-p1-border-strong bg-p1-surface px-3 text-[14px] text-p1-text placeholder:text-p1-text-3 focus:border-p1-primary focus:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none"
          />
        </label>
      </fieldset>
    </div>
  );

  return (
    <div className="pb-24 lg:pb-0">
      {/* ------------------------------------------------------ filter bar */}
      <div className="sticky top-[65px] z-30 border-b border-p1-border bg-p1-surface">
        <div className="mx-auto flex h-[60px] w-full max-w-[1440px] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <SearchInput value={f.q} onChange={(v) => set({ q: v })} placeholder="Area, project, MRT or postal code" label="Search homes" size="sm" className="min-w-0 flex-1 md:max-w-xs" />

          <div role="tablist" aria-label="Rent or buy" className="hidden rounded-lg bg-p1-subtle p-1 md:inline-flex">
            {(['rent', 'sale'] as const).map((d) => (
              <button key={d} role="tab" type="button" aria-selected={f.deal === d} onClick={() => set({ deal: d, min: '', max: '' })}
                className={cx('h-8 cursor-pointer rounded-md px-3 text-[13.5px] font-medium transition-colors', f.deal === d ? 'bg-p1-surface text-p1-text shadow-p1-sm' : 'text-p1-text-2 hover:text-p1-text')}>
                {d === 'rent' ? 'Rent' : 'Buy'}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <FilterPopover label={priceLabel} active={Boolean(f.min || f.max)}>{() => <PriceFields f={f} set={set} />}</FilterPopover>
            <FilterPopover label={f.beds === 'any' ? 'Beds' : `${f.beds} bed`} active={f.beds !== 'any'} width="w-auto">
              {(close) => (
                <div className="flex gap-1.5">
                  {BEDS.map((b) => <Chip key={b} on={f.beds === b} onClick={() => { set({ beds: b }); close(); }}>{b === 'any' ? 'Any' : b}</Chip>)}
                </div>
              )}
            </FilterPopover>
            <FilterPopover label={moreCount ? `More · ${moreCount}` : 'More'} active={moreCount > 0} width="w-80">{() => moreFilters}</FilterPopover>
          </div>

          <button type="button" onClick={() => setSheet(true)} className="p1-press relative flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-p1-border-strong bg-p1-surface px-3 text-[13.5px] font-medium text-p1-text md:hidden">
            <SlidersHorizontal size={16} aria-hidden /> Filters
            {activeCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-p1-primary px-1 text-[11px] font-semibold text-p1-primary-on">{activeCount}</span>}
          </button>

          <div className="hidden flex-1 lg:block" />
          <Button variant="ghost" size="sm" leftIcon={<Bookmark size={15} />} onClick={saveSearch} className="hidden lg:inline-flex">Save search</Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1440px] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(400px,42%)]">
        {/* ------------------------------------------------------ results */}
        <section className={cx('min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-6', view === 'map' && 'hidden lg:block')} aria-labelledby="results-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 id="results-title" className="text-[20px] font-semibold tracking-[-0.02em] text-p1-text" aria-live="polite">
              <span className="tabular-nums">{results.length}</span> {results.length === 1 ? 'home' : 'homes'} {sale ? 'for sale' : 'to rent'}
              {f.district && <span className="text-p1-text-3"> in {districtLabel(Number(f.district))}</span>}
            </h1>
            <SelectMenu variant="ghost" label="Sort by" value={f.sort} onChange={(v) => set({ sort: v as Sort })} options={SORTS.map((s) => ({ value: s.key, label: s.label }))} />
          </div>

          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {chips.map((c) => (
                <button key={c.label} type="button" onClick={c.clear} className="p1-in inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-p1-border bg-p1-surface pl-2.5 pr-1.5 text-[12.5px] font-medium text-p1-text hover:border-p1-border-strong">
                  {c.label}<X size={13} className="text-p1-text-3" aria-hidden /><span className="sr-only">Remove filter</span>
                </button>
              ))}
              <button type="button" onClick={clearAll} className="h-7 cursor-pointer px-2 text-[12.5px] font-medium text-p1-primary hover:underline underline-offset-4">Clear all</button>
            </div>
          )}

          {results.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-p1-border bg-p1-surface">
              <EmptyState
                title="No homes match these filters"
                description={items.length ? 'Try widening your budget or the area.' : 'No homes are live right now. Check back soon.'}
                action={chips.length > 0 || f.q ? <Button variant="outline" onClick={clearAll}>Clear filters</Button> : undefined}
              />
            </div>
          ) : (
            <ul key={fitKey} className="vr-stagger mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {results.map((m, i) => {
                const key = `${m.ownerId}/${m.listing.id}`;
                return (
                  <li key={key} id={`home-${key.replace('/', '-')}`}>
                    <PropertyCard item={m} active={active === key} onHover={(h) => setActive(h ? key : null)} priority={i < 4} />
                  </li>
                );
              })}
            </ul>
          )}
          {results.length > 0 && pins.length < results.length && (
            <p className="mt-5 text-[12.5px] text-p1-text-3">{results.length - pins.length} of these {results.length - pins.length === 1 ? 'has' : 'have'} no map position and {results.length - pins.length === 1 ? 'is' : 'are'} not on the map.</p>
          )}
        </section>

        {/* ---------------------------------------------------------- map */}
        <aside className={cx('relative lg:sticky lg:top-[126px] lg:block lg:h-[calc(100dvh-126px)] lg:border-l lg:border-p1-border', view === 'list' ? 'hidden' : 'block h-[calc(100dvh-126px)]')} aria-label="Map">
          <MapPanel items={pins} activeKey={active} onSelect={selectPin} onBounds={setBounds} fitKey={fitKey} showAreaSearch className="absolute inset-0" />
          {selected && (
            <div className="p1-panel absolute inset-x-3 bottom-20 z-[500] lg:hidden">
              <PropertyCard item={selected} variant="row" />
            </div>
          )}
        </aside>
      </div>

      {/* -------------------------------------------- phone: list or map */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <button type="button" onClick={() => { setView((v) => (v === 'list' ? 'map' : 'list')); window.scrollTo({ top: 0 }); }}
          className="p1-press pointer-events-auto inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-p1-text px-5 text-[14px] font-semibold text-p1-bg shadow-p1-lg">
          {view === 'list' ? <><MapIcon size={16} aria-hidden /> Map</> : <><List size={16} aria-hidden /> List</>}
        </button>
      </div>

      <Drawer open={sheet} onClose={() => setSheet(false)} title="Filters" side="right" width="sm"
        footer={<>
          <Button variant="ghost" onClick={clearAll}>Clear all</Button>
          <Button onClick={() => setSheet(false)}>Show {results.length} {results.length === 1 ? 'home' : 'homes'}</Button>
        </>}>
        <div className="space-y-6">
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-p1-text">Looking to</legend>
            <div className="flex gap-1.5">
              <Chip on={f.deal === 'rent'} onClick={() => set({ deal: 'rent', min: '', max: '' })}>Rent</Chip>
              <Chip on={f.deal === 'sale'} onClick={() => set({ deal: 'sale', min: '', max: '' })}>Buy</Chip>
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-p1-text">{sale ? 'Price' : 'Monthly rent'}</legend>
            <PriceFields f={f} set={set} />
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-p1-text">Bedrooms</legend>
            <div className="flex flex-wrap gap-1.5">{BEDS.map((b) => <Chip key={b} on={f.beds === b} onClick={() => set({ beds: b })}>{b === 'any' ? 'Any' : b}</Chip>)}</div>
          </fieldset>
          {moreFilters}
        </div>
      </Drawer>
    </div>
  );
}
