"use client";

/**
 * Project comparison.
 *
 * A tenant deciding between two developments and a landlord arguing about rent
 * are asking the same question in different words: how does this one stand
 * against that one. The comparison is worth building only if it puts the
 * numbers on the same row — age, size, what it lets for, what that is per
 * square foot — because that is the part an agent otherwise does in their head
 * and gets wrong under pressure.
 *
 * Three columns at most. A fourth turns the table into a spreadsheet and
 * nobody reads it.
 */

import React, { useMemo, useState } from 'react';
import {
  GitCompareArrows, Plus, X, TrainFront, CalendarDays, Ruler, TrendingUp, Info, Printer,
} from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, Callout, EmptyState, SelectInput,
  MiniBars, LinkButton, cx,
} from '../../../../components/phase1/kit';
import { sgd } from '../../../../lib/phase1/data';
import { districtName } from '../../../../lib/phase1/performance';
import {
  MARKET_MONTHS, PROJECTS, TRANSACTIONS, monthLabel, summarise,
  type MarketSummary, type Project,
} from '../../../../lib/phase1/market';

const MAX = 3;

interface Column {
  project: Project;
  stats: MarketSummary;
  contracts: number;
}

interface RowProps {
  label: string;
  icon?: React.ReactNode;
  render: (r: Column) => React.ReactNode;
  winner?: string | null;
  rows: Column[];
}

/**
 * One row of the comparison, with the better cell on that row shaded. Defined
 * here rather than inside the page so React sees the same component type on
 * every render and does not throw the table away each time a filter changes.
 */
function ComparisonRow({ label, icon, render, winner, rows }: RowProps) {
  return (
    <tr className="border-b border-p1-border last:border-b-0">
      <th scope="row" className="whitespace-nowrap px-4 py-3 text-left align-middle text-[13px] font-semibold text-p1-text-2">
        <span className="inline-flex items-center gap-2">{icon}{label}</span>
      </th>
      {rows.map((r) => (
        <td
          key={r.project.name}
          className={cx(
            'px-4 py-3 align-middle text-[14px] text-p1-text',
            winner === r.project.name && 'bg-p1-success-soft/60 font-semibold',
          )}
        >
          {render(r)}
        </td>
      ))}
    </tr>
  );
}

