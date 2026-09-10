import { NextResponse, type NextRequest } from 'next/server';

/**
 * Coarse routing for the V-RENT workspace.
 *
 * This checks only that a session cookie is present, so that a signed-out
 * visitor lands on the sign-in page instead of an empty dashboard, and a
 * signed-in one is not shown the sign-in form again. It is navigation, not
 * authorisation: the cookie is verified, the account re-read and the role
 * checked on the server in `lib/auth/session`, and every screen that exposes
 * another person's data goes through `requireAdmin` there.
 */

const COOKIE = 'vrent_session';

/** Reachable without signing in. */
const PUBLIC_PATHS = ['/phase1', '/phase1/login', '/phase1/signup'];

/**
 * Share links are sent to people who have no account and never will. What such
 * a link may actually reveal is decided in the store, which returns only
 * published and paused listings.
 */
const PUBLIC_PREFIXES = ['/phase1/share/'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/phase1')) return NextResponse.next();

  const signedIn = Boolean(req.cookies.get(COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!signedIn && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/phase1/login';
    // Come back to the requested page once signed in.
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (signedIn && (pathname === '/phase1/login' || pathname === '/phase1/signup')) {
    const url = req.nextUrl.clone();
    url.pathname = '/phase1/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/phase1/:path*'],
};
