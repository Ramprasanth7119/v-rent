"use client";

/**
 * My listings.
 *
 * A property list, not a record list: the photograph and the rent lead, and the
 * chrome is limited to status, health and one menu. Filters are deep-linkable so
 * the dashboard and the weekly insight can send the agent straight to a subset.
 */

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Button, LinkButton, IconButton, Card, PageHeader, MetricStrip, Metric, Callout, SearchInput, FilterChips, FilterBar,
  SortButton, InlineSelect, usePagination, Pagination, DataTable, Column, EmptyState, Menu, SkeletonPage, cx } from '../../../components/phase1/kit';
import { StatusBadge } from '../../../components/phase1/status';
import { useListingActions, ListingActionDialogs } from '../../../components/phase1/listing/actions';
import { ListingCard, PropertyCell, fmtDate, daysUntil } from '../../../components/phase1/listing/ListingCard';
import { HealthRing } from '../../../components/phase1/listing/health';
import { StatsInline, Pulse } from '../../../components/phase1/listing/pulse';
import { useDemo, TODAY } from '../../../lib/phase1/DemoContext';
import { DemoListing, ListingStatus, sgd } from '../../../lib/phase1/data';
import { listingStats, districtName } from '../../../lib/phase1/performance';
import { DEAL_LABEL, comparablePrice, dealOf, priceLabel } from '../../../lib/phase1/pricing';
import { Upload, Plus, LayoutGrid, Rows3, Building2, Archive, X, SlidersHorizontal, FileDown } from 'lucide-react';

type FilterKey = ListingStatus | 'all';
type Sort = 'recent' | 'updated' | 'views' | 'enquiries' | 'rent_desc' | 'rent_asc' | 'health';
type Beds = 'any' | '1' | '2' | '3' | '4+';
type Band = 'any' | 'lt3' | '3to6' | '6to10' | 'gt10';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
  { key: 'pending_review', label: 'Pending review' },
  { key: 'paused', label: 'Paused' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'expired', label: 'Expired' },
];

const BANDS: Record<Band, (rent: number) => boolean> = {
  any: () => true,
  lt3: (r) => r < 3000,
  '3to6': (r) => r >= 3000 && r < 6000,
  '6to10': (r) => r >= 6000 && r < 10000,
  gt10: (r) => r >= 10000,
};

export default function ListingsPage() {
  return (
    <Suspense fallback={<SkeletonPage metrics={4} />}>
      <ListingsBody />
    </Suspense>
  );
}

