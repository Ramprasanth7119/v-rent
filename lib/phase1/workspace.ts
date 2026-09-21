/**
 * The agent workspace: what the signed-in agent owns, in a shape that can be
 * written to disk and read back.
 *
 * This module is deliberately free of both React and Node, because both sides
 * need it — the browser converts to and from it, the server persists it.
 *
 * The identity rule lives here and nowhere else: a workspace is seeded from the
 * account that owns it, so the name, agency and registration on every screen
 * are the ones the CEA register returned when that account was verified. Before
 * this existed the workspace carried a fictional agent while the session
 * carried a real one, and the two contradicted each other on screen.
 */

import type { PublicAccount } from '../auth/store';
import { displayAgency, displayName } from '../auth/cea';
import { DemoListing, ListingStatus, PLANS, PlanOption, SEED_LISTINGS } from './data';
import { EMPTY_TOOLS, type ToolsState } from './tools';
import { cleanEligibility } from './eip';
import { STARTING_REVEAL_CREDITS, type ListingView, type Reveal } from './views';

/**
 * Today, in Singapore.
 *
 * This was a fixed date so every relative figure read the same in every run,
 * which is a fine property for a screenshot and a poor one for a product: the
 * greeting said Friday 28 August while the calendar said something else, and
 * everything measured from it — what expires this month, what was published
 * this week — was measured from a day that had passed.
 *
 * Resolved in Singapore rather than wherever the machine happens to be, and to
 * the day rather than the moment, for two reasons that matter equally: this is
 * a Singapore product, and a value computed to the day is the same on the
 * server and in the browser, so nothing renders one date and then hydrates to
 * another.
 */
function singaporeToday(): string {
  // 'en-CA' formats as YYYY-MM-DD, which is the shape the rest of this expects.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export const TODAY_ISO = singaporeToday();

/** Nine in the morning, so "today" is unambiguous on either side of midnight. */
export const TODAY = new Date(`${TODAY_ISO}T09:00:00+08:00`);

export type ApprovalStatus = 'not_submitted' | 'under_review' | 'approved' | 'rejected' | 'suspended';
export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'expired';

export interface AgentProfile {
  fullName: string;
  email: string;
  mobile: string;
  ceaNumber: string;
  agency: string;
  agencyLicence: string;
  bio: string;
  experienceYears: string;
}

/**
 * The persisted form. The plan is stored as its code rather than the whole
 * option, so a change to pricing or entitlements takes effect everywhere
 * instead of leaving stale copies in every saved workspace.
 */
/** Which events reach the agent, and by which channel. */
export type NotificationPrefs = Record<string, { email: boolean; sms: boolean }>;

/**
 * The defaults a new account starts on. Compliance events — a lapsing
 * registration, a moderation decision — default on for both channels because
 * an agent who misses one loses the right to advertise.
 */
export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  enquiry: { email: true, sms: true },
  views: { email: true, sms: false },
  moderation: { email: true, sms: false },
  expiry: { email: true, sms: false },
  cea: { email: true, sms: true },
  billing: { email: true, sms: false },
  product: { email: false, sms: false },
};

export type EnquiryStatus = 'new' | 'replied' | 'viewing' | 'closed';

/**
 * A tenant asking about a listing.
 *
 * Stored on the agent who owns the listing, because that is the only person
 * who may read it: an enquiry carries a stranger's name and telephone number,
 * given to one agent about one flat.
 */
export interface Enquiry {
  id: string;
  listingId: string;
  name: string;
  /** However they asked to be reached — a mobile number or an email address. */
  contact: string;
  message: string;
  at: string;
  channel: 'V-RENT' | 'WhatsApp' | 'Phone';
  status: EnquiryStatus;
  moveIn?: string;
  budget?: number;
  /** Bedrooms asked for, when the enquirer said. */
  bedrooms?: number;
  /** When the agent last moved this enquiry along — the clock a follow-up runs on. */
  lastActionAt?: string;
  /** The agreed viewing, once there is one. */
  viewingAt?: string;
  /** How a closed enquiry ended. */
  outcome?: 'let' | 'lost';
}

