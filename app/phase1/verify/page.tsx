"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Callout, PageHeader, PresenterNote, SectionCard, Stepper } from '../../../components/phase1/kit';
import { Pill, StatusBadge } from '../../../components/phase1/status';
import { JOURNEY_STEPS, journeyCompleted } from '../../../components/phase1/journey';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { Mail, Smartphone, ArrowRight, CheckCircle2 } from 'lucide-react';

/** The code the prototype accepts. Shown on screen so a presenter never fumbles it. */
const DEMO_CODE = '481902';

export default function VerifyPage() {
  const router = useRouter();
  const { state, set } = useDemo();
  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');

  const submitCode = () => {
    if (code === DEMO_CODE) {
      set({ mobileVerified: true });
      setError('');
    } else {
      const n = attempts + 1;
      setAttempts(n);
      setError(
        n >= 5
          ? 'Too many attempts. This code is now locked — request a new one.'
          : `Incorrect code. ${5 - n} attempt${5 - n === 1 ? '' : 's'} remaining.`
      );
    }
  };

  const both = state.emailVerified && state.mobileVerified;

  return (
    <>
      <PageHeader
        eyebrow="Step 2 of 8"
        title="Confirm your email and mobile"
        description="Both must be confirmed before you can add your professional details. This protects your account and lets us reach you about your listings."
      />
      <Stepper steps={JOURNEY_STEPS} current={1} completed={journeyCompleted(state)} />

      {both && (
        <Callout tone="success" title="Both contacts confirmed" className="mb-5" action={<Button variant="accent" size="sm" onClick={() => router.push('/phase1/profile')} rightIcon={<ArrowRight size={15} />}>Continue</Button>}>
          You can now add your professional details.
        </Callout>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Email address"
          icon={<Mail size={18} />}
          actions={<StatusBadge kind="check" value={state.emailVerified ? 'verified' : 'pending'} />}
        >
          <p className="text-[15px] leading-6 text-p1-text-2">
            We sent a confirmation link to <span className="font-medium text-p1-text">{state.profile.email}</span>. The link works once and expires in 24 hours.
          </p>
          {!state.emailVerified ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => set({ emailVerified: true })}>Simulate clicking the link</Button>
              <Pill tone="accent">Prototype</Pill>
              <button type="button" className="text-[14px] font-medium text-p1-accent-text underline-offset-4 hover:underline cursor-pointer">Resend email</button>
            </div>
          ) : (
            <p className="mt-4 flex items-center gap-2 text-[14px] text-p1-success"><CheckCircle2 size={17} aria-hidden /> Email confirmed.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Mobile number"
          icon={<Smartphone size={18} />}
          actions={<StatusBadge kind="check" value={state.mobileVerified ? 'verified' : 'pending'} />}
        >
          {!state.mobileVerified ? (
            <form onSubmit={(e) => { e.preventDefault(); submitCode(); }}>
              <p className="text-[15px] leading-6 text-p1-text-2">
                Enter the six-digit code sent to <span className="font-medium text-p1-text">{state.profile.mobile}</span>. It expires in five minutes.
              </p>
              <label htmlFor="verify-code" className="mt-4 mb-1.5 block text-[14px] font-medium text-p1-text">Six-digit code</label>
              <input
                id="verify-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={attempts >= 5}
                aria-invalid={!!error || undefined}
                aria-describedby={error ? 'verify-code-err' : undefined}
                className="h-16 w-full rounded-[10px] border border-p1-border-strong bg-p1-surface text-center font-mono text-[28px] tracking-[0.4em] text-p1-text placeholder:text-p1-border-strong disabled:opacity-50"
              />
              {error && <p id="verify-code-err" role="alert" className="mt-2 text-[14px] text-p1-danger">{error}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button type="submit" variant="accent" disabled={code.length !== 6 || attempts >= 5}>Verify code</Button>
                <Button variant="ghost" onClick={() => { setAttempts(0); setError(''); setCode(''); }}>Resend code</Button>
              </div>
              <Callout tone="neutral" title="Prototype code" className="mt-4">
                Enter <span className="font-mono font-semibold text-p1-text">{DEMO_CODE}</span>. Try a wrong code first to show the attempt limit.
              </Callout>
            </form>
          ) : (
            <p className="flex items-center gap-2 text-[14px] text-p1-success"><CheckCircle2 size={17} aria-hidden /> Mobile number confirmed.</p>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="accent" size="lg" disabled={!both} onClick={() => router.push('/phase1/profile')} rightIcon={<ArrowRight size={17} />}>
          Continue to professional details
        </Button>
      </div>

      <PresenterNote>
        One-time codes are sent synchronously rather than through the outbox — a delay of seconds is fine for an approval email but not here. Codes are stored hashed in Redis. Mobile numbers are stored normalised to E.164. Schedule dependency: since January 2023 any alphanumeric SMS sender ID not registered with the Singapore SMS Sender ID Registry is labelled “Likely-SCAM” on the handset; registration needs the company UEN and is not instant, so it must start in week one.
      </PresenterNote>
    </>
  );
}
