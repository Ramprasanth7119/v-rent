/**
 * The enquiry inbox: how a record is read into a stage, how the list is
 * filtered, and the demo set behind the Demo Data switch.
 *
 * The demo set must never be mistaken for real records: every id carries the
 * demo prefix, it is generated without touching a server, the listings it
 * points at are never changed, and the workspace refuses to store it.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SEED_LISTINGS, type DemoListing } from '../lib/phase1/data';
import {
  DEFAULT_QUERY, contactLinks, filterEnquiries, fitChecks, isMaskedPhone, isSeededSample, needsAction, readStage,
} from '../lib/phase1/enquiries';
import {
  DEMO_ENQUIRY_COUNT, DEMO_ID_PREFIX, demoDataProvider, originalDataProvider, providerFor,
} from '../lib/phase1/report-data';
import { sanitisePatch, type Enquiry } from '../lib/phase1/workspace';

const NOW = new Date('2026-09-16T10:00:00+08:00');
const H = 3_600_000;
const D = 24 * H;
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

const enquiry = (over: Partial<Enquiry> = {}): Enquiry => ({
  id: 'enq-1',
  listingId: 'lst-1',
  name: 'Tenant',
  contact: '+65 9123 4567',
  message: 'Is it available?',
  at: ago(H),
  channel: 'V-RENT',
  status: 'new',
  ...over,
});

const live = (l: DemoListing): DemoListing => ({ ...l, status: 'published', dealType: 'rent' });
const LISTINGS = SEED_LISTINGS.filter((l) => l.dealType !== 'sale').slice(0, 4).map(live);

describe('reading an enquiry', () => {
  it('asks for a reply, and flags one that has waited too long', () => {
    expect(readStage(enquiry(), NOW).stage).toBe('new');
    expect(readStage(enquiry({ at: ago(6 * H) }), NOW).stage).toBe('overdue');
  });

  it('reads the zone-less stamp the enquiry route writes as UTC', () => {
    const utc = new Date(NOW.getTime() - 30 * 60_000).toISOString().slice(0, 16).replace('T', ' ');
    expect(readStage(enquiry({ at: utc }), NOW).stage).toBe('new');
  });

  it('turns a quiet reply into a follow-up', () => {
    expect(readStage(enquiry({ status: 'replied', lastActionAt: ago(H) }), NOW).stage).toBe('contacted');
    expect(readStage(enquiry({ status: 'replied', lastActionAt: ago(3 * D) }), NOW).stage).toBe('follow_up');
  });

  it('tells a requested, a booked and a held viewing apart', () => {
    expect(readStage(enquiry({ status: 'viewing' }), NOW).stage).toBe('viewing_requested');
    expect(readStage(enquiry({ status: 'viewing', viewingAt: new Date(NOW.getTime() + D).toISOString() }), NOW).stage).toBe('viewing_scheduled');
    expect(readStage(enquiry({ status: 'viewing', viewingAt: ago(D) }), NOW).stage).toBe('viewed');
  });

  it('has nothing left to do once closed', () => {
    const let_ = readStage(enquiry({ status: 'closed', outcome: 'let' }), NOW);
    expect(let_.label).toBe('Let');
    expect(needsAction(let_)).toBe(false);
    expect(readStage(enquiry({ status: 'closed', outcome: 'lost' }), NOW).label).toBe('Unsuccessful');
  });
});

describe('filtering the inbox', () => {
  const byId = new Map(LISTINGS.map((l) => [l.id, l]));
  const rows = [
    enquiry({ id: 'a', status: 'closed', at: ago(D), listingId: LISTINGS[0].id, name: 'Closed Person' }),
    enquiry({ id: 'b', status: 'new', at: ago(2 * H), listingId: LISTINGS[1].id, name: 'Waiting Person' }),
    enquiry({ id: 'c', status: 'replied', at: ago(5 * D), lastActionAt: ago(4 * D), listingId: LISTINGS[0].id, name: 'Quiet Person' }),
  ];

  it('puts what needs the agent first', () => {
    expect(filterEnquiries(rows, DEFAULT_QUERY, byId, NOW).map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('filters by status, action, property and words', () => {
    expect(filterEnquiries(rows, { ...DEFAULT_QUERY, status: 'action' }, byId, NOW).map((e) => e.id)).toEqual(['b', 'c']);
    expect(filterEnquiries(rows, { ...DEFAULT_QUERY, status: 'closed' }, byId, NOW).map((e) => e.id)).toEqual(['a']);
    expect(filterEnquiries(rows, { ...DEFAULT_QUERY, listingId: LISTINGS[0].id }, byId, NOW)).toHaveLength(2);
    expect(filterEnquiries(rows, { ...DEFAULT_QUERY, text: 'quiet' }, byId, NOW).map((e) => e.id)).toEqual(['c']);
    expect(filterEnquiries(rows, { ...DEFAULT_QUERY, text: LISTINGS[1].project.split(' ')[0] }, byId, NOW).map((e) => e.id)).toContain('b');
  });

  it('never calls a missing budget a match', () => {
    expect(fitChecks(enquiry({ budget: undefined }), LISTINGS[0])[0].tone).toBe('neutral');
    expect(fitChecks(enquiry({ budget: LISTINGS[0].monthlyRent }), LISTINGS[0])[0].tone).toBe('success');
  });

  it('builds contact links only from a usable contact', () => {
    expect(contactLinks('+65 9123 4567')).toEqual({ call: 'tel:+6591234567', whatsapp: 'https://wa.me/6591234567' });
    expect(contactLinks('someone@example.com')).toEqual({ email: 'mailto:someone@example.com' });
    expect(contactLinks('+65 9••• 4567')).toEqual({});
  });
});

describe('the demo enquiries', () => {
  const own = { listings: LISTINGS, enquiries: [enquiry({ id: 'real-1', listingId: LISTINGS[0].id })] };

  it('are what the switch shows when ON; OFF shows the agent\'s own records', () => {
    expect(providerFor(false).enquiries(own, NOW).enquiries).toEqual(own.enquiries);
    const demo = providerFor(true).enquiries(own, NOW).enquiries;
    expect(demo).toHaveLength(DEMO_ENQUIRY_COUNT);
    expect(demo.some((e) => e.id === 'real-1')).toBe(false);
  });

  it('carry the demo prefix, point at the agent\'s live listings, and leave them unchanged', () => {
    const before = structuredClone(LISTINGS);
    const { enquiries } = demoDataProvider.enquiries(own, NOW);
    const ids = new Set(LISTINGS.map((l) => l.id));
    expect(enquiries.every((e) => e.id.startsWith(DEMO_ID_PREFIX))).toBe(true);
    expect(enquiries.every((e) => ids.has(e.listingId))).toBe(true);
    expect(LISTINGS).toEqual(before);
  });

  it('cover every stage an enquiry goes through', () => {
    const stages = new Set(demoDataProvider.enquiries(own, NOW).enquiries.map((e) => readStage(e, NOW).stage));
    for (const s of ['new', 'overdue', 'contacted', 'follow_up', 'viewing_requested', 'viewing_scheduled', 'viewed', 'let', 'lost']) {
      expect(stages, s).toContain(s);
    }
  });

  it('use no placeholder names and no reachable contact details', () => {
    for (const e of demoDataProvider.enquiries(own, NOW).enquiries) {
      expect(e.name).not.toMatch(/john doe|jane doe|test|lorem/i);
      expect(e.message).not.toMatch(/lorem ipsum/i);
      expect(e.contact).toContain('•');
      expect(contactLinks(e.contact)).toEqual({});
    }
  });

  it('fall back to the sample listings when the agent has nothing live to rent', () => {
    const set = demoDataProvider.enquiries({ listings: [], enquiries: [] }, NOW);
    expect(set.enquiries).toHaveLength(DEMO_ENQUIRY_COUNT);
    const ids = new Set(set.listings.map((l) => l.id));
    expect(set.enquiries.every((e) => ids.has(e.listingId))).toBe(true);
  });

  it('are refused by the workspace, so they can never be stored', () => {
    const demo = demoDataProvider.enquiries(own, NOW).enquiries;
    const patch = sanitisePatch({ enquiries: [...demo, own.enquiries[0]] });
    expect(patch.enquiries?.map((e) => e.id)).toEqual(['real-1']);
  });

  it('have no route to persistence', () => {
    const source = readFileSync(join(__dirname, '../lib/phase1/report-data/demo-enquiries.ts'), 'utf8');
    expect(source).not.toMatch(/\bfetch\(|store\/driver|workspace-store|localStorage|sessionStorage|\/api\//);
    expect(originalDataProvider.enquiries(own, NOW).listings).toBe(LISTINGS);
  });
});

describe('the WhatsApp handover', () => {
  const own = { listings: LISTINGS, enquiries: [] as Enquiry[] };
  const page = readFileSync(join(__dirname, '../app/phase1/whatsapp/page.tsx'), 'utf8');

  it('recognises a masked demo mobile, and nothing else, as a masked phone', () => {
    expect(isMaskedPhone('+65 9••• 8842')).toBe(true);
    expect(isMaskedPhone('+65 9123 4567')).toBe(false);
    expect(isMaskedPhone('sarah.c•••@gmail.com')).toBe(false);
    expect(isMaskedPhone('')).toBe(false);
  });

  it('has demo enquiries to hand over, none of them reachable', () => {
    const demo = demoDataProvider.enquiries(own, NOW).enquiries.filter((e) => e.status !== 'closed' && isMaskedPhone(e.contact));
    expect(demo.length).toBeGreaterThan(3);
    for (const e of demo) {
      expect(e.id.startsWith(DEMO_ID_PREFIX)).toBe(true);
      // Fewer than eight digits: no number WhatsApp could open.
      expect(e.contact.replace(/\D/g, '').length).toBeLessThan(8);
      expect(contactLinks(e.contact)).toEqual({});
    }
  });

  it('builds a wa.me link only when Demo Data is off, and never calls a server itself', () => {
    expect(page).toMatch(/const waLink = selected && !demo && !seeded \?/);
    expect(isSeededSample('enq-demo-1')).toBe(true);
    expect(isSeededSample('enq_8f2a')).toBe(false);
    expect(page).toMatch(/demo \? isDemoId\(e\.id\) && isMaskedPhone\(e\.contact\)/);
    expect(page).not.toMatch(/fetch\(|\/api\//);
  });
});
