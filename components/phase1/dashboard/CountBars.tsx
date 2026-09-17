"use client";

/**
 * Columns for counted records — enquiries, viewings — per day or per week.
 *
 * A count of one or two is a discrete thing, and a smoothed line through it
 * draws hills that never happened, so records get columns: zero baseline,
 * whole-number ticks, a tooltip on each column, and a table for a screen
 * reader.
 */

import React, { useMemo, useState } from 'react';
import { cx, useInView } from '../kit';

/** Up to four whole-number ticks from zero that cover `max`. */
function wholeTicks(max: number): number[] {
  /* A scale of at least four, so a day with one enquiry is not drawn as a full column. */
  if (max <= 4) return [0, 1, 2, 3, 4];
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

export function CountBars({
  points, labels, colour, label, height = 290,
}: {
  points: number[];
  labels: string[];
  colour: string;
  /** What is counted, for the tooltip and the table. */
  label: string;
  height?: number;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const ticks = useMemo(() => wholeTicks(Math.max(0, ...points)), [points]);
  const top = ticks[ticks.length - 1] || 1;
  const n = points.length;
  /* Label every k-th column so the axis never collides, and always the last. */
  const every = Math.max(1, Math.ceil(n / 7));

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      <div className="absolute inset-0 flex pb-6">
        {/* y axis */}
        <div className="relative w-9 shrink-0" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-2 -translate-y-1/2 text-[10.5px] tabular-nums text-p1-text-3" style={{ top: `${(1 - t / top) * 100}%` }}>{t}</span>
          ))}
        </div>

        <div className="relative flex-1 pr-2">
          {ticks.map((t) => (
            <span
              key={t}
              aria-hidden
              className={cx('absolute inset-x-0 border-t', t === 0 ? 'border-p1-border' : 'border-dashed border-p1-border/70')}
              style={{ top: `${(1 - t / top) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-[2px] pr-2" onMouseLeave={() => setHover(null)}>
            {points.map((v, i) => (
              <div
                key={i}
                className="group relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(i)}
              >
                <span
                  aria-hidden
                  className={cx(
                    'block w-full max-w-[22px] rounded-t-[4px] transition-[opacity,height] duration-500 ease-out motion-reduce:transition-none',
                    hover !== null && hover !== i && 'opacity-45',
                  )}
                  style={{
                    height: seen ? `${v === 0 ? 0 : Math.max(2, (v / top) * 100)}%` : '0%',
                    background: colour,
                    transitionDelay: seen ? `${Math.min(i * 12, 360)}ms` : '0ms',
                  }}
                />
                {v === 0 && <span aria-hidden className="absolute bottom-0 h-px w-full max-w-[22px] bg-p1-border-strong" />}
                {(i % every === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= every) && (
                  <span aria-hidden className="absolute -bottom-6 whitespace-nowrap text-[10.5px] text-p1-text-3">{labels[i]}</span>
                )}
              </div>
            ))}
          </div>

          {hover !== null && (
            <div
              role="status"
              className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-p1-border bg-p1-surface px-2.5 py-1.5 text-[12px] shadow-p1-md"
              style={{ left: `${Math.min(88, Math.max(12, ((hover + 0.5) / n) * 100))}%` }}
            >
              <span className="block text-p1-text-3">{labels[hover]}</span>
              <span className="font-semibold tabular-nums text-p1-text">{points[hover]}</span>{' '}
              <span className="text-p1-text-2">{label.toLowerCase()}</span>
            </div>
          )}
        </div>
      </div>

      <table className="sr-only">
        <caption>{label} by period</caption>
        <tbody>
          {points.map((v, i) => <tr key={i}><th scope="row">{labels[i]}</th><td>{v}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
