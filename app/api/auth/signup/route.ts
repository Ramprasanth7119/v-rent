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
import { logged } from '../../../../lib/phase1/reqlog';
import { normaliseSgMobile, sgMobileProblem } from '../../../../lib/phase1/mobile';

/** Said when the fault is ours, and the applicant can only try later. */
const UNAVAILABLE = {
  error: 'V-RENT cannot reach its records at the moment. Nothing you entered is wrong — try '
    + 'again in a minute.',
  code: 'store_unavailable',
} as const;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = new TokenBucket(6, 0.2);

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

async function POST_handler(req: Request) {
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
  const typedMobile = str(body.mobile);
  const registrationNo = str(body.registrationNo).toUpperCase();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.', code: 'bad_email' }, { status: 400 });
  }
  const pwProblem = passwordProblem(password);
  if (pwProblem) {
    return NextResponse.json({ error: pwProblem, code: 'weak_password' }, { status: 400 });
  }
  /* Stored in the one shape rather than as typed, so every later screen and
     every message reads the same number. */
  const mobileProblem = sgMobileProblem(typedMobile);
  if (mobileProblem) {
    return NextResponse.json({ error: mobileProblem, code: 'bad_mobile' }, { status: 400 });
  }
  const mobile = normaliseSgMobile(typedMobile)!;

  /* The store is the first thing this route touches that can be unavailable
     rather than wrong. An outage here must not read as "that address is taken"
     or as a bare 500. */
  try {
    if (await findByEmail(email)) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Sign in instead.', code: 'email_taken' },
        { status: 409 },
      );
    }
  } catch (err) {
    console.error('[v-rent] sign-up could not reach the store:', err);
    return NextResponse.json(UNAVAILABLE, { status: 503 });
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

  try {
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

    // Open the workspace now rather than on their first visit. It is what
    // decides whether this application waits for an officer, and an application
    // has to be in the queue from the moment it is made — not from the moment
    // the applicant happens to open the app.
    await loadWorkspace(publicAccount(account));

    await startSession(account);
    return NextResponse.json({ ok: true, user: publicAccount(account) }, { status: 201 });
  } catch (err) {
    console.error('[v-rent] sign-up failed after the register check:', err);
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
