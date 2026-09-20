/**
 * GET    /api/phase1/video            — whether video tours can be offered at all
 * POST   /api/phase1/video            — a signature for one upload, to Cloudinary directly
 * PUT    /api/phase1/video            — record what landed, once Cloudinary confirms it
 * DELETE /api/phase1/video?listing=…  — remove it from Cloudinary and from the listing
 *
 * The file itself never passes through here; see `lib/phase1/video.ts` for why.
 * What this route holds on to is the part that has to be trusted — who the
 * owner is, where the file may be put, and what is true about it afterwards.
 *
 * The owner always comes from the session. The browser names a listing and
 * this route decides everything else about the upload, so an agent can write
 * only to their own listing and only to the one place it belongs.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { loadWorkspace, patchWorkspace } from '../../../../lib/phase1/workspace-store';
import { TODAY_ISO } from '../../../../lib/phase1/workspace';
import { logged } from '../../../../lib/phase1/reqlog';
import { MAX_VIDEO_BYTES, videoProblem, videoPublicId } from '../../../../lib/phase1/video';
import {
  cloudinaryAccount, destroyVideo, readVideoResource, signedVideoUpload, videoUrls,
} from '../../../../lib/phase1/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOT_SET_UP = 'Video tours are not switched on for this installation yet.';

const signedOut = () => NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });

/** The agent's own listing, or null. Every verb here starts with this. */
async function ownListing(listingId: string) {
  const user = await currentUser();
  if (!user) return { user: null, workspace: null, listing: null } as const;
  const workspace = await loadWorkspace(user);
  const listing = workspace.listings.find((l) => l.id === listingId && !l.archived) ?? null;
  return { user, workspace, listing } as const;
}

async function GET_handler() {
  /* The upload control asks before it draws itself, so an agent is told the
     feature is off rather than finding out by using it. */
  return NextResponse.json({ configured: cloudinaryAccount() !== null, maxBytes: MAX_VIDEO_BYTES });
}

async function POST_handler(req: Request) {
  const account = cloudinaryAccount();
  if (!account) return NextResponse.json({ error: NOT_SET_UP, code: 'not_configured' }, { status: 503 });

  const body = await req.json().catch(() => null) as { listingId?: string; contentType?: string; bytes?: number } | null;
  const listingId = String(body?.listingId ?? '').trim().slice(0, 64);
  if (!listingId) return NextResponse.json({ error: 'A listing is needed.', code: 'bad_request' }, { status: 400 });

  const { user, listing } = await ownListing(listingId);
  if (!user) return signedOut();
  if (!listing) return NextResponse.json({ error: 'That listing is not in your workspace.', code: 'not_found' }, { status: 404 });

  /* The same check the browser just made. It is repeated because the browser's
     copy is a courtesy to the agent, not a control over what arrives. */
  const problem = videoProblem({ type: String(body?.contentType ?? ''), size: Number(body?.bytes ?? 0) });
  if (problem) return NextResponse.json({ error: problem, code: 'rejected' }, { status: 400 });

  return NextResponse.json(signedVideoUpload(videoPublicId(user.id, listingId), account));
}

async function PUT_handler(req: Request) {
  const account = cloudinaryAccount();
  if (!account) return NextResponse.json({ error: NOT_SET_UP, code: 'not_configured' }, { status: 503 });

  const body = await req.json().catch(() => null) as { listingId?: string } | null;
  const listingId = String(body?.listingId ?? '').trim().slice(0, 64);
  if (!listingId) return NextResponse.json({ error: 'A listing is needed.', code: 'bad_request' }, { status: 400 });

  const { user, workspace, listing } = await ownListing(listingId);
  if (!user || !workspace) return signedOut();
  if (!listing) return NextResponse.json({ error: 'That listing is not in your workspace.', code: 'not_found' }, { status: 404 });

  /* Rebuilt rather than accepted: the id the browser uploaded to is the id
     this route signed, so there is no reason to ask it which one that was. */
  const publicId = videoPublicId(user.id, listingId);
  const resource = await readVideoResource(publicId, account);
  if (!resource) {
    return NextResponse.json({ error: 'Cloudinary has not got that upload. Try again.', code: 'not_found' }, { status: 404 });
  }

  const video = {
    publicId,
    ...videoUrls(publicId, account),
    bytes: resource.bytes,
    durationSec: resource.durationSec,
    format: resource.format,
    at: new Date().toISOString(),
  };

  await patchWorkspace(user, {
    listings: workspace.listings.map((l) => (l.id === listingId ? { ...l, video, updatedAt: TODAY_ISO } : l)),
  });

  return NextResponse.json({ ok: true, video });
}

async function DELETE_handler(req: Request) {
  const listingId = (new URL(req.url).searchParams.get('listing') ?? '').trim().slice(0, 64);
  if (!listingId) return NextResponse.json({ error: 'A listing is needed.', code: 'bad_request' }, { status: 400 });

  const { user, workspace, listing } = await ownListing(listingId);
  if (!user || !workspace) return signedOut();
  if (!listing) return NextResponse.json({ error: 'That listing is not in your workspace.', code: 'not_found' }, { status: 404 });

  const account = cloudinaryAccount();
  const publicId = listing.video?.publicId ?? videoPublicId(user.id, listingId);

  /* Removed from the account first. If that fails the listing keeps its
     record, because a listing that has forgotten a video nobody can now find
     is worse than one that still knows where it is. */
  if (account && listing.video) {
    const gone = await destroyVideo(publicId, account);
    if (!gone) {
      return NextResponse.json({ error: 'Cloudinary did not remove it. Try again in a moment.', code: 'upstream' }, { status: 502 });
    }
  }

  await patchWorkspace(user, {
    listings: workspace.listings.map((l) => {
      if (l.id !== listingId) return l;
      const next = { ...l, updatedAt: TODAY_ISO };
      delete next.video;
      return next;
    }),
  });

  return NextResponse.json({ ok: true });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
export const POST = logged(POST_handler);
export const PUT = logged(PUT_handler);
export const DELETE = logged(DELETE_handler);
