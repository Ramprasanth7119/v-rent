/**
 * Where this home's asking price sits among the ones like it.
 *
 * One sentence, one scale, one line of provenance. No chart: there is no time
 * series behind this, and drawing a line through four asking prices would look
 * like a trend and be nothing of the kind.
 *
 * What it will not do is fill the space when there is nothing to say. Under
 * four comparable homes it prints a sentence saying so, which is a more useful
 * thing for a tenant to read than a range invented from two.
 */

import { Info } from 'lucide-react';
import type { PriceContext as Context } from '../../../lib/phase1/market-compare';
import { ENOUGH } from '../../../lib/phase1/market-compare';
import { money } from './Collection';

const ordinal = (n: number) => {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

export function PriceContextPanel({ context }: { context: Context }) {
  if (context.status === 'thin') {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-p1-border bg-p1-surface px-4 py-3 text-[13.5px] leading-5 text-p1-text-3">
        <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
        Not enough to compare against. There {context.count === 1 ? 'is' : 'are'} {context.count} comparable {context.count === 1 ? 'home' : 'homes'} live
        in this area, and V-RENT does not draw a price range from fewer than {ENOUGH}.
      </p>
    );
  }

  const unit = context.deal === 'sale' ? '' : ' a month';
  /* Where the marker sits along the low-to-high bar. A set where everything is
     asking the same puts it in the middle rather than dividing by zero. */
  const span = context.high - context.low;
  const at = span > 0 ? ((context.price - context.low) / span) * 100 : 50;

  const verdict = context.standing === 'about'
    ? 'about the middle of'
    : context.standing === 'below' ? 'below the middle of' : 'above the middle of';

  return (
    <div className="rounded-xl border border-p1-border bg-p1-surface p-4">
      <p className="text-[14.5px] leading-6 text-p1-text">
        At <span className="font-semibold tabular-nums">{money(context.price, context.deal)}{unit}</span>, this is
        {' '}<span className="font-semibold">{verdict}</span> {context.count} {context.description} asking
        {' '}<span className="tabular-nums">{money(context.low, context.deal)}</span> to
        {' '}<span className="tabular-nums">{money(context.high, context.deal)}</span>
        {' '}— the {ordinal(context.rank)} cheapest of them.
      </p>

      <div className="mt-4" aria-hidden>
        <div className="relative h-1.5 rounded-full bg-p1-subtle">
          <span className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-p1-border-strong" style={{ left: `${span > 0 ? ((context.middle - context.low) / span) * 100 : 50}%` }} />
          <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-p1-surface bg-p1-primary shadow-p1-sm" style={{ left: `${at}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11.5px] tabular-nums text-p1-text-3">
          <span>{money(context.low, context.deal)}</span>
          <span>middle {money(context.middle, context.deal)}</span>
          <span>{money(context.high, context.deal)}</span>
        </div>
      </div>

      <p className="mt-4 border-t border-p1-border pt-3 text-[12px] leading-5 text-p1-text-3">
        These are <span className="font-medium text-p1-text-2">asking prices on V-RENT today</span>, not transacted
        prices. V-RENT does not hold a transaction feed, so nothing here says what a home actually let or sold for.
      </p>
    </div>
  );
}
