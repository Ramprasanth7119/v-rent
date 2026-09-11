"use client";

/**
 * Sign in.
 *
 * A real credential check against a stored scrypt hash. The failure message is
 * the same whether the address is unknown or the password is wrong, so the form
 * cannot be used to find out who has an account.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '../../../components/phase1/auth/AuthLayout';
import { Button, TextInput, Callout } from '../../../components/phase1/kit';
import { ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
      const body = (await res.json()) as { ok?: boolean; error?: string; user?: { role: string } };
      if (!res.ok || !body.ok) {
        setError(body.error ?? 'Could not sign you in. Try again.');
        return;
      }
      router.replace(body.user?.role === 'admin' ? '/phase1/admin' : '/phase1/dashboard');
      router.refresh();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to V-RENT"
      subtitle="Manage your listings, your subscription and your CEA verification in one place."
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
        {error && <Callout tone="danger" compact>{error}</Callout>}

        <TextInput
          label="Email address"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="you@agency.com.sg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div>
          <TextInput
            label="Password"
            type="password"
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

      <p className="mt-8 border-t border-p1-border pt-5 text-[12.5px] leading-6 text-p1-text-3">
        Signing in creates a session that lasts twelve hours. Two-factor authentication for administrators, single
        sign-on for agencies and Singpass sign-in are part of the full build.
      </p>
    </AuthLayout>
  );
}
