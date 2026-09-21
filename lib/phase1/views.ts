/**
 * Who has been looking at your properties.
 *
 * An agent browsing the directory is doing something the owning agent would
 * pay to know about. A listing that three agents opened this week is a listing
 * with interest behind it; the same listing with none is a listing to reprice.
 * That signal exists in the product already — it is simply thrown away — and
 * this module is what keeps it.
 *
 * The shape is deliberately the one people already understand from a
 * professional network: a count anyone can see on their own listing, and the
 * names behind the count revealed one at a time.
 *
 * Three rules hold the design together.
 *
 * **A viewer is an agent, counted once.** Not a page load. An agent who opens
 * the same listing eight times while showing it to a client is one interested
 * party, and a count that says eight is a count nobody can act on. The repeat
 * visits are kept as a number on that one record, because six separate visits
 * from one agent is itself worth knowing.
 *
 * **The owner is never a viewer of their own listing.** Obvious, and worth
 * stating, because the count is a sales figure and a number an agent can
 * inflate by refreshing their own page is worthless.
 *
 * **The first name on each listing is free.** The count alone is an
 * advertisement for the reveal, and an advertisement that never shows what it
 * is selling converts nobody. One free name per listing means every agent sees
 * the actual thing — a name, an agency, a number they can ring — before being
 * asked for anything.
 *
 * Pure. Everything here is a function of records the server holds; the writing
 * is in `views-store.ts` and the charging in the reveal route.
 */

/** One agent's interest in one listing, however many times they looked. */
export interface ListingView {
  listingId: string;
  /** The account id of the agent who looked. */
  viewerId: string;
  /** When they first opened it. */
  first: string;
  /** When they last did. */
  last: string;
  /** How many separate occasions, not page loads. */
  count: number;
}

/**
 * Credit bought, and the payment that bought it.
 *
 * Kept as a list rather than folded straight into the balance, because the
 * reference is what makes granting safe to repeat. A webhook can be redelivered
 * and a settled payment can be read back by the browser more than once; both
 * paths end at the same check — is this reference already here — so credit is
 * added exactly once however many times the news arrives.
 */
export interface CreditTopUp {
  /** The payment reference. Unique, and the reason this is a list. */
  ref: string;
  /** Cents added to the balance. */
  cents: number;
  /** What was paid for it, in cents. Less than `cents` on the larger packs. */
  paidCents: number;
  at: string;
}

/** A name the owner has paid for, or been given. */
export interface Reveal {
  listingId: string;
  viewerId: string;
  at: string;
  /** What it cost, in cents. Zero for the one included with each listing. */
  costCents: number;
}

/**
 * One name per listing, on the house.
 *
 * Per listing rather than per account: an agent with twelve listings gets
 * twelve tastes of the feature, which is the point of it. Per account, the
 * first listing would use the allowance up and the other eleven would show a
 * price where a name should be.
 */
export const FREE_REVEALS_PER_LISTING = 1;

/** S$1 a name, after the free one. */
export const REVEAL_PRICE_CENTS = 100;

/**
 * What a new workspace starts with, in cents.
 *
 * Three names beyond the free one per listing. A feature nobody can try is a
 * feature nobody buys, and an agent who has never seen a revealed card cannot
 * judge whether the next one is worth a pound.
 */
export const STARTING_REVEAL_CREDITS = 300;

/**
 * Two visits an hour apart are the same look; two a week apart are not.
 *
 * Coarse on purpose. The number is read as "how keen were they", and an hour
 * is short enough to catch a genuine return the next morning while ignoring a
 * refresh and a back button.
 */
export const REVISIT_AFTER_MS = 60 * 60 * 1000;

/* --------------------------------------------------------------- counting */

/**
 * Fold one view into the set.
 *
 * Returns the new set and whether this is an agent the owner has not seen
 * before, which is the only moment worth a notification — an agent told about
 * every revisit stops reading the notices.
 */
export function recordView(
  views: ListingView[],
  view: { listingId: string; viewerId: string; ownerId: string; at: string },
): { views: ListingView[]; isNewViewer: boolean; counted: boolean } {
  /* Your own listing is not a view of it. */
  if (view.viewerId === view.ownerId) return { views, isNewViewer: false, counted: false };

  const i = views.findIndex((v) => v.listingId === view.listingId && v.viewerId === view.viewerId);
  if (i === -1) {
    return {
      views: [...views, { listingId: view.listingId, viewerId: view.viewerId, first: view.at, last: view.at, count: 1 }],
      isNewViewer: true,
      counted: true,
    };
  }

  const existing = views[i];
  const gap = new Date(view.at).getTime() - new Date(existing.last).getTime();
  const returning = Number.isFinite(gap) && gap >= REVISIT_AFTER_MS;

  const next = [...views];
  next[i] = { ...existing, last: view.at, count: existing.count + (returning ? 1 : 0) };
  return { views: next, isNewViewer: false, counted: returning };
}

