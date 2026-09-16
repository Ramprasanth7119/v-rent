/**
 * What the Account screens read off the workspace.
 *
 * Nothing here is stored and nothing is invented. Every figure is derived from
 * a record the workspace already holds — the plan, the listings, the enquiry
 * records, the account's own history — and where the record does not exist
 * the answer is `null`, so the screen can say "not recorded" rather than show
 * a plausible number.
 *
 * The same functions serve both data sets. With Demo Data ON the workspace is
 * the demo account's and these read its records; with it OFF they read the
 * agent's own. There is no demo branch in here.
 */

import type { DemoListing, ListingStatus, PlanOption } from './data';
import type { Alert, Enquiry } from './workspace';
import { enquiryTime } from './enquiries';

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/* ------------------------------------------------------------ the allowance */

/** Statuses that hold one of the plan's listing slots. Matches the quota the workspace enforces. */
export const SLOT_STATUSES: ListingStatus[] = ['published', 'paused'];

export interface SlotUsage {
  limit: number;
  published: number;
  paused: number;
  used: number;
  available: number;
  /** Whole percent of the allowance in use, 0 when there is no allowance. */
  pct: number;
  /** Listings in the workspace that do not take a slot, by why. */
  waiting: { status: ListingStatus; count: number }[];
}

export function slotUsage(listings: DemoListing[], limit: number): SlotUsage {
  const live = listings.filter((l) => !l.archived);
  const count = (s: ListingStatus) => live.filter((l) => l.status === s).length;
  const published = count('published');
  const paused = count('paused');
  const used = published + paused;
  const order: ListingStatus[] = ['pending_review', 'draft', 'rejected', 'expired', 'suspended'];
  return {
    limit,
    published,
    paused,
    used,
    available: Math.max(0, limit - used),
    pct: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0,
    waiting: order.map((status) => ({ status, count: count(status) })).filter((w) => w.count > 0),
  };
}

/** How full the allowance is, in words a reader can act on. */
export function usageTone(pct: number): 'primary' | 'warning' | 'danger' {
  if (pct >= 100) return 'danger';
  if (pct >= 80) return 'warning';
  return 'primary';
}

/* --------------------------------------------------------------- billing */

export interface BillingRow {
  id: string;
  at: string;
  description: string;
  /** The plan the record names, when it names one. */
  plan: PlanOption | null;
  /** The plan's yearly price, when the record names a plan. Never guessed otherwise. */
  amount: number | null;
  method: 'PayNow' | 'Card' | null;
  status: 'paid' | 'failed' | 'due' | 'recorded';
}

/**
 * The payments the account has on record, newest first.
 *
 * Read from the account's own history (its `subscription` entries). A prototype
 * checkout that never reached a payment provider leaves no entry, and so shows
 * no row — the screen says so instead of drawing an invoice that was never
 * issued.
 */
export function billingHistory(alerts: Alert[], plans: PlanOption[]): BillingRow[] {
  return alerts
    .filter((a) => a.kind === 'subscription' && !Number.isNaN(new Date(a.at).getTime()))
    .map((a) => {
      const plan = plans.find((p) => new RegExp(`\\b${p.name}\\b`, 'i').test(a.title)) ?? null;
      const paidBy = /\b(PayNow|Card)\b/.exec(`${a.title} ${a.body}`);
      const status: BillingRow['status'] =
        a.tone === 'success' ? 'paid' : a.tone === 'danger' ? 'failed' : a.tone === 'warning' ? 'due' : 'recorded';
      return {
        id: a.id,
        at: a.at,
        description: a.title,
        plan,
        amount: plan ? plan.priceYearSgd : null,
        method: paidBy ? (paidBy[1] as BillingRow['method']) : null,
        status,
      };
    })
    .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
}

/** Plans renew yearly, so the next renewal is a year after the last payment on record. Null without one. */
export function nextRenewal(rows: BillingRow[]): Date | null {
  const last = rows.find((r) => r.status === 'paid');
  if (!last) return null;
  const d = new Date(last.at);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

export interface Term {
  start: Date;
  end: Date;
  /** Share of the term already behind the account, 0–100. */
  elapsedPct: number;
  daysLeft: number;
}

/** Where `now` sits between two dates. Null when either end is missing or they are the wrong way round. */
export function termBetween(start: Date | string | null | undefined, end: Date | string | null | undefined, now: Date): Term | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e.getTime() <= s.getTime()) return null;
  const span = e.getTime() - s.getTime();
  const done = Math.min(span, Math.max(0, now.getTime() - s.getTime()));
  return {
    start: s,
    end: e,
    elapsedPct: Math.round((done / span) * 100),
    daysLeft: Math.max(0, Math.ceil((e.getTime() - now.getTime()) / DAY)),
  };
}

/** Whole days from `now` to a date, never below zero. */
export const daysUntilDate = (d: Date, now: Date) => Math.max(0, Math.ceil((d.getTime() - now.getTime()) / DAY));

/* ------------------------------------------------------------ enquiries */

/**
 * Enquiries received per week, oldest week first, the last week ending at
 * `now`. Counted from the enquiry records themselves, so these are real in
 * either data set: the agent's own inbox, or the demo account's.
 */
export function enquiryWeeks(enquiries: Enquiry[], now: Date, weeks = 12): number[] {
  const out = Array(weeks).fill(0) as number[];
  const end = now.getTime();
  for (const e of enquiries) {
    const t = enquiryTime(e);
    if (Number.isNaN(t) || t > end) continue;
    const back = Math.floor((end - t) / WEEK);
    if (back < weeks) out[weeks - 1 - back] += 1;
  }
  return out;
}

/** The Monday-free label for a week ending `back` weeks before `now`: "8 Sept". */
export function weekLabels(now: Date, weeks = 12): string[] {
  const f = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' });
  return Array.from({ length: weeks }, (_, i) => f.format(new Date(now.getTime() - (weeks - 1 - i) * WEEK)));
}
