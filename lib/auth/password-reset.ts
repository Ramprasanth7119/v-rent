/**
 * Forgetting a password, and getting back in.
 *
 * The same shape as email confirmation, for the same reasons: a single-use
 * token, hashed before storage so a leaked database is not a set of working
 * links, and an expiry short enough that a link found in an old inbox is dead.
 *
 * The one difference is what happens when the address is not on the platform.
 * Nothing visible: the route answers identically either way, because a
 * password-reset form that says "no such account" is a tool for finding out who
 * has one.
 */

import { createHash, randomBytes } from 'node:crypto';
import { Account, hashPassword, passwordProblem, readAccounts, writeAccounts } from './store';

/** An hour. A reset link is used within minutes or not at all. */
export const RESET_TTL_MS = 60 * 60 * 1000;

/** One link a minute, however many times the button is pressed. */
export const RESET_INTERVAL_MS = 60 * 1000;

export interface PasswordReset {
  tokenHash: string;
  expiresAt: string;
  sentAt: string;
  /** Invalidates the link if the address changes before it is used. */
  sentTo: string;
}

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Issue a token, or quietly do nothing.
 *
 * Returns the token only when there is an account and it is not being asked for
 * too often. The caller must answer the same way regardless.
 */
export async function issueReset(email: string): Promise<{ token: string; account: Account } | null> {
  const data = await readAccounts();
  const target = email.trim().toLowerCase();
  const account = data.accounts.find((a) => a.email === target);
  if (!account) return null;

  const existing = account.passwordReset;
  if (existing && Date.now() - new Date(existing.sentAt).getTime() < RESET_INTERVAL_MS) return null;

  const token = randomBytes(32).toString('base64url');
  account.passwordReset = {
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString(),
    sentAt: new Date().toISOString(),
    sentTo: account.email,
  };
  await writeAccounts(data);
  return { token, account };
}

export type ResetOutcome =
  | { ok: true; email: string }
  | { ok: false; reason: 'unknown' | 'expired' | 'address_changed' | 'weak'; message: string };

/** Spend the token and set the new password. */
export async function completeReset(token: string, password: string): Promise<ResetOutcome> {
  if (!token || token.length < 20) {
    return { ok: false, reason: 'unknown', message: 'That link is not valid. Ask for a new one.' };
  }

  const weak = passwordProblem(password);
  if (weak) return { ok: false, reason: 'weak', message: weak };

  const data = await readAccounts();
  const account = data.accounts.find((a) => a.passwordReset?.tokenHash === hash(token));
  if (!account?.passwordReset) {
    return { ok: false, reason: 'unknown', message: 'That link has already been used. Ask for a new one.' };
  }

  const record = account.passwordReset;
  if (record.sentTo !== account.email) {
    delete account.passwordReset;
    await writeAccounts(data);
    return { ok: false, reason: 'address_changed', message: 'The address on this account changed after that link was sent.' };
  }
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    delete account.passwordReset;
    await writeAccounts(data);
    return { ok: false, reason: 'expired', message: 'That link has expired. Ask for a new one.' };
  }

  const { passwordHash, passwordSalt } = await hashPassword(password);
  account.passwordHash = passwordHash;
  account.passwordSalt = passwordSalt;
  delete account.passwordReset;
  // Someone who has just proved they hold the address should not then be
  // locked out by attempts made while they were locked out.
  delete account.failedAttempts;
  delete account.lockedUntil;
  await writeAccounts(data);

  return { ok: true, email: account.email };
}

/* ------------------------------------------------------------------ lockout */

/** Five wrong passwords, then a quarter of an hour. */
export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 15 * 60 * 1000;

export const isLocked = (account: Account): boolean =>
  Boolean(account.lockedUntil && new Date(account.lockedUntil).getTime() > Date.now());

/**
 * Record a failed sign-in, locking the account once there have been enough.
 *
 * Per account rather than per address, so an attacker cannot lock somebody out
 * by moving between networks, and cannot spread attempts across networks to
 * avoid it either.
 */
export async function recordFailure(accountId: string): Promise<void> {
  const data = await readAccounts();
  const account = data.accounts.find((a) => a.id === accountId);
  if (!account) return;

  const attempts = (account.failedAttempts ?? 0) + 1;
  account.failedAttempts = attempts;
  if (attempts >= MAX_ATTEMPTS) {
    account.lockedUntil = new Date(Date.now() + LOCK_MS).toISOString();
    account.failedAttempts = 0;
  }
  await writeAccounts(data);
}

/** A correct password clears the count. */
export async function clearFailures(accountId: string): Promise<void> {
  const data = await readAccounts();
  const account = data.accounts.find((a) => a.id === accountId);
  if (!account || (!account.failedAttempts && !account.lockedUntil)) return;
  delete account.failedAttempts;
  delete account.lockedUntil;
  await writeAccounts(data);
}
