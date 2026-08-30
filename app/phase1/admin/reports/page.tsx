"use client";

import { useState } from 'react';
import {
  PageHeader, Card, SectionCard, Callout, Button, SelectInput, SearchInput, DataTable, Column,
  usePagination, Pagination, EmptyState, PresenterNote, cx,
} from '../../../../components/phase1/kit';
import { Pill, LISTING_STATUS } from '../../../../components/phase1/status';
import { useCountUp, useInView } from '../../../../components/phase1/hooks';
import { AUDIT_LOG, AuditRow, FUNNEL, SUBSCRIPTIONS } from '../../../../lib/phase1/data';
import { ALL_LISTINGS } from '../../../../lib/phase1/agents';
import { Download, TrendingDown, Activity, Users, FileCheck, CreditCard } from 'lucide-react';

export default function ReportsPage() {
  const [range, setRange] = useState('30');
  const [q, setQ] = useState('');
  const top = FUNNEL[0].count;
  const last = FUNNEL[FUNNEL.length - 1].count;
  const conversion = Math.round((last / top) * 1000) / 10;

  const audit = AUDIT_LOG.filter((r) => !q || [r.action, r.actor, r.entity].some((v) => v.toLowerCase().includes(q.toLowerCase())));
  const pg = usePagination(audit, 8);

  const columns: Column<AuditRow>[] = [
    { key: 'at', header: 'When', width: '160px', render: (r) => <span className="whitespace-nowrap font-mono text-[13px] text-p1-text-2">{r.at}</span> },
    { key: 'actor', header: 'Actor', render: (r) => <Pill tone={r.actor === 'system' ? 'neutral' : 'accent'}>{r.actor}</Pill> },
    { key: 'action', header: 'Action', render: (r) => <span className="text-[14px] text-p1-text">{r.action}</span> },
    { key: 'entity', header: 'Entity', hideBelow: 'md', render: (r) => <span className="font-mono text-[13px] text-p1-text-3">{r.entity}</span> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Administration" title="Reports and audit" description="Where prospective agents give up, what the platform holds, and who did what."
        actions={
          <>
            <SelectInput label="Date range" containerClassName="w-44 [&_label]:sr-only" value={range} onChange={(e) => setRange(e.target.value)} options={[{ value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }, { value: 'all', label: 'All time' }]} />
            <Button variant="outline" leftIcon={<Download size={15} />}>Export CSV</Button>
          </>
        }
      />

      <div className="vr-stagger mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CounterTile icon={Users} label="Registered" value={top} sub="all time" />
        <CounterTile icon={FileCheck} label="Approved" value={FUNNEL[3].count} sub="passed verification" tone="success" />
        <CounterTile icon={CreditCard} label="Subscribed" value={FUNNEL[4].count} sub="paying agents" tone="success" />
        <CounterTile icon={Activity} label="End-to-end conversion" value={conversion} suffix="%" sub="registered to first listing" tone="warning" />
      </div>

      <FunnelCard />

      <div className="mb-6 grid gap-5 lg:grid-cols-2">
        <BarCard title="Listings by status" hint="All agents, current" rows={Object.keys(LISTING_STATUS).map((k) => ({ label: LISTING_STATUS[k].label, value: ALL_LISTINGS.filter((l) => l.status === k).length })).filter((r) => r.value > 0)} />
        <BarCard title="Plan mix" hint="Active subscriptions" rows={['Starter', 'Professional', 'Premium'].map((p) => ({ label: p, value: SUBSCRIPTIONS.filter((s) => s.status === 'active' && s.plan === p).length }))} />
      </div>

      <SectionCard
        padding="none"
        title={<span className="flex items-center gap-2"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-p1-success opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-p1-success" /></span>Audit trail</span>}
        description="Every consequential action, written in the same transaction as the change itself."
        actions={<SearchInput value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Search actions" className="w-full sm:w-64" />}
      >
        <div className="p-4 sm:p-5">
          <AuditTable columns={columns} rows={pg.slice} />
          <Pagination className="mt-4" page={pg.page} pages={pg.pages} onChange={pg.setPage} from={pg.from} to={pg.to} total={pg.total} />
        </div>
      </SectionCard>

      <PresenterNote>
        The audit trail answers “who approved this agent, and were they permitted to?” It is also what makes the three-day PDPA breach notification window survivable — you cannot report the scope of a breach you cannot reconstruct.
      </PresenterNote>
    </>
  );
}

function AuditTable({ columns, rows }: { columns: Column<AuditRow>[]; rows: AuditRow[] }) {
  const { ref, seen } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={cx(seen && 'vr-stagger')}>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.at + r.entity} caption="Audit trail" empty={<EmptyState compact title="No matching activity" />} />
    </div>
  );
}

/* ------------------------------------------------------------------ tiles */

function CounterTile({ icon: Icon, label, value, sub, suffix = '', tone = 'default' }: {
  icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: number; sub: string; suffix?: string; tone?: 'default' | 'success' | 'warning';
}) {
  const n = useCountUp(value, 1000);
  const cls = { default: 'text-p1-text', success: 'text-p1-success', warning: 'text-p1-warning' }[tone];
  return (
    <div className="rounded-2xl border border-p1-border bg-p1-surface p-5 shadow-p1-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-p1-text-2">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-p1-subtle text-p1-text-3" aria-hidden><Icon size={16} /></span>
      </div>
      <div className={cx('mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums', cls)}>
        {suffix === '%' ? (n / 10).toFixed(1) : n.toLocaleString()}{suffix}
      </div>
      <div className="mt-2 text-[13px] text-p1-text-3">{sub}</div>
    </div>
  );
}

/* ----------------------------------------------------------------- funnel */

function FunnelCard() {
  const { ref, seen } = useInView<HTMLDivElement>();
  const top = FUNNEL[0].count;
  const largestDrop = Math.max(...FUNNEL.map((f, i) => (i > 0 ? FUNNEL[i - 1].count - f.count : 0)));
  return (
    <SectionCard className="mb-6" title="Onboarding funnel" description="Shows exactly where prospective agents give up between registering and publishing their first listing.">
      <div ref={ref} className="space-y-4">
        {FUNNEL.map((f, i) => {
          const pct = Math.round((f.count / top) * 100);
          const prev = i > 0 ? FUNNEL[i - 1].count : f.count;
          const drop = prev - f.count;
          const dropPct = i > 0 ? Math.round((drop / prev) * 100) : 0;
          return <FunnelRow key={f.stage} stage={f.stage} count={f.count} pct={pct} drop={i > 0 ? drop : null} dropPct={dropPct} bad={i > 0 && drop === largestDrop} delay={i * 0.09} go={seen} />;
        })}
      </div>
      <Callout tone="danger" className="mt-5" icon={<TrendingDown size={18} />} title="Largest drop: approved → subscribed, losing 61 agents">
        This is the number to attack first. Agents are being asked to pay before there is tenant traffic behind the platform.
      </Callout>
    </SectionCard>
  );
}

function FunnelRow({ stage, count, pct, drop, dropPct, bad, delay, go }: { stage: string; count: number; pct: number; drop: number | null; dropPct: number; bad: boolean; delay: number; go: boolean }) {
  const n = useCountUp(go ? count : 0, 900);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[14px]">
        <span className="font-medium text-p1-text">{stage}</span>
        <span className="flex items-baseline gap-3">
          {drop !== null && <span className={cx('text-[13px] tabular-nums', bad ? 'font-medium text-p1-danger' : 'text-p1-text-3')}>−{drop} ({dropPct}%)</span>}
          <span className="font-semibold tabular-nums text-p1-text">{n.toLocaleString()}</span>
        </span>
      </div>
      <div className="h-7 overflow-hidden rounded-lg bg-p1-subtle" role="img" aria-label={`${stage}: ${count}, ${pct}% of registered`}>
        <div className={cx('relative flex h-full items-center justify-end overflow-hidden rounded-lg pr-2.5', go && 'vr-grow vr-shimmer', bad ? 'bg-p1-danger' : 'bg-p1-primary')}
          style={{ width: `${pct}%`, animationDelay: `${delay}s` }}>
          <span className="text-[12px] font-medium tabular-nums text-white">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- bar card */

function BarCard({ title, hint, rows }: { title: string; hint: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card>
      <h2 className="text-[16px] font-semibold text-p1-text">{title}</h2>
      <p className="mt-0.5 text-[13px] text-p1-text-3">{hint}</p>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[120px_minmax(0,1fr)_32px] items-center gap-3 text-[14px]">
            <span className="truncate text-p1-text-2">{r.label}</span>
            <span className="h-3 overflow-hidden rounded-full bg-p1-subtle" aria-hidden><span className="block h-full rounded-full bg-p1-primary" style={{ width: `${(r.value / max) * 100}%` }} /></span>
            <span className="text-right font-semibold tabular-nums text-p1-text">{r.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
