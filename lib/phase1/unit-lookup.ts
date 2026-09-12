/**
 * What is already known about one unit.
 *
 * An agent typing a unit number into the create form is answering a question
 * the platform can usually answer for them. Three things are worth saying at
 * that moment, and only at that moment — once the listing is saved it is too
 * late to be useful:
 *
 *  - **You already have this unit.** Re-advertising a unit you are already
 *    advertising is the commonest accidental duplicate, and it is embarrassing
 *    rather than harmful, so it is caught before the work is done rather than
 *    at the publish gate.
 *  - **You have let this unit before.** A re-let is the same flat: the size,
 *    the layout and the tenure have not changed since March. Offering to carry
 *    them across saves retyping and stops a transcription error.
 *  - **Somebody else is advertising it.** An open mandate to three agencies is
 *    ordinary practice in Singapore and is not misconduct, so this is said
 *    plainly and nothing is blocked. What it is not is a surprise the agent
 *    should first meet in moderation.
 *
 * Whose listing it is stays out of the answer. An agent has no business being
 * told which of their competitors holds the mandate; the count is what they
 * need to decide whether to price against it. The operations console, which
 * does have that business, reads the same records through `duplicates`.
 *
 * Server only: it reads every agent's workspace.
 */

import { listAccounts, type PublicAccount } from '../auth/store';
import { readWorkspace } from './workspace-store';
import { DemoListing } from './data';

/** The digits after the dash: the column of the building a unit sits in. */
const stackOf = (unit: string) => {
  const bare = unit.replace(/[\s#]/g, '').toUpperCase();
  const dash = bare.lastIndexOf('-');
  return dash > 0 ? bare.slice(dash + 1) : null;
};

const normaliseUnit = (unit: string) => unit.replace(/[\s#]/g, '').toUpperCase();

/** Everything worth carrying from one listing of a unit to the next. */
export interface UnitFacts {
  listingId: string;
  reference: string;
  project: string;
  unitNo: string;
  status: DemoListing['status'];
  archived: boolean;
  bedrooms: number;
  bathrooms: number;
  sizeSqft: number;
  furnishing: DemoListing['furnishing'];
  propertyType: DemoListing['propertyType'];
  monthlyRent: number;
  amenities: string[];
  tenure?: DemoListing['tenure'];
  builtYear?: number;
  nearestMrt?: string;
  description?: string;
}

export interface UnitLookup {
  postalCode: string;
  unitNo: string;
  /** This agent's own listing of this exact unit, live or archived. */
  yours: UnitFacts | null;
  /** This agent's most recent listing in the same stack, when the unit is new to them. */
  sameStack: UnitFacts | null;
  /** How many other agents are advertising this unit. Never who. */
  othersAdvertising: number;
}

const facts = (l: DemoListing): UnitFacts => ({
  listingId: l.id,
  reference: l.reference,
  project: l.project,
  unitNo: l.unitNo,
  status: l.status,
  archived: Boolean(l.archived),
  bedrooms: l.bedrooms,
  bathrooms: l.bathrooms,
  sizeSqft: l.sizeSqft,
  furnishing: l.furnishing,
  propertyType: l.propertyType,
  monthlyRent: l.monthlyRent,
  amenities: l.amenities ?? [],
  tenure: l.tenure,
  builtYear: l.builtYear,
  nearestMrt: l.nearestMrt,
  description: l.description,
});

/** Newest first, by whichever date the record actually carries. */
const recency = (l: DemoListing) => l.updatedAt ?? l.publishedAt ?? l.createdAt ?? '';

export async function lookupUnit(
  user: PublicAccount,
  postalCode: string,
  unit: string,
  /** Ignored when re-checking a listing being edited, so it never flags itself. */
  excludeListingId?: string,
): Promise<UnitLookup> {
  const postal = postalCode.trim();
  const wanted = normaliseUnit(unit);
  const stack = stackOf(unit);

  const empty: UnitLookup = { postalCode: postal, unitNo: unit, yours: null, sameStack: null, othersAdvertising: 0 };
  if (!postal || !wanted) return empty;

  /* ---------------------------------------------------------------- yours */
  const mine = await readWorkspace(user.id);
  const ours = (mine?.listings ?? []).filter((l) => l.id !== excludeListingId && l.postalCode.trim() === postal);

  const yours = ours
    .filter((l) => normaliseUnit(l.unitNo) === wanted)
    .sort((a, b) => recency(b).localeCompare(recency(a)))[0];

  /* A different unit in the same column of the same block: same footprint and
     layout in almost every Singapore development, so it is worth offering. */
  const sameStack = !yours && stack
    ? ours
      .filter((l) => !l.archived && stackOf(l.unitNo) === stack && normaliseUnit(l.unitNo) !== wanted)
      .sort((a, b) => recency(b).localeCompare(recency(a)))[0]
    : undefined;

  /* -------------------------------------------------------------- others */
  const accounts = (await listAccounts()).filter((a) => a.role === 'agent' && a.id !== user.id);
  let othersAdvertising = 0;
  for (const account of accounts) {
    const w = await readWorkspace(account.id);
    if (!w) continue;
    const advertising = w.listings.some((l) => (
      !l.archived
      && (l.status === 'published' || l.status === 'paused' || l.status === 'pending_review')
      && l.postalCode.trim() === postal
      && normaliseUnit(l.unitNo) === wanted
    ));
    if (advertising) othersAdvertising += 1;
  }

  return {
    postalCode: postal,
    unitNo: unit,
    yours: yours ? facts(yours) : null,
    sameStack: sameStack ? facts(sameStack) : null,
    othersAdvertising,
  };
}
