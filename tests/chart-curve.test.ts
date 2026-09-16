/**
 * The smoothed chart line must never say something the data does not.
 *
 * The previous spline bent past its neighbours: beside a sharp spike it dipped
 * below the baseline — a traffic chart drew negative requests — and it ran off
 * the top of the plot above a peak. Neither shows in a screenshot unless the
 * data happens to spike, so the property is checked here instead, by sampling
 * every Bézier segment and requiring it to stay between the two readings it
 * joins.
 */

import { describe, expect, it } from 'vitest';
import { smoothPath } from '../components/phase1/ui/viz';

type P = { x: number; y: number };

/** The cubic segments of a path produced by `smoothPath`. */
function segments(d: string): [P, P, P, P][] {
  const nums = (s: string) => s.trim().split(/[\s,]+/).map(Number);
  const [, start] = d.match(/^M([^C]+)/) ?? [];
  let cur: P = { x: nums(start)[0], y: nums(start)[1] };
  const out: [P, P, P, P][] = [];
  for (const m of d.matchAll(/C([^C]+)/g)) {
    const [x1, y1, x2, y2, x, y] = nums(m[1]);
    const end = { x, y };
    out.push([cur, { x: x1, y: y1 }, { x: x2, y: y2 }, end]);
    cur = end;
  }
  return out;
}

const bez = (a: number, b: number, c: number, e: number, t: number) =>
  (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * e;

/** Largest distance any sampled point strays outside its segment's own range. */
function worstOvershoot(pts: P[]): number {
  let worst = 0;
  for (const [p0, c1, c2, p1] of segments(smoothPath(pts))) {
    const lo = Math.min(p0.y, p1.y);
    const hi = Math.max(p0.y, p1.y);
    for (let i = 0; i <= 40; i += 1) {
      const y = bez(p0.y, c1.y, c2.y, p1.y, i / 40);
      worst = Math.max(worst, lo - y, y - hi);
    }
  }
  return worst;
}

const series = (ys: number[]): P[] => ys.map((y, i) => ({ x: i * 20, y }));

describe('smoothPath', () => {
  it('never dips below the baseline beside a sharp spike', () => {
    // Screen y grows downward; 200 is the baseline, 0 the top of the plot.
    expect(worstOvershoot(series([200, 200, 200, 10, 200, 200, 200]))).toBeLessThan(1e-9);
  });

  it('never runs above the highest reading', () => {
    expect(worstOvershoot(series([180, 150, 0, 0, 160, 190, 20, 200]))).toBeLessThan(1e-9);
  });

  it('keeps a peak exactly on its data point', () => {
    const pts = series([200, 120, 30, 120, 200]);
    const segs = segments(smoothPath(pts));
    // The segments either side of the peak meet it with a flat tangent.
    expect(segs[1][2].y).toBeCloseTo(30);
    expect(segs[2][1].y).toBeCloseTo(30);
  });

  it('holds on noisy real-shaped data', () => {
    const noisy = [120, 118, 30, 160, 158, 40, 41, 190, 5, 200, 180, 181, 60];
    expect(worstOvershoot(series(noisy))).toBeLessThan(1e-9);
  });

  it('falls back to straight segments below three points', () => {
    expect(smoothPath([{ x: 0, y: 1 }, { x: 10, y: 5 }])).toBe('M0 1 L10 5');
    expect(smoothPath([])).toBe('');
  });
});
