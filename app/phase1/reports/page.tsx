"use client";

/**
 * Reports.
 *
 * Agents are asked for numbers by people who are not in the product: an agency
 * team leader wants the month's inventory, a landlord wants every enquiry on
 * their unit, an accountant wants what was live in a quarter, a compliance
 * officer wants what is about to expire.
 *
 * The screen is built around one idea, and the redesign strengthened rather
 * than replaced it: choose what you want, watch the count change, then take the
 * file. Nothing is generated until the filters read the way the agent expects,
 * so there is no cycle of downloading, opening, finding it wrong and
 * downloading again.
 *
 * What changed is the shape. Three steps are named and their state is shown —
 * what the document is, who is in it, how to take it — and the filters that
 * belong to the second step are disclosed in two layers: the six an agent
 * changes every time, and the rest behind one control. A wizard would have been
 * the obvious move and would have been wrong, because hiding the preview
 * removes the reason the screen works. The steps are signposts over a page that
 * stays whole; the count never leaves the screen.
 *
 * Three ways out, and each is right for a different reader. CSV is produced in
 * the browser from data already loaded, so it works offline and opens in Excel
 * with the columns named. PDF renders the same rows as a document with the CEA
 * compliance block on it, for sending to somebody outside the agency. The
 * property shortlist is the photographed version, for a client.
 *
 * Nothing is kept afterwards. There is no library of past reports here, because
 * the product does not store one — a gallery of documents with invented dates
 * and page counts would look better and be a lie. The screen says so instead.
 */

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, MessageSquare, TrendingUp, ShieldCheck, Download, Printer, FileSpreadsheet,
  RotateCcw, FileText, Search, ChevronDown, Images, Check, SlidersHorizontal, Info,
} from 'lucide-react';
import {
  Button, SelectInput, TextInput, FilterChips, SearchInput, cx,
} from '../../../components/phase1/kit';
import {
  InsightsShell, InsightsHeader, InsightPanel, InsightEmpty, SourceNote,
} from '../../../components/phase1/insights';
import { useDemo, TODAY } from '../../../lib/phase1/DemoContext';
import { DemoBadge } from '../../../components/phase1/DemoDataSwitch';
import { useSession } from '../../../lib/phase1/SessionContext';
import { sgd, LISTING_STATUS_LABEL, type ListingStatus } from '../../../lib/phase1/data';
import {
  KIND_LABEL, PERIODS, PROPERTY_TYPES, FURNISHINGS, LISTING_STATUSES, ENQUIRY_STATUSES, CHANNELS, SORTS,
  buildTable, countFilters, defaultFilters, filtersToQuery, reportWindow, selectEnquiries, selectListings,
  type ReportFilters, type ReportKind,
} from '../../../lib/phase1/reporting';

/* ----------------------------------------------------------- the deliverables */

interface KindDef {
  key: ReportKind;
  icon: typeof Building2;
  blurb: string;
  /** Who asks for it. The reason an agent picks this one rather than that one. */
  audience: string;
  /** The shape of the document, so the card previews a layout rather than a promise. */
  shape: 'table' | 'table-wide' | 'chart' | 'checklist';
}

const KINDS: KindDef[] = [
  {
    key: 'inventory',
    icon: Building2,
    blurb: 'Every listing with its address, price, size and standing.',
    audience: 'For a team leader or a landlord',
    shape: 'table',
  },
  {
    key: 'enquiries',
    icon: MessageSquare,
    blurb: 'Who asked about what, when, and whether they were answered.',
    audience: 'For a landlord asking about their unit',
    shape: 'table-wide',
  },
  {
    key: 'performance',
    icon: TrendingUp,
    blurb: 'Views, enquiries and conversion for each listing.',
    audience: 'For a review, or an argument about price',
    shape: 'chart',
  },
  {
    key: 'compliance',
    icon: ShieldCheck,
    blurb: 'What expires when, and what each listing is still missing.',
    audience: 'For a compliance officer, or yourself',
    shape: 'checklist',
  },
];

