/**
 * The Singapore-specific rules.
 *
 * Everything here encodes something about how property works in this country
 * rather than how our code is arranged, which is exactly the kind of thing that
 * gets quietly wrong and stays wrong: a postal sector mapped to the wrong
 * district looks fine on screen and misfiles every listing in that block.
 */

import { describe, expect, it } from 'vitest';
import { districtFromPostal, isPostalCode } from '../lib/phase1/onemap';
import { CEA_PATTERN, daysUntilExpiry, displayAgency, displayName } from '../lib/auth/cea';
import { floorOf } from '../components/phase1/listing/filters';
import type { DemoListing } from '../lib/phase1/data';

const listing = (over: Partial<DemoListing> = {}): DemoListing => ({
  id: 'lst-x',
  reference: 'VR-1',
  agent: 'Agent',
  project: 'Somewhere',
  address: '1 Somewhere Road',
  postalCode: '018987',
  unitNo: '#12-34',
  district: 1,
  propertyType: 'Condominium',
  bedrooms: 2,
  bathrooms: 2,
  sizeSqft: 900,
  monthlyRent: 4200,
  availableFrom: '2026-10-01',
  minLeaseMonths: 12,
  furnishing: 'Partially furnished',
  status: 'published',
  images: 3,
  createdAt: '2026-08-01',
  ...over,
});

describe('postal districts', () => {
  it('maps the sectors at the edges of the published table', () => {
    // One from each end, plus the three that are easy to misfile because they
    // sit out of numeric order in the official table.
    expect(districtFromPostal('018987')).toBe(1);   // sector 01, Marina Bay
    expect(districtFromPostal('119003')).toBe(5);   // sector 11, Pasir Panjang
    expect(districtFromPostal('428407')).toBe(15);  // sector 42, East Coast
    expect(districtFromPostal('760760')).toBe(27);  // sector 76, Yishun
    expect(districtFromPostal('799999')).toBe(28);  // sector 79, Seletar
  });

  it('knows the three sectors that break the numeric run', () => {
    // 81, 82 and 75/76 are the ones a naive "first two digits over five" rule
    // gets wrong.
    expect(districtFromPostal('810000')).toBe(17);
    expect(districtFromPostal('820000')).toBe(19);
    expect(districtFromPostal('750000')).toBe(27);
  });

  it('returns nothing for what is not a Singapore postal code', () => {
    expect(districtFromPostal('SW1A1AA')).toBe(0);
    expect(districtFromPostal('12345')).toBe(0);
    expect(districtFromPostal('740000')).toBe(0); // sector 74 is not allocated
    expect(districtFromPostal('')).toBe(0);
  });

  it('recognises the six-digit form', () => {
    expect(isPostalCode('018987')).toBe(true);
    expect(isPostalCode(' 018987 ')).toBe(true);
    expect(isPostalCode('18987')).toBe(false);
  });
});

describe('CEA register values', () => {
  it('accepts the registration number format and nothing else', () => {
    expect(CEA_PATTERN.test('R062805D')).toBe(true);
    expect(CEA_PATTERN.test('R06280D')).toBe(false);
    expect(CEA_PATTERN.test('r062805d')).toBe(false); // callers upper-case first
    expect(CEA_PATTERN.test('R0628055')).toBe(false);
  });

  it('title-cases a shouted register name without mangling it', () => {
    expect(displayName('WANG XUEDONG (JEREMY WANG)')).toBe('Wang Xuedong (Jeremy Wang)');
    expect(displayName("O'BRIEN MARY")).toBe("O'Brien Mary");
    expect(displayName('TAN SOO-LIN')).toBe('Tan Soo-Lin');
  });

  it('keeps the casing agencies actually use', () => {
    // The one name on the screen an agent is guaranteed to notice is their own
    // agency, and plain title case turns ERA into "Era".
    expect(displayAgency('PROPNEX REALTY PTE. LTD.')).toBe('PropNex Realty Pte. Ltd.');
    expect(displayAgency('ERA REALTY NETWORK PTE LTD')).toBe('ERA Realty Network Pte Ltd');
    expect(displayAgency('ORANGETEE & TIE PTE LTD')).toBe('OrangeTee & Tie Pte Ltd');
  });

  it('counts the days left on a registration in Singapore time', () => {
    const record = {
      name: 'X', registrationNo: 'R000000A', registrationStart: '2020-01-01',
      registrationEnd: '2026-12-31', agencyName: 'A', agencyLicenceNo: 'L1',
    };
    // Late on the last day is still the last day, not the day after.
    expect(daysUntilExpiry(record, new Date('2026-12-31T20:00:00+08:00'))).toBe(1);
    expect(daysUntilExpiry(record, new Date('2027-01-02T09:00:00+08:00'))).toBeLessThan(0);
    expect(daysUntilExpiry({ ...record, registrationEnd: '' })).toBeNull();
  });
});

describe('floor from the unit number', () => {
  it('reads the floor Singapore unit numbers already carry', () => {
    expect(floorOf(listing({ unitNo: '#12-34' }))).toBe(12);
    expect(floorOf(listing({ unitNo: '#02-15' }))).toBe(2);
    expect(floorOf(listing({ unitNo: '#09-241' }))).toBe(9);
    expect(floorOf(listing({ unitNo: '12-34' }))).toBe(12);
  });

  it('gives up rather than guessing', () => {
    expect(floorOf(listing({ unitNo: '' }))).toBeNull();
    expect(floorOf(listing({ unitNo: 'Penthouse' }))).toBeNull();
  });
});
