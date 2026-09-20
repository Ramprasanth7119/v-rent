/**
 * Singapore mobile numbers.
 *
 * One module, because a number is typed in four places — an agent signing up,
 * an agent editing their profile, a tenant writing an enquiry, an agent noting
 * down who is coming to a viewing — and a rule enforced in three of them is not
 * a rule. The screen and the route both read from here, so a number the form
 * accepted cannot be refused by the server that stores it.
 *
 * What counts as one:
 *
 *   - eight digits, which is the whole of a Singapore subscriber number;
 *   - beginning with 8 or 9, which is what the Infocomm Media Development
 *     Authority allocates to mobile services. A number beginning 6 is a fixed
 *     line and one beginning 3 is a voice-over-IP line: both are real Singapore
 *     numbers and neither will receive a text message, which is the whole
 *     reason the product asks for one;
 *   - optionally prefixed +65 or 65, which is how most people write it and how
 *     every phone will offer it.
 *
 * Spaces, brackets and dashes are accepted on the way in and thrown away: a
 * number pasted from a name card should not be refused over its punctuation.
 * What is stored is always the same shape, `+65 9123 4567`, so numbers sort,
 * compare and print the same everywhere.
 *
 * Pure. No imports, so the browser and the route handlers share it as is.
 */

/** The stored and displayed shape. */
export const SG_MOBILE_DISPLAY = '+65 9123 4567';

/** Everything that is not a digit, and the country code if it is there. */
const strip = (raw: string) => raw.replace(/[\s()\-.]/g, '').replace(/^\+?65/, '');

/** Eight digits beginning 8 or 9. */
const SUBSCRIBER = /^[89][0-9]{7}$/;

export const isSgMobile = (raw: string): boolean => SUBSCRIBER.test(strip(raw.trim()));

/**
 * The number as it is stored, or null when it is not one.
 *
 * Callers store what comes back rather than what was typed, which is what keeps
 * one agent's `+6591234567` and another's `9123 4567` the same number in the
 * records.
 */
export function normaliseSgMobile(raw: string): string | null {
  const digits = strip(raw.trim());
  if (!SUBSCRIBER.test(digits)) return null;
  return `+65 ${digits.slice(0, 4)} ${digits.slice(4)}`;
}

/**
 * Why a number was refused, in a sentence for the person who typed it.
 *
 * Separate messages rather than one, because "enter a valid mobile number" is
 * the least useful thing to tell somebody who has just typed their own: the
 * three ways it goes wrong are a landline, a foreign number and a typo, and
 * each of them wants a different correction.
 */
export function sgMobileProblem(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'Enter your mobile number.';

  if (/^\+(?!65)/.test(trimmed.replace(/\s/g, ''))) {
    return 'Enter a Singapore mobile number. Numbers from other countries are not accepted.';
  }

  const digits = strip(trimmed);
  if (/[^0-9]/.test(digits)) return 'A mobile number is digits only.';
  if (digits.length !== 8) {
    return `A Singapore mobile number is 8 digits, like ${SG_MOBILE_DISPLAY}.`;
  }
  if (!SUBSCRIBER.test(digits)) {
    return 'A Singapore mobile number begins with 8 or 9. A number beginning 6 is a fixed line and cannot receive a text message.';
  }
  return null;
}

/**
 * The same, for a field that takes either a mobile number or an email address.
 *
 * The tenant enquiry form asks for one or the other, so something with an `@`
 * in it is left to the email check and everything else is held to the rule
 * above — otherwise "9123" reaches an agent as a way of contacting somebody.
 */
export const looksLikeEmail = (raw: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());

export function contactProblem(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'Enter a mobile number or an email address.';
  if (trimmed.includes('@')) {
    return looksLikeEmail(trimmed) ? null : 'That email address is not complete.';
  }
  return sgMobileProblem(trimmed);
}

/**
 * A contact as it is stored: a mobile number in the one shape, an email
 * lower-cased, anything else untouched so nothing a tenant typed is lost.
 */
export function normaliseContact(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  return normaliseSgMobile(trimmed) ?? trimmed;
}