/** A notice shown in the bell. Written by the server, read by the agent. */
export interface Alert {
  id: string;
  at: string;
  kind: string;
  title: string;
  body: string;
  href?: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
  read: boolean;
}

export interface WorkspaceState {
  emailVerified: boolean;
  mobileVerified: boolean;
  profileSubmitted: boolean;
  approval: ApprovalStatus;
  ceaValid: boolean;
  ceaValidUntil: string;
  planCode: PlanOption['code'] | null;
  subscription: SubscriptionStatus;
  paymentMethod: 'PayNow' | 'Card' | null;
  profile: AgentProfile;
  listings: DemoListing[];
  notifications: NotificationPrefs;
  enquiries: Enquiry[];
  /** What has happened to this account, newest first. */
  alerts: Alert[];
  /** Featuring, refreshes, viewings, shortlists and the rest. See `tools.ts`. */
  tools: ToolsState;
  /**
   * Which agents have opened this agent's listings, and which of them have
   * been named. Written only by the server — see `views-store.ts` — because
   * they are a sales record and a billing record, and a browser must be able
   * to read neither into existence nor out of it.
   */
  views: ListingView[];
  reveals: Reveal[];
  /** Cents, spent one name at a time. See `views.ts` for what a name costs. */
  revealCredits: number;
}

/**
 * The name to show. The register records a legal name with the person's usual
 * name in brackets — "WANG XUEDONG (JEREMY WANG)" — which is right on a
 * compliance block and wrong in a greeting or beside a listing.
 */
export const preferredName = (fullName: string): string => fullName.replace(/\s*\(.*\)\s*$/, '').trim();

export const planByCode = (code: PlanOption['code'] | null): PlanOption | null =>
  (code ? PLANS.find((p) => p.code === code) ?? null : null);

/* ------------------------------------------------------------------ seeding */

/** A registration is current when the register's end date has not passed. */
export function registrationIsCurrent(endDate?: string): boolean {
  if (!endDate) return false;
  const end = new Date(`${endDate}T23:59:59+08:00`);
  return !Number.isNaN(end.getTime()) && end.getTime() >= TODAY.getTime();
}

/**
 * A new workspace for an account.
 *
 * The portfolio is demonstration data — a POC has to show a populated
 * workspace — but it is attributed to the account that owns it, so nothing on
 * screen contradicts the signed-in agent.
 *
 * The standing is not invented. Whether the agent starts approved or waiting
 * for an officer is the platform's verification policy, decided by how many
 * agents there are (see `verification-policy`) and passed in; the mobile number
 * was never confirmed, so it is not.
 */
/**
 * Bring the register-owned half of the stored profile back in line with the
 * account.
 *
 * The profile screen shows two kinds of field. The registered name, number,
 * agency and licence belong to the CEA register and are read-only; the mobile
 * number, biography and years of experience belong to the agent. Only the
 * first kind is reconciled here — an agent's own words are never overwritten.
 *
 * It exists because the copy was taken once, when the workspace was first
 * created, and never looked at again. Two things went wrong with that. An
 * account whose registration was attached a moment after the workspace was
 * seeded kept an empty profile for good, showing "no CEA registration" beside
 * a sidebar that had the agency name. And the screen tells agents that moving
 * agency is picked up automatically, which was not true of this copy.
 *
 * Returns null when nothing needed changing, so the common case does no write.
 */
export function reconcileProfile(profile: AgentProfile, user: PublicAccount): AgentProfile | null {
  const fromRegister: Partial<AgentProfile> = {
    email: user.email,
    fullName: displayName(user.cea?.name ?? user.fullName),
    ceaNumber: user.cea?.registrationNo ?? '',
    agency: user.cea ? displayAgency(user.cea.agencyName) : '',
    agencyLicence: user.cea?.agencyLicenceNo ?? '',
  };

  const changed = (Object.keys(fromRegister) as (keyof AgentProfile)[])
    .some((k) => profile[k] !== fromRegister[k]);

  return changed ? { ...profile, ...fromRegister } : null;
}

