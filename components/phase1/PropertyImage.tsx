"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera } from 'lucide-react';

/**
 * A listing's photograph, or an honest stand-in when it has none.
 *
 * The stand-in used to be a coloured skyline drawn at the size of a
 * photograph, which on a page of listings read as a set of illustrations and
 * made a property product look like a toy. It is now a quiet architectural
 * line drawing on the surface colour: clearly not a photograph, never louder
 * than a real one beside it, and correct in both themes because it draws from
 * the tokens. The seed still varies the massing so a grid is not twelve copies.
 */

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function PropertyImage({
  seed,
  variant = 0,
  className = '',
  rounded = 'rounded-lg',
  src,
  alt,
  label = false,
  eager = false,
}: {
  seed: string;
  variant?: number;
  className?: string;
  rounded?: string;
  /** A real photograph. When present the stand-in is not drawn. */
  src?: string;
  alt?: string;
  /** Say "Photos coming soon" on the stand-in. For large frames only. */
  label?: boolean;
  /** Load immediately — for the first image a visitor sees. */
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  /* An image that finished — or failed — before React attached its handlers
     never reports either, and would sit on the skeleton for good. */
  useEffect(() => {
    const el = img.current;
    if (!el || !el.complete) return;
    if (el.naturalWidth > 0) setLoaded(true); else setFailed(true);
  }, [src]);

  const art = useMemo(() => {
    const h = hash(seed + '::' + variant);
    const count = 3 + (h % 3);
    const blocks = Array.from({ length: count }).map((_, i) => {
      const g = hash(`${seed}${i}${variant}`);
      const w = 14 + (g % 10);
      const x = 8 + (i * 84) / count + (g % 4);
      const height = 22 + (g % 30);
      return { x, w, height, g };
    });
    return { blocks, h };
  }, [seed, variant]);

  if (src && !failed) {
    return (
      <span className={`relative block overflow-hidden bg-p1-subtle ${rounded} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- served by our own route, already sized */}
        <img
          ref={img}
          src={src}
          alt={alt ?? ''}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`p1-photo p1-zoom h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
        {!loaded && <span className="p1-skeleton absolute inset-0 rounded-none" aria-hidden />}
      </span>
    );
  }

  const ground = 62;
  return (
    <span className={`relative block overflow-hidden bg-p1-subtle ${rounded} ${className}`} role="img" aria-label={alt || 'No photographs yet'}>
      <svg viewBox="0 0 100 70" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`pg${art.h % 100000}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--p1-surface)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--p1-subtle)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect width="100" height="70" fill={`url(#pg${art.h % 100000})`} />
        <g className="p1-zoom" style={{ transformOrigin: '50% 100%' }}>
          {art.blocks.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={ground - b.height} width={b.w} height={b.height} fill="var(--p1-surface)" stroke="var(--p1-border-strong)" strokeWidth="0.5" />
              {Array.from({ length: Math.floor((b.height - 6) / 6) }).map((_, r) =>
                Array.from({ length: Math.max(1, Math.floor((b.w - 3) / 5)) }).map((_, c) => (
                  <rect key={`${r}-${c}`} x={b.x + 2.2 + c * 5} y={ground - b.height + 4 + r * 6} width="2.4" height="2.6" rx="0.3" fill="var(--p1-border)" />
                )),
              )}
            </g>
          ))}
          <line x1="0" x2="100" y1={ground} y2={ground} stroke="var(--p1-border-strong)" strokeWidth="0.5" />
        </g>
      </svg>
      {label && (
        <span className="absolute inset-x-0 bottom-3 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-p1-surface/90 px-2.5 py-1 text-[12px] font-medium text-p1-text-3 ring-1 ring-p1-border backdrop-blur">
            <Camera size={12} aria-hidden /> Photos coming soon
          </span>
        </span>
      )}
    </span>
  );
}

/** Photo gallery: one large frame, a thumbnail strip, and keyboard navigation. */
export function Gallery({ seed, srcs = [] }: { seed: string; count: number; srcs?: string[] }) {
  const [active, setActive] = React.useState(0);
  const shown = srcs.length > 0 ? srcs.length : 1;
  const step = (d: number) => setActive((a) => (a + d + shown) % shown);

  return (
    <div>
      <div
        className="group relative overflow-hidden rounded-xl"
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label={`Photographs, ${active + 1} of ${shown}`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        }}
      >
        <PropertyImage key={active} seed={seed} variant={active} rounded="rounded-xl" className="p1-xfade aspect-[16/10] w-full" src={srcs[active]} alt={`Photograph ${active + 1}`} label={srcs.length === 0} eager />
        {shown > 1 && (
          <>
            <button onClick={() => step(-1)} aria-label="Previous photograph" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-p1-surface/90 text-p1-text opacity-0 shadow-p1-md transition-opacity group-hover:opacity-100 focus:opacity-100 max-sm:opacity-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button onClick={() => step(1)} aria-label="Next photograph" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-p1-surface/90 text-p1-text opacity-0 shadow-p1-md transition-opacity group-hover:opacity-100 focus:opacity-100 max-sm:opacity-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-medium tabular-nums text-white">{active + 1} / {shown}</div>
          </>
        )}
      </div>
      {shown > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {srcs.map((s, i) => (
            <button key={s} onClick={() => setActive(i)} aria-label={`Photograph ${i + 1}`} aria-current={i === active || undefined}
              className={`shrink-0 cursor-pointer overflow-hidden rounded-md transition-opacity ${i === active ? 'ring-2 ring-p1-primary ring-offset-2 ring-offset-p1-surface' : 'opacity-60 hover:opacity-100'}`}>
              <PropertyImage seed={seed} variant={i} rounded="rounded-md" className="h-14 w-20" src={s} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
