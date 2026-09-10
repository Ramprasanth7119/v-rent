/**
 * How an audit row reads on screen.
 *
 * Separate from `audit.ts` because that module touches the filesystem and this
 * one is needed in the browser: a client component importing the writer would
 * drag `node:fs` into the bundle.
 */

export type AuditAction =
  | 'agent.suspended'
  | 'agent.reinstated'
  | 'application.approved'
  | 'application.rejected'
  | 'listing.approved'
  | 'listing.rejected';

export interface AuditRow {
  id: string;
  at: string;
  /** The staff account that made the decision. */
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  /** The agent the decision was about. */
  subjectId: string;
  subjectName: string;
  /** The listing, where the decision was about one. */
  listingRef?: string;
  /** The reason given, for decisions that require one. */
  reason?: string;
}

export const ACTION_LABEL: Record<AuditAction, string> = {
  'agent.suspended': 'Agent suspended',
  'agent.reinstated': 'Agent reinstated',
  'application.approved': 'Application approved',
  'application.rejected': 'Application rejected',
  'listing.approved': 'Listing approved',
  'listing.rejected': 'Listing rejected',
};

/** Whether a row records something being withheld, for how it is shown. */
export const IS_ADVERSE: Record<AuditAction, boolean> = {
  'agent.suspended': true,
  'agent.reinstated': false,
  'application.approved': false,
  'application.rejected': true,
  'listing.approved': false,
  'listing.rejected': true,
};
