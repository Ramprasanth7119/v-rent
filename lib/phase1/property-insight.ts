/**
 * The AI Analysis in the client shortlist, as structured data.
 *
 * The printed document asks four things of every property — how it has
 * performed, where its asking price sits today, what the evidence suggests
 * about the future, and what to pay attention to — and this module answers
 * them from the figures the report already holds: the comparable contracts,
 * the development or district history, the listings currently advertised and
 * the measured neighbourhood. The renderer prints the answer and never works
 * anything out itself.
 *
 * The engine is deterministic: the same inputs give the same words, so the
 * analysis can be tested, and it cannot say anything the data does not. Three
 * rules hold throughout, as they do in `report-insights`:
 *
 *  - every number it prints is one the document shows elsewhere, or a
 *    difference between two of them;
 *  - it describes and never ranks, recommends or values;
 *  - it never states a future price, rent, yield or return. The outlook is a
 *    direction read from the observed trend, labelled as indicative, and when
 *    the trend cannot be read it says so in the words `INSUFFICIENT_OUTLOOK`.
 *
 * Price records cover twelve months (the contract window in `market.ts`), so
 * the "past five years" section always states the window it could use.
 *
 * Pure and client-safe.
 */

import type { DemoListing } from './data';
import type { Project } from './market';
import { BASIS_NAME, quantile, type MarketPosition, type MarketResult } from './market-position';
import { dealOf } from './pricing';
import type { EvidenceState } from './report';
import {
  areaName, layoutText, metresText, rangePosition, TYPE_NOUN, MIN_ACTIVE,
  type CompetingSet, type HistoryResult, type MarketHistory, type RangePlace, type RangePosition, type UnitListing,
} from './report-insights';

/* ================================================================ wording */

export const INSUFFICIENT_OUTLOOK = 'Insufficient verified historical/market data for a reliable forward estimate.';
export const OUTLOOK_LABEL = 'Indicative AI Outlook — not a valuation or guaranteed forecast.';
/** How the analysis describes itself wherever it is printed. */
export const ANALYSIS_METHOD =
  'AI Analysis is produced automatically by V-RENT from the figures shown in this document, using fixed rules. It draws on nothing outside the document, and it is indicative analysis — not a valuation, financial advice or a guaranteed forecast.';

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => `S$${Math.round(n).toLocaleString('en-SG')}`;
const psf2 = (n: number) => `S$${n.toFixed(2)}`;
const pct = (n: number) => `${Math.abs(n).toFixed(1)}%`;
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`;
const sqft = (n: number) => `${Math.round(n).toLocaleString('en-SG')} sqft`;
const plural = (n: number, word: string) => `${n.toLocaleString('en-SG')} ${word}${n === 1 ? '' : 's'}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthOf = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
/** "3.2% below", "in line with", "5.0% above". */
const against = (d: number) => (Math.abs(d) < 0.05 ? 'in line with' : `${pct(d)} ${d > 0 ? 'above' : 'below'}`);
const where = (p: RangePlace) => (p === 'within' ? 'within the observed comparable range' : `${p} the observed comparable range`);
/** Lower-cases the first letter unless it starts an acronym ("HDB"). */
const lowerFirst = (t: string) => (/^[A-Z]{2}/.test(t) ? t : `${t.charAt(0).toLowerCase()}${t.slice(1)}`);
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** A change this small is described as flat: it is inside the month-to-month noise of a small sample. */
const FLAT = 1.5;

/* ================================================================ types */

export type Tone = 'positive' | 'attention' | 'neutral';
export type ConfidenceLevel = 'moderate' | 'limited' | 'insufficient';

export interface InsightSection {
  /** One line, printed large. */
  headline: string;
  /** Two or three sentences for a full analysis. */
  detail: string;
  /** One or two sentences to print under the headline, without repeating it. */
  summary: string;
  /** One sentence that stands without the headline, for a compact snapshot. */
  short: string;
}

