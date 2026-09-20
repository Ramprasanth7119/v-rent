/**
 * One set of homes with a name: a district, a station, a development.
 *
 * All three answer the same question — "what is going in X, and what does it
 * cost?" — so all three are this page with different words. A server
 * component: it draws, it does not fetch.
 *
 * Every figure on it is measured from the homes underneath it. The price
 * spread is the spread of these listings' asking prices and is labelled as
 * asking prices, because that is what they are: what agents are asking on
 * V-RENT today, not what anything let for.
 */

import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
import type { MarketListing } from '../../../lib/phase1/marketplace';
import { type Deal, type Facet, type Spread, dealOf } from '../../../lib/phase1/market-explore';
import { PropertyCard } from './PropertyCard';
import { HeroMap } from './HeroMap';
import { JsonLd } from './JsonLd';
import { pinPrice } from './format';

/** "S$4,200 a month", "S$1.35M". Whole figures; a rent is not written to the cent. */
export function money(value: number, deal: Deal): string {
  if (deal === 'sale') {
    return value >= 1_000_000
      ? `S$${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
      : `S$${Math.round(value).toLocaleString('en-SG')}`;
  }
  return `S$${Math.round(value).toLocaleString('en-SG')}`;
}

const bedWord = (n: number) => (n === 0 ? 'studio' : String(n));

export function SpreadStats({ spread }: { spread: Spread }) {
  const unit = spread.deal === 'sale' ? '' : ' a month';
  const side = spread.deal === 'sale' ? 'for sale' : 'to rent';

  /* One home, or several all asking the same, has one figure and not three.
     Printing the lowest, the middle and the highest as the same number three
     times across the strip is noise dressed up as analysis. */
  const flat = spread.low === spread.high;

  const rows: [string, string][] = [
    ['Live now', `${spread.count} ${side}`],
    ...(flat
      ? [['Asking', `${money(spread.low, spread.deal)}${unit}`] as [string, string]]
      : [
        ['Asking from', `${money(spread.low, spread.deal)}${unit}`] as [string, string],
        ['Middle of the range', `${money(spread.middle, spread.deal)}${unit}`] as [string, string],
        ['Up to', `${money(spread.high, spread.deal)}${unit}`] as [string, string],
      ]),
    ['Bedrooms', spread.beds.map(bedWord).join(', ')],
  ];
  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-p1-border bg-p1-border sm:grid-cols-3 ${rows.length > 3 ? 'lg:grid-cols-5' : 'lg:grid-cols-3'}`}>
      {rows.map(([k, v]) => (
        <div key={k} className="bg-p1-surface px-4 py-3">
          <dt className="text-[12px] text-p1-text-3">{k}</dt>
          <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-p1-text">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FacetGrid({ facets, columns = 6 }: { facets: Facet[]; columns?: 4 | 6 }) {
  return (
    <ul className={`vr-stagger grid grid-cols-2 gap-3 md:grid-cols-3 ${columns === 6 ? 'xl:grid-cols-6' : 'xl:grid-cols-4'}`}>
      {facets.map((f) => (
        <li key={f.href}>
          <Link href={f.href} className="group flex h-full flex-col rounded-xl border border-p1-border bg-p1-surface p-4 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-p1-border-strong hover:shadow-p1-md">
            <span className="text-[16px] font-semibold leading-5 tracking-[-0.01em] text-p1-text">{f.label}</span>
            <span className="mt-1 line-clamp-2 min-h-[2.5em] text-[12.5px] leading-5 text-p1-text-3">{f.hint}</span>
            <span className="mt-3 flex items-center justify-between gap-2 border-t border-p1-border pt-3 text-[12.5px]">
              <span className="text-p1-text-2"><span className="font-semibold tabular-nums text-p1-text">{f.count}</span> {f.count === 1 ? 'home' : 'homes'}</span>
              {/* "a month" on a rent and nothing on a sale, so S$4,200 and
                  S$549,000 on neighbouring cards cannot be read as the same
                  kind of figure. */}
              <span className="whitespace-nowrap tabular-nums text-p1-text-3">from {money(f.from, f.deal)}{f.deal === 'rent' ? '/mo' : ''}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Collection({
  kicker, title, blurb, items, spread, searchHref, related, jsonLd,
}: {
  /** The breadcrumb trail above the heading. */
  kicker: { label: string; href: string }[];
  title: string;
  blurb: string;
  items: MarketListing[];
  spread: Spread | null;
  /** Where "see all of these in search" goes. */
  searchHref: string;
  /** Neighbouring collections worth a look — same district, same line. */
  related?: { label: string; href: string; hint: string }[];
  /** Structured data for this set, built by the page that knows what it is. */
  jsonLd?: Record<string, unknown>[];
}) {
  const pins = items
    .filter((m) => m.listing.lat !== undefined && m.listing.lng !== undefined)
    .map((m) => ({
      key: `${m.ownerId}/${m.listing.id}`,
      lat: m.listing.lat!,
      lng: m.listing.lng!,
      label: pinPrice(m.listing),
      href: `/phase1/homes/${m.ownerId}/${m.listing.id}`,
    }));

  const forSale = items.filter((m) => dealOf(m.listing) === 'sale').length;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {jsonLd && <JsonLd data={jsonLd} />}
      <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-p1-text-3">
        <ol className="flex flex-wrap items-center gap-1">
          {kicker.map((k) => (
            <li key={k.href} className="flex items-center gap-1">
              <Link href={k.href} className="hover:text-p1-text">{k.label}</Link>
              <ChevronRight size={13} aria-hidden />
            </li>
          ))}
          <li className="text-p1-text-2" aria-current="page">{title}</li>
        </ol>
      </nav>

      <header className="vr-rise max-w-3xl">
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.03em] text-p1-text sm:text-[40px]">{title}</h1>
        <p className="mt-3 text-[16px] leading-7 text-p1-text-3">{blurb}</p>
      </header>

      {spread && <div className="mt-7"><SpreadStats spread={spread} /></div>}

      {pins.length > 0 && (
        <div className="relative mt-6 h-[300px] overflow-hidden rounded-2xl border border-p1-border sm:h-[360px]">
          <HeroMap items={pins} />
        </div>
      )}

      <section className="mt-10" aria-labelledby="these-homes">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 id="these-homes" className="text-[22px] font-semibold tracking-[-0.02em] text-p1-text">
            {items.length} {items.length === 1 ? 'home' : 'homes'}
            {forSale > 0 && forSale < items.length && <span className="text-p1-text-3"> · {forSale} for sale</span>}
          </h2>
          <Link href={searchHref} className="inline-flex items-center gap-1 text-[14px] font-medium text-p1-primary hover:underline underline-offset-4">
            Open in search <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <ul className="vr-stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((m, i) => (
            <li key={`${m.ownerId}/${m.listing.id}`}><PropertyCard item={m} priority={i < 4} /></li>
          ))}
        </ul>
      </section>

      {related && related.length > 0 && (
        <section className="mt-12" aria-labelledby="related">
          <h2 id="related" className="mb-4 text-[18px] font-semibold tracking-[-0.015em] text-p1-text">Nearby and related</h2>
          <ul className="flex flex-wrap gap-2">
            {related.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="inline-flex items-baseline gap-2 rounded-lg border border-p1-border bg-p1-surface px-3 py-2 text-[13.5px] text-p1-text hover:border-p1-border-strong">
                  <span className="font-medium">{r.label}</span>
                  <span className="text-[12.5px] text-p1-text-3">{r.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
