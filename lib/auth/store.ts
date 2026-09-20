/**
 * Account store for the V-RENT proof of concept.
 *
 * Accounts are real: a password is hashed with scrypt and never stored, the
 * record persists across restarts, and an account that exists can only be
 * signed into. The storage itself is a JSON file rather than a database,
 * because the POC is judged on the flows and not on the persistence layer.
 * Everything here is behind one small interface, so the production swap is
 * this file and nothing else.
 */

import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { displayAgency, displayName, lookupRegistration, type CeaRecord } from './cea';
import type { EmailVerification } from './email-verification';
import type { PasswordReset } from './password-reset';
import { storageIsEphemeral } from '../storage';
import { store, usingMongo } from '../store/driver';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export type Role = 'agent' | 'admin';

/** What the register said at the moment the account was verified. */
export interface CeaSnapshot extends CeaRecord {
  verifiedAt: string;
}

export interface Account {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  mobile: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  lastLoginAt?: string;
  /** Set when the address was confirmed from a link sent to it. */
  emailVerifiedAt?: string;
  /** The outstanding confirmation token, hashed. Cleared once used. */
  emailVerification?: EmailVerification;
  /** The outstanding password-reset token, hashed. Cleared once used. */
  passwordReset?: PasswordReset;
  /** Consecutive wrong passwords. Cleared by a correct one. */
  failedAttempts?: number;
  /** Set once there have been too many. Sign-in is refused until it passes. */
  lockedUntil?: string;
  /** Present for agents; admins have no CEA registration. */
  cea?: CeaSnapshot;
}

/** An account as it may be sent to the browser. Never includes the hash. */
export interface PublicAccount {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  mobile: string;
  createdAt: string;
  emailVerifiedAt?: string;
  cea?: CeaSnapshot;
}

export const publicAccount = (a: Account): PublicAccount => ({
  id: a.id,
  email: a.email,
  role: a.role,
  fullName: a.fullName,
  mobile: a.mobile,
  createdAt: a.createdAt,
  emailVerifiedAt: a.emailVerifiedAt,
  cea: a.cea,
});

/* --------------------------------------------------------------- passwords */

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return { passwordHash: hash.toString('hex'), passwordSalt: salt.toString('hex') };
}

