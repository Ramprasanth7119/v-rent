"use client";

/**
 * The client shortlist: the document a client receives.
 *
 * One template that scales with the selection, laid out as blocks and broken
 * into pages by measurement (`flow.tsx`):
 *
 *  - **One property**: the property overview; its price and market position
 *    when there is evidence to show; the AI Analysis; sources.
 *  - **Two or three**: a shortlist overview with the shortlist insights, a
 *    side-by-side comparison, then one page per property.
 *  - **Four or more**: a summary table, the comparison on a landscape sheet,
 *    then compact snapshots two to a page. The insights sit with the summary
 *    while it is short, and with the comparison when it is not.
 *
 * Every figure arrives already worked out (`ClientProperty`), and the analysis
 * arrives as structured text (`lib/phase1/property-insight`). Nothing here
 * calculates, and nothing is shown that the data does not hold: a missing
 * comparison says why, a missing photograph gets a plain placeholder.
 */

import React from 'react';
import type { DemoListing } from '../../../../lib/phase1/data';
import type { Project } from '../../../../lib/phase1/market';
import type { MarketPosition } from '../../../../lib/phase1/market-position';
import type { CompetingSet, MarketHistory, RangePosition } from '../../../../lib/phase1/report-insights';
import { RANGE_LABEL, areaName } from '../../../../lib/phase1/report-insights';
import {
  ANALYSIS_METHOD, OUTLOOK_LABEL, type InsightFactor, type PropertyInsight,
} from '../../../../lib/phase1/property-insight';
import { chunk } from '../../../../lib/phase1/paginate';
import { FlowDocument, type Block, type FlowLayout } from './flow';
import {
  C, DISPLAY, VERDICT_INK, Badge, Benchmark, Body, Bullets, Eyebrow, Fine, KV, Legend, LineChart,
  Notice, PlaceRows, Section, Stats, Table,
  dd, money, psfText, signedPct, sqftText,
  type Col, type FrameProps, type NearestRow,
} from './ui';

/* ================================================================ model */

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
  floorLevel: number | null;
  /** Nearest MRT, schools, hawker centre and park, as the location lookups answered. */
  nearby: NearestRow[];
  station: NearestRow;
  primaries: string;
  /** Short measured facts for "why this property matters". */
  keyFacts: string[];
  positioning: string;
  listingStatus: string;
}

export interface NearbyGroup {
  label: string;
  rows: { name: string; detail?: string; metres: number }[];
  /** Said instead of rows: a verified none, or why the list could not be read. */
  fallback?: React.ReactNode;
}

