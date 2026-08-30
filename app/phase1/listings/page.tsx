"use client";

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Button, LinkButton, IconButton, Card, PageHeader, StatCard, Callout, SearchInput, FilterChips, FilterBar,
  SortButton, usePagination, Pagination, DataTable, Column, EmptyState, PresenterNote, cx, Skeleton,
} from '../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../components/phase1/status';
import { ConfirmDialog } from '../../../components/phase1/overlays';
import { useToast } from '../../../components/phase1/Toast';
import { PropertyImage } from '../../../components/phase1/PropertyImage';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { DemoListing, ListingStatus, sgd } from '../../../lib/phase1/data';
import {
  Upload, Plus, Copy, Pause, Play, LayoutGrid, Rows3, Bed, Bath, Maximize, Camera, Building2, Lock, ArrowRight,
} from 'lucide-react';

type FilterKey = ListingStatus | 'all';
type Sort = 'recent' | 'rent_desc' | 'rent_asc' | 'updated';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
  { key: 'pending_review', label: 'Pending review' },
  { key: 'paused', label: 'Paused' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'expired', label: 'Expired' },
];

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
const district = (n: number) => `D${String(n).padStart(2, '0')}`;

export default function ListingsPage() {
  return (
    <Suspense fallback={<ListingsSkeleton />}>
      <ListingsBody />
    </Suspense>
  );
}

