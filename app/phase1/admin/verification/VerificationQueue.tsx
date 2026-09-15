"use client";

/**
 * The verification desk.
 *
 * An officer's job here is one comparison: does the account agree with the CEA
 * register. So the screen is a short queue and, beside it, the application
 * being read — the two sources down a spine, agreeing rows quiet, differing
 * rows loud, and the decision underneath. The officer never leaves the page.
 *
 * Keyboard: ↑/↓ move through the queue, Enter moves focus to the decision.
 */

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Button, Card, EmptyState, Callout, SelectInput, TextArea, Tooltip, Kbd, cx,
} from '../../../../components/phase1/kit';
import { ConfirmDialog } from '../../../../components/phase1/overlays';
import { useToast } from '../../../../components/phase1/Toast';
import type { Application, MatchOutcome } from '../../../../lib/phase1/admin-verification';
import type { VerificationPolicy } from '../../../../lib/phase1/verification-policy';
import { sgDate } from '../../../../lib/phase1/format';
import {
  ShieldCheck, ShieldAlert, ShieldX, Check, X, Mail, Phone, CalendarClock, ArrowRight, CloudOff, Info, Clock,
} from 'lucide-react';

const REJECT_REASONS = [
  'The name on the account does not match the register',
  'The registration number belongs to a different salesperson',
  'No matching registration in the CEA register',
  'The registration has lapsed',
  'Identity could not be confirmed',
  'The registration is already claimed by another account',
];

const VERDICT: Record<MatchOutcome, { label: string; short: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; icon: typeof ShieldCheck; blurb: string }> = {
  strong: { label: 'Register agrees on every field', short: 'Match', tone: 'success', icon: ShieldCheck, blurb: 'Nothing to reconcile. Approving is the expected outcome.' },
  weak: { label: 'One or more fields differ', short: 'Differs', tone: 'warning', icon: ShieldAlert, blurb: 'A changed agency is routine; a changed name is not.' },
  not_found: { label: 'Not on the active register', short: 'Not found', tone: 'danger', icon: ShieldX, blurb: 'A lapsed or withdrawn registration disappears from the register entirely.' },
  unavailable: { label: 'Register did not answer', short: 'No answer', tone: 'neutral', icon: CloudOff, blurb: 'data.gov.sg is not responding. Refresh before deciding.' },
};

const TONE_BADGE = {
  success: 'border-p1-success-border bg-p1-success-soft text-p1-success',
  warning: 'border-p1-warning-border bg-p1-warning-soft text-p1-warning',
  danger: 'border-p1-danger-border bg-p1-danger-soft text-p1-danger',
  neutral: 'border-p1-border bg-p1-subtle text-p1-text-2',
};

