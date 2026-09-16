/**
 * Where a QR code points.
 *
 * With Demo Data OFF a code opens a page this application really serves, on
 * the address it is being run from — the public home page for one listing, or
 * the agent's public profile. No production domain is written in here, so a
 * code made on a staging server opens staging.
 *
 * With Demo Data ON the listings on screen belong to the demo account and do
 * not exist on the server, and the profile page would be the signed-in agent's
 * real one. So a demo code encodes a sample address on `example.com` — a
 * domain reserved for documentation, which can never reach a real person or a
 * real account.
 */

import type { DemoListing } from '../../../lib/phase1/data';

export type Target = 'listing' | 'profile' | 'custom';

export const DEMO_BASE = 'https://example.com/v-rent-demo';

export type Destination =
  | { ok: true; url: string; sample: boolean }
  | { ok: false; reason: 'no-listing' | 'no-address' | 'invalid-address' | 'unavailable' };

/** A web address someone typed, if it is one a phone can open. */
export function parseAddress(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function destinationFor(opts: {
  target: Target;
  demo: boolean;
  /** The address this app is served from, e.g. `https://app.example.sg`. Empty until the browser knows it. */
  origin: string;
  ownerId?: string;
  listing: DemoListing | null;
  custom: string;
}): Destination {
  const { target, demo, origin, ownerId, listing, custom } = opts;

  if (target === 'custom') {
    if (!custom.trim()) return { ok: false, reason: 'no-address' };
    const url = parseAddress(custom);
    return url ? { ok: true, url, sample: false } : { ok: false, reason: 'invalid-address' };
  }

  if (target === 'listing') {
    if (!listing) return { ok: false, reason: 'no-listing' };
    if (demo) return { ok: true, url: `${DEMO_BASE}/homes/${encodeURIComponent(listing.reference.toLowerCase())}`, sample: true };
    if (!origin || !ownerId) return { ok: false, reason: 'unavailable' };
    return { ok: true, url: `${origin}/phase1/homes/${encodeURIComponent(ownerId)}/${encodeURIComponent(listing.id)}`, sample: false };
  }

  if (demo) return { ok: true, url: `${DEMO_BASE}/agent/sample`, sample: true };
  if (!origin || !ownerId) return { ok: false, reason: 'unavailable' };
  return { ok: true, url: `${origin}/phase1/homes/agent/${encodeURIComponent(ownerId)}`, sample: false };
}

/** The address as a person reads it: no scheme, and the middle shortened when it is long. */
export function displayAddress(url: string, max = 46): string {
  const bare = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (bare.length <= max) return bare;
  const keep = max - 1;
  return `${bare.slice(0, Math.ceil(keep * 0.6))}…${bare.slice(bare.length - Math.floor(keep * 0.4))}`;
}

/** A file name that says what the code is for. */
export function fileName(label: string, size: string, ext: 'png' | 'svg'): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'code';
  return `v-rent-qr-${slug}${ext === 'png' ? `-${size}px` : ''}.${ext}`;
}
