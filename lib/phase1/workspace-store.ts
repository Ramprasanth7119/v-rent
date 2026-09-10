/**
 * Where an agent's workspace is kept between visits.
 *
 * One JSON file keyed by account id, written under a per-account lock so a
 * double-click cannot interleave two writes and lose one of them. Same trade
 * as the account store: a file rather than a database, because the POC is
 * judged on the flows. The production swap is this file and nothing else —
 * every caller goes through the three functions at the bottom.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PublicAccount } from '../auth/store';
import { KeyedMutex } from '../payments/concurrency';
import { AgentProfile, DEFAULT_NOTIFICATIONS, seedWorkspace, WorkspaceState } from './workspace';
import { verificationPolicy } from './verification-policy';
import type { DemoListing } from './data';

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DATA_DIR, 'workspaces.json');

interface StoredWorkspace extends WorkspaceState {
  updatedAt: string;
}

interface FileShape {
  workspaces: Record<string, StoredWorkspace>;
}

/** Serialised per account: different agents write in parallel, one agent queues. */
const lock = new KeyedMutex();

async function readAll(): Promise<FileShape> {
  try {
    const parsed = JSON.parse(await readFile(FILE, 'utf8')) as FileShape;
    return parsed.workspaces ? parsed : { workspaces: {} };
  } catch {
    return { workspaces: {} };
  }
}

/**
 * Write to a sibling file and rename over the target. A crash midway then
 * leaves the previous workspace intact rather than a truncated file that fails
 * to parse and silently resets every agent to a fresh portfolio.
 */
async function writeAll(data: FileShape) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await rename(tmp, FILE);
}

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
  const w = rest as WorkspaceState;
  return {
    ...w,
    notifications: w.notifications ?? { ...DEFAULT_NOTIFICATIONS },
    enquiries: w.enquiries ?? [],
    listings: w.listings ?? [],
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
export async function loadWorkspace(user: PublicAccount): Promise<WorkspaceState> {
  const policy = await verificationPolicy();
  return lock.run(user.id, async () => {
    const data = await readAll();
    const existing = data.workspaces[user.id];
    if (existing) return strip(existing);

    const seeded = seedWorkspace(user, { autoApprove: policy.autoApprove });
    data.workspaces[user.id] = { ...seeded, updatedAt: new Date().toISOString() };
    await writeAll(data);
    return seeded;
  });
}

/**
 * The workspace as it stands, or null when the account has never opened one.
 * Unlike `loadWorkspace` this never seeds, so the operations console can show
 * what an account actually has rather than creating it by looking.
 */
export async function readWorkspace(accountId: string): Promise<WorkspaceState | null> {
  const data = await readAll();
  const existing = data.workspaces[accountId];
  return existing ? strip(existing) : null;
}

/** Merge a patch into the account's workspace and return the result. */
export async function patchWorkspace(user: PublicAccount, patch: Partial<WorkspaceState>): Promise<WorkspaceState> {
  return lock.run(user.id, async () => {
    const data = await readAll();
    const base = data.workspaces[user.id] ?? { ...seedWorkspace(user, { autoApprove: true }), updatedAt: '' };
    const next: StoredWorkspace = { ...base, ...patch, updatedAt: new Date().toISOString() };
    data.workspaces[user.id] = next;
    await writeAll(data);
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
    const data = await readAll();
    const seeded = seedWorkspace(user, { autoApprove: policy.autoApprove });
    data.workspaces[user.id] = { ...seeded, updatedAt: new Date().toISOString() };
    await writeAll(data);
    return seeded;
  });
}
