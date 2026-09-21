/**
 * Buying the names behind the views.
 *
 * Money, so the tests are about the three ways money features go wrong: a
 * price that can be chosen by the caller, credit granted twice for one
 * payment, and a pack that quietly gives less than it says on the button.
 */

import { describe, expect, it } from 'vitest';
import { CREDIT_PACKS, SUGGESTED_PACK, creditPackByCode, namesAfforded, namesIn } from '../lib/phase1/credits';
import { purchasable } from '../lib/payments/catalogue';
import { REVEAL_PRICE_CENTS, bankTopUp, type Balance, type CreditTopUp } from '../lib/phase1/views';
import { PLANS } from '../lib/phase1/data';

const topUp = (over: Partial<CreditTopUp> = {}): CreditTopUp =>
  ({ ref: 'VR260920ABCD', cents: 1100, paidCents: 1000, at: '2026-09-20T10:00:00.000Z', ...over });

const empty = (): Balance => ({ revealCredits: 0, revealTopUps: [] });

describe('the credit packs', () => {
  it('never sells less credit than was paid for', () => {
    for (const pack of CREDIT_PACKS) {
      expect(pack.creditCents).toBeGreaterThanOrEqual(pack.priceCents);
    }
  });

  /* Every pack has to divide into whole names, or the balance ends on an
     amount that buys nothing and looks like a rounding error. */
  it('is worth a whole number of names', () => {
    for (const pack of CREDIT_PACKS) {
      expect(pack.creditCents % REVEAL_PRICE_CENTS).toBe(0);
      expect(namesIn(pack)).toBe(pack.creditCents / REVEAL_PRICE_CENTS);
    }
  });

  /* PayNow will not collect below a dollar, and a pack priced under it would
     offer a method that cannot take it. */
  it('is priced above the PayNow minimum', () => {
    for (const pack of CREDIT_PACKS) expect(pack.priceCents).toBeGreaterThanOrEqual(100);
  });

  it('has codes that cannot collide with a plan', () => {
    for (const pack of CREDIT_PACKS) {
      expect(PLANS.some((p) => p.code === pack.code)).toBe(false);
    }
  });

  it('suggests one of the packs it sells', () => {
    expect(creditPackByCode(SUGGESTED_PACK.code)).toEqual(SUGGESTED_PACK);
  });

  it('does not recognise a code it does not sell', () => {
    expect(creditPackByCode('reveal-999')).toBeNull();
    expect(creditPackByCode('')).toBeNull();
  });
});

describe('what a balance is worth', () => {
  it('counts whole names only', () => {
    expect(namesAfforded(0)).toBe(0);
    expect(namesAfforded(99)).toBe(0);
    expect(namesAfforded(100)).toBe(1);
    /* Not two. A balance of S$1.99 buys one name and has 99 cents left over. */
    expect(namesAfforded(199)).toBe(1);
    expect(namesAfforded(1100)).toBe(11);
  });
});

describe('the purchase catalogue', () => {
  it('prices a plan from the plan list', () => {
    const item = purchasable('professional')!;
    expect(item.kind).toBe('plan');
    expect(item.totalCents).toBe(Math.round(PLANS[1].priceYearSgd * 100));
    /* A plan grants nothing to a balance, however it is fulfilled. */
    expect(item.creditCents).toBe(0);
  });

  it('prices a pack from the pack list', () => {
    const item = purchasable('reveal-10')!;
    expect(item.kind).toBe('reveal-credits');
    expect(item.totalCents).toBe(1000);
    expect(item.creditCents).toBe(1100);
  });

  /* The only defence against a client-supplied amount is that there is nowhere
     to supply one: an unknown code has no price, so the route refuses it. */
  it('refuses to price anything it does not sell', () => {
    expect(purchasable('free')).toBeNull();
    expect(purchasable('')).toBeNull();
    expect(purchasable('reveal-1000000')).toBeNull();
  });
});

describe('banking a payment', () => {
  it('adds the credit and records the reference', () => {
    const next = bankTopUp(empty(), topUp())!;
    expect(next.revealCredits).toBe(1100);
    expect(next.revealTopUps).toHaveLength(1);
    expect(next.revealTopUps[0].ref).toBe('VR260920ABCD');
  });

  /* A provider redelivers webhooks, and the browser polls the same payment
     until it settles. Both arrive here, and only the first may count. */
  it('banks one payment once, however many times it is heard about', () => {
    const once = bankTopUp(empty(), topUp())!;
    expect(bankTopUp(once, topUp())).toBeNull();
    expect(bankTopUp(once, topUp({ cents: 9999 }))).toBeNull();
    expect(once.revealCredits).toBe(1100);
  });

  it('banks a second, different payment', () => {
    const once = bankTopUp(empty(), topUp())!;
    const twice = bankTopUp(once, topUp({ ref: 'VR260920WXYZ', cents: 500, paidCents: 500 }))!;
    expect(twice.revealCredits).toBe(1600);
    expect(twice.revealTopUps).toHaveLength(2);
  });

  it('adds to a balance that is already there', () => {
    const start: Balance = { revealCredits: 250, revealTopUps: [] };
    expect(bankTopUp(start, topUp())!.revealCredits).toBe(1350);
  });

  it('will not bank nothing', () => {
    expect(bankTopUp(empty(), topUp({ cents: 0 }))).toBeNull();
    expect(bankTopUp(empty(), topUp({ cents: -500 }))).toBeNull();
  });

  it('leaves the balance it was given alone', () => {
    const start = empty();
    bankTopUp(start, topUp());
    expect(start.revealCredits).toBe(0);
    expect(start.revealTopUps).toHaveLength(0);
  });
});
