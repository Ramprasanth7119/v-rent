/**
 * What an advertisement may not say.
 *
 * Three things keep turning up in property copy and none of them belong in it:
 * a preference or exclusion based on who somebody is, wording that reads as a
 * come-on rather than a description of a home, and the agent's own telephone
 * number pasted into the text to route around the platform.
 *
 * The first is the serious one. An advertisement that says which races or
 * nationalities may apply is unlawful discrimination in the letting of
 * property, and it is also the single most common defect in listing copy —
 * usually typed without much thought, by somebody repeating the landlord's
 * instruction. Refusing it at the point it is written, with the phrase quoted
 * back, does more than a policy page nobody opens.
 *
 * Two deliberate decisions about scope:
 *
 * **Gender is not treated as discrimination here.** Room rentals in Singapore
 * routinely and lawfully state one, and a rule that refused "female tenant
 * preferred" would be wrong far more often than it was right.
 *
 * **A word is only an issue in a phrase.** "Indian food nearby" is a fact about
 * the neighbourhood; "no Indians" is an exclusion. Matching bare words would
 * fail every listing near Little India, so every rule here needs the shape of a
 * preference around it — an exclusion, a restriction or a stated preference.
 *
 * Pure, and small enough to run against every keystroke. The screen and the
 * route share it.
 */

export type IssueKind = 'discrimination' | 'suggestive' | 'contact';

export interface ContentIssue {
  kind: IssueKind;
  /** The words as they were written, for quoting back. */
  phrase: string;
  /** What is wrong with it, addressed to the agent who typed it. */
  message: string;
}

/**
 * The policy in a sentence, for the places that need to say why.
 *
 * Deliberately says where the legitimate version of this lives. An agent
 * letting an HDB flat under a block quota has a real restriction to state, and
 * telling them only "you cannot write that" without showing them the field
 * that does it properly leaves them with a problem and no answer.
 */
export const POLICY_NOTE =
  'A listing describes the property, never who may apply for it. Where an HDB block’s ethnic quota genuinely limits who '
  + 'can take a flat, set that on the property step — it is shown to tenants as who the flat is open to.';

/* ------------------------------------------------------- discrimination */

/**
 * Groups a person belongs to rather than chooses — nationality, race,
 * ethnicity, religion and immigration standing.
 */
const PROTECTED = [
  'chinese', 'malay', 'malays', 'indian', 'indians', 'eurasian', 'eurasians', 'caucasian', 'caucasians',
  'filipino', 'filipinos', 'filipina', 'filipinas', 'pinoy', 'burmese', 'bangladeshi', 'bangladeshis',
  'indonesian', 'indonesians', 'vietnamese', 'thai', 'japanese', 'korean', 'koreans', 'nepalese', 'sri lankan',
  'myanmar', 'prc', 'mainlander', 'mainlanders', 'ang moh',
  'muslim', 'muslims', 'hindu', 'hindus', 'christian', 'christians', 'buddhist', 'buddhists', 'jewish',
  'foreigner', 'foreigners', 'local', 'locals', 'singaporean', 'singaporeans', 'expat', 'expats', 'expatriate', 'expatriates',
  'pr holder', 'work permit holder', 'work permit holders', 's pass holder', 'e pass holder',
];

const group = `(?:${PROTECTED.map((w) => w.replace(/ /g, '\\s+')).join('|')})`;

/**
 * The shapes an exclusion takes. Each one needs a protected group *and* the
 * grammar of a preference, which is what keeps a neighbourhood description out
 * of it.
 */
