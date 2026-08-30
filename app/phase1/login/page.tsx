"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Callout, Card, Checkbox, PageHeader, PresenterNote, SectionCard, TextInput } from '../../../components/phase1/kit';
import { useToast } from '../../../components/phase1/Toast';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { AGENTS } from '../../../lib/phase1/agents';
import { ShieldCheck, Smartphone, ArrowRight, ArrowLeft, Lock, KeyRound, IdCard } from 'lucide-react';

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
    push({ tone: 'success', title: 'Signed in', body: 'Welcome back. Your workspace is ready.' });
    router.push('/phase1/dashboard');
  };

  return (
    <>
      <PageHeader
        eyebrow="Agent sign in"
        title="Welcome back"
        description="Sign in with your email address or CEA registration number. We will then send a code to your verified mobile number."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard
          title={stage === 'credentials' ? 'Sign in' : 'Confirm it’s you'}
          description={stage === 'credentials' ? undefined : `A six-digit code was sent to ${matchedAgent?.mobile ?? state.profile.mobile}.`}
          icon={stage === 'credentials' ? <KeyRound size={18} /> : <Smartphone size={18} />}
        >
          {stage === 'credentials' ? (
            <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); submitCredentials(); }}>
              <div>
                <TextInput
                  label="Email address or CEA registration number"
                  value={identifier}
                  autoComplete="username"
                  onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                  placeholder="R123456A or you@agency.com.sg"
                  leftIcon={<IdCard size={17} />}
                />
                {looksLikeCea && matchedAgent && (
                  <p className="vr-fade mt-2 flex items-center gap-2 text-[14px] text-p1-success"><ShieldCheck size={15} aria-hidden /> Recognised registration — {matchedAgent.agency}</p>
                )}
                {looksLikeCea && !matchedAgent && (
                  <p className="mt-2 text-[13px] text-p1-text-3">Format accepted. Whether an account exists is not revealed here.</p>
                )}
              </div>

              <TextInput
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Your password"
                leftIcon={<Lock size={17} />}
              />

              {error && <Callout tone="danger">{error}</Callout>}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} label="Keep me signed in for 30 days" />
                <button type="button" className="text-[14px] font-medium text-p1-accent-text underline-offset-4 hover:underline cursor-pointer">Forgot password?</button>
              </div>

              <Button type="submit" variant="accent" size="lg" block rightIcon={<ArrowRight size={17} />}>Continue</Button>

              <p className="text-center text-[14px] text-p1-text-2">
                No account yet? <Link href="/phase1/signup" className="font-semibold text-p1-accent-text underline-offset-4 hover:underline">Register as an agent</Link>
              </p>
            </form>
          ) : (
            <form className="vr-rise grid gap-5" onSubmit={(e) => { e.preventDefault(); submitCode(); }}>
              <div>
                <label htmlFor="login-code" className="mb-1.5 block text-[14px] font-medium text-p1-text">Six-digit code</label>
                <input
                  id="login-code"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  disabled={attempts >= 5}
                  aria-invalid={!!error || undefined}
                  aria-describedby={error ? 'login-code-err' : undefined}
                  className="h-16 w-full rounded-[10px] border border-p1-border-strong bg-p1-surface text-center font-mono text-[28px] tracking-[0.4em] text-p1-text placeholder:text-p1-border-strong disabled:opacity-50"
                />
                {error && <p id="login-code-err" role="alert" className="mt-2 text-[14px] text-p1-danger">{error}</p>}
              </div>

              <Button type="submit" variant="accent" size="lg" block disabled={code.length !== 6 || attempts >= 5}>Sign in</Button>

              <Callout tone="neutral" title="Prototype code">Enter <span className="font-mono font-semibold text-p1-text">{DEMO_CODE}</span>. Try a wrong code first to show the attempt limit.</Callout>

              <button type="button" onClick={() => { setStage('credentials'); setError(''); setCode(''); }} className="inline-flex items-center gap-1.5 self-start text-[14px] text-p1-text-2 hover:text-p1-text cursor-pointer">
                <ArrowLeft size={15} aria-hidden /> Use a different account
              </button>
            </form>
          )}
        </SectionCard>

        <div className="space-y-4">
          <Card>
            <div className="text-[15px] font-semibold text-p1-text">Keeping your account safe</div>
            <ul className="mt-3 space-y-2.5 text-[14px] leading-5 text-p1-text-2">
              <li className="flex gap-2.5"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-p1-success" aria-hidden /> A code is sent to your verified mobile number on every new device.</li>
              <li className="flex gap-2.5"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-p1-success" aria-hidden /> Repeated failed attempts lock the account temporarily.</li>
              <li className="flex gap-2.5"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-p1-success" aria-hidden /> You can review and sign out of other sessions from your profile.</li>
            </ul>
          </Card>
          <Card className="bg-p1-subtle/60">
            <div className="text-[14px] font-semibold text-p1-text">One account per CEA registration</div>
            <p className="mt-1 text-[14px] leading-5 text-p1-text-2">Your registration number is the key to your account, so you can sign in with it directly.</p>
          </Card>
        </div>
      </div>

      <PresenterNote title="Presenter note — how this compares with the incumbents">
        <p><strong>PropertyGuru AgentNet</strong> is sales-led: an agent must be CEA-registered <em>and</em> a paying subscriber before an account exists, credentials are issued with a shared default password, each account belongs to exactly one CEA agent, and the account name must match the register. <strong>99.co</strong> is self-serve with CEA registration required to list.</p>
        <p className="mt-2"><strong>V-RENT:</strong> self-serve from the start, payment after approval rather than before the account exists; no shared default password (Argon2id, breached-password check); sign in by CEA number or email; one account per registration enforced by a database constraint. Error text is identical whether the account exists or the password is wrong, so the screen cannot be used to enumerate accounts — which is also why the CEA-format hint only confirms the shape of the number. Attempts are rate-limited per address and per account; every attempt is written to the audit log.</p>
      </PresenterNote>
    </>
  );
}
