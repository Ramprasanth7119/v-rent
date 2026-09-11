"use client";

/**
 * The operations command band.
 *
 * An ops console is opened for one reason — to find out what needs a person —
 * so the screen answers that before it shows anything else, in one number, at
 * the top, in the dark. Everything below it is context for that number: how
 * fast the queues are being cleared against what was promised, when the work
 * actually arrives, what the platform served, and what is earning.
 *
 * Every figure here is derived on the server from the account store, the
 * workspaces, the audit trail and the request log. Where something is modelled
 * rather than measured it says so on the card, because a console nobody trusts
 * is worse than no console.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ShieldCheck, Gavel, Receipt, Users, ArrowRight, Building2, Activity, Zap,
  TriangleAlert, Clock, Wallet, ArrowUpRight, Gauge as GaugeIcon, ChevronRight,
} from 'lucide-react';
import {
  Card, SectionCard, LinkButton, AreaChart, Donut, Heatmap, Radial, CountUp, Bullet, cx,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { ACTION_LABEL, IS_ADVERSE } from '../../../lib/phase1/audit-labels';
import { sgd, LISTING_STATUS_LABEL, type ListingStatus } from '../../../lib/phase1/data';
import { sgDateTime } from '../../../lib/phase1/format';
import type { OpsSnapshot } from '../../../lib/phase1/admin-insight';

const QUEUE_ICON: Record<string, typeof ShieldCheck> = {
  verification: ShieldCheck,
  moderation: Gavel,
  billing: Receipt,
};

const hours = (h: number | null) => {
  if (h === null) return 'empty';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
};

/** The clock in the band. Rendered only after mount, so it cannot mismatch. */
function LiveClock() {
  const [now, setNow] = useState<string>('');
  useEffect(() => {
    const tick = () => setNow(new Intl.DateTimeFormat('en-SG', {
      timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums">{now || '--:--:--'}</span>;
}

export default function OverviewView({ snapshot }: { snapshot: OpsSnapshot }) {
  const { queues, agents, listings, decisions, api, revenue, audit } = snapshot;

  const needsAPerson = queues.reduce((n, q) => n + q.count, 0);
  const breached = queues.reduce((n, q) => n + q.breached, 0);

  const statusSlices = Object.entries(listings.byStatus)
    .map(([status, value]) => ({
      label: LISTING_STATUS_LABEL[status as ListingStatus] ?? status,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  const officerMax = Math.max(1, ...decisions.byOfficer.map((o) => o.count));

  return (
    <>
      {/* ═════════════════════════════════════════════════ the command band */}
      <section className="p1-lift relative isolate mb-6 overflow-hidden rounded-2xl bg-p1-sidebar text-white">
        {/* Two soft lights and a faint grid, so the panel has depth without an image. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              'radial-gradient(70% 120% at 8% 0%, color-mix(in srgb, var(--p1-primary) 55%, transparent) 0%, transparent 58%),'
              + 'radial-gradient(60% 130% at 100% 100%, color-mix(in srgb, var(--p1-accent) 28%, transparent) 0%, transparent 60%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '54px 54px',
          }}
        />
        <div aria-hidden className="p1-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative grid items-stretch gap-8 px-6 py-7 sm:px-8 sm:py-9 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 text-[12.5px] text-white/60">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-semibold text-p1-accent">
                <span className="p1-live h-1.5 w-1.5 rounded-full bg-p1-accent" aria-hidden />
                Live
              </span>
              <span>Operations console</span>
              <span aria-hidden>·</span>
              <LiveClock />
              <span aria-hidden>·</span>
              <span>Singapore</span>
            </div>

            <h1 className="mt-4 font-p1display text-[34px] font-bold leading-[1.06] tracking-[-0.028em] text-white sm:text-[42px]">
              {needsAPerson === 0 ? (
                <>Nothing is waiting on a person.</>
              ) : (
                <>
                  <CountUp value={needsAPerson} className="text-p1-accent" />
                  {' '}
                  {needsAPerson === 1 ? 'item needs' : 'items need'} a person.
                </>
              )}
            </h1>
            <p className="mt-2.5 max-w-xl text-[14.5px] leading-6 text-white/65">
              {breached > 0
                ? `${breached} of them are already past the time we promised. Those are at the top of their queues.`
                : 'Everything in the queues is inside the time we promised. The oldest is listed below.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {queues.map((q) => {
                const Icon = QUEUE_ICON[q.id] ?? ShieldCheck;
                return (
                  <Link
                    key={q.id}
                    href={q.href}
                    className={cx(
                      'group inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[13.5px] font-semibold transition-colors',
                      q.breached > 0
                        ? 'bg-p1-accent text-[#0E2124] hover:bg-p1-accent-hover'
                        : 'bg-white/10 text-white hover:bg-white/16',
                    )}
                  >
                    <Icon size={15} aria-hidden />
                    {q.title}
                    <span className={cx('rounded-full px-2 py-0.5 text-[12px] tabular-nums', q.breached > 0 ? 'bg-black/15' : 'bg-white/15')}>
                      {q.count}
                    </span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Three figures that tell you whether the platform itself is healthy. */}
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/10 xl:w-[430px]">
            {[
              {
                k: 'Decisions today',
                v: <CountUp value={decisions.today} />,
                sub: `${decisions.week} in seven days`,
                icon: <GaugeIcon size={14} />,
              },
              {
                k: 'API errors',
                v: <><CountUp value={api.errorRate} decimals={1} />%</>,
                sub: `${api.total.toLocaleString('en-SG')} calls logged`,
                icon: <TriangleAlert size={14} />,
                bad: api.errorRate > 5,
              },
              {
                k: 'Median response',
                v: <><CountUp value={api.p50} />ms</>,
                sub: `95th at ${api.p95}ms`,
                icon: <Zap size={14} />,
              },
            ].map((m) => (
              <div key={m.k} className="flex flex-col justify-center bg-p1-sidebar-2/80 px-4 py-4 backdrop-blur">
                <dt className="flex items-center gap-1.5 text-[11.5px] font-medium text-white/50">
                  <span aria-hidden>{m.icon}</span>
                  {m.k}
                </dt>
                <dd className={cx('mt-2 font-p1display text-[26px] font-bold leading-none tabular-nums', m.bad ? 'text-p1-accent' : 'text-white')}>
                  {m.v}
                </dd>
                <dd className="mt-1.5 text-[11.5px] text-white/45">{m.sub}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ queue health */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {queues.map((q, i) => {
          const Icon = QUEUE_ICON[q.id] ?? ShieldCheck;
          const pressure = q.oldestHours === null ? 0 : Math.min(100, (q.oldestHours / q.slaHours) * 100);
          const tone = pressure >= 100 ? 'danger' : pressure >= 70 ? 'warning' : 'success';
          return (
            <Card
              key={q.id}
              padding="md"
              className="p1-lift flex items-center gap-5"
              style={{ animationDelay: `${120 + i * 70}ms` }}
            >
              <Radial
                value={pressure}
                tone={tone}
                size={94}
                thickness={9}
                label={
                  <span className="font-p1display text-[19px] font-bold leading-none tabular-nums text-p1-text">
                    {q.count}
                  </span>
                }
                sublabel="waiting"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon size={15} className="shrink-0 text-p1-text-3" aria-hidden />
                  <span className="truncate font-p1display text-[15.5px] font-bold text-p1-text">{q.title}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-5 text-p1-text-2">
                  Oldest waiting <strong className="text-p1-text">{hours(q.oldestHours)}</strong>
                  <span className="text-p1-text-3"> · promise {q.slaHours}h</span>
                </p>
                {q.breached > 0 ? (
                  <Pill tone="danger" className="mt-2">{q.breached} past the promise</Pill>
                ) : (
                  <Pill tone="success" className="mt-2">Within the promise</Pill>
                )}
                <Link
                  href={q.href}
                  className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-semibold text-p1-primary underline-offset-4 hover:underline dark:text-p1-info"
                >
                  Open queue <ChevronRight size={13} aria-hidden />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════ traffic and when it lands */}
      <div className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <SectionCard
          title="What the platform served"
          description="Every API call, recorded at the handler with its status and how long it took."
          icon={<Activity size={16} />}
          actions={<LinkButton href="/phase1/admin/reports?tab=api" size="sm" variant="outline" rightIcon={<ArrowUpRight size={14} />}>Open the log</LinkButton>}
        >
          {api.total === 0 ? (
            <p className="py-8 text-center text-[13.5px] text-p1-text-3">
              Nothing logged yet. Use the product and this fills in immediately.
            </p>
          ) : (
            <AreaChart
              height={216}
              labels={api.trend.labels}
              series={[
                { label: 'Requests', points: api.trend.values, tone: 'primary' },
                { label: 'Errors', points: api.errorTrend.values, tone: 'danger' },
              ]}
            />
          )}
        </SectionCard>

        <SectionCard
          title="When the work arrives"
          description="Decisions by day and hour. Where staffing should sit."
          icon={<Clock size={16} />}
        >
          <Heatmap grid={decisions.heatmap} valueLabel={(n) => `${n} decision${n === 1 ? '' : 's'}`} />
        </SectionCard>
      </div>

      {/* ══════════════════════════════════════════════ portfolio and people */}
      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        <SectionCard
          title="Listings on the platform"
          description={`${listings.publishedThisWeek} published in the last seven days`}
          icon={<Building2 size={16} />}
        >
          {statusSlices.length === 0 ? (
            <p className="py-8 text-center text-[13.5px] text-p1-text-3">No listings yet.</p>
          ) : (
            <Donut
              slices={statusSlices}
              size={168}
              thickness={24}
              centre={
                <>
                  <span className="font-p1display text-[26px] font-bold leading-none tabular-nums text-p1-text">
                    <CountUp value={listings.total} />
                  </span>
                  <span className="mt-0.5 text-[11.5px] text-p1-text-3">listings</span>
                </>
              }
            />
          )}
        </SectionCard>

        <SectionCard
          title="Decisions, fourteen days"
          description={`${decisions.adverseShare}% of all decisions were adverse`}
          icon={<GaugeIcon size={16} />}
        >
          <AreaChart
            height={168}
            labels={decisions.trend.labels}
            series={[{ label: 'Decisions', points: decisions.trend.values, tone: 'accent' }]}
            valueLabel={(n) => String(n)}
          />
          <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-p1-border">
            {[
              ['Today', decisions.today],
              ['Seven days', decisions.week],
              ['Adverse', `${decisions.adverseShare}%`],
            ].map(([k, v]) => (
              <div key={k as string} className="bg-p1-surface px-3 py-2.5">
                <dt className="text-[11.5px] text-p1-text-3">{k}</dt>
                <dd className="mt-0.5 font-p1display text-[17px] font-bold tabular-nums text-p1-text">{v}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <SectionCard
          title="Officer load"
          description="Who is carrying the queues."
          icon={<Users size={16} />}
        >
          {decisions.byOfficer.length === 0 ? (
            <p className="py-8 text-center text-[13.5px] text-p1-text-3">No decisions recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {decisions.byOfficer.map((o, i) => (
                <li key={o.officer}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-mono text-[12.5px] text-p1-text-2">{o.officer}</span>
                    <span className="shrink-0 text-[12px] text-p1-text-3">
                      {o.adverse} adverse of <strong className="font-semibold text-p1-text">{o.count}</strong>
                    </span>
                  </div>
                  {/* The adverse share sits inside the bar rather than beside it,
                      so the mix is read in the same glance as the volume. */}
                  <div className="h-2.5 overflow-hidden rounded-full bg-p1-subtle">
                    <div
                      className="flex h-full rounded-full bg-p1-primary"
                      style={{
                        width: `${(o.count / officerMax) * 100}%`,
                        animation: `p1-grow-x 700ms cubic-bezier(.16,1,.3,1) ${i * 80}ms both`,
                        transformOrigin: 'left',
                      }}
                    >
                      <span
                        className="h-full rounded-l-full bg-p1-danger"
                        style={{ width: `${(o.adverse / Math.max(1, o.count)) * 100}%` }}
                        aria-hidden
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {decisions.byAction.length > 0 && (
            <div className="mt-4 border-t border-p1-border pt-3">
              <div className="mb-2 text-[12px] font-medium text-p1-text-3">What kind of decision</div>
              <ul className="space-y-1.5">
                {decisions.byAction.slice(0, 4).map((a) => (
                  <li key={a.action} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                    <span className="min-w-0 truncate text-p1-text-2">{ACTION_LABEL[a.action as keyof typeof ACTION_LABEL] ?? a.action}</span>
                    <span className="tabular-nums text-p1-text">{a.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ════════════════════════════════════════════════ money and the feed */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SectionCard
          title="Subscriptions"
          description="What is being earned, and what is at risk."
          icon={<Wallet size={16} />}
          actions={<LinkButton href="/phase1/admin/subscriptions" size="sm" variant="outline" rightIcon={<ArrowUpRight size={14} />}>Billing</LinkButton>}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <div className="text-[12.5px] font-medium text-p1-text-3">Annual recurring</div>
              <div className="mt-1 font-p1display text-[30px] font-bold leading-none tabular-nums text-p1-text">
                <CountUp value={revenue.arrSgd} prefix="S$" />
              </div>
              <div className="mt-1.5 text-[12.5px] text-p1-text-3">
                {sgd(revenue.mrrSgd)} a month across {revenue.activeCount} active
              </div>

              <div className="mt-4 space-y-3">
                <Bullet
                  label="PayNow share"
                  value={revenue.payNowShare}
                  target={60}
                  max={100}
                  valueLabel={(n) => `${n}%`}
                />
                {revenue.byPlan.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[12px] font-medium text-p1-text-3">Where the revenue sits</div>
                    <div className="flex h-3 overflow-hidden rounded-full bg-p1-subtle">
                      {revenue.byPlan.map((p, i) => (
                        <span
                          key={p.plan}
                          title={`${p.plan} — ${p.count} agent${p.count === 1 ? '' : 's'}, ${sgd(p.sgd)}`}
                          className={cx(i === 0 ? 'bg-p1-primary' : i === 1 ? 'bg-p1-accent' : 'bg-p1-success')}
                          style={{ width: `${(p.sgd / Math.max(1, revenue.arrSgd)) * 100}%` }}
                        />
                      ))}
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1">
                      {revenue.byPlan.map((p, i) => (
                        <li key={p.plan} className="inline-flex items-center gap-1.5 text-[12px] text-p1-text-2">
                          <span className={cx('h-2 w-2 rounded-full', i === 0 ? 'bg-p1-primary' : i === 1 ? 'bg-p1-accent' : 'bg-p1-success')} aria-hidden />
                          {p.plan} · {p.count}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {revenue.atRiskSgd > 0 && (
                  <div className="rounded-lg border border-p1-danger-border bg-p1-danger-soft/60 px-3 py-2.5">
                    <div className="text-[12.5px] font-semibold text-p1-text">
                      {sgd(revenue.atRiskSgd)} at risk
                    </div>
                    <div className="mt-0.5 text-[12px] text-p1-text-2">Past due or expired and still unresolved.</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] font-medium text-p1-text-3">Renewals, next twelve months</span>
                <span className="text-[12.5px] tabular-nums text-p1-text-2">
                  {revenue.renewals.reduce((n, r) => n + r.count, 0)} due
                </span>
              </div>

              {revenue.renewals.every((r) => r.count === 0) ? (
                <p className="rounded-lg bg-p1-subtle px-3 py-3 text-[12.5px] leading-5 text-p1-text-2">
                  Nothing falls due inside a year. Plans are sold annually, so the first cohort renews twelve months
                  after it subscribed — the calendar fills as accounts age.
                </p>
              ) : (
                <>
                  <div className="flex h-[92px] items-end gap-1.5">
                    {revenue.renewals.map((r, i) => {
                      const peak = Math.max(1, ...revenue.renewals.map((x) => x.sgd));
                      return (
                        <div key={r.month} className="group relative flex h-full flex-1 flex-col justify-end" title={`${r.month} — ${r.count} renewal${r.count === 1 ? '' : 's'}, ${sgd(r.sgd)}`}>
                          <div
                            className={cx('w-full rounded-t-[3px]', r.sgd ? 'bg-p1-accent' : 'bg-p1-subtle')}
                            style={{
                              height: r.sgd ? `${Math.max(6, (r.sgd / peak) * 100)}%` : '4px',
                              animation: `p1-grow-y 640ms cubic-bezier(.16,1,.3,1) ${i * 45}ms both`,
                              transformOrigin: 'bottom',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1 flex gap-1.5 text-center text-[10px] text-p1-text-3">
                    {revenue.renewals.map((r) => (
                      <span key={r.month} className="flex-1">{r.short}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Latest decisions"
          description="Every one carries the officer who made it."
          icon={<ShieldCheck size={16} />}
          padding="none"
          actions={<LinkButton href="/phase1/admin/reports" size="sm" variant="ghost" rightIcon={<ArrowUpRight size={14} />}>Audit trail</LinkButton>}
        >
          {audit.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13.5px] text-p1-text-3">
              No decisions recorded on this instance yet.
            </p>
          ) : (
            <ul className="divide-y divide-p1-border">
              {audit.slice(0, 7).map((r, i) => (
                <li
                  key={r.id}
                  className="p1-lift flex items-start gap-3 px-5 py-3"
                  style={{ animationDelay: `${i * 45}ms` }}
                >
                  <span
                    className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', IS_ADVERSE[r.action] ? 'bg-p1-danger' : 'bg-p1-success')}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium text-p1-text">
                      {ACTION_LABEL[r.action]}
                      <span className="font-normal text-p1-text-2"> — {r.subjectName}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11.5px] text-p1-text-3">
                      <span className="font-mono">{sgDateTime(r.at)}</span>
                      <span aria-hidden>·</span>
                      <span className="font-mono">{r.actorEmail}</span>
                      {r.listingRef && <><span aria-hidden>·</span><span className="font-mono">{r.listingRef}</span></>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* The directory figures, as a quiet footer rather than four more tiles. */}
      <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 rounded-xl border border-p1-border bg-p1-surface px-5 py-4 text-[13px]">
        <span className="font-semibold text-p1-text">Directory</span>
        {[
          ['Agents', agents.total],
          ['Registered here', agents.real],
          ['Approved', agents.approved],
          ['Under review', agents.underReview],
          ['Suspended', agents.suspended],
          ['CEA expiring within 90 days', agents.expiringSoon],
        ].map(([k, v]) => (
          <span key={k as string} className="inline-flex items-baseline gap-1.5 text-p1-text-2">
            {k}
            <strong className="font-p1display text-[15px] tabular-nums text-p1-text">{v as number}</strong>
          </span>
        ))}
        <LinkButton href="/phase1/admin/agents" size="sm" variant="ghost" className="ml-auto" rightIcon={<ArrowRight size={14} />}>
          Open the directory
        </LinkButton>
      </div>
    </>
  );
}
