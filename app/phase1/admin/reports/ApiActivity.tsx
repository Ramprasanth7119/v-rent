"use client";

/**
 * The API activity log.
 *
 * Written for an operations officer rather than an engineer, which decides
 * almost everything about it. Endpoints are named for what they do, not for
 * their path. Status codes are collapsed into five outcomes in plain words,
 * and "Refused" is separated from "Failed" because a 404 from the operations
 * console is the console working correctly. The filters are the questions
 * somebody actually arrives with — what is failing, what is slow, who did
 * this — rather than a row of fields matching the columns.
 *
 * The rows are real. Every API handler is wrapped by `logged()`, so this is
 * what the server served.
 */

import { useMemo, useState } from 'react';
import {
  Activity, TriangleAlert, Timer, Search, RotateCcw, Download, Gauge,
  Filter as FilterIcon, ChevronDown, Zap, Globe,
} from 'lucide-react';
import {
  Button, Card, SectionCard, SelectInput, SearchInput, EmptyState, AreaChart,
  Donut, CountUp, cx,
} from '../../../../components/phase1/kit';
import { Pill } from '../../../../components/phase1/status';
import { sgStamp, sgRelative } from '../../../../lib/phase1/format';
import {
  ENDPOINTS, OUTCOME, ROLE_LABEL, SLOW_MS, endpointArea, endpointLabel, outcomeOf,
  type Outcome, type RequestRow,
} from '../../../../lib/phase1/reqlog-labels';

const WINDOWS = [
  { value: '15m', label: 'Last 15 minutes', ms: 15 * 60_000 },
  { value: '1h', label: 'Last hour', ms: 3_600_000 },
  { value: '24h', label: 'Last 24 hours', ms: 86_400_000 },
  { value: '7d', label: 'Last 7 days', ms: 7 * 86_400_000 },
  { value: 'all', label: 'Everything logged', ms: Infinity },
];

