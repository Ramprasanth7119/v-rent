/**
 * The agent directory as the operations console sees it.
 *
 * Two populations share one table and are labelled as such. Accounts that
 * actually registered on this instance are read from the account store and
 * their own workspace — that is the row a client finds themselves in after
 * signing up, with the registration the CEA register returned. The sample
 * roster stays alongside it so the console has enough volume to look like a
 * working desk, and every sample row says so.
 *
 * Server only: it reads the account store.
 */

import { listAccounts } from '../auth/store';
import { readWorkspace } from './workspace-store';
import { AGENTS, AgentRow, listingsForAgent } from './agents';
import { DemoListing } from './data';
import { planByCode, preferredName, TODAY, WorkspaceState } from './workspace';

export interface DirectoryAgent extends AgentRow {
  /** True when this is an account on this instance rather than sample data. */
  real: boolean;
  listingsLive: number;
  listingsTotal: number;
}

/** A registration is current when the register's end date has not passed. */
const stillRegistered = (endDate: string): boolean => {
  if (!endDate) return false;
  const end = new Date(`${endDate}T23:59:59+08:00`);
  return !Number.isNaN(end.getTime()) && end.getTime() >= TODAY.getTime();
};

/**
 * Standing, in the console's terms. A lapsed registration outranks everything
 * else: whatever an officer decided, the register is the authority on whether
 * this person may advertise today.
 */
function standing(w: WorkspaceState | null): AgentRow['status'] {
  if (!w) return 'under_review';
  if (w.approval === 'suspended') return 'suspended';
  if (w.ceaValidUntil && !stillRegistered(w.ceaValidUntil)) return 'verification_expired';
  if (w.approval === 'approved') return 'approved';
  return 'under_review';
}

/** Every registered agent on this instance, newest account first. */
export async function realAgents(): Promise<DirectoryAgent[]> {
  const accounts = (await listAccounts()).filter((a) => a.role === 'agent');

  return Promise.all(
    accounts.map(async (a): Promise<DirectoryAgent> => {
      const w = await readWorkspace(a.id);
      const listings = w?.listings ?? [];
      const plan = planByCode(w?.planCode ?? null);

      return {
        id: a.id,
        real: true,
        name: preferredName(w?.profile.fullName || a.cea?.name || a.fullName),
        ceaNumber: a.cea?.registrationNo ?? w?.profile.ceaNumber ?? '',
        agency: w?.profile.agency ?? '',
        agencyLicence: a.cea?.agencyLicenceNo ?? w?.profile.agencyLicence ?? '',
        status: standing(w),
        plan: plan?.name ?? null,
        joinedAt: a.createdAt.slice(0, 10),
        ceaValidUntil: a.cea?.registrationEnd ?? w?.ceaValidUntil ?? '',
        email: a.email,
        mobile: w?.profile.mobile ?? a.mobile,
        bio: w?.profile.bio ?? '',
        // Neither is on the account yet; the profile screen is where they would
        // be captured, and inventing them here would put words in an agent's mouth.
        specialisations: [],
        languages: [],
        listingsLive: listings.filter((l) => !l.archived && l.status === 'published').length,
        listingsTotal: listings.filter((l) => !l.archived).length,
      };
    }),
  );
}

/** Real accounts first, then the sample roster. */
export async function agentDirectory(): Promise<DirectoryAgent[]> {
  const samples: DirectoryAgent[] = AGENTS.map((a) => {
    const ls = listingsForAgent(a.name);
    return {
      ...a,
      real: false,
      listingsLive: ls.filter((l) => l.status === 'published').length,
      listingsTotal: ls.length,
    };
  });
  return [...(await realAgents()), ...samples];
}

export interface AgentDetail {
  agent: DirectoryAgent;
  listings: DemoListing[];
}

/** One agent, real or sample, with the listings that belong to them. */
export async function agentDetail(id: string): Promise<AgentDetail | null> {
  const real = (await realAgents()).find((a) => a.id === id);
  if (real) {
    const w = await readWorkspace(id);
    return { agent: real, listings: (w?.listings ?? []).filter((l) => !l.archived) };
  }

  const sample = AGENTS.find((a) => a.id === id);
  if (!sample) return null;
  const listings = listingsForAgent(sample.name);
  return {
    agent: {
      ...sample,
      real: false,
      listingsLive: listings.filter((l) => l.status === 'published').length,
      listingsTotal: listings.length,
    },
    listings,
  };
}