export interface InsightFactor {
  topic: string;
  text: string;
  tone: Tone;
}

export interface PropertyInsight {
  historical: InsightSection;
  current: InsightSection & { place: RangePlace | null };
  outlook: InsightSection & {
    /** False when the evidence does not support a direction; the section then reads `INSUFFICIENT_OUTLOOK`. */
    supported: boolean;
    direction: 'firm' | 'stable' | 'soft' | null;
    /** What could move the rent or value, each from a measured fact. */
    drivers: string[];
  };
  factors: InsightFactor[];
  confidence: { level: ConfidenceLevel; label: string; reason: string };
  limitations: string[];
  /** The history window the analysis could use, as printed. Null without one. */
  window: { from: string; to: string; months: number } | null;
}

export interface Place { name: string; metres: number }

export interface AnalysisInput {
  listing: DemoListing;
  market: MarketResult;
  history: HistoryResult;
  /** A competing-listing set that passed its checks, or null. */
  competing: CompetingSet | null;
  mrt: { state: EvidenceState; nearest: Place | null };
  primaries: { state: EvidenceState; within1km: number };
  hawker: { state: EvidenceState; nearest: Place | null };
  /** Neighbourhood datasets that were asked for and did not answer, by reader-facing name. */
  unavailable: string[];
  development: Project | null;
  /** Earlier V-RENT listings of the same unit: asking figures, not transactions. */
  earlier: UnitListing[];
  /** How many lease contracts the data source holds for this property's search. 0 means no records are connected. */
  heldContracts: number;
  /** True when the market figures are illustrative (demo data), not market evidence. */
  illustrative: boolean;
  /** How competing listings are described: "listings live on V-RENT" or the demo equivalent. */
  activeSource: string;
  today: Date;
}

/* ============================================================ the reasons */

/** Why a property has no comparison, in a few client-facing words. */
export function unavailableReason(i: Pick<AnalysisInput, 'listing' | 'market' | 'heldContracts'>): string {
  const m = i.market;
  if (m.status === 'ok') return '';
  switch (m.reason) {
    case 'sale': return 'Sale transaction records are not held';
    case 'category': return i.listing.propertyType === 'HDB' ? 'HDB rental records are not held' : 'Landed-home rental records are not held';
    case 'no_rent': return 'No asking rent recorded';
    case 'no_size': return 'No floor area recorded';
    case 'no_contracts':
    default: return i.heldContracts === 0 ? 'Verified contract records not connected' : 'Too few similar contracts';
  }
}

/** Median rent per sq ft in the first and second half of the history window. */
function halves(h: MarketHistory): { early: number; late: number } | null {
  const first = new Set(h.points.slice(0, Math.floor(h.points.length / 2)).map((p) => p.month));
  const early = h.rows.filter((r) => first.has(r.month)).map((r) => r.psf);
  const late = h.rows.filter((r) => !first.has(r.month)).map((r) => r.psf);
  if (early.length < 3 || late.length < 3) return null;
  return { early: round2(quantile(early, 0.5)), late: round2(quantile(late, 0.5)) };
}

/** Contracts lodged in the second half of the window against the first. */
function activityOf(m: MarketPosition): 'rising' | 'easing' | 'steady' {
  const half = Math.floor(m.trendCounts.length / 2);
  const early = m.trendCounts.slice(0, half).reduce((a, b) => a + b, 0);
  const late = m.trendCounts.slice(half).reduce((a, b) => a + b, 0);
  if (early === 0) return late > 0 ? 'rising' : 'steady';
  const change = (late - early) / early;
  return change >= 0.2 ? 'rising' : change <= -0.2 ? 'easing' : 'steady';
}

/* ================================================================ engine */

