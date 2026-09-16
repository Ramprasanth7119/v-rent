/**
 * Rental market data for the prototype.
 *
 * In production this is URA's rental contract feed: every private residential
 * lease in Singapore has to be lodged, and the quarterly release is the only
 * source an agent will accept when you tell them what a unit lets for. That
 * feed needs a URA API account the client does not have yet, so this module
 * stands in for it — real projects, real districts, real completion years and
 * plausible rents, generated deterministically so the same project shows the
 * same history on every machine and in every screenshot.
 *
 * The shape is the shape URA publishes: project, street, district, floor-area
 * band, number of bedrooms, lease month, monthly rent. Swapping the source is
 * replacing `TRANSACTIONS` and nothing else.
 */

/**
 * What the contracts below actually are, said once so every screen and the
 * printed report describe them the same way. Flip `live` and the wording when
 * the URA feed replaces the generator; nothing else should claim a source.
 */
export const MARKET_SOURCE = {
  live: false,
  name: 'Illustrative lease-contract dataset',
  publisher: 'V-RENT, modelled on URA private residential rental contracts',
  coverage: 'Private non-landed homes (condominiums, apartments and executive condominiums) in 20 developments',
  note: 'The URA rental contract feed is not yet connected. Contracts are generated in the format URA publishes, so the method can be reviewed, and are not market evidence.',
} as const;

export interface Project {
  name: string;
  street: string;
  district: number;
  /** Year the development was completed. */
  built: number;
  tenure: 'Freehold' | '99-year leasehold';
  /** Typical rental per square foot a month, in Singapore dollars. */
  basePsf: number;
  units: number;
  nearestMrt: string;
  walkMinutes: number;
}

export const PROJECTS: Project[] = [
  { name: 'The Sail @ Marina Bay', street: 'Marina Boulevard', district: 1, built: 2008, tenure: '99-year leasehold', basePsf: 6.2, units: 1111, nearestMrt: 'Downtown', walkMinutes: 4 },
  { name: 'Marina One Residences', street: 'Marina Way', district: 1, built: 2017, tenure: '99-year leasehold', basePsf: 6.8, units: 1042, nearestMrt: 'Marina Bay', walkMinutes: 3 },
  { name: 'Reflections at Keppel Bay', street: 'Keppel Bay View', district: 4, built: 2011, tenure: '99-year leasehold', basePsf: 5.0, units: 1129, nearestMrt: 'HarbourFront', walkMinutes: 12 },
  { name: 'Corals at Keppel Bay', street: 'Keppel Bay Drive', district: 4, built: 2016, tenure: '99-year leasehold', basePsf: 5.4, units: 366, nearestMrt: 'HarbourFront', walkMinutes: 14 },
  { name: 'Martin Modern', street: 'Martin Place', district: 9, built: 2021, tenure: '99-year leasehold', basePsf: 6.4, units: 450, nearestMrt: 'Great World', walkMinutes: 6 },
  { name: 'Rivergate', street: 'Robertson Quay', district: 9, built: 2009, tenure: 'Freehold', basePsf: 5.6, units: 545, nearestMrt: 'Fort Canning', walkMinutes: 9 },
  { name: 'The Orchard Residences', street: 'Orchard Turn', district: 9, built: 2010, tenure: '99-year leasehold', basePsf: 6.9, units: 175, nearestMrt: 'Orchard', walkMinutes: 1 },
  { name: 'Leedon Green', street: 'Leedon Heights', district: 10, built: 2023, tenure: 'Freehold', basePsf: 6.0, units: 638, nearestMrt: 'Farrer Road', walkMinutes: 8 },
  { name: 'The Tresor', street: 'Duchess Avenue', district: 10, built: 2010, tenure: 'Freehold', basePsf: 5.1, units: 62, nearestMrt: 'Botanic Gardens', walkMinutes: 11 },
  { name: 'Newton Suites', street: 'Newton Road', district: 11, built: 2007, tenure: 'Freehold', basePsf: 5.3, units: 118, nearestMrt: 'Newton', walkMinutes: 5 },
  { name: 'Sky Habitat', street: 'Bishan Street 15', district: 20, built: 2016, tenure: '99-year leasehold', basePsf: 4.3, units: 509, nearestMrt: 'Bishan', walkMinutes: 7 },
  { name: 'The Interlace', street: 'Depot Road', district: 4, built: 2013, tenure: '99-year leasehold', basePsf: 4.2, units: 1040, nearestMrt: 'Labrador Park', walkMinutes: 13 },
  { name: 'Treasure at Tampines', street: 'Tampines Lane', district: 18, built: 2023, tenure: '99-year leasehold', basePsf: 3.9, units: 2203, nearestMrt: 'Simei', walkMinutes: 12 },
  { name: 'The Florence Residences', street: 'Hougang Avenue 2', district: 19, built: 2023, tenure: '99-year leasehold', basePsf: 4.0, units: 1410, nearestMrt: 'Kovan', walkMinutes: 10 },
  { name: 'Parc Esta', street: 'Sims Avenue', district: 14, built: 2022, tenure: '99-year leasehold', basePsf: 4.6, units: 1399, nearestMrt: 'Eunos', walkMinutes: 3 },
  { name: 'Jadescape', street: 'Shunfu Road', district: 20, built: 2022, tenure: '99-year leasehold', basePsf: 4.4, units: 1206, nearestMrt: 'Marymount', walkMinutes: 5 },
  { name: 'Normanton Park', street: 'Normanton Park', district: 5, built: 2024, tenure: '99-year leasehold', basePsf: 4.5, units: 1862, nearestMrt: 'Kent Ridge', walkMinutes: 11 },
  { name: 'Stirling Residences', street: 'Stirling Road', district: 3, built: 2022, tenure: '99-year leasehold', basePsf: 5.0, units: 1259, nearestMrt: 'Queenstown', walkMinutes: 4 },
  { name: 'Avenue South Residence', street: 'Silat Avenue', district: 3, built: 2024, tenure: '99-year leasehold', basePsf: 5.1, units: 1074, nearestMrt: 'Cantonment', walkMinutes: 6 },
  { name: 'The Woodleigh Residences', street: 'Bidadari Park Drive', district: 13, built: 2023, tenure: '99-year leasehold', basePsf: 4.7, units: 667, nearestMrt: 'Woodleigh', walkMinutes: 1 },
];

