"use client";

/**
 * The client report: the document a client receives.
 *
 * One template that scales with the selection, laid out as blocks and broken
 * into pages by measurement (`flow.tsx`):
 *
 *  - **One property**: a cover with the contents; key figures with the
 *    comparable rent band, the price ladder and the AI read-out; the property;
 *    location and neighbourhood; market evidence (position, history, recent
 *    leases, neighbouring developments); what else is advertised; the AI
 *    Analysis; how to read the report; sources.
 *  - **Two or three**: a cover, a shortlist overview with the insights, a
 *    side-by-side comparison with the AI read-out for each, then one page per
 *    property.
 *  - **Four or more**: a cover, a summary table, the comparison on landscape
 *    sheets, then compact snapshots two to a page.
 *
 * Every figure arrives already worked out (`ClientProperty`): the analysis
 * from `lib/phase1/property-insight`, the diagrams' shapes from
 * `lib/phase1/report-digest`. Nothing here calculates, and nothing is shown
 * that the data does not hold: a missing comparison says why, a missing
 * section is left out, a missing photograph gets a plain placeholder.
 */

import React from 'react';
import type { DemoListing } from '../../../../lib/phase1/data';
import type { Project } from '../../../../lib/phase1/market';
import type { MarketPosition } from '../../../../lib/phase1/market-position';
import type { CompetingSet, MarketHistory, RangePosition } from '../../../../lib/phase1/report-insights';
import { RANGE_LABEL, areaName } from '../../../../lib/phase1/report-insights';
import { ANALYSIS_METHOD, OUTLOOK_LABEL, type PropertyInsight } from '../../../../lib/phase1/property-insight';
import type {
  BoardRow, CompetitionBand, PriceLadder, RadarPoint, RecentLeases, RentBand, Signals,
} from '../../../../lib/phase1/report-digest';
import { chunk } from '../../../../lib/phase1/paginate';
import { FlowDocument, type Block, type FlowLayout } from './flow';
import {
  AgentCard, AnalysisCard, BoardTable, CompetitionChart, Contents, CoverImage, FactorList, HowToRead, InShort,
  LadderLegend, LeaseTable, MonthGrid, NearbyBars, PriceLadderChart, RADAR_INK, Radar, RentBandCard, SignalTiles,
  layoutShort, type ContentsEntry, type CoverAgent, type NearbyBarGroup,
} from './client-visuals';
import {
  C, DISPLAY, VERDICT_INK, Badge, Benchmark, Body, Bullets, Eyebrow, Fine, KV, Legend, LineChart,
  Notice, Section, Stats, Table,
  dd, money, psfText, signedPct, sqftText,
  type Col, type FrameProps, type NearestRow,
} from './ui';

/* ================================================================ model */

export interface ClientDigest {
  band: RentBand | null;
  ladder: PriceLadder | null;
  leases: RecentLeases | null;
  board: BoardRow[];
  competition: CompetitionBand[];
  signals: Signals;
  inShort: string;
  radar: RadarPoint[];
}

export interface ClientProperty {
  /** 1-based position in the shortlist. */
  n: number;
  listing: DemoListing;
  /** Development and unit, as printed. */
  name: string;
  address: string;
  districtLine: string;
  deal: 'rent' | 'sale';
  askingRent: number | null;
  salePrice: number | null;
  psf: number | null;
  market: MarketPosition | null;
  history: MarketHistory | null;
  competing: CompetingSet | null;
  range: RangePosition | null;
  insight: PropertyInsight;
  digest: ClientDigest;
  /** Why there is no comparison, when there is none. */
  notCompared: string;
  photo?: string;
  thumb?: string;
  /** Every photograph that loaded, in display order, and their small versions. */
  photos: string[];
  photoThumbs: string[];
  /** OneMap image of the matched address. Undefined when the address has no map position. */
  map?: string;
  /** Stations, schools, healthcare and daily needs around the property, nearest first. */
  nearbyGroups: NearbyGroup[];
  development: Project | null;
  /** Straight-line kilometres to Raffles Place. Null when the address is not placed. */
  cityKm: number | null;
  floorLevel: number | null;
  station: NearestRow;
  /** Short measured facts for "why this property". */
  keyFacts: string[];
  positioning: string;
  listingStatus: string;
}

export type NearbyGroup = NearbyBarGroup;

export interface ClientMeta {
  frame: Omit<FrameProps, 'n' | 'total' | 'section'>;
  forClient: string;
  note: string;
  preparedOn: string;
  agent: CoverAgent & { name: string };
  /** Shortlist insights, already worded. */
  insights: string[];
  sources: { label: string; value: string }[];
  /** Printed while demo data is shown. */
  notice: string | null;
  datasetNote: string | null;
  onBroken: (src: string) => void;
}

/* ============================================================== helpers */

const priceText = (p: ClientProperty) => (p.askingRent !== null ? money(p.askingRent) : p.salePrice !== null ? money(p.salePrice) : '—');
const priceUnit = (p: ClientProperty) => (p.askingRent !== null ? 'per month' : 'asking price');
const psfValue = (p: ClientProperty) => (p.psf === null ? '—' : p.deal === 'rent' ? psfText(p.psf) : `S$${Math.round(p.psf).toLocaleString('en-SG')}`);
const psfUnit = (p: ClientProperty) => (p.psf === null ? 'floor area not stated' : p.deal === 'rent' ? 'psf per month' : 'psf, asking');
const layoutLine = layoutShort;
/** The listing's state in a word or two, for table cells. */
const SHORT_STATUS: Record<DemoListing['status'], string> = {
  published: 'Live', paused: 'Paused', draft: 'Draft', pending_review: 'In review', rejected: 'Not published', expired: 'Expired', suspended: 'Suspended',
};
const CONFIDENCE_TONE = { moderate: 'positive', limited: 'warning', insufficient: 'warning' } as const;
const metresShort = (m: number) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`);
const stationText = (r: NearestRow) => (r.name && r.metres !== undefined ? `${r.name} · ${metresShort(r.metres)}` : null);

/** The nearest school, healthcare place and daily need, in one line. */
const nearbyLine = (p: ClientProperty): React.ReactNode => {
  const bits = p.nearbyGroups.slice(1).map((g) => g.rows[0]).filter(Boolean).map((r) => `${r.name} ${metresShort(r.metres)}`);
  return bits.length ? <span className="line-clamp-2">{bits.join(' · ')}</span> : <span className="italic" style={{ color: C.warn }}>Not available</span>;
};

/** Position on its own comparable range, in the ink the report uses for it. */
function PositionText({ p, short = false }: { p: ClientProperty; short?: boolean }) {
  if (!p.market || !p.range) return <span className="italic" style={{ color: C.warn }}>{p.notCompared}</span>;
  const label = short ? { below: 'Below range', within: 'Within range', above: 'Above range' }[p.range.place] : RANGE_LABEL[p.range.place];
  return <span className="font-semibold" style={{ color: VERDICT_INK[p.market.verdict] }}>{label}</span>;
}

/* ============================================================ primitives */

/**
 * A photograph in a fixed frame, or a plain placeholder of the same size. The
 * frame sets the size, so neither an unusual photograph nor a missing one can
 * move the text around it.
 */
function PhotoFrame({ src, alt, height, onError }: { src?: string; alt: string; height: number; onError?: () => void }) {
  if (!src) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-1.5" style={{ height, background: C.wash, border: `1px solid ${C.hair}` }}>
        <span aria-hidden className="inline-block rotate-45" style={{ width: 9, height: 9, background: C.rule }} />
        <span className="text-[8.5px] font-medium uppercase tracking-[0.12em]" style={{ color: C.faint }}>No photograph supplied</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- our own photo route; must be in the page before printing
    <img src={src} alt={alt} onError={onError} className="block w-full object-cover object-center" style={{ height, background: C.wash }} />
  );
}

/** The OneMap image of the address, or a plain frame saying it could not be placed. */
function MapFrame({ src, alt, height }: { src?: string; alt: string; height: number }) {
  if (!src) {
    return (
      <div className="flex w-full items-center justify-center px-3 text-center" style={{ height, background: C.wash, border: `1px solid ${C.hair}` }}>
        <span className="text-[8.5px] font-medium uppercase tracking-[0.12em]" style={{ color: C.faint }}>Location not verified · no map</span>
      </div>
    );
  }
  return (
    <figure className="min-w-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- proxied from OneMap; must be in the page before printing */}
      <img src={src} alt={alt} className="block w-full object-cover object-center" style={{ height, background: C.wash, border: `1px solid ${C.rule}` }}
        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
      <figcaption className="mt-0.5 text-[7.5px]" style={{ color: C.faint }}>Map: OneMap, Singapore Land Authority</figcaption>
    </figure>
  );
}

/** The photographs after the first, as a strip of equal frames. */
function PhotoStrip({ p, meta, height, max }: { p: ClientProperty; meta: ClientMeta; height: number; max: number }) {
  const extra = p.photoThumbs.slice(1, 1 + max);
  if (!extra.length) return null;
  return (
    <div className="mt-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))` }}>
      {extra.map((src, k) => (
        <PhotoFrame key={src} src={src} alt={`${p.name}, photograph ${k + 2}`} height={height} onError={() => meta.onBroken(p.photos[k + 1])} />
      ))}
    </div>
  );
}

