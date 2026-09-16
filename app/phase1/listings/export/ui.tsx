"use client";

/**
 * The printed report's visual system: tokens, page frame, type, tables and
 * charts. Separate from the page so the layout of a sheet reads as content.
 *
 * Designed for A4 first. Sizes are in CSS pixels at 96 dpi, where an A4 sheet
 * is 794 × 1123. The palette is a consultancy one: deep navy for structure and
 * headline figures, muted slate for secondary marks, and green, amber and red
 * only where they mean something (market position, evidence status). Tints are
 * pale and flat; there are no gradients or shadows in the document.
 */

import React from 'react';
import { cx } from '../../../../components/phase1/kit';
import { sgd } from '../../../../lib/phase1/data';
import type { MarketPosition } from '../../../../lib/phase1/market-position';

/* ================================================================ tokens */

export const C = {
  ink: '#13202B',
  text: '#334350',
  muted: '#5E6B78',
  faint: '#8E99A4',
  rule: '#D7DEE6',
  hair: '#E8EDF2',
  wash: '#F3F6F9',
  tint: '#F5F7FA',
  brand: '#1E3A5F',
  brandDeep: '#0F233B',
  brandSoft: '#E6EDF5',
  slate: '#52657A',
  accent: '#9A7B4F',
  below: '#2E7D51',
  positiveSoft: '#E8F3EC',
  inline: '#4A6380',
  above: '#B4631C',
  warn: '#A8680A',
  warnSoft: '#FBF4E4',
  danger: '#B42318',
  dangerSoft: '#FCEDEC',
} as const;

export const SANS = "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
export const DISPLAY = "'Manrope', 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

export const VERDICT_INK: Record<MarketPosition['verdict'], string> = { below: C.below, 'in line': C.inline, above: C.above };

/* =============================================================== helpers */

export const dd = (n: number) => String(n).padStart(2, '0');
export const distance = (m: number) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`);
/** Straight-line distance at 80 m a minute; always shown with "~" and never as navigation. */
export const walk = (m: number) => `~${Math.max(1, Math.round(m / 80))} min walk`;
export const psfText = (n: number) => `S$${n.toFixed(2)}`;
export const signedPct = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`;
export const sqftText = (n: number) => `${n.toLocaleString('en-SG')} sqft`;
export const money = sgd;

/* ============================================================ page frame */

export interface FrameProps {
  n: number;
  total: number;
  /** Running header, right side. */
  section: string;
  brandLine: string;
  preparedOn: string;
  agentLine: string;
  /** Set while demo data is shown: marked in the header and footer of every sheet. */
  notice?: string | null;
}

/**
 * One A4 sheet. Header and footer are part of the sheet rather than `position:
 * fixed`, so each carries its own page number and none can land in a margin.
 * The browser's print margins are zero (see globals.css), which is also what
 * keeps the browser from stamping the page address and title on the paper.
 */
export function Sheet({ n, total, section, brandLine, preparedOn, agentLine, notice, children, flush = false, landscape = false, overflow = false }: FrameProps & {
  children: React.ReactNode; flush?: boolean;
  /** A4 landscape, for a table too wide for portrait. Printed on its own named page. */
  landscape?: boolean;
  /** Marks a sheet whose content is taller than the page, so it can be found before printing. */
  overflow?: boolean;
}) {
  return (
    <section className={cx('vr-page vr-break flex flex-col bg-white px-8 py-7 sm:px-12', landscape && 'vr-landscape')} data-overflow={overflow || undefined}
      style={{ color: C.ink, fontFamily: SANS }}>
      <header className="flex shrink-0 items-center justify-between gap-6 pb-2.5 text-[9px]" style={{ borderBottom: `1px solid ${C.rule}` }}>
        <span className="flex min-w-0 items-center gap-2.5">
          <Wordmark size={10.5} />
          <span className="truncate" style={{ color: C.faint }}>{brandLine}</span>
          {notice && <DemoMark />}
        </span>
        <span className="min-w-0 truncate text-right font-semibold" style={{ color: C.brand }}>{section}</span>
      </header>

      <div data-sheet-body className={cx('@container min-h-0 flex-1', flush ? 'pt-5' : 'pt-7')}>{children}</div>

      <PageFooter n={n} total={total} preparedOn={preparedOn} agentLine={agentLine} brandLine={brandLine} notice={notice} />
    </section>
  );
}

export function PageFooter({ n, total, preparedOn, agentLine, brandLine, notice }: { n: number; total: number; preparedOn: string; agentLine: string; brandLine: string; notice?: string | null }) {
  return (
    <footer className="mt-4 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-6 pt-2.5 text-[8.5px] leading-[1.55]" style={{ borderTop: `1px solid ${C.rule}`, color: C.faint }}>
      <span className="min-w-0">
        <span className="block truncate"><span style={{ color: C.slate }}>V-RENT · {brandLine}</span> · Prepared {preparedOn}</span>
        <span className="block truncate">{agentLine} · Confidential · For intended recipient</span>
        {notice && <span className="block truncate font-semibold" style={{ color: C.warn }}>Demo data · {notice}</span>}
      </span>
      <span className="text-[10px] font-bold tabular-nums" style={{ color: C.brand }}>
        {dd(n)}<span className="font-normal" style={{ color: C.faint }}> / {dd(total)}</span>
      </span>
    </footer>
  );
}

