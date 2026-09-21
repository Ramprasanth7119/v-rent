/**
 * What can be bought, and for how much.
 *
 * One lookup, because the invariant the payment layer exists to hold is that a
 * price is never read from a request body. Everything a route can open an
 * intent for resolves through here, so there is exactly one place where a code
 * becomes an amount — and a code that resolves to nothing is a 400 rather than
 * a payment for zero.
 *
 * Two kinds of thing are sold. A subscription is a year of the product; a
 * credit pack is a balance that is spent one revealed name at a time. They are
 * charged through the same rails and differ in one respect only, which is what
 * happens once the money is confirmed: a plan is a standing entitlement, a pack
 * has to be added to a balance. `kind` is how `service.ts` tells them apart
 * without knowing what either of them means.
 */

import { PLANS } from '../phase1/data';
import { CREDIT_PACKS } from '../phase1/credits';

export type PurchaseKind = 'plan' | 'reveal-credits';

export interface Purchase {
  code: string;
  name: string;
  kind: PurchaseKind;
  /** What the agent is charged, in cents, tax inclusive. */
  totalCents: number;
  /** Cents to add to the reveal balance. Zero for anything that is not a pack. */
  creditCents: number;
}

/**
 * The thing behind a code, or null.
 *
 * Plans are looked at first because they are the older namespace; the two
 * cannot collide in practice, since every pack code begins `reveal-`.
 */
export function purchasable(code: string): Purchase | null {
  const plan = PLANS.find((p) => p.code === code);
  if (plan) {
    return {
      code: plan.code,
      name: `${plan.name} plan, 12 months`,
      kind: 'plan',
      totalCents: Math.round(plan.priceYearSgd * 100),
      creditCents: 0,
    };
  }

  const pack = CREDIT_PACKS.find((p) => p.code === code);
  if (pack) {
    return {
      code: pack.code,
      name: `Reveal credit — ${pack.name}`,
      kind: 'reveal-credits',
      totalCents: pack.priceCents,
      creditCents: pack.creditCents,
    };
  }

  return null;
}
