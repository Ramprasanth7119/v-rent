"use client";

/**
 * Application status.
 *
 * Where the application stands, as a timeline rather than a paragraph: what is
 * done and when, what is happening now and what to expect, and — if something
 * failed — why. Times are the ones the platform recorded; a step with no
 * recorded time says what to expect instead of showing a date nobody wrote.
 *
 * This page reports the officer's decision; it does not offer to make it. It
 * used to carry a "Prototype controls" panel whose buttons wrote `approval`
 * and `ceaValid` straight into the account's own workspace — the same two
 * fields the operations console writes — so an account could approve itself
 * and clear its own lapsed registration. The workspace route now refuses both
 * from an agent session, and the approval itself is walked through in the
 * console at /phase1/admin/verification, which is where it belongs.
 */

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button, Card, Timeline, type TimelineItem, type TimelineState } from '../../../components/phase1/kit';
import { StatusBadge } from '../../../components/phase1/status';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { useSession } from '../../../lib/phase1/SessionContext';
import { sgDate, sgDateTime } from '../../../lib/phase1/format';

export default function StatusPage() {
  const router = useRouter();
  const { state } = useDemo();
  const { user } = useSession();
  const a = state.approval;

  // The officer's decision is recorded as a notice on the account; its time is the decision's time.
  const decision = state.alerts.find((n) => n.kind === 'cea' && (n.tone === 'success' || n.tone === 'danger'));
  const contactDone = state.emailVerified && state.mobileVerified;
  const ceaMatched = Boolean(user?.cea?.verifiedAt) || state.profileSubmitted;

  const raw: { key: string; label: string; done: boolean; failed?: boolean; at?: string; detail?: string; expect?: string; action?: React.ReactNode }[] = [
    { key: 'account', label: 'Account created', done: true, at: user?.createdAt ? sgDateTime(user.createdAt) : undefined },
    {
      key: 'contact', label: 'Contact verified', done: contactDone,
      at: contactDone && user?.emailVerifiedAt ? sgDateTime(user.emailVerifiedAt) : undefined,
      expect: 'Confirm your email address and mobile number',
      action: <Button size="sm" variant="outline" onClick={() => router.push('/phase1/verify')}>Verify contact</Button>,
    },
    {
      key: 'profile', label: 'Profile submitted', done: state.profileSubmitted,
      expect: 'Complete your professional details',
      action: <Button size="sm" variant="outline" onClick={() => router.push('/phase1/profile')}>Complete profile</Button>,
    },
    {
      key: 'cea', label: 'CEA register matched', done: ceaMatched && state.ceaValid, failed: ceaMatched && !state.ceaValid,
      at: user?.cea?.verifiedAt ? sgDateTime(user.cea.verifiedAt) : undefined,
      detail: !state.ceaValid && ceaMatched ? 'The registration has lapsed on the register. Publishing is paused until it is renewed.' : undefined,
      expect: 'Checked automatically when you submit',
    },
    {
      key: 'review', label: 'Officer review', done: a === 'approved', failed: a === 'rejected' || a === 'suspended',
      detail: a === 'rejected'
        ? (decision?.tone === 'danger' ? decision.body : 'The details could not be matched to the register. Correct them to be reviewed again.')
        : a === 'suspended' ? 'Publication rights were withdrawn by an administrator.' : undefined,
      expect: 'A verification officer confirms it is you · usually within one business day',
      action: a === 'rejected' ? <Button size="sm" onClick={() => router.push('/phase1/profile')}>Update your details</Button> : undefined,
    },
    {
      key: 'approved', label: 'Approved', done: a === 'approved',
      at: a === 'approved' && decision?.tone === 'success' ? sgDateTime(decision.at) : undefined,
    },
  ];

  let currentAssigned = false;
  const items: TimelineItem[] = raw.map((s, i) => {
    // A step left undone while later ones completed (contact details not yet
    // confirmed on an approved account) is outstanding, not "in progress".
    const laterDone = raw.slice(i + 1).some((x) => x.done);
    let st: TimelineState;
    if (s.failed) { st = 'failed'; currentAssigned = true; }
    else if (s.done) st = 'done';
    else if (!currentAssigned && !laterDone) { st = 'current'; currentAssigned = true; }
    else st = 'upcoming';
    const outstanding = st === 'upcoming' && laterDone;
    return {
      key: s.key,
      label: s.label,
      state: st,
      at: s.at,
      detail: st === 'failed' ? s.detail : st === 'current' ? s.expect : outstanding ? `Still to do · ${s.expect ?? ''}` : undefined,
      action: st === 'current' || st === 'failed' || outstanding ? s.action : undefined,
    };
  });

  const standing = a === 'approved' && !state.ceaValid ? 'verification_expired' : state.profileSubmitted ? a : 'not_submitted';
  const headline = {
    approved: state.ceaValid ? 'You are verified' : 'Your CEA registration has lapsed',
    under_review: 'A verification officer is reviewing your application',
    rejected: 'Your application needs changes',
    suspended: 'Your account is suspended',
    not_submitted: 'Finish your application',
  }[a];
  const sub = {
    approved: state.ceaValid ? `Registration valid until ${sgDate(state.ceaValidUntil)}.` : 'You keep your account; publishing resumes once it is renewed.',
    under_review: 'We will notify you as soon as there is a decision.',
    rejected: 'See the reason below, correct it, and it will be reviewed again.',
    suspended: 'You can still sign in, but cannot publish. Contact support if this is a mistake.',
    not_submitted: 'Complete your professional details to begin verification.',
  }[a];

  const next = a === 'approved' && state.ceaValid
    ? (state.plan
      ? <Button onClick={() => router.push('/phase1/listings/new')} rightIcon={<ArrowRight size={16} />}>Create a listing</Button>
      : <Button onClick={() => router.push('/phase1/plans')} rightIcon={<ArrowRight size={16} />}>Choose a plan</Button>)
    : a === 'not_submitted' || a === 'rejected'
      ? <Button onClick={() => router.push('/phase1/profile')} rightIcon={<ArrowRight size={16} />}>{a === 'rejected' ? 'Update your details' : 'Complete your profile'}</Button>
      : null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="vr-rise mb-5 text-[24px] font-semibold tracking-[-0.02em] text-p1-text sm:text-[28px]">Verification</h1>

      <Card className="vr-rise mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <StatusBadge kind="agent" value={standing} />
            <div className="mt-2.5 text-[18px] font-semibold tracking-[-0.01em] text-p1-text">{headline}</div>
            <p className="mt-0.5 text-[14px] text-p1-text-3">{sub}</p>
          </div>
          {next}
        </div>
      </Card>

      <Card as="section" aria-labelledby="timeline-h">
        <h2 id="timeline-h" className="mb-5 text-[15px] font-semibold text-p1-text">Progress</h2>
        <Timeline items={items} />
      </Card>

    </div>
  );
}
