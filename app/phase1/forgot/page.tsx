"use client";

/**
 * Asking for a password reset link.
 *
 * The confirmation is identical whether or not the address has an account,
 * because the alternative is a form that tells a stranger which of a list of
 * addresses is registered with V-RENT. The server behaves the same way; this
 * screen is only refusing to give the game away in the interface.
 */

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MailCheck, Send, AlertTriangle, Copy } from 'lucide-react';
import { AuthLayout } from '../../../components/phase1/auth/AuthLayout';
import { Button, TextInput } from '../../../components/phase1/kit';
import { useToast } from '../../../components/phase1/Toast';

export default function ForgotPasswordPage() {
  const { push } = useToast();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
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
      setError('That did not send. Try again in a moment.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout
      title={sent ? 'Check your inbox' : 'Reset your password'}
      subtitle={sent
        ? 'If that address has a V-RENT account, a reset link is on its way to it.'
        : 'Enter the address you sign in with and we will send a link to set a new password.'}
      footer={
        <Link href="/phase1/login" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-p1-text-2 hover:text-p1-text">
          <ArrowLeft size={15} aria-hidden /> Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-p1-success-border bg-p1-success-soft/60 px-4 py-3.5">
            <MailCheck size={20} className="mt-0.5 shrink-0 text-p1-success" aria-hidden />
            <p className="text-[14px] leading-6 text-p1-text">
              The link works once and expires in an hour. If nothing arrives, check the address and try again — we do
              not say whether an address is registered, so this message looks the same either way.
            </p>
          </div>

          {link && (
            <div className="rounded-lg border border-p1-border bg-p1-subtle/60 p-4">
              <div className="text-[13.5px] font-semibold text-p1-text">No mail provider is connected</div>
              <p className="mt-1 text-[13px] leading-5 text-p1-text-2">
                The message was written to the server outbox instead of being delivered. In production this box does
                not exist.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link href={link.replace(/^https?:\/\/[^/]+/, '')} className="min-w-0 flex-1 truncate rounded-md border border-p1-border bg-p1-surface px-3 py-2 font-mono text-[12.5px] text-p1-primary hover:underline dark:text-p1-info">
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

          <Button variant="outline" block onClick={() => { setSent(false); setLink(null); }}>
            Use a different address
          </Button>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={submit}>
          <TextInput
            label="Email address"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@agency.com.sg"
          />

          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-p1-danger-border bg-p1-danger-soft px-3.5 py-2.5 text-[13.5px] text-p1-text">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-p1-danger" aria-hidden />
              {error}
            </div>
          )}

          <Button type="submit" size="lg" block loading={sending} rightIcon={<Send size={16} />}>
            Send the reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