/**
 * Everything in the workspace that is really the account's to say, brought back
 * into line with the account.
 *
 * The workspace is seeded once, from the account as it stood at that moment.
 * An account that gained its CEA registration a moment later — or had it
 * changed since — kept a workspace describing an agent with no registration:
 * a blank compliance line, `ceaValid` false, and an application that was never
 * submitted because at seeding time there was nothing to submit. None of that
 * can be cleared by anything the agent or an officer can click, and approving
 * such an account does not help, because what the screen complains about is
 * the registration, not the approval.
 *
 * What is deliberately not touched: an approval or a rejection an officer has
 * actually made. Only an application that was never submitted is re-derived,
 * because a registered agent's workspace is never seeded that way.
 *
 * Returns null when nothing needed changing, so the ordinary load writes
 * nothing.
 */
/**
 * Take an agent's listings down when their registration lapses, and put the
 * same ones back when it is current again.
 *
 * Only listings this function took down are restored: one suspended by a
 * moderator carries no `frozen` mark and stays where the moderator put it.
 * Drafts are left alone — an agent may keep working on them, they are simply
 * not advertised.
 *
 * Returns the new list, or null when nothing needs to change, so a workspace
 * is not rewritten on every read.
 */
function freezeOrThaw(listings: DemoListing[], ceaValid: boolean): DemoListing[] | null {
  let changed = false;
  const next = listings.map((l) => {
    if (!ceaValid && (l.status === 'published' || l.status === 'pending_review')) {
      changed = true;
      return { ...l, status: 'suspended' as ListingStatus, frozen: 'cea_lapsed' as const };
    }
    if (ceaValid && l.frozen === 'cea_lapsed' && l.status === 'suspended') {
      changed = true;
      const restored = { ...l, status: 'published' as ListingStatus };
      delete restored.frozen;
      return restored;
    }
    return l;
  });
  return changed ? next : null;
}

