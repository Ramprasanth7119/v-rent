"use client";

/**
 * Payments on record.
 *
 * A table on a wide screen and a list on a phone. Rows come only from the
 * account's history; an account whose payment never reached a provider has
 * none, and gets an empty state that says why rather than a sample invoice.
 * Invoice documents are not issued in this build, so the action is present but
 * disabled and says so — the column is where it will be.
 */

import { CreditCard, FileText, Mail, Receipt } from 'lucide-react';
import { Card, CardHead, EmptyState, Tooltip, cx } from '../kit';
import type { BillingRow } from '../../../lib/phase1/account';
import { sgd } from '../../../lib/phase1/data';
import { sgDate } from '../../../lib/phase1/format';

const STATUS: Record<BillingRow['status'], { label: string; cls: string }> = {
  paid: { label: 'Paid', cls: 'bg-p1-success-soft text-p1-success' },
  failed: { label: 'Failed', cls: 'bg-p1-danger-soft text-p1-danger' },
  due: { label: 'Due', cls: 'bg-p1-warning-soft text-p1-warning' },
  recorded: { label: 'Recorded', cls: 'bg-p1-subtle text-p1-text-2' },
};

function StatusPill({ s }: { s: BillingRow['status'] }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-semibold', STATUS[s].cls)}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />{STATUS[s].label}
    </span>
  );
}

function InvoiceButton() {
  return (
    <Tooltip content="Invoices are issued by the live payment provider, which is not connected in this build.">
      <span tabIndex={0} className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-lg border border-p1-border px-2.5 text-[12.5px] font-medium text-p1-text-3">
        <FileText size={13} aria-hidden /> Invoice
      </span>
    </Tooltip>
  );
}

export function BillingActivity({
  rows, paymentMethod, receiptsTo, className = '',
}: {
  rows: BillingRow[]; paymentMethod: 'PayNow' | 'Card' | null; receiptsTo: string; className?: string;
}) {
  return (
    <Card as="section" aria-labelledby="billing-h" padding="none" className={cx('vr-rise overflow-hidden', className)}>
      <div className="p-5">
        <CardHead id="billing-h" title="Billing activity" sub="Payments recorded against this account">
          <div className="flex flex-wrap gap-2 text-[12.5px] text-p1-text-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-p1-subtle px-2.5 py-1.5">
              <CreditCard size={13} aria-hidden className="text-p1-text-3" />{paymentMethod ?? 'No payment method'}
            </span>
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg bg-p1-subtle px-2.5 py-1.5">
              <Mail size={13} aria-hidden className="shrink-0 text-p1-text-3" /><span className="truncate">{receiptsTo}</span>
            </span>
          </div>
        </CardHead>
      </div>

      {rows.length === 0 ? (
        <div className="border-t border-p1-border">
          <EmptyState
            compact
            icon={<Receipt size={18} />}
            title="No payments on record yet"
            description="A payment appears here once the payment provider confirms it. Nothing is shown until then."
          />
        </div>
      ) : (
        <>
          {/* wide: a table */}
          <div className="hidden border-t border-p1-border md:block">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="bg-p1-subtle/60 text-[12px] font-medium text-p1-text-3">
                  <th scope="col" className="px-5 py-2.5 font-medium">Date</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Description</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Method</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium"><span className="sr-only">Invoice</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-p1-border">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-p1-subtle/50">
                    <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-p1-text-2" suppressHydrationWarning>{sgDate(r.at)}</td>
                    <td className="px-3 py-3.5">
                      <div className="font-medium text-p1-text">{r.description}</div>
                      {r.plan && <div className="text-[12px] text-p1-text-3">12 months · {r.plan.name}</div>}
                    </td>
                    <td className="px-3 py-3.5 text-p1-text-2">{r.method ?? '—'}</td>
                    <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-p1-text">{r.amount !== null ? sgd(r.amount) : '—'}</td>
                    <td className="px-3 py-3.5"><StatusPill s={r.status} /></td>
                    <td className="px-5 py-3.5 text-right"><InvoiceButton /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* narrow: a list */}
          <ul className="divide-y divide-p1-border border-t border-p1-border md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="font-medium text-p1-text">{r.description}</div>
                  <div className="mt-0.5 text-[12.5px] text-p1-text-3" suppressHydrationWarning>
                    {sgDate(r.at)}{r.method ? ` · ${r.method}` : ''}
                  </div>
                  <div className="mt-2"><StatusPill s={r.status} /></div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-semibold tabular-nums text-p1-text">{r.amount !== null ? sgd(r.amount) : '—'}</div>
                  <div className="mt-2"><InvoiceButton /></div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