function ListingsBody() {
  const params = useSearchParams();
  const { state } = useDemo();
  const a = useListingActions();

  const statusParam = params.get('status');
  const [filter, setFilter] = useState<FilterKey>(
    statusParam && FILTERS.some((f) => f.key === statusParam) ? (statusParam as FilterKey) : 'all',
  );
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [sort, setSort] = useState<Sort>('recent');
  const [beds, setBeds] = useState<Beds>('any');
  const [band, setBand] = useState<Band>('any');
  const [dist, setDist] = useState<string>(params.get('district') ?? 'any');
  const [deal, setDeal] = useState<'any' | 'rent' | 'sale'>(
    () => (params.get('deal') === 'sale' || params.get('deal') === 'rent' ? params.get('deal') as 'sale' | 'rent' : 'any'),
  );
  const [type, setType] = useState<string>('any');
  const [showArchived, setShowArchived] = useState(false);

  const all = useMemo(() => state.listings.filter((l) => (showArchived ? l.archived : !l.archived)), [state.listings, showArchived]);
  const archivedCount = state.listings.filter((l) => l.archived).length;

  const districts = useMemo(
    () => Array.from(new Set(state.listings.filter((l) => !l.archived).map((l) => l.district))).sort((x, y) => x - y),
    [state.listings],
  );
  const types = useMemo(
    () => Array.from(new Set(state.listings.filter((l) => !l.archived).map((l) => l.propertyType))).sort(),
    [state.listings],
  );

  const counts = (k: FilterKey) => (k === 'all' ? all.length : all.filter((l) => l.status === k).length);

  const matchesBeds = (l: DemoListing) => beds === 'any' || (beds === '4+' ? l.bedrooms >= 4 : l.bedrooms === Number(beds));

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all
      .filter((l) => filter === 'all' || l.status === filter)
      .filter((l) => !needle || [l.project, l.address, l.unitNo, l.reference, l.postalCode].some((v) => v.toLowerCase().includes(needle)))
      .filter(matchesBeds)
      .filter((l) => BANDS[band](comparablePrice(l)))
      .filter((l) => dist === 'any' || l.district === Number(dist))
      .filter((l) => deal === 'any' || dealOf(l) === deal)
      .filter((l) => type === 'any' || l.propertyType === type)
      .sort((x, y) =>
        sort === 'rent_desc' ? comparablePrice(y) - comparablePrice(x)
        : sort === 'rent_asc' ? comparablePrice(x) - comparablePrice(y)
        : sort === 'updated' ? (y.updatedAt ?? y.createdAt).localeCompare(x.updatedAt ?? x.createdAt)
        : sort === 'views' ? listingStats(y).views30d - listingStats(x).views30d
        : sort === 'enquiries' ? listingStats(y).enquiries30d - listingStats(x).enquiries30d
        : sort === 'health' ? x.images - y.images
        : y.createdAt.localeCompare(x.createdAt),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- matchesBeds is derived from `beds`
  }, [all, filter, q, beds, band, dist, type, sort]);

  const pg = usePagination(rows, view === 'grid' ? 9 : 12);

  const activeFilters = [
    beds !== 'any' && { label: beds === '4+' ? '4+ bedrooms' : `${beds} bedroom${beds === '1' ? '' : 's'}`, clear: () => setBeds('any') },
    band !== 'any' && { label: { lt3: 'Under S$3,000', '3to6': 'S$3,000–6,000', '6to10': 'S$6,000–10,000', gt10: 'Over S$10,000' }[band], clear: () => setBand('any') },
    dist !== 'any' && { label: `D${String(dist).padStart(2, '0')} ${districtName(Number(dist))}`, clear: () => setDist('any') },
    deal !== 'any' && { label: DEAL_LABEL[deal], clear: () => setDeal('any') },
    type !== 'any' && { label: type, clear: () => setType('any') },
    q.trim() !== '' && { label: `“${q.trim()}”`, clear: () => setQ('') },
  ].filter(Boolean) as { label: string; clear: () => void }[];
  /**
   * The shortlist is whatever the filters left on screen, in the order shown.
   * Capped because a PDF of two hundred units is not a shortlist.
   */
  const exportHref = `/phase1/listings/export?ids=${rows.slice(0, 20).map((l) => l.id).join(',')}`;


  const clearAll = () => { setQ(''); setFilter('all'); setBeds('any'); setBand('any'); setDist('any'); setType('any'); pg.setPage(1); };

  const columns: Column<DemoListing>[] = [
    {
      key: 'property', header: 'Property', width: '34%',
      render: (l) => <PropertyCell l={l} href={`/phase1/listings/${l.id}`} />,
    },
    {
      key: 'rent', header: 'Price', align: 'right', nowrap: true, sortValue: (l) => comparablePrice(l),
      render: (l) => <span className="font-semibold tabular-nums">{sgd(l.monthlyRent)}<span className="text-[12px] font-normal text-p1-text-3">/mo</span></span>,
    },
    {
      key: 'facts', header: 'Beds · Baths · Size', hideBelow: 'lg', muted: true, nowrap: true,
      render: (l) => <>{l.bedrooms} · {l.bathrooms} · {l.sizeSqft.toLocaleString()} sqft</>,
    },
    { key: 'status', header: 'Status', nowrap: true, render: (l) => <StatusBadge kind="listing" value={l.status} size="sm" /> },
    { key: 'health', header: 'Health', align: 'center', hideBelow: 'md', render: (l) => <HealthRing listing={l} size={30} /> },
    {
      key: 'traffic', header: 'Views · Enquiries', hideBelow: 'xl', nowrap: true,
      render: (l) => (l.status === 'published' || l.status === 'paused' || l.status === 'expired'
        ? <span className="inline-flex items-center gap-3"><StatsInline listing={l} /><Pulse listing={l} showSpark={false} /></span>
        : <span className="text-[12.5px] text-p1-text-3">—</span>),
    },
    {
      key: 'updated', header: 'Updated', align: 'right', hideBelow: 'lg', muted: true, nowrap: true,
      sortValue: (l) => l.updatedAt ?? l.createdAt,
      render: (l) => fmtDate(l.updatedAt ?? l.createdAt),
    },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', nowrap: true,
      render: (l) => <Menu items={a.menuFor(l, { includeView: true })} label={`Actions for ${l.project}`} />,
    },
  ];

  const published = counts('published');
  const expiringSoon = all.filter((l) => l.status === 'published' && (daysUntil(l.expiresAt, TODAY) ?? 99) <= 30).length;
  const attention = counts('rejected') + counts('expired') + all.filter((l) => l.status === 'draft' && l.images === 0).length;

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

      {!a.canPublish && (
        <Callout tone="warning" title="Publication is currently blocked" className="mb-5"
          action={<LinkButton href="/phase1/dashboard" variant="outline" size="sm">See what&apos;s blocking it</LinkButton>}>
          Listings already published stay live. New publications and republications are held until the check passes.
        </Callout>
      )}

      <MetricStrip cols={4} className="mb-5">
        <Metric label="Published" value={published} tone="success" hint="Live now" href="/phase1/listings?status=published" />
        <Metric label="Drafts" value={counts('draft')} hint="Not yet submitted" href="/phase1/listings?status=draft" />
        <Metric label="Expiring soon" value={expiringSoon} tone={expiringSoon ? 'warning' : 'default'} hint="Within 30 days" />
        <Metric label="Needs attention" value={attention} tone={attention ? 'danger' : 'default'} hint="Rejected, expired or no photos" />
      </MetricStrip>

      <FilterBar>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchInput value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Search by project, address, unit, postal code or reference" className="flex-1" label="Search listings" />
          <div className="flex flex-wrap items-center gap-2">
            <SortButton<Sort>
              value={sort}
              onChange={setSort}
              options={[
                { key: 'recent', label: 'Most recent' },
                { key: 'updated', label: 'Last updated' },
                { key: 'views', label: 'Most viewed' },
                { key: 'enquiries', label: 'Most enquiries' },
                { key: 'rent_desc', label: 'Rent, high to low' },
                { key: 'rent_asc', label: 'Rent, low to high' },
                { key: 'health', label: 'Fewest photos first' },
              ]}
            />
            <div className="flex overflow-hidden rounded-lg border border-p1-border-strong" role="group" aria-label="View">
              <IconButton label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')} className={cx('rounded-none', view === 'grid' && 'bg-p1-primary text-p1-primary-on hover:bg-p1-primary hover:text-p1-primary-on')}><LayoutGrid size={18} /></IconButton>
              <IconButton label="Table view" aria-pressed={view === 'list'} onClick={() => setView('list')} className={cx('rounded-none', view === 'list' && 'bg-p1-primary text-p1-primary-on hover:bg-p1-primary hover:text-p1-primary-on')}><Rows3 size={18} /></IconButton>
            </div>
          </div>
        </div>

        <FilterChips<FilterKey>
          label="Filter by status"
          value={filter}
          onChange={(k) => { setFilter(k); pg.setPage(1); }}
          options={FILTERS.map((f) => ({ key: f.key, label: f.label, count: counts(f.key) }))}
        />

        <div className="flex flex-wrap items-center gap-2 border-t border-p1-border pt-3">
          <SlidersHorizontal size={15} className="text-p1-text-3" aria-hidden />
          <InlineSelect<Beds> label="Bedrooms" value={beds} onChange={(v) => { setBeds(v); pg.setPage(1); }}
            options={[{ key: 'any', label: 'Any bedrooms' }, { key: '1', label: '1 bedroom' }, { key: '2', label: '2 bedrooms' }, { key: '3', label: '3 bedrooms' }, { key: '4+', label: '4+ bedrooms' }]} />
          <InlineSelect<'any' | 'rent' | 'sale'>
            label="Sale or rent"
            value={deal}
            onChange={(v) => { setDeal(v); pg.setPage(1); }}
            options={[{ key: 'any', label: 'Sale and rent' }, { key: 'rent', label: 'For rent' }, { key: 'sale', label: 'For sale' }]}
          />
          <InlineSelect<Band> label="Monthly rent" value={band} onChange={(v) => { setBand(v); pg.setPage(1); }}
            options={[{ key: 'any', label: 'Any rent' }, { key: 'lt3', label: 'Under S$3,000' }, { key: '3to6', label: 'S$3,000–6,000' }, { key: '6to10', label: 'S$6,000–10,000' }, { key: 'gt10', label: 'Over S$10,000' }]} />
          <InlineSelect<string> label="District" value={dist} onChange={(v) => { setDist(v); pg.setPage(1); }}
            options={[{ key: 'any', label: 'Any district' }, ...districts.map((d) => ({ key: String(d), label: `D${String(d).padStart(2, '0')} ${districtName(d)}` }))]} />
          <InlineSelect<string> label="Property type" value={type} onChange={(v) => { setType(v); pg.setPage(1); }}
            options={[{ key: 'any', label: 'Any type' }, ...types.map((t) => ({ key: t, label: t }))]} />
          {archivedCount > 0 && (
            <Button size="sm" variant={showArchived ? 'primary' : 'ghost'} aria-pressed={showArchived}
              leftIcon={<Archive size={14} />} onClick={() => { setShowArchived((v) => !v); pg.setPage(1); }}>
              Archived ({archivedCount})
            </Button>
          )}
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-p1-border pt-3">
            <span className="text-[12.5px] text-p1-text-3">Showing {rows.length} of {all.length}:</span>
            {activeFilters.map((f) => (
              <button key={f.label} type="button" onClick={() => { f.clear(); pg.setPage(1); }}
                className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-p1-border-strong bg-p1-surface px-2.5 text-[12.5px] text-p1-text hover:bg-p1-subtle">
                {f.label}<X size={12} aria-hidden /><span className="sr-only">Remove this filter</span>
              </button>
            ))}
            <Button size="sm" variant="link" onClick={clearAll}>Clear all</Button>
          </div>
        )}
      </FilterBar>

      {all.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 size={26} />}
            title={showArchived ? 'Nothing archived' : 'No listings yet'}
            description={showArchived ? 'Listings you archive are kept here with their history.' : 'Create your first listing to start reaching tenants. It takes about ten minutes.'}
            action={!showArchived && <LinkButton href="/phase1/listings/new" variant="accent" leftIcon={<Plus size={16} />}>Create your first listing</LinkButton>}
          />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No listings match these filters"
            description="Nothing in your portfolio matches every filter at once. Remove one, or clear them all."
            action={<Button variant="outline" onClick={clearAll}>Clear all filters</Button>}
          />
        </Card>
      ) : view === 'grid' ? (
        <div className="vr-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pg.slice.map((l) => (
            <ListingCard key={l.id} l={l} today={TODAY} menu={a.menuFor(l, { includeView: true })} />
          ))}
        </div>
      ) : (
        <DataTable<DemoListing> columns={columns} rows={pg.slice} rowKey={(l) => l.id} caption="My listings" minWidth={860} />
      )}

      {rows.length > 0 && <Pagination className="mt-5" page={pg.page} pages={pg.pages} onChange={pg.setPage} from={pg.from} to={pg.to} total={pg.total} noun="listings" />}

      <ListingActionDialogs a={a} />

    </>
  );
}
