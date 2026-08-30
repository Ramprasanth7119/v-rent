"use client";

import { useState } from 'react';
import {
  PageHeader, Card, SectionCard, Callout, Field, Button, Avatar, EmptyState, SelectInput, TextArea, PresenterNote, cx,
} from '../../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../../components/phase1/status';
import { ConfirmDialog, Dialog, Drawer } from '../../../../components/phase1/overlays';
import { useToast } from '../../../../components/phase1/Toast';
import { VERIFICATION_QUEUE, VerificationCase } from '../../../../lib/phase1/data';
import { Check, X, FileText, Database, MessageSquare, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

const REJECT_REASONS = [
  { value: 'no_record', label: 'No matching registration in the CEA register' },
  { value: 'expired', label: 'Registration has expired' },
  { value: 'identity', label: 'Identity could not be confirmed' },
  { value: 'duplicate', label: 'Registration already claimed by another account' },
];

export default function VerificationQueuePage() {
  const { push } = useToast();
  const [queue] = useState(VERIFICATION_QUEUE);
  const [selected, setSelected] = useState<VerificationCase | null>(VERIFICATION_QUEUE[0]);
  const [decided, setDecided] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [dialog, setDialog] = useState<null | 'approve' | 'reject' | 'info' | 'doc'>(null);
  const [reason, setReason] = useState('no_record');

  const decide = (id: string, d: 'approved' | 'rejected') => {
    const next = { ...decided, [id]: d };
    setDecided(next);
    setSelected(queue.find((q) => !next[q.id]) ?? null);
    setDialog(null);
    push(d === 'approved'
      ? { tone: 'success', title: 'Agent approved', body: 'They can now choose a plan and start listing.' }
      : { tone: 'info', title: 'Application rejected', body: 'The agent has been told why and can resubmit.' });
  };

  const pending = queue.filter((q) => !decided[q.id]);

  const verdict = (c: VerificationCase) => ({
    strong: { tone: 'success' as const, title: 'CEA registration verified', body: 'Name, registration number and agency all agree with the register. Confirm to approve.' },
    weak: { tone: 'warning' as const, title: 'Verification requires review', body: c.discrepancy ?? 'A detail differs from the register.' },
    not_found: { tone: 'danger' as const, title: 'Registration not found', body: c.discrepancy ?? 'No matching registration number in the current register.' },
    expired: { tone: 'danger' as const, title: 'Registration has expired', body: c.discrepancy ?? 'The registration lapsed and no longer appears in the register.' },
  }[c.match]);

  const nameMatches = (c: VerificationCase) => (c.registryName ?? '').toLowerCase() === c.agentName.toLowerCase();


  return (
    <>
      <PageHeader eyebrow="Administration" title="Verification queue" description="Automated matching proposes an outcome. A verification officer always makes the decision." />

      <Callout tone="neutral" icon={<Database size={18} />} className="mb-6">
        Register copy from <strong className="text-p1-text">28 Aug 2026, 06:00</strong> · 4,812 active salespersons on data.gov.sg. Refreshed daily.
      </Callout>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <span className="text-[14px] font-semibold text-p1-text">Waiting for a decision</span>
            <Pill tone={pending.length ? 'warning' : 'success'}>{pending.length}</Pill>
          </div>
          <ul className="space-y-2">
            {queue.map((c) => {
              const d = decided[c.id];
              const on = selected?.id === c.id;
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => setSelected(c)} disabled={!!d} aria-pressed={on}
                    className={cx('w-full rounded-xl border-2 p-3.5 text-left transition-colors cursor-pointer disabled:cursor-default',
                      on ? 'border-p1-accent bg-p1-accent-soft/50' : 'border-p1-border bg-p1-surface hover:border-p1-border-strong', d && 'opacity-55')}>
                    <div className="flex items-start gap-3">
                      <Avatar name={c.agentName} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-[15px] font-semibold text-p1-text">{c.agentName}</span>
                          {d ? <Pill tone={d === 'approved' ? 'success' : 'danger'}>{d === 'approved' ? 'Approved' : 'Rejected'}</Pill> : <StatusBadge kind="match" value={c.match} size="sm" showHelp={false} />}
                        </div>
                        <div className="mt-0.5 font-mono text-[13px] text-p1-text-2">{c.ceaNumber}</div>
                        <div className="truncate text-[13px] text-p1-text-3">{c.agency}</div>
                        <div className="mt-1 text-[12px] text-p1-text-3">Submitted {c.submittedAt}</div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {selected ? (
          <SectionCard
            title={selected.agentName}
            description={`Submitted ${selected.submittedAt}`}
            actions={<StatusBadge kind="match" value={selected.match} size="lg" />}
            footer={
              <div className="flex flex-wrap gap-2">
                <Button variant="accent" leftIcon={<Check size={15} />} onClick={() => setDialog('approve')}>Approve agent</Button>
                <Button variant="outline" leftIcon={<MessageSquare size={15} />} onClick={() => setDialog('info')}>Request more information</Button>
                <Button variant="danger" leftIcon={<X size={15} />} onClick={() => setDialog('reject')}>Reject</Button>
              </div>
            }
          >
            <Callout tone={verdict(selected).tone} title={verdict(selected).title}>{verdict(selected).body}</Callout>

            <div className="mt-5 grid overflow-hidden rounded-xl border border-p1-border sm:grid-cols-2">
              <div className="p-4 sm:p-5">
                <div className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-p1-text-3">Submitted by the agent</div>
                <dl className="space-y-3">
                  <Field label="Name" value={selected.agentName} />
                  <Field label="CEA number" value={selected.ceaNumber} mono />
                  <Field label="Agency" value={selected.agency} />
                  <Field label="Agency licence" value={selected.agencyLicence} mono />
                </dl>
              </div>
              <div className="border-t border-p1-border bg-p1-subtle/50 p-4 sm:border-l sm:border-t-0 sm:p-5">
                <div className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-p1-text-3">Found in the CEA register</div>
                <dl className="space-y-3">
                  <Field label="Registered name" value={selected.registryName ? <span className="flex flex-wrap items-center gap-2">{selected.registryName}<MatchMark ok={nameMatches(selected)} /></span> : <span className="text-p1-danger">No record</span>} />
                  <Field label="CEA number" value={selected.registryName ? <span className="flex flex-wrap items-center gap-2"><span className="font-mono text-[14px]">{selected.ceaNumber}</span><MatchMark ok /></span> : '—'} />
                  <Field label="Registration valid to" value={selected.registryExpiry ? <span className="flex flex-wrap items-center gap-2">{selected.registryExpiry}<MatchMark ok={selected.match !== 'expired'} /></span> : '—'} />
                  <Field label="Agency" value={selected.registryName ? <span className="flex flex-wrap items-center gap-2">{selected.agency}<MatchMark ok /></span> : '—'} />
                </dl>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-p1-border p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-p1-subtle text-p1-text-2" aria-hidden><FileText size={18} /></span>
                <div>
                  <div className="text-[14px] font-medium text-p1-text">Supporting document</div>
                  <div className="text-[13px] text-p1-text-3">{selected.evidence ?? 'None uploaded'}</div>
                </div>
              </div>
              {selected.evidence && <Button variant="outline" size="sm" onClick={() => setDialog('doc')}>View document</Button>}
            </div>

            <p className="mt-4 text-[13px] text-p1-text-3">Your decision records which copy of the register it was taken against, and when.</p>
          </SectionCard>
        ) : (
          <Card><EmptyState icon={<CheckCircle2 size={26} className="text-p1-success" />} title="Queue cleared" description="Every application has a decision. New submissions will appear here." /></Card>
        )}
      </div>

      {selected && (
        <>
          <ConfirmDialog open={dialog === 'approve'} onClose={() => setDialog(null)} confirmLabel="Approve agent" title={`Approve ${selected.agentName}?`}
            description="They will be able to choose a plan and publish listings. The verified badge is re-checked daily against the register."
            onConfirm={() => decide(selected.id, 'approved')} />

          <ConfirmDialog open={dialog === 'reject'} onClose={() => setDialog(null)} destructive confirmLabel="Reject application" title={`Reject ${selected.agentName}?`}
            description="The agent is told the reason and can resubmit with corrected details."
            onConfirm={() => decide(selected.id, 'rejected')}>
            <SelectInput label="Reason shown to the agent" value={reason} onChange={(e) => setReason(e.target.value)} options={REJECT_REASONS} />
          </ConfirmDialog>

          <Dialog open={dialog === 'info'} onClose={() => setDialog(null)} title="Request more information" description={`Sent to ${selected.agentName} by email.`}
            footer={<><Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button onClick={() => { setDialog(null); push({ tone: 'success', title: 'Request sent', body: 'The application stays in the queue until they reply.' }); }}>Send</Button></>}>
            <TextArea label="Message" rows={4} defaultValue="Hello — the name on your CEA registration differs slightly from the one you entered. Could you upload a photo of your CEA card so we can confirm?" />
          </Dialog>

          <Drawer open={dialog === 'doc'} onClose={() => setDialog(null)} title="Supporting document" description={selected.evidence}>
            <div className="flex aspect-[8/5] w-full flex-col items-center justify-center rounded-xl border border-p1-border bg-p1-subtle text-p1-text-3">
              <ShieldCheck size={36} aria-hidden />
              <div className="mt-2 text-[14px] font-medium text-p1-text-2">CEA card — front</div>
              <div className="text-[12px]">Placeholder in the prototype</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><Pill tone="success">Scanned · no malware</Pill><Pill>Uploaded {selected.submittedAt}</Pill></div>
          </Drawer>
        </>
      )}

      <PresenterNote>
        Automatic rejection is deliberately not implemented. Real names vary — “TAN WEI MING”, “Wei Ming Tan”, “Tan Wei Ming (Alex)” — and rejecting on a name mismatch would turn away legitimate agents. Onboarding never calls data.gov.sg directly; it reads the daily copy.
      </PresenterNote>
    </>
  );
}

function MatchMark({ ok }: { ok: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1 text-[12px] font-medium', ok ? 'text-p1-success' : 'text-p1-warning')}>
      {ok ? <Check size={13} strokeWidth={3} aria-hidden /> : <AlertCircle size={13} aria-hidden />}{ok ? 'Matches' : 'Differs'}
    </span>
  );
}
