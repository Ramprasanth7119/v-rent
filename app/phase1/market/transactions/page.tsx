"use client";

/**
 * Rental transaction intelligence.
 *
 * The question is always the same and always urgent: a landlord wants 6,500 for
 * a three-bedroom in Martin Modern and the agent has an hour to say whether
 * that is the market. So the screen is built as an argument rather than as a
 * table, and it runs in the order the argument runs in:
 *
 *   1. the answer        — the median, and how far it has moved
 *   2. the trend         — whether that median is going anywhere
 *   3. the spread        — whether the median means anything at all
 *   4. the evidence      — the contracts it was worked out from
 *
 * Step 3 is the one that used to be missing, and it is the one that wins the
 * conversation. A median of $5,400 with every contract between $5,200 and
 * $5,600 is a price. The same median with contracts from $3,900 to $7,100 is an
 * average of two different markets, and an agent who quotes it is about to be
 * shown a comparable that contradicts them.
 *
 * Step 4 opens. A row on its own is a rent; a row opened is that rent placed
 * against the same bedroom count in the same development, which is the thing
 * the agent is actually going to say out loud.
 *
 * Every filter narrows the same set and every figure recomputes from what is
 * left, because a median of a set you cannot see is a number nobody trusts.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2, TrendingUp, Ruler, Download, ChevronDown, GitCompareArrows, Move3d,
  Layers, ArrowUpDown, Search,
} from 'lucide-react';
import {
  Button, LinkButton, SelectInput, cx,
} from '../../../../components/phase1/kit';
import {
  InsightsShell, InsightsHeader, InsightPanel, ContextBar, ContextField, ChipGroup, ActiveChip,
  InsightMetric, MetricRail, TrendChart, DistributionChart, MiniTrend, BarList, ShareDonut,
  InsightEmpty, SourceNote, DataFreshness,
} from '../../../../components/phase1/insights';
import { useDemo } from '../../../../lib/phase1/DemoContext';
import { sgd } from '../../../../lib/phase1/data';
import {
  MARKET_MONTHS, PROJECTS, monthLabel, type Transaction,
} from '../../../../lib/phase1/market';
import {
  COVERED_DISTRICTS, EMPTY_FILTERS, PERIOD_OPTIONS, TREND_METRICS, bedroomMix, contextFor,
  countFilters, districtLabel, histogram, monthsIn, projectRanking, psfOf, selectTransactions, seriesFor, snapshot,
  type Filters, type Period, type TrendMetric,
} from '../../../../lib/phase1/insights';

const shortMonth = (m: string) => monthLabel(m).replace(' 20', " '");
const money = (n: number) => `$${Math.round(n).toLocaleString('en-SG')}`;

/** The most contracts drawn at once. Beyond this the table is a scroll, not a read. */
const PAGE = 15;

/** Unit sizes wear the same colours on every Insights screen. */
const MIX_SLOT: Record<number, number> = { 1: 0, 2: 2, 3: 1, 4: 3 };

