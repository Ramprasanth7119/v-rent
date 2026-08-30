"use client";

import { useState } from 'react';
import {
  PageHeader, StatCard, Callout, Button, FilterBar, SearchInput, FilterChips, DataTable, Column,
  usePagination, Pagination, EmptyState, PresenterNote,
} from '../../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../../components/phase1/status';
import { ConfirmDialog } from '../../../../components/phase1/overlays';
import { useToast } from '../../../../components/phase1/Toast';
import { SUBSCRIPTIONS, SubscriptionRow, sgd } from '../../../../lib/phase1/data';
import { RefreshCw, Receipt, TrendingUp, Smartphone, AlertCircle } from 'lucide-react';

type Filter = 'all' | 'active' | 'past_due' | 'expired' | 'cancelled';

export default function SubscriptionsPage() {
  const { push } = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [refund, setRefund] = useState<SubscriptionRow | null>(null);
  const [reconciling, setReconciling] = useState(false);

  const active = SUBSCRIPTIONS.filter((s) => s.status === 'active');
  const mrr = Math.round(active.reduce((n, s) => n + s.amountSgd, 0) / 12);
  const paynowShare = Math.round((active.filter((s) => s.method === 'PayNow').length / active.length) * 100);
  const attention = SUBSCRIPTIONS.filter((s) => s.status === 'past_due' || s.status === 'expired');
  const count = (f: Filter) => (f === 'all' ? SUBSCRIPTIONS.length : SUBSCRIPTIONS.filter((s) => s.status === f).length);

  const rows = SUBSCRIPTIONS
    .filter((s) => filter === 'all' || s.status === filter)
    .filter((s) => !q || [s.agent, s.plan].some((v) => v.toLowerCase().includes(q.toLowerCase())));
  const pg = usePagination(rows, 6);

  const columns: Column<SubscriptionRow>[] = [
    { key: 'agent', header: 'Agent', render: (s) => <span className="text-[15px] font-semibold text-p1-text">{s.agent}</span> },
    { key: 'plan', header: 'Plan', render: (s) => <Pill tone="accent">{s.plan}</Pill> },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge kind="subscription" value={s.status} /> },
    { key: 'method', header: 'Method', render: (s) => <span className="text-p1-text-2">{s.method}</span> },
    { key: 'renews', header: 'Renews', hideBelow: 'md', render: (s) => <span className="font-mono text-[13px] text-p1-text-2">{s.renewsOn}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (s) => <span className="font-medium tabular-nums">{sgd(s.amountSgd)}</span> },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right',
      render: (s) => (
        <div className="flex justify-end gap-1">
          {s.status === 'past_due' && <Button variant="outline" size="sm" onClick={() => push({ tone: 'info', title: 'Payment retry requested', body: `${s.agent} will be charged again within the hour.` })}>Retry payment</Button>}
          <Button variant="ghost" size="sm" onClick={() => setRefund(s)}>Refund</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Administration" title="Subscriptions" description="Plan membership, payment status and reconciliation against the payment provider."
        actions={<Button variant="outline" leftIcon={<RefreshCw size={15} />} loading={reconciling} onClick={() => { setReconciling(true); setTimeout(() => { setReconciling(false); push({ tone: 'success', title: 'Reconciliation complete', body: 'No divergence found.' }); }, 1200); }}>Run reconciliation</Button>}
      />

      <div className="vr-stagger mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active subscriptions" value={active.length} hint="across three plans" tone="success" icon={<Receipt size={16} />} />
        <StatCard label="Monthly recurring" value={sgd(mrr)} hint="annual billings ÷ 12" icon={<TrendingUp size={16} />} />
        <StatCard label="Paid by PayNow" value={`${paynowShare}%`} hint="lower processing cost" tone="success" icon={<Smartphone size={16} />} />
        <StatCard label="Needs attention" value={attention.length} hint="past due or expired" tone="warning" icon={<AlertCircle size={16} />} />
      </div>

      <Callout tone="success" title="Daily reconciliation completed — 28 Aug 2026, 03:00" className="mb-4">
        Every subscription was compared with the payment provider. No divergence found.
      </Callout>

      {attention.some((s) => s.status === 'past_due') && (
        <Callout tone="warning" title="A renewal payment failed" className="mb-6">
          Agents whose card was declined move to <strong>Past due</strong>, not Expired. Their listings stay live during the grace period while reminders are sent, so a bank decline does not cost them their inventory.
        </Callout>
      )}

      <FilterBar>
        <SearchInput value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Search by agent or plan" />
        <FilterChips value={filter} onChange={(k) => { setFilter(k); pg.setPage(1); }} options={[
          { key: 'all', label: 'All', count: count('all') },
          { key: 'active', label: 'Active', count: count('active') },
          { key: 'past_due', label: 'Past due', count: count('past_due') },
          { key: 'expired', label: 'Expired', count: count('expired') },
          { key: 'cancelled', label: 'Cancelled', count: count('cancelled') },
        ]} />
      </FilterBar>

      <DataTable columns={columns} rows={pg.slice} rowKey={(s) => s.agent} caption="Subscriptions" minWidth={720}
        empty={<EmptyState compact title="No subscriptions match" action={<Button variant="outline" size="sm" onClick={() => { setQ(''); setFilter('all'); }}>Clear filters</Button>} />} />
      {pg.pages > 1 && <Pagination className="mt-4" page={pg.page} pages={pg.pages} onChange={pg.setPage} from={pg.from} to={pg.to} total={pg.total} />}

      <ConfirmDialog open={!!refund} onClose={() => setRefund(null)} destructive confirmLabel="Issue refund"
        title={refund ? `Refund ${sgd(refund.amountSgd)} to ${refund.agent}?` : ''}
        description="The refund is sent through the payment provider and the subscription is cancelled at the end of the current period. This is written to the audit log."
        onConfirm={() => { push({ tone: 'success', title: 'Refund issued', body: `${sgd(refund!.amountSgd)} returned to ${refund!.agent}.` }); setRefund(null); }} />

      <PresenterNote>
        Refunds are restricted to the finance operator role and audited. A moderator signed in to this console would not see the refund control — permissions are checked on the server, not hidden in the interface. Grace period length is open question O5.
      </PresenterNote>
    </>
  );
}
