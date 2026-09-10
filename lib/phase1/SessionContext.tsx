"use client";

/**
 * The signed-in account, handed down from the server layout.
 *
 * The value is read from the session cookie on the server, so there is no
 * loading flash and no window in which the interface renders as if nobody is
 * signed in. Client code may read it, but must never be trusted for access
 * decisions — those are made on the server, in `lib/auth/session`.
 */

import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { displayAgency } from '../auth/cea';

export interface SessionUser {
  id: string;
  email: string;
  role: 'agent' | 'admin';
  fullName: string;
  mobile: string;
  createdAt: string;
  /** Set once the address was confirmed from a link sent to it. */
  emailVerifiedAt?: string;
  cea?: {
    name: string;
    registrationNo: string;
    registrationStart: string;
    registrationEnd: string;
    agencyName: string;
    agencyLicenceNo: string;
    verifiedAt: string;
  };
}

interface SessionValue {
  user: SessionUser | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ user, children }: { user: SessionUser | null; children: React.ReactNode }) {
  const router = useRouter();

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/phase1/login');
    router.refresh();
  }, [router]);

  const value = useMemo<SessionValue>(
    () => ({ user, isAdmin: user?.role === 'admin', signOut }),
    [user, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}

/** Title-cased display name, falling back to the register value. */
export function shortName(user: SessionUser | null): string {
  if (!user) return '';
  const name = user.fullName.replace(/\s*\(.*\)\s*$/, '').trim();
  return name
    .toLowerCase()
    .replace(/(^|[\s\-'])([a-z])/g, (_, lead: string, ch: string) => lead + ch.toUpperCase());
}

/**
 * The agency name in the casing the agency itself uses. The register stores it
 * in upper case, and "PROPNEX REALTY PTE. LTD." shouting from a sidebar is the
 * one detail every agent notices. `short` drops the entity suffix for places
 * where the line has to fit.
 */
export function agencyLabel(user: SessionUser | null, opts?: { short?: boolean }): string {
  const raw = user?.cea?.agencyName;
  if (!raw) return '';
  const name = displayAgency(raw);
  return opts?.short ? name.replace(/\s+Pte\.?\s*Ltd\.?$/i, '').trim() : name;
}
