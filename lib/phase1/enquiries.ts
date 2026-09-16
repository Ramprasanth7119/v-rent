/**
 * What an enquiry means to the agent reading it.
 *
 * The stored record has four statuses. An agent thinks in more than four — a
 * reply that has gone quiet needs chasing, a viewing that has happened needs a
 * decision — so each enquiry is read into a stage and one next action here,
 * from the status and the dates it carries. Nothing is stored: the stage is a
 * reading of the record, and the same reading serves the dashboard, the inbox
 * and the detail panel, so they cannot disagree.
 *
 * Free of React so it can be tested and reused on either side.
 */

import type { DemoListing } from './data';
import { ENQUIRY_STATUS } from './performance';
import type { Enquiry, EnquiryStatus } from './workspace';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

export type EnquiryStage =
  | 'new' | 'overdue' | 'contacted' | 'follow_up'
  | 'viewing_requested' | 'viewing_scheduled' | 'viewed'
  | 'let' | 'lost' | 'closed';

export interface StageReading {
  stage: EnquiryStage;
  label: string;
  tone: Tone;
  /** What to do next, in a few words. Null once there is nothing left to do. */
  action: string | null;
  /** How pressing the action is. */
  urgency: 'high' | 'medium' | 'low' | 'none';
  /** Sort key: lower needs the agent sooner. */
  rank: number;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** A new enquiry older than this has waited too long for a first reply. */
export const REPLY_WITHIN_H = 4;
/** A reply that has had no movement for this long is due a follow-up. */
export const FOLLOW_UP_AFTER_D = 2;

const ms = (v?: string) => {
  if (!v) return NaN;
  // The enquiry route stores "2026-09-16 02:42" without a zone, cut from a UTC ISO string.
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v) ? `${v.replace(' ', 'T')}:00Z` : v;
  return new Date(iso).getTime();
};

export const enquiryTime = (e: Enquiry) => ms(e.at);

export function readStage(e: Enquiry, now: Date): StageReading {
  const t = now.getTime();
  switch (e.status) {
    case 'new': {
      const waited = t - ms(e.at);
      return waited > REPLY_WITHIN_H * HOUR
        ? { stage: 'overdue', label: 'New', tone: 'danger', action: 'Reply now', urgency: 'high', rank: 0 }
        : { stage: 'new', label: 'New', tone: 'info', action: 'Reply', urgency: 'high', rank: 1 };
    }
    case 'replied': {
      const since = t - ms(e.lastActionAt ?? e.at);
      return since > FOLLOW_UP_AFTER_D * DAY
        ? { stage: 'follow_up', label: 'Follow-up due', tone: 'warning', action: 'Follow up', urgency: 'medium', rank: 2 }
        : { stage: 'contacted', label: 'Contacted', tone: 'neutral', action: 'Awaiting their reply', urgency: 'low', rank: 6 };
    }
    case 'viewing': {
      const at = ms(e.viewingAt);
      if (Number.isNaN(at)) {
        return { stage: 'viewing_requested', label: 'Viewing requested', tone: 'warning', action: 'Confirm a time', urgency: 'medium', rank: 3 };
      }
      return at > t
        ? { stage: 'viewing_scheduled', label: 'Viewing booked', tone: 'success', action: 'Prepare for the viewing', urgency: 'low', rank: 5 }
        : { stage: 'viewed', label: 'Viewed', tone: 'accent', action: 'Ask for a decision', urgency: 'medium', rank: 4 };
    }
    case 'closed':
    default:
      if (e.outcome === 'let') return { stage: 'let', label: 'Let', tone: 'success', action: null, urgency: 'none', rank: 9 };
      if (e.outcome === 'lost') return { stage: 'lost', label: 'Unsuccessful', tone: 'neutral', action: null, urgency: 'none', rank: 9 };
      return { stage: 'closed', label: 'Closed', tone: 'neutral', action: null, urgency: 'none', rank: 9 };
  }
}

/** Needs the agent today: a first reply, a follow-up, a time to confirm or a decision to ask for. */
export const needsAction = (r: StageReading) => r.urgency === 'high' || r.urgency === 'medium';

/* ------------------------------------------------------------------ filters */

export type StatusFilter = 'all' | 'action' | EnquiryStatus;
export type SortKey = 'priority' | 'newest' | 'oldest';

/** The stored statuses, in the words the agent sees. */
export const STATUS_LABEL: Record<EnquiryStatus, string> = Object.fromEntries(
  Object.entries(ENQUIRY_STATUS).map(([k, v]) => [k, v.label]),
) as Record<EnquiryStatus, string>;

export interface EnquiryQuery {
  status: StatusFilter;
  listingId: string; // '' for every listing
  text: string;
  sort: SortKey;
}

export const DEFAULT_QUERY: EnquiryQuery = { status: 'all', listingId: '', text: '', sort: 'priority' };

