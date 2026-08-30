"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, PageHeader, PresenterNote, SectionCard, Stepper, TextInput, Checkbox } from '../../../components/phase1/kit';
import { JOURNEY_STEPS, journeyCompleted } from '../../../components/phase1/journey';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { Check, Circle, IdCard, Building2, Smartphone, Clock, ShieldCheck } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { state, setProfile } = useDemo();
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const rules = [
    { label: 'At least 12 characters', ok: password.length >= 12 },
    { label: 'Not a commonly used or breached password', ok: password.length >= 12 && password.toLowerCase() !== 'password1234' },
  ];
  const emailOk = state.profile.email.includes('@');
  const ready = rules.every((r) => r.ok) && emailOk && agreed && state.profile.fullName.trim().length > 1;

  return (
    <>
      <PageHeader
        eyebrow="Step 1 of 8"
        title="Create your agent account"
        description="Takes about five minutes. You will need your CEA registration number and agency details for the next steps."
      />
      <Stepper steps={JOURNEY_STEPS} current={0} completed={journeyCompleted(state)} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard title="Your details" description="We use these to contact you and to verify your identity.">
          <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); if (ready) router.push('/phase1/verify'); }}>
            <TextInput
              label="Full name"
              required
              autoComplete="name"
              value={state.profile.fullName}
              onChange={(e) => setProfile({ fullName: e.target.value })}
              hint="As it appears on the CEA register."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextInput
                label="Email address"
                type="email"
                required
                autoComplete="email"
                value={state.profile.email}
                onChange={(e) => setProfile({ email: e.target.value })}
                error={state.profile.email && !emailOk ? 'Enter a valid email address.' : undefined}
                hint="We will send a confirmation link here."
              />
              <TextInput
                label="Mobile number"
                required
                inputMode="tel"
                autoComplete="tel"
                value={state.profile.mobile}
                onChange={(e) => setProfile({ mobile: e.target.value })}
                hint="Singapore number. Used for sign-in codes."
              />
            </div>
            <div>
              <TextInput
                label="Password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Minimum 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <ul className="mt-3 space-y-2" aria-label="Password requirements">
                {rules.map((r) => (
                  <li key={r.label} className="flex items-center gap-2.5 text-[14px]">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${r.ok ? 'bg-p1-success text-white' : 'bg-p1-subtle text-p1-text-3'}`} aria-hidden>
                      {r.ok ? <Check size={12} strokeWidth={3} /> : <Circle size={8} />}
                    </span>
                    <span className={r.ok ? 'text-p1-text' : 'text-p1-text-2'}>{r.label}{r.ok && <span className="sr-only"> — met</span>}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-p1-border pt-4">
              <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} label={<>I accept the <Link href="#" className="font-medium text-p1-accent-text underline underline-offset-4">terms of use</Link> and the <Link href="#" className="font-medium text-p1-accent-text underline underline-offset-4">privacy notice</Link>.</>} />
              <Checkbox checked={marketing} onChange={(e) => setMarketing(e.target.checked)} label="Send me product updates by email." hint="Optional. You can withdraw this at any time." />
            </div>

            <Button type="submit" variant="accent" size="lg" block disabled={!ready}>Create account</Button>
            <p className="text-center text-[14px] text-p1-text-2">
              Already have an account? <Link href="/phase1/login" className="font-semibold text-p1-accent-text underline-offset-4 hover:underline">Sign in</Link>
            </p>
          </form>
        </SectionCard>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 text-[15px] font-semibold text-p1-text"><Clock size={17} className="text-p1-accent-text" aria-hidden /> Takes about 5 minutes</div>
            <p className="mt-3 text-[14px] font-medium text-p1-text">What you&apos;ll need</p>
            <ul className="mt-2 space-y-2.5 text-[14px] text-p1-text-2">
              <li className="flex items-start gap-2.5"><IdCard size={17} className="mt-0.5 shrink-0 text-p1-text-3" aria-hidden /> Your CEA registration number (e.g. R123456A)</li>
              <li className="flex items-start gap-2.5"><Building2 size={17} className="mt-0.5 shrink-0 text-p1-text-3" aria-hidden /> Your agency and its licence number</li>
              <li className="flex items-start gap-2.5"><Smartphone size={17} className="mt-0.5 shrink-0 text-p1-text-3" aria-hidden /> A mobile phone to receive a code</li>
            </ul>
          </Card>
          <Card className="bg-p1-accent-soft/60 border-p1-accent/40">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-p1-accent-text" aria-hidden />
              <div>
                <div className="text-[14px] font-semibold text-p1-text">Your account is yours</div>
                <p className="mt-1 text-[14px] leading-5 text-p1-text-2">You choose your own password from the start — no shared default password, and no salesperson needed to open an account.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <PresenterNote>
        Sign-in issues an opaque session identifier in an HttpOnly cookie with state held in Redis, so suspending an agent takes effect on their next request. Passwords are hashed with Argon2id and checked against a breached-password list. Sign-in failures return identical responses whether the address is unknown or the password is wrong. Administrators must use two-factor authentication.
      </PresenterNote>
    </>
  );
}
