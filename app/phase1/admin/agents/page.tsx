"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PageHeader, StatCard, FilterBar, SearchInput, FilterChips, SortButton, DataTable, Column,
  usePagination, Pagination, EmptyState, Avatar, Button, PresenterNote,
} from '../../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../../components/phase1/status';
import { AGENTS, AgentRow, listingsForAgent } from '../../../../lib/phase1/agents';
import { ChevronRight, Users, ShieldCheck, AlertCircle, Building2 } from 'lucide-react';

type Filter = 'all' | 'approved' | 'under_review' | 'verification_expired' | 'suspended';
type Sort = 'name' | 'joined' | 'listings';

export default function AgentsPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('name');

  const count = (s: Filter) => (s === 'all' ? AGENTS.length : AGENTS.filter((a) => a.status === s).length);

  const rows = AGENTS
    .filter((a) => filter === 'all' || a.status === filter)
    .filter((a) => !q || [a.name, a.ceaNumber, a.agency].some((v) => v.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) =>
      sort === 'joined' ? b.joinedAt.localeCompare(a.joinedAt)
      : sort === 'listings' ? listingsForAgent(b.name).length - listingsForAgent(a.name).length
      : a.name.localeCompare(b.name),
    );

  const pg = usePagination(rows, 6);
  const approved = count('approved');
  const attention = AGENTS.length - approved;
  const totalListings = AGENTS.reduce((n, a) => n + listingsForAgent(a.name).length, 0);

  const columns: Column<AgentRow>[] = [
    {
      key: 'agent', header: 'Agent',
      render: (a) => (
        <div className="flex items-center gap-3">
          <Avatar name={a.name} size="md" />
          <div className="min-w-0">
            <Link href={`/phase1/admin/agents/${a.id}`} onClick={(e) => e.stopPropagation()} className="block truncate text-[15px] font-semibold text-p1-text hover:underline underline-offset-4">{a.name}</Link>
            <div className="truncate text-[13px] text-p1-text-3">{a.agency}</div>
          </div>
        </div>
      ),
    },
    { key: 'cea', header: 'CEA number', render: (a) => <span className="font-mono text-[14px]">{a.ceaNumber}</span> },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge kind="agent" value={a.status} /> },
    { key: 'plan', header: 'Plan', render: (a) => (a.plan ? <Pill tone="accent">{a.plan}</Pill> : <span className="text-p1-text-3">—</span>) },
    {
      key: 'listings', header: 'Listings', align: 'right', hideBelow: 'md',
      render: (a) => {
        const ls = listingsForAgent(a.name);
        return <span className="tabular-nums">{ls.filter((l) => l.status === 'published').length} live <span className="text-p1-text-3">/ {ls.length}</span></span>;
      },
    },
    { key: 'joined', header: 'Joined', hideBelow: 'lg', render: (a) => <span className="font-mono text-[13px] text-p1-text-2">{a.joinedAt}</span> },
    { key: 'go', header: <span className="sr-only">Open</span>, width: '40px', render: () => <ChevronRight size={16} className="text-p1-text-3" aria-hidden /> },
  ];

  return (
    <>
      <PageHeader eyebrow="Administration" title="Agents" description="Every registered agent, their verification standing, plan and listing inventory." />

      <div className="vr-stagger mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total agents" value={AGENTS.length} icon={<Users size={16} />} />
        <StatCard label="Verified" value={approved} tone="success" icon={<ShieldCheck size={16} />} />
        <StatCard label="Needs attention" value={attention} tone="warning" hint="review, expired or suspended" icon={<AlertCircle size={16} />} />
        <StatCard label="Listings on platform" value={totalListings} icon={<Building2 size={16} />} />
      </div>

      <FilterBar>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchInput value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Search by name, CEA number or agency" className="flex-1" />
          <SortButton value={sort} onChange={setSort} options={[{ key: 'name', label: 'Name A–Z' }, { key: 'joined', label: 'Recently joined' }, { key: 'listings', label: 'Most listings' }]} />
        </div>
        <FilterChips
          value={filter}
          onChange={(k) => { setFilter(k); pg.setPage(1); }}
          options={[
            { key: 'all', label: 'All', count: count('all') },
            { key: 'approved', label: 'Verified', count: count('approved') },
            { key: 'under_review', label: 'Under review', count: count('under_review') },
            { key: 'verification_expired', label: 'CEA expired', count: count('verification_expired') },
            { key: 'suspended', label: 'Suspended', count: count('suspended') },
          ]}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={pg.slice}
        rowKey={(a) => a.id}
        onRowClick={(a) => router.push(`/phase1/admin/agents/${a.id}`)}
        caption="Registered agents"
        empty={<EmptyState compact icon={<Users size={20} />} title="No agents match" description="Try a different name or clear the search." action={<Button variant="outline" size="sm" onClick={() => { setQ(''); setFilter('all'); }}>Clear search</Button>} />}
      />
      <Pagination className="mt-4" page={pg.page} pages={pg.pages} onChange={pg.setPage} from={pg.from} to={pg.to} total={pg.total} />

      <PresenterNote>
        Suspending an agent takes effect on their very next request, because sessions are held server-side rather than in a self-contained token. That requirement drove the authentication decision in M1.
      </PresenterNote>
    </>
  );
}