export function filterEnquiries(
  all: Enquiry[],
  q: EnquiryQuery,
  byId: Map<string, DemoListing>,
  now: Date,
): Enquiry[] {
  const words = q.text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rows = all.filter((e) => {
    if (q.listingId && e.listingId !== q.listingId) return false;
    if (q.status === 'action' && !needsAction(readStage(e, now))) return false;
    if (q.status !== 'all' && q.status !== 'action' && e.status !== q.status) return false;
    if (!words.length) return true;
    const l = byId.get(e.listingId);
    const hay = [e.name, e.message, e.channel, l?.project, l?.unitNo, l?.address].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const newest = (a: Enquiry, b: Enquiry) => enquiryTime(b) - enquiryTime(a);
  if (q.sort === 'newest') return rows.sort(newest);
  if (q.sort === 'oldest') return rows.sort((a, b) => -newest(a, b));
  return rows.sort((a, b) => readStage(a, now).rank - readStage(b, now).rank || newest(a, b));
}

/* --------------------------------------------------------------------- fit */

export interface FitCheck {
  key: 'budget' | 'movein' | 'bedrooms';
  label: string;
  detail: string;
  tone: 'success' | 'warning' | 'neutral';
}

/**
 * How the request sits against the listing — the "is this a real prospect"
 * question, answered only from what the enquirer said. A missing answer is
 * shown as missing, never as a pass.
 */
export function fitChecks(e: Enquiry, l: DemoListing | undefined): FitCheck[] {
  if (!l) return [];
  const out: FitCheck[] = [];
  const asking = l.dealType === 'sale' ? l.salePriceSgd ?? 0 : l.monthlyRent;
  if (e.budget && asking) {
    const ratio = e.budget / asking;
    out.push(ratio >= 1
      ? { key: 'budget', label: 'Budget', detail: 'At or above the asking rent', tone: 'success' }
      : ratio >= 0.92
        ? { key: 'budget', label: 'Budget', detail: `${Math.round((1 - ratio) * 100)}% under asking — room to talk`, tone: 'warning' }
        : { key: 'budget', label: 'Budget', detail: `${Math.round((1 - ratio) * 100)}% under asking`, tone: 'neutral' });
  } else {
    out.push({ key: 'budget', label: 'Budget', detail: 'Not given — ask before a viewing', tone: 'neutral' });
  }
  const wants = e.moveIn ? ms(`${e.moveIn}T00:00:00+08:00`) : NaN;
  const free = ms(`${l.availableFrom}T00:00:00+08:00`);
  if (!Number.isNaN(wants) && !Number.isNaN(free)) {
    const early = wants < free;
    out.push(early
      ? { key: 'movein', label: 'Move-in', detail: 'Before the unit is available', tone: 'warning' }
      : { key: 'movein', label: 'Move-in', detail: 'Unit is available by then', tone: 'success' });
  }
  if (typeof e.bedrooms === 'number') {
    out.push(e.bedrooms === l.bedrooms
      ? { key: 'bedrooms', label: 'Bedrooms', detail: 'Matches the unit', tone: 'success' }
      : { key: 'bedrooms', label: 'Bedrooms', detail: `Asked for ${e.bedrooms}, unit has ${l.bedrooms}`, tone: 'warning' });
  }
  return out;
}

/* ----------------------------------------------------------------- contact */

export type ContactKind = 'phone' | 'email' | 'other';

export const contactKind = (c: string): ContactKind =>
  /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(c.trim()) ? 'email' : /^\+?[\d\s()-]{7,}$/.test(c.trim()) ? 'phone' : 'other';

/**
 * A demo account's phone contact: masked ("+65 9••• 8842"), so it names a
 * mobile without being one anybody can reach. Screens use it to show the demo
 * enquiries that would be reachable by phone, never to build a link.
 */
export const isMaskedPhone = (c: string): boolean =>
  c.includes('•') && !c.includes('@') && /^\+?[\d\s•()-]+$/.test(c.trim());

/**
 * A sample enquiry an earlier version of V-RENT seeded into new workspaces
 * (`enq-demo-1` …). Some accounts still hold them as their own records. Their
 * numbers were made up, which means they may belong to somebody real, so no
 * screen may turn one into a call or a message.
 */
export const isSeededSample = (id: string): boolean => id.startsWith('enq-demo-');

/** Links that open the agent's own phone, WhatsApp or mail client. Null when the contact is not usable. */
export function contactLinks(c: string): { call?: string; whatsapp?: string; email?: string } {
  const kind = contactKind(c);
  if (kind === 'email') return { email: `mailto:${c}` };
  if (kind === 'phone') {
    const digits = c.replace(/\D/g, '');
    const intl = digits.length === 8 ? `65${digits}` : digits;
    return { call: `tel:+${intl}`, whatsapp: `https://wa.me/${intl}` };
  }
  return {};
}
