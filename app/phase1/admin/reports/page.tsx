"use client";

import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { PageHead, SpecNote } from '../../../../components/phase1/bits';
import { AUDIT_LOG, FUNNEL } from '../../../../lib/phase1/data';
import { Download, TrendingDown } from 'lucide-react';

export default function ReportsPage() {
  const top = FUNNEL[0].count;

  return (
    <>
      <PageHead
        module="M14 · Administrative Console and Reporting"
        title="Reports and audit"
        actions={<Button variant="outline" leftIcon={<Download size={14} />}>Export CSV</Button>}
      />

      <Card className="mb-5">
        <div className="mb-1 text-sm font-semibold text-foreground">Onboarding funnel</div>
        <p className="mb-5 text-xs text-neutral-500 dark:text-neutral-400">
          The most commercially valuable report in Phase 1 — it shows exactly where prospective agents
          give up.
        </p>

        <div className="space-y-3">
          {FUNNEL.map((f, i) => {
            const pct = Math.round((f.count / top) * 100);
            const prev = i > 0 ? FUNNEL[i - 1].count : f.count;
            const drop = prev - f.count;
            const dropPct = i > 0 ? Math.round((drop / prev) * 100) : 0;
            const bad = dropPct >= 15;
            return (
              <div key={f.stage}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground">{f.stage}</span>
                  <span className="flex items-baseline gap-2.5">
                    {i > 0 && (
                      <span className={`text-[11px] tabular-nums ${bad ? 'text-red-600 dark:text-red-400' : 'text-neutral-400'}`}>
                        −{drop} ({dropPct}%)
                      </span>
                    )}
                    <span className="font-semibold tabular-nums text-foreground">{f.count}</span>
                  </span>
                </div>
                <div className="h-6 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
                  <div
                    className={`flex h-full items-center justify-end rounded-md pr-2 transition-all duration-500 ${
                      bad ? 'bg-red-500/80' : 'bg-brand-navy dark:bg-brand-navy-light'
                    }`}
                    style={{ width: `${pct}%` }}
                  >
                    <span className="text-[10px] font-medium tabular-nums text-white/90">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 dark:bg-red-950/20">
          <TrendingDown size={15} className="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300">
            The largest single drop is <strong>approved → subscribed</strong>, losing 61 agents. In the real
            product that is the number to attack first, and it is exactly the question the specification
            raises about selling a subscription before there is tenant traffic behind it.
          </p>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-5 py-4">
          <div className="text-sm font-semibold text-foreground">Audit trail</div>
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
            <tbody className="divide-y divide-border">
              {AUDIT_LOG.map((r, i) => (
                <tr key={i}>
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

      <SpecNote>
        The audit trail exists so questions like “who approved this agent, and were they permitted to?”
        have an answer. It is also what makes the three-day data breach notification window survivable —
        you cannot report the scope of a breach you cannot reconstruct.
      </SpecNote>
    </>
  );
}
