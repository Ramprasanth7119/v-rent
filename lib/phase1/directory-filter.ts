/**
 * What the property directory is currently showing.
 *
 * Pulled out of the screen because two things now need the same answer: the
 * directory itself, and the PDF it prints. A printed list that quietly differs
 * from the list on screen is worse than no printing at all — the agent hands a
 * client a document they cannot reproduce — so both read the query from the
 * URL and run it through the one function here.
 *
 * Everything lives in the URL for the same reason. A filtered directory is
 * something an agent sends to a colleague, keeps in a tab, or prints an hour
 * later, and none of that works when the state is only in React.
 *
 * Pure: no fetching, no geocoding. The place name is resolved to a point by
 * the caller and handed in, because that is a network call and this is not.
 */

import type { MarketListing } from './marketplace';
import { DISTRICTS, districtCode } from './districts';
import { metresBetween } from './amenities';
import { inFloorBand, type FloorBand } from './floor';
import { dealOf } from './pricing';
import { formatDistance } from './nearby';

export type Sort = 'nearest' | 'newest' | 'price_asc' | 'price_desc' | 'size_desc';

export interface Centre { label: string; lat: number; lng: number }

export interface DirectoryQuery {
  /** What was typed: a place, a project, a postal code or an agent. */
  q: string;
  deal: 'any' | 'rent' | 'sale';
  type: string;
  district: string;
  beds: string;
  floor: FloorBand;
  /** Metres, used only when a place was found. */
  radius: number;
  /** Monthly rent for a letting, asking price for a sale. Empty means open. */
  priceMin: string;
  priceMax: string;
  sizeMin: string;
  mine: boolean;
  sort: Sort;
}

export const EMPTY_QUERY: DirectoryQuery = {
  q: '', deal: 'any', type: '', district: '', beds: 'any', floor: 'any',
  radius: 2000, priceMin: '', priceMax: '', sizeMin: '', mine: false, sort: 'newest',
};

export const RADII = [1000, 2000, 5000, 10_000];

export const SORTS: { value: Sort; label: string }[] = [
  { value: 'nearest', label: 'Nearest first' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'size_desc', label: 'Largest first' },
];

/**
 * A letting and a sale are priced in different units, so one price sort across
 * both would order three thousand a month against one and a half million. The
 * controls are offered only once a deal type narrows it to one scale.
 */
export const priceSortable = (q: DirectoryQuery) => q.deal !== 'any';

/** The figure the price filters and the price sort work on. */
export const priceOf = (l: MarketListing['listing']): number =>
  (dealOf(l) === 'sale' ? l.salePriceSgd ?? 0 : l.monthlyRent);

export interface Row { m: MarketListing; metres: number | null }

/**
 * The listings this query selects, in the order it asks for.
 *
 * With a place found, the ring decides what is in and the words are spent; the
 * place name has already done the filtering, and testing it against the text
 * as well would drop every listing whose address does not repeat it.
 */
export function applyDirectory(
  items: MarketListing[],
  q: DirectoryQuery,
  centre: Centre | null,
  viewerId: string | null,
): Row[] {
  const tokens = q.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const min = Number(q.priceMin) || 0;
  const max = Number(q.priceMax) || Infinity;
  const sizeMin = Number(q.sizeMin) || 0;
  const priced = priceSortable(q);

  const rows: Row[] = items.map((m) => ({
    m,
    metres: centre && m.listing.lat !== undefined && m.listing.lng !== undefined
      ? metresBetween(centre.lat, centre.lng, m.listing.lat, m.listing.lng)
      : null,
  }));

  const kept = rows
    .filter(({ m }) => q.deal === 'any' || dealOf(m.listing) === q.deal)
    .filter(({ m }) => !q.type || m.listing.propertyType === q.type)
    .filter(({ m }) => !q.district || String(m.listing.district) === q.district)
    .filter(({ m }) => q.beds === 'any' || (q.beds === '4+' ? m.listing.bedrooms >= 4 : m.listing.bedrooms === Number(q.beds)))
    .filter(({ m }) => inFloorBand(m.listing, q.floor))
    .filter(({ m }) => m.listing.sizeSqft >= sizeMin)
    /* Only where one scale is in play; see `priceSortable`. */
    .filter(({ m }) => !priced || (priceOf(m.listing) >= min && priceOf(m.listing) <= max))
    .filter(({ m }) => !q.mine || m.ownerId === viewerId)
    .filter(({ m, metres }) => {
      if (centre) return metres !== null && metres <= q.radius;
      if (!tokens.length) return true;
      const l = m.listing;
      const d = DISTRICTS[l.district];
      const hay = [
        l.project, l.address, l.postalCode, districtCode(l.district), d?.name, d?.areas,
        l.nearestMrt, l.propertyType, l.propertySubtype, m.agent.name, m.agent.agency,
      ].join(' ').toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });

  return sortRows(kept, q.sort, centre !== null);
}

const liveSince = (m: MarketListing) => m.listing.publishedAt ?? m.listing.createdAt;

/**
 * "Nearest first" without a place is not an order, so it falls back to newest
 * rather than leaving the list in whatever order it arrived.
 */
