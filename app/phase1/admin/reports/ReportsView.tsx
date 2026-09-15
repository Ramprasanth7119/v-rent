"use client";

/**
 * Reports and audit.
 *
 * Three questions, three tabs, because they are asked by different people for
 * different reasons. Platform is for whoever is deciding what to build next;
 * the audit trail is for whoever has to defend a decision; API activity is for
 * whoever is on call.
 *
 * The onboarding funnel is the one figure here that is modelled rather than
 * measured, and it carries a badge that says so — every other number on the
 * page is read from this instance.
 */

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity, BarChart3, Building2, CreditCard, Download, ExternalLink, FileCheck, RotateCcw, ShieldCheck, Users,
} from 'lucide-react';
import {
  AreaChart, Button, Card, DataTable, Donut, EmptyState, Heatmap, KPI, Pagination, SearchInput, SectionCard, SelectMenu, Tabs,
  Tooltip, cx, usePagination, useSort, type Column,
} from '../../../../components/phase1/kit';
import { Drawer } from '../../../../components/phase1/overlays';
import { ACTION_LABEL, IS_ADVERSE, type AuditRow } from '../../../../lib/phase1/audit-labels';
import { FUNNEL, LISTING_STATUS_LABEL, sgd, type ListingStatus } from '../../../../lib/phase1/data';
import { sgDateTime, sgRelative } from '../../../../lib/phase1/format';
import type { OpsSnapshot } from '../../../../lib/phase1/admin-insight';
import {
  DetailRow, FlatFunnel, IdentityCell, ModelledBadge, QuickFilters, downloadCsv,
} from '../../../../components/phase1/admin/reports/parts';
import ApiActivity from './ApiActivity';

type Tab = 'platform' | 'audit' | 'api';

export default function ReportsView(props: { snapshot: OpsSnapshot; now: string }) {
  return (
    <Suspense fallback={null}>
      <Reports {...props} />
    </Suspense>
  );
}

