"use client";

/**
 * The account, quietly.
 *
 * Standing only becomes loud when it blocks something — a failed renewal or a
 * lapsed registration is already at the top of Needs attention, so here it is
 * a two-line statement of what is in force. The listing allowance lives in the
 * snapshot at the top of the page and is deliberately not repeated.
 */

import Link from 'next/link';
import React from 'react';
import { Card } from '../kit';
import { StatusBadge } from '../status';
import { sgDate } from '../../../lib/phase1/format';
import { SubscriptionStatus } from '../../../lib/phase1/workspace';

export function AccountCard({
  planName, subscription, ceaValid, ceaValidUntil, paymentMethod,
}: {
  planName: string | null;
  subscription: SubscriptionStatus;
  ceaValid: boolean;
  ceaValidUntil: string;
  paymentMethod: 'PayNow' | 'Card' | null;
}) {
  return (
    <Card padding="sm" as="section" aria-labelledby="plan-h">
      <div className="flex items-center justify-between gap-2">
        <h2 id="plan-h" className="text-[14px] font-semibold text-p1-text">{planName ? `${planName} plan` : 'No plan yet'}</h2>
        <Link href={planName ? '/phase1/checkout' : '/phase1/plans'} className="shrink-0 text-[13px] font-medium text-p1-primary hover:underline underline-offset-4">
          {planName ? 'Manage' : 'Choose a plan'}
        </Link>
      </div>

      <dl className="mt-3 space-y-2 border-t border-p1-border pt-3 text-[12.5px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-p1-text-3">Subscription</dt>
          <dd><StatusBadge kind="subscription" value={subscription} size="sm" /></dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-p1-text-3">CEA registration</dt>
          <dd>
            {ceaValid
              ? <span className="font-medium text-p1-text-2">Valid to {sgDate(ceaValidUntil)}</span>
              : <Link href="/phase1/status" className="font-medium text-p1-danger hover:underline underline-offset-4">Lapsed</Link>}
          </dd>
        </div>
        {paymentMethod && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-p1-text-3">Payment method</dt>
            <dd className="font-medium text-p1-text-2">{paymentMethod}</dd>
          </div>
        )}
      </dl>
    </Card>
  );
}
