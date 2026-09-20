/**
 * What kind of property this is, as Singapore actually classifies them.
 *
 * The product used to carry five words — condominium, HDB, apartment, landed,
 * executive condominium — which is roughly what a portal shows a tenant and
 * nowhere near what an agent needs to write down. An HDB flat is not "an HDB
 * flat": it is a 4A or a 5I or an Executive Maisonette, and those are different
 * homes with different layouts, different sizes and different rents. An agent
 * asked to file all of them under "HDB" has been asked to throw away the one
 * fact their client cares about.
 *
 * So the taxonomy has two levels. The category is what filters and reports
 * group by and what the rest of the product already understands; the subtype is
 * the exact classification, carried alongside it.
 *
 * Structured the way the picker reads: a column of categories, and within a
 * category the subtypes in named groups where there are enough of them to need
 * them (the HDB flat types) or a flat list where there are not.
 *
 * Pure data. No imports, so the browser, the routes and the report share it.
 */

export type PropertyCategory = 'hdb' | 'condo' | 'landed' | 'retail' | 'office' | 'industrial' | 'land';

export type PropertySector = 'Residential' | 'Commercial';

export interface PropertySubtypeGroup {
  /** "3 Room", "Executive". Absent where the category needs no grouping. */
  label?: string;
  items: string[];
}

export interface PropertyCategoryDef {
  key: PropertyCategory;
  label: string;
  sector: PropertySector;
  /**
   * The broad type the rest of the product stores on a listing, so existing
   * filters, reports and comparables keep working while the subtype adds
   * detail rather than replacing it.
   */
  broad: 'HDB' | 'Condominium' | 'Apartment' | 'Executive Condominium' | 'Landed' | 'Commercial';
  groups: PropertySubtypeGroup[];
}

export const PROPERTY_CATEGORIES: PropertyCategoryDef[] = [
  {
    key: 'hdb',
    label: 'HDB',
    sector: 'Residential',
    broad: 'HDB',
    groups: [
      { label: '1 Room', items: ['Studio', '1 Generic'] },
      { label: '2 Room', items: ['2 Generic', '2 STD', '2 I', '2 A', '2 Premium'] },
      { label: '3 Room', items: ['3 Generic', '3 STD', '3 I', '3 NG', '3 S', '3 A', '3 Premium'] },
      { label: '4 Room', items: ['4 Generic', '4 STD', '4 I', '4 NG', '4 S', '4 A', '4 Premium', 'Special S1'] },
      { label: '5 Room', items: ['5 Generic', '5 STD', '5 I', '5 A', '5 A (Maisonette)', '5 Premium', 'Special S2'] },
      {
        label: 'Executive',
        items: [
          '6 Premium', 'Executive Apartment', 'Executive Maisonette', 'Terrace',
          'Jumbo 2', 'Jumbo 3', 'Jumbo 4', 'Jumbo 5', 'Jumbo 6', 'Jumbo 7',
        ],
      },
    ],
  },
  {
    key: 'condo',
    label: 'Condo',
    sector: 'Residential',
    broad: 'Condominium',
    groups: [{ items: ['Condo', 'Walk-up', 'Apartment', 'Executive Condo', 'Service Apartment'] }],
  },
  {
    key: 'landed',
    label: 'Landed',
    sector: 'Residential',
    broad: 'Landed',
    groups: [{
      items: [
        'Terraced House', 'Corner Terrace', 'Semi-Detached House', 'Bungalow', 'Good Class Bungalow',
        'Shophouse', 'Conservation House', 'Townhouse', 'Cluster House', 'Land Only',
      ],
    }],
  },
  {
    key: 'retail',
    label: 'Retail',
    sector: 'Commercial',
    broad: 'Commercial',
    groups: [{ items: ['Food & Beverage', 'Mall Shop', 'Shop / Shophouse', 'Medical Suite', 'Other Retail'] }],
  },
  {
    key: 'office',
    label: 'Office',
    sector: 'Commercial',
    broad: 'Commercial',
    groups: [{ items: ['Office', 'Business Park', 'Co-working', 'Medical Suite', 'Other Office'] }],
  },
  {
    key: 'industrial',
    label: 'Industrial',
    sector: 'Commercial',
    broad: 'Commercial',
    groups: [{
      items: ['Dormitory', 'Factory / Workshop (B2)', 'Light Industrial (B1)', 'Warehouse', 'Food & Beverage', 'Showroom', 'e-Business'],
    }],
  },
  {
    key: 'land',
    label: 'Land',
    sector: 'Commercial',
    broad: 'Commercial',
    groups: [{ items: ['Land with Building / Enbloc', 'Land Only'] }],
  },
];

export const SECTORS: PropertySector[] = ['Residential', 'Commercial'];

export const categoriesIn = (sector: PropertySector) =>
  PROPERTY_CATEGORIES.filter((c) => c.sector === sector);

export const categoryOf = (key: string): PropertyCategoryDef | undefined =>
  PROPERTY_CATEGORIES.find((c) => c.key === key);

/** Every subtype in a category, flattened — for validation and for counting. */
export const subtypesOf = (key: PropertyCategory): string[] =>
  categoryOf(key)?.groups.flatMap((g) => g.items) ?? [];

export const isSubtypeOf = (key: PropertyCategory, subtype: string): boolean =>
  subtypesOf(key).includes(subtype);

/**
 * The broad type to store beside the subtype.
 *
 * Two subtypes carry their own broad type rather than their category's, because
 * the product already distinguishes them and a comparable set that mixed an
 * executive condominium with a private one would be wrong: an EC has an
 * eligibility period and prices differently for it.
 */
export function broadTypeFor(key: PropertyCategory, subtype?: string): PropertyCategoryDef['broad'] {
  if (key === 'condo') {
    if (subtype === 'Executive Condo') return 'Executive Condominium';
    if (subtype === 'Apartment' || subtype === 'Walk-up' || subtype === 'Service Apartment') return 'Apartment';
    return 'Condominium';
  }
  return categoryOf(key)?.broad ?? 'Condominium';
}

/**
 * The category a listing saved before this taxonomy existed belongs to.
 *
 * Old records carry only the broad type, so the picker has to open somewhere
 * sensible when one of them is edited rather than defaulting to HDB and
 * quietly re-filing a condominium.
 */
export function categoryFromBroad(broad: string): PropertyCategory {
  switch (broad) {
    case 'HDB': return 'hdb';
    case 'Landed': return 'landed';
    case 'Commercial': return 'retail';
    default: return 'condo';
  }
}

/** How a type reads on a listing: the subtype where there is one. */
export function propertyTypeLabel(listing: { propertyType: string; propertySubtype?: string; propertyCategory?: string }): string {
  if (!listing.propertySubtype) return listing.propertyType;
  const category = listing.propertyCategory ? categoryOf(listing.propertyCategory) : undefined;
  /* "HDB 4A" rather than "4A", which on its own means nothing outside the
     context of a flat; a condominium subtype already reads as a type. */
  return category?.key === 'hdb' ? `HDB ${listing.propertySubtype}` : listing.propertySubtype;
}
