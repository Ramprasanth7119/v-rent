/**
 * Putting bought credit into an agent's balance.
 *
 * The only way the balance goes up. Every path into it carries a payment
 * reference, and a reference that has already been banked adds nothing — which
 * is what makes this safe to call from all the places the news of a payment
 * arrives:
 *
 *   - the provider's webhook, which is the one that decides a payment is real;
 *   - a redelivery of that webhook, which providers send freely;
 *   - the status poll the browser is already running, which settles the rare
 *     case of a webhook accepted and then lost before the balance was written.
 *
 * The last of those is why granting sits outside the payment state machine
 * rather than inside it. A payment is paid the moment a signed webhook says so;
 * whether the credit has landed is a separate question, asked again every time
 * anyone looks at the payment, and answered once.
 *
 * Nothing here decides that a payment succeeded. It is told.
 */

import { mutateWorkspace } from './workspace-store';
import { bankTopUp, type CreditTopUp } from './views';

export type GrantOutcome =
  /** The balance went up. */
  | 'granted'
  /** This reference was already banked. Nothing changed, and that is correct. */
  | 'already'
  /** No workspace for that account. Left for reconciliation rather than seeded. */
  | 'no_workspace';

export async function grantRevealCredits(input: {
  accountId: string;
  /** The payment reference. What makes a repeat harmless. */
  ref: string;
  /** Cents to add. */
  cents: number;
  /** Cents actually paid, which is less on the packs that include extra. */
  paidCents: number;
}): Promise<GrantOutcome> {
  const { accountId, ref, cents, paidCents } = input;
  const topUp: CreditTopUp = { ref, cents, paidCents, at: new Date().toISOString() };

  /* Set inside the change, which runs under the account's lock, so it reports
     what happened to the stored record rather than what was expected to. */
  let outcome: GrantOutcome = 'no_workspace';

  await mutateWorkspace(accountId, (current) => {
    const banked = bankTopUp(current, topUp);
    outcome = banked ? 'granted' : 'already';
    return banked;
  });

  return outcome;
}
