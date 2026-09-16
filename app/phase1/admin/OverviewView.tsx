"use client";

/**
 * The operations overview.
 *
 * An ops console is opened for one reason — to find out what needs a person —
 * so that is the first tile and the first card. Everything below it is
 * context: how fast the queues are cleared against what was promised, what the
 * platform served, when the work arrives, who is carrying it, and what is
 * earning.
 *
 * Every figure is derived on the server from the account store, the
 * workspaces, the audit trail and the request log. Colour is used only where
 * it carries meaning — a queue past its promise, an error — and explanations
 * sit behind tooltips rather than under every heading.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ShieldCheck, Gavel, Receipt, Users, ArrowRight, Building2, Activity, Clock, Wallet, ArrowUpRight, Info,
  Gauge as GaugeIcon, TriangleAlert, ChevronRight,
} from 'lucide-react';
import {
  SectionCard, LinkButton, AreaChart, Donut, Heatmap, Bullet, KPI, Avatar, Tooltip, MiniBars, cx,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { ACTION_LABEL, IS_ADVERSE } from '../../../lib/phase1/audit-labels';
import { sgd, LISTING_STATUS_LABEL, type ListingStatus } from '../../../lib/phase1/data';
import { sgDateTime } from '../../../lib/phase1/format';
import type { OpsSnapshot, QueueHealth } from '../../../lib/phase1/admin-insight';

/** Listing states coloured by what they mean: live is good, stopped needs a look, refused is bad. */
const STATUS_COLOUR: Record<string, string> = {
  published: 'var(--p1-success)',
  draft: 'var(--p1-border-strong)',
  pending_review: 'var(--p1-info)',
  paused: 'var(--p1-warning)',
  rejected: 'var(--p1-danger)',
};

const QUEUE_ICON: Record<string, typeof ShieldCheck> = {
  verification: ShieldCheck,
  moderation: Gavel,
  billing: Receipt,
};

const hours = (h: number | null) => {
  if (h === null) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
};

const PLAN_COLOUR = ['bg-p1-primary', 'bg-p1-info', 'bg-p1-success'];