/** The mark every sheet carries while demo data is shown. */
export function DemoMark() {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-[3px] px-1.5 py-[2px] text-[8px] font-bold uppercase leading-none tracking-[0.1em]" style={{ background: C.warnSoft, color: C.warn }}>
      Demo data
    </span>
  );
}

export function Wordmark({ size = 12, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-[0.35em] font-extrabold tracking-[0.14em]" style={{ fontFamily: DISPLAY, fontSize: size, color: light ? '#fff' : C.brandDeep }}>
      <span aria-hidden className="inline-block rotate-45" style={{ width: size * 0.5, height: size * 0.5, background: C.accent }} />
      V-RENT
    </span>
  );
}

/* ============================================================ typography */

export function Eyebrow({ children, color = C.brand, className }: { children: React.ReactNode; color?: string; className?: string }) {
  return <div className={cx('text-[9px] font-semibold uppercase tracking-[0.14em]', className)} style={{ color }}>{children}</div>;
}

/** Sheet title: an eyebrow, a title, one short line of context. */
export function Title({ eyebrow, title, sub }: { eyebrow?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="vr-block mb-6">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-1.5 line-clamp-2 text-[22px] font-bold leading-[1.18] tracking-[-0.015em]" style={{ fontFamily: DISPLAY, color: C.brandDeep }}>{title}</h2>
      {sub && <div className="mt-1.5 max-w-[84ch] text-[10.5px] leading-[1.6]" style={{ color: C.muted }}>{sub}</div>}
    </div>
  );
}

/** A section inside a sheet: navy label with a short bar, hairline, optional note on the right. */
export function Section({ label, note, children, className }: { label: React.ReactNode; note?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('vr-block', className ?? 'mt-6')}>
      <div className="mb-2.5 flex items-baseline justify-between gap-4 pb-1.5" style={{ borderBottom: `1px solid ${C.rule}` }}>
        <h3 className="flex shrink-0 items-center gap-2 text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: C.brand }}>
          <span aria-hidden className="inline-block h-2.5 w-[3px]" style={{ background: C.brand }} />
          {label}
        </h3>
        {note && <span className="min-w-0 truncate text-right text-[8.5px]" style={{ color: C.faint }}>{note}</span>}
      </div>
      {children}
    </div>
  );
}

export function Body({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cx('max-w-[84ch] text-[10.5px] leading-[1.7]', className)} style={{ color: C.text }}>{children}</p>;
}

export function Fine({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cx('mt-2.5 max-w-[100ch] text-[8.5px] leading-[1.6]', className)} style={{ color: C.faint }}>{children}</p>;
}

/* ================================================================ badges */

export type BadgeTone = 'brand' | 'positive' | 'warning' | 'danger' | 'neutral';

const BADGE: Record<BadgeTone, [string, string]> = {
  brand: [C.brandSoft, C.brand],
  positive: [C.positiveSoft, C.below],
  warning: [C.warnSoft, C.warn],
  danger: [C.dangerSoft, C.danger],
  neutral: [C.wash, C.slate],
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  const [bg, fg] = BADGE[tone];
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-[3px] px-1.5 py-[2px] text-[8px] font-bold uppercase leading-none tracking-[0.07em]" style={{ background: bg, color: fg }}>
      {children}
    </span>
  );
}

/* ================================================================ photos */

/**
 * A listing photograph, cropped to its box. The box sets the size, so an
 * unusual aspect ratio can never push the sheet taller; a failed load is
 * reported so the caller can drop it rather than print an empty frame.
 */
export function Photo({ src, alt, className, onError }: { src: string; alt: string; className?: string; onError?: () => void }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- our own photo route; must be in the page before printing
    <img src={src} alt={alt} onError={onError} className={cx('block w-full min-w-0 object-cover object-center', className)} style={{ background: C.wash }} />
  );
}

/* =============================================================== figures */

export interface Stat { label: string; value: React.ReactNode; sub?: React.ReactNode; color?: string }

/* A seven-figure sale price has to fit the same cell as a four-figure rent. */
const sizeFor = (value: React.ReactNode, cols: number, isLead: boolean) => {
  const long = typeof value === 'string' && value.length > 9;
  if (isLead) return long ? (cols >= 6 ? 'text-[14px]' : 'text-[16px]') : cols >= 6 ? 'text-[20px]' : 'text-[22px]';
  if (cols >= 6) return long ? 'text-[13px]' : 'text-[14.5px]';
  return long ? 'text-[15px]' : 'text-[17px]';
};

