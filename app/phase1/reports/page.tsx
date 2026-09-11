"use client";

/**
 * Download a report.
 *
 * Agents are asked for numbers by people who are not in the product: an agency
 * team leader wants the month's inventory, a landlord wants every enquiry on
 * their unit, an accountant wants what was live in a quarter, a compliance
 * officer wants what is about to expire.
 *
 * The screen is built around one idea: choose what you want, watch the count
 * change, then take the file. Nothing is generated until the filters read the
 * way the agent expects, so there is no cycle of downloading, opening, finding
 * it wrong and downloading again.
 *
 * Three ways out, and each is right for a different reader. CSV is produced in
 * the browser from data already loaded, so it works offline and opens in Excel
 * with the columns named. PDF renders the same rows as a document with the CEA
 * compliance block on it, for sending to somebody outside the agency. The
 * property shortlist is the photographed version, for a client.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, MessageSquare, TrendingUp, ShieldCheck, Download, Printer, FileSpreadsheet,
  RotateCcw, Info, FileText, ArrowDownUp, Search,
} from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, SelectInput, TextInput, FilterChips, EmptyState,
  SearchInput, cx,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { useDemo, TODAY } from '../../../lib/phase1/DemoContext';
import { useSession } from '../../../lib/phase1/SessionContext';
import { sgd, LISTING_STATUS_LABEL, type ListingStatus } from '../../../lib/phase1/data';
import {
  KIND_LABEL, PERIODS, PROPERTY_TYPES, FURNISHINGS, LISTING_STATUSES, ENQUIRY_STATUSES, CHANNELS, SORTS,
  buildTable, countFilters, defaultFilters, filtersToQuery, reportWindow, selectEnquiries, selectListings,
  type ReportFilters, type ReportKind,
} from '../../../lib/phase1/reporting';

const KINDS: { key: ReportKind; icon: typeof Building2; blurb: string }[] = [
  { key: 'inventory', icon: Building2, blurb: 'Every listing with its address, price, size and standing.' },
  { key: 'enquiries', icon: MessageSquare, blurb: 'Who asked about what, when, and whether they were answered.' },
  { key: 'performance', icon: TrendingUp, blurb: 'Views, enquiries and conversion for each listing.' },
  { key: 'compliance', icon: ShieldCheck, blurb: 'What expires when, and what each listing is still missing.' },
];

/** RFC 4180 enough for Excel: quote anything with a comma, quote or newline. */
function toCsv(columns: string[], rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

function download(name: string, body: string) {
  const url = URL.createObjectURL(new Blob([`﻿${body}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** A group of toggles that behave like checkboxes but read like chips. */
function ChipSet({
  label, options, value, onChange, note,
}: {
  label: string;
  options: { key: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  note?: string;
}) {
  return (
    <div>
      <span className="mb-2 block text-[12.5px] font-semibold text-p1-text-2">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== o.key) : [...value, o.key])}
              className={cx(
                'cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                on ? 'bg-p1-primary text-white' : 'bg-p1-subtle text-p1-text-2 hover:text-p1-text',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {value.length === 0 && note && <p className="mt-2 text-[12px] text-p1-text-3">{note}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const { state } = useDemo();
  const { user } = useSession();

  const [f, setF] = useState<ReportFilters>(() => defaultFilters(TODAY));
  const patch = (p: Partial<ReportFilters>) => setF((cur) => ({ ...cur, ...p }));

  const listings = useMemo(() => selectListings(state.listings, f, TODAY), [state.listings, f]);
  const enquiries = useMemo(() => selectEnquiries(state.enquiries, listings, f, TODAY), [state.enquiries, listings, f]);
  const table = useMemo(() => buildTable(f, listings, enquiries), [f, listings, enquiries]);

  const rowCount = f.kind === 'enquiries' ? enquiries.length : listings.length;
  const win = reportWindow(f, TODAY);
  const activeFilters = countFilters(f);

  const districts = useMemo(
    () => [...new Set(state.listings.filter((l) => !l.archived).map((l) => l.district))].sort((a, b) => a - b),
    [state.listings],
  );

  const sorts = SORTS.filter((s) => s.kinds.includes(f.kind));
  const sortKey = sorts.some((s) => s.key === f.sort) ? f.sort : sorts[0].key;

  const filename = () => `v-rent-${f.kind}-${win ? `${win.from}_to_${win.to}` : 'all-time'}.csv`;
  const reset = () => setF(defaultFilters(TODAY));

  const openPdf = () => router.push(`/phase1/reports/print?${filtersToQuery({ ...f, sort: sortKey })}`);

  /* The photographed shortlist only makes sense for listings, and only when
     there are some. Enquiries have no photographs to put on a page. */
  const shortlistable = f.kind !== 'enquiries' && listings.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Business"
        title="Download a report"
        description="Choose what you need and narrow it down. The count updates as you go, so you can see what you are about to take before you take it."
        actions={
          <>
            <Button
              variant="outline"
              size="lg"
              leftIcon={<FileText size={17} />}
              disabled={rowCount === 0}
              onClick={openPdf}
            >
              Export as PDF
            </Button>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Download size={17} />}
              disabled={rowCount === 0}
              onClick={() => download(filename(), toCsv(table.columns, table.rows))}
            >
              Download CSV
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------------ what to report */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {KINDS.map((k) => {
          const on = f.kind === k.key;
          return (
            <button
              key={k.key}
              type="button"
              onClick={() => patch({ kind: k.key })}
              aria-pressed={on}
              className={cx(
                'flex cursor-pointer flex-col items-start rounded-xl bg-p1-surface p-4 text-left transition-[box-shadow,transform,border-color] duration-200',
                on
                  ? 'border-2 border-p1-primary shadow-p1-md'
                  : 'border-2 border-transparent shadow-p1-sm ring-1 ring-p1-border hover:-translate-y-0.5 hover:shadow-p1-md',
              )}
            >
              <span
                aria-hidden
                className={cx(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  on ? 'bg-p1-primary text-white' : 'bg-p1-subtle text-p1-text-3',
                )}
              >
                <k.icon size={19} />
              </span>
              <span className="mt-3 font-p1display text-[15.5px] font-bold text-p1-text">{KIND_LABEL[k.key]}</span>
              <span className="mt-1 text-[13px] leading-5 text-p1-text-2">{k.blurb}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        {/* ---------------------------------------------------------- filters */}
        <div className="space-y-4">
          <SectionCard
            title="Filters"
            description={activeFilters ? `${activeFilters} applied` : 'Everything you own'}
            padding="sm"
            actions={
              activeFilters > 0 || f.period !== '30' ? (
                <button type="button" onClick={reset} className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] font-semibold text-p1-primary underline-offset-4 hover:underline dark:text-p1-info">
                  <RotateCcw size={12} aria-hidden />
                  Reset
                </button>
              ) : undefined
            }
          >
            <div className="space-y-5">
              <div>
                <span className="mb-2 block text-[12.5px] font-semibold text-p1-text-2">
                  {f.kind === 'enquiries' ? 'Enquiries received' : 'Listings created'}
                </span>
                <FilterChips options={PERIODS} value={f.period} onChange={(v) => patch({ period: v })} label="Period" size="sm" />
                {f.period === 'custom' && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <TextInput label="From" type="date" value={f.from} onChange={(e) => patch({ from: e.target.value })} />
                    <TextInput label="To" type="date" value={f.to} onChange={(e) => patch({ to: e.target.value })} />
                  </div>
                )}
              </div>

              <SearchInput
                size="sm"
                label="Find"
                value={f.q}
                onChange={(v) => patch({ q: v })}
                placeholder={f.kind === 'enquiries' ? 'Name, number or message' : 'Reference, project or road'}
              />

              <ChipSet
                label="Listing standing"
                value={f.status}
                onChange={(v) => patch({ status: v })}
                note="Nothing chosen means every standing."
                options={LISTING_STATUSES.map((s) => ({
                  key: s,
                  label: LISTING_STATUS_LABEL[s as ListingStatus] ?? s.replace(/_/g, ' '),
                }))}
              />

              <ChipSet
                label="Property type"
                value={f.types}
                onChange={(v) => patch({ types: v })}
                note="Nothing chosen means every type."
                options={PROPERTY_TYPES.map((t) => ({ key: t, label: t === 'Executive Condominium' ? 'EC' : t }))}
              />

              {f.kind === 'enquiries' && (
                <>
                  <ChipSet
                    label="Enquiry standing"
                    value={f.enquiryStatus}
                    onChange={(v) => patch({ enquiryStatus: v })}
                    note="Nothing chosen means all of them."
                    options={ENQUIRY_STATUSES.map((s) => ({ key: s, label: s }))}
                  />
                  <SelectInput
                    label="Channel"
                    value={f.channel}
                    onChange={(e) => patch({ channel: e.target.value })}
                    options={[{ value: 'all', label: 'Any channel' }, ...CHANNELS.map((c) => ({ value: c, label: c }))]}
                  />
                </>
              )}

              <SelectInput
                label="Sale or rent"
                value={f.deal}
                onChange={(e) => patch({ deal: e.target.value as ReportFilters['deal'] })}
                options={[
                  { value: 'all', label: 'Both' },
                  { value: 'rent', label: 'For rent' },
                  { value: 'sale', label: 'For sale' },
                ]}
              />

              <div className="grid grid-cols-2 gap-3">
                <SelectInput
                  label="District"
                  value={f.district}
                  onChange={(e) => patch({ district: e.target.value })}
                  options={[
                    { value: 'all', label: 'Any' },
                    ...districts.map((d) => ({ value: String(d), label: `D${String(d).padStart(2, '0')}` })),
                  ]}
                />
                <SelectInput
                  label="Bedrooms"
                  value={f.beds}
                  onChange={(e) => patch({ beds: e.target.value })}
                  options={[
                    { value: 'all', label: 'Any' },
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4 or more' },
                  ]}
                />
              </div>

              <SelectInput
                label="Furnishing"
                value={f.furnishing}
                onChange={(e) => patch({ furnishing: e.target.value })}
                options={[{ value: 'all', label: 'Any' }, ...FURNISHINGS.map((x) => ({ value: x, label: x }))]}
              />

              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Price from" inputMode="numeric" placeholder="Any" value={f.minPrice} onChange={(e) => patch({ minPrice: e.target.value.replace(/\D/g, '') })} />
                <TextInput label="Price to" inputMode="numeric" placeholder="Any" value={f.maxPrice} onChange={(e) => patch({ maxPrice: e.target.value.replace(/\D/g, '') })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Size from (sqft)" inputMode="numeric" placeholder="Any" value={f.minSize} onChange={(e) => patch({ minSize: e.target.value.replace(/\D/g, '') })} />
                <TextInput label="Size to (sqft)" inputMode="numeric" placeholder="Any" value={f.maxSize} onChange={(e) => patch({ maxSize: e.target.value.replace(/\D/g, '') })} />
              </div>

              <SelectInput
                label="Listing health"
                value={f.minHealth}
                onChange={(e) => patch({ minHealth: e.target.value })}
                hint="Useful for finding the listings that need work."
                options={[
                  { value: '', label: 'Any score' },
                  { value: '90', label: '90 and above' },
                  { value: '70', label: '70 and above' },
                  { value: '50', label: '50 and above' },
                ]}
              />

              <div className="grid grid-cols-2 gap-3">
                <SelectInput
                  label="Sort by"
                  value={sortKey}
                  onChange={(e) => patch({ sort: e.target.value })}
                  options={sorts.map((s) => ({ value: s.key, label: s.label }))}
                />
                <SelectInput
                  label="Order"
                  value={f.dir}
                  onChange={(e) => patch({ dir: e.target.value as 'asc' | 'desc' })}
                  options={[
                    { value: 'desc', label: 'Highest first' },
                    { value: 'asc', label: 'Lowest first' },
                  ]}
                />
              </div>
            </div>
          </SectionCard>

          <div className="rounded-xl bg-p1-subtle p-3.5 ring-1 ring-p1-border">
            <div className="flex items-center gap-2 text-[12.5px] font-bold text-p1-text">
              <Info size={13} className="text-p1-primary dark:text-p1-info" aria-hidden />
              What comes out
            </div>
            <p className="mt-1.5 text-[12.5px] leading-[1.5] text-p1-text-2">
              CSV opens in Excel and Numbers with the columns already named. The PDF carries your CEA registration and
              agency licence on every page, which the advertising rules require on anything you send a client.
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------------- preview */}
        <div className="min-w-0">
          <Card padding="none" className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-p1-border px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-p1display text-[17px] font-bold text-p1-text">{KIND_LABEL[f.kind]}</h2>
                  <Pill tone={rowCount > 0 ? 'info' : 'neutral'}>
                    {rowCount} {rowCount === 1 ? 'row' : 'rows'}
                  </Pill>
                </div>
                <p className="mt-0.5 text-[12.5px] text-p1-text-3">
                  {win ? `${win.from} to ${win.to}` : 'All time'}
                  {activeFilters > 0 && ` · ${activeFilters} ${activeFilters === 1 ? 'filter' : 'filters'} applied`}
                  {' · '}{table.columns.length} columns
                  {' · '}sorted by {sorts.find((s) => s.key === sortKey)?.label.toLowerCase()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {shortlistable && (
                  <Button
                    variant="ghost"
                    leftIcon={<Printer size={16} />}
                    onClick={() => router.push(`/phase1/listings/export?ids=${listings.map((l) => l.id).join(',')}`)}
                  >
                    Photo shortlist
                  </Button>
                )}
                <Button variant="outline" leftIcon={<FileText size={16} />} disabled={rowCount === 0} onClick={openPdf}>
                  PDF
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<FileSpreadsheet size={16} />}
                  disabled={rowCount === 0}
                  onClick={() => download(filename(), toCsv(table.columns, table.rows))}
                >
                  CSV
                </Button>
              </div>
            </div>

            {rowCount === 0 ? (
              <EmptyState
                className="border-0"
                icon={<Search size={22} />}
                title="Nothing matches those filters"
                description="Widen the period, or clear a filter or two. The count updates as you change them."
                action={<Button variant="outline" leftIcon={<RotateCcw size={15} />} onClick={reset}>Reset the filters</Button>}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-p1-border bg-p1-subtle/60">
                        {table.columns.map((c) => (
                          <th key={c} className="whitespace-nowrap px-3.5 py-2.5 font-semibold text-p1-text-2">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.slice(0, 8).map((r, i) => (
                        <tr key={i} className="border-b border-p1-border last:border-b-0">
                          {r.map((cell, j) => (
                            <td key={j} className="max-w-[220px] truncate whitespace-nowrap px-3.5 py-2.5 text-p1-text">
                              {typeof cell === 'number' && table.columns[j].includes('S$') ? sgd(cell) : String(cell === '' || cell === undefined ? '—' : cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {table.rows.length > 8 && (
                  <p className="flex items-center gap-2 border-t border-p1-border px-5 py-3 text-[12.5px] text-p1-text-3">
                    <ArrowDownUp size={13} aria-hidden />
                    Showing the first 8 of {table.rows.length}. Both downloads have all of them.
                  </p>
                )}
              </>
            )}
          </Card>

          {user?.cea && (
            <p className="mt-3 text-[12.5px] leading-5 text-p1-text-3">
              Exported by {user.fullName} · CEA {user.cea.registrationNo} · {user.cea.agencyName}. Anything you send a
              client carries these details automatically.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
