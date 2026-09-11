"use client";

/**
 * Reports and audit.
 *
 * Three questions, three tabs, because they are asked by different people for
 * different reasons and mixing them produced a page nobody read to the bottom.
 * Platform is for whoever is deciding what to build next; the audit trail is
 * for whoever has to defend a decision; API activity is for whoever is on call.
 *
 * The funnel is the one thing here that is modelled rather than measured, and
 * it says so on the card — a prototype with eleven accounts cannot show where
 * four hundred prospective agents gave up, and pretending otherwise would make
 * every real number beside it suspect.
 */

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Download, TrendingDown, Activity, Users, FileCheck, CreditCard, ShieldCheck,
  Building2, Search, RotateCcw, Info, BarChart3,
} from 'lucide-react';
import {
  PageHeader, Card, SectionCard, Callout, Button, SelectInput, SearchInput, DataTable,
  usePagination, Pagination, EmptyState, Tabs, Funnel, Donut, AreaChart, Heatmap,
  CountUp, cx, type Column,
} from '../../../../components/phase1/kit';
import { Pill } from '../../../../components/phase1/status';
import { ACTION_LABEL, IS_ADVERSE, type AuditRow } from '../../../../lib/phase1/audit-labels';
import { FUNNEL } from '../../../../lib/phase1/data';
import { LISTING_STATUS_LABEL, sgd, type ListingStatus } from '../../../../lib/phase1/data';
import { sgDateTime } from '../../../../lib/phase1/format';
import type { OpsSnapshot } from '../../../../lib/phase1/admin-insight';
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
  const tab = ((params.get('tab') as Tab) || 'platform');
  const setTab = (t: Tab) => router.replace(`/phase1/admin/reports${t === 'platform' ? '' : `?tab=${t}`}`, { scroll: false });

  const { audit, requests, listings, decisions, revenue, agents } = snapshot;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Reports and audit"
        description="What the platform holds, who decided what, and everything the API served."
      />

      <Tabs
        className="mb-5"
        label="Reports"
        value={tab}
        onChange={setTab}
        items={[
          { key: 'platform', label: 'Platform', icon: <BarChart3 size={15} /> },
          { key: 'audit', label: 'Audit trail', count: audit.length, icon: <ShieldCheck size={15} /> },
          { key: 'api', label: 'API activity', count: requests.length, icon: <Activity size={15} /> },
        ]}
      />

      {tab === 'platform' && (
        <PlatformTab
          listings={listings}
          decisions={decisions}
          revenue={revenue}
          agents={agents}
        />
      )}

      {tab === 'audit' && <AuditTab rows={audit} />}

      {tab === 'api' && <ApiActivity rows={requests} now={now} />}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════ platform */

