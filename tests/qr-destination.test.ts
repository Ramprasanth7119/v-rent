/**
 * What a QR code encodes.
 *
 * With Demo Data OFF it must open a page this application serves, on the
 * address it runs from. With it ON it must never point at a real listing or a
 * real account. A bad address must be refused, never quietly replaced.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SEED_LISTINGS } from '../lib/phase1/data';
import { DEMO_BASE, destinationFor, displayAddress, fileName, parseAddress } from '../components/phase1/qr/destination';

const listing = SEED_LISTINGS[0];
const base = { origin: 'https://app.test', ownerId: 'acct-123', listing, custom: '' };

describe('Demo Data OFF', () => {
  it('opens the listing page this app serves, on this origin', () => {
    const d = destinationFor({ ...base, target: 'listing', demo: false });
    expect(d).toEqual({ ok: true, sample: false, url: `https://app.test/phase1/homes/acct-123/${listing.id}` });
  });

  it('opens the agent page this app serves', () => {
    const d = destinationFor({ ...base, target: 'profile', demo: false });
    expect(d).toEqual({ ok: true, sample: false, url: 'https://app.test/phase1/homes/agent/acct-123' });
  });

  it('is unavailable, not guessed, before the origin or account is known', () => {
    expect(destinationFor({ ...base, origin: '', target: 'listing', demo: false })).toEqual({ ok: false, reason: 'unavailable' });
    expect(destinationFor({ ...base, ownerId: undefined, target: 'profile', demo: false })).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('asks for a listing when there is none', () => {
    expect(destinationFor({ ...base, listing: null, target: 'listing', demo: false })).toEqual({ ok: false, reason: 'no-listing' });
  });
});

describe('Demo Data ON', () => {
  it('never encodes the real origin or the real account', () => {
    for (const target of ['listing', 'profile'] as const) {
      const d = destinationFor({ ...base, target, demo: true });
      expect(d.ok).toBe(true);
      if (!d.ok) continue;
      expect(d.sample).toBe(true);
      expect(d.url.startsWith(DEMO_BASE)).toBe(true);
      expect(d.url).not.toContain('acct-123');
      expect(d.url).not.toContain('app.test');
    }
    expect(new URL(DEMO_BASE).hostname).toBe('example.com');
  });
});

describe('another address', () => {
  it('accepts web addresses, adding https when it is left off', () => {
    expect(parseAddress('example.com/floor-plan')).toBe('https://example.com/floor-plan');
    expect(parseAddress('  http://example.org  ')).toBe('http://example.org/');
  });

  it('refuses anything a phone should not open', () => {
    for (const bad of ['javascript:alert(1)', 'mailto:a@b.c', 'not a url', 'intranet', 'ftp://example.com']) {
      expect(parseAddress(bad)).toBeNull();
    }
  });

  it('distinguishes an empty field from a wrong one, and never substitutes a default', () => {
    expect(destinationFor({ ...base, target: 'custom', demo: false, custom: '' })).toEqual({ ok: false, reason: 'no-address' });
    expect(destinationFor({ ...base, target: 'custom', demo: false, custom: 'nope' })).toEqual({ ok: false, reason: 'invalid-address' });
  });
});

describe('presentation', () => {
  it('shortens long addresses in the middle and drops the scheme', () => {
    const shown = displayAddress(`https://app.test/phase1/homes/${'x'.repeat(60)}/end`, 30);
    expect(shown.length).toBeLessThanOrEqual(30);
    expect(shown.startsWith('app.test/')).toBe(true);
    expect(shown.endsWith('/end')).toBe(true);
  });

  it('names files after what they open', () => {
    expect(fileName('The Sail @ Marina Bay #34-12', '1024', 'png')).toBe('v-rent-qr-the-sail-marina-bay-34-12-1024px.png');
    expect(fileName('', '512', 'svg')).toBe('v-rent-qr-code.svg');
  });

  it('the page has no hardcoded production domain and no page-level demo switch', () => {
    const src = readFileSync(path.join(__dirname, '../app/phase1/qr/page.tsx'), 'utf8');
    expect(src).not.toMatch(/vrent\.sg/);
    expect(src).not.toMatch(/useDemoDataOn|demoWorkspace/);
  });
});