export function reconcileWithAccount(
  w: WorkspaceState,
  user: PublicAccount,
  opts: { autoApprove: boolean },
): Partial<WorkspaceState> | null {
  const changes: Partial<WorkspaceState> = {};

  const profile = reconcileProfile(w.profile, user);
  if (profile) changes.profile = profile;

  // The account owns whether the address is confirmed; this only mirrors it.
  const emailVerified = Boolean(user.emailVerifiedAt);
  if (w.emailVerified !== emailVerified) changes.emailVerified = emailVerified;

  const ceaValid = user.cea ? registrationIsCurrent(user.cea.registrationEnd) : false;
  const ceaValidUntil = user.cea?.registrationEnd ?? '';
  if (w.ceaValid !== ceaValid) changes.ceaValid = ceaValid;
  if (w.ceaValidUntil !== ceaValidUntil) changes.ceaValidUntil = ceaValidUntil;

  /* An advertisement has to carry a registration that is current. When it
     lapses, the listings come down with the publication right rather than
     staying up until somebody notices — and they go back up by themselves once
     the register says the agent is registered again, because the alternative
     is an agent who renewed on Monday chasing us on Wednesday. */
  const listings = freezeOrThaw(w.listings, ceaValid);
  if (listings) changes.listings = listings;

  // A registered agent whose application was never submitted was seeded before
  // the registration was attached. Put them where signing up would have.
  if (user.cea && !w.profileSubmitted && w.approval === 'not_submitted') {
    changes.profileSubmitted = true;
    changes.approval = opts.autoApprove ? 'approved' : 'under_review';
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

export function seedWorkspace(
  user: PublicAccount,
  opts: { autoApprove: boolean; demo?: boolean } = { autoApprove: false },
): WorkspaceState {
  const name = displayName(user.cea?.name ?? user.fullName);
  const agency = user.cea ? displayAgency(user.cea.agencyName) : '';

  const profile: AgentProfile = {
    fullName: name,
    email: user.email,
    mobile: user.mobile,
    ceaNumber: user.cea?.registrationNo ?? '',
    agency,
    agencyLicence: user.cea?.agencyLicenceNo ?? '',
    // Left empty on purpose: a biography invented for a real person would be
    // the one thing on the screen they know to be false.
    bio: '',
    experienceYears: '',
  };

  // Whether the address is confirmed is the account's business, not the
  // workspace's; this only mirrors it so the screens have it to hand.
  const emailVerified = Boolean(user.emailVerifiedAt);

  // Staff have no portfolio; the agent workspace exists for them only so the
  // frame renders when they switch across to it.
  if (user.role === 'admin' || !user.cea) {
    return {
      emailVerified,
      mobileVerified: false,
      profileSubmitted: false,
      approval: 'not_submitted',
      ceaValid: false,
      ceaValidUntil: '',
      planCode: null,
      subscription: 'none',
      paymentMethod: null,
      profile,
      listings: [],
      notifications: { ...DEFAULT_NOTIFICATIONS },
      enquiries: [],
      alerts: [],
      tools: { ...EMPTY_TOOLS },
      views: [],
      reveals: [],
      revealCredits: STARTING_REVEAL_CREDITS,
    };
  }

  return {
    emailVerified,
    // Out of scope for the POC: SMS needs the sender name registered with SGNIC
    // before a message can be delivered at all.
    mobileVerified: false,
    profileSubmitted: true,
    approval: opts.autoApprove || opts.demo ? 'approved' : 'under_review',
    ceaValid: registrationIsCurrent(user.cea.registrationEnd),
    ceaValidUntil: user.cea.registrationEnd,
    // A Starter subscription so the account is usable from the first minute.
    // Seeded listings are drafts, so none of the quota is spent and the first
    // publish is the agent's own decision rather than something already done
    // in their name.
    planCode: 'starter',
    subscription: 'active',
    paymentMethod: 'PayNow',
    profile,
    listings: opts.demo
      ? demoPortfolio(preferredName(name))
      : SEED_LISTINGS.map((l) => asDraft(l, preferredName(name))),
    notifications: { ...DEFAULT_NOTIFICATIONS },
    // Empty for every account, the demo account included. An enquiry means a
    // real person asked about a real listing; inventing a few would put words
    // in a stranger's mouth. Sample enquiries for a walkthrough are generated in
    // the browser behind the Demo Data switch and never stored — see
    // `lib/phase1/report-data/demo-enquiries.ts`.
    enquiries: [],
    alerts: [],
    tools: { ...EMPTY_TOOLS },
    views: [],
    reveals: [],
    /* Enough to use the feature and form a view of it before being asked for
       anything. See `views.ts`. */
    revealCredits: STARTING_REVEAL_CREDITS,
  };
}

/**
 * A seeded listing, as a draft belonging to this agent.
 *
 * Everything that records something having happened is cleared: a publication
 * date, an expiry, a moderator's rejection. A listing this account has never
 * published must not arrive carrying the history of one — and a status that
 * matters, pending review or rejected, is something the operations console
 * produces from a real decision rather than something seeded to look busy.
 */
function asDraft(l: DemoListing, agent: string): DemoListing {
  const draft: DemoListing = { ...l, agent, status: 'draft', dealType: l.dealType ?? 'rent' };
  delete draft.publishedAt;
  delete draft.expiresAt;
  delete draft.rejectionReason;
  delete draft.archived;
  return draft;
}

/* --------------------------------------------------------- the demo account

   One account, named in `.env.local` and nowhere else, starts with a portfolio
   that has been used: some listings live, one paused, one rejected, the rest
   drafts, and a handful of enquiries against the live ones.

   Every other account — including a real agent who signs up with their own CEA
   number — still starts with drafts and an empty inbox, for the reason given
   above. This exception exists so the product can be shown end to end without
   somebody having to publish twelve listings by hand before the meeting, and
   the people in the enquiries are invented, which is only acceptable because
   the account they belong to is invented too.                                */

const DEMO_PUBLISHED = 5;
const DEMO_PAUSED = 1;

export function demoPortfolio(agent: string): DemoListing[] {
  return SEED_LISTINGS.map((l, i) => {
    const draft = asDraft(l, agent);
    if (i < DEMO_PUBLISHED) {
      const published = new Date(TODAY.getTime() - (9 + i * 6) * 86_400_000);
      const expires = new Date(published.getTime() + 90 * 86_400_000);
      return {
        ...draft,
        status: 'published' as ListingStatus,
        publishedAt: published.toISOString(),
        expiresAt: expires.toISOString(),
        reviewedAt: published.toISOString(),
      };
    }
    if (i < DEMO_PUBLISHED + DEMO_PAUSED) {
      const published = new Date(TODAY.getTime() - 52 * 86_400_000);
      return {
        ...draft,
        status: 'paused' as ListingStatus,
        publishedAt: published.toISOString(),
        expiresAt: new Date(published.getTime() + 90 * 86_400_000).toISOString(),
        reviewedAt: published.toISOString(),
      };
    }
    if (i === DEMO_PUBLISHED + DEMO_PAUSED) {
      return {
        ...draft,
        status: 'rejected' as ListingStatus,
        rejectionReason: 'Photographs show a different unit from the one advertised.',
        reviewedAt: new Date(TODAY.getTime() - 4 * 86_400_000).toISOString(),
      };
    }
    return draft;
  });
}

/* -------------------------------------------------------------- validation */

const APPROVALS: ApprovalStatus[] = ['not_submitted', 'under_review', 'approved', 'rejected', 'suspended'];
const SUBSCRIPTIONS: SubscriptionStatus[] = ['none', 'active', 'past_due', 'expired'];
const STATUSES: ListingStatus[] = [
  'draft', 'pending_review', 'published', 'paused', 'rejected', 'expired', 'suspended',
];

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const bool = (v: unknown): boolean => v === true;

/** Caps: a workspace is one agent's portfolio, not a bulk upload channel. */
const MAX_LISTINGS = 300;
const MAX_AMENITIES = 40;

function cleanListing(raw: unknown): DemoListing | null {
  if (!raw || typeof raw !== 'object') return null;
  const l = raw as Record<string, unknown>;
  if (typeof l.id !== 'string' || !l.id) return null;
  const status = STATUSES.includes(l.status as ListingStatus) ? (l.status as ListingStatus) : 'draft';
  const type = ['Condominium', 'HDB', 'Apartment', 'Landed', 'Executive Condominium'].includes(l.propertyType as string)
    ? (l.propertyType as DemoListing['propertyType'])
    : 'Condominium';
  const furnishing = ['Unfurnished', 'Partially furnished', 'Fully furnished', 'Other'].includes(l.furnishing as string)
    ? (l.furnishing as DemoListing['furnishing'])
    : 'Unfurnished';

  return {
    id: str(l.id, 64),
    reference: str(l.reference, 32),
    agent: str(l.agent, 120),
    description: str(l.description, 4000) || undefined,
    project: str(l.project, 160),
    address: str(l.address, 240),
    postalCode: str(l.postalCode, 12),
    unitNo: str(l.unitNo, 24),
    district: num(l.district),
    lat: typeof l.lat === 'number' ? num(l.lat) : undefined,
    lng: typeof l.lng === 'number' ? num(l.lng) : undefined,
    propertyType: type,
    bedrooms: num(l.bedrooms),
    bathrooms: num(l.bathrooms),
    sizeSqft: num(l.sizeSqft),
    /* `dealType` decides which price the record carries; see `normaliseDeal`. */
    dealType: l.dealType === 'sale' ? 'sale' : 'rent',
    monthlyRent: l.dealType === 'sale' ? 0 : num(l.monthlyRent),
    salePriceSgd: l.dealType === 'sale' && typeof l.salePriceSgd === 'number' ? num(l.salePriceSgd) : undefined,
    availableFrom: str(l.availableFrom, 24),
    minLeaseMonths: num(l.minLeaseMonths),
    furnishing,
    status,
    images: Math.max(0, Math.min(60, num(l.images))),
    photos: Array.isArray(l.photos)
      ? l.photos.slice(0, 6).map((x) => str(x, 32)).filter((x) => /^[0-9a-f]{16}\.[a-z]{3,4}$/.test(x))
      : undefined,
    createdAt: str(l.createdAt, 24),
    updatedAt: str(l.updatedAt, 24) || undefined,
    publishedAt: str(l.publishedAt, 24) || undefined,
    expiresAt: str(l.expiresAt, 24) || undefined,
    rejectionReason: str(l.rejectionReason, 500) || undefined,
    reviewedAt: str(l.reviewedAt, 32) || undefined,
    hasFloorPlan: l.hasFloorPlan === true || floorPlans(l).length > 0 || undefined,
    /* The files live in the floor plan store; what survives a patch is the
       note that they are there. The browser cannot invent one — the upload
       route writes them — but it does send them back with the rest of the
       listing. */
    floorPlans: floorPlans(l).length ? floorPlans(l) : undefined,
    /* Same reasoning as the floor plan: the upload route writes this, and
       what a patch has to do is carry it rather than drop it. The URLs are
       rebuilt server-side on every upload, so a tampered one survives only
       until the next. */
    video: l.video && typeof l.video === 'object'
      ? (() => {
        const v = l.video as Record<string, unknown>;
        return {
          publicId: str(v.publicId, 200),
          url: str(v.url, 400),
          posterUrl: str(v.posterUrl, 400),
          bytes: num(v.bytes),
          durationSec: typeof v.durationSec === 'number' ? num(v.durationSec) : undefined,
          format: str(v.format, 12),
          at: str(v.at, 32),
        };
      })()
      : undefined,
    amenities: Array.isArray(l.amenities)
      ? l.amenities.slice(0, MAX_AMENITIES).map((a) => str(a, 60)).filter(Boolean)
      : undefined,
    propertyCategory: str(l.propertyCategory, 24) || undefined,
    propertySubtype: str(l.propertySubtype, 60) || undefined,
    furnishingNote: str(l.furnishingNote, 80) || undefined,
    eligibility: cleanEligibility(l.eligibility),
    fittings: Array.isArray(l.fittings)
      ? l.fittings.slice(0, MAX_AMENITIES).map((a) => str(a, 60)).filter(Boolean)
      : undefined,
    /* Derived from the unit number when a listing is advertised, and kept here
       so a round trip through the browser does not drop it. */
    floorLevel: typeof l.floorLevel === 'number' ? num(l.floorLevel) : undefined,
    /* Only ever set by the platform, and only to the one value it means. */
    frozen: l.frozen === 'cea_lapsed' ? 'cea_lapsed' : undefined,
    depositMonths: typeof l.depositMonths === 'number' ? num(l.depositMonths) : undefined,
    nearestMrt: str(l.nearestMrt, 80) || undefined,
    tenure: ['Freehold', '99-year leasehold', '999-year leasehold'].includes(l.tenure as string)
      ? (l.tenure as DemoListing['tenure'])
      : undefined,
    builtYear: typeof l.builtYear === 'number' ? num(l.builtYear) : undefined,
    archived: l.archived === true || undefined,
  };
}

/**
 * Narrow an untrusted body to the fields a workspace actually has.
 *
 * The browser is writing the agent's own record, so this is not an authority
 * check — that is the session. It is here so a malformed or oversized body
 * cannot land on disk and break every later read.
 */
const ENQUIRY_STATUSES: EnquiryStatus[] = ['new', 'replied', 'viewing', 'closed'];

/** Caps: an inbox, not a mailing list. */
const MAX_ENQUIRIES = 500;

function cleanEnquiry(raw: unknown): Enquiry | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.id !== 'string' || !e.id) return null;
  const channel = e.channel === 'WhatsApp' || e.channel === 'Phone' ? e.channel : 'V-RENT';
  return {
    id: str(e.id, 64),
    listingId: str(e.listingId, 64),
    name: str(e.name, 120),
    contact: str(e.contact, 120),
    message: str(e.message, 2000),
    at: str(e.at, 32),
    channel,
    status: ENQUIRY_STATUSES.includes(e.status as EnquiryStatus) ? (e.status as EnquiryStatus) : 'new',
    moveIn: str(e.moveIn, 24) || undefined,
    budget: typeof e.budget === 'number' ? num(e.budget) : undefined,
    bedrooms: typeof e.bedrooms === 'number' ? Math.max(0, Math.min(10, Math.round(num(e.bedrooms)))) : undefined,
    lastActionAt: str(e.lastActionAt, 32) || undefined,
    viewingAt: str(e.viewingAt, 32) || undefined,
    outcome: e.outcome === 'let' || e.outcome === 'lost' ? e.outcome : undefined,
  };
}