/**
 * A thumbnail of the page the reader will get.
 *
 * Drawn rather than screenshotted, and drawn as a *layout* — a masthead, a rule,
 * the shape of the body — with no legible figures in it. A thumbnail carrying
 * invented numbers would be read as a sample of the output, and this product
 * does not put numbers in front of an agent that did not come from their own
 * data.
 */
function PagePreview({ shape, active }: { shape: KindDef['shape']; active: boolean }) {
  const ink = active ? 'var(--ins-s1)' : 'var(--ins-line-strong)';
  const soft = active ? 'color-mix(in srgb, var(--ins-s1) 22%, var(--ins-panel))' : 'var(--ins-line)';
  return (
    <svg viewBox="0 0 88 64" className="h-full w-full" aria-hidden>
      <rect x="0.5" y="0.5" width="87" height="63" rx="4" fill="var(--ins-panel)" stroke="var(--ins-line)" />
      {/* masthead */}
      <rect x="7" y="7" width="22" height="3.5" rx="1.75" fill={ink} />
      <rect x="7" y="13" width="38" height="2.5" rx="1.25" fill={soft} />
      <line x1="7" y1="20" x2="81" y2="20" stroke="var(--ins-line)" strokeWidth="0.75" />

      {shape === 'chart' ? (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={9 + i * 12} y={44 - (6 + ((i * 7) % 20))} width="7" height={6 + ((i * 7) % 20)} rx="1.5" fill={i % 2 ? soft : ink} />
          ))}
          <line x1="7" y1="45" x2="81" y2="45" stroke="var(--ins-line-strong)" strokeWidth="0.75" />
          <rect x="7" y="51" width="46" height="2.5" rx="1.25" fill={soft} />
          <rect x="7" y="56" width="30" height="2.5" rx="1.25" fill={soft} />
        </>
      ) : shape === 'checklist' ? (
        [0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <rect x="7" y={25 + i * 7} width="4" height="4" rx="1" fill={i < 3 ? ink : soft} />
            <rect x="14" y={26 + i * 7} width={i % 2 ? 40 : 56} height="2.5" rx="1.25" fill={soft} />
          </g>
        ))
      ) : (
        <>
          <rect x="7" y="24" width="74" height="5" rx="1.5" fill={soft} />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect x="7" y={32 + i * 6} width={shape === 'table-wide' ? 26 : 20} height="2.5" rx="1.25" fill={i === 0 ? ink : soft} />
              <rect x={shape === 'table-wide' ? 37 : 31} y={32 + i * 6} width="20" height="2.5" rx="1.25" fill={soft} />
              <rect x={shape === 'table-wide' ? 61 : 55} y={32 + i * 6} width="20" height="2.5" rx="1.25" fill={soft} />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------- csv */

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

/* --------------------------------------------------------------- controls */

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
    <fieldset>
      <legend className="mb-2 block text-[12.5px] font-semibold text-p1-text-2">{label}</legend>
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
                'inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                on
                  ? 'bg-p1-primary text-p1-primary-on'
                  : 'bg-ins-inset text-p1-text-2 ring-1 ring-inset ring-ins-line hover:text-p1-text',
              )}
            >
              {on && <Check size={11} strokeWidth={3} aria-hidden />}
              {o.label}
            </button>
          );
        })}
      </div>
      {value.length === 0 && note && <p className="mt-2 text-[12px] text-p1-text-3">{note}</p>}
    </fieldset>
  );
}

