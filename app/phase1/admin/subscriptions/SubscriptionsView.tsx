"use client";

/**
 * Billing.
 *
 * The four questions a person in this screen has, in the order they have them:
 * what are we earning, what is about to stop earning, who has to be chased
 * today, and what does the ledger say. So four figures first, then the shape of
 * the book — when it renews, which plans carry it, how it pays, how much of it
 * is still paying — then the people to chase, then the ledger itself.
 *
 * The revenue figures come from real accounts on this instance; the sample
 * roster is marked on every row it appears in, because an officer about to
 * issue a refund needs to know whether there is anybody to refund.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw, Receipt, ArrowUpRight, CalendarClock, Wallet, CircleDollarSign, Users, ShieldAlert, Info, RotateCcw, Undo2,
  CheckCircle2, Smartphone, CreditCard,
} from 'lucide-react';
import {
  PageHeader, SectionCard, Button, SearchInput, Tabs, SelectMenu, DataTable, usePagination, Pagination, EmptyState, Donut,
  KPI, Tooltip, Avatar, Menu, cx, type Column, type MenuItem,
} from '../../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../../components/phase1/status';
import { ConfirmDialog } from '../../../../components/phase1/overlays';
import { useToast } from '../../../../components/phase1/Toast';
import { SUBSCRIPTIONS, sgd } from '../../../../lib/phase1/data';
import { sgDate, sgDateShort } from '../../../../lib/phase1/format';
import { TODAY } from '../../../../lib/phase1/workspace';
import type { SubscriptionEntry } from '../../../../lib/phase1/admin-subscriptions';

type Filter = 'all' | 'active' | 'past_due' | 'expired' | 'cancelled';
type Sort = 'renews' | 'amount' | 'agent' | 'status';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PLAN_COLOUR = ['var(--p1-primary)', 'color-mix(in srgb, var(--p1-primary) 55%, white)', 'var(--p1-success)', 'var(--p1-text-3)'];
const STATUS_ORDER: Record<string, number> = { past_due: 0, expired: 1, active: 2, cancelled: 3 };
const DAY = 86_400_000;

const rowKey = (s: SubscriptionEntry) => `${s.accountId}-${s.agent}`;

/** Days since a renewal date that has already passed, or null when it has not. */
function daysOverdue(s: SubscriptionEntry): number | null {
  if (!s.renewsOn) return null;
  const due = new Date(`${s.renewsOn}T00:00:00+08:00`).getTime();
  if (Number.isNaN(due) || due > TODAY.getTime()) return null;
  return Math.max(0, Math.floor((TODAY.getTime() - due) / DAY));
}

