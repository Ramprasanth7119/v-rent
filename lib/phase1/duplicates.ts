/**
 * The same unit, advertised twice.
 *
 * This is the check the Singapore portals actually run: a listing counts as
 * verified when it names a unit number and the operations team has satisfied
 * itself that no one else is advertising that unit. Two agents with the same
 * flat is the ordinary case — a landlord gives an open mandate to three
 * agencies — and it is not misconduct. What it is, is something a tenant should
 * not meet as three near-identical results at three different rents.
 *
 * So a clash is surfaced, not punished. The moderator sees who else has it, at
 * what price, and decides.
 *
 * Server only: it reads every agent's workspace.
 */

import { listAccounts } from '../auth/store';
import { readWorkspace } from './workspace-store';
import { DemoListing } from './data';
import { preferredName } from './workspace';

export interface Advertiser {
  ownerId: string;
  ownerName: string;
  listingId: string;
  reference: string;
  monthlyRent: number;
  status: DemoListing['status'];
}

export interface DuplicateGroup {
  /** postal code + unit, the key a unit is identified by. */
  key: string;
  postalCode: string;
  unitNo: string;
  project: string;
  advertisers: Advertiser[];
  /** True when more than one account is advertising it. */
  acrossAgents: boolean;
  /** The spread between the cheapest and dearest asking rent. */
  rentSpread: number;
}

/** A unit is the postal code plus the unit number, normalised. */
export function unitKey(listing: DemoListing): string | null {
  const postal = listing.postalCode.trim();
  const unit = listing.unitNo.replace(/[\s#]/g, '').toUpperCase();
  // Without a unit number there is nothing to compare: a postal code alone is a
  // whole block. That is exactly why the portals require one to call a listing
  // verified.
  if (!postal || !unit) return null;
  return `${postal}:${unit}`;
}

/** Every unit currently advertised more than once, dearest spread first. */
export async function duplicateGroups(): Promise<DuplicateGroup[]> {
  const accounts = (await listAccounts()).filter((a) => a.role === 'agent');
  const byUnit = new Map<string, { listing: DemoListing; advertiser: Advertiser }[]>();

  for (const account of accounts) {
    const w = await readWorkspace(account.id);
    if (!w) continue;
    const ownerName = preferredName(w.profile.fullName || account.fullName);

    for (const listing of w.listings) {
      // A draft nobody can see is not a competing advertisement.
      if (listing.archived || listing.status === 'draft' || listing.status === 'rejected') continue;
      const key = unitKey(listing);
      if (!key) continue;

      const entry = {
        listing,
        advertiser: {
          ownerId: account.id,
          ownerName,
          listingId: listing.id,
          reference: listing.reference,
          monthlyRent: listing.monthlyRent,
          status: listing.status,
        },
      };
      byUnit.set(key, [...(byUnit.get(key) ?? []), entry]);
    }
  }

  const groups: DuplicateGroup[] = [];
  for (const [key, entries] of byUnit) {
    if (entries.length < 2) continue;
    const rents = entries.map((e) => e.listing.monthlyRent);
    const owners = new Set(entries.map((e) => e.advertiser.ownerId));
    groups.push({
      key,
      postalCode: entries[0].listing.postalCode,
      unitNo: entries[0].listing.unitNo,
      project: entries[0].listing.project,
      advertisers: entries.map((e) => e.advertiser),
      acrossAgents: owners.size > 1,
      rentSpread: Math.max(...rents) - Math.min(...rents),
    });
  }

  return groups.sort((a, b) => b.rentSpread - a.rentSpread);
}

/**
 * The key a listing is addressed by across the whole platform.
 *
 * A listing id is only unique inside one workspace — two agents who both
 * imported the same seed set genuinely both hold `lst-1` — so anything indexing
 * listings platform-wide has to carry the owner too.
 */
export const listingKey = (ownerId: string, listingId: string) => `${ownerId}:${listingId}`;

/**
 * A lookup from listing to the others advertising the same unit, so a
 * moderation card can show the clash without every card re-scanning the
 * platform.
 */
export async function duplicateIndex(): Promise<Map<string, Advertiser[]>> {
  const groups = await duplicateGroups();
  const index = new Map<string, Advertiser[]>();
  for (const g of groups) {
    for (const a of g.advertisers) {
      const others = g.advertisers.filter(
        (other) => listingKey(other.ownerId, other.listingId) !== listingKey(a.ownerId, a.listingId),
      );
      index.set(listingKey(a.ownerId, a.listingId), others);
    }
  }
  return index;
}
