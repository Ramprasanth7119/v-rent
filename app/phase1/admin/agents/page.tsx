"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '../../../../components/ui/Card';
import { PageHead, Stat, SpecNote } from '../../../../components/phase1/bits';
import { AGENTS, listingsForAgent } from '../../../../lib/phase1/agents';
import { Search, ChevronRight } from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
  under_review: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400',
  verification_expired: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400',
};

const STATUS_LABEL: Record<string, string> = {
  approved: 'Approved',
  under_review: 'Under review',
  suspended: 'Suspended',
  verification_expired: 'CEA expired',
};

export default function AgentsPage() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const rows = AGENTS.filter((a) => {
    const matchesQ =
      !q ||
      [a.name, a.ceaNumber, a.agency].some((v) => v.toLowerCase().includes(q.toLowerCase()));
    const matchesF = filter === 'all' || a.status === filter;
    return matchesQ && matchesF;
  });

  const approved = AGENTS.filter((a) => a.status === 'approved').length;
  const attention = AGENTS.filter((a) => a.status !== 'approved').length;
  const totalListings = AGENTS.reduce((n, a) => n + listingsForAgent(a.name).length, 0);

  return (
    <>
      <PageHead
        module="M14 · Administrative Console"
        title="Agents"
        blurb="Every registered agent, their verification standing, plan and listing inventory."
      />

      <div className="vr-stagger mb-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Total agents" value={AGENTS.length} />
        <Stat label="Approved" value={approved} tone="good" />
        <Stat label="Needs attention" value={attention} tone="warn" sub="Review or expired" />
        <Stat label="Listings on platform" value={totalListings} />
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, CEA number or agency"
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder-neutral-400 focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/10"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['all', 'approved', 'under_review', 'verification_expired'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-brand-navy text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800'
                }`}
              >
                {f === 'all' ? 'All' : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-2.5">
        {rows.map((a) => {
          const listings = listingsForAgent(a.name);
          const published = listings.filter((l) => l.status === 'published').length;
          return (
            <Link key={a.id} href={`/phase1/admin/agents/${a.id}`}>
              <Card hoverEffect className="flex flex-wrap items-center gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
                  {a.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{a.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLE[a.status]}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="font-mono">{a.ceaNumber}</span> · {a.agency}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500">Plan</div>
                    <div className="text-xs font-medium text-foreground">{a.plan ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500">Listings</div>
                    <div className="text-xs font-medium tabular-nums text-foreground">
                      {published} live <span className="text-neutral-400">/ {listings.length}</span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-neutral-300 dark:text-neutral-600" />
                </div>
              </Card>
            </Link>
          );
        })}
        {rows.length === 0 && (
          <Card className="py-10 text-center text-sm text-neutral-400">No agents match that search.</Card>
        )}
      </div>

      <SpecNote>
        Suspending an agent from this screen takes effect on their very next request, because sessions are
        held server-side rather than in a self-contained token. That requirement is what drove the
        authentication decision in M1.
      </SpecNote>
    </>
  );
}
