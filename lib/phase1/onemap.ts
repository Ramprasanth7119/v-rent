/**
 * Address lookup against OneMap, the Singapore Land Authority's map service.
 *
 * Official, free, and the only source that knows Singapore postal codes and
 * districts properly — a global geocoder will happily place a six-digit postal
 * code in the wrong country. A postal code identifies a building here, not a
 * street, which is why entering one can fill in the address, the project and
 * the district with no further typing.
 *
 * The search endpoint answers without a token today and warns that one is
 * expected. Production registers a free account at onemap.gov.sg and sends the
 * token; that is the only change, and it lives in `authHeaders` below.
 */

const ENDPOINT = 'https://www.onemap.gov.sg/api/common/elastic/search';
const STATIC_MAP = 'https://www.onemap.gov.sg/api/staticmap/getStaticImage';

export interface AddressMatch {
  /** "2 MARINA BOULEVARD THE SAIL @ MARINA BAY SINGAPORE 018987" */
  label: string;
  /** The street address alone, without the building or the postal code. */
  street: string;
  postal: string;
  /** The building or development name, where OneMap knows one. */
  project: string;
  district: number;
  lat?: number;
  lng?: number;
}

/**
 * Singapore's 28 postal districts, from the first two digits of the postal
 * code. This is the published sector table — the districts every listing
 * portal, valuation and lease refers to — and it does not change.
 */
const DISTRICT_BY_SECTOR: Record<string, number> = {};
const SECTORS: [number, string[]][] = [
  [1, ['01', '02', '03', '04', '05', '06']],
  [2, ['07', '08']],
  [3, ['14', '15', '16']],
  [4, ['09', '10']],
  [5, ['11', '12', '13']],
  [6, ['17']],
  [7, ['18', '19']],
  [8, ['20', '21']],
  [9, ['22', '23']],
  [10, ['24', '25', '26', '27']],
  [11, ['28', '29', '30']],
  [12, ['31', '32', '33']],
  [13, ['34', '35', '36', '37']],
  [14, ['38', '39', '40', '41']],
  [15, ['42', '43', '44', '45']],
  [16, ['46', '47', '48']],
  [17, ['49', '50', '81']],
  [18, ['51', '52']],
  [19, ['53', '54', '55', '82']],
  [20, ['56', '57']],
  [21, ['58', '59']],
  [22, ['60', '61', '62', '63', '64']],
  [23, ['65', '66', '67', '68']],
  [24, ['69', '70', '71']],
  [25, ['72', '73']],
  [26, ['77', '78']],
  [27, ['75', '76']],
  [28, ['79', '80']],
];
for (const [district, sectors] of SECTORS) {
  for (const sector of sectors) DISTRICT_BY_SECTOR[sector] = district;
}

/** The postal district for a six-digit code, or 0 when it is not a real sector. */
export function districtFromPostal(postal: string): number {
  const digits = postal.replace(/\D/g, '');
  if (digits.length !== 6) return 0;
  return DISTRICT_BY_SECTOR[digits.slice(0, 2)] ?? 0;
}

export const isPostalCode = (value: string) => /^\d{6}$/.test(value.trim());

interface OneMapResult {
  SEARCHVAL?: string;
  BLK_NO?: string;
  ROAD_NAME?: string;
  BUILDING?: string;
  ADDRESS?: string;
  POSTAL?: string;
  LATITUDE?: string;
  LONGITUDE?: string;
}

function authHeaders(): HeadersInit {
  const token = process.env.ONEMAP_TOKEN;
  return token ? { authorization: `Bearer ${token}`, accept: 'application/json' } : { accept: 'application/json' };
}

/** Title case, because OneMap shouts every address. */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s(/-])([a-z])/g, (_, lead: string, ch: string) => lead + ch.toUpperCase())
    .replace(/\bMrt\b/g, 'MRT')
    .replace(/\bHdb\b/g, 'HDB')
    .trim();
}

function toMatch(r: OneMapResult): AddressMatch | null {
  const postal = (r.POSTAL ?? '').trim();
  // OneMap returns "NIL" for records with no postal code — a park, a junction.
  // Those are not places a listing can sit.
  if (!postal || !/^\d{6}$/.test(postal)) return null;

  const building = (r.BUILDING ?? '').trim();
  const street = titleCase([r.BLK_NO, r.ROAD_NAME].filter(Boolean).join(' '));
  const named = building && building !== 'NIL' ? titleCase(building) : street;

  return {
    label: titleCase(r.ADDRESS ?? `${street} Singapore ${postal}`),
    street,
    postal,
    project: named,
    district: districtFromPostal(postal),
    lat: r.LATITUDE ? Number(r.LATITUDE) : undefined,
    lng: r.LONGITUDE ? Number(r.LONGITUDE) : undefined,
  };
}

/**
 * Search by postal code, block and street, or building name.
 *
 * Never throws: an address lookup that fails should leave the agent typing,
 * not staring at an error. The caller decides what to say about an empty list.
 */
export async function searchAddress(term: string, limit = 8): Promise<AddressMatch[]> {
  const searchVal = term.trim();
  if (searchVal.length < 3) return [];

  const url = new URL(ENDPOINT);
  url.searchParams.set('searchVal', searchVal);
  url.searchParams.set('returnGeom', 'Y');
  url.searchParams.set('getAddrDetails', 'Y');
  url.searchParams.set('pageNum', '1');

  try {
    const res = await fetch(url, {
      headers: authHeaders(),
      // Deliberately uncached. Addresses do not move, but caching by URL also
      // caches an empty or failed answer, and a lookup that transiently failed
      // would then keep failing for that postal code for a whole day.
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { results?: OneMapResult[] };
    const seen = new Set<string>();
    return (body.results ?? [])
      .map(toMatch)
      .filter((m): m is AddressMatch => m !== null)
      // One building can appear once per unit block; the agent wants the building.
      .filter((m) => (seen.has(m.postal) ? false : (seen.add(m.postal), true)))
      .slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * A map image of one point, drawn by OneMap.
 *
 * A picture rather than an interactive map on purpose: it needs no map library
 * in the bundle, it prints (the shortlist export uses it), and there is nothing
 * on a listing page a tenant wants to pan around — they want to see where the
 * flat is. Requested server-side so the token never reaches a browser.
 */
export function staticMapUrl(
  lat: number,
  lng: number,
  { zoom = 16, width = 640, height = 360 }: { zoom?: number; width?: number; height?: number } = {},
): string {
  const url = new URL(STATIC_MAP);
  url.searchParams.set('layerchosen', 'default');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('zoom', String(zoom));
  url.searchParams.set('width', String(width));
  url.searchParams.set('height', String(height));
  // A marker in the V-RENT gold, so the pin reads as ours rather than generic.
  url.searchParams.set('points', `[${lat},${lng},"240,198,116","V"]`);
  return url.toString();
}

/** Fetch that image. Returns null rather than throwing: a missing map is not an error. */
export async function fetchStaticMap(lat: number, lng: number, size?: { width?: number; height?: number }) {
  try {
    const res = await fetch(staticMapUrl(lat, lng, size), { headers: authHeaders(), cache: 'no-store' });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? 'image/png';
    return { body: Buffer.from(await res.arrayBuffer()), type };
  } catch {
    return null;
  }
}
