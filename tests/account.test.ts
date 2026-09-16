/**
 * What the Account screens read off the workspace.
 *
 * The rule under test is the same throughout: a figure is derived from a
 * record, and where the record is missing the answer is null rather than a
 * plausible number.
 */

import { describe, expect, it } from 'vitest';
import { PLANS, SEED_LISTINGS, type DemoListing } from '../lib/phase1/data';
import {
  billingHistory, daysUntilDate, enquiryWeeks, nextRenewal, slotUsage, termBetween, usageTone,
} from '../lib/phase1/account';
import { demoWorkspace } from '../lib/phase1/report-data/demo-workspace';
import type { Alert, Enquiry } from '../lib/phase1/workspace';

const NOW = new Date('2026-09-16T10:00:00+08:00');
const DAY = 86_400_000;

const listing = (status: DemoListing['status'], over: Partial<DemoListing> = {}): DemoListing =>
  ({ ...SEED_LISTINGS[0], id: `l-${Math.random()}`, status, ...over });

const alert = (over: Partial<Alert>): Alert => ({
  id: 'a1', at: new Date(NOW.getTime() - 6 * DAY).toISOString(), kind: 'subscription',
  title: 'Professional plan renewed', body: 'Paid by PayNow.', tone: 'success', read: true, ...over,
});

describe('the listing allowance', () => {
  it('counts live and paused listings against the limit, and names the rest', () => {
    const u = slotUsage([
      listing('published'), listing('published'), listing('paused'),
      listing('draft'), listing('pending_review'), listing('published', { archived: true }),
    ], 10);
    expect(u).toMatchObject({ published: 2, paused: 1, used: 3, available: 7, pct: 30 });
    expect(u.waiting).toEqual([{ status: 'pending_review', count: 1 }, { status: 'draft', count: 1 }]);
  });

  it('never reports more than full, or a share of no allowance', () => {
    expect(slotUsage([listing('published'), listing('published')], 1)).toMatchObject({ pct: 100, available: 0 });
    expect(slotUsage([listing('published')], 0).pct).toBe(0);
    expect(usageTone(79)).toBe('primary');
    expect(usageTone(80)).toBe('warning');
    expect(usageTone(100)).toBe('danger');
  });
});

describe('billing', () => {
  it('reads payments from the account history only', () => {
    const rows = billingHistory([
      alert({}),
      alert({ id: 'x', kind: 'enquiry', title: 'New enquiry' }),
      alert({ id: 'f', tone: 'danger', title: 'Starter renewal failed', body: 'Card declined', at: new Date(NOW.getTime() - 400 * DAY).toISOString() }),
    ], PLANS);
    expect(rows.map((r) => r.id)).toEqual(['a1', 'f']);
    expect(rows[0]).toMatchObject({ status: 'paid', method: 'PayNow', amount: 1188 });
    expect(rows[1]).toMatchObject({ status: 'failed', method: 'Card', amount: 588 });
  });

  it('gives no amount when the record names no plan', () => {
    expect(billingHistory([alert({ title: 'Payment received', body: '' })], PLANS)[0]).toMatchObject({ amount: null, plan: null, method: null });
  });

  it('dates the renewal a year after the last payment, and not at all without one', () => {
    const rows = billingHistory([alert({})], PLANS);
    const r = nextRenewal(rows);
    expect(r?.toISOString().slice(0, 10)).toBe(new Date(NOW.getTime() - 6 * DAY + 365 * DAY).toISOString().slice(0, 10));
    expect(nextRenewal([])).toBeNull();
    expect(nextRenewal(billingHistory([alert({ tone: 'danger' })], PLANS))).toBeNull();
  });

  it('shows the demo account a payment and a renewal, and an account without history none', () => {
    const identity = {
      profile: { fullName: 'Tan Ah Kow', email: 'a@b.sg', mobile: '', ceaNumber: 'R000000A', agency: '', agencyLicence: '', bio: '', experienceYears: '' },
      notifications: {} as never,
      emailVerified: true,
    };
    const demo = demoWorkspace(identity as never, NOW);
    expect(nextRenewal(billingHistory(demo.alerts, PLANS))).not.toBeNull();
    expect(billingHistory([], PLANS)).toEqual([]);
  });
});

describe('dates', () => {
  it('places now inside a term, and refuses a term that makes no sense', () => {
    const t = termBetween('2026-01-01T00:00:00+08:00', '2027-01-01T00:00:00+08:00', new Date('2026-07-02T12:00:00+08:00'));
    expect(t?.elapsedPct).toBe(50);
    expect(t?.daysLeft).toBe(183);
    expect(termBetween(null, '2027-01-01', NOW)).toBeNull();
    expect(termBetween('2027-01-01', '2026-01-01', NOW)).toBeNull();
    expect(termBetween('not a date', '2026-01-01', NOW)).toBeNull();
    expect(daysUntilDate(new Date(NOW.getTime() - DAY), NOW)).toBe(0);
  });
});

describe('enquiries per week', () => {
  const e = (daysAgo: number): Enquiry => ({
    id: `e${daysAgo}`, listingId: 'l', name: 'N', contact: '', message: '', channel: 'V-RENT', status: 'new',
    at: new Date(NOW.getTime() - daysAgo * DAY).toISOString(),
  });

  it('counts records into weeks ending now, and ignores the future and the far past', () => {
    const w = enquiryWeeks([e(0), e(1), e(8), e(83), e(90), e(-2)], NOW);
    expect(w).toHaveLength(12);
    expect(w[11]).toBe(2);
    expect(w[10]).toBe(1);
    expect(w[0]).toBe(1);
    expect(w.reduce((n, v) => n + v, 0)).toBe(4);
  });
});