export function analyseProperty(i: AnalysisInput): PropertyInsight {
  const l = i.listing;
  const deal = dealOf(l);
  const m = i.market.status === 'ok' ? i.market : null;
  const h = i.history.status === 'ok' ? i.history : null;
  const r: RangePosition | null = m ? rangePosition(m, l.sizeSqft) : null;
  const c = i.competing;
  const layout = `${layoutText(l.bedrooms).toLowerCase()} ${TYPE_NOUN[l.propertyType]}`;
  const station = i.mrt.state === 'verified' || i.mrt.state === 'partial' ? i.mrt.nearest : null;
  const connected = i.heldContracts > 0;
  const limitations: string[] = [];

  /* ------------------------------------------------ historical performance */
  const window = h ? { from: h.period.from, to: h.period.to, months: h.points.length } : m ? { from: m.period.from, to: m.period.to, months: m.trend.length } : null;
  let historical: InsightSection;
  const earlier = i.earlier[0];
  const current = deal === 'rent' ? l.monthlyRent : l.salePriceSgd ?? 0;
  const earlierLine = earlier && earlier.deal === deal && current > 0
    ? `An earlier V-RENT listing of this unit (${monthOf(earlier.date)}) asked ${money(earlier.asking)}${deal === 'rent' ? ' a month' : ''}; today's asking ${deal === 'rent' ? 'rent' : 'price'} is ${against(round1(((current - earlier.asking) / earlier.asking) * 100))} that. Both are asking figures, not agreed terms.`
    : '';

  if (h) {
    const hv = halves(h);
    const scope = h.scope === 'development' ? l.project : `District ${String(l.district).padStart(2, '0')}`;
    const move = h.changePct;
    const headline = move === null
      ? `${plural(h.sample, 'lease contract')} in ${h.points.length} months, too few to show a direction`
      : Math.abs(move) < FLAT
        ? `Rents in ${scope} held broadly steady over the past year`
        : `Rents in ${scope} ${move > 0 ? 'rose' : 'eased'} ${pct(move)} over the past year`;
    const parts = [
      `Five-year records are not held; the verified window is the ${h.points.length} months from ${h.period.from} to ${h.period.to}.`,
      hv && move !== null
        ? `Over that window the median rent per sq ft ${h.scope === 'development' ? 'in the development' : 'in the district'} moved from ${psf2(hv.early)} in the first half to ${psf2(hv.late)} in the second (${signed(move)}), across ${plural(h.sample, 'lease contract')}.`
        : `${plural(h.sample, 'lease contract')} were lodged ${h.scope === 'development' ? 'in the development' : 'in the district'}, at a median of ${psf2(h.medianPsf)} per sq ft.`,
    ];
    /* Comparable rents over the same window are the outlook's evidence, and are stated there. */
    if (m && m.changePct !== null && move === null) {
      parts.push(`Comparable ${layout} rents ${Math.abs(m.changePct) < FLAT ? `were broadly flat (${signed(m.changePct)})` : `${m.changePct > 0 ? 'rose' : 'fell'} ${pct(m.changePct)}`} over the same period.`);
    }
    if (earlierLine) parts.push(earlierLine);
    const summary = move === null
      ? `${plural(h.sample, 'lease contract')} over ${h.period.from}–${h.period.to}, at a median of ${psf2(h.medianPsf)} per sq ft. Five-year records are not held.`
      : hv
        ? `Median rent per sq ft moved from ${psf2(hv.early)} to ${psf2(hv.late)} between the two halves of ${h.period.from}–${h.period.to} (${plural(h.sample, 'contract')}). Five-year records are not held.`
        : `${plural(h.sample, 'lease contract')} over ${h.period.from}–${h.period.to}. Five-year records are not held.`;
    historical = {
      headline,
      detail: parts.join(' '),
      summary,
      short: move === null
        ? `${plural(h.sample, 'contract')} over ${h.period.from}–${h.period.to}; too few for a direction. Five-year records are not held.`
        : `${h.scope === 'development' ? 'Development' : 'District'} rents per sq ft ${Math.abs(move) < FLAT ? 'held steady' : move > 0 ? `rose ${pct(move)}` : `eased ${pct(move)}`} over ${h.period.from}–${h.period.to} (${plural(h.sample, 'contract')}); five-year records are not held.`,
    };
    if (h.scope === 'district') limitations.push('Too few contracts are held for the development itself, so its district is used for history.');
  } else {
    const why = deal === 'sale'
      ? 'Sale transaction records are not held for this property or its development'
      : l.propertyType === 'HDB' || l.propertyType === 'Landed'
        ? `${l.propertyType === 'HDB' ? 'HDB' : 'Landed-home'} rental contract records are not held`
        : connected ? 'Too few lease contracts are held for this development or district' : 'Verified rental contract records are not yet connected';
    historical = {
      headline: 'Insufficient verified history',
      detail: `${why}, so price movement over the past five years cannot be shown.${earlierLine ? ` ${earlierLine}` : ''}`,
      summary: `${why}, so no price history can be shown.`,
      short: `${why}; no price history can be shown.`,
    };
  }
  limitations.push(window
    ? `Price records cover ${window.months} months (${window.from} to ${window.to}); five-year history is not held.`
    : 'No verified price history is held for this property.');
  if (h || m) limitations.push('Lodged contracts do not identify individual units, so development, district or comparable figures are used.');

  /* ------------------------------------------------------ current position */
  let currentPos: PropertyInsight['current'];
  const compLine = c && c.deltaPct !== null
    ? `Against the median of ${plural(c.sample, 'comparable listing')} currently advertised (${i.activeSource}), it asks ${against(c.deltaPct)} per sq ft.`
    : c && c.sample > 0
      ? `${plural(c.sample, 'comparable listing')} ${c.sample === 1 ? 'is' : 'are'} currently advertised; at least ${MIN_ACTIVE} are needed for a median comparison.`
      : '';
  if (m && r) {
    currentPos = {
      place: r.place,
      headline: `${where(r.place).charAt(0).toUpperCase()}${where(r.place).slice(1)}`,
      detail: [
        `At ${psf2(m.unitPsf)} per sq ft a month, the asking rent is ${against(m.deltaPct)} the median of ${plural(m.sample, 'comparable contract')} (${psf2(m.medianPsf)}; ${m.basisLabel}).`,
        r.place === 'within'
          ? `It sits in the ${r.band.toLowerCase()} of the observed range of ${psf2(m.minPsf)} to ${psf2(m.maxPsf)} per sq ft, higher than ${r.higherThanPct}% of those contracts.`
          : `The observed range was ${psf2(m.minPsf)} to ${psf2(m.maxPsf)} per sq ft.`,
        compLine,
      ].filter(Boolean).join(' '),
      summary: `At ${psf2(m.unitPsf)} per sq ft, ${against(m.deltaPct)} the median of ${plural(m.sample, 'comparable contract')} (${psf2(m.medianPsf)}).${c && c.deltaPct !== null ? ` ${against(c.deltaPct).charAt(0).toUpperCase()}${against(c.deltaPct).slice(1)} the median of ${plural(c.sample, 'current listing')}.` : ''}`,
      short: `${where(r.place).charAt(0).toUpperCase()}${where(r.place).slice(1)}: ${against(m.deltaPct)} the median of ${plural(m.sample, 'contract')} per sq ft.`,
    };
  } else if (c && c.deltaPct !== null) {
    currentPos = {
      place: null,
      headline: 'Compared with current listings only',
      detail: `${unavailableReason(i)}, so the asking ${deal === 'rent' ? 'rent' : 'price'} is not compared with transactions. ${compLine}`,
      summary: `${unavailableReason(i)}. Per sq ft, the asking ${deal === 'rent' ? 'rent' : 'price'} is ${against(c.deltaPct)} the median of ${plural(c.sample, 'current listing')}.`,
      short: `Not compared with transactions; ${against(c.deltaPct)} the median of ${plural(c.sample, 'current listing')} per sq ft.`,
    };
  } else {
    currentPos = {
      place: null,
      headline: 'Not compared with the market',
      detail: `${unavailableReason(i)}, so the asking ${deal === 'rent' ? 'rent' : 'price'} cannot be placed against comparable evidence.${compLine ? ` ${compLine}` : ''}`,
      summary: `${unavailableReason(i)}, so there is no comparable evidence to place the asking ${deal === 'rent' ? 'rent' : 'price'} against.`,
      short: `${unavailableReason(i)}; no market comparison.`,
    };
  }

  /* ------------------------------------------------------ forward outlook */
  const drivers: string[] = [];
  if (station && station.metres <= 800) drivers.push(`Walking distance to ${station.name} (about ${metresText(station.metres)}), which ${deal === 'rent' ? 'tenants' : 'buyers'} weigh when choosing a home.`);
  else if (station && station.metres > 1200) drivers.push(`The nearest station is about ${metresText(station.metres)} away, beyond an easy walk for ${deal === 'rent' ? 'tenants' : 'buyers'} who rely on the MRT.`);
  if (c && c.sample >= MIN_ACTIVE) drivers.push(`${plural(c.sample, 'similar home')} ${c.sample === 1 ? 'is' : 'are'} advertised nearby; that competition bears on how quickly the asking level is met.`);
  const age = i.development ? i.today.getFullYear() - i.development.built : null;
  if (i.development && age !== null && age <= 5) drivers.push(`Completed in ${i.development.built}, the development is newer than most of its competition.`);
  else if (i.development && age !== null && age >= 15 && i.development.tenure !== 'Freehold') drivers.push(`Completed in ${i.development.built} on a 99-year lease, the development is ${age} years into its tenure.`);
  if (i.development?.tenure === 'Freehold' && deal === 'sale') drivers.push('Freehold tenure does not shorten with time.');

  let outlook: PropertyInsight['outlook'];
  if (!m || m.changePct === null || deal === 'sale') {
    outlook = {
      supported: false,
      direction: null,
      drivers: drivers.slice(0, 2),
      headline: 'No reliable forward estimate',
      detail: INSUFFICIENT_OUTLOOK,
      summary: INSUFFICIENT_OUTLOOK,
      short: INSUFFICIENT_OUTLOOK,
    };
  } else {
    const move = m.changePct;
    const activity = activityOf(m);
    const direction = Math.abs(move) < FLAT ? 'stable' : move > 0 ? 'firm' : 'soft';
    const activityText = { rising: 'more contracts lodged in the second half of the year', easing: 'fewer contracts lodged in the second half of the year', steady: 'similar activity through the year' }[activity];
    const headline = direction === 'firm'
      ? (activity === 'easing' ? 'Rents firming, with activity easing' : 'Evidence points to firm rental demand')
      : direction === 'soft'
        ? 'Evidence points to softer rents'
        : 'Evidence points to broadly stable rents';
    const tail = direction === 'stable'
      ? 'If these conditions continue, rents for similar homes are more likely to stay near current levels than to move sharply.'
      : direction === 'firm'
        ? 'If these conditions continue, rents for similar homes are more likely to hold or edge up than to fall back.'
        : 'If these conditions continue, rents for similar homes may stay under some pressure.';
    const fit = r && m.verdict === 'above'
      ? ` An asking rate above the comparable median has ${direction === 'firm' ? 'some' : 'less'} support from recent contracts.`
      : r && m.verdict === 'below'
        ? ' An asking rate below the comparable median leaves room within recent contract levels.'
        : '';
    outlook = {
      supported: true,
      direction,
      drivers: drivers.slice(0, 3),
      headline,
      detail: `Comparable rents moved ${signed(move)} over the ${m.trend.length}-month window, with ${activityText}. ${tail}${fit} This reads a one-year trend; it is not a projection of any figure.`,
      summary: `Comparable rents moved ${signed(move)} over ${m.trend.length} months, with ${activityText}. ${tail}`,
      short: `${headline} (${signed(move)} over ${m.trend.length} months, ${activity === 'steady' ? 'steady' : activity} activity).`,
    };
    if (m.sample < 20) limitations.push(`The outlook rests on ${plural(m.sample, 'comparable contract')}; a small sample moves easily.`);
  }

  /* --------------------------------------------------------- key factors */
  const factors: InsightFactor[] = [];
  if (m && r) {
    factors.push({
      topic: 'Pricing position',
      tone: m.verdict === 'above' ? 'attention' : 'positive',
      text: `Asking rate ${against(m.deltaPct)} the comparable median, ${where(r.place)}.`,
    });
  } else {
    factors.push({ topic: 'Pricing evidence', tone: 'attention', text: `${unavailableReason(i)}; the asking ${deal === 'rent' ? 'rent' : 'price'} is not benchmarked against transactions.` });
  }
  if (h && h.changePct !== null) {
    factors.push({
      topic: 'Recent movement',
      tone: 'neutral',
      text: `${h.scope === 'development' ? 'Development' : 'District'} rent per sq ft ${Math.abs(h.changePct) < FLAT ? 'broadly flat' : h.changePct > 0 ? `up ${pct(h.changePct)}` : `down ${pct(h.changePct)}`} over ${h.period.from}–${h.period.to}.`,
    });
  }
  if (station && station.metres <= 800) {
    factors.push({ topic: 'Connectivity', tone: 'positive', text: `${station.name} is about ${metresText(station.metres)} away (~${Math.max(1, Math.round(station.metres / 80))} min walk).` });
  } else if (station && station.metres > 1200) {
    factors.push({ topic: 'Connectivity', tone: 'attention', text: `Nearest MRT or LRT station is about ${metresText(station.metres)} away.` });
  } else if (i.mrt.state === 'verified' && !station) {
    factors.push({ topic: 'Connectivity', tone: 'attention', text: 'No MRT or LRT station within 2 km.' });
  } else if (station) {
    factors.push({ topic: 'Connectivity', tone: 'neutral', text: `${station.name} is about ${metresText(station.metres)} away.` });
  }
  if (c && c.deltaPct !== null) {
    factors.push({
      topic: 'Competition',
      tone: c.deltaPct >= 4 ? 'attention' : c.deltaPct <= -4 ? 'positive' : 'neutral',
      text: `${plural(c.sample, 'similar listing')} advertised; this one asks ${against(c.deltaPct)} their median per sq ft.`,
    });
  }
  if (r && r.sizeDeltaPct >= 5) factors.push({ topic: 'Size', tone: 'positive', text: `${sqft(l.sizeSqft)}, ${pct(r.sizeDeltaPct)} larger than the median comparable home.` });
  else if (r && r.sizeDeltaPct <= -10) factors.push({ topic: 'Size', tone: 'attention', text: `${sqft(l.sizeSqft)}, ${pct(r.sizeDeltaPct)} smaller than the median comparable home.` });
  if (i.primaries.state === 'verified' && i.primaries.within1km >= 2) factors.push({ topic: 'Schools', tone: 'positive', text: `${i.primaries.within1km} primary schools within 1 km.` });
  if (i.development && l.tenure && l.tenure !== i.development.tenure) {
    factors.push({ topic: 'Tenure', tone: 'attention', text: `The listing says ${l.tenure}; the development record says ${i.development.tenure}. Confirm before relying on either.` });
  } else if (i.development?.tenure === 'Freehold') {
    factors.push({ topic: 'Tenure', tone: 'positive', text: 'Freehold development.' });
  }
  if (m && (!m.local || m.confidence === 'thin')) {
    factors.push({
      topic: 'Data limits',
      tone: 'attention',
      text: m.local ? `Small comparable sample (${plural(m.sample, 'contract')}).` : `Local sample insufficient; contracts from ${m.basis === 'island' ? 'across Singapore' : 'nearby districts'} were used.`,
    });
  }
  if (i.unavailable.length) {
    factors.push({ topic: 'Data limits', tone: 'attention', text: `${list(i.unavailable)} data ${i.unavailable.length === 1 ? 'was' : 'were'} unavailable when prepared.` });
    limitations.push(`${list(i.unavailable)} data ${i.unavailable.length === 1 ? 'was' : 'were'} unavailable when this document was prepared.`);
  }
  if (factors.length < 3 && deal === 'rent' && l.minLeaseMonths >= 24) factors.push({ topic: 'Lease terms', tone: 'neutral', text: `Minimum lease of ${l.minLeaseMonths} months.` });
  if (factors.length < 3) factors.push({ topic: 'The home', tone: 'neutral', text: `${layoutText(l.bedrooms)} ${TYPE_NOUN[l.propertyType]}, ${sqft(l.sizeSqft)}, in ${areaName(l.district)}.` });
  /* One factor per topic, most specific first, never more than five. */
  const seen = new Set<string>();
  const picked = factors.filter((f) => (seen.has(f.topic) ? false : (seen.add(f.topic), true))).slice(0, 5);

  /* ------------------------------------------------------------ confidence */
  let confidence: PropertyInsight['confidence'];
  if (!m) {
    confidence = { level: 'insufficient', label: 'Insufficient data', reason: unavailableReason(i) };
  } else if (!m.local || m.confidence === 'thin') {
    confidence = { level: 'limited', label: 'Limited', reason: m.local ? `${plural(m.sample, 'comparable contract')}` : `${plural(m.sample, 'contract')}, ${BASIS_NAME[m.basis].toLowerCase()}` };
  } else {
    confidence = { level: 'moderate', label: 'Moderate', reason: `${plural(m.sample, 'comparable contract')} over ${m.trend.length} months, ${BASIS_NAME[m.basis].toLowerCase()}` };
  }
  if (m && i.illustrative) confidence.reason += ' · illustrative demo data';
  if (deal === 'sale') limitations.push('No sale transaction evidence is held, so the asking price is not benchmarked against sales.');

  return {
    historical,
    current: currentPos,
    outlook,
    factors: picked,
    confidence,
    limitations: [...new Set(limitations)],
    window,
  };
}

