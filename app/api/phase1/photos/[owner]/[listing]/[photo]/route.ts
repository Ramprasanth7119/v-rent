/**
 * GET /api/phase1/photos/{owner}/{listing}/{photo}
 *
 * Serves one stored photograph. Who may see it follows the listing, not the
 * URL: the owner always, everyone else only while the listing is published or
 * paused — the same rule the public share page uses. An unpublished listing's
 * photographs are not addressable by anyone who happens to have the link.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../../../../lib/auth/session';
import { readWorkspace } from '../../../../../../../lib/phase1/workspace-store';
import { readPhoto } from '../../../../../../../lib/phase1/photo-store';
import { logged } from '../../../../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const notFound = () => new NextResponse('Not found', { status: 404 });

async function GET_handler(
  req: Request,
  { params }: { params: Promise<{ owner: string; listing: string; photo: string }> },
) {
  const { owner, listing: listingId, photo } = await params;

  const workspace = await readWorkspace(owner);
  const listing = workspace?.listings.find((l) => l.id === listingId);
  if (!listing || !(listing.photos ?? []).includes(photo)) return notFound();

  const publiclyVisible = listing.status === 'published' || listing.status === 'paused';
  if (!publiclyVisible) {
    const user = await currentUser();
    const mayLook = user && (user.id === owner || user.role === 'admin');
    if (!mayLook) return notFound();
  }

  // Lists and cards ask for the small one; the gallery asks for the full size.
  const size = new URL(req.url).searchParams.get('size') === 'thumb' ? 'thumb' : 'full';
  const file = await readPhoto(owner, listingId, photo, size);
  if (!file) return notFound();

  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      'content-type': file.type,
      'content-length': String(file.body.length),
      // Ids are random and never reused, so a stored copy can never be stale.
      'cache-control': publiclyVisible ? 'public, max-age=31536000, immutable' : 'private, max-age=3600',
    },
  });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
