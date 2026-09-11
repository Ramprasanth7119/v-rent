/**
 * POST /api/auth/verify-email/send — send (or resend) the confirmation link.
 *
 * Rate limited twice: once by the token itself, which refuses to be reissued
 * within a minute, and once per account here, so pressing the button in a loop
 * cannot be used to post mail at somebody.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../../lib/auth/session';
import { TokenBucket } from '../../../../../lib/payments/concurrency';
import { issueToken } from '../../../../../lib/auth/email-verification';
import { send, verificationEmail, mailIsConfigured } from '../../../../../lib/mail';
import { preferredName } from '../../../../../lib/phase1/workspace';
import { logged } from '../../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = new TokenBucket(4, 1 / 60);

async function POST_handler(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });
  }

  const retryAfter = limiter.take(user.id);
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: 'A link was just sent. Check your inbox before asking for another.', code: 'rate_limited' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    );
  }

  const issued = await issueToken(user.id);
  if (!issued.ok) {
    return issued.reason === 'already_verified'
      ? NextResponse.json({ error: 'That address is already confirmed.', code: 'already_verified' }, { status: 409 })
      : NextResponse.json(
          { error: `Wait ${issued.retryInSeconds ?? 60} seconds before asking for another link.`, code: 'too_soon' },
          { status: 429 },
        );
  }

  const origin = new URL(req.url).origin;
  const link = `${origin}/api/auth/verify-email/confirm?token=${encodeURIComponent(issued.token)}`;
  const delivery = await send({ ...verificationEmail(preferredName(user.fullName), link), to: user.email });

  return NextResponse.json({
    ok: true,
    expiresAt: issued.expiresAt,
    delivered: delivery.sent,
    // Only when nothing actually delivered it. With a provider connected this
    // is absent and the interface has no link to offer.
    link: mailIsConfigured() ? undefined : link,
  });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
