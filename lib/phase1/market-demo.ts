/**
 * The public marketplace as it looks while Demo Data is ON.
 *
 * The same switch as everywhere else — one cookie, read on the server by
 * `demoDataOnServer()` — reaching the half of the product a tenant sees. Until
 * now it stopped at the agent workspace, so turning it on and opening the
 * tenant site showed live listings with nothing to say the switch was even on.
 *
 * The rules are the ones the rest of the demo architecture already follows:
 *
 *  - built here, in memory, from a pure function of the seed portfolio, and
 *    never written anywhere. There is no store behind this file;
 *  - every id carries `DEMO_PREFIX`, which the workspace sanitiser refuses, so
 *    a demo listing cannot reach the database however it is sent;
 *  - the agents are invented, and their registration numbers and contact
 *    details are written so they cannot be mistaken for a real salesperson's
 *    or reach a real person — masked, the way the sample enquiries already are;
 *  - nothing falls back to this. If the live stores fail with the switch off,
 *    the page says so; it does not quietly show these instead.
 *
 * Coherent on purpose: the listings are spread across the three agents, each
 * agent keeps to the districts they list in, and the publish dates are staggered
 * back from today so "newly listed" means something on the front page.
 */

import { SEED_LISTINGS, type DemoListing } from './data';
import { DEMO_PREFIX } from './report-data/demo-workspace';
import { TODAY } from './workspace';
import { floorFromUnit } from './floor';
import type { MarketListing, PublicAgent } from './marketplace';

const DAY = 86_400_000;

/**
 * Three invented salespeople.
 *
 * The registration and licence numbers are deliberately not in the shape CEA
 * issues — a number that looked real would be somebody's, and a demo must not
 * put an invented listing under a living person's registration. The mobile and
 * the address are masked for the same reason: nothing here can be dialled or
 * written to.
 */
const AGENTS: { id: string; name: string; registered: string; agency: string }[] = [
  { id: `${DEMO_PREFIX}agent-1`, name: 'Tan Wei Ming', registered: 'Tan Wei Ming', agency: 'Vantage Realty' },
  { id: `${DEMO_PREFIX}agent-2`, name: 'Nadia Rahim', registered: 'Nadia Binte Rahim', agency: 'Crescent Property' },
  { id: `${DEMO_PREFIX}agent-3`, name: 'Joel Fernandez', registered: 'Joel Fernandez', agency: 'Vantage Realty' },
];

function demoAgent(i: number): PublicAgent {
  const a = AGENTS[i];
  const first = a.name.split(' ')[0];
  return {
    id: a.id,
    name: a.name,
    callName: first,
    registeredName: a.registered,
    agency: a.agency,
    agencyLicence: `DEMO-L${String(i + 1).padStart(4, '0')}`,
    ceaNumber: `DEMO-R${String(i + 1).padStart(4, '0')}`,
    mobile: `+65 9••• ${4100 + i * 37}`,
    email: `${first.toLowerCase()}•••@example.invalid`,
    bio: [
      'Works the city fringe and the bay. Fifteen years of rentals, mostly two and three bedders for people relocating.',
      'Grew up in the east and still lists there. Family flats, long leases, and the schools that go with them.',
      'Rentals and resale across the north-east. Speaks to landlords about what a unit is actually worth before it goes up.',
    ][i],
    experienceYears: ['15', '8', '11'][i],
    verified: true,
    verifiedAt: new Date(TODAY.getTime() - (120 + i * 30) * DAY).toISOString(),
    registeredUntil: new Date(TODAY.getTime() + (200 + i * 40) * DAY).toISOString(),
    memberSince: new Date(TODAY.getTime() - (400 + i * 90) * DAY).toISOString(),
  };
}

/**
 * The seed portfolio, published and dealt out to the three agents.
 *
 * Round robin rather than in blocks, so every agent has something in more than
 * one district and the front page's area tiles have something behind them.
 * `publicFields` is applied here rather than borrowed from `marketplace`: the
 * unit number goes, the storey stays, exactly as it does for a live listing.
 */
function demoEntries(): MarketListing[] {
  const agents = AGENTS.map((_, i) => demoAgent(i));

  return SEED_LISTINGS.map((seed, i): MarketListing => {
    const agent = agents[i % agents.length];
    /* Newest first once sorted, a few days apart, all inside the ninety-day
       window a live listing gets — so nothing reads as expired. */
    const published = new Date(TODAY.getTime() - (2 + i * 6) * DAY);
    const floor = floorFromUnit(seed.unitNo);

    const listing: DemoListing = {
      ...seed,
      id: `${DEMO_PREFIX}${seed.id}`,
      agent: agent.name,
      dealType: seed.dealType ?? 'rent',
      status: 'published',
      unitNo: '',
      ...(floor !== null ? { floorLevel: floor } : {}),
      createdAt: new Date(published.getTime() - 3 * DAY).toISOString(),
      publishedAt: published.toISOString(),
      reviewedAt: published.toISOString(),
      expiresAt: new Date(published.getTime() + 90 * DAY).toISOString(),
      /* No photograph store behind a demo listing. The card and the gallery
         fall back to the generated visual, which is honestly a drawing rather
         than a photograph of a flat that does not exist. */
      photos: [],
    };
    delete listing.rejectionReason;
    delete listing.archived;
    delete listing.floorPlan;
    delete listing.video;

    return { ownerId: agent.id, agent, listing, photos: [], thumbs: [] };
  }).sort((a, b) => (b.listing.publishedAt ?? '').localeCompare(a.listing.publishedAt ?? ''));
}

/** Everything live in the demo marketplace, newest first. */
export function demoMarketListings(): MarketListing[] {
  return demoEntries();
}

/** One demo listing, or null — the same contract as the live lookup. */
export function demoMarketListing(ownerId: string, listingId: string): MarketListing | null {
  return demoEntries().find((m) => m.ownerId === ownerId && m.listing.id === listingId) ?? null;
}

/**
 * One demo agent and their homes, or null.
 *
 * Resolved from the roster rather than from the listings, so an agent who
 * happens to have nothing live still has a profile — the same as the live
 * lookup, which shows "nothing live right now" rather than a 404.
 */
export function demoMarketAgent(ownerId: string): { agent: PublicAgent; listings: MarketListing[] } | null {
  const i = AGENTS.findIndex((a) => a.id === ownerId);
  if (i < 0) return null;
  return { agent: demoAgent(i), listings: demoEntries().filter((m) => m.ownerId === ownerId) };
}

/** True for anything that belongs to the demo marketplace. */
export const isDemoOwner = (ownerId: string) => ownerId.startsWith(DEMO_PREFIX);
