/**
 * Money and tax arithmetic.
 *
 * Two rules, both learned the hard way by everyone who has ever built this:
 *   1. Amounts are integer cents. Floating point belongs in the formatter only.
 *   2. Prices are quoted GST-inclusive to the agent, because that is what
 *      Singapore consumers and IRAS both expect on a displayed price.
 */

import type { Money, TaxLine } from './types';

export const GST_RATE = 0.09; // Singapore, since 1 Jan 2024.

export function money(cents: number, currency: Money['currency'] = 'SGD'): Money {
  if (!Number.isInteger(cents)) throw new Error(`Money must be integer cents, got ${cents}`);
  return { cents, currency };
}

export function fromSgd(amount: number): Money {
  return money(Math.round(amount * 100));
}

export function formatSgd(cents: number): string {
  return (
    'S$' +
    (cents / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/**
 * Splits a GST-inclusive price into net and tax.
 * S$1,188.00 inclusive at 9% => net S$1,089.91, GST S$98.09.
 */
export function splitInclusiveGst(totalCents: number, rate = GST_RATE): { netCents: number; taxCents: number } {
  const netCents = Math.round(totalCents / (1 + rate));
  return { netCents, taxCents: totalCents - netCents };
}

/** Adds GST on top of a net price. Used when the plan price is quoted ex-GST. */
export function addGst(netCents: number, rate = GST_RATE): { totalCents: number; taxCents: number } {
  const taxCents = Math.round(netCents * rate);
  return { totalCents: netCents + taxCents, taxCents };
}

export type TaxTreatment = 'gst-registered' | 'not-gst-registered' | 'merchant-of-record';

/**
 * The three tax positions V-RENT can be in, and what each means on the invoice.
 *
 *  gst-registered      V-RENT holds a GST number, charges 9% and remits it to IRAS.
 *  not-gst-registered  Below the S$1m threshold. No GST may be charged at all.
 *  merchant-of-record  Dodo sells to the agent and handles the tax; V-RENT is
 *                      paid a net amount and issues no GST invoice.
 */
export function taxLineFor(treatment: TaxTreatment, totalCents: number): TaxLine {
  switch (treatment) {
    case 'gst-registered': {
      const { taxCents } = splitInclusiveGst(totalCents);
      return { label: 'GST 9% (included)', rate: GST_RATE, cents: taxCents, remittedBy: 'v-rent' };
    }
    case 'merchant-of-record': {
      const { taxCents } = splitInclusiveGst(totalCents);
      return { label: 'GST 9% collected by provider', rate: GST_RATE, cents: taxCents, remittedBy: 'merchant-of-record' };
    }
    case 'not-gst-registered':
    default:
      return { label: 'No GST (not registered)', rate: 0, cents: 0, remittedBy: 'not-applicable' };
  }
}
