/**
 * Demo enquiries, for the Demo Data switch.
 *
 * With the switch off, the inbox, the dashboard and the sidebar count read
 * this set instead of the agent's own enquiries, so a walkthrough can show
 * every stage an enquiry goes through. The rules are the demo provider's:
 *
 *  - generated in the browser from the agent's own live rental listings, which
 *    are read and never changed; nothing is requested from or written to a
 *    server, and the workspace sanitiser refuses any record with the demo id
 *    prefix should one ever be sent;
 *  - every id starts with `DEMO_ID_PREFIX`, so a demo record can always be told
 *    from a real one;
 *  - contact details are masked the way a portal masks them, so no sample
 *    number or address can reach a real person, and contact actions are
 *    disabled while these are shown;
 *  - fixed scenarios rather than random ones, timed back from the moment the
 *    screen opened, so every walkthrough shows the same inbox.
 *
 * When the agent has nothing live to rent, the scenarios are attached to the
 * sample listings instead and the screens show those properties unlinked.
 */

import { SEED_LISTINGS, sgd, type DemoListing } from '../data';
import type { Enquiry } from '../workspace';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const round50 = (n: number) => Math.round(n / 50) * 50;
const isoDay = (t: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
const dayName = (t: number) =>
  new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', weekday: 'long' }).format(new Date(t));
const monthName = (t: number) =>
  new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', month: 'long' }).format(new Date(t));

/** Singapore time of day on a day `days` from `now`. */
function at(now: number, days: number, hour: number, minute = 0): number {
  const day = isoDay(now + days * DAY);
  return new Date(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`).getTime();
}

interface Ctx {
  l: DemoListing;
  now: number;
  budget?: number;
  moveIn?: number;
  viewing?: number;
}

interface Scenario {
  name: string;
  contact: string;
  channel: Enquiry['channel'];
  status: Enquiry['status'];
  /** How long ago the enquiry arrived. */
  ago: number;
  /** How long ago the agent last moved it along. */
  lastAction?: number;
  /** Budget as a share of the asking rent. */
  budget?: number;
  /** Move-in, in days from now. */
  moveIn?: number;
  /** Bedrooms asked for, relative to the unit's. */
  beds?: number;
  /** The viewing: days from now, and the hour. */
  viewing?: [days: number, hour: number, minute?: number];
  outcome?: Enquiry['outcome'];
  /** Which of the listings it is about, before wrapping. The best listing draws the most. */
  slot: number;
  message: (c: Ctx) => string;
}

const unitLabel = (l: DemoListing) => (l.unitNo && l.unitNo !== '—' ? `unit ${l.unitNo}` : 'the unit');
const mrt = (l: DemoListing) => l.nearestMrt?.trim() || 'the MRT';

const SCENARIOS: Scenario[] = [
  {
    name: 'Adeline Koh', contact: '+65 9••• 8842', channel: 'V-RENT', status: 'new', ago: 25 * MIN,
    budget: 1, moveIn: 15, beds: 0, slot: 0,
    message: ({ l, moveIn }) => `Hi, is ${unitLabel(l)} at ${l.project} still available from ${moveIn ? new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'long' }).format(new Date(moveIn)) : 'next month'}? My husband and I are relocating from Hong Kong and would like to view this weekend if possible.`,
  },
  {
    name: 'Sarah Chen', contact: 'sarah.c•••@gmail.com', channel: 'V-RENT', status: 'new', ago: 50 * MIN,
    budget: 0.86, moveIn: 7, slot: 2,
    message: ({ budget }) => `Looking to move in from next week. Is the rent firm? My budget is around ${budget ? sgd(budget) : 'a little lower'} a month, and I can sign quickly.`,
  },
  {
    name: 'Hiroshi Tanaka', contact: 'hiroshi.t•••@outlook.com', channel: 'V-RENT', status: 'new', ago: 2 * HOUR + 10 * MIN,
    budget: 1.08, moveIn: 40, beds: 0, slot: 1,
    message: ({ l, moveIn }) => `Good afternoon. My company is posting me to Singapore in ${moveIn ? monthName(moveIn) : 'the coming months'}. Could you share the floor plan and confirm the unit is ${l.furnishing.toLowerCase()}? The lease would be signed by my employer.`,
  },
  {
    name: 'Rahul Menon', contact: '+65 8••• 2201', channel: 'WhatsApp', status: 'new', ago: 6 * HOUR + 40 * MIN,
    budget: 0.95, moveIn: 10, beds: 0, slot: 0,
    message: ({ l }) => `Hello, saw your listing for ${l.project}. Is the rent negotiable for a two-year lease? Also, does the unit come with a car park lot?`,
  },
  {
    name: 'Oliver Grant', contact: '+65 9••• 5530', channel: 'V-RENT', status: 'viewing', ago: 1 * DAY + 3 * HOUR,
    lastAction: 22 * HOUR, budget: 1, moveIn: 21, slot: 3,
    message: ({ l }) => `Thanks for the details. Could we arrange a viewing one evening this week, after 7pm? I work a short walk from ${mrt(l)}.`,
  },
  {
    name: 'Priyanka Iyer', contact: '+65 8••• 7719', channel: 'WhatsApp', status: 'viewing', ago: 4 * DAY + 2 * HOUR,
    lastAction: 2 * DAY, budget: 1, moveIn: 14, beds: 0, viewing: [1, 19, 30], slot: 1,
    message: () => 'Confirming the viewing tomorrow evening — I will bring my husband. Are small dogs allowed? We have a nine-year-old Shih Tzu.',
  },
  {
    name: 'James Whitfield', contact: '+65 9••• 9014', channel: 'Phone', status: 'viewing', ago: 5 * DAY + 5 * HOUR,
    lastAction: 1 * DAY, budget: 1.12, moveIn: 30, viewing: [2, 11], slot: 0,
    message: ({ viewing }) => `Booked to view on ${viewing ? dayName(viewing) : 'Saturday'}. Please confirm whether the unit is tenanted at the moment and when the air-conditioning was last serviced.`,
  },
  {
    name: 'Marcus Lim', contact: '+65 9••• 3380', channel: 'V-RENT', status: 'viewing', ago: 8 * DAY,
    lastAction: 1 * DAY, budget: 0.97, moveIn: 25, beds: 0, viewing: [-1, 18, 30], slot: 2,
    message: ({ budget }) => `We viewed the unit yesterday and liked it. Would the landlord consider ${budget ? sgd(round50(budget)) : 'a small reduction'} a month for a two-year lease?`,
  },
  {
    name: 'Chloe Tay', contact: 'chloe.t•••@yahoo.com.sg', channel: 'V-RENT', status: 'viewing', ago: 10 * DAY,
    lastAction: 3 * DAY, budget: 1, moveIn: 35, viewing: [-3, 10], slot: 4,
    message: () => 'Thank you for the viewing on the weekend. I am deciding between this and one other unit and will come back to you by Friday.',
  },
  {
    name: 'Tan Wei Ling', contact: '+65 9••• 3316', channel: 'V-RENT', status: 'replied', ago: 3 * DAY + 4 * HOUR,
    lastAction: 2 * DAY + 14 * HOUR, moveIn: 45, beds: 0, slot: 0,
    message: () => 'Could you send the floor plan and tell me which direction the bedrooms face? I am comparing two units in the same development.',
  },
  {
    name: 'Siti Rahimah', contact: '+65 8••• 6045', channel: 'WhatsApp', status: 'replied', ago: 6 * DAY,
    lastAction: 4 * DAY, budget: 0.98, moveIn: 30, slot: 5,
    message: () => 'Hi, is there a supermarket and a childcare centre within walking distance? We have a two-year-old and I do not drive.',
  },
  {
    name: 'Farah Hassan', contact: '+65 9••• 1287', channel: 'Phone', status: 'replied', ago: 20 * HOUR,
    lastAction: 18 * HOUR, budget: 0.92, moveIn: 30, beds: 1, slot: 3,
    message: ({ l }) => `Family of four, ideally looking for ${l.bedrooms + 1} bedrooms near a primary school. Would the landlord accept a one-year lease?`,
  },
  {
    name: 'Daniel Ong', contact: 'daniel.o•••@gmail.com', channel: 'V-RENT', status: 'replied', ago: 2 * DAY + 1 * HOUR,
    lastAction: 30 * HOUR, budget: 1.05, moveIn: 60, beds: 0, slot: 1,
    message: ({ moveIn }) => `My current lease ends in ${moveIn ? monthName(moveIn) : 'two months'}. Is the unit available from then, and is the landlord open to a diplomatic clause?`,
  },
  {
    name: 'Arjun Pillai', contact: '+65 8••• 4418', channel: 'V-RENT', status: 'closed', outcome: 'let', ago: 18 * DAY,
    lastAction: 6 * DAY, budget: 1, moveIn: 12, beds: 0, slot: 0,
    message: () => 'We would like to go ahead. Please let us know the next steps for the letter of intent and the deposit.',
  },
  {
    name: 'Nurul Aisyah', contact: 'nurul.a•••@hotmail.com', channel: 'V-RENT', status: 'closed', outcome: 'lost', ago: 12 * DAY,
    lastAction: 9 * DAY, slot: 2,
    message: () => 'Thank you for showing me the unit. We have decided on somewhere closer to my office.',
  },
  {
    name: 'Goh Mei Ling', contact: '+65 9••• 7053', channel: 'Phone', status: 'closed', outcome: 'lost', ago: 21 * DAY,
    lastAction: 15 * DAY, budget: 0.8, moveIn: 20, slot: 4,
    message: ({ budget }) => `Would the landlord accept ${budget ? sgd(budget) : 'less'} a month? That is the most my company allows for housing.`,
  },
];

export interface EnquirySet {
  enquiries: Enquiry[];
  /** Every listing an enquiry in the set can point at. */
  listings: DemoListing[];
}

const rentable = (l: DemoListing) =>
  !l.archived && l.dealType !== 'sale' && (l.status === 'published' || l.status === 'paused') && l.monthlyRent > 0;

/** The sample listings, as they would look live — used only when the agent has nothing live to rent. */
const SAMPLE_LISTINGS: DemoListing[] = SEED_LISTINGS
  .filter((l) => l.dealType !== 'sale' && l.monthlyRent > 0)
  .map((l) => ({ ...l, status: 'published' as const }));

export function demoEnquirySet(own: DemoListing[], now: Date, idPrefix: string): EnquirySet {
  const mine = own.filter(rentable);
  const pool = mine.length ? mine : SAMPLE_LISTINGS;
  const t = now.getTime();

  const enquiries = SCENARIOS.map((s, i): Enquiry => {
    const l = pool[s.slot % pool.length];
    const budget = s.budget ? round50(l.monthlyRent * s.budget) : undefined;
    const moveIn = s.moveIn !== undefined ? at(t, s.moveIn, 0) : undefined;
    const viewing = s.viewing ? at(t, s.viewing[0], s.viewing[1], s.viewing[2]) : undefined;
    return {
      id: `${idPrefix}enq-${i + 1}`,
      listingId: l.id,
      name: s.name,
      contact: s.contact,
      message: s.message({ l, now: t, budget, moveIn, viewing }),
      at: new Date(t - s.ago).toISOString(),
      channel: s.channel,
      status: s.status,
      budget,
      moveIn: moveIn !== undefined ? isoDay(moveIn) : undefined,
      bedrooms: s.beds !== undefined ? Math.max(0, l.bedrooms + s.beds) : undefined,
      lastActionAt: s.lastAction !== undefined ? new Date(t - s.lastAction).toISOString() : undefined,
      viewingAt: viewing !== undefined ? new Date(viewing).toISOString() : undefined,
      outcome: s.outcome,
    };
  });

  return { enquiries, listings: mine.length ? own : [...own, ...SAMPLE_LISTINGS] };
}

/** How many scenarios the set carries — for tests and the presenter. */
export const DEMO_ENQUIRY_COUNT = SCENARIOS.length;
