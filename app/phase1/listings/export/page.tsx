"use client";

/**
 * The client shortlist, as a printed advisory report.
 *
 * Every page answers one client question, and a page exists only when the
 * data can answer it: at a glance, property history, price position,
 * comparable properties, market trend, development insights, location and
 * connectivity, competing listings, and a client decision summary.
 *
 * Two editions:
 *  - **Client report** (default, `client-edition.tsx`): the shortlist a client
 *    reads. One template that scales with the selection — a focused analysis
 *    for one property, a comparison for two or three, a summary and landscape
 *    comparison for more — with an AI Analysis per property. Laid out as
 *    measured blocks, so pages break where the content allows.
 *  - **Detailed report** (`mode=detailed`): every page for every property,
 *    plus contents, neighbourhood detail, the contracts annex and the method,
 *    one fixed sheet per section.
 *
 * Nothing is laid out until the data has been checked (`lib/phase1/report`).
 * A property whose price contradicts its listing type, or whose market
 * figures do not reconcile, stops the report with an explanation for the
 * agent instead of producing a document that could mislead a client.
 *
 * Neighbourhood sheets are read live from the public datasets when the report
 * opens. Each answer is classified before it is printed, so a dataset that
 * failed reads "Data unavailable" and never "None nearby".
 *
 * Every figure comes through a data provider (`lib/phase1/report-data`),
 * chosen by the toolbar's Demo Data switch: ON is illustrative demo data,
 * marked on every sheet, and OFF is the property's original data. The sheets below
 * never ask which one they were given.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer, Check, TriangleAlert, LoaderCircle, Pencil } from 'lucide-react';
import { Button, EmptyState, cx } from '../../../../components/phase1/kit';
import { useDemo, TODAY, preferredName } from '../../../../lib/phase1/DemoContext';
import { useSession } from '../../../../lib/phase1/SessionContext';
import type { DemoListing } from '../../../../lib/phase1/data';
import { monthLabel } from '../../../../lib/phase1/market';
import type { Place, PlaceKind, PlacesLookup } from '../../../../lib/phase1/places';
import { plainName } from '../../../../lib/phase1/names';
import { sgDateLong, sgDate } from '../../../../lib/phase1/format';
import { BASIS_NAME, CONFIDENCE_NOTE, MIN_SAMPLE, VERDICT_LABEL, type MarketPosition } from '../../../../lib/phase1/market-position';
import {
  amenityEvidence, blocking, countText, isInSingapore, nearestText, placeEvidence, toReportProperty,
  validateMarket, validateProperty, EVIDENCE_TEXT, type Evidence, type ReportCheck,
} from '../../../../lib/phase1/report';
import {
  MIN_ACTIVE, RANGE_LABEL, STATUS_TEXT, areaName, bedroomMix, competingNotes, competingStatement, decisionSummary, developmentNotes,
  floorLevel, historyNotes, keyTakeaways, listingStatusText, matchOf, positionNotes,
  positioning, rangePosition, sizeNote, trendNotes, validateCompeting, validateHistory,
  type CompetingResult, type CompetingSet, type HistoryResult, type InsightInput,
} from '../../../../lib/phase1/report-insights';
import {
  providerFor, withDemoData, type Around, type ReportDataProvider,
} from '../../../../lib/phase1/report-data';
import { useDemoDataOn } from '../../../../lib/phase1/report-data/switch';
import { DemoBadge } from '../../../../components/phase1/DemoDataSwitch';
import { analyseProperty, shortlistInsights, unavailableReason } from '../../../../lib/phase1/property-insight';
import { ClientEdition, type ClientMeta, type ClientProperty, type NearbyGroup } from './client-edition';
import type { FlowLayout } from './flow';
import {
  C, DISPLAY, SANS, VERDICT_INK, Benchmark, DemoMark, Body, Bullets, Callout, Eyebrow, Fine, GroupCard, KV, Legend, LineChart, NearestRows, None, Notice,
  PageFooter, PlaceRows, RateBars, Badge, Photo, Scatter, Section, Sheet, Stats, Table, Title, TrendChart, Unknown, VolumeBars, Wordmark,
  dd, distance, money, psfText, signedPct, sqftText, walk,
  type Col, type NearestRow,
} from './ui';

export default function ExportPage() {
  return (
    <Suspense fallback={null}>
      <ReportWithData />
    </Suspense>
  );
}

/**
 * The Demo Data switch picks the provider once. A new provider starts a fresh
 * report, so an answer gathered in one mode can never appear in the other.
 */
function ReportWithData() {
  /* The report follows the one Demo Data switch in the application header: it
     opens in whichever mode the agent chose there (or the address asks for),
     and says so in the toolbar. It has no switch of its own. */
  const demoDataOn = useDemoDataOn();
  return <Report key={demoDataOn ? 'demo' : 'original'} provider={providerFor(demoDataOn)} demoDataOn={demoDataOn} />;
}

/* ================================================================ config */

type Mode = 'client' | 'detailed';
const KINDS: PlaceKind[] = ['mrt', 'schools', 'healthcare', 'attractions'];

const STEP_SOURCE: Record<PlaceKind, { label: string; source: string }> = {
  mrt: { label: 'MRT and LRT stations', source: 'Land Transport Authority' },
  schools: { label: 'Schools', source: 'Ministry of Education' },
  healthcare: { label: 'Hospitals and polyclinics', source: 'Ministry of Health' },
  attractions: { label: 'Places to visit', source: 'Singapore Tourism Board' },
};

const DAILY: { key: string; label: string; none: string }[] = [
  { key: 'hawker', label: 'Hawker centre', none: 'None within 1 km' },
  { key: 'parks', label: 'Park', none: 'None within 1 km' },
  { key: 'sport', label: 'Sport facility', none: 'None within 1 km' },
  { key: 'libraries', label: 'Library', none: 'None within 1 km' },
  { key: 'community', label: 'Community club', none: 'None within 1 km' },
];

const PREPARE_MIN_MS = 1800;
const PREPARE_MAX_MS = 15_000;
const CLIENT_COMPARABLES = 12;
const DETAILED_COMPARABLES = 20;
const ANNEX_ROWS = 34;
const ANNEX_MAX_PAGES = 2;
const HISTORY_ROWS = 8;

/** A property's checks, with the development or district history the report prints. */
type Check = ReportCheck & { history: HistoryResult };

const isPrimary = (p: Place) => /primary/i.test(p.detail ?? '');
const isSecondary = (p: Place) => /secondary|junior college|\bjc\b/i.test(p.detail ?? '');
const unitOf = (l: DemoListing) => (l.unitNo && l.unitNo.trim() && l.unitNo.trim() !== '—' ? ` ${l.unitNo.trim()}` : '');
const nameOf = (l: DemoListing) => `${l.project}${unitOf(l)}`;
/* OneMap labels read "25 Bidadari Park Drive The Woodleigh Residences Singapore 367797";
   the development is already the title, so the address line is street and postal code. */
const fullAddress = (l: DemoListing) => {
  let street = l.address.replace(/,?\s*Singapore\s*\d{6}\s*$/i, '');
  const at = street.toLowerCase().lastIndexOf(l.project.toLowerCase());
  if (at > 0) street = `${street.slice(0, at)}${street.slice(at + l.project.length)}`;
  street = street.replace(/\s+/g, ' ').replace(/[\s,]+$/, '').trim();
  /* "11 Normanton Park Singapore 119003": the road carries the development's name. */
  if (/^\d+[a-z]?$/i.test(street)) street = `${street} ${l.project}`;
  return `${street || l.address}, Singapore ${l.postalCode}`;
};
const districtLine = (l: DemoListing) => {
  const name = areaName(l.district);
  return /^district/i.test(name) ? `District ${dd(l.district)}` : `D${dd(l.district)} ${name}`;
};
const sqm = (sqft: number) => Math.round(sqft * 0.092903);
/* "15 Sep 2026": the en-SG "Sept" costs a character a narrow figure cell does not have. */
const dayText = (v: string | Date) => sgDate(v).replace('Sept', 'Sep');

/* ======================================================= progress panel */

type StepState = 'loading' | 'done' | 'failed';
interface Step { key: string; label: string; source: string; state: StepState; detail: string }

