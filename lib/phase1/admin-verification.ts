/**
 * Applications waiting for a verification officer.
 *
 * Each one is re-checked against the CEA register at the moment the officer
 * looks, not only at sign-up. That matters: an application can sit in a queue
 * for a day, and the register is refreshed three times a day. The officer is
 * shown what the register says now, beside what it said when the account was
 * created, and told plainly when the two disagree.
 *
 * Server only: it reads the account store and calls out to data.gov.sg.
 */

import { listAccounts, PublicAccount } from '../auth/store';
import { daysUntilExpiry, displayAgency, displayName, lookupRegistration } from '../auth/cea';
import { readWorkspace } from './workspace-store';
import { preferredName } from './workspace';

export type MatchOutcome = 'strong' | 'weak' | 'not_found' | 'unavailable';

export interface Application {
  accountId: string;
  name: string;
  registeredName: string;
  email: string;
  mobile: string;
  ceaNumber: string;
  agency: string;
  agencyLicence: string;
  appliedAt: string;
  /** What the register says right now. */
  match: MatchOutcome;
  /** Field-by-field agreement between the account and the register. */
  checks: { label: string; ours: string; register: string; agrees: boolean }[];
  registrationEnd: string;
  daysToExpiry: number | null;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

async function toApplication(account: PublicAccount): Promise<Application> {
  const w = await readWorkspace(account.id);
  const snapshot = account.cea;
  const ceaNumber = snapshot?.registrationNo ?? w?.profile.ceaNumber ?? '';

  const base: Application = {
    accountId: account.id,
    name: preferredName(w?.profile.fullName || snapshot?.name || account.fullName),
    registeredName: snapshot?.name ? displayName(snapshot.name) : account.fullName,
    email: account.email,
    mobile: w?.profile.mobile ?? account.mobile,
    ceaNumber,
    agency: w?.profile.agency || (snapshot ? displayAgency(snapshot.agencyName) : ''),
    agencyLicence: snapshot?.agencyLicenceNo ?? '',
    appliedAt: account.createdAt.slice(0, 10),
    match: 'unavailable',
    checks: [],
    registrationEnd: snapshot?.registrationEnd ?? '',
    daysToExpiry: null,
  };

  if (!ceaNumber) return { ...base, match: 'not_found' };

  const live = await lookupRegistration(ceaNumber);
  if (live.status === 'unavailable') return base;
  if (live.status === 'not_found') return { ...base, match: 'not_found' };

  const r = live.record;
  const checks = [
    { label: 'Registration number', ours: ceaNumber, register: r.registrationNo, agrees: same(ceaNumber, r.registrationNo) },
    { label: 'Name', ours: base.registeredName, register: displayName(r.name), agrees: same(base.registeredName, displayName(r.name)) },
    { label: 'Agency', ours: base.agency, register: displayAgency(r.agencyName), agrees: same(base.agency, displayAgency(r.agencyName)) },
    { label: 'Agency licence', ours: base.agencyLicence, register: r.agencyLicenceNo, agrees: same(base.agencyLicence, r.agencyLicenceNo) },
  ];

  return {
    ...base,
    match: checks.every((c) => c.agrees) ? 'strong' : 'weak',
    checks,
    registrationEnd: r.registrationEnd,
    daysToExpiry: daysUntilExpiry(r),
  };
}

/** Accounts whose workspace is still waiting on an officer, oldest first. */
export async function pendingApplications(): Promise<Application[]> {
  const accounts = (await listAccounts()).filter((a) => a.role === 'agent');

  const waiting: PublicAccount[] = [];
  for (const a of accounts) {
    const w = await readWorkspace(a.id);
    if (w?.approval === 'under_review') waiting.push(a);
  }

  const applications = await Promise.all(waiting.map(toApplication));
  return applications.sort((x, y) => x.appliedAt.localeCompare(y.appliedAt));
}

/** Just the count, for badges — no register calls. */
export async function pendingCount(): Promise<number> {
  const accounts = (await listAccounts()).filter((a) => a.role === 'agent');
  let n = 0;
  for (const a of accounts) {
    const w = await readWorkspace(a.id);
    if (w?.approval === 'under_review') n += 1;
  }
  return n;
}
