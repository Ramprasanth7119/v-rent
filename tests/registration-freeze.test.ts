/**
 * What happens to an agent's listings when their CEA registration lapses.
 *
 * An advertisement has to carry a registration that is current, so the day it
 * expires the listings stop being advertisable. The rule has to work in both
 * directions and it has to be narrow: it takes down what it is entitled to
 * take down, it puts back only what it took, and it never overrules a decision
 * an officer made.
 */

import { describe, expect, it } from 'vitest';
import { reconcileWithAccount } from '../lib/phase1/workspace';
import type { WorkspaceState } from '../lib/phase1/workspace';
import { SEED_LISTINGS, type DemoListing, type ListingStatus } from '../lib/phase1/data';
import type { PublicAccount } from '../lib/auth/store';

const YEAR = 365 * 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const FUTURE = iso(Date.now() + YEAR);
const PAST = iso(Date.now() - YEAR);

const listing = (status: ListingStatus, over: Partial<DemoListing> = {}): DemoListing =>
  ({ ...SEED_LISTINGS[0], id: `l-${status}-${Math.random()}`, status, ...over });

const account = (registrationEnd: string): PublicAccount => ({
  id: 'acc-1',
  email: 'agent@example.sg',
  role: 'agent',
  fullName: 'TEST AGENT',
  mobile: '+65 9123 4567',
  createdAt: new Date().toISOString(),
  emailVerifiedAt: new Date().toISOString(),
  cea: {
    name: 'TEST AGENT', registrationNo: 'R000001A', registrationStart: '2020-01-01',
    registrationEnd, agencyName: 'Agency', agencyLicenceNo: 'L1', verifiedAt: new Date().toISOString(),
  },
});

const workspace = (listings: DemoListing[], over: Partial<WorkspaceState> = {}): WorkspaceState => ({
  profile: {
    fullName: 'TEST AGENT', email: 'agent@example.sg', mobile: '+65 9123 4567', ceaNumber: 'R000001A',
    agency: 'Agency', agencyLicence: 'L1', bio: '', experienceYears: '', specialisations: [], languages: [],
  },
  listings,
  approval: 'approved',
  profileSubmitted: true,
  emailVerified: true,
  ceaValid: true,
  ceaValidUntil: FUTURE,
  ...over,
} as WorkspaceState);

const after = (w: WorkspaceState, end: string) =>
  reconcileWithAccount(w, account(end), { autoApprove: true });

describe('when the registration has lapsed', () => {
  it('takes the live listings down', () => {
    const changes = after(workspace([listing('published')]), PAST);
    expect(changes?.ceaValid).toBe(false);
    expect(changes?.listings?.[0].status).toBe('suspended');
  });

  it('takes down one waiting on a moderator too, since it was on its way up', () => {
    const changes = after(workspace([listing('pending_review')]), PAST);
    expect(changes?.listings?.[0].status).toBe('suspended');
  });

  it('marks why, so it can be told apart from a moderator\'s decision', () => {
    const changes = after(workspace([listing('published')]), PAST);
    expect(changes?.listings?.[0].frozen).toBe('cea_lapsed');
  });

  it('leaves drafts alone — an agent may keep working, just not advertising', () => {
    const changes = after(workspace([listing('draft')]), PAST);
    expect(changes?.listings).toBeUndefined();
  });
});

describe('when the registration is current again', () => {
  it('puts back what it took down', () => {
    const frozen = listing('suspended', { frozen: 'cea_lapsed' });
    const changes = after(workspace([frozen], { ceaValid: false, ceaValidUntil: PAST }), FUTURE);
    expect(changes?.listings?.[0].status).toBe('published');
  });

  it('clears the mark, so a later suspension is not undone by this one', () => {
    const frozen = listing('suspended', { frozen: 'cea_lapsed' });
    const changes = after(workspace([frozen], { ceaValid: false, ceaValidUntil: PAST }), FUTURE);
    expect(changes?.listings?.[0].frozen).toBeUndefined();
  });

  /* The important one. A listing an officer took down must stay down, whatever
     the register later says about the agent. */
  it('leaves a listing suspended by a moderator suspended', () => {
    const byOfficer = listing('suspended');
    const changes = after(workspace([byOfficer], { ceaValid: false, ceaValidUntil: PAST }), FUTURE);
    const back = changes?.listings?.[0] ?? byOfficer;
    expect(back.status).toBe('suspended');
  });
});

describe('when nothing has changed', () => {
  /* The listings are what this file is about: reconciling may still tidy the
     profile, but it must not rewrite the portfolio on every read. */
  it('leaves the listings untouched, so they are not rewritten on every read', () => {
    expect(after(workspace([listing('published')]), FUTURE)?.listings).toBeUndefined();
  });
});
