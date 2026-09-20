/**
 * Deleting an agent.
 *
 * The only irreversible decision in the operations console, so what stops it is
 * worth pinning down: an officer cannot delete themselves, cannot delete the
 * demonstration account the product re-creates anyway, and cannot delete
 * anybody without leaving a reason behind — the audit row is all that survives
 * the account, and a row reading "deleted" with no reason answers nothing.
 */

import { describe, expect, it } from 'vitest';
import {
  MIN_REASON, deletionReason, refuseDeletion, type DeletionSubject,
} from '../lib/phase1/admin-delete';

const agent: DeletionSubject = { id: 'acc-1', email: 'agent@example.sg', role: 'agent' };
const STAFF = 'staff-9';
const REASON = 'Duplicate registration created in error.';

const refusal = (over: Partial<Parameters<typeof refuseDeletion>[0]> = {}) =>
  refuseDeletion({ staffId: STAFF, subject: agent, reason: REASON, isDemoAccount: false, ...over });

describe('the reason', () => {
  it('is required, and a token word is not one', () => {
    expect(deletionReason('spam')).toBeNull();
    expect(deletionReason('   ')).toBeNull();
    expect(deletionReason(undefined)).toBeNull();
    expect(deletionReason(42)).toBeNull();
  });

  it('is trimmed, and kept once it says something', () => {
    expect(deletionReason(`  ${REASON}  `)).toBe(REASON);
    expect(deletionReason('x'.repeat(MIN_REASON))).toHaveLength(MIN_REASON);
  });

  it('is capped, so one paste cannot fill the audit trail', () => {
    expect(deletionReason('x'.repeat(5000))).toHaveLength(500);
  });
});

describe('who may be deleted', () => {
  it('lets an officer delete an agent who has given a reason', () => {
    expect(refusal()).toBeNull();
  });

  it('refuses without a reason, and says how long one has to be', () => {
    const r = refusal({ reason: null });
    expect(r?.status).toBe(400);
    expect(r?.error).toContain(String(MIN_REASON));
  });

  it('refuses an account that does not exist, without confirming that it does not', () => {
    expect(refusal({ subject: null })).toMatchObject({ status: 404, code: 'not_found' });
  });

  it('refuses an administrator, through the same answer it gives a stranger', () => {
    const r = refusal({ subject: { ...agent, role: 'admin' } });
    expect(r).toMatchObject({ status: 404 });
    expect(r?.error).not.toContain('admin');
  });

  it('refuses an officer deleting their own account', () => {
    expect(refusal({ subject: { ...agent, id: STAFF } })).toMatchObject({ status: 403, code: 'forbidden' });
  });

  it('refuses the demonstration account, and explains why it would come back', () => {
    const r = refusal({ isDemoAccount: true });
    expect(r?.status).toBe(409);
    expect(r?.error).toContain('re-created');
  });

  /* The order matters on screen: an officer who is about to be told "you cannot
     delete this one at all" should not first be asked to write a reason. */
  it('names the impossible before the incomplete', () => {
    expect(refusal({ isDemoAccount: true, reason: null })?.status).toBe(409);
    expect(refusal({ subject: { ...agent, id: STAFF }, reason: null })?.status).toBe(403);
  });
});
