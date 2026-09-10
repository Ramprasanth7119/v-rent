/**
 * Sessions.
 *
 * A signed, httpOnly cookie holding the account id and role. Signed rather than
 * merely set, so a visitor cannot promote themselves to administrator by
 * editing a cookie value — the role in every request is verified against the
 * signature before it is trusted, and the account is re-read from the store for
 * anything that matters.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { findById, sessionSecret, type PublicAccount, type Role, publicAccount } from './store';

const COOKIE = 'vrent_session';
const MAX_AGE_SECONDS = 60 * 60 * 12;

interface Payload {
  id: string;
  role: Role;
  exp: number;
}

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8');

async function sign(value: string) {
  const secret = await sessionSecret();
  return createHmac('sha256', secret).update(value).digest('base64url');
}

async function verify(value: string, signature: string) {
  const expected = Buffer.from(await sign(value), 'utf8');
  const actual = Buffer.from(signature, 'utf8');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function startSession(account: { id: string; role: Role }) {
  const payload: Payload = {
    id: account.id,
    role: account.role,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const body = b64(JSON.stringify(payload));
  const token = `${body}.${await sign(body)}`;
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

async function readPayload(): Promise<Payload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!(await verify(body, signature))) return null;
  try {
    const payload = JSON.parse(unb64(body)) as Payload;
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

/** The signed-in account, or null. Re-read from the store on every call. */
export async function currentUser(): Promise<PublicAccount | null> {
  const payload = await readPayload();
  if (!payload) return null;
  const account = await findById(payload.id);
  if (!account || account.role !== payload.role) return null;
  return publicAccount(account);
}

/** For pages and route handlers that require a signed-in agent or admin. */
export async function requireUser(): Promise<PublicAccount> {
  const user = await currentUser();
  if (!user) throw new SessionError('Not signed in', 401);
  return user;
}

/** For anything that exposes other people's data. */
export async function requireAdmin(): Promise<PublicAccount> {
  const user = await requireUser();
  if (user.role !== 'admin') throw new SessionError('Administrator access required', 403);
  return user;
}

export class SessionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'SessionError';
  }
}
