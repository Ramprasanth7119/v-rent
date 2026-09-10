/**
 * POST /api/auth/login
 *
 * One failure message whatever went wrong, so the response cannot be used to
 * discover which email addresses have accounts. Rate limited per client because
 * a password form without a limit is a password form with an attacker on it.
 */

import { NextResponse } from 'next/server';
import { TokenBucket } from '../../../../lib/payments/concurrency';
import { ensureAdminAccount, findByEmail, publicAccount, recordLogin, verifyPassword } from '../../../../lib/auth/store';
import { startSession } from '../../../../lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = new TokenBucket(8, 0.15);

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

const FAILED = { error: 'Email address or password is incorrect.', code: 'bad_credentials' } as const;

export async function POST(req: Request) {
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

  // Makes sure an operations account exists to sign in as on a fresh install.
  await ensureAdminAccount();

  const account = await findByEmail(email);
  if (!account || !(await verifyPassword(password, account))) {
    return NextResponse.json(FAILED, { status: 401 });
  }

  await recordLogin(account.id);
  await startSession(account);
  return NextResponse.json({ ok: true, user: publicAccount(account) });
}
