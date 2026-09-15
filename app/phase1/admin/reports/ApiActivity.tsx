"use client";

/**
 * The API activity log.
 *
 * Written for an operations officer rather than an engineer. Endpoints are
 * named for what they do, status codes collapse into five outcomes in plain
 * words, and "Refused" is kept apart from "Failed" because a 404 from the
 * operations console is the console working correctly. The filters are the
 * questions somebody arrives with — what is failing, what is slow, who did
 * this — and every figure and chart on the tab follows them.
 *
 * The rows are real: every API handler is wrapped by `logged()`.
 */

import { useMemo, useState } from 'react';
import { Activity, Download, Gauge, RotateCcw, SlidersHorizontal, Timer, TriangleAlert, Zap } from 'lucide-react';
import {
  AreaChart, Button, Card, DataTable, Donut, EmptyState, KPI, Pagination, SearchInput, SectionCard, SelectMenu, Tooltip, cx,
  usePagination, type Column,
} from '../../../../components/phase1/kit';
import { Drawer } from '../../../../components/phase1/overlays';
import { Pill } from '../../../../components/phase1/status';
import { sgRelative, sgStamp } from '../../../../lib/phase1/format';
import {
  ENDPOINTS, OUTCOME, ROLE_LABEL, SLOW_MS, endpointArea, endpointLabel, outcomeOf, type Outcome, type RequestRow,
} from '../../../../lib/phase1/reqlog-labels';
import { DetailRow, QuickFilters, downloadCsv } from '../../../../components/phase1/admin/reports/parts';

const WINDOWS = [
  { value: '15m', label: 'Last 15 minutes', ms: 15 * 60_000 },
  { value: '1h', label: 'Last hour', ms: 3_600_000 },
  { value: '24h', label: 'Last 24 hours', ms: 86_400_000 },
  { value: '7d', label: 'Last 7 days', ms: 7 * 86_400_000 },
  { value: 'all', label: 'Everything logged', ms: Infinity },
];

const METHOD_TONE: Record<string, string> = {
  GET: 'bg-p1-subtle text-p1-text-2',
  POST: 'bg-p1-primary-soft text-p1-primary',
  PATCH: 'bg-p1-info-soft text-p1-info',
  PUT: 'bg-p1-info-soft text-p1-info',
  DELETE: 'bg-p1-danger-soft text-p1-danger',
};

const OUTCOME_COLOUR: Record<Outcome, string> = {
  ok: 'var(--p1-success)',
  refused: 'color-mix(in srgb, var(--p1-text-3) 60%, var(--p1-surface))',
  invalid: 'var(--p1-warning)',
  limited: 'var(--p1-info)',
  failed: 'var(--p1-danger)',
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={cx('inline-flex h-[22px] w-[58px] shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold', METHOD_TONE[method] ?? 'bg-p1-subtle text-p1-text-2')}>
      {method}
    </span>
  );
}

function StatusCell({ status }: { status: number }) {
  const o = outcomeOf(status);
  return (
    <Tooltip content={OUTCOME[o].hint}>
      <span tabIndex={0} className="inline-flex items-center gap-2 whitespace-nowrap">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: OUTCOME_COLOUR[o] }} aria-hidden />
        <span className="font-mono text-[12.5px] tabular-nums text-p1-text">{status}</span>
        <span className="text-[12.5px] text-p1-text-3">{OUTCOME[o].label}</span>
      </span>
    </Tooltip>
  );
}

const caller = (r: RequestRow) => (r.role === 'anonymous' || !r.role ? 'Signed out' : (r.actor ?? ROLE_LABEL[r.role]));

