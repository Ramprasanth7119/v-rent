/**
 * Filtering, pricing and duplicate detection.
 *
 * A rental and a sale are the same record with a number three orders of
 * magnitude apart, which is where filtering quietly goes wrong: a price band
 * meant for rents silently excludes every sale, and nobody notices because the
 * list is not empty.
 */

import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, ListingFilters, activeCount, matches } from '../components/phase1/listing/filters';
import { comparablePrice, dealOf, priceLabel, priceOf, psf } from '../lib/phase1/pricing';
import { listingKey, unitKey } from '../lib/phase1/duplicates';
import { hammingDistance } from '../lib/phase1/photo-quality';
import type { DemoListing } from '../lib/phase1/data';

const TODAY = new Date('2026-08-28T09:00:00+08:00');

const listing = (over: Partial<DemoListing> = {}): DemoListing => ({
  id: 'lst-1',
  reference: 'VR-1',
  agent: 'Agent',
  project: 'The Sail @ Marina Bay',
  address: '2 Marina Boulevard',
  postalCode: '018987',
  unitNo: '#12-34',
  district: 1,
  propertyType: 'Condominium',
  bedrooms: 2,
  bathrooms: 2,
  sizeSqft: 900,
  monthlyRent: 4200,
  availableFrom: '2026-09-15',
  minLeaseMonths: 12,
  furnishing: 'Partially furnished',
  status: 'published',
  images: 3,
  createdAt: '2026-08-01',
  ...over,
});

const filters = (over: Partial<ListingFilters> = {}): ListingFilters => ({ ...EMPTY_FILTERS, ...over });

describe('sale and rent', () => {
  const rental = listing();
  const sale = listing({ dealType: 'sale', salePriceSgd: 1_850_000 });

  it('reads the right number for each', () => {
    expect(dealOf(rental)).toBe('rent');
    expect(priceOf(rental)).toBe(4200);
    expect(priceOf(sale)).toBe(1_850_000);
  });

  it('labels them the way each is spoken about', () => {
    expect(priceLabel(rental).suffix).toBe('/month');
    expect(priceLabel(sale).suffix).toBe('');
    expect(psf(rental)).toContain('per month');
    expect(psf(sale)).not.toContain('per month');
  });

  it('treats a record with no deal type as a rental', () => {
    // Everything written before the field existed is rental stock.
    expect(dealOf(listing({ dealType: undefined }))).toBe('rent');
  });

  it('brings both onto one scale for sorting a mixed list', () => {
    // Without this a single sale sits above every rental for ever.
    expect(comparablePrice(sale)).toBeLessThan(priceOf(sale));
    expect(comparablePrice(rental)).toBe(4200);
  });
});

describe('filters', () => {
  it('passes everything when nothing is set', () => {
    expect(matches(listing(), filters(), TODAY)).toBe(true);
    expect(activeCount(filters())).toBe(0);
  });

  it('compares a price within the kind of listing chosen', () => {
    const sale = listing({ dealType: 'sale', salePriceSgd: 1_850_000 });
    // Asking for sales between 1m and 2m must not be measured against a rent.
    const f = filters({ deal: 'sale', priceMin: '1000000', priceMax: '2000000' });
    expect(matches(sale, f, TODAY)).toBe(true);
    expect(matches(listing(), f, TODAY)).toBe(false); // a rental is excluded by deal anyway
  });

  it('narrows by bedrooms, with an open top end', () => {
    expect(matches(listing({ bedrooms: 5 }), filters({ beds: '5+' }), TODAY)).toBe(true);
    expect(matches(listing({ bedrooms: 6 }), filters({ beds: '5+' }), TODAY)).toBe(true);
    expect(matches(listing({ bedrooms: 4 }), filters({ beds: '5+' }), TODAY)).toBe(false);
    expect(matches(listing({ bedrooms: 2 }), filters({ beds: '2' }), TODAY)).toBe(true);
  });

  it('narrows by floor band, read from the unit number', () => {
    expect(matches(listing({ unitNo: '#03-01' }), filters({ floor: 'low' }), TODAY)).toBe(true);
    expect(matches(listing({ unitNo: '#12-34' }), filters({ floor: 'mid' }), TODAY)).toBe(true);
    expect(matches(listing({ unitNo: '#34-12' }), filters({ floor: 'high' }), TODAY)).toBe(true);
    expect(matches(listing({ unitNo: '#34-12' }), filters({ floor: 'low' }), TODAY)).toBe(false);
    // No floor to read means it cannot satisfy a floor filter.
    expect(matches(listing({ unitNo: '' }), filters({ floor: 'low' }), TODAY)).toBe(false);
  });

  it('narrows by when the unit is free', () => {
    const soon = listing({ availableFrom: '2026-09-10' });   // 13 days out
    const later = listing({ availableFrom: '2026-12-01' });  // beyond 90
    expect(matches(soon, filters({ available: '30' }), TODAY)).toBe(true);
    expect(matches(later, filters({ available: '30' }), TODAY)).toBe(false);
    expect(matches(later, filters({ available: '90' }), TODAY)).toBe(false);
  });

  it('counts what is narrowing the list', () => {
    expect(activeCount(filters({ beds: '2', deal: 'sale', priceMax: '5000' }))).toBe(3);
    // A min and a max are one idea, so they are one chip.
    expect(activeCount(filters({ priceMin: '1000', priceMax: '5000' }))).toBe(1);
  });
});

describe('duplicate detection', () => {
  it('identifies a unit by postal code and unit number, however written', () => {
    expect(unitKey(listing({ unitNo: '#12-34' }))).toBe(unitKey(listing({ unitNo: '12-34' })));
    expect(unitKey(listing({ unitNo: ' #12-34 ' }))).toBe('018987:12-34');
  });

  it('refuses to identify a unit with no unit number', () => {
    // A postal code alone is a whole block, which is exactly why the portals
    // require a unit number before calling a listing verified.
    expect(unitKey(listing({ unitNo: '' }))).toBeNull();
    expect(unitKey(listing({ postalCode: '' }))).toBeNull();
  });

  it('keys a listing by owner as well as id', () => {
    // Two agents seeded from the same set genuinely both hold `lst-1`; keying
    // on the id alone made each cancel the other out and no clash ever showed.
    expect(listingKey('owner-a', 'lst-1')).not.toBe(listingKey('owner-b', 'lst-1'));
  });
});

describe('perceptual hash distance', () => {
  it('is zero for the same hash and large for an unrelated one', () => {
    expect(hammingDistance('ffffffffffffffff', 'ffffffffffffffff')).toBe(0);
    expect(hammingDistance('ffffffffffffffff', '0000000000000000')).toBe(64);
  });

  it('counts single differing bits', () => {
    expect(hammingDistance('0000000000000001', '0000000000000000')).toBe(1);
    expect(hammingDistance('0000000000000003', '0000000000000000')).toBe(2);
  });

  it('refuses to compare hashes of different lengths', () => {
    expect(hammingDistance('ffff', 'ffffffffffffffff')).toBe(64);
  });
});
