/**
 * The property type taxonomy.
 *
 * Two levels: the category a listing is filed under, and the exact
 * classification beside it. The tests that matter are about the seam between
 * them — the broad type stored on the listing has to stay correct, because
 * every filter, comparable set and report in the product reads it, and a
 * record saved before this taxonomy existed has to keep working.
 */

import { describe, expect, it } from 'vitest';
import {
  PROPERTY_CATEGORIES, broadTypeFor, categoriesIn, categoryFromBroad, categoryOf,
  isSubtypeOf, propertyTypeLabel, subtypesOf,
} from '../lib/phase1/property-types';

describe('the shape of the taxonomy', () => {
  it('splits into the two sectors an agent picks from', () => {
    expect(categoriesIn('Residential').map((c) => c.key)).toEqual(['hdb', 'condo', 'landed']);
    expect(categoriesIn('Commercial').map((c) => c.key)).toEqual(['retail', 'office', 'industrial', 'land']);
  });

  it('gives every category at least one subtype, so none opens empty', () => {
    for (const c of PROPERTY_CATEGORIES) {
      expect(subtypesOf(c.key).length).toBeGreaterThan(0);
    }
  });

  it('names no subtype twice inside a category', () => {
    for (const c of PROPERTY_CATEGORIES) {
      const all = subtypesOf(c.key);
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it('groups the HDB flat types by room count, which is how they are asked for', () => {
    const hdb = categoryOf('hdb')!;
    expect(hdb.groups.map((g) => g.label)).toEqual(['1 Room', '2 Room', '3 Room', '4 Room', '5 Room', 'Executive']);
    expect(isSubtypeOf('hdb', '4A')).toBe(false);
    expect(isSubtypeOf('hdb', '4 A')).toBe(true);
    expect(isSubtypeOf('hdb', 'Executive Maisonette')).toBe(true);
  });

  it('carries the landed and commercial types from the client\'s list', () => {
    expect(isSubtypeOf('landed', 'Good Class Bungalow')).toBe(true);
    expect(isSubtypeOf('retail', 'Medical Suite')).toBe(true);
    expect(isSubtypeOf('industrial', 'Light Industrial (B1)')).toBe(true);
    expect(isSubtypeOf('land', 'Land with Building / Enbloc')).toBe(true);
  });
});

describe('the broad type stored beside the subtype', () => {
  it('follows the category for most of them', () => {
    expect(broadTypeFor('hdb', '4 A')).toBe('HDB');
    expect(broadTypeFor('landed', 'Bungalow')).toBe('Landed');
    expect(broadTypeFor('retail', 'Mall Shop')).toBe('Commercial');
  });

  /* An EC prices differently from a private condominium and the product
     already tells them apart; the subtype must not collapse that. */
  it('keeps an executive condominium distinct from a private one', () => {
    expect(broadTypeFor('condo', 'Executive Condo')).toBe('Executive Condominium');
    expect(broadTypeFor('condo', 'Condo')).toBe('Condominium');
  });

  it('files walk-ups and serviced apartments as apartments', () => {
    expect(broadTypeFor('condo', 'Apartment')).toBe('Apartment');
    expect(broadTypeFor('condo', 'Walk-up')).toBe('Apartment');
    expect(broadTypeFor('condo', 'Service Apartment')).toBe('Apartment');
  });
});

describe('a listing saved before the taxonomy existed', () => {
  it('opens on the category it belongs to rather than the first one', () => {
    expect(categoryFromBroad('HDB')).toBe('hdb');
    expect(categoryFromBroad('Landed')).toBe('landed');
    expect(categoryFromBroad('Condominium')).toBe('condo');
    expect(categoryFromBroad('Executive Condominium')).toBe('condo');
    expect(categoryFromBroad('Apartment')).toBe('condo');
  });

  it('round-trips: a broad type becomes a category that stores the same broad type', () => {
    for (const broad of ['HDB', 'Landed', 'Condominium']) {
      const category = categoryFromBroad(broad);
      expect(broadTypeFor(category, subtypesOf(category)[0])).toBe(broad);
    }
  });
});

describe('how a type reads on screen', () => {
  it('prefixes a flat type, which means nothing on its own', () => {
    expect(propertyTypeLabel({ propertyType: 'HDB', propertySubtype: '4 A', propertyCategory: 'hdb' })).toBe('HDB 4 A');
  });

  it('leaves a type that already reads as one alone', () => {
    expect(propertyTypeLabel({ propertyType: 'Landed', propertySubtype: 'Good Class Bungalow', propertyCategory: 'landed' })).toBe('Good Class Bungalow');
  });

  it('falls back to the broad type when there is no subtype', () => {
    expect(propertyTypeLabel({ propertyType: 'Condominium' })).toBe('Condominium');
  });
});