export interface Transaction {
  id: string;
  project: string;
  street: string;
  district: number;
  bedrooms: number;
  /** The band URA publishes rather than an exact figure. */
  sizeBand: string;
  sizeSqft: number;
  /** YYYY-MM. */
  month: string;
  monthlyRent: number;
}

/** Typical sizes by bedroom count, in square feet. */
const SIZES: Record<number, number[]> = {
  1: [452, 484, 527, 560],
  2: [657, 700, 742, 786, 829],
  3: [915, 980, 1055, 1130, 1216],
  4: [1300, 1410, 1528, 1650],
};

const band = (sqft: number) => {
  const low = Math.floor(sqft / 100) * 100;
  return `${low} – ${low + 99} sqft`;
};

/**
 * A small deterministic generator. `Math.random` would give a different market
 * on every render, which would make the screen useless for comparing two
 * projects and impossible to screenshot twice.
 */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The twelve months ending with the report month.
 *
 * Built by arithmetic on the year and month rather than by constructing dates,
 * because a `Date` for the first of a Singapore month is the last day of the
 * previous month in any timezone west of it — and this is rendered both on a
 * server in UTC and in a browser wherever the reader happens to be. Month
 * labels that disagree between the two would be a hydration mismatch as well
 * as simply wrong.
 */
export const MARKET_MONTHS = (() => {
  /* The last complete month, not this one. URA publishes lodged contracts in
     arrears, so a window that ran to the current month would show a partial
     month beside twelve full ones and read as a collapse in demand. */
  const now = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit',
  }).format(new Date());
  const [thisYear, thisMonth] = now.split('-').map(Number);
  const previous = thisYear * 12 + (thisMonth - 1) - 1;
  const END_YEAR = Math.floor(previous / 12);
  const END_MONTH = (previous % 12) + 1;
  const out: string[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const total = END_YEAR * 12 + (END_MONTH - 1) - i;
    const year = Math.floor(total / 12);
    const month = (total % 12) + 1;
    out.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return out;
})();

export const monthLabel = (m: string) => {
  const [year, month] = m.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
};

function generate(): Transaction[] {
  const rows: Transaction[] = [];
  for (const p of PROJECTS) {
    const rand = mulberry(hash(p.name));
    // Bigger developments lodge more contracts. Roughly one a month per 90
    // units, which is the order of magnitude URA actually publishes.
    const perMonth = Math.max(1, Math.round(p.units / 260));
    MARKET_MONTHS.forEach((month, mi) => {
      // A gentle upward drift across the year, so a chart has something to say.
      const drift = 1 + (mi - 6) * 0.006;
      for (let n = 0; n < perMonth; n += 1) {
        const beds = 1 + Math.floor(rand() * 4);
        const sizes = SIZES[beds];
        const sqft = sizes[Math.floor(rand() * sizes.length)];
        const noise = 0.9 + rand() * 0.2;
        const rent = Math.round((p.basePsf * sqft * drift * noise) / 50) * 50;
        rows.push({
          id: `${p.name}-${month}-${n}`,
          project: p.name,
          street: p.street,
          district: p.district,
          bedrooms: beds,
          sizeBand: band(sqft),
          sizeSqft: sqft,
          month,
          monthlyRent: rent,
        });
      }
    });
  }
  return rows;
}

export const TRANSACTIONS: Transaction[] = generate();

/* ------------------------------------------------------------- statistics */

export const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

export interface MarketSummary {
  count: number;
  medianRent: number;
  medianPsf: number;
  lowRent: number;
  highRent: number;
  /** Median rent for each of the twelve months, zero where nothing let. */
  byMonth: number[];
}

export function summarise(rows: Transaction[]): MarketSummary {
  const rents = rows.map((r) => r.monthlyRent);
  const psfs = rows.map((r) => r.monthlyRent / r.sizeSqft);
  return {
    count: rows.length,
    medianRent: median(rents),
    medianPsf: psfs.length ? Number((psfs.reduce((a, b) => a + b, 0) / psfs.length).toFixed(2)) : 0,
    lowRent: rents.length ? Math.min(...rents) : 0,
    highRent: rents.length ? Math.max(...rents) : 0,
    byMonth: MARKET_MONTHS.map((m) => median(rows.filter((r) => r.month === m).map((r) => r.monthlyRent))),
  };
}
