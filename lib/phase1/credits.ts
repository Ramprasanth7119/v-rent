/**
 * Reveal credit, and what it costs to buy.
 *
 * A name behind a view costs S$1 (`views.ts`). Collecting that dollar at the
 * moment the agent wants the name would be the wrong shape twice over: PayNow
 * charges V-RENT 0.60% plus thirty cents on every transfer, so a third of a
 * one-dollar sale is gone before it arrives; and an agent who has to open their
 * banking app, scan a QR and wait for a webhook to find out who looked at a
 * flat will do it once and never again. The reveal has to be a tap.
 *
 * So the money and the name are separated. Credit is bought in a pack, and
 * spent a name at a time with nothing in the way. Every pack is priced in whole
 * dollars, which is also what makes the arithmetic on screen checkable: an
 * agent can see that S$10 is ten names, or eleven with the one included.
 *
 * The packs are here rather than in the payments layer because what they are
 * worth is a product decision, not a payment one — `lib/payments/catalogue.ts`
 * asks this module what something costs and never sets a price of its own.
 *
 * Pure. The granting is in `reveal-credits.ts`, and happens only on a verified
 * webhook.
 */

import { REVEAL_PRICE_CENTS } from './views';

export interface CreditPack {
  /** Quoted to the payment provider and stored on the intent. */
  code: string;
  name: string;
  /** What the agent pays, in cents. */
  priceCents: number;
  /** What lands in the balance, in cents. Never less than the price. */
  creditCents: number;
  /** Shown on the busiest pack, and on nothing else. */
  highlight?: string;
}

/**
 * Three packs, and no more.
 *
 * Five is a trial, ten is the one most agents want, thirty is the agent who has
 * decided this is how they find co-broke partners. A fourth option between any
 * two of them would not sell to anybody; it would only make the choice slower.
 *
 * The extra on the larger two is given in whole names rather than a percentage,
 * because the thing being bought is names. "One on us" is a number an agent can
 * check against the balance afterwards; "10% more credit" is not.
 */
export const CREDIT_PACKS: CreditPack[] = [
  {
    code: 'reveal-5',
    name: '5 names',
    priceCents: 500,
    creditCents: 500,
  },
  {
    code: 'reveal-10',
    name: '11 names',
    priceCents: 1000,
    creditCents: 1100,
    highlight: 'One on us',
  },
  {
    code: 'reveal-30',
    name: '35 names',
    priceCents: 3000,
    creditCents: 3500,
    highlight: 'Five on us',
  },
];

/** The pack an intent was opened for, or null when the code is not one of ours. */
export const creditPackByCode = (code: string): CreditPack | null =>
  CREDIT_PACKS.find((p) => p.code === code) ?? null;

/** What the pack is worth in names, which is the only unit the screen uses. */
export const namesIn = (pack: CreditPack): number => Math.floor(pack.creditCents / REVEAL_PRICE_CENTS);

/**
 * How many names a balance still buys.
 *
 * Floored, because a balance of ninety cents is not most of a name — it is no
 * names — and a screen that rounds it up is a screen that offers a button which
 * then refuses.
 */
export const namesAfforded = (credits: number): number => Math.floor(credits / REVEAL_PRICE_CENTS);

/** The pack to put in front of an agent who has run out. The middle one. */
export const SUGGESTED_PACK = CREDIT_PACKS[1];