const METHOD_TONE: Record<string, string> = {
  GET: 'bg-p1-subtle text-p1-text-2',
  POST: 'bg-p1-primary-soft text-p1-primary dark:text-p1-info',
  PATCH: 'bg-p1-accent-soft text-p1-accent-text',
  PUT: 'bg-p1-accent-soft text-p1-accent-text',
  DELETE: 'bg-p1-danger-soft text-p1-danger',
};

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
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(40);

  const windowMs = WINDOWS.find((w) => w.value === win)?.ms ?? Infinity;

  const inWindow = useMemo(
    () => rows.filter((r) => nowDate.getTime() - new Date(r.at).getTime() <= windowMs),
    [rows, windowMs, nowDate],
  );

  const routes = useMemo(
    () => [...new Set(inWindow.map((r) => r.route))].sort((a, b) => endpointLabel(a).localeCompare(endpointLabel(b))),
    [inWindow],
  );
  const methods = useMemo(() => [...new Set(inWindow.map((r) => r.method))].sort(), [inWindow]);
  const actors = useMemo(
    () => [...new Set(inWindow.map((r) => r.actor).filter(Boolean) as string[])].sort(),
    [inWindow],
  );

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

  /* ------------------------------------------------------------- summaries */

  const stats = useMemo(() => {
    const ms = [...filtered.map((r) => r.ms)].sort((a, b) => a - b);
    const pick = (p: number) => (ms.length ? ms[Math.min(ms.length - 1, Math.ceil((p / 100) * ms.length) - 1)] : 0);
    const failed = filtered.filter((r) => outcomeOf(r.status) === 'failed').length;
    const slow = filtered.filter((r) => r.ms >= SLOW_MS).length;
    return {
      total: filtered.length,
      failed,
      slow,
      p50: pick(50),
      p95: pick(95),
      external: filtered.filter((r) => ENDPOINTS[r.route]?.external).length,
    };
  }, [filtered]);

  const outcomeSlices = useMemo(() => {
    const counts = new Map<Outcome, number>();
    for (const r of filtered) {
      const o = outcomeOf(r.status);
      counts.set(o, (counts.get(o) ?? 0) + 1);
    }
    const colour: Record<Outcome, string> = {
      ok: 'var(--p1-success)',
      refused: 'var(--p1-text-3)',
      invalid: 'var(--p1-warning)',
      limited: 'var(--p1-accent)',
      failed: 'var(--p1-danger)',
    };
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([o, value]) => ({ label: OUTCOME[o].label, value, colour: colour[o] }));
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
      const slice = filtered.filter((r) => {
        const t = new Date(r.at).getTime();
        return t >= from && t < to;
      });
      labels.push(new Intl.DateTimeFormat('en-SG', {
        timeZone: 'Asia/Singapore',
        ...(size < 3_600_000 ? { hour: '2-digit', minute: '2-digit' } : size < 86_400_000 ? { hour: '2-digit' } : { day: 'numeric', month: 'short' }),
        hour12: false,
      }).format(new Date(to)));
      all.push(slice.length);
      bad.push(slice.filter((r) => outcomeOf(r.status) === 'failed').length);
    }
    return { labels, all, bad };
  }, [filtered, windowMs, nowDate, rows, now]);

  const byRoute = useMemo(() => {
    const map = new Map<string, RequestRow[]>();
    for (const r of filtered) {
      const list = map.get(r.route) ?? [];
      list.push(r);
      map.set(r.route, list);
    }
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

  const activeFilters = [
    outcome !== 'any', method !== 'any', area !== 'any', route !== 'any',
    who !== 'any', slowOnly, q.trim() !== '',
  ].filter(Boolean).length;

  const reset = () => {
    setOutcome('any'); setMethod('any'); setArea('any'); setRoute('any');
    setWho('any'); setSlowOnly(false); setQ('');
  };

  const csv = () => {
    const head = ['When', 'Method', 'Endpoint', 'Path', 'Status', 'Outcome', 'Milliseconds', 'Who', 'Role'];
    const body = filtered.map((r) => [
      r.at, r.method, endpointLabel(r.route), r.path, r.status,
      OUTCOME[outcomeOf(r.status)].label, r.ms, r.actor ?? '', ROLE_LABEL[r.role ?? 'anonymous'],
    ]);
    const text = [head, ...body]
      .map((row) => row.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `v-rent-api-activity-${win}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ------------------------------------------------------------------ view */

  if (rows.length === 0) {
    return (
      <SectionCard title="Nothing logged yet" icon={<Activity size={16} />}>
        <EmptyState
          icon={<Activity size={22} />}
          title="No API calls have been recorded"
          description="Every API handler is wrapped, so this fills the moment anybody uses the product — including you opening this page."
        />
      </SectionCard>
    );
  }

  return (
    <div className="grid gap-5">
      {/* ------------------------------------------------------- the figures */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { k: 'Calls', v: <CountUp value={stats.total} />, s: WINDOWS.find((w) => w.value === win)!.label.toLowerCase(), icon: <Activity size={15} />, tone: '' },
          { k: 'Failed on our side', v: <CountUp value={stats.failed} />, s: stats.failed ? 'Look at these first' : 'Nothing broke', icon: <TriangleAlert size={15} />, tone: stats.failed ? 'text-p1-danger' : '' },
          { k: 'Median response', v: <><CountUp value={stats.p50} />ms</>, s: `95th at ${stats.p95}ms`, icon: <Zap size={15} />, tone: '' },
          { k: `Slower than ${SLOW_MS}ms`, v: <CountUp value={stats.slow} />, s: `${stats.external} left our servers`, icon: <Timer size={15} />, tone: stats.slow ? 'text-p1-warning' : '' },
        ].map((m, i) => (
          <Card key={m.k} padding="md" className="p1-lift" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-p1-text-3">{m.k}</span>
              <span className="text-p1-text-3" aria-hidden>{m.icon}</span>
            </div>
            <div className={cx('mt-1.5 font-p1display text-[28px] font-bold leading-none tabular-nums text-p1-text', m.tone)}>
              {m.v}
            </div>
            <div className="mt-1.5 text-[12.5px] text-p1-text-3">{m.s}</div>
          </Card>
        ))}
      </div>

      {/* ------------------------------------------------------------ charts */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <SectionCard title="Traffic" description="Calls and failures over the chosen window." icon={<Activity size={16} />}>
          <AreaChart
            height={200}
            labels={trend.labels}
            series={[
              { label: 'Calls', points: trend.all, tone: 'primary' },
              { label: 'Failures', points: trend.bad, tone: 'danger' },
            ]}
            valueLabel={(n) => String(n)}
          />
        </SectionCard>

        <SectionCard title="How calls ended" description="Refused is the console declining to identify itself, not a fault." icon={<Gauge size={16} />}>
          {outcomeSlices.length === 0 ? (
            <p className="py-8 text-center text-[13.5px] text-p1-text-3">Nothing matches those filters.</p>
          ) : (
            <Donut
              slices={outcomeSlices}
              size={150}
              thickness={22}
              centre={
                <>
                  <span className="font-p1display text-[22px] font-bold leading-none tabular-nums text-p1-text">
                    {stats.total ? Math.round(((stats.total - stats.failed) / stats.total) * 100) : 100}%
                  </span>
                  <span className="mt-0.5 text-[11px] text-p1-text-3">without a fault</span>
                </>
              }
            />
          )}
        </SectionCard>
      </div>

      {/* ----------------------------------------------------------- filters */}
      <Card padding="md">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <span className="flex min-w-0 flex-1 basis-48 flex-wrap items-center gap-2 text-[13.5px] font-semibold text-p1-text">
            <FilterIcon size={15} className="text-p1-text-3" aria-hidden />
            Narrow it down
            {activeFilters > 0 && <Pill tone="info">{activeFilters} applied</Pill>}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters > 0 && (
              <Button size="sm" variant="ghost" leftIcon={<RotateCcw size={14} />} onClick={reset}>Reset</Button>
            )}
            <Button size="sm" variant="outline" leftIcon={<Download size={14} />} disabled={!filtered.length} onClick={csv}>
              Download CSV
            </Button>
          </div>
        </div>

        {/* The five questions somebody actually arrives with. */}
        <div className="mb-3.5 flex flex-wrap gap-2">
          {[
            { label: 'Everything', on: outcome === 'any' && !slowOnly, act: () => { setOutcome('any'); setSlowOnly(false); } },
            { label: 'Only problems', on: outcome === 'problem', act: () => { setOutcome('problem'); setSlowOnly(false); } },
            { label: 'Broke on our side', on: outcome === 'failed', act: () => { setOutcome('failed'); setSlowOnly(false); } },
            { label: `Slower than ${SLOW_MS}ms`, on: slowOnly, act: () => { setSlowOnly(!slowOnly); } },
            { label: 'Rate limited', on: outcome === 'limited', act: () => { setOutcome('limited'); setSlowOnly(false); } },
          ].map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.act}
              aria-pressed={c.on}
              className={cx(
                'cursor-pointer rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                c.on ? 'bg-p1-primary text-white' : 'bg-p1-subtle text-p1-text-2 hover:text-p1-text',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <SelectInput
            label="When"
            value={win}
            onChange={(e) => setWin(e.target.value)}
            options={WINDOWS.map((w) => ({ value: w.value, label: w.label }))}
          />
          <SelectInput
            label="Part of the product"
            value={area}
            onChange={(e) => { setArea(e.target.value); setRoute('any'); }}
            options={[
              { value: 'any', label: 'All of it' },
              ...[...new Set(inWindow.map((r) => endpointArea(r.route)).filter(Boolean) as string[])]
                .sort()
                .map((a) => ({ value: a, label: a })),
            ]}
          />
          <SelectInput
            label="Endpoint"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            options={[
              { value: 'any', label: 'Any endpoint' },
              ...routes
                .filter((r) => area === 'any' || endpointArea(r) === area)
                .map((r) => ({ value: r, label: endpointLabel(r) })),
            ]}
          />
          <SelectInput
            label="Who called it"
            value={who}
            onChange={(e) => setWho(e.target.value)}
            options={[
              { value: 'any', label: 'Anyone' },
              { value: 'agents', label: 'Agents' },
              { value: 'staff', label: 'Staff' },
              { value: 'anon', label: 'Signed out' },
              ...actors.map((a) => ({ value: `actor:${a}`, label: a })),
            ]}
          />
          <SelectInput
            label="Method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            options={[{ value: 'any', label: 'Any' }, ...methods.map((m) => ({ value: m, label: m }))]}
          />
        </div>

        <SearchInput
          className="mt-3"
          size="sm"
          label="Find"
          value={q}
          onChange={setQ}
          placeholder="A path, an endpoint name, an email address or a status code"
        />
      </Card>

      {/* ------------------------------------------------------- busiest ends */}
      {byRoute.length > 0 && (
        <SectionCard title="Busiest endpoints" description="Where the traffic and the slowness actually are." icon={<Globe size={16} />} padding="none">
          <ul className="divide-y divide-p1-border">
            {byRoute.map((r, i) => {
              const peak = Math.max(1, ...byRoute.map((x) => x.count));
              const meta = ENDPOINTS[r.route];
              return (
                <li key={r.route} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium text-p1-text">{endpointLabel(r.route)}</span>
                      {meta?.external && <Pill tone="accent">via {meta.external}</Pill>}
                      {r.failed > 0 && <Pill tone="danger">{r.failed} failed</Pill>}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[11.5px] text-p1-text-3">{r.route}</div>
                  </div>
                  <div className="w-32 shrink-0">
                    <div className="h-2 overflow-hidden rounded-full bg-p1-subtle">
                      <div
                        className={cx('h-full rounded-full', r.failed ? 'bg-p1-danger' : 'bg-p1-primary')}
                        style={{
                          width: `${(r.count / peak) * 100}%`,
                          animation: `p1-grow-x 640ms cubic-bezier(.16,1,.3,1) ${i * 55}ms both`,
                          transformOrigin: 'left',
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-14 shrink-0 text-right text-[13px] font-semibold tabular-nums text-p1-text">{r.count}</span>
                  <span className={cx('w-20 shrink-0 text-right text-[12.5px] tabular-nums', r.p95 >= SLOW_MS ? 'text-p1-warning' : 'text-p1-text-3')}>
                    {r.p95}ms p95
                  </span>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      {/* ---------------------------------------------------------- the rows */}
      <SectionCard
        title="Calls"
        description={`${filtered.length.toLocaleString('en-SG')} of ${inWindow.length.toLocaleString('en-SG')} in this window, newest first.`}
        icon={<Search size={16} />}
        padding="none"
      >
        {filtered.length === 0 ? (
          <EmptyState
            className="border-0"
            title="Nothing matches"
            description="Widen the window or clear a filter."
            action={<Button variant="outline" leftIcon={<RotateCcw size={15} />} onClick={reset}>Reset the filters</Button>}
          />
        ) : (
          <>
            <ul className="divide-y divide-p1-border">
              {filtered.slice(0, limit).map((r) => {
                const o = outcomeOf(r.status);
                const isOpen = open === r.id;
                const meta = ENDPOINTS[r.route];
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : r.id)}
                      aria-expanded={isOpen}
                      className="flex w-full cursor-pointer flex-wrap items-center gap-x-3.5 gap-y-1.5 px-5 py-2.5 text-left transition-colors hover:bg-p1-subtle/50"
                    >
                      <span className={cx('w-[54px] shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold', METHOD_TONE[r.method] ?? 'bg-p1-subtle text-p1-text-2')}>
                        {r.method}
                      </span>
                      <span className="min-w-0 flex-1 basis-52 truncate text-[13.5px] text-p1-text">
                        {endpointLabel(r.route)}
                        {meta?.external && <span className="ml-2 text-[11.5px] text-p1-text-3">via {meta.external}</span>}
                      </span>
                      <Pill tone={OUTCOME[o].tone}>{OUTCOME[o].label}</Pill>
                      <span className="w-10 shrink-0 text-right font-mono text-[12px] tabular-nums text-p1-text-3">{r.status}</span>
                      <span className={cx('w-16 shrink-0 text-right text-[12.5px] tabular-nums', r.ms >= SLOW_MS ? 'font-semibold text-p1-warning' : 'text-p1-text-3')}>
                        {r.ms}ms
                      </span>
                      <span className="w-24 shrink-0 truncate text-right text-[12px] text-p1-text-3">
                        {r.role === 'anonymous' ? 'signed out' : (r.actor ?? ROLE_LABEL[r.role ?? 'anonymous'])}
                      </span>
                      <span className="w-20 shrink-0 text-right text-[12px] tabular-nums text-p1-text-3">
                        {sgRelative(r.at, nowDate)}
                      </span>
                      <ChevronDown size={14} aria-hidden className={cx('shrink-0 text-p1-text-3 transition-transform', isOpen && 'rotate-180')} />
                    </button>

                    {isOpen && (
                      <dl className="grid gap-x-6 gap-y-2 border-t border-p1-border bg-p1-subtle/40 px-5 py-3.5 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          ['Path', <span key="p" className="font-mono">{r.path}</span>],
                          ['Route', <span key="r" className="font-mono">{r.route}</span>],
                          ['Exact time', <span key="t" className="font-mono">{sgStamp(r.at)}</span>],
                          ['Status', `${r.status} — ${OUTCOME[o].hint}`],
                          ['Duration', `${r.ms}ms${r.ms >= SLOW_MS ? ' — slower than the threshold' : ''}`],
                          ['Signed in as', r.actor ?? 'nobody'],
                          ['Role', ROLE_LABEL[r.role ?? 'anonymous']],
                          ...(r.error ? [['Error', r.error] as [string, React.ReactNode]] : []),
                        ].map(([k, v]) => (
                          <div key={k as string}>
                            <dt className="text-p1-text-3">{k}</dt>
                            <dd className="mt-0.5 break-all text-p1-text">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>
            {filtered.length > limit && (
              <div className="border-t border-p1-border px-5 py-3 text-center">
                <Button variant="ghost" size="sm" onClick={() => setLimit((n) => n + 60)}>
                  Show more — {(filtered.length - limit).toLocaleString('en-SG')} left
                </Button>
              </div>
            )}
          </>
        )}
      </SectionCard>

      <p className="text-[12px] leading-5 text-p1-text-3">
        Method, endpoint, status, duration and the signed-in account are kept. Request bodies, query strings and
        headers are not: a log that quietly accumulates other people&rsquo;s telephone numbers is a liability rather
        than an instrument.
      </p>
    </div>
  );
}
