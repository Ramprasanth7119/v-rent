/**
 * Writing down who looked, and selling the names.
 *
 * Both halves are cross-account by nature — the viewer acts, the owner's
 * record changes — so neither can live in the browser and neither goes
 * through the workspace patch route. A browser that could write these could
 * invent interest in its own listings and give itself names it had not paid
 * for.
 *
 * The rules are in `views.ts`. This file is the part that touches accounts.
 *
 * Server only.
 */

import { createHmac } from 'node:crypto';
import { findById, sessionSecret, type PublicAccount } from '../auth/store';
import { loadWorkspace, patchWorkspace, readWorkspace } from './workspace-store';
import { preferredName } from './workspace';
import { notify } from './notify';
import { registrationIsCurrent } from './workspace';
import {
  isRevealed, maskedViewer, recordView, refuseReveal, revealPriceCents, viewersOf,
  type ListingView, type Reveal,
} from './views';

/**
 * One agent's card, as the owner sees it after paying.
 *
 * Short on purpose: enough to ring them and know who they are. Their listings,
 * their track record and the rest are a click away on their public page, and
 * putting them here would make the reveal a dossier rather than a contact.
 */
export interface ViewerCard {
  id: string;
  name: string;
  agency: string;
  mobile: string;
  email: string;
  ceaNumber: string;
  /** Their own words, trimmed to a line or two. */
  bio: string;
  experienceYears: string;
  /** How many properties they currently advertise. */
  liveListings: number;
  registrationCurrent: boolean;
}

/**
 * A viewer, as the owner's browser may refer to them.
 *
 * Not the account id. The directory hands the browser every agent's name
 * against their account id, so sending the real one here would let the page
 * join the two and read for nothing exactly the names the reveal sells. This
 * is a keyed digest of the owner, the listing and the viewer: stable enough to
 * press a button with, and meaningless anywhere else — the same agent viewing
 * two listings is two different tokens.
 */
export async function viewToken(ownerId: string, listingId: string, viewerId: string): Promise<string> {
  const secret = await sessionSecret();
  return createHmac('sha256', secret).update(`${ownerId}:${listingId}:${viewerId}`).digest('hex').slice(0, 24);
}

/**
 * The account behind a token, found by trying the owner's own view records.
 *
 * A scan rather than a lookup, because the mapping is deliberately one-way. A
 * listing has a handful of viewers, so it costs nothing, and a token that
 * matches none of them is simply not a viewer of this listing.
 */
export async function viewerFromToken(
  owner: { views: ListingView[] },
  ownerId: string,
  listingId: string,
  token: string,
): Promise<string | null> {
  for (const v of viewersOf(owner.views, listingId)) {
    if (await viewToken(ownerId, listingId, v.viewerId) === token) return v.viewerId;
  }
  return null;
}

/** What the owner is shown for one agent who looked. */
export interface ViewerRow {
  /** The opaque token above, never the account id. */
  token: string;
  first: string;
  last: string;
  /** Separate occasions, not page loads. */
  count: number;
  revealed: boolean;
  /** Present once revealed and paid for. */
  card?: ViewerCard;
  /** What is shown instead while it is not: "An agent from PropNex". */
  masked: string;
}

/* ------------------------------------------------------------- recording */

/**
 * Record that one agent opened one listing.
 *
 * Silent about everything that could be a probe: a listing that is not there,
 * an owner who does not exist, a viewer who is the owner. The caller is a
 * beacon on a public page and gets `{ ok: true }` either way, because the
 * reply is the only thing a stranger could learn from.
 */
export async function recordListingView(input: {
  ownerId: string;
  listingId: string;
  viewer: PublicAccount;
}): Promise<void> {
  const { ownerId, listingId, viewer } = input;
  if (ownerId === viewer.id) return;

  const owner = await findById(ownerId);
  if (!owner) return;

  const workspace = await readWorkspace(ownerId);
  const listing = workspace?.listings.find((l) => l.id === listingId && !l.archived);

  /* Only a listing that is actually advertised. A view of a draft is not a
     thing that can happen, so a claim that it did is discarded. */
  if (!workspace || !listing || (listing.status !== 'published' && listing.status !== 'paused')) return;

  const { views, isNewViewer } = recordView(workspace.views, {
    listingId,
    viewerId: viewer.id,
    ownerId,
    at: new Date().toISOString(),
  });

  await patchWorkspace(owner, { views });

  /* Only the first time. An agent told about every revisit stops reading. */
  if (!isNewViewer) return;

  const viewerWorkspace = await readWorkspace(viewer.id);
  const agency = viewerWorkspace?.profile.agency ?? '';

  await notify(owner, {
    kind: 'views',
    title: `${maskedViewer(agency)} viewed ${listing.project}`,
    body: [
      `${maskedViewer(agency)} opened your listing in the property directory.`,
      '',
      'Reveal who it was to see their name, agency and number.',
    ].join('\n'),
    href: `/phase1/listings/${listingId}?tab=views`,
    tone: 'info',
  });
}

