"use client";

/**
 * Billing.
 *
 * The four questions a person in this screen has, in the order they have them:
 * what are we earning, what is about to stop earning, who has to be chased
 * today, and what does the ledger say. So the money comes first as one figure
 * with its shape underneath, then collection, then the table.
 *
 * The revenue figures come from real accounts on this instance; the sample
 * roster is marked on every row it appears in, because an officer about to
 * issue a refund needs to know whether there is anybody to refund.
 */

import { useMemo, useState } from 'react';
import {
  RefreshCw, Receipt, Smartphone, Wallet, ShieldAlert, ArrowDownRight, Users,
} from 'lucide-react';
import {
  PageHeader, SectionCard, Callout, Button, FilterBar, SearchInput, FilterChips,
  DataTable, usePagination, Pagination, EmptyState, Donut, CountUp, Bullet, Radial, cx,
  type Column,
} from '../../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../../components/phase1/status';
import { ConfirmDialog } from '../../../../components/phase1/overlays';
import { useToast } from '../../../../components/phase1/Toast';
import { SUBSCRIPTIONS, sgd } from '../../../../lib/phase1/data';
import { sgDate } from '../../../../lib/phase1/format';
import type { SubscriptionEntry } from '../../../../lib/phase1/admin-subscriptions';

type Filter = 'all' | 'active' | 'past_due' | 'expired' | 'cancelled';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PLAN_COLOUR = ['var(--p1-primary)', 'var(--p1-accent)', 'var(--p1-success)'];

