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
import { AgentProfile, DEFAULT_NOTIFICATIONS, reconcileWithAccount, seedWorkspace, WorkspaceState } from './workspace';
import { EMPTY_TOOLS } from './tools';
import { STARTING_REVEAL_CREDITS } from './views';
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
    /* Absent on every workspace written before views existed. */
    views: w.views ?? [],
    reveals: w.reveals ?? [],
    revealCredits: typeof w.revealCredits === 'number' ? w.revealCredits : STARTING_REVEAL_CREDITS,
    revealTopUps: w.revealTopUps ?? [],
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
      // Whatever the account owns — the register half of the profile, whether
      // the registration is current, whether the address is confirmed — is
      // brought back into line here, so a workspace seeded before the account
      // was complete is corrected rather than staying wrong for good.
      const corrections = reconcileWithAccount(strip(existing), user, { autoApprove: policy.autoApprove });
      if (!corrections) return strip(existing);
      const next: StoredWorkspace = { ...existing, ...corrections, updatedAt: new Date().toISOString() };
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
 * Change an existing workspace, deciding the change from what is stored.
 *
 * `patchWorkspace` takes a patch that was worked out before the lock was taken,
 * which is right for a screen saving what an agent typed and wrong for anything
 * that has to read the record to know what to write. A payment adding credit
 * has to see the balance and the references already banked, and two webhooks
 * for the same account arriving together must not each read the old balance and
 * write it back. Here the reading and the writing happen inside the one lock.
 *
 * Never seeds. An account with no workspace gets null rather than a new one:
 * this is reached from a webhook, and a payment for an account that does not
 * exist should be reconciled by hand, not answered by creating it.
 */
export async function mutateWorkspace(
  accountId: string,
  change: (current: WorkspaceState) => Partial<WorkspaceState> | null,
): Promise<WorkspaceState | null> {
  return lock.run(accountId, async () => {
    const stored = await workspaces.get(accountId);
    if (!stored) return null;

    const current = strip(stored);
    const patch = change(current);
    /* Null means the change had already been made. Writing anyway would only
       move `updatedAt` and make a repeat look like an event. */
    if (!patch) return current;

    const next: StoredWorkspace = { ...stored, ...patch, id: accountId, updatedAt: new Date().toISOString() };
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

/**
 * Throw the workspace away and do not seed another.
 *
 * Only for an account being deleted. Under the same lock as every other write,
 * so a save already in flight finishes before the record goes rather than
 * re-creating it a moment afterwards.
 */
export async function deleteWorkspace(accountId: string): Promise<void> {
  await lock.run(accountId, () => workspaces.remove(accountId));
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
