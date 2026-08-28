"use client";

import { useState } from 'react';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { PageHead, MatchChip, SpecNote, Field } from '../../../../components/phase1/bits';
import { VERIFICATION_QUEUE, VerificationCase } from '../../../../lib/phase1/data';
import { Check, X, FileText, Database, MessageSquare } from 'lucide-react';

export default function VerificationQueuePage() {
  const [queue, setQueue] = useState(VERIFICATION_QUEUE);
  const [selected, setSelected] = useState<VerificationCase | null>(VERIFICATION_QUEUE[0]);
  const [decided, setDecided] = useState<Record<string, 'approved' | 'rejected'>>({});

  const decide = (id: string, d: 'approved' | 'rejected') => {
    setDecided((s) => ({ ...s, [id]: d }));
    const rest = queue.filter((q) => q.id !== id);
    setSelected(rest.find((q) => !decided[q.id]) ?? null);
  };

  const pending = queue.filter((q) => !decided[q.id]);

  return (
    <>
      <PageHead
        module="M7 · CEA Verification"
        title="Verification queue"
        blurb="Automated matching proposes an outcome. A verification officer always makes the decision."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5">
        <Database size={14} className="text-brand-gold" />
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          Register copy retrieved <span className="font-medium text-foreground">28 Aug 2026, 06:00</span> from
          data.gov.sg — 4,812 active salespersons. Onboarding never calls the source directly.
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Queue */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Pending</span>
            <span className="text-xs tabular-nums text-neutral-400">{pending.length}</span>
          </div>
          {queue.map((c) => {
            const d = decided[c.id];
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                disabled={!!d}
                className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                  selected?.id === c.id ? 'border-brand-gold bg-brand-gold/5' : 'border-border bg-card hover:border-neutral-300 dark:hover:border-neutral-700'
                } ${d ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{c.agentName}</span>
                  {d ? (
                    <span className={`text-[10px] font-semibold uppercase ${d === 'approved' ? 'text-emerald-600' : 'text-red-600'}`}>{d}</span>
                  ) : (
                    <MatchChip match={c.match} />
                  )}
                </div>
                <div className="mt-1 font-mono text-[11px] text-neutral-500">{c.ceaNumber}</div>
                <div className="mt-0.5 truncate text-[11px] text-neutral-500 dark:text-neutral-400">{c.agency}</div>
                <div className="mt-1.5 text-[10px] text-neutral-400">{c.submittedAt}</div>
              </button>
            );
          })}
        </div>

        {/* Detail */}
        {selected ? (
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="text-base font-semibold text-foreground">{selected.agentName}</div>
                <div className="mt-0.5 text-xs text-neutral-500">Submitted {selected.submittedAt}</div>
              </div>
              <MatchChip match={selected.match} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Submitted by the agent
                </div>
                <div className="space-y-3">
                  <Field label="Name" value={selected.agentName} />
                  <Field label="CEA number" value={<span className="font-mono">{selected.ceaNumber}</span>} />
                  <Field label="Agency" value={selected.agency} />
                  <Field label="Agency licence" value={<span className="font-mono">{selected.agencyLicence}</span>} />
                </div>
              </div>
              <div>
                <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Found in the register
                </div>
                <div className="space-y-3">
                  <Field label="Registered name" value={selected.registryName ?? <span className="text-red-500">No record</span>} />
                  <Field label="Registration valid to" value={selected.registryExpiry ?? '—'} />
                  <Field label="Evidence uploaded" value={selected.evidence ?? 'None'} />
                </div>
              </div>
            </div>

            {selected.discrepancy && (
              <div className="mt-5 rounded-lg border border-amber-300/60 bg-amber-50/60 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/20">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Discrepancy
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">{selected.discrepancy}</p>
              </div>
            )}

            {selected.match === 'strong' && (
              <div className="mt-5 rounded-lg border border-emerald-300/60 bg-emerald-50/60 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <p className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                  Registration number, name and agency all agree. Pre-approved — the officer confirms with
                  one click. This is the majority path, and it is why automation earns its place here.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
              <Button variant="gold" leftIcon={<Check size={14} />} onClick={() => decide(selected.id, 'approved')}>
                Approve agent
              </Button>
              <Button variant="outline" leftIcon={<MessageSquare size={14} />}>Request more information</Button>
              <Button variant="destructive" leftIcon={<X size={14} />} onClick={() => decide(selected.id, 'rejected')}>
                Reject
              </Button>
              {selected.evidence && (
                <Button variant="ghost" leftIcon={<FileText size={14} />}>View evidence</Button>
              )}
            </div>
            <p className="mt-3 text-[11px] text-neutral-500 dark:text-neutral-400">
              The decision records which copy of the register it was taken against, and when — so a
              verification badge can be evidenced later if it is ever disputed.
            </p>
          </Card>
        ) : (
          <Card className="flex items-center justify-center py-16 text-sm text-neutral-400">
            Queue cleared.
          </Card>
        )}
      </div>

      <SpecNote>
        Automatic rejection is deliberately not implemented. Real names vary — “TAN WEI MING”, “Wei Ming
        Tan”, “Tan Wei Ming (Alex)” — and rejecting on a name mismatch would turn away legitimate agents
        in a way that is hard to undo and generates support work.
      </SpecNote>
    </>
  );
}
