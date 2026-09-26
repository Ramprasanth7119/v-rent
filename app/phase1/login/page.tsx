"use client";

/**
 * Sign in.
 *
 * A real credential check against a stored scrypt hash. The failure message is
 * the same whether the address is unknown or the password is wrong, so the form
 * cannot be used to find out who has an account.
 *
 * Email first, then the password. The first step never asks the server
 * anything: it would have to answer "no such account" to be worth asking, and
 * that is exactly what the route refuses to say. It exists so each screen asks
 * one thing, and so a password manager sees the username-then-password shape
 * it already knows — the second step carries the address in a hidden
 * `username` field for that reason.
 */

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import { AuthShell } from '../../../components/phase1/auth/AuthShell';
import {
  AuthFeedback, AuthHeader, AuthStep, AuthSubmit, EMAIL_RE, EmailChip, authLink, type SubmitStatus,
} from '../../../components/phase1/auth/parts';
import { PasswordInput, TextInput } from '../../../components/phase1/kit';
import { useToast } from '../../../components/phase1/Toast';
import { preferredName } from '../../../lib/phase1/DemoContext';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <SignIn />
    </Suspense>
  );
}

/* Refocused after a refusal, so the next attempt starts where the typing goes. */
const focusPassword = () => document.getElementById('login-password')?.focus();

/** Only these are followed after signing in, so the parameter cannot be used to send somebody elsewhere. */
const safeNext = (value: string | null) =>
  (value && value.startsWith('/phase1/') && !value.startsWith('//') ? value : null);

function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const expired = params.get('expired') === '1';
  const { push } = useToast();

  const [step, setStep] = useState<'email' | 'password'>('email');
  const [dir, setDir] = useState<'fwd' | 'back' | 'none'>('none');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [error, setError] = useState('');
  /* Bumped on every refusal so the banner is said again, not left unchanged. */
  const [attempt, setAttempt] = useState(0);

  const emailOk = EMAIL_RE.test(email.trim());
  const emailError = emailTouched && !emailOk
    ? (email.trim() ? 'Enter an email address like name@agency.com.sg.' : 'Enter the email address you sign in with.')
    : undefined;

  const toPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    if (!emailOk) return;
    setEmail(email.trim());
    setError('');
    setDir('fwd');
    setStep('password');
  };

  const toEmail = () => {
    setPassword('');
    setError('');
    setDir('back');
    setStep('email');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'idle') return;
    if (!password) {
      setError('Enter your password.');
      setAttempt((n) => n + 1);
      focusPassword();
      return;
    }
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; code?: string; user?: { role: string; fullName?: string } };
      if (!res.ok || !body.ok) {
        setError(body.error ?? 'Could not sign you in. Try again.');
        setAttempt((n) => n + 1);
        setStatus('idle');
        /* A wrong password is retyped, not edited. */
        if (body.code === 'bad_credentials') {
          setPassword('');
          focusPassword();
        }
        return;
      }
      setStatus('success');
      /* Back to whatever they were trying to open, where that was a page in
         this workspace; the role decides otherwise. */
      push({
        tone: 'success',
        title: body.user?.role === 'admin' ? 'Signed in to the operations console' : 'Signed in',
        body: body.user?.fullName ? `Welcome back, ${preferredName(body.user.fullName)}.` : undefined,
      });
      router.replace(next ?? (body.user?.role === 'admin' ? '/phase1/admin' : '/phase1/dashboard'));
      router.refresh();
    } catch {
      setError('Could not reach V-RENT. Check your connection and try again.');
      setAttempt((n) => n + 1);
      setStatus('idle');
    }
  };

  return (
    <AuthShell
      scene="signin"
      aside={
        <span>
          New to V-RENT?{' '}
          <Link href="/phase1/signup" className={authLink}>Create an account</Link>
        </span>
      }
    >
      <div className="p1-auth-stagger grid gap-7">
        <AuthHeader
          title={step === 'email' ? 'Welcome back' : 'Enter your password'}
          subtitle={step === 'email' ? 'Sign in to your agent workspace.' : undefined}
        />

        {step === 'email' ? (
          <AuthStep key="email" dir={dir}>
            <form onSubmit={toPassword} className="grid gap-5" noValidate>
              {expired && (
                <AuthFeedback tone="warning">
                  Your session has ended. Sign in again and we’ll take you back to where you were.
                </AuthFeedback>
              )}
              <TextInput
                label="Email address"
                type="email"
                name="username"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                required
                placeholder="name@agency.com.sg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => { if (email.trim()) setEmailTouched(true); }}
                error={emailError}
                containerClassName="p1-auth-field"
                rightSlot={emailOk ? (
                  <span className="p1-auth-pop flex h-5 w-5 items-center justify-center rounded-full bg-p1-success-soft text-p1-success" aria-hidden>
                    <Check size={12} strokeWidth={3} />
                  </span>
                ) : undefined}
              />
              <AuthSubmit>Continue</AuthSubmit>
            </form>
          </AuthStep>
        ) : (
          <AuthStep key="password" dir={dir}>
            <form onSubmit={submit} className="grid gap-5" noValidate>
              {/* For password managers: the account this password belongs to. */}
              <input type="email" name="username" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden className="sr-only" />
              <EmailChip email={email} onChange={toEmail} />

              {error && (
                <AuthFeedback key={attempt} tone="danger">
                  {error}
                </AuthFeedback>
              )}

              <div>
                <PasswordInput
                  id="login-password"
                  label="Password"
                  name="password"
                  required
                  autoFocus
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  containerClassName="p1-auth-field"
                />
                <div className="mt-2.5 text-right">
                  <Link
                    href={`/phase1/forgot?email=${encodeURIComponent(email)}`}
                    className="rounded text-[13.5px] font-medium text-p1-text-2 underline-offset-4 hover:text-p1-text hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <AuthSubmit status={status} busyLabel="Signing in…" doneLabel="Signed in">Sign in</AuthSubmit>
            </form>
          </AuthStep>
        )}
      </div>
    </AuthShell>
  );
}
