/**
 * Floor plans, of which there can now be several.
 *
 * The part worth testing is not that a list holds more than one thing. It is
 * the migration: workspaces written before this carry a single `floorPlan`, the
 * file it names is still in the store, and a sanitiser that simply stopped
 * reading the old field would detach every one of them — quietly, and with no
 * way back from the listing.
 */

import { describe, expect, it } from 'vitest';
import {
  FLOORPLAN_TYPES, MAX_FLOOR_PLANS, MAX_FLOORPLAN_BYTES, floorPlanHref, floorPlanProblem, floorPlanSize,
} from '../lib/phase1/floorplan';
import { sanitisePatch } from '../lib/phase1/workspace';

const file = (type: string, size: number) => ({ type, size });

/** The one listing out of a sanitised patch. */
function listingFrom(listing: Record<string, unknown>) {
  const patch = sanitisePatch({ listings: [{ id: 'lst-1', project: 'Sample Court', ...listing }] });
  return patch.listings![0] as unknown as Record<string, unknown>;
}

describe('what may be uploaded', () => {
  it('takes the four kinds a plan arrives as', () => {
    for (const type of Object.keys(FLOORPLAN_TYPES)) {
      expect(floorPlanProblem(file(type, 500 * 1024)), type).toBeNull();
    }
  });

  it('refuses anything else, an empty file, and one over the limit', () => {
    expect(floorPlanProblem(file('image/gif', 1000))).toMatch(/PDF, JPEG, PNG or WebP/);
    expect(floorPlanProblem(file('application/pdf', 0))).toMatch(/empty/);
    expect(floorPlanProblem(file('application/pdf', MAX_FLOORPLAN_BYTES + 1))).toMatch(/The limit is 4 MB/);
  });

  it('says the size in the units the agent sees on their own file', () => {
    expect(floorPlanSize(900)).toBe('1 KB');
    expect(floorPlanSize(300 * 1024)).toBe('300 KB');
    expect(floorPlanSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});

describe('the address a plan is served from', () => {
  /* Three things identify one: whose it is, which listing, and which plan. The
     timestamp is only there so a replaced plan is not served from the cache. */
  it('names the owner, the listing and the plan', () => {
    const href = floorPlanHref('acc-1', 'lst-9', { id: 'abc123', filename: 'a.pdf', contentType: 'application/pdf', bytes: 10, at: '2026-09-01T00:00:00.000Z' });
    expect(href).toContain('owner=acc-1');
    expect(href).toContain('listing=lst-9');
    expect(href).toContain('plan=abc123');
  });

  it('escapes what it is given rather than pasting it in', () => {
    const href = floorPlanHref('acc/1', 'lst 9', { id: 'a&b', filename: 'a.pdf', contentType: 'application/pdf', bytes: 10, at: 'x' });
    expect(href).toContain('owner=acc%2F1');
    expect(href).toContain('listing=lst%209');
    expect(href).toContain('plan=a%26b');
  });
});

describe('a listing carrying its plans through a patch', () => {
  const note = (id: string) => ({ id, filename: `${id}.pdf`, contentType: 'application/pdf', bytes: 1234, at: '2026-09-01T00:00:00.000Z' });

  it('keeps every plan the upload route recorded', () => {
    const l = listingFrom({ floorPlans: [note('one'), note('two'), note('three')] });
    expect((l.floorPlans as unknown[]).length).toBe(3);
    expect(l.hasFloorPlan).toBe(true);
  });

  /* The migration. A workspace written before plans became a list has the
     single field, and the file it names is still in the store. */
  it('reads the single plan an older workspace still has', () => {
    const l = listingFrom({ floorPlan: { filename: 'old.pdf', contentType: 'application/pdf', bytes: 99, at: '2026-08-01T00:00:00.000Z' } });
    const plans = l.floorPlans as { id: string; filename: string }[];
    expect(plans.length).toBe(1);
    expect(plans[0].filename).toBe('old.pdf');
    // It had no id of its own; it still needs one to be addressable.
    expect(plans[0].id).toBeTruthy();
    expect(l.hasFloorPlan).toBe(true);
  });

  it('says nothing is attached when nothing is', () => {
    const l = listingFrom({});
    expect(l.floorPlans).toBeUndefined();
    expect(l.hasFloorPlan).toBeUndefined();
  });

  it('does not let a browser send an unbounded pile of them', () => {
    const many = Array.from({ length: 40 }, (_, i) => note(`p${i}`));
    const l = listingFrom({ floorPlans: many });
    expect((l.floorPlans as unknown[]).length).toBeLessThanOrEqual(12);
  });

  it('caps what may actually be uploaded well below that', () => {
    expect(MAX_FLOOR_PLANS).toBe(6);
  });
});
