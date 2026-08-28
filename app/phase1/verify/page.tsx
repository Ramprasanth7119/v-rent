"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PageHead, SpecNote, StepRail } from '../../../components/phase1/bits';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { Check, Mail, Smartphone, AlertTriangle } from 'lucide-react';

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
      <PageHead
        module="M2 · Contact Verification"
        title="Verify email and mobile"
        blurb="Both must be confirmed before the profile step unlocks."
      />
      <StepRail
        current={1}
        steps={[
          { label: 'Account', done: true },
          { label: 'Verify', done: both },
          { label: 'Profile', done: state.profileSubmitted },
          { label: 'Approval', done: state.approval === 'approved' },
          { label: 'Plan', done: !!state.plan },
          { label: 'Listings', done: false },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Email */}
        <Card>
          <div className="mb-4 flex items-center gap-2.5">
            <Mail size={16} className="text-brand-gold" />
            <span className="text-sm font-semibold text-foreground">Email address</span>
            {state.emailVerified && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Check size={10} strokeWidth={3} /> Verified
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
            A single-use link expiring in 24 hours was sent to{' '}
            <span className="font-medium text-foreground">{state.profile.email}</span>.
          </p>
          {!state.emailVerified && (
            <Button className="mt-4" variant="outline" size="sm" onClick={() => set({ emailVerified: true })}>
              Simulate clicking the link
            </Button>
          )}
        </Card>

        {/* Mobile */}
        <Card>
          <div className="mb-4 flex items-center gap-2.5">
            <Smartphone size={16} className="text-brand-gold" />
            <span className="text-sm font-semibold text-foreground">Mobile number</span>
            {state.mobileVerified && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Check size={10} strokeWidth={3} /> Verified
              </span>
            )}
          </div>

          {!state.mobileVerified ? (
            <>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Six-digit code sent to{' '}
                <span className="font-medium text-foreground">{state.profile.mobile}</span>. Expires in
                five minutes.
              </p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && submitCode()}
                placeholder="000000"
                inputMode="numeric"
                disabled={attempts >= 5}
                className="mt-3 w-full rounded-lg border border-border bg-card px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-foreground placeholder-neutral-300 focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/10 disabled:opacity-50 dark:placeholder-neutral-700"
              />
              {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="gold" onClick={submitCode} disabled={code.length !== 6 || attempts >= 5}>
                  Verify
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAttempts(0); setError(''); setCode(''); }}>
                  Resend (60s cooldown)
                </Button>
              </div>
              <p className="mt-3 rounded-md bg-neutral-100 px-2.5 py-1.5 font-mono text-[11px] text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                Prototype code: {DEMO_CODE} — try a wrong one first to show the attempt limit
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Confirmed. The number is stored normalised to E.164 format.
            </p>
          )}
        </Card>
      </div>

      <Card className="mt-5 border-amber-300/50 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="text-xs font-semibold text-foreground">
              Sender ID registration is a schedule dependency
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              Since January 2023, any alphanumeric SMS sender ID sent to a Singapore number that is not
              registered with the SMS Sender ID Registry is labelled <strong>“Likely-SCAM”</strong> on
              the recipient&apos;s handset. Registration needs the company UEN and is not instant, so it
              has to start in week one — otherwise the very first step of this funnel fails.
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button variant="gold" size="lg" disabled={!both} onClick={() => router.push('/phase1/profile')}>
          Continue to profile
        </Button>
      </div>

      <SpecNote>
        One-time passwords are the single case sent synchronously rather than through the outbox — a
        delay of several seconds is fine for an approval email and unacceptable here. The code itself is
        stored hashed in Redis, never in plaintext.
      </SpecNote>
    </>
  );
}