function Preparing({ steps, elapsed, count }: { steps: Step[]; elapsed: number; count: number }) {
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = before; };
  }, []);
  const settled = steps.filter((s) => s.state !== 'loading').length;
  const pct = Math.round((settled / steps.length) * 100);

  return (
    <div className="no-print fixed inset-0 z-30 flex items-center justify-center bg-p1-bg/85 p-4 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="w-full min-w-0 max-w-[460px] rounded-xl border border-p1-border bg-p1-surface p-5 shadow-p1-lg sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-p1display text-[18px] font-bold leading-tight text-p1-text">Preparing the report</h2>
            <p className="mt-1 text-[13px] leading-5 text-p1-text-2">
              Checking particulars and collecting neighbourhood data for {count} propert{count === 1 ? 'y' : 'ies'}.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-p1display text-[24px] font-bold leading-none tabular-nums text-p1-text">{(elapsed / 1000).toFixed(1)}s</div>
            <div className="mt-1 text-[11px] text-p1-text-3">usually under 10s</div>
          </div>
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-p1-subtle" aria-hidden>
          <div className="h-full bg-p1-primary transition-[width] duration-300" style={{ width: `${Math.max(6, pct)}%` }} />
        </div>
        <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] divide-y divide-p1-border">
          {steps.map((s) => (
            <li key={s.key} className="flex min-w-0 items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-p1-text">{s.label}</span>
                <span className="block truncate text-[11.5px] text-p1-text-3">{s.source}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] tabular-nums text-p1-text-2">
                {s.detail}
                {s.state === 'loading' && <LoaderCircle size={15} className="animate-spin text-p1-text-3" aria-label="Loading" />}
                {s.state === 'done' && <Check size={15} className="text-p1-success" aria-label="Done" />}
                {s.state === 'failed' && <TriangleAlert size={15} className="text-p1-warning" aria-label="Did not answer" />}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ============================================================ blockers */

function Blocked({ checks }: { checks: ReportCheck[] }) {
  const failing = checks.filter((c) => c.issues.some((i) => i.severity === 'error'));
  const count = failing.reduce((n, c) => n + c.issues.filter((i) => i.severity === 'error').length, 0);
  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-8">
      <div className="rounded-xl border border-p1-danger-border bg-p1-surface p-5 shadow-p1-sm sm:p-6" role="alert">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-p1-danger-soft text-p1-danger" aria-hidden>
            <TriangleAlert size={18} />
          </span>
          <div className="min-w-0">
            <h1 className="font-p1display text-[19px] font-bold leading-tight text-p1-text">This report has not been generated</h1>
            <p className="mt-1.5 text-[14px] leading-6 text-p1-text-2">
              {count} problem{count === 1 ? '' : 's'} in {failing.length} propert{failing.length === 1 ? 'y' : 'ies'} would put a wrong or
              contradictory figure in front of your client. Correct {count === 1 ? 'it' : 'them'} and open the report again.
            </p>
          </div>
        </div>

        <ul className="mt-5 space-y-4">
          {failing.map((c) => {
            const l = c.property.listing;
            return (
              <li key={l.id} className="rounded-lg border border-p1-border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-p1-border px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-[14.5px] font-semibold text-p1-text">{nameOf(l)}</div>
                    <div className="truncate text-[12.5px] text-p1-text-3">{l.reference} · {fullAddress(l)}</div>
                  </div>
                  <Link href={`/phase1/listings/new?edit=${l.id}`}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-p1-border-strong px-3.5 text-[13px] font-medium text-p1-text hover:bg-p1-subtle">
                    <Pencil size={14} aria-hidden /> Edit listing
                  </Link>
                </div>
                <ul className="divide-y divide-p1-border">
                  {c.issues.filter((i) => i.severity === 'error').map((i, k) => (
                    <li key={`${i.code}-${k}`} className="px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-p1-danger">{i.area}</div>
                      <p className="mt-0.5 text-[14px] leading-6 text-p1-text">{i.message}</p>
                      {i.fix && <p className="mt-0.5 text-[13px] leading-5 text-p1-text-2">{i.fix}</p>}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ================================================================ page */

type TocEntry = { label: string; group?: string };
type SheetDef = { key: string; section: string; toc?: TocEntry; body: React.ReactNode; flush?: boolean };

function Report({ provider, demoDataOn }: { provider: ReportDataProvider; demoDataOn: boolean }) {
  const params = useSearchParams();
  const { state } = useDemo();
  const { user } = useSession();

  const ids = (params.get('ids') ?? '').split(',').filter(Boolean);
  const idKey = ids.join(',');
  const forClient = (params.get('for') ?? '').trim();
  const note = (params.get('note') ?? '').trim();
  const mode: Mode = params.get('mode') === 'detailed' ? 'detailed' : 'client';
  const detailed = mode === 'detailed';

  const chosen: DemoListing[] = useMemo(
    () => ids.map((id) => state.listings.find((l) => l.id === id && !l.archived)).filter((l): l is DemoListing => Boolean(l)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idKey, state.listings],
  );
  const absent = ids.length - chosen.length;

  /* ------------------------------------------------ validation first */

  const checks: Check[] = useMemo(() => chosen.map((l) => {
    const market = provider.position(l);
    const history = provider.history(l);
    return { property: toReportProperty(l), market, history, issues: [...validateProperty(l), ...validateMarket(l, market), ...validateHistory(l, history, provider.development(l))] };
  }), [chosen, provider]);
  /* The client edition prints stations, schools, healthcare and daily needs;
     places to visit are asked for only by the detailed edition. */
  const kinds: PlaceKind[] = detailed ? KINDS : ['mrt', 'schools', 'healthcare'];
  const errors = blocking(checks);
  const blocked = errors.length > 0;
  const located = useMemo(() => chosen.filter((l) => isInSingapore(l.lat, l.lng)), [chosen]);

  /* ------------------------------------------------ live neighbourhood */

  const [places, setPlaces] = useState<Record<string, Partial<Record<PlaceKind, PlacesLookup>>>>({});
  const [around, setAround] = useState<Record<string, Around | null>>({});
  const [competing, setCompeting] = useState<Record<string, CompetingResult>>({});

  useEffect(() => {
    if (blocked) return undefined;
    let live = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PREPARE_MAX_MS - 500);

    /* Two units in one development share a position: each lookup is asked once
       per place and the answer shared, so a long shortlist does not repeat it. */
    const asked = new Map<string, Promise<unknown>>();
    const once = <T,>(key: string, run: () => Promise<T>) => {
      if (!asked.has(key)) asked.set(key, run());
      return asked.get(key) as Promise<T>;
    };
    for (const l of located) {
      const at = `${l.lat}|${l.lng}|${l.postalCode}`;
      for (const kind of kinds) {
        void once(`${kind}|${at}`, () => provider.places(l, kind, controller.signal))
          .then((body) => { if (live) setPlaces((prev) => ({ ...prev, [l.id]: { ...prev[l.id], [kind]: body } })); });
      }
      void once(`around|${at}`, () => provider.around(l, controller.signal))
        .then((value) => { if (live) setAround((prev) => ({ ...prev, [l.id]: value })); });
    }
    for (const l of chosen) {
      void provider.competing(l, controller.signal)
        .then((value) => { if (live) setCompeting((prev) => ({ ...prev, [l.id]: value })); });
    }
    return () => { live = false; controller.abort(); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey, located.length, blocked, detailed]);

  /* Photographs that fail to load are dropped for the typographic layout. */
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const markBroken = (src: string) => setBroken((prev) => (prev.has(src) ? prev : new Set(prev).add(src)));

  const [images, setImages] = useState<{ total: number; failed: number } | null>(null);
  useEffect(() => {
    if (chosen.length === 0 || blocked) return undefined;
    let live = true;
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.vr-doc img'));
    let failed = 0;
    void Promise.all(imgs.map((img) => (img.complete
      ? Promise.resolve(img.naturalWidth === 0 ? (failed += 1) : 0)
      : new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => { failed += 1; resolve(); }, { once: true });
      })))).then(() => { if (live) setImages({ total: imgs.length, failed }); });
    return () => { live = false; };
  }, [idKey, chosen.length, blocked, mode]);

  const steps: Step[] = useMemo(() => {
    const out: Step[] = [{
      key: 'images', label: 'Photographs and maps', source: 'Agent uploads, OneMap',
      state: images ? 'done' : 'loading', detail: images ? `${images.total - images.failed} ready` : '',
    }];
    for (const kind of kinds) {
      const got = located.map((l) => places[l.id]?.[kind]).filter((x): x is PlacesLookup => Boolean(x));
      const ok = got.filter((g) => g.status === 'ok');
      const settled = got.length === located.length;
      out.push({
        key: kind, label: STEP_SOURCE[kind].label, source: provider.credit(STEP_SOURCE[kind].source),
        state: !settled ? 'loading' : located.length === 0 || ok.length === located.length ? 'done' : 'failed',
        detail: !settled ? '' : located.length === 0 ? 'No mapped address' : ok.length === located.length ? 'Answered' : 'Data unavailable',
      });
    }
    const essentials = located.map((l) => around[l.id]);
    const settled = essentials.every((x) => x !== undefined);
    out.push({
      key: 'essentials', label: 'Hawker centres, parks and sport', source: provider.credit('SFA, NParks, Sport Singapore via OneMap'),
      state: !settled ? 'loading' : essentials.every(Boolean) ? 'done' : 'failed',
      detail: !settled ? '' : essentials.every(Boolean) ? 'Answered' : 'Data unavailable',
    });
    const active = chosen.map((l) => competing[l.id]);
    const activeSettled = active.every((x) => x !== undefined);
    const activeOk = active.every((x) => x?.status === 'ok');
    out.push({
      key: 'competing', label: 'Competing listings', source: provider.credit('Listings live on V-RENT'),
      state: !activeSettled ? 'loading' : activeOk ? 'done' : 'failed',
      detail: !activeSettled ? '' : activeOk ? 'Answered' : 'Data unavailable',
    });
    out.push({
      key: 'market', label: 'Comparable lease contracts', source: provider.dataset.name,
      state: 'done', detail: `${checks.filter((c) => c.market.status === 'ok').length} of ${checks.length} compared`,
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `kinds` follows `detailed`
  }, [images, located, places, around, checks, chosen, competing, provider, detailed]);

  const allSettled = steps.every((s) => s.state !== 'loading');
  const unavailableSources = steps.filter((s) => s.state === 'failed').length;

  const [elapsed, setElapsed] = useState(0);
  const [preparedIn, setPreparedIn] = useState<number | null>(null);
  /* The client edition's pagination, reported by its flow layout. */
  const [layout, setLayout] = useState<FlowLayout | null>(null);
  const settledRef = useRef(false);
  useEffect(() => { settledRef.current = allSettled; }, [allSettled]);
  useEffect(() => {
    const start = performance.now();
    const timer = setInterval(() => {
      const ms = performance.now() - start;
      setElapsed(ms);
      if ((settledRef.current && ms >= PREPARE_MIN_MS) || ms >= PREPARE_MAX_MS) {
        setPreparedIn(ms);
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);
  const ready = preparedIn !== null;

  /* The saved file takes its name from the document title, never the address bar. */
  const p = state.profile;
  const preparedOn = sgDateLong(TODAY);
  const allRent = checks.length > 0 && checks.every((c) => c.property.deal === 'rent');
  const brandLine = allRent ? 'Singapore Residential Rental Advisory' : 'Singapore Residential Property Advisory';
  useEffect(() => {
    const before = document.title;
    document.title = `V-RENT ${allRent ? 'Rental' : 'Property'} Advisory${forClient ? ` - ${forClient}` : ''}${provider.notice ? ' - Demo data' : ''} - ${sgDate(TODAY)}`;
    return () => { document.title = before; };
  }, [allRent, forClient, provider.notice]);

  /* ------------------------------------------------------ toolbar */

  const modeHref = (m: Mode) => {
    const q = new URLSearchParams(withDemoData(params.toString(), demoDataOn));
    if (m === 'detailed') q.set('mode', 'detailed'); else q.delete('mode');
    return `/phase1/listings/export?${q.toString()}`;
  };

  if (chosen.length === 0) {
    return (
      <div className="p1 min-h-screen bg-p1-bg">
        <div className="mx-auto max-w-[820px] px-4 py-10">
          <EmptyState
            title="Nothing selected for the report"
            description={absent > 0 ? 'The selected listings are no longer in your workspace.' : 'Choose the units on the shortlist screen, or filter your listings and export what is left.'}
            action={<Link href="/phase1/shortlists" className="text-[14px] font-medium text-p1-primary underline-offset-4 hover:underline dark:text-p1-info">Build a shortlist</Link>}
          />
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------ shared text */

  const agentName = preferredName(p.fullName) || 'Your agent';
  const licence = p.agencyLicence && p.agencyLicence !== '—' ? p.agencyLicence : '';
  const agentLine = `${p.fullName} · CEA ${p.ceaNumber} · ${p.agency}${licence ? ` (${licence})` : ''}`;
  const rentals = checks.filter((c) => c.property.askingRent !== null);
  const rents = rentals.map((c) => c.property.askingRent!);
  const districts = [...new Set(chosen.map((l) => l.district))].sort((a, b) => a - b);

  /* ------------------------------------------------ evidence per property */

  const evidenceFor = (l: DemoListing) => {
    const isLocated = isInSingapore(l.lat, l.lng);
    const got = places[l.id] ?? {};
    const mrt = placeEvidence(got.mrt, isLocated, 'mrt');
    const schools = placeEvidence(got.schools, isLocated, 'schools');
    const health = placeEvidence(got.healthcare, isLocated, 'healthcare');
    const visits = placeEvidence(got.attractions, isLocated, 'attractions');
    const healthMissing = got.healthcare?.status === 'ok' ? got.healthcare.missing ?? [] : [];
    /* A hospital list is complete when only the polyclinic source failed, and vice versa. */
    const subset = (detail: string): Evidence<Place> => ({
      ...health,
      state: health.state === 'partial' && !healthMissing.includes(detail) ? 'verified' : health.state,
      items: health.items.filter((h) => h.detail === detail),
    });
    return {
      isLocated, mrt, schools, health, visits,
      primaries: { ...schools, items: schools.items.filter(isPrimary) } as Evidence<Place>,
      secondaries: { ...schools, items: schools.items.filter(isSecondary) } as Evidence<Place>,
      hospitals: subset('Hospital'),
      polyclinics: subset('Polyclinic'),
      amenity: (key: string) => amenityEvidence(around[l.id], isLocated, key),
    };
  };

  /** A place, a verified none, or the reason it cannot be stated. */
  const nearestNode = <T extends { name: string; metres: number }>(e: Evidence<T>, none: string, withWalk = true) => {
    const r = nearestText(e, none);
    if (r.kind === 'item') {
      return <><span className="font-semibold">{plainName(r.item.name)}</span> <span style={{ color: C.muted }}>{distance(r.item.metres)}{withWalk && r.item.metres <= 2000 ? ` · ${walk(r.item.metres)}` : ''}</span></>;
    }
    return r.kind === 'none' ? <None>{r.text}</None> : <Unknown>{r.text}</Unknown>;
  };

  const stateNote = (e: Evidence<unknown>, what: string) => {
    if (e.state === 'verified') return null;
    if (e.state === 'unverified') return <Notice tone="warn" title={`${what}: unable to verify`}>The address is not matched to a map position.</Notice>;
    if (e.state === 'unavailable') return <Notice tone="warn" title={`${what}: data unavailable`}>The dataset did not respond. This does not mean there are none nearby.</Notice>;
    return <Fine>{e.note}</Fine>;
  };

  const retrieved = (e: Evidence<unknown>) => (e.retrievedAt ? `retrieved ${dayText(e.retrievedAt)}` : '');

  /* Competing listings are secondary evidence: a set that fails its checks is
     treated as unavailable rather than printed. */
  const competingFor = (l: DemoListing): CompetingSet | null => {
    const raw = competing[l.id];
    return raw && raw.status === 'ok' && validateCompeting(l, raw).length === 0 ? raw : null;
  };

  const insightFor = (c: Check, e: ReturnType<typeof evidenceFor>, comp: CompetingSet | null): InsightInput => {
    const hawker = e.amenity('hawker');
    const unavailable = !e.isLocated ? [] : ([['Transport', e.mrt], ['Schools', e.schools], ['Healthcare', e.health], ['Daily needs', hawker]] as [string, Evidence<unknown>][])
      .filter(([, ev]) => ev.state === 'unavailable').map(([k]) => k);
    return {
      listing: c.property.listing,
      market: c.market,
      history: c.history,
      competing: comp,
      mrt: { state: e.mrt.state, nearest: e.mrt.items[0] ?? null },
      primaries: { state: e.primaries.state, within1km: e.primaries.items.filter((s) => s.metres <= 1000).length },
      hawker: { state: hawker.state, nearest: hawker.items[0] ? { name: plainName(hawker.items[0].name), metres: hawker.items[0].metres } : null },
      unavailable,
      development: provider.development(c.property.listing),
      today: TODAY,
      marketNote: provider.marketNote,
      activeSource: provider.activeSource,
    };
  };

  /* The cover of a single-property report states the three things a client
     asks first, each only as far as the evidence goes. */
  const coverSummary = (c: ReportCheck): [string, React.ReactNode][] => {
    const e = evidenceFor(c.property.listing);
    const m = c.market.status === 'ok' ? c.market : null;
    return [
      ...(c.property.deal === 'sale' ? [] : [['Market position', m
        ? <span key="m" style={{ color: VERDICT_INK[m.verdict] }}>{VERDICT_LABEL[m.verdict]} ({signedPct(m.deltaPct)} per sq ft)</span>
        : <None key="m">Comparison unavailable</None>]] as [string, React.ReactNode][]),
      ['Nearest MRT / LRT', nearestNode(e.mrt, 'None within 2 km')],
      ['Primary schools within 1 km', countText(e.primaries, e.primaries.items.filter((s) => s.metres <= 1000).length)],
    ];
  };

  /* ========================================================= client edition */

  /* Each property worked out once: figures, evidence and the AI Analysis. The
     client edition only lays these out. */
  const nearRow = <T extends { name: string; metres: number }>(label: string, ev: Evidence<T>, none: string): NearestRow => {
    const r = nearestText(ev, none);
    if (r.kind === 'item') return { label, name: plainName(r.item.name), metres: r.item.metres };
    return { label, fallback: r.kind === 'none' ? <None>{r.text}</None> : <Unknown>{r.text}</Unknown> };
  };
  const placeGroup = (label: string, ev: Evidence<unknown>, rows: NearbyGroup['rows'], none: string): NearbyGroup => (rows.length
    ? { label, rows }
    : { label, rows: [], fallback: ev.state === 'verified' ? <None>{none}</None> : <Unknown>{EVIDENCE_TEXT[ev.state]}</Unknown> });
  const thumbOf = (src: string) => (src.startsWith('/demo/') ? src.replace(/\.jpg$/, '-thumb.jpg') : `${src}${src.includes('?') ? '&' : '?'}size=thumb`);
  const clientProperties: ClientProperty[] = detailed ? [] : checks.map((c, k) => {
    const l = c.property.listing;
    const e = evidenceFor(l);
    const comp = competingFor(l);
    const market = c.market.status === 'ok' ? c.market : null;
    const base = insightFor(c, e, comp);
    const heldContracts = provider.contracts(l).length;
    const insight = analyseProperty({
      ...base,
      earlier: provider.earlier(l, state.listings),
      heldContracts,
      illustrative: !provider.dataset.live,
      activeSource: provider.activeSource,
    });
    const photos = provider.photos(user?.id, l).filter((src) => !broken.has(src));
    const photo = photos[0];
    const station = nearRow('MRT / LRT station', e.mrt, 'None within 2 km');
    const daily = DAILY.map((d) => ({ ...d, ev: e.amenity(d.key) }));
    const dailyRows = daily.flatMap((d) => d.ev.items.map((a) => ({ name: plainName(a.name), detail: d.label, metres: a.metres }))).sort((a, b) => a.metres - b.metres);
    const dailyEv = daily.find((d) => d.ev.state === 'verified')?.ev ?? daily[0].ev;
    return {
      n: k + 1,
      listing: l,
      name: nameOf(l),
      address: fullAddress(l),
      districtLine: districtLine(l),
      deal: c.property.deal,
      askingRent: c.property.askingRent,
      salePrice: c.property.salePrice,
      psf: c.property.psf,
      market,
      history: c.history.status === 'ok' ? c.history : null,
      competing: comp,
      range: market ? rangePosition(market, l.sizeSqft) : null,
      insight,
      notCompared: unavailableReason({ listing: l, market: c.market, heldContracts }),
      photo,
      thumb: photo ? thumbOf(photo) : undefined,
      photos,
      photoThumbs: photos.map(thumbOf),
      map: e.isLocated ? `/api/phase1/map?lat=${l.lat}&lng=${l.lng}&w=512&h=384` : undefined,
      nearbyGroups: [
        placeGroup('MRT / LRT stations', e.mrt, e.mrt.items.map((s) => ({ name: plainName(s.name), metres: s.metres })), 'No station within 2 km'),
        placeGroup('Schools', e.schools, e.schools.items.filter((s) => isPrimary(s) || isSecondary(s)).map((s) => ({ name: plainName(s.name), detail: s.detail, metres: s.metres })), 'No school within 2 km'),
        placeGroup('Healthcare', e.health, e.health.items.map((h) => ({ name: plainName(h.name), detail: h.detail, metres: h.metres })), 'None within 5 km'),
        placeGroup('Daily needs', dailyEv, dailyRows, 'None within 1 km'),
      ],
      development: provider.development(l),
      floorLevel: floorLevel(l.unitNo),
      nearby: [
        station,
        nearRow('Primary school', e.primaries, 'None within 2 km'),
        nearRow('Hawker centre', e.amenity('hawker'), 'None within 1 km'),
        nearRow('Park', e.amenity('parks'), 'None within 1 km'),
      ],
      station,
      primaries: countText(e.primaries, e.primaries.items.filter((s) => s.metres <= 1000).length),
      /* The comparison's own reason for being unavailable is phrased for the
         held dataset; the client reads why it is missing in this document. */
      keyFacts: keyTakeaways(base).slice(0, 3).map((t) => (c.market.status === 'unavailable' && t === c.market.message && c.market.reason === 'no_contracts'
        ? `${unavailableReason({ listing: l, market: c.market, heldContracts })}, so the asking rent is not compared with lodged contracts.`
        : t)),
      positioning: positioning(base),
      listingStatus: listingStatusText(l),
    };
  });

  const onLayout = (next: FlowLayout) => setLayout((prev) => (prev && prev.pages === next.pages && prev.overflow.join() === next.overflow.join() ? prev : next));

  const clientMeta: ClientMeta | null = detailed ? null : (() => {
    const anyMarket = clientProperties.some((cp) => cp.market);
    const anyCompeting = clientProperties.some((cp) => cp.competing && cp.competing.sample > 0);
    const anyPhoto = clientProperties.some((cp) => cp.photo);
    const today = dayText(TODAY);
    return {
      frame: { brandLine, preparedOn, agentLine, notice: provider.notice },
      forClient,
      note,
      preparedOn,
      agent: {
        name: agentName, fullName: p.fullName, agency: p.agency, licence, cea: p.ceaNumber,
        mobile: p.mobile, email: p.email, verified: state.approval === 'approved' && state.ceaValid,
      },
      insights: shortlistInsights(clientProperties.map((cp) => ({
        name: cp.name,
        listing: cp.listing,
        market: checks[cp.n - 1].market,
        history: checks[cp.n - 1].history,
        insight: cp.insight,
        station: cp.station.name && cp.station.metres !== undefined ? { name: cp.station.name, metres: cp.station.metres } : null,
        heldContracts: provider.contracts(cp.listing).length,
      }))),
      sources: [
        { label: 'Property details', value: `Supplied by ${p.fullName}, ${p.agency}` },
        { label: 'Photographs', value: anyPhoto ? 'Supplied by the agent' : 'None supplied' },
        { label: 'Price comparison and history', value: anyMarket ? `${provider.dataset.name}${provider.dataset.live ? '' : ' (not live market data)'}` : 'Not available for these properties' },
        ...(anyCompeting ? [{ label: 'Current listings', value: provider.wording.activeRow(today) }] : []),
        {
          label: 'Location',
          value: !located.length ? 'Addresses not matched to a map position'
            : provider.notice ? provider.wording.retrieved(today)
              : `OneMap (SLA), LTA, MOE, SFA and NParks · ${provider.wording.retrieved(today)}`,
        },
        { label: 'AI Analysis', value: 'V-RENT analysis of the figures in this document; indicative only' },
      ],
      notice: provider.notice,
      datasetNote: provider.dataset.live ? null : provider.dataset.note,
      onBroken: markBroken,
    };
  })();

  /* ================================================================ sheets */

  const sheets: SheetDef[] = [];

  /* ---------------------------------------------- shortlist overview */
  if (detailed && chosen.length > 1) {
    sheets.push({
      key: 'overview',
      section: 'Shortlist at a glance',
      toc: { label: 'Shortlist at a glance' },
      body: (
        <>
          <Title eyebrow="Shortlist" title="At a glance" sub={<>
            {chosen.length} properties across {districts.map((d) => `D${dd(d)}`).join(', ')}
            {rents.length ? <>, asking rents from {money(Math.min(...rents))} to {money(Math.max(...rents))} a month</> : null}.
          </>} />
          <Table
            cols={[
              { head: '#', width: '5%' }, { head: 'Property', width: '28%' }, { head: 'Type', width: '12%' }, { head: 'Dist', width: '6%' },
              { head: 'Beds', align: 'right', width: '6%' }, { head: 'Size', align: 'right', width: '11%' },
              { head: 'Asking', align: 'right', width: '13%' }, { head: 'PSF', align: 'right', width: '9%' }, { head: 'vs median', align: 'right' },
            ]}
            rows={checks.map((c, i) => {
              const l = c.property.listing;
              const m = c.market.status === 'ok' ? c.market : null;
              return [
                <span key="n" style={{ color: C.faint }}>{dd(i + 1)}</span>,
                <span key="p" className="font-semibold">{nameOf(l)}</span>,
                <span key="t" style={{ color: C.muted }}>{l.propertyType}</span>,
                <span key="d" style={{ color: C.muted }}>D{dd(l.district)}</span>,
                l.bedrooms,
                sqftText(l.sizeSqft),
                <span key="r" className="font-semibold">{c.property.askingRent !== null ? `${money(c.property.askingRent)}/mo` : money(c.property.salePrice ?? 0)}</span>,
                c.property.psf === null ? '—' : c.property.deal === 'sale' ? `S$${Math.round(c.property.psf).toLocaleString('en-SG')}` : psfText(c.property.psf),
                m ? <span key="m" className="font-semibold" style={{ color: VERDICT_INK[m.verdict] }}>{signedPct(m.deltaPct)}</span> : <span key="m" style={{ color: C.faint }}>{c.property.deal === 'sale' ? 'For sale' : 'n/a'}</span>,
              ];
            })}
          />
          {rentals.some((c) => c.market.status === 'ok') && (
            <Section label="Asking rent per sq ft" note="Bar: asking rate · Mark: comparable-market median">
              <RateBars rows={rentals.map((c) => ({
                label: nameOf(c.property.listing),
                rate: c.property.psf ?? 0,
                median: c.market.status === 'ok' ? c.market.medianPsf : null,
                color: c.market.status === 'ok' ? VERDICT_INK[c.market.verdict] : C.faint,
              }))} />
            </Section>
          )}
          <Section label="Neighbourhood compared" note="Straight-line distances">
            <Table
              cols={[{ head: 'Property', width: '30%' }, { head: 'Nearest MRT / LRT' }, { head: 'Primary ≤ 1 km', align: 'right', width: '15%' }, { head: 'Available', align: 'right', width: '14%' }]}
              rows={checks.map((c) => {
                const l = c.property.listing;
                const e = evidenceFor(l);
                return [
                  <span key="p" className="font-semibold">{nameOf(l)}</span>,
                  <span key="s">{nearestNode(e.mrt, 'None within 2 km', false)}</span>,
                  countText(e.primaries, e.primaries.items.filter((s) => s.metres <= 1000).length),
                  dayText(l.availableFrom),
                ];
              })}
            />
          </Section>
          {note && (
            <Section label={`A note from ${agentName}`}>
              <Body className="text-[11.5px]">{note}</Body>
            </Section>
          )}
        </>
      ),
    });
  }

  /* ---------------------------------------------- one chapter per property */
  if (detailed) checks.forEach((c, i) => {
    const { listing: l, deal, askingRent, salePrice, psf } = c.property;
    const market = c.market.status === 'ok' ? c.market : null;
    const history = c.history.status === 'ok' ? c.history : null;
    const e = evidenceFor(l);
    const photos = provider.photos(user?.id, l).filter((src) => !broken.has(src));
    /* Small frames take the 480 px derivative; the gallery keeps the 1600 px original. */
    const thumb = (src: string) => `${src}?size=thumb`;
    const depositText = l.depositMonths ? `${l.depositMonths} month${l.depositMonths === 1 ? '' : 's'}` : 'Not stated';
    const mapSrc = e.isLocated ? `/api/phase1/map?lat=${l.lat}&lng=${l.lng}&w=512&h=512` : null;
    const name = nameOf(l);
    const group = `${dd(i + 1)}  ${name}`;
    const short = chosen.length > 1 ? `${dd(i + 1)} · ${l.project}` : l.project;
    const sec = (s: string) => `${short} · ${s}`;
    const eyebrow = (s: string) => (chosen.length > 1 ? `Property ${dd(i + 1)} · ${s}` : s);
    /* A client shortlist keeps each property to the pages that decide it. A
       single property, or the detailed edition, gets every page it has data for. */
    const full = detailed || chosen.length === 1;
    const dev = provider.development(l);
    const comp = competingFor(l);
    const range = market ? rangePosition(market, l.sizeSqft) : null;
    const insight = insightFor(c, e, comp);
    const illustrative = !provider.dataset.live;
    const period = market ? `${market.period.from} to ${market.period.to}` : '';
    const DataBadge = () => (provider.dataset.badge ? <Badge tone={provider.notice ? 'warning' : 'neutral'}>{provider.dataset.badge}</Badge> : null);
    const fallbackNotice = market && !market.local ? (
      <div className="vr-block mb-4">
        <Notice tone="warn" title={`Local sample insufficient · ${BASIS_NAME[market.basis]} comparable sample used`}>{market.fallbackNote}</Notice>
      </div>
    ) : null;

    const priceStat = askingRent !== null
      ? { label: 'Asking rent', value: money(askingRent), sub: 'per month' }
      : { label: 'Asking price', value: money(salePrice ?? 0), sub: 'for sale' };
    const psfValue = (v: number) => (deal === 'rent' ? psfText(v) : `S$${Math.round(v).toLocaleString('en-SG')}`);
    const psfStat = psf === null
      ? { label: 'Per sq ft', value: '—', sub: 'floor area not stated' }
      : { label: 'Per sq ft', value: psfValue(psf), sub: deal === 'rent' ? 'per month' : 'asking price' };

    /* ---- at a glance: what am I looking at? */
    const level = floorLevel(l.unitNo);
    const verifiedAgent = state.approval === 'approved' && state.ceaValid;
    const support = photos[1];
    sheets.push({
      key: `${l.id}-glance`,
      section: sec('At a glance'),
      toc: { group, label: 'Property at a glance' },
      body: (
        <>
          <Title eyebrow={eyebrow('Property at a glance')} title={name} sub={
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{fullAddress(l)} · {districtLine(l)}</span>
              <Badge tone={deal === 'rent' ? 'brand' : 'neutral'}>{deal === 'rent' ? 'For rent' : 'For sale'}</Badge>
            </span>
          } />
          <Stats cols={5} lead items={[
            priceStat,
            psfStat,
            { label: 'Bedrooms', value: String(l.bedrooms) },
            { label: 'Bathrooms', value: String(l.bathrooms) },
            { label: 'Floor area', value: sqftText(l.sizeSqft), sub: `${sqm(l.sizeSqft)} m²` },
          ]} />
          <div className="vr-grid2 grid gap-x-8">
            <Section label="The property">
              <KV rows={[
                ['Property type', l.propertyType],
                ['Development', l.project],
                ['District', districtLine(l)],
                ['Tenure', l.tenure ?? (dev ? `${dev.tenure} (development record)` : 'Not stated')],
                ['Completed', l.builtYear ? String(l.builtYear) : dev ? `${dev.built} (development record)` : 'Not stated'],
                ['Floor level', level ? `Level ${level}` : 'Not stated'],
                ['Furnishing', l.furnishing],
              ]} />
            </Section>
            <Section label="The listing">
              <KV rows={[
                [deal === 'rent' ? 'Available from' : 'View from', dayText(l.availableFrom)],
                ...(deal === 'rent' ? [['Minimum lease', `${l.minLeaseMonths} months`], ['Security deposit', depositText]] as [string, string][] : []),
                ['Listing status', listingStatusText(l)],
                ['Listed by', agentName],
                ['CEA registration', (
                  <span key="cea" className="inline-flex items-center gap-1.5">
                    {p.ceaNumber}<Badge tone={verifiedAgent ? 'positive' : 'neutral'}>{verifiedAgent ? 'Verified' : 'Not verified'}</Badge>
                  </span>
                )],
              ]} />
              {support && <Photo src={thumb(support)} alt={`${name}, photograph 2`} onError={() => markBroken(support)} className="mt-3 h-[112px]" />}
            </Section>
          </div>
          <Section label="Key takeaways">
            <Bullets items={keyTakeaways(insight)} />
          </Section>
          {l.description && (
            <Section label="Description">
              <Body className={detailed ? 'line-clamp-[5]' : 'line-clamp-3'}>{l.description}</Body>
            </Section>
          )}
          {detailed && (l.amenities ?? []).length > 0 && (
            <Section label="Fittings and facilities">
              <ul className="columns-3 gap-8 text-[10px]">
                {(l.amenities ?? []).map((a) => <li key={a} className="break-inside-avoid py-[3px]"><span aria-hidden className="mr-2 inline-block h-1 w-1 translate-y-[-2px]" style={{ background: C.accent }} />{a}</li>)}
              </ul>
            </Section>
          )}
        </>
      ),
    });

    /* ---- photographs: those the cover and the glance sheet did not use, only
       when at least two are left, so a lone photograph never costs a page. */
    const gallery = full ? photos.slice(2, 6) : [];
    if (gallery.length >= 2) {
      sheets.push({
        key: `${l.id}-photos`,
        section: sec('Photographs'),
        toc: { group, label: 'Photographs' },
        body: (
          <>
            <Title eyebrow={eyebrow('Photographs')} title="Photographs" sub={`${photos.length} supplied by the agent`} />
            <div className="grid grid-cols-2 gap-2">
              {gallery.map((src, k, shown) => (
                /* An odd count leads with one wide frame so the grid has no empty slot. */
                <Photo key={src} src={src} alt={`${name}, photograph ${photos.indexOf(src) + 1}`} onError={() => markBroken(src)}
                  className={shown.length % 2 === 1 && k === 0 ? 'col-span-2 aspect-[2/1]' : 'aspect-[4/3]'} />
              ))}
            </div>
          </>
        ),
      });
    }

    /* ---- property history: what has happened here? */
    if (full && history && askingRent !== null) {
      const earlier = provider.earlier(l, state.listings);
      const unitRate = askingRent / l.sizeSqft;
      const historyCols: Col[] = history.scope === 'development'
        ? [{ head: 'Lease month', width: '17%' }, { head: 'Bedrooms', align: 'right', width: '12%' }, { head: 'Size', align: 'right', width: '15%' }, { head: 'Monthly rent', align: 'right', width: '16%' }, { head: 'PSF', align: 'right', width: '12%' }, { head: 'Layout', align: 'right' }]
        : [{ head: 'Lease month', width: '14%' }, { head: 'Development', width: '27%' }, { head: 'Beds', align: 'right', width: '8%' }, { head: 'Size', align: 'right', width: '13%' }, { head: 'Rent', align: 'right', width: '12%' }, { head: 'PSF', align: 'right', width: '10%' }, { head: 'Layout', align: 'right' }];
      sheets.push({
        key: `${l.id}-history`,
        section: sec('Property history'),
        toc: { group, label: 'Property history' },
        body: (
          <>
            <Title eyebrow={eyebrow('Property history')} title="Property and development history" sub={
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{history.scope === 'development' ? history.scopeLabel : `${history.scopeLabel}, all developments held`} · {history.sample} lodged contracts · {history.period.from} to {history.period.to}</span>
                <DataBadge />
              </span>
            } />
            <Notice title="Unit-level historical transaction data unavailable">
              Lodged rental contracts do not identify individual units, so this page shows {history.scope === 'development' ? 'the whole development' : `District ${dd(l.district)}, because too few contracts are held for the development`}.
              {earlier.length === 0 ? ' No earlier V-RENT listing of this unit was found.' : ''}
            </Notice>
            {earlier.length > 0 && (
              <Section label="Earlier V-RENT listings of this unit" note="Asking figures, not lodged contracts">
                <Table dense
                  cols={[{ head: 'Listed' }, { head: 'Listing type', width: '22%' }, { head: 'Asking', align: 'right', width: '22%' }, { head: 'Status', align: 'right', width: '28%' }]}
                  rows={earlier.slice(0, 4).map((x) => [dayText(x.date), x.deal === 'rent' ? 'For rent' : 'For sale', x.deal === 'rent' ? `${money(x.asking)}/mo` : money(x.asking), STATUS_TEXT[x.status]])} />
              </Section>
            )}
            <Section label="Median rent per sq ft" note={`${history.scopeLabel} · all unit sizes · S$ per sq ft per month`}>
              <LineChart values={history.points.map((pt) => pt.medianPsf)} labels={history.points.map((pt) => pt.label)} counts={history.points.map((pt) => pt.count)}
                reference={{ value: unitRate, label: `This property ${psfText(unitRate)}` }} fmt={psfText} height={176} />
              <Legend items={[
                { label: 'Actual: monthly median of lodged contracts', swatch: 'line', color: C.brand },
                { label: 'Current: this property’s asking rate', swatch: 'dash', color: C.accent },
              ]} />
              <Bullets className="mt-3" items={historyNotes(l, history)} />
            </Section>
            <Section label="Historical timeline" note={`Latest ${Math.min(HISTORY_ROWS, history.sample)} of ${history.sample} contracts, newest first`}>
              <Table dense cols={historyCols} rows={history.rows.slice(0, HISTORY_ROWS).map((r) => [
                <span key="m" style={{ color: C.muted }}>{monthLabel(r.month)}</span>,
                ...(history.scope === 'district' ? [<span key="p" className="font-semibold">{r.project}</span>] : []),
                r.bedrooms,
                sqftText(r.sizeSqft),
                money(r.monthlyRent),
                psfText(r.psf),
                r.bedrooms === l.bedrooms ? <Badge key="b" tone="brand">Same bedrooms</Badge> : <span key="b" style={{ color: C.faint }}>—</span>,
              ])} />
            </Section>
            {illustrative && <Fine>{provider.dataset.note}</Fine>}
          </>
        ),
      });
    }

    /* ---- price position: is the asking rent reasonable? */
    if (market && range && askingRent !== null) {
      const verdictTone = market.verdict === 'below' ? 'positive' : market.verdict === 'above' ? 'warning' : 'neutral';
      sheets.push({
        key: `${l.id}-position`,
        section: sec('Price position'),
        toc: { group, label: 'Price position' },
        body: (
          <>
            <Title eyebrow={eyebrow('Price position')} title="How the asking rent compares" sub={
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{market.basisLabel} · {market.sample} comparable contracts · {period}</span>
                <DataBadge />
              </span>
            } />
            {fallbackNotice}
            <Stats cols={5} lead items={[
              { label: 'Asking rent', value: money(askingRent), sub: 'per month' },
              { label: 'Comparable median', value: money(market.medianRent), sub: 'per month' },
              { label: 'Asking PSF', value: psfText(market.unitPsf), sub: 'per sq ft / month' },
              { label: 'Median PSF', value: psfText(market.medianPsf), sub: 'comparable contracts' },
              { label: 'Difference', value: signedPct(market.deltaPct), sub: 'on rate per sq ft', color: VERDICT_INK[market.verdict] },
            ]} />
            <div className="mt-5">
              <Callout color={VERDICT_INK[market.verdict]} title={RANGE_LABEL[range.place]} aside={(
                <>
                  <Badge tone={verdictTone}>{signedPct(market.deltaPct)} vs median</Badge>
                  {range.place === 'within' && <Badge tone="neutral">{range.band}</Badge>}
                </>
              )}>
                {VERDICT_LABEL[market.verdict]} per sq ft. Within ±4% of the median counts as in line.
              </Callout>
            </div>
            <Section label="Asking rate against comparable contracts" note="S$ per sq ft per month">
              <Benchmark m={market} place={range.place} />
              <Legend items={[
                { label: 'Observed range', swatch: 'band', color: C.hair },
                { label: 'Middle half of contracts', swatch: 'band', color: `${C.brand}3D` },
                { label: 'Median', swatch: 'line', color: C.brandDeep },
                { label: 'This property', swatch: 'dot', color: VERDICT_INK[market.verdict] },
              ]} />
            </Section>
            <Section label="What this means">
              <Bullets items={positionNotes(market, range)} />
            </Section>
            <div className="vr-grid2 grid gap-x-8">
              <MarketBasis m={market} />
              <Section label="Distribution per sq ft">
                <KV rows={[
                  ['Lowest', psfText(market.minPsf)],
                  ['Lower quartile', psfText(market.q1Psf)],
                  ['Median', psfText(market.medianPsf)],
                  ['Upper quartile', psfText(market.q3Psf)],
                  ['Highest', psfText(market.maxPsf)],
                ]} />
              </Section>
            </div>
            <Fine>{CONFIDENCE_NOTE[market.confidence]}{illustrative ? ` ${provider.wording.shortNote}` : ''}</Fine>
          </>
        ),
      });

      /* ---- comparable properties: how does it compare with similar homes? */
      if (full) {
        const shown = market.rows.slice(0, detailed ? DETAILED_COMPARABLES : CLIENT_COMPARABLES);
        sheets.push({
          key: `${l.id}-comparables`,
          section: sec('Comparable properties'),
          toc: { group, label: 'Comparable properties' },
          body: (
            <>
              <Title eyebrow={eyebrow('Comparable properties')} title="How it compares with similar homes"
                sub="Lodged lease contracts for the same kind of home, bedroom count and size band. Closest in size first, then newest." />
              <div className="vr-block mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5" style={{ background: C.brandSoft, borderLeft: `3px solid ${C.brand}` }}>
                <span className="text-[8.5px] font-bold uppercase tracking-[0.12em]" style={{ color: C.brand }}>Comparable basis</span>
                <span className="text-[11px] font-semibold" style={{ color: C.brandDeep }}>{market.basisLabel} · {market.sample} contracts</span>
              </div>
              {fallbackNotice}
              <Section label="Floor area and monthly rent" note="Each dot is one comparable contract" className="mt-0">
                <Scatter points={market.rows.map((r) => ({ x: r.sizeSqft, y: r.monthlyRent }))} unit={{ x: l.sizeSqft, y: askingRent }}
                  color={VERDICT_INK[market.verdict]} height={detailed ? 150 : 176}
                  xFmt={(v) => `${Math.round(v).toLocaleString('en-SG')} sqft`} yFmt={(v) => money(Math.round(v / 50) * 50)} xTitle="Floor area" yTitle="Monthly rent" />
                <Bullets className="mt-2" items={[sizeNote(l, range)]} />
              </Section>
              <Section label="Most relevant contracts" note={`Showing ${shown.length} of ${market.sample}`}>
                <Table dense
                  cols={[{ head: 'Month', width: '12%' }, { head: 'Development', width: '29%' }, { head: 'Match', width: '17%' }, { head: 'Beds', align: 'right', width: '7%' }, { head: 'Size', align: 'right', width: '13%' }, { head: 'Rent', align: 'right', width: '11%' }, { head: 'PSF', align: 'right' }]}
                  rows={shown.map((t) => [
                    <span key="m" style={{ color: C.muted }}>{monthLabel(t.month)}</span>,
                    <span key="p" className="font-semibold">{t.project}</span>,
                    <span key="b" style={{ color: C.muted }}>{matchOf(l, t)}</span>,
                    t.bedrooms,
                    sqftText(t.sizeSqft),
                    money(t.monthlyRent),
                    psfText(t.psf),
                  ])} />
                <Fine>
                  Private condominiums, apartments and executive condominiums only; other kinds of home are never mixed in.
                  {market.sample > shown.length ? (detailed ? ' The remaining contracts are listed in Annex A.' : ' Every contract is listed in the detailed report.') : ''}
                </Fine>
              </Section>
            </>
          ),
        });

        /* ---- market trend: what is the market doing? */
        const latestIndex = market.trend.map((v, k) => (v ? k : -1)).filter((k) => k >= 0).pop();
        const notes = trendNotes(market);
        sheets.push({
          key: `${l.id}-trend`,
          section: sec('Market trend'),
          toc: { group, label: 'Market trend' },
          body: (
            <>
              <Title eyebrow={eyebrow('Market trend')} title="What the rental market is doing" sub={
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Comparable homes · {market.basisLabel}</span>
                  <DataBadge />
                </span>
              } />
              <Stats items={[
                { label: 'Twelve-month median', value: money(market.medianRent), sub: 'actual, lodged contracts' },
                { label: 'Change over period', value: market.changePct === null ? 'n/a' : signedPct(market.changePct), sub: 'actual, latest vs earliest months' },
                { label: 'Latest month', value: latestIndex !== undefined ? money(market.trend[latestIndex]) : 'n/a', sub: latestIndex !== undefined ? `actual, ${market.trendLabels[latestIndex]}` : '' },
                { label: 'Indicative', value: market.outlook.length ? money(market.outlook[market.outlook.length - 1].value) : 'n/a', sub: market.outlook.length ? `${market.outlook[market.outlook.length - 1].label}, not a valuation` : 'too few months' },
              ]} />
              <Section label="Median monthly rent" note="Actual · current · indicative">
                <TrendChart m={market} asking={askingRent} height={detailed ? 176 : 196} />
                <Legend items={[
                  { label: 'Actual: monthly median of lodged contracts', swatch: 'line', color: C.brand },
                  { label: 'Current: asking rent', swatch: 'dash', color: C.accent },
                  { label: 'Indicative trend', swatch: 'hollow', color: C.muted },
                ]} />
                <Bullets className="mt-2.5" items={[notes.direction]} />
              </Section>
              <Section label="Transaction activity" note="Comparable contracts lodged each month">
                <VolumeBars counts={market.trendCounts} labels={market.trendLabels} slots={market.trend.length + market.outlook.length} />
                <Bullets className="mt-2.5" items={[notes.activity]} />
              </Section>
              {detailed && market.outlook.length > 0 && (
                <Section label="Indicative trend">
                  <div className="vr-grid2 grid gap-x-8">
                    <Table dense cols={[{ head: 'Month' }, { head: 'Indicative median', align: 'right' }]} rows={market.outlook.map((o) => [o.label, money(o.value)])} />
                    <Body className="text-[9.5px]">A straight-line fit through the actual monthly medians, extended three months and rounded to S$50. It shows direction only.</Body>
                  </div>
                </Section>
              )}
              <Fine>Indicative trend based on historical lodged contracts. Not a valuation or a guaranteed future rent.</Fine>
            </>
          ),
        });
      }
    }

    /* ---- development insights */
    const mix = dev && history && history.scope === 'development' && deal === 'rent' ? bedroomMix(history) : [];
    const devNotes = dev ? developmentNotes(l, dev, c.history, TODAY) : [];
    /* Without contract activity a development page is a single sentence, and
       the glance sheet already shows the tenure and completion it would repeat. */
    if (full && dev && (mix.length > 0 || devNotes.length >= 2)) {
      const age = TODAY.getFullYear() - dev.built;
      sheets.push({
        key: `${l.id}-development`,
        section: sec('Development'),
        toc: { group, label: 'Development insights' },
        body: (
          <>
            <Title eyebrow={eyebrow('Development insights')} title={dev.name} sub={`${dev.street} · District ${dd(dev.district)}, ${areaName(dev.district)}`} />
            <Stats items={[
              { label: 'Completed', value: String(dev.built), sub: age > 0 ? `about ${age} year${age === 1 ? '' : 's'} ago` : 'this year' },
              { label: 'Tenure', value: dev.tenure === 'Freehold' ? 'Freehold' : '99-year', sub: dev.tenure === 'Freehold' ? undefined : 'leasehold' },
              { label: 'Total units', value: dev.units.toLocaleString('en-SG') },
              { label: 'Property type', value: l.propertyType },
            ]} />
            <Section label="What stands out">
              <Bullets items={developmentNotes(l, dev, c.history, TODAY)} />
            </Section>
            {mix.length > 0 && history && (
              <Section label="Leased here by bedroom count" note={`Actual lodged contracts · ${history.period.from} to ${history.period.to}`}>
                <Table
                  cols={[{ head: 'Layout' }, { head: 'Contracts', align: 'right', width: '15%' }, { head: 'Median size', align: 'right', width: '18%' }, { head: 'Median rent', align: 'right', width: '18%' }, { head: 'Median PSF', align: 'right', width: '15%' }]}
                  rows={mix.map((r) => [
                    <span key="b" className="font-semibold">{r.bedrooms} bedroom{r.bedrooms === 1 ? '' : 's'}{r.bedrooms === l.bedrooms ? <span className="font-normal" style={{ color: C.brand }}> · this layout</span> : null}</span>,
                    r.count,
                    sqftText(r.medianSize),
                    money(r.medianRent),
                    psfText(r.medianPsf),
                  ])}
                  highlight={(k) => mix[k].bedrooms === l.bedrooms} />
              </Section>
            )}
            <Fine>
              {provider.wording.developmentNote}
              {mix.length > 0 && illustrative ? ` Contract figures come from the ${provider.dataset.name.toLowerCase()}.` : ''}
            </Fine>
          </>
        ),
      });
    }

    /* ---- location and connectivity: what makes this location work? */
    const stationsNear = e.mrt.items.filter((s) => s.metres <= 1000);
    const schoolItems = e.schools.items.filter((s) => isPrimary(s) || isSecondary(s));
    const daily = DAILY.map((d) => ({ ...d, ev: e.amenity(d.key) }));
    const dailyOk = daily.filter((d) => d.ev.state === 'verified');
    const dailyRows = dailyOk.flatMap((d) => d.ev.items.map((a) => ({ name: plainName(a.name), detail: d.label, metres: a.metres }))).sort((a, b) => a.metres - b.metres);
    const dailyValue = !e.isLocated
      ? EVIDENCE_TEXT.unverified
      : dailyOk.length === 0
        ? EVIDENCE_TEXT.unavailable
        : dailyOk.length < daily.length
          ? (dailyRows.length ? `${dailyRows.length}+` : EVIDENCE_TEXT.partial)
          : `${dailyRows.length}${dailyOk.some((d) => d.ev.items.length >= 12) ? '+' : ''}`;
    const figure = (v: string) => (/^\d/.test(v) ? v : <span className="text-[12px] font-normal italic" style={{ color: C.warn, fontFamily: SANS }}>{v}</span>);
    const groupList = (ev: Evidence<unknown>, rows: { name: string; detail?: string; metres: number }[], none: string) => (
      ev.state === 'unavailable' || ev.state === 'unverified' ? <Unknown>{EVIDENCE_TEXT[ev.state]}</Unknown>
        : rows.length ? <PlaceRows rows={rows.slice(0, 3)} />
          : ev.state === 'verified' ? <None>{none}</None> : <Unknown>{EVIDENCE_TEXT.partial}</Unknown>
    );
    const nearestRow = <T extends { name: string; metres: number }>(label: string, ev: Evidence<T>, none: string): NearestRow => {
      const r = nearestText(ev, none);
      if (r.kind === 'item') return { label, name: plainName(r.item.name), metres: r.item.metres };
      return { label, fallback: r.kind === 'none' ? <None>{r.text}</None> : <Unknown>{r.text}</Unknown> };
    };
    const dates = [e.mrt, e.schools, e.health, e.amenity('hawker')].map((x) => x.retrievedAt).filter(Boolean).sort() as string[];
    sheets.push({
      key: `${l.id}-location`,
      section: sec('Location and connectivity'),
      toc: { group, label: 'Location and connectivity' },
      body: (
        <>
          <Title eyebrow={eyebrow('Location')} title="Location and connectivity" sub="What is within reach. Straight-line distances from the matched address; walking times are estimates." />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 print:grid-cols-2">
            {mapSrc ? (
              <figure className="vr-block">
                {/* eslint-disable-next-line @next/next/no-img-element -- proxied from OneMap, must print */}
                <img src={mapSrc} alt={`Map showing ${l.project}`} className="aspect-square w-full object-cover" style={{ border: `1px solid ${C.rule}` }} />
                <figcaption className="mt-1 text-[8.5px]" style={{ color: C.faint }}>Map: OneMap, Singapore Land Authority</figcaption>
              </figure>
            ) : (
              <Notice tone="warn" title="Location not verified">The address has not been matched to a map position, so no map or distances can be shown.</Notice>
            )}
            <div className="min-w-0">
              <Eyebrow color={C.faint}>Nearest to the property</Eyebrow>
              <div className="mt-1.5">
                <NearestRows rows={[
                  nearestRow('MRT / LRT station', e.mrt, 'None within 2 km'),
                  nearestRow('Primary school', e.primaries, 'None within 2 km'),
                  nearestRow('Secondary school', e.secondaries, 'None within 2 km'),
                  nearestRow('Polyclinic', e.polyclinics, 'None within 5 km'),
                  nearestRow('Hospital', e.hospitals, 'None within 5 km'),
                  nearestRow('Hawker centre', e.amenity('hawker'), 'None within 1 km'),
                  nearestRow('Park', e.amenity('parks'), 'None within 1 km'),
                ]} />
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2">
            <GroupCard label="Transport" value={figure(countText(e.mrt, stationsNear.length))} caption="MRT / LRT stations within 1 km">
              {groupList(e.mrt, e.mrt.items, 'No station within 2 km')}
            </GroupCard>
            <GroupCard label="Education" value={figure(countText(e.schools, schoolItems.filter((s) => s.metres <= 1000).length))} caption="primary and secondary schools within 1 km">
              {groupList(e.schools, schoolItems.map((s) => ({ name: s.name, detail: s.detail, metres: s.metres })), 'No school within 2 km')}
            </GroupCard>
            <GroupCard label="Healthcare" value={figure(countText(e.health, e.health.items.length))} caption="hospitals and polyclinics within 5 km">
              {groupList(e.health, e.health.items.map((h) => ({ name: plainName(h.name), detail: h.detail, metres: h.metres })), 'None within 5 km')}
            </GroupCard>
            <GroupCard label="Daily needs" value={figure(dailyValue)} caption="hawker centres, parks, sport, libraries, CCs within 1 km">
              {!e.isLocated ? <Unknown>{EVIDENCE_TEXT.unverified}</Unknown>
                : dailyOk.length === 0 ? <Unknown>{EVIDENCE_TEXT.unavailable}</Unknown>
                  : dailyRows.length ? <PlaceRows rows={dailyRows.slice(0, 3)} /> : <None>None within 1 km</None>}
            </GroupCard>
          </div>
          <Fine>
            Confirm school eligibility and registration priority with the MOE school finder.
            {dates.length ? ` ${provider.wording.retrieved(dayText(dates[dates.length - 1]))}; a dataset that did not answer is marked, never shown as none.` : ' A dataset that did not answer is marked, never shown as none.'}
          </Fine>
        </>
      ),
    });

    /* ---- neighbourhood detail (detailed) */
    if (detailed) {
      const schoolCols: Col[] = [{ head: 'School' }, { head: 'Level', width: '19%' }, { head: 'Band', width: '13%' }, { head: 'Distance', align: 'right', width: '11%' }, { head: 'Walk', align: 'right', width: '14%' }];
      const schoolTable = (ev: Evidence<Place>, limit: number, none: string) => (
        e.schools.state === 'unavailable' || e.schools.state === 'unverified' ? <Unknown>{EVIDENCE_TEXT[e.schools.state]}</Unknown>
          : ev.items.length ? (
            <Table dense cols={schoolCols} highlight={(k) => k === 0} rows={ev.items.slice(0, limit).map((s) => [
              <span key="n" className="font-semibold">{s.name}</span>,
              <span key="l" style={{ color: C.muted }}>{s.detail}</span>,
              <span key="b" style={{ color: C.muted }}>{s.metres <= 1000 ? 'Within 1 km' : '1–2 km'}</span>,
              distance(s.metres),
              <span key="w" style={{ color: C.muted }}>{walk(s.metres)}</span>,
            ])} />
          ) : ev.state === 'verified' ? <None>{none}</None> : <Unknown>{EVIDENCE_TEXT.partial}</Unknown>
      );
      const dailyRetrieved = e.amenity('hawker').retrievedAt;
      sheets.push({
        key: `${l.id}-neighbourhood`,
        section: sec('Neighbourhood detail'),
        toc: { group, label: 'Schools, healthcare and daily needs' },
        body: (
          <>
            <Title eyebrow={eyebrow('Neighbourhood detail')} title="Schools, healthcare and daily needs" sub="Schools within 2 km · healthcare within 5 km · daily needs within 1 km · places to visit within 8 km · straight-line distances" />
            <Section label="Primary schools" className="mt-0" note={e.schools.state === 'verified' ? `${provider.credit('MOE via data.gov.sg')}, ${retrieved(e.schools)}` : undefined}>
              {schoolTable(e.primaries, 5, 'No primary school within 2 km.')}
            </Section>
            <Section label="Secondary schools and junior colleges">
              {schoolTable(e.secondaries, 3, 'No secondary school or junior college within 2 km.')}
            </Section>
            {e.schools.state === 'partial' && <Fine>{e.schools.note}</Fine>}
            <Section label="Healthcare" note={e.health.state === 'verified' ? `${provider.credit('MOH via OneMap')}, ${retrieved(e.health)}` : undefined}>
              {e.health.state === 'unavailable' || e.health.state === 'unverified' ? stateNote(e.health, 'Healthcare') : e.health.items.length ? (
                <Table dense cols={[{ head: 'Name' }, { head: 'Type', width: '16%' }, { head: 'Distance', align: 'right', width: '12%' }]}
                  rows={e.health.items.slice(0, 3).map((h) => [<span key="n" className="font-semibold">{plainName(h.name)}</span>, <span key="t" style={{ color: C.muted }}>{h.detail}</span>, distance(h.metres)])} />
              ) : e.health.state === 'verified' ? <None>No hospital or polyclinic within 5 km.</None> : <Unknown>{EVIDENCE_TEXT.partial}</Unknown>}
            </Section>
            <Section label="Daily needs" note={dailyRetrieved ? `${provider.credit('Via OneMap')}, retrieved ${dayText(dailyRetrieved)}` : undefined}>
              {!e.isLocated ? stateNote(e.amenity('hawker'), 'Daily needs') : (
                <Table dense
                  cols={[{ head: 'Facility', width: '19%' }, { head: 'Nearest' }, { head: 'Distance', align: 'right', width: '11%' }, { head: 'Walk', align: 'right', width: '14%' }, { head: 'In 1 km', align: 'right', width: '10%' }]}
                  rows={daily.map((d) => {
                    const first = d.ev.items[0];
                    return [
                      <span key="l" style={{ color: C.muted }}>{d.label}</span>,
                      first ? <span key="n" className="font-semibold">{plainName(first.name)}</span> : d.ev.state === 'verified' ? <None key="n">{d.none}</None> : <Unknown key="n">{EVIDENCE_TEXT[d.ev.state as 'unavailable']}</Unknown>,
                      first ? distance(first.metres) : '',
                      first ? <span key="w" style={{ color: C.muted }}>{walk(first.metres)}</span> : '',
                      d.ev.state === 'verified' ? `${d.ev.items.length}${d.ev.items.length >= 12 ? '+' : ''}` : '—',
                    ];
                  })}
                />
              )}
            </Section>
            <Section label="Places to visit" note={e.visits.state === 'verified' ? `${provider.credit('STB and NHB via OneMap')}, ${retrieved(e.visits)}` : undefined}>
              {e.visits.state === 'unavailable' || e.visits.state === 'unverified' ? stateNote(e.visits, 'Places to visit') : e.visits.items.length ? (
                <Table dense cols={[{ head: 'Name' }, { head: 'Type', width: '16%' }, { head: 'Distance', align: 'right', width: '12%' }]}
                  rows={e.visits.items.slice(0, 2).map((v) => [<span key="n" className="font-semibold">{plainName(v.name)}</span>, <span key="t" style={{ color: C.muted }}>{v.detail}</span>, distance(v.metres)])} />
              ) : e.visits.state === 'verified' ? <None>No listed attraction within 8 km.</None> : <Unknown>{EVIDENCE_TEXT.partial}</Unknown>}
            </Section>
          </>
        ),
      });
    }

    /* ---- competing listings: what else is the client weighing? */
    if (full && comp && comp.items.length > 0) {
      const enough = comp.medianPsf !== null && comp.deltaPct !== null;
      const shownC = comp.items.slice(0, 10);
      const diffInk = comp.deltaPct === null ? undefined : comp.deltaPct >= 4 ? C.above : comp.deltaPct <= -4 ? C.below : C.inline;
      sheets.push({
        key: `${l.id}-competing`,
        section: sec('Competing listings'),
        toc: { group, label: 'Competing listings' },
        body: (
          <>
            <Title eyebrow={eyebrow('Competing listings')} title="What else is on the market" sub={`${comp.basisLabel} · ${provider.activeSource} on ${dayText(comp.retrievedAt)}`} />
            <Stats items={[
              { label: 'This property', value: comp.unitPsf === null ? '—' : psfValue(comp.unitPsf), sub: deal === 'rent' ? 'asking per sq ft / month' : 'asking per sq ft' },
              { label: 'Comparable listings', value: String(comp.sample), sub: provider.activeSource },
              { label: 'Median asking', value: enough ? psfValue(comp.medianPsf!) : 'Too few', sub: enough ? 'per sq ft' : `${MIN_ACTIVE} or more needed` },
              { label: 'Difference', value: enough ? signedPct(comp.deltaPct!) : '—', sub: enough ? 'on asking per sq ft' : 'not calculated', color: diffInk },
            ]} />
            <div className="mt-5">
              <Callout title={competingStatement(comp)} color={enough ? diffInk : C.slate} />
            </div>
            <Section label="Comparable active listings" note={`Showing ${shownC.length} of ${comp.sample}`}>
              <Table dense
                cols={[{ head: 'Development', width: '30%' }, { head: 'Match', width: '16%' }, { head: 'Beds', align: 'right', width: '7%' }, { head: 'Size', align: 'right', width: '13%' }, { head: 'Asking', align: 'right', width: '14%' }, { head: 'PSF', align: 'right', width: '10%' }, { head: 'Live', align: 'right' }]}
                rows={shownC.map((x) => [
                  <span key="p" className="font-semibold">{x.project}</span>,
                  <span key="m" style={{ color: C.muted }}>{x.match}</span>,
                  x.bedrooms,
                  sqftText(x.sizeSqft),
                  deal === 'rent' ? `${money(x.price)}/mo` : money(x.price),
                  psfValue(x.psf),
                  <span key="d" style={{ color: C.muted }}>{x.daysListed === null ? '—' : `${x.daysListed} day${x.daysListed === 1 ? '' : 's'}`}</span>,
                ])} />
            </Section>
            {competingNotes(comp).length > 0 && (
              <Section label="What this means">
                <Bullets items={competingNotes(comp)} />
              </Section>
            )}
            <Fine>{provider.wording.activeNote(deal)}</Fine>
          </>
        ),
      });
    }

    /* ---- client decision summary */
    const summary = decisionSummary(insight);
    const positionInk = summary.position.tone === 'none' ? C.slate : VERDICT_INK[summary.position.tone];
    const evidenceBadge = (ev: Evidence<unknown>) => (ev.state === 'verified'
      ? <Badge key="b" tone="positive">{provider.wording.verified}</Badge>
      : <Badge key="b" tone="warning">{EVIDENCE_TEXT[ev.state]}</Badge>);
    const evidenceDetail = (ev: Evidence<unknown>, source: string) => (ev.state === 'verified' || ev.state === 'partial'
      ? `${source}${ev.retrievedAt ? `, retrieved ${dayText(ev.retrievedAt)}` : ''}${ev.state === 'partial' ? ' · list may be incomplete' : ''}`
      : ev.state === 'unverified' ? 'Address has no map position' : 'Dataset did not answer');
    const confidence: React.ReactNode[][] = [];
    const conf = (label: string, badge: React.ReactNode, detail: string) => confidence.push([
      <span key="l" className="font-semibold">{label}</span>, badge, <span key="d" style={{ color: C.muted }}>{detail}</span>,
    ]);
    if (deal === 'sale') {
      conf('Sale transactions', <Badge key="b" tone="warning">Data unavailable</Badge>, 'Sale transaction evidence is not held on the platform');
    } else if (market) {
      conf('Comparable contracts', market.sample < MIN_SAMPLE ? <Badge key="b" tone="warning">Insufficient sample</Badge> : <Badge key="b" tone="brand">Indicative</Badge>,
        `${market.sample} contracts · ${BASIS_NAME[market.basis]}${market.local ? '' : ', local sample insufficient'} · ${period}`);
    } else if (c.market.status === 'unavailable') {
      conf('Comparable contracts', <Badge key="b" tone="warning">{c.market.reason === 'no_contracts' ? 'Insufficient sample' : 'Data unavailable'}</Badge>,
        { category: 'Not held for this kind of home', no_contracts: 'Too few similar contracts', no_rent: 'No asking rent recorded', no_size: 'No floor area recorded', sale: '' }[c.market.reason]);
    }
    if (market || history) {
      conf('Market dataset', <Badge key="b" tone={illustrative ? 'neutral' : 'positive'}>{provider.wording.datasetBadge}</Badge>, provider.wording.datasetDetail);
    }
    if (market) conf('Rental trend', <Badge key="b" tone="brand">{market.outlook.length ? 'Actual + indicative' : 'Actual'}</Badge>, `Monthly medians, ${period}`);
    conf('Unit-level history', <Badge key="b" tone="warning">Data unavailable</Badge>, history ? `Not held · ${history.scope} history shown instead` : 'Not held');
    const rawComp = competing[l.id];
    conf('Active listings',
      comp ? (comp.medianPsf !== null ? <Badge key="b" tone="positive">Available</Badge> : <Badge key="b" tone="warning">Insufficient sample</Badge>) : <Badge key="b" tone="warning">Data unavailable</Badge>,
      comp ? `${comp.sample === 0 ? 'No' : comp.sample} comparable · ${provider.activeSource}, ${dayText(comp.retrievedAt)}` : rawComp === undefined ? 'Search did not finish' : 'Search did not answer');
    conf('Transport', evidenceBadge(e.mrt), evidenceDetail(e.mrt, provider.credit('LTA station exits')));
    conf('Schools', evidenceBadge(e.schools), evidenceDetail(e.schools, provider.credit('MOE school directory')));
    conf('Healthcare', evidenceBadge(e.health), evidenceDetail(e.health, provider.credit('MOH via OneMap')));
    conf('Daily needs', evidenceBadge(e.amenity('hawker')), evidenceDetail(e.amenity('hawker'), provider.credit('SFA, NParks and others via OneMap')));

    sheets.push({
      key: `${l.id}-summary`,
      section: sec('Decision summary'),
      toc: { group, label: 'Client decision summary' },
      body: (
        <>
          <Title eyebrow={eyebrow('Decision summary')} title="Client decision summary" sub={`${name} · ${askingRent !== null ? `${money(askingRent)} a month` : money(salePrice ?? 0)}`} />
          <div className="vr-grid2 grid gap-x-8">
            <Section label="Why it stands out" className="mt-0"><Bullets tone="positive" items={summary.standsOut} /></Section>
            <Section label="What to consider" className="mt-6 sm:mt-0 print:mt-0"><Bullets tone="attention" items={summary.consider} /></Section>
          </div>
          <Section label="Market position">
            <Callout title={summary.position.headline} color={positionInk}>{summary.position.detail}</Callout>
          </Section>
          <Section label="Data confidence">
            <Table dense cols={[{ head: 'Evidence', width: '24%' }, { head: 'Status', width: '22%' }, { head: 'Detail' }]} rows={confidence} />
          </Section>
          <Section label="Bottom line">
            <Body>{summary.bottomLine}</Body>
          </Section>
          <div className="vr-block mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-4 py-3" style={{ background: C.wash, borderTop: `2px solid ${C.brandDeep}` }}>
            <div className="min-w-0">
              <div className="text-[12.5px] font-bold" style={{ fontFamily: DISPLAY }}>{p.fullName}</div>
              <div className="truncate text-[9.5px]" style={{ color: C.muted }}>{p.agency}{licence ? ` · Licence ${licence}` : ''} · CEA {p.ceaNumber}</div>
            </div>
            <div className="text-right text-[9.5px] leading-[1.6]" style={{ color: C.text }}>
              {p.mobile && <div>{p.mobile}</div>}
              {p.email && <div>{p.email}</div>}
            </div>
          </div>
          <Fine>This summary describes the data held when the report was prepared. It is not a valuation, financial advice or a forecast of {deal === 'rent' ? 'rents' : 'prices'}.</Fine>
        </>
      ),
    });
  });

  /* ---------------------------------------------- annex A (detailed) */
  if (detailed) {
    checks.forEach((c, i) => {
      const m = c.market.status === 'ok' ? c.market : null;
      if (!m || m.sample <= DETAILED_COMPARABLES) return;
      const rest = m.rows.slice(DETAILED_COMPARABLES);
      const pages: typeof rest[] = [];
      for (let k = 0; k < rest.length && pages.length < ANNEX_MAX_PAGES; k += ANNEX_ROWS) pages.push(rest.slice(k, k + ANNEX_ROWS));
      const shown = pages.reduce((n, pg) => n + pg.length, 0);
      pages.forEach((rows, k) => {
        sheets.push({
          key: `annex-${c.property.listing.id}-${k}`,
          section: `Annex A · ${dd(i + 1)} ${c.property.listing.project}`,
          toc: k === 0 ? { label: `Annex A · Contracts for ${nameOf(c.property.listing)}` } : undefined,
          body: (
            <>
              <Title eyebrow="Annex A · Lease evidence" title={k === 0 ? `Contracts used for ${c.property.listing.project}` : 'Contracts used, continued'}
                sub={`${m.basisLabel}. Contracts ${DETAILED_COMPARABLES + 1 + k * ANNEX_ROWS} to ${DETAILED_COMPARABLES + k * ANNEX_ROWS + rows.length} of ${m.sample}.`} />
              <Table dense
                cols={[{ head: 'Property', width: '28%' }, { head: 'Street', width: '22%' }, { head: 'Dist', width: '7%' }, { head: 'Size', align: 'right', width: '12%' }, { head: 'Rent', align: 'right', width: '11%' }, { head: 'PSF', align: 'right', width: '9%' }, { head: 'Month', align: 'right' }]}
                rows={rows.map((t) => [<span key="p" className="font-semibold">{t.project}</span>, <span key="s" style={{ color: C.muted }}>{t.street}</span>, `D${dd(t.district)}`, sqftText(t.sizeSqft), money(t.monthlyRent), psfText(t.psf), monthLabel(t.month)])}
              />
              {k === pages.length - 1 && shown < rest.length && <Fine>{rest.length - shown} further contracts are held and available from the agent on request.</Fine>}
            </>
          ),
        });
      });
    });

    sheets.push({
      key: 'method',
      section: 'How we calculate',
      toc: { label: 'How we calculate' },
      body: (
        <>
          <Title eyebrow="Method" title="How we calculate" sub="Every figure in this report follows one of these rules. Nothing is estimated by hand." />
          <ol className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 print:grid-cols-2">
            {[
              ['Market median', 'The middle value of the comparable contracts. The median rent is the middle monthly rent; the median rate is the middle of each contract’s rent divided by its floor area. A median, not an average, so one unusual lease does not move it.'],
              ['Rent per sq ft', 'Monthly rent divided by floor area in square feet. The market position compares rates rather than rents, because homes of different sizes let at similar rates but very different rents. Within ±4% of the median is described as in line.'],
              ['Comparable selection', `Contracts with the same bedroom count, a floor area within 20% of the property (rounded to 50 sq ft) and the same kind of home, from the last twelve complete months. The narrowest area with at least ${10} contracts is used: same development, same street, same district, nearby districts, then Singapore-wide. The basis used is printed with every figure.`],
              ['Range position', 'Where the asking rate falls against the lowest and highest comparable contracts, the middle half between the quartiles, and the share of contracts at a lower rate.'],
              ['Trend and history', 'Change over period is the average of the latest four monthly medians against the earliest four. Development history uses every contract in the development, all sizes, and falls back to the district when fewer than six are held.'],
              ['Competing listings', `Listings live on V-RENT with the same listing type, kind of home, bedroom count and size band. A median is given only when at least ${MIN_ACTIVE} are found.`],
              ['Indicative trend', 'A least-squares straight line through the actual monthly medians, extended three months and rounded to S$50. Shown only when at least six months have contracts. It indicates direction and is not a valuation.'],
              ['Distance', 'Straight-line distance from the point the address was matched to. Stations are measured to their nearest exit. Walking time assumes 80 m a minute over that distance and is not route-based.'],
              ['Evidence status', '“None within” is printed only when a dataset answered and had no match. “Data unavailable” means the dataset did not answer. “Unable to verify” means the address has no map position or a list came back incomplete.'],
              ['Checks before printing', 'Each property’s listing type must match its price, the district must match the postal code, and every market figure is recalculated from its contracts. A report with a failed check is not generated.'],
            ].map(([k, v], n) => (
              <li key={k} className="vr-block grid grid-cols-[34px_minmax(0,1fr)] gap-2 py-3" style={{ borderBottom: `1px solid ${C.hair}` }}>
                <span className="text-[15px] font-bold tabular-nums" style={{ fontFamily: DISPLAY, color: C.accent }}>{dd(n + 1)}</span>
                <div>
                  <div className="text-[11px] font-bold" style={{ color: C.ink }}>{k}</div>
                  <p className="mt-1 text-[9.5px] leading-[1.6]" style={{ color: C.text }}>{v}</p>
                </div>
              </li>
            ))}
          </ol>
        </>
      ),
    });
  }

  /* ---------------------------------------------- sources and notice */
  const anyLocated = located.length > 0;
  const kindStatus = (kind: PlaceKind) => {
    const evs = chosen.filter((l) => isInSingapore(l.lat, l.lng)).map((l) => placeEvidence(places[l.id]?.[kind], true, kind));
    const got = evs.filter((x) => x.state === 'verified' || x.state === 'partial');
    const dates = got.map((x) => x.retrievedAt).filter(Boolean).sort() as string[];
    return got.length ? `Retrieved ${dayText(dates[dates.length - 1] ?? TODAY)}` : 'Not available when prepared';
  };
  const amenityStatus = (() => {
    const got = located.map((l) => around[l.id]).filter(Boolean) as Around[];
    const dates = got.map((a) => a.retrievedAt).filter(Boolean).sort() as string[];
    return got.length ? `Retrieved ${dayText(dates[dates.length - 1] ?? TODAY)}` : 'Not available when prepared';
  })();
  const hasPhotos = chosen.some((l) => provider.photos(user?.id, l).length > 0);
  const anyMarket = checks.some((c) => c.market.status === 'ok');
  const anyDevelopment = chosen.some((l) => provider.development(l));
  const anyCompeting = chosen.some((l) => competingFor(l));

  const publicRows: [string, string, string, string][] = anyLocated ? [
    ['Maps and address matching', 'Singapore Land Authority, OneMap', 'Maps, all distances', `Retrieved ${dayText(TODAY)}`],
    ['MRT and LRT station exits', provider.credit('Land Transport Authority, data.gov.sg'), 'Transport', kindStatus('mrt')],
    ['School directory', provider.credit('Ministry of Education, data.gov.sg'), 'Schools', kindStatus('schools')],
    ['Hospitals and polyclinics', provider.credit('Ministry of Health, OneMap'), 'Healthcare', kindStatus('healthcare')],
    ['Hawker centres, parks and daily needs', provider.credit('SFA, NParks and others, OneMap'), 'Daily needs', amenityStatus],
    ...(detailed ? [['Attractions and museums', provider.credit('STB and NHB, OneMap'), 'Places to visit', kindStatus('attractions')]] as [string, string, string, string][] : []),
  ] : [];

  if (detailed) sheets.push({
    key: 'sources',
    section: 'Sources and important notice',
    toc: { label: 'Sources and important notice' },
    body: (
      <>
        <Title eyebrow="Sources" title="Sources and important notice" sub={`Prepared ${preparedOn}. Sources are listed only where this report used them.`} />
        <Section label="Agent-provided" className="mt-0">
          <KV labelWidth="34%" rows={[
            ['Property particulars', `Supplied by ${p.fullName}, ${p.agency}`],
            ['Listing descriptions', 'Written by the agent'],
            ...(hasPhotos ? [['Photographs', 'Supplied by the agent']] as [string, string][] : []),
          ]} />
        </Section>
        {publicRows.length > 0 && (
          <Section label="Public datasets">
            <Table dense
              cols={[{ head: 'Data', width: '32%' }, { head: 'Publisher', width: '29%' }, { head: 'Used for', width: '17%' }, { head: 'Status', align: 'right' }]}
              rows={publicRows.map(([d, pub, use, st]) => [
                <span key="d" className="font-semibold">{d}</span>, <span key="p" style={{ color: C.muted }}>{pub}</span>, <span key="u" style={{ color: C.muted }}>{use}</span>,
                st.startsWith('Not') ? <Badge key="s" tone="warning">Not available</Badge> : <Badge key="s" tone="positive">{st}</Badge>,
              ])}
            />
          </Section>
        )}
        {anyMarket && (
          <Section label="Market data">
            <KV wrap labelWidth="34%" rows={[
              ['Lease contracts', provider.dataset.name],
              ['Compiled by', provider.dataset.publisher],
              ['Coverage', provider.dataset.coverage],
            ]} />
            {!provider.dataset.live && <Fine>{provider.dataset.note}</Fine>}
          </Section>
        )}
        {(anyDevelopment || anyCompeting) && (
          <Section label="Platform data">
            <KV wrap labelWidth="34%" rows={[
              ...(anyDevelopment ? [['Development facts', `${provider.credit('V-RENT development reference')}: completion year, tenure and unit count`]] as [string, string][] : []),
              ...(anyCompeting ? [['Active listings', provider.wording.activeRow(dayText(TODAY))]] as [string, string][] : []),
            ]} />
          </Section>
        )}
        <Section label="Important notice">
          <div className="grid gap-2 text-[9.5px] leading-[1.65]" style={{ color: C.text }}>
            {provider.notice && <p><strong style={{ color: C.warn }}>{provider.notice}.</strong> {provider.dataset.note}</p>}
            <p>Prepared by {p.fullName} (CEA {p.ceaNumber}), {p.agency}, for the named recipient. Not a valuation, survey or offer, and not part of any agreement.</p>
            <p>Particulars supplied by the agent, correct on {preparedOn}. Indicative trends are not forecasts. Public datasets may be incomplete.</p>
            <p>Confirm any detail that matters to you, including school eligibility, before committing.</p>
            {!detailed && <p>A detailed edition with the method and every comparable contract is available from your agent.</p>}
          </div>
        </Section>
      </>
    ),
  });

  /* ================================================================ numbering */

  type TocBlock = { label: string; index: number; items: { label: string; index: number }[] | null };
  const blocks: TocBlock[] = [];
  sheets.forEach((sheet, index) => {
    if (!sheet.toc) return;
    const last = blocks[blocks.length - 1];
    if (sheet.toc.group) {
      if (last?.items && last.label === sheet.toc.group) last.items.push({ label: sheet.toc.label, index });
      else blocks.push({ label: sheet.toc.group, index, items: [{ label: sheet.toc.label, index }] });
    } else blocks.push({ label: sheet.toc.label, index, items: null });
  });

  const contentsPages = detailed ? 1 : 0;
  const bodyStart = 2 + contentsPages;
  const TOTAL = 1 + contentsPages + sheets.length;
  const pageOf = (index: number) => bodyStart + index;
  const frame = { total: TOTAL, brandLine, preparedOn, agentLine, notice: provider.notice };
  const pageCount = detailed ? TOTAL : layout?.pages ?? null;
  const overflowPages = detailed ? [] : layout?.overflow ?? [];
  const laidOut = ready && (detailed || layout !== null);

  /* ================================================================ render */

  return (
    <div className="p1 min-h-screen bg-p1-bg">
      {!ready && !blocked && <Preparing steps={steps} elapsed={elapsed} count={chosen.length} />}

      <div className="no-print sticky top-0 z-10 border-b border-p1-border bg-p1-surface">
        <div className="mx-auto flex min-h-14 w-full max-w-[860px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2">
          <Link href="/phase1/shortlists" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-p1-text-2 hover:text-p1-text">
            <ArrowLeft size={15} aria-hidden /> Back
          </Link>
          <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-p1-border bg-p1-subtle p-0.5 text-[13px]" role="group" aria-label="Report edition">
            {(['client', 'detailed'] as Mode[]).map((m) => (
              <Link key={m} href={modeHref(m)} replace aria-current={mode === m ? 'page' : undefined}
                className={cx('rounded-full px-3 py-1.5 font-medium transition-colors', mode === m ? 'bg-p1-surface text-p1-text shadow-p1-sm' : 'text-p1-text-2 hover:text-p1-text')}>
                {m === 'client' ? 'Client report' : 'Detailed report'}
              </Link>
            ))}
          </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
            {provider.notice && <DemoBadge title={provider.notice} />}
            {!blocked && pageCount !== null && (
              <span className="text-[13px] text-p1-text-3">
                {pageCount} page{pageCount === 1 ? '' : 's'}{ready && preparedIn !== null ? ` · ${(preparedIn / 1000).toFixed(1)}s` : ''}
              </span>
            )}
            {!blocked && ready && overflowPages.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[13px] text-p1-danger" title="Content on this page is cut off when printed">
                <TriangleAlert size={14} aria-hidden /> Page {overflowPages.join(', ')} too long
              </span>
            )}
            {!blocked && ready && unavailableSources > 0 && (
              <span className="inline-flex items-center gap-1 text-[13px] text-p1-warning" title="Shown in the report as data unavailable">
                <TriangleAlert size={14} aria-hidden /> {unavailableSources} source{unavailableSources === 1 ? '' : 's'} unavailable
              </span>
            )}
            {absent > 0 && <span className="text-[13px] text-p1-text-3">{absent} listing{absent === 1 ? '' : 's'} no longer available</span>}
            <Button leftIcon={<Printer size={16} />} disabled={blocked || !laidOut} onClick={() => window.print()}>
              {blocked ? 'Resolve issues to print' : laidOut ? 'Save as PDF' : 'Preparing…'}
            </Button>
          </div>
        </div>
      </div>

      {blocked ? <Blocked checks={checks} /> : (
        <div className="mx-auto w-full max-w-[1180px] overflow-x-auto px-0 py-6 sm:px-4 print:max-w-none print:overflow-visible print:p-0">
          <article className="vr-doc space-y-4 print:space-y-0" style={{ color: C.ink, fontFamily: SANS }}>
            {clientMeta && <ClientEdition properties={clientProperties} meta={clientMeta} onLayout={onLayout} />}
            {detailed && <Cover
              checks={checks} photoFor={(l) => provider.photos(user?.id, l).filter((s) => !broken.has(s))[0]} onBroken={markBroken} notice={provider.notice}
              forClient={forClient} brandLine={brandLine} preparedOn={preparedOn} agentLine={agentLine} total={TOTAL}
              agent={{ name: p.fullName, agency: p.agency, mobile: p.mobile, email: p.email, cea: p.ceaNumber, licence }}
              rents={rents} districts={districts} detailed={detailed}
              summary={checks.length === 1 ? coverSummary(checks[0]) : []}
              positioning={checks.length === 1 ? positioning(insightFor(checks[0], evidenceFor(checks[0].property.listing), competingFor(checks[0].property.listing))) : ''}
            />}

            {detailed && (
              <Sheet n={2} section="Contents" {...frame}>
                <Title eyebrow="Detailed report" title="Contents" />
                <div>
                  {blocks.map((block) => (block.items ? (
                    <div key={`g-${block.index}`} className="vr-block pt-3">
                      <div className="flex items-baseline gap-3 pb-1 text-[11.5px] font-bold" style={{ borderBottom: `1px solid ${C.rule}` }}>
                        <span className="min-w-0 flex-1 truncate">{block.label}</span>
                        <span className="shrink-0 tabular-nums">{dd(pageOf(block.index))}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 pt-1">
                        {block.items.map((it) => <ContentsRow key={it.index} label={it.label} page={pageOf(it.index)} />)}
                      </div>
                    </div>
                  ) : <ContentsRow key={`i-${block.index}`} label={block.label} page={pageOf(block.index)} strong />))}
                </div>
                <Section label="Reading this report" className="mt-8">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-[9.5px] leading-[1.6] sm:grid-cols-2 print:grid-cols-2" style={{ color: C.text }}>
                    <p><strong style={{ color: C.below }}>Below</strong>, <strong style={{ color: C.inline }}>in line with</strong> and <strong style={{ color: C.above }}>above</strong> describe the asking rate per sq ft against the comparable-market median, with ±4% treated as in line.</p>
                    <p><strong>Actual</strong> figures come from lodged contracts, <strong>current</strong> is the asking rent, and <strong>indicative</strong> marks a fitted trend that is not a valuation.</p>
                    <p><Unknown>Data unavailable</Unknown> means a dataset did not answer. <Unknown>Unable to verify</Unknown> means the address could not be measured or a list was incomplete.</p>
                    <p>All distances are straight-line from the matched address, with walking time estimated at 80 m a minute.</p>
                  </div>
                </Section>
              </Sheet>
            )}

            {detailed && sheets.map((s, index) => (
              <Sheet key={s.key} n={pageOf(index)} section={s.section} flush={s.flush} {...frame}>{s.body}</Sheet>
            ))}
          </article>
        </div>
      )}
    </div>
  );
}

/* ================================================================ parts */

function MarketBasis({ m }: { m: MarketPosition }) {
  return (
    <Section label="Comparison basis">
      <KV wrap labelWidth="38%" rows={[
        ['Basis', m.basisLabel],
        ['Area', m.scope],
        ['Contracts analysed', String(m.sample)],
        ['Lease months', `${m.period.from} – ${m.period.to}`],
        ['Local sample', <Badge key="l" tone={m.local ? 'positive' : 'warning'}>{m.local ? 'Sufficient' : 'Insufficient'}</Badge>],
      ]} />
    </Section>
  );
}

function ContentsRow({ label, page, strong = false }: { label: string; page: number; strong?: boolean }) {
  return (
    <div className={cx('flex items-baseline gap-2 py-[3px]', strong ? 'mt-2 text-[11.5px] font-bold' : 'text-[10px]')}>
      <span className="min-w-0 truncate">{label}</span>
      <span aria-hidden className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted" style={{ borderColor: C.rule }} />
      <span className="shrink-0 tabular-nums" style={{ color: C.muted }}>{dd(page)}</span>
    </div>
  );
}

function Cover({ checks, photoFor, onBroken, notice, forClient, brandLine, preparedOn, agentLine, total, agent, rents, districts, detailed, summary, positioning: line }: {
  checks: ReportCheck[];
  notice: string | null;
  photoFor: (l: DemoListing) => string | undefined;
  onBroken: (src: string) => void;
  forClient: string; brandLine: string; preparedOn: string; agentLine: string; total: number;
  agent: { name: string; agency: string; mobile: string; email: string; cea: string; licence: string };
  rents: number[]; districts: number[]; detailed: boolean;
  summary: [string, React.ReactNode][];
  positioning: string;
}) {
  const single = checks.length === 1 ? checks[0] : null;
  const l = single?.property.listing;
  const hero = l ? photoFor(l) : checks.map((c) => photoFor(c.property.listing)).find(Boolean);

  return (
    <section className="vr-page vr-cover flex flex-col bg-white sm:min-h-[1123px]" style={{ color: C.ink, fontFamily: SANS }}>
      <div className="flex shrink-0 items-center justify-between gap-4 px-8 py-6 sm:px-14" style={{ background: C.brandDeep }}>
        <span className="flex shrink-0 items-center gap-3">
          <Wordmark size={16} light />
          {notice && <DemoMark />}
        </span>
        <span className="truncate text-right text-[9.5px] font-medium uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.72)' }}>{brandLine}</span>
      </div>

      {hero ? (
        // eslint-disable-next-line @next/next/no-img-element -- our own photo route, must print
        <img src={hero} alt={l ? l.project : 'Shortlisted property'} onError={() => onBroken(hero)} className="h-[330px] w-full shrink-0 object-cover" />
      ) : (
        <div aria-hidden className="h-[6px] w-full shrink-0" style={{ background: C.accent }} />
      )}

      <div className={cx('shrink-0 px-8 sm:px-14', hero ? 'pt-9' : 'pt-20')}>
        <Eyebrow color={C.brand}>{forClient ? `Prepared for ${forClient}` : detailed ? 'Detailed report' : single ? (single.property.deal === 'rent' ? 'Rental advisory' : 'Property advisory') : 'Property shortlist'}</Eyebrow>
        {single && l ? (
          <>
            <h1 className="mt-3 line-clamp-2 text-[36px] font-bold leading-[1.08] tracking-[-0.02em]" style={{ fontFamily: DISPLAY }}>{nameOf(l)}</h1>
            <p className="mt-3 text-[12px] leading-[1.6]" style={{ color: C.muted }}>{fullAddress(l)}</p>
            <p className="text-[12px] leading-[1.6]" style={{ color: C.muted }}>{districtLine(l)} · {l.propertyType}</p>
            {line && <p className="mt-3 max-w-[62ch] text-[13px] font-medium leading-[1.5]" style={{ color: C.brand }}>{line}</p>}
          </>
        ) : (
          <>
            <h1 className="mt-3 text-[36px] font-bold leading-[1.08] tracking-[-0.02em]" style={{ fontFamily: DISPLAY }}>{checks.length} shortlisted properties</h1>
            <p className="mt-3 text-[12px] leading-[1.6]" style={{ color: C.muted }}>
              {districts.map((d) => `D${dd(d)} ${areaName(d)}`).join(' · ')}
            </p>
          </>
        )}
      </div>

      <div className="mt-8 shrink-0 px-8 sm:px-14">
        {single && l ? (
          <Stats cols={5} lead items={[
            single.property.askingRent !== null
              ? { label: 'Asking rent', value: money(single.property.askingRent), sub: 'per month' }
              : { label: 'Asking price', value: money(single.property.salePrice ?? 0), sub: 'for sale' },
            {
              label: 'Per sq ft',
              value: single.property.psf === null ? '—' : single.property.deal === 'rent' ? psfText(single.property.psf) : `S$${Math.round(single.property.psf).toLocaleString('en-SG')}`,
              sub: single.property.deal === 'rent' ? 'per month' : 'asking price',
            },
            { label: 'Layout', value: `${l.bedrooms} bed · ${l.bathrooms} bath`, sub: l.furnishing },
            { label: 'Floor area', value: sqftText(l.sizeSqft), sub: `${sqm(l.sizeSqft)} m²` },
            { label: single.property.deal === 'rent' ? 'Available from' : 'View from', value: dayText(l.availableFrom) },
          ]} />
        ) : (
          <Table dense
            cols={[{ head: '#', width: '6%' }, { head: 'Property' }, { head: 'District', width: '12%' }, { head: 'Beds', align: 'right', width: '8%' }, { head: 'Asking', align: 'right', width: '18%' }]}
            rows={checks.slice(0, 8).map((c, i) => [
              <span key="n" style={{ color: C.faint }}>{dd(i + 1)}</span>,
              <span key="p" className="font-semibold">{nameOf(c.property.listing)}</span>,
              `D${dd(c.property.listing.district)}`,
              c.property.listing.bedrooms,
              c.property.askingRent !== null ? `${money(c.property.askingRent)}/mo` : money(c.property.salePrice ?? 0),
            ])}
          />
        )}
        {single && summary.length > 0 && (
          <div className={cx(hero ? 'mt-5' : 'mt-10')}>
            <KV wrap labelWidth="36%" rows={summary} />
          </div>
        )}
        {!single && rents.length > 0 && <Fine>Asking rents from {money(Math.min(...rents))} to {money(Math.max(...rents))} a month.{checks.length > 8 ? ` ${checks.length - 8} more properties inside.` : ''}</Fine>}
      </div>

      <div className="mt-auto shrink-0 px-8 pb-2 sm:px-14">
        <div className="grid grid-cols-1 items-end gap-6 pt-5 sm:grid-cols-2 print:grid-cols-2" style={{ borderTop: `1px solid ${C.ink}` }}>
          <div>
            <Eyebrow color={C.faint}>Prepared</Eyebrow>
            <div className="mt-1 text-[14px] font-semibold">{preparedOn}</div>
          </div>
          <div className="sm:text-right print:text-right">
            <Eyebrow color={C.faint}>Your agent</Eyebrow>
            <div className="mt-1 text-[14px] font-bold" style={{ fontFamily: DISPLAY }}>{agent.name}</div>
            <div className="text-[10px] leading-[1.6]" style={{ color: C.muted }}>
              {agent.agency}<br />
              {[agent.mobile, agent.email].filter(Boolean).join(' · ')}<br />
              CEA {agent.cea}{agent.licence ? ` · Licence ${agent.licence}` : ''}
            </div>
          </div>
        </div>
      </div>
      <div className="shrink-0 px-8 pb-7 sm:px-14 print:pb-[9mm]">
        <PageFooter n={1} total={total} preparedOn={preparedOn} agentLine={agentLine} brandLine={brandLine} notice={notice} />
      </div>
    </section>
  );
}