export interface ClientMeta {
  frame: Omit<FrameProps, 'n' | 'total' | 'section'>;
  forClient: string;
  note: string;
  preparedOn: string;
  agent: { name: string; fullName: string; agency: string; licence: string; cea: string; mobile: string; email: string; verified: boolean };
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
const layoutLine = (l: DemoListing) => `${l.bedrooms === 0 ? 'Studio' : `${l.bedrooms} bed`} · ${l.bathrooms} bath`;
/** The listing's state in a word or two, for table cells. */
const SHORT_STATUS: Record<DemoListing['status'], string> = {
  published: 'Live', paused: 'Paused', draft: 'Draft', pending_review: 'In review', rejected: 'Not published', expired: 'Expired', suspended: 'Suspended',
};
const TONE_INK: Record<InsightFactor['tone'], string> = { positive: C.below, attention: C.warn, neutral: C.slate };
const CONFIDENCE_TONE = { moderate: 'positive', limited: 'warning', insufficient: 'warning' } as const;
const stationText = (r: NearestRow) => (r.name && r.metres !== undefined ? `${r.name} · ${r.metres < 1000 ? `${Math.max(10, Math.round(r.metres / 10) * 10)} m` : `${(r.metres / 1000).toFixed(1)} km`}` : null);

const metresShort = (m: number) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`);
/** The nearest school, healthcare place and daily need, in one line. */
const nearbyLine = (p: ClientProperty): React.ReactNode => {
  const bits = p.nearbyGroups.slice(1).map((g) => g.rows[0]).filter(Boolean).map((r) => `${r.name} ${metresShort(r.metres)}`);
  return bits.length ? bits.join(' · ') : <span className="italic" style={{ color: C.warn }}>Not available</span>;
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
function PhotoFrame({ src, alt, height, onError, className }: { src?: string; alt: string; height: number; onError?: () => void; className?: string }) {
  if (!src) {
    return (
      <div className={`flex w-full flex-col items-center justify-center gap-1.5 ${className ?? ''}`} style={{ height, background: C.wash, border: `1px solid ${C.hair}` }}>
        <span aria-hidden className="inline-block rotate-45" style={{ width: 9, height: 9, background: C.rule }} />
        <span className="text-[8.5px] font-medium uppercase tracking-[0.12em]" style={{ color: C.faint }}>No photograph supplied</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- our own photo route; must be in the page before printing
    <img src={src} alt={alt} onError={onError} className={`block w-full object-cover object-center ${className ?? ''}`} style={{ height, background: C.wash }} />
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

/** Nearby places by kind, each with its nearest few and their distances. */
function NearbyList({ groups, max = 3, columns = 2 }: { groups: NearbyGroup[]; max?: number; columns?: 1 | 2 }) {
  return (
    <div className={columns === 2 ? 'grid grid-cols-1 gap-x-5 gap-y-2.5 @xl:grid-cols-2' : 'grid gap-2.5'}>
      {groups.map((g) => (
        <div key={g.label} className="min-w-0">
          <div className="pb-0.5 text-[7.5px] font-bold uppercase tracking-[0.12em]" style={{ color: C.slate }}>{g.label}</div>
          {g.rows.length ? <PlaceRows rows={g.rows.slice(0, max)} /> : <div className="text-[9.5px]" style={{ borderTop: `1px solid ${C.hair}` }}>{g.fallback}</div>}
        </div>
      ))}
    </div>
  );
}

const BUS_NOTE = 'Straight-line distances from the matched address. Bus stops are not included: no bus-stop dataset is connected.';

/** The top of the first page: who it is for, what it is, who prepared it. */
function Masthead({ meta, eyebrow, title, sub, aside }: { meta: ClientMeta; eyebrow: string; title: React.ReactNode; sub: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-6 pb-2" style={{ borderBottom: `2px solid ${C.brandDeep}` }}>
        <Eyebrow color={C.accent}>{meta.forClient ? `Prepared for ${meta.forClient}` : eyebrow}</Eyebrow>
        <span className="shrink-0 text-[9px] tabular-nums" style={{ color: C.muted }}>{meta.preparedOn}</span>
      </div>
      <div className="mt-3.5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-[1.12] tracking-[-0.02em]" style={{ fontFamily: DISPLAY, color: C.brandDeep }}>{title}</h1>
          <div className="mt-1.5 text-[10.5px] leading-[1.55]" style={{ color: C.muted }}>{sub}</div>
        </div>
        {aside}
      </div>
    </div>
  );
}

function AgentNote({ meta }: { meta: ClientMeta }) {
  if (!meta.note) return null;
  return (
    <div className="px-4 py-3" style={{ borderLeft: `3px solid ${C.accent}`, background: C.wash }}>
      <Eyebrow color={C.accent}>A note from {meta.agent.name}</Eyebrow>
      <p className="mt-1 whitespace-pre-line text-[10.5px] leading-[1.6]" style={{ color: C.text }}>{meta.note}</p>
    </div>
  );
}

/** One numbered part of the analysis: a label, a headline, the reasoning. */
function AnalysisPart({ n, label, headline, children, ink = C.brandDeep }: { n: number; label: string; headline?: string; children: React.ReactNode; ink?: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-2 pb-1" style={{ borderBottom: `1px solid ${C.hair}` }}>
        <span className="text-[10px] font-bold tabular-nums" style={{ fontFamily: DISPLAY, color: C.accent }}>{dd(n)}</span>
        <span className="text-[8.5px] font-bold uppercase tracking-[0.12em]" style={{ color: C.brand }}>{label}</span>
      </div>
      {headline && <div className="mt-1.5 text-[12.5px] font-bold leading-[1.3]" style={{ fontFamily: DISPLAY, color: ink }}>{headline}</div>}
      <div className="mt-1 text-[10px] leading-[1.6]" style={{ color: C.text }}>{children}</div>
    </div>
  );
}

function Factors({ items, columns = 1 }: { items: InsightFactor[]; columns?: 1 | 2 }) {
  return (
    <ul className={columns === 2 ? 'grid grid-cols-1 gap-x-6 gap-y-1.5 @xl:grid-cols-2' : 'grid gap-1.5'}>
      {items.map((f, k) => (
        <li key={`${f.topic}-${k}`} className="grid grid-cols-[3px_minmax(0,1fr)] gap-2.5">
          <span aria-hidden style={{ background: TONE_INK[f.tone] }} />
          <div className="min-w-0 py-[1px]">
            <div className="text-[7.5px] font-bold uppercase tracking-[0.12em]" style={{ color: TONE_INK[f.tone] }}>{f.topic}</div>
            <div className="text-[10px] leading-[1.45]" style={{ color: C.text }}>{f.text}</div>
          </div>
        </li>
      ))}
    </ul>
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
    <div className="mt-1.5 inline-flex items-center gap-1.5 text-[8.5px] font-semibold" style={{ color: C.slate }}>
      <span aria-hidden className="inline-block h-[5px] w-[5px] rotate-45" style={{ background: C.slate }} />
      {OUTLOOK_LABEL}
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

/* ================================================================ blocks */

function sourcesBlock(meta: ClientMeta, section: string): Block {
  const a = meta.agent;
  return {
    key: 'sources',
    section,
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
            Distances are straight-line from the matched address. Confirm anything that matters to you, including school eligibility, before committing.
          </p>
        </div>
        <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 px-3 py-2 text-[9px]" style={{ background: C.tint, borderTop: `2px solid ${C.brandDeep}` }}>
          <span><strong className="text-[10.5px]" style={{ fontFamily: DISPLAY, color: C.ink }}>{a.fullName}</strong>
            <span style={{ color: C.muted }}> · {a.agency}{a.licence ? ` · Licence ${a.licence}` : ''} · CEA {a.cea}{a.verified ? '' : ' (not yet verified)'}</span></span>
          <span className="tabular-nums" style={{ color: C.text }}>{[a.mobile, a.email].filter(Boolean).join(' · ')}</span>
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

/* ---------------------------------------------------- one property */

function singleBlocks(p: ClientProperty, meta: ClientMeta): Block[] {
  const l = p.listing;
  const m = p.market;
  const h = p.history;
  const i = p.insight;
  const dev = p.development;
  const blocks: Block[] = [];

  blocks.push({
    key: 'overview',
    section: 'Property overview',
    node: (
      <div>
        <Masthead meta={meta} eyebrow={p.deal === 'rent' ? 'Rental property' : 'Property for sale'} title={p.name}
          sub={<>{p.address}<br />{p.districtLine} · {l.propertyType}</>}
          aside={<Badge tone={p.deal === 'rent' ? 'brand' : 'neutral'}>{p.deal === 'rent' ? 'For rent' : 'For sale'}</Badge>} />
        <div className="mt-4"><PhotoFrame src={p.photo} alt={p.name} height={p.photo ? 250 : 96} onError={p.photo ? () => meta.onBroken(p.photo!) : undefined} /></div>
        <div className="mt-4">
          <Stats cols={5} lead items={[
            { label: p.deal === 'rent' ? 'Asking rent' : 'Asking price', value: priceText(p), sub: priceUnit(p) },
            { label: 'Per sq ft', value: psfValue(p), sub: psfUnit(p) },
            { label: 'Layout', value: layoutLine(l), sub: l.furnishing },
            { label: 'Floor area', value: sqftText(l.sizeSqft), sub: `${Math.round(l.sizeSqft * 0.092903)} m²` },
            { label: p.deal === 'rent' ? 'Available' : 'Viewings', value: dayShort(l.availableFrom), sub: SHORT_STATUS[l.status] === 'Live' ? 'Live on V-RENT' : SHORT_STATUS[l.status] },
          ]} />
        </div>
      </div>
    ),
  });

  blocks.push({
    key: 'details',
    section: 'Property overview',
    node: (
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 @xl:grid-cols-2">
        <Section label="The property" className="mt-0">
          <KV wrap labelWidth="46%" rows={[
            ['Type', l.propertyType],
            ['Development', l.project],
            ['Tenure', l.tenure ?? (dev ? dev.tenure : 'Not stated')],
            ['Completed', l.builtYear ? String(l.builtYear) : dev ? String(dev.built) : 'Not stated'],
            ['Floor level', p.floorLevel ? `Level ${p.floorLevel}` : 'Not stated'],
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
            ['Listed by', meta.agent.name],
          ]} />
        </Section>
      </div>
    ),
  });

  blocks.push({
    key: 'why',
    section: 'Property overview',
    node: (
      <div>
        <Section label="Why this property matters" className="mt-0">
          <p className="text-[11.5px] font-semibold leading-[1.5]" style={{ color: C.brand }}>{p.positioning}</p>
          {p.keyFacts.length > 0 && <Bullets className="mt-2" items={p.keyFacts} />}
          {l.description && <Body className="mt-2 line-clamp-3 text-[10px]">{l.description}</Body>}
        </Section>
        {meta.note && <div className="mt-3"><AgentNote meta={meta} /></div>}
      </div>
    ),
  });

  /* ---- every other photograph, then the map and what is nearby */
  if (p.photos.length > 1) {
    blocks.push({
      key: 'gallery',
      section: 'Photographs and location',
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
  blocks.push({
    key: 'location',
    section: 'Photographs and location',
    node: (
      <Section label="Location and nearby" note="Straight-line distances" className="mt-0">
        <div className="grid grid-cols-1 gap-5 @xl:grid-cols-[292px_minmax(0,1fr)]">
          <MapFrame src={p.map} alt={`Map showing ${l.project}`} height={232} />
          <NearbyList groups={p.nearbyGroups} />
        </div>
        <Fine>{BUS_NOTE}</Fine>
      </Section>
    ),
  });

  /* ---- price and market position: only with evidence to show */
  const c = p.competing;
  if (m && p.range) {
    blocks.push({
      key: 'market-head',
      section: 'Price and market position',
      breakBefore: true,
      keepWithNext: true,
      node: (
        <div>
          <SheetTitle eyebrow="Price and market position" title="How the asking rent compares"
            sub={<>{m.basisLabel} · {m.sample} comparable lease contracts · {m.period.from} to {m.period.to}</>} />
          <Stats cols={5} lead items={[
            { label: 'Asking rent', value: priceText(p), sub: 'per month' },
            { label: 'Comparable median', value: money(m.medianRent), sub: 'per month' },
            { label: 'Asking PSF', value: psfText(m.unitPsf), sub: 'per sq ft / month' },
            { label: 'Median PSF', value: psfText(m.medianPsf), sub: 'comparable contracts' },
            { label: 'Difference', value: signedPct(m.deltaPct), sub: 'on rate per sq ft', color: VERDICT_INK[m.verdict] },
          ]} />
          <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 text-[10.5px]">
            <PositionText p={p} />
            <span style={{ color: C.muted }}>
              · {p.range.place === 'within' ? `${p.range.band.toLowerCase()} of the range · ` : ''}
              {p.range.higherThanPct === 0 ? 'lower than every comparable contract' : p.range.higherThanPct === 100 ? 'higher than every comparable contract' : `higher than ${p.range.higherThanPct}% of comparable contracts`}
            </span>
          </div>
          {!m.local && m.fallbackNote && <div className="mt-2.5"><Notice tone="warn" title="Local sample insufficient">{m.fallbackNote}</Notice></div>}
        </div>
      ),
    });
    blocks.push({
      key: 'benchmark',
      section: 'Price and market position',
      node: (
        <Section label="Asking rate against comparable contracts" note="S$ per sq ft per month" className="mt-0">
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
    if (h) {
      const rate = p.askingRent !== null && l.sizeSqft > 0 ? p.askingRent / l.sizeSqft : null;
      blocks.push({
        key: 'history',
        section: 'Price and market position',
        node: (
          <Section label={`Price history · ${h.scope === 'development' ? l.project : `District ${dd(l.district)}`}`} note={`Median rent per sq ft each month · ${h.sample} contracts · five-year records not held`} className="mt-0">
            <LineChart values={h.points.map((pt) => pt.medianPsf)} labels={h.points.map((pt) => pt.label)}
              reference={rate !== null ? { value: rate, label: `This property ${psfText(rate)}` } : undefined} fmt={psfText} height={138} />
            <Legend items={[
              { label: `Actual: monthly median, ${h.scope === 'development' ? 'whole development' : 'whole district'}, all sizes`, swatch: 'line', color: C.brand },
              ...(rate !== null ? [{ label: 'This property’s asking rate', swatch: 'dash' as const, color: C.accent }] : []),
            ]} />
          </Section>
        ),
      });
    }
    const shown = m.rows.slice(0, 6);
    blocks.push({
      key: 'comparables',
      section: 'Price and market position',
      node: (
        <Section label="Most relevant comparable contracts" note={`${shown.length} of ${m.sample} · closest in size, then newest`} className="mt-0">
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
  } else if (c && c.sample > 0) {
    blocks.push({
      key: 'market-head',
      section: 'Price and market position',
      breakBefore: true,
      keepWithNext: true,
      node: (
        <div>
          <SheetTitle eyebrow="Price and market position" title="How the asking price compares" sub={<>{c.basisLabel} · {c.sample} comparable listings currently advertised</>} />
          <Notice tone="warn" title={`${p.notCompared}`}>The asking {p.deal === 'rent' ? 'rent' : 'price'} is compared with listings currently advertised, which are asking figures rather than agreed terms.</Notice>
        </div>
      ),
    });
    blocks.push({
      key: 'competing',
      section: 'Price and market position',
      node: (
        <div>
          <Stats items={[
            { label: 'This property', value: psfValue(p), sub: psfUnit(p) },
            { label: 'Listings found', value: String(c.sample) },
            { label: 'Median asking', value: c.medianPsf !== null ? (p.deal === 'rent' ? psfText(c.medianPsf) : `S$${Math.round(c.medianPsf).toLocaleString('en-SG')}`) : 'Too few', sub: c.medianPsf !== null ? 'per sq ft' : '5 or more needed' },
            { label: 'Difference', value: c.deltaPct !== null ? signedPct(c.deltaPct) : '—', sub: c.deltaPct !== null ? 'on asking per sq ft' : 'not calculated' },
          ]} />
          <div className="mt-3">
            <Table dense wrap
              cols={[{ head: 'Development', width: '38%' }, { head: 'Match', width: '20%' }, { head: 'Size', align: 'right', width: '15%' }, { head: 'Asking', align: 'right', width: '15%' }, { head: 'PSF', align: 'right' }]}
              rows={c.items.slice(0, 6).map((x) => [
                <span key="p" className="font-semibold">{x.project}</span>,
                <span key="m" style={{ color: C.muted }}>{x.match}</span>,
                sqftText(x.sizeSqft),
                p.deal === 'rent' ? `${money(x.price)}/mo` : money(x.price),
                p.deal === 'rent' ? psfText(x.psf) : `S$${Math.round(x.psf).toLocaleString('en-SG')}`,
              ])} />
          </div>
        </div>
      ),
    });
  }

  /* ---- AI Analysis */
  const hasMarketPage = Boolean((m && p.range) || (c && c.sample > 0));
  /* A full market page is followed by a fresh one; a short listings-only page
     is not, so the analysis continues below it instead of leaving it half empty. */
  blocks.push({
    key: 'analysis-head',
    section: 'AI Analysis',
    breakBefore: Boolean(m && p.range) || !hasMarketPage,
    keepWithNext: true,
    node: (
      <div>
        <SheetTitle eyebrow="AI Analysis" title={`What the evidence says about ${l.project}`}
          sub={<span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1"><span>Property-specific analysis of the figures in this document</span><ConfidenceBadge insight={i} /></span>} />
        {!hasMarketPage && (
          <div className="mb-4"><Notice tone="warn" title="No market comparison in this document">{i.current.detail}</Notice></div>
        )}
        <div className="grid grid-cols-1 gap-x-7 gap-y-3 @xl:grid-cols-2">
          <AnalysisPart n={1} label="Past 5 years" headline={i.historical.headline}>{i.historical.detail}</AnalysisPart>
          <AnalysisPart n={2} label="Current position" headline={i.current.headline}
            ink={p.market ? VERDICT_INK[p.market.verdict] : C.brandDeep}>{i.current.detail}</AnalysisPart>
        </div>
      </div>
    ),
  });
  blocks.push({
    key: 'analysis-outlook',
    section: 'AI Analysis',
    node: (
      <AnalysisPart n={3} label="Forward outlook" headline={i.outlook.headline}>
        <p>{i.outlook.detail}</p>
        {i.outlook.drivers.length > 0 && (
          <div className="mt-2">
            <div className="text-[7.5px] font-bold uppercase tracking-[0.12em]" style={{ color: C.slate }}>What could affect future {p.deal === 'rent' ? 'rents' : 'value'}</div>
            <ul className="mt-1 grid grid-cols-1 gap-x-6 gap-y-1 @xl:grid-cols-2">
              {i.outlook.drivers.map((d) => (
                <li key={d} className="grid grid-cols-[10px_minmax(0,1fr)] items-baseline gap-1.5 text-[10px] leading-[1.5]" style={{ color: C.text }}>
                  <span aria-hidden className="inline-block h-[5px] w-[5px] -translate-y-px" style={{ background: C.brand }} />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <OutlookLabel />
      </AnalysisPart>
    ),
  });
  blocks.push({
    key: 'analysis-factors',
    section: 'AI Analysis',
    node: (
      <div>
        <AnalysisPart n={4} label="Key considerations" headline={`${i.factors.length} points to weigh`}>
          <div className="mt-1.5"><Factors items={i.factors} columns={2} /></div>
        </AnalysisPart>
        {i.limitations.length > 0 && (
          <Fine>Limitations: {i.limitations.join(' ')}</Fine>
        )}
      </div>
    ),
  });
  blocks.push(sourcesBlock(meta, 'Sources and notes'));
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

function ShortAnalysis({ p }: { p: ClientProperty }) {
  const i = p.insight;
  const rows: [string, string][] = [
    ['Past 5 years', i.historical.short],
    ['Current position', i.current.short],
    ['Outlook', i.outlook.short],
  ];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 pb-1" style={{ borderBottom: `1px solid ${C.rule}` }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: C.brand }}>AI Analysis</span>
        <ConfidenceBadge insight={i} />
      </div>
      <dl className="mt-1">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 py-[4px]" style={{ borderBottom: `1px solid ${C.hair}` }}>
            <dt className="text-[8px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.slate }}>{k}</dt>
            <dd className="text-[9.5px] leading-[1.5]" style={{ color: C.text }}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2"><Factors items={i.factors.slice(0, 4)} columns={2} /></div>
      <OutlookLabel />
    </div>
  );
}

/** A property's own page in a shortlist of two or three. */
function fullSnapshot(p: ClientProperty, meta: ClientMeta, total: number): Block[] {
  const i = p.insight;
  const section = `Property ${dd(p.n)} of ${dd(total)}`;
  return [
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
          <div className="mt-3 grid grid-cols-1 gap-4 @xl:grid-cols-[292px_minmax(0,1fr)] @xl:gap-5">
            <MapFrame src={p.map} alt={`Map showing ${p.listing.project}`} height={132} />
            <div className="min-w-0">
              <NearbyList groups={p.nearbyGroups} max={2} />
              <Fine className="mt-1.5">{BUS_NOTE}</Fine>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: `snap-analysis-${p.listing.id}`,
      section,
      node: (
        <div>
          <div className="flex items-baseline justify-between gap-4 pb-1" style={{ borderBottom: `1px solid ${C.rule}` }}>
            <span className="text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: C.brand }}>AI Analysis</span>
            <ConfidenceBadge insight={i} />
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-3 @xl:grid-cols-2">
            <AnalysisPart n={1} label="Past 5 years" headline={i.historical.headline}>{i.historical.summary}</AnalysisPart>
            <AnalysisPart n={2} label="Current position" headline={i.current.headline} ink={p.market ? VERDICT_INK[p.market.verdict] : C.brandDeep}>{i.current.summary}</AnalysisPart>
          </div>
          <div className="mt-3">
            <AnalysisPart n={3} label="Forward outlook" headline={i.outlook.headline}>
              <p>{i.outlook.summary}</p>
              {i.outlook.drivers.length > 0 && <Bullets className="mt-1.5" items={i.outlook.drivers} />}
              <OutlookLabel />
            </AnalysisPart>
          </div>
          <div className="mt-3">
            <AnalysisPart n={4} label="Key considerations">
              <div className="mt-1.5"><Factors items={i.factors.slice(0, 4)} columns={2} /></div>
            </AnalysisPart>
          </div>
        </div>
      ),
    },
  ];
}

/** Half a page: photograph, facts and a short analysis, for longer shortlists. */
function compactSnapshot(p: ClientProperty, meta: ClientMeta, first: boolean, total: number): Block {
  return {
    key: `snap-${p.listing.id}`,
    section: `Property snapshots · ${total} properties`,
    breakBefore: first,
    node: (
      <div>
        <SnapshotHead p={p} />
        <div className="mt-2.5 grid grid-cols-1 gap-3 @xl:grid-cols-[150px_118px_minmax(0,1fr)]">
          <div className="min-w-0">
            <PhotoFrame src={p.thumb} alt={p.name} height={p.photos.length > 1 ? 96 : 132} onError={p.thumb ? () => meta.onBroken(p.photo ?? p.thumb!) : undefined} />
            <PhotoStrip p={p} meta={meta} height={30} max={3} />
          </div>
          <MapFrame src={p.map} alt={`Map showing ${p.listing.project}`} height={120} />
          <div className="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
            <KV wrap labelWidth="44%" rows={snapshotFacts(p).slice(0, 5)} />
            <KV wrap labelWidth="44%" rows={snapshotFacts(p).slice(5)} />
          </div>
        </div>
        <div className="mt-2.5"><ShortAnalysis p={p} /></div>
      </div>
    ),
  };
}

/* ---------------------------------------------------- overview tables */

function SheetTitle({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-1 text-[20px] font-bold leading-[1.2] tracking-[-0.015em]" style={{ fontFamily: DISPLAY, color: C.brandDeep }}>{title}</h2>
      {sub && <div className="mt-1 text-[10px] leading-[1.55]" style={{ color: C.muted }}>{sub}</div>}
    </div>
  );
}

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

function shortlistMasthead(ps: ClientProperty[], meta: ClientMeta) {
  const rents = ps.map((p) => p.askingRent).filter((v): v is number => v !== null);
  const districts = [...new Set(ps.map((p) => p.listing.district))].sort((a, b) => a - b);
  return (
    <Masthead meta={meta} eyebrow="Property shortlist" title={`${ps.length} shortlisted properties`}
      sub={<>
        {districts.map((d) => `D${dd(d)} ${areaName(d)}`).join(' · ')}
        {rents.length > 0 && <><br />Asking rents {rents.length > 1 ? `${money(Math.min(...rents))} to ${money(Math.max(...rents))}` : money(rents[0])} a month</>}
      </>}
      aside={<div className="text-right text-[9px] leading-[1.5]" style={{ color: C.muted }}>Prepared by<br /><span className="font-semibold" style={{ color: C.ink }}>{meta.agent.fullName}</span><br />CEA {meta.agent.cea}</div>} />
  );
}

/* ---------------------------------------------------- two or three */

function smallShortlistBlocks(ps: ClientProperty[], meta: ClientMeta): Block[] {
  const blocks: Block[] = [];
  blocks.push({
    key: 'overview',
    section: 'Shortlist overview',
    node: (
      <div>
        {shortlistMasthead(ps, meta)}
        <div className={`mt-5 grid grid-cols-1 gap-4 ${ps.length === 2 ? '@xl:grid-cols-2' : '@xl:grid-cols-3'}`}>
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
    ['Floor area', cell((p) => sqftText(p.listing.sizeSqft))],
    ['Bedrooms · bathrooms', cell((p) => layoutLine(p.listing))],
    ['Property type', cell((p) => p.listing.propertyType)],
    ['Location', cell((p) => p.districtLine)],
    ['Tenure · completed', cell((p) => [p.listing.tenure ?? p.development?.tenure, p.listing.builtYear ?? p.development?.built].filter(Boolean).join(' · ') || 'Not stated')],
    ['Nearest MRT', cell((p) => stationText(p.station) ?? <span key="s" className="italic" style={{ color: C.warn }}>{p.station.fallback}</span>)],
    ['Comparable median', cell((p) => (p.market ? `${psfText(p.market.medianPsf)} psf · ${p.market.sample} contracts` : <span key="m" className="italic" style={{ color: C.warn }}>{p.notCompared}</span>))],
    ['Market position', cell((p) => (p.market ? <span key="d"><PositionText p={p} /> <span style={{ color: C.muted }}>({signedPct(p.market.deltaPct)})</span></span> : <span key="d" style={{ color: C.faint }}>—</span>))],
    ['12-month movement', cell((p) => (p.market?.changePct != null ? `${signedPct(p.market.changePct)} comparable rents` : <span key="c" style={{ color: C.faint }}>Not available</span>))],
    ['Price history', cell((p) => (p.history ? `${p.history.scope === 'development' ? 'Development' : 'District'}, ${p.history.sample} contracts` : <span key="h" style={{ color: C.faint }}>Not available</span>))],
    ['Evidence', cell((p) => <Badge key="e" tone={CONFIDENCE_TONE[p.insight.confidence.level]}>{p.insight.confidence.label}</Badge>)],
    ['Available', cell((p) => dayShort(p.listing.availableFrom))],
  ];
  blocks.push({
    key: 'compare',
    section: 'Comparison',
    breakBefore: true,
    node: (
      <div>
        <SheetTitle eyebrow="Comparison" title="Side by side" sub="The attributes that separate these properties. Prices are asking figures." />
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
  if (ps.some((p) => p.market)) {
    blocks.push({
      key: 'strips',
      section: 'Comparison',
      node: <Section label="Where each asking rate sits" note="Each on its own comparable contracts" className="mt-0"><PositionStrips rows={ps} /></Section>,
    });
  }
  ps.forEach((p) => blocks.push(...fullSnapshot(p, meta, ps.length)));
  blocks.push(sourcesBlock(meta, 'Sources and notes'));
  return blocks;
}

/* ---------------------------------------------------- four or more */

const WIDE_ROWS_FIRST = 10;
const WIDE_ROWS = 13;
const INSIGHTS_ON_SUMMARY_MAX = 6;
const SUMMARY_ROWS_FIRST = 12;
const SUMMARY_ROWS = 18;

function largeShortlistBlocks(ps: ClientProperty[], meta: ClientMeta): Block[] {
  const blocks: Block[] = [];
  blocks.push({ key: 'masthead', section: 'Shortlist summary', keepWithNext: true, node: shortlistMasthead(ps, meta) });
  chunk(ps, SUMMARY_ROWS_FIRST, SUMMARY_ROWS).forEach((rows, k, all) => {
    blocks.push({
      key: `summary-${k}`,
      section: 'Shortlist summary',
      node: (
        <Section label={all.length > 1 ? `Summary · ${k + 1} of ${all.length}` : 'Summary'} note="Asking figures" className="mt-0">
          <Table wrap cols={SUMMARY_COLS} rows={summaryRows(rows, true)} />
        </Section>
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
          {k === 0 && <SheetTitle eyebrow="Comparison" title="All properties compared" sub="Asking figures against each property’s own comparable contracts. Rates are per sq ft; rentals per month." />}
          <Table wrap size={9} cols={wideCols} rows={rows} />
          {all.length > 1 && <Fine>Comparison {k + 1} of {all.length}.</Fine>}
        </div>
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
  blocks.push(sourcesBlock(meta, 'Sources and notes'));
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

