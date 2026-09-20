/**
 * How one home's asking price sits against the others like it.
 *
 * This is the public product's market context, and it is deliberately narrow.
 * `lib/phase1/market.ts` holds a generated lease-contract dataset that declares
 * itself as not live; it is fine on an agent's research screen, where the label
 * is read by somebody who understands it. Putting it in front of a tenant as
 * "recent transactions in this area" would be manufacturing market statistics,
 * whatever the footnote said.
 *
 * So this uses the one thing that is unarguably real: **what is being asked for
 * comparable homes on V-RENT right now**. Not what anything let for, not a
 * valuation, not a forecast. The wording on screen says asking prices, because
 * that is what they are.
 *
 * Two bases, tried in order, and the one used is named on screen:
 *
 *   1. the same district, the same bedroom count, the same deal;
 *   2. the same district and the same deal, any size.
 *
 * Below four comparables neither basis is reported at all. Three homes do not
 * make a range, and drawing one from them would be the same invention by a
 * smaller number.
 *
 * Client-safe.
 */

import type { MarketListing } from './marketplace';
import { districtLabel } from './districts';
import { dealOf, priceOf, type Deal } from './market-explore';

/** Fewer than this and there is nothing worth saying. */
export const ENOUGH = 4;

export type CompareBasis = 'district_beds' | 'district';

export type PriceContext =
  | {
    status: 'ok';
    basis: CompareBasis;
    /** How the comparison reads: "seven 2-bedroom homes in Katong". */
    description: string;
    deal: Deal;
    count: number;
    /** This home's asking price. */
    price: number;
    low: number;
    middle: number;
    high: number;
    /** 1 means the cheapest of the set, `count` means the dearest. */
    rank: number;
    /** Where it sits, said in a word. `about` is within a tenth of the middle. */
    standing: 'below' | 'about' | 'above';
  }
  | { status: 'thin'; count: number; description: string };

const median = (sorted: number[]): number => (sorted.length % 2
  ? sorted[(sorted.length - 1) / 2]
  : Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2));

const bedWord = (n: number) => (n === 0 ? 'studio' : `${n}-bedroom`);

/**
 * `target` against everything else live.
 *
 * The target is excluded from its own comparison — a set of one home compared
 * with itself is always exactly average, which is true and useless.
 */
export function priceContext(target: MarketListing, all: MarketListing[]): PriceContext {
  const t = target.listing;
  const deal = dealOf(t);
  const price = priceOf(t);
  const area = districtLabel(t.district);

  const others = all.filter((m) =>
    !(m.ownerId === target.ownerId && m.listing.id === t.id)
    && dealOf(m.listing) === deal
    && m.listing.district === t.district
    && priceOf(m.listing) > 0);

  const sameSize = others.filter((m) => m.listing.bedrooms === t.bedrooms);

  const [pool, basis, description] = sameSize.length + 1 >= ENOUGH
    ? [sameSize, 'district_beds' as const, `${bedWord(t.bedrooms)} homes in ${area}`]
    : [others, 'district' as const, `homes in ${area}`];

  /* The target counts towards the set it is being placed in — it is one of the
     homes somebody choosing in this area is choosing between. */
  const prices = [...pool.map((m) => priceOf(m.listing)), price].sort((a, b) => a - b);

  if (prices.length < ENOUGH) {
    return {
      status: 'thin',
      count: prices.length,
      description: `homes in ${area}`,
    };
  }

  const middle = median(prices);
  const off = (price - middle) / middle;

  return {
    status: 'ok',
    basis,
    description,
    deal,
    count: prices.length,
    price,
    low: prices[0],
    middle,
    high: prices[prices.length - 1],
    rank: prices.indexOf(price) + 1,
    standing: Math.abs(off) <= 0.1 ? 'about' : off < 0 ? 'below' : 'above',
  };
}
