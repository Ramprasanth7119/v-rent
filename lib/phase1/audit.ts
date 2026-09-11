/**
 * Who did what, to whom, and when.
 *
 * Staff can suspend an agent, refuse an application and take a listing down.
 * Each of those decides whether somebody may earn a living this week, so each
 * one is written down — with the officer who made it, not just the fact that it
 * happened. Without that, "the platform suspended me" has no answer.
 *
 * Append-only by construction: nothing here updates or deletes a row. The file
 * is read newest-first and trimmed only at the far end, so a decision cannot be
 * quietly revised after the fact.
 *
 * Server only.
 */

import { randomUUID } from 'node:crypto';
import type { AuditRow } from './audit-labels';
import { store } from '../store/driver';

export type { AuditAction, AuditRow } from './audit-labels';
export { ACTION_LABEL, IS_ADVERSE } from './audit-labels';

/** Beyond this the oldest rows are dropped. Production keeps them all, elsewhere. */
const MAX_ROWS = 5000;

const rows = store<AuditRow>('audit');

/**
 * Write one decision.
 *
 * Deliberately never throws: an audit write failing must not turn a completed
 * suspension into an error the officer retries, leaving two suspensions and one
 * confused agent. A failure is logged and the action stands.
 */
export async function record(row: Omit<AuditRow, 'id' | 'at'>): Promise<void> {
  try {
    /* An insert rather than a rewrite of the whole table, which is what
       append-only should have meant all along: two officers deciding at the
       same moment can no longer overwrite each other's row. */
    await rows.appendCapped(
      [{ ...row, id: randomUUID(), at: new Date().toISOString() }],
      MAX_ROWS,
      'at',
    );
  } catch (err) {
    console.error('[v-rent] audit write failed', err);
  }
}

/** Newest first. */
export async function readAudit(limit = 200): Promise<AuditRow[]> {
  return rows.list({ sort: { field: 'at', dir: -1 }, limit });
}