const DISCRIMINATION: { re: RegExp; message: string }[] = [
  {
    /* The connector is optional because both "no foreigners" and "not for
       foreigners" are written, and the second is the politer-sounding one. */
    re: new RegExp(`\\b(?:no|not|non|anti|avoid|exclude|excluding|without)(?:\\s+(?:for|to|suitable\\s+for|open\\s+to))?[\\s-]+${group}\\b`, 'gi'),
    message: 'An advertisement may not exclude people by nationality, race, religion or immigration status. For an HDB block quota, set who the flat is open to instead.',
  },
  {
    re: new RegExp(`\\b${group}\\b[\\s,]*(?:tenants?|applicants?|family|families|couples?)?[\\s,]*(?:only|preferred|pref\\b|welcome\\s+only)`, 'gi'),
    message: 'An advertisement may not restrict who may apply by nationality, race, religion or immigration status. For an HDB block quota, set who the flat is open to instead.',
  },
  {
    re: new RegExp(`\\b(?:prefer|prefers|preferred|preferably|looking\\s+for|want|wanted|seeking|suitable\\s+for|ideal\\s+for)\\s+(?:a\\s+|an\\s+)?(?:young\\s+|single\\s+|working\\s+)?${group}\\b`, 'gi'),
    message: 'An advertisement may not state a preference for a nationality, race or religion. For an HDB block quota, set who the flat is open to instead.',
  },
  {
    re: /\b(?:no|not\s+for|not\s+suitable\s+for)\s+(?:pr|prs)\b/gi,
    message: 'An advertisement may not exclude people by immigration status.',
  },
  {
    re: /\b(?:own\s+race|same\s+race|race\s+quota\s+free|any\s+race\s+except)\b/gi,
    message: 'An advertisement may not refer to the race of the people who may apply.',
  },
];

/* ------------------------------------------------------------ suggestive */

const SUGGESTIVE: { re: RegExp; message: string }[] = [
  {
    re: /\b(?:sexy|seductive|sensual|erotic|naughty|flirty|kinky|babe|hot\s+chick|hot\s+girls?|sugar\s+(?:daddy|baby|mummy)|escort|companionship|massage\s+services?|no\s+strings)\b/gi,
    message: 'This reads as a personal advertisement rather than a description of a property.',
  },
  {
    re: /\b(?:cosy|romantic)\s+(?:nights?|encounters?|getaways?)\s+(?:with|together)\b/gi,
    message: 'Describe the property rather than what might happen in it.',
  },
];

/* --------------------------------------------------------------- contact */

const CONTACT: { re: RegExp; message: string }[] = [
  {
    re: /(?:\+?65[\s-]?)?[89]\d{3}[\s-]?\d{4}\b/g,
    message: 'Leave telephone numbers out. Tenants reach you through V-RENT, which is what records the enquiry.',
  },
  {
    re: /\b[^\s@]+@[^\s@]+\.[a-z]{2,}\b/gi,
    message: 'Leave email addresses out. Tenants reach you through V-RENT, which is what records the enquiry.',
  },
  {
    re: /\b(?:wa\.me|whatsapp|t\.me|telegram|wechat|line\s+id)\b[\s:]*\S*/gi,
    message: 'Leave messaging handles out. Tenants reach you through V-RENT, which is what records the enquiry.',
  },
  {
    re: /\bhttps?:\/\/\S+/gi,
    message: 'Leave web addresses out of the description.',
  },
];

/* ----------------------------------------------------------------- check */

const RULES: { kind: IssueKind; rules: { re: RegExp; message: string }[] }[] = [
  { kind: 'discrimination', rules: DISCRIMINATION },
  { kind: 'suggestive', rules: SUGGESTIVE },
  { kind: 'contact', rules: CONTACT },
];

/**
 * Everything wrong with a piece of copy, worst first.
 *
 * One issue per distinct phrase: an agent who wrote the same exclusion twice
 * needs telling once. Discrimination is listed before the rest because it is
 * the one that must be fixed rather than tidied.
 */
export function reviewText(text: string): ContentIssue[] {
  if (!text.trim()) return [];
  const found: ContentIssue[] = [];
  const seen = new Set<string>();

  for (const { kind, rules } of RULES) {
    for (const { re, message } of rules) {
      /* Fresh each time: a global regular expression carries its position
         between calls, and a shared one would skip matches on the next run. */
      for (const match of text.matchAll(new RegExp(re.source, re.flags))) {
        const phrase = match[0].trim();
        const key = `${kind}:${phrase.toLowerCase()}`;
        if (phrase && !seen.has(key)) {
          seen.add(key);
          found.push({ kind, phrase, message });
        }
      }
    }
  }
  return found;
}

/** Whether the copy may be saved and advertised. */
export const textIsAllowed = (text: string): boolean => reviewText(text).length === 0;

/** The first thing to fix, as a sentence for a form field. */
export function firstIssueMessage(text: string): string | null {
  const [issue] = reviewText(text);
  return issue ? `“${issue.phrase}” — ${issue.message}` : null;
}
