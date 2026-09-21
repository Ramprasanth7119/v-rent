/**
 * Singapore mobile numbers.
 *
 * The rule is narrow on purpose — eight digits beginning 8 or 9 — so the tests
 * are mostly about what must be refused. A fixed line and a foreign number are
 * both real numbers, and letting either through means an agent holds a contact
 * that will never receive the message they send to it.
 */

import { describe, expect, it } from 'vitest';
import {
  SG_SUBSCRIBER_DIGITS, contactProblem, groupSgMobile, isSgMobile, normaliseContact,
  normaliseSgMobile, sgMobileProblem, sgSubscriberDigits,
} from '../lib/phase1/mobile';

describe('what counts as a Singapore mobile number', () => {
  it('accepts eight digits beginning 8 or 9, however they are written', () => {
    for (const raw of ['91234567', '9123 4567', '+6591234567', '+65 9123 4567', '65 9123 4567', '9123-4567', '(65) 9123 4567']) {
      expect(isSgMobile(raw)).toBe(true);
    }
    expect(isSgMobile('81234567')).toBe(true);
  });

  it('refuses a fixed line, which cannot receive a text message', () => {
    expect(isSgMobile('61234567')).toBe(false);
    expect(sgMobileProblem('61234567')).toContain('begins with 8 or 9');
  });

  it('refuses a voice-over-IP line', () => {
    expect(isSgMobile('31234567')).toBe(false);
  });

  it('refuses the wrong number of digits, and says how many there should be', () => {
    expect(isSgMobile('9123456')).toBe(false);
    expect(isSgMobile('912345678')).toBe(false);
    expect(sgMobileProblem('9123456')).toContain('8 digits');
  });

  it('refuses another country, by name rather than by "invalid"', () => {
    expect(isSgMobile('+44 7700 900123')).toBe(false);
    expect(sgMobileProblem('+44 7700 900123')).toContain('Singapore');
    expect(sgMobileProblem('+91 98765 43210')).toContain('other countries');
  });

  it('refuses letters and an empty field', () => {
    expect(isSgMobile('9123 456A')).toBe(false);
    expect(sgMobileProblem('')).toBe('Enter your mobile number.');
  });
});

describe('how a number is stored', () => {
  it('is written one way whatever was typed', () => {
    for (const raw of ['91234567', '+6591234567', '9123 4567', '  +65 9123-4567 ']) {
      expect(normaliseSgMobile(raw)).toBe('+65 9123 4567');
    }
  });

  it('is null for anything that is not one, so a caller cannot store a bad number by accident', () => {
    expect(normaliseSgMobile('61234567')).toBeNull();
    expect(normaliseSgMobile('hello')).toBeNull();
  });
});

describe('the tenant contact field, which takes either', () => {
  it('accepts an email address', () => {
    expect(contactProblem('someone@example.sg')).toBeNull();
    expect(normaliseContact('Someone@Example.SG')).toBe('someone@example.sg');
  });

  it('holds a number to the mobile rule', () => {
    expect(contactProblem('9123 4567')).toBeNull();
    expect(contactProblem('61234567')).toContain('begins with 8 or 9');
    expect(contactProblem('9123')).toContain('8 digits');
  });

  it('catches a half-typed email rather than reading it as a number', () => {
    expect(contactProblem('someone@')).toContain('not complete');
  });

  it('stores a mobile number in the one shape', () => {
    expect(normaliseContact('91234567')).toBe('+65 9123 4567');
  });
});

/**
 * The split field shows the code beside the box rather than inside it, so what
 * the box holds is the subscriber number alone. Everything below is about what
 * has to happen to whatever arrives in it — typed, pasted, or autofilled by a
 * phone that has its own idea of how a number is written.
 */
describe('the digits the field holds', () => {
  it('keeps the eight digits out of any way a number is written', () => {
    for (const raw of ['91234567', '9123 4567', '+6591234567', '+65 9123 4567', '65 9123 4567', '9123-4567', '(65) 9123 4567']) {
      expect(sgSubscriberDigits(raw)).toBe('91234567');
    }
  });

  /* The one that would go unnoticed: a number pasted with its code, into a
     field that already draws the code, becoming 659123456 and refused. */
  it('drops a pasted country code instead of typing it into the number', () => {
    expect(sgSubscriberDigits('+65 9123 4567')).not.toContain('65 9');
    expect(sgSubscriberDigits('+65 9123 4567')).toHaveLength(SG_SUBSCRIBER_DIGITS);
  });

  it('throws away anything that is not a digit', () => {
    expect(sgSubscriberDigits('9a1b2c3d4e5f6g7')).toBe('91234567');
    expect(sgSubscriberDigits('')).toBe('');
  });

  it('never holds more than a Singapore number has', () => {
    expect(sgSubscriberDigits('912345678901')).toHaveLength(SG_SUBSCRIBER_DIGITS);
  });

  it('groups four and four as they are typed', () => {
    expect(groupSgMobile('9')).toBe('9');
    expect(groupSgMobile('9123')).toBe('9123');
    expect(groupSgMobile('91234')).toBe('9123 4');
    expect(groupSgMobile('91234567')).toBe('9123 4567');
  });

  /* What the field emits once it is full is what the server stores, so the two
     have to agree without anything tidying up in between. */
  it('composes the stored shape the routes already normalise to', () => {
    const digits = sgSubscriberDigits('9123 4567');
    expect(`+65 ${groupSgMobile(digits)}`).toBe(normaliseSgMobile('91234567'));
  });
});
