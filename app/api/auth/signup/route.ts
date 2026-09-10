/**
 * POST /api/auth/signup — create an agent account.
 *
 * The CEA registration is re-checked here against the live register. The
 * browser has already shown the agent their record, but a client can send
 * anything, so the record stored against the account is the one this route
 * fetched, never the one the browser submitted.
 */

import { NextResponse } from 'next/server';
import { TokenBucket } from '../../../../lib/payments/concurrency';
import { lookupRegistration } from '../../../../lib/auth/cea';
import { createAccount, findByCea, findByEmail, passwordProblem, publicAccount } from '../../../../lib/auth/store';
import { startSession } from '../../../../lib/auth/session';
import { loadWorkspace } from '../../../../lib/phase1/workspace-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = new TokenBucket(6, 0.2);

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export async function POST(req: Request) {
  const retryAfter = limiter.take(clientKey(req));
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: 'Too many sign-up attempts. Wait a moment.', code: 'rate_limited' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Body must be JSON', code: 'bad_body' }, { status: 400 });
  }

  const email = str(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const mobile = str(body.mobile);
  const registrationNo = str(body.registrationNo).toUpperCase();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.', code: 'bad_email' }, { status: 400 });
  }
  const pwProblem = passwordProblem(password);
  if (pwProblem) {
    return NextResponse.json({ error: pwProblem, code: 'weak_password' }, { status: 400 });
  }
  if (!/^\+?[0-9 ]{8,16}$/.test(mobile)) {
    return NextResponse.json({ error: 'Enter a valid mobile number.', code: 'bad_mobile' }, { status: 400 });
  }

  if (await findByEmail(email)) {
    return NextResponse.json(
      { error: 'An account with this email address already exists. Sign in instead.', code: 'email_taken' },
      { status: 409 },
    );
  }

  // Re-verify against the register rather than trusting the submitted record.
  const lookup = await lookupRegistration(registrationNo);
  if (lookup.status === 'unavailable') {
    return NextResponse.json(
      { error: 'The CEA register is not responding, so the account cannot be verified yet.', code: 'register_unavailable' },
      { status: 503 },
    );
  }
  if (lookup.status === 'not_found') {
    return NextResponse.json(
      {
        error: 'That registration number is not on the active CEA register, so an account cannot be opened.',
        code: 'cea_not_found',
      },
      { status: 422 },
    );
  }

  if (await findByCea(lookup.record.registrationNo)) {
    return NextResponse.json(
      { error: 'This CEA registration is already linked to an account. Sign in, or contact support.', code: 'cea_taken' },
      { status: 409 },
    );
  }

  const account = await createAccount({
    email,
    password,
    mobile,
    fullName: lookup.record.name,
    role: 'agent',
    cea: { ...lookup.record, verifiedAt: lookup.checkedAt },
  });

  // Open the workspace now rather than on their first visit. It is what decides
  // whether this application waits for an officer, and an application has to be
  // in the queue from the moment it is made — not from the moment the applicant
  // happens to open the app.
  await loadWorkspace(publicAccount(account));

  await startSession(account);
  return NextResponse.json({ ok: true, user: publicAccount(account) }, { status: 201 });
}
