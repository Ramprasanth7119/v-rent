"use client";

/**
 * Sign in.
 *
 * A real credential check against a stored scrypt hash. The failure message is
 * the same whether the address is unknown or the password is wrong, so the form
 * cannot be used to find out who has an account.
 */

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '../../../components/phase1/auth/AuthLayout';
import { Button, Callout, PasswordInput, TextInput } from '../../../components/phase1/kit';
import { ArrowRight } from 'lucide-react';
import { useToast } from '../../../components/phase1/Toast';
import { preferredName } from '../../../lib/phase1/DemoContext';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <SignIn />
    </Suspense>
  );
}

/** Only these are followed after signing in, so the parameter cannot be used to send somebody elsewhere. */
const safeNext = (value: string | null) =>
  (value && value.startsWith('/phase1/') && !value.startsWith('//') ? value : null);

function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const expired = params.get('expired') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; user?: { role: string; fullName?: string } };
      if (!res.ok || !body.ok) {
        setError(body.error ?? 'Could not sign you in. Try again.');
        return;
      }
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
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      pitch={false}
      footer={
        <span>
          New to V-RENT?{' '}
          <Link href="/phase1/signup" className="font-semibold text-p1-primary underline-offset-4 hover:underline">
            Create an agent account
          </Link>
        </span>
      }
    >
      <form onSubmit={submit} className="grid gap-5" noValidate>
        {expired && !error && (
          <Callout tone="warning" compact>
            Your session has ended. Sign in again and you will be taken back to where you were.
          </Callout>
        )}
        {error && <Callout tone="danger" compact>{error}</Callout>}

        <TextInput
          label="Email address"
          type="email"
          required
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div>
          <PasswordInput
            label="Password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2 text-right">
            <Link
              href="/phase1/forgot"
              className="text-[13px] text-p1-text-2 underline-offset-4 hover:text-p1-text hover:underline"
            >
              Forgotten your password?
            </Link>
          </div>
        </div>

        <Button type="submit" variant="primary" size="lg" block loading={busy} rightIcon={<ArrowRight size={16} />}>
          Sign in
        </Button>
      </form>

    </AuthLayout>
  );
}
