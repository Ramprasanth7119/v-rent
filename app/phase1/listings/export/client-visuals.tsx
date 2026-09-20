"use client";

/**
 * The client report's diagrams: the pictures a client reads before the words.
 *
 * Each one draws a shape worked out in `lib/phase1/report-digest` and adds
 * nothing of its own: a range is drawn only from its observations, a missing
 * signal is drawn grey and says why, and every figure on a diagram is printed
 * beside it as text too, so the page reads the same in black and white.
 *
 * Sizes are for the printed A4 body, about 680 px wide.
 */

import React from 'react';
import type { DemoListing } from '../../../../lib/phase1/data';
import type {
  BoardRow, CompetitionBand, PriceLadder, RadarKind, RadarPoint, RecentLeases, RentBand, SignalTone, Signals,
} from '../../../../lib/phase1/report-digest';
import { walkMinutes } from '../../../../lib/phase1/report-digest';
import type { InsightFactor } from '../../../../lib/phase1/property-insight';
import type { MarketHistory } from '../../../../lib/phase1/report-insights';
import { usePageOf } from './flow';
import { C, DISPLAY, SANS, dd, distance, money, psfText, sqftText } from './ui';

/* ================================================================ tokens */

const TONE: Record<SignalTone, { ink: string; soft: string }> = {
  good: { ink: C.below, soft: C.positiveSoft },
  watch: { ink: C.warn, soft: C.warnSoft },
  neutral: { ink: C.brand, soft: C.brandSoft },
  none: { ink: C.faint, soft: C.wash },
};

export const RADAR_INK: Record<RadarKind, string> = {
  transport: C.brand,
  schools: C.accent,
  healthcare: '#7A4E8C',
  daily: C.below,
};

const LADDER_INK = { development: C.brand, nearby: C.slate, listings: C.accent } as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthShort = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return y && m ? `${MONTHS[m - 1]} ’${String(y).slice(2)}` : ym;
};
const compactMoney = (n: number) => (n >= 1_000_000 ? `S$${(n / 1_000_000).toFixed(2)}m` : n >= 100_000 ? `S$${Math.round(n / 1000)}k` : money(n));

/** A small uppercase label. */
function Kicker({ children, color = C.slate, className }: { children: React.ReactNode; color?: string; className?: string }) {
  return <div className={`text-[7.5px] font-bold uppercase tracking-[0.13em] ${className ?? ''}`} style={{ color }}>{children}</div>;
}

/* ============================================================ AI signals */

/** A half dial: below, within and above the comparable range, with a needle. */
function PriceDial({ dial, size }: { dial: number | null; size: number }) {
  const W = size * 1.6;
  const H = size;
  const cx = W / 2;
  const cy = H - 4;
  const r = H - 10;
  const arc = (a0: number, a1: number) => {
    const p = (t: number) => [cx - r * Math.cos(Math.PI * t), cy - r * Math.sin(Math.PI * t)];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  const off = dial === null;
  const needle = dial === null ? null : [cx - (r - 6) * Math.cos(Math.PI * dial), cy - (r - 6) * Math.sin(Math.PI * dial)];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
      <path d={arc(0, 0.2)} stroke={off ? C.hair : '#EBD9B8'} strokeWidth={7} fill="none" />
      <path d={arc(0.21, 0.79)} stroke={off ? C.hair : '#CFE3D6'} strokeWidth={7} fill="none" />
      <path d={arc(0.8, 1)} stroke={off ? C.hair : '#EBD9B8'} strokeWidth={7} fill="none" />
      {needle && (
        <>
          <line x1={cx} y1={cy} x2={needle[0]} y2={needle[1]} stroke={C.brandDeep} strokeWidth={2} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={3.2} fill={C.brandDeep} />
        </>
      )}
      {off && <text x={cx} y={cy - 4} textAnchor="middle" fontSize={9} fill={C.faint} fontFamily={SANS}>—</text>}
    </svg>
  );
}

function MomentumGlyph({ direction, size }: { direction: 'up' | 'flat' | 'down' | null; size: number }) {
  const ink = direction === 'up' ? C.below : direction === 'down' ? C.warn : direction === 'flat' ? C.brand : C.faint;
  const angle = direction === 'up' ? -35 : direction === 'down' ? 35 : 0;
  const W = size * 1.6;
  const c = size / 2;
  return (
    <svg viewBox={`0 0 ${W} ${size}`} width={W} height={size} aria-hidden>
      <line x1={6} x2={W - 6} y1={size - 3} y2={size - 3} stroke={C.hair} />
      {direction === null ? (
        <line x1={W / 2 - 12} x2={W / 2 + 12} y1={c} y2={c} stroke={ink} strokeWidth={2} strokeDasharray="3 3" />
      ) : (
        <g transform={`rotate(${angle} ${W / 2} ${c})`}>
          <line x1={W / 2 - size * 0.55} x2={W / 2 + size * 0.45} y1={c} y2={c} stroke={ink} strokeWidth={2.6} strokeLinecap="round" />
          <path d={`M${W / 2 + size * 0.55} ${c} l-${size * 0.24} -${size * 0.17} v${size * 0.34} z`} fill={ink} />
        </g>
      )}
    </svg>
  );
}

