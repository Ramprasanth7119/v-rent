/**
 * One colour per measure, from the validated categorical ramp (`--p1-chart-N`),
 * used everywhere that measure appears on the Performance screen — its tab, its
 * line, its bars, its chip — so the colour itself says which figure you are
 * reading. Soft fills are mixed against the surface, as the token notes ask.
 */

import type { KpiKey } from './model';

export const MEASURE: Record<KpiKey, { colour: string; soft: string; text: string }> = {
  views: { colour: 'var(--p1-chart-1)', soft: 'color-mix(in srgb, var(--p1-chart-1) 12%, var(--p1-surface))', text: 'var(--p1-chart-1)' },
  saves: { colour: 'var(--p1-chart-2)', soft: 'color-mix(in srgb, var(--p1-chart-2) 13%, var(--p1-surface))', text: 'var(--p1-chart-2)' },
  enquiries: { colour: 'var(--p1-chart-3)', soft: 'color-mix(in srgb, var(--p1-chart-3) 13%, var(--p1-surface))', text: 'var(--p1-chart-3)' },
  rate: { colour: 'var(--p1-chart-4)', soft: 'color-mix(in srgb, var(--p1-chart-4) 12%, var(--p1-surface))', text: 'var(--p1-chart-4)' },
};

/** A ramp from the surface to a measure's colour, for heatmap cells. `t` is 0–1. */
export const ramp = (colour: string, t: number) =>
  `color-mix(in srgb, ${colour} ${Math.round((0.14 + 0.86 * t) * 100)}%, var(--p1-surface))`;
