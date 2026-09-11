/**
 * Reading the spreadsheet an agent already keeps.
 *
 * A hand-rolled parser rather than a library, because the job is narrow and the
 * hard parts are few: quoted fields containing commas, doubled quotes inside a
 * quoted field, and newlines inside a quoted field. Those three are what break
 * naive `split(',')` on a real export from Excel, and they are handled here.
 *
 * Column names are matched loosely. An agent's file says "Postal Code", "postal
 * code" or "postal_code" depending on who made it, and none of those is worth
 * an error message.
 */

export type CsvRow = Record<string, string>;

/** Split a CSV document into rows of raw cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  // A byte-order mark at the front of an Excel export otherwise becomes part of
  // the first column name, and nothing matches it.
  const input = text.replace(/^﻿/, '');

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') { cell += '"'; i += 1; }
        else quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { row.push(cell); cell = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += ch;
  }

  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const normalise = (header: string) => header.trim().toLowerCase().replace(/[\s_-]+/g, '');

/**
 * What each column might be called. First match wins, so the most specific
 * spelling comes first.
 */
const ALIASES: Record<string, string[]> = {
  postal: ['postalcode', 'postal', 'zip', 'zipcode'],
  unit: ['unitno', 'unit', 'unitnumber', 'floorunit'],
  project: ['project', 'projectname', 'development', 'building', 'condo'],
  address: ['address', 'street', 'streetaddress'],
  beds: ['bedrooms', 'beds', 'bed', 'noofbedrooms'],
  baths: ['bathrooms', 'baths', 'bath', 'noofbathrooms'],
  sqft: ['sqft', 'size', 'floorarea', 'area', 'squarefeet', 'sizesqft'],
  rent: ['monthlyrent', 'rent', 'askingrent', 'price', 'monthlyprice'],
  salePrice: ['saleprice', 'askingprice', 'sellingprice'],
  deal: ['dealtype', 'listingtype', 'saleorrent', 'type', 'transactiontype'],
  propertyType: ['propertytype', 'housingtype', 'category'],
  furnishing: ['furnishing', 'furnished', 'furnishinglevel'],
  availableFrom: ['availablefrom', 'available', 'availability', 'movein'],
  description: ['description', 'remarks', 'notes', 'details'],
  tenure: ['tenure', 'ownership'],
  mrt: ['nearestmrt', 'mrt', 'station'],
};

/** Map the file's own headers onto the fields we understand. */
export function mapHeaders(headers: string[]): Record<string, number> {
  const found: Record<string, number> = {};
  const seen = headers.map(normalise);

  for (const [field, names] of Object.entries(ALIASES)) {
    for (const name of names) {
      const at = seen.indexOf(name);
      if (at !== -1) { found[field] = at; break; }
    }
  }
  return found;
}

/** Rows as named fields, with anything the file did not carry simply absent. */
export function readRows(text: string): { columns: string[]; rows: CsvRow[]; mapping: Record<string, number> } {
  const raw = parseCsv(text);
  if (raw.length === 0) return { columns: [], rows: [], mapping: {} };

  const [headers, ...body] = raw;
  const mapping = mapHeaders(headers);

  const rows = body.map((cells) => {
    const row: CsvRow = {};
    for (const [field, at] of Object.entries(mapping)) row[field] = (cells[at] ?? '').trim();
    return row;
  });

  return { columns: headers.map((h) => h.trim()), rows, mapping };
}

/** Digits only, so "S$4,200" and "4200.00" both arrive as 4200. */
export function toNumber(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.]/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}
