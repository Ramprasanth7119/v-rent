"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { PageHead, SpecNote, StepRail } from '../../../components/phase1/bits';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { Check, ShieldAlert } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { state, setProfile } = useDemo();
  const [password, setPassword] = useState('');

  const rules = [
    { label: 'At least 12 characters', ok: password.length >= 12 },
    { label: 'Not on the breached-password list', ok: password.length >= 12 && password.toLowerCase() !== 'password1234' },
  ];
  const ready = rules.every((r) => r.ok) && state.profile.email.includes('@');

  return (
    <>
      <PageHead module="M1 · Authentication and Accounts" title="Create an agent account" />
      <StepRail
        current={0}
        steps={[
          { label: 'Account', done: false },
          { label: 'Verify', done: state.emailVerified && state.mobileVerified },
          { label: 'Profile', done: state.profileSubmitted },
          { label: 'Approval', done: state.approval === 'approved' },
          { label: 'Plan', done: !!state.plan },
          { label: 'Listings', done: false },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <div className="grid gap-4">
            <Input
              label="Full name"
              value={state.profile.fullName}
              onChange={(e) => setProfile({ fullName: e.target.value })}
            />
            <Input
              label="Email address"
              type="email"
              value={state.profile.email}
              onChange={(e) => setProfile({ email: e.target.value })}
            />
            <Input
              label="Mobile number"
              value={state.profile.mobile}
              onChange={(e) => setProfile({ mobile: e.target.value })}
            />
            <div>
              <Input
                label="Password"
                type="password"
                placeholder="Minimum 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <ul className="mt-2.5 space-y-1.5">
                {rules.map((r) => (
                  <li key={r.label} className="flex items-center gap-2 text-xs">
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full ${
                        r.ok
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'
                      }`}
                    >
                      <Check size={10} strokeWidth={3} />
                    </span>
                    <span className={r.ok ? 'text-foreground' : 'text-neutral-500 dark:text-neutral-400'}>
                      {r.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              variant="gold"
              size="lg"
              disabled={!ready}
              onClick={() => router.push('/phase1/verify')}
            >
              Create account
            </Button>
            <p className="text-center text-[11px] text-neutral-500 dark:text-neutral-400">
              By continuing you accept the terms and the privacy notice. Marketing consent is
              requested separately and can be withdrawn at any time.
            </p>
          </div>
        </Card>

        <div className="space-y-3">
          <Card className="border-brand-gold/30 bg-brand-gold/5">
            <div className="flex items-start gap-2.5">
              <ShieldAlert size={16} className="mt-0.5 flex-shrink-0 text-brand-gold" />
              <div>
                <div className="text-xs font-semibold text-foreground">Session strategy</div>
                <p className="mt-1 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Sign-in issues an opaque session identifier in an HttpOnly cookie, with state held in
                  Redis. This is what lets an administrator suspend an agent and have it take effect on
                  the very next request, rather than whenever a token happens to expire.
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="text-xs font-semibold text-foreground">Also in this module</div>
            <ul className="mt-2 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
              <li>Argon2id password hashing</li>
              <li>Session listing and revocation</li>
              <li>Password reset by single-use token</li>
              <li>Two-factor authentication, mandatory for every administrator</li>
              <li>Rate limiting and lockout on repeated failures</li>
            </ul>
          </Card>
        </div>
      </div>

      <SpecNote>
        Sign-in failures return an identical response whether the address is unknown or the password is
        wrong. Distinguishing between the two would turn this screen into an account enumeration tool.
      </SpecNote>
    </>
  );
}
