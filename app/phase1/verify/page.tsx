"use client";

/**
 * Confirming the email address on the account.
 *
 * A link, not a code: the scope calls for an email verification link, and SMS
 * is explicitly out of the POC because sending text messages in Singapore
 * requires registering the sender name with the government registry first.
 *
 * No mail provider is connected here, so the link is shown on screen and the
 * page says exactly why. That is honest, and it is also what a developer sees
 * on any product before the transactional mail account exists.
 */

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailCheck, Mail, RefreshCw, AlertTriangle, CheckCircle2, ArrowRight, Copy } from 'lucide-react';
import { Button, Card, Callout, PageHeader, cx } from '../../../components/phase1/kit';
import { useToast } from '../../../components/phase1/Toast';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { useSession } from '../../../lib/phase1/SessionContext';

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}

/** What the confirm route can send us back with. */
const OUTCOME: Record<string, { tone: 'success' | 'warning' | 'danger'; title: string; body: string }> = {
  confirmed: {
    tone: 'success',
    title: 'Your email address is confirmed',
    body: 'Notices about your listings, your registration and your subscription will reach you there.',
  },
  expired: {
    tone: 'warning',
    title: 'That link had expired',
    body: 'A confirmation link is good for 24 hours. Send yourself a fresh one below.',
  },
  unknown: {
    tone: 'warning',
    title: 'That link has already been used',
    body: 'Each link works once. If the address is still unconfirmed, send a new one.',
  },
  address_changed: {
    tone: 'warning',
    title: 'The address changed after that link was sent',
    body: 'The old link no longer applies. Send a new one to the current address.',
  },
};

function VerifyEmail() {
  const params = useSearchParams();
  const router = useRouter();
  const { push } = useToast();
  const { state } = useDemo();
  const { user } = useSession();

  const [sending, setSending] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const outcome = OUTCOME[params.get('email') ?? ''];
  const verified = state.emailVerified || Boolean(user?.emailVerifiedAt) || params.get('email') === 'confirmed';

  const sendLink = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-email/send', { method: 'POST' });
      const body = (await res.json()) as { error?: string; link?: string; delivered?: boolean };
      if (!res.ok) throw new Error(body.error ?? 'That did not send.');
      setLink(body.link ?? null);
      push(body.delivered
        ? { tone: 'success', title: 'Confirmation email sent', body: `Check ${user?.email ?? 'your inbox'}.` }
        : { tone: 'info', title: 'No mail provider is connected', body: 'The link is shown below instead.' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not send.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader
        eyebrow="Account"
        title="Confirm your email address"
        description="V-RENT sends moderation outcomes, registration warnings and billing notices to this address, so it has to be one you read."
      />

      {outcome && (
        <Callout tone={outcome.tone} title={outcome.title} className="mb-5">
          {outcome.body}
        </Callout>
      )}

      <Card padding="lg">
        <div className="flex items-start gap-4">
          <span
            className={cx(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              verified ? 'bg-p1-success-soft text-p1-success' : 'bg-p1-primary-soft text-p1-primary dark:text-p1-text',
            )}
            aria-hidden
          >
            {verified ? <MailCheck size={24} /> : <Mail size={24} />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold text-p1-text">
              {verified ? 'Confirmed' : 'Not confirmed yet'}
            </h2>
            <p className="mt-1 break-all text-[14.5px] text-p1-text-2">{user?.email ?? state.profile.email}</p>

            {verified ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-[14px] text-p1-success">
                  <CheckCircle2 size={16} aria-hidden /> Nothing further to do
                </span>
                <Button variant="outline" size="sm" rightIcon={<ArrowRight size={15} />} onClick={() => router.push('/phase1/dashboard')}>
                  Back to the dashboard
                </Button>
              </div>
            ) : (
              <>
                <p className="mt-3 text-[14px] leading-6 text-p1-text-2">
                  We will send a link to that address. Opening it confirms the address and nothing else — the link works
                  once and expires after 24 hours.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button loading={sending} leftIcon={<RefreshCw size={16} />} onClick={() => void sendLink()}>
                    {link ? 'Send another link' : 'Send the confirmation link'}
                  </Button>
                  <span className="text-[13px] text-p1-text-3">One a minute, at most.</span>
                </div>
              </>
            )}

            {error && (
              <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-lg border border-p1-danger-border bg-p1-danger-soft px-3.5 py-2.5 text-[13.5px] text-p1-text">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-p1-danger" aria-hidden />
                {error}
              </div>
            )}

            {link && !verified && (
              <div className="mt-5 rounded-lg border border-p1-border bg-p1-subtle/60 p-4">
                <div className="text-[13.5px] font-semibold text-p1-text">No mail provider is connected</div>
                <p className="mt-1 text-[13px] leading-5 text-p1-text-2">
                  The message was written to the outbox on the server instead of being delivered. Here is the link it
                  contains — in production this box does not exist.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link href={link} className="min-w-0 flex-1 truncate rounded-md border border-p1-border bg-p1-surface px-3 py-2 font-mono text-[12.5px] text-p1-primary hover:underline dark:text-p1-info">
                    {link}
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Copy size={14} />}
                    onClick={() => {
                      void navigator.clipboard.writeText(link).then(
                        () => push({ tone: 'success', title: 'Link copied' }),
                        () => push({ tone: 'info', title: 'Copy it from the box' }),
                      );
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <p className="mt-4 text-[13px] leading-6 text-p1-text-3">
        Text-message confirmation is deliberately not in the proof of concept: sending SMS in Singapore requires
        registering the sender name with SGNIC first, which is a waiting period rather than build work.
      </p>
    </div>
  );
}