/** Rendered only after mount, so the server and browser cannot disagree. */
function LiveClock() {
  const [now, setNow] = useState<string>('');
  useEffect(() => {
    const tick = () => setNow(new Intl.DateTimeFormat('en-SG', {
      timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date()));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{now || '--:--'}</span>;
}

function Explain({ children }: { children: string }) {
  return (
    <Tooltip content={children}>
      <span tabIndex={0} className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full text-p1-text-3 hover:text-p1-text" aria-label={children}>
        <Info size={14} aria-hidden />
      </span>
    </Tooltip>
  );
}

function CardTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return <span className="inline-flex items-center gap-1.5">{children}{hint && <Explain>{hint}</Explain>}</span>;
}

/* --------------------------------------------------------------- queues */

function QueueRow({ q }: { q: QueueHealth }) {
  const Icon = QUEUE_ICON[q.id] ?? ShieldCheck;
  const empty = q.count === 0;
  const pressure = q.oldestHours === null ? 0 : Math.min(100, (q.oldestHours / q.slaHours) * 100);
  const tone = empty ? 'neutral' : q.breached > 0 || pressure >= 100 ? 'danger' : pressure >= 70 ? 'warning' : 'success';
  const bar = { neutral: 'bg-p1-border-strong', danger: 'bg-p1-danger', warning: 'bg-p1-warning', success: 'bg-p1-success' }[tone];

  return (
    <li>
      <Link
        href={q.href}
        className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-p1-subtle/60 sm:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-p1-border bg-p1-surface text-p1-text-2" aria-hidden>
          <Icon size={18} />
        </span>

        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-p1-text">{q.title}</span>
          <span className="block truncate text-[12.5px] text-p1-text-3">
            Oldest <span className="font-medium text-p1-text-2">{hours(q.oldestHours)}</span> · promise {q.slaHours} h
          </span>
        </span>

        {/* Progress towards the promise: a full bar is a breach. */}
        <span className="col-span-3 row-start-2 min-w-0 sm:col-span-1 sm:row-start-auto">
          <span className="flex items-center justify-between text-[11.5px] text-p1-text-3">
            <span>Time to promise</span>
            <span className="tabular-nums">{empty ? 'Clear' : `${Math.round(pressure)}%`}</span>
          </span>
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-p1-subtle" aria-hidden>
            <span className={cx('vr-grow block h-full rounded-full', bar)} style={{ width: `${empty ? 0 : Math.max(4, pressure)}%` }} />
          </span>
        </span>

        <span className="text-right sm:text-left">
          <span className="block text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-p1-text">{q.count}</span>
          <span className="mt-1 hidden text-[11.5px] text-p1-text-3 sm:block">waiting</span>
        </span>

        <span className="hidden items-center gap-2 sm:flex">
          {empty ? (
            <Pill>Clear</Pill>
          ) : q.breached > 0 ? (
            <Pill tone="danger">{q.breached} late</Pill>
          ) : (
            <Pill tone="success">On time</Pill>
          )}
          <ChevronRight size={16} className="text-p1-text-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
    </li>
  );
}

/* ------------------------------------------------------------------ view */

export default function OverviewView({ snapshot }: { snapshot: OpsSnapshot }) {
  const { queues, agents, listings, decisions, api, revenue, audit } = snapshot;

  const needsAPerson = queues.reduce((n, q) => n + q.count, 0);
  const breached = queues.reduce((n, q) => n + q.breached, 0);
  const worst = [...queues].sort((a, b) => b.breached - a.breached || b.count - a.count)[0];

  const statusSlices = Object.entries(listings.byStatus)
    .map(([status, value]) => ({ label: LISTING_STATUS_LABEL[status as ListingStatus] ?? status, value, colour: STATUS_COLOUR[status] }))
    .sort((a, b) => b.value - a.value);

  const officerMax = Math.max(1, ...decisions.byOfficer.map((o) => o.count));
  const renewalsDue = revenue.renewals.reduce((n, r) => n + r.count, 0);
  const renewalPeak = Math.max(1, ...revenue.renewals.map((x) => x.sgd));

  return (
    <>
      {/* ================================================================ header */}
      <header className="vr-rise mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-p1-text sm:text-[28px]">Overview</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-p1-text-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="p1-live absolute inset-0 rounded-full bg-p1-success text-p1-success" />
              </span>
              Live
            </span>
            <span aria-hidden>·</span>
            <span>Singapore <LiveClock /></span>
            <span aria-hidden>·</span>
            <span>{agents.total} agents · {listings.total} listings</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href="/phase1/admin/reports" variant="outline" size="sm" leftIcon={<Activity size={15} />}>Reports</LinkButton>
          {worst && worst.count > 0 && (
            <LinkButton href={worst.href} size="sm" rightIcon={<ArrowRight size={15} />}>
              Review {worst.title.toLowerCase()} · {worst.count}
            </LinkButton>
          )}
        </div>
      </header>

      {breached > 0 && worst && (
        <div role="status" className="vr-rise mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-p1-danger-border bg-p1-danger-soft px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-p1-surface text-p1-danger" aria-hidden><TriangleAlert size={16} /></span>
          <p className="min-w-0 flex-1 text-[13.5px] text-p1-text">
            <span className="font-semibold">{breached} {breached === 1 ? 'item is' : 'items are'} past the promised time.</span>{' '}
            <span className="text-p1-text-2">The oldest are at the top of their queues.</span>
          </p>
          <Link href={worst.href} className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-p1-danger hover:underline underline-offset-4">
            Open {worst.title.toLowerCase()} <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      )}

      {/* ================================================================== KPIs */}
      <section aria-label="Key figures" className="vr-stagger mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPI
          label="Needs a person"
          value={needsAPerson}
          icon={<Users size={16} />}
          iconTone={breached > 0 ? 'danger' : 'primary'}
          tone={breached > 0 ? 'danger' : 'default'}
          sub={breached > 0 ? `${breached} past promise` : 'All inside promise'}
          href={worst?.href}
        />
        <KPI
          label="Decisions today"
          value={decisions.today}
          icon={<GaugeIcon size={16} />}
          iconTone="info"
          sub={`${decisions.week} in 7 days`}
          spark={decisions.trend.values.some((v) => v > 0) ? { data: decisions.trend.values, tone: 'primary' } : undefined}
        />
        <KPI
          label="API error rate"
          value={api.errorRate}
          decimals={1}
          suffix="%"
          icon={<TriangleAlert size={16} />}
          iconTone={api.errorRate > 5 ? 'accent' : 'neutral'}
          tone={api.errorRate > 5 ? 'warning' : 'default'}
          sub={`${api.errors.toLocaleString('en-SG')} of ${api.total.toLocaleString('en-SG')} calls`}
          spark={api.errorTrend.values.some((v) => v > 0) ? { data: api.errorTrend.values, tone: 'danger' } : undefined}
          href="/phase1/admin/reports?tab=api"
        />
        <KPI
          label="Annual recurring revenue"
          value={revenue.arrSgd}
          prefix="S$"
          icon={<Wallet size={16} />}
          iconTone="success"
          sub={`${sgd(revenue.mrrSgd)}/mo · ${revenue.activeCount} active`}
          href="/phase1/admin/subscriptions"
        />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* ============================================================ main */}
        <div className="min-w-0 space-y-5">
          <SectionCard
            title={<CardTitle hint="Each queue has a promised time to clear. The bar shows how close the oldest item is to it.">Needs a person</CardTitle>}
            padding="none"
            actions={<span className="text-[12.5px] tabular-nums text-p1-text-3">{needsAPerson} waiting</span>}
          >
            <ul className="divide-y divide-p1-border">
              {queues.map((q) => <QueueRow key={q.id} q={q} />)}
            </ul>
          </SectionCard>

          <SectionCard
            title={<CardTitle hint="Every API call, recorded at the handler with its status and duration. Last 24 hours.">Platform traffic</CardTitle>}
            actions={
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-[12.5px] text-p1-text-3">p50 <span className="font-semibold tabular-nums text-p1-text">{api.p50}ms</span></span>
                <span className="text-[12.5px] text-p1-text-3">p95 <span className="font-semibold tabular-nums text-p1-text">{api.p95}ms</span></span>
                <LinkButton href="/phase1/admin/reports?tab=api" size="sm" variant="ghost" rightIcon={<ArrowUpRight size={14} />}>API log</LinkButton>
              </div>
            }
          >
            {api.total === 0 ? (
              <p className="py-10 text-center text-[13.5px] text-p1-text-3">No calls logged yet.</p>
            ) : (
              <AreaChart
                height={220}
                labels={api.trend.labels}
                series={[
                  { label: 'Requests', points: api.trend.values, tone: 'primary' },
                  { label: 'Errors', points: api.errorTrend.values, tone: 'danger' },
                ]}
              />
            )}
          </SectionCard>

          <SectionCard
            title={<CardTitle hint="Decisions by weekday and hour, Singapore time. Where staffing should sit.">When the work arrives</CardTitle>}
            actions={<span className="text-[12.5px] text-p1-text-3">All recorded decisions</span>}
          >
            <Heatmap grid={decisions.heatmap} valueLabel={(n) => `${n} decision${n === 1 ? '' : 's'}`} />
          </SectionCard>

          <SectionCard
            title="Latest decisions"
            padding="none"
            actions={<LinkButton href="/phase1/admin/reports" size="sm" variant="ghost" rightIcon={<ArrowUpRight size={14} />}>View all</LinkButton>}
          >
            {audit.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13.5px] text-p1-text-3">No decisions recorded yet.</p>
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] gap-4 border-b border-p1-border bg-p1-bg/60 px-5 py-2.5 text-[12px] font-medium text-p1-text-3 md:grid">
                  <span>Decision</span><span>Subject</span><span>Officer</span><span className="text-right">When</span>
                </div>
                <ul className="divide-y divide-p1-border">
                  {audit.slice(0, 7).map((r) => {
                    const adverse = IS_ADVERSE[r.action];
                    return (
                      <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3 transition-colors hover:bg-p1-subtle/50 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto]">
                        <span className="min-w-0">
                          <Pill tone={adverse ? 'danger' : 'success'}>{ACTION_LABEL[r.action] ?? r.action}</Pill>
                        </span>
                        <span className="col-span-2 row-start-2 flex min-w-0 items-center gap-2.5 md:col-span-1 md:row-start-auto">
                          <Avatar name={r.subjectName || '?'} size="sm" tone="neutral" />
                          <span className="min-w-0">
                            <span className="block truncate text-[13.5px] font-medium text-p1-text">{r.subjectName}</span>
                            {r.listingRef && <span className="block truncate font-mono text-[11.5px] text-p1-text-3">{r.listingRef}</span>}
                          </span>
                        </span>
                        <span className="col-span-2 row-start-3 min-w-0 truncate text-[12.5px] text-p1-text-2 md:col-span-1 md:row-start-auto">{r.actorEmail}</span>
                        <span className="row-start-1 whitespace-nowrap text-right text-[12px] tabular-nums text-p1-text-3 md:row-start-auto">{sgDateTime(r.at)}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </SectionCard>
        </div>

        {/* ============================================================ side */}
        <aside className="min-w-0 space-y-5">
          <SectionCard
            title="Listings"
            actions={<span className="text-[12.5px] text-p1-text-3">{listings.publishedThisWeek} published this week</span>}
            icon={<Building2 size={15} />}
          >
            {statusSlices.length === 0 ? (
              <p className="py-8 text-center text-[13.5px] text-p1-text-3">No listings yet.</p>
            ) : (
              <Donut
                slices={statusSlices}
                size={148}
                thickness={20}
                centre={
                  <>
                    <span className="text-[24px] font-semibold leading-none tabular-nums text-p1-text">{listings.total}</span>
                    <span className="mt-0.5 text-[11.5px] text-p1-text-3">listings</span>
                  </>
                }
              />
            )}
          </SectionCard>

          <SectionCard
            title={<CardTitle hint={`${decisions.adverseShare}% of all recorded decisions were adverse — a rejection or a suspension.`}>Decisions</CardTitle>}
            icon={<GaugeIcon size={15} />}
            actions={<span className="text-[12.5px] text-p1-text-3">Last 14 days</span>}
          >
            <MiniBars data={decisions.trend.values} height={88} highlightLast={1} label="Decisions per day over the last fourteen days" />
            <div className="mt-1.5 flex justify-between text-[11px] text-p1-text-3" aria-hidden>
              <span>{decisions.trend.labels[0]}</span><span>Today</span>
            </div>
            <dl className="mt-4 grid grid-cols-3 divide-x divide-p1-border rounded-lg border border-p1-border">
              {[
                ['Today', decisions.today],
                ['7 days', decisions.week],
                ['Adverse', `${decisions.adverseShare}%`],
              ].map(([k, v]) => (
                <div key={k as string} className="px-3 py-2.5">
                  <dt className="text-[11.5px] text-p1-text-3">{k}</dt>
                  <dd className="mt-0.5 text-[16px] font-semibold tabular-nums text-p1-text">{v}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard
            title="Revenue"
            icon={<Wallet size={15} />}
            actions={<LinkButton href="/phase1/admin/subscriptions" size="sm" variant="ghost" rightIcon={<ArrowUpRight size={14} />}>Billing</LinkButton>}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[12px] text-p1-text-3">Annual recurring</div>
                <div className="mt-0.5 text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-p1-text">{sgd(revenue.arrSgd)}</div>
              </div>
              <div className="text-right text-[12.5px] text-p1-text-3">{sgd(revenue.mrrSgd)} / month</div>
            </div>

            {revenue.byPlan.length > 0 && (
              <div className="mt-5">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-p1-subtle">
                  {revenue.byPlan.map((p, i) => (
                    <span
                      key={p.plan}
                      title={`${p.plan} — ${p.count} agent${p.count === 1 ? '' : 's'}, ${sgd(p.sgd)}`}
                      className={cx('h-full', PLAN_COLOUR[i % PLAN_COLOUR.length], i > 0 && 'border-l-2 border-p1-surface')}
                      style={{ width: `${(p.sgd / Math.max(1, revenue.arrSgd)) * 100}%` }}
                    />
                  ))}
                </div>
                <ul className="mt-3 space-y-1.5">
                  {revenue.byPlan.map((p, i) => (
                    <li key={p.plan} className="flex items-center gap-2 text-[12.5px]">
                      <span className={cx('h-2 w-2 shrink-0 rounded-full', PLAN_COLOUR[i % PLAN_COLOUR.length])} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-p1-text-2">{p.plan} · {p.count}</span>
                      <span className="font-medium tabular-nums text-p1-text">{sgd(p.sgd)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 border-t border-p1-border pt-4">
              <Bullet label="PayNow share" value={revenue.payNowShare} target={60} max={100} valueLabel={(n) => `${n}%`} />
            </div>

            <div className="mt-4 border-t border-p1-border pt-4">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-p1-text-2">
                  Renewals, 12 months
                  <Explain>Plans are sold annually, so each cohort renews twelve months after it subscribed.</Explain>
                </span>
                <span className="text-[12.5px] tabular-nums text-p1-text-3">{renewalsDue} due</span>
              </div>
              {renewalsDue === 0 ? (
                <p className="rounded-lg bg-p1-subtle px-3 py-2.5 text-[12.5px] text-p1-text-3">None due in the next twelve months.</p>
              ) : (
                <>
                  <div className="flex h-16 items-end gap-1">
                    {revenue.renewals.map((r) => (
                      <div key={r.month} className="flex h-full flex-1 flex-col justify-end" title={`${r.month} — ${r.count} renewal${r.count === 1 ? '' : 's'}, ${sgd(r.sgd)}`}>
                        <div className={cx('w-full rounded-t-[3px]', r.sgd ? 'bg-p1-primary' : 'bg-p1-subtle')} style={{ height: r.sgd ? `${Math.max(8, (r.sgd / renewalPeak) * 100)}%` : '3px' }} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex gap-1 text-center text-[10px] text-p1-text-3">
                    {revenue.renewals.map((r) => <span key={r.month} className="flex-1">{r.short}</span>)}
                  </div>
                </>
              )}
            </div>

            {revenue.atRiskSgd > 0 && (
              <Link href="/phase1/admin/subscriptions" className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-p1-danger-border bg-p1-danger-soft px-3 py-2.5 transition-colors hover:border-p1-danger">
                <span className="text-[12.5px]">
                  <span className="font-semibold text-p1-text">{sgd(revenue.atRiskSgd)} at risk</span>
                  <span className="block text-p1-text-2">Past due or expired</span>
                </span>
                <ChevronRight size={16} className="text-p1-danger" aria-hidden />
              </Link>
            )}
          </SectionCard>

          <SectionCard title={<CardTitle hint="Decisions per officer. The red share is adverse decisions.">Officer load</CardTitle>} icon={<Clock size={15} />}>
            {decisions.byOfficer.length === 0 ? (
              <p className="py-6 text-center text-[13.5px] text-p1-text-3">No decisions recorded yet.</p>
            ) : (
              <ul className="space-y-3.5">
                {decisions.byOfficer.map((o) => (
                  <li key={o.officer}>
                    <div className="mb-1.5 flex items-center gap-2.5">
                      <Avatar name={o.officer.split('@')[0].replace(/[._-]+/g, ' ')} size="xs" tone="neutral" />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-p1-text-2">{o.officer}</span>
                      <span className="shrink-0 text-[12px] tabular-nums text-p1-text-3">
                        <span className="font-semibold text-p1-text">{o.count}</span>{o.adverse > 0 && <> · {o.adverse} adverse</>}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-p1-subtle">
                      <div className="vr-grow flex h-full rounded-full bg-p1-primary" style={{ width: `${(o.count / officerMax) * 100}%` }}>
                        <span className="h-full rounded-l-full bg-p1-danger" style={{ width: `${(o.adverse / Math.max(1, o.count)) * 100}%` }} aria-hidden />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {decisions.byAction.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-p1-border pt-4">
                {decisions.byAction.slice(0, 4).map((a) => (
                  <span key={a.action} className="inline-flex items-center gap-1.5 rounded-md bg-p1-subtle px-2 py-1 text-[12px] text-p1-text-2">
                    {ACTION_LABEL[a.action as keyof typeof ACTION_LABEL] ?? a.action}
                    <span className="font-semibold tabular-nums text-p1-text">{a.count}</span>
                  </span>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Directory"
            icon={<Users size={15} />}
            padding="none"
            actions={<LinkButton href="/phase1/admin/agents" size="sm" variant="ghost" rightIcon={<ArrowUpRight size={14} />}>Agents</LinkButton>}
          >
            <dl className="divide-y divide-p1-border">
              {([
                ['Agents', agents.total, null],
                ['Registered here', agents.real, null],
                ['Approved', agents.approved, 'success'],
                ['Under review', agents.underReview, agents.underReview ? 'warning' : null],
                ['Suspended', agents.suspended, agents.suspended ? 'danger' : null],
                ['CEA expiring in 90 days', agents.expiringSoon, agents.expiringSoon ? 'warning' : null],
              ] as [string, number, 'success' | 'warning' | 'danger' | null][]).map(([k, v, tone]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]">
                  <dt className="flex items-center gap-2 text-p1-text-2">
                    <span className={cx('h-1.5 w-1.5 rounded-full', tone === 'success' ? 'bg-p1-success' : tone === 'warning' ? 'bg-p1-warning' : tone === 'danger' ? 'bg-p1-danger' : 'bg-p1-border-strong')} aria-hidden />
                    {k}
                  </dt>
                  <dd className="font-semibold tabular-nums text-p1-text">{v}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
        </aside>
      </div>
    </>
  );
}
