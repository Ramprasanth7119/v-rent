/**
 * The Ethnic Integration Policy field.
 *
 * The whole point of this field is that it produces a lawful sentence where an
 * agent would otherwise have typed an unlawful one, so the tests are mostly
 * about the wording. It has to read as an opening, it has to be attributed to
 * HDB, and it must never come out as an exclusion — because if it does, the
 * field has simply moved the problem rather than solved it.
 */

import { describe, expect, it } from 'vitest';
import {
  cleanEligibility, eligibilityShort, eligibilitySentence, hasEligibility, type EipEligibility,
} from '../lib/phase1/eip';

const e = (over: Partial<EipEligibility> = {}): EipEligibility =>
  ({ ethnic: [], citizenship: [], ...over });

describe('whether anything was set', () => {
  it('treats nothing chosen as unanswered, not as a restriction', () => {
    expect(hasEligibility(e())).toBe(false);
    expect(hasEligibility(undefined)).toBe(false);
    expect(eligibilitySentence(e())).toBeNull();
  });
});

describe('the sentence a tenant reads', () => {
  it('names who the flat is open to, and says whose rule it is', () => {
    const s = eligibilitySentence(e({ ethnic: ['malay'] }))!;
    expect(s).toContain('Ethnic Integration Policy');
    expect(s).toContain('open to Malay households');
  });

  /* The requirement in one test: choosing Malay must produce "open to Malay",
     never anything about who is excluded. */
  it('never phrases the restriction as an exclusion', () => {
    const s = eligibilitySentence(e({ ethnic: ['malay'] }))!.toLowerCase();
    for (const word of ['not allowed', 'no indian', 'no chinese', 'excluded', 'cannot', 'only for']) {
      expect(s).not.toContain(word);
    }
  });

  it('lists two groups readably', () => {
    expect(eligibilitySentence(e({ ethnic: ['chinese', 'malay'] }))).toContain('Chinese and Malay households');
  });

  it('uses HDB\'s own category name for the third group', () => {
    expect(eligibilitySentence(e({ ethnic: ['indian_other'] }))).toContain('Indian and Other Ethnic Groups');
  });

  it('says the quota is open when every group is ticked, rather than listing all three', () => {
    const s = eligibilitySentence(e({ ethnic: ['chinese', 'malay', 'indian_other'] }))!;
    expect(s).toContain('open to all groups');
    expect(s).not.toContain('Ethnic Integration Policy');
  });

  it('adds the citizenship condition only when it narrows something', () => {
    expect(eligibilitySentence(e({ ethnic: ['malay'], citizenship: ['spr_non_malaysian'] }))).toContain('Non-Malaysian SPR');
    /* Both ticked is no restriction, so it is not stated. */
    expect(eligibilitySentence(e({ ethnic: ['malay'], citizenship: ['sc_spr_malaysian', 'spr_non_malaysian'] })))
      .not.toContain('SPR applicants');
  });
});

describe('the short form', () => {
  it('reads as an opening too', () => {
    expect(eligibilityShort(e({ ethnic: ['malay'] }))).toBe('Open to Malay');
    expect(eligibilityShort(e({ ethnic: ['chinese', 'malay', 'indian_other'] }))).toBe('Quota open');
    expect(eligibilityShort(e())).toBeNull();
  });
});

describe('what arrives from a browser', () => {
  it('keeps only the groups the policy has', () => {
    expect(cleanEligibility({ ethnic: ['malay', 'martian'], citizenship: [] })).toEqual({ ethnic: ['malay'], citizenship: [] });
  });

  it('comes back undefined when there is nothing usable in it', () => {
    expect(cleanEligibility({ ethnic: ['nonsense'] })).toBeUndefined();
    expect(cleanEligibility('malay only')).toBeUndefined();
    expect(cleanEligibility(null)).toBeUndefined();
  });
});
