/**
 * POST /api/auth/password/reset  { token, password }
 *
 * Spends the token and sets the new password. The token is the proof, so this
 * works whether or not the person is signed in on this device — which is the
 * situation someone resetting a password is usually in.
 */

import { NextResponse } from 'next/server';
import { TokenBucket } from '../../../../../lib/payments/concurrency';
import { completeReset } from '../../../../../lib/auth/password-reset';
import { logged } from '../../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = new TokenBucket(10, 1 / 30);

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

async function POST_handler(req: Request) {
  const retryAfter = limiter.take(clientKey(req));
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: 'Too many attempts. Wait a moment.', code: 'rate_limited' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    );
  }

  let token = '';
  let password = '';
  try {
    const body = (await req.json()) as { token?: unknown; password?: unknown };
    token = typeof body.token === 'string' ? body.token : '';
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.', code: 'bad_request' }, { status: 400 });
  }

  const result = await completeReset(token, password);
  if (!result.ok) {
    return NextResponse.json({ error: result.message, code: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
