/**
 * The demo account: the one data set every screen reads while Demo Data is ON.
 *
 * One portfolio, and everything else hangs off it: the enquiries are about
 * these listings, the viewings are the ones those enquiries booked, the
 * shortlist and the featured run point at the same units, and the bell talks
 * about the same people. The dashboard, the inbox, the listings, the reports
 * and the insights all read this one set, so they always agree.
 *
 * The rules:
 *
 *  - built in the browser (and in the server render, from the same inputs) and
 *    never stored. Every record id starts with `DEMO_PREFIX`, and the
 *    workspace sanitiser refuses any record carrying it, so a demo record
 *    cannot reach the database however it is sent;
 *  - the signed-in agent's name, registration and preferences are kept — the
 *    identity is the account's, not the data set's — but the standing is the
 *    demo account's: approved, registration current, a paid plan;
 *  - contact details are masked, as the enquiry scenarios already are, so no
 *    sample number can reach a real person;
 *  - fixed scenarios timed back from one moment (`now`), so every walkthrough
 *    shows the same account and the server and browser render the same page.
 */

import { demoPortfolio, type WorkspaceState } from '../workspace';
import { agentSlug, EMPTY_TOOLS, type ToolsState } from '../tools';
import { STARTING_REVEAL_CREDITS } from '../views';
import { demoEnquirySet } from './demo-enquiries';
import type { DemoListing } from '../data';

export const DEMO_PREFIX = 'demo-';

/** True for any record that belongs to the demo account. */
export const isDemoId = (id: string | undefined | null) => Boolean(id && id.startsWith(DEMO_PREFIX));

const DAY = 86_400_000;

const isoDay = (t: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
const hhmm = (t: number) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(t));

/** The identity the demo account borrows from whoever is signed in. */
export type DemoIdentity = Pick<WorkspaceState, 'profile' | 'notifications' | 'emailVerified'>;

/**
 * The two longest-standing units have been let before and relisted, so the
 * account has a year of history to chart rather than a few weeks.
 */
const RELISTED: Record<string, number> = { 'lst-1': 330, 'lst-2': 205 };

export function demoListings(agentName: string, now: Date): DemoListing[] {
  return demoPortfolio(agentName).map((l) => {
    const back = RELISTED[l.id];
    const relisted = back && l.status === 'published'
      ? {
        createdAt: isoDay(now.getTime() - (back + 3) * DAY),
        publishedAt: new Date(now.getTime() - back * DAY).toISOString(),
        reviewedAt: new Date(now.getTime() - back * DAY).toISOString(),
        // Renewed each quarter since, so it is still live.
        expiresAt: new Date(now.getTime() + 41 * DAY).toISOString(),
      }
      : {};
    return { ...l, ...relisted, id: `${DEMO_PREFIX}${l.id}` };
  });
}

function demoTools(listings: DemoListing[], enquiries: WorkspaceState['enquiries'], identity: DemoIdentity, now: number): ToolsState {
  const live = listings.filter((l) => l.status === 'published');
  const [first, second, third] = live;

  // The viewings the enquiries already mention, as the slots they were booked into.
  const booked = enquiries.filter((e) => e.viewingAt).map((e, i) => {
    const t = new Date(e.viewingAt as string).getTime();
    return {
      id: `${DEMO_PREFIX}slot-${i + 1}`,
      date: isoDay(t),
      start: hhmm(t),
      end: hhmm(t + 30 * 60_000),
      listingId: e.listingId,
      booking: { name: e.name, mobile: e.contact, at: e.lastActionAt ?? e.at, note: 'Booked from the enquiry' },
    };
  });
  const open = first ? [2, 3].map((d, i) => ({
    id: `${DEMO_PREFIX}slot-open-${i + 1}`,
    date: isoDay(now + d * DAY),
    start: '18:30',
    end: '19:00',
    listingId: i === 0 ? first.id : 'any',
  })) : [];

  return {
    ...EMPTY_TOOLS,
    refresh: [first, second].filter(Boolean).map((l, i) => ({
      listingId: (l as DemoListing).id,
      cadence: i === 0 ? 'daily' as const : 'alternate' as const,
      hour: i === 0 ? 8 : 19,
      lastRunAt: new Date(now - (i + 1) * 9 * 3_600_000).toISOString(),
      runs: i === 0 ? 11 : 5,
    })),
    slots: [...booked, ...open],
    shortlists: live.length >= 3 ? [{
      id: `${DEMO_PREFIX}shortlist-1`,
      name: 'Two-bedroom options near the CBD',
      clientName: 'Oliver Grant',
      note: 'Works near the city; wants an evening viewing and a two-year lease.',
      listingIds: [first.id, second.id, third.id],
      createdAt: new Date(now - 2 * DAY).toISOString(),
    }] : [],
    tickets: [{
      id: `${DEMO_PREFIX}ticket-1`,
      area: 'Listings',
      subject: 'Floor plan not showing on a published listing',
      body: 'I attached the floor plan but tenants say they cannot see it on the listing page.',
      at: new Date(now - 3 * DAY).toISOString(),
      status: 'answered',
      reply: 'The plan was still being scanned when you looked. It is visible now; nothing more is needed on your side.',
      repliedAt: new Date(now - 3 * DAY + 5 * 3_600_000).toISOString(),
    }],
    publicPage: {
      ...EMPTY_TOOLS.publicPage,
      slug: agentSlug(identity.profile.fullName || 'demo agent', identity.profile.ceaNumber || 'R000000D'),
      headline: 'Condominium rentals in the city and the east',
      districts: [...new Set(live.map((l) => l.district))].join(', '),
    },
    guidesDone: ['register', 'first-listing'],
  };
}

