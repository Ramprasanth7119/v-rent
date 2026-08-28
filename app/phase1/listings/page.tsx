"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PageHead, SpecNote, StatusChip } from '../../../components/phase1/bits';
import { PropertyImage } from '../../../components/phase1/PropertyImage';
import { useToast } from '../../../components/phase1/Toast';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { DemoListing, ListingStatus, sgd } from '../../../lib/phase1/data';
import {
  Upload, Plus, Copy, Pause, Play, AlertTriangle, Search,
  LayoutGrid, Rows3, ArrowUpDown, Bed, Bath, Maximize,
} from 'lucide-react';

const FILTERS: { key: ListingStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
  { key: 'paused', label: 'Paused' },
  { key: 'rejected', label: 'Rejected' },
];

type Sort = 'recent' | 'rent_desc' | 'rent_asc';

export default function ListingsPage() {
  const { state, setListingStatus, addListing, canPublish } = useDemo();
  const { push } = useToast();
  const [filter, setFilter] = useState<ListingStatus | 'all'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('recent');

  const rows = state.listings
    .filter((l) => filter === 'all' || l.status === filter)
    .filter((l) => !q || [l.project, l.address, l.unitNo, l.reference].some((v) => v.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) =>
      sort === 'rent_desc' ? b.monthlyRent - a.monthlyRent
      : sort === 'rent_asc' ? a.monthlyRent - b.monthlyRent
      : b.createdAt.localeCompare(a.createdAt)
    );

  const clone = (l: DemoListing) => {
    addListing({
      ...l,
      id: `lst-${Math.random().toString(36).slice(2, 8)}`,
      reference: `VR-${24110 + state.listings.length}`,
      unitNo: '#—',
      status: 'draft',
      publishedAt: undefined,
      expiresAt: undefined,
      rejectionReason: undefined,
      createdAt: '2026-08-28',
    });
    push({ tone: 'success', title: 'Listing cloned', body: 'Created as a draft, without the compliance snapshot.' });
  };

  const publish = (l: DemoListing) => {
    if (!canPublish) {
      push({ tone: 'warn', title: 'Publication blocked', body: 'A gate condition failed — open the dashboard to see which.' });
      return;
    }
    setListingStatus(l.id, 'published');
    push({ tone: 'success', title: 'Listing published' });
  };

  return (
    <>
      <PageHead
        module="M12 · Listing Management"
        title="My listings"
        actions={
          <>
            <Link href="/phase1/listings/import">
              <Button variant="outline" leftIcon={<Upload size={14} />}>Bulk import</Button>
            </Link>
            <Link href="/phase1/listings/new">
              <Button variant="gold" leftIcon={<Plus size={14} />}>New listing</Button>
            </Link>
          </>
        }
      />

      {!canPublish && (
        <Card className="mb-5 border-amber-300/60 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
              Publication is currently blocked. Listings already published stay live — the gate governs new
              publications and republication.{' '}
              <Link href="/phase1/dashboard" className="font-semibold text-brand-gold underline">See why</Link>
            </p>
          </div>
        </Card>
      )}

      {/* toolbar */}
      <Card className="mb-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search project, address, unit or reference"
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder-neutral-400 focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/10"
            />
          </div>

          <button
            onClick={() => setSort((s) => (s === 'recent' ? 'rent_desc' : s === 'rent_desc' ? 'rent_asc' : 'recent'))}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:border-brand-gold/50 dark:text-neutral-400"
          >
            <ArrowUpDown size={13} />
            {sort === 'recent' ? 'Most recent' : sort === 'rent_desc' ? 'Rent, high to low' : 'Rent, low to high'}
          </button>

          <div className="flex overflow-hidden rounded-lg border border-border">
            <button
              onClick={() => setView('grid')}
              aria-label="Grid view"
              className={`p-2 transition-colors ${view === 'grid' ? 'bg-brand-navy text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900'}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setView('list')}
              aria-label="List view"
              className={`p-2 transition-colors ${view === 'list' ? 'bg-brand-navy text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900'}`}
            >
              <Rows3 size={14} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
          {FILTERS.map((f) => {
            const count = f.key === 'all' ? state.listings.length : state.listings.filter((l) => l.status === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-brand-navy text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800'
                }`}
              >
                {f.label} <span className="tabular-nums opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* results */}
      {view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((l) => (
            <Card key={l.id} hoverEffect className="group flex flex-col overflow-hidden p-0">
              <Link href={`/phase1/listings/${l.id}`} className="relative block">
                <PropertyImage seed={l.reference + l.project} variant={0} rounded="rounded-none"
                  className="aspect-[16/10] w-full transition-transform duration-300 group-hover:scale-[1.03]" />
                <div className="absolute left-2.5 top-2.5"><StatusChip status={l.status} /></div>
                <div className="absolute bottom-2.5 right-2.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                  {l.images} photos
                </div>
              </Link>

              <div className="flex flex-1 flex-col p-4">
                <Link href={`/phase1/listings/${l.id}`} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-brand-gold">
                      {l.project}
                    </span>
                    <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-foreground">{sgd(l.monthlyRent)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                    {l.unitNo} · {l.address}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
                    <span className="flex items-center gap-1"><Bed size={11} />{l.bedrooms}</span>
                    <span className="flex items-center gap-1"><Bath size={11} />{l.bathrooms}</span>
                    <span className="flex items-center gap-1"><Maximize size={11} />{l.sizeSqft.toLocaleString()} sqft</span>
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] dark:bg-neutral-900">
                      D{String(l.district).padStart(2, '0')}
                    </span>
                  </div>
                </Link>

                <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
                  <Button size="sm" variant="ghost" leftIcon={<Copy size={11} />} onClick={() => clone(l)}>Clone</Button>
                  {l.status === 'published' && (
                    <Button size="sm" variant="ghost" leftIcon={<Pause size={11} />}
                      onClick={() => { setListingStatus(l.id, 'paused'); push({ tone: 'info', title: 'Listing paused' }); }}>
                      Pause
                    </Button>
                  )}
                  {l.status === 'paused' && (
                    <Button size="sm" variant="ghost" leftIcon={<Play size={11} />}
                      onClick={() => { setListingStatus(l.id, 'published'); push({ tone: 'success', title: 'Listing resumed' }); }}>
                      Resume
                    </Button>
                  )}
                  {l.status === 'draft' && (
                    <Button size="sm" variant="gold" onClick={() => publish(l)}>Publish</Button>
                  )}
                  <Link href={`/phase1/listings/${l.id}`} className="ml-auto text-[11px] font-medium text-brand-gold hover:underline">
                    View →
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {rows.map((l) => (
            <Card key={l.id} hoverEffect className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
              <Link href={`/phase1/listings/${l.id}`} className="flex-shrink-0">
                <PropertyImage seed={l.reference + l.project} variant={0} className="h-16 w-24" />
              </Link>
              <Link href={`/phase1/listings/${l.id}`} className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{l.project}</span>
                  <StatusChip status={l.status} />
                  <span className="font-mono text-[10px] text-neutral-400">{l.reference}</span>
                </div>
                <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {l.unitNo} · {l.address}, S({l.postalCode}) · D{String(l.district).padStart(2, '0')}
                </div>
                <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {l.bedrooms} bed · {l.bathrooms} bath · {l.sizeSqft.toLocaleString()} sqft · {l.furnishing}
                </div>
                {l.status === 'rejected' && l.rejectionReason && (
                  <div className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700 dark:bg-red-950/30 dark:text-red-400">
                    Rejected: {l.rejectionReason}
                  </div>
                )}
              </Link>
              <div className="flex flex-shrink-0 flex-col items-end gap-2">
                <div className="text-sm font-semibold tabular-nums text-foreground">
                  {sgd(l.monthlyRent)}<span className="text-xs font-normal text-neutral-400">/mo</span>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" leftIcon={<Copy size={11} />} onClick={() => clone(l)}>Clone</Button>
                  {l.status === 'draft' && <Button size="sm" variant="gold" onClick={() => publish(l)}>Publish</Button>}
                  {l.status === 'published' && (
                    <Button size="sm" variant="outline" leftIcon={<Pause size={11} />}
                      onClick={() => { setListingStatus(l.id, 'paused'); push({ tone: 'info', title: 'Listing paused' }); }}>Pause</Button>
                  )}
                  {l.status === 'paused' && (
                    <Button size="sm" variant="outline" leftIcon={<Play size={11} />}
                      onClick={() => { setListingStatus(l.id, 'published'); push({ tone: 'success', title: 'Listing resumed' }); }}>Resume</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {rows.length === 0 && (
        <Card className="py-12 text-center text-sm text-neutral-400">
          No listings match this view.
        </Card>
      )}

      <SpecNote>
        Every card links through to the full listing, where the compliance snapshot, activity history and
        the publish gate for that specific listing are visible. <strong>Clone</strong> was added after the
        competitive review — agents list many near-identical units in one development, and it deliberately
        drops the compliance snapshot so a copy must pass the gate on its own.
      </SpecNote>
    </>
  );
}