/**
 * Demo records — the demo account's listings, enquiries and alerts — are made in
 * the browser and never stored. One that arrives here is refused, so a demo
 * record cannot be saved however it was sent.
 */
const isDemoRecord = (raw: unknown) =>
  !!raw && typeof raw === 'object' && String((raw as Record<string, unknown>).id ?? '').startsWith('demo-');

/**
 * The floor plans on a listing, from either shape the record has had.
 *
 * There used to be one plan per listing, stored under `floorPlan`. Workspaces
 * written before it became a list still carry that field, and dropping it here
 * would quietly detach a plan from every listing that already had one — the
 * file would still be in the store with nothing pointing at it. So the old
 * shape is read and folded into the new one, which is the last time anything
 * has to think about it.
 */
function floorPlans(l: Record<string, unknown>): { id: string; filename: string; contentType: string; bytes: number; at: string }[] {
  const one = (raw: unknown, fallbackId: string) => {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const at = str(r.at, 32);
    return {
      id: str(r.id, 64) || fallbackId || at,
      filename: str(r.filename, 120),
      contentType: str(r.contentType, 60),
      bytes: num(r.bytes),
      at,
    };
  };

  if (Array.isArray(l.floorPlans)) {
    return l.floorPlans.slice(0, 12).map((raw, i) => one(raw, `plan-${i}`)).filter((p) => p !== null);
  }
  const legacy = one(l.floorPlan, 'plan-0');
  return legacy ? [legacy] : [];
}