/**
 * The demo account as a workspace, around the signed-in identity.
 *
 * `now` is the moment the page was opened, passed down from the server so the
 * server render and the browser build exactly the same account.
 */
export function demoWorkspace(identity: DemoIdentity, now: Date): WorkspaceState {
  const agent = (identity.profile.fullName || 'Demo agent').replace(/\s*\(.*\)\s*$/, '').trim();
  const listings = demoListings(agent, now);
  const { enquiries } = demoEnquirySet(listings, now, DEMO_PREFIX);
  const t = now.getTime();
  const rejected = listings.find((l) => l.status === 'rejected');
  const newest = enquiries.find((e) => e.status === 'new');
  const newestListing = newest && listings.find((l) => l.id === newest.listingId);

  const alerts: WorkspaceState['alerts'] = [
    ...(newest && newestListing ? [{
      id: `${DEMO_PREFIX}alert-1`,
      at: newest.at,
      kind: 'enquiry',
      title: `New enquiry from ${newest.name}`,
      body: `About ${newestListing.project}, ${newestListing.unitNo}.`,
      href: `/phase1/enquiries?enquiry=${newest.id}`,
      tone: 'info' as const,
      read: false,
    }] : []),
    ...(rejected ? [{
      id: `${DEMO_PREFIX}alert-2`,
      at: rejected.reviewedAt ?? new Date(t - 4 * DAY).toISOString(),
      kind: 'moderation',
      title: `${rejected.project} was not approved`,
      body: rejected.rejectionReason ?? 'A moderator asked for changes.',
      href: `/phase1/listings/${rejected.id}`,
      tone: 'danger' as const,
      read: false,
    }] : []),
    {
      id: `${DEMO_PREFIX}alert-3`,
      at: new Date(t - 6 * DAY).toISOString(),
      kind: 'subscription',
      title: 'Professional plan renewed',
      body: 'Paid by PayNow. Your invoice is in Subscription and billing.',
      href: '/phase1/checkout',
      tone: 'success',
      read: true,
    },
  ];

  const validUntil = isoDay(t + 240 * DAY);

  return {
    emailVerified: true,
    mobileVerified: true,
    profileSubmitted: true,
    approval: 'approved',
    ceaValid: true,
    ceaValidUntil: validUntil,
    planCode: 'professional',
    subscription: 'active',
    paymentMethod: 'PayNow',
    profile: {
      ...identity.profile,
      fullName: identity.profile.fullName || 'Demo agent',
      agency: identity.profile.agency || 'Demo Realty Pte Ltd',
      ceaNumber: identity.profile.ceaNumber || 'R000000D',
    },
    notifications: identity.notifications,
    listings,
    enquiries,
    alerts,
    tools: demoTools(listings, enquiries, identity, t),
    /* Left empty rather than invented. A view record names the account that
       made it, and a demonstration viewer would be an account id resolving to
       nobody — which is worse on screen than an honest "no agents yet". */
    views: [],
    reveals: [],
    revealCredits: STARTING_REVEAL_CREDITS,
    revealTopUps: [],
  };
}