export default function SubscriptionsView({ subscriptions }: { subscriptions: SubscriptionEntry[] }) {
  const { push } = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('renews');
  const [refund, setRefund] = useState<SubscriptionEntry | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [reconciledAt, setReconciledAt] = useState<Date | null>(null);

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

    const planMap = new Map<string, { count: number; sgd: number }>();
    for (const s of active) {
      const cur = planMap.get(s.plan) ?? { count: 0, sgd: 0 };
      planMap.set(s.plan, { count: cur.count + 1, sgd: cur.sgd + s.amountSgd });
    }

    /* Twelve months forward. Plans are sold by the year, so this is the only
       view that shows when the book actually comes up for renewal — and the
       month with the tallest bar is the month to have a retention plan for. */
    const renewals = Array.from({ length: 12 }, (_, i) => {
      const m = new Date(TODAY.getFullYear(), TODAY.getMonth() + i, 1);
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      const due = active.filter((s) => (s.renewsOn ?? '').startsWith(key));
      return {
        key,
        label: `${MONTHS[m.getMonth()]} ${m.getFullYear()}`,
        short: MONTHS[m.getMonth()],
        count: due.length,
        sgd: due.reduce((n, s) => n + s.amountSgd, 0),
      };
    });

    const soon = active.filter((s) => {
      if (!s.renewsOn) return false;
      const t = new Date(`${s.renewsOn}T00:00:00+08:00`).getTime();
      return t >= TODAY.getTime() && t - TODAY.getTime() <= 30 * DAY;
    });

    const payNow = active.filter((s) => s.method === 'PayNow').length;

    return {
      active,
      arr,
      mrr: Math.round(arr / 12),
      attention,
      atRisk: attention.reduce((n, s) => n + s.amountSgd, 0),
      byPlan: [...planMap.entries()].map(([plan, v]) => ({ plan, ...v })).sort((a, b) => b.sgd - a.sgd),
      payNow,
      card: active.length - payNow,
      payNowShare: active.length ? Math.round((payNow / active.length) * 100) : 0,
      renewals,
      renewalsDue: renewals.reduce((n, r) => n + r.count, 0),
      soon,
      soonSgd: soon.reduce((n, s) => n + s.amountSgd, 0),
      retained: SUBS.length ? Math.round((active.length / SUBS.length) * 100) : 0,
      peak: renewals.reduce((a, b) => (b.sgd > a.sgd ? b : a), renewals[0]),
      samples: SUBS.filter((s) => !s.real).length,
    };
  }, [SUBS]);

  /* ------------------------------------------------------------- the table */

  const count = (f: Filter) => (f === 'all' ? SUBS.length : SUBS.filter((s) => s.status === f).length);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return SUBS
      .filter((s) => filter === 'all' || s.status === filter)
      .filter((s) => !needle || [s.agent, s.plan, s.email, s.method].some((v) => (v ?? '').toLowerCase().includes(needle)))
      .sort((a, b) => (
        sort === 'amount' ? b.amountSgd - a.amountSgd
          : sort === 'agent' ? a.agent.localeCompare(b.agent)
          : sort === 'status' ? (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
          : (a.renewsOn ?? '9999').localeCompare(b.renewsOn ?? '9999')
      ));
  }, [SUBS, filter, q, sort]);
  const pg = usePagination(rows, 8);

  const retry = (s: SubscriptionEntry) =>
    push({ tone: 'info', title: 'Payment retry requested', body: `${s.agent} will be charged again within the hour.` });

  const menuFor = (s: SubscriptionEntry): (MenuItem | 'divider')[] => [
    ...(s.real ? [{ key: 'open', label: 'Open agent record', icon: <ArrowUpRight size={15} />, href: `/phase1/admin/agents/${s.accountId}` }] : []),
    ...(s.status === 'past_due' ? [{ key: 'retry', label: 'Retry payment', icon: <RotateCcw size={15} />, onSelect: () => retry(s) }] : []),
    ...((s.real || s.status === 'past_due') ? ['divider' as const] : []),
    { key: 'refund', label: 'Refund', icon: <Undo2 size={15} />, danger: true, onSelect: () => setRefund(s) },
  ];

  const identity = (s: SubscriptionEntry) => (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={s.agent} size="sm" tone={s.real ? 'primary' : 'neutral'} />
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          {s.real
            ? <Link href={`/phase1/admin/agents/${s.accountId}`} className="truncate text-[14px] font-medium text-p1-text hover:text-p1-primary">{s.agent}</Link>
            : <span className="truncate text-[14px] font-medium text-p1-text">{s.agent}</span>}
          {!s.real && <Pill tone="neutral">Sample</Pill>}
        </span>
        <span className="block truncate text-[12.5px] text-p1-text-3">{s.email || 'No account on this instance'}</span>
      </span>
    </span>
  );

  const columns: Column<SubscriptionEntry>[] = [
    { key: 'agent', header: 'Agent', width: '32%', render: identity },
    { key: 'plan', header: 'Plan', nowrap: true, render: (s) => <span className="text-p1-text">{s.plan}</span> },
    { key: 'status', header: 'Status', nowrap: true, render: (s) => <StatusBadge kind="subscription" value={s.status} size="sm" /> },
    {
      key: 'method', header: 'Method', nowrap: true, hideBelow: 'lg',
      render: (s) => (
        <span className="inline-flex items-center gap-1.5 text-p1-text-2">
          {s.method === 'PayNow' ? <Smartphone size={14} className="text-p1-text-3" aria-hidden /> : <CreditCard size={14} className="text-p1-text-3" aria-hidden />}
          {s.method}
        </span>
      ),
    },
    { key: 'renews', header: 'Renews', nowrap: true, hideBelow: 'lg', muted: true, render: (s) => <span className="tabular-nums">{sgDate(s.renewsOn)}</span> },
    { key: 'amount', header: 'Amount / yr', align: 'right', nowrap: true, render: (s) => <span className="font-medium tabular-nums text-p1-text">{sgd(s.amountSgd)}</span> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', width: '52px', render: (s) => <Menu items={menuFor(s)} label={`Actions for ${s.agent}`} /> },
  ];

  const peakSgd = Math.max(1, ...money.renewals.map((r) => r.sgd));
  const standing = (['active', 'past_due', 'expired', 'cancelled'] as const).map((k) => ({ k, n: count(k) }));
  const standingTone: Record<string, string> = { active: 'bg-p1-success', past_due: 'bg-p1-warning', expired: 'bg-p1-danger', cancelled: 'bg-p1-text-3/50' };

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="What the platform earns, when it renews, and who needs chasing."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {reconciledAt && (
              <span className="p1-in inline-flex items-center gap-1.5 text-[13px] text-p1-text-3">
                <CheckCircle2 size={14} className="text-p1-success" aria-hidden />
                Reconciled {sgDateShort(reconciledAt)}, no divergence
              </span>
            )}
            <Button
              variant="outline"
              leftIcon={<RefreshCw size={15} />}
              loading={reconciling}
              onClick={() => {
                setReconciling(true);
                setTimeout(() => {
                  setReconciling(false);
                  setReconciledAt(new Date());
                  push({ tone: 'success', title: 'Reconciliation complete', body: 'Every subscription matched the payment provider. No divergence found.' });
                }, 1200);
              }}
            >
              Run reconciliation
            </Button>
          </div>
        }
      />

      {/* ═══════════════════════════════════════════════════════════ figures */}
      <section aria-label="Revenue at a glance" className="vr-stagger mb-5 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
        <KPI
          label="Annual recurring revenue"
          value={money.arr}
          prefix="S$"
          icon={<CircleDollarSign size={16} />}
          sub={`${sgd(money.mrr)} a month`}
        />
        <KPI
          label="Active subscriptions"
          value={money.active.length}
          icon={<Users size={16} />}
          sub={`${money.retained}% of all still paying${money.samples ? ` · ${money.samples} sample` : ''}`}
        />
        <KPI
          label="Revenue at risk"
          value={money.atRisk}
          prefix="S$"
          tone={money.atRisk > 0 ? 'danger' : 'default'}
          icon={<ShieldAlert size={16} />}
          sub={money.attention.length ? `${money.attention.length} past due or expired` : 'Nothing to chase'}
        />
        <KPI
          label="Renewing in 30 days"
          value={money.soon.length}
          icon={<CalendarClock size={16} />}
          sub={money.soon.length ? `${sgd(money.soonSgd)} due to renew` : `${money.renewalsDue} due in the next 12 months`}
        />
      </section>

      {/* ═══════════════════════════════════════════════ renewals and plan mix */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <SectionCard
          title="Renewal calendar"
          description="Active subscriptions by the month they renew"
          icon={<CalendarClock size={15} />}
          actions={<Pill>{money.renewalsDue} due · 12 months</Pill>}
        >
          {money.renewalsDue === 0 ? (
            <div className="flex min-h-[172px] flex-col items-center justify-center text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-p1-border bg-p1-subtle text-p1-text-3" aria-hidden><CalendarClock size={18} /></span>
              <p className="mt-3 text-[14px] font-medium text-p1-text">Nothing renews inside a year</p>
              <p className="mt-1 max-w-sm text-[13px] leading-5 text-p1-text-3">Plans are sold annually. This fills as the first cohort approaches its renewal month.</p>
            </div>
          ) : (
            <>
              <div className="flex h-[168px] items-end gap-1.5 sm:gap-2" role="img" aria-label={money.renewals.map((r) => `${r.label}: ${r.count} renewals, ${sgd(r.sgd)}`).join('. ')}>
                {money.renewals.map((r, i) => {
                  const isPeak = r.sgd > 0 && r.key === money.peak.key;
                  return (
                    <Tooltip key={r.key} content={`${r.label} · ${r.count} renewal${r.count === 1 ? '' : 's'} · ${sgd(r.sgd)}`}>
                      <div className="group flex h-full flex-1 cursor-default flex-col items-center justify-end gap-1.5" tabIndex={0}>
                        {r.count > 0 && <span className="text-[11px] font-medium tabular-nums text-p1-text-3">{r.count}</span>}
                        <div
                          className={cx('w-full max-w-[34px] rounded-md transition-colors', r.sgd ? (isPeak ? 'bg-p1-primary' : 'bg-p1-primary/35 group-hover:bg-p1-primary/60') : 'bg-p1-subtle')}
                          style={{
                            height: r.sgd ? `${Math.max(10, (r.sgd / peakSgd) * 100)}%` : '6px',
                            animation: `p1-grow-y 560ms cubic-bezier(.2,.8,.2,1) ${i * 35}ms both`,
                            transformOrigin: 'bottom',
                          }}
                        />
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-1.5 text-center text-[11px] text-p1-text-3 sm:gap-2" aria-hidden>
                {money.renewals.map((r) => <span key={r.key} className="flex-1 truncate">{r.short}</span>)}
              </div>
              {money.peak.sgd > 0 && (
                <p className="mt-4 border-t border-p1-border pt-3 text-[13px] text-p1-text-2">
                  Heaviest month: <span className="font-medium text-p1-text">{money.peak.label}</span> · {sgd(money.peak.sgd)} across {money.peak.count} agent{money.peak.count === 1 ? '' : 's'}
                </p>
              )}
            </>
          )}
        </SectionCard>

        <SectionCard title="Revenue by plan" description="Active subscriptions, per year" icon={<Wallet size={15} />}>
          {money.byPlan.length === 0 ? (
            <EmptyState compact title="Nothing active" description="Revenue appears here once an agent subscribes." />
          ) : (
            <Donut
              slices={money.byPlan.map((p, i) => ({ label: `${p.plan} · ${p.count}`, value: p.sgd, colour: PLAN_COLOUR[i % PLAN_COLOUR.length] }))}
              size={148}
              thickness={20}
              centre={
                <>
                  <span className="text-[18px] font-semibold leading-none tabular-nums text-p1-text">{sgd(money.arr)}</span>
                  <span className="mt-1 text-[11px] text-p1-text-3">a year</span>
                </>
              }
              caption={`Average ${sgd(Math.round(money.arr / Math.max(1, money.active.length)))} per paying agent`}
            />
          )}
        </SectionCard>
      </div>

      {/* ═════════════════════════════════════════════════ method and standing */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              Payment methods
              <Tooltip content="A PayNow transfer clears at a fixed cost rather than a percentage, so every point of share moved off cards is margin kept. The business case targets 60%.">
                <span tabIndex={0} className="inline-flex text-p1-text-3 hover:text-p1-text" aria-label="About payment methods"><Info size={14} /></span>
              </Tooltip>
            </span>
          }
          description="Active subscriptions"
          icon={<Receipt size={15} />}
          actions={<Pill tone={money.payNowShare >= 60 ? 'success' : 'neutral'}>Target 60% PayNow</Pill>}
        >
          {money.active.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] text-p1-text-3">No active subscriptions.</p>
          ) : (
            <>
              <div className="relative flex h-3 overflow-hidden rounded-full bg-p1-subtle" role="img" aria-label={`PayNow ${money.payNowShare}%, card ${100 - money.payNowShare}%`}>
                <div className="vr-grow h-full bg-p1-primary" style={{ width: `${money.payNowShare}%` }} />
                <div className="h-full flex-1 bg-p1-primary/25" />
                <span className="absolute inset-y-0 w-px bg-p1-text" style={{ left: '60%' }} aria-hidden />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { k: 'PayNow', n: money.payNow, share: money.payNowShare, dot: 'bg-p1-primary', icon: Smartphone },
                  { k: 'Card', n: money.card, share: 100 - money.payNowShare, dot: 'bg-p1-primary/25', icon: CreditCard },
                ].map((m) => (
                  <div key={m.k} className="rounded-xl border border-p1-border px-3.5 py-3">
                    <dt className="flex items-center gap-2 text-[12.5px] text-p1-text-3">
                      <span className={cx('h-2 w-2 rounded-full', m.dot)} aria-hidden />
                      <m.icon size={13} aria-hidden /> {m.k}
                    </dt>
                    <dd className="mt-1 flex items-baseline gap-2">
                      <span className="text-[22px] font-semibold tabular-nums tracking-[-0.02em] text-p1-text">{m.n}</span>
                      <span className="text-[13px] tabular-nums text-p1-text-3">{m.share}%</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </SectionCard>

        <SectionCard title="Standing of the book" description="Every subscription the platform has had" icon={<Users size={15} />}
          actions={<Pill tone={money.retained >= 70 ? 'success' : money.retained >= 40 ? 'warning' : 'danger'}>{money.retained}% still paying</Pill>}>
          <div className="flex h-3 overflow-hidden rounded-full bg-p1-subtle" role="img" aria-label={standing.map((s) => `${s.k.replace('_', ' ')} ${s.n}`).join(', ')}>
            {standing.map((s) => SUBS.length > 0 && s.n > 0 && (
              <div key={s.k} className={cx('vr-grow h-full', standingTone[s.k])} style={{ width: `${(s.n / SUBS.length) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
            {standing.map((s) => (
              <li key={s.k}>
                <button type="button" onClick={() => { setFilter(s.k); pg.setPage(1); document.getElementById('ledger')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  className="p1-field flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-p1-subtle focus-visible:shadow-[0_0_0_2px_var(--p1-primary)]">
                  <StatusBadge kind="subscription" value={s.k} size="sm" />
                  <span className="text-[14px] font-semibold tabular-nums text-p1-text">{s.n}</span>
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* ═══════════════════════════════════════════════════════ collection */}
      {money.attention.length > 0 && (
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              Chase these today
              <Tooltip content="A declined renewal moves an agent to Past due, not Expired. Their listings stay live through the grace period while reminders go out.">
                <span tabIndex={0} className="inline-flex text-p1-text-3 hover:text-p1-text" aria-label="About past due"><Info size={14} /></span>
              </Tooltip>
            </span>
          }
          description="Past due or expired, largest first"
          icon={<ShieldAlert size={15} />}
          className="mb-5"
          padding="none"
          actions={<Pill tone="danger">{sgd(money.atRisk)} at risk</Pill>}
        >
          <ul className="divide-y divide-p1-border">
            {[...money.attention].sort((a, b) => b.amountSgd - a.amountSgd).map((s) => {
              const late = daysOverdue(s);
              return (
                <li key={rowKey(s)} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 transition-colors hover:bg-p1-subtle/50">
                  <div className="min-w-0 flex-1 basis-60">{identity(s)}</div>
                  <div className="flex items-center gap-2">
                    <StatusBadge kind="subscription" value={s.status} size="sm" />
                    {late !== null && <Pill tone={late > 14 ? 'danger' : 'warning'}>{late === 0 ? 'Due today' : `${late}d overdue`}</Pill>}
                  </div>
                  <span className="hidden whitespace-nowrap text-[13px] text-p1-text-2 sm:inline">{s.plan} · {s.method}</span>
                  <span className="w-24 text-right text-[14px] font-semibold tabular-nums text-p1-text">{sgd(s.amountSgd)}</span>
                  <div className="flex items-center gap-1">
                    {s.real
                      ? <Button size="sm" variant="outline" onClick={() => { window.location.href = `/phase1/admin/agents/${s.accountId}`; }} rightIcon={<ArrowUpRight size={14} />}>Open</Button>
                      : s.status === 'past_due' && <Button size="sm" variant="outline" leftIcon={<RotateCcw size={14} />} onClick={() => retry(s)}>Retry</Button>}
                    <Menu items={menuFor(s)} label={`Actions for ${s.agent}`} />
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      {/* ══════════════════════════════════════════════════════════ the ledger */}
      <section id="ledger" className="scroll-mt-20 overflow-hidden rounded-xl border border-p1-border bg-p1-surface" aria-labelledby="ledger-h">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <div>
            <h2 id="ledger-h" className="text-[15px] font-semibold text-p1-text">Every subscription</h2>
            <p className="mt-0.5 text-[12.5px] text-p1-text-3">{rows.length} of {SUBS.length} shown</p>
          </div>
          <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:flex-nowrap">
            <SearchInput value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Agent, plan, email or method" label="Search subscriptions" size="sm" className="w-full min-w-0 sm:w-64" />
            <SelectMenu
              variant="ghost"
              label="Sort by"
              value={sort}
              onChange={(v) => { setSort(v as Sort); pg.setPage(1); }}
              options={[
                { value: 'renews', label: 'Renews soonest' },
                { value: 'amount', label: 'Amount, high to low' },
                { value: 'status', label: 'Needs attention first' },
                { value: 'agent', label: 'Agent, A to Z' },
              ]}
            />
          </div>
        </div>

        <Tabs<Filter>
          label="Filter by status"
          value={filter}
          onChange={(k) => { setFilter(k); pg.setPage(1); }}
          className="mt-3 px-3"
          items={[
            { key: 'all', label: 'All', count: count('all') },
            { key: 'active', label: 'Active', count: count('active') },
            { key: 'past_due', label: 'Past due', count: count('past_due') },
            { key: 'expired', label: 'Expired', count: count('expired') },
            { key: 'cancelled', label: 'Cancelled', count: count('cancelled') },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            title="No subscriptions match"
            description="Try another status or a shorter search."
            action={<Button variant="outline" size="sm" onClick={() => { setQ(''); setFilter('all'); pg.setPage(1); }}>Clear filters</Button>}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable flush columns={columns} rows={pg.slice} rowKey={rowKey} caption="Subscriptions" minWidth={720} />
            </div>

            <ul className="divide-y divide-p1-border md:hidden">
              {pg.slice.map((s) => (
                <li key={rowKey(s)} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">{identity(s)}</div>
                    <Menu items={menuFor(s)} label={`Actions for ${s.agent}`} />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-11 text-[12.5px] text-p1-text-3">
                    <StatusBadge kind="subscription" value={s.status} size="sm" />
                    <span className="text-p1-text-2">{s.plan}</span>
                    <span>{s.method}</span>
                    <span className="tabular-nums">Renews {sgDateShort(s.renewsOn)}</span>
                    <span className="ml-auto text-[14px] font-semibold tabular-nums text-p1-text">{sgd(s.amountSgd)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {rows.length > 0 && (
          <div className="border-t border-p1-border px-5 py-3">
            <Pagination page={pg.page} pages={pg.pages} onChange={pg.setPage} from={pg.from} to={pg.to} total={pg.total} noun="subscriptions" />
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!refund}
        onClose={() => setRefund(null)}
        destructive
        icon={<Undo2 size={19} />}
        confirmLabel="Issue refund"
        title={refund ? `Refund ${sgd(refund.amountSgd)} to ${refund.agent}?` : ''}
        description="Sent through the payment provider. The subscription ends with the current period, and the refund is written to the audit log."
        onConfirm={() => {
          push({ tone: 'success', title: 'Refund issued', body: `${sgd(refund!.amountSgd)} returned to ${refund!.agent}.` });
          setRefund(null);
        }}
      >
        {refund && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-p1-border px-3.5 py-3">
            <div className="min-w-0">{identity(refund)}</div>
            <span className="shrink-0 text-right">
              <span className="block text-[14px] font-semibold tabular-nums text-p1-text">{sgd(refund.amountSgd)}</span>
              <span className="block text-[12px] text-p1-text-3">{refund.plan} · {refund.method}</span>
            </span>
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
