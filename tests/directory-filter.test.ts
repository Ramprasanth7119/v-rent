/**
 * The directory's filters, sorting and its URL.
 *
 * Two screens now run this: the directory and the PDF it prints. The thing
 * worth guarding is that they cannot disagree — which means the query has to
 * survive a round trip through a link intact, and the same query has to select
 * the same properties either side of it.
 */

import { describe, expect, it } from 'vitest';
import type { MarketListing } from '../lib/phase1/marketplace';
import {
  EMPTY_QUERY, MAX_PICKS, applyDirectory, applyPicks, describeQuery, picksFromParams,
  picksToParam, priceSortable, queryFromParams, queryToParams, rowKey, sortLabel,
  type DirectoryQuery,
} from '../lib/phase1/directory-filter';

/* Singapore, roughly: Tiong Bahru, then about 1.2 km and about 9 km away. */
const TIONG_BAHRU = { label: 'Tiong Bahru', lat: 1.2859, lng: 103.8267 };

const listing = (over: Record<string, unknown> = {}) => ({
  id: 'lst-1', reference: 'VR-1', project: 'Alpha', address: '1 Road', postalCode: '100001',
  district: 3, lat: 1.2859, lng: 103.8267, propertyType: 'Condominium', bedrooms: 2, bathrooms: 2,
  sizeSqft: 850, dealType: 'rent', monthlyRent: 4000, salePriceSgd: undefined, availableFrom: '2026-10-01',
  minLeaseMonths: 12, furnishing: 'Partially furnished', status: 'published', images: 1,
  createdAt: '2026-01-01', publishedAt: '2026-01-01', unitNo: '#12-01',
  ...over,
}) as unknown as MarketListing['listing'];

const item = (over: Record<string, unknown> = {}, agent: Record<string, unknown> = {}, ownerId = 'other'): MarketListing =>
  ({
    ownerId,
    listing: listing(over),
    agent: { id: ownerId, name: 'Jane Tan', agency: 'PropNex', mobile: '', email: '', ceaNumber: '' },
    photos: [], thumbs: [],
  }) as unknown as MarketListing;

const q = (over: Partial<DirectoryQuery> = {}): DirectoryQuery => ({ ...EMPTY_QUERY, ...over });

describe('selecting', () => {
  const items = [
    item({ id: 'a', project: 'Alpha', monthlyRent: 3000, sizeSqft: 600, bedrooms: 1 }),
    item({ id: 'b', project: 'Beta', monthlyRent: 8000, sizeSqft: 1400, bedrooms: 3, district: 9 }),
    item({ id: 'c', project: 'Gamma', dealType: 'sale', monthlyRent: 0, salePriceSgd: 1_800_000 }),
  ];
  const ids = (rows: { m: MarketListing }[]) => rows.map((r) => r.m.listing.id);

  it('keeps everything when nothing is asked', () => {
    expect(applyDirectory(items, q(), null, null)).toHaveLength(3);
  });

  it('separates a letting from a sale', () => {
    expect(ids(applyDirectory(items, q({ deal: 'sale' }), null, null))).toEqual(['c']);
  });

  it('matches a project by name', () => {
    expect(ids(applyDirectory(items, q({ q: 'beta' }), null, null))).toEqual(['b']);
  });

  it('matches the agent as well as the property', () => {
    expect(applyDirectory(items, q({ q: 'propnex' }), null, null)).toHaveLength(3);
  });

  it('filters on floor area', () => {
    expect(ids(applyDirectory(items, q({ sizeMin: '1000' }), null, null))).toEqual(['b']);
  });

  /* A rent and an asking price are not the same number, so the price filter
     only applies once one of the two has been chosen. */
  it('ignores a price range while rent and sale are mixed', () => {
    expect(applyDirectory(items, q({ priceMax: '5000' }), null, null)).toHaveLength(3);
    expect(ids(applyDirectory(items, q({ deal: 'rent', priceMax: '5000' }), null, null))).toEqual(['a']);
  });

  it('shows only the viewer’s own when asked', () => {
    const mine = [...items, item({ id: 'mine' }, {}, 'me')];
    expect(ids(applyDirectory(mine, q({ mine: true }), null, 'me'))).toEqual(['mine']);
  });
});

describe('a place, rather than a word', () => {
  const near = item({ id: 'near', lat: 1.2859, lng: 103.8267 });
  /* About 9 km north-east. */
  const far = item({ id: 'far', project: 'Faraway', lat: 1.3521, lng: 103.8698 });

  it('keeps what is inside the ring and drops what is not', () => {
    const rows = applyDirectory([near, far], q({ radius: 2000, sort: 'nearest' }), TIONG_BAHRU, null);
    expect(rows.map((r) => r.m.listing.id)).toEqual(['near']);
  });

  it('widens with the radius', () => {
    const rows = applyDirectory([near, far], q({ radius: 10_000, sort: 'nearest' }), TIONG_BAHRU, null);
    expect(rows).toHaveLength(2);
    expect(rows[0].m.listing.id).toBe('near');
    expect(rows[0].metres).toBeLessThan(rows[1].metres!);
  });

  /* The place has already done the filtering. Testing the words as well would
     drop every property whose address does not happen to repeat the name. */
  it('does not also require the words to match the address', () => {
    const rows = applyDirectory([far], q({ q: 'Tiong Bahru', radius: 10_000 }), TIONG_BAHRU, null);
    expect(rows).toHaveLength(1);
  });
});

