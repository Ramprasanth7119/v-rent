"use client";

import { useRouter } from 'next/navigation';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PageHead, SpecNote, StepRail, Field } from '../../../components/phase1/bits';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { Check, Clock, X, ShieldCheck, RefreshCw } from 'lucide-react';

export default function StatusPage() {
  const router = useRouter();
  const { state, set } = useDemo();
  const a = state.approval;

  const timeline = [
    { label: 'Registered', done: true, at: '28 Aug 2026, 09:02' },
    { label: 'Email and mobile verified', done: state.emailVerified && state.mobileVerified, at: '28 Aug 2026, 09:07' },
    { label: 'Profile submitted', done: state.profileSubmitted, at: '28 Aug 2026, 09:14' },
    {
      label: 'CEA registry matched',
      done: state.profileSubmitted,
      at: 'Strong match against the register copy of 28 Aug 2026, 06:00',
    },
    {
      label: a === 'approved' ? 'Approved' : a === 'rejected' ? 'Rejected' : 'Awaiting officer decision',
      done: a === 'approved',
      at: a === 'approved' ? 'Approved by ops.lena' : 'Typically within one business day',
    },
  ];

  return (
    <>
      <PageHead
        module="M8 · Onboarding and Approval"
        title="Application status"
        blurb="One status the agent can see at every point, so nobody has to email support to ask what is happening."
      />
      <StepRail
        current={3}
        steps={[
          { label: 'Account', done: true },
          { label: 'Verify', done: true },
          { label: 'Profile', done: state.profileSubmitted },
          { label: 'Approval', done: a === 'approved' },
          { label: 'Plan', done: !!state.plan },
          { label: 'Listings', done: false },
        ]}
      />

      {/* Status banner */}
      <Card
        className={
          a === 'approved'
            ? 'mb-5 border-emerald-300/60 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/20'
            : a === 'suspended' || a === 'rejected'
            ? 'mb-5 border-red-300/60 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/20'
            : 'mb-5 border-amber-300/60 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20'
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                a === 'approved'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400'
                  : a === 'suspended' || a === 'rejected'
                  ? 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-400'
              }`}
            >
              {a === 'approved' ? <Check size={17} strokeWidth={3} /> : a === 'suspended' || a === 'rejected' ? <X size={17} strokeWidth={3} /> : <Clock size={17} />}
            </span>
            <div>
              <div className="text-sm font-semibold text-foreground">
                {a === 'approved'
                  ? 'Approved — you may now subscribe'
                  : a === 'under_review'
                  ? 'Under review'
                  : a === 'suspended'
                  ? 'Account suspended'
                  : a === 'rejected'
                  ? 'Application rejected'
                  : 'Not yet submitted'}
              </div>
              <div className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                {a === 'approved'
                  ? `CEA registration valid until ${state.ceaValidUntil}, re-checked daily`
                  : a === 'under_review'
                  ? 'A verification officer is reviewing your CEA details'
                  : a === 'suspended'
                  ? 'Publication rights are withdrawn. Account access is retained'
                  : 'Complete your profile to begin verification'}
              </div>
            </div>
          </div>

          {a === 'under_review' && (
            <Button variant="gold" onClick={() => set({ approval: 'approved' })}>
              Simulate officer approval
            </Button>
          )}
          {a === 'approved' && (
            <Button variant="gold" onClick={() => router.push('/phase1/plans')}>
              Choose a plan
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-4 text-sm font-semibold text-foreground">Progress</div>
          <ol className="space-y-4">
            {timeline.map((t) => (
              <li key={t.label} className="flex gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                    t.done
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'
                  }`}
                >
                  {t.done ? <Check size={11} strokeWidth={3} /> : <Clock size={11} />}
                </span>
                <div className="min-w-0">
                  <div className={`text-sm ${t.done ? 'text-foreground font-medium' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    {t.label}
                  </div>
                  <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">{t.at}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="mb-4 text-sm font-semibold text-foreground">Submitted details</div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Name" value={state.profile.fullName} />
              <Field label="CEA number" value={<span className="font-mono">{state.profile.ceaNumber}</span>} />
              <Field label="Agency" value={state.profile.agency} />
              <Field label="Agency licence" value={<span className="font-mono">{state.profile.agencyLicence}</span>} />
            </div>
          </Card>

          <Card className="border-brand-gold/30 bg-brand-gold/5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={16} className="mt-0.5 flex-shrink-0 text-brand-gold" />
              <div>
                <div className="text-xs font-semibold text-foreground">Verification does not stop at signup</div>
                <p className="mt-1 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                  A scheduled job re-checks every approved agent against each new copy of the register.
                  If a registration lapses, the agent keeps account access but loses the ability to
                  publish. Use the control below to demonstrate this.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  leftIcon={<RefreshCw size={12} />}
                  onClick={() => set({ ceaValid: !state.ceaValid })}
                >
                  {state.ceaValid ? 'Simulate registration lapsing' : 'Restore valid registration'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <SpecNote>
        The system never approves and never rejects automatically. The registry establishes that a
        registration exists and who holds it — it cannot establish that the person filling in the form is
        that individual, which is why a human decision stays in the loop.
      </SpecNote>
    </>
  );
}
