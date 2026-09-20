/**
 * The ways into the marketplace that are not a search box.
 *
 * Districts, stations, developments and the kinds of home people ask for. Each
 * one is counted from what is actually live: the number on an explore tile is
 * the number of homes the link leads to, not an estimate and not a target.
 *
 * The rule every page built on this follows: **a facet exists only when there
 * is something behind it.** There is no list of Singapore's 180-odd stations
 * here waiting to be filled in, and `/mrt/lakeside` is a 404 until an agent
 * lists a flat near Lakeside. A marketplace that publishes empty category
 * pages for a search engine to find is worse than one that publishes none.
 *
 * Client-safe: it takes listings and returns plain data. The pages do the
 * reading.
 */

import type { MarketListing } from './marketplace';
import { DISTRICTS, districtLabel } from './districts';
import type { DemoListing } from './data';

export type Deal = 'rent' | 'sale';

export const dealOf = (l: DemoListing): Deal => (l.dealType ?? 'rent');
export const priceOf = (l: DemoListing): number => (dealOf(l) === 'sale' ? l.salePriceSgd ?? 0 : l.monthlyRent);

/**
 * A word made safe for an address: lower case, letters and digits, hyphens in
 * place of everything else. `The Sail @ Marina Bay` becomes `the-sail-marina-bay`.
 */
export function slug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * The station a listing names, as a station rather than as a code.
 *
 * Agents write it several ways — `Downtown (DT17)`, `Rumbia LRT`, `Bishan` —
 * so the line code in brackets is dropped and the word MRT or LRT is kept as
 * the kind rather than left in the name. Two listings that named the same
 * station in different hands then group together.
 */