function Reports({ snapshot, now }: { snapshot: OpsSnapshot; now: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'audit' || raw === 'api' ? raw : 'platform';
  const setTab = (t: Tab) => router.replace(`/phase1/admin/reports${t === 'platform' ? '' : `?tab=${t}`}`, { scroll: false });

  const { audit, requests, listings, decisions, revenue, agents } = snapshot;

  return (
    <>
      <header className="vr-rise mb-5">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-p1-text sm:text-[28px]">Reports & audit</h1>
        <p className="mt-1 text-[14px] text-p1-text-3">What the platform holds, who decided what, and what the API served.</p>
      </header>

      <Tabs
        className="mb-6"
        label="Reports"
        value={tab}
        onChange={setTab}
        items={[
          { key: 'platform', label: 'Platform', icon: <BarChart3 size={15} /> },
          { key: 'audit', label: 'Audit trail', count: audit.length, icon: <ShieldCheck size={15} /> },
          { key: 'api', label: 'API activity', count: requests.length, icon: <Activity size={15} /> },
        ]}
      />

      <div key={tab} className="p1-in">
        {tab === 'platform' && <PlatformTab listings={listings} decisions={decisions} revenue={revenue} agents={agents} />}
        {tab === 'audit' && <AuditTab rows={audit} now={now} />}
        {tab === 'api' && <ApiActivity rows={requests} now={now} />}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════ platform */

const STATUS_COLOUR: Record<string, string> = {
  published: 'var(--p1-success)',
  pending_review: 'var(--p1-warning)',
  paused: 'var(--p1-info)',
  draft: 'color-mix(in srgb, var(--p1-text-3) 55%, var(--p1-surface))',
  rejected: 'var(--p1-danger)',
  expired: 'var(--p1-text-3)',
  suspended: 'var(--p1-highlight)',
};

const PLAN_COLOUR = [
  'var(--p1-primary)',
  'color-mix(in srgb, var(--p1-primary) 58%, var(--p1-surface))',
  'color-mix(in srgb, var(--p1-primary) 30%, var(--p1-surface))',
  'var(--p1-info)',
];

function PlatformTab({ listings, decisions, revenue, agents }: Pick<OpsSnapshot, 'listings' | 'decisions' | 'revenue' | 'agents'>) {
  const top = FUNNEL[0].count;
  const last = FUNNEL[FUNNEL.length - 1].count;
  const conversion = Math.round((last / top) * 1000) / 10;

  const worst = FUNNEL.reduce((acc, s, i) => {
    if (i === 0) return acc;
    const lost = FUNNEL[i - 1].count - s.count;
    return lost > acc.lost ? { lost, from: FUNNEL[i - 1].stage, to: s.stage } : acc;
  }, { lost: -1, from: '', to: '' });

  const statusSlices = Object.entries(listings.byStatus)
    .map(([status, value]) => ({ label: LISTING_STATUS_LABEL[status as ListingStatus] ?? status, value, colour: STATUS_COLOUR[status] }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const trendTotal = decisions.trend.values.reduce((n, v) => n + v, 0);
  const planTotal = revenue.byPlan.reduce((n, p) => n + p.sgd, 0) || 1;

  return (
    <div className="grid gap-5">
      <section aria-label="Platform at a glance" className="vr-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="Agents" value={agents.total} icon={<Users size={16} />} sub={`${agents.approved} approved`} href="/phase1/admin/agents" />
        <KPI label="Listings" value={listings.total} icon={<Building2 size={16} />} sub={`+${listings.publishedThisWeek} this week`} />
        <KPI
          label="Decisions, 7 days"
          value={decisions.week}
          icon={<FileCheck size={16} />}
          sub={`${decisions.adverseShare}% adverse`}
          spark={decisions.trend.values.length > 1 ? { data: decisions.trend.values, tone: 'primary' } : undefined}
          className="max-sm:[&>div:last-child>svg]:hidden"
        />
        <KPI label="Annual recurring" value={revenue.arrSgd} prefix="S$" compact icon={<CreditCard size={16} />} sub={`${revenue.activeCount} paying agents`} href="/phase1/admin/subscriptions" />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <SectionCard
          title="Onboarding funnel"
          description="Registration through to a first published listing"
          actions={<ModelledBadge note="Volumes are modelled for the business case. A prototype with a handful of accounts cannot show where hundreds of agents give up. Every other figure on this page is read from this instance." />}
        >
          <FlatFunnel stages={FUNNEL.map((f) => ({ label: f.stage, value: f.count }))} />
          {worst.lost > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-p1-danger-soft px-3.5 py-2.5 text-[13px]">
              <span className="text-p1-text">
                Largest drop <span className="font-semibold">{worst.from} → {worst.to}</span>
              </span>
              <span className="font-semibold tabular-nums text-p1-danger">−{worst.lost} agents</span>
            </div>
          )}
        </SectionCard>

        <div className="grid gap-5">
          <SectionCard title="End-to-end conversion" description="Registered to first listing" actions={<ModelledBadge note="Drawn from the same modelled funnel." />}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-p1-text">{conversion}%</span>
              <span className="text-[13px] tabular-nums text-p1-text-3">{last} of {top}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-p1-subtle">
              <div className="vr-grow h-full rounded-full bg-p1-primary" style={{ width: `${conversion}%` }} />
            </div>
          </SectionCard>

          <SectionCard title="Listings by standing" description="Across every agent, right now">
            {statusSlices.length === 0 ? (
              <EmptyState compact title="No listings yet" description="They appear here as agents create them." />
            ) : (
              <Donut
                slices={statusSlices}
                size={132}
                thickness={18}
                centre={<>
                  <span className="text-[22px] font-semibold leading-none tabular-nums text-p1-text">{listings.total}</span>
                  <span className="mt-0.5 text-[11px] text-p1-text-3">listings</span>
                </>}
              />
            )}
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Decisions"
          description="Last fourteen days"
          actions={<span className="text-[13px] text-p1-text-3"><span className="font-semibold tabular-nums text-p1-text">{trendTotal}</span> total</span>}
        >
          {trendTotal === 0 ? (
            <EmptyState compact title="No decisions in this period" description="Approvals, rejections and suspensions are counted here." />
          ) : (
            <AreaChart height={200} labels={decisions.trend.labels} series={[{ label: 'Decisions', points: decisions.trend.values, tone: 'primary' }]} valueLabel={(n) => String(Math.round(n))} />
          )}
        </SectionCard>

        <SectionCard title="When decisions are made" description="Day by hour, Singapore time">
          <Heatmap grid={decisions.heatmap} valueLabel={(n) => `${n} decision${n === 1 ? '' : 's'}`} />
        </SectionCard>
      </div>

      <SectionCard
        title="Subscription revenue"
        description="Active plans and what each contributes a year"
        actions={<Link href="/phase1/admin/subscriptions" className="inline-flex items-center gap-1 text-[13px] font-medium text-p1-primary hover:underline underline-offset-4">Subscriptions <ExternalLink size={12} aria-hidden /></Link>}
      >
        {revenue.byPlan.length === 0 ? (
          <EmptyState compact title="Nothing active yet" description="Plans appear here once agents subscribe." />
        ) : (
          <div className="grid items-center gap-8 md:grid-cols-[auto_minmax(0,1fr)]">
            <Donut
              slices={revenue.byPlan.map((p, i) => ({ label: p.plan, value: p.sgd, colour: PLAN_COLOUR[i % PLAN_COLOUR.length] }))}
              size={140}
              thickness={18}
              centre={<>
                <span className="text-[18px] font-semibold leading-none tabular-nums text-p1-text">{sgd(revenue.arrSgd)}</span>
                <span className="mt-0.5 text-[11px] text-p1-text-3">a year</span>
              </>}
              className="[&>ul]:hidden"
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[13.5px]">
                <caption className="sr-only">Revenue by plan</caption>
                <thead>
                  <tr className="border-b border-p1-border text-[12px] font-medium text-p1-text-3">
                    <th scope="col" className="py-2 pr-3 font-medium">Plan</th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">Agents</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Share</th>
                    <th scope="col" className="py-2 text-right font-medium">A year</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-p1-border">
                  {revenue.byPlan.map((p, i) => {
                    const share = Math.round((p.sgd / planTotal) * 100);
                    return (
                      <tr key={p.plan}>
                        <td className="py-2.5 pr-3">
                          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: PLAN_COLOUR[i % PLAN_COLOUR.length] }} aria-hidden />{p.plan}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-p1-text-2">{p.count}</td>
                        <td className="py-2.5 pr-3">
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-p1-subtle"><span className="vr-grow block h-full rounded-full bg-p1-primary" style={{ width: `${share}%` }} /></span>
                            <span className="w-9 text-right text-[12px] tabular-nums text-p1-text-3">{share}%</span>
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-semibold tabular-nums text-p1-text">{sgd(p.sgd)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ audit */

type AuditFilter = 'all' | 'adverse' | 'favourable';

function DecisionBadge({ action }: { action: AuditRow['action'] }) {
  const adverse = IS_ADVERSE[action];
  return (
    <span className={cx('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[12px] font-medium',
      adverse ? 'border-p1-danger-border bg-p1-danger-soft text-p1-danger' : 'border-p1-success-border bg-p1-success-soft text-p1-success')}>
      <span className={cx('h-1.5 w-1.5 rounded-full', adverse ? 'bg-p1-danger' : 'bg-p1-success')} aria-hidden />
      {ACTION_LABEL[action]}
    </span>
  );
}

function AuditTab({ rows, now }: { rows: AuditRow[]; now: string }) {
  const nowDate = useMemo(() => new Date(now), [now]);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<AuditFilter>('all');
  const [action, setAction] = useState('any');
  const [officer, setOfficer] = useState('any');
  const [open, setOpen] = useState<AuditRow | null>(null);

  const officers = useMemo(() => [...new Set(rows.map((r) => r.actorEmail))].sort(), [rows]);
  const actions = useMemo(() => [...new Set(rows.map((r) => r.action))].sort(), [rows]);
  const adverseCount = rows.filter((r) => IS_ADVERSE[r.action]).length;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind === 'adverse' && !IS_ADVERSE[r.action]) return false;
      if (kind === 'favourable' && IS_ADVERSE[r.action]) return false;
      if (action !== 'any' && r.action !== action) return false;
      if (officer !== 'any' && r.actorEmail !== officer) return false;
      if (needle && ![ACTION_LABEL[r.action], r.actorEmail, r.subjectName, r.listingRef ?? '', r.reason ?? ''].some((v) => v.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [rows, q, kind, action, officer]);

  const columns: Column<AuditRow>[] = [
    {
      key: 'at', header: 'When', nowrap: true, width: '130px', sortValue: (r) => r.at,
      render: (r) => (
        <Tooltip content={sgDateTime(r.at)}>
          <span tabIndex={0} className="text-[13px] tabular-nums text-p1-text-2">{sgRelative(r.at, nowDate)}</span>
        </Tooltip>
      ),
    },
    { key: 'action', header: 'Decision', nowrap: true, sortValue: (r) => ACTION_LABEL[r.action], render: (r) => <DecisionBadge action={r.action} /> },
    {
      key: 'subject', header: 'Agent', sortValue: (r) => r.subjectName,
      render: (r) => (
        <span className="block min-w-0">
          <Link href={`/phase1/admin/agents/${r.subjectId}`} onClick={(e) => e.stopPropagation()} className="block truncate text-[13.5px] font-medium text-p1-text hover:text-p1-primary hover:underline underline-offset-4">{r.subjectName}</Link>
          {r.listingRef && <span className="font-mono text-[12px] text-p1-text-3">{r.listingRef}</span>}
        </span>
      ),
    },
    { key: 'actor', header: 'Officer', hideBelow: 'lg', sortValue: (r) => r.actorEmail, render: (r) => <IdentityCell email={r.actorEmail} /> },
    {
      key: 'reason', header: 'Reason', hideBelow: 'xl', width: '28%',
      render: (r) => r.reason
        ? <Tooltip content={r.reason}><span tabIndex={0} className="block max-w-[320px] truncate text-[13px] text-p1-text-2">{r.reason}</span></Tooltip>
        : <span className="text-p1-text-3">—</span>,
    },
  ];

  const { sorted, sort, onSort } = useSort(filtered, columns, { key: 'at', dir: 'desc' });
  const pg = usePagination(sorted, 12);
  const activeCount = [kind !== 'all', action !== 'any', officer !== 'any', q.trim() !== ''].filter(Boolean).length;
  const reset = () => { setKind('all'); setAction('any'); setOfficer('any'); setQ(''); pg.setPage(1); };

  const csv = () => downloadCsv('v-rent-audit-trail.csv', ['When', 'Decision', 'Agent', 'Listing', 'Officer', 'Reason'],
    sorted.map((r) => [r.at, ACTION_LABEL[r.action], r.subjectName, r.listingRef ?? '', r.actorEmail, r.reason ?? '']));

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState icon={<ShieldCheck size={22} />} title="No decisions recorded yet" description="Approve an application or review a listing and it appears here, with the officer who made it." />
      </Card>
    );
  }

  return (
    <Card padding="none" as="section" aria-label="Audit trail" className="overflow-hidden">
      {/* toolbar */}
      <div className="flex flex-col gap-3 border-b border-p1-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <QuickFilters
            label="Outcome"
            options={[
              { key: 'all', label: 'All decisions', count: rows.length, on: kind === 'all', onSelect: () => { setKind('all'); pg.setPage(1); } },
              { key: 'adverse', label: 'Against the agent', count: adverseCount, on: kind === 'adverse', onSelect: () => { setKind('adverse'); pg.setPage(1); } },
              { key: 'favourable', label: 'In their favour', count: rows.length - adverseCount, on: kind === 'favourable', onSelect: () => { setKind('favourable'); pg.setPage(1); } },
            ]}
          />
          <div className="flex items-center gap-2">
            {activeCount > 0 && <Button size="sm" variant="ghost" leftIcon={<RotateCcw size={14} />} onClick={reset}>Reset</Button>}
            <Button size="sm" variant="outline" leftIcon={<Download size={14} />} onClick={csv} disabled={!sorted.length}>Export CSV</Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_240px]">
          <SearchInput size="sm" label="Search the audit trail" value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Agent, listing reference or reason" />
          <SelectMenu variant="button" hideLabel label="Decision" value={action} onChange={(v) => { setAction(v); pg.setPage(1); }}
            options={[{ value: 'any', label: 'Any decision' }, ...actions.map((a) => ({ value: a, label: ACTION_LABEL[a] }))]} className="[&>button]:h-10" />
          <SelectMenu variant="button" hideLabel label="Officer" value={officer} onChange={(v) => { setOfficer(v); pg.setPage(1); }}
            options={[{ value: 'any', label: 'Any officer' }, ...officers.map((o) => ({ value: o, label: o }))]} className="[&>button]:h-10" />
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState compact title="No decisions match" description="Clear a filter to see more." action={<Button size="sm" variant="outline" onClick={reset}>Reset filters</Button>} />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable
              flush
              columns={columns}
              rows={pg.slice}
              rowKey={(r) => r.id}
              sort={sort}
              onSort={onSort}
              onRowClick={setOpen}
              selected={(r) => open?.id === r.id}
              minWidth={640}
              caption="Audit trail"
            />
          </div>
          <ul className="divide-y divide-p1-border md:hidden">
            {pg.slice.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setOpen(r)} className="flex w-full cursor-pointer flex-col gap-1.5 px-4 py-3.5 text-left hover:bg-p1-subtle/60">
                  <span className="flex items-center justify-between gap-2">
                    <DecisionBadge action={r.action} />
                    <span className="text-[12px] tabular-nums text-p1-text-3">{sgRelative(r.at, nowDate)}</span>
                  </span>
                  <span className="truncate text-[14px] font-medium text-p1-text">{r.subjectName}{r.listingRef && <span className="ml-1.5 font-mono text-[12px] font-normal text-p1-text-3">{r.listingRef}</span>}</span>
                  <span className="truncate text-[12.5px] text-p1-text-3">by {r.actorEmail}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-p1-border px-4 py-3 sm:px-5">
            <Pagination page={pg.page} pages={pg.pages} onChange={pg.setPage} from={pg.from} to={pg.to} total={pg.total} noun="decisions" />
          </div>
        </>
      )}

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? ACTION_LABEL[open.action] : ''}
        description={open ? sgDateTime(open.at) : undefined}
        footer={open ? (<>
          <Button variant="outline" onClick={() => setOpen(null)}>Close</Button>
          <Link href={`/phase1/admin/agents/${open.subjectId}`} className="p1-press inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-p1-primary px-4 text-[14px] font-medium text-p1-primary-on hover:bg-p1-primary-hover">Open agent record</Link>
        </>) : undefined}
      >
        {open && (
          <>
            <DecisionBadge action={open.action} />
            <dl className="mt-4 divide-y divide-p1-border">
              <DetailRow label="Agent">{open.subjectName}</DetailRow>
              {open.listingRef && <DetailRow label="Listing" mono>{open.listingRef}</DetailRow>}
              <DetailRow label="Officer"><IdentityCell email={open.actorEmail} /></DetailRow>
              <DetailRow label="When">{sgDateTime(open.at)} · {sgRelative(open.at, nowDate)}</DetailRow>
              <DetailRow label="Reason">{open.reason ?? <span className="text-p1-text-3">None required for this decision</span>}</DetailRow>
              <DetailRow label="Record" mono>{open.id}</DetailRow>
            </dl>
          </>
        )}
      </Drawer>
    </Card>
  );
}
