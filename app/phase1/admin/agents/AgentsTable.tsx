"use client";

/**
 * The agent directory.
 *
 * The data arrives from the server already joined — accounts registered on this
 * instance first, sample roster after — so this component only filters, sorts
 * and renders. A row that is a real account is marked, because an officer
 * needs to know whether the person they are about to suspend exists.
 *
 * Laid out as an admin console reads best: four numbers, one card holding the
 * filters and the table together, and on a phone the table becomes a list.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  KPI, SearchInput, FilterChips, SelectMenu, DataTable, Column, usePagination, Pagination, EmptyState, Avatar, Button,
  LinkButton, Tooltip, cx,
} from '../../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../../components/phase1/status';
import type { DirectoryAgent } from '../../../../lib/phase1/admin-directory';
import { TODAY } from '../../../../lib/phase1/workspace';
import { sgDate } from '../../../../lib/phase1/format';
import { ChevronRight, Users, ShieldCheck, Clock, CalendarX, ShieldAlert } from 'lucide-react';

type Filter = 'all' | 'registered' | 'approved' | 'under_review' | 'verification_expired' | 'suspended';
type Sort = 'name' | 'joined' | 'listings';

const matches = (a: DirectoryAgent, f: Filter) => (f === 'all' ? true : f === 'registered' ? a.real : a.status === f);

/** Days until the register's end date, or null when there is none. */
const daysLeft = (end: string) => {
  if (!end) return null;
  const t = new Date(`${end}T23:59:59+08:00`).getTime();
  return Number.isNaN(t) ? null : Math.ceil((t - TODAY.getTime()) / 86_400_000);
};

