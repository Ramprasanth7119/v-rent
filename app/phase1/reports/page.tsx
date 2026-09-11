"use client";

/**
 * Download a report.
 *
 * Agents are asked for numbers by people who are not in the product: an agency
 * team leader wants the month's inventory, a landlord wants every enquiry on
 * their unit, an accountant wants what was live in a quarter. Before this they
 * screenshotted a dashboard or retyped it into a spreadsheet.
 *
 * The screen is built around one idea: choose what you want, watch the count
 * change, then take the file. Nothing is generated until the filters read the
 * way the agent expects, so there is no cycle of downloading, opening, finding
 * it wrong and downloading again.
 *
 * CSV is produced in the browser from data that is already loaded — no round
 * trip, works offline, and opens in Excel with the columns already named. The
 * printable version reuses the branded shortlist, which carries the CEA
 * compliance block the advertising rules require.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, MessageSquare, TrendingUp, Download, Printer, FileSpreadsheet, RotateCcw, Info,
} from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, SelectInput, TextInput, FilterChips, EmptyState, cx,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { useDemo, TODAY } from '../../../lib/phase1/DemoContext';
import { useSession } from '../../../lib/phase1/SessionContext';
import { sgd } from '../../../lib/phase1/data';
import { dealOf } from '../../../lib/phase1/pricing';
import { districtName, listingStats, ENQUIRY_STATUS } from '../../../lib/phase1/performance';
import { listingHealth } from '../../../lib/phase1/health';
import type { Enquiry } from '../../../lib/phase1/workspace';

/* ------------------------------------------------------------------- types */

type ReportKind = 'inventory' | 'enquiries' | 'performance';

const KINDS: { key: ReportKind; label: string; icon: typeof Building2; blurb: string }[] = [
  { key: 'inventory', label: 'Listing inventory', icon: Building2, blurb: 'Every listing with its address, price, size and standing.' },
  { key: 'enquiries', label: 'Enquiries', icon: MessageSquare, blurb: 'Who asked about what, when, and whether they have been answered.' },
  { key: 'performance', label: 'Performance', icon: TrendingUp, blurb: 'Views, enquiries and conversion for each listing.' },
];

const PERIODS = [
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
  { key: 'all', label: 'Everything' },
  { key: 'custom', label: 'Custom range' },
];

const STATUSES = ['published', 'draft', 'pending', 'paused', 'rejected', 'expired'] as const;

/* --------------------------------------------------------------- utilities */

const iso = (d: Date) => d.toISOString().slice(0, 10);

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

/* -------------------------------------------------------------------- page */

