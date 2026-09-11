/**
 * Reading the spreadsheet an agent actually has.
 *
 * Every case here is one that a naive `split(',')` gets wrong, and each of them
 * appears in a real export: a description containing a comma, a project name
 * containing a quotation mark, a cell with a line break in it, and a file that
 * Excel has stamped with a byte-order mark.
 */

import { describe, expect, it } from 'vitest';
import { mapHeaders, parseCsv, readRows, toNumber } from '../lib/phase1/csv';

describe('CSV parsing', () => {
  it('keeps a comma inside a quoted cell', () => {
    const rows = parseCsv('a,b\n"one, two",three');
    expect(rows[1]).toEqual(['one, two', 'three']);
  });

  it('reads a doubled quote as one quote', () => {
    const rows = parseCsv('name\n"The ""Sail"" @ Marina Bay"');
    expect(rows[1]).toEqual(['The "Sail" @ Marina Bay']);
  });

  it('keeps a newline inside a quoted cell', () => {
    const rows = parseCsv('desc,rent\n"Line one\nLine two",4200');
    expect(rows).toHaveLength(2);
    expect(rows[1][0]).toBe('Line one\nLine two');
    expect(rows[1][1]).toBe('4200');
  });

  it('survives Windows line endings and a byte-order mark', () => {
    const rows = parseCsv('﻿postal_code,rent\r\n018987,4200\r\n');
    expect(rows[0][0]).toBe('postal_code');
    expect(rows[1]).toEqual(['018987', '4200']);
  });

  it('drops blank lines rather than making empty rows', () => {
    expect(parseCsv('a,b\n\n1,2\n\n')).toHaveLength(2);
  });
});

describe('header matching', () => {
  it('accepts the spellings a real file uses', () => {
    const map = mapHeaders(['Postal Code', 'unit_no', 'PROJECT', 'Monthly Rent', 'No. of Bedrooms']);
    expect(map.postal).toBe(0);
    expect(map.unit).toBe(1);
    expect(map.project).toBe(2);
    expect(map.rent).toBe(3);
    expect(map.beds).toBe(4);
  });

  it('leaves a column it does not know out of the mapping', () => {
    const map = mapHeaders(['postal_code', 'agent_internal_ref']);
    expect(map.postal).toBe(0);
    expect(Object.values(map)).not.toContain(1);
  });
});

describe('reading rows', () => {
  it('returns named fields and the columns it ignored', () => {
    const { rows, mapping, columns } = readRows(
      'Postal Code,Unit No,Monthly Rent,Internal Code\n018987,#12-34,"S$4,200",XYZ',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].postal).toBe('018987');
    expect(rows[0].unit).toBe('#12-34');
    expect(toNumber(rows[0].rent)).toBe(4200);
    expect(columns).toHaveLength(4);
    // The internal column is not in the mapping, which is what lets the preview
    // name it rather than dropping it in silence.
    expect(Object.values(mapping)).not.toContain(3);
  });

  it('handles a file with headings and nothing under them', () => {
    expect(readRows('postal_code,unit_no').rows).toHaveLength(0);
  });
});

describe('numbers as agents write them', () => {
  it('reads money however it is formatted', () => {
    expect(toNumber('S$4,200')).toBe(4200);
    expect(toNumber('4200.00')).toBe(4200);
    expect(toNumber(' 1,850,000 ')).toBe(1850000);
  });

  it('is zero rather than NaN when there is nothing to read', () => {
    expect(toNumber('')).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber('n/a')).toBe(0);
  });
});
