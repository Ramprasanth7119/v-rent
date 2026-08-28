"use client";

import { useState } from 'react';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { PageHead, SpecNote, Stat } from '../../../../components/phase1/bits';
import { MODERATION_QUEUE, REJECTION_REASONS } from '../../../../lib/phase1/data';
import { Check, X, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';

export default function ModerationPage() {
  const [queue, setQueue] = useState(MODERATION_QUEUE);
  const [preModeration, setPreModeration] = useState(false);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState(REJECTION_REASONS[0]);

  const remove = (id: string) => {
    setQueue((q) => q.filter((c) => c.id !== id));
    setRejecting(null);
  };

  return (
    <>
      <PageHead
        module="M13 · Listing Moderation"
        title="Moderation queue"
        blurb="Whether every listing is reviewed before going live is still a client decision, so it is a configuration flag rather than a code path."
      />

      <div className="vr-stagger mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="In queue" value={queue.length} sub="Oldest first" />
        <Stat label="Median time to decision" value="3h 12m" sub="Target under 24h" tone="good" />
        <Stat label="Rejection rate, 30 days" value="7.4%" sub="Mostly photograph quality" />
      </div>

      {/* Policy switch */}
      <Card className="mb-5 border-brand-gold/30 bg-brand-gold/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <div className="text-xs font-semibold text-foreground">Moderation policy — open question Q8</div>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              {preModeration
                ? 'Every listing is held for review before going live. Safer, but it does not scale and it delays the value the agent is paying for.'
                : 'Approved agents publish directly, and moderation happens after publication. This is our recommendation.'}
            </p>
          </div>
          <button
            onClick={() => setPreModeration((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-brand-gold/50"
          >
            {preModeration ? <ToggleRight size={18} className="text-brand-gold" /> : <ToggleLeft size={18} className="text-neutral-400" />}
            {preModeration ? 'Review before publication' : 'Publish directly'}
          </button>
        </div>
      </Card>

      <div className="grid gap-3">
        {queue.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{c.project}</span>
                  <span className="font-mono text-[10px] text-neutral-400">{c.reference}</span>
                </div>
                <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {c.agent} · submitted {c.submittedAt}
                </div>
                {c.flag && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 dark:bg-amber-950/25">
                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="text-[11px] text-amber-800 dark:text-amber-400">{c.flag}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-shrink-0 gap-2">
                <Button size="sm" variant="gold" leftIcon={<Check size={12} />} onClick={() => remove(c.id)}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<X size={12} />}
                  onClick={() => setRejecting(rejecting === c.id ? null : c.id)}
                >
                  Reject
                </Button>
              </div>
            </div>

            {rejecting === c.id && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Reason shown to the agent
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {REJECTION_REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setReason(r)}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] transition-colors ${
                        reason === r ? 'bg-brand-navy text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => remove(c.id)}>Confirm rejection</Button>
                  <Button size="sm" variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
                </div>
                <p className="mt-2.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                  A bare rejection produces a support ticket. A specific reason produces a correction.
                </p>
              </div>
            )}
          </Card>
        ))}
        {queue.length === 0 && (
          <Card className="py-12 text-center text-sm text-neutral-400">Queue cleared.</Card>
        )}
      </div>

      <SpecNote>
        Two moderators opening the same case is normal and has to be handled — either by a soft claim or
        optimistic locking — so the second decision does not silently overwrite the first. Every decision
        is written to the audit log with the moderator, timestamp and reason.
      </SpecNote>
    </>
  );
}
