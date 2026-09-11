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

/** The prototype's fixed "today", so every relative date reads the same in every run. */
export const TODAY_ISO = '2026-08-28';
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
function registrationIsCurrent(endDate?: string): boolean {
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
export function seedWorkspace(user: PublicAccount, opts: { autoApprove: boolean } = { autoApprove: false }): WorkspaceState {
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
    };
  }

  return {
    emailVerified,
    // Out of scope for the POC: SMS needs the sender name registered with SGNIC
    // before a message can be delivered at all.
    mobileVerified: false,
    profileSubmitted: true,
    approval: opts.autoApprove ? 'approved' : 'under_review',
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
    listings: SEED_LISTINGS.map((l) => asDraft(l, preferredName(name))),
    notifications: { ...DEFAULT_NOTIFICATIONS },
    // Empty on purpose. An enquiry means a real person asked about a real
    // listing; inventing a few would put words in a stranger's mouth, and the
    // inbox fills the moment a share link is used.
    enquiries: [],
    alerts: [],
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
  const furnishing = ['Unfurnished', 'Partially furnished', 'Fully furnished'].includes(l.furnishing as string)
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
    dealType: l.dealType === 'sale' ? 'sale' : 'rent',
    monthlyRent: num(l.monthlyRent),
    salePriceSgd: typeof l.salePriceSgd === 'number' ? num(l.salePriceSgd) : undefined,
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
    hasFloorPlan: l.hasFloorPlan === true || undefined,
    amenities: Array.isArray(l.amenities)
      ? l.amenities.slice(0, MAX_AMENITIES).map((a) => str(a, 60)).filter(Boolean)
      : undefined,
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
  };
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
      if (!raw || typeof raw !== 'object') return [];
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
      .slice(0, MAX_ENQUIRIES)
      .map(cleanEnquiry)
      .filter((e): e is Enquiry => e !== null);
  }
  if (Array.isArray(b.listings)) {
    patch.listings = b.listings
      .slice(0, MAX_LISTINGS)
      .map(cleanListing)
      .filter((l): l is DemoListing => l !== null);
  }
  return patch;
}
