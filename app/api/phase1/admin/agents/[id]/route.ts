/**
 * POST /api/phase1/admin/agents/{id}  { action: 'suspend' | 'reinstate', reason?: string }
 *
 * The one place staff write to somebody else's workspace. It is behind
 * `requireAdmin`, so an agent calling it with their own session gets a 404 for
 * the same reason the console itself does: the operations console does not
 * announce its own existence to people who may not open it.
 *
 * Suspension is written to the agent's workspace, which is the same record the
 * publish gate reads — so the effect is real. The agent keeps their account and
 * their listings; what they lose is the right to publish.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../../../lib/auth/session';
import { findById } from '../../../../../../lib/auth/store';
import { loadWorkspace, patchWorkspace } from '../../../../../../lib/phase1/workspace-store';
import { record } from '../../../../../../lib/phase1/audit';
import { notify } from '../../../../../../lib/phase1/notify';
import { publicAccount } from '../../../../../../lib/auth/store';
import { preferredName } from '../../../../../../lib/phase1/workspace';
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

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