/** The radar and its key: what each colour is and how many of each were found. */
function RadarWithKey({ p, size }: { p: ClientProperty; size: number }) {
  if (!p.digest.radar.length) {
    return (
      <div className="flex items-center justify-center px-3 text-center" style={{ width: size, height: size, background: C.wash, border: `1px solid ${C.hair}` }}>
        <span className="text-[8.5px] font-medium uppercase tracking-[0.12em]" style={{ color: C.faint }}>No measured places to plot</span>
      </div>
    );
  }
  const count = (kind: NearbyGroup['kind']) => p.digest.radar.filter((r) => r.kind === kind).length;
  return (
    <figure className="min-w-0">
      <Radar points={p.digest.radar} size={size} />
      <figcaption className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[8px]" style={{ color: C.muted }}>
        {p.nearbyGroups.map((g) => (
          <span key={g.kind} className="inline-flex items-center gap-1">
            <span aria-hidden className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: RADAR_INK[g.kind] }} />
            {g.label} {count(g.kind)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

const BUS_NOTE = 'Straight-line distances from the matched address; walking times at 80 m a minute. Bus stops are not shown: no bus-stop dataset is connected.';

function AgentNote({ meta }: { meta: ClientMeta }) {
  if (!meta.note) return null;
  return (
    <div className="px-4 py-3" style={{ borderLeft: `3px solid ${C.accent}`, background: C.wash }}>
      <Eyebrow color={C.accent}>A note from {meta.agent.name}</Eyebrow>
      <p className="mt-1 whitespace-pre-line text-[10.5px] leading-[1.6]" style={{ color: C.text }}>{meta.note}</p>
    </div>
  );
}

function ConfidenceBadge({ insight }: { insight: PropertyInsight }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[9px]" style={{ color: C.muted }}>
      Evidence <Badge tone={CONFIDENCE_TONE[insight.confidence.level]}>{insight.confidence.label}</Badge>
    </span>
  );
}

function OutlookLabel() {
  return (
    <div className="mt-1.5 inline-flex items-center gap-1.5 text-[8px] font-semibold" style={{ color: C.slate }}>
      <span aria-hidden className="inline-block h-[5px] w-[5px] rotate-45" style={{ background: C.slate }} />
      {OUTLOOK_LABEL}
    </div>
  );
}

function SheetTitle({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-1 text-[20px] font-bold leading-[1.2] tracking-[-0.015em]" style={{ fontFamily: DISPLAY, color: C.brandDeep }}>{title}</h2>
      {sub && <div className="mt-1 text-[10px] leading-[1.55]" style={{ color: C.muted }}>{sub}</div>}
    </div>
  );
}

/**
 * Each property's asking rate on its own comparable range: the range as a
 * track, the middle half as a band, the median as a rule, the property as a
 * marker. Properties in different markets are compared by where they sit,
 * not by their raw rates.
 */
function PositionStrips({ rows, dense = false }: { rows: ClientProperty[]; dense?: boolean }) {
  const W = 300;
  const H = 18;
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-4 pb-1 text-[7.5px] font-semibold uppercase tracking-[0.1em] @xl:grid-cols-[minmax(0,1fr)_300px_92px]" style={{ color: C.slate, borderBottom: `1px solid ${C.rule}` }}>
        <span>Property</span><span className="hidden @xl:block">Asking rate on its comparable range</span><span className="text-right">vs median</span>
      </div>
      {rows.map((p) => {
        const m = p.market;
        return (
          <div key={p.listing.id} className={`grid grid-cols-[minmax(0,1fr)_92px] items-center gap-x-4 gap-y-1 ${dense ? 'py-[3px]' : 'py-[5px]'} @xl:grid-cols-[minmax(0,1fr)_300px_92px]`} style={{ borderBottom: `1px solid ${C.hair}` }}>
            <span className="min-w-0 text-[9.5px] leading-[1.35]" style={{ color: C.ink }}>
              <span style={{ color: C.faint }}>{dd(p.n)} </span>{p.name}
            </span>
            {m ? (() => {
              const lo = Math.min(m.minPsf, m.unitPsf);
              const hi = Math.max(m.maxPsf, m.unitPsf);
              const pad = (hi - lo) * 0.08 || 0.2;
              const x = (v: number) => 6 + ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (W - 12);
              const ink = VERDICT_INK[m.verdict];
              return (
                <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="order-last col-span-2 max-w-full @xl:order-none @xl:col-span-1" role="img" aria-label={`Asking ${psfText(m.unitPsf)} psf against a range of ${psfText(m.minPsf)} to ${psfText(m.maxPsf)}`}>
                  <rect x={x(m.minPsf)} y={H / 2 - 3} width={Math.max(2, x(m.maxPsf) - x(m.minPsf))} height={6} fill={C.hair} />
                  <rect x={x(m.q1Psf)} y={H / 2 - 3} width={Math.max(2, x(m.q3Psf) - x(m.q1Psf))} height={6} fill={C.brand} opacity={0.25} />
                  <line x1={x(m.medianPsf)} x2={x(m.medianPsf)} y1={2} y2={H - 2} stroke={C.brandDeep} strokeWidth={1.5} />
                  <path d={`M${x(m.unitPsf)} ${H / 2 - 6} l5 6 l-5 6 l-5 -6 z`} fill={ink} stroke="#fff" strokeWidth={1.2} />
                </svg>
              );
            })() : (
              <span className="order-last col-span-2 text-[9px] italic @xl:order-none @xl:col-span-1" style={{ color: C.warn }}>{p.notCompared}</span>
            )}
            <span className="text-right text-[9.5px] tabular-nums">
              {m ? (
                <>
                  <span className="font-bold" style={{ color: VERDICT_INK[m.verdict] }}>{signedPct(m.deltaPct)}</span>
                  {!dense && <span className="block text-[8px]" style={{ color: C.faint }}>{psfText(m.unitPsf)} vs {psfText(m.medianPsf)}</span>}
                </>
              ) : <span style={{ color: C.faint }}>—</span>}
            </span>
          </div>
        );
      })}
      <Legend items={[
        { label: 'Observed range', swatch: 'band', color: C.hair },
        { label: 'Middle half', swatch: 'band', color: `${C.brand}40` },
        { label: 'Median', swatch: 'line', color: C.brandDeep },
        { label: 'Asking rate', swatch: 'dot', color: C.inline },
      ]} />
    </div>
  );
}

const SIGNAL_INK = { good: C.below, watch: C.warn, neutral: C.brand, none: C.faint } as const;

/** The four AI signals for every property, one row each. */
function SignalsMatrix({ rows }: { rows: ClientProperty[] }) {
  const heads = ['Price check', 'Market direction', 'Getting around', 'Evidence'];
  return (
    <div className="vr-wide">
      <table className="w-full border-collapse text-left text-[9.5px]" style={{ tableLayout: 'fixed', minWidth: 560 }}>
        <colgroup><col style={{ width: '28%' }} />{heads.map((h) => <col key={h} />)}</colgroup>
        <thead>
          <tr style={{ background: C.tint }}>
            <th className="py-1.5 pl-2 pr-3 text-[8px] font-semibold uppercase tracking-[0.09em]" style={{ color: C.slate, borderBottom: `1px solid ${C.rule}` }}>Property</th>
            {heads.map((h) => <th key={h} className="py-1.5 pr-3 text-[8px] font-semibold uppercase tracking-[0.09em]" style={{ color: C.slate, borderBottom: `1px solid ${C.rule}` }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const s = p.digest.signals;
            return (
              <tr key={p.listing.id} style={{ borderBottom: `1px solid ${C.hair}` }}>
                <td className="py-[5px] pl-2 pr-3 align-top leading-[1.3]"><span style={{ color: C.faint }}>{dd(p.n)} </span><span className="font-semibold">{p.name}</span></td>
                {[s.price, s.momentum, s.access, s.evidence].map((v, k) => (
                  <td key={k} className="py-[5px] pr-3 align-top">
                    <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: v.tone === 'none' ? C.muted : SIGNAL_INK[v.tone] }}>
                      <span aria-hidden className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: SIGNAL_INK[v.tone] }} />
                      {v.value}
                    </span>
                    <span className="block truncate text-[8px]" style={{ color: C.muted }}>{v.caption}</span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================ blocks */

function guideBlock(deal: 'rent' | 'sale' | 'mixed'): Block {
  return {
    key: 'guide',
    section: 'Reading this report',
    node: <Section label="How to read this report" className="mt-0"><HowToRead deal={deal} /></Section>,
  };
}

function sourcesBlock(meta: ClientMeta): Block {
  return {
      key: 'sources',
      section: 'Sources and notes',
      node: (
        <Section label="Sources and notes" className="mt-0">
          <div className="grid gap-1 text-[8.5px] leading-[1.55]" style={{ color: C.muted }}>
            <p>
              {meta.sources.map((src, k) => (
                <React.Fragment key={src.label}>
                  {k > 0 && ' · '}
                  <span style={{ color: C.slate }}>{src.label}:</span> <span style={{ color: C.text }}>{src.value}</span>
                </React.Fragment>
              ))}.
            </p>
            {meta.notice && <p><strong style={{ color: C.warn }}>{meta.notice}.</strong> {meta.datasetNote}</p>}
            <p>
              {ANALYSIS_METHOD} Prepared for the named recipient with particulars correct on {meta.preparedOn}; not a valuation, survey or offer.
              Ranges and bands compare the asking figure with recorded or advertised figures and do not value the home. Past movement does not
              predict future rents or prices. Confirm anything that matters to you, including school eligibility, before committing.
            </p>
          </div>
        </Section>
      ),
  };
}

function insightsBlock(meta: ClientMeta, section: string, landscape = false): Block {
  return {
    key: 'insights',
    section,
    landscape,
    node: <Section label="Shortlist insights" note="Factual differences, not a ranking" className="mt-0"><Bullets items={meta.insights} /></Section>,
  };
}

/** The first page: what the report is about and who prepared it, with the contents. */
function coverBlock(meta: ClientMeta, opts: {
  eyebrow: string; title: React.ReactNode; sub: React.ReactNode; photos: string[]; alt: string; imageHeight: number;
  facts: React.ReactNode; contents: ContentsEntry[];
}): Block {
  return {
    key: 'cover',
    section: 'Client report',
    node: (
      <div className="grid gap-4">
        <div className="flex items-baseline justify-between gap-6 pb-2" style={{ borderBottom: `2px solid ${C.brandDeep}` }}>
          <Eyebrow color={C.accent}>{opts.eyebrow}</Eyebrow>
          <span className="shrink-0 text-[9px] tabular-nums" style={{ color: C.muted }}>{meta.preparedOn}</span>
        </div>
        <div>
          {meta.forClient && <div className="text-[10px] font-semibold" style={{ color: C.accent }}>Prepared for {meta.forClient}</div>}
          <h1 className="mt-0.5 text-[28px] font-bold leading-[1.1] tracking-[-0.02em]" style={{ fontFamily: DISPLAY, color: C.brandDeep }}>{opts.title}</h1>
          <div className="mt-1.5 text-[10.5px] leading-[1.55]" style={{ color: C.muted }}>{opts.sub}</div>
        </div>
        <CoverImage photos={opts.photos} alt={opts.alt} height={opts.imageHeight} onBroken={meta.onBroken} />
        {opts.facts}
        <Contents entries={opts.contents} />
        <AgentCard agent={meta.agent} />
      </div>
    ),
  };
}

/* ---------------------------------------------------- one property */

function singleBlocks(p: ClientProperty, meta: ClientMeta): Block[] {
  const l = p.listing;
  const m = p.market;
  const h = p.history;
  const i = p.insight;
  const d = p.digest;
  const c = p.competing;
  const dev = p.development;
  const blocks: Block[] = [];
  const contents: ContentsEntry[] = [
    { label: 'Key figures and AI read-out', blockKey: 'glance' },
    { label: 'How to read this report', blockKey: 'guide' },
    { label: 'The property', blockKey: 'details' },
    { label: 'Location and neighbourhood', blockKey: 'location' },
  ];
  if (m && p.range) contents.push({ label: 'Market evidence', blockKey: 'market-head' });
  if (d.leases || d.board.length) contents.push({ label: 'Recent leases and neighbours', blockKey: d.leases ? 'leases' : 'board' });
  if (c && c.sample > 0) contents.push({ label: 'What else is advertised', blockKey: 'competition' });
  contents.push({ label: 'AI Analysis', blockKey: 'analysis-head' }, { label: 'Sources and notes', blockKey: 'sources' });

  blocks.push(coverBlock(meta, {
    eyebrow: `Property report · ${p.deal === 'rent' ? 'For rent' : 'For sale'}`,
    title: p.name,
    sub: <>{p.address}<br />{p.districtLine} · {l.propertyType}</>,
    photos: p.photos,
    alt: p.name,
    imageHeight: p.photos.length ? 330 : 150,
    facts: (
      <Stats cols={5} lead items={[
        { label: p.deal === 'rent' ? 'Asking rent' : 'Asking price', value: priceText(p), sub: priceUnit(p) },
        { label: 'Per sq ft', value: psfValue(p), sub: psfUnit(p) },
        { label: 'Layout', value: layoutLine(l), sub: l.furnishing },
        { label: 'Floor area', value: sqftText(l.sizeSqft), sub: `${Math.round(l.sizeSqft * 0.092903)} m²` },
        { label: p.deal === 'rent' ? 'Available' : 'Viewings', value: dayShort(l.availableFrom), sub: SHORT_STATUS[l.status] === 'Live' ? 'Live on V-RENT' : SHORT_STATUS[l.status] },
      ]} />
    ),
    contents,
  }));

  /* ---- key figures: the band, the ladder, the AI read-out */
  blocks.push({
    key: 'glance',
    section: 'Key figures',
    breakBefore: true,
    keepWithNext: true,
    node: (
      <div>
        <SheetTitle eyebrow="Key figures" title="How the asking price lines up"
          sub={d.ladder ? 'Each bar is a range of real figures for similar homes. The dashed line is this property.' : 'No range of comparable figures is available for this property; the reasons are given below.'} />
        {d.band && p.askingRent !== null && <RentBandCard band={d.band} asking={p.askingRent} sizeSqft={l.sizeSqft} />}
      </div>
    ),
  });
  if (d.ladder) {
    blocks.push({
      key: 'ladder',
      section: 'Key figures',
      node: (
        <Section label="Price ladder" note={p.deal === 'rent' ? 'Monthly rent' : 'Asking price'} className="mt-0">
          <PriceLadderChart ladder={d.ladder} />
          <LadderLegend ladder={d.ladder} />
        </Section>
      ),
    });
  } else {
    blocks.push({ key: 'ladder', section: 'Key figures', node: <Notice tone="warn" title={p.notCompared}>{i.current.summary}</Notice> });
  }
  blocks.push({
    key: 'signals',
    section: 'Key figures',
    node: (
      <Section label="AI read-out" note="Indicative · from the figures in this report" className="mt-0">
        <InShort text={d.inShort} />
        <div className="mt-2.5"><SignalTiles s={d.signals} /></div>
      </Section>
    ),
  });
  blocks.push(guideBlock(p.deal));

  /* ---- the property */
  blocks.push({
    key: 'details',
    section: 'The property',
    breakBefore: true,
    node: (
      <div>
        <SheetTitle eyebrow="The property" title={l.project} sub={`${l.propertyType} · ${p.districtLine}`} />
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 @xl:grid-cols-2">
          <Section label="Home and building" className="mt-0">
            <KV wrap labelWidth="46%" rows={[
              ['Type', l.propertyType],
              ['Development', l.project],
              ['Tenure', l.tenure ?? (dev ? dev.tenure : 'Not stated')],
              ['Completed', l.builtYear ? String(l.builtYear) : dev ? String(dev.built) : 'Not stated'],
              ['Floor level', p.floorLevel ? `Level ${p.floorLevel}` : 'Not stated'],
              ['Floor area', `${sqftText(l.sizeSqft)} (${Math.round(l.sizeSqft * 0.092903)} m²)`],
              ['To the city centre', p.cityKm !== null ? `${p.cityKm.toFixed(1)} km straight-line to Raffles Place` : 'Location not verified'],
            ]} />
          </Section>
          <Section label="The listing" className="mt-0">
            <KV wrap labelWidth="46%" rows={[
              ['Status', p.listingStatus],
              ...(p.deal === 'rent' ? [
                ['Minimum lease', `${l.minLeaseMonths} months`],
                ['Deposit', l.depositMonths ? `${l.depositMonths} month${l.depositMonths === 1 ? '' : 's'}` : 'Not stated'],
              ] as [string, string][] : []),
              ['Furnishing', l.furnishing],
              ['Layout', layoutLine(l)],
              ['Listed by', meta.agent.name],
            ]} />
          </Section>
        </div>
      </div>
    ),
  });
  blocks.push({
    key: 'why',
    section: 'The property',
    node: (
      <div>
        <Section label="Why this property" className="mt-0">
          <p className="text-[11.5px] font-semibold leading-[1.5]" style={{ color: C.brand }}>{p.positioning}</p>
          {p.keyFacts.length > 0 && <Bullets className="mt-2" items={p.keyFacts} />}
          {l.description && <Body className="mt-2 line-clamp-4 text-[10px]">{l.description}</Body>}
        </Section>
        {meta.note && <div className="mt-3"><AgentNote meta={meta} /></div>}
      </div>
    ),
  });
  if (p.photos.length > 1) {
    blocks.push({
      key: 'gallery',
      section: 'The property',
      node: (
        <Section label="Photographs" note={`${p.photos.length} supplied by the agent`} className="mt-0">
          <div className="grid grid-cols-2 gap-2 @xl:grid-cols-3">
            {p.photos.slice(1, 10).map((src, k) => (
              <PhotoFrame key={src} src={p.photoThumbs[k + 1] ?? src} alt={`${p.name}, photograph ${k + 2}`} height={150} onError={() => meta.onBroken(src)} />
            ))}
          </div>
        </Section>
      ),
    });
  }

  /* ---- location */
  blocks.push({
    key: 'location',
    section: 'Location',
    node: (
      <div>
        <SheetTitle eyebrow="Location" title="The neighbourhood at a glance" sub="The map shows the street; the diagram shows what is within 2 km, by direction and distance." />
        <div className="grid grid-cols-1 items-start gap-5 @xl:grid-cols-[minmax(0,1fr)_236px]">
          <MapFrame src={p.map} alt={`Map showing ${l.project}`} height={262} />
          <RadarWithKey p={p} size={236} />
        </div>
      </div>
    ),
  });
  blocks.push({
    key: 'nearby',
    section: 'Location',
    node: (
      <Section label="Nearby" note="Nearest first" className="mt-0">
        <NearbyBars groups={p.nearbyGroups} max={4} />
        <Fine>{BUS_NOTE}</Fine>
      </Section>
    ),
  });

  /* ---- market evidence: only with evidence to show */
  if (m && p.range) {
    blocks.push({
      key: 'market-head',
      section: 'Market evidence',
      keepWithNext: true,
      node: (
        <div>
          <SheetTitle eyebrow="Market evidence" title="Against comparable leases"
            sub={<>{m.basisLabel} · {m.sample} comparable lease contracts · {m.period.from} to {m.period.to}</>} />
          <Stats cols={4} lead items={[
            { label: 'Asking rent', value: priceText(p), sub: `${psfText(m.unitPsf)} psf` },
            { label: 'Comparable median', value: money(m.medianRent), sub: `${psfText(m.medianPsf)} psf` },
            { label: 'Difference', value: signedPct(m.deltaPct), sub: 'on rate per sq ft', color: VERDICT_INK[m.verdict] },
            { label: 'Position', value: { below: 'Below', within: 'Within', above: 'Above' }[p.range.place], sub: p.range.higherThanPct === 0 ? 'under every comparable contract' : p.range.higherThanPct === 100 ? 'over every comparable contract' : `higher than ${p.range.higherThanPct}% of contracts`, color: VERDICT_INK[m.verdict] },
          ]} />
          {!m.local && m.fallbackNote && <div className="mt-2.5"><Notice tone="warn" title="Local sample insufficient">{m.fallbackNote}</Notice></div>}
        </div>
      ),
    });
    blocks.push({
      key: 'benchmark',
      section: 'Market evidence',
      node: (
        <Section label="Where the asking rate sits" note="S$ per sq ft per month" className="mt-0">
          <Benchmark m={m} place={p.range.place} />
          <Legend items={[
            { label: 'Observed range', swatch: 'band', color: C.hair },
            { label: 'Middle half of contracts', swatch: 'band', color: `${C.brand}3D` },
            { label: 'Median', swatch: 'line', color: C.brandDeep },
            { label: 'This property', swatch: 'dot', color: VERDICT_INK[m.verdict] },
          ]} />
        </Section>
      ),
    });
  }
  if (h) {
    const rate = p.askingRent !== null && l.sizeSqft > 0 ? p.askingRent / l.sizeSqft : null;
    blocks.push({
      key: 'history',
      section: 'Market evidence',
      node: (
        <Section label={`Twelve months in ${h.scope === 'development' ? l.project : `District ${dd(l.district)}`}`} note={`Median rent per sq ft each month · ${h.sample} leases · five-year records not held`} className="mt-0">
          <LineChart values={h.points.map((pt) => pt.medianPsf)} labels={h.points.map((pt) => pt.label)}
            reference={rate !== null ? { value: rate, label: `This property ${psfText(rate)}` } : undefined} fmt={psfText} height={132} />
          <div className="mt-1.5"><MonthGrid h={h} /></div>
        </Section>
      ),
    });
  }
  if (d.leases) {
    blocks.push({
      key: 'leases',
      section: 'Recent leases',
      node: (
        <Section label={`Latest leases · ${h?.scope === 'development' ? l.project : `District ${dd(l.district)}`}`} note={`${d.leases.rows.length} newest of ${d.leases.of} · ${d.leases.scope}`} className="mt-0">
          <LeaseTable leases={d.leases} />
        </Section>
      ),
    });
  }
  if (d.board.length) {
    blocks.push({
      key: 'board',
      section: 'Neighbouring developments',
      node: (
        <Section label="Neighbouring developments" note={`${l.bedrooms === 0 ? 'Studio' : `${l.bedrooms}-bedroom`} leases, past 12 months`} className="mt-0">
          <BoardTable rows={d.board} />
        </Section>
      ),
    });
  }
  if (m && p.range) {
    const shown = m.rows.slice(0, 6);
    blocks.push({
      key: 'comparables',
      section: 'Market evidence',
      node: (
        <Section label="Most similar homes" note={`${shown.length} of ${m.sample} · closest in size, then newest`} className="mt-0">
          <Table dense wrap
            cols={[{ head: 'Month', width: '13%' }, { head: 'Development', width: '33%' }, { head: 'Beds', align: 'right', width: '8%' }, { head: 'Size', align: 'right', width: '15%' }, { head: 'Rent', align: 'right', width: '15%' }, { head: 'PSF', align: 'right' }]}
            rows={shown.map((t) => [
              <span key="m" style={{ color: C.muted }}>{monthShort(t.month)}</span>,
              <span key="p" className="font-semibold">{t.project}</span>,
              t.bedrooms, sqftText(t.sizeSqft), money(t.monthlyRent), psfText(t.psf),
            ])} />
          {meta.datasetNote && <Fine>{meta.datasetNote}</Fine>}
        </Section>
      ),
    });
  }

  /* ---- what else is advertised */
  if (c && c.sample > 0) {
    const ask = p.askingRent ?? p.salePrice ?? 0;
    blocks.push({
      key: 'competition',
      section: 'Market competition',
      keepWithNext: true,
      node: (
        <div>
          <SheetTitle eyebrow="Market competition" title="What else is advertised"
            sub={<>{c.basisLabel} · {c.sample} similar {c.sample === 1 ? 'home' : 'homes'} advertised now · asking figures, not agreed terms</>} />
          {!(m && p.range) && <div className="mb-3"><Notice tone="warn" title={p.notCompared}>The asking {p.deal === 'rent' ? 'rent' : 'price'} is compared with listings currently advertised instead.</Notice></div>}
          {d.competition.length > 0 && ask > 0 && <CompetitionChart bands={d.competition} asking={ask} />}
        </div>
      ),
    });
    blocks.push({
      key: 'competing',
      section: 'Market competition',
      node: (
        <div>
          <Stats items={[
            { label: 'This property', value: psfValue(p), sub: psfUnit(p) },
            { label: 'Listings found', value: String(c.sample), sub: `${c.lowerPsfCount} ask less per sq ft` },
            { label: 'Median asking', value: c.medianPsf !== null ? (p.deal === 'rent' ? psfText(c.medianPsf) : `S$${Math.round(c.medianPsf).toLocaleString('en-SG')}`) : 'Too few', sub: c.medianPsf !== null ? 'per sq ft' : '5 or more needed' },
            { label: 'Difference', value: c.deltaPct !== null ? signedPct(c.deltaPct) : '—', sub: c.deltaPct !== null ? 'on asking per sq ft' : 'not calculated' },
          ]} />
          <div className="mt-3">
            <Table dense wrap
              cols={[{ head: 'Development', width: '32%' }, { head: 'Where', width: '17%' }, { head: 'Size', align: 'right', width: '14%' }, { head: 'Asking', align: 'right', width: '15%' }, { head: 'PSF', align: 'right', width: '11%' }, { head: 'Listed', align: 'right' }]}
              rows={c.items.slice(0, 8).map((x) => [
                <span key="p" className="font-semibold">{x.project}</span>,
                <span key="m" style={{ color: C.muted }}>{x.match}</span>,
                sqftText(x.sizeSqft),
                p.deal === 'rent' ? `${money(x.price)}/mo` : money(x.price),
                p.deal === 'rent' ? psfText(x.psf) : `S$${Math.round(x.psf).toLocaleString('en-SG')}`,
                <span key="d" style={{ color: C.muted }}>{x.daysListed === null ? '—' : `${x.daysListed} days`}</span>,
              ])} />
          </div>
        </div>
      ),
    });
  }

  /* ---- AI Analysis */
  blocks.push({
    key: 'analysis-head',
    section: 'AI Analysis',
    breakBefore: true,
    keepWithNext: true,
    node: (
      <div>
        <SheetTitle eyebrow="AI Analysis" title="What the evidence says"
          sub={<span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1"><span>Four questions, answered from the figures in this report</span><ConfidenceBadge insight={i} /></span>} />
        <InShort text={d.inShort} />
      </div>
    ),
  });
  blocks.push({
    key: 'analysis-cards',
    section: 'AI Analysis',
    node: (
      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
        <AnalysisCard icon="history" label="Past 5 years" headline={i.historical.headline}>{i.historical.summary}</AnalysisCard>
        <AnalysisCard icon="target" label="Current position" headline={i.current.headline} ink={m ? VERDICT_INK[m.verdict] : C.brandDeep}>{i.current.summary}</AnalysisCard>
        <AnalysisCard icon="compass" label="Forward outlook" headline={i.outlook.headline}>
          <p>{i.outlook.summary}</p>
          {i.outlook.drivers.length > 0 && <Bullets className="mt-1.5" items={i.outlook.drivers.slice(0, 2)} />}
          <OutlookLabel />
        </AnalysisCard>
        <AnalysisCard icon="list" label="Key factors">
          <div className="mt-0.5"><FactorList items={i.factors} /></div>
        </AnalysisCard>
      </div>
    ),
  });
  if (i.limitations.length) {
    blocks.push({ key: 'limits', section: 'AI Analysis', node: <Fine className="mt-0">Evidence: {i.confidence.reason}. Limitations: {i.limitations.join(' ')}</Fine> });
  }
  blocks.push(sourcesBlock(meta));
  return blocks;
}

/* ---------------------------------------------------- snapshots */

function snapshotFacts(p: ClientProperty): [string, React.ReactNode][] {
  const l = p.listing;
  const m = p.market;
  return [
    [p.deal === 'rent' ? 'Asking rent' : 'Asking price', <span key="a" className="font-bold">{priceText(p)}{p.askingRent !== null ? ' /mo' : ''}</span>],
    ['Per sq ft', `${psfValue(p)}${p.psf !== null ? (p.deal === 'rent' ? ' /mo' : '') : ''}`],
    ['Floor area', sqftText(l.sizeSqft)],
    ['Layout', `${layoutLine(l)} · ${l.furnishing}`],
    ['Type · tenure', `${l.propertyType}${l.tenure ?? p.development?.tenure ? ` · ${l.tenure ?? p.development?.tenure}` : ''}`],
    ['Nearest MRT', stationText(p.station) ?? <span key="s" className="italic" style={{ color: C.warn }}>{p.station.fallback}</span>],
    ['Also nearby', nearbyLine(p)],
    ['Comparable median', m ? `${psfText(m.medianPsf)} psf · ${m.sample} contracts` : <span key="c" className="italic" style={{ color: C.warn }}>{p.notCompared}</span>],
    ['Position', <PositionText key="pos" p={p} />],
  ];
}

function SnapshotHead({ p }: { p: ClientProperty }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-3 pb-2" style={{ borderBottom: `2px solid ${C.brandDeep}` }}>
      <span className="text-[22px] font-bold leading-none tabular-nums" style={{ fontFamily: DISPLAY, color: C.accent }}>{dd(p.n)}</span>
      <div className="min-w-0">
        <div className="text-[16px] font-bold leading-[1.2]" style={{ fontFamily: DISPLAY, color: C.brandDeep }}>{p.name}</div>
        <div className="text-[9.5px] leading-[1.45]" style={{ color: C.muted }}>{p.address} · {p.districtLine}</div>
      </div>
      <div className="text-right">
        <div className="text-[16px] font-bold leading-none tabular-nums" style={{ fontFamily: DISPLAY, color: C.brand }}>{priceText(p)}</div>
        <div className="mt-0.5 text-[8.5px]" style={{ color: C.muted }}>{priceUnit(p)}</div>
      </div>
    </div>
  );
}

/**
 * A property's own two pages in a shortlist of two or three: the home, its AI
 * read-out and analysis; then where it is and how its price lines up.
 */
function fullSnapshot(p: ClientProperty, meta: ClientMeta, total: number): Block[] {
  const i = p.insight;
  const d = p.digest;
  const section = `Property ${dd(p.n)} of ${dd(total)}`;
  const blocks: Block[] = [
    {
      key: `snap-${p.listing.id}`,
      section,
      breakBefore: true,
      node: (
        <div>
          <SnapshotHead p={p} />
          <div className="mt-3.5 grid grid-cols-1 gap-4 @xl:grid-cols-[292px_minmax(0,1fr)] @xl:gap-5">
            <div className="min-w-0">
              <PhotoFrame src={p.photo} alt={p.name} height={p.photos.length > 1 ? 150 : 188} onError={p.photo ? () => meta.onBroken(p.photo!) : undefined} />
              <PhotoStrip p={p} meta={meta} height={36} max={4} />
            </div>
            <KV wrap labelWidth="38%" rows={snapshotFacts(p)} />
          </div>
        </div>
      ),
    },
    {
      key: `snap-ai-${p.listing.id}`,
      section,
      node: (
        <Section label="AI read-out" note={<ConfidenceBadge insight={i} />} className="mt-0">
          <InShort text={d.inShort} compact />
          <div className="mt-2"><SignalTiles s={d.signals} compact /></div>
        </Section>
      ),
    },
    {
      key: `snap-analysis-${p.listing.id}`,
      section,
      node: (
        <div className="grid grid-cols-1 gap-2.5 @xl:grid-cols-2">
          <AnalysisCard icon="history" label="Past 5 years">{i.historical.short}</AnalysisCard>
          <AnalysisCard icon="target" label="Current position">{i.current.short}</AnalysisCard>
          <AnalysisCard icon="compass" label="Forward outlook">
            <p>{i.outlook.short}</p>
            <OutlookLabel />
          </AnalysisCard>
          <AnalysisCard icon="list" label="Key factors"><FactorList items={i.factors.slice(0, 3)} /></AnalysisCard>
        </div>
      ),
    },
    {
      key: `snap-place-${p.listing.id}`,
      section,
      breakBefore: true,
      node: (
        <div>
          <SheetTitle eyebrow={`${dd(p.n)} · Location and price`} title={p.name} sub="The map shows the street; the diagram shows what is within 2 km, by direction and distance." />
          <div className="grid grid-cols-1 items-start gap-5 @xl:grid-cols-[minmax(0,1fr)_236px]">
            <MapFrame src={p.map} alt={`Map showing ${p.listing.project}`} height={250} />
            <RadarWithKey p={p} size={236} />
          </div>
        </div>
      ),
    },
    {
      key: `snap-nearby-${p.listing.id}`,
      section,
      node: (
        <Section label="Nearby" note="Nearest first" className="mt-0">
          <NearbyBars groups={p.nearbyGroups} max={3} />
          <Fine>{BUS_NOTE}</Fine>
        </Section>
      ),
    },
  ];
  if (d.ladder) {
    blocks.push({
      key: `snap-ladder-${p.listing.id}`,
      section,
      node: (
        <Section label="Price ladder" note={p.deal === 'rent' ? 'Monthly rent' : 'Asking price'} className="mt-0">
          <PriceLadderChart ladder={d.ladder} />
          <LadderLegend ladder={d.ladder} />
        </Section>
      ),
    });
  }
  return blocks;
}

/** Half a page: photograph, map, facts and the AI read-out, for longer shortlists. */
function compactSnapshot(p: ClientProperty, meta: ClientMeta, first: boolean, total: number): Block {
  const i = p.insight;
  return {
    key: `snap-${p.listing.id}`,
    section: `Property snapshots · ${total} properties`,
    breakBefore: first,
    node: (
      <div>
        <SnapshotHead p={p} />
        <div className="mt-2.5 grid grid-cols-1 gap-3 @xl:grid-cols-[150px_118px_minmax(0,1fr)]">
          <div className="min-w-0">
            <PhotoFrame src={p.thumb} alt={p.name} height={p.photos.length > 1 ? 88 : 118} onError={p.thumb ? () => meta.onBroken(p.photo ?? p.thumb!) : undefined} />
            <PhotoStrip p={p} meta={meta} height={26} max={3} />
          </div>
          <MapFrame src={p.map} alt={`Map showing ${p.listing.project}`} height={108} />
          <div className="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
            <KV wrap labelWidth="44%" rows={snapshotFacts(p).slice(0, 5)} />
            <KV wrap labelWidth="44%" rows={snapshotFacts(p).slice(5)} />
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-1.5">
          <SignalTiles s={p.digest.signals} compact />
          <FactorList items={i.factors.slice(0, 2)} columns={2} />
          <OutlookLabel />
        </div>
      </div>
    ),
  };
}

/* ---------------------------------------------------- overview tables */

function summaryRows(ps: ClientProperty[], withThumbs: boolean) {
  return ps.map((p) => [
    <span key="n" className="tabular-nums" style={{ color: C.faint }}>{dd(p.n)}</span>,
    <div key="p" className={withThumbs ? 'grid grid-cols-[46px_minmax(0,1fr)] items-center gap-2.5' : ''}>
      {withThumbs && <PhotoThumb p={p} />}
      <div className="min-w-0">
        <div className="font-semibold leading-[1.3]">{p.name}</div>
        <div className="text-[8.5px]" style={{ color: C.muted }}>{p.deal === 'rent' ? 'For rent' : 'For sale'} · {layoutLine(p.listing)}</div>
      </div>
    </div>,
    <span key="t" style={{ color: C.muted }}>{p.listing.propertyType}</span>,
    <span key="l">D{dd(p.listing.district)} <span style={{ color: C.muted }}>{areaName(p.listing.district)}</span></span>,
    sqftText(p.listing.sizeSqft),
    <span key="a" className="font-semibold">{priceText(p)}{p.askingRent !== null ? <span className="font-normal" style={{ color: C.muted }}> /mo</span> : null}</span>,
    psfValue(p),
    <span key="s" style={{ color: C.muted }}>{SHORT_STATUS[p.listing.status]}</span>,
  ]);
}

function PhotoThumb({ p }: { p: ClientProperty }) {
  return p.thumb
    // eslint-disable-next-line @next/next/no-img-element -- our own photo route; must print
    ? <img src={p.thumb} alt="" className="block h-[34px] w-[46px] object-cover" style={{ background: C.wash }} />
    : <span aria-hidden className="block h-[34px] w-[46px]" style={{ background: C.wash, border: `1px solid ${C.hair}` }} />;
}

const SUMMARY_COLS: Col[] = [
  { head: '#', width: '5%' }, { head: 'Property', width: '31%' }, { head: 'Type', width: '12%' }, { head: 'Location', width: '15%' },
  { head: 'Size', align: 'right', width: '10%' }, { head: 'Asking', align: 'right', width: '12%' }, { head: 'PSF', align: 'right', width: '7%' }, { head: 'Status', align: 'right' },
];

function shortlistCover(ps: ClientProperty[], meta: ClientMeta, contents: ContentsEntry[]): Block {
  const rents = ps.map((p) => p.askingRent).filter((v): v is number => v !== null);
  const districts = [...new Set(ps.map((p) => p.listing.district))].sort((a, b) => a - b);
  const photos = ps.map((p) => p.photo).filter((s): s is string => Boolean(s));
  const listed = ps.slice(0, 6);
  return coverBlock(meta, {
    eyebrow: 'Property shortlist',
    title: `${ps.length} homes, compared`,
    sub: <>
      {districts.map((d) => `D${dd(d)} ${areaName(d)}`).join(' · ')}
      {rents.length > 0 && <><br />Asking rents {rents.length > 1 ? `${money(Math.min(...rents))} to ${money(Math.max(...rents))}` : money(rents[0])} a month</>}
    </>,
    photos,
    alt: 'Shortlisted properties',
    imageHeight: photos.length ? (ps.length > 3 ? 250 : 280) : 120,
    facts: (
      <ol className="grid grid-cols-1 gap-x-6 @xl:grid-cols-2">
        {listed.map((p) => (
          <li key={p.listing.id} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-baseline gap-2 py-[4px]" style={{ borderBottom: `1px solid ${C.hair}` }}>
            <span className="text-[10px] font-bold tabular-nums" style={{ fontFamily: DISPLAY, color: C.accent }}>{dd(p.n)}</span>
            <span className="min-w-0 truncate text-[10px] font-semibold" style={{ color: C.ink }}>{p.name}</span>
            <span className="text-[10px] font-bold tabular-nums" style={{ color: C.brand }}>{priceText(p)}{p.askingRent !== null ? <span className="font-normal" style={{ color: C.muted }}> /mo</span> : null}</span>
          </li>
        ))}
        {ps.length > listed.length && <li className="py-[4px] text-[9.5px]" style={{ color: C.muted }}>and {ps.length - listed.length} more, listed inside</li>}
      </ol>
    ),
    contents,
  });
}

/* ---------------------------------------------------- two or three */

function smallShortlistBlocks(ps: ClientProperty[], meta: ClientMeta): Block[] {
  const blocks: Block[] = [];
  const contents: ContentsEntry[] = [
    { label: 'Shortlist overview', blockKey: 'overview' },
    { label: 'Side by side', blockKey: 'compare' },
    ...ps.map((p) => ({ label: p.name, blockKey: `snap-${p.listing.id}` })),
    { label: 'How to read · sources', blockKey: 'guide' },
  ];
  blocks.push(shortlistCover(ps, meta, contents));
  blocks.push({
    key: 'overview',
    section: 'Shortlist overview',
    breakBefore: true,
    node: (
      <div>
        <SheetTitle eyebrow="Shortlist overview" title="The homes on your shortlist" sub="Each card carries the AI read-out in one line. Prices are asking figures." />
        <div className={`grid grid-cols-1 gap-4 ${ps.length === 2 ? '@xl:grid-cols-2' : '@xl:grid-cols-3'}`}>
          {ps.map((p) => (
            <div key={p.listing.id} className="min-w-0">
              <PhotoFrame src={p.thumb} alt={p.name} height={ps.length === 2 ? 168 : 128} onError={p.thumb ? () => meta.onBroken(p.photo ?? p.thumb!) : undefined} />
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-[10px] font-bold tabular-nums" style={{ fontFamily: DISPLAY, color: C.accent }}>{dd(p.n)}</span>
                <span className="min-w-0 text-[12px] font-bold leading-[1.25]" style={{ fontFamily: DISPLAY, color: C.brandDeep }}>{p.name}</span>
              </div>
              <div className="mt-0.5 text-[9px] leading-[1.45]" style={{ color: C.muted }}>{p.districtLine} · {p.listing.propertyType}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 pt-2" style={{ borderTop: `1px solid ${C.hair}` }}>
                <div>
                  <div className="text-[15px] font-bold leading-none tabular-nums" style={{ fontFamily: DISPLAY, color: C.brand }}>{priceText(p)}</div>
                  <div className="mt-0.5 text-[8px]" style={{ color: C.muted }}>{priceUnit(p)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-semibold leading-none tabular-nums" style={{ color: C.ink }}>{sqftText(p.listing.sizeSqft)}</div>
                  <div className="mt-0.5 text-[8px]" style={{ color: C.muted }}>{layoutLine(p.listing)}</div>
                </div>
              </div>
              <p className="mt-2 text-[9px] leading-[1.45]" style={{ color: C.text }}>{p.digest.inShort}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  });
  blocks.push({
    key: 'summary-table',
    section: 'Shortlist overview',
    node: (
      <Section label="At a glance" className="mt-0">
        <Table wrap cols={SUMMARY_COLS} rows={summaryRows(ps, false)} />
      </Section>
    ),
  });
  if (meta.note) blocks.push({ key: 'note', section: 'Shortlist overview', node: <AgentNote meta={meta} /> });
  if (meta.insights.length) blocks.push(insightsBlock(meta, 'Shortlist overview'));

  /* ---- comparison, side by side */
  const cell = (fn: (p: ClientProperty) => React.ReactNode) => ps.map((p) => fn(p));
  const rows: [string, React.ReactNode[]][] = [
    ['Asking', cell((p) => <span key="a" className="font-bold" style={{ color: C.brand }}>{priceText(p)}<span className="font-normal" style={{ color: C.muted }}> {p.askingRent !== null ? 'a month' : ''}</span></span>)],
    ['Per sq ft', cell((p) => `${psfValue(p)}${p.psf !== null && p.deal === 'rent' ? ' a month' : ''}`)],
    ['Comparable band', cell((p) => (p.digest.band ? `${money(p.digest.band.low)} – ${money(p.digest.band.high)}` : <span key="b" style={{ color: C.faint }}>Not available</span>))],
    ['Floor area', cell((p) => sqftText(p.listing.sizeSqft))],
    ['Bedrooms · bathrooms', cell((p) => layoutLine(p.listing))],
    ['Property type', cell((p) => p.listing.propertyType)],
    ['Location', cell((p) => p.districtLine)],
    ['Tenure · completed', cell((p) => [p.listing.tenure ?? p.development?.tenure, p.listing.builtYear ?? p.development?.built].filter(Boolean).join(' · ') || 'Not stated')],
    ['Nearest MRT', cell((p) => stationText(p.station) ?? <span key="s" className="italic" style={{ color: C.warn }}>{p.station.fallback}</span>)],
    ['Market position', cell((p) => (p.market ? <span key="d"><PositionText p={p} /> <span style={{ color: C.muted }}>({signedPct(p.market.deltaPct)})</span></span> : <span key="d" className="italic" style={{ color: C.warn }}>{p.notCompared}</span>))],
    ['12-month movement', cell((p) => (p.market?.changePct != null ? `${signedPct(p.market.changePct)} comparable rents` : <span key="c" style={{ color: C.faint }}>Not available</span>))],
    ['Advertised now', cell((p) => (p.competing && p.competing.sample > 0 ? `${p.competing.sample} similar homes${p.competing.deltaPct !== null ? ` · ${signedPct(p.competing.deltaPct)} vs median` : ''}` : <span key="c" style={{ color: C.faint }}>None found</span>))],
    ['Available', cell((p) => dayShort(p.listing.availableFrom))],
  ];
  blocks.push({
    key: 'compare',
    section: 'Comparison',
    breakBefore: true,
    node: (
      <div>
        <SheetTitle eyebrow="Comparison" title="Side by side" sub="The attributes that separate these homes. Prices are asking figures." />
        <div className="vr-wide">
          <table className="w-full border-collapse text-left text-[9.5px]" style={{ tableLayout: 'fixed', minWidth: 520 }}>
            <colgroup><col style={{ width: '22%' }} />{ps.map((p) => <col key={p.listing.id} />)}</colgroup>
            <thead>
              <tr>
                <th />
                {ps.map((p) => (
                  <th key={p.listing.id} className="px-2 pb-2 align-top font-normal" style={{ borderBottom: `2px solid ${C.brandDeep}` }}>
                    <span className="text-[10px] font-bold tabular-nums" style={{ fontFamily: DISPLAY, color: C.accent }}>{dd(p.n)}</span>
                    <span className="block text-[11px] font-bold leading-[1.25]" style={{ fontFamily: DISPLAY, color: C.brandDeep }}>{p.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, values], r) => (
                <tr key={label} style={{ background: r % 2 ? undefined : C.tint }}>
                  <th scope="row" className="py-[5px] pl-2 pr-3 align-top text-[8px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.slate }}>{label}</th>
                  {values.map((v, k) => <td key={k} className="break-words px-2 py-[5px] align-top leading-[1.4]" style={{ color: C.ink }}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
  });
  blocks.push({
    key: 'matrix',
    section: 'Comparison',
    node: <Section label="AI read-out, side by side" note="Indicative · each property on its own evidence" className="mt-0"><SignalsMatrix rows={ps} /></Section>,
  });
  if (ps.some((p) => p.market)) {
    blocks.push({
      key: 'strips',
      section: 'Comparison',
      node: <Section label="Where each asking rate sits" note="Each on its own comparable contracts" className="mt-0"><PositionStrips rows={ps} /></Section>,
    });
  }
  ps.forEach((p) => blocks.push(...fullSnapshot(p, meta, ps.length)));
  blocks.push(guideBlock(dealMix(ps)), sourcesBlock(meta));
  return blocks;
}

const dealMix = (ps: ClientProperty[]): 'rent' | 'sale' | 'mixed' => (ps.every((p) => p.deal === 'rent') ? 'rent' : ps.every((p) => p.deal === 'sale') ? 'sale' : 'mixed');

/* ---------------------------------------------------- four or more */

const WIDE_ROWS_FIRST = 10;
const WIDE_ROWS = 13;
const INSIGHTS_ON_SUMMARY_MAX = 6;
const SUMMARY_ROWS_FIRST = 12;
const SUMMARY_ROWS = 18;
const MATRIX_ROWS = 12;

function largeShortlistBlocks(ps: ClientProperty[], meta: ClientMeta): Block[] {
  const blocks: Block[] = [];
  const contents: ContentsEntry[] = [
    { label: 'Shortlist summary', blockKey: 'summary-0' },
    { label: 'All homes compared', blockKey: 'wide-0', note: 'landscape' },
    { label: 'AI read-out, side by side', blockKey: 'matrix-0' },
    { label: 'Property snapshots', blockKey: `snap-${ps[0].listing.id}` },
    { label: 'How to read · sources', blockKey: 'guide' },
  ];
  blocks.push(shortlistCover(ps, meta, contents));
  chunk(ps, SUMMARY_ROWS_FIRST, SUMMARY_ROWS).forEach((rows, k, all) => {
    blocks.push({
      key: `summary-${k}`,
      section: 'Shortlist summary',
      breakBefore: k === 0,
      node: (
        <div>
          {k === 0 && <SheetTitle eyebrow="Shortlist summary" title={`${ps.length} homes at a glance`} sub="Asking figures, in the order they were shortlisted." />}
          <Section label={all.length > 1 ? `Summary · ${k + 1} of ${all.length}` : 'Summary'} note="Asking figures" className="mt-0">
            <Table wrap cols={SUMMARY_COLS} rows={summaryRows(rows, true)} />
          </Section>
        </div>
      ),
    });
  });
  if (meta.note) blocks.push({ key: 'note', section: 'Shortlist summary', node: <AgentNote meta={meta} /> });
  /* Up to six rows leave room on the first page; a longer summary fills it, and
     the insights go beside the position strips instead. */
  const insightsFirst = ps.length <= INSIGHTS_ON_SUMMARY_MAX;
  if (meta.insights.length && insightsFirst) blocks.push(insightsBlock(meta, 'Shortlist summary'));

  /* The widths leave the last column its own 8%: a fixed table gives it whatever remains. */
  const wideCols: Col[] = [
    { head: '#', width: '3.5%' }, { head: 'Property', width: '15.5%' }, { head: 'Type', width: '9%' }, { head: 'Layout', width: '7.5%' },
    { head: 'Size', align: 'right', width: '7%' }, { head: 'Asking', align: 'right', width: '7.5%' }, { head: 'PSF', align: 'right', width: '5.5%' },
    { head: 'Median psf', align: 'right', width: '7.5%' }, { head: 'Position', width: '12%' }, { head: '12-mo', align: 'right', width: '6%' },
    { head: 'Nearest MRT', width: '11%' }, { head: 'Evidence' },
  ];
  const wideRows = ps.map((p) => [
    <span key="n" className="tabular-nums" style={{ color: C.faint }}>{dd(p.n)}</span>,
    <div key="p"><div className="font-semibold leading-[1.3]">{p.name}</div><div className="text-[8px]" style={{ color: C.muted }}>{p.districtLine}</div></div>,
    <span key="t" style={{ color: C.muted }}>{p.listing.propertyType}</span>,
    layoutLine(p.listing),
    sqftText(p.listing.sizeSqft),
    <span key="a" className="font-semibold">{priceText(p)}</span>,
    psfValue(p),
    p.market ? psfText(p.market.medianPsf) : <span key="m" style={{ color: C.faint }}>—</span>,
    p.market ? <span key="pos"><PositionText p={p} short /> <span style={{ color: C.muted }}>{signedPct(p.market.deltaPct)}</span></span> : <span key="pos" className="italic" style={{ color: C.warn }}>{p.notCompared}</span>,
    p.market?.changePct != null ? signedPct(p.market.changePct) : <span key="c" style={{ color: C.faint }}>—</span>,
    stationText(p.station) ?? <span key="s" className="italic" style={{ color: C.warn }}>{p.station.fallback}</span>,
    <Badge key="e" tone={CONFIDENCE_TONE[p.insight.confidence.level]}>{p.insight.confidence.level === 'insufficient' ? 'Insufficient' : p.insight.confidence.label}</Badge>,
  ]);
  chunk(wideRows, WIDE_ROWS_FIRST, WIDE_ROWS).forEach((rows, k, all) => {
    blocks.push({
      key: `wide-${k}`,
      section: 'Comparison',
      landscape: true,
      breakBefore: k === 0,
      node: (
        <div>
          {k === 0 && <SheetTitle eyebrow="Comparison" title="All homes compared" sub="Asking figures against each property’s own comparable contracts. Rates are per sq ft; rentals per month." />}
          <Table wrap size={9} cols={wideCols} rows={rows} />
          {all.length > 1 && <Fine>Comparison {k + 1} of {all.length}.</Fine>}
        </div>
      ),
    });
  });
  chunk(ps, MATRIX_ROWS, MATRIX_ROWS).forEach((rows, k, all) => {
    blocks.push({
      key: `matrix-${k}`,
      section: 'Comparison',
      landscape: true,
      node: (
        <Section label={all.length > 1 ? `AI read-out, side by side · ${k + 1} of ${all.length}` : 'AI read-out, side by side'} note="Indicative · each property on its own evidence" className="mt-0">
          <SignalsMatrix rows={rows} />
        </Section>
      ),
    });
  });
  if (ps.some((p) => p.market)) {
    blocks.push({
      key: 'strips',
      section: 'Comparison',
      landscape: true,
      node: <Section label="Where each asking rate sits" note="Each on its own comparable contracts" className="mt-0"><PositionStrips rows={ps} dense={ps.length > 6} /></Section>,
    });
  }
  if (meta.insights.length && !insightsFirst) blocks.push(insightsBlock(meta, 'Comparison', true));
  ps.forEach((p, k) => blocks.push(compactSnapshot(p, meta, k === 0, ps.length)));
  blocks.push(guideBlock(dealMix(ps)), sourcesBlock(meta));
  return blocks;
}

/* ================================================================ edition */

export function ClientEdition({ properties, meta, onLayout }: { properties: ClientProperty[]; meta: ClientMeta; onLayout: (l: FlowLayout) => void }) {
  const blocks = properties.length === 1
    ? singleBlocks(properties[0], meta)
    : properties.length <= 3
      ? smallShortlistBlocks(properties, meta)
      : largeShortlistBlocks(properties, meta);
  return <FlowDocument blocks={blocks} frame={meta.frame} onLayout={onLayout} />;
}

/* ================================================================ dates */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "15 Sep 2026", from an ISO date, without a timezone shift. */
function dayShort(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '—';
}
/** "Sep '26", from YYYY-MM. */
function monthShort(ym: string): string {
  const [y, mo] = ym.split('-').map(Number);
  return `${MONTHS[mo - 1]} ’${String(y).slice(2)}`;
}
