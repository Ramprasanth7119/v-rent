/**
 * GET /api/payments/intents/:ref — status poll for the PayNow screen.
 *
 * PayNow has no browser redirect to come back on: the agent scans a QR in their
 * banking app and this endpoint is how the page learns the money arrived. It is
 * a plain read with no provider call behind it, so a hundred pages polling it
 * every two seconds is fifty reads a second against an in-memory map.
 *
 * The response carries a Retry-After hint; the client backs off on it rather
 * than polling at a fixed rate.
 *
 * It is also where a paid-but-not-yet-handed-over purchase is settled. The
 * webhook grants what was bought, but a process that dies between accepting the
 * event and writing the balance would otherwise leave the agent paid up and
 * empty-handed. `fulfil` is keyed on the payment reference, so calling it here
 * costs one read when there is nothing to do and repairs that gap when there
 * is — on the screen the agent is still watching.
 */

import { NextResponse } from 'next/server';
import { fulfil, readIntent, toPublicIntent } from '../../../../../lib/payments/service';
import { TERMINAL } from '../../../../../lib/payments/types';
import { logged } from '../../../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function GET_handler(_req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const intent = readIntent(ref);

  if (!intent) {
    return NextResponse.json(
      { error: 'No such payment', code: 'not_found' },
      { status: 404, headers: { 'cache-control': 'no-store' } },
    );
  }

  if (intent.status === 'paid') await fulfil(intent);

  const settled = TERMINAL.includes(intent.status);
  return NextResponse.json(
    { ...toPublicIntent(intent), settled },
    {
      status: 200,
      headers: {
        'cache-control': 'no-store',
        // Slow the client down once the QR is open; stop it once we are terminal.
        'retry-after': settled ? '0' : '2',
      },
    },
  );
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
