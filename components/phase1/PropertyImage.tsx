"use client";

import React, { useMemo } from 'react';

/**
 * Deterministic, generated property imagery.
 *
 * A demo must not depend on the network — a stalled photo request in front of an
 * audience is worse than no photo at all. These are drawn from a seed, so the
 * same listing always produces the same picture, and every listing looks distinct.
 */

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Duotone palettes, tuned to sit beside the navy and gold brand colours. */
const PALETTES = [
  { sky: ['#1e3a5f', '#4a7fb5'], mass: '#0d1f36', mid: '#16304f', glow: '#f0c674' },
  { sky: ['#243b53', '#7b9cc4'], mass: '#12233a', mid: '#1d3048', glow: '#e8b45f' },
  { sky: ['#2b3a55', '#8aa6c4'], mass: '#141f33', mid: '#1f3049', glow: '#efd8a0' },
  { sky: ['#1b3049', '#5d8bb8'], mass: '#0f1c2e', mid: '#182b45', glow: '#f2c98a' },
  { sky: ['#33445e', '#9db4cd'], mass: '#18202f', mid: '#22334a', glow: '#e6c88a' },
];

export function PropertyImage({
  seed,
  variant = 0,
  className = '',
  rounded = 'rounded-lg',
}: {
  seed: string;
  variant?: number;
  className?: string;
  rounded?: string;
}) {
  const art = useMemo(() => {
    const h = hash(seed + '::' + variant);
    const p = PALETTES[h % PALETTES.length];
    const towers = 4 + (h % 3);

    const bars = Array.from({ length: towers }).map((_, i) => {
      const g = hash(seed + i + variant);
      const w = 12 + (g % 14);
      const x = (i * 100) / towers + (g % 5) - 2;
      const height = 26 + (g % 46);
      const front = g % 2 === 0;
      return { x, w, height, front, g };
    });

    return { p, bars, h };
  }, [seed, variant]);

  const { p, bars, h } = art;
  const uid = `pi${h % 100000}${variant}`;

  return (
    <svg
      viewBox="0 0 100 70"
      preserveAspectRatio="xMidYMid slice"
      className={`${rounded} ${className}`}
      role="img"
      aria-label="Generated property illustration"
    >
      <defs>
        <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.sky[0]} />
          <stop offset="100%" stopColor={p.sky[1]} />
        </linearGradient>
        <linearGradient id={`${uid}fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.mass} stopOpacity="0.05" />
          <stop offset="100%" stopColor={p.mass} stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <rect width="100" height="70" fill={`url(#${uid}sky)`} />

      {/* sun or moon, positioned by seed */}
      <circle cx={16 + (h % 68)} cy={12 + (h % 8)} r="4.5" fill={p.glow} opacity="0.85" />
      <circle cx={16 + (h % 68)} cy={12 + (h % 8)} r="9" fill={p.glow} opacity="0.13" />

      {/* rear massing */}
      {bars.filter((b) => !b.front).map((b, i) => (
        <rect key={`r${i}`} x={b.x} y={70 - b.height} width={b.w} height={b.height} fill={p.mid} opacity="0.75" />
      ))}

      {/* front massing with window grids */}
      {bars.filter((b) => b.front).map((b, i) => (
        <g key={`f${i}`}>
          <rect x={b.x} y={70 - b.height} width={b.w} height={b.height} fill={p.mass} />
          {Array.from({ length: Math.floor(b.height / 6) }).map((_, r) =>
            Array.from({ length: Math.max(1, Math.floor(b.w / 5)) }).map((_, c) => {
              const lit = hash(`${seed}${variant}${i}${r}${c}`) % 5 < 2;
              return (
                <rect
                  key={`${r}-${c}`}
                  x={b.x + 1.6 + c * 5}
                  y={70 - b.height + 3 + r * 6}
                  width="2.6"
                  height="3"
                  fill={lit ? p.glow : '#ffffff'}
                  opacity={lit ? 0.72 : 0.09}
                  rx="0.4"
                />
              );
            })
          )}
        </g>
      ))}

      <rect width="100" height="70" fill={`url(#${uid}fade)`} />
    </svg>
  );
}

/** Photo gallery: one large frame, a thumbnail strip, and keyboard navigation. */
export function Gallery({ seed, count }: { seed: string; count: number }) {
  const [active, setActive] = React.useState(0);
  const shown = Math.max(1, Math.min(count, 8));

  const step = (d: number) => setActive((a) => (a + d + shown) % shown);

  return (
    <div>
      <div
        className="group relative overflow-hidden rounded-xl bg-neutral-900"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        }}
      >
        <PropertyImage seed={seed} variant={active} rounded="rounded-xl" className="aspect-[16/10] w-full" />

        <button
          onClick={() => step(-1)}
          aria-label="Previous photograph"
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus:opacity-100"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button
          onClick={() => step(1)}
          aria-label="Next photograph"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus:opacity-100"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
        </button>

        <div className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white backdrop-blur">
          {active + 1} / {count}
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium text-white/90 backdrop-blur">
          Generated illustration — no live photographs in the prototype
        </div>
      </div>

      <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: shown }).map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Photograph ${i + 1}`}
            className={`flex-shrink-0 overflow-hidden rounded-md transition-all ${
              i === active ? 'ring-2 ring-brand-gold ring-offset-2 ring-offset-background' : 'opacity-60 hover:opacity-100'
            }`}
          >
            <PropertyImage seed={seed} variant={i} rounded="rounded-md" className="h-12 w-16" />
          </button>
        ))}
      </div>
    </div>
  );
}
