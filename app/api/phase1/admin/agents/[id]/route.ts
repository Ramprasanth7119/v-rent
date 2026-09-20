/**
 * POST   /api/phase1/admin/agents/{id}  { action: 'suspend' | 'reinstate', reason?: string }
 * DELETE /api/phase1/admin/agents/{id}  { reason: string }
 *
 * The one place staff write to somebody else's workspace. It is behind
 * `requireAdmin`, so an agent calling it with their own session gets a 404 for
 * the same reason the console itself does: the operations console does not
 * announce its own existence to people who may not open it.
 *
 * Suspension is written to the agent's workspace, which is the same record the
 * publish gate reads — so the effect is real. The agent keeps their account and
 * their listings; what they lose is the right to publish.
 *
 * Deletion is its own method rather than another string in `ACTIONS`, because
 * the two are not the same kind of decision and a typo between them should not
 * be able to cost somebody their listings. What it removes and what it refuses
 * to remove is in `lib/phase1/admin-delete`.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../../../lib/auth/session';
import { deleteAccount, findById } from '../../../../../../lib/auth/store';
import { deleteWorkspace, loadWorkspace, patchWorkspace, readWorkspace, isDemoAccount } from '../../../../../../lib/phase1/workspace-store';
import { deleteOwnerPhotos } from '../../../../../../lib/phase1/photo-store';
import { cloudinaryAccount, destroyVideo } from '../../../../../../lib/phase1/cloudinary';
import { deletionReason, refuseDeletion } from '../../../../../../lib/phase1/admin-delete';
import { record } from '../../../../../../lib/phase1/audit';
import { notify } from '../../../../../../lib/phase1/notify';
import { publicAccount } from '../../../../../../lib/auth/store';
import { preferredName } from '../../../../../../lib/phase1/workspace';
import { send } from '../../../../../../lib/mail';
import { logged } from '../../../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIONS = ['suspend', 'reinstate'] as const;
type Action = (typeof ACTIONS)[number];

async function POST_handler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await currentUser();
  if (!staff || staff.role !== 'admin') {
    return NextResponse.json({ error: 'Not found.', code: 'not_found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.', code: 'bad_request' }, { status: 400 });
  }

  const action = (body as { action?: string })?.action;
  if (!ACTIONS.includes(action as Action)) {
    return NextResponse.json({ error: 'Unknown action.', code: 'bad_request' }, { status: 400 });
  }

  const { id } = await params;
  const target = await findById(id);
  if (!target || target.role !== 'agent') {
    return NextResponse.json({ error: 'No such agent.', code: 'not_found' }, { status: 404 });
  }

  // Seed on demand: an account may never have opened the workspace it is
  // about to be suspended from.
  await loadWorkspace(target);
  const workspace = await patchWorkspace(target, {
    approval: action === 'suspend' ? 'suspended' : 'approved',
  });

  await record({
    actorId: staff.id,
    actorEmail: staff.email,
    action: action === 'suspend' ? 'agent.suspended' : 'agent.reinstated',
    subjectId: target.id,
    subjectName: preferredName(workspace.profile.fullName || target.fullName),
    reason: typeof (body as { reason?: string }).reason === 'string'
      ? String((body as { reason?: string }).reason).slice(0, 500)
      : undefined,
  });

  const origin = new URL(req.url).origin;
  await notify(publicAccount(target), action === 'suspend'
    ? {
        kind: 'cea',
        tone: 'danger',
        title: 'Your account has been suspended',
        body: 'Publication is withdrawn while the suspension stands. Your account and your listings are intact. Contact V-RENT if you believe this is wrong.',
        href: `${origin}/phase1/status`,
      }
    : {
        kind: 'cea',
        tone: 'success',
        title: 'Your account has been reinstated',
        body: 'Publication rights are restored. Your listings are where you left them.',
        href: `${origin}/phase1/listings`,
      });

  return NextResponse.json({ ok: true, approval: workspace.approval });
}

/**
 * Delete an agent: their account, their workspace and their photographs.
 *
 * The order matters. The agent is told first, while there is still an address
 * to tell — by email rather than through `notify`, which writes the notice into
 * the workspace this request is about to remove and would seed a new one to put
 * it in. Then what the account owned, then the account itself, so a failure
 * half way through leaves an account with less in it rather than orphaned
 * records with no account to explain them.
 *
 * The audit row is written last and is deliberately not removed with the rest:
 * it is the only remaining record that this account existed and who ended it.
 */
async function DELETE_handler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await currentUser();
  if (!staff || staff.role !== 'admin') {
    return NextResponse.json({ error: 'Not found.', code: 'not_found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.', code: 'bad_request' }, { status: 400 });
  }

  const { id } = await params;
  const target = await findById(id);
  const reason = deletionReason((body as { reason?: unknown })?.reason);

  const refusal = refuseDeletion({
    staffId: staff.id,
    subject: target ? { id: target.id, email: target.email, role: target.role } : null,
    reason,
    isDemoAccount: target ? isDemoAccount(target.email) : false,
  });
  if (refusal) {
    return NextResponse.json({ error: refusal.error, code: refusal.code }, { status: refusal.status });
  }

  /* No refusal means both of these are present; the guard is what establishes
     it, and re-testing them here would be unreachable code pretending not to
     be. */
  const account = target!;
  const why = reason!;

  // Read rather than load: an account that never opened a workspace should not
  // have one created for it on the way out.
  const workspace = await readWorkspace(account.id);
  const listings = workspace?.listings.length ?? 0;
  const name = preferredName(workspace?.profile.fullName || account.fullName);

  await send({
    to: account.email,
    subject: 'Your V-RENT account has been closed',
    body: [
      `Hello ${name},`,
      '',
      'Your V-RENT account has been closed by an administrator, and your listings have been withdrawn.',
      `Reason given: ${why}`,
      '',
      'If you believe this is wrong, reply to this message and it will be looked at.',
    ].join('\n'),
  }).catch(() => {
    /* An address that cannot be reached must not leave the account half deleted. */
  });

  const photos = await deleteOwnerPhotos(account.id);

  /* Videos are held by Cloudinary and billed by the gigabyte, so a closed
     account has to take them with it. Best effort: a media service that is
     down or unconfigured must not leave the account half deleted, and the
     count returned says how many actually went. */
  const videoIds = (workspace?.listings ?? []).filter((l) => l.video).map((l) => l.video!.publicId);
  const cloud = cloudinaryAccount();
  let videos = 0;
  if (cloud) {
    for (const publicId of videoIds) {
      if (await destroyVideo(publicId, cloud).catch(() => false)) videos += 1;
    }
  }

  await deleteWorkspace(account.id);
  await deleteAccount(account.id);

  await record({
    actorId: staff.id,
    actorEmail: staff.email,
    action: 'agent.deleted',
    subjectId: account.id,
    subjectName: name,
    reason: why,
  });

  return NextResponse.json({ ok: true, removed: { listings, photos, videos } });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
export const DELETE = logged(DELETE_handler);