export function sanitisePatch(raw: unknown): Partial<WorkspaceState> {
  if (!raw || typeof raw !== 'object') return {};
  const b = raw as Record<string, unknown>;
  const patch: Partial<WorkspaceState> = {};

  if ('emailVerified' in b) patch.emailVerified = bool(b.emailVerified);
  if ('mobileVerified' in b) patch.mobileVerified = bool(b.mobileVerified);
  if ('profileSubmitted' in b) patch.profileSubmitted = bool(b.profileSubmitted);
  if ('ceaValid' in b) patch.ceaValid = bool(b.ceaValid);
  if ('ceaValidUntil' in b) patch.ceaValidUntil = str(b.ceaValidUntil, 24);
  if (APPROVALS.includes(b.approval as ApprovalStatus)) patch.approval = b.approval as ApprovalStatus;
  if (SUBSCRIPTIONS.includes(b.subscription as SubscriptionStatus)) patch.subscription = b.subscription as SubscriptionStatus;
  if ('planCode' in b) {
    patch.planCode = PLANS.some((p) => p.code === b.planCode) ? (b.planCode as PlanOption['code']) : null;
  }
  if ('paymentMethod' in b) {
    patch.paymentMethod = b.paymentMethod === 'PayNow' || b.paymentMethod === 'Card' ? b.paymentMethod : null;
  }
  if (b.profile && typeof b.profile === 'object') {
    const p = b.profile as Record<string, unknown>;
    patch.profile = {
      fullName: str(p.fullName, 120),
      email: str(p.email, 254),
      mobile: str(p.mobile, 32),
      ceaNumber: str(p.ceaNumber, 16),
      agency: str(p.agency, 160),
      agencyLicence: str(p.agencyLicence, 32),
      bio: str(p.bio, 2000),
      experienceYears: str(p.experienceYears, 8),
    };
  }
  if (b.notifications && typeof b.notifications === 'object') {
    const raw = b.notifications as Record<string, unknown>;
    const clean: NotificationPrefs = {};
    // Only keys we know about: an unbounded map from the browser would grow
    // the stored record without limit.
    for (const key of Object.keys(DEFAULT_NOTIFICATIONS)) {
      const v = raw[key] as { email?: unknown; sms?: unknown } | undefined;
      clean[key] = v && typeof v === 'object'
        ? { email: bool(v.email), sms: bool(v.sms) }
        : DEFAULT_NOTIFICATIONS[key];
    }
    patch.notifications = clean;
  }
  if (Array.isArray(b.alerts)) {
    patch.alerts = b.alerts.slice(0, 100).flatMap((raw) => {
      if (!raw || typeof raw !== 'object' || isDemoRecord(raw)) return [];
      const a = raw as Record<string, unknown>;
      if (typeof a.id !== 'string' || !a.id) return [];
      const tone = ['info', 'success', 'warning', 'danger'].includes(a.tone as string)
        ? (a.tone as Alert['tone'])
        : 'info';
      return [{
        id: str(a.id, 64),
        at: str(a.at, 32),
        kind: str(a.kind, 32),
        title: str(a.title, 200),
        body: str(a.body, 1000),
        href: str(a.href, 300) || undefined,
        tone,
        read: a.read === true,
      }];
    });
  }
  if (Array.isArray(b.enquiries)) {
    patch.enquiries = b.enquiries
      .filter((e) => !isDemoRecord(e))
      .slice(0, MAX_ENQUIRIES)
      .map(cleanEnquiry)
      .filter((e): e is Enquiry => e !== null);
  }
  if (Array.isArray(b.listings)) {
    patch.listings = b.listings
      .filter((l) => !isDemoRecord(l))
      .slice(0, MAX_LISTINGS)
      .map(cleanListing)
      .filter((l): l is DemoListing => l !== null);
  }
  if (b.tools && typeof b.tools === 'object') patch.tools = cleanTools(b.tools);
  return patch;
}

