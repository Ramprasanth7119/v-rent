"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { PageHead, SpecNote } from '../../../components/phase1/bits';
import { useToast } from '../../../components/phase1/Toast';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { AGENTS } from '../../../lib/phase1/agents';
import {
  ShieldCheck, KeyRound, Smartphone, Check, AlertTriangle, ArrowRight, Info,
} from 'lucide-react';

type Stage = 'credentials' | 'mfa';
const DEMO_CODE = '481902';

export default function LoginPage() {
  const router = useRouter();
  const { push } = useToast();
  const { state, skipToActive } = useDemo();

  const [identifier, setIdentifier] = useState('R052184C');
  const [password, setPassword] = useState('');
  const [stage, setStage] = useState<Stage>('credentials');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [remember, setRemember] = useState(true);

  /** The identifier may be an email address or a CEA registration number. */
  const looksLikeCea = /^R\d{6}[A-Z]$/i.test(identifier.trim());
  const matchedAgent = AGENTS.find(
    (a) =>
      a.ceaNumber.toLowerCase() === identifier.trim().toLowerCase() ||
      a.email.toLowerCase() === identifier.trim().toLowerCase()
  );

  const submitCredentials = () => {
    if (!identifier || password.length < 4) {
      // Deliberately identical whether the account exists or the password is wrong.
      setError('Invalid credentials. Check your email or CEA number and password.');
      return;
    }
    setError('');
    setStage('mfa');
  };

  const submitCode = () => {
    if (code !== DEMO_CODE) {
      const n = attempts + 1;
      setAttempts(n);
      setError(n >= 5 ? 'Too many attempts. Request a new code.' : `Incorrect code. ${5 - n} attempts remaining.`);
      return;
    }
    skipToActive();
    push({ tone: 'success', title: 'Signed in', body: 'Opaque session issued in an HttpOnly cookie.' });
    router.push('/phase1/dashboard');
  };

  return (
    <>
      <PageHead
        module="M1 · Authentication and Accounts"
        title="Sign in"
        blurb="Agents sign in with their email address or their CEA registration number, then confirm a code sent to the mobile number on their verified profile."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <Card className="vr-rise">
          {stage === 'credentials' ? (
            <div className="grid gap-4">
              <div>
                <Input
                  label="Email address or CEA registration number"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                  placeholder="R123456A or you@agency.com.sg"
                />
                {looksLikeCea && matchedAgent && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 vr-fade">
                    <ShieldCheck size={12} className="flex-shrink-0" />
                    Recognised registration — {matchedAgent.agency}
                  </div>
                )}
                {looksLikeCea && !matchedAgent && (
                  <div className="mt-2 text-[11px] text-neutral-500">
                    Format accepted. Whether an account exists is not revealed here.
                  </div>
                )}
              </div>

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && submitCredentials()}
                placeholder="••••••••••••"
              />

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 dark:border-red-900/60 dark:bg-red-950/25 vr-fade">
                  <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
                  <span className="text-[11px] text-red-700 dark:text-red-400">{error}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                  <button
                    type="button"
                    onClick={() => setRemember((v) => !v)}
                    aria-pressed={remember}
                    className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                      remember ? 'border-brand-gold bg-brand-gold text-brand-navy-dark' : 'border-border'
                    }`}
                  >
                    {remember && <Check size={10} strokeWidth={3} />}
                  </button>
                  Keep me signed in for 30 days
                </label>
                <button className="text-xs font-medium text-brand-gold hover:underline">Forgot password?</button>
              </div>

              <Button variant="gold" size="lg" onClick={submitCredentials} rightIcon={<ArrowRight size={15} />}>
                Continue
              </Button>

              <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
                No account yet?{' '}
                <Link href="/phase1/signup" className="font-semibold text-brand-gold hover:underline">
                  Register as an agent
                </Link>
              </p>
            </div>
          ) : (
            <div className="vr-rise">
              <button
                onClick={() => { setStage('credentials'); setError(''); setCode(''); }}
                className="mb-4 text-xs text-neutral-500 hover:text-brand-gold"
              >
                ← Use a different account
              </button>

              <div className="mb-4 flex items-center gap-2.5">
                <Smartphone size={16} className="text-brand-gold" />
                <div>
                  <div className="text-sm font-semibold text-foreground">Confirm it&apos;s you</div>
                  <div className="text-xs text-neutral-500">
                    Code sent to {matchedAgent?.mobile ?? state.profile.mobile}
                  </div>
                </div>
              </div>

              <input
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && submitCode()}
                placeholder="000000"
                inputMode="numeric"
                disabled={attempts >= 5}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-foreground placeholder-neutral-300 transition-all focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/10 disabled:opacity-50 dark:placeholder-neutral-700"
              />

              {error && <p className="mt-2 text-xs text-red-500 vr-fade">{error}</p>}

              <Button className="mt-4 w-full" variant="gold" size="lg" onClick={submitCode} disabled={code.length !== 6}>
                Sign in
              </Button>

              <p className="mt-3 rounded-md bg-neutral-100 px-2.5 py-1.5 text-center font-mono text-[11px] text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                Prototype code: {DEMO_CODE}
              </p>
            </div>
          )}
        </Card>

        {/* how the incumbents do it */}
        <div className="space-y-3 vr-stagger">
          <Card className="border-brand-gold/30 bg-brand-gold/5">
            <div className="mb-2 flex items-center gap-2">
              <Info size={14} className="text-brand-gold" />
              <span className="text-xs font-semibold text-foreground">How the incumbents do this</span>
            </div>
            <ul className="space-y-2.5 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              <li>
                <strong className="text-foreground">PropertyGuru AgentNet</strong> is sales-led. An agent must
                already be CEA-registered <em>and</em> a paying subscriber before an account exists; credentials
                are then issued to them, with a shared default password to change on first sign-in.
              </li>
              <li>
                Each paid account must belong to exactly <strong>one</strong> CEA-registered agent, and the
                account name must match the name on the CEA register.
              </li>
              <li>
                <strong className="text-foreground">99.co</strong> runs a self-serve agent sign-up page, with
                CEA registration required to list.
              </li>
            </ul>
          </Card>

          <Card>
            <div className="mb-2 flex items-center gap-2">
              <KeyRound size={14} className="text-brand-gold" />
              <span className="text-xs font-semibold text-foreground">What V-RENT does differently</span>
            </div>
            <ul className="space-y-2 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              <li>
                <strong className="text-foreground">Self-serve from the start.</strong> An agent can register,
                verify and be approved without talking to a salesperson. Payment comes after approval, not before
                the account exists.
              </li>
              <li>
                <strong className="text-foreground">No shared default password.</strong> The agent sets their own
                at registration, hashed with Argon2id and checked against a breached-password list.
              </li>
              <li>
                <strong className="text-foreground">Sign in by CEA number or email.</strong> Agents know their
                registration number, and it is already the unique key on the account.
              </li>
              <li>
                <strong className="text-foreground">One account per registration</strong> is enforced by a
                database constraint, matching the incumbent rule but without relying on manual checking.
              </li>
            </ul>
          </Card>

          <Card>
            <div className="mb-2 text-xs font-semibold text-foreground">Security on this screen</div>
            <ul className="space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
              <li>Identical error whether the account exists or the password is wrong</li>
              <li>Rate limited per address and per account, with lockout</li>
              <li>Second factor required for every administrative role</li>
              <li>Opaque session in an HttpOnly cookie, revocable server-side</li>
              <li>Failed and successful attempts both written to the audit log</li>
            </ul>
          </Card>
        </div>
      </div>

      <SpecNote>
        The account-enumeration protection is the reason the error message never says whether the identifier
        was found. It is also why the CEA-format hint above only confirms the <em>shape</em> of the number, not
        whether an account exists for it.
      </SpecNote>
    </>
  );
}
