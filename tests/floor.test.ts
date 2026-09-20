/**
 * The storey, and the unit number it is read from.
 *
 * These two belong in one test file because they are two halves of one
 * decision: the unit number identifies somebody's front door and does not
 * reach a tenant, the storey does, and the second is derived from the first
 * before the first is thrown away. Getting that wrong in either direction is
 * expensive — a leaked door number, or a floor filter that silently matches
 * nothing once a listing is published.
 */

import { describe, expect, it } from 'vitest';
import { FLOOR_BANDS, floorFromUnit, floorLabel, floorOf, inFloorBand } from '../lib/phase1/floor';

const at = (over: { unitNo?: string; floorLevel?: number }) => ({ unitNo: '', ...over });

describe('reading a storey from a unit number', () => {
  it('takes the part before the dash', () => {
    expect(floorFromUnit('#12-34')).toBe(12);
    expect(floorFromUnit('12-34')).toBe(12);
    expect(floorFromUnit('#02-15')).toBe(2);
    expect(floorFromUnit('#132-08')).toBe(132);
  });

  it('tolerates the ways agents type one', () => {
    expect(floorFromUnit('# 09 - 241')).toBe(9);
  });

  it('is null when the number carries no storey, rather than guessing at one', () => {
    for (const raw of ['', undefined, '—', '#—', 'Ground', 'B1-02']) {
      expect(floorFromUnit(raw)).toBeNull();
    }
  });
});

describe('a listing of either kind', () => {
  it('reads the storey off an agent\'s own record, which still has the unit number', () => {
    expect(floorOf(at({ unitNo: '#23-04' }))).toBe(23);
  });

  it('reads it off a published listing, whose unit number has been removed', () => {
    expect(floorOf(at({ unitNo: '', floorLevel: 23 }))).toBe(23);
  });

  it('prefers the carried figure, so the two can never disagree', () => {
    expect(floorOf(at({ unitNo: '#02-11', floorLevel: 23 }))).toBe(23);
  });

  it('is null for a landed home, which has neither', () => {
    expect(floorOf(at({}))).toBeNull();
    expect(floorLabel(at({}))).toBeNull();
  });
});

describe('the bands a tenant filters by', () => {
  it('sorts a storey into one band and no other', () => {
    for (const floor of [1, 5, 6, 20, 21, 40]) {
      const bands = (Object.keys(FLOOR_BANDS) as (keyof typeof FLOOR_BANDS)[]).filter((b) => FLOOR_BANDS[b].test(floor));
      expect(bands).toHaveLength(1);
    }
  });

  it('places the boundaries where the labels say they are', () => {
    expect(inFloorBand(at({ floorLevel: 5 }), 'low')).toBe(true);
    expect(inFloorBand(at({ floorLevel: 6 }), 'low')).toBe(false);
    expect(inFloorBand(at({ floorLevel: 20 }), 'mid')).toBe(true);
    expect(inFloorBand(at({ floorLevel: 21 }), 'high')).toBe(true);
  });

  it('keeps everything when no band is chosen', () => {
    expect(inFloorBand(at({}), 'any')).toBe(true);
  });

  /* A home whose storey is unknown must not be swept into a band. A tenant who
     asked for a high floor and is shown a terrace house has been misled by the
     filter, which is worse than being shown nothing. */
  it('excludes a home whose storey is unknown from every named band', () => {
    for (const band of ['low', 'mid', 'high'] as const) {
      expect(inFloorBand(at({}), band)).toBe(false);
    }
  });
});

describe('how a storey reads on screen', () => {
  it('is written as an ordinal', () => {
    expect(floorLabel(at({ floorLevel: 1 }))).toBe('1st floor');
    expect(floorLabel(at({ floorLevel: 2 }))).toBe('2nd floor');
    expect(floorLabel(at({ floorLevel: 3 }))).toBe('3rd floor');
    expect(floorLabel(at({ floorLevel: 4 }))).toBe('4th floor');
    expect(floorLabel(at({ floorLevel: 21 }))).toBe('21st floor');
  });

  it('gets the teens right, which is where this usually goes wrong', () => {
    expect(floorLabel(at({ floorLevel: 11 }))).toBe('11th floor');
    expect(floorLabel(at({ floorLevel: 12 }))).toBe('12th floor');
    expect(floorLabel(at({ floorLevel: 13 }))).toBe('13th floor');
  });
});
