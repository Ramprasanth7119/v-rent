/**
 * GET /api/phase1/competing?id=lst-3
 *
 * The live V-RENT listings one of the agent's own properties competes with:
 * the same deal, kind of home, bedroom count and size band.
 *
 * The property is read from the signed-in agent's own workspace, so the id
 * cannot be used to ask about somebody else's listing. What comes back is
 * figures only — development, district, size, asking price, days live — and
 * never who is advertising, the rule the unit lookup already applies. The
 * same unit advertised by another agency is left out: it is this property,
 * not a competitor.
 */

import { NextResponse } from 'next/server';
import { currentUser } from '../../../../lib/auth/session';
import { readWorkspace } from '../../../../lib/phase1/workspace-store';
import { marketListings } from '../../../../lib/phase1/marketplace';
import { competingSet, toActive } from '../../../../lib/phase1/report-insights';
import { logged } from '../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const unitKey = (postal: string, unit: string) => `${postal.trim()}|${unit.replace(/[\s#]/g, '').toUpperCase()}`;

async function GET_handler(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to continue.', code: 'unauthorised' }, { status: 401 });
  }
  const id = (new URL(req.url).searchParams.get('id') ?? '').trim().slice(0, 64);
  if (!id) {
    return NextResponse.json({ error: 'A listing is needed.', code: 'bad_request' }, { status: 400 });
  }

  try {
    const own = await readWorkspace(user.id);
    const target = own?.listings.find((l) => l.id === id && !l.archived);
    if (!target) {
      return NextResponse.json({ error: 'That listing is not in your workspace.', code: 'not_found' }, { status: 404 });
    }
    const hasUnit = Boolean(target.unitNo?.trim()) && target.unitNo.trim() !== '—';
    const self = unitKey(target.postalCode, target.unitNo ?? '');
    const pool = (await marketListings())
      .filter((m) => !(m.ownerId === user.id && m.listing.id === target.id))
      .filter((m) => !(hasUnit && unitKey(m.listing.postalCode, m.listing.unitNo ?? '') === self))
      .map((m) => toActive(m.listing));
    return NextResponse.json(competingSet(target, pool, new Date()));
  } catch (err) {
    console.error('[v-rent] competing listings failed:', err);
    return NextResponse.json({ error: 'Live listings could not be read just now.', code: 'unavailable' }, { status: 503 });
  }
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