export default function ComparePage() {
  const [chosen, setChosen] = useState<string[]>([PROJECTS[4].name, PROJECTS[7].name]);
  const [beds, setBeds] = useState('all');

  const add = (name: string) => {
    if (!name || chosen.includes(name) || chosen.length >= MAX) return;
    setChosen([...chosen, name]);
  };

  const rows = useMemo(() => chosen.map((name) => {
    const p = PROJECTS.find((x) => x.name === name)!;
    const contracts = TRANSACTIONS.filter((t) => {
      if (t.project !== name) return false;
      if (beds !== 'all' && (beds === '4' ? t.bedrooms < 4 : String(t.bedrooms) !== beds)) return false;
      return true;
    });
    return { project: p, stats: summarise(contracts), contracts: contracts.length };
  }), [chosen, beds]);

  /* The winner on each row, so an agent can read the table at a glance rather
     than comparing six numbers by eye. Cheapest wins on rent; newest on age. */
  const best = useMemo(() => {
    if (rows.length < 2) return {} as Record<string, string>;
    const pick = (key: string, value: (r: typeof rows[number]) => number, want: 'low' | 'high') => {
      const valid = rows.filter((r) => value(r) > 0);
      if (!valid.length) return null;
      const sorted = [...valid].sort((a, b) => (want === 'low' ? value(a) - value(b) : value(b) - value(a)));
      return sorted[0].project.name;
    };
    return {
      rent: pick('rent', (r) => r.stats.medianRent, 'low'),
      psf: pick('psf', (r) => r.stats.medianPsf, 'low'),
      built: pick('built', (r) => r.project.built, 'high'),
      walk: pick('walk', (r) => r.project.walkMinutes, 'low'),
    } as Record<string, string>;
  }, [rows]);

  const available = PROJECTS.filter((p) => !chosen.includes(p.name));

  return (
    <>
      <PageHeader
        eyebrow="Market data"
        title="Project comparison"
        description="Two or three developments on the same rows — age, size, what they let for and what that is per square foot — so the answer is read rather than worked out."
        actions={
          <>
            <LinkButton href="/phase1/market/transactions" variant="outline">Transaction search</LinkButton>
            <Button variant="primary" leftIcon={<Printer size={16} />} disabled={rows.length < 2} onClick={() => window.print()}>
              Print the comparison
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <SelectInput
          label="Add a project"
          value=""
          onChange={(e) => add(e.target.value)}
          disabled={chosen.length >= MAX}
          containerClassName="w-[320px] max-w-full"
          hint={chosen.length >= MAX ? `Three is the most that stays readable. Remove one first.` : undefined}
          options={[
            { value: '', label: chosen.length >= MAX ? 'Three already chosen' : 'Choose a project…' },
            ...available.map((p) => ({ value: p.name, label: `${p.name} — D${String(p.district).padStart(2, '0')}` })),
          ]}
        />
        <SelectInput
          label="Unit size"
          value={beds}
          onChange={(e) => setBeds(e.target.value)}
          containerClassName="w-[200px] max-w-full"
          hint="Comparing all sizes at once flatters the project with more small units."
          options={[
            { value: 'all', label: 'Every size' },
            { value: '1', label: '1 bedroom' },
            { value: '2', label: '2 bedrooms' },
            { value: '3', label: '3 bedrooms' },
            { value: '4', label: '4 or more' },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <SectionCard title="Nothing to compare" icon={<GitCompareArrows size={16} />}>
          <EmptyState
            icon={<GitCompareArrows size={22} />}
            title="Choose two projects"
            description="Add them above and they appear side by side with their rental history."
          />
        </SectionCard>
      ) : (
        <div className="grid gap-6">
          {/* --------------------------------------------------- the columns */}
          <Card padding="none" className="overflow-x-auto">
            <table className="w-full border-collapse text-left" style={{ minWidth: 640 }}>
              <thead>
                <tr className="border-b-2 border-p1-border">
                  <th className="w-[180px] px-4 py-4" />
                  {rows.map((r) => (
                    <th key={r.project.name} className="px-4 py-4 align-top">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-p1display text-[16px] font-bold leading-tight text-p1-text">{r.project.name}</div>
                          <div className="mt-0.5 text-[12.5px] font-normal text-p1-text-3">
                            {r.project.street} · D{String(r.project.district).padStart(2, '0')} {districtName(r.project.district)}
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${r.project.name}`}
                          onClick={() => setChosen(chosen.filter((c) => c !== r.project.name))}
                          className="shrink-0 cursor-pointer rounded-md p-1 text-p1-text-3 hover:bg-p1-subtle hover:text-p1-text"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ComparisonRow
                  rows={rows}
                  label="Median rent"
                  icon={<TrendingUp size={14} />}
                  winner={best.rent}
                  render={(r) => (r.stats.medianRent ? (
                    <span className="font-p1display text-[18px] tabular-nums">{sgd(r.stats.medianRent)}</span>
                  ) : <span className="text-p1-text-3">No contracts</span>)}
                />
                <ComparisonRow
                  rows={rows}
                  label="Per square foot"
                  icon={<Ruler size={14} />}
                  winner={best.psf}
                  render={(r) => (r.stats.medianPsf ? <span className="tabular-nums">${r.stats.medianPsf.toFixed(2)}</span> : '—')}
                />
                <ComparisonRow
                  rows={rows}
                  label="Rent range"
                  render={(r) => (r.stats.count
                    ? <span className="tabular-nums text-p1-text-2">{sgd(r.stats.lowRent)} – {sgd(r.stats.highRent)}</span>
                    : '—')}
                />
                <ComparisonRow
                  rows={rows}
                  label="Contracts lodged"
                  render={(r) => <span className="tabular-nums">{r.contracts}</span>}
                />
                <ComparisonRow
                  rows={rows}
                  label="Completed"
                  icon={<CalendarDays size={14} />}
                  winner={best.built}
                  render={(r) => <span className="tabular-nums">{r.project.built}</span>}
                />
                <ComparisonRow rows={rows} label="Tenure" render={(r) => r.project.tenure} />
                <ComparisonRow rows={rows} label="Units" render={(r) => <span className="tabular-nums">{r.project.units.toLocaleString('en-SG')}</span>} />
                <ComparisonRow
                  rows={rows}
                  label="Nearest MRT"
                  icon={<TrainFront size={14} />}
                  winner={best.walk}
                  render={(r) => (
                    <span>
                      {r.project.nearestMrt}
                      <span className="ml-1.5 text-[12.5px] text-p1-text-3">{r.project.walkMinutes} min walk</span>
                    </span>
                  )}
                />
                <ComparisonRow
                  rows={rows}
                  label="Twelve months"
                  render={(r) => (r.stats.count ? (
                    <MiniBars data={r.stats.byMonth} height={44} label={`Median rent at ${r.project.name}`} highlightLast={1} />
                  ) : <span className="text-p1-text-3">—</span>)}
                />
              </tbody>
            </table>
          </Card>

          {rows.length >= 2 && (
            <Callout tone="success" title="Read across" icon={<GitCompareArrows size={17} />}>
              The shaded cell is the better number on that row — cheaper on rent and per square foot, newer on
              completion, closer on the walk to the station. Better is not the same as right for a client: a newer
              project at a higher rent is the correct answer for somebody who is moving in next week.
            </Callout>
          )}

          <div className="flex flex-wrap gap-2">
            {available.slice(0, 6).map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => add(p.name)}
                disabled={chosen.length >= MAX}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-p1-border bg-p1-surface px-3.5 py-2 text-[12.5px] font-medium text-p1-text-2 transition-colors hover:border-p1-border-strong hover:text-p1-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={13} aria-hidden />
                {p.name}
              </button>
            ))}
          </div>

          <p className="flex items-start gap-2 text-[12.5px] leading-5 text-p1-text-3">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
            Figures cover the twelve months to {monthLabel(MARKET_MONTHS[MARKET_MONTHS.length - 1])}. In production
            they come from URA&rsquo;s lodged rental contracts.
          </p>
        </div>
      )}
    </>
  );
}
