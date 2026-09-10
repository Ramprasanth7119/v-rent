/**
 * When a CEA match is enough on its own, and when a person still looks.
 *
 * V-RENT only admits registered salespersons, and the registration number is
 * checked against the CEA register at sign-up — so the obvious question is why
 * an officer is needed at all. The answer is that a register match proves the
 * number is real, not that the person typing it is the one it belongs to. While
 * the platform is small that gap is worth a minute of somebody's time; once
 * there are enough agents for a minute each to be a full-time job, the match
 * carries the decision on its own.
 *
 * So: below the threshold every application is reviewed by hand. Above it, an
 * exact register match approves immediately and the queue is kept for the ones
 * that do not match cleanly.
 *
 * Server only: it counts accounts.
 */

import { listAccounts } from '../auth/store';

/** Applications are reviewed by hand until the platform passes this many agents. */
export const MANUAL_REVIEW_THRESHOLD = 25;

export interface VerificationPolicy {
  /** Agent accounts on the platform right now. */
  agentCount: number;
  threshold: number;
  /** True once the platform has outgrown reviewing every application by hand. */
  autoApprove: boolean;
  /** How many more agents before auto-approval switches on. */
  remaining: number;
}

export function decide(agentCount: number): VerificationPolicy {
  return {
    agentCount,
    threshold: MANUAL_REVIEW_THRESHOLD,
    autoApprove: agentCount > MANUAL_REVIEW_THRESHOLD,
    remaining: Math.max(0, MANUAL_REVIEW_THRESHOLD - agentCount + 1),
  };
}

export async function verificationPolicy(): Promise<VerificationPolicy> {
  const agents = (await listAccounts()).filter((a) => a.role === 'agent');
  return decide(agents.length);
}