export async function verifyPassword(password: string, account: Account) {
  const salt = Buffer.from(account.passwordSalt, 'hex');
  const expected = Buffer.from(account.passwordHash, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  // Constant-time: a length mismatch must not short-circuit either.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** The rules the sign-up form shows, applied again on the server. */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) return 'Password must be at least 12 characters.';
  if (/^[0-9]+$/.test(password)) return 'Password cannot be only numbers.';
  if (['password1234', 'qwertyuiop12', '123456789012'].includes(password.toLowerCase())) {
    return 'That password is too common. Choose another.';
  }
  return null;
}

/* ------------------------------------------------------------------- store */

const accounts = store<Account>('accounts');

/** Single values the product keeps: the signing key, and little else. */
const settings = store<{ id: string; value: string }>('settings');

/**
 * The whole table, for the few callers that genuinely need it.
 *
 * Kept because two of them walk every account to answer a question the store
 * cannot: which accounts are pending review, and how many exist. At the scale
 * this product is built for that is a handful of documents, and a query that
 * matched the question would be a second thing to keep correct.
 */
export interface FileShape {
  accounts: Account[];
}

export async function readAccounts(): Promise<FileShape> {
  return { accounts: await accounts.list() };
}

export async function writeAccounts(data: FileShape): Promise<void> {
  // Whole-table writes exist only for the callers above, which change one
  // account at a time. Writing each is correct and avoids a delete-and-restore
  // window where the table is empty.
  await Promise.all(data.accounts.map((a) => accounts.put(a)));
}

const normalise = (email: string) => email.trim().toLowerCase();

export async function findByEmail(email: string): Promise<Account | undefined> {
  return (await accounts.findOne({ email: normalise(email) })) ?? undefined;
}

export async function findById(id: string): Promise<Account | undefined> {
  return (await accounts.get(id)) ?? undefined;
}

export async function findByCea(registrationNo: string): Promise<Account | undefined> {
  const target = registrationNo.trim().toUpperCase();
  return (await accounts.findOne({ 'cea.registrationNo': target })) ?? undefined;
}

export async function createAccount(input: {
  email: string;
  password: string;
  fullName: string;
  mobile: string;
  role?: Role;
  cea?: CeaSnapshot;
}): Promise<Account> {
  const email = normalise(input.email);
  if (await accounts.findOne({ email })) {
    throw new Error('An account with this email address already exists.');
  }
  const { passwordHash, passwordSalt } = await hashPassword(input.password);
  const account: Account = {
    id: randomUUID(),
    email,
    role: input.role ?? 'agent',
    fullName: input.fullName.trim(),
    mobile: input.mobile.trim(),
    passwordHash,
    passwordSalt,
    createdAt: new Date().toISOString(),
    cea: input.cea,
  };
  await accounts.put(account);
  return account;
}

export async function recordLogin(id: string) {
  await accounts.patch(id, { lastLoginAt: new Date().toISOString() });
}

/**
 * Remove an account outright.
 *
 * Suspension is the usual answer to an agent who should not be advertising: it
 * keeps the record, it can be undone, and it leaves the audit trail able to
 * explain itself. This is for the case suspension does not cover — an account
 * that should never have existed, or one whose owner has asked to be forgotten.
 *
 * It removes the account and nothing else. What the account owned is the
 * caller's to clear, because only the caller knows what it is willing to lose.
 */
export async function deleteAccount(id: string): Promise<void> {
  await accounts.remove(id);
}

/** Admin-only: every registered agent. */
export async function listAccounts(): Promise<PublicAccount[]> {
  const all = await accounts.list({ sort: { field: 'createdAt', dir: -1 } });
  return all.map(publicAccount);
}

/* ------------------------------------------------------------------ secret */

/**
 * The cookie signing key.
 *
 * From the environment when one is set. Otherwise generated once and written
 * beside the data, so there is never a guessable key committed in source and a
 * laptop needs no configuration to work.
 *
 * That fallback is refused where the storage does not survive the process. On a
 * serverless platform each instance would generate its own key, so a cookie
 * signed by the instance that handled the sign-in fails verification on the
 * next one: the session silently evaporates, pages render as though nobody is
 * signed in, and the operations console answers 404 to its own administrator.
 * Every symptom of that points somewhere other than the cause, so it is better
 * to refuse to start than to appear to work.
 */
export async function sessionSecret(): Promise<string> {
  const fromEnv = process.env.VRENT_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;

  /* A generated key is only safe where it can be kept. With a database behind
     the store it can be, and every instance reads the same one. Without one, on
     a platform whose disk is discarded when the instance recycles, it cannot:
     each instance would sign with its own key and reject the others' cookies —
     which looks like a session that silently evaporates and points nowhere near
     the cause. Better to refuse and say what is missing. */
  if (storageIsEphemeral && !usingMongo) {
    throw new Error(
      'VRENT_SESSION_SECRET is not set and this instance has nowhere durable to keep a generated '
      + 'one. Sessions cannot be signed consistently across instances without it. Set it to 32 or '
      + 'more random characters — `openssl rand -hex 32` — in the deployment environment, or '
      + 'configure MONGODB_URI.',
    );
  }

  const kept = await settings.get('session-secret');
  if (kept && kept.value.length >= 32) return kept.value;

  const generated = randomBytes(32).toString('hex');
  await settings.put({ id: 'session-secret', value: generated });
  return generated;
}

/**
 * The operations account. Created on first use so the walkthrough always has
 * an administrator to sign in as; the password comes from the environment when
 * one is provided, and is otherwise printed once to the server console.
 */
export async function ensureAdminAccount(): Promise<{ email: string; generatedPassword?: string }> {
  const email = normalise(process.env.VRENT_ADMIN_EMAIL ?? 'admin@vrent.sg');
  const existing = await findByEmail(email);

  if (existing) {
    // The environment is the declared source of truth for this one account.
    await syncPasswordFromEnv(existing, process.env.VRENT_ADMIN_PASSWORD, 'operations account');
    return { email };
  }

  const password = process.env.VRENT_ADMIN_PASSWORD ?? randomBytes(9).toString('base64url');
  await createAccount({
    email,
    password,
    fullName: 'V-RENT Operations',
    mobile: '+65 6000 0000',
    role: 'admin',
  });
  if (!process.env.VRENT_ADMIN_PASSWORD) {
    // Printed once, to the server console only, so a fresh checkout has a way in.
    // Set VRENT_ADMIN_PASSWORD to choose it yourself and silence this.
    console.info(`[v-rent] operations account created: ${email} / ${password}`);
  }
  return { email, generatedPassword: process.env.VRENT_ADMIN_PASSWORD ? undefined : password };
}


/* ------------------------------------------------------- demo agent account

   The walkthrough needs a second account that is not an administrator, so a
   team can be shown the agent side without anybody handing round a personal
   password. It is declared in the environment like the operations account, and
   like that one the environment is the source of truth for the password. */

/**
 * Where the demo agent's registration came from, if the register cannot be
 * reached when the account is first created.
 *
 * This is a verbatim row from the CEA Salesperson register on data.gov.sg,
 * copied so a demo on a bad connection still shows a verified agent rather
 * than an account stuck in limbo. The live lookup is tried first and wins
 * whenever it answers; this is only the floor under it.
 */
const DEMO_AGENT_FALLBACK: CeaRecord = {
  name: 'LI MINGHONG (MICHELLE LI)',
  registrationNo: 'R026417F',
  registrationStart: '2011-01-01',
  registrationEnd: '2026-12-31',
  agencyName: 'ERA REALTY NETWORK PTE LTD',
  agencyLicenceNo: 'L3002382K',
};

/**
 * Reconcile one account's password with the value declared in the environment.
 *
 * Both demo accounts need this for the same reason: an account created before
 * the password was declared keeps a hash nobody can reproduce, and the
 * credential sitting in the environment file silently stops working.
 */
async function syncPasswordFromEnv(existing: Account, chosen: string | undefined, label: string) {
  if (!chosen || (await verifyPassword(chosen, existing))) return;
  const { passwordHash, passwordSalt } = await hashPassword(chosen);
  const changed = await accounts.patch(existing.id, {
    passwordHash,
    passwordSalt,
    failedAttempts: 0,
    // A declared password is the source of truth; a lock from earlier attempts
    // against the previous one should not outlive it.
    lockedUntil: undefined,
  });
  if (changed) console.info(`[v-rent] ${label} password synchronised from the environment`);
}

/**
 * The shared agent account, created on first use so a demo always has one.
 *
 * Its CEA registration is a real, current entry on the public register — the
 * same lookup a real applicant goes through — because an agent account whose
 * verification is faked would misrepresent the one thing this product is for.
 */
export async function ensureDemoAgentAccount(): Promise<{ email: string } | null> {
  const rawEmail = process.env.VRENT_DEMO_AGENT_EMAIL;
  const password = process.env.VRENT_DEMO_AGENT_PASSWORD;
  if (!rawEmail || !password) return null;

  const email = normalise(rawEmail);
  const existing = await findByEmail(email);
  if (existing) {
    await syncPasswordFromEnv(existing, password, 'demo agent account');
    return { email };
  }

  const registrationNo = (process.env.VRENT_DEMO_AGENT_CEA ?? DEMO_AGENT_FALLBACK.registrationNo).trim().toUpperCase();
  const lookup = await lookupRegistration(registrationNo);
  const record = lookup.status === 'found' ? lookup.record : DEMO_AGENT_FALLBACK;
  if (lookup.status !== 'found') {
    console.warn(`[v-rent] CEA register did not answer for ${registrationNo}; demo agent seeded from the stored row`);
  }

  await createAccount({
    email,
    password,
    fullName: displayName(record.name),
    mobile: process.env.VRENT_DEMO_AGENT_MOBILE ?? '+65 9123 4567',
    role: 'agent',
    cea: { ...record, agencyName: displayAgency(record.agencyName), verifiedAt: new Date().toISOString() },
  });
  console.info(`[v-rent] demo agent account created: ${email} (${record.registrationNo})`);
  return { email };
}

/** Both accounts a walkthrough is given out on, in one call. */
export async function ensureDemoAccounts(): Promise<void> {
  await ensureAdminAccount();
  await ensureDemoAgentAccount();
}
