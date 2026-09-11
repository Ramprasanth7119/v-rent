/**
 * State for the tools that sit beside the listing pipeline — featuring,
 * refreshing, shortlists, viewings, WhatsApp, placement, the public page and
 * support.
 *
 * These share one bag on the workspace rather than a field each. They are all
 * demonstrations of a commercial mechanic rather than the record of truth for
 * it: in production a featured slot is a payment with an invoice against it and
 * a viewing booking is a calendar entry a tenant also holds. Keeping them
 * together makes it obvious which part of the stored workspace is the prototype
 * surface and which part is the listing data the rest of the product depends
 * on.
 */

import type { DemoListing } from './data';

/* ------------------------------------------------------------------ types */

export type FeatureDays = 7 | 14 | 30;

export interface FeatureCampaign {
  id: string;
  listingId: string;
  days: FeatureDays;
  startedAt: string;
  endsAt: string;
  /** What the agent committed to, at the rate below. */
  spendSgd: number;
  ratePerDay: number;
  /** Reported back against the spend. */
  views: number;
  enquiries: number;
  status: 'active' | 'ended' | 'cancelled';
}

export type RefreshCadence = 'off' | 'daily' | 'alternate' | 'weekly';

export interface RefreshRule {
  listingId: string;
  cadence: RefreshCadence;
  /** Hour of the day, Singapore time, the refresh runs. */
  hour: number;
  lastRunAt?: string;
  runs: number;
}

export interface ViewingSlot {
  id: string;
  /** ISO date, Singapore. */
  date: string;
  start: string;
  end: string;
  /** A listing id, or 'any' for a slot the tenant picks a property for. */
  listingId: string;
  booking?: { name: string; mobile: string; at: string; note?: string };
}

export interface Shortlist {
  id: string;
  name: string;
  clientName: string;
  note: string;
  listingIds: string[];
  createdAt: string;
}

export interface PlacementBid {
  district: number;
  dailySgd: number;
  startedAt: string;
  active: boolean;
}

export interface SupportTicket {
  id: string;
  area: string;
  subject: string;
  body: string;
  at: string;
  status: 'open' | 'answered';
  reply?: string;
  repliedAt?: string;
}

export interface PublicPageSettings {
  slug: string;
  headline: string;
  visible: boolean;
  showEnquiryForm: boolean;
  showTrackRecord: boolean;
  districts: string;
}

export interface ToolsState {
  featured: FeatureCampaign[];
  refresh: RefreshRule[];
  slots: ViewingSlot[];
  shortlists: Shortlist[];
  placements: PlacementBid[];
  tickets: SupportTicket[];
  publicPage: PublicPageSettings;
  /** Ids of the getting-started guides marked done. */
  guidesDone: string[];
  /** Ids of the recorded sessions watched. */
  sessionsWatched: string[];
}

export const EMPTY_TOOLS: ToolsState = {
  featured: [],
  refresh: [],
  slots: [],
  shortlists: [],
  placements: [],
  tickets: [],
  publicPage: {
    slug: '',
    headline: '',
    visible: true,
    showEnquiryForm: true,
    showTrackRecord: true,
    districts: '',
  },
  guidesDone: [],
  sessionsWatched: [],
};

/* ---------------------------------------------------------------- pricing */

/**
 * Featured placement is sold per day, cheaper the longer the run, because the
 * slot is easier to fill when it is committed in advance. The numbers are the
 * ones in the build estimate, not invented at render time.
 */
export const FEATURE_RATES: Record<FeatureDays, number> = { 7: 12, 14: 10, 30: 8 };

export const featureSpend = (days: FeatureDays) => FEATURE_RATES[days] * days;

/**
 * What a featured run is worth, stated as a range rather than a number. A
 * single figure would be a promise the product cannot keep; a range derived
 * from the listing's own recent traffic is a forecast the agent can check.
 */
export function featureForecast(baseViews30d: number, days: FeatureDays) {
  const daily = Math.max(2, Math.round(baseViews30d / 30));
  const low = Math.round(daily * days * 2.1);
  const high = Math.round(daily * days * 3.4);
  return { low, high, daily };
}

/** Placement is priced by how contested the district is. */
export const PLACEMENT_TIERS: Record<'core' | 'city' | 'suburban', { label: string; dailySgd: number; districts: number[] }> = {
  core: { label: 'Core Central', dailySgd: 18, districts: [9, 10, 11, 1, 2, 4, 6] },
  city: { label: 'City fringe', dailySgd: 12, districts: [3, 5, 7, 8, 12, 13, 14, 15] },
  suburban: { label: 'Outside central', dailySgd: 7, districts: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28] },
};

export function placementTier(district: number) {
  for (const tier of Object.values(PLACEMENT_TIERS)) {
    if (tier.districts.includes(district)) return tier;
  }
  return PLACEMENT_TIERS.suburban;
}

/* ---------------------------------------------------------------- helpers */

export const toolsId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** A URL-safe handle for the public agent page, derived from the agent's name. */
export function agentSlug(fullName: string, ceaNumber: string): string {
  const base = fullName
    .replace(/\s*\(.*\)\s*$/, '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const tail = ceaNumber.replace(/[^A-Za-z0-9]/g, '').slice(-4).toLowerCase();
  return base ? `${base}-${tail}` : tail;
}

/** A campaign that has run past its end date is over, whatever it says. */
export const campaignActive = (c: FeatureCampaign, today: Date) =>
  c.status === 'active' && new Date(c.endsAt) >= today;

export const featuredListingIds = (tools: ToolsState, today: Date) =>
  new Set(tools.featured.filter((c) => campaignActive(c, today)).map((c) => c.listingId));

/** Listings an agent can actually put money behind: live and not already featured. */
export function featurableListings(listings: DemoListing[], tools: ToolsState, today: Date) {
  const taken = featuredListingIds(tools, today);
  return listings.filter((l) => !l.archived && l.status === 'published' && !taken.has(l.id));
}
