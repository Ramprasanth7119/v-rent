"use client";

/**
 * Asking for a password reset link.
 *
 * The confirmation is identical whether or not the address has an account,
 * because the alternative is a form that tells a stranger which of a list of
 * addresses is registered with V-RENT. The server behaves the same way; this
 * screen is only refusing to give the game away in the interface.
 *
 * Arriving from the sign-in form, the address is already filled in.
 */

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Copy, MailCheck } from 'lucide-react';
import { AuthShell } from '../../../components/phase1/auth/AuthShell';
import { AuthFeedback, AuthHeader, AuthStep, AuthSubmit, EMAIL_RE, authLink } from '../../../components/phase1/auth/parts';
import { Button, TextInput } from '../../../components/phase1/kit';
import { useToast } from '../../../components/phase1/Toast';

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPassword />
    </Suspense>
  );
}

function ForgotPassword() {
  const params = useSearchParams();
  const { push } = useToast();
  const [email, setEmail] = useState(() => (params.get('email') ?? '').trim());
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const emailOk = EMAIL_RE.test(email.trim());
  const emailError = tried && !emailOk
    ? (email.trim() ? 'Enter an email address like name@agency.com.sg.' : 'Enter the email address you sign in with.')
    : undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!emailOk || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/password/forgot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = (await res.json()) as { link?: string };
      setLink(body.link ?? null);
      setSent(true);
    } catch {
      setError('That did not send. Check your connection and try again.');
      setAttempt((n) => n + 1);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell
      scene="recover"
      aside={
        <Link href="/phase1/login" className="inline-flex items-center gap-1.5 rounded font-medium text-p1-text-2 hover:text-p1-text">
          <ArrowLeft size={15} aria-hidden /> Back to sign in
        </Link>
      }
    >
      {sent ? (
        <AuthStep key="sent" dir="fwd" className="grid gap-6">
          <span className="p1-auth-pop flex h-12 w-12 items-center justify-center rounded-2xl bg-p1-success-soft text-p1-success" aria-hidden>
            <MailCheck size={24} />
          </span>
          <AuthHeader
            title="Check your inbox"
            subtitle={<>If <span className="font-medium text-p1-text">{email.trim()}</span> has a V-RENT account, a reset link is on its way.</>}
          />
          <p className="text-[13.5px] leading-6 text-p1-text-2" role="status">
            The link works once and expires in an hour. We don’t say whether an address is registered, so this message
            looks the same either way.
          </p>

          {link && (
            <div className="rounded-xl border border-p1-border bg-p1-subtle/60 p-4">
              <div className="text-[13.5px] font-semibold text-p1-text">No mail provider is connected</div>
              <p className="mt-1 text-[13px] leading-5 text-p1-text-2">
                The message was written to the server outbox instead of being delivered. In production this box does
                not exist.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link href={link.replace(/^https?:\/\/[^/]+/, '')} className="min-w-0 flex-1 truncate rounded-md border border-p1-border bg-p1-surface px-3 py-2 font-mono text-[12.5px] text-p1-primary hover:underline">
                  {link}
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Copy size={14} />}
                  onClick={() => void navigator.clipboard.writeText(link).then(
                    () => push({ tone: 'success', title: 'Link copied' }),
                    () => push({ tone: 'info', title: 'Copy it from the box' }),
                  )}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}

          <Button variant="outline" size="lg" block onClick={() => { setSent(false); setLink(null); setTried(false); }}>
            Use a different address
          </Button>
        </AuthStep>
      ) : (
        <div className="p1-auth-stagger grid gap-7">
          <AuthHeader
            title="Reset your password"
            subtitle="Enter the address you sign in with and we’ll send you a link to set a new password."
          />
          <form className="grid gap-5" onSubmit={submit} noValidate>
            {error && <AuthFeedback key={attempt} tone="danger">{error}</AuthFeedback>}
            <TextInput
              label="Email address"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              required
              placeholder="name@agency.com.sg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              containerClassName="p1-auth-field"
            />
            <AuthSubmit status={sending ? 'loading' : 'idle'} busyLabel="Sending…">Send the reset link</AuthSubmit>
            <p className="text-center text-[13.5px] text-p1-text-2">
              Remembered it? <Link href="/phase1/login" className={authLink}>Sign in</Link>
            </p>
          </form>
        </div>
      )}
    </AuthShell>
  );
}
