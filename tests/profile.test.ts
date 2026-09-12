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
import { reconcileProfile } from '../lib/phase1/workspace';
import type { AgentProfile } from '../lib/phase1/workspace';
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
