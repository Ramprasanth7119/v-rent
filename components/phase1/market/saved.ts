"use client";

/**
 * Saved homes, kept in this browser.
 *
 * A tenant has no account and is not asked for one, so a saved home lives in
 * local storage. Every tab and every card on the page listens to the same
 * event, so saving on a card updates the header count immediately.
 */

import { useCallback, useEffect, useState } from 'react';

const KEY = 'vrent_saved_homes';
const EVENT = 'vrent:saved';

export const savedKey = (ownerId: string, listingId: string) => `${ownerId}/${listingId}`;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage blocked: the change lasts this page */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: ids }));
}

export function useSaved() {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads storage once after mount
    setIds(read());
    setReady(true);
    const on = (e: Event) => setIds((e as CustomEvent<string[]>).detail ?? read());
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setIds(read()); };
    window.addEventListener(EVENT, on);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(EVENT, on); window.removeEventListener('storage', onStorage); };
  }, []);

  const toggle = useCallback((key: string) => {
    const cur = read();
    const next = cur.includes(key) ? cur.filter((k) => k !== key) : [key, ...cur];
    write(next);
    return next.includes(key);
  }, []);

  return { ids, ready, isSaved: (key: string) => ids.includes(key), toggle };
}

/* --------------------------------------------------------- recently seen */

/**
 * The homes this browser has opened, newest first.
 *
 * Kept beside the saved list and for the same reason: a tenant has no account,
 * so "the one with the balcony I looked at on the bus" has to live somewhere,
 * and that somewhere is this device. Twelve is enough to find something again
 * and short enough that the list is still readable.
 *
 * Written on the listing page and read on the saved page. Nothing is sent
 * anywhere — no account, no server, no record of who looked at what.
 */
const RECENT = 'vrent_recent_homes';
const RECENT_MAX = 12;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Move this home to the front of the list, dropping any older mention of it. */
export function rememberViewed(key: string) {
  try {
    const next = [key, ...readRecent().filter((k) => k !== key)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT, JSON.stringify(next));
  } catch {
    /* storage blocked: the visit is simply not remembered */
  }
}

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads storage once after mount
    setIds(readRecent());
    setReady(true);
  }, []);

  return { ids, ready };
}
