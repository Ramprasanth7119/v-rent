"use client";

/**
 * The Demo Data switch: one value for the whole application.
 *
 *   ON  → every screen reads the demo account (`demo-workspace.ts`)
 *   OFF → every screen reads the signed-in agent's own records
 *
 * There is exactly one switch, in the header, and every reader goes through
 * `useDemoDataOn()` — the workspace provider, the enquiry inbox, the report,
 * the admin console. Nothing else decides which data is on screen.
 *
 * Where the value is kept:
 *
 *  - an address that says `demo=on` (or `demo=off`) wins, so a shared link
 *    opens the way it was shared, and is remembered for the next screen;
 *  - otherwise a session cookie. A cookie rather than browser storage because
 *    the server can read it too: the layout renders the page in the same mode
 *    the browser will hydrate it in, so nothing flashes from one data set to
 *    the other and React sees no mismatch. It carries no expiry, so it ends
 *    with the browser session — a new visit starts on the agent's own data;
 *  - otherwise OFF.
 *
 * The preference is the browser's, not the account's: nothing about it is
 * written to the database.
 */

import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { DEMO_DATA_COOKIE, DEMO_DATA_PARAM } from './index';

const listeners = new Set<() => void>();
let current: boolean | null = null;

function fromAddress(): boolean | null {
  try {
    const q = new URLSearchParams(window.location.search).get(DEMO_DATA_PARAM);
    return q === 'off' ? false : q === 'on' ? true : null;
  } catch {
    return null;
  }
}

function fromCookie(): boolean {
  try {
    return document.cookie.split(/;\s*/).includes(`${DEMO_DATA_COOKIE}=on`);
  } catch {
    return false;
  }
}

function remember(on: boolean) {
  try {
    document.cookie = on
      ? `${DEMO_DATA_COOKIE}=on; path=/; samesite=lax`
      : `${DEMO_DATA_COOKIE}=; path=/; max-age=0; samesite=lax`;
  } catch {
    /* cookies blocked: the switch still turns, until the page is reloaded */
  }
}

function read(): boolean {
  if (current !== null) return current;
  const asked = fromAddress();
  // Remembered, so the next screen in this browser opens the same way.
  if (asked !== null && asked !== fromCookie()) remember(asked);
  current = asked ?? fromCookie();
  return current;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  // A shared link opened in this tab, or the switch turned in another tab.
  const resync = () => {
    const next = fromAddress() ?? fromCookie();
    if (current !== null && next !== current) setDemoDataOn(next, { keepAddress: true });
  };
  window.addEventListener('popstate', resync);
  window.addEventListener('focus', resync);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('popstate', resync);
    window.removeEventListener('focus', resync);
  };
}

/**
 * Turn the switch. An address that already names the mode is kept in step with
 * it; one that does not is left alone, so turning the switch does not litter
 * every address with a parameter.
 */
export function setDemoDataOn(on: boolean, opts: { keepAddress?: boolean } = {}) {
  current = on;
  remember(on);
  if (!opts.keepAddress && fromAddress() !== null) {
    try {
      const url = new URL(window.location.href);
      if (on) url.searchParams.set(DEMO_DATA_PARAM, 'on');
      else url.searchParams.delete(DEMO_DATA_PARAM);
      window.history.replaceState(window.history.state, '', url);
    } catch {
      /* the address is a convenience; the switch still turns */
    }
  }
  listeners.forEach((fn) => fn());
}

/** What the server read from the cookie, so the first render in the browser matches it. */
const Initial = createContext(false);

export function DemoDataModeProvider({ initial, children }: { initial: boolean; children: ReactNode }) {
  return createElement(Initial.Provider, { value: initial }, children);
}

/** The switch, as a value that re-renders every reader when it turns. */
export function useDemoDataOn(): boolean {
  const initial = useContext(Initial);
  return useSyncExternalStore(subscribe, read, () => initial);
}

/** For tests: forget the value read so far. */
export function resetDemoDataForTests() {
  current = null;
}
