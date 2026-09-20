/**
 * HDB's Ethnic Integration Policy, as a field rather than as a sentence.
 *
 * Every HDB block and neighbourhood carries an ethnic quota. When a block has
 * reached its quota for one group, a flat in it can only be taken up by a
 * household from a group that is still under quota — so an agent letting or
 * selling an HDB flat genuinely does need to state who is eligible, and saying
 * nothing wastes everybody's week.
 *
 * That is the opposite of the wording the content policy refuses, and the
 * difference is worth being precise about, because the two look similar and are
 * not:
 *
 *   "No Indians"                        — an exclusion the agent invented.
 *   "Eligible: Malay households"        — the quota HDB has set on the block.
 *
 * The first is discrimination and is blocked in the description. The second is
 * the law, and the product gives it a proper field so an agent never has to
 * reach for the first. Everything about how it is presented follows from that:
 * the choice is phrased as who the flat is *open to*, never as who is turned
 * away, and it is shown to tenants as an eligibility note attributed to HDB
 * rather than as the agent's preference.
 *
 * It applies to HDB flats and nothing else. A condominium has no quota, and
 * offering the field there would be inviting somebody to discriminate with it.
 *
 * Pure data. No imports.
 */

export type EthnicGroup = 'chinese' | 'malay' | 'indian_other';
export type CitizenshipGroup = 'sc_spr_malaysian' | 'spr_non_malaysian';

export interface EipEligibility {
  /** The groups the block is still open to. More than one is common. */
  ethnic: EthnicGroup[];
  citizenship: CitizenshipGroup[];
}

/**
 * The three groups HDB works in. "Indian and Other Ethnic Groups" is one
 * category in the policy, not a tidy-up of two — the quota is set on it as a
 * whole, so it is offered as it is written.
 */
export const ETHNIC_GROUPS: { key: EthnicGroup; label: string }[] = [
  { key: 'chinese', label: 'Chinese' },
  { key: 'malay', label: 'Malay' },
  { key: 'indian_other', label: 'Indian and Other Ethnic Groups' },
];

/**
 * The SPR quota, which sits on top of the ethnic one. Singapore citizens and
 * Malaysian permanent residents are not counted against it.
 */
export const CITIZENSHIP_GROUPS: { key: CitizenshipGroup; label: string }[] = [
  { key: 'sc_spr_malaysian', label: 'Singapore citizen / Malaysian SPR' },
  { key: 'spr_non_malaysian', label: 'Non-Malaysian SPR' },
];

export const EIP_EXPLAINER =
  'HDB sets an ethnic quota on every block. Choosing who the flat is open to lets eligible households find it — '
  + 'and means you never have to write an exclusion into the description, which is not allowed.';

const ethnicLabel = (key: EthnicGroup) => ETHNIC_GROUPS.find((g) => g.key === key)?.label ?? key;
const citizenshipLabel = (key: CitizenshipGroup) => CITIZENSHIP_GROUPS.find((g) => g.key === key)?.label ?? key;

const listOut = (parts: string[]): string => (parts.length <= 1
  ? parts[0] ?? ''
  : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`);

/** Nothing chosen is not a restriction — it is a question nobody answered. */
export const hasEligibility = (e?: EipEligibility | null): boolean =>
  Boolean(e && (e.ethnic.length > 0 || e.citizenship.length > 0));

/**
 * The sentence a tenant reads.
 *
 * Always phrased as an opening rather than a closing, and always attributed:
 * the reader should understand that this is the block's quota and not the
 * agent's opinion of them. When every group is selected there is no
 * restriction left to state, and the honest answer is to say the quota is open.
 */
export function eligibilitySentence(e?: EipEligibility | null): string | null {
  if (!hasEligibility(e)) return null;
  const { ethnic, citizenship } = e!;

  const openToAll = ethnic.length === ETHNIC_GROUPS.length || ethnic.length === 0;
  const parts: string[] = [];

  if (openToAll) {
    parts.push('The block’s ethnic quota is open to all groups');
  } else {
    parts.push(`Under HDB’s Ethnic Integration Policy, this flat is open to ${listOut(ethnic.map(ethnicLabel))} households`);
  }

  if (citizenship.length === 1) {
    parts.push(`and to ${citizenshipLabel(citizenship[0])} applicants`);
  }

  return `${parts.join(' ')}.`;
}

/** The short form, for a card or a filter chip. */
export function eligibilityShort(e?: EipEligibility | null): string | null {
  if (!hasEligibility(e)) return null;
  const { ethnic } = e!;
  if (ethnic.length === 0 || ethnic.length === ETHNIC_GROUPS.length) return 'Quota open';
  return `Open to ${listOut(ethnic.map(ethnicLabel))}`;
}

/** Narrow whatever came from a browser or a stored record. */
export function cleanEligibility(raw: unknown): EipEligibility | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as { ethnic?: unknown; citizenship?: unknown };
  const ethnic = Array.isArray(r.ethnic)
    ? ETHNIC_GROUPS.map((g) => g.key).filter((k) => (r.ethnic as unknown[]).includes(k))
    : [];
  const citizenship = Array.isArray(r.citizenship)
    ? CITIZENSHIP_GROUPS.map((g) => g.key).filter((k) => (r.citizenship as unknown[]).includes(k))
    : [];
  return ethnic.length || citizenship.length ? { ethnic, citizenship } : undefined;
}