/**
 * The tools bag, bounded rather than field-by-field.
 *
 * Everything in it is prototype surface — a featured run, a viewing slot, a
 * saved shortlist — and its shape is still moving. Validating each field by
 * hand would be a second copy of `tools.ts` that drifts from it. What actually
 * has to be guaranteed is that nothing unserialisable, unbounded or deeply
 * nested lands on disk, because that is what would break every later read. So:
 * re-serialise through JSON with a depth limit, an array limit and a string
 * limit, and fill the result out from the empty shape.
 */
function bounded(value: unknown, depth = 0): unknown {
  if (depth > 6) return null;
  if (typeof value === 'string') return value.slice(0, 4000);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 400).map((v) => bounded(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 60)) {
      out[k.slice(0, 64)] = bounded(v, depth + 1);
    }
    return out;
  }
  return null;
}

function cleanTools(raw: unknown): ToolsState {
  const b = bounded(raw) as Partial<ToolsState> | null;
  if (!b || typeof b !== 'object') return { ...EMPTY_TOOLS };
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    refresh: arr(b.refresh),
    slots: arr(b.slots),
    shortlists: arr(b.shortlists),
    tickets: arr(b.tickets),
    publicPage: { ...EMPTY_TOOLS.publicPage, ...(b.publicPage ?? {}) },
    guidesDone: arr<string>(b.guidesDone).filter((g) => typeof g === 'string'),
    sessionsWatched: arr<string>(b.sessionsWatched).filter((g) => typeof g === 'string'),
  };
}
