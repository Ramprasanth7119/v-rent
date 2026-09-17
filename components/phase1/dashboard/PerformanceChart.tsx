"use client";

/**
 * Listing performance — the one chart on the dashboard.
 *
 * The headline is the sum of what is drawn and the change compares it with
 * the same-length window immediately before, so a reader who adds the chart
 * up gets the headline back. Views are offered only when something counts
 * them: for a real account nothing does yet, so the chart opens on enquiries,
 * which are records, and says plainly that views are not measured rather than
 * drawing a flat line at zero.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Info, LineChart } from 'lucide-react';
import { AreaChart, Delta, Segmented, Tooltip } from '../kit';
import { DashMetric, Range, RANGES, Sources, trafficMeasured, trend } from '../../../lib/phase1/dashboard';
import { CompactSelect, Panel, PanelEmpty } from './parts';
import { CountBars } from './CountBars';

const METRIC_LABEL: Record<DashMetric, string> = { views: 'Views', saves: 'Saves', enquiries: 'Enquiries', viewings: 'Viewings' };
/* Series colour follows the thing counted, as it does on the cards above. */
const METRIC_COLOUR: Record<DashMetric, string> = {
  views: 'var(--p1-primary)',
  saves: 'var(--p1-info)',
  enquiries: 'rgb(139 92 246)', // violet-500, the enquiries accent
  viewings: 'var(--p1-accent)',
};
const RANGE_LABEL: Record<Range, string> = { '7D': 'Last 7 days', '30D': 'Last 30 days', '90D': 'Last 90 days', '12M': 'Last 12 months' };

/**
 * The drawing's own width in CSS pixels, so the chart's text is drawn at the
 * size it is read at rather than scaled down with a fixed canvas.
 */
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

export function PerformanceChart({ src, className = '' }: { src: Sources; className?: string }) {
  const measured = trafficMeasured(src.listings);
  const metrics: DashMetric[] = measured ? ['views', 'enquiries', 'viewings'] : ['enquiries', 'viewings'];
  const [picked, setMetric] = useState<DashMetric>(measured ? 'views' : 'enquiries');
  /* If Demo Data is switched OFF while Views is chosen, fall back to a metric that exists. */
  const metric = metrics.includes(picked) ? picked : metrics[0];
  const [range, setRange] = useState<Range>('30D');
  const [box, width] = useWidth<HTMLDivElement>();
  const narrow = width < 480;

  const t = useMemo(() => trend(src, metric, range), [src, metric, range]);
  const phrase = RANGES[range].phrase;
  const empty = t.total === 0 && t.prevTotal === 0;

  const rangeSelect = (
    <CompactSelect<Range>
      label="Time range"
      value={range}
      onChange={setRange}
      options={(Object.keys(RANGE_LABEL) as Range[]).map((r) => ({ value: r, label: RANGE_LABEL[r] }))}
    />
  );

  return (
    <Panel id="perf-h" title="Listing performance" action={rangeSelect} className={className}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 px-5">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="font-p1display text-[30px] font-bold leading-none tracking-[-0.025em] text-p1-text tabular-nums">
              {t.total.toLocaleString('en-SG')}
            </span>
            {t.changePct !== null && <Delta pct={t.changePct} since={`previous ${phrase}`} />}
          </div>
          <p className="mt-1.5 text-[12px] text-p1-text-3">
            {METRIC_LABEL[metric].toLowerCase()} · {t.prevTotal > 0 ? `${t.prevTotal.toLocaleString('en-SG')} in the ${phrase} before` : `none in the ${phrase} before`}
          </p>
        </div>
        <Segmented<DashMetric>
          label="Metric"
          size="sm"
          value={metric}
          onChange={setMetric}
          options={metrics.map((m) => ({ key: m, label: METRIC_LABEL[m] }))}
        />
      </div>

      <div ref={box} className="relative mt-2 flex flex-1 flex-col justify-end px-2 pb-2">
        {empty ? (
          <PanelEmpty
            icon={<LineChart size={18} />}
            title={`No ${METRIC_LABEL[metric].toLowerCase()} in the last ${phrase}`}
            body={metric === 'viewings' ? 'Booked viewings are counted on the day they take place.' : 'Enquiries appear here the day a tenant writes about a listing.'}
          />
        ) : metric !== 'views' ? (
          <CountBars
            key={`${metric}-${range}`}
            points={t.points}
            labels={t.labels}
            colour={METRIC_COLOUR[metric]}
            label={METRIC_LABEL[metric]}
            height={narrow ? 230 : 290}
          />
        ) : (
          <AreaChart
            key={`${metric}-${range}`}
            height={narrow ? 230 : 290}
            width={width}
            labels={t.labels}
            dots={t.points.length <= 14}
            markPeak
            series={[{ label: METRIC_LABEL[metric], points: t.points, colour: METRIC_COLOUR[metric] }]}
          />
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-p1-border px-5 py-2.5 text-[11.5px] text-p1-text-3">
        {measured ? (
          metric === 'views' ? (
            <Tooltip content="Views are modelled for the demo account. Nothing counts them for a real listing until the tenant site records its own traffic.">
              <span tabIndex={0} className="inline-flex items-center gap-1"><Info size={12} aria-hidden /> Views are modelled for the demo account</span>
            </Tooltip>
          ) : (
            <span>Counted from your {metric === 'enquiries' ? 'enquiry records' : 'viewing diary'}</span>
          )
        ) : (
          <span className="inline-flex items-center gap-1">
            <Info size={12} aria-hidden />
            Views aren&apos;t measured yet. The tenant site doesn&apos;t record traffic, so only enquiries and viewings are shown.
          </span>
        )}
        {RANGES[range].bucket > 1 && <span className="ml-auto">One point per week</span>}
      </footer>
    </Panel>
  );
}
