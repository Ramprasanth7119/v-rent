"use client";

/**
 * Project comparison.
 *
 * A tenant deciding between two developments and a landlord arguing about rent
 * are asking the same question in different words: how does this one stand
 * against that one. The comparison is only worth building if it puts the
 * numbers on the same row — age, size, what it lets for, what that is per
 * square foot — because that is the part an agent otherwise does in their head
 * and gets wrong under pressure.
 *
 * The screen used to be a table with the better cell shaded. A table answers
 * "what are the numbers"; it does not answer "by how much", which is the
 * question a client actually asks. So each metric is now a row on one shared
 * scale with the developments placed on it. Reading "$5,400 against $6,200" as
 * a distance is instant; reading it as a subtraction is not.
 *
 * Three columns at most. A fourth turns this back into a spreadsheet, and the
 * scale each row is drawn on stops being legible.
 *
 * Colour belongs to the development, not to its position. Removing the leftmost
 * of three does not repaint the two that remain — a comparison whose colours
 * shuffle under the reader is worse than one with no colour at all.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GitCompareArrows, Plus, X, TrainFront, Ruler, Printer, ArrowLeftRight,
} from 'lucide-react';
import {
  Button, LinkButton, SelectInput, cx,
} from '../../../../components/phase1/kit';
import {
  InsightsShell, InsightsHeader, InsightPanel, ContextBar, ContextField, ChipGroup,
  TrendChart, ProportionBar, GroupedBars, seriesColour, seriesSoft,
  InsightEmpty, SourceNote, DataFreshness,
} from '../../../../components/phase1/insights';
import { sgd } from '../../../../lib/phase1/data';
import { MARKET_MONTHS, PROJECTS, monthLabel } from '../../../../lib/phase1/market';
import {
  PERIOD_OPTIONS, districtLabel, monthsIn, projectInsight, type Period, type ProjectInsight,
} from '../../../../lib/phase1/insights';

const MAX = 3;

const BED_BANDS = [
  { key: '1', beds: 1, label: '1 bed' },
  { key: '2', beds: 2, label: '2 bed' },
  { key: '3', beds: 3, label: '3 bed' },
  { key: '4', beds: 4, label: '4+ bed' },
];
/** Unit sizes wear the same colours on every Insights screen. */
const MIX_SLOT: Record<number, number> = { 1: 0, 2: 2, 3: 1, 4: 3 };
const shortMonth = (m: string) => monthLabel(m).replace(' 20', " '");
const money = (n: number) => `$${Math.round(n).toLocaleString('en-SG')}`;

interface Chosen { name: string; slot: number }