/* ======================================================= the shortlist */

export interface ShortlistEntry {
  name: string;
  listing: DemoListing;
  market: MarketResult;
  history: HistoryResult;
  insight: PropertyInsight;
  station: Place | null;
  heldContracts: number;
}

/**
 * Factual differences between the shortlisted properties. It compares and
 * never ranks: there is no winner, because the client's own priorities decide
 * that, and the document does not know them.
 */
export function shortlistInsights(entries: ShortlistEntry[]): string[] {
  if (entries.length < 2) return [];
  const out: string[] = [];
  const rentals = entries.filter((e) => dealOf(e.listing) === 'rent' && e.listing.monthlyRent > 0);
  const sales = entries.filter((e) => dealOf(e.listing) === 'sale' && (e.listing.salePriceSgd ?? 0) > 0);
  const extremes = <T,>(xs: T[], v: (x: T) => number) => {
    const sorted = [...xs].sort((a, b) => v(a) - v(b));
    return { lo: sorted[0], hi: sorted[sorted.length - 1] };
  };

  if (rentals.length >= 2) {
    const rents = extremes(rentals, (e) => e.listing.monthlyRent);
    if (rents.lo.listing.monthlyRent !== rents.hi.listing.monthlyRent) {
      out.push(`Asking rents run from ${money(rents.lo.listing.monthlyRent)} a month (${rents.lo.name}) to ${money(rents.hi.listing.monthlyRent)} (${rents.hi.name}).`);
    }
    const sized = rentals.filter((e) => e.listing.sizeSqft > 0);
    if (sized.length >= 2) {
      const rate = (e: ShortlistEntry) => e.listing.monthlyRent / e.listing.sizeSqft;
      const p = extremes(sized, rate);
      if (round2(rate(p.lo)) !== round2(rate(p.hi))) {
        const differs = p.lo !== rents.lo ? ', so the lowest rent is not the lowest rate' : '';
        out.push(`Per sq ft, ${p.lo.name} asks the least (${psf2(rate(p.lo))}) and ${p.hi.name} the most (${psf2(rate(p.hi))})${differs}.`);
      }
    }
  }
  if (sales.length >= 2) {
    const { lo, hi } = extremes(sales, (e) => e.listing.salePriceSgd ?? 0);
    out.push(`Asking prices run from ${money(lo.listing.salePriceSgd ?? 0)} (${lo.name}) to ${money(hi.listing.salePriceSgd ?? 0)} (${hi.name}).`);
  }
  if (rentals.length && sales.length) out.push(`The shortlist mixes ${plural(rentals.length, 'rental')} and ${plural(sales.length, 'sale')}; their prices are not compared with each other.`);

  const compared = entries.filter((e) => e.market.status === 'ok');
  if (compared.length) {
    const groups: Record<RangePlace, string[]> = { below: [], within: [], above: [] };
    compared.forEach((e) => { if (e.insight.current.place) groups[e.insight.current.place].push(e.name); });
    const parts = (['within', 'above', 'below'] as RangePlace[])
      .filter((p) => groups[p].length)
      .map((p) => `${list(groups[p])} ${groups[p].length === 1 ? 'is' : 'are'} ${where(p)}`);
    out.push(`${parts.join('; ')}.`.replace(/^./, (s) => s.toUpperCase()));
  }
  const notCompared = entries.filter((e) => e.market.status !== 'ok');
  if (notCompared.length && compared.length) {
    const reasons = [...new Set(notCompared.map((e) => unavailableReason(e)))];
    out.push(`${list(notCompared.map((e) => e.name))} ${notCompared.length === 1 ? 'has' : 'have'} no comparable contract evidence (${lowerFirst(reasons.join('; '))}), so ${notCompared.length === 1 ? 'its' : 'their'} pricing cannot be set against the others on the same basis.`);
  } else if (notCompared.length === entries.length) {
    out.push(`None of the properties could be compared with contract evidence (${lowerFirst([...new Set(entries.map((e) => unavailableReason(e)))].join('; '))}).`);
  }

  const moved = entries.filter((e) => e.market.status === 'ok' && e.market.changePct !== null)
    .map((e) => ({ e, v: (e.market as MarketPosition).changePct as number }));
  if (moved.length >= 2) {
    const { lo, hi } = extremes(moved, (x) => x.v);
    if (Math.abs(hi.v - lo.v) >= 1) {
      out.push(`Comparable rents moved most around ${hi.e.name} (${signed(hi.v)}) and least around ${lo.e.name} (${signed(lo.v)}) over the past year.`);
    }
  }
  const history = entries.filter((e) => e.history.status === 'ok');
  if (history.length && history.length < entries.length) {
    out.push(`Twelve-month price history is available for ${list(history.map((e) => e.name))}; not for ${list(entries.filter((e) => e.history.status !== 'ok').map((e) => e.name))}.`);
  }

  const measured = entries.filter((e) => e.station);
  if (measured.length >= 2) {
    const { lo, hi } = extremes(measured, (e) => e.station!.metres);
    if (hi.station!.metres - lo.station!.metres >= 200) {
      out.push(`${lo.name} is closest to a station (${metresText(lo.station!.metres)} to ${lo.station!.name}); ${hi.name} is furthest (${metresText(hi.station!.metres)}).`);
    }
  }
  const sized = entries.filter((e) => e.listing.sizeSqft > 0);
  if (sized.length >= 2 && out.length < 6) {
    const { lo, hi } = extremes(sized, (e) => e.listing.sizeSqft);
    if (hi.listing.sizeSqft - lo.listing.sizeSqft >= 100) {
      out.push(`Floor areas range from ${sqft(lo.listing.sizeSqft)} (${lo.name}) to ${sqft(hi.listing.sizeSqft)} (${hi.name}).`);
    }
  }
  return out.slice(0, 6);
}