describe('ordering', () => {
  const items = [
    item({ id: 'mid', monthlyRent: 5000, sizeSqft: 900, publishedAt: '2026-02-01' }),
    item({ id: 'cheap', monthlyRent: 2000, sizeSqft: 500, publishedAt: '2026-03-01' }),
    item({ id: 'dear', monthlyRent: 9000, sizeSqft: 1800, publishedAt: '2026-01-01' }),
  ];
  const ids = (sort: DirectoryQuery['sort']) =>
    applyDirectory(items, q({ sort, deal: 'rent' }), null, null).map((r) => r.m.listing.id);

  it('sorts low to high and high to low', () => {
    expect(ids('price_asc')).toEqual(['cheap', 'mid', 'dear']);
    expect(ids('price_desc')).toEqual(['dear', 'mid', 'cheap']);
  });

  it('sorts newest and largest', () => {
    expect(ids('newest')).toEqual(['cheap', 'mid', 'dear']);
    expect(ids('size_desc')).toEqual(['dear', 'mid', 'cheap']);
  });

  /* "Nearest" with nowhere to be near is not an order. */
  it('falls back to newest when nothing has been searched for', () => {
    expect(ids('nearest')).toEqual(['cheap', 'mid', 'dear']);
    expect(sortLabel('nearest', false)).toBe('Newest first');
    expect(sortLabel('nearest', true)).toBe('Nearest first');
  });
});

describe('the link', () => {
  it('writes nothing for a directory with nothing set', () => {
    expect(queryToParams(EMPTY_QUERY, null).toString()).toBe('');
  });

  it('survives a round trip', () => {
    const original = q({
      q: 'Tiong Bahru', deal: 'sale', type: 'Condominium', district: '3', beds: '3',
      floor: 'high', radius: 5000, priceMin: '900000', priceMax: '2000000', sizeMin: '800',
      mine: true, sort: 'price_desc',
    });
    const params = queryToParams(original, TIONG_BAHRU);
    const { query, centre } = queryFromParams(params);
    expect(query).toEqual(original);
    expect(centre?.label).toBe('Tiong Bahru');
    expect(centre?.lat).toBeCloseTo(TIONG_BAHRU.lat, 5);
  });

  /* Everything in the URL came from somewhere else and is not to be trusted. */
  it('discards nonsense rather than carrying it through', () => {
    const { query, centre } = queryFromParams(new URLSearchParams(
      'deal=maybe&beds=99&floor=basement&district=abc&sort=whatever&min=1e9&lat=nope',
    ));
    expect(query.deal).toBe('any');
    expect(query.beds).toBe('any');
    expect(query.floor).toBe('any');
    expect(query.district).toBe('');
    expect(query.sort).toBe('newest');
    expect(query.priceMin).toBe('19');
    expect(centre).toBeNull();
  });
});

describe('saying what the list is', () => {
  it('describes a place search as a ring', () => {
    expect(describeQuery(q({ radius: 1000 }), TIONG_BAHRU)[0]).toContain('Tiong Bahru');
  });

  it('states a rent range with its unit', () => {
    const lines = describeQuery(q({ deal: 'rent', priceMin: '3000', priceMax: '6000' }), null);
    expect(lines).toContain('S$3,000 to S$6,000 a month');
  });

  it('leaves a price range out while it does not apply', () => {
    expect(priceSortable(q())).toBe(false);
    expect(describeQuery(q({ priceMin: '3000' }), null)).toEqual([]);
  });
});

/**
 * Ticking properties is a separate question from filtering them, and the
 * answer has to reach the printed document unchanged — the agent is handing
 * somebody these six and not the other seventeen.
 */
describe('a hand-picked set', () => {
  const rows = applyDirectory(
    [item({ id: 'a' }, {}, 'agt-1'), item({ id: 'b' }, {}, 'agt-1'), item({ id: 'c' }, {}, 'agt-2')],
    q(), null, null,
  );
  const ids = (rs: typeof rows) => rs.map((r) => r.m.listing.id).sort();

  /* Two agents can mint the same listing id inside their own workspaces. */
  it('names a property by its owner as well as its id', () => {
    expect(rowKey(rows[0].m)).toContain('/');
    expect(new Set(rows.map((r) => rowKey(r.m))).size).toBe(3);
  });

  it('narrows to what was ticked', () => {
    const picks = new Set([rowKey(rows[0].m), rowKey(rows[2].m)]);
    expect(ids(applyPicks(rows, picks))).toEqual(['a', 'c']);
  });

  it('leaves the list alone when nothing was ticked', () => {
    expect(applyPicks(rows, new Set())).toHaveLength(3);
  });

  /* A link that lists every property says nothing the filters did not, and it
     would go stale the moment another agent published. */
  it('writes no selection when everything is ticked', () => {
    const all = new Set(rows.map((r) => rowKey(r.m)));
    expect(picksToParam(all, 3)).toBe('');
    expect(picksToParam(new Set(), 3)).toBe('');
  });

  it('survives a round trip', () => {
    const picks = new Set([rowKey(rows[0].m), rowKey(rows[2].m)]);
    const params = new URLSearchParams({ pick: picksToParam(picks, 3) });
    expect(ids(applyPicks(rows, picksFromParams(params)))).toEqual(['a', 'c']);
  });

  it('reads an empty or absent selection as none', () => {
    expect(picksFromParams(new URLSearchParams()).size).toBe(0);
    expect(picksFromParams(new URLSearchParams('pick=')).size).toBe(0);
    expect(picksFromParams(new URLSearchParams('pick=,,')).size).toBe(0);
  });

  /* The selection rides in a URL, which has a practical ceiling. */
  it('carries no more than the cap, however many arrive', () => {
    const many = Array.from({ length: MAX_PICKS + 20 }, (_, i) => `agt-1/lst-${i}`);
    expect(picksFromParams(new URLSearchParams({ pick: many.join(',') })).size).toBe(MAX_PICKS);
    expect(picksToParam(new Set(many), 999).split(',')).toHaveLength(MAX_PICKS);
  });
});