function PlatformTab({
  listings, decisions, revenue, agents,
}: Pick<OpsSnapshot, 'listings' | 'decisions' | 'revenue' | 'agents'>) {
  const top = FUNNEL[0].count;
  const last = FUNNEL[FUNNEL.length - 1].count;
  const conversion = Math.round((last / top) * 1000) / 10;

  const statusSlices = Object.entries(listings.byStatus)
    .map(([status, value]) => ({ label: LISTING_STATUS_LABEL[status as ListingStatus] ?? status, value }))
    .sort((a, b) => b.value - a.value);

  const worst = FUNNEL.reduce(
    (acc, s, i) => {
      if (i === 0) return acc;
      const lost = FUNNEL[i - 1].count - s.count;
      return lost > acc.lost ? { i, lost, from: FUNNEL[i - 1].stage, to: s.stage } : acc;
    },
    { i: -1, lost: -1, from: '', to: '' },
  );

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { k: 'Agents', v: agents.total, s: `${agents.approved} approved · ${agents.real} on this instance`, icon: <Users size={15} />, real: true },
          { k: 'Listings', v: listings.total, s: `${listings.publishedThisWeek} published this week`, icon: <Building2 size={15} />, real: true },
          { k: 'Decisions logged', v: decisions.week, s: 'In the last seven days', icon: <FileCheck size={15} />, real: true },
          { k: 'Annual recurring', v: revenue.arrSgd, s: `${revenue.activeCount} paying agents`, icon: <CreditCard size={15} />, real: true, money: true },
        ].map((m, i) => (
          <Card key={m.k} padding="md" className="p1-lift" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-p1-text-3">{m.k}</span>
              <span className="text-p1-text-3" aria-hidden>{m.icon}</span>
            </div>
            <div className="mt-1.5 font-p1display text-[28px] font-bold leading-none tabular-nums text-p1-text">
              <CountUp value={m.v} prefix={m.money ? 'S$' : ''} />
            </div>
            <div className="mt-1.5 text-[12.5px] text-p1-text-3">{m.s}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <SectionCard
          title="Onboarding funnel"
          description="Where prospective agents give up between registering and publishing."
          icon={<TrendingDown size={16} />}
          actions={<Pill tone="warning">Modelled</Pill>}
        >
          <Funnel
            stages={FUNNEL.map((f) => ({ label: f.stage, value: f.count }))}
          />
          {worst.i > 0 && (
            <Callout tone="danger" className="mt-4" title={`Largest drop: ${worst.from} → ${worst.to}, losing ${worst.lost} agents`}>
              This is the number to attack first. Agents are being asked to pay before there is tenant traffic behind
              the platform.
            </Callout>
          )}
          <p className="mt-3 flex items-start gap-2 text-[12px] leading-5 text-p1-text-3">
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
            These volumes are modelled for the business case. Every other figure on this page — and the whole of the
            audit and API tabs — is read from this instance.
          </p>
        </SectionCard>

        <div className="grid gap-5">
          <SectionCard title="Listings by standing" description="Every agent, right now." icon={<Building2 size={16} />}>
            {statusSlices.length === 0 ? (
              <p className="py-6 text-center text-[13.5px] text-p1-text-3">No listings yet.</p>
            ) : (
              <Donut
                slices={statusSlices}
                size={148}
                thickness={22}
                centre={
                  <>
                    <span className="font-p1display text-[22px] font-bold leading-none tabular-nums text-p1-text">
                      <CountUp value={listings.total} />
                    </span>
                    <span className="mt-0.5 text-[11px] text-p1-text-3">listings</span>
                  </>
                }
              />
            )}
          </SectionCard>

          <SectionCard title="End-to-end conversion" description="Registered through to a first published listing." icon={<Activity size={16} />}>
            <div className="flex items-baseline gap-3">
              <span className="font-p1display text-[38px] font-bold leading-none tabular-nums text-p1-accent-text">
                <CountUp value={conversion} decimals={1} suffix="%" />
              </span>
              <span className="text-[13px] text-p1-text-2">{last} of {top}</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-p1-subtle">
              <div
                className="h-full rounded-full bg-p1-accent"
                style={{ width: `${conversion}%`, animation: 'p1-grow-x 760ms cubic-bezier(.16,1,.3,1) both', transformOrigin: 'left' }}
              />
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SectionCard title="Decisions, fourteen days" description={`${decisions.adverseShare}% adverse`} icon={<FileCheck size={16} />}>
          <AreaChart
            height={180}
            labels={decisions.trend.labels}
            series={[{ label: 'Decisions', points: decisions.trend.values, tone: 'primary' }]}
            valueLabel={(n) => String(n)}
          />
        </SectionCard>

        <SectionCard title="When decisions are made" description="Staffing follows this shape." icon={<Activity size={16} />}>
          <Heatmap grid={decisions.heatmap} valueLabel={(n) => `${n} decision${n === 1 ? '' : 's'}`} />
        </SectionCard>
      </div>

      <SectionCard title="Subscription revenue" description="Active plans and what each contributes." icon={<CreditCard size={16} />}>
        {revenue.byPlan.length === 0 ? (
          <p className="py-6 text-center text-[13.5px] text-p1-text-3">Nothing active yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <Donut
              slices={revenue.byPlan.map((p) => ({ label: `${p.plan} · ${p.count}`, value: p.sgd }))}
              size={150}
              thickness={22}
              centre={
                <>
                  <span className="font-p1display text-[20px] font-bold leading-none tabular-nums text-p1-text">
                    {sgd(revenue.arrSgd)}
                  </span>
                  <span className="mt-0.5 text-[11px] text-p1-text-3">a year</span>
                </>
              }
            />
            <ul className="space-y-3 self-center">
              {revenue.byPlan.map((p) => (
                <li key={p.plan} className="flex items-baseline justify-between gap-4 border-b border-p1-border pb-2.5 last:border-b-0">
                  <span className="text-[13.5px] text-p1-text">{p.plan}</span>
                  <span className="text-[13px] text-p1-text-2">
                    {p.count} agent{p.count === 1 ? '' : 's'} ·{' '}
                    <strong className="font-semibold tabular-nums text-p1-text">{sgd(p.sgd)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ audit */

type AuditFilter = 'all' | 'adverse' | 'favourable';

function AuditTab({ rows }: { rows: AuditRow[] }) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<AuditFilter>('all');
  const [action, setAction] = useState('any');
  const [officer, setOfficer] = useState('any');

  const officers = useMemo(() => [...new Set(rows.map((r) => r.actorEmail))].sort(), [rows]);
  const actions = useMemo(() => [...new Set(rows.map((r) => r.action))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind === 'adverse' && !IS_ADVERSE[r.action]) return false;
      if (kind === 'favourable' && IS_ADVERSE[r.action]) return false;
      if (action !== 'any' && r.action !== action) return false;
      if (officer !== 'any' && r.actorEmail !== officer) return false;
      if (needle && ![ACTION_LABEL[r.action], r.actorEmail, r.subjectName, r.listingRef ?? '', r.reason ?? '']
        .some((v) => v.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [rows, q, kind, action, officer]);

  const pg = usePagination(filtered, 10);
  const active = [kind !== 'all', action !== 'any', officer !== 'any', q.trim() !== ''].filter(Boolean).length;
  const reset = () => { setKind('all'); setAction('any'); setOfficer('any'); setQ(''); };

  const columns: Column<AuditRow>[] = [
    {
      key: 'at', header: 'When', width: '150px', nowrap: true,
      render: (r) => <span className="font-mono text-[12.5px] text-p1-text-2">{sgDateTime(r.at)}</span>,
      sortValue: (r) => r.at,
    },
    {
      key: 'action', header: 'Decision',
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className={cx('h-2 w-2 shrink-0 rounded-full', IS_ADVERSE[r.action] ? 'bg-p1-danger' : 'bg-p1-success')} aria-hidden />
          <span className="text-[13.5px] text-p1-text">{ACTION_LABEL[r.action]}</span>
        </span>
      ),
      sortValue: (r) => ACTION_LABEL[r.action],
    },
    {
      key: 'subject', header: 'Agent',
      render: (r) => (
        <span className="min-w-0">
          <Link href={`/phase1/admin/agents/${r.subjectId}`} className="block truncate text-[13.5px] font-medium text-p1-text underline-offset-4 hover:underline">
            {r.subjectName}
          </Link>
          {r.listingRef && <span className="font-mono text-[12px] text-p1-text-3">{r.listingRef}</span>}
        </span>
      ),
      sortValue: (r) => r.subjectName,
    },
    { key: 'actor', header: 'Officer', hideBelow: 'md', render: (r) => <span className="truncate font-mono text-[12.5px] text-p1-text-2">{r.actorEmail}</span>, sortValue: (r) => r.actorEmail },
    { key: 'reason', header: 'Reason', hideBelow: 'lg', render: (r) => <span className="text-[13px] leading-5 text-p1-text-2">{r.reason ?? '—'}</span> },
  ];

  const csv = () => {
    const head = ['When', 'Decision', 'Agent', 'Listing', 'Officer', 'Reason'];
    const body = filtered.map((r) => [r.at, ACTION_LABEL[r.action], r.subjectName, r.listingRef ?? '', r.actorEmail, r.reason ?? '']);
    const text = [head, ...body]
      .map((row) => row.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'v-rent-audit-trail.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (rows.length === 0) {
    return (
      <SectionCard title="Audit trail" icon={<ShieldCheck size={16} />}>
        <EmptyState
          icon={<ShieldCheck size={22} />}
          title="No decisions recorded yet"
          description="Approve an application or review a listing and it is written here, with the officer who did it."
        />
      </SectionCard>
    );
  }

  return (
    <div className="grid gap-5">
      <Card padding="md">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* `min-w-0` and a basis: without them the sentence refuses to wrap on
              a phone and drags the whole page into a horizontal scroll. */}
          <span className="flex min-w-0 flex-1 basis-56 flex-wrap items-center gap-2 text-[13.5px] font-semibold text-p1-text">
            Every verification, moderation and suspension decision
            {active > 0 && <Pill tone="info">{active} filter{active === 1 ? '' : 's'}</Pill>}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {active > 0 && <Button size="sm" variant="ghost" leftIcon={<RotateCcw size={14} />} onClick={reset}>Reset</Button>}
            <Button size="sm" variant="outline" leftIcon={<Download size={14} />} onClick={csv}>Download CSV</Button>
          </div>
        </div>

        <div className="mb-3.5 flex flex-wrap gap-2">
          {([
            ['all', 'Everything'],
            ['adverse', 'Went against the agent'],
            ['favourable', 'Went their way'],
          ] as [AuditFilter, string][]).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={cx(
                'cursor-pointer rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                kind === k ? 'bg-p1-primary text-white' : 'bg-p1-subtle text-p1-text-2 hover:text-p1-text',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SelectInput
            label="Kind of decision"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            options={[{ value: 'any', label: 'Any' }, ...actions.map((a) => ({ value: a, label: ACTION_LABEL[a] }))]}
          />
          <SelectInput
            label="Officer"
            value={officer}
            onChange={(e) => setOfficer(e.target.value)}
            options={[{ value: 'any', label: 'Anyone' }, ...officers.map((o) => ({ value: o, label: o }))]}
          />
          <SearchInput label="Find" value={q} onChange={setQ} placeholder="Agent, reference or reason" />
        </div>
      </Card>

      <SectionCard
        title="Decisions"
        description={`${filtered.length} of ${rows.length}`}
        icon={<Search size={16} />}
        padding="none"
      >
        <DataTable
          flush
          columns={columns}
          rows={pg.slice}
          rowKey={(r) => r.id}
          minWidth={820}
          caption="Audit trail"
          empty={<EmptyState compact title="Nothing matches" description="Clear a filter and try again." />}
        />
        <div className="border-t border-p1-border px-5 py-3">
          <Pagination {...pg} onChange={pg.setPage} noun="decisions" />
        </div>
      </SectionCard>
    </div>
  );
}
