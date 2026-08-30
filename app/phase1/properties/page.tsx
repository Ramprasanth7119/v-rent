"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, MapPinned, Building2, Check, Map as MapIcon, ArrowRight } from 'lucide-react';
import {
  LinkButton, Card, PageHeader, StatCard, SearchInput, FilterChips, FilterBar, SortButton, usePagination, Pagination, EmptyState, PresenterNote,
} from '../../../components/phase1/kit';
import { StatusDot, Pill } from '../../../components/phase1/status';
import { PropertyImage } from '../../../components/phase1/PropertyImage';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { DemoListing, sgd } from '../../../lib/phase1/data';

type PType = DemoListing['propertyType'];
type Filter = 'all' | PType;
type Sort = 'name' | 'units' | 'district';

interface Property { key: string; project: string; address: string; postalCode: string; district: number; propertyType: PType; units: DemoListing[] }

const TYPES: PType[] = ['Condominium', 'HDB', 'Landed', 'Apartment', 'Executive Condominium'];

export default function PropertiesPage() {
  const { state } = useDemo();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('name');

  const properties = useMemo<Property[]>(() => {
    const map = new Map<string, Property>();
    for (const l of state.listings) {
      const key = `${l.project}|${l.postalCode}`;
      const p = map.get(key) ?? { key, project: l.project, address: l.address, postalCode: l.postalCode, district: l.district, propertyType: l.propertyType, units: [] };
      p.units.push(l);
      map.set(key, p);
    }
    return Array.from(map.values());
  }, [state.listings]);

  const rows = properties
    .filter((p) => filter === 'all' || p.propertyType === filter)
    .filter((p) => !q || [p.project, p.address, p.postalCode].some((v) => v.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => sort === 'units' ? b.units.length - a.units.length : sort === 'district' ? a.district - b.district : a.project.localeCompare(b.project));

  const pg = usePagination(rows, 6);
  const unitCount = properties.reduce((n, p) => n + p.units.length, 0);
  const publishedUnits = state.listings.filter((l) => l.status === 'published').length;
  const districts = new Set(properties.map((p) => p.district)).size;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Properties"
        description="Every building and development you have units in. Listings attach to a property, so one address is never entered twice."
        actions={<LinkButton href="/phase1/listings/new" variant="accent" leftIcon={<Plus size={16} />}>Add property</LinkButton>}
      />

      <div className="vr-stagger mb-6 grid gap-4 grid-cols-2 xl:grid-cols-4">
        <StatCard label="Properties" icon={<MapPinned size={16} />} value={properties.length} />
        <StatCard label="Units" icon={<Building2 size={16} />} value={unitCount} />
        <StatCard label="Published units" icon={<Check size={16} />} value={publishedUnits} tone="success" />
        <StatCard label="Districts covered" icon={<MapIcon size={16} />} value={districts} />
      </div>

      <FilterBar>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchInput value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Search by project, address or postal code" className="flex-1" label="Search properties" />
          <SortButton value={sort} onChange={setSort} options={[{ key: 'name', label: 'Name A–Z' }, { key: 'units', label: 'Most units' }, { key: 'district', label: 'District' }]} />
        </div>
        <FilterChips
          value={filter} onChange={(k) => { setFilter(k); pg.setPage(1); }} label="Property type"
          options={[{ key: 'all' as Filter, label: 'All', count: properties.length }, ...TYPES.map((t) => ({ key: t as Filter, label: t, count: properties.filter((p) => p.propertyType === t).length }))]}
        />
      </FilterBar>

      {pg.slice.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MapPinned size={26} />}
            title={properties.length === 0 ? 'No properties yet' : 'No properties match'}
            description={properties.length === 0 ? 'Add your first property to start creating rental listings.' : 'Try a different search or clear the filters.'}
            action={<LinkButton href="/phase1/listings/new" variant="accent" leftIcon={<Plus size={16} />}>Add your first property</LinkButton>}
          />
        </Card>
      ) : (
        <div className="vr-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pg.slice.map((p) => {
            const published = p.units.filter((u) => u.status === 'published').length;
            return (
              <Card key={p.key} padding="none" interactive className="flex flex-col overflow-hidden" as="article">
                <div className="relative">
                  <PropertyImage seed={p.project} variant={0} rounded="rounded-none" className="aspect-[16/9] w-full" />
                  <Pill tone="neutral" className="absolute left-3 top-3 bg-p1-surface/95">D{String(p.district).padStart(2, '0')}</Pill>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="truncate text-[16px] font-semibold text-p1-text">{p.project}</h2>
                  <p className="mt-0.5 truncate text-[13px] text-p1-text-2">{p.address}, Singapore {p.postalCode}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px] text-p1-text-2">
                    <Pill tone="info">{p.propertyType}</Pill>
                    <span>{p.units.length} unit{p.units.length === 1 ? '' : 's'} · {published} published</span>
                  </div>
                  <ul className="mt-3 divide-y divide-p1-border rounded-lg border border-p1-border">
                    {p.units.slice(0, 3).map((u) => (
                      <li key={u.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]">
                        <span className="font-mono text-p1-text">{u.unitNo}</span>
                        <span className="tabular-nums text-p1-text-2">{sgd(u.monthlyRent)}/mo</span>
                        <StatusDot kind="listing" value={u.status} />
                      </li>
                    ))}
                    {p.units.length > 3 && <li className="px-3 py-1.5 text-[12px] text-p1-text-3">+{p.units.length - 3} more</li>}
                  </ul>
                  <Link href={`/phase1/listings?q=${encodeURIComponent(p.project)}`} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[14px] font-semibold text-p1-accent-text underline-offset-4 hover:underline">
                    View listings <ArrowRight size={15} aria-hidden />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination className="mt-6" page={pg.page} pages={pg.pages} onChange={pg.setPage} from={pg.from} to={pg.to} total={pg.total} />

      <PresenterNote>
        Property, unit and listing are three separate records. An address is matched against OneMap once and reused; the unit carries floor area and configuration; each listing is a rental offer against a unit. This is what makes per-unit price history and duplicate detection possible later.
      </PresenterNote>
    </>
  );
}
