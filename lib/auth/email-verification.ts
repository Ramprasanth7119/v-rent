/**
 * Confirming that an email address belongs to the person who typed it.
 *
 * A single-use token, hashed before it is stored, with an expiry — the same
 * shape as a password reset, and for the same reason: whoever can read the
 * database must not be able to confirm somebody else's address, and a link
 * that leaks from an inbox a year later must not still work.
 *
 * Delivery is separate (`lib/mail`), because in a POC there is no mail
 * provider connected and the message goes to an outbox on disk instead.
 */

import { createHash, randomBytes } from 'node:crypto';
import { Account, readAccounts, writeAccounts } from './store';

/** A link is good for a day. Long enough for an email to be read after work. */
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** A new token may be asked for this often, no matter how many times the button is pressed. */
export const RESEND_INTERVAL_MS = 60 * 1000;

export interface EmailVerification {
  tokenHash: string;
  expiresAt: string;
  sentAt: string;
  /** The address it was sent to, so changing the address invalidates the link. */
  sentTo: string;
}

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export type IssueResult =
  | { ok: true; token: string; expiresAt: string }
  | { ok: false; reason: 'already_verified' | 'too_soon'; retryInSeconds?: number };

/** Issue a fresh token, replacing any outstanding one. */
export async function issueToken(accountId: string): Promise<IssueResult> {
  const data = await readAccounts();
  const account = data.accounts.find((a) => a.id === accountId);
  if (!account) return { ok: false, reason: 'already_verified' };
  if (account.emailVerifiedAt) return { ok: false, reason: 'already_verified' };

  const existing = account.emailVerification;
  if (existing) {
    const since = Date.now() - new Date(existing.sentAt).getTime();
    if (since < RESEND_INTERVAL_MS) {
      return { ok: false, reason: 'too_soon', retryInSeconds: Math.ceil((RESEND_INTERVAL_MS - since) / 1000) };
    }
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  account.emailVerification = {
    tokenHash: hash(token),
    expiresAt,
    sentAt: new Date().toISOString(),
    sentTo: account.email,
  };
  await writeAccounts(data);
  return { ok: true, token, expiresAt };
}

export type ConfirmResult =
  | { ok: true; account: Account }
  | { ok: false; reason: 'unknown' | 'expired' | 'address_changed' };

/**
 * Confirm a token.
 *
 * The token is looked up by its hash, so a stolen database is not a set of
 * working links. It is cleared on use, which makes it single-use.
 */
export async function confirmToken(token: string): Promise<ConfirmResult> {
  if (!token || token.length < 20) return { ok: false, reason: 'unknown' };

  const data = await readAccounts();
  const target = hash(token);
  const account = data.accounts.find((a) => a.emailVerification?.tokenHash === target);
  if (!account?.emailVerification) return { ok: false, reason: 'unknown' };

  const record = account.emailVerification;
  if (record.sentTo !== account.email) {
    delete account.emailVerification;
    await writeAccounts(data);
    return { ok: false, reason: 'address_changed' };
  }
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    delete account.emailVerification;
    await writeAccounts(data);
    return { ok: false, reason: 'expired' };
  }

  account.emailVerifiedAt = new Date().toISOString();
  delete account.emailVerification;
  await writeAccounts(data);
  return { ok: true, account };
}
