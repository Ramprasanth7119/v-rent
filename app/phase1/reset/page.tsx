"use client";

/**
 * Setting a new password from a reset link.
 *
 * The token in the URL is the proof, so this works on a device that has never
 * signed in — which is the situation someone who has forgotten their password
 * is usually in. The password rules are the same ones sign-up applies, checked
 * again on the server.
 */

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../../../components/phase1/auth/AuthLayout';
import { Button, PasswordInput } from '../../../components/phase1/kit';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPassword />
    </Suspense>
  );
}

function ResetPassword() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < 12;
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = password.length >= 12 && confirm === password && Boolean(token);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'That did not work.');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout
        title="That link is incomplete"
        subtitle="A reset link carries a token. Ask for a new one and open it straight from the message."
        footer={<Link href="/phase1/login" className="text-[14px] font-medium text-p1-text-2 hover:text-p1-text">Back to sign in</Link>}
      >
        <Button block size="lg" onClick={() => router.push('/phase1/forgot')} rightIcon={<ArrowRight size={16} />}>
          Ask for a new link
        </Button>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout
        title="Your password is set"
        subtitle="Any attempts that had locked the account have been cleared as well."
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-p1-success-border bg-p1-success-soft/60 px-4 py-3.5">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-p1-success" aria-hidden />
            <p className="text-[14px] leading-6 text-p1-text">
              The link you used is now spent. Sign in with the new password.
            </p>
          </div>
          <Button block size="lg" onClick={() => router.push('/phase1/login')} rightIcon={<ArrowRight size={16} />}>
            Sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="At least twelve characters. A short phrase you can remember beats a short string you cannot."
      footer={<Link href="/phase1/login" className="text-[14px] font-medium text-p1-text-2 hover:text-p1-text">Back to sign in</Link>}
    >
      <form className="space-y-5" onSubmit={submit}>
        <PasswordInput
          label="New password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<KeyRound size={17} />}
          error={tooShort ? 'At least twelve characters.' : undefined}
          hint={!tooShort ? 'Twelve characters or more.' : undefined}
        />
        <PasswordInput
          label="Repeat it"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? 'These do not match.' : undefined}
        />

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-p1-danger-border bg-p1-danger-soft px-3.5 py-2.5 text-[13.5px] text-p1-text">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-p1-danger" aria-hidden />
            {error}
          </div>
        )}

        <Button type="submit" size="lg" block loading={busy} disabled={!ready}>
          Set the password
        </Button>
      </form>
    </AuthLayout>
  );
}
