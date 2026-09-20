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
  contactProblem, isSgMobile, normaliseContact, normaliseSgMobile, sgMobileProblem,
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