export function sortRows(rows: Row[], sort: Sort, haveCentre: boolean): Row[] {
  const out = [...rows];
  const effective: Sort = sort === 'nearest' && !haveCentre ? 'newest' : sort;

  switch (effective) {
    case 'nearest':
      return out.sort((a, b) => (a.metres ?? Infinity) - (b.metres ?? Infinity));
    case 'price_asc':
      return out.sort((a, b) => priceOf(a.m.listing) - priceOf(b.m.listing));
    case 'price_desc':
      return out.sort((a, b) => priceOf(b.m.listing) - priceOf(a.m.listing));
    case 'size_desc':
      return out.sort((a, b) => b.m.listing.sizeSqft - a.m.listing.sizeSqft);
    default:
      return out.sort((a, b) => liveSince(b.m).localeCompare(liveSince(a.m)));
  }
}

/* ------------------------------------------------------------------- URL */

/** Only what differs from the default, so a plain directory has a plain link. */
export function queryToParams(q: DirectoryQuery, centre: Centre | null): URLSearchParams {
  const p = new URLSearchParams();
  const set = (k: string, v: string | number | boolean, fallback: string | number | boolean) => {
    if (String(v) !== String(fallback)) p.set(k, String(v));
  };
  set('q', q.q, '');
  set('deal', q.deal, 'any');
  set('type', q.type, '');
  set('district', q.district, '');
  set('beds', q.beds, 'any');
  set('floor', q.floor, 'any');
  set('radius', q.radius, EMPTY_QUERY.radius);
  set('min', q.priceMin, '');
  set('max', q.priceMax, '');
  set('size', q.sizeMin, '');
  set('mine', q.mine, false);
  set('sort', q.sort, 'newest');

  /* The resolved point travels with the link so the printed document does not
     have to geocode again — and cannot land somewhere else if it did. */
  if (centre) {
    p.set('lat', centre.lat.toFixed(6));
    p.set('lng', centre.lng.toFixed(6));
    p.set('place', centre.label);
  }
  return p;
}

const num = (v: string | null, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export function queryFromParams(p: URLSearchParams): { query: DirectoryQuery; centre: Centre | null } {
  const deal = p.get('deal');
  const sort = p.get('sort');
  const floor = p.get('floor');

  const query: DirectoryQuery = {
    q: (p.get('q') ?? '').slice(0, 120),
    deal: deal === 'rent' || deal === 'sale' ? deal : 'any',
    type: (p.get('type') ?? '').slice(0, 60),
    district: /^\d{1,2}$/.test(p.get('district') ?? '') ? p.get('district')! : '',
    beds: ['1', '2', '3', '4+'].includes(p.get('beds') ?? '') ? p.get('beds')! : 'any',
    floor: ['low', 'mid', 'high'].includes(floor ?? '') ? (floor as FloorBand) : 'any',
    radius: num(p.get('radius'), EMPTY_QUERY.radius),
    priceMin: (p.get('min') ?? '').replace(/\D/g, ''),
    priceMax: (p.get('max') ?? '').replace(/\D/g, ''),
    sizeMin: (p.get('size') ?? '').replace(/\D/g, ''),
    mine: p.get('mine') === 'true',
    sort: SORTS.some((s) => s.value === sort) ? (sort as Sort) : 'newest',
  };

  const lat = Number(p.get('lat'));
  const lng = Number(p.get('lng'));
  const centre = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
    ? { label: (p.get('place') ?? '').slice(0, 120) || 'the chosen place', lat, lng }
    : null;

  return { query, centre };
}

/* ----------------------------------------------------------- description */

const sgd = (n: number) => `S$${n.toLocaleString('en-SG')}`;

/**
 * The query in words, for the chips on screen and the cover of the PDF.
 *
 * A printed list has to say what it is a list of. "42 properties" on its own
 * is a document nobody can check a week later.
 */
export function describeQuery(q: DirectoryQuery, centre: Centre | null): string[] {
  const out: string[] = [];
  if (centre) out.push(`Within ${formatDistance(q.radius)} of ${centre.label}`);
  else if (q.q.trim()) out.push(`Matching “${q.q.trim()}”`);
  if (q.deal !== 'any') out.push(q.deal === 'sale' ? 'For sale' : 'To rent');
  if (q.type) out.push(q.type);
  if (q.district) out.push(`${districtCode(Number(q.district))} ${DISTRICTS[Number(q.district)]?.name ?? ''}`.trim());
  if (q.beds !== 'any') out.push(`${q.beds} bedrooms`);
  if (q.floor !== 'any') out.push(`${q.floor} floor`);
  if (q.sizeMin) out.push(`${Number(q.sizeMin).toLocaleString('en-SG')} sqft or larger`);
  if (priceSortable(q) && (q.priceMin || q.priceMax)) {
    const unit = q.deal === 'rent' ? ' a month' : '';
    if (q.priceMin && q.priceMax) out.push(`${sgd(Number(q.priceMin))} to ${sgd(Number(q.priceMax))}${unit}`);
    else if (q.priceMin) out.push(`${sgd(Number(q.priceMin))}${unit} and above`);
    else out.push(`Up to ${sgd(Number(q.priceMax))}${unit}`);
  }
  if (q.mine) out.push('Your listings only');
  return out;
}

/** The order, in words, for the same two places. */
export const sortLabel = (sort: Sort, haveCentre: boolean): string =>
  SORTS.find((s) => s.value === (sort === 'nearest' && !haveCentre ? 'newest' : sort))?.label ?? 'Newest first';
