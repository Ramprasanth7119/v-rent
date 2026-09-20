/**
 * Demo data for the property report.
 *
 * With the Demo Data switch on, every figure the report draws on — contracts,
 * history, trend, comparables, competing listings, nearby places — comes from
 * here instead, generated around the selected property so that every page of
 * the report can be shown populated. The figures exist for that and nothing
 * else:
 *
 *  - generated in the browser from the listing's own particulars: nothing is
 *    requested from a server, written to the store or returned by an API;
 *  - the listing is read and never changed;
 *  - every sheet carries the demo notice while they are shown;
 *  - they pass through the same calculations and checks as the original data
 *    (`marketPosition`, `marketHistory`, `competingSet`, `validateMarket`), so
 *    rents, sizes and rates per square foot agree with one another.
 *
 * Seeded by the listing, so one property shows the same demo report on every
 * machine and in every screenshot. Developments, schools and places are given
 * fictional names; a station is named from the development reference or the
 * listing when either records one. Photographs are the demo account's own
 * (`photos.ts`), shown only for a demo listing.
 */

import type { DemoListing } from '../data';
import type { AmenityGroup } from '../amenities';
import type { Place, PlaceKind, PlacesLookup } from '../places';
import { MARKET_MONTHS, type Project, type Transaction } from '../market';
import { NEIGHBOURS, SIZE_BAND, marketPosition } from '../market-position';
import { dealOf } from '../pricing';
import {
  areaName, competingSet, developmentOf, marketHistory, type ActiveListing, type CompetingResult, type UnitListing,
} from '../report-insights';
import { demoEnquirySet } from './demo-enquiries';
import { listingPhotos } from '../photos';
import type { Around, ReportDataProvider } from './types';

export const DEMO_NOTICE = 'Illustrative data for demonstration purposes';
/** Every generated contract id starts with this, so a demo figure can always be told from a held one. */
export const DEMO_ID_PREFIX = 'demo-';
const CREDIT = 'Illustrative demo data';

/* ------------------------------------------------------------ randomness */

type Rand = () => number;

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

