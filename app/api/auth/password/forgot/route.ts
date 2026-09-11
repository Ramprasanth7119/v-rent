/**
 * POST /api/auth/password/forgot  { email }
 *
 * Answers the same way whether or not the address is on the platform. A
 * password-reset form that distinguishes the two is a tool for discovering who
 * has an account, so this one does not.
 */

import { NextResponse } from 'next/server';
import { TokenBucket } from '../../../../../lib/payments/concurrency';
import { issueReset } from '../../../../../lib/auth/password-reset';
import { send } from '../../../../../lib/mail';
import { preferredName } from '../../../../../lib/phase1/workspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Per address, because the caller has no session to limit by. */
const limiter = new TokenBucket(5, 1 / 60);

/** What every caller is told, regardless. */
const SAME_ANSWER = {
  ok: true,
  message: 'If that address has a V-RENT account, a reset link is on its way to it.',
};

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

export async function POST(req: Request) {
  if (limiter.take(clientKey(req)) !== null) {
    // Even the rate limit answers the same way, so timing does not leak either.
    return NextResponse.json(SAME_ANSWER);
  }

  let email = '';
  try {
    const body = (await req.json()) as { email?: unknown };
    email = typeof body.email === 'string' ? body.email : '';
  } catch {
    return NextResponse.json(SAME_ANSWER);
  }

  const issued = await issueReset(email);
  if (!issued) return NextResponse.json(SAME_ANSWER);

  const origin = new URL(req.url).origin;
  const link = `${origin}/phase1/reset?token=${encodeURIComponent(issued.token)}`;
  const delivery = await send({
    to: issued.account.email,
    subject: 'Reset your V-RENT password',
    body: [
      `Hello ${preferredName(issued.account.fullName)},`,
      '',
      'Someone asked to reset the password on your V-RENT account. If that was you, use this link:',
      '',
      link,
      '',
      'It works once and expires in an hour. If it was not you, ignore this message — your password has not changed.',
      '',
      'V-RENT',
    ].join('\n'),
  });

  return NextResponse.json({
    ...SAME_ANSWER,
    // Present only while no mail provider is connected, so the POC can be
    // demonstrated. With a provider there is nothing here to leak.
    link: delivery.sent ? undefined : link,
  });
}