export default function AgentsTable({ agents }: { agents: DirectoryAgent[] }) {
  const router = useRouter();
  const params = useSearchParams();
  // The console's header search sends officers here with `?q=`.
  const [q, setQ] = useState(params.get('q') ?? '');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('name');

  const count = (f: Filter) => agents.filter((a) => matches(a, f)).length;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return agents
      .filter((a) => matches(a, filter))
      .filter((a) => !needle || [a.name, a.ceaNumber, a.agency, a.email].some((v) => v.toLowerCase().includes(needle)))
      .sort((a, b) =>
        sort === 'joined' ? b.joinedAt.localeCompare(a.joinedAt)
        : sort === 'listings' ? b.listingsTotal - a.listingsTotal
        : a.name.localeCompare(b.name),
      );
  }, [agents, filter, q, sort]);

  const pg = usePagination(rows, 10);
  const approved = count('approved');
  const review = count('under_review');
  const registered = count('registered');
  const expiringSoon = agents.filter((a) => a.status !== 'verification_expired' && (daysLeft(a.ceaValidUntil) ?? 999) <= 60).length;
  const lapsed = count('verification_expired');

  const clear = () => { setQ(''); setFilter('all'); pg.setPage(1); };

  const columns: Column<DirectoryAgent>[] = [
    {
      key: 'agent', header: 'Agent', width: '30%',
      render: (a) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={a.name} size="sm" tone={a.real ? 'primary' : 'neutral'} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/phase1/admin/agents/${a.id}`} onClick={(e) => e.stopPropagation()} className="truncate text-[14px] font-medium text-p1-text hover:text-p1-primary">{a.name}</Link>
              {!a.real && (
                <Tooltip content="Demonstration roster, not an account on this instance">
                  <span tabIndex={0} className="shrink-0 rounded-md bg-p1-subtle px-1.5 py-0.5 text-[11px] font-medium text-p1-text-3">Sample</span>
                </Tooltip>
              )}
            </div>
            <div className="truncate text-[12.5px] text-p1-text-3">{a.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'cea', header: 'CEA no.', nowrap: true, render: (a) => <span className="font-mono text-[13px] text-p1-text-2">{a.ceaNumber || '—'}</span> },
    { key: 'agency', header: 'Agency', hideBelow: 'xl', render: (a) => <span className="block max-w-[220px] truncate text-p1-text-2">{a.agency || '—'}</span> },
    { key: 'status', header: 'Verification', nowrap: true, render: (a) => <StatusBadge kind="agent" value={a.status} size="sm" /> },
    { key: 'plan', header: 'Plan', hideBelow: 'lg', nowrap: true, render: (a) => (a.plan ? <span className="text-p1-text">{a.plan}</span> : <span className="text-p1-text-3">No plan</span>) },
    {
      key: 'listings', header: 'Listings', align: 'right', nowrap: true,
      render: (a) => <span className="tabular-nums"><span className="font-medium text-p1-text">{a.listingsLive}</span><span className="text-p1-text-3"> / {a.listingsTotal}</span></span>,
    },
    { key: 'joined', header: 'Joined', hideBelow: 'lg', nowrap: true, muted: true, render: (a) => sgDate(a.joinedAt) },
    { key: 'go', header: <span className="sr-only">Open</span>, width: '40px', render: () => <ChevronRight size={16} className="text-p1-text-3" aria-hidden /> },
  ];

  return (
    <>
      {/* ------------------------------------------------------------ header */}
      <header className="vr-rise mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-p1-text sm:text-[28px]">Agents</h1>
            <span className="rounded-full bg-p1-subtle px-2 py-0.5 text-[12.5px] font-semibold tabular-nums text-p1-text-2">{agents.length}</span>
          </div>
          <p className="mt-1 text-[14px] text-p1-text-3">Verification standing, plan and inventory for every salesperson.</p>
        </div>
        {review > 0 && (
          <LinkButton href="/phase1/admin/verification" variant="outline" leftIcon={<Clock size={15} />}>
            Review {review} {review === 1 ? 'application' : 'applications'}
          </LinkButton>
        )}
      </header>

      {/* -------------------------------------------------------------- KPIs */}
      <section aria-label="Directory at a glance" className="vr-stagger mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="Total agents" value={agents.length} icon={<Users size={16} />} sub={`${registered} registered here`} />
        <KPI label="Verified" value={approved} icon={<ShieldCheck size={16} />} tone={approved ? 'success' : 'default'} sub={`${agents.length ? Math.round((approved / agents.length) * 100) : 0}% of the directory`} />
        <KPI label="Under review" value={review} icon={<Clock size={16} />} tone={review ? 'warning' : 'default'} href={review ? '/phase1/admin/verification' : undefined} sub={review ? 'Waiting on an officer' : 'Queue is clear'} />
        <KPI label="CEA lapsed" value={lapsed} icon={<CalendarX size={16} />} tone={lapsed ? 'danger' : 'default'} sub={`${expiringSoon} expiring within 60 days`} />
      </section>

      {/* ------------------------------------------------------ table card */}
      <section aria-label="Agent directory" className="overflow-hidden rounded-xl border border-p1-border bg-p1-surface">
        <div className="flex flex-col gap-3 border-b border-p1-border px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <FilterChips<Filter>
            label="Filter agents"
            size="sm"
            scroll
            value={filter}
            onChange={(k) => { setFilter(k); pg.setPage(1); }}
            options={[
              { key: 'all', label: 'All', count: count('all') },
              { key: 'registered', label: 'Registered here', count: registered },
              { key: 'approved', label: 'Verified', count: approved },
              { key: 'under_review', label: 'Under review', count: review },
              { key: 'verification_expired', label: 'CEA expired', count: lapsed },
              { key: 'suspended', label: 'Suspended', count: count('suspended') },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Name, CEA no., agency or email" label="Search agents" size="sm" className="min-w-0 flex-1 basis-full sm:basis-auto lg:w-72 lg:flex-none" />
            <SelectMenu
              variant="ghost"
              label="Sort by"
              value={sort}
              onChange={(v) => setSort(v as Sort)}
              options={[{ value: 'name', label: 'Name A–Z' }, { value: 'joined', label: 'Recently joined' }, { value: 'listings', label: 'Most listings' }]}
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            title="No agents match"
            description="Try a different name or clear the filters."
            action={<Button variant="outline" size="sm" onClick={clear}>Clear filters</Button>}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable
                flush
                columns={columns}
                rows={pg.slice}
                rowKey={(a) => a.id}
                onRowClick={(a) => router.push(`/phase1/admin/agents/${a.id}`)}
                caption="Registered agents"
                minWidth={720}
              />
            </div>

            <ul className="divide-y divide-p1-border md:hidden">
              {pg.slice.map((a) => {
                const days = daysLeft(a.ceaValidUntil);
                return (
                  <li key={a.id}>
                    <Link href={`/phase1/admin/agents/${a.id}`} className="flex items-start gap-3 px-4 py-3.5 active:bg-p1-subtle">
                      <Avatar name={a.name} size="md" tone={a.real ? 'primary' : 'neutral'} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[14.5px] font-medium text-p1-text">{a.name}</span>
                          <StatusBadge kind="agent" value={a.status} size="sm" />
                        </div>
                        <div className="mt-0.5 truncate text-[12.5px] text-p1-text-3">{a.agency || a.email}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-p1-text-2">
                          <span className="font-mono">{a.ceaNumber || '—'}</span>
                          <span className="tabular-nums">{a.listingsLive} / {a.listingsTotal} listings</span>
                          {a.plan && <span>{a.plan}</span>}
                          {!a.real && <Pill>Sample</Pill>}
                          {days !== null && days <= 60 && days >= 0 && <span className="inline-flex items-center gap-1 text-p1-warning"><ShieldAlert size={12} aria-hidden />{days}d left</span>}
                        </div>
                      </div>
                      <ChevronRight size={16} className="mt-3 shrink-0 text-p1-text-3" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {rows.length > 0 && (
          <div className={cx('border-t border-p1-border px-4 py-3')}>
            <Pagination page={pg.page} pages={pg.pages} onChange={pg.setPage} from={pg.from} to={pg.to} total={pg.total} noun="agents" />
          </div>
        )}
      </section>
    </>
  );
}
