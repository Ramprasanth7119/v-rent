/**
 * GET /api/cea/lookup?registration=R062805D
 * GET /api/cea/lookup?name=jeremy%20wang
 *
 * Live check against the CEA Salesperson register on data.gov.sg. Proxied
 * rather than called from the browser so the request is rate limited, the
 * response shape is ours, and a future token stays server-side.
 */

import { NextResponse } from 'next/server';
import { TokenBucket } from '../../../../lib/payments/concurrency';
import { daysUntilExpiry, displayAgency, displayName, lookupRegistration, searchByName } from '../../../../lib/auth/cea';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Generous for a person typing, tight enough to stop a scrape of the register. */
const limiter = new TokenBucket(12, 0.5);

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

export async function GET(req: Request) {
  const retryAfter = limiter.take(clientKey(req));
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: 'Too many lookups. Wait a moment and try again.', code: 'rate_limited' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    );
  }

  const url = new URL(req.url);
  const registration = url.searchParams.get('registration');
  const name = url.searchParams.get('name');

  if (registration) {
    const result = await lookupRegistration(registration);
    if (result.status === 'unavailable') {
      return NextResponse.json(
        { error: 'The CEA register is not responding. Try again in a moment.', code: 'register_unavailable' },
        { status: 503 },
      );
    }
    if (result.status === 'not_found') {
      return NextResponse.json({
        status: 'not_found',
        registrationNo: result.registrationNo,
        checkedAt: result.checkedAt,
      });
    }
    const days = daysUntilExpiry(result.record);
    return NextResponse.json({
      status: 'found',
      checkedAt: result.checkedAt,
      record: result.record,
      display: {
        name: displayName(result.record.name),
        agency: displayAgency(result.record.agencyName),
        daysUntilExpiry: days,
        expiringSoon: days !== null && days <= 60,
      },
    });
  }

  if (name) {
    const records = await searchByName(name);
    return NextResponse.json({
      status: 'ok',
      results: records.map((r) => ({
        record: r,
        display: { name: displayName(r.name), agency: displayAgency(r.agencyName) },
      })),
    });
  }

  return NextResponse.json(
    { error: 'Provide either a registration number or a name.', code: 'bad_request' },
    { status: 400 },
  );
}