/** The agents who have opened one listing, most recent first. */
export const viewersOf = (views: ListingView[], listingId: string): ListingView[] =>
  views.filter((v) => v.listingId === listingId).sort((a, b) => b.last.localeCompare(a.last));

/** How many agents have opened it. Not how many times. */
export const viewCount = (views: ListingView[], listingId: string): number =>
  views.reduce((n, v) => n + (v.listingId === listingId ? 1 : 0), 0);

/** Every listing's count at once, for a page drawing a whole portfolio. */
export function viewCounts(views: ListingView[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of views) out[v.listingId] = (out[v.listingId] ?? 0) + 1;
  return out;
}

/* ---------------------------------------------------------------- banking */

/** The part of a workspace a top-up touches. */
export interface Balance {
  revealCredits: number;
  revealTopUps: CreditTopUp[];
}

/**
 * Bank a payment against a balance, once.
 *
 * Null means this reference is already in the ledger and the balance is
 * already right — which is the answer for a redelivered webhook, for the
 * browser's status poll settling a payment the webhook already settled, and
 * for anything else that hears the same news twice. The caller writes nothing
 * on null rather than writing the same number back.
 *
 * Pure, and the whole of the rule: the store around it only holds the lock.
 */
export function bankTopUp(balance: Balance, topUp: CreditTopUp): Balance | null {
  if (topUp.cents <= 0) return null;
  if (balance.revealTopUps.some((t) => t.ref === topUp.ref)) return null;
  return {
    revealCredits: balance.revealCredits + topUp.cents,
    revealTopUps: [...balance.revealTopUps, topUp],
  };
}

/* --------------------------------------------------------------- revealing */

export const isRevealed = (reveals: Reveal[], listingId: string, viewerId: string): boolean =>
  reveals.some((r) => r.listingId === listingId && r.viewerId === viewerId);

/** Agents who have looked and have never been named. */
export const unrevealedCount = (views: ListingView[], reveals: Reveal[], listingId: string): number =>
  viewersOf(views, listingId).filter((v) => !isRevealed(reveals, listingId, v.viewerId)).length;

const revealsOn = (reveals: Reveal[], listingId: string) =>
  reveals.filter((r) => r.listingId === listingId).length;

/**
 * What the next name on this listing costs, in cents.
 *
 * Zero while the included one is unused, S$1 after that. Asked before the
 * button is drawn, so the button states the price rather than springing it.
 */
export function revealPriceCents(reveals: Reveal[], listingId: string): number {
  return revealsOn(reveals, listingId) < FREE_REVEALS_PER_LISTING ? 0 : REVEAL_PRICE_CENTS;
}

/** `Free` or `S$1`, for the button that spends it. */
export function priceLabel(cents: number): string {
  if (cents === 0) return 'Free';
  return cents % 100 === 0 ? `S$${cents / 100}` : `S$${(cents / 100).toFixed(2)}`;
}

/** Why this name cannot be revealed, addressed to the agent asking. */
export function refuseReveal(input: {
  views: ListingView[];
  reveals: Reveal[];
  credits: number;
  listingId: string;
  viewerId: string;
}): { code: string; error: string } | null {
  const { views, reveals, credits, listingId, viewerId } = input;

  if (!views.some((v) => v.listingId === listingId && v.viewerId === viewerId)) {
    return { code: 'not_a_viewer', error: 'That agent has not opened this listing.' };
  }
  if (isRevealed(reveals, listingId, viewerId)) {
    return { code: 'already_revealed', error: 'You have already revealed that agent.' };
  }

  const cents = revealPriceCents(reveals, listingId);
  if (cents > 0 && credits < cents) {
    return {
      code: 'no_credit',
      error: `Revealing this agent costs ${priceLabel(cents)} and your balance is ${priceLabel(credits)}. Top up from Subscription.`,
    };
  }
  return null;
}

/**
 * What the owner is shown before they pay: enough to decide whether it is
 * worth a pound, and nothing that identifies anybody.
 *
 * The agency is deliberately kept. "An agent from PropNex" is the part that
 * makes the reveal worth buying, and it names a firm rather than a person.
 */
export function maskedViewer(agency: string): string {
  return agency ? `An agent from ${agency}` : 'An agent on V-RENT';
}

/** "3 agents", "1 agent", "No agents yet" — the count as a sentence. */
export function viewsSentence(n: number): string {
  if (n === 0) return 'No agents yet';
  return `${n} ${n === 1 ? 'agent' : 'agents'}`;
}
