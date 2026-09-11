import { NextResponse, type NextRequest } from 'next/server';

/**
 * Routing for the V-RENT workspace.
 *
 * This decides where a request is *sent*, not what it may see. Authorisation is
 * the server's job: the cookie is verified again in `lib/auth/session`, the
 * account re-read from the store, and every screen that exposes another
 * person's data goes through `requireAdmin` there.
 *
 * It does verify the signature, though, and that is the point of it. Checking
 * only that a cookie exists let a stale or foreign one through — after which
 * the page rendered with no user on it, showing a signed-out header above a
 * signed-in layout, and the operations console answered 404 to its own
 * administrator. Both look like bugs somewhere else entirely. Verifying here
 * means an unusable cookie is cleared and the visitor is sent to sign in again,
 * which is what actually happened to them.
 *
 * Web Crypto rather than `node:crypto`, because middleware runs on the edge
 * runtime. Without `VRENT_SESSION_SECRET` — a laptop, where the key lives in a
 * file the edge cannot read — it falls back to the presence check, which is
 * safe there because a local key does not change underneath anybody.
 */

const COOKIE = 'vrent_session';

/** Reachable without signing in. */
const PUBLIC_PATHS = ['/phase1', '/phase1/login', '/phase1/signup', '/phase1/forgot', '/phase1/reset'];

/**
 * Share links are sent to people who have no account and never will. What such
 * a link may actually reveal is decided in the store, which returns only
 * published and paused listings.
 */
const PUBLIC_PREFIXES = ['/phase1/share/'];

type CookieState = 'none' | 'valid' | 'unusable';

const b64urlToBytes = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

/** Constant-time compare, so a signature cannot be guessed a byte at a time. */
function equal(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function readCookie(req: NextRequest): Promise<CookieState> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return 'none';

  const secret = process.env.VRENT_SESSION_SECRET;
  // No key here means the server keeps it in a file. Presence is all we can
  // check; the server still verifies properly on the request itself.
  if (!secret || secret.length < 32) return 'valid';

  const dot = token.lastIndexOf('.');
  if (dot < 1) return 'unusable';
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const expected = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)),
    );
    if (!equal(expected, b64urlToBytes(signature))) return 'unusable';

    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body))) as { exp?: number };
    if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) return 'unusable';
    return 'valid';
  } catch {
    return 'unusable';
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/phase1')) return NextResponse.next();

  const state = await readCookie(req);
  const signedIn = state === 'valid';
  const isPublic = PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!signedIn && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/phase1/login';
    url.search = '';
    // Come back to the requested page once signed in.
    url.searchParams.set('next', pathname);
    if (state === 'unusable') url.searchParams.set('expired', '1');

    const res = NextResponse.redirect(url);
    // A cookie that cannot be verified is worse than none: it gets the holder
    // past a presence check for the next twelve hours and explains nothing.
    if (state === 'unusable') res.cookies.delete(COOKIE);
    return res;
  }

  if (signedIn && (pathname === '/phase1/login' || pathname === '/phase1/signup')) {
    const url = req.nextUrl.clone();
    url.pathname = '/phase1/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // A cookie that is past its date on a public page is still worth clearing, so
  // the header stops offering an account that is no longer signed in.
  if (state === 'unusable') {
    const res = NextResponse.next();
    res.cookies.delete(COOKIE);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/phase1/:path*'],
};