function ListingsBody() {
  const params = useSearchParams();
  const { state, setListingStatus, addListing, canPublish } = useDemo();
  const { push } = useToast();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [sort, setSort] = useState<Sort>('recent');
  const [pauseTarget, setPauseTarget] = useState<DemoListing | null>(null);

  const all = state.listings;
  const counts = (k: FilterKey) => (k === 'all' ? all.length : all.filter((l) => l.status === k).length);

  const rows = all
    .filter((l) => filter === 'all' || l.status === filter)
    .filter((l) => !q || [l.project, l.address, l.unitNo, l.reference, l.postalCode].some((v) => v.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) =>
      sort === 'rent_desc' ? b.monthlyRent - a.monthlyRent
      : sort === 'rent_asc' ? a.monthlyRent - b.monthlyRent
      : sort === 'updated' ? (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)
      : b.createdAt.localeCompare(a.createdAt),
    );

  const pg = usePagination(rows, 6);

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
      updatedAt: '2026-08-28',
    });
    push({ tone: 'success', title: 'Listing cloned', body: 'Created as a draft. Add the unit number and photos, then publish.' });
  };

  const publish = (l: DemoListing) => {
    if (!canPublish) {
      push({ tone: 'warn', title: 'Publication blocked', body: 'One of the publication checks is failing. Open the dashboard to see which.' });
      return;
    }
    setListingStatus(l.id, 'published');
    push({ tone: 'success', title: 'Listing published', body: `${l.project} is now live.` });
  };

  const pause = (l: DemoListing) => {
    setListingStatus(l.id, 'paused');
    push({ tone: 'info', title: 'Listing paused', body: 'Resume any time from the listing.' });
    setPauseTarget(null);
  };

  const resume = (l: DemoListing) => {
    setListingStatus(l.id, 'published');
    push({ tone: 'success', title: 'Listing resumed' });
  };

  const clearFilters = () => { setQ(''); setFilter('all'); pg.setPage(1); };

  const Actions = ({ l, compact = false }: { l: DemoListing; compact?: boolean }) => (
    <div className={cx('flex flex-wrap items-center gap-1.5', compact && 'justify-end')}>
      <Button size="sm" variant="ghost" leftIcon={<Copy size={14} />} onClick={() => clone(l)}>Clone</Button>
      {l.status === 'published' && (
        <Button size="sm" variant="ghost" leftIcon={<Pause size={14} />} onClick={() => setPauseTarget(l)}>Pause</Button>
      )}
      {l.status === 'paused' && (
        <Button size="sm" variant="ghost" leftIcon={<Play size={14} />} onClick={() => resume(l)}>Resume</Button>
      )}
      {(l.status === 'draft' || l.status === 'rejected') && (
        <Button size="sm" variant="accent" leftIcon={!canPublish ? <Lock size={14} /> : undefined} onClick={() => publish(l)}>Publish</Button>
      )}
      {!compact && (
        <Link href={`/phase1/listings/${l.id}`} className="ml-auto inline-flex h-9 items-center gap-1 px-2 text-[13px] font-semibold text-p1-accent-text underline-offset-4 hover:underline">
          View <ArrowRight size={14} aria-hidden />
        </Link>
      )}
    </div>
  );

  const columns: Column<DemoListing>[] = [
    {
      key: 'property', header: 'Property',
      render: (l) => (
        <Link href={`/phase1/listings/${l.id}`} className="flex items-center gap-3">
          <PropertyImage seed={l.reference + l.project} variant={0} className="h-12 w-16 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold text-p1-text">{l.project}</span>
            <span className="block truncate text-[13px] text-p1-text-3">{l.unitNo} · {l.address}</span>
          </span>
        </Link>
      ),
    },
    { key: 'rent', header: 'Rent', align: 'right', sortValue: (l) => l.monthlyRent, render: (l) => <span className="font-semibold tabular-nums">{sgd(l.monthlyRent)}<span className="text-[12px] font-normal text-p1-text-3">/mo</span></span> },
    { key: 'facts', header: 'Beds · Baths · Size', hideBelow: 'md', render: (l) => <span className="text-p1-text-2">{l.bedrooms} bed · {l.bathrooms} bath · {l.sizeSqft.toLocaleString()} sqft</span> },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge kind="listing" value={l.status} /> },
    { key: 'updated', header: 'Updated', hideBelow: 'lg', sortValue: (l) => l.updatedAt ?? l.createdAt, render: (l) => <span className="text-p1-text-2">{fmtDate(l.updatedAt ?? l.createdAt)}</span> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', render: (l) => <Actions l={l} compact /> },
  ];

  const published = counts('published');
  const drafts = counts('draft');
  const pending = counts('pending_review');
  const attention = counts('rejected') + counts('expired');

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="My listings"
        description="Everything you have listed, in one place. Publish drafts, pause what is let, and keep your inventory current."
        actions={
          <>
            <LinkButton href="/phase1/listings/import" variant="outline" leftIcon={<Upload size={16} />}>Bulk import</LinkButton>
            <LinkButton href="/phase1/listings/new" variant="accent" leftIcon={<Plus size={16} />}>New listing</LinkButton>
          </>
        }
      />

      {!canPublish && (
        <Callout tone="warning" title="Publication is currently blocked" className="mb-5"
          action={<LinkButton href="/phase1/dashboard" variant="outline" size="sm">See what&apos;s blocking publication</LinkButton>}>
          Listings already published stay live. New publications and republications are held until the check passes.
        </Callout>
      )}

      <div className="vr-stagger mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Published" value={published} tone="success" hint="Live now" />
        <StatCard label="Drafts" value={drafts} hint="Not yet submitted" />
        <StatCard label="Pending review" value={pending} tone={pending ? 'warning' : 'neutral'} hint="With a moderator" />
        <StatCard label="Needs attention" value={attention} tone={attention ? 'danger' : 'neutral'} hint="Rejected or expired" />
      </div>

      <FilterBar>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchInput value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Search by project, address, unit or reference" className="flex-1" label="Search listings" />
          <div className="flex items-center gap-2">
            <SortButton<Sort>
              value={sort}
              onChange={setSort}
              options={[
                { key: 'recent', label: 'Most recent' },
                { key: 'updated', label: 'Last updated' },
                { key: 'rent_desc', label: 'Rent, high to low' },
                { key: 'rent_asc', label: 'Rent, low to high' },
              ]}
            />
            <div className="flex overflow-hidden rounded-lg border border-p1-border-strong" role="group" aria-label="View">
              <IconButton label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')} className={cx('rounded-none', view === 'grid' && 'bg-p1-primary text-p1-primary-on hover:bg-p1-primary hover:text-p1-primary-on')}><LayoutGrid size={18} /></IconButton>
              <IconButton label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')} className={cx('rounded-none', view === 'list' && 'bg-p1-primary text-p1-primary-on hover:bg-p1-primary hover:text-p1-primary-on')}><Rows3 size={18} /></IconButton>
            </div>
          </div>
        </div>
        <FilterChips<FilterKey>
          label="Filter by status"
          value={filter}
          onChange={(k) => { setFilter(k); pg.setPage(1); }}
          options={FILTERS.map((f) => ({ key: f.key, label: f.label, count: counts(f.key) }))}
        />
      </FilterBar>

      {all.length === 0 ? (
        <Card>
          <EmptyState icon={<Building2 size={26} />} title="No listings yet" description="Create your first listing to start reaching tenants. It takes about ten minutes."
            action={<LinkButton href="/phase1/listings/new" variant="accent" leftIcon={<Plus size={16} />}>Create your first listing</LinkButton>} />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title="No listings match" description="Try a different search term or clear the filters."
            action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>} />
        </Card>
      ) : view === 'grid' ? (
        <div className="vr-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pg.slice.map((l) => (
            <Card key={l.id} interactive padding="none" as="article" className="flex flex-col overflow-hidden">
              <Link href={`/phase1/listings/${l.id}`} className="relative block overflow-hidden">
                <PropertyImage seed={l.reference + l.project} variant={0} rounded="rounded-none" className="aspect-[16/10] w-full" />
                <div className="absolute left-3 top-3"><StatusBadge kind="listing" value={l.status} /></div>
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-medium text-white">
                  <Camera size={12} aria-hidden /> {l.images}
                </span>
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <Link href={`/phase1/listings/${l.id}`} className="min-w-0">
                  <div className="text-[20px] font-semibold tabular-nums text-p1-text">
                    {sgd(l.monthlyRent)}<span className="text-[13px] font-normal text-p1-text-3">/mo</span>
                  </div>
                  <div className="mt-1 truncate text-[15px] font-semibold text-p1-text">{l.project}</div>
                  <div className="mt-0.5 truncate text-[13px] text-p1-text-2">{l.unitNo} · {l.address}</div>
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-p1-text-2">
                  <span className="flex items-center gap-1"><Bed size={14} aria-hidden />{l.bedrooms} <span className="sr-only">bedrooms</span></span>
                  <span className="flex items-center gap-1"><Bath size={14} aria-hidden />{l.bathrooms} <span className="sr-only">bathrooms</span></span>
                  <span className="flex items-center gap-1"><Maximize size={14} aria-hidden />{l.sizeSqft.toLocaleString()} sqft</span>
                  <Pill>{district(l.district)}</Pill>
                </div>
                <div className="mt-2 text-[12px] text-p1-text-3">Updated {fmtDate(l.updatedAt ?? l.createdAt)}</div>
                {l.status === 'rejected' && l.rejectionReason && (
                  <p className="mt-2 text-[13px] text-p1-danger">{l.rejectionReason}</p>
                )}
                <div className="mt-3 border-t border-p1-border pt-3">
                  <Actions l={l} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <DataTable<DemoListing>
          columns={columns}
          rows={pg.slice}
          rowKey={(l) => l.id}
          caption="My listings"
          minWidth={720}
        />
      )}

      {rows.length > 0 && <Pagination className="mt-5" page={pg.page} pages={pg.pages} onChange={pg.setPage} from={pg.from} to={pg.to} total={pg.total} />}

      <ConfirmDialog
        open={!!pauseTarget}
        onClose={() => setPauseTarget(null)}
        onConfirm={() => pauseTarget && pause(pauseTarget)}
        title="Pause this listing?"
        description="Tenants will not see it until you resume. Your quota slot is kept."
        confirmLabel="Pause listing"
      />

      <PresenterNote>
        Every card links through to the full listing, where the compliance snapshot, activity history and the
        publication checklist for that listing are visible. <strong>Clone</strong> was added after the competitive
        review — agents list many near-identical units in one development. A clone drops the compliance snapshot,
        so the copy must pass the publish gate on its own.
      </PresenterNote>
    </>
  );
}


function ListingsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading listings">
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="mb-8 h-10 w-64" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="mb-4 h-24" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
      </div>
    </div>
  );
}
