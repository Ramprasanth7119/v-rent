/**
 * POST /api/phase1/admin/moderation
 *   { ownerId, listingId, action: 'approve' | 'reject', reason? }
 *
 * A moderator's decision, written into the owning agent's workspace — the same
 * record that agent's screens read, so a rejection reaches them as a rejection
 * with a reason attached rather than a listing that quietly stopped working.
 *
 * Staff only, and a 404 rather than a 403 for everyone else: the console does
 * not confirm its own existence to people who may not open it.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../../lib/auth/session';
import { findById } from '../../../../../lib/auth/store';
import { loadWorkspace, patchWorkspace } from '../../../../../lib/phase1/workspace-store';
import { record } from '../../../../../lib/phase1/audit';
import { preferredName } from '../../../../../lib/phase1/workspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const notFound = () => NextResponse.json({ error: 'Not found.', code: 'not_found' }, { status: 404 });

export async function POST(req: Request) {
  const staff = await currentUser();
  if (!staff || staff.role !== 'admin') return notFound();

  let body: { ownerId?: string; listingId?: string; action?: string; reason?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.', code: 'bad_request' }, { status: 400 });
  }

  const { ownerId, listingId, action } = body;
  if (!ownerId || !listingId || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'Unknown action.', code: 'bad_request' }, { status: 400 });
  }
  const reason = (body.reason ?? '').trim().slice(0, 500);
  if (action === 'reject' && !reason) {
    return NextResponse.json(
      { error: 'A rejection needs a reason — the agent has to know what to correct.', code: 'reason_required' },
      { status: 400 },
    );
  }

  const owner = await findById(ownerId);
  if (!owner || owner.role !== 'agent') return notFound();

  const workspace = await loadWorkspace(owner);
  const listing = workspace.listings.find((l) => l.id === listingId);
  if (!listing) return notFound();

  const reviewedAt = new Date().toISOString().slice(0, 10);
  const listings = workspace.listings.map((l) => {
    if (l.id !== listingId) return l;
    return action === 'approve'
      ? { ...l, status: 'published' as const, reviewedAt, rejectionReason: undefined, publishedAt: l.publishedAt ?? reviewedAt }
      : { ...l, status: 'rejected' as const, reviewedAt, rejectionReason: reason };
  });

  await patchWorkspace(owner, { listings });

  await record({
    actorId: staff.id,
    actorEmail: staff.email,
    action: action === 'approve' ? 'listing.approved' : 'listing.rejected',
    subjectId: owner.id,
    subjectName: preferredName(workspace.profile.fullName || owner.fullName),
    listingRef: listing.reference,
    reason: reason || undefined,
  });

  return NextResponse.json({ ok: true, status: action === 'approve' ? 'published' : 'rejected' });
}
