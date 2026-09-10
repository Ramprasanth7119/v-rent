/**
 * CEA Salesperson register lookup.
 *
 * This is a live call to the Council for Estate Agencies register published on
 * data.gov.sg. It is the real public source used by portals and by CEA itself,
 * refreshed three times a day, and it needs no API key or approval.
 *
 * Two things follow from how the dataset is published, and both matter to the
 * product:
 *
 * 1. Field filters must go in the `filters` JSON parameter. Bare query params
 *    are accepted and silently ignored, which looks like "no match found".
 * 2. Only currently registered salespersons appear. A registration that has
 *    lapsed disappears from the dataset entirely, so zero results means "not on
 *    the active register" — never "expired". We report it that way.
 */

const RESOURCE_ID = 'd_07c63be0f37e6e59c07a4ddc2fd87fcb';
const ENDPOINT = 'https://data.gov.sg/api/action/datastore_search';

/** CEA registration numbers are a letter, six digits and a check letter. */
export const CEA_PATTERN = /^[A-Z]\d{6}[A-Z]$/;

export interface CeaRecord {
  name: string;
  registrationNo: string;
  registrationStart: string;
  registrationEnd: string;
  agencyName: string;
  agencyLicenceNo: string;
}

export type CeaLookup =
  | { status: 'found'; record: CeaRecord; checkedAt: string }
  | { status: 'not_found'; registrationNo: string; checkedAt: string }
  | { status: 'unavailable'; reason: string; checkedAt: string };

interface RawRecord {
  salesperson_name?: string;
  registration_no?: string;
  registration_start_date?: string;
  registration_end_date?: string;
  estate_agent_name?: string;
  estate_agent_license_no?: string;
}

/**
 * The register stores names in upper case, often with a preferred name in
 * brackets: "WANG XUEDONG (JEREMY WANG)". Showing that verbatim on a profile
 * looks like shouting, so we title-case it while keeping the register value
 * available for the compliance record.
 */
export function displayName(registerName: string): string {
  return registerName
    .toLowerCase()
    .replace(/(^|[\s([\-/'])([a-z])/g, (_, lead: string, ch: string) => lead + ch.toUpperCase())
    .replace(/\b(S\/o|D\/o)\b/gi, (m) => m.toLowerCase())
    .replace(/(^|[^A-Za-z])Mc([a-z])/g, (_, lead: string, c: string) => lead + 'Mc' + c.toUpperCase())
    .trim();
}


/**
 * Agency names, the same way but with the casing real Singapore agencies use.
 * Plain title case turns ERA into "Era" and PropNex into "Propnex" - the one
 * name on the screen an agent is guaranteed to notice is wrong.
 */
const AGENCY_CASING: Record<string, string> = {
  propnex: 'PropNex',
  orangetee: 'OrangeTee',
  era: 'ERA',
  sri: 'SRI',
  plb: 'PLB',
  apac: 'APAC',
  jll: 'JLL',
  cbre: 'CBRE',
  hdb: 'HDB',
  sg: 'SG',
  llp: 'LLP',
};

export function displayAgency(registerName: string): string {
  return displayName(registerName)
    .split(' ')
    .map((word) => AGENCY_CASING[word.toLowerCase()] ?? word)
    .join(' ');
}

function toRecord(r: RawRecord): CeaRecord | null {
  if (!r.registration_no || !r.salesperson_name) return null;
  return {
    name: r.salesperson_name.trim(),
    registrationNo: r.registration_no.trim().toUpperCase(),
    registrationStart: (r.registration_start_date ?? '').trim(),
    registrationEnd: (r.registration_end_date ?? '').trim(),
    agencyName: (r.estate_agent_name ?? '').trim(),
    agencyLicenceNo: (r.estate_agent_license_no ?? '').trim(),
  };
}

async function query(filters: Record<string, string>, limit = 20): Promise<RawRecord[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set('resource_id', RESOURCE_ID);
  url.searchParams.set('filters', JSON.stringify(filters));
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    // The register changes three times a day; a short cache keeps a demo snappy
    // without ever showing yesterday's registration status.
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`register responded ${res.status}`);
  const body = (await res.json()) as { success?: boolean; result?: { records?: RawRecord[] } };
  if (!body.success) throw new Error('register rejected the query');
  return body.result?.records ?? [];
}

/** Look up one registration number on the active register. */
export async function lookupRegistration(input: string): Promise<CeaLookup> {
  const registrationNo = input.trim().toUpperCase();
  const checkedAt = new Date().toISOString();

  if (!CEA_PATTERN.test(registrationNo)) {
    return { status: 'not_found', registrationNo, checkedAt };
  }

  try {
    const records = await query({ registration_no: registrationNo }, 5);
    const record = records.map(toRecord).find((r): r is CeaRecord => r !== null);
    return record ? { status: 'found', record, checkedAt } : { status: 'not_found', registrationNo, checkedAt };
  } catch (err) {
    return { status: 'unavailable', reason: err instanceof Error ? err.message : 'lookup failed', checkedAt };
  }
}

/**
 * Free-text search, for an agent who does not have their number to hand.
 * `q` is the dataset's full-text search and is deliberately fuzzy, so results
 * are a shortlist to choose from, never an automatic match.
 */
export async function searchByName(term: string, limit = 8): Promise<CeaRecord[]> {
  const q = term.trim();
  if (q.length < 3) return [];
  const url = new URL(ENDPOINT);
  url.searchParams.set('resource_id', RESOURCE_ID);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(limit));

  try {
    const res = await fetch(url, { headers: { accept: 'application/json' }, next: { revalidate: 300 } });
    if (!res.ok) return [];
    const body = (await res.json()) as { result?: { records?: RawRecord[] } };
    return (body.result?.records ?? []).map(toRecord).filter((r): r is CeaRecord => r !== null);
  } catch {
    return [];
  }
}

/** Days until the registration lapses. Negative once it has. */
export function daysUntilExpiry(record: CeaRecord, now = new Date()): number | null {
  if (!record.registrationEnd) return null;
  const end = new Date(`${record.registrationEnd}T23:59:59+08:00`);
  if (Number.isNaN(end.getTime())) return null;
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
}