function AccessGlyph({ metres, size }: { metres: number | null; size: number }) {
  const W = size * 2.4;
  const x0 = 8;
  const x1 = W - 8;
  const y = size / 2 + 3;
  const scale = 1500;
  const at = metres === null ? null : x0 + Math.min(1, metres / scale) * (x1 - x0);
  const ink = metres === null ? C.faint : metres <= 800 ? C.below : metres > 1200 ? C.warn : C.brand;
  return (
    <svg viewBox={`0 0 ${W} ${size}`} width={W} height={size} aria-hidden>
      <line x1={x0} x2={x1} y1={y} y2={y} stroke={C.hair} strokeWidth={4} strokeLinecap="round" />
      {at !== null && <line x1={x0} x2={at} y1={y} y2={y} stroke={ink} strokeWidth={4} strokeLinecap="round" />}
      {[0.25, 0.5].map((f) => <line key={f} x1={x0 + f * (x1 - x0)} x2={x0 + f * (x1 - x0)} y1={y + 5} y2={y + 8} stroke={C.rule} />)}
      <path d={`M${x0} ${y - 9} l5 5 l-5 5 l-5 -5 z`} fill={C.accent} />
      {at !== null && (
        <g>
          <rect x={at - 5.5} y={y - 15} width={11} height={11} rx={2.5} fill={ink} />
          <text x={at} y={y - 6.6} textAnchor="middle" fontSize={7.5} fontWeight={800} fill="#fff" fontFamily={SANS}>M</text>
        </g>
      )}
    </svg>
  );
}

function EvidenceBars({ bars, tone, size }: { bars: 1 | 2 | 3; tone: SignalTone; size: number }) {
  const W = size * 1.6;
  const ink = TONE[tone].ink === C.faint ? C.slate : TONE[tone].ink;
  const bw = size * 0.26;
  const gap = size * 0.14;
  const left = W / 2 - (3 * bw + 2 * gap) / 2;
  return (
    <svg viewBox={`0 0 ${W} ${size}`} width={W} height={size} aria-hidden>
      {[1, 2, 3].map((k) => {
        const h = (size - 4) * (0.34 + 0.33 * (k - 1));
        return <rect key={k} x={left + (k - 1) * (bw + gap)} y={size - 2 - h} width={bw} height={h} rx={1.5} fill={k <= bars ? ink : C.hair} />;
      })}
    </svg>
  );
}

/**
 * Four read-at-a-glance tiles: price position, market direction, the walk to
 * the station and the strength of the evidence behind the analysis.
 */