export default function TransactionsPage() {
  const { state } = useDemo();
  const [f, setF] = useState<Filters>(EMPTY_FILTERS);
  const [metric, setMetric] = useState<TrendMetric>('rent');
  const [spread, setSpread] = useState<'rent' | 'psf'>('rent');

  /* Arriving from the Overview with a district or a development in mind. Read
     after mount so the screen needs no Suspense boundary for it. */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const district = q.get('district');
    const project = q.get('project');
    const next: Partial<Filters> = {};
    if (district && COVERED_DISTRICTS.includes(Number(district))) next.district = district;
    if (project && PROJECTS.some((p) => p.name === project)) next.project = project;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a deep link, read once after mount
    if (Object.keys(next).length) setF((cur) => ({ ...cur, ...next }));
  }, []);
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [sort, setSort] = useState<{ key: 'month' | 'rent' | 'psf'; dir: 'asc' | 'desc' }>({ key: 'month', dir: 'desc' });

  const patch = useCallback((p: Partial<Filters>) => {
    setF((cur) => ({ ...cur, ...p }));
    setShown(PAGE);
    setOpen(null);
  }, []);

  /* The projects the agent actually has stock in. Putting them at the top of
     the list is the difference between a market tool and a database. */
  const mine = useMemo(
    () => new Set(state.listings.filter((l) => !l.archived).map((l) => l.project)),
    [state.listings],
  );

  const rows = useMemo(() => selectTransactions(f), [f]);
  const stats = useMemo(() => snapshot(rows, f.months), [rows, f.months]);
  const mix = useMemo(() => bedroomMix(rows), [rows]);
  const projects = useMemo(() => projectRanking(rows), [rows]);
  const months = useMemo(() => monthsIn(f.months), [f.months]);
  const active = countFilters(f);

  const sorted = useMemo(() => {
    const value = (t: Transaction) => (sort.key === 'month' ? t.month : sort.key === 'rent' ? t.monthlyRent : psfOf(t));
    return [...rows].sort((a, b) => {
      const va = value(a); const vb = value(b);
      const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sort.dir === 'asc' ? r : -r;
    });
  }, [rows, sort]);

  /* The spread, as bands a reader recognises. Rent bands are rounded to the
     nearest readable step inside `histogram`; per-square-foot is stepped at
     fifty cents, which is the granularity the conversation happens at. */
  const rentBins = useMemo(
    () => histogram(rows.map((r) => r.monthlyRent), { bins: 11, label: (a, b) => `${money(a)} – ${money(b - 1)}` }),
    [rows],
  );
  const psfBins = useMemo(
    () => histogram(rows.map(psfOf), { step: 0.5, label: (a, b) => `$${a.toFixed(2)} – $${(b - 0.01).toFixed(2)}` }),
    [rows],
  );

  const chartSeries = useMemo(() => [{
    key: metric,
    label: TREND_METRICS.find((m) => m.key === metric)!.label,
    points: seriesFor(stats, metric),
    slot: metric === 'rent' ? 0 : metric === 'psf' ? 2 : 1,
  }], [metric, stats]);

  const chartValue = useCallback((n: number) => {
    if (metric === 'psf') return `$${n.toFixed(2)}`;
    if (metric === 'volume') return Math.round(n).toLocaleString('en-SG');
    return money(n);
  }, [metric]);

  const reference = metric === 'rent' && stats.medianRent
    ? { value: stats.medianRent, label: `Period median ${sgd(stats.medianRent)}` }
    : metric === 'psf' && stats.medianPsf
      ? { value: stats.medianPsf, label: `Period median $${stats.medianPsf.toFixed(2)}` }
      : null;

  /* What the figures are about, in one sentence. The phone shows it on the
     button that opens the filters; the desktop shows it under the title. Both
     read the same, because a screenshot of either has to carry its own
     qualifier. */
  const sizeLabel = f.beds === 'all' ? 'All sizes' : f.beds === '4' ? '4+ bedrooms' : `${f.beds} bedroom${f.beds === '1' ? '' : 's'}`;
  const whereLabel = f.project !== 'all'
    ? f.project
    : f.district !== 'all' ? districtLabel(Number(f.district)) : 'every development';
  const summary = `${sizeLabel} · ${whereLabel} · last ${f.months} months`;
  /* The tiles get the same sentence without the words their own label already
     carries, so a 170px tile does not spend two lines repeating itself. */
  const tileSubject = `${sizeLabel} · ${whereLabel}`;

  const csv = () => {
    const head = ['Lease month', 'Project', 'Street', 'District', 'Bedrooms', 'Floor area', 'Monthly rent (S$)', 'Rent per sqft'];
    const body = sorted.map((t) => [
      t.month, t.project, t.street, t.district, t.bedrooms, t.sizeBand, t.monthlyRent, psfOf(t).toFixed(2),
    ]);
    const text = [head, ...body]
      .map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'v-rent-rental-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const controls = (
    <>
      <SelectInput
        label="Development"
        value={f.project}
        onChange={(e) => patch({ project: e.target.value })}
        containerClassName="md:w-[230px]"
        options={[
          { value: 'all', label: 'Every development' },
          ...[...PROJECTS]
            .sort((a, b) => Number(mine.has(b.name)) - Number(mine.has(a.name)) || a.name.localeCompare(b.name))
            .map((p) => ({ value: p.name, label: mine.has(p.name) ? `★ ${p.name}` : p.name })),
        ]}
      />
      <SelectInput
        label="District"
        value={f.district}
        onChange={(e) => patch({ district: e.target.value })}
        containerClassName="md:w-[180px]"
        options={[
          { value: 'all', label: 'Any district' },
          ...COVERED_DISTRICTS.map((d) => ({ value: String(d), label: districtLabel(d) })),
        ]}
      />
      <ContextField label="Unit size">
        <ChipGroup
          label="Unit size"
          value={f.beds}
          onChange={(v) => patch({ beds: v })}
          options={[
            { key: 'all', label: 'Any' },
            { key: '1', label: '1' },
            { key: '2', label: '2' },
            { key: '3', label: '3' },
            { key: '4', label: '4+' },
          ]}
        />
      </ContextField>
      <ContextField label="Period">
        <ChipGroup
          label="Period"
          value={f.months}
          onChange={(v) => patch({ months: v as Period })}
          options={PERIOD_OPTIONS.map((p) => ({ key: p.key, label: p.label, hint: p.full }))}
        />
      </ContextField>
    </>
  );

  return (
    <InsightsShell
      footnote={
        <SourceNote detail={`The window shown ends ${monthLabel(MARKET_MONTHS[MARKET_MONTHS.length - 1])}, the last month URA would have published in arrears. Twelve months is the full extent of the held set; longer windows arrive with the feed.`} />
      }
    >
      <InsightsHeader
        module="transactions"
        title="Rental transactions"
        description="What comparable homes actually let for, by development, size and month."
        meta={<DataFreshness />}
        actions={
          <>
            <LinkButton href="/phase1/market/compare" variant="outline" leftIcon={<GitCompareArrows size={15} />}>
              Compare
            </LinkButton>
            <Button variant="primary" leftIcon={<Download size={15} />} disabled={!rows.length} onClick={csv}>
              Export {rows.length ? rows.length.toLocaleString('en-SG') : ''} rows
            </Button>
          </>
        }
        context={
          <ContextBar
            summary={summary}
            count={active}
            onReset={() => { setF(EMPTY_FILTERS); setShown(PAGE); }}
            sheetTitle="Narrow the market"
          >
            {controls}
          </ContextBar>
        }
      />

      {/* Applied filters, as things that can be individually undone. */}
      {active > 0 && (
        <div className="mb-4 hidden flex-wrap items-center gap-2 md:flex">
          <span className="text-[12px] font-medium uppercase tracking-[0.04em] text-p1-text-3">Showing</span>
          {f.project !== 'all' && <ActiveChip onRemove={() => patch({ project: 'all' })}>{f.project}</ActiveChip>}
          {f.district !== 'all' && <ActiveChip onRemove={() => patch({ district: 'all' })}>{districtLabel(Number(f.district))}</ActiveChip>}
          {f.beds !== 'all' && <ActiveChip onRemove={() => patch({ beds: 'all' })}>{f.beds === '4' ? '4+ bedrooms' : `${f.beds} bedroom${f.beds === '1' ? '' : 's'}`}</ActiveChip>}
        </div>
      )}

      {/* ------------------------------------------------------------ 1. the answer */}
      <MetricRail index={1} min={160} className="mb-5">
        <InsightMetric
          label="Median rent"
          subject={tileSubject}
          value={stats.medianRent}
          unavailable={`${stats.count} contract${stats.count === 1 ? '' : 's'} — too few for a median`}
          prefix="$"
          icon={<TrendingUp size={16} />}
          accent={0}
          delta={{ pct: stats.movementPct, label: 'last third of the period against the first' }}
          hint={stats.q1Rent && stats.q3Rent ? `Middle half ${money(stats.q1Rent)}–${money(stats.q3Rent)}` : undefined}
        >
          <MiniTrend points={stats.rentByMonth} slot={0} label="Median rent by month" width={132} />
        </InsightMetric>

        <InsightMetric
          label="Rent per sqft"
          subject="A month"
          value={stats.medianPsf}
          unavailable="Too few contracts"
          prefix="$"
          decimals={2}
          icon={<Ruler size={16} />}
          accent={2}
          hint="What the space costs, size aside"
        >
          <MiniTrend points={stats.psfByMonth} slot={2} label="Rent per square foot by month" width={132} />
        </InsightMetric>

        <InsightMetric
          label="Contracts"
          subject={`Lodged over ${f.months} months`}
          value={stats.count}
          unavailable="None match"
          icon={<Building2 size={16} />}
          accent={1}
          hint={stats.count ? `${stats.projects} development${stats.projects === 1 ? '' : 's'}` : 'Widen the filters'}
        >
          <MiniTrend points={stats.volumeByMonth} slot={1} label="Contracts by month" width={132} />
        </InsightMetric>

        <InsightMetric
          label="Typical size"
          subject="Median floor area"
          value={stats.medianSize}
          unavailable="Too few contracts"
          suffix=" sqft"
          icon={<Move3d size={16} />}
          accent={5}
          hint={stats.count ? `Across ${stats.count.toLocaleString('en-SG')} contract${stats.count === 1 ? '' : 's'}` : undefined}
        />

      </MetricRail>

      {/* -------------------------------------------------------------- 2. the trend */}
      <InsightPanel
        index={2}
        className="mb-5"
        title={TREND_METRICS.find((m) => m.key === metric)!.label}
        question={TREND_METRICS.find((m) => m.key === metric)!.question}
        actions={
          <ChipGroup
            label="What to plot"
            size="sm"
            value={metric}
            onChange={setMetric}
            options={TREND_METRICS.map((m) => ({ key: m.key, label: m.key === 'volume' ? 'Contracts' : m.key === 'psf' ? 'Per sqft' : 'Rent', hint: m.question }))}
          />
        }
      >
        <TrendChart
          key={metric}
          caption={`${TREND_METRICS.find((m) => m.key === metric)!.label} by lease month — ${summary}`}
          labels={months.map(shortMonth)}
          series={chartSeries}
          kind={metric === 'volume' ? 'bars' : 'area'}
          height={280}
          valueLabel={chartValue}
          reference={reference}
          emptyMessage="Nothing let under these terms. Widen the period, the size or the district."
        />
      </InsightPanel>

      {/* ---------------------------------------------------- 3. spread and mix */}
      <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <InsightPanel
          index={3}
          title="Price distribution"
          question="Is the median a price, or the average of two markets?"
          actions={
            <ChipGroup
              label="Distribution of"
              size="sm"
              value={spread}
              onChange={setSpread}
              options={[{ key: 'rent', label: 'Rent' }, { key: 'psf', label: 'Per sqft' }]}
            />
          }
        >
          <DistributionChart
            key={spread}
            bins={spread === 'rent' ? rentBins : psfBins}
            markAt={spread === 'rent' ? stats.medianRent : stats.medianPsf}
            markLabel={spread === 'rent' ? 'Band holding the median' : 'Band holding the average'}
            caption={`Contracts by ${spread === 'rent' ? 'monthly rent' : 'rent per square foot'} — ${summary}`}
            height={196}
          />
          {spread === 'rent' && stats.q1Rent && stats.q3Rent ? (
            <p className="mt-3 text-[12.5px] leading-5 text-p1-text-3">
              Half of these contracts let between{' '}
              <span className="font-semibold text-p1-text-2">{money(stats.q1Rent)}</span> and{' '}
              <span className="font-semibold text-p1-text-2">{money(stats.q3Rent)}</span>.
            </p>
          ) : null}
        </InsightPanel>

        <InsightPanel index={4} title="Unit mix" question="Which sizes are letting, and at what?">
          {mix.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-p1-text-3">No contracts to break down.</p>
          ) : (
            <>
              <ShareDonut
                size={132}
                shares={mix.map((b) => ({ key: b.label, label: b.label, value: b.count, slot: MIX_SLOT[b.beds] }))}
                centre={(
                  <>
                    <span className="font-p1display text-[20px] font-bold leading-none tabular-nums text-p1-text">{stats.count}</span>
                    <span className="mt-1 text-[11px] text-p1-text-3">contracts</span>
                  </>
                )}
              />
              <table className="mt-4 w-full border-collapse text-left text-[12.5px]">
                <caption className="sr-only">Median rent, rent per square foot and floor area by bedroom count</caption>
                <thead>
                  <tr className="border-b border-ins-line text-p1-text-3">
                    <th scope="col" className="py-1.5 pr-2 font-medium">Size</th>
                    <th scope="col" className="py-1.5 pr-2 text-right font-medium">Median</th>
                    <th scope="col" className="py-1.5 pr-2 text-right font-medium">Psf</th>
                    <th scope="col" className="py-1.5 text-right font-medium">Area</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ins-line">
                  {mix.map((b) => (
                    <tr key={b.label}>
                      <th scope="row" className="py-2 pr-2 font-medium text-p1-text">{b.label}</th>
                      <td className="py-2 pr-2 text-right font-semibold tabular-nums text-p1-text">{b.medianRent ? sgd(b.medianRent) : '—'}</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-p1-text-2">{b.medianPsf ? `$${b.medianPsf.toFixed(2)}` : '—'}</td>
                      <td className="py-2 text-right tabular-nums text-p1-text-2">{b.medianSize ? `${b.medianSize.toLocaleString('en-SG')} sqft` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </InsightPanel>
      </div>

      {/* ---------------------------------------------------- by development */}
      {f.project === 'all' && projects.length > 1 && (
        <div className="mb-5 grid gap-5 lg:grid-cols-2">
          <InsightPanel index={5} title="Most active developments" question="Where the leases are. Select one to narrow the screen to it.">
            <BarList
              caption={`Contracts by development — ${summary}`}
              slot={1}
              valueLabel={(n) => `${n}`}
              items={projects.slice(0, 7).map((p) => ({
                key: p.name,
                label: p.name,
                sub: `· D${String(p.district).padStart(2, '0')}`,
                value: p.contracts,
                display: `${p.contracts} lease${p.contracts === 1 ? '' : 's'}`,
                onSelect: () => patch({ project: p.name }),
                selectLabel: `${p.name}: ${p.contracts} contracts. Show only these.`,
              }))}
            />
          </InsightPanel>
          <InsightPanel index={6} title="Rent per sqft by development" question="Who charges most for the space?">
            <BarList
              caption={`Average rent per square foot by development — ${summary}`}
              slot={2}
              items={projects
                .filter((p) => p.medianPsf !== null)
                .sort((a, b) => (b.medianPsf ?? 0) - (a.medianPsf ?? 0))
                .slice(0, 7)
                .map((p) => ({
                  key: p.name,
                  label: p.name,
                  sub: `· D${String(p.district).padStart(2, '0')}`,
                  value: p.medianPsf,
                  display: `$${(p.medianPsf ?? 0).toFixed(2)}`,
                  onSelect: () => patch({ project: p.name }),
                  selectLabel: `${p.name}: $${p.medianPsf?.toFixed(2)} per sqft. Show only these.`,
                }))}
            />
          </InsightPanel>
        </div>
      )}

      {/* ----------------------------------------------------------- 4. the evidence */}
      <InsightPanel
        index={7}
        padding="none"
        title="The contracts behind it"
        question="Open a row to see where that rent sits against its own development."
        actions={
          <ChipGroup
            label="Sort by"
            size="sm"
            value={sort.key}
            onChange={(k) => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 'asc' ? 'desc' : 'asc') : 'desc' }))}
            options={[
              { key: 'month', label: 'Newest' },
              { key: 'rent', label: 'Rent' },
              { key: 'psf', label: 'Per sqft' },
            ]}
          />
        }
        footer={
          sorted.length > shown ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[12.5px] text-p1-text-3">
                Showing {shown.toLocaleString('en-SG')} of {sorted.length.toLocaleString('en-SG')} contracts.
              </span>
              <Button size="sm" variant="outline" leftIcon={<ArrowUpDown size={14} />} onClick={() => setShown((n) => n + PAGE)}>
                Show {Math.min(PAGE, sorted.length - shown)} more
              </Button>
            </div>
          ) : (
            <span className="text-[12.5px] text-p1-text-3">
              All {sorted.length.toLocaleString('en-SG')} matching contract{sorted.length === 1 ? '' : 's'} shown. The export carries the same rows.
            </span>
          )
        }
      >
        {sorted.length === 0 ? (
          <InsightEmpty
            icon={<Search size={20} />}
            title="Nothing let under those terms"
            description="Widen the period, the unit size or the district. The counts above update as you change them."
            action={<Button variant="outline" onClick={() => { setF(EMPTY_FILTERS); setShown(PAGE); }}>Clear the filters</Button>}
          />
        ) : (
          <ContractList
            rows={sorted.slice(0, shown)}
            open={open}
            onToggle={(id) => setOpen((cur) => (cur === id ? null : id))}
            onNarrowToLike={(t) => {
              patch({ project: t.project, beds: String(Math.min(4, t.bedrooms)), district: 'all', query: '' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </InsightPanel>
    </InsightsShell>
  );
}

/* ------------------------------------------------------------ the evidence list */

/**
 * The contracts, as a table on a desktop and as cards on a phone.
 *
 * Not one responsive table: a table narrowed to a phone is either a horizontal
 * scroll nobody finds the right-hand end of, or six columns squeezed to
 * illegibility. The two renderings carry the same figures and the same
 * disclosure, and only one of them is ever in the document.
 */
function ContractList({
  rows, open, onToggle, onNarrowToLike,
}: {
  rows: Transaction[];
  open: string | null;
  onToggle: (id: string) => void;
  /** Re-point the whole screen at contracts like this one. */
  onNarrowToLike: (t: Transaction) => void;
}) {
  return (
    <>
      {/* -------------------------------------------------------------- desktop */}
      {/* The table appears at 1024 rather than 768. Seven columns squeezed into a
         tablet is the "shrink it" answer this redesign is against; a tablet gets
         the card list, which is the same evidence at a width it fits. The
         scroll container is the guard for a long development name. */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-left text-[13.5px]" style={{ minWidth: 720 }}>
          <caption className="sr-only">Lodged rental contracts, newest first. Each row opens to show how its rent compares with its own development.</caption>
          <thead>
            <tr className="border-b border-ins-line">
              <th scope="col" className="px-5 py-2.5 text-[12px] font-medium text-p1-text-3">Lease month</th>
              <th scope="col" className="px-5 py-2.5 text-[12px] font-medium text-p1-text-3">Development</th>
              <th scope="col" className="px-5 py-2.5 text-right text-[12px] font-medium text-p1-text-3">Beds</th>
              <th scope="col" className="px-5 py-2.5 text-[12px] font-medium text-p1-text-3">Floor area</th>
              <th scope="col" className="px-5 py-2.5 text-right text-[12px] font-medium text-p1-text-3">Monthly rent</th>
              <th scope="col" className="px-5 py-2.5 text-right text-[12px] font-medium text-p1-text-3">Per sqft</th>
              <th scope="col" className="w-10 px-2 py-2.5"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const on = open === t.id;
              return (
                <React.Fragment key={t.id}>
                  <tr
                    className={cx(
                      'cursor-pointer border-b border-ins-line transition-colors',
                      on ? 'bg-ins-inset' : 'hover:bg-ins-inset/60',
                    )}
                    onClick={() => onToggle(t.id)}
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-p1-text-2">{monthLabel(t.month)}</td>
                    <td className="px-5 py-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-p1-text">{t.project}</div>
                        <div className="truncate text-[12.5px] text-p1-text-3">
                          {t.street} · {districtLabel(t.district)}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-p1-text-2">{t.bedrooms}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-p1-text-2">{t.sizeBand}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-p1-text">{sgd(t.monthlyRent)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-p1-text-2">${psfOf(t).toFixed(2)}</td>
                    <td className="px-2 py-3 text-right">
                      <button
                        type="button"
                        aria-expanded={on}
                        aria-label={`${on ? 'Hide' : 'Show'} details for the ${monthLabel(t.month)} contract at ${t.project}`}
                        onClick={(e) => { e.stopPropagation(); onToggle(t.id); }}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-p1-text-3 transition-colors hover:bg-ins-line hover:text-p1-text"
                      >
                        <ChevronDown size={15} className={cx('transition-transform duration-200', on && 'rotate-180')} aria-hidden />
                      </button>
                    </td>
                  </tr>
                  {on && (
                    <tr className="border-b border-ins-line bg-ins-inset">
                      <td colSpan={7} className="px-5 pb-4 pt-1">
                        <ContractDetail t={t} onNarrowToLike={onNarrowToLike} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------- phone and tablet */}
      <ul className="divide-y divide-ins-line lg:hidden">
        {rows.map((t) => {
          const on = open === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onToggle(t.id)}
                aria-expanded={on}
                className={cx('flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors', on && 'bg-ins-inset')}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-p1-text">{t.project}</div>
                  <div className="mt-0.5 truncate text-[12px] text-p1-text-3">
                    {monthLabel(t.month)} · {t.bedrooms} bed · {t.sizeBand}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[14.5px] font-semibold tabular-nums text-p1-text">{sgd(t.monthlyRent)}</div>
                  <div className="text-[12px] tabular-nums text-p1-text-3">${psfOf(t).toFixed(2)} psf</div>
                </div>
                <ChevronDown size={16} className={cx('mt-1 shrink-0 text-p1-text-3 transition-transform duration-200', on && 'rotate-180')} aria-hidden />
              </button>
              {on && (
                <div className="ins-swap bg-ins-inset px-4 pb-4">
                  <ContractDetail t={t} onNarrowToLike={onNarrowToLike} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * One contract, placed.
 *
 * The rank bar is the point of the whole disclosure: it says where this rent
 * sits among every contract for the same bedroom count in the same development,
 * which is the comparison an agent is about to make from memory and get wrong.
 * It only appears when enough comparable contracts exist to rank against.
 */
function ContractDetail({ t, onNarrowToLike }: { t: Transaction; onNarrowToLike: (t: Transaction) => void }) {
  const ctx = useMemo(() => contextFor(t), [t]);
  const vsProject = ctx.projectMedian ? Math.round(((t.monthlyRent - ctx.projectMedian) / ctx.projectMedian) * 1000) / 10 : null;

  return (
    <div className="ins-swap grid gap-4 rounded-xl border border-ins-line bg-ins-panel p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold text-p1-text">
          Against {t.bedrooms >= 4 ? '4+ bedroom' : `${t.bedrooms} bedroom`} contracts at {t.project}
        </h3>

        {ctx.rankInProject === null ? (
          <p className="mt-2 text-[13px] leading-5 text-p1-text-2">
            Only {ctx.comparables} comparable contract{ctx.comparables === 1 ? '' : 's'} in this development — too few
            to say where this one sits. The district comparison below is the closest available.
          </p>
        ) : (
          <>
            <div className="relative mt-3 h-8">
              <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-ins-inset">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${ctx.rankInProject}%`,
                    background: 'linear-gradient(90deg, color-mix(in srgb, var(--ins-s1) 45%, var(--ins-panel)), var(--ins-s1))',
                    transition: 'width 560ms cubic-bezier(.16,1,.3,1)',
                  }}
                />
              </div>
              <span
                className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ins-panel shadow-p1-sm"
                style={{ left: `${ctx.rankInProject}%`, background: 'var(--ins-s1)' }}
                aria-hidden
              />
            </div>
            <div className="flex justify-between text-[11.5px] text-p1-text-3">
              <span>Cheapest</span>
              <span className="font-semibold text-p1-text-2">
                Dearer than {ctx.rankInProject}% of {ctx.comparables} comparable contracts
              </span>
              <span>Dearest</span>
            </div>
          </>
        )}

        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <div>
            <dt className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-p1-text-3">This contract</dt>
            <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-p1-text">{sgd(t.monthlyRent)}</dd>
          </div>
          <div>
            <dt className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-p1-text-3">Development median</dt>
            <dd className="mt-0.5 flex items-baseline gap-2 text-[15px] tabular-nums text-p1-text">
              {ctx.projectMedian ? sgd(ctx.projectMedian) : <span className="text-[13px] text-p1-text-3">Too few</span>}
              {vsProject !== null && (
                <span className={cx('text-[12px] font-semibold', vsProject > 0 ? 'text-p1-success' : vsProject < 0 ? 'text-p1-danger' : 'text-p1-text-3')}>
                  {vsProject > 0 ? '↑ +' : vsProject < 0 ? '↓ ' : '→ '}{Math.abs(vsProject).toFixed(1)}%
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-p1-text-3">District median</dt>
            <dd className="mt-0.5 text-[15px] tabular-nums text-p1-text">
              {ctx.districtMedian ? sgd(ctx.districtMedian) : <span className="text-[13px] text-p1-text-3">Too few</span>}
            </dd>
          </div>
        </dl>
      </div>

      <div className="min-w-0 border-t border-ins-line pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        <h3 className="text-[13px] font-semibold text-p1-text">The contract as URA publishes it</h3>
        <dl className="mt-2 divide-y divide-ins-line text-[13px]">
          {[
            ['Lease month', monthLabel(t.month)],
            ['Development', t.project],
            ['Street', t.street],
            ['District', districtLabel(t.district)],
            ['Bedrooms', String(t.bedrooms)],
            ['Floor area', t.sizeBand],
            ['Rent per sqft', `$${ctx.psf.toFixed(2)}`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-1.5">
              <dt className="text-p1-text-3">{k}</dt>
              <dd className="text-right font-medium text-p1-text">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2.5 text-[11.5px] leading-4 text-p1-text-3">
          URA publishes a floor-area band and a bedroom count, not a unit number or a stack, so neither is shown here.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <LinkButton size="sm" variant="outline" href={`/phase1/market/compare?add=${encodeURIComponent(t.project)}`} leftIcon={<GitCompareArrows size={14} />}>
            Compare
          </LinkButton>
          {/* Not a link to this page: it narrows this page. The reader has just
              been shown that this rent sits in the 44th percentile of its own
              development, and the obvious next move is to see the other
              forty-three. */}
          <Button size="sm" variant="ghost" leftIcon={<Layers size={14} />} onClick={() => onNarrowToLike(t)}>
            See all {t.bedrooms >= 4 ? '4+' : t.bedrooms} bed here
          </Button>
        </div>
      </div>
    </div>
  );
}