/* ------------------------------------------------------------- revealing */

/** The agent behind a view, assembled from their own account and workspace. */
async function cardFor(viewerId: string): Promise<ViewerCard | null> {
  const account = await findById(viewerId);
  if (!account) return null;
  const w = await readWorkspace(viewerId);

  const profile = w?.profile;
  return {
    id: viewerId,
    name: preferredName(profile?.fullName || account.fullName),
    agency: profile?.agency ?? '',
    mobile: profile?.mobile ?? '',
    email: profile?.email ?? account.email,
    ceaNumber: profile?.ceaNumber ?? account.cea?.registrationNo ?? '',
    bio: (profile?.bio ?? '').slice(0, 280),
    experienceYears: profile?.experienceYears ?? '',
    liveListings: (w?.listings ?? []).filter((l) => l.status === 'published' && !l.archived).length,
    registrationCurrent: registrationIsCurrent(account.cea?.registrationEnd),
  };
}

/**
 * Everyone who has looked at one listing, in the form the screen draws.
 *
 * A revealed viewer whose account has since gone carries no card. That is
 * shown as a closed account rather than as an error: the owner paid for a name
 * that was real when they bought it.
 */
export async function viewerRows(
  owner: { views: ListingView[]; reveals: Reveal[] },
  ownerId: string,
  listingId: string,
): Promise<ViewerRow[]> {
  const rows = viewersOf(owner.views, listingId);

  return Promise.all(rows.map(async (v) => {
    const revealed = isRevealed(owner.reveals, listingId, v.viewerId);
    const card = revealed ? await cardFor(v.viewerId) : null;

    /* The agency is shown before payment, so it has to be read whether or not
       the name was bought. It names a firm, not a person. */
    const agency = card?.agency ?? (await readWorkspace(v.viewerId))?.profile.agency ?? '';

    return {
      token: await viewToken(ownerId, listingId, v.viewerId),
      first: v.first,
      last: v.last,
      count: v.count,
      revealed,
      card: card ?? undefined,
      masked: maskedViewer(agency),
    };
  }));
}

export interface RevealResult {
  ok: boolean;
  status: number;
  error?: string;
  code?: string;
  card?: ViewerCard;
  /** What was charged, and what is left, both in cents. */
  costCents?: number;
  credits?: number;
}

/**
 * Buy one name.
 *
 * The charge and the record are written in the same patch, so there is no
 * moment where an account has been debited for a name it does not have. The
 * card is read first for the same reason — a viewer whose account has gone is
 * refused rather than charged for nothing.
 */
export async function revealViewer(input: {
  owner: PublicAccount;
  listingId: string;
  /** The opaque token from `viewerRows`, not an account id. */
  token: string;
}): Promise<RevealResult> {
  const { owner, listingId, token } = input;
  const workspace = await loadWorkspace(owner);

  if (!workspace.listings.some((l) => l.id === listingId && !l.archived)) {
    return { ok: false, status: 404, code: 'not_found', error: 'That listing is not in your workspace.' };
  }

  const viewerId = await viewerFromToken(workspace, owner.id, listingId, token);
  if (!viewerId) {
    return { ok: false, status: 400, code: 'not_a_viewer', error: 'That agent has not opened this listing.' };
  }

  const refusal = refuseReveal({
    views: workspace.views,
    reveals: workspace.reveals,
    credits: workspace.revealCredits,
    listingId,
    viewerId,
  });
  if (refusal) {
    return { ok: false, status: refusal.code === 'no_credit' ? 402 : 400, ...refusal };
  }

  const card = await cardFor(viewerId);
  if (!card) {
    return { ok: false, status: 410, code: 'gone', error: 'That agent has closed their account. You have not been charged.' };
  }

  const costCents = revealPriceCents(workspace.reveals, listingId);
  const reveal: Reveal = { listingId, viewerId, at: new Date().toISOString(), costCents };

  const credits = workspace.revealCredits - costCents;
  await patchWorkspace(owner, {
    reveals: [...workspace.reveals, reveal],
    revealCredits: credits,
  });

  return { ok: true, status: 200, card, costCents, credits };
}
