"use client";

import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { PageHead, SpecNote } from '../../../../components/phase1/bits';
import { useCountUp, useInView } from '../../../../components/phase1/hooks';
import { AUDIT_LOG, FUNNEL } from '../../../../lib/phase1/data';
import { Download, TrendingDown, Activity, Users, FileCheck, CreditCard } from 'lucide-react';

export default function ReportsPage() {
  const top = FUNNEL[0].count;
  const last = FUNNEL[FUNNEL.length - 1].count;
  const conversion = Math.round((last / top) * 1000) / 10;

  return (
    <>
      <PageHead
        module="M14 · Administrative Console and Reporting"
        title="Reports and audit"
        actions={<Button variant="outline" leftIcon={<Download size={14} />}>Export CSV</Button>}
      />

      {/* headline counters */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 vr-stagger">
        <CounterTile icon={Users} label="Registered" value={top} sub="All time" />
        <CounterTile icon={FileCheck} label="Approved" value={FUNNEL[3].count} sub="Passed verification" tone="good" />
        <CounterTile icon={CreditCard} label="Subscribed" value={FUNNEL[4].count} sub="Paying agents" tone="good" />
        <CounterTile icon={Activity} label="End-to-end conversion" value={conversion} suffix="%" sub="Registered to first listing" tone="warn" />
      </div>

      <FunnelCard />

      <AuditCard />

      <SpecNote>
        The audit trail exists so questions like “who approved this agent, and were they permitted to?” have an
        answer. It is also what makes the three-day data breach notification window survivable — you cannot
        report the scope of a breach you cannot reconstruct.
      </SpecNote>
    </>
  );
}

/* ------------------------------------------------------------------ tiles */

function CounterTile({
  icon: Icon, label, value, sub, suffix = '', tone = 'default',
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string; value: number; sub: string; suffix?: string;
  tone?: 'default' | 'good' | 'warn';
}) {
  const n = useCountUp(value, 1000);
  const toneCls = {
    default: 'text-foreground',
    good: 'text-emerald-600 dark:text-emerald-400',
    warn: 'text-amber-600 dark:text-amber-400',
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-brand-gold" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
      </div>
      <div className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight ${toneCls}`}>
        {suffix === '%' ? (n / 10).toFixed(1) : n.toLocaleString()}{suffix}
      </div>
      <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{sub}</div>
    </div>
  );
}

/* ----------------------------------------------------------------- funnel */

function FunnelCard() {
  const { ref, seen } = useInView<HTMLDivElement>();
  const top = FUNNEL[0].count;

  return (
    <Card className="mb-5">
      <div className="mb-1 text-sm font-semibold text-foreground">Onboarding funnel</div>
      <p className="mb-5 text-xs text-neutral-500 dark:text-neutral-400">
        The most commercially valuable report in Phase 1 — it shows exactly where prospective agents give up.
      </p>

      <div ref={ref} className="space-y-3">
        {FUNNEL.map((f, i) => {
          const pct = Math.round((f.count / top) * 100);
          const prev = i > 0 ? FUNNEL[i - 1].count : f.count;
          const drop = prev - f.count;
          const dropPct = i > 0 ? Math.round((drop / prev) * 100) : 0;
          const bad = dropPct >= 15;
          return (
            <FunnelRow
              key={f.stage}
              stage={f.stage}
              count={f.count}
              pct={pct}
              drop={i > 0 ? drop : null}
              dropPct={dropPct}
              bad={bad}
              delay={i * 0.09}
              go={seen}
            />
          );
        })}
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 dark:bg-red-950/20">
        <TrendingDown size={15} className="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
        <p className="text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          The largest single drop is <strong>approved → subscribed</strong>, losing 61 agents. In the real
          product that is the number to attack first, and it is exactly the question the specification raises
          about selling a subscription before there is tenant traffic behind it.
        </p>
      </div>
    </Card>
  );
}

function FunnelRow({
  stage, count, pct, drop, dropPct, bad, delay, go,
}: {
  stage: string; count: number; pct: number; drop: number | null;
  dropPct: number; bad: boolean; delay: number; go: boolean;
}) {
  const n = useCountUp(go ? count : 0, 900);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">{stage}</span>
        <span className="flex items-baseline gap-2.5">
          {drop !== null && (
            <span className={`text-[11px] tabular-nums ${bad ? 'text-red-600 dark:text-red-400' : 'text-neutral-400'}`}>
              −{drop} ({dropPct}%)
            </span>
          )}
          <span className="font-semibold tabular-nums text-foreground">{n.toLocaleString()}</span>
        </span>
      </div>
      <div className="h-6 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
        <div
          className={`relative flex h-full items-center justify-end overflow-hidden rounded-md pr-2 ${
            go ? 'vr-grow vr-shimmer' : ''
          } ${bad ? 'bg-red-500/80' : 'bg-brand-navy dark:bg-brand-navy-light'}`}
          style={{ width: `${pct}%`, animationDelay: `${delay}s` }}
        >
          <span className="text-[10px] font-medium tabular-nums text-white/90">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ audit */

function AuditCard() {
  const { ref, seen } = useInView<HTMLTableSectionElement>();

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <div className="text-sm font-semibold text-foreground">Audit trail</div>
        </div>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          Every consequential action, written in the same transaction as the change itself.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-neutral-50/60 text-[11px] uppercase tracking-wider text-neutral-500 dark:bg-neutral-950/30">
              <th className="px-5 py-3 font-semibold">When</th>
              <th className="px-5 py-3 font-semibold">Actor</th>
              <th className="px-5 py-3 font-semibold">Action</th>
              <th className="px-5 py-3 font-semibold">Entity</th>
            </tr>
          </thead>
          <tbody ref={ref} className={`divide-y divide-border ${seen ? 'vr-stagger' : ''}`}>
            {AUDIT_LOG.map((r, i) => (
              <tr key={i} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-950/40">
                <td className="whitespace-nowrap px-5 py-3 font-mono text-[11px] text-neutral-500">{r.at}</td>
                <td className="px-5 py-3">
                  <span className={`font-mono text-[11px] ${r.actor === 'system' ? 'text-neutral-400' : 'text-brand-gold'}`}>
                    {r.actor}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-foreground">{r.action}</td>
                <td className="px-5 py-3 font-mono text-[11px] text-neutral-500">{r.entity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