function Verdict({ match, full = false }: { match: MatchOutcome; full?: boolean }) {
  const v = VERDICT[match];
  const Icon = v.icon;
  return (
    <span className={cx('inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[12px] font-medium', TONE_BADGE[v.tone])}>
      <Icon size={12} aria-hidden />{full ? v.label : v.short}
    </span>
  );
}

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
  const [selectedId, setSelectedId] = useState<string | null>(applications[0]?.accountId ?? null);
  const workspace = useRef<HTMLDivElement>(null);

  // A selection that has left the queue (a decision, a poll) falls back to the first item, derived rather than stored.
  const selected = applications.find((a) => a.accountId === selectedId) ?? applications[0] ?? null;

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
      const i = applications.findIndex((a) => a.accountId === app.accountId);
      const next = applications[i + 1] ?? applications[i - 1];
      setSelectedId(next?.accountId ?? null);
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

  const onTableKey = (e: React.KeyboardEvent) => {
    if (!applications.length) return;
    const i = Math.max(0, applications.findIndex((a) => a.accountId === selected?.accountId));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = applications[Math.min(applications.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))];
      setSelectedId(n.accountId);
      requestAnimationFrame(() => document.getElementById(`app-${n.accountId}`)?.focus());
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      workspace.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      workspace.current?.querySelector<HTMLElement>('[data-decision]')?.focus();
    }
  };

  return (
    <>
      {/* ------------------------------------------------------------ header */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-p1-text">Verification</h1>
          <span className="rounded-full bg-p1-subtle px-2 py-0.5 text-[12.5px] font-semibold tabular-nums text-p1-text-2">{applications.length} pending</span>
        </div>
        <p className="flex items-center gap-1.5 text-[13px] text-p1-text-3">
          <span className={cx('h-1.5 w-1.5 rounded-full', policy.autoApprove ? 'bg-p1-success' : 'bg-p1-warning')} aria-hidden />
          {policy.autoApprove
            ? <>Auto-approval on · clean matches admit themselves</>
            : <>Manual review · <span className="tabular-nums">{policy.agentCount} of {policy.threshold}</span> agents before auto-approval</>}
          <Tooltip content={policy.autoApprove
            ? `Above ${policy.threshold} agents an exact match on number, name and agency approves immediately. Anything that does not match still arrives here.`
            : `A register match proves the number is real, not that the applicant owns it. Above ${policy.threshold} agents a clean match will approve on its own.`}>
            <button type="button" aria-label="About the verification policy" className="flex h-6 w-6 cursor-help items-center justify-center rounded-md hover:bg-p1-subtle hover:text-p1-text"><Info size={14} /></button>
          </Tooltip>
        </p>
      </header>

      {applications.length === 0 ? (
        <Card padding="none">
          <EmptyState
            compact
            icon={<ShieldCheck size={18} className="text-p1-success" />}
            title="No applications waiting"
            description={policy.autoApprove ? 'Clean register matches are approving on their own.' : 'New applications appear here the moment an agent signs up.'}
            action={<Link href="/phase1/admin/agents" className="inline-flex items-center gap-1 text-[13px] font-medium text-p1-primary hover:underline underline-offset-4">Agent directory <ArrowRight size={13} aria-hidden /></Link>}
            className="py-10"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
          {/* ------------------------------------------------------ queue */}
          <Card padding="none" className="h-fit overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-[13.5px]" onKeyDown={onTableKey}>
                <caption className="sr-only">Applications waiting for verification. Use the up and down arrows to move, Enter to decide.</caption>
                <thead>
                  <tr className="border-b border-p1-border text-[12px] font-medium text-p1-text-3">
                    <th scope="col" className="px-4 py-2.5 font-medium">Agent</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">CEA no.</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Register</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Applied</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Registered until</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-p1-border">
                  {applications.map((app) => {
                    const on = app.accountId === selected?.accountId;
                    const expiring = app.daysToExpiry !== null && app.daysToExpiry <= 60;
                    return (
                      <tr
                        key={app.accountId}
                        id={`app-${app.accountId}`}
                        tabIndex={on ? 0 : -1}
                        aria-selected={on}
                        onClick={() => setSelectedId(app.accountId)}
                        className={cx('cursor-pointer outline-none transition-colors focus-visible:bg-p1-primary-soft', on ? 'bg-p1-primary-soft/60' : 'hover:bg-p1-subtle/60')}
                      >
                        <td className="relative px-4 py-3">
                          {on && <span className="absolute inset-y-0 left-0 w-0.5 bg-p1-primary" aria-hidden />}
                          <div className="font-medium text-p1-text">{app.name}</div>
                          <div className="truncate text-[12px] text-p1-text-3">{app.agency || 'Agency not given'}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-[12.5px] text-p1-text-2">{app.ceaNumber || '—'}</td>
                        <td className="px-4 py-3"><Verdict match={app.match} /></td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-p1-text-2">{sgDate(app.appliedAt)}</td>
                        <td className={cx('whitespace-nowrap px-4 py-3 text-right tabular-nums', expiring ? 'font-medium text-p1-warning' : 'text-p1-text-2')}>
                          {app.registrationEnd ? sgDate(app.registrationEnd) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3 border-t border-p1-border px-4 py-2 text-[12px] text-p1-text-3">
              <span className="inline-flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
              <span className="inline-flex items-center gap-1"><Kbd>Enter</Kbd> decide</span>
            </div>
          </Card>

          {/* -------------------------------------------------- workspace */}
          {selected && (() => {
            const app = selected;
            const verdict = VERDICT[app.match];
            const expiring = app.daysToExpiry !== null && app.daysToExpiry <= 60;
            return (
              <div ref={workspace} className="lg:sticky lg:top-[80px] lg:self-start">
                <Card padding="none" as="section" aria-label={`Application from ${app.name}`} className="overflow-hidden">
                  <div key={app.accountId} className="p1-in">
                    <div className="border-b border-p1-border px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-[17px] font-semibold text-p1-text">{app.name}</h2>
                          <p className="truncate text-[13px] text-p1-text-2">{app.agency || 'Agency not given'}{app.agencyLicence && <span className="text-p1-text-3"> · {app.agencyLicence}</span>}</p>
                        </div>
                        <Verdict match={app.match} full />
                      </div>
                      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-p1-text-2">
                        <li className="inline-flex min-w-0 items-center gap-1.5"><Mail size={13} className="shrink-0 text-p1-text-3" aria-hidden /><span className="truncate">{app.email}</span></li>
                        {app.mobile && <li className="inline-flex items-center gap-1.5"><Phone size={13} className="text-p1-text-3" aria-hidden />{app.mobile}</li>}
                        <li className="inline-flex items-center gap-1.5"><Clock size={13} className="text-p1-text-3" aria-hidden />Applied {sgDate(app.appliedAt)}</li>
                      </ul>
                    </div>

                    <div className="px-5 py-4">
                      <p className="mb-3 text-[12.5px] leading-5 text-p1-text-3">{verdict.blurb}</p>
                      {app.checks.length > 0 ? (
                        <div className="overflow-hidden rounded-lg border border-p1-border">
                          <div className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-2 border-b border-p1-border bg-p1-subtle/60 px-3 py-2 text-[11.5px] font-medium text-p1-text-3">
                            <span>On the account</span>
                            <span aria-hidden />
                            <span className="text-right">CEA register, now</span>
                          </div>
                          <ul className="divide-y divide-p1-border">
                            {app.checks.map((c) => (
                              <li key={c.label} className={cx('px-3 py-2', !c.agrees && 'bg-p1-warning-soft/60')}>
                                <div className="text-[11.5px] text-p1-text-3">{c.label}</div>
                                <div className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-2">
                                  <span className="truncate text-[13.5px] text-p1-text" title={c.ours}>{c.ours || '—'}</span>
                                  <span className="flex justify-center" title={c.agrees ? 'Agrees' : 'Differs'}>
                                    {c.agrees ? <Check size={14} className="text-p1-success" aria-label="agrees" /> : <X size={14} className="text-p1-warning" aria-label="differs" />}
                                  </span>
                                  <span className={cx('truncate text-right text-[13.5px]', c.agrees ? 'text-p1-text-2' : 'font-medium text-p1-warning')} title={c.register}>{c.register || '—'}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <Callout tone={app.match === 'not_found' ? 'danger' : 'neutral'} compact>
                          No register record to compare. Number on the account: <span className="font-mono">{app.ceaNumber || 'none given'}</span>.
                        </Callout>
                      )}

                      {app.registrationEnd && (
                        <p className={cx('mt-3 inline-flex items-center gap-1.5 text-[12.5px]', expiring ? 'font-medium text-p1-warning' : 'text-p1-text-3')}>
                          <CalendarClock size={13} aria-hidden />
                          Registered until {sgDate(app.registrationEnd)}
                          {app.daysToExpiry !== null && <span className="tabular-nums"> · {app.daysToExpiry} days</span>}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-p1-border bg-p1-subtle/40 px-5 py-3">
                      <Button
                        data-decision
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
                      <Link href={`/phase1/admin/agents/${app.accountId}`} className="ml-auto inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text">
                        Full record <ArrowRight size={13} aria-hidden />
                      </Link>
                    </div>
                    {app.match === 'not_found' && (
                      <p className="border-t border-p1-border px-5 py-2.5 text-[12px] text-p1-text-3">Approval is unavailable while the registration is not on the register.</p>
                    )}
                  </div>
                </Card>
              </div>
            );
          })()}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        destructive
        confirmLabel="Reject application"
        title="Reject this application?"
        description="The account and its drafts stay. The right to advertise is withheld until the reason is resolved."
        onConfirm={confirmReject}
      >
        <SelectInput label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} options={REJECT_REASONS.map((r) => ({ value: r, label: r }))} />
        <TextArea
          label="Anything else the agent should know"
          rows={3}
          containerClassName="mt-4"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          hint="Optional. Shown to them with the reason."
        />
      </ConfirmDialog>
    </>
  );
}