export function stationOf(l: DemoListing): { name: string; kind: 'MRT' | 'LRT'; slug: string } | null {
  const raw = (l.nearestMrt ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (!raw) return null;
  const kind = /\bLRT\b/i.test(raw) ? 'LRT' : 'MRT';
  const name = raw.replace(/\s*\b(MRT|LRT)\b\s*/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!name) return null;
  return { name, kind, slug: slug(name) };
}

/** One way in, with what is behind it. */
export interface Facet {
  slug: string;
  label: string;
  /** The second line: the areas in a district, the line of a station. */
  hint: string;
  count: number;
  /** The cheapest live asking price behind this facet. */
  from: number;
  /** Whether `from` is a rent or a price, so it can be written correctly. */
  deal: Deal;
  href: string;
}

/**
 * The cheapest home behind a facet.
 *
 * Rentals are considered first where there are any. Comparing S$4,200 a month
 * with S$549,000 by the raw number is comparing nothing — the rent always
 * wins — so a set with both in it quotes the cheapest rent, a set with only
 * sales in it quotes the cheapest sale, and the card says which by printing
 * "a month" on one and not on the other.
 */
function facet(items: MarketListing[], slugText: string, label: string, hint: string, href: string): Facet {
  const rentals = items.filter((m) => dealOf(m.listing) === 'rent');
  const pool = rentals.length ? rentals : items;
  const cheapest = pool.reduce((lo, m) => (priceOf(m.listing) < priceOf(lo.listing) ? m : lo), pool[0]);
  return {
    slug: slugText,
    label,
    hint,
    count: items.length,
    from: priceOf(cheapest.listing),
    deal: dealOf(cheapest.listing),
    href,
  };
}

function groupBy<K>(items: MarketListing[], key: (m: MarketListing) => K | null): Map<K, MarketListing[]> {
  const out = new Map<K, MarketListing[]>();
  for (const m of items) {
    const k = key(m);
    if (k === null) continue;
    const cur = out.get(k);
    if (cur) cur.push(m); else out.set(k, [m]);
  }
  return out;
}

const byCount = (a: Facet, b: Facet) => b.count - a.count || a.label.localeCompare(b.label);

/* ------------------------------------------------------------- districts */

export function districtFacets(items: MarketListing[]): Facet[] {
  return [...groupBy(items, (m) => m.listing.district).entries()]
    .map(([d, group]) => facet(group, String(d), districtLabel(d), DISTRICTS[d]?.areas ?? `District ${d}`, `/phase1/homes/d/${d}`))
    .sort(byCount);
}

export const districtListings = (items: MarketListing[], d: number) => items.filter((m) => m.listing.district === d);

/* -------------------------------------------------------------- stations */

export function stationFacets(items: MarketListing[]): Facet[] {
  const byStation = groupBy(items, (m) => stationOf(m.listing)?.slug ?? null);
  return [...byStation.entries()]
    .map(([s, group]) => {
      const st = stationOf(group[0].listing)!;
      const areas = [...new Set(group.map((m) => districtLabel(m.listing.district)))];
      return facet(group, s, `${st.name} ${st.kind}`, areas.join(', '), `/phase1/homes/mrt/${s}`);
    })
    .sort(byCount);
}

export const stationListings = (items: MarketListing[], s: string) =>
  items.filter((m) => stationOf(m.listing)?.slug === s);

/* -------------------------------------------------------------- projects */

export function projectFacets(items: MarketListing[]): Facet[] {
  return [...groupBy(items, (m) => slug(m.listing.project) || null).entries()]
    .map(([p, group]) => facet(group, p, group[0].listing.project, `${group[0].listing.address} · ${districtLabel(group[0].listing.district)}`, `/phase1/homes/project/${p}`))
    .sort(byCount);
}

export const projectListings = (items: MarketListing[], p: string) =>
  items.filter((m) => slug(m.listing.project) === p);

/* ----------------------------------------------------------------- types */

/**
 * The broad kinds of home, as a tenant names them, pointing at the search
 * filter that already understands them. Only types something is listed under
 * appear — there is no empty "Landed" tile on a platform with no houses.
 */
export function typeFacets(items: MarketListing[], deal: Deal): Facet[] {
  const here = items.filter((m) => dealOf(m.listing) === deal);
  return [...groupBy(here, (m) => m.listing.propertyType).entries()]
    .map(([t, group]) => facet(
      group,
      slug(t),
      t,
      /* Where they are, rather than how many — the count is already on the
         card, and printing it twice tells a reader nothing the second time. */
      [...new Set(group.map((m) => districtLabel(m.listing.district)))].slice(0, 3).join(', '),
      `/phase1/homes/search?type=${encodeURIComponent(t)}${deal === 'sale' ? '&deal=sale' : ''}`,
    ))
    .sort(byCount);
}

/* --------------------------------------------------------------- intents */

/**
 * What people are actually looking for, expressed as searches that already
 * work. Each one is a filter combination, not a new concept — so the count is
 * exact and the page it opens is the ordinary search, already narrowed.
 *
 * An intent with nothing behind it is dropped rather than shown as zero.
 */
export interface Intent {
  label: string;
  hint: string;
  href: string;
  count: number;
}

export function intents(items: MarketListing[]): Intent[] {
  const rent = items.filter((m) => dealOf(m.listing) === 'rent');
  const sale = items.filter((m) => dealOf(m.listing) === 'sale');
  const near = (m: MarketListing) => stationOf(m.listing) !== null;

  const all: Intent[] = [
    {
      label: 'Family homes',
      hint: 'Three bedrooms and up, to rent',
      href: '/phase1/homes/search?beds=3',
      count: rent.filter((m) => m.listing.bedrooms >= 3).length,
    },
    {
      label: 'Near a station',
      hint: 'Homes whose agent named the nearest station',
      href: '/phase1/homes/explore#stations',
      count: rent.filter(near).length,
    },
    {
      label: 'Under S$3,000 a month',
      hint: 'The lower end of the rental market',
      href: '/phase1/homes/search?max=3000',
      count: rent.filter((m) => m.listing.monthlyRent > 0 && m.listing.monthlyRent <= 3000).length,
    },
    {
      label: 'Move in furnished',
      hint: 'Fully furnished rentals',
      href: '/phase1/homes/search?furnishing=Fully+furnished',
      count: rent.filter((m) => m.listing.furnishing === 'Fully furnished').length,
    },
    {
      label: 'Large homes',
      hint: '1,200 sqft and above',
      href: '/phase1/homes/search?sizeMin=1200',
      count: rent.filter((m) => m.listing.sizeSqft >= 1200).length,
    },
    {
      label: 'For sale',
      hint: 'Everything on the market to buy',
      href: '/phase1/homes/search?deal=sale',
      count: sale.length,
    },
  ];

  return all.filter((i) => i.count > 0);
}

/* ------------------------------------------------------------- summaries */

/**
 * What a set of homes is, in figures: how many, the cheapest, the dearest, the
 * middle, and the bedroom counts on offer.
 *
 * The middle is a median rather than a mean, because a single penthouse in a
 * set of eight flats drags a mean somewhere nobody can rent.
 */
export interface Spread {
  count: number;
  low: number;
  high: number;
  middle: number;
  beds: number[];
  deal: Deal;
}

/**
 * The spread for whichever side of the market this set is mostly made of.
 *
 * A district holding one rental and two sales was describing itself by the one
 * rental, under a heading that said three homes. Reporting the larger side
 * instead — and saying which side it is — makes the figures and the heading
 * agree.
 */
export function dominantSpread(items: MarketListing[]): Spread | null {
  const rent = items.filter((m) => dealOf(m.listing) === 'rent').length;
  const sale = items.length - rent;
  const first = sale > rent ? 'sale' : 'rent';
  return spread(items, first) ?? spread(items, first === 'rent' ? 'sale' : 'rent');
}

export function spread(items: MarketListing[], deal: Deal): Spread | null {
  const here = items.filter((m) => dealOf(m.listing) === deal && priceOf(m.listing) > 0);
  if (here.length === 0) return null;
  const prices = here.map((m) => priceOf(m.listing)).sort((a, b) => a - b);
  const mid = prices.length % 2
    ? prices[(prices.length - 1) / 2]
    : Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2);
  return {
    count: here.length,
    low: prices[0],
    high: prices[prices.length - 1],
    middle: mid,
    beds: [...new Set(here.map((m) => m.listing.bedrooms))].sort((a, b) => a - b),
    deal,
  };
}
