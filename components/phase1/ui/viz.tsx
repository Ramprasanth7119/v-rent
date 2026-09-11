"use client";

/**
 * Charts for the operations console.
 *
 * Hand-drawn SVG rather than a charting library, for three reasons that matter
 * more than the convenience would have: the library's default look is exactly
 * the generic template this product is trying not to be; every one of these
 * needs to read the `.p1` colour tokens so it survives the dark theme and any
 * future change of palette; and a chart that ships 90KB to draw twelve bars is
 * a poor trade on a console people open twenty times a day.
 *
 * Motion is used to explain rather than to decorate. A line draws itself along
 * its own path so the eye follows the series in time order; bars grow from the
 * axis they are measured against; an arc sweeps from twelve o'clock. Everything
 * runs once, on entry, and everything stops if the reader has asked their
 * system for less movement.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cx } from './primitives';

/* ------------------------------------------------------------- primitives */

/** True once the element has been scrolled into view, so charts animate then. */
export function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') {
      // A one-shot latch, not synchronised state: without an observer there is
      // nothing to wait for. It cannot be an initial value because the server
      // has no observer and the browser does, which would mismatch on hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setSeen(true)),
      { rootMargin: '0px 0px -40px 0px', threshold: 0.15 },
    );
    io.observe(el);

    /* A chart that is never scrolled to must not stay at zero: printing,
       screenshotting and any viewport that never fires the observer would all
       capture an empty figure and report it as the number. */
    const fallback = setTimeout(() => setSeen(true), 2600);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, [seen]);

  return [ref, seen];
}

const reducedMotion = () =>
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * A number that counts up to its value once.
 *
 * Eased out, so it decelerates into the final figure instead of stopping dead —
 * the difference between a number that arrives and one that is merely animated.
 */
export function CountUp({
  value, decimals = 0, prefix = '', suffix = '', duration = 900, className = '',
}: {
  value: number; decimals?: number; prefix?: string; suffix?: string; duration?: number; className?: string;
}) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!seen) return;
    if (reducedMotion()) {
      // The final value, immediately, for a reader who asked for no animation.
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setShown(value);
      return;
    }

    let raf = 0;
    const from = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, value, duration]);

  const text = shown.toLocaleString('en-SG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={cx('tabular-nums', className)}>
      {prefix}{text}{suffix}
    </span>
  );
}

/* ------------------------------------------------------------- area chart */

export interface Series {
  label: string;
  points: number[];
  /** A `.p1` token name — 'primary', 'accent', 'danger', 'success', 'info'. */
  tone?: 'primary' | 'accent' | 'danger' | 'success' | 'info';
}

const TONE_VAR: Record<NonNullable<Series['tone']>, string> = {
  primary: 'var(--p1-primary)',
  accent: 'var(--p1-accent)',
  danger: 'var(--p1-danger)',
  success: 'var(--p1-success)',
  info: 'var(--p1-info)',
};

