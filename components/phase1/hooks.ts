"use client";

import { useEffect, useRef, useState } from 'react';

/** Counts from zero to `target` on mount. Honours the reduced-motion preference. */
export function useCountUp(target: number, ms = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // ease-out cubic
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);

  return value;
}

/** True once the element has scrolled into view. Used to trigger entrance animations. */
export function useInView<T extends HTMLElement>(rootMargin = '-40px') {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }

    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setSeen(true); io.disconnect(); } },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, rootMargin]);

  return { ref, seen };
}

/**
 * Theme control for the prototype.
 *
 * The consumer application already toggles a `dark` class on the document root,
 * so this reuses that mechanism rather than introducing a second one that would
 * fight it. The choice is persisted; with nothing stored we follow the operating
 * system preference.
 */
const STORE_KEY = 'vrent_phase1_theme';

export function useTheme(applyDark: (d: boolean) => void, isDark: boolean) {
  const [ready, setReady] = useState(false);
  /** The theme this prototype wants, regardless of what else touches the class. */
  const desired = useRef<boolean | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    desired.current = saved ? saved === 'dark' : prefersDark;
    setReady(true);
    // Runs once; the reconciling effect below does the applying.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * The consumer application's persona provider also drives the `dark` class and
   * resets it on mount. Rather than racing it, reconcile: whenever the applied
   * theme differs from what we want, put it back. Once they agree this is inert,
   * so there is no loop.
   */
  useEffect(() => {
    if (desired.current === null) return;
    if (isDark !== desired.current) applyDark(desired.current);
  }, [isDark, ready, applyDark]);

  const toggle = () => {
    const next = !isDark;
    desired.current = next;
    applyDark(next);
    localStorage.setItem(STORE_KEY, next ? 'dark' : 'light');
  };

  return { toggle, ready };
}