export default function ComparePage() {
  const [chosen, setChosen] = useState<Chosen[]>([
    { name: PROJECTS[4].name, slot: 0 },
    { name: PROJECTS[7].name, slot: 1 },
  ]);
  const [beds, setBeds] = useState('all');
  const [period, setPeriod] = useState<Period>('12');

  /**
   * A development keeps the colour it was given until it is removed, so a
   * survivor never changes colour when its neighbour leaves. The new one takes
   * the lowest free slot rather than the next index.
   */
  const add = useCallback((name: string) => {
    setChosen((cur) => {
      if (!name || cur.length >= MAX || cur.some((c) => c.name === name)) return cur;
      const used = new Set(cur.map((c) => c.slot));
      let slot = 0;
      while (used.has(slot)) slot += 1;
      return [...cur, { name, slot }];
    });
  }, []);

  const remove = (name: string) => setChosen((cur) => cur.filter((c) => c.name !== name));

  /* Arriving from a contract on the Transactions screen with a development
     already in mind. Read from the address after mount rather than through the
     router hook, which would put this whole screen behind a Suspense boundary
     for the sake of one optional parameter. */
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('add');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a deep link, read once after mount
    if (wanted && PROJECTS.some((p) => p.name === wanted)) add(wanted);
  }, [add]);

  const columns = useMemo(
    () => chosen
      .map((c) => ({ chosen: c, data: projectInsight(c.name, beds, period) }))
      .filter((x): x is { chosen: Chosen; data: ProjectInsight } => x.data !== null),
    [chosen, beds, period],
  );

  const months = useMemo(() => monthsIn(period), [period]);

  /* Rent by size ignores the size filter: the chart is the sizes. */
  const byBeds = useMemo(() => {
    const out: Record<string, Record<string, number | null>> = {};
    for (const c of chosen) {
      const all = projectInsight(c.name, 'all', period);
      out[c.name] = Object.fromEntries(BED_BANDS.map((b) => [b.key, all?.mix.find((m) => m.beds === b.beds)?.medianRent ?? null]));
    }
    return out;
  }, [chosen, period]);
  const available = PROJECTS.filter((p) => !chosen.some((c) => c.name === p.name));

  const sizeLabel = beds === 'all' ? 'every unit size' : beds === '4' ? '4+ bedrooms' : `${beds} bedroom${beds === '1' ? '' : 's'}`;
  const summary = `${columns.length} development${columns.length === 1 ? '' : 's'} · ${sizeLabel} · last ${period} months`;

  const controls = (
    <>
      <SelectInput
        label="Add a development"
        value=""
        onChange={(e) => add(e.target.value)}
        disabled={chosen.length >= MAX}
        containerClassName="md:w-[290px]"
        hint={chosen.length >= MAX ? 'Three is the most that stays readable. Remove one first.' : undefined}
        options={[
          { value: '', label: chosen.length >= MAX ? 'Three already chosen' : 'Choose a development…' },
          ...available.map((p) => ({ value: p.name, label: `${p.name} — ${districtLabel(p.district)}` })),
        ]}
      />
      <ContextField label="Unit size">
        <ChipGroup
          label="Unit size"
          value={beds}
          onChange={setBeds}
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
          value={period}
          onChange={(v) => setPeriod(v as Period)}
          options={PERIOD_OPTIONS.map((p) => ({ key: p.key, label: p.label, hint: p.full }))}
        />
      </ContextField>
    </>
  );

  return (
    <InsightsShell
      footnote={
        <SourceNote detail={`Figures cover the ${period} months to ${monthLabel(MARKET_MONTHS[MARKET_MONTHS.length - 1])}. Completion year, tenure, unit count and the walk to the station are development facts, not contract statistics.`} />
      }
    >
      <InsightsHeader
        module="compare"
        title="Compare developments"
        description="Up to three developments, figure against figure."
        meta={<DataFreshness />}
        actions={
          <>
            <LinkButton href="/phase1/market/transactions" variant="outline">Transactions</LinkButton>
            <Button variant="primary" leftIcon={<Printer size={15} />} disabled={columns.length < 2} onClick={() => window.print()}>
              Print
            </Button>
          </>
        }
        context={
          <ContextBar
            summary={summary}
            count={beds === 'all' ? 0 : 1}
            onReset={beds === 'all' ? undefined : () => setBeds('all')}
            sheetTitle="Set up the comparison"
          >
            {controls}
          </ContextBar>
        }
      />

      {columns.length === 0 ? (
        <InsightPanel index={1}>
          <InsightEmpty
            icon={<GitCompareArrows size={20} />}
            title="Choose two developments"
            description="Add them above and they appear side by side, with their contract history on one scale."
          />
          <div className="flex flex-wrap justify-center gap-2 pb-6">
            {PROJECTS.slice(0, 6).map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => add(p.name)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-ins-line bg-ins-panel px-3.5 py-2 text-[12.5px] font-medium text-p1-text-2 transition-colors hover:border-ins-line-strong hover:text-p1-text"
              >
                <Plus size={13} aria-hidden />
                {p.name}
              </button>
            ))}
          </div>
        </InsightPanel>
      ) : (
        <>
          {/* --------------------------------------------------------- the columns */}
          <section
            className="ins-rise mb-5"
            style={{ '--i': 1 } as React.CSSProperties}
            aria-label="The developments being compared"
          >
            <div className="ins-snap-x -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:px-0" style={{ gridTemplateColumns: `repeat(${Math.min(MAX, columns.length + (chosen.length < MAX ? 1 : 0))}, minmax(0, 1fr))` }}>
              {columns.map(({ chosen: c, data }) => (
                <ProjectColumn key={c.name} slot={c.slot} data={data} onRemove={() => remove(c.name)} />
              ))}

              {chosen.length < MAX && (
                <AddColumn
                  options={available}
                  onAdd={add}
                  remaining={MAX - chosen.length}
                />
              )}
            </div>
          </section>

          {columns.length < 2 ? (
            <InsightPanel index={2}>
              <InsightEmpty
                icon={<ArrowLeftRight size={20} />}
                title="Add a second development"
                description="One development on its own has nothing to be placed against. The rows below appear as soon as there are two."
              />
            </InsightPanel>
          ) : (
            <>
              {/* -------------------------------------------------- side by side */}
              <InsightPanel
                index={2}
                className="mb-5"
                padding="none"
                title="Side by side"
                question={`Each figure against the others, for ${sizeLabel} over ${period} months. Percentages are against ${columns[0].data.project.name}.`}
              >
                <CompareTable columns={columns} />
              </InsightPanel>

              <div className="grid gap-5 xl:grid-cols-2">
                <InsightPanel
                  index={3}
                  title="Median rent by unit size"
                  question="Like for like: the same size of home in each development."
                >
                  <GroupedBars
                    caption={`Median monthly rent by bedroom count, last ${period} months`}
                    categories={BED_BANDS.map((b) => b.label)}
                    valueLabel={money}
                    tickLabel={(n) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k` : `$${n}`)}
                    series={columns.map(({ chosen: c }) => ({
                      key: c.name,
                      label: c.name,
                      slot: c.slot,
                      values: BED_BANDS.map((b) => byBeds[c.name]?.[b.key] ?? null),
                    }))}
                  />
                </InsightPanel>

                <InsightPanel
                  index={4}
                  title="Median rent, month by month"
                  question="Have they moved together, or has one pulled away?"
                >
                  <TrendChart
                    caption={`Median monthly rent by lease month, ${sizeLabel}, for ${columns.map((c) => c.data.project.name).join(', ')}`}
                    labels={months.map(shortMonth)}
                    kind="line"
                    height={240}
                    valueLabel={money}
                    series={columns.map(({ chosen: c, data }) => ({
                      key: c.name,
                      label: c.name,
                      points: data.snapshot.rentByMonth,
                      slot: c.slot,
                    }))}
                    emptyMessage="No contracts for these developments at this unit size. Widen the size or the period."
                  />
                </InsightPanel>
              </div>
            </>
          )}
        </>
      )}
    </InsightsShell>
  );
}

/* ------------------------------------------------------------------- column */

/**
 * One development at the head of the comparison.
 *
 * Image first, because this is a property product and a development is a
 * building before it is a row of statistics. The colour bar under the picture
 * is what ties the card to its marks on every row below, and it is paired with
 * the name rather than standing alone — colour identifies, it never carries the
 * identity by itself.
 */
function ProjectColumn({
  slot, data, onRemove,
}: {
  slot: number;
  data: ProjectInsight;
  onRemove: () => void;
}) {
  const p = data.project;
  const s = data.snapshot;
  return (
    <article className="ins-swap relative flex w-[264px] shrink-0 flex-col overflow-hidden rounded-2xl border border-ins-line bg-ins-panel shadow-ins sm:w-auto">
      <span className="h-1 w-full" style={{ background: seriesColour(slot) }} aria-hidden />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-2">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: seriesColour(slot) }} aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-p1-text">{p.name}</h2>
            <p className="mt-0.5 text-[12.5px] leading-4 text-p1-text-3">
              {p.street} · {districtLabel(p.district)}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${p.name} from the comparison`}
            className="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-p1-text-3 transition-colors hover:bg-p1-subtle hover:text-p1-text"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mt-3 rounded-xl px-3 py-2.5" style={{ background: seriesSoft(slot) }}>
          <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-p1-text-3">Median rent</div>
          <div className="mt-0.5 font-p1display text-[22px] font-bold leading-none tabular-nums text-p1-text">
            {s.medianRent ? sgd(s.medianRent) : <span className="text-[16px] font-semibold text-p1-text-3">Too few contracts</span>}
          </div>
          <div className="mt-1 text-[12px] text-p1-text-3">
            {s.count > 0
              ? `${s.count} contract${s.count === 1 ? '' : 's'}${s.medianPsf ? ` · $${s.medianPsf.toFixed(2)} psf` : ''}`
              : 'Nothing lodged at this unit size'}
          </div>
        </div>

        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-p1-text-2">
          <span>{p.tenure === 'Freehold' ? 'Freehold' : '99-yr'}</span>
          <span>Built {p.built}</span>
          <span>{p.units.toLocaleString('en-SG')} units</span>
          <span className="inline-flex items-center gap-1"><TrainFront size={12} aria-hidden />{p.walkMinutes} min to {p.nearestMrt}</span>
        </p>

        <div className="mt-3 flex-1">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-p1-text-3">What lets here</div>
          {data.mix.length ? (
            <ProportionBar
              caption={`Share of contracts by bedroom count at ${p.name}`}
              height={8}
              legend={false}
              inline={false}
              segments={data.mix.map((m) => ({ key: m.label, label: m.label, value: m.count, slot: MIX_SLOT[m.beds] }))}
            />
          ) : (
            <p className="text-[12px] text-p1-text-3">No contracts at this unit size.</p>
          )}
          {data.mix.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-p1-text-3">
              {data.mix.map((m) => (
                <span key={m.label} className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: seriesColour(MIX_SLOT[m.beds]) }} aria-hidden />
                  {m.label} {Math.round(m.share * 100)}%
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <LinkButton size="sm" variant="ghost" href={`/phase1/market/transactions?project=${encodeURIComponent(p.name)}`} leftIcon={<Ruler size={13} />}>
            {s.count} contracts
          </LinkButton>
        </div>
      </div>
    </article>
  );
}

/** The empty seat, which is also the control that fills it. */
function AddColumn({
  options, onAdd, remaining,
}: {
  options: typeof PROJECTS;
  onAdd: (name: string) => void;
  remaining: number;
}) {
  return (
    <div className="flex w-[264px] shrink-0 flex-col justify-center rounded-2xl border border-dashed border-ins-line-strong bg-ins-inset p-4 sm:w-auto">
      <div className="text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-ins-panel text-p1-text-3 ring-1 ring-ins-line" aria-hidden>
          <Plus size={19} />
        </span>
        <p className="mt-2.5 text-[13.5px] font-semibold text-p1-text">Add a development</p>
        <p className="mt-0.5 text-[12px] leading-4 text-p1-text-3">
          {remaining} more {remaining === 1 ? 'fits' : 'fit'} before it stops being readable.
        </p>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {options.slice(0, 4).map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onAdd(p.name)}
            className={cx(
              'max-w-full cursor-pointer truncate rounded-full border border-ins-line bg-ins-panel px-2.5 py-1.5 text-[11.5px] font-medium text-p1-text-2',
              'transition-colors hover:border-ins-line-strong hover:text-p1-text',
            )}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- table */

interface Row {
  label: string;
  hint?: string;
  value: (d: ProjectInsight) => number | null;
  show: (n: number, d: ProjectInsight) => string;
  /** Draw a bar for the row. Off for years, where a bar from zero is meaningless. */
  bar?: boolean;
}

const ROWS: Row[] = [
  { label: 'Median rent', value: (d) => d.snapshot.medianRent, show: (n) => sgd(n), bar: true },
  { label: 'Rent per sqft', value: (d) => d.snapshot.medianPsf, show: (n) => `$${n.toFixed(2)}`, bar: true },
  { label: 'Typical floor area', value: (d) => d.snapshot.medianSize, show: (n) => `${Math.round(n).toLocaleString('en-SG')} sqft`, bar: true },
  { label: 'Contracts', value: (d) => d.snapshot.count, show: (n) => String(n), bar: true },
  { label: 'Leases per 100 units', hint: 'A year of contracts against the size of the development', value: (d) => d.turnoverPer100, show: (n) => n.toFixed(1), bar: true },
  { label: 'Walk to station', value: (d) => d.project.walkMinutes, show: (n, d) => `${n} min · ${d.project.nearestMrt}`, bar: true },
  { label: 'Completed', value: (d) => d.project.built, show: (n, d) => `${n}${d.age ? ` · ${d.age} yr${d.age === 1 ? '' : 's'}` : ' · new'}` },
  { label: 'Units', value: (d) => d.project.units, show: (n) => n.toLocaleString('en-SG'), bar: true },
];

/**
 * Figure against figure. Each cell carries its bar on the row's own scale and,
 * after the first development, how far it sits from the first — the "by how
 * much" a client asks. No cell is declared the winner: cheaper and closer are
 * not always what the client wants.
 */
function CompareTable({ columns }: { columns: { chosen: Chosen; data: ProjectInsight }[] }) {
  const base = columns[0].data;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13px]" style={{ minWidth: 180 + columns.length * 170 }}>
        <caption className="sr-only">The chosen developments compared figure by figure</caption>
        <thead>
          <tr className="border-b border-ins-line bg-ins-inset">
            <th scope="col" className="w-[180px] px-4 py-2.5 text-[12px] font-medium text-p1-text-3 sm:px-5">Measure</th>
            {columns.map(({ chosen: c }) => (
              <th key={c.name} scope="col" className="px-4 py-2.5 text-[12.5px] font-semibold text-p1-text">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: seriesColour(c.slot) }} aria-hidden />
                  <span className="truncate">{c.name}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ins-line">
          {ROWS.map((r) => {
            const values = columns.map(({ data }) => r.value(data));
            const top = Math.max(0, ...values.map((v) => v ?? 0));
            const first = r.value(base);
            return (
              <tr key={r.label} className="transition-colors hover:bg-ins-inset/60">
                <th scope="row" className="px-4 py-3 align-top font-medium text-p1-text-2 sm:px-5" title={r.hint}>{r.label}</th>
                {columns.map(({ chosen: c, data }, i) => {
                  const v = values[i];
                  const diff = i > 0 && v !== null && first ? Math.round(((v - first) / first) * 1000) / 10 : null;
                  return (
                    <td key={c.name} className="px-4 py-3 align-top">
                      {v === null ? (
                        <span className="text-p1-text-3">Too few contracts</span>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold tabular-nums text-p1-text">{r.show(v, data)}</span>
                            {diff !== null && r.bar && Math.abs(diff) >= 0.1 && (
                              <span className="text-[11.5px] font-medium tabular-nums text-p1-text-3">
                                {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          {r.bar && top > 0 && (
                            <div className="mt-1.5 h-1.5 max-w-[180px] overflow-hidden rounded-full" style={{ background: seriesSoft(c.slot) }}>
                              <div className="ins-grow h-full rounded-full" style={{ width: `${(v / top) * 100}%`, background: seriesColour(c.slot) }} />
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr>
            <th scope="row" className="px-4 py-3 font-medium text-p1-text-2 sm:px-5">Tenure</th>
            {columns.map(({ chosen: c, data }) => (
              <td key={c.name} className="px-4 py-3 font-semibold text-p1-text">{data.project.tenure}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
