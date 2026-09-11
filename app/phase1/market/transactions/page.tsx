"use client";

/**
 * Rental transaction search.
 *
 * The question is always the same and always urgent: a landlord wants 6,500 for
 * a three-bedroom in Martin Modern and the agent has an hour to say whether
 * that is the market. So the screen answers with a median and a spread first,
 * and only then shows the contracts it worked that out from.
 *
 * Every filter narrows the same set, and the statistics recompute from what is
 * left, because a median of a set you cannot see is a number nobody trusts.
 */

import { useMemo, useState } from 'react';
import { LineChart, TrendingUp, Building2, Ruler, Download, Info } from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, Callout, MetricStrip, Metric, DataTable,
  EmptyState, SelectInput, SearchInput, MiniBars, LinkButton, type Column,
} from '../../../../components/phase1/kit';
import { useDemo } from '../../../../lib/phase1/DemoContext';
import { sgd } from '../../../../lib/phase1/data';
import { districtName } from '../../../../lib/phase1/performance';
import {
  MARKET_MONTHS, PROJECTS, TRANSACTIONS, monthLabel, summarise, type Transaction,
} from '../../../../lib/phase1/market';

export default function TransactionsPage() {
  const { state } = useDemo();
  const [project, setProject] = useState('all');
  const [district, setDistrict] = useState('all');
  const [beds, setBeds] = useState('all');
  const [months, setMonths] = useState('12');
  const [query, setQuery] = useState('');

  const districts = useMemo(
    () => [...new Set(PROJECTS.map((p) => p.district))].sort((a, b) => a - b),
    [],
  );

  /* The projects the agent actually has stock in. Putting them at the top of
     the list is the difference between a market tool and a database. */
  const mine = useMemo(
    () => new Set(state.listings.filter((l) => !l.archived).map((l) => l.project)),
    [state.listings],
  );

  const cutoff = MARKET_MONTHS[Math.max(0, MARKET_MONTHS.length - Number(months))];

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRANSACTIONS.filter((t) => {
      if (project !== 'all' && t.project !== project) return false;
      if (district !== 'all' && String(t.district) !== district) return false;
      if (beds !== 'all' && (beds === '4' ? t.bedrooms < 4 : String(t.bedrooms) !== beds)) return false;
      if (t.month < cutoff) return false;
      if (q && !`${t.project} ${t.street}`.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => b.month.localeCompare(a.month) || b.monthlyRent - a.monthlyRent);
  }, [project, district, beds, cutoff, query]);

  const stats = useMemo(() => summarise(rows), [rows]);
  const trend = stats.byMonth.slice(MARKET_MONTHS.length - Number(months));

  /* Movement across the period, measured between the first and last thirds
     rather than between two single months. One month's median in one project
     moves on whichever two units happened to let that month, and reporting
     that as a market movement is how a number nobody believes gets printed. */
  const change = (() => {
    const real = trend.filter(Boolean);
    if (real.length < 4) return null;
    const span = Math.max(1, Math.round(real.length / 3));
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const start = mean(real.slice(0, span));
    const end = mean(real.slice(-span));
    return Math.round(((end - start) / start) * 1000) / 10;
  })();

  const columns: Column<Transaction>[] = [
    { key: 'month', header: 'Lease month', nowrap: true, render: (t) => monthLabel(t.month), sortValue: (t) => t.month },
    {
      key: 'project',
      header: 'Project',
      render: (t) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-p1-text">{t.project}</div>
          <div className="truncate text-[12.5px] text-p1-text-3">{t.street} · D{String(t.district).padStart(2, '0')}</div>
        </div>
      ),
      sortValue: (t) => t.project,
    },
    { key: 'beds', header: 'Beds', align: 'right', nowrap: true, render: (t) => t.bedrooms, sortValue: (t) => t.bedrooms },
    { key: 'size', header: 'Floor area', nowrap: true, hideBelow: 'sm', render: (t) => t.sizeBand, sortValue: (t) => t.sizeSqft },
    { key: 'rent', header: 'Monthly rent', align: 'right', nowrap: true, render: (t) => <span className="font-medium tabular-nums">{sgd(t.monthlyRent)}</span>, sortValue: (t) => t.monthlyRent },
    {
      key: 'psf',
      header: 'Per sqft',
      align: 'right',
      nowrap: true,
      hideBelow: 'md',
      render: (t) => <span className="tabular-nums text-p1-text-2">${(t.monthlyRent / t.sizeSqft).toFixed(2)}</span>,
      sortValue: (t) => t.monthlyRent / t.sizeSqft,
    },
  ];

  const csv = () => {
    const head = ['Lease month', 'Project', 'Street', 'District', 'Bedrooms', 'Floor area', 'Monthly rent (S$)', 'Rent per sqft'];
    const body = rows.map((t) => [
      t.month, t.project, t.street, t.district, t.bedrooms, t.sizeBand, t.monthlyRent,
      (t.monthlyRent / t.sizeSqft).toFixed(2),
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

  return (
    <>
      <PageHeader
        eyebrow="Market data"
        title="Rental transaction search"
        description="What comparable units actually let for, by project, size and lease month. Price a unit from the evidence rather than from what the last agent guessed."
        actions={
          <>
            <LinkButton href="/phase1/market/compare" variant="outline">Compare projects</LinkButton>
            <Button variant="primary" leftIcon={<Download size={16} />} disabled={!rows.length} onClick={csv}>
              Download CSV
            </Button>
          </>
        }
      />

      <MetricStrip className="mb-6" cols={4}>
        <Metric label="Contracts" value={stats.count.toLocaleString('en-SG')} hint={`Last ${months} months`} icon={<Building2 size={15} />} />
        <Metric label="Median rent" value={stats.medianRent ? sgd(stats.medianRent) : '—'} hint={stats.count ? `${sgd(stats.lowRent)} to ${sgd(stats.highRent)}` : 'Nothing matches'} icon={<TrendingUp size={15} />} emphasis />
        <Metric label="Median per sqft" value={stats.medianPsf ? `$${stats.medianPsf.toFixed(2)}` : '—'} hint="A month" icon={<Ruler size={15} />} />
        <Metric
          label="Movement"
          value={change === null ? '—' : `${change > 0 ? '+' : ''}${change}%`}
          tone={change === null ? 'default' : change >= 0 ? 'success' : 'danger'}
          hint="Across the period shown"
          icon={<LineChart size={15} />}
        />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-4 [&>*]:min-w-0">
          <SectionCard title="Narrow it down" icon={<LineChart size={16} />} padding="sm">
            <div className="grid gap-4">
              <SearchInput size="sm" label="Find a project" value={query} onChange={setQuery} placeholder="Project or road" />
              <SelectInput
                label="Project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                options={[
                  { value: 'all', label: 'Every project' },
                  ...[...PROJECTS]
                    .sort((a, b) => Number(mine.has(b.name)) - Number(mine.has(a.name)) || a.name.localeCompare(b.name))
                    .map((p) => ({ value: p.name, label: mine.has(p.name) ? `★ ${p.name}` : p.name })),
                ]}
                hint="A star marks a project you already list in."
              />
              <SelectInput
                label="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                options={[
                  { value: 'all', label: 'Any' },
                  ...districts.map((d) => ({ value: String(d), label: `D${String(d).padStart(2, '0')} ${districtName(d)}` })),
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
              <SelectInput
                label="Period"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                options={[
                  { value: '3', label: 'Last 3 months' },
                  { value: '6', label: 'Last 6 months' },
                  { value: '12', label: 'Last 12 months' },
                ]}
              />
            </div>
          </SectionCard>

          <Callout tone="info" title="Where this comes from" icon={<Info size={17} />}>
            Every private residential lease in Singapore is lodged with URA, and the release is what an agent will
            accept as evidence. The production build reads that feed directly; this prototype stands in for it with
            the same projects, districts and shape of data.
          </Callout>
        </div>

        <div className="grid min-w-0 gap-6 [&>*]:min-w-0">
          {stats.count > 0 && (
            <Card padding="md">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-p1display text-[16.5px] font-bold text-p1-text">Median rent by month</h2>
                <span className="text-[12.5px] text-p1-text-3">
                  {monthLabel(MARKET_MONTHS[MARKET_MONTHS.length - Number(months)])} to {monthLabel(MARKET_MONTHS[MARKET_MONTHS.length - 1])}
                </span>
              </div>
              <MiniBars data={trend} height={92} label="Median monthly rent" highlightLast={1} />
              <div className="mt-2 flex justify-between text-[11.5px] text-p1-text-3">
                <span>{monthLabel(MARKET_MONTHS[MARKET_MONTHS.length - Number(months)])}</span>
                <span>{monthLabel(MARKET_MONTHS[MARKET_MONTHS.length - 1])}</span>
              </div>
            </Card>
          )}

          <SectionCard
            title="Contracts"
            description={`${rows.length.toLocaleString('en-SG')} lodged, newest first.`}
            icon={<Building2 size={16} />}
            padding="none"
          >
            <DataTable
              flush
              columns={columns}
              rows={rows.slice(0, 200)}
              rowKey={(t) => t.id}
              minWidth={760}
              maxHeight={620}
              caption="Rental contracts"
              empty={<EmptyState compact title="Nothing let under those terms" description="Widen the period, the size or the district." />}
            />
            {rows.length > 200 && (
              <p className="border-t border-p1-border px-5 py-3 text-[12.5px] text-p1-text-3">
                Showing the 200 most recent of {rows.length.toLocaleString('en-SG')}. The CSV has all of them.
              </p>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
