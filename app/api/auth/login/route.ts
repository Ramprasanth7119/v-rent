/**
 * POST /api/auth/login
 *
 * One failure message whatever went wrong, so the response cannot be used to
 * discover which email addresses have accounts. Rate limited per client because
 * a password form without a limit is a password form with an attacker on it.
 */

import { NextResponse } from 'next/server';
import { TokenBucket } from '../../../../lib/payments/concurrency';
import { ensureDemoAccounts, findByEmail, publicAccount, recordLogin, verifyPassword } from '../../../../lib/auth/store';
import { startSession } from '../../../../lib/auth/session';
import { clearFailures, isLocked, recordFailure } from '../../../../lib/auth/password-reset';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = new TokenBucket(8, 0.15);

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

const FAILED = { error: 'Email address or password is incorrect.', code: 'bad_credentials' } as const;

async function POST_handler(req: Request) {
  const retryAfter = limiter.take(clientKey(req));
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Wait a moment and try again.', code: 'rate_limited' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Body must be JSON', code: 'bad_body' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) return NextResponse.json(FAILED, { status: 401 });

  // Makes sure the two declared demo accounts exist on a fresh install, and
  // that their passwords still match what the environment says they are.
  await ensureDemoAccounts();

  const account = await findByEmail(email);
  if (!account) return NextResponse.json(FAILED, { status: 401 });

  // A locked account is refused with the same message as a wrong password.
  // Saying "this account is locked" would confirm to a stranger that the
  // address is registered, which is the thing the single message exists to
  // avoid. The person who owns it is told by email instead.
  if (isLocked(account)) return NextResponse.json(FAILED, { status: 401 });

  if (!(await verifyPassword(password, account))) {
    await recordFailure(account.id);
    return NextResponse.json(FAILED, { status: 401 });
  }

  await clearFailures(account.id);
  await recordLogin(account.id);

  /* Signing the cookie is the one step here that can fail on a misconfigured
     deployment rather than on anything the visitor did. Saying so plainly beats
     a 500: the person seeing it can do nothing about it, but the person they
     report it to can fix it in a minute. */
  try {
    await startSession(account);
  } catch (err) {
    console.error('[v-rent] could not start a session:', err);
    return NextResponse.json(
      {
        error: 'This deployment is not configured to sign in users yet. The server is missing its '
          + 'session signing key.',
        code: 'not_configured',
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, user: publicAccount(account) });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
