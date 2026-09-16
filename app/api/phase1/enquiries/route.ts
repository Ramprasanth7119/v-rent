/**
 * POST /api/phase1/enquiries — a tenant asks about a listing.
 *
 * Public, because the person sending it has no account and will never have one.
 * That makes this the one write path in V-RENT open to the world, so the
 * constraints are tighter than anywhere else: only a listing that is actually
 * published accepts an enquiry, the body is capped hard, and the rate limiter
 * is per address rather than per account.
 *
 * The enquiry lands in the owning agent's workspace, which is the only place it
 * exists — it carries a stranger's name and telephone number, given to one
 * agent about one flat.
 */

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { TokenBucket } from '../../../../lib/payments/concurrency';
import { findById } from '../../../../lib/auth/store';
import { loadWorkspace, patchWorkspace, readWorkspace } from '../../../../lib/phase1/workspace-store';
import { Enquiry } from '../../../../lib/phase1/workspace';
import { notify } from '../../../../lib/phase1/notify';
import { publicAccount } from '../../../../lib/auth/store';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Six enquiries, then one every two minutes. A person sends one; a script sends thousands. */
const limiter = new TokenBucket(6, 1 / 120);

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function POST_handler(req: Request) {
  const retryAfter = limiter.take(clientKey(req));
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: 'That is a lot of enquiries at once. Try again in a few minutes.', code: 'rate_limited' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.', code: 'bad_request' }, { status: 400 });
  }

  const ownerId = str(body.ownerId, 64);
  const listingId = str(body.listingId, 64);
  const name = str(body.name, 120);
  const contact = str(body.contact, 120);
  const message = str(body.message, 2000);

  if (!name || !contact || !message) {
    return NextResponse.json(
      { error: 'A name, a way to reach you, and a message are all needed.', code: 'incomplete' },
      { status: 400 },
    );
  }

  // The listing decides whether this is even a valid place to write to. A draft
  // or a rejected listing is not advertised, so nothing may arrive against it.
  const workspace = await readWorkspace(ownerId);
  const listing = workspace?.listings.find((l) => l.id === listingId && !l.archived);
  if (!listing || (listing.status !== 'published' && listing.status !== 'paused')) {
    return NextResponse.json({ error: 'That listing is not taking enquiries.', code: 'not_found' }, { status: 404 });
  }

  const owner = await findById(ownerId);
  if (!owner) {
    return NextResponse.json({ error: 'That listing is not taking enquiries.', code: 'not_found' }, { status: 404 });
  }

  const enquiry: Enquiry = {
    id: `enq-${randomUUID().slice(0, 8)}`,
    listingId,
    name,
    contact,
    message,
    at: new Date().toISOString().slice(0, 16).replace('T', ' '),
    channel: 'V-RENT',
    status: 'new',
    moveIn: str(body.moveIn, 24) || undefined,
    budget: typeof body.budget === 'number' && Number.isFinite(body.budget) ? Math.round(body.budget) : undefined,
  };

  const current = await loadWorkspace(owner);
  await patchWorkspace(owner, { enquiries: [enquiry, ...current.enquiries].slice(0, 500) });

  const origin = new URL(req.url).origin;
  await notify(publicAccount(owner), {
    kind: 'enquiry',
    tone: 'info',
    title: `New enquiry about ${listing.project} ${listing.unitNo}`,
    body: `${name} asked: ${message.slice(0, 160)}${message.length > 160 ? '…' : ''}`,
    href: `${origin}/phase1/enquiries?enquiry=${encodeURIComponent(enquiry.id)}`,
  });

  return NextResponse.json({ ok: true });
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const POST = logged(POST_handler);
