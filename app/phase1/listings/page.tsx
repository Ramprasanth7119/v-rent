"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PageHead, SpecNote, StatusChip } from '../../../components/phase1/bits';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { ListingStatus, sgd } from '../../../lib/phase1/data';
import { Upload, Plus, Copy, Pause, Play, AlertTriangle } from 'lucide-react';

const FILTERS: { key: ListingStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
  { key: 'paused', label: 'Paused' },
  { key: 'rejected', label: 'Rejected' },
];

export default function ListingsPage() {
  const { state, setListingStatus, addListing, canPublish } = useDemo();
  const [filter, setFilter] = useState<ListingStatus | 'all'>('all');

  const rows = state.listings.filter((l) => filter === 'all' || l.status === filter);

  const clone = (id: string) => {
    const src = state.listings.find((l) => l.id === id);
    if (!src) return;
    addListing({
      ...src,
      id: `lst-${Math.random().toString(36).slice(2, 8)}`,
      reference: `VR-${24110 + state.listings.length}`,
      unitNo: '#—',
      status: 'draft',
      publishedAt: undefined,
      expiresAt: undefined,
      rejectionReason: undefined,
      createdAt: '2026-08-28',
    });
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
              Publication is currently blocked. Existing published listings stay live — the gate governs
              new publications and republication.{' '}
              <Link href="/phase1/dashboard" className="font-semibold text-brand-gold underline">
                See why
              </Link>
            </p>
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
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

      <div className="grid gap-3">
        {rows.map((l) => (
          <Card key={l.id} className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
            <div className="flex h-16 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-[10px] font-medium text-neutral-400 dark:bg-neutral-900">
              {l.images} photos
            </div>

            <div className="min-w-0 flex-1">
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
              {l.status === 'published' && l.expiresAt && (
                <div className="mt-1.5 text-[11px] text-neutral-400">Expires {l.expiresAt}</div>
              )}
            </div>

            <div className="flex flex-shrink-0 flex-col items-end gap-2">
              <div className="text-sm font-semibold tabular-nums text-foreground">
                {sgd(l.monthlyRent)}
                <span className="text-xs font-normal text-neutral-400">/mo</span>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" leftIcon={<Copy size={12} />} onClick={() => clone(l.id)}>
                  Clone
                </Button>
                {l.status === 'published' && (
                  <Button size="sm" variant="outline" leftIcon={<Pause size={12} />} onClick={() => setListingStatus(l.id, 'paused')}>
                    Pause
                  </Button>
                )}
                {l.status === 'paused' && (
                  <Button size="sm" variant="outline" leftIcon={<Play size={12} />} onClick={() => setListingStatus(l.id, 'published')}>
                    Resume
                  </Button>
                )}
                {l.status === 'draft' && (
                  <Button
                    size="sm"
                    variant="gold"
                    disabled={!canPublish}
                    onClick={() => setListingStatus(l.id, 'published')}
                  >
                    Publish
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card className="py-10 text-center text-sm text-neutral-400">No listings in this view.</Card>
        )}
      </div>

      <SpecNote>
        <strong>Clone</strong> was added after the competitive review — agents list many near-identical
        units in the same development, and retyping each one is the sort of friction that loses a user.
        The clone deliberately drops the compliance snapshot and publication state, so a copied listing
        must pass the gate on its own.
      </SpecNote>
    </>
  );
}
