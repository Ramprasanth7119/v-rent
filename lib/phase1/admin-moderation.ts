/**
 * The moderation queue, built from listings that actually exist.
 *
 * V-RENT moderates after publication rather than before it: an agent who has
 * passed the publish gate puts a unit live immediately, and an officer reviews
 * it afterwards. Holding every listing behind a human would make the platform
 * slower than the incumbents at the one thing agents are paid for, and the gate
 * already establishes that the person is registered, subscribed and in quota.
 *
 * So the queue is two populations: listings published and not yet looked at,
 * and listings an agent has corrected and resubmitted after a rejection. Both
 * carry the account that owns them, because acting on one writes to that
 * agent's workspace.
 *
 * Server only: it reads the account store.
 */

import { listAccounts } from '../auth/store';
import { readWorkspace } from './workspace-store';
import { DemoListing } from './data';
import { preferredName } from './workspace';
import { Advertiser, duplicateIndex, listingKey } from './duplicates';

export interface ModerationItem {
  ownerId: string;
  ownerName: string;
  ownerCea: string;
  ownerAgency: string;
  listing: DemoListing;
  /** 'new' — published, never reviewed. 'resubmitted' — corrected after a rejection. */
  kind: 'new' | 'resubmitted';
  /** Anyone else advertising the same unit. Empty in the ordinary case. */
  duplicates: Advertiser[];
}

const needsReview = (l: DemoListing): ModerationItem['kind'] | null => {
  if (l.archived) return null;
  if (l.status === 'pending_review') return 'resubmitted';
  if (l.status === 'published' && !l.reviewedAt) return 'new';
  return null;
};

/** Everything waiting on a moderator, oldest change first. */
export async function moderationQueue(): Promise<ModerationItem[]> {
  const accounts = (await listAccounts()).filter((a) => a.role === 'agent');
  // Built once for the whole queue rather than per card.
  const clashes = await duplicateIndex();

  const perAccount = await Promise.all(
    accounts.map(async (a): Promise<ModerationItem[]> => {
      const w = await readWorkspace(a.id);
      if (!w) return [];
      const name = preferredName(w.profile.fullName || a.cea?.name || a.fullName);

      return w.listings.flatMap((l) => {
        const kind = needsReview(l);
        return kind
          ? [{
              ownerId: a.id,
              ownerName: name,
              ownerCea: w.profile.ceaNumber || a.cea?.registrationNo || '',
              ownerAgency: w.profile.agency,
              listing: l,
              kind,
              duplicates: clashes.get(listingKey(a.id, l.id)) ?? [],
            }]
          : [];
      });
    }),
  );

  return perAccount
    .flat()
    .sort((x, y) => (x.listing.updatedAt ?? x.listing.createdAt).localeCompare(y.listing.updatedAt ?? y.listing.createdAt));
}
