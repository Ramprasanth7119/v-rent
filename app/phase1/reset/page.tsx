"use client";

/**
 * Setting a new password from a reset link.
 *
 * The token in the URL is the proof, so this works on a device that has never
 * signed in — which is the situation someone who has forgotten their password
 * is usually in. The password rules are the same ones sign-up applies, checked
 * again on the server.
 *
 * A link that is used, expired or unknown cannot be fixed on this screen, so
 * those refusals replace the form with the one thing that helps: a new link.
 */

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, KeyRound, Link2Off } from 'lucide-react';
import { AuthShell } from '../../../components/phase1/auth/AuthShell';
import { AuthFeedback, AuthHeader, AuthStep, AuthSubmit, type SubmitStatus } from '../../../components/phase1/auth/parts';
import { PasswordInput } from '../../../components/phase1/kit';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPassword />
    </Suspense>
  );
}

const backToSignIn = (
  <Link href="/phase1/login" className="inline-flex items-center gap-1.5 rounded font-medium text-p1-text-2 hover:text-p1-text">
    <ArrowLeft size={15} aria-hidden /> Back to sign in
  </Link>
);

/** The link itself is spent or wrong: only a new one helps. */
const DEAD_LINK = new Set(['unknown', 'expired', 'address_changed']);

function DeadLink({ title, subtitle }: { title: string; subtitle: string }) {
  const router = useRouter();
  return (
    <AuthShell scene="recover" aside={backToSignIn}>
      <AuthStep dir="none" className="p1-auth-stagger grid gap-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-p1-warning-soft text-p1-warning" aria-hidden>
          <Link2Off size={23} />
        </span>
        <AuthHeader title={title} subtitle={subtitle} />
        <AuthSubmit type="button" onClick={() => router.push('/phase1/forgot')}>Ask for a new link</AuthSubmit>
      </AuthStep>
    </AuthShell>
  );
}

function ResetPassword() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dead, setDead] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const tooShort = password.length > 0 && password.length < 12;
  const mismatch = confirm.length > 0 && confirm !== password;
  const matched = confirm.length > 0 && confirm === password && password.length >= 12;
  const ready = password.length >= 12 && confirm === password && Boolean(token);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || status !== 'idle') return;
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const body = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) {
        setStatus('idle');
        if (body.code && DEAD_LINK.has(body.code)) {
          setDead(body.error ?? 'That link can no longer be used. Ask for a new one.');
          return;
        }
        setError(body.error ?? 'That did not work. Try again.');
        setAttempt((n) => n + 1);
        return;
      }
      setStatus('success');
      setDone(true);
    } catch {
      setStatus('idle');
      setError('Could not reach V-RENT. Check your connection and try again.');
      setAttempt((n) => n + 1);
    }
  };

  if (!token) {
    return <DeadLink title="That link is incomplete" subtitle="A reset link carries a token. Ask for a new one and open it straight from the message." />;
  }

  if (dead) {
    return <DeadLink title="This link can’t be used" subtitle={dead} />;
  }

  if (done) {
    return (
      <AuthShell scene="recover">
        <AuthStep dir="fwd" className="grid gap-6">
          <span className="p1-auth-pop flex h-12 w-12 items-center justify-center rounded-2xl bg-p1-success-soft text-p1-success" aria-hidden>
            <CheckCircle2 size={24} />
          </span>
          <AuthHeader
            title="Your password is set"
            subtitle="The link you used is now spent, and any failed attempts that had locked the account have been cleared."
          />
          <AuthSubmit type="button" onClick={() => router.push('/phase1/login')}>Sign in</AuthSubmit>
        </AuthStep>
      </AuthShell>
    );
  }

  return (
    <AuthShell scene="recover" aside={backToSignIn}>
      <div className="p1-auth-stagger grid gap-7">
        <AuthHeader
          title="Choose a new password"
          subtitle="At least twelve characters. A short phrase you can remember beats a short string you can’t."
        />
        <form className="grid gap-5" onSubmit={submit} noValidate>
          {error && <AuthFeedback key={attempt} tone="danger">{error}</AuthFeedback>}
          <PasswordInput
            label="New password"
            required
            autoFocus
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<KeyRound size={17} />}
            error={tooShort ? 'At least twelve characters.' : undefined}
            hint={!tooShort ? 'Twelve characters or more.' : undefined}
            containerClassName="p1-auth-field"
          />
          <PasswordInput
            label="Repeat it"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch ? 'These don’t match.' : undefined}
            hint={matched ? <span className="text-p1-success">Both match.</span> : undefined}
            containerClassName="p1-auth-field"
          />
          <AuthSubmit status={status} busyLabel="Saving…" doneLabel="Password set" disabled={!ready}>
            Set the password
          </AuthSubmit>
        </form>
      </div>
    </AuthShell>
  );
}
