/**
 * How far down its sheet the report fills.
 *
 * Where the pages break is covered beside the insights it belongs to
 * (`property-insight.test.ts`). This is about the rule that decides how a page
 * looks rather than where it breaks: what a sheet has left over is given to
 * the gaps between its blocks, and only so far.
 *
 * Both halves matter, and both are invisible when they work. A page that stops
 * a sixth of the way up from the foot reads as cut short; a gap stretched to
 * fill one reads as a section that went missing.
 */

import { describe, expect, it } from 'vitest';
import { MAX_LEAD_RATIO, packPages, type FlowItem } from '../lib/phase1/paginate';

const cap = { portrait: 1000, landscape: 600 };
const gap = 20;
const block = (height: number, extra: Partial<FlowItem> = {}): FlowItem => ({ height, orientation: 'portrait', ...extra });

/** Where the content ends once the gaps have taken their share. */
const filled = (p: { used: number; lead: number; items: number[] }) => p.used + p.lead * (p.items.length - 1);

describe('taking up what is left of a sheet', () => {
  it('reaches the foot of the page when the gaps can hold the difference', () => {
    /* Three gaps between four blocks, 139 to share: inside the limit, so all
       of it is taken up and the page ends at the foot. */
    const [page] = packPages([200, 200, 200, 200].map((h) => block(h)), cap, gap);
    expect(page.items).toHaveLength(4);
    expect(cap.portrait - filled(page)).toBeLessThanOrEqual(2);
  });

  it('leaves a sheet holding one block alone, having nowhere to put the space', () => {
    const [page] = packPages([block(400)], cap, gap);
    expect(page.lead).toBe(0);
  });

  it('stops stretching rather than pulling two sections apart', () => {
    /* One gap, asked to hold nearly the whole page. It holds its limit. */
    const [page] = packPages([block(100), block(100)], cap, gap);
    expect(page.lead).toBe(gap * MAX_LEAD_RATIO);
    /* And the sheet is allowed to end short, which is the point of the limit. */
    expect(cap.portrait - filled(page)).toBeGreaterThan(400);
  });

  it('never takes space away from a gap', () => {
    /* A sheet filled to the brim has nothing to give, and must not borrow. */
    const [page] = packPages([block(500), block(480)], cap, gap);
    expect(page.lead).toBe(0);
    expect(page.used).toBe(1000);
  });

  /* Filling to the last fraction of a pixel and rounding the wrong way is how
     a full page comes to be reported as one that overflows. */
  it('keeps a whisker in hand, so a full sheet is not called an overflowing one', () => {
    for (const heights of [[300, 300, 300], [180, 180, 180, 180], [400, 400]]) {
      for (const page of packPages(heights.map((h) => block(h)), cap, gap)) {
        expect(filled(page)).toBeLessThan(cap.portrait);
      }
    }
  });

  it('measures a landscape sheet against the landscape page', () => {
    const wide = (height: number): FlowItem => ({ height, orientation: 'landscape' });
    const [page] = packPages([wide(200), wide(200)], cap, gap);
    expect(filled(page)).toBeLessThan(cap.landscape);
  });

  /* A block that composes itself to the sheet is handed exactly the sheet's
     height, and the report's toolbar must not then tell the agent the page is
     too long for its paper. Exactly full is full. */
  it('does not call a sheet filled to the brim an overflowing one', () => {
    const [page] = packPages([block(cap.portrait)], cap, gap);
    expect(page.overflow).toBe(false);
    expect(page.used).toBe(cap.portrait);
    expect(packPages([block(cap.portrait + 1)], cap, gap)[0].overflow).toBe(true);
  });

  it('keeps anything else off a sheet a single block has filled', () => {
    const pages = packPages([block(cap.portrait), block(40)], cap, gap);
    expect(pages.map((p) => p.items)).toEqual([[0], [1]]);
  });

  it('gives a block taller than its sheet no space and reports the overflow', () => {
    const pages = packPages([block(100), block(1400)], cap, gap);
    expect(pages.map((p) => p.overflow)).toEqual([false, true]);
    expect(pages[1].lead).toBe(0);
  });

  /* A heading and the block it belongs to are two blocks sharing one gap, and
     that gap is a separation of a different kind: stretching it would part the
     heading from what it heads. It is still capped, which is what stops that. */
  it('holds the stretch to its limit however much is left', () => {
    const [page] = packPages([block(40, { keepWithNext: true }), block(60)], cap, gap);
    expect(page.items).toEqual([0, 1]);
    expect(page.lead).toBe(gap * MAX_LEAD_RATIO);
  });
});
