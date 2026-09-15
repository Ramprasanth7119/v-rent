"use client";

/**
 * My listings — an inventory tool.
 *
 * One line of header (title, search, the one primary action), status tabs that
 * carry their own counts, and a compact table an agent can scan in columns:
 * the property, its state, how it is doing, when it runs out. Everything else —
 * import, export, archive — sits in one menu. On a phone the table becomes a
 * list of compact cards.
 *
 * Filters are deep-linkable so the dashboard can send the agent straight to a
 * subset.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Button, Callout, Card, Column, DataTable, EmptyState, LinkButton, Menu, Pagination, SearchInput, Segmented, SkeletonPage, SortButton, Tabs, cx, usePagination,
} from '../../../components/phase1/kit';
import { StatusBadge } from '../../../components/phase1/status';
import { useListingActions, ListingActionDialogs } from '../../../components/phase1/listing/actions';
import { ListingCard, fmtShort, daysUntil } from '../../../components/phase1/listing/ListingCard';
import { PropertyImage } from '../../../components/phase1/PropertyImage';
import { coverPhoto } from '../../../lib/phase1/photos';
import { useSession } from '../../../lib/phase1/SessionContext';
import { useDemo, TODAY } from '../../../lib/phase1/DemoContext';
import { DemoListing, ListingStatus } from '../../../lib/phase1/data';
import { listingStats } from '../../../lib/phase1/performance';
import { districtCode } from '../../../lib/phase1/districts';
import { comparablePrice, priceLabel } from '../../../lib/phase1/pricing';
import { EMPTY_FILTERS, ListingFilters, activeChips, activeCount, matches as matchesFilters } from '../../../components/phase1/listing/filters';
import { FilterPanel } from '../../../components/phase1/listing/FilterPanel';
import { Upload, Plus, LayoutGrid, Rows3, Building2, Archive, X, SlidersHorizontal, FileDown, MapPinned, MoreHorizontal } from 'lucide-react';

type FilterKey = ListingStatus | 'all';
type Sort = 'recent' | 'updated' | 'views' | 'enquiries' | 'rent_desc' | 'rent_asc' | 'expiry';
type View = 'table' | 'grid';

const TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Draft' },
  { key: 'pending_review', label: 'Pending' },
  { key: 'rejected', label: 'Needs changes' },
  { key: 'paused', label: 'Paused' },
  { key: 'expired', label: 'Expired' },
];

const VIEW_KEY = 'vrent_listings_view';

export default function ListingsPage() {
  return (
    <Suspense fallback={<SkeletonPage metrics={0} />}>
      <ListingsBody />
    </Suspense>
  );
}

function ListingsBody() {
  const params = useSearchParams();
  const { state } = useDemo();
  const { user } = useSession();
  const a = useListingActions();

  const statusParam = params.get('status');
  const [filter, setFilter] = useState<FilterKey>(
    statusParam && TABS.some((f) => f.key === statusParam) ? (statusParam as FilterKey) : 'all',
  );
  const [view, setView] = useState<View>('table');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [sort, setSort] = useState<Sort>('updated');
  const [filters, setFilters] = useState<ListingFilters>(() => ({
    ...EMPTY_FILTERS,
    district: params.get('district') ?? 'any',
    deal: params.get('deal') === 'sale' || params.get('deal') === 'rent' ? (params.get('deal') as 'sale' | 'rent') : 'any',
  }));
  const [panelOpen, setPanelOpen] = useState(false);
  const setFilter_ = (patch: Partial<ListingFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- remembered preference, read once
      if (saved === 'grid' || saved === 'table') setView(saved);
    } catch { /* storage blocked */ }
  }, []);
  const chooseView = (v: View) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* not remembered */ } };

  const all = useMemo(() => state.listings.filter((l) => (showArchived ? l.archived : !l.archived)), [state.listings, showArchived]);
  const archivedCount = state.listings.filter((l) => l.archived).length;

  const districts = useMemo(() => Array.from(new Set(state.listings.filter((l) => !l.archived).map((l) => l.district))).sort((x, y) => x - y), [state.listings]);
  const stations = useMemo(() => Array.from(new Set(state.listings.filter((l) => !l.archived && l.nearestMrt).map((l) => l.nearestMrt as string))).sort(), [state.listings]);
  const types = useMemo(() => Array.from(new Set(state.listings.filter((l) => !l.archived).map((l) => l.propertyType))).sort(), [state.listings]);

  /** Enquiries actually received, per listing. */
  const leads = useMemo(() => {
    const m = new Map<string, { total: number; fresh: number }>();
    for (const e of state.enquiries) {
      const cur = m.get(e.listingId) ?? { total: 0, fresh: 0 };
      m.set(e.listingId, { total: cur.total + 1, fresh: cur.fresh + (e.status === 'new' ? 1 : 0) });
    }
    return m;
  }, [state.enquiries]);

  const counts = (k: FilterKey) => (k === 'all' ? all.length : all.filter((l) => l.status === k).length);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const expiry = (l: DemoListing) => (l.status === 'published' ? daysUntil(l.expiresAt, TODAY) ?? 9999 : 9999);
    return all
      .filter((l) => filter === 'all' || l.status === filter)
      .filter((l) => !needle || [l.project, l.address, l.unitNo, l.reference, l.postalCode, l.nearestMrt ?? ''].some((v) => v.toLowerCase().includes(needle)))
      .filter((l) => matchesFilters(l, filters, TODAY))
      .sort((x, y) =>
        sort === 'rent_desc' ? comparablePrice(y) - comparablePrice(x)
        : sort === 'rent_asc' ? comparablePrice(x) - comparablePrice(y)
        : sort === 'recent' ? y.createdAt.localeCompare(x.createdAt)
        : sort === 'views' ? listingStats(y).views7d - listingStats(x).views7d
        : sort === 'enquiries' ? (leads.get(y.id)?.total ?? 0) - (leads.get(x.id)?.total ?? 0)
        : sort === 'expiry' ? expiry(x) - expiry(y)
        : (y.updatedAt ?? y.createdAt).localeCompare(x.updatedAt ?? x.createdAt),
      );
  }, [all, filter, q, filters, sort, leads]);

  const pg = usePagination(rows, view === 'grid' ? 9 : 15);

  const chips = [
    ...activeChips(filters, setFilter_),
    ...(q.trim() !== '' ? [{ label: `“${q.trim()}”`, clear: () => setQ('') }] : []),
  ];
  const exportHref = `/phase1/listings/export?ids=${rows.slice(0, 20).map((l) => l.id).join(',')}`;
  const clearAll = () => { setQ(''); setFilter('all'); setFilters(EMPTY_FILTERS); pg.setPage(1); };

  const traffic = (l: DemoListing) => l.status === 'published' || l.status === 'paused' || l.status === 'expired';

  const columns: Column<DemoListing>[] = [
    {
      key: 'property', header: 'Property',
      render: (l) => (
        <Link href={`/phase1/listings/${l.id}`} className="flex min-w-0 items-center gap-3">
          <PropertyImage seed={l.reference + l.project} src={coverPhoto(user?.id, l)} alt="" rounded="rounded-md" className="h-11 w-14 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium text-p1-text hover:text-p1-primary">{l.project}{l.unitNo && l.unitNo !== '—' && <span className="font-normal text-p1-text-3"> {l.unitNo}</span>}</span>
            <span className="block truncate text-[12.5px] text-p1-text-3">{districtCode(l.district)} · {l.bedrooms} bed · {l.sizeSqft.toLocaleString('en-SG')} sqft · <span className="text-p1-text-2">{priceLabel(l).amount}{priceLabel(l).suffix}</span></span>
          </span>
        </Link>
      ),
    },
    { key: 'status', header: 'Status', nowrap: true, render: (l) => <StatusBadge kind="listing" value={l.status} size="sm" /> },
    {
      key: 'views', header: 'Views', align: 'right', nowrap: true, hideBelow: 'lg',
      render: (l) => traffic(l) ? <span className="tabular-nums" title="Last 7 days">{listingStats(l).views7d.toLocaleString('en-SG')}</span> : <span className="text-p1-text-3">—</span>,
    },
    {
      key: 'leads', header: 'Leads', align: 'right', nowrap: true, hideBelow: 'md',
      render: (l) => {
        const n = leads.get(l.id);
        if (!n?.total) return <span className="text-p1-text-3">0</span>;
        return (
          <Link href="/phase1/enquiries" className="inline-flex items-center gap-1.5 tabular-nums hover:text-p1-primary">
            {n.total}
            {n.fresh > 0 && <span className="rounded-full bg-p1-primary-soft px-1.5 text-[11px] font-semibold text-p1-primary">{n.fresh} new</span>}
          </Link>
        );
      },
    },
    {
      key: 'expiry', header: 'Expiry', nowrap: true, hideBelow: 'lg',
      render: (l) => {
        if (l.status !== 'published' || !l.expiresAt) return <span className="text-p1-text-3">—</span>;
        const d = daysUntil(l.expiresAt, TODAY) ?? 0;
        return <span className={cx('tabular-nums', d <= 7 ? 'font-medium text-p1-danger' : d <= 30 ? 'text-p1-warning' : 'text-p1-text-2')} title={fmtShort(l.expiresAt)}>{d <= 0 ? 'Today' : `${d} days`}</span>;
      },
    },
    { key: 'updated', header: 'Updated', nowrap: true, hideBelow: 'xl', muted: true, render: (l) => fmtShort(l.updatedAt ?? l.createdAt) },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', nowrap: true, width: '52px',
      render: (l) => <Menu items={a.menuFor(l, { includeView: true })} label={`Actions for ${l.project}`} />,
    },
  ];

  const empty = all.length === 0;

  return (
    <>
      {/* ------------------------------------------------------------ header */}
      <header className="vr-rise mb-5 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-[24px] font-semibold tracking-[-0.02em] text-p1-text sm:text-[28px]">
          {showArchived ? 'Archived listings' : 'My listings'}
        </h1>
        {!empty && (
          <SearchInput value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Search listings…" className="order-last w-full sm:order-none sm:w-64" label="Search listings" size="sm" />
        )}
        <Menu
          label="More listing actions"
          trigger={{ label: <span className="sr-only sm:not-sr-only">More</span>, variant: 'outline', size: 'md', leftIcon: <MoreHorizontal size={16} /> }}
          items={[
            { key: 'import', label: 'Bulk import', icon: <Upload size={15} />, href: '/phase1/listings/import' },
            { key: 'export', label: 'Export shortlist', icon: <FileDown size={15} />, href: exportHref, disabled: rows.length === 0 },
            { key: 'properties', label: 'Properties', icon: <MapPinned size={15} />, href: '/phase1/properties' },
            ...(archivedCount > 0 ? ['divider' as const, { key: 'archived', label: showArchived ? 'Back to listings' : `Archived (${archivedCount})`, icon: <Archive size={15} />, onSelect: () => { setShowArchived((v) => !v); pg.setPage(1); } }] : []),
          ]}
        />
        <LinkButton href="/phase1/listings/new" leftIcon={<Plus size={16} />}>New listing</LinkButton>
      </header>

      {!a.canPublish && !empty && (
        <Callout tone="warning" compact className="mb-4" action={<LinkButton href="/phase1/dashboard" variant="outline" size="sm">See why</LinkButton>}>
          Publishing is blocked. Live listings stay live.
        </Callout>
      )}

      {empty ? (
        <Card>
          <EmptyState
            icon={<Building2 size={22} />}
            title={showArchived ? 'Nothing archived' : 'Your property portfolio starts here'}
            description={showArchived ? 'Listings you archive are kept here with their history.' : 'Create your first listing to start reaching tenants.'}
            action={!showArchived
              ? <><LinkButton href="/phase1/listings/new" leftIcon={<Plus size={16} />}>Create listing</LinkButton><LinkButton href="/phase1/listings/import" variant="outline" leftIcon={<Upload size={16} />}>Import</LinkButton></>
              : <Button variant="outline" onClick={() => setShowArchived(false)}>Back to listings</Button>}
          />
        </Card>
      ) : (
        <>
          {/* ------------------------------------------------------ toolbar */}
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <Tabs<FilterKey>
              label="Filter by status"
              value={filter}
              onChange={(k) => { setFilter(k); pg.setPage(1); }}
              items={TABS.map((f) => ({ key: f.key, label: f.label, count: counts(f.key) })).filter((f) => f.key === 'all' || f.key === filter || f.count > 0)}
              className="min-w-0 md:flex-1"
            />
            <div className="flex items-center gap-2 md:pb-1.5">
              <Button size="sm" variant={activeCount(filters) > 0 ? 'secondary' : 'outline'} leftIcon={<SlidersHorizontal size={15} />} onClick={() => setPanelOpen(true)}>
                Filters{activeCount(filters) > 0 && <span className="ml-0.5 tabular-nums">· {activeCount(filters)}</span>}
              </Button>
              <SortButton<Sort>
                value={sort}
                onChange={setSort}
                options={[
                  { key: 'updated', label: 'Last updated' },
                  { key: 'recent', label: 'Newest' },
                  { key: 'expiry', label: 'Expiring first' },
                  { key: 'views', label: 'Most viewed' },
                  { key: 'enquiries', label: 'Most leads' },
                  { key: 'rent_desc', label: 'Price, high to low' },
                  { key: 'rent_asc', label: 'Price, low to high' },
                ]}
                className="[&_select]:h-9"
              />
              <Segmented<View>
                label="Layout"
                size="sm"
                value={view}
                onChange={chooseView}
                className="hidden md:inline-flex"
                options={[
                  { key: 'table', label: <span className="sr-only">Table</span>, icon: <Rows3 size={16} /> },
                  { key: 'grid', label: <span className="sr-only">Cards</span>, icon: <LayoutGrid size={16} /> },
                ]}
              />
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[12.5px] tabular-nums text-p1-text-3">{rows.length} of {all.length}</span>
              {chips.map((f) => (
                <button key={f.label} type="button" onClick={() => { f.clear(); pg.setPage(1); }}
                  className="p1-in inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-p1-border bg-p1-surface pl-2.5 pr-1.5 text-[12.5px] font-medium text-p1-text hover:border-p1-border-strong">
                  {f.label}<X size={13} className="text-p1-text-3" aria-hidden /><span className="sr-only">Remove this filter</span>
                </button>
              ))}
              <Button size="sm" variant="link" onClick={clearAll} className="ml-1 text-[12.5px]">Clear all</Button>
            </div>
          )}

          {rows.length === 0 ? (
            <Card>
              <EmptyState title="No listings match" description="Try another status or remove a filter." action={<Button variant="outline" size="sm" onClick={clearAll}>Clear filters</Button>} />
            </Card>
          ) : (
            <>
              {/* Desktop: table or cards, as chosen. */}
              <div key={`${filter}-${view}`} className="p1-in hidden md:block">
                {view === 'table'
                  ? <DataTable<DemoListing> columns={columns} rows={pg.slice} rowKey={(l) => l.id} caption="My listings" minWidth={760} />
                  : <div className="vr-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">{pg.slice.map((l) => <ListingCard key={l.id} l={l} today={TODAY} menu={a.menuFor(l, { includeView: true })} />)}</div>}
              </div>

              {/* Phone: compact cards. */}
              <ul key={`m-${filter}`} className="vr-stagger space-y-2 md:hidden">
                {pg.slice.map((l) => {
                  const p = priceLabel(l);
                  const n = leads.get(l.id);
                  const d = l.status === 'published' ? daysUntil(l.expiresAt, TODAY) : null;
                  return (
                    <li key={l.id} className="relative flex gap-3 rounded-xl border border-p1-border bg-p1-surface p-2.5">
                      <Link href={`/phase1/listings/${l.id}`} className="shrink-0" aria-label={`${l.project} ${l.unitNo}`}>
                        <PropertyImage seed={l.reference + l.project} src={coverPhoto(user?.id, l)} alt="" rounded="rounded-lg" className="h-[76px] w-[92px]" />
                      </Link>
                      <div className="min-w-0 flex-1 py-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/phase1/listings/${l.id}`} className="min-w-0 truncate text-[14px] font-medium text-p1-text">{l.project}</Link>
                          <div className="-mr-1 -mt-1"><Menu items={a.menuFor(l, { includeView: true })} label={`Actions for ${l.project}`} /></div>
                        </div>
                        <div className="-mt-1 text-[12.5px] text-p1-text-3">{p.amount}{p.suffix} · {l.bedrooms} bed · {districtCode(l.district)}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-p1-text-3">
                          <StatusBadge kind="listing" value={l.status} size="sm" />
                          {traffic(l) && <span className="tabular-nums">{listingStats(l).views7d} views</span>}
                          {n?.total ? <span className="tabular-nums">{n.total} leads</span> : null}
                          {d !== null && d <= 30 && <span className={cx('font-medium', d <= 7 ? 'text-p1-danger' : 'text-p1-warning')}>{d} days left</span>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {rows.length > 0 && <Pagination className="mt-5" page={pg.page} pages={pg.pages} onChange={pg.setPage} from={pg.from} to={pg.to} total={pg.total} noun="listings" />}
        </>
      )}

      <FilterPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        filters={filters}
        onChange={(patch) => { setFilter_(patch); pg.setPage(1); }}
        districts={districts}
        types={types}
        stations={stations}
        resultCount={rows.length}
      />

      <ListingActionDialogs a={a} />
    </>
  );
}
