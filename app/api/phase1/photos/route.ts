/**
 * POST /api/phase1/photos          — upload photographs to one of your listings
 * POST /api/phase1/photos?remove=1 — remove one, or reorder the whole set
 *
 * The account comes from the session, so an agent can only ever write to their
 * own listing. Limits are enforced here and not only in the browser: the form
 * is a convenience, this is the rule.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { findById } from '../../../../lib/auth/store';
import { loadWorkspace, patchWorkspace } from '../../../../lib/phase1/workspace-store';
import {
  MAX_PHOTOS_PER_LISTING, deletePhoto, pruneOrphans, savePhotos,
} from '../../../../lib/phase1/photo-store';
import { TODAY_ISO } from '../../../../lib/phase1/workspace';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const unauthorised = () =>
  NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });

/** Write the new ordering back onto the listing and keep `images` in step. */
async function commit(
  account: Awaited<ReturnType<typeof findById>>,
  listingId: string,
  photos: string[],
) {
  if (!account) return null;
  const workspace = await loadWorkspace({ ...account, cea: account.cea });
  const listings = workspace.listings.map((l) => (l.id === listingId
    ? { ...l, photos, images: photos.length, updatedAt: TODAY_ISO, reviewedAt: undefined }
    : l));
  await patchWorkspace({ ...account, cea: account.cea }, { listings });
  return photos;
}

async function POST_handler(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorised();
  const account = await findById(user.id);
  if (!account) return unauthorised();

  const workspace = await loadWorkspace(user);
  const url = new URL(req.url);

  /* ------------------------------------------------- remove and reorder */
  if (url.searchParams.get('remove') === '1') {
    const body = (await req.json().catch(() => null)) as { listingId?: string; photos?: string[] } | null;
    const listingId = body?.listingId ?? '';
    const listing = workspace.listings.find((l) => l.id === listingId);
    if (!listing) return NextResponse.json({ error: 'No such listing.', code: 'not_found' }, { status: 404 });

    const current = listing.photos ?? [];
    // Only ids this listing already has, in the order the browser asked for.
    const next = (body?.photos ?? []).filter((p) => current.includes(p)).slice(0, MAX_PHOTOS_PER_LISTING);
    await commit(account, listingId, next);
    await Promise.all(current.filter((p) => !next.includes(p)).map((p) => deletePhoto(user.id, listingId, p)));
    return NextResponse.json({ photos: next });
  }

  /* -------------------------------------------------------------- upload */
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected a file upload.', code: 'bad_request' }, { status: 400 });
  }

  const listingId = String(form.get('listingId') ?? '');
  const listing = workspace.listings.find((l) => l.id === listingId);
  if (!listing) return NextResponse.json({ error: 'No such listing.', code: 'not_found' }, { status: 404 });

  const files = form.getAll('file').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: 'No photographs were attached.', code: 'no_files' }, { status: 400 });
  }

  const existing = listing.photos ?? [];
  const { saved, rejected, warnings } = await savePhotos(user.id, listingId, existing, files);
  const photos = [...existing, ...saved];

  await commit(account, listingId, photos);
  await pruneOrphans(user.id, listingId, photos);

  return NextResponse.json({ photos, rejected, warnings });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
