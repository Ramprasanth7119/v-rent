/**
 * When an account may not be deleted.
 *
 * Deletion is the one action in the operations console that cannot be undone,
 * so the conditions that forbid it are written here rather than inline in the
 * route: they are the part worth testing, and a guard that lives in a handler
 * is a guard nobody reads again.
 *
 * Each refusal carries the sentence the officer sees. A refusal that only says
 * "forbidden" makes the officer try again in a different way, which is exactly
 * what should not happen with this action.
 *
 * Pure. No imports from the stores, so the tests need no database.
 */

export interface DeletionSubject {
  id: string;
  email: string;
  role: 'agent' | 'admin';
}

export interface DeletionRefusal {
  status: 400 | 403 | 404 | 409;
  code: 'bad_request' | 'forbidden' | 'not_found' | 'conflict';
  error: string;
}

/** A reason is required, and long enough to mean something in the audit trail. */
export const MIN_REASON = 10;
export const MAX_REASON = 500;

/**
 * The reason as it will be recorded, or null when it does not qualify.
 *
 * Trimmed and capped here so the route and the audit row cannot disagree about
 * what was actually stored.
 */
export function deletionReason(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const reason = raw.trim().slice(0, MAX_REASON);
  return reason.length >= MIN_REASON ? reason : null;
}

/**
 * Whether this officer may delete this account, and why not.
 *
 * `null` means go ahead.
 */
export function refuseDeletion(input: {
  staffId: string;
  subject: DeletionSubject | null;
  reason: string | null;
  /** The demonstration account, which the product re-creates on sign-in. */
  isDemoAccount: boolean;
}): DeletionRefusal | null {
  const { staffId, subject, reason, isDemoAccount } = input;

  // Same answer as every other admin route gives for an id it will not act on:
  // an account an officer may not delete is not an account they may enumerate.
  if (!subject || subject.role !== 'agent') {
    return { status: 404, code: 'not_found', error: 'No such agent.' };
  }

  if (subject.id === staffId) {
    return { status: 403, code: 'forbidden', error: 'An account cannot delete itself.' };
  }

  // Deleting it would appear to work and then undo itself, which is worse than
  // refusing: the account is seeded again from the environment at the next
  // sign-in, with a new id and an empty workspace.
  if (isDemoAccount) {
    return {
      status: 409,
      code: 'conflict',
      error: 'The demonstration account cannot be deleted. It is re-created from the environment at the next sign-in.',
    };
  }

  if (!reason) {
    return {
      status: 400,
      code: 'bad_request',
      error: `A reason of at least ${MIN_REASON} characters is required, and is recorded in the audit trail.`,
    };
  }

  return null;
}
