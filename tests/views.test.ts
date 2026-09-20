/**
 * Who viewed a listing, and what a name costs.
 *
 * This is both a sales record and a billing record, so the tests are about the
 * two things that would make it worthless: a count somebody can inflate, and a
 * charge that does not match what the button promised.
 */

import { describe, expect, it } from 'vitest';
import {
  FREE_REVEALS_PER_LISTING, REVISIT_AFTER_MS, maskedViewer, priceLabel, recordView,
  refuseReveal, revealPriceCents, unrevealedCount, viewCount, viewCounts, viewersOf,
  viewsSentence, type ListingView, type Reveal,
} from '../lib/phase1/views';

const AT = '2026-09-20T10:00:00.000Z';
const later = (ms: number) => new Date(new Date(AT).getTime() + ms).toISOString();

const view = (over: Partial<ListingView> = {}): ListingView =>
  ({ listingId: 'lst-1', viewerId: 'a', first: AT, last: AT, count: 1, ...over });

describe('counting a view', () => {
  it('records an agent who has not looked before', () => {
    const { views, isNewViewer } = recordView([], { listingId: 'lst-1', viewerId: 'a', ownerId: 'me', at: AT });
    expect(isNewViewer).toBe(true);
    expect(views).toHaveLength(1);
    expect(views[0].count).toBe(1);
  });

  /* The whole feature is worthless if an agent can refresh their own listing
     to a hundred views. */
  it('never counts the owner looking at their own listing', () => {
    const { views, isNewViewer } = recordView([], { listingId: 'lst-1', viewerId: 'me', ownerId: 'me', at: AT });
    expect(views).toEqual([]);
    expect(isNewViewer).toBe(false);
  });

  it('treats a refresh as the same look', () => {
    const { views, counted } = recordView([view()], {
      listingId: 'lst-1', viewerId: 'a', ownerId: 'me', at: later(60_000),
    });
    expect(counted).toBe(false);
    expect(views[0].count).toBe(1);
    /* The time is still moved on, so "last seen" stays true. */
    expect(views[0].last).toBe(later(60_000));
  });

  it('counts a genuine return the next day', () => {
    const { views, counted, isNewViewer } = recordView([view()], {
      listingId: 'lst-1', viewerId: 'a', ownerId: 'me', at: later(REVISIT_AFTER_MS + 1),
    });
    expect(counted).toBe(true);
    expect(views[0].count).toBe(2);
    /* Still not new — a second notification about the same agent is noise. */
    expect(isNewViewer).toBe(false);
    expect(views[0].first).toBe(AT);
  });

  it('keeps one agent’s interest in two listings apart', () => {
    let views: ListingView[] = [];
    ({ views } = recordView(views, { listingId: 'lst-1', viewerId: 'a', ownerId: 'me', at: AT }));
    ({ views } = recordView(views, { listingId: 'lst-2', viewerId: 'a', ownerId: 'me', at: AT }));
    expect(views).toHaveLength(2);
    expect(viewCount(views, 'lst-1')).toBe(1);
  });
});

describe('reading the counts', () => {
  const views = [view({ viewerId: 'a' }), view({ viewerId: 'b', last: later(1000) }), view({ listingId: 'lst-2', viewerId: 'c' })];

  it('counts agents, not visits', () => {
    expect(viewCount([view({ count: 9 })], 'lst-1')).toBe(1);
  });

  it('gives every listing’s count in one pass', () => {
    expect(viewCounts(views)).toEqual({ 'lst-1': 2, 'lst-2': 1 });
  });

  it('puts the most recent viewer first', () => {
    expect(viewersOf(views, 'lst-1').map((v) => v.viewerId)).toEqual(['b', 'a']);
  });

  it('reads as a sentence', () => {
    expect(viewsSentence(0)).toBe('No agents yet');
    expect(viewsSentence(1)).toBe('1 agent');
    expect(viewsSentence(4)).toBe('4 agents');
  });
});

describe('what a name costs', () => {
  it('gives the first one on each listing away', () => {
    expect(FREE_REVEALS_PER_LISTING).toBe(1);
    expect(revealPriceCents([], 'lst-1')).toBe(0);
  });

  it('charges a dollar once the included one is used', () => {
    const used: Reveal[] = [{ listingId: 'lst-1', viewerId: 'a', at: AT, costCents: 0 }];
    expect(revealPriceCents(used, 'lst-1')).toBe(100);
  });

  /* The allowance is per listing, so a second listing is free again. */
  it('does not spend one listing’s allowance on another', () => {
    const used: Reveal[] = [{ listingId: 'lst-1', viewerId: 'a', at: AT, costCents: 0 }];
    expect(revealPriceCents(used, 'lst-2')).toBe(0);
  });

  it('is written the way the button says it', () => {
    expect(priceLabel(0)).toBe('Free');
    expect(priceLabel(100)).toBe('S$1');
    expect(priceLabel(250)).toBe('S$2.50');
  });
});

describe('refusing a reveal', () => {
  const views = [view({ viewerId: 'a' })];

  it('allows the included one with no balance at all', () => {
    expect(refuseReveal({ views, reveals: [], credits: 0, listingId: 'lst-1', viewerId: 'a' })).toBeNull();
  });

  it('refuses an agent who never looked', () => {
    const r = refuseReveal({ views, reveals: [], credits: 500, listingId: 'lst-1', viewerId: 'stranger' });
    expect(r?.code).toBe('not_a_viewer');
  });

  /* Two taps on the same button must not be charged twice. */
  it('refuses a name already bought', () => {
    const reveals: Reveal[] = [{ listingId: 'lst-1', viewerId: 'a', at: AT, costCents: 0 }];
    const r = refuseReveal({ views, reveals, credits: 500, listingId: 'lst-1', viewerId: 'a' });
    expect(r?.code).toBe('already_revealed');
  });

  it('says the price and the balance when there is not enough', () => {
    const views2 = [view({ viewerId: 'a' }), view({ viewerId: 'b' })];
    const reveals: Reveal[] = [{ listingId: 'lst-1', viewerId: 'a', at: AT, costCents: 0 }];
    const r = refuseReveal({ views: views2, reveals, credits: 40, listingId: 'lst-1', viewerId: 'b' });
    expect(r?.code).toBe('no_credit');
    expect(r?.error).toContain('S$1');
    expect(r?.error).toContain('S$0.40');
  });

  it('counts what is left to buy', () => {
    const views2 = [view({ viewerId: 'a' }), view({ viewerId: 'b' })];
    const reveals: Reveal[] = [{ listingId: 'lst-1', viewerId: 'a', at: AT, costCents: 0 }];
    expect(unrevealedCount(views2, reveals, 'lst-1')).toBe(1);
  });
});

describe('what is shown before paying', () => {
  /* The firm, never the person — it is what makes the reveal worth buying and
     it identifies nobody. */
  it('names the agency and no one else', () => {
    expect(maskedViewer('PropNex Realty')).toBe('An agent from PropNex Realty');
    expect(maskedViewer('')).toBe('An agent on V-RENT');
  });
});
