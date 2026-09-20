/**
 * POST   /api/phase1/floorplan          — upload the floor plan for one of your listings
 * GET    /api/phase1/floorplan?owner=…&listing=… — fetch it
 * DELETE /api/phase1/floorplan?listing=… — remove it
 *
 * The owner comes from the session on the way in, so an agent can only ever
 * write to their own listing. On the way out it is a parameter, because a
 * tenant looking at an advertisement has every reason to see the plan and no
 * account to do it with — the same rule the photograph route applies. What
 * guards it there is the listing's status: a plan is served only for a listing
 * that is actually advertised.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { loadWorkspace, patchWorkspace, readWorkspace } from '../../../../lib/phase1/workspace-store';
import {
  MAX_FLOORPLAN_BYTES, deleteFloorPlan, readFloorPlan, saveFloorPlan,
} from '../../../../lib/phase1/floorplan-store';
import { TODAY_ISO } from '../../../../lib/phase1/workspace';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REFUSAL: Record<string, string> = {
  wrong_type: 'A floor plan has to be a PDF, JPEG, PNG or WebP.',
  too_large: `That file is over ${Math.round(MAX_FLOORPLAN_BYTES / (1024 * 1024))} MB. Export it at a smaller size and try again.`,
  empty: 'That file is empty.',
};

async function POST_handler(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const listingId = String(form?.get('listingId') ?? '').trim().slice(0, 64);
  const file = form?.get('file');

  if (!listingId || !(file instanceof File)) {
    return NextResponse.json({ error: 'A listing and a file are both needed.', code: 'bad_request' }, { status: 400 });
  }

  const workspace = await loadWorkspace(user);
  const listing = workspace.listings.find((l) => l.id === listingId && !l.archived);
  if (!listing) {
    return NextResponse.json({ error: 'That listing is not in your workspace.', code: 'not_found' }, { status: 404 });
  }

  const result = await saveFloorPlan(user.id, listingId, file);
  if (!result.ok) {
    return NextResponse.json({ error: REFUSAL[result.reason], code: result.reason }, { status: 400 });
  }

  /* Recorded on the listing so every screen can tell there is one without
     fetching the file itself, and so the moderation queue can see it changed. */
  await patchWorkspace(user, {
    listings: workspace.listings.map((l) => (l.id === listingId
      ? { ...l, floorPlan: { filename: result.plan.filename, contentType: result.plan.contentType, bytes: result.plan.bytes, at: result.plan.at }, updatedAt: TODAY_ISO }
      : l)),
  });

  return NextResponse.json({ ok: true, floorPlan: { filename: result.plan.filename, bytes: result.plan.bytes } });
}

async function GET_handler(req: Request) {
  const url = new URL(req.url);
  const ownerId = (url.searchParams.get('owner') ?? '').trim().slice(0, 64);
  const listingId = (url.searchParams.get('listing') ?? '').trim().slice(0, 64);
  if (!ownerId || !listingId) {
    return NextResponse.json({ error: 'Not found.', code: 'not_found' }, { status: 404 });
  }

  const workspace = await readWorkspace(ownerId);
  const listing = workspace?.listings.find((l) => l.id === listingId && !l.archived);

  /* Advertised, or the agent's own. A plan attached to a draft is nobody
     else's business. */
  const advertised = listing && (listing.status === 'published' || listing.status === 'paused');
  if (!advertised) {
    const user = await currentUser();
    if (!user || user.id !== ownerId) {
      return NextResponse.json({ error: 'Not found.', code: 'not_found' }, { status: 404 });
    }
  }

  const plan = await readFloorPlan(ownerId, listingId);
  if (!plan) return NextResponse.json({ error: 'Not found.', code: 'not_found' }, { status: 404 });

  return new NextResponse(Buffer.from(plan.data, 'base64'), {
    headers: {
      'content-type': plan.contentType,
      'content-disposition': `inline; filename="${plan.filename}"`,
      /* Immutable in practice: a replaced plan is a new upload with a new
         timestamp, and the listing page links with that timestamp on it. */
      'cache-control': 'private, max-age=3600',
    },
  });
}

async function DELETE_handler(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });

  const listingId = (new URL(req.url).searchParams.get('listing') ?? '').trim().slice(0, 64);
  if (!listingId) return NextResponse.json({ error: 'A listing is needed.', code: 'bad_request' }, { status: 400 });

  const workspace = await loadWorkspace(user);
  if (!workspace.listings.some((l) => l.id === listingId)) {
    return NextResponse.json({ error: 'That listing is not in your workspace.', code: 'not_found' }, { status: 404 });
  }

  await deleteFloorPlan(user.id, listingId);
  await patchWorkspace(user, {
    listings: workspace.listings.map((l) => {
      if (l.id !== listingId) return l;
      const next = { ...l, updatedAt: TODAY_ISO };
      delete next.floorPlan;
      return next;
    }),
  });

  return NextResponse.json({ ok: true });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
export const GET = logged(GET_handler);
export const DELETE = logged(DELETE_handler);