/** A smooth path through the points, using a monotone cubic so it never overshoots. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');

  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    // Catmull-Rom converted to a cubic Bézier, tightened so a spike stays a spike.
    const t = 0.28;
    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = p2.y - (p3.y - p1.y) * t;
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

export function AreaChart({
  series,
  labels,
  height = 200,
  className = '',
  valueLabel = (n: number) => n.toLocaleString('en-SG'),
  showGrid = true,
  baseline = 0,
}: {
  series: Series[];
  labels: string[];
  height?: number;
  className?: string;
  valueLabel?: (n: number) => string;
  showGrid?: boolean;
  /** Where the y axis starts. Zero unless the interesting range is higher. */
  baseline?: number;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = height;
  const padL = 44;
  const padR = 12;
  const padT = 14;
  const padB = 26;

  const all = series.flatMap((s) => s.points);
  const max = Math.max(1, ...all);
  const min = Math.min(baseline, ...all);
  const span = max - min || 1;
  const n = Math.max(1, labels.length - 1);

  const x = (i: number) => padL + (i / n) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / span) * (H - padT - padB);

  /* Four gridlines is enough to read a value off and few enough that the data
     still dominates the picture. */
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i <= 3; i += 1) out.push(min + (span * i) / 3);
    return out;
  }, [min, span]);

  /* `useId` rather than a random string: a random one differs between the
     server render and the client, which React reports as a hydration
     mismatch and then stops patching the tree. */
  const uid = useId().replace(/:/g, '');

  return (
    <div ref={ref} className={cx('relative w-full', className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={series.map((s) => `${s.label}: ${s.points.map(valueLabel).join(', ')}`).join('. ')}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          {series.map((s, si) => (
            <linearGradient key={s.label} id={`${uid}-g${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TONE_VAR[s.tone ?? 'primary']} stopOpacity="0.28" />
              <stop offset="100%" stopColor={TONE_VAR[s.tone ?? 'primary']} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {showGrid && ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={padL} x2={W - padR} y1={y(t)} y2={y(t)}
              stroke="var(--p1-border)" strokeWidth="1"
              strokeDasharray={i === 0 ? undefined : '3 5'}
            />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="var(--p1-text-3)">
              {valueLabel(Math.round(t))}
            </text>
          </g>
        ))}

        {series.map((s, si) => {
          const pts = s.points.map((v, i) => ({ x: x(i), y: y(v) }));
          const line = smoothPath(pts);
          const area = `${line} L${x(s.points.length - 1)} ${y(min)} L${padL} ${y(min)} Z`;
          return (
            <g key={s.label}>
              <path
                d={area}
                fill={`url(#${uid}-g${si})`}
                className={cx('p1-viz-fade', seen && 'is-in')}
                style={{ animationDelay: `${260 + si * 90}ms` }}
              />
              <path
                d={line}
                fill="none"
                stroke={TONE_VAR[s.tone ?? 'primary']}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cx('p1-viz-draw', seen && 'is-in')}
                style={{ animationDelay: `${si * 90}ms` }}
              />
              {hover !== null && s.points[hover] !== undefined && (
                <circle
                  cx={x(hover)} cy={y(s.points[hover])} r="4.5"
                  fill="var(--p1-surface)" stroke={TONE_VAR[s.tone ?? 'primary']} strokeWidth="2.5"
                />
              )}
            </g>
          );
        })}

        {hover !== null && (
          <line
            x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB}
            stroke="var(--p1-text-3)" strokeWidth="1" strokeDasharray="3 4"
          />
        )}

        {/* One hit area per point, so the whole column is hoverable. */}
        {labels.map((_, i) => (
          <rect
            key={i}
            x={x(i) - (W - padL - padR) / (n * 2)}
            y={padT}
            width={(W - padL - padR) / n}
            height={H - padT - padB}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {labels.map((l, i) => (
          (i === 0 || i === labels.length - 1 || i === Math.floor(labels.length / 2)) && (
            <text key={l + i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'} fontSize="10.5" fill="var(--p1-text-3)">
              {l}
            </text>
          )
        ))}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-[120px] -translate-x-1/2 rounded-lg border border-p1-border bg-p1-elevated px-3 py-2 shadow-p1-md"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <div className="text-[11.5px] font-semibold text-p1-text-3">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.label} className="mt-1 flex items-center gap-2 text-[12.5px]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TONE_VAR[s.tone ?? 'primary'] }} aria-hidden />
              <span className="text-p1-text-2">{s.label}</span>
              <span className="ml-auto font-semibold tabular-nums text-p1-text">{valueLabel(s.points[hover] ?? 0)}</span>
            </div>
          ))}
        </div>
      )}

      {series.length > 1 && (
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 text-[12px] text-p1-text-2">
              <span className="h-2 w-2 rounded-full" style={{ background: TONE_VAR[s.tone ?? 'primary'] }} aria-hidden />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ donut */

export interface Slice {
  label: string;
  value: number;
  /** Any CSS colour. Defaults walk the brand ramp. */
  colour?: string;
}

const RAMP = [
  'var(--p1-primary)',
  'color-mix(in srgb, var(--p1-primary) 62%, white)',
  'var(--p1-accent)',
  'color-mix(in srgb, var(--p1-accent) 55%, white)',
  'var(--p1-success)',
  'var(--p1-highlight)',
];

export function Donut({
  slices, size = 190, thickness = 26, centre, caption, className = '',
}: {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centre?: React.ReactNode;
  caption?: React.ReactNode;
  className?: string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const total = slices.reduce((n, s) => n + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  /* Each arc starts where the previous one ended. Worked out up front rather
     than by accumulating inside the map, because mutating a variable while
     rendering is exactly the pattern that breaks under concurrent rendering. */
  const arcs = slices.reduce<{ dash: number; offset: number }[]>((acc, s) => {
    const previous = acc[acc.length - 1];
    const offset = previous ? previous.offset + previous.dash : 0;
    acc.push({ dash: (s.value / total) * c, offset });
    return acc;
  }, []);

  return (
    <div ref={ref} className={cx('flex flex-wrap items-center gap-6', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={slices.map((s) => `${s.label}: ${s.value}`).join(', ')}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke="var(--p1-subtle)" strokeWidth={thickness}
            />
            {slices.map((s, i) => (
              <circle
                key={s.label}
                cx={size / 2} cy={size / 2} r={r}
                fill="none"
                stroke={s.colour ?? RAMP[i % RAMP.length]}
                strokeWidth={active === i ? thickness + 5 : thickness}
                strokeDasharray={`${seen ? arcs[i].dash : 0} ${c}`}
                strokeDashoffset={-arcs[i].offset}
                strokeLinecap="butt"
                style={{
                  transition: `stroke-dasharray 900ms cubic-bezier(.16,1,.3,1) ${i * 110}ms, stroke-width 160ms ease`,
                }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              />
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {active !== null ? (
            <>
              <span className="font-p1display text-[24px] font-bold leading-none tabular-nums text-p1-text">
                {Math.round((slices[active].value / total) * 100)}%
              </span>
              <span className="mt-1 max-w-[70%] text-[11.5px] leading-tight text-p1-text-3">{slices[active].label}</span>
            </>
          ) : centre}
        </div>
      </div>

      <ul className="min-w-[190px] flex-1 space-y-2">
        {slices.map((s, i) => (
          <li
            key={s.label}
            className={cx(
              'flex items-center gap-2.5 rounded-md px-1.5 py-1 text-[13px] transition-colors',
              active === i && 'bg-p1-subtle',
            )}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.colour ?? RAMP[i % RAMP.length] }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-p1-text-2">{s.label}</span>
            <span className="font-semibold tabular-nums text-p1-text">{s.value.toLocaleString('en-SG')}</span>
            <span className="w-10 text-right text-[12px] tabular-nums text-p1-text-3">
              {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
        {caption && <li className="pt-1 text-[12px] leading-5 text-p1-text-3">{caption}</li>}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- heatmap */

/**
 * Seven rows by twenty-four columns: the week as a grid.
 *
 * This is the only chart shape that answers "when should somebody be at their
 * desk" in one look, which is the question a queue-driven operation actually
 * has. Intensity is on a square-root scale, because a linear one makes one busy
 * hour flatten every other cell to nothing.
 */
export function Heatmap({
  /** 7 × 24, Monday first. */
  grid, className = '', label = 'Activity by day and hour', valueLabel = (n: number) => `${n}`,
}: {
  grid: number[][];
  className?: string;
  label?: string;
  valueLabel?: (n: number) => string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [tip, setTip] = useState<{ d: number; h: number } | null>(null);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const max = Math.max(1, ...grid.flat());

  return (
    <div ref={ref} className={cx('w-full', className)}>
      <div className="flex gap-2">
        <div className="flex shrink-0 flex-col justify-between pb-5 pt-[3px] text-[10.5px] text-p1-text-3">
          {days.map((d) => <span key={d} className="leading-none" style={{ height: 14 }}>{d}</span>)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }} role="img" aria-label={label}>
            {grid.map((row, d) => row.map((v, h) => {
              const intensity = v === 0 ? 0 : 0.12 + 0.88 * Math.sqrt(v / max);
              return (
                <div
                  key={`${d}-${h}`}
                  onMouseEnter={() => setTip({ d, h })}
                  onMouseLeave={() => setTip(null)}
                  className={cx(
                    'aspect-square rounded-[3px] transition-[opacity,transform] duration-300',
                    tip?.d === d && tip?.h === h && 'ring-2 ring-p1-text',
                  )}
                  style={{
                    background: v === 0
                      ? 'var(--p1-subtle)'
                      : `color-mix(in srgb, var(--p1-primary) ${Math.round(intensity * 100)}%, var(--p1-surface))`,
                    opacity: seen ? 1 : 0,
                    transform: seen ? 'none' : 'scale(.6)',
                    transitionDelay: `${(d * 24 + h) * 2.4}ms`,
                  }}
                  title={`${days[d]} ${String(h).padStart(2, '0')}:00 — ${valueLabel(v)}`}
                />
              );
            }))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10.5px] text-p1-text-3">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[12px] text-p1-text-3">
          {tip
            ? `${days[tip.d]} ${String(tip.h).padStart(2, '0')}:00 — ${valueLabel(grid[tip.d][tip.h])}`
            : `Busiest hour: ${valueLabel(max)}`}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-p1-text-3">
          Less
          {[0.15, 0.35, 0.55, 0.8, 1].map((s) => (
            <span
              key={s}
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ background: `color-mix(in srgb, var(--p1-primary) ${Math.round(s * 100)}%, var(--p1-surface))` }}
            />
          ))}
          More
        </span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- funnel */

export interface FunnelStage {
  label: string;
  value: number;
  hint?: string;
}

export function Funnel({
  stages, className = '', valueLabel = (n: number) => n.toLocaleString('en-SG'),
}: {
  stages: FunnelStage[];
  className?: string;
  valueLabel?: (n: number) => string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const top = stages[0]?.value || 1;

  /* The biggest single fall is the one worth attacking; marking it is the whole
     reason to draw a funnel rather than list six numbers. */
  const worst = stages.reduce(
    (acc, s, i) => {
      if (i === 0) return acc;
      const lost = stages[i - 1].value - s.value;
      return lost > acc.lost ? { i, lost } : acc;
    },
    { i: -1, lost: -1 },
  );

  return (
    <div ref={ref} className={cx('space-y-3', className)}>
      {stages.map((s, i) => {
        const pct = (s.value / top) * 100;
        const prev = i === 0 ? null : stages[i - 1].value;
        const lost = prev === null ? 0 : prev - s.value;
        const lostPct = prev ? Math.round((lost / prev) * 100) : 0;
        const isWorst = i === worst.i;
        return (
          <div key={s.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[13.5px] font-medium text-p1-text">{s.label}</span>
              <span className="flex items-baseline gap-3">
                {prev !== null && (
                  <span className={cx('text-[12px] tabular-nums', isWorst ? 'font-semibold text-p1-danger' : 'text-p1-text-3')}>
                    −{valueLabel(lost)} ({lostPct}%)
                  </span>
                )}
                <span className="font-p1display text-[15px] font-bold tabular-nums text-p1-text">{valueLabel(s.value)}</span>
              </span>
            </div>
            <div className="relative h-8 overflow-hidden rounded-lg bg-p1-subtle">
              <div
                className="flex h-full items-center justify-end rounded-lg pr-2.5"
                style={{
                  width: seen ? `${pct}%` : '0%',
                  transition: `width 820ms cubic-bezier(.16,1,.3,1) ${i * 90}ms`,
                  background: isWorst
                    ? 'linear-gradient(90deg, color-mix(in srgb, var(--p1-danger) 72%, var(--p1-surface)), var(--p1-danger))'
                    : 'linear-gradient(90deg, color-mix(in srgb, var(--p1-primary) 55%, var(--p1-surface)), var(--p1-primary))',
                }}
              >
                <span className="text-[11.5px] font-semibold tabular-nums text-white">{Math.round(pct)}%</span>
              </div>
            </div>
            {s.hint && <p className="mt-1 text-[12px] text-p1-text-3">{s.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ radial */

/** A ring that fills to a percentage. For one number that has a ceiling. */
export function Radial({
  value, max = 100, size = 116, thickness = 10, tone = 'primary', label, sublabel, className = '',
}: {
  value: number; max?: number; size?: number; thickness?: number;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'accent';
  label?: React.ReactNode; sublabel?: React.ReactNode; className?: string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / (max || 1)));
  const stroke = {
    primary: 'var(--p1-primary)',
    success: 'var(--p1-success)',
    warning: 'var(--p1-warning)',
    danger: 'var(--p1-danger)',
    accent: 'var(--p1-accent)',
  }[tone];

  return (
    <div ref={ref} className={cx('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--p1-subtle)" strokeWidth={thickness} />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={stroke} strokeWidth={thickness} strokeLinecap="round"
            strokeDasharray={`${seen ? pct * c : 0} ${c}`}
            style={{ transition: 'stroke-dasharray 900ms cubic-bezier(.16,1,.3,1)' }}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label}
        {sublabel && <span className="mt-0.5 text-[11px] leading-tight text-p1-text-3">{sublabel}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ stacked bars */

export function StackedBars({
  labels, series, height = 150, className = '', valueLabel = (n: number) => n.toLocaleString('en-SG'),
}: {
  labels: string[];
  series: { label: string; values: number[]; colour?: string }[];
  height?: number;
  className?: string;
  valueLabel?: (n: number) => string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const totals = labels.map((_, i) => series.reduce((n, s) => n + (s.values[i] ?? 0), 0));
  const max = Math.max(1, ...totals);

  return (
    <div ref={ref} className={cx('w-full', className)}>
      <div className="flex items-end gap-[6px]" style={{ height }}>
        {labels.map((l, i) => (
          <div
            key={l + i}
            className="group relative flex min-w-0 flex-1 flex-col justify-end"
            style={{ height: '100%' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {series.map((s, si) => {
              const v = s.values[i] ?? 0;
              const h = (v / max) * 100;
              return (
                <div
                  key={s.label}
                  className={cx(
                    'w-full transition-[height,opacity]',
                    si === 0 && 'rounded-b-[3px]',
                    si === series.length - 1 && 'rounded-t-[3px]',
                  )}
                  style={{
                    height: seen ? `${h}%` : '0%',
                    background: s.colour ?? RAMP[si % RAMP.length],
                    opacity: hover === null || hover === i ? 1 : 0.42,
                    transitionDuration: '760ms',
                    transitionTimingFunction: 'cubic-bezier(.16,1,.3,1)',
                    transitionDelay: `${i * 26 + si * 60}ms`,
                  }}
                />
              );
            })}
            {hover === i && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-lg border border-p1-border bg-p1-elevated px-3 py-2 shadow-p1-md">
                <div className="text-[11.5px] font-semibold text-p1-text-3">{l}</div>
                {series.map((s, si) => (
                  <div key={s.label} className="mt-1 flex items-center gap-2 text-[12.5px]">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.colour ?? RAMP[si % RAMP.length] }} aria-hidden />
                    <span className="text-p1-text-2">{s.label}</span>
                    <span className="ml-auto pl-3 font-semibold tabular-nums text-p1-text">{valueLabel(s.values[i] ?? 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10.5px] text-p1-text-3">
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((s, si) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-[12px] text-p1-text-2">
            <span className="h-2 w-2 rounded-full" style={{ background: s.colour ?? RAMP[si % RAMP.length] }} aria-hidden />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ bullet */

/** Actual against target on one line. Reads faster than two numbers side by side. */
export function Bullet({
  value, target, max, label, valueLabel = (n: number) => n.toLocaleString('en-SG'), className = '',
}: {
  value: number; target: number; max?: number; label: string;
  valueLabel?: (n: number) => string; className?: string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const ceiling = max ?? Math.max(value, target) * 1.25;
  const good = value >= target;

  return (
    <div ref={ref} className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-p1-text-2">{label}</span>
        <span className="flex items-baseline gap-2">
          <span className={cx('font-p1display text-[15px] font-bold tabular-nums', good ? 'text-p1-success' : 'text-p1-warning')}>
            {valueLabel(value)}
          </span>
          <span className="text-[11.5px] tabular-nums text-p1-text-3">target {valueLabel(target)}</span>
        </span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-p1-subtle">
        <div
          className={cx('h-full rounded-full', good ? 'bg-p1-success' : 'bg-p1-warning')}
          style={{
            width: seen ? `${Math.min(100, (value / ceiling) * 100)}%` : '0%',
            transition: 'width 780ms cubic-bezier(.16,1,.3,1)',
          }}
        />
        <div
          className="absolute top-[-3px] h-[17px] w-[2px] rounded-full bg-p1-text"
          style={{ left: `${Math.min(100, (target / ceiling) * 100)}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
