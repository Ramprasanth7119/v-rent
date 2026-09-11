"use client";

/**
 * The verification desk.
 *
 * An officer's job here is one comparison: does the account in front of them
 * agree with the CEA register. So that comparison is the screen — the two
 * sources side by side down a spine, agreeing rows quiet, disagreeing rows
 * loud — rather than a form the officer has to read twice to find the one field
 * that differs.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PageHeader, Card, Button, EmptyState, Callout, SelectInput, TextArea, cx,
} from '../../../../components/phase1/kit';
import { ConfirmDialog } from '../../../../components/phase1/overlays';
import { useToast } from '../../../../components/phase1/Toast';
import type { Application, MatchOutcome } from '../../../../lib/phase1/admin-verification';
import type { VerificationPolicy } from '../../../../lib/phase1/verification-policy';
import {
  ShieldCheck, ShieldAlert, ShieldX, Check, X, Clock, Mail, Phone, CalendarClock, Gauge, ArrowRight, CloudOff,
} from 'lucide-react';

const REJECT_REASONS = [
  'The name on the account does not match the register',
  'The registration number belongs to a different salesperson',
  'No matching registration in the CEA register',
  'The registration has lapsed',
  'Identity could not be confirmed',
  'The registration is already claimed by another account',
];

const VERDICT: Record<MatchOutcome, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; icon: typeof ShieldCheck; blurb: string }> = {
  strong: { label: 'Register agrees on every field', tone: 'success', icon: ShieldCheck, blurb: 'Nothing to reconcile. Approving is the expected outcome.' },
  weak: { label: 'One or more fields differ', tone: 'warning', icon: ShieldAlert, blurb: 'Read the differing rows below before deciding — a changed agency is routine, a changed name is not.' },
  not_found: { label: 'Not on the active register', tone: 'danger', icon: ShieldX, blurb: 'The register lists only current salespersons. A lapsed or withdrawn registration disappears from it entirely.' },
  unavailable: { label: 'Register did not answer', tone: 'neutral', icon: CloudOff, blurb: 'data.gov.sg is not responding. The comparison below is from sign-up; refresh before deciding.' },
};

export default function VerificationQueue({
  applications, policy,
}: {
  applications: Application[];
  policy: VerificationPolicy;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [rejecting, setRejecting] = useState<Application | null>(null);
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const decide = async (app: Application, action: 'approve' | 'reject', why?: string) => {
    setBusy(app.accountId);
    try {
      const res = await fetch('/api/phase1/admin/verification', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accountId: app.accountId, action, reason: why }),
      });
      if (!res.ok) throw new Error(String(res.status));
      push(action === 'approve'
        ? { tone: 'success', title: `${app.name} is verified`, body: 'They can choose a plan and publish from their next request.' }
        : { tone: 'warn', title: 'Application rejected', body: `${app.name} keeps their account and their drafts, but cannot advertise.` });
      router.refresh();
    } catch {
      push({ tone: 'error', title: 'That did not go through', body: 'The account was not changed. Try again in a moment.' });
    } finally {
      setBusy(null);
    }
  };

  const confirmReject = () => {
    const app = rejecting;
    if (!app) return;
    setRejecting(null);
    void decide(app, 'reject', note.trim() ? `${reason}. ${note.trim()}` : `${reason}.`);
    setNote('');
  };

  const pct = Math.min(100, Math.round((policy.agentCount / policy.threshold) * 100));

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Verification queue"
        description="Applications from CEA-registered salespersons, compared against the public register at the moment you open them."
      />

      {/* ---------------------------------------------------- policy band */}
      <Card padding="lg" className="mb-6 border-transparent bg-p1-primary text-white">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[12.5px] font-semibold text-p1-accent">
              <Gauge size={14} aria-hidden />
              Verification policy
            </div>
            <h2 className="font-p1display text-[21px] font-medium leading-tight sm:text-[24px]">
              {policy.autoApprove
                ? 'A clean register match now approves on its own'
                : 'Every application is reviewed by a person'}
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-white/75">
              {policy.autoApprove ? (
                <>
                  The platform passed {policy.threshold} agents, so an exact match on registration number, name and
                  agency admits the applicant immediately. Anything that does not match cleanly still arrives here.
                </>
              ) : (
                <>
                  A register match proves the number is real, not that the person typing it owns it. While V-RENT is
                  small that gap is worth a minute of an officer&rsquo;s time. Above {policy.threshold} agents, a clean
                  match will approve on its own and only the awkward ones will reach this queue.
                </>
              )}
            </p>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/[0.07] p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-white/60">Agents on the platform</span>
              <span className="font-p1display text-[22px] font-medium tabular-nums">{policy.agentCount}</span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
              <div className="h-full rounded-full bg-p1-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2.5 text-[12.5px] leading-5 text-white/60">
              {policy.autoApprove
                ? `Auto-approval is on, above the threshold of ${policy.threshold}.`
                : `${policy.remaining} more ${policy.remaining === 1 ? 'agent' : 'agents'} before auto-approval switches on at ${policy.threshold}.`}
            </p>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------ the queue */}
      {applications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ShieldCheck size={26} />}
            title="No applications waiting"
            description={policy.autoApprove
              ? 'Clean register matches are approving on their own. Anything that does not match will appear here.'
              : 'Every agent who has signed up has been decided. New applications appear here immediately.'}
            action={<Link href="/phase1/admin/agents" className="text-[14px] font-medium text-p1-primary hover:underline underline-offset-4 dark:text-p1-info">Open the agent directory</Link>}
          />
        </Card>
      ) : (
        <ul className="vr-stagger space-y-5">
          {applications.map((app) => {
            const verdict = VERDICT[app.match];
            const Icon = verdict.icon;
            const expiring = app.daysToExpiry !== null && app.daysToExpiry <= 60;

            return (
              <li key={app.accountId}>
                <Card padding="none" className="overflow-hidden">
                  {/* header */}
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-p1-border px-5 py-4">
                    <div className="min-w-0">
                      <h2 className="text-[17px] font-semibold text-p1-text">{app.name}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-p1-text-2">
                        <span className="inline-flex items-center gap-1.5"><Mail size={13} className="text-p1-text-3" aria-hidden />{app.email}</span>
                        <span className="inline-flex items-center gap-1.5"><Phone size={13} className="text-p1-text-3" aria-hidden />{app.mobile}</span>
                        <span className="inline-flex items-center gap-1.5"><Clock size={13} className="text-p1-text-3" aria-hidden />Applied {app.appliedAt}</span>
                      </div>
                    </div>
                    <span className={cx(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium',
                      verdict.tone === 'success' && 'border-p1-success-border bg-p1-success-soft text-p1-success',
                      verdict.tone === 'warning' && 'border-p1-warning-border bg-p1-warning-soft text-p1-warning',
                      verdict.tone === 'danger' && 'border-p1-danger-border bg-p1-danger-soft text-p1-danger',
                      verdict.tone === 'neutral' && 'border-p1-border bg-p1-subtle text-p1-text-2',
                    )}>
                      <Icon size={15} aria-hidden />{verdict.label}
                    </span>
                  </div>

                  {/* the comparison */}
                  <div className="px-5 py-4">
                    <p className="mb-3 text-[13px] leading-5 text-p1-text-3">{verdict.blurb}</p>

                    {app.checks.length > 0 ? (
                      <div className="overflow-hidden rounded-lg border border-p1-border">
                        <div className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-2 border-b border-p1-border bg-p1-subtle/60 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-p1-text-3">
                          <span>On the account</span>
                          {/* Empty rather than sr-only: visually-hidden text is taken out of
                              the grid flow, which would slide the next heading a column left. */}
                          <span aria-hidden />
                          <span className="text-right">CEA register, just now</span>
                        </div>
                        <ul className="divide-y divide-p1-border">
                          {app.checks.map((c) => (
                            <li
                              key={c.label}
                              className={cx(
                                'grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-2 px-4 py-2.5',
                                !c.agrees && 'bg-p1-warning-soft/50',
                              )}
                            >
                              <div className="min-w-0">
                                <div className="text-[11.5px] text-p1-text-3">{c.label}</div>
                                <div className="truncate text-[14px] text-p1-text">{c.ours || '—'}</div>
                              </div>
                              <span className="flex justify-center" title={c.agrees ? 'Agrees' : 'Differs'}>
                                {c.agrees
                                  ? <Check size={15} className="text-p1-success" aria-label="agrees" />
                                  : <X size={15} className="text-p1-warning" aria-label="differs" />}
                              </span>
                              <div className="min-w-0 text-right">
                                <div className="text-[11.5px] text-p1-text-3">from the register</div>
                                <div className={cx('truncate text-[14px]', c.agrees ? 'text-p1-text' : 'font-medium text-p1-warning')}>{c.register || '—'}</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <Callout tone={app.match === 'not_found' ? 'danger' : 'neutral'} compact>
                        No register record to compare against. Registration number on the account:{' '}
                        <span className="font-mono">{app.ceaNumber || 'none given'}</span>.
                      </Callout>
                    )}

                    {app.registrationEnd && (
                      <p className={cx('mt-3 inline-flex items-center gap-1.5 text-[13px]', expiring ? 'text-p1-warning' : 'text-p1-text-3')}>
                        <CalendarClock size={14} aria-hidden />
                        Registered until {app.registrationEnd}
                        {app.daysToExpiry !== null && ` · ${app.daysToExpiry} days`}
                      </p>
                    )}
                  </div>

                  {/* decision */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-p1-border bg-p1-subtle/40 px-5 py-3.5">
                    <Button
                      variant="primary"
                      leftIcon={<Check size={15} />}
                      loading={busy === app.accountId}
                      disabled={app.match === 'not_found'}
                      onClick={() => void decide(app, 'approve')}
                    >
                      Approve
                    </Button>
                    <Button variant="danger-outline" leftIcon={<X size={15} />} disabled={busy === app.accountId} onClick={() => setRejecting(app)}>
                      Reject
                    </Button>
                    <Link
                      href={`/phase1/admin/agents/${app.accountId}`}
                      className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-[14px] font-medium text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text"
                    >
                      Open the full record <ArrowRight size={14} aria-hidden />
                    </Link>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        destructive
        confirmLabel="Reject application"
        title="Reject this application?"
        description="The account stays and so do any drafts. What is withheld is the right to advertise, until the reason below is resolved."
        onConfirm={confirmReject}
      >
        <SelectInput label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} options={REJECT_REASONS.map((r) => ({ value: r, label: r }))} />
        <TextArea
          label="Anything else the agent should know"
          rows={3}
          className="mt-4"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          hint="Optional. Shown to them with the reason."
        />
      </ConfirmDialog>
    </>
  );
}
