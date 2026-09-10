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
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { CeaRecord } from './cea';
import type { EmailVerification } from './email-verification';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const DATA_DIR = path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'accounts.json');
const SECRET_FILE = path.join(DATA_DIR, 'session-secret');

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

export interface FileShape {
  accounts: Account[];
}

export async function readAccounts(): Promise<FileShape> {
  return readAll();
}

export async function writeAccounts(data: FileShape): Promise<void> {
  return writeAll(data);
}

async function readAll(): Promise<FileShape> {
  try {
    return JSON.parse(await readFile(USERS_FILE, 'utf8')) as FileShape;
  } catch {
    return { accounts: [] };
  }
}

async function writeAll(data: FileShape) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const normalise = (email: string) => email.trim().toLowerCase();

export async function findByEmail(email: string): Promise<Account | undefined> {
  const { accounts } = await readAll();
  const target = normalise(email);
  return accounts.find((a) => a.email === target);
}

export async function findById(id: string): Promise<Account | undefined> {
  const { accounts } = await readAll();
  return accounts.find((a) => a.id === id);
}

export async function findByCea(registrationNo: string): Promise<Account | undefined> {
  const { accounts } = await readAll();
  const target = registrationNo.trim().toUpperCase();
  return accounts.find((a) => a.cea?.registrationNo === target);
}

export async function createAccount(input: {
  email: string;
  password: string;
  fullName: string;
  mobile: string;
  role?: Role;
  cea?: CeaSnapshot;
}): Promise<Account> {
  const data = await readAll();
  const email = normalise(input.email);
  if (data.accounts.some((a) => a.email === email)) {
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
  data.accounts.push(account);
  await writeAll(data);
  return account;
}

export async function recordLogin(id: string) {
  const data = await readAll();
  const account = data.accounts.find((a) => a.id === id);
  if (!account) return;
  account.lastLoginAt = new Date().toISOString();
  await writeAll(data);
}

/** Admin-only: every registered agent. */
export async function listAccounts(): Promise<PublicAccount[]> {
  const { accounts } = await readAll();
  return accounts.map(publicAccount).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ------------------------------------------------------------------ secret */

/**
 * The cookie signing key. Taken from the environment when one is set; otherwise
 * generated once and kept out of the repository, so there is never a guessable
 * key committed in source.
 */
export async function sessionSecret(): Promise<string> {
  const fromEnv = process.env.VRENT_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  try {
    const existing = (await readFile(SECRET_FILE, 'utf8')).trim();
    if (existing.length >= 32) return existing;
  } catch {
    /* falls through to generation */
  }
  const generated = randomBytes(32).toString('hex');
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SECRET_FILE, generated, 'utf8');
  return generated;
}

/**
 * The operations account. Created on first use so the walkthrough always has
 * an administrator to sign in as; the password comes from the environment when
 * one is provided, and is otherwise printed once to the server console.
 */
export async function ensureAdminAccount(): Promise<{ email: string; generatedPassword?: string }> {
  const email = normalise(process.env.VRENT_ADMIN_EMAIL ?? 'ops@v-rent.sg');
  const existing = await findByEmail(email);

  if (existing) {
    // The environment is the declared source of truth for this one account.
    // Without this, an operations account created before VRENT_ADMIN_PASSWORD
    // was set keeps a generated password nobody has any more, and the console
    // is unreachable with the credential sitting in the environment file.
    const chosen = process.env.VRENT_ADMIN_PASSWORD;
    if (chosen && !(await verifyPassword(chosen, existing))) {
      const data = await readAll();
      const account = data.accounts.find((a) => a.id === existing.id);
      if (account) {
        const { passwordHash, passwordSalt } = await hashPassword(chosen);
        account.passwordHash = passwordHash;
        account.passwordSalt = passwordSalt;
        await writeAll(data);
        console.info('[v-rent] operations account password synchronised from VRENT_ADMIN_PASSWORD');
      }
    }
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
