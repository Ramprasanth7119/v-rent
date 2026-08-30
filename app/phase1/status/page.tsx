"use client";

import { useRouter } from 'next/navigation';
import { Button, Callout, Card, Field, FieldGrid, PageHeader, PresenterNote, SectionCard, Stepper, cx } from '../../../components/phase1/kit';
import { Pill, StatusBadge } from '../../../components/phase1/status';
import { JOURNEY_STEPS, journeyCompleted } from '../../../components/phase1/journey';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { Check, Clock, X, ShieldCheck, RefreshCw, ArrowRight, CalendarCheck, UserCheck, CreditCard } from 'lucide-react';

export default function StatusPage() {
  const router = useRouter();
  const { state, set } = useDemo();
  const a = state.approval;

  const timeline = [
    { label: 'Account created', done: true, at: '28 Aug 2026, 09:02' },
    { label: 'Email and mobile confirmed', done: state.emailVerified && state.mobileVerified, at: '28 Aug 2026, 09:07' },
    { label: 'Professional details submitted', done: state.profileSubmitted, at: '28 Aug 2026, 09:14' },
    { label: 'CEA registration verified', done: state.profileSubmitted, at: state.profileSubmitted ? 'Matched against the CEA register of 28 Aug 2026' : 'Runs automatically after you submit' },
    {
      label: a === 'approved' ? 'Approved by a verification officer' : a === 'rejected' ? 'Application declined' : 'Officer decision',
      done: a === 'approved',
      failed: a === 'rejected',
      at: a === 'approved' ? 'Approved by the verification team' : 'Usually within one business day',
    },
  ];

  const banner = {
    approved: { tone: 'success' as const, title: 'You are verified', body: `Your CEA registration is valid until ${state.ceaValidUntil}. Choose a plan to start listing.` },
    under_review: { tone: 'warning' as const, title: 'Your application is being reviewed', body: 'A verification officer is checking your CEA details. We will email you as soon as there is a decision — usually within one business day.' },
    suspended: { tone: 'danger' as const, title: 'Your account is suspended', body: 'You can still sign in, but you cannot publish listings. Contact support if you think this is a mistake.' },
    rejected: { tone: 'danger' as const, title: 'Your application was declined', body: 'The details submitted could not be matched to the CEA register. You can correct them and resubmit.' },
    not_submitted: { tone: 'neutral' as const, title: 'Nothing submitted yet', body: 'Complete your professional details to begin verification.' },
  }[a];

  return (
    <>
      <PageHeader
        eyebrow={a === 'approved' ? 'Step 5 of 8' : 'Step 4 of 8'}
        title="Application status"
        description="One place to see exactly where your application is, so you never have to ask."
      />
      <Stepper steps={JOURNEY_STEPS} current={a === 'approved' ? 4 : 3} completed={journeyCompleted(state)} />

      <Card className={cx('mb-5', {
        success: 'border-p1-success-border bg-p1-success-soft',
        warning: 'border-p1-warning-border bg-p1-warning-soft',
        danger: 'border-p1-danger-border bg-p1-danger-soft',
        neutral: '',
      }[banner.tone])}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <StatusBadge kind="agent" value={a} size="lg" />
            <div className="min-w-0">
              <div className="text-[18px] font-semibold text-p1-text">{banner.title}</div>
              <p className="mt-1 text-[15px] leading-6 text-p1-text-2">{banner.body}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {a === 'under_review' && (
              <>
                <Button variant="outline" onClick={() => set({ approval: 'approved' })}>Simulate officer approval</Button>
                <Pill tone="accent">Prototype</Pill>
              </>
            )}
            {a === 'approved' && (
              <Button variant="accent" size="lg" onClick={() => router.push('/phase1/plans')} rightIcon={<ArrowRight size={17} />}>Choose a plan</Button>
            )}
            {a === 'not_submitted' && (
              <Button variant="accent" onClick={() => router.push('/phase1/profile')} rightIcon={<ArrowRight size={17} />}>Complete your profile</Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Progress" description="Each step is recorded with the time it happened.">
          <ol className="relative space-y-0">
            {timeline.map((t, i) => (
              <li key={t.label} className="relative flex gap-4 pb-6 last:pb-0">
                {i < timeline.length - 1 && <span className={cx('absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-0.5', t.done ? 'bg-p1-success' : 'bg-p1-border')} aria-hidden />}
                <span className={cx('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                  t.done ? 'border-p1-success bg-p1-success text-white' : t.failed ? 'border-p1-danger bg-p1-danger text-white' : 'border-p1-border-strong bg-p1-surface text-p1-text-3')} aria-hidden>
                  {t.done ? <Check size={15} strokeWidth={3} /> : t.failed ? <X size={15} strokeWidth={3} /> : <Clock size={15} />}
                </span>
                <div className="min-w-0 pt-1">
                  <div className={cx('text-[15px] font-medium', t.done ? 'text-p1-text' : 'text-p1-text-2')}>
                    {t.label}
                    <span className="sr-only">{t.done ? ' — completed' : t.failed ? ' — failed' : ' — pending'}</span>
                  </div>
                  <div className="mt-0.5 text-[13px] text-p1-text-3">{t.at}</div>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Submitted details">
            <FieldGrid cols={2}>
              <Field label="Name" value={state.profile.fullName} />
              <Field label="CEA registration number" value={state.profile.ceaNumber} mono />
              <Field label="Agency" value={state.profile.agency} />
              <Field label="Agency licence number" value={state.profile.agencyLicence} mono />
            </FieldGrid>
          </SectionCard>

          <SectionCard title="What happens next">
            <ul className="space-y-3 text-[14px] leading-5 text-p1-text-2">
              <li className="flex gap-3"><UserCheck size={18} className="mt-0.5 shrink-0 text-p1-accent-text" aria-hidden /><span><span className="font-medium text-p1-text">A person makes the decision.</span> The register confirms your registration exists; an officer confirms it is you.</span></li>
              <li className="flex gap-3"><CreditCard size={18} className="mt-0.5 shrink-0 text-p1-accent-text" aria-hidden /><span><span className="font-medium text-p1-text">Then you choose a plan.</span> Payment is only asked for after approval.</span></li>
              <li className="flex gap-3"><CalendarCheck size={18} className="mt-0.5 shrink-0 text-p1-accent-text" aria-hidden /><span><span className="font-medium text-p1-text">Verification stays current.</span> Your registration is re-checked daily. If it lapses, publishing pauses until it is renewed — you keep your account.</span></li>
            </ul>
          </SectionCard>

          <Callout tone="accent" icon={<ShieldCheck size={18} />} title={state.ceaValid ? `CEA registration valid until ${state.ceaValidUntil}` : 'CEA registration has lapsed'}>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button size="sm" variant="outline" leftIcon={<RefreshCw size={14} />} onClick={() => set({ ceaValid: !state.ceaValid })}>
                {state.ceaValid ? 'Simulate registration lapsing' : 'Restore valid registration'}
              </Button>
              <Pill tone="accent">Prototype</Pill>
            </div>
          </Callout>
        </div>
      </div>

      <PresenterNote>
        The system never approves or rejects automatically. The registry establishes that a registration exists and who holds it; it cannot establish that the person filling in the form is that individual, so a human decision stays in the loop. A scheduled job re-checks every approved agent against each new copy of the register; a lapsed registration withdraws publication rights but not account access.
      </PresenterNote>
    </>
  );
}
