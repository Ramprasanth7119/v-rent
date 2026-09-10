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
 */

import { NextResponse } from 'next/server';
import { readIntent, toPublicIntent } from '../../../../../lib/payments/service';
import { TERMINAL } from '../../../../../lib/payments/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const intent = readIntent(ref);

  if (!intent) {
    return NextResponse.json(
      { error: 'No such payment', code: 'not_found' },
      { status: 404, headers: { 'cache-control': 'no-store' } },
    );
  }

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