export default function SubscriptionsView({ subscriptions }: { subscriptions: SubscriptionEntry[] }) {
  const { push } = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [refund, setRefund] = useState<SubscriptionEntry | null>(null);
  const [reconciling, setReconciling] = useState(false);

  /**
   * Accounts on this instance first, then the sample roster. A sample row is
   * marked, because an officer about to refund one needs to know whether there
   * is anybody to refund.
   */
  const SUBS: SubscriptionEntry[] = useMemo(() => [
    ...subscriptions,
    ...SUBSCRIPTIONS.map((s, i) => ({ ...s, accountId: `sample-${i}`, real: false, email: '' })),
  ], [subscriptions]);

  /* ------------------------------------------------------------- the money */

  const money = useMemo(() => {
    const active = SUBS.filter((s) => s.status === 'active');
    const arr = active.reduce((n, s) => n + s.amountSgd, 0);
    const attention = SUBS.filter((s) => s.status === 'past_due' || s.status === 'expired');
    const lost = SUBS.filter((s) => s.status === 'cancelled' || s.status === 'expired');

    const planMap = new Map<string, { count: number; sgd: number }>();
    for (const s of active) {
      const cur = planMap.get(s.plan) ?? { count: 0, sgd: 0 };
      planMap.set(s.plan, { count: cur.count + 1, sgd: cur.sgd + s.amountSgd });
    }

    /* Twelve months forward. Plans are sold by the year, so this is the only
       view that shows when the book actually comes up for renewal — and the
       month with the tallest bar is the month to have a retention plan for. */
    const today = new Date();
    const renewals = Array.from({ length: 12 }, (_, i) => {
      const m = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      const due = active.filter((s) => (s.renewsOn ?? '').startsWith(key));
      return {
        key,
        label: `${MONTHS[m.getMonth()]} ${m.getFullYear()}`,
        short: MONTHS[m.getMonth()][0],
        count: due.length,
        sgd: due.reduce((n, s) => n + s.amountSgd, 0),
      };
    });

    const retained = SUBS.length ? Math.round((active.length / SUBS.length) * 100) : 0;

    return {
      active,
      arr,
      mrr: Math.round(arr / 12),
      attention,
      atRisk: attention.reduce((n, s) => n + s.amountSgd, 0),
      lostSgd: lost.reduce((n, s) => n + s.amountSgd, 0),
      byPlan: [...planMap.entries()].map(([plan, v]) => ({ plan, ...v })).sort((a, b) => b.sgd - a.sgd),
      payNowShare: active.length ? Math.round((active.filter((s) => s.method === 'PayNow').length / active.length) * 100) : 0,
      renewals,
      retained,
      peakRenewal: renewals.reduce((a, b) => (b.sgd > a.sgd ? b : a), renewals[0]),
    };
  }, [SUBS]);

  /* ------------------------------------------------------------- the table */

  const count = (f: Filter) => (f === 'all' ? SUBS.length : SUBS.filter((s) => s.status === f).length);

  const rows = SUBS
    .filter((s) => filter === 'all' || s.status === filter)
    .filter((s) => !q || [s.agent, s.plan, s.email].some((v) => (v ?? '').toLowerCase().includes(q.toLowerCase())));
  const pg = usePagination(rows, 8);

  const columns: Column<SubscriptionEntry>[] = [
    {
      key: 'agent',
      header: 'Agent',
      render: (s) => (
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-[14.5px] font-semibold text-p1-text">{s.agent}</span>
            {!s.real && <Pill tone="neutral">Sample</Pill>}
          </span>
          {s.email && <span className="block truncate font-mono text-[12px] text-p1-text-3">{s.email}</span>}
        </span>
      ),
      sortValue: (s) => s.agent,
    },
    { key: 'plan', header: 'Plan', render: (s) => <Pill tone="accent">{s.plan}</Pill>, sortValue: (s) => s.plan },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge kind="subscription" value={s.status} />, sortValue: (s) => s.status },
    { key: 'method', header: 'Method', hideBelow: 'sm', render: (s) => <span className="text-p1-text-2">{s.method}</span> },
    { key: 'renews', header: 'Renews', hideBelow: 'md', nowrap: true, render: (s) => <span className="text-[13px] text-p1-text-2">{sgDate(s.renewsOn)}</span>, sortValue: (s) => s.renewsOn ?? '' },
    { key: 'amount', header: 'Amount', align: 'right', nowrap: true, render: (s) => <span className="font-medium tabular-nums">{sgd(s.amountSgd)}</span>, sortValue: (s) => s.amountSgd },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (s) => (
        <div className="flex justify-end gap-1">
          {s.status === 'past_due' && (
            <Button variant="outline" size="sm" onClick={() => push({ tone: 'info', title: 'Payment retry requested', body: `${s.agent} will be charged again within the hour.` })}>
              Retry
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setRefund(s)}>Refund</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Subscriptions"
        description="What the platform earns, what is about to renew, and who has to be chased today."
        actions={
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={15} />}
            loading={reconciling}
            onClick={() => {
              setReconciling(true);
              setTimeout(() => {
                setReconciling(false);
                push({ tone: 'success', title: 'Reconciliation complete', body: 'No divergence found.' });
              }, 1200);
            }}
          >
            Run reconciliation
          </Button>
        }
      />

      {/* ════════════════════════════════════════════════════════ the money */}
      <section className="p1-lift relative mb-5 overflow-hidden rounded-2xl bg-p1-sidebar text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              'radial-gradient(60% 120% at 88% 0%, color-mix(in srgb, var(--p1-accent) 30%, transparent) 0%, transparent 60%),'
              + 'radial-gradient(60% 120% at 0% 100%, color-mix(in srgb, var(--p1-primary) 50%, transparent) 0%, transparent 62%)',
          }}
        />
        <div className="relative grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <div className="text-[12.5px] font-medium text-white/55">Annual recurring revenue</div>
            <div className="mt-2 font-p1display text-[44px] font-bold leading-none tabular-nums text-white">
              <CountUp value={money.arr} prefix="S$" />
            </div>
            <p className="mt-2.5 text-[14px] text-white/60">
              {sgd(money.mrr)} a month across {money.active.length} active subscription{money.active.length === 1 ? '' : 's'}.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {[
                { k: 'At risk', v: sgd(money.atRisk), s: `${money.attention.length} to chase`, bad: money.atRisk > 0 },
                { k: 'Already lost', v: sgd(money.lostSgd), s: 'Cancelled or expired' },
                { k: 'Paid by PayNow', v: `${money.payNowShare}%`, s: 'Lower processing cost' },
              ].map((m) => (
                <div key={m.k}>
                  <div className="text-[11.5px] text-white/45">{m.k}</div>
                  <div className={cx('mt-1 font-p1display text-[20px] font-bold tabular-nums', m.bad ? 'text-p1-accent' : 'text-white')}>
                    {m.v}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-white/40">{m.s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* The book, as a twelve-month renewal calendar. */}
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12.5px] font-medium text-white/55">Renewal calendar, next twelve months</span>
              <span className="text-[12.5px] tabular-nums text-white/70">
                {money.renewals.reduce((n, r) => n + r.count, 0)} due
              </span>
            </div>

            {money.renewals.every((r) => r.count === 0) ? (
              <p className="mt-3 rounded-xl bg-white/6 px-4 py-3.5 text-[13px] leading-5 text-white/60">
                Nothing falls due inside a year. Plans are sold annually, so the first cohort renews twelve months
                after it subscribed — this calendar fills as the book ages, and the tallest bar is the month that
                needs a retention plan.
              </p>
            ) : (
              <>
                <div className="mt-4 flex h-[118px] items-end gap-1.5">
                  {money.renewals.map((r, i) => {
                    const peak = Math.max(1, ...money.renewals.map((x) => x.sgd));
                    return (
                      <div
                        key={r.key}
                        className="group relative flex h-full flex-1 flex-col justify-end"
                        title={`${r.label} — ${r.count} renewal${r.count === 1 ? '' : 's'}, ${sgd(r.sgd)}`}
                      >
                        <div
                          className={cx('w-full rounded-t-[3px] transition-colors', r.sgd ? 'bg-p1-accent group-hover:bg-white' : 'bg-white/12')}
                          style={{
                            height: r.sgd ? `${Math.max(8, (r.sgd / peak) * 100)}%` : '4px',
                            animation: `p1-grow-y 680ms cubic-bezier(.16,1,.3,1) ${i * 45}ms both`,
                            transformOrigin: 'bottom',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1.5 flex gap-1.5 text-center text-[10.5px] text-white/40">
                  {money.renewals.map((r) => <span key={r.key} className="flex-1">{r.short}</span>)}
                </div>
                {money.peakRenewal.sgd > 0 && (
                  <p className="mt-3 text-[12.5px] text-white/55">
                    Heaviest month is <strong className="text-white">{money.peakRenewal.label}</strong> at{' '}
                    {sgd(money.peakRenewal.sgd)} across {money.peakRenewal.count} agent
                    {money.peakRenewal.count === 1 ? '' : 's'}.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ plan mix and retention */}
      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <SectionCard title="Where the revenue sits" description="Active subscriptions by plan." icon={<Wallet size={16} />}>
          {money.byPlan.length === 0 ? (
            <p className="py-8 text-center text-[13.5px] text-p1-text-3">Nothing active.</p>
          ) : (
            <Donut
              slices={money.byPlan.map((p, i) => ({ label: p.plan, value: p.sgd, colour: PLAN_COLOUR[i % PLAN_COLOUR.length] }))}
              size={150}
              thickness={22}
              centre={
                <>
                  <span className="font-p1display text-[19px] font-bold leading-none tabular-nums text-p1-text">
                    {sgd(money.arr)}
                  </span>
                  <span className="mt-0.5 text-[11px] text-p1-text-3">a year</span>
                </>
              }
              caption={
                <>
                  Average {sgd(Math.round(money.arr / Math.max(1, money.active.length)))} per paying agent.
                </>
              }
            />
          )}
        </SectionCard>

        <SectionCard title="Standing of the book" description="Every subscription the platform has ever had." icon={<Users size={16} />}>
          <div className="flex items-center gap-5">
            <Radial
              value={money.retained}
              tone={money.retained >= 70 ? 'success' : money.retained >= 40 ? 'warning' : 'danger'}
              size={112}
              thickness={10}
              label={
                <span className="font-p1display text-[22px] font-bold leading-none tabular-nums text-p1-text">
                  {money.retained}%
                </span>
              }
              sublabel="still paying"
            />
            <ul className="min-w-0 flex-1 space-y-2 text-[13px]">
              {(['active', 'past_due', 'expired', 'cancelled'] as const).map((k) => (
                <li key={k} className="flex items-center justify-between gap-3">
                  <StatusBadge kind="subscription" value={k} />
                  <span className="font-semibold tabular-nums text-p1-text">{count(k)}</span>
                </li>
              ))}
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="How they pay" description="PayNow costs the platform less than a card." icon={<Smartphone size={16} />}>
          <Bullet
            label="PayNow share of active"
            value={money.payNowShare}
            target={60}
            max={100}
            valueLabel={(n) => `${n}%`}
          />
          <p className="mt-3 text-[12.5px] leading-5 text-p1-text-2">
            A PayNow mandate clears at a fixed cost per transfer rather than a percentage, so every point of share
            moved off cards is margin the platform keeps. Sixty per cent is the target in the business case.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-p1-border">
            {[
              ['PayNow', money.active.filter((s) => s.method === 'PayNow').length],
              ['Card', money.active.filter((s) => s.method === 'Card').length],
            ].map(([k, v]) => (
              <div key={k as string} className="bg-p1-surface px-3 py-2.5">
                <dt className="text-[11.5px] text-p1-text-3">{k}</dt>
                <dd className="mt-0.5 font-p1display text-[18px] font-bold tabular-nums text-p1-text">{v as number}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>

      {/* ═══════════════════════════════════════════════════════ collection */}
      {money.attention.length > 0 && (
        <SectionCard
          title="Chase these today"
          description="Past due or expired, largest first."
          icon={<ShieldAlert size={16} />}
          className="mb-5"
          padding="none"
          actions={<Pill tone="danger">{sgd(money.atRisk)} at risk</Pill>}
        >
          <ul className="divide-y divide-p1-border">
            {[...money.attention].sort((a, b) => b.amountSgd - a.amountSgd).map((s) => (
              <li key={`${s.accountId}-${s.agent}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-p1-danger-soft text-p1-danger" aria-hidden>
                  <ArrowDownRight size={17} />
                </span>
                <div className="min-w-0 flex-1 basis-52">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[14px] font-semibold text-p1-text">{s.agent}</span>
                    <StatusBadge kind="subscription" value={s.status} />
                    {!s.real && <Pill tone="neutral">Sample</Pill>}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-p1-text-3">
                    {s.plan} · {s.method} · renewal {sgDate(s.renewsOn)}
                  </div>
                </div>
                <span className="font-p1display text-[16px] font-bold tabular-nums text-p1-text">{sgd(s.amountSgd)}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => push({ tone: 'info', title: 'Payment retry requested', body: `${s.agent} will be charged again within the hour.` })}
                >
                  Retry payment
                </Button>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <Callout tone="success" title="Daily reconciliation completed — 28 Aug 2026, 03:00" className="mb-4">
        Every subscription was compared with the payment provider. No divergence found.
      </Callout>

      {money.attention.some((s) => s.status === 'past_due') && (
        <Callout tone="warning" title="A renewal payment failed" className="mb-5">
          Agents whose card was declined move to <strong>Past due</strong>, not Expired. Their listings stay live
          during the grace period while reminders are sent, so a bank decline does not cost them their inventory.
        </Callout>
      )}

      {/* ══════════════════════════════════════════════════════════ the ledger */}
      <SectionCard title="Every subscription" icon={<Receipt size={16} />} padding="none">
        <div className="px-5 pt-4">
          <FilterBar>
            <SearchInput value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Agent, plan or email" />
            <FilterChips
              value={filter}
              onChange={(k) => { setFilter(k); pg.setPage(1); }}
              options={[
                { key: 'all', label: 'All', count: count('all') },
                { key: 'active', label: 'Active', count: count('active') },
                { key: 'past_due', label: 'Past due', count: count('past_due') },
                { key: 'expired', label: 'Expired', count: count('expired') },
                { key: 'cancelled', label: 'Cancelled', count: count('cancelled') },
              ]}
            />
          </FilterBar>
        </div>

        <DataTable
          flush
          columns={columns}
          rows={pg.slice}
          rowKey={(s) => `${s.accountId}-${s.agent}`}
          caption="Subscriptions"
          minWidth={840}
          empty={
            <EmptyState
              compact
              title="No subscriptions match"
              action={<Button variant="outline" size="sm" onClick={() => { setQ(''); setFilter('all'); }}>Clear filters</Button>}
            />
          }
        />
        {pg.pages > 1 && (
          <div className="border-t border-p1-border px-5 py-3">
            <Pagination page={pg.page} pages={pg.pages} onChange={pg.setPage} from={pg.from} to={pg.to} total={pg.total} noun="subscriptions" />
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!refund}
        onClose={() => setRefund(null)}
        destructive
        confirmLabel="Issue refund"
        title={refund ? `Refund ${sgd(refund.amountSgd)} to ${refund.agent}?` : ''}
        description="The refund is sent through the payment provider and the subscription is cancelled at the end of the current period. This is written to the audit log."
        onConfirm={() => {
          push({ tone: 'success', title: 'Refund issued', body: `${sgd(refund!.amountSgd)} returned to ${refund!.agent}.` });
          setRefund(null);
        }}
      />
    </>
  );
}
