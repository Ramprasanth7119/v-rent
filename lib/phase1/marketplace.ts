/**
 * The tenant-facing marketplace, built from listings that actually exist.
 *
 * Every published listing in every agent's workspace, with the advertiser's
 * register details beside it. Nothing here is invented: a platform with twelve
 * live units shows twelve, and the screens say so rather than padding the grid.
 *
 * What a stranger may see is the same rule the share link and the photograph
 * route already apply — published (and, for a direct link, paused) listings
 * only, never a draft, a rejected listing or anything in moderation, and never
 * from an agent whose publication rights are suspended.
 *
 * Server only: it reads the account and workspace stores.
 */

import { cache } from 'react';
import { listAccounts, type PublicAccount } from '../auth/store';
import { displayAgency, displayName } from '../auth/cea';
import { readWorkspace } from './workspace-store';
import type { WorkspaceState } from './workspace';
import { preferredName } from './workspace';
import type { DemoListing } from './data';
import { photoSrc } from './photos';
import { usualName } from './display-name';

export interface PublicAgent {
  id: string;
  /** The name to greet with — the usual name, title-cased. */
  name: string;
  /** What to call them in a sentence — "Message Michelle". */
  callName: string;
  /** The register's name, as it must appear on an advertisement. */
  registeredName: string;
  agency: string;
  agencyLicence: string;
  ceaNumber: string;
  mobile: string;
  email: string;
  bio: string;
  experienceYears: string;
  /** Approved by an officer and still on the register. */
  verified: boolean;
  verifiedAt?: string;
  registeredUntil?: string;
  memberSince: string;
}

export interface MarketListing {
  ownerId: string;
  listing: DemoListing;
  agent: PublicAgent;
  photos: string[];
  thumbs: string[];
}

/** The fields a tenant has no business receiving. */
function publicFields(l: DemoListing): DemoListing {
  const copy = { ...l };
  delete copy.rejectionReason;
  return copy;
}

const isShouting = (s: string) => s === s.toUpperCase() && /[A-Z]/.test(s);

function agentOf(account: PublicAccount, w: WorkspaceState): PublicAgent {
  const register = w.profile.fullName || account.cea?.name || account.fullName;
  const usual = preferredName(register);
  return {
    id: account.id,
    name: isShouting(usual) ? displayName(usual) : usual,
    callName: usualName(register),
    registeredName: register,
    agency: w.profile.agency ? (isShouting(w.profile.agency) ? displayAgency(w.profile.agency) : w.profile.agency) : '',
    agencyLicence: w.profile.agencyLicence,
    ceaNumber: w.profile.ceaNumber || account.cea?.registrationNo || '',
    mobile: w.profile.mobile,
    email: w.profile.email,
    bio: w.profile.bio,
    experienceYears: w.profile.experienceYears,
    verified: w.approval === 'approved' && w.ceaValid,
    verifiedAt: account.cea?.verifiedAt,
    registeredUntil: w.ceaValidUntil || account.cea?.registrationEnd,
    memberSince: account.createdAt,
  };
}

function entry(ownerId: string, agent: PublicAgent, l: DemoListing): MarketListing {
  const ids = l.photos ?? [];
  return {
    ownerId,
    agent,
    listing: publicFields(l),
    photos: ids.map((p) => photoSrc(ownerId, l.id, p)),
    thumbs: ids.map((p) => photoSrc(ownerId, l.id, p, 'thumb')),
  };
}

/** Every agent who may advertise, with their workspace. Read once per request. */
const advertisers = cache(async () => {
  const accounts = (await listAccounts()).filter((a) => a.role === 'agent');
  const loaded = await Promise.all(accounts.map(async (a) => ({ account: a, workspace: await readWorkspace(a.id) })));
  return loaded.filter((x): x is { account: PublicAccount; workspace: WorkspaceState } =>
    Boolean(x.workspace) && x.workspace!.approval !== 'suspended');
});

/** Everything live, newest first. */
export const marketListings = cache(async (): Promise<MarketListing[]> => {
  const all = await advertisers();
  return all
    .flatMap(({ account, workspace }) => {
      const agent = agentOf(account, workspace);
      return workspace.listings
        .filter((l) => !l.archived && l.status === 'published')
        .map((l) => entry(account.id, agent, l));
    })
    .sort((a, b) => (b.listing.publishedAt ?? b.listing.createdAt).localeCompare(a.listing.publishedAt ?? a.listing.createdAt));
});

/**
 * One listing for its detail page. A paused listing still resolves, so a link
 * already sent keeps working and the page can say the unit is off the market.
 */
export const marketListing = cache(async (ownerId: string, listingId: string): Promise<MarketListing | null> => {
  const all = await advertisers();
  const found = all.find((x) => x.account.id === ownerId);
  if (!found) return null;
  const l = found.workspace.listings.find((x) => x.id === listingId && !x.archived);
  if (!l || (l.status !== 'published' && l.status !== 'paused')) return null;
  return entry(ownerId, agentOf(found.account, found.workspace), l);
});

/** Up to `n` live listings like this one: same district first, then same bedrooms and similar rent. */
export async function similarListings(target: MarketListing, n = 4): Promise<MarketListing[]> {
  const t = target.listing;
  const price = (l: DemoListing) => (l.dealType === 'sale' ? l.salePriceSgd ?? 0 : l.monthlyRent);
  return (await marketListings())
    .filter((m) => !(m.ownerId === target.ownerId && m.listing.id === t.id) && (m.listing.dealType ?? 'rent') === (t.dealType ?? 'rent'))
    .map((m) => {
      const l = m.listing;
      const score = (l.district === t.district ? 0 : 3)
        + Math.abs(l.bedrooms - t.bedrooms)
        + Math.abs(price(l) - price(t)) / Math.max(1, price(t));
      return { m, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map((x) => x.m);
}

/** An agent's public profile and what they have live. */
export const marketAgent = cache(async (ownerId: string): Promise<{ agent: PublicAgent; listings: MarketListing[] } | null> => {
  const all = await advertisers();
  const found = all.find((x) => x.account.id === ownerId);
  if (!found) return null;
  const agent = agentOf(found.account, found.workspace);
  const listings = found.workspace.listings
    .filter((l) => !l.archived && l.status === 'published')
    .map((l) => entry(ownerId, agent, l));
  return { agent, listings };
});

/** Agents with at least one live listing, most listings first. */
export async function marketAgents(): Promise<{ agent: PublicAgent; count: number; districts: number[] }[]> {
  const byOwner = new Map<string, { agent: PublicAgent; count: number; districts: Set<number> }>();
  for (const m of await marketListings()) {
    const cur = byOwner.get(m.ownerId) ?? { agent: m.agent, count: 0, districts: new Set<number>() };
    cur.count += 1;
    cur.districts.add(m.listing.district);
    byOwner.set(m.ownerId, cur);
  }
  return [...byOwner.values()]
    .map((x) => ({ agent: x.agent, count: x.count, districts: [...x.districts].sort((a, b) => a - b) }))
    .sort((a, b) => b.count - a.count);
}
