/**
 * POST /api/phase1/admin/verification
 *   { accountId, action: 'approve' | 'reject', reason? }
 *
 * A verification officer's decision on an application. Approving lets the agent
 * publish; rejecting does not delete the account, it withholds the right to
 * advertise — the agent keeps their drafts and can correct whatever was wrong.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../../lib/auth/session';
import { findById } from '../../../../../lib/auth/store';
import { loadWorkspace, patchWorkspace } from '../../../../../lib/phase1/workspace-store';
import { record } from '../../../../../lib/phase1/audit';
import { notify } from '../../../../../lib/phase1/notify';
import { publicAccount } from '../../../../../lib/auth/store';
import { preferredName } from '../../../../../lib/phase1/workspace';
import { logged } from '../../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const notFound = () => NextResponse.json({ error: 'Not found.', code: 'not_found' }, { status: 404 });

async function POST_handler(req: Request) {
  const staff = await currentUser();
  if (!staff || staff.role !== 'admin') return notFound();

  let body: { accountId?: string; action?: string; reason?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.', code: 'bad_request' }, { status: 400 });
  }

  const { accountId, action } = body;
  if (!accountId || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'Unknown action.', code: 'bad_request' }, { status: 400 });
  }
  const reason = (body.reason ?? '').trim().slice(0, 500);
  if (action === 'reject' && !reason) {
    return NextResponse.json(
      { error: 'A rejection needs a reason — the agent has to know what to correct.', code: 'reason_required' },
      { status: 400 },
    );
  }

  const target = await findById(accountId);
  if (!target || target.role !== 'agent') return notFound();

  await loadWorkspace(target);
  const workspace = await patchWorkspace(target, {
    approval: action === 'approve' ? 'approved' : 'rejected',
  });

  await record({
    actorId: staff.id,
    actorEmail: staff.email,
    action: action === 'approve' ? 'application.approved' : 'application.rejected',
    subjectId: target.id,
    subjectName: preferredName(workspace.profile.fullName || target.fullName),
    reason: reason || undefined,
  });

  const origin = new URL(req.url).origin;
  await notify(publicAccount(target), action === 'approve'
    ? {
        kind: 'cea',
        tone: 'success',
        title: 'Your V-RENT account is verified',
        body: 'A verification officer has confirmed your CEA registration. Choose a plan and you can publish.',
        href: `${origin}/phase1/plans`,
      }
    : {
        kind: 'cea',
        tone: 'danger',
        title: 'Your application was not approved',
        body: `${reason} Correct what is wrong and the application can be looked at again.`,
        href: `${origin}/phase1/status`,
      });

  return NextResponse.json({ ok: true, approval: workspace.approval });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