export function SignalTiles({ s, compact = false }: { s: Signals; compact?: boolean }) {
  const g = compact ? 26 : 38;
  const tiles: { label: string; value: string; caption: string; tone: SignalTone; glyph: React.ReactNode }[] = [
    { label: 'Price check', ...s.price, glyph: <PriceDial dial={s.price.dial} size={g} /> },
    { label: 'Market direction', ...s.momentum, glyph: <MomentumGlyph direction={s.momentum.direction} size={g} /> },
    { label: 'Getting around', ...s.access, glyph: <AccessGlyph metres={s.access.metres} size={g} /> },
    { label: 'Evidence strength', ...s.evidence, glyph: <EvidenceBars bars={s.evidence.bars} tone={s.evidence.tone} size={g} /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className={`min-w-0 ${compact ? 'px-2 py-1.5' : 'px-3 py-2.5'}`} style={{ background: TONE[t.tone].soft, borderTop: `2px solid ${TONE[t.tone].ink}` }}>
          <Kicker>{t.label}</Kicker>
          <div className={compact ? 'mt-0.5 flex items-center gap-2' : 'mt-1.5'}>
            <div className="shrink-0">{t.glyph}</div>
            <div className="min-w-0">
              <div className={`${compact ? 'text-[11px]' : 'mt-1 text-[13.5px]'} font-bold leading-tight`} style={{ fontFamily: DISPLAY, color: t.tone === 'none' ? C.muted : TONE[t.tone].ink }}>{t.value}</div>
              <div className={`${compact ? 'line-clamp-1 text-[7.5px]' : 'mt-0.5 line-clamp-2 text-[8.5px]'} leading-[1.35]`} style={{ color: C.muted }}>{t.caption}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The analysis in one sentence, set apart. */
export function InShort({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={compact ? 'py-1.5 pl-3 pr-2' : 'py-2.5 pl-4 pr-3'} style={{ borderLeft: `3px solid ${C.accent}`, background: C.tint }}>
      <Kicker color={C.accent}>In short</Kicker>
      <p className={`${compact ? 'text-[10px]' : 'mt-0.5 text-[12.5px]'} font-semibold leading-[1.45]`} style={{ fontFamily: DISPLAY, color: C.brandDeep }}>{text}</p>
    </div>
  );
}

/* ===================================================== analysis layout */

type CardIcon = 'history' | 'target' | 'compass' | 'list';

function CardGlyph({ icon, color }: { icon: CardIcon; color: string }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 20 20" width={18} height={18} aria-hidden>
      {icon === 'history' && <><path d="M3.5 10a6.5 6.5 0 1 0 2-4.7" {...common} /><path d="M3 3.5v3h3" {...common} /><path d="M10 6.5V10l2.5 1.6" {...common} /></>}
      {icon === 'target' && <><circle cx="10" cy="10" r="6.5" {...common} /><circle cx="10" cy="10" r="3.2" {...common} /><circle cx="10" cy="10" r="0.9" fill={color} /></>}
      {icon === 'compass' && <><circle cx="10" cy="10" r="6.5" {...common} /><path d="M12.8 7.2 11 11l-3.8 1.8L9 9z" {...common} /></>}
      {icon === 'list' && <><path d="M7.5 6h8M7.5 10h8M7.5 14h8" {...common} /><circle cx="4.5" cy="6" r="0.9" fill={color} /><circle cx="4.5" cy="10" r="0.9" fill={color} /><circle cx="4.5" cy="14" r="0.9" fill={color} /></>}
    </svg>
  );
}

/** One of the four analysis questions: an icon, the question, the answer in a line, a sentence or two. */
export function AnalysisCard({ icon, label, headline, children, ink = C.brandDeep }: {
  icon: CardIcon; label: string; headline?: string; children?: React.ReactNode; ink?: string;
}) {
  return (
    <div className="min-w-0 px-3.5 py-3" style={{ border: `1px solid ${C.hair}`, borderTop: `2px solid ${C.brand}` }}>
      <div className="flex items-center gap-2">
        <CardGlyph icon={icon} color={C.accent} />
        <span className="text-[8.5px] font-bold uppercase tracking-[0.13em]" style={{ color: C.brand }}>{label}</span>
      </div>
      {headline && <div className="mt-1.5 text-[12px] font-bold leading-[1.3]" style={{ fontFamily: DISPLAY, color: ink }}>{headline}</div>}
      {children && <div className="mt-1 text-[9.5px] leading-[1.55]" style={{ color: C.text }}>{children}</div>}
    </div>
  );
}

const FACTOR_INK: Record<InsightFactor['tone'], string> = { positive: C.below, attention: C.warn, neutral: C.slate };
const FACTOR_WORD: Record<InsightFactor['tone'], string> = { positive: 'Plus', attention: 'Check', neutral: 'Note' };

/** Key factors as short marked lines: plus, check or note. */
export function FactorList({ items, columns = 1 }: { items: InsightFactor[]; columns?: 1 | 2 }) {
  return (
    <ul className={columns === 2 ? 'grid grid-cols-1 gap-x-5 gap-y-1 @xl:grid-cols-2' : 'grid gap-1'}>
      {items.map((f, k) => (
        <li key={`${f.topic}-${k}`} className="grid grid-cols-[38px_minmax(0,1fr)] items-baseline gap-2 text-[9.5px] leading-[1.45]">
          <span className="inline-flex justify-center rounded-[3px] py-[1.5px] text-[7px] font-bold uppercase tracking-[0.08em]"
            style={{ color: FACTOR_INK[f.tone], background: f.tone === 'positive' ? C.positiveSoft : f.tone === 'attention' ? C.warnSoft : C.wash }}>
            {FACTOR_WORD[f.tone]}
          </span>
          <span style={{ color: C.text }}><strong className="font-semibold" style={{ color: C.ink }}>{f.topic}.</strong> {f.text}</span>
        </li>
      ))}
    </ul>
  );
}

/* ================================================================ prices */

/** The comparable band for this floor area, and where the asking rent falls on it. */
export function RentBandCard({ band, asking, sizeSqft }: { band: RentBand; asking: number; sizeSqft: number }) {
  const W = 300;
  const lo = Math.min(band.low, asking);
  const hi = Math.max(band.high, asking);
  const pad = (hi - lo) * 0.25 || 100;
  const x = (v: number) => 8 + ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (W - 16);
  const ink = band.place === 'within' ? C.below : C.warn;
  return (
    <div className="grid grid-cols-1 items-center gap-x-6 gap-y-2 px-4 py-3 @xl:grid-cols-[minmax(0,1fr)_300px]" style={{ background: C.tint, borderTop: `2px solid ${C.brandDeep}` }}>
      <div className="min-w-0">
        <Kicker>Comparable rent band · {sqftText(sizeSqft)}</Kicker>
        <div className="mt-1 text-[22px] font-bold leading-none tabular-nums tracking-[-0.01em]" style={{ fontFamily: DISPLAY, color: C.brandDeep }}>
          {money(band.low)} <span style={{ color: C.faint }}>–</span> {money(band.high)}
          <span className="ml-1 text-[10px] font-medium" style={{ color: C.muted }}>a month</span>
        </div>
        <p className="mt-1 text-[8.5px] leading-[1.45]" style={{ color: C.muted }}>
          Where the middle half of comparable leases would place a home of this size. A comparison, not a valuation.
        </p>
      </div>
      <svg viewBox={`0 0 ${W} 54`} width="100%" role="img" aria-label={`Asking ${money(asking)} against a band of ${money(band.low)} to ${money(band.high)}`}>
        <rect x={8} y={26} width={W - 16} height={6} rx={3} fill={C.hair} />
        <rect x={x(band.low)} y={24} width={x(band.high) - x(band.low)} height={10} rx={3} fill="#CFE3D6" />
        <line x1={x(band.median)} x2={x(band.median)} y1={20} y2={38} stroke={C.brandDeep} strokeWidth={1.5} />
        <text x={x(band.low)} y={48} textAnchor="middle" fontSize={8.5} fill={C.muted} fontFamily={SANS}>{compactMoney(band.low)}</text>
        <text x={x(band.high)} y={48} textAnchor="middle" fontSize={8.5} fill={C.muted} fontFamily={SANS}>{compactMoney(band.high)}</text>
        <path d={`M${x(asking)} 22 l6 7 l-6 7 l-6 -7 z`} fill={ink} stroke="#fff" strokeWidth={1.4} />
        <text x={Math.min(W - 60, Math.max(60, x(asking)))} y={13} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={ink} fontFamily={SANS}>
          Asking {money(asking)}
        </text>
      </svg>
    </div>
  );
}

/**
 * Price ranges against the asking price, one row per source: this
 * development's leases, nearby developments' leases, homes advertised now.
 */
export function PriceLadderChart({ ladder }: { ladder: PriceLadder }) {
  const W = 680;
  const LABEL = 150;
  const RIGHT = 150;
  const ROW = 38;
  const TOP = 22;
  const H = TOP + ladder.rows.length * ROW + 20;
  const x0 = LABEL + 10;
  const x1 = W - RIGHT - 10;
  const all = [...ladder.rows.flatMap((r) => [r.low, r.high]), ladder.asking];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || lo * 0.05 || 50;
  const a = lo - pad;
  const b = hi + pad;
  const x = (v: number) => x0 + ((v - a) / (b - a)) * (x1 - x0);
  const ax = x(ladder.asking);
  const unit = ladder.deal === 'rent' ? 'psf pm' : 'psf';
  /* Round tick values that sit inside the axis. */
  const step = (b - a) / 3;
  const unitStep = ladder.deal === 'rent' ? (step > 1000 ? 1000 : step > 250 ? 500 : 100) : (step > 500_000 ? 500_000 : step > 100_000 ? 100_000 : 50_000);
  const ticks = [1, 2].map((k) => Math.round((a + step * k) / unitStep) * unitStep).filter((t) => t > a && t < b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block' }}
      aria-label={`Asking ${money(ladder.asking)} against ${ladder.rows.map((r) => `${r.label.toLowerCase()} ${money(r.low)} to ${money(r.high)}`).join('; ')}`}>
      {ladder.rows.map((r, k) => {
        const y = TOP + k * ROW + ROW / 2;
        const ink = LADDER_INK[r.key];
        return (
          <g key={r.key}>
            {k % 2 === 0 && <rect x={0} y={y - ROW / 2} width={W} height={ROW} fill={C.tint} />}
            <text x={6} y={y - 2} fontSize={10} fontWeight={700} fill={C.ink} fontFamily={SANS}>{r.label}</text>
            <text x={6} y={y + 10} fontSize={8.5} fill={C.muted} fontFamily={SANS}>{r.sub} · {r.count}</text>
            <line x1={x0} x2={x1} y1={y} y2={y} stroke={C.hair} />
            <rect x={x(r.low)} y={y - 5} width={Math.max(3, x(r.high) - x(r.low))} height={10} rx={5} fill={ink} opacity={0.3} />
            <circle cx={x(r.low)} cy={y} r={3} fill={ink} />
            <circle cx={x(r.high)} cy={y} r={3} fill={ink} />
            <line x1={x(r.median)} x2={x(r.median)} y1={y - 8} y2={y + 8} stroke={ink} strokeWidth={2} />
            <text x={W - RIGHT + 4} y={y - 2} fontSize={10} fontWeight={700} fill={C.ink} fontFamily={SANS}>{compactMoney(r.low)} – {compactMoney(r.high)}</text>
            <text x={W - RIGHT + 4} y={y + 10} fontSize={8.5} fill={C.muted} fontFamily={SANS}>
              {ladder.deal === 'rent' ? `${psfText(r.lowPsf)} – ${psfText(r.highPsf)} ${unit}` : `median ${compactMoney(r.median)}`}
            </text>
          </g>
        );
      })}
      <line x1={ax} x2={ax} y1={TOP - 4} y2={TOP + ladder.rows.length * ROW} stroke={C.accent} strokeWidth={1.5} strokeDasharray="3 2" />
      <text x={Math.min(x1, Math.max(x0 + 30, ax))} y={TOP - 8} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={C.accent} fontFamily={SANS}>
        Asking {compactMoney(ladder.asking)}
      </text>
      {ticks.map((t, k) => (
        <text key={k} x={x(t)} y={H - 5} textAnchor="middle" fontSize={8} fill={C.faint} fontFamily={SANS}>{compactMoney(t)}</text>
      ))}
    </svg>
  );
}

export function LadderLegend({ ladder }: { ladder: PriceLadder }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[8.5px]" style={{ color: C.muted }}>
      <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full" style={{ background: `${C.brand}4D` }} />Lowest to highest</span>
      <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-[2px]" style={{ background: C.brand }} />Median</span>
      <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 border-t-[1.5px] border-dashed" style={{ borderColor: C.accent }} />This property’s asking {ladder.deal === 'rent' ? 'rent' : 'price'}</span>
      {ladder.rows.some((r) => r.key !== 'listings') && <span>Leases are agreed rents; listings are asking figures.</span>}
    </div>
  );
}

/* ============================================================ market */

/** The development's or district's monthly medians with contract counts underneath. */
export function MonthGrid({ h }: { h: MarketHistory }) {
  const pts = h.points;
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(12, pts.length)}, minmax(0, 1fr))`, borderTop: `1px solid ${C.rule}` }}>
      {pts.slice(-12).map((p) => (
        <div key={p.month} className="px-0.5 py-1 text-center" style={{ borderBottom: `1px solid ${C.hair}` }}>
          <div className="text-[7.5px] uppercase tracking-[0.06em]" style={{ color: C.faint }}>{p.label.replace(/ (\d{2})(\d{2})$/, " '$2")}</div>
          <div className="text-[9px] font-semibold tabular-nums" style={{ color: p.medianPsf === null ? C.faint : C.ink }}>{p.medianPsf === null ? '—' : p.medianPsf.toFixed(2)}</div>
          <div className="text-[7.5px] tabular-nums" style={{ color: C.muted }}>{p.count} {p.count === 1 ? 'lease' : 'leases'}</div>
        </div>
      ))}
    </div>
  );
}

/** The newest leases, with the highest and lowest rate among them marked. */
export function LeaseTable({ leases }: { leases: RecentLeases }) {
  return (
    <div className="vr-wide">
      <table className="w-full border-collapse text-left text-[9.5px]" style={{ tableLayout: 'fixed', minWidth: 520 }}>
        <colgroup>
          <col style={{ width: '12%' }} /><col style={{ width: '30%' }} /><col style={{ width: '8%' }} /><col style={{ width: '14%' }} />
          <col style={{ width: '13%' }} /><col style={{ width: '10%' }} /><col />
        </colgroup>
        <thead>
          <tr style={{ background: C.tint }}>
            {['Month', 'Development', 'Beds', 'Size', 'Rent', 'PSF', ''].map((h, k) => (
              <th key={k} className={`py-1.5 pr-3 text-[8px] font-semibold uppercase tracking-[0.09em] first:pl-2 ${k >= 2 && k <= 5 ? 'text-right' : ''}`} style={{ color: C.slate, borderBottom: `1px solid ${C.rule}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leases.rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: `1px solid ${C.hair}`, background: r.mark === 'high' ? C.warnSoft : r.mark === 'low' ? C.positiveSoft : undefined }}>
              <td className="py-[4px] pl-2 pr-3" style={{ color: C.muted }}>{monthShort(r.month)}</td>
              <td className="truncate py-[4px] pr-3 font-semibold" style={{ color: C.ink }}>{r.project}</td>
              <td className="py-[4px] pr-3 text-right tabular-nums">{r.bedrooms}</td>
              <td className="py-[4px] pr-3 text-right tabular-nums">{sqftText(r.sizeSqft)}</td>
              <td className="py-[4px] pr-3 text-right font-semibold tabular-nums">{money(r.monthlyRent)}</td>
              <td className="py-[4px] pr-3 text-right tabular-nums">{psfText(r.psf)}</td>
              <td className="py-[4px] pr-2 text-right">
                {r.mark && <span className="text-[7.5px] font-bold uppercase tracking-[0.08em]" style={{ color: r.mark === 'high' ? C.warn : C.below }}>{r.mark === 'high' ? 'Highest rate' : 'Lowest rate'}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The development against its neighbours: one row each, with its range of
 * rates drawn on a shared axis so the eye compares them without reading.
 */
export function BoardTable({ rows }: { rows: BoardRow[] }) {
  const lo = Math.min(...rows.map((r) => r.lowPsf));
  const hi = Math.max(...rows.map((r) => r.highPsf));
  const pad = (hi - lo) * 0.06 || 0.2;
  const SW = 150;
  const x = (v: number) => 4 + ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (SW - 8);
  return (
    <div className="vr-wide">
      <table className="w-full border-collapse text-left text-[9.5px]" style={{ tableLayout: 'fixed', minWidth: 560 }}>
        <colgroup>
          <col style={{ width: '25%' }} /><col style={{ width: '6%' }} /><col style={{ width: '8%' }} /><col style={{ width: '12%' }} />
          <col style={{ width: '11%' }} /><col style={{ width: `${SW + 12}px` }} /><col />
        </colgroup>
        <thead>
          <tr style={{ background: C.tint }}>
            {['Development', 'Dist.', 'Leases', 'Median rent', 'Median psf', 'Range of rates psf', 'Latest'].map((h, k) => (
              <th key={h} className={`py-1.5 pr-3 text-[8px] font-semibold uppercase tracking-[0.09em] first:pl-2 ${k >= 1 && k <= 4 ? 'text-right' : ''} ${k === 6 ? 'text-right' : ''}`} style={{ color: C.slate, borderBottom: `1px solid ${C.rule}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.project} style={{ borderBottom: `1px solid ${C.hair}`, background: r.subject ? C.brandSoft : undefined }}>
              <td className="py-[5px] pl-2 pr-3">
                <span className="block truncate font-semibold" style={{ color: C.ink }}>{r.project}</span>
                {r.subject && <span className="text-[7.5px] font-bold uppercase tracking-[0.08em]" style={{ color: C.brand }}>This property’s development</span>}
              </td>
              <td className="py-[5px] pr-3 text-right tabular-nums" style={{ color: C.muted }}>D{dd(r.district)}</td>
              <td className="py-[5px] pr-3 text-right tabular-nums">{r.count}</td>
              <td className="py-[5px] pr-3 text-right font-semibold tabular-nums">{money(r.medianRent)}</td>
              <td className="py-[5px] pr-3 text-right tabular-nums">{psfText(r.medianPsf)}</td>
              <td className="py-[5px] pr-3">
                <svg viewBox={`0 0 ${SW} 14`} width={SW} height={14} aria-label={`${psfText(r.lowPsf)} to ${psfText(r.highPsf)}`}>
                  <line x1={4} x2={SW - 4} y1={7} y2={7} stroke={C.hair} />
                  <rect x={x(r.lowPsf)} y={4} width={Math.max(3, x(r.highPsf) - x(r.lowPsf))} height={6} rx={3} fill={r.subject ? C.brand : C.slate} opacity={0.35} />
                  <line x1={x(r.medianPsf)} x2={x(r.medianPsf)} y1={1} y2={13} stroke={r.subject ? C.brandDeep : C.slate} strokeWidth={1.8} />
                </svg>
              </td>
              <td className="py-[5px] pr-2 text-right" style={{ color: C.muted }}>{monthShort(r.latest)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[8px]" style={{ color: C.faint }}>Range bars share one scale, {psfText(lo)} to {psfText(hi)} per sq ft a month. The tick is each development’s median.</p>
    </div>
  );
}

/** What similar homes ask now, grouped by how near they are, against this property. */
export function CompetitionChart({ bands, asking }: { bands: CompetitionBand[]; asking: number }) {
  const W = 680;
  const L = 170;
  const R = 150;
  const ROW = 30;
  const H = bands.length * ROW + 26;
  const all = [...bands.flatMap((b) => [b.low, b.high]), asking];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || lo * 0.05 || 50;
  const x = (v: number) => L + ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (W - L - R);
  const ax = x(asking);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block' }}
      aria-label={bands.map((b) => `${b.match}: ${b.count} listings, ${money(b.low)} to ${money(b.high)}`).join('; ')}>
      {bands.map((b, k) => {
        const y = 18 + k * ROW + ROW / 2;
        return (
          <g key={b.match}>
            <text x={6} y={y - 1} fontSize={10} fontWeight={700} fill={C.ink} fontFamily={SANS}>{b.match}</text>
            <text x={6} y={y + 10} fontSize={8.5} fill={C.muted} fontFamily={SANS}>{b.count} {b.count === 1 ? 'listing' : 'listings'}</text>
            <line x1={L} x2={W - R} y1={y} y2={y} stroke={C.hair} />
            <line x1={x(b.low)} x2={x(b.high)} y1={y} y2={y} stroke={C.accent} strokeWidth={2.5} opacity={0.55} />
            <circle cx={x(b.low)} cy={y} r={3.5} fill="#fff" stroke={C.accent} strokeWidth={1.5} />
            <circle cx={x(b.high)} cy={y} r={3.5} fill="#fff" stroke={C.accent} strokeWidth={1.5} />
            <circle cx={x(b.median)} cy={y} r={4} fill={C.accent} />
            <text x={W - R + 12} y={y - 1} fontSize={10} fontWeight={700} fill={C.ink} fontFamily={SANS}>{compactMoney(b.low)} – {compactMoney(b.high)}</text>
            <text x={W - R + 12} y={y + 10} fontSize={8.5} fill={C.muted} fontFamily={SANS}>median {compactMoney(b.median)}</text>
          </g>
        );
      })}
      <line x1={ax} x2={ax} y1={14} y2={H - 6} stroke={C.brandDeep} strokeWidth={1.4} strokeDasharray="3 2" />
      <text x={Math.min(W - R - 30, Math.max(L + 30, ax))} y={10} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={C.brandDeep} fontFamily={SANS}>This property {compactMoney(asking)}</text>
    </svg>
  );
}

/* ======================================================= neighbourhood */

const RADAR_RINGS = [500, 1000, 2000];

/**
 * The neighbourhood from above: rings at 500 m, 1 km and 2 km, each measured
 * place at its true bearing. Radius follows the square root of distance so the
 * nearest places, which matter most, are not crowded into the centre.
 */
export function Radar({ points, size = 232 }: { points: RadarPoint[]; size?: number }) {
  const c = size / 2;
  const R = c - 16;
  const rOf = (m: number) => R * Math.sqrt(Math.min(m, 2000) / 2000);
  const at = (p: RadarPoint) => {
    const rad = (p.bearing * Math.PI) / 180;
    return [c + rOf(p.metres) * Math.sin(rad), c - rOf(p.metres) * Math.cos(rad)];
  };
  const order: RadarKind[] = ['daily', 'healthcare', 'schools', 'transport'];
  const sorted = [...points].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" style={{ display: 'block', maxWidth: '100%' }}
      aria-label={`${points.length} places within 2 km, by direction and distance`}>
      <circle cx={c} cy={c} r={R} fill={C.tint} stroke={C.rule} />
      {RADAR_RINGS.slice(0, -1).map((m) => <circle key={m} cx={c} cy={c} r={rOf(m)} fill="none" stroke={C.rule} strokeDasharray="2 3" />)}
      <line x1={c} x2={c} y1={c - R} y2={c + R} stroke={C.hair} />
      <line x1={c - R} x2={c + R} y1={c} y2={c} stroke={C.hair} />
      {RADAR_RINGS.map((m) => (
        <text key={m} x={c + 3} y={c - rOf(m) + 9} fontSize={7.5} fill={C.faint} fontFamily={SANS}>{m < 1000 ? `${m} m` : `${m / 1000} km`}</text>
      ))}
      <text x={c} y={10} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={C.slate} fontFamily={SANS}>N</text>
      {sorted.map((p, k) => {
        const [px, py] = at(p);
        return <circle key={`${p.name}-${k}`} cx={px} cy={py} r={p.kind === 'transport' ? 4.6 : 3.4} fill={RADAR_INK[p.kind]} stroke="#fff" strokeWidth={1.1} />;
      })}
      <path d={`M${c} ${c - 7} l6 7 l-6 7 l-6 -7 z`} fill={C.accent} stroke="#fff" strokeWidth={1.4} />
    </svg>
  );
}

export interface NearbyBarGroup {
  kind: RadarKind;
  label: string;
  rows: { name: string; detail?: string; metres: number }[];
  total: number;
  scale: number;
  fallback?: React.ReactNode;
}

/** Nearby places by kind: a coloured heading with a count, then the nearest few on one distance scale. */
export function NearbyBars({ groups, max = 3 }: { groups: NearbyBarGroup[]; max?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-2.5 @xl:grid-cols-2">
      {groups.map((g) => (
        <div key={g.label} className="min-w-0">
          <div className="flex items-center justify-between gap-2 pb-1" style={{ borderBottom: `1.5px solid ${RADAR_INK[g.kind]}` }}>
            <span className="inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: RADAR_INK[g.kind] }}>
              <span aria-hidden className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: RADAR_INK[g.kind] }} />
              {g.label}
            </span>
            {g.rows.length > 0 && <span className="text-[8px] tabular-nums" style={{ color: C.faint }}>{g.total} within {g.scale >= 1000 ? `${g.scale / 1000} km` : `${g.scale} m`}</span>}
          </div>
          {g.rows.length ? (
            <ul>
              {g.rows.slice(0, max).map((r, k) => (
                <li key={`${r.name}-${k}`} className="py-[3px]" style={{ borderBottom: `1px solid ${C.hair}` }}>
                  <div className="flex items-baseline justify-between gap-2 text-[9.5px]">
                    <span className="min-w-0 truncate" style={{ color: C.ink }}>{r.name}{r.detail ? <span style={{ color: C.faint }}> · {r.detail}</span> : null}</span>
                    <span className="shrink-0 tabular-nums" style={{ color: C.muted }}>
                      {distance(r.metres)}{r.metres <= 2000 && <span style={{ color: C.faint }}> · {walkMinutes(r.metres)} min</span>}
                    </span>
                  </div>
                  <div className="mt-[2px] h-[3px]" style={{ background: C.hair }}>
                    <div className="h-full" style={{ width: `${Math.max(2, Math.min(100, (r.metres / g.scale) * 100))}%`, background: RADAR_INK[g.kind], opacity: k === 0 ? 1 : 0.5 }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : <div className="pt-1 text-[9.5px]">{g.fallback}</div>}
        </div>
      ))}
    </div>
  );
}

/* ======================================================= cover and guide */

export interface ContentsEntry { label: string; blockKey: string; note?: string }

function ContentsRow({ n, entry }: { n: number; entry: ContentsEntry }) {
  const page = usePageOf(entry.blockKey);
  return (
    <li className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-baseline gap-2 py-[4px]" style={{ borderBottom: `1px solid ${C.hair}` }}>
      <span className="text-[9px] font-bold tabular-nums" style={{ color: C.accent }}>{dd(n)}</span>
      <span className="min-w-0 truncate text-[10px]" style={{ color: C.ink }}>
        {entry.label}{entry.note && <span style={{ color: C.faint }}> · {entry.note}</span>}
      </span>
      <span className="text-[9px] tabular-nums" style={{ color: C.muted }}>{page ? `p. ${dd(page)}` : 'p. 00'}</span>
    </li>
  );
}

/** What the report holds, with the page each part starts on. */
export function Contents({ entries }: { entries: ContentsEntry[] }) {
  const half = Math.ceil(entries.length / 2);
  return (
    <div>
      <Kicker>Inside this report</Kicker>
      <div className="mt-1 grid grid-cols-1 gap-x-8 @xl:grid-cols-2">
        <ol>{entries.slice(0, half).map((e, k) => <ContentsRow key={e.blockKey} n={k + 1} entry={e} />)}</ol>
        <ol>{entries.slice(half).map((e, k) => <ContentsRow key={e.blockKey} n={half + k + 1} entry={e} />)}</ol>
      </div>
    </div>
  );
}

export interface CoverAgent { fullName: string; agency: string; licence: string; cea: string; mobile: string; email: string; verified: boolean }

/** The agent who prepared the report, as the last thing on the cover. */
export function AgentCard({ agent }: { agent: CoverAgent }) {
  const initials = agent.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3.5 px-4 py-3 @xl:grid-cols-[44px_minmax(0,1fr)_auto]" style={{ background: C.brandDeep }}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-bold" style={{ background: C.accent, color: '#fff', fontFamily: DISPLAY }}>{initials || 'VR'}</span>
      <div className="min-w-0">
        <Kicker color="#AFC0D4">Prepared by</Kicker>
        <div className="truncate text-[14px] font-bold leading-tight text-white" style={{ fontFamily: DISPLAY }}>{agent.fullName}</div>
        <div className="truncate text-[9px]" style={{ color: '#C9D5E3' }}>
          {agent.agency}{agent.licence ? ` · Licence ${agent.licence}` : ''} · CEA {agent.cea}{agent.verified ? '' : ' (not yet verified)'}
        </div>
      </div>
      <div className="col-span-2 text-[9.5px] leading-[1.5] tabular-nums text-white @xl:col-span-1 @xl:text-right">
        {agent.mobile && <div>{agent.mobile}</div>}
        {agent.email && <div style={{ color: '#C9D5E3' }}>{agent.email}</div>}
      </div>
    </div>
  );
}

/** Four steps for reading the report. */
export function HowToRead({ deal }: { deal: 'rent' | 'sale' | 'mixed' }) {
  const what = deal === 'sale' ? 'price' : deal === 'rent' ? 'rent' : 'price or rent';
  const steps = [
    { t: 'Start with the numbers', d: `The asking ${what}, the floor area and the rate per sq ft are the basis for every comparison.` },
    { t: 'Check the ranges', d: 'Bars show what similar homes leased or are advertised for. Where the dashed line falls is where this home sits.' },
    { t: 'Walk the neighbourhood', d: 'The diagram places stations, schools, healthcare and daily needs by direction and distance.' },
    { t: 'Read the signals, then decide', d: 'The AI read-out summarises the evidence. Your priorities, and a viewing, decide the rest.' },
  ];
  return (
    <div className="grid grid-cols-1 gap-2 @xl:grid-cols-4">
      {steps.map((s, k) => (
        <div key={s.t} className="min-w-0 px-3 py-2.5" style={{ background: C.tint }}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9.5px] font-bold text-white" style={{ background: C.brand }}>{k + 1}</span>
          <div className="mt-1.5 text-[10px] font-bold leading-tight" style={{ fontFamily: DISPLAY, color: C.brandDeep }}>{s.t}</div>
          <p className="mt-1 text-[8.5px] leading-[1.5]" style={{ color: C.muted }}>{s.d}</p>
        </div>
      ))}
    </div>
  );
}

/** Photographs on a cover: one large, or a mosaic of up to four. */
export function CoverImage({ photos, alt, height, onBroken }: { photos: string[]; alt: string; height: number; onBroken: (src: string) => void }) {
  const shown = photos.slice(0, 4);
  if (!shown.length) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2" style={{ height, background: C.wash, border: `1px solid ${C.hair}` }}>
        <span aria-hidden className="inline-block rotate-45" style={{ width: 16, height: 16, background: C.accent }} />
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.slate }}>No photograph supplied</span>
      </div>
    );
  }
  const img = (src: string, k: number, h: number) => (
    // eslint-disable-next-line @next/next/no-img-element -- our own photo route; must be in the page before printing
    <img key={src} src={src} alt={k === 0 ? alt : ''} onError={() => onBroken(src)} className="block h-full w-full object-cover object-center" style={{ height: h, background: C.wash }} />
  );
  if (shown.length === 1) return img(shown[0], 0, height);
  if (shown.length === 2) return <div className="grid grid-cols-2 gap-1">{shown.map((s, k) => img(s, k, height))}</div>;
  const side = shown.slice(1);
  return (
    <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-1">
      {img(shown[0], 0, height)}
      <div className="grid gap-1" style={{ gridTemplateRows: `repeat(${side.length}, minmax(0, 1fr))` }}>
        {side.map((s, k) => img(s, k + 1, (height - (side.length - 1) * 4) / side.length))}
      </div>
    </div>
  );
}

/** "3 bed · 2 bath", for covers. */
export const layoutShort = (l: DemoListing) => `${l.bedrooms === 0 ? 'Studio' : `${l.bedrooms} bed`} · ${l.bathrooms} bath`;