function seeded(key: string): Rand {
  let a = hash(key);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (r: Rand, lo: number, hi: number) => lo + r() * (hi - lo);
const whole = (r: Rand, lo: number, hi: number) => Math.min(hi, Math.floor(between(r, lo, hi + 1)));
const round50 = (n: number) => Math.round(n / 50) * 50;
const round2 = (n: number) => Math.round(n * 100) / 100;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Several without repeats. */
function draw<T>(r: Rand, xs: readonly T[], n: number): T[] {
  const pool = [...xs];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}

/* ------------------------------------------------------------ vocabulary */

const DEVELOPMENTS = [
  'Aster Residences', 'Linden Grove', 'Cobalt Court', 'Juniper Heights', 'Saffron Park Residences', 'Halcyon View',
  'Marlowe Gardens', 'Tessera Suites', 'Wren Terrace', 'Everly Point', 'Arden Parc', 'Solace Residences',
];
/** Neighbours for a flat or a landed home are named the way those places are. */
const HDB_STREETS = ['Northbrook Avenue', 'Westmead Drive', 'Riverstone Road', 'Oakridge Street', 'Maplewood Walk', 'Elmhurst Crescent'];
const ESTATES = ['Larkspur Park Estate', 'Hollins Garden Estate', 'Greywell Hill', 'Ashcombe Villas', 'Stonebridge Terrace', 'Brightwater Rise'];
const neighbourNames = (l: DemoListing, r: () => number): string[] => {
  if (l.propertyType === 'HDB') {
    return draw(r, HDB_STREETS, 4).map((street) => `Blk ${100 + Math.floor(r() * 800)} ${street}`);
  }
  if (l.propertyType === 'Landed') return draw(r, ESTATES, 4);
  return draw(r, DEVELOPMENTS, 4);
};
const STEMS = ['Northbrook', 'Westmead', 'Riverstone', 'Oakridge', 'Maplewood', 'Elmhurst', 'Brightwater', 'Stonebridge', 'Ashcombe', 'Larkspur', 'Hollins', 'Greywell'];
const STREET_KIND = ['Road', 'Avenue', 'Drive', 'Walk'];

/** Typical floor area by bedroom count, in square feet. */
const TYPICAL: Record<number, number> = { 0: 450, 1: 560, 2: 760, 3: 1080, 4: 1450 };
const typical = (beds: number) => TYPICAL[Math.min(4, Math.max(0, beds))];
const sizeBand = (sqft: number) => {
  const low = Math.floor(sqft / 100) * 100;
  return `${low} – ${low + 99} sqft`;
};
const bandFor = (size: number) => ({
  min: Math.round((size * (1 - SIZE_BAND)) / 50) * 50,
  max: Math.round((size * (1 + SIZE_BAND)) / 50) * 50,
});
const stationName = (stem: string) => (/\b(mrt|lrt)\b/i.test(stem) ? stem : `${stem} MRT Station`);
const streetFor = (development: string) => `${development.split(' ')[0]} ${STREET_KIND[hash(development) % STREET_KIND.length]}`;

/** Everything the generated figures depend on, so a changed particular gives a new set. */
const keyOf = (l: DemoListing) => [l.id, l.project, l.district, l.propertyType, l.bedrooms, l.sizeSqft, l.monthlyRent, l.salePriceSgd ?? 0].join('|');

/** The street from an address such as "7 Bishan Street 15 Sky Habitat Singapore 573908". */
function streetOf(l: DemoListing): string {
  let street = (l.address ?? '').replace(/,?\s*Singapore\s*\d{6}\s*$/i, '');
  const at = street.toLowerCase().lastIndexOf(l.project.toLowerCase());
  if (at >= 0) street = `${street.slice(0, at)}${street.slice(at + l.project.length)}`;
  street = street.replace(/^\s*(blk|block)?\s*\d+[a-z]?\s+/i, '').replace(/\s+/g, ' ').replace(/[\s,]+$/, '').trim();
  return street || `${areaName(l.district)} Road`;
}

/** A point `metres` from the property on a bearing. */
function toward(l: DemoListing, metres: number, bearing: number) {
  const lat = l.lat ?? 1.3521;
  const lng = l.lng ?? 103.8198;
  const rad = (bearing * Math.PI) / 180;
  return {
    lat: round6(lat + (metres * Math.cos(rad)) / 111_320),
    lng: round6(lng + (metres * Math.sin(rad)) / (111_320 * Math.cos((lat * Math.PI) / 180))),
  };
}

/* ----------------------------------------------------------- development */

/** The held development record when there is one; otherwise one generated from the listing. */
export function demoDevelopment(l: DemoListing): Project {
  const held = developmentOf(l);
  if (held) return held;
  const r = seeded(`development|${l.project}|${l.district}`);
  return {
    name: l.project,
    street: streetOf(l),
    district: l.district,
    built: l.builtYear ?? whole(r, 2006, 2022),
    tenure: l.tenure === 'Freehold' || l.tenure === '999-year leasehold' ? 'Freehold' : '99-year leasehold',
    basePsf: round2(between(r, 3.8, 5.6)),
    units: whole(r, 18, 120) * 10,
    nearestMrt: l.nearestMrt?.trim() || STEMS[whole(r, 0, STEMS.length - 1)],
    walkMinutes: whole(r, 3, 12),
  };
}

/* ------------------------------------------------------------- contracts */

/**
 * The rate the demo market centres on: close to the property's own asking rate,
 * a few per cent either side, so the comparison lands below, in line or above
 * the way real ones do.
 */
function centreRate(l: DemoListing, r: Rand): number {
  const own = dealOf(l) === 'rent' && l.monthlyRent > 0 && l.sizeSqft > 0 ? l.monthlyRent / l.sizeSqft : 0;
  return own >= 1.5 && own <= 15 ? own * between(r, 0.93, 1.08) : demoDevelopment(l).basePsf;
}

const contractCache = new Map<string, Transaction[]>();

/**
 * A year of lease contracts: the property's development every month, with its
 * own layout at least once a month, and four fictional developments in the same
 * and neighbouring districts. Rates drift gently across the year; larger homes
 * let at slightly lower rates per square foot, as they do.
 */
export function demoContracts(l: DemoListing): Transaction[] {
  const key = keyOf(l);
  const hit = contractCache.get(key);
  if (hit) return hit;

  const r = seeded(`contracts|${key}`);
  const dev = demoDevelopment(l);
  const rate = centreRate(l, r);
  const slope = between(r, -0.004, 0.008);
  const size = l.sizeSqft > 0 ? l.sizeSqft : typical(l.bedrooms);
  const otherBeds = [1, 2, 3, 4].filter((b) => b !== l.bedrooms);
  const neighbours = NEIGHBOURS[l.district] ?? [];
  const others = neighbourNames(l, r).map((name, k) => ({
    name,
    street: streetFor(name),
    district: k < 2 || neighbours.length === 0 ? l.district : neighbours[whole(r, 0, neighbours.length - 1)],
    factor: between(r, 0.86, 1.06),
  }));

  const rows: Transaction[] = [];
  const lease = (project: string, street: string, district: number, bedrooms: number, sqft: number, month: string, index: number, base: number) => {
    const s = Math.max(250, Math.round(sqft));
    const psf = base * (1 + slope * (index - 5.5)) * between(r, 0.955, 1.045) * Math.pow(size / s, 0.12);
    rows.push({
      id: `${DEMO_ID_PREFIX}${hash(key).toString(36)}-${rows.length + 1}`,
      project, street, district, bedrooms,
      sizeBand: sizeBand(s),
      sizeSqft: s,
      month,
      monthlyRent: Math.max(50, round50(psf * s)),
    });
  };

  MARKET_MONTHS.forEach((month, index) => {
    /* Two or three leases of the property's own layout a month give a local
       sample large enough to read, as a well-traded development has. */
    const same = r() < 0.5 ? 3 : 2;
    for (let k = 0; k < same; k += 1) lease(l.project, dev.street, l.district, l.bedrooms, size * between(r, 0.9, 1.1), month, index, rate);
    const layouts = whole(r, 1, 3);
    for (let k = 0; k < layouts; k += 1) {
      const beds = otherBeds[whole(r, 0, otherBeds.length - 1)];
      lease(l.project, dev.street, l.district, beds, typical(beds) * between(r, 0.9, 1.12), month, index, rate);
    }
    for (const o of others) {
      if (r() < 0.6) lease(o.name, o.street, o.district, l.bedrooms, size * between(r, 0.84, 1.16), month, index, rate * o.factor);
    }
  });

  if (contractCache.size > 50) contractCache.clear();
  contractCache.set(key, rows);
  return rows;
}

/* ---------------------------------------------------------- neighbourhood */

const RADIUS: Record<PlaceKind, number> = { mrt: 2000, schools: 2000, healthcare: 5000, attractions: 8000 };

export function demoPlaces(l: DemoListing, kind: PlaceKind, now: Date = new Date()): PlacesLookup {
  const r = seeded(`places|${kind}|${l.id}|${l.district}`);
  const stems = draw(r, STEMS, 6);
  const at = (name: string, detail: string, metres: number): Place => {
    const m = Math.round(metres);
    return { name, detail, metres: m, ...toward(l, m, between(r, 0, 360)) };
  };

  let items: Place[];
  if (kind === 'mrt') {
    const held = developmentOf(l);
    const dev = demoDevelopment(l);
    items = [
      at(stationName(dev.nearestMrt), 'Exit A', held ? held.walkMinutes * 80 : between(r, 280, 950)),
      at(stationName(stems[0]), 'Exit B', between(r, 1150, 1900)),
    ];
  } else if (kind === 'schools') {
    items = [
      at(`${stems[0]} Primary School`, 'Primary', between(r, 300, 900)),
      at(`${stems[1]} Primary School`, 'Primary', between(r, 700, 1500)),
      at(`${stems[2]} Primary School`, 'Primary', between(r, 1300, 1950)),
      at(`${stems[3]} Secondary School`, 'Secondary', between(r, 500, 1400)),
      at(`${stems[4]} Secondary School`, 'Secondary', between(r, 1200, 1950)),
    ];
  } else if (kind === 'healthcare') {
    items = [
      at(`${stems[0]} Polyclinic`, 'Polyclinic', between(r, 900, 2800)),
      at(`${stems[1]} General Hospital`, 'Hospital', between(r, 2200, 4800)),
    ];
  } else {
    items = [
      at(`${stems[0]} Heritage Gallery`, 'Museum', between(r, 2500, 6500)),
      at(`${stems[1]} Waterfront Promenade`, 'Attraction', between(r, 3500, 7800)),
    ];
  }
  return { status: 'ok', kind, radius: RADIUS[kind], items: items.sort((a, b) => a.metres - b.metres), source: CREDIT, retrievedAt: now.toISOString() };
}

export function demoAround(l: DemoListing, now: Date = new Date()): Around {
  const r = seeded(`around|${l.id}|${l.district}`);
  const stems = draw(r, STEMS, 8);
  const group = (key: string, label: string, names: string[], lo: number, hi: number): AmenityGroup => ({
    key,
    label,
    source: CREDIT,
    items: names
      .map((name) => {
        const metres = Math.round(between(r, lo, hi));
        return { name, address: CREDIT, metres, ...toward(l, metres, between(r, 0, 360)) };
      })
      .sort((a, b) => a.metres - b.metres),
  });
  return {
    groups: [
      group('hawker', 'Hawker centres', [`${stems[0]} Food Centre`, ...(r() < 0.6 ? [`${stems[1]} Market and Food Centre`] : [])], 180, 950),
      group('parks', 'Parks and nature', [`${stems[2]} Park`, `${stems[3]} Park Connector`], 150, 900),
      group('sport', 'Sport facilities', r() < 0.7 ? [`${stems[4]} Sports Centre`] : [], 400, 980),
      group('libraries', 'Libraries', r() < 0.5 ? [`${stems[5]} Public Library`] : [], 500, 990),
      group('community', 'Community clubs', [`${stems[6]} Community Club`], 250, 950),
    ],
    missing: [],
    retrievedAt: now.toISOString(),
  };
}

/* ---------------------------------------------------- competing listings */

/** Six to nine live-looking listings for the same kind of home, priced a little either side of the property. */
export function demoCompeting(l: DemoListing, now: Date = new Date()): CompetingResult {
  const deal = dealOf(l);
  const price = deal === 'sale' ? l.salePriceSgd ?? 0 : l.monthlyRent;
  if (!(price > 0) || !(l.sizeSqft > 0)) return competingSet(l, [], now);

  const r = seeded(`active|${keyOf(l)}`);
  const rate = price / l.sizeSqft;
  const band = bandFor(l.sizeSqft);
  const near = [l.district, ...(NEIGHBOURS[l.district] ?? [])];
  const names = l.propertyType === 'HDB'
    ? draw(r, HDB_STREETS, 6).map((street, k) => `Blk ${200 + k * 37} ${street}`)
    : l.propertyType === 'Landed' ? draw(r, ESTATES, 6) : draw(r, DEVELOPMENTS, 9);
  const pool: ActiveListing[] = Array.from({ length: whole(r, 6, 9) }, (_, k) => {
    const sqft = Math.min(band.max, Math.max(band.min, Math.round(l.sizeSqft * between(r, 0.88, 1.12))));
    const ask = rate * between(r, 0.9, 1.1) * sqft;
    return {
      project: names[k % names.length],
      district: k < 3 ? l.district : near[whole(r, 0, near.length - 1)],
      propertyType: l.propertyType,
      bedrooms: l.bedrooms,
      sizeSqft: sqft,
      deal,
      price: deal === 'rent' ? round50(ask) : Math.round(ask / 1000) * 1000,
      publishedAt: new Date(now.getTime() - whole(r, 2, 75) * 86_400_000).toISOString(),
    };
  });
  return competingSet(l, pool, now);
}

/** One earlier listing of the unit, when it has a unit number. */
export function demoEarlier(l: DemoListing, now: Date = new Date()): UnitListing[] {
  const deal = dealOf(l);
  const price = deal === 'sale' ? l.salePriceSgd ?? 0 : l.monthlyRent;
  if (!(l.unitNo ?? '').replace(/[\s#—-]/g, '') || !(price > 0)) return [];
  const r = seeded(`earlier|${keyOf(l)}`);
  const date = new Date(now.getTime() - whole(r, 13, 20) * 30 * 86_400_000).toISOString();
  const asking = deal === 'rent' ? round50(price * between(r, 0.9, 0.97)) : Math.round((price * between(r, 0.92, 0.98)) / 1000) * 1000;
  return [{ date, asking, deal, status: 'expired' }];
}

/* -------------------------------------------------------------- provider */

export const demoDataProvider: ReportDataProvider = {
  mode: 'demo',
  notice: DEMO_NOTICE,
  dataset: {
    live: false,
    name: 'Demo lease-contract data',
    publisher: 'V-RENT demo generator',
    coverage: 'Generated around each selected property for visualization',
    note: 'Demo data: contracts, trends, comparables, nearby places and competing listings in this report are generated for visualization and are not market evidence.',
    badge: 'Demo data',
  },
  marketNote: 'Market figures in this report are illustrative demo data, not market evidence.',
  activeSource: 'illustrative demo listings',
  credit: () => CREDIT,
  wording: {
    verified: 'Demo data',
    datasetBadge: 'Demo data',
    datasetDetail: 'Generated for visualization, not market evidence',
    shortNote: 'Demo data, generated for visualization.',
    developmentNote: 'Where the development reference holds no record, completion, tenure and unit count are illustrative demo data. Confirm them with the developer or URA before relying on them.',
    activeNote: (deal) => `These competing listings are illustrative demo data, not listings live on V-RENT. Figures are asking ${deal === 'rent' ? 'rents' : 'prices'}.`,
    activeRow: (date) => `Illustrative demo listings, generated ${date}.`,
    retrieved: (date) => `Illustrative demo data generated ${date}`,
  },

  contracts: demoContracts,
  development: demoDevelopment,
  /* The generated contracts are of the property's own kind, so an HDB flat or a
     landed home is compared too; the original provider keeps the type rule. */
  position: (l) => marketPosition(l, demoContracts(l), { allTypes: true }),
  history: (l) => marketHistory(l, demoContracts(l), demoDevelopment(l), { allTypes: true }),
  earlier: (l) => demoEarlier(l),
  photos: (_owner, l) => listingPhotos(undefined, l),
  enquiries: (own, now) => demoEnquirySet(own.listings, now, DEMO_ID_PREFIX),

  places: async (l, kind) => demoPlaces(l, kind),
  around: async (l) => demoAround(l),
  competing: async (l) => demoCompeting(l),
};
