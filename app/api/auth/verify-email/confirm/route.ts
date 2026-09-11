/**
 * GET /api/auth/verify-email/confirm?token=…
 *
 * The link from the email. It is opened by a person in a browser, so it
 * redirects to a screen rather than returning JSON, and it works whether or not
 * they happen to be signed in on this device — the token is the proof, not the
 * session.
 */

import { NextResponse } from 'next/server';
import { confirmToken } from '../../../../../lib/auth/email-verification';
import { loadWorkspace, patchWorkspace } from '../../../../../lib/phase1/workspace-store';
import { publicAccount } from '../../../../../lib/auth/store';
import { logged } from '../../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function GET_handler(req: Request) {
  const url = new URL(req.url);
  const result = await confirmToken(url.searchParams.get('token') ?? '');

  const to = new URL('/phase1/verify', url.origin);
  if (!result.ok) {
    to.searchParams.set('email', result.reason);
    return NextResponse.redirect(to);
  }

  // Mirror it onto the workspace, which is what the screens read.
  const account = publicAccount(result.account);
  await loadWorkspace(account);
  await patchWorkspace(account, { emailVerified: true });

  to.searchParams.set('email', 'confirmed');
  return NextResponse.redirect(to);
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
