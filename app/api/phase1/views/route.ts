/**
 * POST /api/phase1/views              — an agent opened somebody's listing
 * GET  /api/phase1/views?listing=…    — who has opened one of yours
 *
 * The POST is a beacon from a public page, so it answers the same way whatever
 * happened: a listing that is not there, an owner who does not exist and a
 * view that was recorded are indistinguishable from outside. The reply is the
 * only thing a stranger could learn anything from, so it says nothing.
 *
 * The GET is the opposite — it is about your own listing, and it says exactly
 * what is known, including the price of the next name.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { loadWorkspace } from '../../../../lib/phase1/workspace-store';
import { logged } from '../../../../lib/phase1/reqlog';
import { recordListingView, viewerRows } from '../../../../lib/phase1/views-store';
import { revealPriceCents, unrevealedCount } from '../../../../lib/phase1/views';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function POST_handler(req: Request) {
  const viewer = await currentUser();

  /* A tenant browsing is not a view in the sense this feature means, and an
     unauthenticated caller is not one either. Both get the same "ok". */
  if (!viewer || viewer.role !== 'agent') return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => null) as { ownerId?: string; listingId?: string } | null;
  const ownerId = String(body?.ownerId ?? '').trim().slice(0, 64);
  const listingId = String(body?.listingId ?? '').trim().slice(0, 64);
  if (!ownerId || !listingId) return NextResponse.json({ ok: true });

  await recordListingView({ ownerId, listingId, viewer });
  return NextResponse.json({ ok: true });
}

async function GET_handler(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });

  const listingId = (new URL(req.url).searchParams.get('listing') ?? '').trim().slice(0, 64);
  if (!listingId) return NextResponse.json({ error: 'A listing is needed.', code: 'bad_request' }, { status: 400 });

  const workspace = await loadWorkspace(user);
  if (!workspace.listings.some((l) => l.id === listingId)) {
    /* Not "forbidden": whether somebody else's listing exists is not something
       this route should confirm. */
    return NextResponse.json({ error: 'That listing is not in your workspace.', code: 'not_found' }, { status: 404 });
  }

  const rows = await viewerRows(workspace, user.id, listingId);

  return NextResponse.json({
    viewers: rows,
    /* What the next name costs, so the button can say it before it is pressed. */
    nextCostCents: revealPriceCents(workspace.reveals, listingId),
    remaining: unrevealedCount(workspace.views, workspace.reveals, listingId),
    credits: workspace.revealCredits,
  });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
export const GET = logged(GET_handler);
