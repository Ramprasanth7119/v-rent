/**
 * POST /api/phase1/views/reveal — buy the name behind one view
 *
 * The decision, the charge and the record all happen in `views-store`, under
 * the workspace lock, so two taps on the same button cannot be charged twice:
 * the second finds the reveal already there and is refused rather than billed.
 *
 * Refusals are told apart deliberately. 402 means the agent wants this and has
 * no balance, which is a different screen from 400.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../../lib/auth/session';
import { logged } from '../../../../../lib/phase1/reqlog';
import { revealViewer } from '../../../../../lib/phase1/views-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function POST_handler(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });

  const body = await req.json().catch(() => null) as { listingId?: string; token?: string } | null;
  const listingId = String(body?.listingId ?? '').trim().slice(0, 64);
  const token = String(body?.token ?? '').trim().slice(0, 64);
  if (!listingId || !token) {
    return NextResponse.json({ error: 'A listing and an agent are both needed.', code: 'bad_request' }, { status: 400 });
  }

  const result = await revealViewer({ owner: user, listingId, token });
  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    card: result.card,
    costCents: result.costCents,
    credits: result.credits,
  });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