/** Headline numbers on a pale card with a navy top rule. `lead` makes the first one larger and navy. */
export function Stats({ items, cols = 4, lead = false }: { items: Stat[]; cols?: 3 | 4 | 5 | 6; lead?: boolean }) {
  const grid = { 3: 'grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4 print:grid-cols-4', 5: 'grid-cols-2 sm:grid-cols-5 print:grid-cols-5', 6: 'grid-cols-3 sm:grid-cols-6 print:grid-cols-6' }[cols];
  return (
    <dl className={cx('vr-block grid', grid)} style={{ background: C.tint, borderTop: `2px solid ${C.brand}` }}>
      {items.map((s, i) => (
        <div key={s.label} className="min-w-0 px-3 py-3" style={{ borderLeft: i > 0 ? `1px solid ${C.hair}` : undefined }}>
          <dt className="truncate text-[8px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.slate }}>{s.label}</dt>
          <dd className={cx('mt-1 truncate font-bold leading-tight tabular-nums tracking-[-0.01em]', sizeFor(s.value, cols, lead && i === 0))}
            style={{ fontFamily: DISPLAY, color: s.color ?? (lead && i === 0 ? C.brand : C.ink) }}>{s.value}</dd>
          {s.sub && <dd className="mt-0.5 truncate text-[9px]" style={{ color: C.muted }}>{s.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Label and value pairs in two aligned columns. */
export function KV({ rows, labelWidth = '44%', wrap = false }: { rows: [string, React.ReactNode][]; labelWidth?: string; wrap?: boolean }) {
  return (
    <dl className="text-[10px]">
      {rows.map(([k, v]) => (
        <div key={k} className="grid items-baseline gap-3 py-[5px]" style={{ gridTemplateColumns: `${labelWidth} minmax(0,1fr)`, borderBottom: `1px solid ${C.hair}` }}>
          <dt className="truncate" style={{ color: C.muted }}>{k}</dt>
          <dd className={cx('min-w-0 font-medium', wrap ? 'leading-[1.45]' : 'truncate')} style={{ color: C.ink }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Text shown in place of a value we could not verify. Never styled as a result. */
export function Unknown({ children }: { children: React.ReactNode }) {
  return <span className="font-normal italic" style={{ color: C.warn }}>{children}</span>;
}

export function None({ children }: { children: React.ReactNode }) {
  return <span className="font-normal" style={{ color: C.muted }}>{children}</span>;
}

/** A boxed notice for a whole section that could not be produced. */
export function Notice({ title, children, tone = 'neutral' }: { title: React.ReactNode; children?: React.ReactNode; tone?: 'neutral' | 'warn' }) {
  return (
    <div className="vr-block px-3.5 py-2.5 text-[10px] leading-[1.55]" style={{ background: tone === 'warn' ? C.warnSoft : C.tint, borderLeft: `3px solid ${tone === 'warn' ? C.warn : C.slate}` }}>
      <div className="font-semibold" style={{ color: tone === 'warn' ? C.warn : C.brandDeep }}>{title}</div>
      {children && <div className="mt-0.5" style={{ color: C.muted }}>{children}</div>}
    </div>
  );
}

/* ================================================================= table */

export type Col = { head: string; align?: 'right'; width?: string };

export function Table({ cols, rows, size = 9.5, highlight, dense = false, wrap = false }: {
  cols: Col[]; rows: React.ReactNode[][]; size?: number; highlight?: (i: number) => boolean; dense?: boolean;
  /** Let cells wrap instead of truncating, for names that must be read in full. Rows align to the top. */
  wrap?: boolean;
}) {
  return (
    <div className="vr-wide">
      <table className="w-full border-collapse text-left" style={{ fontSize: size, tableLayout: 'fixed', minWidth: 520 }}>
        <colgroup>{cols.map((c, i) => <col key={i} style={c.width ? { width: c.width } : undefined} />)}</colgroup>
        <thead>
          <tr style={{ background: C.tint }}>
            {cols.map((c, i) => (
              <th key={i} className={cx('truncate py-1.5 pr-3 text-[8px] font-semibold uppercase tracking-[0.09em] first:pl-2 last:pr-2', c.align === 'right' && 'text-right')}
                style={{ color: C.slate, borderBottom: `1px solid ${C.rule}` }}>{c.head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.hair}`, background: highlight?.(i) ? C.brandSoft : undefined }}>
              {r.map((cell, j) => (
                <td key={j} className={cx('pr-3 first:pl-2 last:pr-2', wrap ? 'break-words align-top leading-[1.4]' : 'truncate align-middle', dense ? 'py-[4px]' : 'py-[6px]', cols[j]?.align === 'right' && 'text-right tabular-nums')} style={{ color: C.ink }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================ charts */

/** Horizontal bars on one distance scale; the nearest in full colour. */
export function DistanceBars({ items, color = C.brand, max }: { items: { name: string; metres: number; detail?: string }[]; color?: string; max: number }) {
  if (!items.length) return null;
  const top = Math.max(max, ...items.map((p) => p.metres));
  const step = [250, 500, 1000, 1500, 2000, 2500, 5000].find((v) => v * 4 >= top) ?? Math.ceil(top / 4000) * 1000;
  const scale = step * 4;
  const row = 'grid grid-cols-[150px_minmax(0,1fr)_48px] items-center gap-3';
  return (
    <div className="vr-block text-[9.5px]">
      {items.map((p, i) => (
        <div key={`${p.name}-${i}`} className={cx(row, 'py-[3px]')}>
          <span className="truncate" style={{ color: C.ink }}>{p.name}</span>
          <span className="relative h-[6px]" style={{ background: C.hair }}>
            <span className="absolute inset-y-0 left-0" style={{ width: `${Math.max(1.5, (p.metres / scale) * 100)}%`, background: i === 0 ? color : `${color}80` }} />
          </span>
          <span className="text-right tabular-nums" style={{ color: C.text }}>{distance(p.metres)}</span>
        </div>
      ))}
      <div className={cx(row, 'mt-0.5')}>
        <span />
        <span className="relative h-3.5" style={{ borderTop: `1px solid ${C.rule}` }}>
          {[0, 1, 2, 3, 4].map((k) => (
            <span key={k} className="absolute top-0.5 whitespace-nowrap text-[8px] tabular-nums"
              style={{ left: `${k * 25}%`, transform: k === 0 ? 'none' : k === 4 ? 'translateX(-100%)' : 'translateX(-50%)', color: C.faint }}>
              {k === 0 ? '0' : distance(k * step)}
            </span>
          ))}
        </span>
        <span />
      </div>
    </div>
  );
}

/**
 * The comparable contracts on one rate axis: each contract a dot, the middle
 * half as a band, the median as a rule, this property as a marker.
 */
export function RangeChart({ m }: { m: MarketPosition }) {
  const W = 700;
  const H = 118;
  const X0 = 14;
  const X1 = W - 14;
  const lo = Math.min(m.minPsf, m.unitPsf);
  const hi = Math.max(m.maxPsf, m.unitPsf);
  const pad = (hi - lo) * 0.06 || 0.25;
  const a = lo - pad;
  const b = hi + pad;
  const x = (v: number) => X0 + ((v - a) / (b - a)) * (X1 - X0);
  const ink = VERDICT_INK[m.verdict];
  const ux = x(m.unitPsf);
  const mx = x(m.medianPsf);
  const anchor = (px: number) => (px < 90 ? 'start' : px > W - 90 ? 'end' : 'middle');
  const Y = 58;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block' }}
      aria-label={`Asking S$${m.unitPsf.toFixed(2)} per sq ft against ${m.sample} comparable contracts with a median of S$${m.medianPsf.toFixed(2)}`}>
      <rect x={x(m.q1Psf)} y={Y - 13} width={Math.max(2, x(m.q3Psf) - x(m.q1Psf))} height={26} fill={C.brandSoft} />
      <line x1={X0} x2={X1} y1={Y} y2={Y} stroke={C.rule} />
      {m.rows.map((r, k) => (
        <circle key={k} cx={x(r.psf)} cy={Y + (((k * 7) % 5) - 2) * 3.2} r={2.1} fill={C.brand} opacity={0.4} />
      ))}
      <line x1={mx} x2={mx} y1={Y - 20} y2={Y + 20} stroke={C.brandDeep} strokeWidth={1.5} />
      <text x={mx} y={Y + 33} textAnchor={anchor(mx)} fontSize="9.5" fontWeight="600" fill={C.brandDeep} fontFamily={SANS}>Median {psfText(m.medianPsf)}</text>
      <path d={`M${ux} ${Y - 11} l7 11 l-7 11 l-7 -11 z`} fill={ink} stroke="#fff" strokeWidth="1.5" />
      <text x={ux} y={Y - 22} textAnchor={anchor(ux)} fontSize="10" fontWeight="700" fill={ink} fontFamily={SANS}>This property {psfText(m.unitPsf)}</text>
      <line x1={X0} x2={X1} y1={H - 16} y2={H - 16} stroke={C.hair} />
      {[0, 0.25, 0.5, 0.75, 1].map((f, k) => {
        const v = a + (b - a) * f;
        return (
          <text key={k} x={x(v)} y={H - 4} textAnchor={k === 0 ? 'start' : k === 4 ? 'end' : 'middle'} fontSize="8.5" fill={C.faint} fontFamily={SANS}>
            {psfText(v)}
          </text>
        );
      })}
    </svg>
  );
}

/**
 * Twelve months of actual medians, the current asking rent, and three
 * indicative months. The indicative points sit in a shaded zone, dashed and
 * hollow, and are not joined to the actual line: the chart must not let a
 * projection pass for an observation.
 */
export function TrendChart({ m, asking, height = 190 }: { m: MarketPosition; asking: number; height?: number }) {
  const W = 700;
  const H = height;
  const L = 50;
  const R = 12;
  const T = 14;
  const B = 24;
  const slots = m.trend.length + m.outlook.length;
  const real = m.trend.filter(Boolean);
  const values = [...real, ...m.outlook.map((o) => o.value), asking];
  const hi = Math.max(...values);
  const lo = Math.min(...values);
  const padV = (hi - lo || hi * 0.1) * 0.18;
  const top = hi + padV;
  const bottom = Math.max(0, lo - padV);
  const x = (i: number) => L + ((i + 0.5) / slots) * (W - L - R);
  const y = (v: number) => T + (1 - (v - bottom) / (top - bottom || 1)) * (H - T - B);

  const runs: { i: number; v: number }[][] = [[]];
  m.trend.forEach((v, i) => {
    if (!v) { if (runs[runs.length - 1].length) runs.push([]); return; }
    runs[runs.length - 1].push({ i, v });
  });
  const splitX = L + (m.trend.length / slots) * (W - L - R);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => bottom + (top - bottom) * f);
  const labels = [...m.trendLabels, ...m.outlook.map((o) => o.label)];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block' }}
      aria-label={`Median monthly rent from ${m.trendLabels[0]} to ${m.trendLabels[m.trendLabels.length - 1]}, with an indicative trend`}>
      {m.outlook.length > 0 && (
        <g>
          <rect x={splitX} y={T - 6} width={W - R - splitX} height={H - T - B + 6} fill={C.tint} />
          <line x1={splitX} x2={splitX} y1={T - 6} y2={H - B} stroke={C.rule} strokeDasharray="2 3" />
          <text x={(splitX + W - R) / 2} y={T + 4} textAnchor="middle" fontSize="8.5" fontWeight="700" fill={C.slate} fontFamily={SANS} letterSpacing="0.08em">INDICATIVE</text>
        </g>
      )}
      {ticks.map((t, k) => (
        <g key={k}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={C.hair} />
          <text x={L - 8} y={y(t) + 3} textAnchor="end" fontSize="8.5" fill={C.faint} fontFamily={SANS}>{sgd(Math.round(t / 50) * 50)}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke={C.rule} />

      <line x1={L} x2={W - R} y1={y(asking)} y2={y(asking)} stroke={C.accent} strokeWidth="1.3" strokeDasharray="2 3" />
      <text x={L + 4} y={y(asking) - 4} fontSize="8.5" fontWeight="700" fill={C.accent} fontFamily={SANS}>Asking {sgd(asking)}</text>

      {runs.filter((r) => r.length > 1).map((r, k) => (
        <path key={k} fill="none" stroke={C.brand} strokeWidth="2.2" strokeLinejoin="round"
          d={r.map((p, j) => `${j ? 'L' : 'M'}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')} />
      ))}
      {runs.flat().map((p) => <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={2.8} fill={C.brand} />)}

      {m.outlook.length > 1 && (
        <path fill="none" stroke={C.slate} strokeWidth="1.5" strokeDasharray="4 3"
          d={m.outlook.map((o, j) => `${j ? 'L' : 'M'}${x(m.trend.length + j).toFixed(1)} ${y(o.value).toFixed(1)}`).join(' ')} />
      )}
      {m.outlook.map((o, j) => <circle key={o.label} cx={x(m.trend.length + j)} cy={y(o.value)} r={2.8} fill="#fff" stroke={C.slate} strokeWidth="1.4" />)}

      {labels.map((lab, i) => (
        (i % 2 === 0 || i === labels.length - 1) && (
          <text key={lab} x={x(i)} y={H - 8} textAnchor="middle" fontSize="8" fill={C.faint} fontFamily={SANS}>{lab.replace(/ (\d{2})(\d{2})$/, " '$2")}</text>
        )
      ))}
    </svg>
  );
}

export function Legend({ items }: { items: { label: string; swatch: 'line' | 'dash' | 'dot' | 'band' | 'hollow'; color: string }[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[8.5px]" style={{ color: C.muted }}>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          {it.swatch === 'line' && <span className="inline-block h-[2px] w-4" style={{ background: it.color }} />}
          {it.swatch === 'dash' && <span className="inline-block w-4 border-t-[1.5px] border-dashed" style={{ borderColor: it.color }} />}
          {it.swatch === 'dot' && <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: it.color }} />}
          {it.swatch === 'hollow' && <span className="inline-block h-[7px] w-[7px] rounded-full border" style={{ borderColor: it.color }} />}
          {it.swatch === 'band' && <span className="inline-block h-2 w-3.5" style={{ background: it.color }} />}
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** Rate per square foot for each rental on the shortlist, with its market median marked. */
export function RateBars({ rows }: { rows: { label: string; rate: number; median: number | null; color: string }[] }) {
  const top = Math.max(...rows.map((r) => Math.max(r.rate, r.median ?? 0)), 1) * 1.1;
  return (
    <div className="vr-block text-[9.5px]">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[170px_minmax(0,1fr)_56px] items-center gap-3 py-[5px]">
          <span className="truncate">{r.label}</span>
          <span className="relative h-[9px]" style={{ background: C.hair }}>
            <span className="absolute inset-y-0 left-0" style={{ width: `${(r.rate / top) * 100}%`, background: r.color }} />
            {r.median !== null && <span className="absolute -top-[3px] h-[15px] w-[2px]" style={{ left: `${(r.median / top) * 100}%`, background: C.brandDeep }} />}
          </span>
          <span className="text-right font-semibold tabular-nums">{psfText(r.rate)}</span>
        </div>
      ))}
    </div>
  );
}

/* ======================================================= insight layout */

/** Short factual statements with a small square marker. */
export function Bullets({ items, tone = 'brand', className }: { items: React.ReactNode[]; tone?: 'brand' | 'positive' | 'attention'; className?: string }) {
  const color = tone === 'positive' ? C.below : tone === 'attention' ? C.warn : C.brand;
  return (
    <ul className={cx('grid gap-[5px]', className)}>
      {items.map((t, k) => (
        <li key={k} className="vr-block grid grid-cols-[10px_minmax(0,1fr)] items-baseline gap-1.5 text-[10.5px] leading-[1.55]" style={{ color: C.text }}>
          <span aria-hidden className="inline-block h-[5px] w-[5px] -translate-y-px" style={{ background: color }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** One headline statement on a pale band, coloured by what it says. */
export function Callout({ title, color = C.brand, children, aside }: { title: React.ReactNode; color?: string; children?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="vr-block flex items-center justify-between gap-6 px-4 py-3" style={{ background: C.wash, borderLeft: `3px solid ${color}` }}>
      <div className="min-w-0">
        <div className="text-[15px] font-bold leading-tight" style={{ fontFamily: DISPLAY, color }}>{title}</div>
        {children && <div className="mt-1 text-[9.5px] leading-[1.5]" style={{ color: C.muted }}>{children}</div>}
      </div>
      {aside && <div className="flex shrink-0 flex-wrap justify-end gap-1.5">{aside}</div>}
    </div>
  );
}

/** A category of the neighbourhood: one count and the nearest few places. */
export function GroupCard({ label, value, caption, children }: { label: string; value: React.ReactNode; caption: string; children: React.ReactNode }) {
  return (
    <div className="vr-block min-w-0 px-3.5 pb-2.5 pt-3" style={{ background: C.tint, borderTop: `2px solid ${C.brand}` }}>
      <div className="text-[8px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.slate }}>{label}</div>
      <div className="mt-1 flex min-w-0 items-baseline gap-2">
        <span className="shrink-0 text-[22px] font-bold leading-none tabular-nums" style={{ fontFamily: DISPLAY, color: C.brandDeep }}>{value}</span>
        <span className="min-w-0 truncate text-[9.5px]" style={{ color: C.muted }}>{caption}</span>
      </div>
      <div className="mt-2 text-[9.5px]">{children}</div>
    </div>
  );
}

export function PlaceRows({ rows }: { rows: { name: string; detail?: string; metres: number }[] }) {
  return (
    <ul className="text-[9.5px]">
      {rows.map((r, k) => (
        <li key={`${r.name}-${k}`} className="flex items-baseline justify-between gap-3 py-[3px]" style={{ borderTop: `1px solid ${C.hair}` }}>
          <span className="min-w-0 truncate" style={{ color: C.ink }}>
            {r.name}{r.detail ? <span style={{ color: C.faint }}> · {r.detail}</span> : null}
          </span>
          <span className="shrink-0 tabular-nums" style={{ color: C.muted }}>{distance(r.metres)}</span>
        </li>
      ))}
    </ul>
  );
}

export interface NearestRow { label: string; name?: string; metres?: number; fallback?: React.ReactNode }

/** The nearest place of each kind, with a bar on one distance scale. */
export function NearestRows({ rows, scale = 2000 }: { rows: NearestRow[]; scale?: number }) {
  return (
    <div className="vr-block">
      {rows.map((r) => (
        <div key={r.label} className="py-[5px]" style={{ borderBottom: `1px solid ${C.hair}` }}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[8px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.slate }}>{r.label}</span>
            {r.metres !== undefined && (
              <span className="shrink-0 text-[9.5px] font-semibold tabular-nums" style={{ color: C.ink }}>
                {distance(r.metres)}{r.metres <= 2000 && <span className="font-normal" style={{ color: C.muted }}> · {walk(r.metres)}</span>}
              </span>
            )}
          </div>
          <div className="mt-px truncate text-[10.5px]">{r.name ? <span className="font-semibold">{r.name}</span> : r.fallback}</div>
          {r.metres !== undefined && (
            <div className="mt-1 h-[3px]" style={{ background: C.hair }}>
              <div className="h-full" style={{ width: `${Math.max(2, Math.min(100, (r.metres / scale) * 100))}%`, background: r.metres <= 1000 ? C.brand : C.slate }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ======================================================= insight charts */

const shortMonth = (lab: string) => lab.replace(/ (\d{2})(\d{2})$/, " '$2");

/** Round steps (0.25, 50, 100, 250 …) inside a domain, so an axis reads "1,000 sqft" rather than "962 sqft". */
const niceTicks = (lo: number, hi: number) => {
  const raw = (hi - lo) / 3;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = ([1, 2, 2.5, 5, 10].find((f) => f * mag >= raw) ?? 10) * mag;
  const out: number[] = [];
  for (let k = Math.ceil(lo / step); k * step <= hi; k += 1) out.push(k * step);
  return out;
};

/**
 * The asking rate on the observed range: the full range as a pale track, the
 * middle half as a band, the median as a rule and the property as a marker.
 * Outside the range, the stretch between the range and the marker is tinted
 * amber so the reader sees it before reading a number.
 */
export function Benchmark({ m, place }: { m: MarketPosition; place: 'below' | 'within' | 'above' }) {
  const W = 700;
  const H = 146;
  const X0 = 20;
  const X1 = W - 20;
  const Y = 62;
  const lo = Math.min(m.minPsf, m.unitPsf);
  const hi = Math.max(m.maxPsf, m.unitPsf);
  const pad = (hi - lo) * 0.06 || 0.25;
  const a = lo - pad;
  const b = hi + pad;
  const x = (v: number) => X0 + ((v - a) / (b - a)) * (X1 - X0);
  const ink = VERDICT_INK[m.verdict];
  const ux = x(m.unitPsf);
  const anchor = (px: number) => (px < 110 ? 'start' : px > W - 110 ? 'end' : 'middle');
  const text = (px: number, y: number, body: string, opts: { bold?: boolean; fill?: string; anchor?: 'start' | 'middle' | 'end' } = {}) => (
    <text x={px} y={y} textAnchor={opts.anchor ?? anchor(px)} fontSize="9" fontWeight={opts.bold ? 700 : 500} fill={opts.fill ?? C.muted} fontFamily={SANS}>{body}</text>
  );
  const edge = place === 'above' ? x(m.maxPsf) : x(m.minPsf);

  /* Five labels under a range that can be narrow: each takes the first row
     where it does not overlap a label already placed. Widths are estimated
     from the character count at this font size, which is close enough to keep
     a clear gap. */
  type Label = { px: number; body: string; bold?: boolean; fill?: string; anchor: 'start' | 'middle' | 'end' };
  const wanted: Label[] = [
    { px: x(m.medianPsf), body: `Median ${psfText(m.medianPsf)}`, bold: true, fill: C.brandDeep, anchor: anchor(x(m.medianPsf)) },
    { px: x(m.minPsf), body: `Lowest ${psfText(m.minPsf)}`, anchor: x(m.minPsf) > W - 110 ? 'end' : 'start' },
    { px: x(m.maxPsf), body: `Highest ${psfText(m.maxPsf)}`, anchor: x(m.maxPsf) < 110 ? 'start' : 'end' },
    { px: x(m.q1Psf), body: `Lower quartile ${psfText(m.q1Psf)}`, anchor: x(m.q1Psf) > 150 ? 'end' : 'start' },
    { px: x(m.q3Psf), body: `Upper quartile ${psfText(m.q3Psf)}`, anchor: x(m.q3Psf) < W - 150 ? 'start' : 'end' },
  ];
  const rows: [number, number][][] = [[], [], [], []];
  const placed = wanted.map((lab) => {
    const width = lab.body.length * 5.3;
    const from = lab.anchor === 'start' ? lab.px : lab.anchor === 'end' ? lab.px - width : lab.px - width / 2;
    const span: [number, number] = [from - 6, from + width + 6];
    const row = rows.findIndex((r) => r.every(([a0, a1]) => span[1] <= a0 || span[0] >= a1));
    const at = row < 0 ? rows.length - 1 : row;
    rows[at].push(span);
    return { ...lab, y: Y + 27 + at * 16 };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block' }}
      aria-label={`Asking S$${m.unitPsf.toFixed(2)} per sq ft against an observed range of S$${m.minPsf.toFixed(2)} to S$${m.maxPsf.toFixed(2)}, median S$${m.medianPsf.toFixed(2)}`}>
      {place !== 'within' && <rect x={Math.min(edge, ux)} y={Y - 16} width={Math.abs(ux - edge)} height={32} fill={C.warnSoft} />}
      <rect x={x(m.minPsf)} y={Y - 6} width={Math.max(2, x(m.maxPsf) - x(m.minPsf))} height={12} fill={C.hair} />
      <rect x={x(m.q1Psf)} y={Y - 6} width={Math.max(2, x(m.q3Psf) - x(m.q1Psf))} height={12} fill={C.brand} opacity={0.24} />
      {[m.minPsf, m.maxPsf].map((v, k) => <line key={k} x1={x(v)} x2={x(v)} y1={Y - 10} y2={Y + 10} stroke={C.slate} />)}
      <line x1={x(m.medianPsf)} x2={x(m.medianPsf)} y1={Y - 13} y2={Y + 13} stroke={C.brandDeep} strokeWidth={2} />
      <line x1={ux} x2={ux} y1={Y - 26} y2={Y} stroke={ink} strokeWidth={1.3} strokeDasharray="3 2" />
      <path d={`M${ux} ${Y - 9} l6 9 l-6 9 l-6 -9 z`} fill={ink} stroke="#fff" strokeWidth="1.5" />
      {text(ux, Y - 31, `This property ${psfText(m.unitPsf)}`, { bold: true, fill: ink })}
      {placed.map((lab) => <React.Fragment key={lab.body}>{text(lab.px, lab.y, lab.body, lab)}</React.Fragment>)}
    </svg>
  );
}

/** One point per comparable contract, this property as a marker. */
export function Scatter({ points, unit, color, height = 176, xFmt, yFmt, xTitle, yTitle }: {
  points: { x: number; y: number }[]; unit: { x: number; y: number }; color: string; height?: number;
  xFmt: (v: number) => string; yFmt: (v: number) => string; xTitle: string; yTitle: string;
}) {
  const W = 700;
  const H = height;
  const L = 60;
  const R = 16;
  const T = 18;
  const B = 32;
  const span = (vs: number[]) => {
    const lo = Math.min(...vs);
    const hi = Math.max(...vs);
    const pad = (hi - lo) * 0.08 || hi * 0.05 || 1;
    return [lo - pad, hi + pad] as const;
  };
  const [xa, xb] = span([...points.map((p) => p.x), unit.x]);
  const [ya, yb] = span([...points.map((p) => p.y), unit.y]);
  const x = (v: number) => L + ((v - xa) / (xb - xa)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - ya) / (yb - ya)) * (H - T - B);
  const ticks = niceTicks;
  const ux = x(unit.x);
  const uy = y(unit.y);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block' }} aria-label={`${yTitle} against ${xTitle.toLowerCase()} for ${points.length} comparable contracts`}>
      {ticks(ya, yb).map((t, k) => (
        <g key={`y${k}`}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={C.hair} />
          <text x={L - 8} y={y(t) + 3} textAnchor="end" fontSize="8.5" fill={C.faint} fontFamily={SANS}>{yFmt(t)}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke={C.rule} />
      {ticks(xa, xb).map((t, k) => (
        <text key={`x${k}`} x={x(t)} y={H - B + 13} textAnchor={x(t) < L + 30 ? 'start' : x(t) > W - R - 30 ? 'end' : 'middle'} fontSize="8.5" fill={C.faint} fontFamily={SANS}>{xFmt(t)}</text>
      ))}
      <text x={W - R} y={H - 2} textAnchor="end" fontSize="8" fontWeight="600" fill={C.slate} fontFamily={SANS}>{xTitle}</text>
      <text x={L} y={9} fontSize="8" fontWeight="600" fill={C.slate} fontFamily={SANS}>{yTitle}</text>
      {points.map((p, k) => <circle key={k} cx={x(p.x)} cy={y(p.y)} r={3} fill={C.brand} opacity={0.38} />)}
      <path d={`M${ux} ${uy - 7} l6 7 l-6 7 l-6 -7 z`} fill={color} stroke="#fff" strokeWidth="1.5" />
      <text x={ux} y={uy - 11} textAnchor={ux < 110 ? 'start' : ux > W - 110 ? 'end' : 'middle'} fontSize="9.5" fontWeight="700" fill={color} fontFamily={SANS}>This property</text>
    </svg>
  );
}

/** Contracts lodged each month. `slots` aligns the bars with a trend chart that has indicative months after them. */
export function VolumeBars({ counts, labels, slots = counts.length, height = 84 }: { counts: number[]; labels: string[]; slots?: number; height?: number }) {
  const W = 700;
  const H = height;
  const L = 50;
  const R = 12;
  const T = 14;
  const B = 18;
  const max = Math.max(1, ...counts);
  const slot = (W - L - R) / slots;
  const x = (i: number) => L + (i + 0.5) * slot;
  const bw = Math.min(26, slot * 0.56);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block' }} aria-label={`Contracts lodged each month: ${counts.join(', ')}`}>
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke={C.rule} />
      {counts.map((c, i) => (
        <g key={i}>
          {c > 0 && <rect x={x(i) - bw / 2} y={y(c)} width={bw} height={H - B - y(c)} fill={C.slate} opacity={0.5} />}
          <text x={x(i)} y={y(c) - 3} textAnchor="middle" fontSize="8" fill={c ? C.text : C.faint} fontFamily={SANS}>{c}</text>
        </g>
      ))}
      {labels.map((lab, i) => (
        (i % 2 === 0 || i === labels.length - 1) && (
          <text key={lab} x={x(i)} y={H - 5} textAnchor="middle" fontSize="8" fill={C.faint} fontFamily={SANS}>{shortMonth(lab)}</text>
        )
      ))}
    </svg>
  );
}

/** Monthly values with gaps where nothing was recorded, a dashed reference, and optional counts under each month. */
export function LineChart({ values, labels, counts, reference, fmt, height = 170 }: {
  values: (number | null)[]; labels: string[]; counts?: number[]; reference?: { value: number; label: string };
  fmt: (n: number) => string; height?: number;
}) {
  const W = 700;
  const H = height;
  const L = 50;
  const R = 12;
  const T = 14;
  const B = counts ? 34 : 22;
  const real = values.filter((v): v is number => v !== null);
  const all = [...real, ...(reference ? [reference.value] : [])];
  if (!all.length) return null;
  const hi = Math.max(...all);
  const lo = Math.min(...all);
  const padV = (hi - lo || hi * 0.1) * 0.22;
  const top = hi + padV;
  const bottom = Math.max(0, lo - padV);
  const x = (i: number) => L + ((i + 0.5) / values.length) * (W - L - R);
  const y = (v: number) => T + (1 - (v - bottom) / (top - bottom || 1)) * (H - T - B);
  const runs: { i: number; v: number }[][] = [[]];
  values.forEach((v, i) => {
    if (v === null) { if (runs[runs.length - 1].length) runs.push([]); return; }
    runs[runs.length - 1].push({ i, v });
  });
  const ticks = niceTicks(bottom, top);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block' }} aria-label={`Monthly values from ${labels[0]} to ${labels[labels.length - 1]}`}>
      {ticks.map((t, k) => (
        <g key={k}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={C.hair} />
          <text x={L - 8} y={y(t) + 3} textAnchor="end" fontSize="8.5" fill={C.faint} fontFamily={SANS}>{fmt(t)}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke={C.rule} />
      {reference && (
        <g>
          <line x1={L} x2={W - R} y1={y(reference.value)} y2={y(reference.value)} stroke={C.accent} strokeWidth="1.3" strokeDasharray="2 3" />
          <text x={W - R - 4} y={y(reference.value) - 4} textAnchor="end" fontSize="8.5" fontWeight="700" fill={C.accent} fontFamily={SANS}>{reference.label}</text>
        </g>
      )}
      {runs.filter((r) => r.length > 1).map((r, k) => (
        <path key={k} fill="none" stroke={C.brand} strokeWidth="2.2" strokeLinejoin="round"
          d={r.map((pt, j) => `${j ? 'L' : 'M'}${x(pt.i).toFixed(1)} ${y(pt.v).toFixed(1)}`).join(' ')} />
      ))}
      {runs.flat().map((pt) => <circle key={pt.i} cx={x(pt.i)} cy={y(pt.v)} r={2.8} fill={C.brand} />)}
      {labels.map((lab, i) => (
        (i % 2 === 0 || i === labels.length - 1) && (
          <text key={lab} x={x(i)} y={counts ? H - 18 : H - 8} textAnchor="middle" fontSize="8" fill={C.faint} fontFamily={SANS}>{shortMonth(lab)}</text>
        )
      ))}
      {counts?.map((c, i) => (
        <text key={`n${i}`} x={x(i)} y={H - 5} textAnchor="middle" fontSize="7.5" fill={C.faint} fontFamily={SANS}>n={c}</text>
      ))}
    </svg>
  );
}
