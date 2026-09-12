/**
 * Reconciling the stored profile against the CEA register.
 *
 * The profile screen shows two kinds of field side by side. The registered
 * name, number, agency and licence belong to the register and are read-only.
 * The mobile number, biography and years of experience belong to the agent.
 *
 * The copy of the first kind used to be taken once, when the workspace was
 * created, and never looked at again — so an account that gained its
 * registration a moment later showed "no CEA registration" for good, and an
 * agent who moved agency kept the old one despite the screen promising
 * otherwise. These pin down which half follows the register and which half is
 * the agent's to keep.
 */

import { describe, expect, it } from 'vitest';
import { reconcileProfile, reconcileWithAccount } from '../lib/phase1/workspace';
import type { AgentProfile, WorkspaceState } from '../lib/phase1/workspace';
import type { PublicAccount } from '../lib/auth/store';

const account = (over: Partial<PublicAccount> = {}): PublicAccount => ({
  id: 'acc-1',
  email: 'peggy@agent.sg',
  role: 'agent',
  fullName: 'PEGGY SOH YEE CHIN (PEGGY)',
  mobile: '+65 9123 4567',
  createdAt: '2026-09-01T00:00:00.000Z',
  cea: {
    name: 'PEGGY SOH YEE CHIN (PEGGY)',
    registrationNo: 'R000564B',
    registrationStart: '2020-01-01',
    registrationEnd: '2026-12-31',
    agencyName: 'MCDOWELL REALTY NETWORK',
    agencyLicenceNo: 'L3006213G',
    verifiedAt: '2026-09-01T00:00:00.000Z',
  },
  ...over,
});

const profile = (over: Partial<AgentProfile> = {}): AgentProfile => ({
  fullName: 'Peggy Soh Yee Chin (Peggy)',
  email: 'peggy@agent.sg',
  mobile: '+65 9123 4567',
  ceaNumber: 'R000564B',
  agency: 'McDowell Realty Network',
  agencyLicence: 'L3006213G',
  bio: '',
  experienceYears: '',
  ...over,
});

describe('reconciling a profile against the register', () => {
  it('fills a blank registration from the account', () => {
    // Exactly the fault seen in production: the account carried the
    // registration, the workspace copy was empty, and the screen said the
    // account had no CEA registration at all.
    const blank = profile({ fullName: '', ceaNumber: '', agency: '', agencyLicence: '' });

    const fixed = reconcileProfile(blank, account());

    expect(fixed).not.toBeNull();
    expect(fixed!.ceaNumber).toBe('R000564B');
    expect(fixed!.agency).toBe('McDowell Realty Network');
    expect(fixed!.agencyLicence).toBe('L3006213G');
  });

  it('leaves the agent\'s own words alone while correcting the register half', () => {
    const mine = profile({
      ceaNumber: '',
      agency: '',
      bio: 'I work District 15 and nothing else.',
      experienceYears: '7',
      mobile: '+65 9000 1111',
    });

    const fixed = reconcileProfile(mine, account());

    expect(fixed!.bio).toBe('I work District 15 and nothing else.');
    expect(fixed!.experienceYears).toBe('7');
    expect(fixed!.mobile).toBe('+65 9000 1111');
  });

  it('follows the agent to a new agency, which is what the screen promises', () => {
    const moved = account({
      cea: { ...account().cea!, agencyName: 'HUTTONS ASIA PTE. LTD.', agencyLicenceNo: 'L3008899K' },
    });

    const fixed = reconcileProfile(profile(), moved);

    expect(fixed!.agency).toBe('Huttons Asia Pte. Ltd.');
    expect(fixed!.agencyLicence).toBe('L3008899K');
  });

  it('reports no change when the copy already agrees, so a load writes nothing', () => {
    expect(reconcileProfile(profile(), account())).toBeNull();
  });

  it('clears the register fields on an account that has no registration', () => {
    // Staff, and any account whose registration was withdrawn: the compliance
    // line must not keep claiming a number the register no longer backs.
    const staff = account({ cea: undefined, fullName: 'V-RENT Operations' });

    const fixed = reconcileProfile(profile(), staff);

    expect(fixed!.ceaNumber).toBe('');
    expect(fixed!.agency).toBe('');
    expect(fixed!.agencyLicence).toBe('');
  });

  it('keeps the email in step with the account it signs in with', () => {
    const fixed = reconcileProfile(profile(), account({ email: 'peggy.soh@agent.sg' }));

    expect(fixed!.email).toBe('peggy.soh@agent.sg');
  });
});

describe('reconciling the workspace against the account', () => {
  const workspace = (over: Partial<WorkspaceState> = {}): WorkspaceState => ({
    emailVerified: false,
    mobileVerified: false,
    profileSubmitted: true,
    approval: 'approved',
    ceaValid: true,
    ceaValidUntil: '2026-12-31',
    planCode: 'starter',
    subscription: 'active',
    paymentMethod: 'PayNow',
    profile: profile(),
    listings: [],
    notifications: {},
    enquiries: [],
    alerts: [],
    tools: {} as WorkspaceState['tools'],
    ...over,
  });

  it('submits a registered agent whose application was never opened', () => {
    // Chan's fault: the account carried a registration, but the workspace had
    // been seeded before it was attached, so it described someone with no
    // registration at all. Approving that account changed nothing the agent
    // could see, because the complaint was never about the approval.
    const stranded = workspace({
      profileSubmitted: false,
      approval: 'not_submitted',
      ceaValid: false,
      ceaValidUntil: '',
      profile: profile({ ceaNumber: '', agency: '', agencyLicence: '' }),
    });

    const fix = reconcileWithAccount(stranded, account(), { autoApprove: false });

    expect(fix).not.toBeNull();
    expect(fix!.profileSubmitted).toBe(true);
    expect(fix!.approval).toBe('under_review');
    expect(fix!.ceaValid).toBe(true);
    expect(fix!.ceaValidUntil).toBe('2026-12-31');
    expect(fix!.profile!.ceaNumber).toBe('R000564B');
  });

  it('never overturns a decision an officer actually made', () => {
    const rejected = workspace({ approval: 'rejected', ceaValid: false, ceaValidUntil: '' });

    const fix = reconcileWithAccount(rejected, account(), { autoApprove: false });

    // The registration is put right, because that is the register's to say.
    expect(fix!.ceaValid).toBe(true);
    // The decision is not.
    expect(fix!.approval).toBeUndefined();
  });

  it('withdraws the registration when the account no longer has one', () => {
    const fix = reconcileWithAccount(workspace(), account({ cea: undefined }), { autoApprove: false });

    expect(fix!.ceaValid).toBe(false);
    expect(fix!.ceaValidUntil).toBe('');
  });

  it('mirrors a confirmed email address from the account', () => {
    const fix = reconcileWithAccount(workspace(), account({ emailVerifiedAt: '2026-09-02T00:00:00.000Z' }), { autoApprove: false });

    expect(fix!.emailVerified).toBe(true);
  });

  it('reports no change when the workspace already agrees', () => {
    expect(reconcileWithAccount(workspace(), account(), { autoApprove: false })).toBeNull();
  });
});
