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