export default function ReportsPage() {
  const router = useRouter();
  const { state } = useDemo();
  const { user } = useSession();

  const [kind, setKind] = useState<ReportKind>('inventory');
  const [period, setPeriod] = useState('30');
  const [from, setFrom] = useState(iso(new Date(TODAY.getTime() - 30 * 86_400_000)));
  const [to, setTo] = useState(iso(TODAY));
  const [status, setStatus] = useState<string[]>([]);
  const [deal, setDeal] = useState('all');
  const [district, setDistrict] = useState('all');
  const [beds, setBeds] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  /* The window the period controls resolve to. One place, so the three report
     kinds cannot drift apart on what "last 30 days" means. */
  const window = useMemo(() => {
    if (period === 'all') return null;
    if (period === 'custom') return { from, to };
    const days = Number(period);
    return { from: iso(new Date(TODAY.getTime() - days * 86_400_000)), to: iso(TODAY) };
  }, [period, from, to]);

  const inWindow = (date?: string) => {
    if (!window || !date) return true;
    const d = date.slice(0, 10);
    return d >= window.from && d <= window.to;
  };

  const live = useMemo(() => state.listings.filter((l) => !l.archived), [state.listings]);

  /** The listing filters, shared by all three reports. */
  const listings = useMemo(() => {
    const min = Number(minPrice) || 0;
    const max = Number(maxPrice) || Infinity;
    return live.filter((l) => {
      if (status.length && !status.includes(l.status)) return false;
      if (deal !== 'all' && dealOf(l) !== deal) return false;
      if (district !== 'all' && String(l.district) !== district) return false;
      if (beds !== 'all' && (beds === '4' ? l.bedrooms < 4 : String(l.bedrooms) !== beds)) return false;
      const price = dealOf(l) === 'sale' ? (l.salePriceSgd ?? 0) : l.monthlyRent;
      if (price < min || price > max) return false;
      // The inventory and performance reports are windowed on when the listing
      // was created; enquiries are windowed on the enquiry, not the listing.
      if (kind !== 'enquiries' && !inWindow(l.createdAt)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, status, deal, district, beds, minPrice, maxPrice, kind, window]);

  const enquiries = useMemo(() => {
    const ids = new Set(listings.map((l) => l.id));
    return state.enquiries.filter((e) => ids.has(e.listingId) && inWindow(e.at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.enquiries, listings, window]);

  const rowCount = kind === 'enquiries' ? enquiries.length : listings.length;

  const districts = useMemo(
    () => [...new Set(live.map((l) => l.district))].sort((a, b) => a - b),
    [live],
  );

  /* ------------------------------------------------------------- the file */

  const build = (): { columns: string[]; rows: (string | number)[][] } => {
    const byId = new Map(live.map((l) => [l.id, l]));

    if (kind === 'inventory') {
      return {
        columns: ['Reference', 'Status', 'Deal', 'Project', 'Unit', 'Address', 'Postal code', 'District',
          'Property type', 'Bedrooms', 'Bathrooms', 'Size (sqft)', 'Price (S$)', 'Furnishing', 'Photos',
          'Created', 'Published', 'Expires'],
        rows: listings.map((l) => [
          l.reference, l.status, dealOf(l), l.project, l.unitNo, l.address, l.postalCode,
          `D${String(l.district).padStart(2, '0')} ${districtName(l.district)}`,
          l.propertyType, l.bedrooms, l.bathrooms, l.sizeSqft,
          dealOf(l) === 'sale' ? (l.salePriceSgd ?? 0) : l.monthlyRent,
          l.furnishing, l.photos?.length ?? l.images, l.createdAt, l.publishedAt ?? '', l.expiresAt ?? '',
        ]),
      };
    }

    if (kind === 'enquiries') {
      return {
        columns: ['Received', 'Listing', 'Reference', 'Unit', 'Name', 'Contact', 'Channel', 'Status',
          'Budget (S$)', 'Move in', 'Message'],
        rows: enquiries.map((e: Enquiry) => {
          const l = byId.get(e.listingId);
          return [
            e.at, l?.project ?? e.listingId, l?.reference ?? '', l?.unitNo ?? '',
            e.name, e.contact, e.channel, ENQUIRY_STATUS[e.status].label,
            e.budget ?? '', e.moveIn ?? '', e.message.replace(/\s+/g, ' ').trim(),
          ];
        }),
      };
    }

    return {
      columns: ['Reference', 'Project', 'Unit', 'Status', 'Views (30 days)', 'Views (7 days)',
        'Enquiries (30 days)', 'Saves', 'Enquiries per 100 views', 'Listing health'],
      rows: listings.map((l) => {
        const s = listingStats(l);
        return [
          l.reference, l.project, l.unitNo, l.status, s.views30d, s.views7d,
          s.enquiries30d, s.saves, s.conversion.toFixed(1), listingHealth(l).score,
        ];
      }),
    };
  };

  const preview = useMemo(() => build(), [kind, listings, enquiries]);  // eslint-disable-line react-hooks/exhaustive-deps

  const filename = () => {
    const stamp = window ? `${window.from}_to_${window.to}` : 'all-time';
    return `v-rent-${kind}-${stamp}.csv`;
  };

  const reset = () => {
    setStatus([]); setDeal('all'); setDistrict('all'); setBeds('all');
    setMinPrice(''); setMaxPrice(''); setPeriod('30');
  };

  const activeFilters = [
    status.length > 0, deal !== 'all', district !== 'all', beds !== 'all',
    minPrice !== '', maxPrice !== '',
  ].filter(Boolean).length;

  /* The printable version is the branded shortlist, which already carries the
     compliance block. Only listings can be printed that way. */
  const printable = kind !== 'enquiries' && listings.length > 0;

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Reports' }]}
        eyebrow="Business"
        title="Download a report"
        description="Choose what you need and narrow it down. The count below updates as you go, so you can see what you are about to take before you take it."
        actions={
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Download size={17} />}
            disabled={rowCount === 0}
            onClick={() => download(filename(), toCsv(preview.columns, preview.rows))}
          >
            Download CSV
          </Button>
        }
      />

      {/* ------------------------------------------------------ what to report */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {KINDS.map((k) => {
          const on = kind === k.key;
          return (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
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
              <span className="mt-3 font-p1display text-[15.5px] font-bold text-p1-text">{k.label}</span>
              <span className="mt-1 text-[13px] leading-5 text-p1-text-2">{k.blurb}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ---------------------------------------------------------- filters */}
        <div className="space-y-4">
          <SectionCard
            title="Filters"
            padding="sm"
            actions={
              activeFilters > 0 || period !== '30' ? (
                <button type="button" onClick={reset} className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] font-semibold text-p1-primary hover:underline underline-offset-4 dark:text-p1-info">
                  <RotateCcw size={12} aria-hidden />
                  Reset
                </button>
              ) : undefined
            }
          >
            <div className="space-y-5">
              <div>
                <span className="mb-2 block text-[12.5px] font-semibold text-p1-text-2">
                  {kind === 'enquiries' ? 'Enquiries received' : 'Listings created'}
                </span>
                <FilterChips options={PERIODS} value={period} onChange={setPeriod} label="Period" size="sm" />
                {period === 'custom' && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <TextInput label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    <TextInput label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                  </div>
                )}
              </div>

              <div>
                <span className="mb-2 block text-[12.5px] font-semibold text-p1-text-2">Standing</span>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => {
                    const on = status.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setStatus((cur) => (on ? cur.filter((x) => x !== s) : [...cur, s]))}
                        className={cx(
                          'cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold capitalize transition-colors',
                          on ? 'bg-p1-primary text-white' : 'bg-p1-subtle text-p1-text-2 hover:text-p1-text',
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                {status.length === 0 && <p className="mt-2 text-[12px] text-p1-text-3">Nothing chosen means every standing.</p>}
              </div>

              <SelectInput
                label="Sale or rent"
                value={deal}
                onChange={(e) => setDeal(e.target.value)}
                options={[
                  { value: 'all', label: 'Both' },
                  { value: 'rent', label: 'For rent' },
                  { value: 'sale', label: 'For sale' },
                ]}
              />

              <div className="grid grid-cols-2 gap-3">
                <SelectInput
                  label="District"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  options={[
                    { value: 'all', label: 'Any' },
                    ...districts.map((d) => ({ value: String(d), label: `D${String(d).padStart(2, '0')}` })),
                  ]}
                />
                <SelectInput
                  label="Bedrooms"
                  value={beds}
                  onChange={(e) => setBeds(e.target.value)}
                  options={[
                    { value: 'all', label: 'Any' },
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4 or more' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Price from" inputMode="numeric" placeholder="Any" value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))} />
                <TextInput label="Price to" inputMode="numeric" placeholder="Any" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
          </SectionCard>

          <div className="rounded-xl bg-p1-subtle p-3.5 ring-1 ring-p1-border">
            <div className="flex items-center gap-2 text-[12.5px] font-bold text-p1-text">
              <Info size={13} className="text-p1-primary dark:text-p1-info" aria-hidden />
              What comes out
            </div>
            <p className="mt-1.5 text-[12.5px] leading-[1.5] text-p1-text-2">
              CSV opens in Excel and Numbers with the columns already named. The printable version carries your CEA
              registration and agency licence on every page, which the advertising rules require on anything you send
              a client.
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------------- preview */}
        <div className="min-w-0">
          <Card padding="none" className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-p1-border px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-p1display text-[17px] font-bold text-p1-text">
                    {KINDS.find((k) => k.key === kind)!.label}
                  </h2>
                  <Pill tone={rowCount > 0 ? 'info' : 'neutral'}>
                    {rowCount} {rowCount === 1 ? 'row' : 'rows'}
                  </Pill>
                </div>
                <p className="mt-0.5 text-[12.5px] text-p1-text-3">
                  {window ? `${window.from} to ${window.to}` : 'All time'}
                  {activeFilters > 0 && ` · ${activeFilters} ${activeFilters === 1 ? 'filter' : 'filters'} applied`}
                  {' · '}{preview.columns.length} columns
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {printable && (
                  <Button
                    variant="outline"
                    leftIcon={<Printer size={16} />}
                    onClick={() => router.push(`/phase1/listings/export?ids=${listings.map((l) => l.id).join(',')}`)}
                  >
                    Printable version
                  </Button>
                )}
                <Button
                  variant="primary"
                  leftIcon={<FileSpreadsheet size={16} />}
                  disabled={rowCount === 0}
                  onClick={() => download(filename(), toCsv(preview.columns, preview.rows))}
                >
                  Download CSV
                </Button>
              </div>
            </div>

            {rowCount === 0 ? (
              <EmptyState
                className="border-0"
                icon={<FileSpreadsheet size={22} />}
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
                        {preview.columns.map((c) => (
                          <th key={c} className="whitespace-nowrap px-3.5 py-2.5 font-semibold text-p1-text-2">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 8).map((r, i) => (
                        <tr key={i} className="border-b border-p1-border last:border-b-0">
                          {r.map((cell, j) => (
                            <td key={j} className="max-w-[220px] truncate whitespace-nowrap px-3.5 py-2.5 text-p1-text">
                              {typeof cell === 'number' && preview.columns[j].includes('S$') ? sgd(cell) : String(cell || '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.rows.length > 8 && (
                  <p className="border-t border-p1-border px-5 py-3 text-[12.5px] text-p1-text-3">
                    Showing the first 8 of {preview.rows.length}. The download has all of them.
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
