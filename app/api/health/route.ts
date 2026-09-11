/**
 * GET /api/health
 *
 * Is this instance configured and can it reach what it depends on.
 *
 * Written because the alternative is guessing. A deployment missing its
 * database or its signing key does not announce itself: it signs somebody in
 * and then loses them, or renders a page as though nobody is there. One request
 * that answers "what does this instance actually have" turns an afternoon of
 * that into a minute.
 *
 * It reports presence, never values. Whether a key is set is operational
 * information; what it is, is not.
 */

import { NextResponse } from 'next/server';
import { storeHealth, usingMongo } from '../../../lib/store/driver';
import { storageIsEphemeral, DATA_DIR } from '../../../lib/storage';
import { TODAY_ISO } from '../../../lib/phase1/workspace';
import { logged } from '../../../lib/phase1/reqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function GET_handler() {
  const storage = await storeHealth();

  const configured = {
    sessionSecret: Boolean(process.env.VRENT_SESSION_SECRET),
    database: usingMongo,
    operationsAccount: Boolean(process.env.VRENT_ADMIN_EMAIL && process.env.VRENT_ADMIN_PASSWORD),
    demoAgent: Boolean(process.env.VRENT_DEMO_AGENT_EMAIL && process.env.VRENT_DEMO_AGENT_PASSWORD),
    oneMap: Boolean(process.env.ONEMAP_TOKEN),
  };

  /* What will actually go wrong, in the words of what a person would see. */
  const problems: string[] = [];
  if (!storage.ok) {
    problems.push(`The database is not answering: ${storage.detail ?? 'unknown reason'}.`);
  }
  if (!configured.database && storageIsEphemeral) {
    problems.push(
      'No database is configured and this instance has no durable storage, so anything created '
      + 'will disappear when the instance recycles. Set MONGODB_URI.',
    );
  }
  if (!configured.sessionSecret && storageIsEphemeral && !configured.database) {
    problems.push('VRENT_SESSION_SECRET is not set, so sign-in will be refused.');
  }
  if (!configured.operationsAccount) {
    problems.push('No operations account is declared, so the console has nobody to sign in as.');
  }
  if (!configured.oneMap) {
    problems.push('ONEMAP_TOKEN is not set. Maps and address search still work; the neighbourhood '
      + 'lookup and the pin-drop address will say they are unconfigured.');
  }

  return NextResponse.json(
    {
      ok: storage.ok && problems.length === 0,
      today: TODAY_ISO,
      storage: {
        backend: storage.backend,
        reachable: storage.ok,
        responseMs: storage.ms,
        durable: !storageIsEphemeral || usingMongo,
        ...(storage.backend === 'files' ? { directory: DATA_DIR } : {}),
        ...(storage.detail && !storage.ok ? { detail: storage.detail } : {}),
      },
      configured,
      problems,
    },
    // Degraded rather than broken: the page still renders, so 200 with the list
    // is more use to whoever is looking than a status code they have to guess at.
    { status: storage.ok ? 200 : 503 },
  );
}

/* Recorded in the API activity log; see `lib/phase1/reqlog`. */
export const GET = logged(GET_handler);
