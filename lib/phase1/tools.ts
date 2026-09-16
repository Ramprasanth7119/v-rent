/**
 * State for the tools that sit beside the listing pipeline — refreshing,
 * shortlists, viewings, WhatsApp, the public page and support.
 *
 * These share one bag on the workspace rather than a field each. They are all
 * demonstrations of a commercial mechanic rather than the record of truth for
 * it: in production a viewing booking is a calendar entry a tenant also holds.
 * Keeping them together makes it obvious which part of the stored workspace is
 * the prototype surface and which part is the listing data the rest of the
 * product depends on.
 */

/* ------------------------------------------------------------------ types */

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
  refresh: RefreshRule[];
  slots: ViewingSlot[];
  shortlists: Shortlist[];
  tickets: SupportTicket[];
  publicPage: PublicPageSettings;
  /** Ids of the getting-started guides marked done. */
  guidesDone: string[];
  /** Ids of the recorded sessions watched. */
  sessionsWatched: string[];
}

export const EMPTY_TOOLS: ToolsState = {
  refresh: [],
  slots: [],
  shortlists: [],
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

