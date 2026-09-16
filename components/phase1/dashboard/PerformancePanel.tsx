"use client";

/**
 * Portfolio performance — one chart the agent can interrogate.
 *
 * Three metrics and four windows, and every figure on the panel is read from
 * the same series that is drawn: the headline is the sum of what you can see,
 * the change compares it with the window immediately before, and the marked
 * point is the highest bar of the line. A reader who adds up the chart by hand
 * gets the headline back, which is the only reason to put a headline on a
 * chart at all.
 */

import React, { useMemo, useState } from 'react';
import { Info, TrendingUp } from 'lucide-react';
import { AreaChart, Card, EmptyState, Segmented, Tooltip, LinkButton } from '../kit';
import { DemoListing } from '../../../lib/phase1/data';
import { Metric, portfolioSeries } from '../../../lib/phase1/performance';
import { CardHead, Delta } from './parts';

type Window = '7' | '14' | '30' | '90';

const WINDOWS: { key: Window; label: string }[] = [
  { key: '7', label: '7D' }, { key: '14', label: '14D' }, { key: '30', label: '30D' }, { key: '90', label: '90D' },
];

const METRICS: { key: Metric; label: string; tone: 'primary' | 'accent' | 'success' }[] = [
  { key: 'views', label: 'Views', tone: 'primary' },
  { key: 'saves', label: 'Saves', tone: 'accent' },
  { key: 'enquiries', label: 'Enquiries', tone: 'success' },
];

const DAY = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' });

export function PerformancePanel({ listings, today }: { listings: DemoListing[]; today: Date }) {
  const [metric, setMetric] = useState<Metric>('views');
  const [win, setWin] = useState<Window>('14');
  const days = Number(win);
  const live = listings.some((l) => l.status === 'published');

  /* Twice the window, so the comparison is the same arithmetic on the period
     immediately before rather than a second, differently-shaped estimate. */
  const both = useMemo(() => portfolioSeries(listings, metric, days * 2), [listings, metric, days]);
  const series = both.slice(days);
  const before = both.slice(0, days);

  const total = series.reduce((n, v) => n + v, 0);
  const prior = before.reduce((n, v) => n + v, 0);
  const pct = prior ? Math.round(((total - prior) / prior) * 100) : 0;

  const labels = useMemo(
    () => Array.from({ length: days }, (_, i) => DAY.format(new Date(today.getTime() - (days - 1 - i) * 86_400_000))),
    [days, today],
  );

  const def = METRICS.find((m) => m.key === metric)!;
  const round = (n: number) => Math.round(n).toLocaleString('en-SG');
  const period = days === 7 ? '7 days' : days === 14 ? '14 days' : days === 30 ? '30 days' : '90 days';

  return (
    <Card padding="none" as="section" aria-labelledby="perf-h" className="overflow-hidden">
      <div className="p-5">
        <CardHead
          id="perf-h"
          title="Portfolio performance"
          sub={`Across every live listing · last ${period}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<Metric> label="Metric" size="sm" value={metric} onChange={setMetric} options={METRICS.map((m) => ({ key: m.key, label: m.label }))} />
            <Segmented<Window> label="Time range" size="sm" value={win} onChange={setWin} options={WINDOWS} />
          </div>
        </CardHead>

        <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
          <span className="font-p1display text-[34px] font-bold leading-none tracking-[-0.025em] text-p1-text tabular-nums">
            {round(total)}
          </span>
          <Delta pct={pct} since={`previous ${period}`} className="mb-1" />
          <span className="mb-1 text-[12.5px] text-p1-text-3">
            {def.label.toLowerCase()} · {prior ? `${round(prior)} in the ${period} before` : `nothing recorded in the ${period} before`}
          </span>
          <Tooltip content="Views, saves and enquiries are modelled from each listing until the tenant site has recorded its own traffic.">
            <span tabIndex={0} className="mb-1 ml-auto inline-flex items-center gap-1 rounded-md bg-p1-subtle px-1.5 py-0.5 text-[11px] font-medium text-p1-text-3">
              <Info size={10.5} aria-hidden /> Modelled
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="px-2 pb-3">
        {live ? (
          <AreaChart
            key={`${metric}-${win}`}
            height={236}
            labels={labels}
            dots={days <= 14}
            markPeak={days <= 30}
            series={[{ label: def.label, points: series, tone: def.tone }]}
            valueLabel={(n) => (metric === 'views' ? round(n) : String(Math.round(n * 10) / 10))}
          />
        ) : (
          <EmptyState
            icon={<TrendingUp size={22} />}
            title="No live listings yet"
            description="Performance appears the day your first listing goes live on the tenant site."
            action={<LinkButton href="/phase1/listings/new" size="sm">Create a listing</LinkButton>}
          />
        )}
      </div>
    </Card>
  );
}
