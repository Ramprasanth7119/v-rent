"use client";

/**
 * Stand-in for a hosted checkout page (Razorpay Payment Link / Dodo checkout).
 *
 * It exists only while PAYMENTS_MODE is not "live". The buttons do not set any
 * state directly — they ask the server to emit a correctly signed webhook, which
 * then travels the same verify → dedupe → transition path a real one does.
 */

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, Lock } from 'lucide-react';
import { Button, Card, Spinner } from '../../../../components/phase1/kit';

function SandboxCheckout() {
  const search = useSearchParams();
  const ref = search.get('ref');
  const provider = search.get('provider');
  const [busy, setBusy] = useState<'paid' | 'failed' | null>(null);

  if (!ref || !provider) {
    return (
      <Card padding="lg">
        <p className="py-8 text-center text-[14px] text-p1-text-2">No payment reference in the link.</p>
      </Card>
    );
  }

  const finish = async (outcome: 'paid' | 'failed') => {
    setBusy(outcome);
    try {
      await fetch('/api/payments/sandbox', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ref, provider, outcome }),
      });
    } finally {
      window.location.href = `/phase1/payment?ref=${encodeURIComponent(ref)}`;
    }
  };

  const label = provider === 'dodo' ? 'Dodo Payments' : 'Razorpay';

  return (
    <Card padding="lg">
      <div className="text-center">
        <span
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-p1-subtle text-p1-text-2"
          aria-hidden
        >
          <CreditCard size={22} />
        </span>
        <h1 className="text-[19px] font-semibold text-p1-text">{label} — sandbox checkout</h1>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-6 text-p1-text-2">
          In production this is {label}&apos;s own page, on their domain, with the card form. Nothing here
          touches V-RENT.
        </p>
        <p className="mt-3 text-[13px] text-p1-text-3">
          Reference <code className="font-mono">{ref}</code>
        </p>
      </div>

      <div className="mt-7 space-y-2">
        <Button
          variant="primary"
          size="lg"
          block
          disabled={busy !== null}
          leftIcon={busy === 'paid' ? <Spinner size={16} /> : <Lock size={16} />}
          onClick={() => finish('paid')}
        >
          Approve the payment
        </Button>
        <Button variant="outline" size="lg" block disabled={busy !== null} onClick={() => finish('failed')}>
          Decline it
        </Button>
      </div>

      <p className="mt-5 text-center text-[12px] leading-5 text-p1-text-3">
        Both buttons ask the server to send a signed webhook. The result you see on the way back came from
        that webhook, not from this page.
      </p>
    </Card>
  );
}

export default function SandboxCheckoutPage() {
  return (
    <div className="mx-auto max-w-md">
      <Suspense
        fallback={
          <Card padding="lg">
            <div className="flex justify-center py-10">
              <Spinner size={24} />
            </div>
          </Card>
        }
      >
        <SandboxCheckout />
      </Suspense>
    </div>
  );
}
