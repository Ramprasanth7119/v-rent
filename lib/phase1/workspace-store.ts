/**
 * Where an agent's workspace is kept between visits.
 *
 * One JSON file keyed by account id, written under a per-account lock so a
 * double-click cannot interleave two writes and lose one of them. Same trade
 * as the account store: a file rather than a database, because the POC is
 * judged on the flows. The production swap is this file and nothing else —
 * every caller goes through the three functions at the bottom.
 */

import type { PublicAccount } from '../auth/store';
import { KeyedMutex } from '../payments/concurrency';
import { AgentProfile, DEFAULT_NOTIFICATIONS, reconcileProfile, seedWorkspace, WorkspaceState } from './workspace';
import { EMPTY_TOOLS } from './tools';
import { verificationPolicy } from './verification-policy';
import type { DemoListing } from './data';
import { store } from '../store/driver';

/** One record per account, keyed by the account id. */
interface StoredWorkspace extends WorkspaceState {
  id: string;
  updatedAt: string;
}

const workspaces = store<StoredWorkspace>('workspaces');

/**
 * Serialised per account: different agents write in parallel, one agent queues.
 *
 * Still needed with a database behind the store, because the sequence here is
 * read-decide-write rather than a single atomic update — two saves from the
 * same agent arriving together would otherwise interleave and lose one.
 */
const lock = new KeyedMutex();

/**
 * The stored record without the bookkeeping field, and with anything added to
 * the shape since it was written filled in.
 *
 * A workspace saved before a field existed must not come back missing it — the
 * screens would read `undefined` and the next save would persist the hole. This
 * is the migration step a schema would otherwise do.
 */
function strip(stored: StoredWorkspace): WorkspaceState {
  const rest = { ...stored } as Partial<StoredWorkspace>;
  delete rest.updatedAt;
  delete rest.id;
  const w = rest as WorkspaceState;
  return {
    ...w,
    notifications: w.notifications ?? { ...DEFAULT_NOTIFICATIONS },
    enquiries: w.enquiries ?? [],
    alerts: w.alerts ?? [],
    listings: w.listings ?? [],
    tools: { ...EMPTY_TOOLS, ...(w.tools ?? {}) },
  };
}

/**
 * The account's workspace, seeded and persisted the first time it is asked for.
 *
 * The verification policy is read at that moment and not again: an agent
 * admitted while every application was reviewed by hand does not silently
 * become auto-approved later, and one admitted after the threshold keeps their
 * approval if the platform shrinks.
 */
/**
 * The one account that starts with a portfolio that has been used, named in the
 * environment so it can be changed without a deploy and cannot be guessed from
 * the code. Everyone else starts with drafts.
 */
export const isDemoAccount = (email: string) => {
  const declared = process.env.VRENT_DEMO_AGENT_EMAIL?.trim().toLowerCase();
  return Boolean(declared) && email.trim().toLowerCase() === declared;
};

export async function loadWorkspace(user: PublicAccount): Promise<WorkspaceState> {
  const policy = await verificationPolicy();
  return lock.run(user.id, async () => {
    const existing = await workspaces.get(user.id);
    if (existing) {
      // The register's half of the profile follows the account, so an account
      // that gained or changed its CEA registration after the workspace was
      // created is corrected here rather than staying wrong for good.
      const corrected = reconcileProfile(existing.profile, user);
      if (!corrected) return strip(existing);
      const next: StoredWorkspace = { ...existing, profile: corrected, updatedAt: new Date().toISOString() };
      await workspaces.put(next);
      return strip(next);
    }

    const seeded = seedWorkspace(user, { autoApprove: policy.autoApprove, demo: isDemoAccount(user.email) });
    await workspaces.put({ ...seeded, id: user.id, updatedAt: new Date().toISOString() });
    return seeded;
  });
}

/**
 * The workspace as it stands, or null when the account has never opened one.
 * Unlike `loadWorkspace` this never seeds, so the operations console can show
 * what an account actually has rather than creating it by looking.
 */
export async function readWorkspace(accountId: string): Promise<WorkspaceState | null> {
  const existing = await workspaces.get(accountId);
  return existing ? strip(existing) : null;
}

/** Merge a patch into the account's workspace and return the result. */
export async function patchWorkspace(user: PublicAccount, patch: Partial<WorkspaceState>): Promise<WorkspaceState> {
  return lock.run(user.id, async () => {
    const base = (await workspaces.get(user.id))
      ?? { ...seedWorkspace(user, { autoApprove: true }), id: user.id, updatedAt: '' };
    const next: StoredWorkspace = { ...base, ...patch, id: user.id, updatedAt: new Date().toISOString() };
    await workspaces.put(next);
    return strip(next);
  });
}

/**
 * A listing as a stranger with the link may see it.
 *
 * Only a published or paused listing is returned: a draft, a listing in
 * moderation and a rejected one are the agent's business alone, and a share
 * link must not become a way around that. Paused is included so a link already
 * sent keeps resolving — the page says the unit is off the market rather than
 * pretending it never existed.
 */
export async function findPublicListing(
  ownerId: string,
  listingId: string,
): Promise<{ listing: DemoListing; agent: AgentProfile } | null> {
  const workspace = await readWorkspace(ownerId);
  if (!workspace) return null;

  const listing = workspace.listings.find((l) => l.id === listingId && !l.archived);
  if (!listing || (listing.status !== 'published' && listing.status !== 'paused')) return null;

  return { listing, agent: workspace.profile };
}

/** Throw the workspace away and seed it again — the presenter's Reset button. */
export async function resetWorkspace(user: PublicAccount): Promise<WorkspaceState> {
  const policy = await verificationPolicy();
  return lock.run(user.id, async () => {
    const seeded = seedWorkspace(user, { autoApprove: policy.autoApprove, demo: isDemoAccount(user.email) });
    await workspaces.put({ ...seeded, id: user.id, updatedAt: new Date().toISOString() });
    return seeded;
  });
}
