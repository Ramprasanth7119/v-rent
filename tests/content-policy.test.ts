/**
 * What an advertisement may not say.
 *
 * Half of these tests are about what must NOT be refused. A filter that stops
 * an agent writing "Indian food and a Malay hawker stall downstairs" is worse
 * than no filter at all: they will fight it, work around it, and stop reading
 * anything the product tells them. The rule has to catch the exclusion and
 * leave the neighbourhood alone.
 */

import { describe, expect, it } from 'vitest';
import { firstIssueMessage, reviewText, textIsAllowed } from '../lib/phase1/content-policy';

const kinds = (t: string) => reviewText(t).map((i) => i.kind);

describe('exclusions by who somebody is', () => {
  it('refuses an outright exclusion', () => {
    for (const copy of ['No Indians please', 'no PRC tenants', 'Not for foreigners', 'No Muslims']) {
      expect(kinds(copy)).toContain('discrimination');
    }
  });

  it('refuses a restriction', () => {
    for (const copy of ['Chinese only', 'Singaporeans only', 'Malay tenants only', 'Locals preferred']) {
      expect(kinds(copy)).toContain('discrimination');
    }
  });

  it('refuses a stated preference', () => {
    for (const copy of ['Prefer Chinese family', 'Looking for a Filipino tenant', 'Suitable for expats']) {
      expect(kinds(copy)).toContain('discrimination');
    }
  });

  it('refuses immigration status as a condition', () => {
    expect(kinds('No PR, work permit holders only')).toContain('discrimination');
  });

  it('quotes the words back rather than saying "inappropriate content"', () => {
    const message = firstIssueMessage('Quiet unit. No Indians.');
    expect(message).toContain('No Indians');
    expect(message).toContain('nationality');
  });
});

describe('what the neighbourhood is like, which is allowed', () => {
  it('leaves a description of the area alone', () => {
    for (const copy of [
      'Indian and Malay food at the hawker centre downstairs.',
      'Five minutes from Little India MRT.',
      'The Chinese temple across the road is quiet in the evenings.',
      'Popular with expat families in the block, close to the international school.',
      'Local coffee shop on the ground floor.',
    ]) {
      expect(textIsAllowed(copy)).toBe(true);
    }
  });

  it('leaves ordinary listing copy alone', () => {
    const copy = 'High floor, two bedrooms, north facing so no afternoon sun. Newly painted, '
      + 'air conditioning serviced in June. Walking distance to the MRT and the wet market. '
      + 'Available from 1 November, minimum one year lease. Non-smokers, no pets please.';
    expect(reviewText(copy)).toEqual([]);
  });

  /* Gender is lawful to state for a room rental here and stating it is normal
     practice, so the rule must not reach for it. */
  it('leaves a gender preference alone', () => {
    expect(textIsAllowed('Common room, female tenant preferred.')).toBe(true);
  });
});

describe('copy that reads as a personal advertisement', () => {
  it('is refused', () => {
    expect(kinds('Sexy studio, no strings, message me')).toContain('suggestive');
    expect(kinds('Looking for companionship in exchange for rent')).toContain('suggestive');
  });

  it('does not catch a cosy flat', () => {
    expect(textIsAllowed('Cosy one-bedroom with a balcony.')).toBe(true);
  });
});

describe('contact details pasted into the description', () => {
  it('catches a telephone number however it is written', () => {
    for (const copy of ['Call me at 91234567', 'whatsapp +65 9123 4567', 'hp: 8123-4567']) {
      expect(kinds(copy)).toContain('contact');
    }
  });

  it('catches an email address, a handle and a link', () => {
    expect(kinds('email agent@example.sg')).toContain('contact');
    expect(kinds('Telegram: @agentname')).toContain('contact');
    expect(kinds('See https://example.sg/unit')).toContain('contact');
  });

  it('does not read a price or a size as a telephone number', () => {
    expect(textIsAllowed('Asking 4,500 a month for 1,238 sqft, built 2019.')).toBe(true);
  });
});

describe('how the issues come back', () => {
  it('reports each distinct phrase once', () => {
    const issues = reviewText('No Indians. Really, no Indians.');
    expect(issues).toHaveLength(1);
  });

  it('puts discrimination before the tidying-up', () => {
    const issues = reviewText('Call 91234567. Chinese only.');
    expect(issues[0].kind).toBe('discrimination');
  });

  it('passes an empty description, which is a different complaint', () => {
    expect(reviewText('')).toEqual([]);
    expect(firstIssueMessage('   ')).toBeNull();
  });
});
