"use client";

import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { PageHead, Stat, SpecNote } from '../../../../components/phase1/bits';
import { SUBSCRIPTIONS, sgd } from '../../../../lib/phase1/data';
import { RefreshCw, AlertTriangle, Check } from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
  past_due: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400',
  expired: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400',
  cancelled: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
};

export default function SubscriptionsPage() {
  const active = SUBSCRIPTIONS.filter((s) => s.status === 'active');
  const mrr = Math.round(active.reduce((n, s) => n + s.amountSgd, 0) / 12);
  const paynowShare = Math.round((active.filter((s) => s.method === 'PayNow').length / active.length) * 100);

  return (
    <>
      <PageHead
        module="M10 · Subscription and Payments"
        title="Subscriptions"
        actions={<Button variant="outline" leftIcon={<RefreshCw size={14} />}>Run reconciliation</Button>}
      />

      <div className="vr-stagger mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active subscriptions" value={active.length} sub="Across three plans" tone="good" />
        <Stat label="Monthly recurring" value={sgd(mrr)} sub="Annual billings ÷ 12" />
        <Stat label="Paid by PayNow" value={`${paynowShare}%`} sub="1.3% vs 3.4% on cards" tone="good" />
        <Stat label="Needs attention" value={SUBSCRIPTIONS.filter((s) => s.status !== 'active').length} sub="Past due or expired" tone="warn" />
      </div>

      <Card className="mb-5 border-emerald-300/50 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-start gap-2.5">
          <Check size={15} className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <div className="text-xs font-semibold text-foreground">
              Daily reconciliation completed — 28 Aug 2026, 03:00
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              Every local subscription was compared against the payment provider. No divergence found.
              Silent drift between paying at the provider and being entitled here is the most expensive
              defect class in this module, in both directions — so it is checked every day rather than
              discovered by a complaint.
            </p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-neutral-50/60 text-[11px] uppercase tracking-wider text-neutral-500 dark:bg-neutral-950/30">
                <th className="px-5 py-3 font-semibold">Agent</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">Renews</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SUBSCRIPTIONS.map((s) => (
                <tr key={s.agent}>
                  <td className="px-5 py-3.5 text-xs font-medium text-foreground">{s.agent}</td>
                  <td className="px-5 py-3.5 text-xs text-neutral-600 dark:text-neutral-400">{s.plan}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLE[s.status]}`}>
                      {s.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-neutral-600 dark:text-neutral-400">{s.method}</td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-neutral-500">{s.renewsOn}</td>
                  <td className="px-5 py-3.5 text-right text-xs font-medium tabular-nums text-foreground">{sgd(s.amountSgd)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Button size="sm" variant="ghost">Refund</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-5 border-amber-300/50 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="text-xs font-semibold text-foreground">Daniel Ong — renewal payment failed</div>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              Moved to <em>past due</em> rather than expired. Listings stay published through the grace
              period and dunning messages have started. Withdrawing an agent&apos;s inventory the moment a
              card fails is how you lose a paying customer over a bank decline. Grace period length is
              open question O5.
            </p>
          </div>
        </div>
      </Card>

      <SpecNote>
        Refunds are restricted to the finance operator role and written to the audit log. A moderator
        signed in to this same console would not see the refund control at all — permissions are checked
        on the server, not hidden in the interface.
      </SpecNote>
    </>
  );
}