export default function ApiActivity({ rows, now }: { rows: RequestRow[]; now: string }) {
  const nowDate = useMemo(() => new Date(now), [now]);

  const [win, setWin] = useState('24h');
  const [outcome, setOutcome] = useState<'any' | Outcome | 'problem'>('any');
  const [method, setMethod] = useState('any');
  const [area, setArea] = useState('any');
  const [route, setRoute] = useState('any');
  const [who, setWho] = useState('any');
  const [slowOnly, setSlowOnly] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<RequestRow | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const windowMs = WINDOWS.find((w) => w.value === win)?.ms ?? Infinity;
  const windowLabel = WINDOWS.find((w) => w.value === win)!.label;

  const inWindow = useMemo(() => rows.filter((r) => nowDate.getTime() - new Date(r.at).getTime() <= windowMs), [rows, windowMs, nowDate]);

  const routes = useMemo(() => [...new Set(inWindow.map((r) => r.route))].sort((a, b) => endpointLabel(a).localeCompare(endpointLabel(b))), [inWindow]);
  const methods = useMemo(() => [...new Set(inWindow.map((r) => r.method))].sort(), [inWindow]);
  const actors = useMemo(() => [...new Set(inWindow.map((r) => r.actor).filter(Boolean) as string[])].sort(), [inWindow]);
  const areas = useMemo(() => [...new Set(inWindow.map((r) => endpointArea(r.route)).filter(Boolean) as string[])].sort(), [inWindow]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return inWindow.filter((r) => {
      const o = outcomeOf(r.status);
      if (outcome === 'problem' && o !== 'failed' && o !== 'invalid' && o !== 'limited') return false;
      if (outcome !== 'any' && outcome !== 'problem' && o !== outcome) return false;
      if (method !== 'any' && r.method !== method) return false;
      if (area !== 'any' && endpointArea(r.route) !== area) return false;
      if (route !== 'any' && r.route !== route) return false;
      if (who === 'staff' && r.role !== 'admin') return false;
      if (who === 'agents' && r.role !== 'agent') return false;
      if (who === 'anon' && r.role !== 'anonymous') return false;
      if (who.startsWith('actor:') && r.actor !== who.slice(6)) return false;
      if (slowOnly && r.ms < SLOW_MS) return false;
      if (needle && !`${r.path} ${endpointLabel(r.route)} ${r.actor ?? ''} ${r.status}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [inWindow, outcome, method, area, route, who, slowOnly, q]);

  const stats = useMemo(() => {
    const ms = [...filtered.map((r) => r.ms)].sort((a, b) => a - b);
    const pick = (p: number) => (ms.length ? ms[Math.min(ms.length - 1, Math.ceil((p / 100) * ms.length) - 1)] : 0);
    const failed = filtered.filter((r) => outcomeOf(r.status) === 'failed').length;
    return {
      total: filtered.length,
      failed,
      errorRate: filtered.length ? Math.round((failed / filtered.length) * 1000) / 10 : 0,
      slow: filtered.filter((r) => r.ms >= SLOW_MS).length,
      p50: pick(50),
      p95: pick(95),
      external: filtered.filter((r) => ENDPOINTS[r.route]?.external).length,
    };
  }, [filtered]);

  const outcomeSlices = useMemo(() => {
    const counts = new Map<Outcome, number>();
    for (const r of filtered) counts.set(outcomeOf(r.status), (counts.get(outcomeOf(r.status)) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([o, value]) => ({ label: OUTCOME[o].label, value, colour: OUTCOME_COLOUR[o] }));
  }, [filtered]);

  /** Buckets sized to the window, so the shape is readable at every zoom. */
  const trend = useMemo(() => {
    const buckets = 24;
    const span = windowMs === Infinity
      ? Math.max(3_600_000, nowDate.getTime() - new Date(rows[rows.length - 1]?.at ?? now).getTime())
      : windowMs;
    const size = span / buckets;
    const labels: string[] = [];
    const all: number[] = [];
    const bad: number[] = [];
    for (let i = buckets - 1; i >= 0; i -= 1) {
      const from = nowDate.getTime() - (i + 1) * size;
      const to = nowDate.getTime() - i * size;
      const slice = filtered.filter((r) => { const t = new Date(r.at).getTime(); return t >= from && t < to; });
      labels.push(new Intl.DateTimeFormat('en-SG', {
        timeZone: 'Asia/Singapore',
        ...(size < 3_600_000 ? { hour: '2-digit', minute: '2-digit' } : size < 86_400_000 ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' }),
        hour12: false,
      }).format(new Date(to)));
      all.push(slice.length);
      bad.push(slice.filter((r) => outcomeOf(r.status) === 'failed').length);
    }
    return { labels, all, bad };
  }, [filtered, windowMs, nowDate, rows, now]);

  const byRoute = useMemo(() => {
    const map = new Map<string, RequestRow[]>();
    for (const r of filtered) map.set(r.route, [...(map.get(r.route) ?? []), r]);
    return [...map.entries()]
      .map(([key, list]) => {
        const ms = [...list.map((r) => r.ms)].sort((a, b) => a - b);
        return {
          route: key,
          count: list.length,
          failed: list.filter((r) => outcomeOf(r.status) === 'failed').length,
          p95: ms.length ? ms[Math.min(ms.length - 1, Math.ceil(0.95 * ms.length) - 1)] : 0,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [filtered]);

  const columns: Column<RequestRow>[] = [
    {
      key: 'at', header: 'When', nowrap: true, width: '110px',
      render: (r) => <Tooltip content={sgStamp(r.at)}><span tabIndex={0} className="text-[12.5px] tabular-nums text-p1-text-3">{sgRelative(r.at, nowDate)}</span></Tooltip>,
    },
    { key: 'method', header: 'Method', nowrap: true, width: '84px', render: (r) => <MethodBadge method={r.method} /> },
    {
      key: 'endpoint', header: 'Endpoint',
      render: (r) => (
        <span className="block min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-[13.5px] font-medium text-p1-text">{endpointLabel(r.route)}</span>
            {ENDPOINTS[r.route]?.external && <span className="shrink-0 rounded bg-p1-subtle px-1.5 py-px text-[11px] text-p1-text-3">via {ENDPOINTS[r.route]!.external}</span>}
          </span>
          <span className="block max-w-[360px] truncate font-mono text-[11.5px] text-p1-text-3">{r.path}</span>
        </span>
      ),
    },
    { key: 'status', header: 'Status', nowrap: true, render: (r) => <StatusCell status={r.status} /> },
    {
      key: 'ms', header: 'Latency', align: 'right', nowrap: true,
      render: (r) => <span className={cx('text-[13px] tabular-nums', r.ms >= SLOW_MS ? 'font-semibold text-p1-warning' : 'text-p1-text-2')}>{r.ms.toLocaleString('en-SG')} ms</span>,
    },
    { key: 'who', header: 'Caller', hideBelow: 'xl', render: (r) => <span className="block max-w-[180px] truncate text-[12.5px] text-p1-text-3">{caller(r)}</span> },
  ];

  const pg = usePagination(filtered, 25);

  const activeFilters = [outcome !== 'any', method !== 'any', area !== 'any', route !== 'any', who !== 'any', slowOnly, q.trim() !== ''].filter(Boolean).length;
  const reset = () => { setOutcome('any'); setMethod('any'); setArea('any'); setRoute('any'); setWho('any'); setSlowOnly(false); setQ(''); pg.setPage(1); };
  const touch = () => pg.setPage(1);

  const csv = () => downloadCsv(`v-rent-api-activity-${win}.csv`, ['When', 'Method', 'Endpoint', 'Path', 'Status', 'Outcome', 'Milliseconds', 'Who', 'Role'],
    filtered.map((r) => [r.at, r.method, endpointLabel(r.route), r.path, r.status, OUTCOME[outcomeOf(r.status)].label, r.ms, r.actor ?? '', ROLE_LABEL[r.role ?? 'anonymous']]));

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Activity size={22} />} title="No API calls recorded yet" description="Every handler is logged, so this fills the moment anybody uses the product." />
      </Card>
    );
  }

  const problems = inWindow.filter((r) => { const o = outcomeOf(r.status); return o === 'failed' || o === 'invalid' || o === 'limited'; }).length;

  return (
    <div className="grid gap-5">
      {/* ------------------------------------------------------------ filters */}
      <Card padding="none" as="section" aria-label="Filters">
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <SelectMenu variant="button" hideLabel label="Time window" value={win} onChange={(v) => { setWin(v); touch(); }}
                options={WINDOWS.map((w) => ({ value: w.value, label: w.label }))} className="w-[190px] [&>button]:h-9" />
              <QuickFilters
                label="Show"
                options={[
                  { key: 'any', label: 'Everything', on: outcome === 'any' && !slowOnly, onSelect: () => { setOutcome('any'); setSlowOnly(false); touch(); } },
                  { key: 'problem', label: 'Problems', count: problems, on: outcome === 'problem', onSelect: () => { setOutcome('problem'); setSlowOnly(false); touch(); } },
                  { key: 'failed', label: 'Failed', on: outcome === 'failed', onSelect: () => { setOutcome('failed'); setSlowOnly(false); touch(); } },
                  { key: 'slow', label: `Slower than ${SLOW_MS} ms`, on: slowOnly, onSelect: () => { setSlowOnly(!slowOnly); touch(); } },
                  { key: 'limited', label: 'Rate limited', on: outcome === 'limited', onSelect: () => { setOutcome('limited'); setSlowOnly(false); touch(); } },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" leftIcon={<SlidersHorizontal size={14} />} onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen} className="sm:hidden">
                Filters{activeFilters > 0 ? ` · ${activeFilters}` : ''}
              </Button>
              {activeFilters > 0 && <Button size="sm" variant="ghost" leftIcon={<RotateCcw size={14} />} onClick={reset}>Reset</Button>}
              <Button size="sm" variant="outline" leftIcon={<Download size={14} />} disabled={!filtered.length} onClick={csv}>Export CSV</Button>
            </div>
          </div>
          <div className={cx(moreOpen ? 'grid' : 'hidden sm:grid', 'gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]')}>
            <SearchInput size="sm" label="Search calls" value={q} onChange={(v) => { setQ(v); touch(); }} placeholder="Path, endpoint, email or status" className="sm:col-span-2 lg:col-span-1" />
            <SelectMenu variant="button" hideLabel label="Part of the product" value={area} onChange={(v) => { setArea(v); setRoute('any'); touch(); }}
              options={[{ value: 'any', label: 'All areas' }, ...areas.map((a) => ({ value: a, label: a }))]} className="[&>button]:h-10" />
            <SelectMenu variant="button" hideLabel label="Endpoint" value={route} onChange={(v) => { setRoute(v); touch(); }}
              options={[{ value: 'any', label: 'Any endpoint' }, ...routes.filter((r) => area === 'any' || endpointArea(r) === area).map((r) => ({ value: r, label: endpointLabel(r), hint: r }))]} className="[&>button]:h-10" />
            <SelectMenu variant="button" hideLabel label="Who called it" value={who} onChange={(v) => { setWho(v); touch(); }}
              options={[{ value: 'any', label: 'Any caller' }, { value: 'agents', label: 'Agents' }, { value: 'staff', label: 'Staff' }, { value: 'anon', label: 'Signed out' }, ...actors.map((a) => ({ value: `actor:${a}`, label: a }))]} className="[&>button]:h-10" />
            <SelectMenu variant="button" hideLabel label="Method" value={method} onChange={(v) => { setMethod(v); touch(); }}
              options={[{ value: 'any', label: 'Any method' }, ...methods.map((m) => ({ value: m, label: m }))]} className="[&>button]:h-10" />
          </div>
        </div>
      </Card>

      {/* ---------------------------------------------------------------- KPIs */}
      <section aria-label="API at a glance" className="vr-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="Calls" value={stats.total} compact icon={<Activity size={16} />} sub={windowLabel} spark={trend.all.some(Boolean) ? { data: trend.all } : undefined} className="max-sm:[&>div:last-child>svg]:hidden" />
        <KPI label="Error rate" value={stats.errorRate} decimals={1} suffix="%" icon={<TriangleAlert size={16} />} tone={stats.failed ? 'danger' : 'default'} sub={stats.failed ? `${stats.failed} failed on our side` : 'Nothing broke'} spark={stats.failed ? { data: trend.bad, tone: 'danger' } : undefined} className="max-sm:[&>div:last-child>svg]:hidden" />
        <KPI label="Median latency" value={stats.p50} suffix=" ms" icon={<Zap size={16} />} sub={`p95 ${stats.p95.toLocaleString('en-SG')} ms`} />
        <KPI label="Slow calls" value={stats.slow} icon={<Timer size={16} />} tone={stats.slow ? 'warning' : 'default'} sub={`Over ${SLOW_MS} ms · ${stats.external} external`} />
      </section>

      {/* -------------------------------------------------------------- charts */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SectionCard title="Traffic" description={windowLabel}>
          {stats.total === 0 ? (
            <EmptyState compact title="No calls in this view" description="Widen the window or clear a filter." />
          ) : (
            <AreaChart height={220} labels={trend.labels} series={[{ label: 'Calls', points: trend.all, tone: 'primary' }, { label: 'Failures', points: trend.bad, tone: 'danger' }]} valueLabel={(n) => String(Math.round(n))} />
          )}
        </SectionCard>

        <SectionCard
          title="Outcomes"
          description="How calls ended"
          actions={<Tooltip content="Refused means not signed in or not allowed — the console declining to identify itself, not a fault."><span tabIndex={0} className="text-[12.5px] text-p1-text-3 underline decoration-dotted underline-offset-4">What is refused?</span></Tooltip>}
        >
          {outcomeSlices.length === 0 ? (
            <EmptyState compact title="Nothing to chart" description="No calls match these filters." />
          ) : (
            <Donut
              slices={outcomeSlices}
              size={136}
              thickness={18}
              centre={<>
                <span className="text-[21px] font-semibold leading-none tabular-nums text-p1-text">{stats.total ? Math.round(((stats.total - stats.failed) / stats.total) * 100) : 100}%</span>
                <span className="mt-0.5 text-[11px] text-p1-text-3">no fault</span>
              </>}
            />
          )}
        </SectionCard>
      </div>

      {/* --------------------------------------------------- busiest endpoints */}
      {byRoute.length > 0 && (
        <SectionCard title="Busiest endpoints" description="Where the traffic and the slowness are" padding="none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[13.5px]">
              <caption className="sr-only">Busiest endpoints</caption>
              <thead>
                <tr className="border-b border-p1-border text-[12px] text-p1-text-3">
                  <th scope="col" className="w-10 px-5 py-2.5 font-medium">#</th>
                  <th scope="col" className="py-2.5 pr-4 font-medium">Endpoint</th>
                  <th scope="col" className="py-2.5 pr-4 font-medium">Share of calls</th>
                  <th scope="col" className="py-2.5 pr-4 text-right font-medium">Calls</th>
                  <th scope="col" className="py-2.5 pr-4 text-right font-medium">Failed</th>
                  <th scope="col" className="py-2.5 pr-5 text-right font-medium">p95</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-p1-border">
                {byRoute.map((r, i) => {
                  const peak = Math.max(1, byRoute[0].count);
                  return (
                    <tr key={r.route} className="cursor-pointer transition-colors hover:bg-p1-subtle/60" onClick={() => { setRoute(r.route); setArea('any'); touch(); }}>
                      <td className="px-5 py-3 text-[12.5px] tabular-nums text-p1-text-3">{i + 1}</td>
                      <td className="py-3 pr-4">
                        <span className="block truncate font-medium text-p1-text">{endpointLabel(r.route)}</span>
                        <span className="block truncate font-mono text-[11.5px] text-p1-text-3">{r.route}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="block h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-p1-subtle">
                          <span className={cx('vr-grow block h-full rounded-full', r.failed ? 'bg-p1-danger' : 'bg-p1-primary')} style={{ width: `${(r.count / peak) * 100}%`, animationDelay: `${i * 50}ms` }} />
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold tabular-nums text-p1-text">{r.count.toLocaleString('en-SG')}</td>
                      <td className={cx('py-3 pr-4 text-right tabular-nums', r.failed ? 'font-semibold text-p1-danger' : 'text-p1-text-3')}>{r.failed}</td>
                      <td className={cx('py-3 pr-5 text-right tabular-nums', r.p95 >= SLOW_MS ? 'font-semibold text-p1-warning' : 'text-p1-text-2')}>{r.p95.toLocaleString('en-SG')} ms</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ---------------------------------------------------------------- log */}
      <SectionCard
        title="Request log"
        description={`${filtered.length.toLocaleString('en-SG')} of ${inWindow.length.toLocaleString('en-SG')} calls, newest first`}
        actions={<Tooltip content="Method, endpoint, status, duration and the signed-in account are kept. Request bodies, query strings and headers are not."><span tabIndex={0} className="inline-flex items-center gap-1 text-[12.5px] text-p1-text-3"><Gauge size={13} aria-hidden /> What is logged</span></Tooltip>}
        padding="none"
      >
        {filtered.length === 0 ? (
          <EmptyState compact title="No calls match" description="Widen the window or clear a filter." action={<Button size="sm" variant="outline" leftIcon={<RotateCcw size={14} />} onClick={reset}>Reset filters</Button>} />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable flush dense columns={columns} rows={pg.slice} rowKey={(r) => r.id} onRowClick={setOpen} selected={(r) => open?.id === r.id} minWidth={720} caption="API request log" />
            </div>
            <ul className="divide-y divide-p1-border md:hidden">
              {pg.slice.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpen(r)} className="flex w-full cursor-pointer flex-col gap-1.5 px-4 py-3 text-left hover:bg-p1-subtle/60">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2"><MethodBadge method={r.method} /><span className="truncate text-[13.5px] font-medium text-p1-text">{endpointLabel(r.route)}</span></span>
                      <span className="shrink-0 text-[12px] tabular-nums text-p1-text-3">{sgRelative(r.at, nowDate)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <StatusCell status={r.status} />
                      <span className={cx('text-[12.5px] tabular-nums', r.ms >= SLOW_MS ? 'font-semibold text-p1-warning' : 'text-p1-text-3')}>{r.ms} ms</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-p1-border px-4 py-3 sm:px-5">
              <Pagination page={pg.page} pages={Math.min(pg.pages, 999)} onChange={pg.setPage} from={pg.from} to={pg.to} total={pg.total} noun="calls" />
            </div>
          </>
        )}
      </SectionCard>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? endpointLabel(open.route) : ''}
        description={open ? sgStamp(open.at) : undefined}
        footer={<Button variant="outline" onClick={() => setOpen(null)}>Close</Button>}
      >
        {open && (() => {
          const o = outcomeOf(open.status);
          return (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <MethodBadge method={open.method} />
                <Pill tone={OUTCOME[o].tone}>{OUTCOME[o].label}</Pill>
                {open.ms >= SLOW_MS && <Pill tone="warning">Slow</Pill>}
              </div>
              <p className="mt-3 text-[13.5px] leading-5 text-p1-text-2">{OUTCOME[o].hint}</p>
              <dl className="mt-4 divide-y divide-p1-border">
                <DetailRow label="Path" mono>{open.path}</DetailRow>
                <DetailRow label="Route" mono>{open.route}</DetailRow>
                <DetailRow label="Status" mono>{open.status}</DetailRow>
                <DetailRow label="Duration">{open.ms.toLocaleString('en-SG')} ms{open.ms >= SLOW_MS ? ` — over the ${SLOW_MS} ms threshold` : ''}</DetailRow>
                <DetailRow label="Signed in as">{open.actor ?? 'Nobody'}</DetailRow>
                <DetailRow label="Role">{ROLE_LABEL[open.role ?? 'anonymous']}</DetailRow>
                {ENDPOINTS[open.route]?.external && <DetailRow label="Calls out to">{ENDPOINTS[open.route]!.external}</DetailRow>}
                {open.error && <DetailRow label="Error" mono><span className="text-p1-danger">{open.error}</span></DetailRow>}
                <DetailRow label="When">{sgStamp(open.at)} · {sgRelative(open.at, nowDate)}</DetailRow>
              </dl>
            </>
          );
        })()}
      </Drawer>
    </div>
  );
}