/** A section of the filter rail that can be put away. */
function Disclosure({
  label, count, children, defaultOpen = false,
}: {
  label: string; count?: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-ins-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-ins-inset"
      >
        <SlidersHorizontal size={14} className="shrink-0 text-p1-text-3" aria-hidden />
        <span className="flex-1 text-[13px] font-semibold text-p1-text">{label}</span>
        {typeof count === 'number' && count > 0 && (
          <span className="rounded-full bg-p1-primary-soft px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-p1-primary dark:text-p1-info">{count}</span>
        )}
        <ChevronDown size={15} className={cx('shrink-0 text-p1-text-3 transition-transform duration-200', open && 'rotate-180')} aria-hidden />
      </button>
      {/* Grid rows animate the height without measuring it. */}
      <div className={cx('grid transition-[grid-template-rows] duration-200 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-5 border-t border-ins-line px-3.5 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- page */

export default function ReportsPage() {
  const router = useRouter();
  const { state, demo } = useDemo();
  const { user } = useSession();

  const [f, setF] = useState<ReportFilters>(() => defaultFilters(TODAY));
  const patch = (p: Partial<ReportFilters>) => setF((cur) => ({ ...cur, ...p }));
  const audience = useRef<HTMLDivElement>(null);
  const output = useRef<HTMLDivElement>(null);

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
  const takeCsv = () => download(filename(), toCsv(table.columns, table.rows));

  /* The photographed shortlist only makes sense for listings, and only when
     there are some. Enquiries have no photographs to put on a page. */
  const shortlistable = f.kind !== 'enquiries' && listings.length > 0;

  /* How many of the extra filters are in force, so the disclosure that holds
     them can say so rather than hiding the fact that it is filtering. */
  const extraCount = [
    f.deal !== 'all', f.district !== 'all', f.beds !== 'all', f.furnishing !== 'all',
    !!f.minPrice, !!f.maxPrice, !!f.minSize, !!f.maxSize, !!f.minHealth,
    f.kind === 'enquiries' && f.channel !== 'all',
  ].filter(Boolean).length;

  return (
    <InsightsShell
      footnote={
        <SourceNote
          source="workspace"
          detail={demo
            ? 'Demo / Illustrative: these reports are built from the demo account, not from your records.'
            : 'Built from your own listings and enquiries when you take the file. Nothing is stored afterwards, so re-run a report to bring it up to date.'}
        />
      }
    >
      <InsightsHeader
        module="reports"
        title="Reports"
        description="Choose a document, narrow who is in it, and take it as a spreadsheet, a PDF or a photo shortlist."
        meta={demo ? <DemoBadge title="Prepared from demo data, not from your records" /> : undefined}
        actions={
          <>
            <Button variant="outline" leftIcon={<FileText size={15} />} disabled={rowCount === 0} onClick={openPdf}>
              PDF
            </Button>
            <Button variant="primary" leftIcon={<Download size={15} />} disabled={rowCount === 0} onClick={takeCsv}>
              Download CSV
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------------ 1. the document */}
      <section className="ins-rise mb-5" style={{ '--i': 1 } as React.CSSProperties} aria-labelledby="reports-kind">
        <h2 id="reports-kind" className="mb-3 flex items-baseline gap-2 text-[15px] font-semibold text-p1-text">
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-p1-primary px-1 text-[11px] font-bold tabular-nums text-p1-primary-on">1</span>
          What are you producing?
        </h2>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(238px, 100%), 1fr))' }}
          role="radiogroup"
          aria-label="Kind of report"
        >
          {KINDS.map((k) => {
            const on = f.kind === k.key;
            return (
              <button
                key={k.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => patch({ kind: k.key })}
                className={cx(
                  'ins-hoist group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-ins-panel text-left shadow-ins',
                  on ? 'border-2 border-p1-primary' : 'border-2 border-transparent ring-1 ring-ins-line',
                )}
              >
                <div className="ins-zoom-frame h-[104px] w-full shrink-0 border-b border-ins-line bg-ins-inset px-4 py-3">
                  <div className="ins-zoom h-full w-full">
                    <PagePreview shape={k.shape} active={on} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cx(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                        on ? 'bg-p1-primary text-p1-primary-on' : 'bg-ins-inset text-p1-text-3',
                      )}
                      aria-hidden
                    >
                      <k.icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[15px] font-semibold tracking-[-0.01em] text-p1-text">{KIND_LABEL[k.key]}</span>
                      <span className="mt-0.5 block text-[11.5px] font-medium text-p1-text-3">{k.audience}</span>
                    </div>
                  </div>
                  <span className="mt-2.5 flex-1 text-[12.5px] leading-5 text-p1-text-2">{k.blurb}</span>
                  <span className="mt-3 flex flex-wrap gap-1.5">
                    {(k.key === 'enquiries' ? ['CSV', 'PDF'] : ['CSV', 'PDF', 'Photos']).map((t) => (
                      <span key={t} className="rounded-md bg-ins-inset px-1.5 py-0.5 text-[11px] font-medium text-p1-text-3 ring-1 ring-inset ring-ins-line">{t}</span>
                    ))}
                  </span>
                  {on && (
                    <span className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-p1-primary dark:text-p1-info">
                      <Check size={13} strokeWidth={3} aria-hidden />
                      {rowCount.toLocaleString('en-SG')} {rowCount === 1 ? 'row' : 'rows'} ready
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* -------------------------------------------- 2. who is in it, 3. take it */}
      <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        <div ref={audience} className="ins-rise min-w-0 scroll-mt-20" style={{ '--i': 2 } as React.CSSProperties}>
          <h2 className="mb-3 flex items-baseline gap-2 text-[15px] font-semibold text-p1-text">
            <span className={cx('flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums', rowCount > 0 ? 'bg-p1-success text-white' : 'bg-p1-primary text-p1-primary-on')}>2</span>
            Who is in it?
          </h2>

          <InsightPanel
            padding="sm"
            title={activeFilters ? `${activeFilters} filter${activeFilters === 1 ? '' : 's'} applied` : 'Everything you own'}
            question={win ? `${win.from} to ${win.to}` : 'All time'}
            actions={
              activeFilters > 0 || f.period !== '30' ? (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-p1-primary transition-colors hover:bg-p1-primary-soft dark:text-p1-info"
                >
                  <RotateCcw size={12} aria-hidden />
                  Reset
                </button>
              ) : undefined
            }
          >
            <div className="space-y-5">
              {/* The six an agent changes every time. */}
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
                <ChipSet
                  label="Enquiry standing"
                  value={f.enquiryStatus}
                  onChange={(v) => patch({ enquiryStatus: v })}
                  note="Nothing chosen means all of them."
                  options={ENQUIRY_STATUSES.map((s) => ({ key: s, label: s }))}
                />
              )}

              {/* Everything else, behind one control. It says how many of its own
                  filters are in force, so putting it away never hides the fact. */}
              <Disclosure label="More filters" count={extraCount}>
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

                {f.kind === 'enquiries' && (
                  <SelectInput
                    label="Channel"
                    value={f.channel}
                    onChange={(e) => patch({ channel: e.target.value })}
                    options={[{ value: 'all', label: 'Any channel' }, ...CHANNELS.map((c) => ({ value: c, label: c }))]}
                  />
                )}

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
              </Disclosure>

              <Disclosure label="Order the rows">
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
              </Disclosure>
            </div>
          </InsightPanel>
        </div>

        {/* ------------------------------------------------------------ preview */}
        <div className="min-w-0">
          <h2 className="ins-rise mb-3 flex items-baseline gap-2 text-[15px] font-semibold text-p1-text" style={{ '--i': 3 } as React.CSSProperties}>
            <span className={cx('flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums', rowCount > 0 ? 'bg-p1-primary text-p1-primary-on' : 'bg-ins-inset text-p1-text-3')}>3</span>
            What comes out
          </h2>

          <InsightPanel
            index={3}
            padding="none"
            title={KIND_LABEL[f.kind]}
            question={
              <>
                {rowCount.toLocaleString('en-SG')} {rowCount === 1 ? 'row' : 'rows'}
                {' · '}{win ? `${win.from} to ${win.to}` : 'All time'}
                {activeFilters > 0 && ` · ${activeFilters} ${activeFilters === 1 ? 'filter' : 'filters'}`}
                {' · '}{table.columns.length} columns
                {' · '}sorted by {sorts.find((s) => s.key === sortKey)?.label.toLowerCase()}
              </>
            }
            actions={
              <span
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold tabular-nums',
                  rowCount > 0 ? 'bg-p1-success-soft text-p1-success' : 'bg-ins-inset text-p1-text-3',
                )}
                aria-live="polite"
              >
                <span className={cx('h-1.5 w-1.5 rounded-full', rowCount > 0 ? 'bg-p1-success' : 'bg-p1-text-3')} aria-hidden />
                {rowCount > 0 ? `${rowCount.toLocaleString('en-SG')} ready` : 'Nothing matches'}
              </span>
            }
          >
            {rowCount === 0 ? (
              <InsightEmpty
                icon={<Search size={20} />}
                title="Nothing matches those filters"
                description="Widen the period, or clear a filter or two. The count updates as you change them."
                action={<Button variant="outline" leftIcon={<RotateCcw size={15} />} onClick={reset}>Reset the filters</Button>}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <caption className="sr-only">
                      The first rows of the {KIND_LABEL[f.kind].toLowerCase()} report, as they will appear in the file
                    </caption>
                    <thead>
                      <tr className="border-b border-ins-line bg-ins-inset">
                        {table.columns.map((c) => (
                          <th key={c} scope="col" className="whitespace-nowrap px-3.5 py-2.5 text-[12px] font-medium text-p1-text-3">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ins-line">
                      {table.rows.slice(0, 8).map((r, i) => (
                        <tr key={i} className="transition-colors hover:bg-ins-inset/60">
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
                  <p className="border-t border-ins-line px-4 py-2.5 text-[12px] text-p1-text-3">
                    The first 8 of {table.rows.length.toLocaleString('en-SG')}. Every output below carries all of them.
                  </p>
                )}
              </>
            )}
          </InsightPanel>

          {/* --------------------------------------------------------- outputs */}
          <div ref={output} className="ins-rise mt-5 scroll-mt-20" style={{ '--i': 4 } as React.CSSProperties}>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))' }}
            >
              <OutputCard
                icon={<FileSpreadsheet size={17} />}
                tone="primary"
                title="Spreadsheet"
                detail="Named columns. Opens in Excel and Numbers."
                action="Download CSV"
                disabled={rowCount === 0}
                onClick={takeCsv}
              />
              <OutputCard
                icon={<FileText size={17} />}
                tone="neutral"
                title="Document"
                detail="The same rows as a document, with your CEA registration on every page."
                action="Open the PDF"
                disabled={rowCount === 0}
                onClick={openPdf}
              />
              <OutputCard
                icon={<Images size={17} />}
                tone="accent"
                title="Photo shortlist"
                detail={shortlistable
                  ? 'Your listings with photographs, laid out for a client.'
                  : 'For listings only. Enquiries have no photographs to put on a page.'}
                action="Build the shortlist"
                disabled={!shortlistable}
                onClick={() => router.push(`/phase1/listings/export?ids=${listings.map((l) => l.id).join(',')}`)}
              />
            </div>

            {user?.cea && (
              <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-5 text-p1-text-3">
                <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
                Exported by {user.fullName} · CEA {user.cea.registrationNo} · {user.cea.agencyName}. Anything you send a
                client carries these details automatically.
              </p>
            )}
          </div>
        </div>
      </div>
    </InsightsShell>
  );
}

/* --------------------------------------------------------------- an output */

/**
 * One way of taking the report.
 *
 * Three cards rather than three buttons, because which one to pick depends on
 * who is going to open it, and that is a sentence rather than a verb. The
 * disabled one still explains itself: a control that is greyed out with no
 * reason reads as broken.
 */
function OutputCard({
  icon, tone, title, detail, action, disabled, onClick,
}: {
  icon: React.ReactNode;
  tone: 'primary' | 'neutral' | 'accent';
  title: string;
  detail: string;
  action: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const chip = {
    primary: 'bg-p1-primary-soft text-p1-primary',
    neutral: 'bg-ins-inset text-p1-text-2',
    accent: 'bg-p1-accent-soft text-p1-accent-text',
  }[tone];
  return (
    <div className={cx('flex flex-col rounded-2xl border border-ins-line bg-ins-panel p-4 shadow-ins', disabled && 'opacity-70')}>
      <span className={cx('flex h-9 w-9 items-center justify-center rounded-lg', chip)} aria-hidden>{icon}</span>
      <h3 className="mt-2.5 text-[14px] font-semibold text-p1-text">{title}</h3>
      <p className="mt-1 flex-1 text-[12.5px] leading-5 text-p1-text-2">{detail}</p>
      <Button
        size="sm"
        variant={tone === 'primary' ? 'primary' : 'outline'}
        className="mt-3 w-full"
        disabled={disabled}
        onClick={onClick}
        leftIcon={tone === 'accent' ? <Printer size={14} /> : <Download size={14} />}
      >
        {action}
      </Button>
    </div>
  );
}
