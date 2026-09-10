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
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { KeyedMutex } from '../payments/concurrency';
import type { AuditRow } from './audit-labels';

export type { AuditAction, AuditRow } from './audit-labels';
export { ACTION_LABEL, IS_ADVERSE } from './audit-labels';

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DATA_DIR, 'audit.json');

/** Beyond this the oldest rows are dropped. Production keeps them all, elsewhere. */
const MAX_ROWS = 5000;

/** One writer at a time; the file is small and rewritten whole. */
const lock = new KeyedMutex();

async function readAll(): Promise<AuditRow[]> {
  try {
    const parsed = JSON.parse(await readFile(FILE, 'utf8')) as { rows?: AuditRow[] };
    return parsed.rows ?? [];
  } catch {
    return [];
  }
}

async function writeAll(rows: AuditRow[]) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify({ rows }, null, 2), 'utf8');
  await rename(tmp, FILE);
}

/**
 * Write one decision.
 *
 * Deliberately never throws: an audit write failing must not turn a completed
 * suspension into an error the officer retries, leaving two suspensions and one
 * confused agent. A failure is logged and the action stands.
 */
export async function record(row: Omit<AuditRow, 'id' | 'at'>): Promise<void> {
  try {
    await lock.run('audit', async () => {
      const rows = await readAll();
      rows.push({ ...row, id: randomUUID(), at: new Date().toISOString() });
      await writeAll(rows.slice(-MAX_ROWS));
    });
  } catch (err) {
    console.error('[v-rent] audit write failed', err);
  }
}

/** Newest first. */
export async function readAudit(limit = 200): Promise<AuditRow[]> {
  const rows = await readAll();
  return rows.slice(-limit).reverse();
}
