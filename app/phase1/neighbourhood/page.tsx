"use client";

/**
 * Neighbourhood intelligence.
 *
 * "What is around it" is the second question a tenant asks and the one agents
 * answer worst, because the honest answer is a list of specific places at
 * specific distances and the usual answer is "very convenient". This screen
 * produces the specific version from the bodies that publish it — station exits
 * from the Land Transport Authority, schools from the Ministry of Education,
 * hawker centres from the Food Agency, parks from NParks, hospitals from MOH —
 * around a listing the agent already has, or any address they search for.
 *
 * Three things shape the design.
 *
 * **The map does not carry the argument.** A map with sixty pins on it is a
 * decoration; the reader cannot tell a two-minute walk from a twelve-minute one
 * by looking at it. So the map places the address and the *categories* carry the
 * detail, one at a time, each place with the walk from the door beside it.
 *
 * **Walking minutes, not metres.** That is the unit the conversation happens
 * in. Eighty metres a minute is the figure LTA uses, and the distance is
 * straight-line, so the screen says "about" and means it.
 *
 * **A category that did not answer says so.** Three government services are
 * queried here and any of them can time out. Showing seven categories of eight
 * and quietly dropping the ninth is how an agent tells a client there are no
 * hospitals nearby. Every failure is named, and every one can be retried.
 *
 * The market figures at the foot are district-level, because URA publishes a
 * district and not a neighbourhood. The panel says so rather than implying that
 * the median belongs to the four streets around the pin.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MapPin, Loader2, UtensilsCrossed, Stethoscope, BookOpen, Users, Dumbbell,
  Building2, GraduationCap, Hospital, Copy, Check, Trees, TrainFront, Sparkles,
  Navigation, TrendingUp,
} from 'lucide-react';
import {
  Button, LinkButton, SelectInput, SearchInput, cx,
} from '../../../components/phase1/kit';
import { PropertyMap } from '../../../components/phase1/listing/PropertyMap';
import {
  InsightsShell, InsightsHeader, InsightPanel, ContextBar, ContextField, ChipGroup,
  InsightMetric, MetricRail, WalkBar, TrendChart, MiniTrend,
  InsightEmpty, DataUnavailable, ChartSkeleton, MetricSkeleton, SourceNote, DataFreshness,
  BarList, MarketUnavailable, useMarketAvailable,
} from '../../../components/phase1/insights';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { sgd } from '../../../lib/phase1/data';
import type { AmenityLookup } from '../../../lib/phase1/amenities';
import type { PlacesLookup } from '../../../lib/phase1/places';
import type { AddressMatch } from '../../../lib/phase1/onemap';
import { districtInsight, districtLabel, monthsIn } from '../../../lib/phase1/insights';
import { MARKET_MONTHS, monthLabel } from '../../../lib/phase1/market';

/** Eighty metres a minute, the figure LTA plans pedestrian routes with. */
const walk = (metres: number) => Math.max(1, Math.round(metres / 80));
const shortMonth = (m: string) => monthLabel(m).replace(' 20', " '");

type Icon = React.ComponentType<{ size?: number | string; className?: string }>;

interface Place { name: string; detail?: string; address?: string; metres: number }

interface Category {
  key: string;
  label: string;
  /** The register it comes from, named so the claim is checkable. */
  source: string;
  icon: Icon;
  items: Place[];
  /** Set when this category's own lookup did not come back. */
  problem?: string;
}

/** The amenity themes, in the order a tenant asks about them. */
const AMENITY_META: Record<string, { label: string; icon: Icon }> = {
  hawker: { label: 'Food', icon: UtensilsCrossed },
  parks: { label: 'Parks', icon: Trees },
  sport: { label: 'Sport', icon: Dumbbell },
  clinics: { label: 'Polyclinics', icon: Stethoscope },
  hospitals: { label: 'Hospitals', icon: Hospital },
  libraries: { label: 'Libraries', icon: BookOpen },
  community: { label: 'Community', icon: Users },
  schools: { label: 'Private education', icon: Building2 },
};

export default function NeighbourhoodPage() {
  const { state } = useDemo();
  const marketAvailable = useMarketAvailable();

  const placed = useMemo(
    () => state.listings.filter((l) => !l.archived && l.lat && l.lng),
    [state.listings],
  );

  const [listingId, setListingId] = useState(() => placed[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<AddressMatch[]>([]);
  const [point, setPoint] = useState<{ lat: number; lng: number; label: string; postal?: string } | null>(null);
  const [radius, setRadius] = useState('1000');
  const [attempt, setAttempt] = useState(0);

  const [amenities, setAmenities] = useState<AmenityLookup | null>(null);
  const [stations, setStations] = useState<PlacesLookup | null>(null);
  const [schools, setSchools] = useState<PlacesLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('mrt');
  const [copied, setCopied] = useState(false);

  const listing = placed.find((l) => l.id === listingId) ?? null;
  const active = point ?? (listing && listing.lat && listing.lng
    ? { lat: listing.lat, lng: listing.lng, label: `${listing.project} ${listing.unitNo}`, postal: listing.postalCode }
    : null);

  /**
   * One round of lookups per point, not per keystroke.
   *
   * Three services, run together rather than in sequence: the eight OneMap
   * themes behind the amenities, the LTA station exits and the MOE school
   * directory. They fail independently and are reported independently, because
   * "the stations did not answer" and "there are no stations" are different
   * sentences and only one of them is ever true.
   */
  const lookup = useCallback(async (lat: number, lng: number, metres: string, postal?: string) => {
    setLoading(true);
    const at = `lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`;
    /* A refused request (signed out, rate limited) answers with an error body
       that has no status. It is a failure, and must never read as "none nearby". */
    const answered = (body: unknown) =>
      !!body && typeof body === 'object' && typeof (body as { status?: unknown }).status === 'string';
    const places = (kind: string) => fetch(`/api/phase1/places?kind=${kind}&${at}${postal ? `&postal=${postal}` : ''}`)
      .then((r) => r.json())
      .then((b) => (answered(b) ? b as PlacesLookup : { status: 'failed', kind, reason: 'That lookup was refused.' } as PlacesLookup))
      .catch(() => ({ status: 'failed', kind, reason: 'That lookup did not come back.' }) as PlacesLookup);

    const [a, m, s] = await Promise.all([
      fetch(`/api/phase1/neighbourhood?${at}&radius=${metres}`)
        .then((r) => r.json())
        .then((b) => (answered(b) ? b as AmenityLookup : { status: 'failed', reason: 'The amenities lookup was refused.' } as AmenityLookup))
        .catch(() => ({ status: 'failed', reason: 'Could not reach the amenities service.' }) as AmenityLookup),
      places('mrt'),
      places('schools'),
    ]);
    setAmenities(a);
    setStations(m);
    setSchools(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!active) return;
    // A fetch that shows a spinner: setting state is the whole point of it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void lookup(active.lat, active.lng, radius, active.postal);
  }, [active?.lat, active?.lng, radius, attempt, lookup]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(async () => {
      if (q.length < 3) { setMatches([]); return; }
      setSearching(true);
      try {
        const res = await fetch(`/api/phase1/address?q=${encodeURIComponent(q)}`);
        const body = (await res.json()) as { results?: AddressMatch[] };
        setMatches((body.results ?? []).slice(0, 5));
      } catch {
        setMatches([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  /* ---------------------------------------------------- the categories */

  const within = Number(radius);

  const categories: Category[] = useMemo(() => {
    const out: Category[] = [];

    const fromPlaces = (lookupResult: PlacesLookup | null, key: string, label: string, icon: Icon, fallbackSource: string): Category => {
      if (!lookupResult) return { key, label, source: fallbackSource, icon, items: [], problem: 'Not looked up yet.' };
      if (lookupResult.status !== 'ok') {
        return {
          key, label, icon, source: fallbackSource, items: [],
          problem: lookupResult.status === 'no_token'
            ? `${lookupResult.reason} This category needs a registered OneMap token.`
            : lookupResult.reason || 'That lookup did not come back.',
        };
      }
      return {
        key, label, icon, source: lookupResult.source,
        /* The places service uses its own radius; the reader chose one here, so
           it is applied on the way in rather than silently ignored. */
        items: lookupResult.items.filter((p) => p.metres <= within),
      };
    };

    out.push(fromPlaces(stations, 'mrt', 'MRT', TrainFront, 'Land Transport Authority'));
    out.push(fromPlaces(schools, 'schools', 'Schools', GraduationCap, 'Ministry of Education'));

    if (amenities?.status === 'ok') {
      for (const g of amenities.groups) {
        const meta = AMENITY_META[g.key] ?? { label: g.label, icon: Building2 };
        out.push({ key: `a-${g.key}`, label: meta.label, source: g.source, icon: meta.icon, items: g.items });
      }
      for (const missing of amenities.missing ?? []) {
        out.push({ key: `miss-${missing}`, label: missing, source: 'OneMap', icon: Building2, items: [], problem: 'Did not respond in time.' });
      }
    }
    return out;
  }, [stations, schools, amenities, within]);

  const shownCategory = categories.find((c) => c.key === category) ?? categories[0];
  const nearestMrt = categories.find((c) => c.key === 'mrt')?.items[0] ?? null;
  const mrtFailed = categories.find((c) => c.key === 'mrt')?.problem;
  const schoolsCat = categories.find((c) => c.key === 'schools');
  /* A theme counts only when it answered. A theme that timed out, or a lookup
     that failed outright, leaves no group behind — that is an unknown, not a nought. */
  const foodCat = categories.find((c) => c.key === 'a-hawker');
  const clinicsCat = categories.find((c) => c.key === 'a-clinics');
  const hospitalsCat = categories.find((c) => c.key === 'a-hospitals');
  const amenityProblem = amenities && amenities.status !== 'ok' ? amenities.reason : 'That register did not answer in time.';
  const healthCount = clinicsCat && hospitalsCat ? clinicsCat.items.length + hospitalsCat.items.length : null;

  const totalFound = categories.reduce((n, c) => n + c.items.length, 0);
  const problems = categories.filter((c) => c.problem);

  /* --------------------------------------------- the market around it */

  /* The held contracts are private condominium leases, so an HDB flat is not
     compared against them — that comparison would look like evidence and isn't. */
  const district = listing && !point && listing.propertyType !== 'HDB' ? listing.district : null;
  /* The district figures come from the illustrative contract set: demo data. */
  const showMarket = district !== null && marketAvailable;
  /* Not hand-memoized: the compiler cannot prove the listing this is derived
     from is never mutated, so a manual `useMemo` here only makes it give up on
     the whole component. Left plain, it memoizes this with everything else. */
  const market = !showMarket || district === null ? null : districtInsight(district, '12');
  const months = useMemo(() => monthsIn('12'), []);

  /* ------------------------------------------------ the sentence to send */

  const summaryText = useMemo(() => {
    const nearest = categories
      .filter((c) => c.items.length && !c.problem)
      .map((c) => `${c.items[0].name} (${c.label.toLowerCase()}, about ${walk(c.items[0].metres)} min walk)`)
      .slice(0, 4);
    return nearest.length ? `Within ${within / 1000}km: ${nearest.join('; ')}.` : '';
  }, [categories, within]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const controls = (
    <>
      {placed.length > 0 && (
        <SelectInput
          label="One of your listings"
          value={point ? '' : listingId}
          onChange={(e) => { setListingId(e.target.value); setPoint(null); setQuery(''); }}
          containerClassName="md:w-[280px]"
          options={[
            ...(point ? [{ value: '', label: 'A searched address' }] : []),
            ...placed.map((l) => ({
              value: l.id,
              label: `${l.project} ${l.unitNo} — ${districtLabel(l.district)}`,
            })),
          ]}
        />
      )}
      <ContextField label="Or any address" className="relative md:w-[240px]">
        <SearchInput
          size="sm"
          label="Or any address"
          value={query}
          onChange={setQuery}
          placeholder="Postal code or road"
        />
        {searching && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-p1-text-3">
            <Loader2 size={12} className="animate-spin" aria-hidden /> Searching OneMap…
          </p>
        )}
        {matches.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-ins-line bg-ins-raised shadow-ins-raised">
            {matches.map((m) => (
              <li key={m.postal}>
                <button
                  type="button"
                  disabled={m.lat === undefined || m.lng === undefined}
                  onClick={() => {
                    if (m.lat === undefined || m.lng === undefined) return;
                    setPoint({ lat: m.lat, lng: m.lng, label: m.project || m.label, postal: m.postal });
                    setMatches([]);
                    setQuery(m.label);
                  }}
                  className="w-full cursor-pointer border-b border-ins-line px-3.5 py-2.5 text-left last:border-b-0 hover:bg-ins-inset disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="block truncate text-[13.5px] font-medium text-p1-text">{m.project || m.street}</span>
                  <span className="block truncate text-[12px] text-p1-text-3">Singapore {m.postal}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ContextField>
      <ContextField label="How far">
        <ChipGroup
          label="Radius"
          value={radius}
          onChange={setRadius}
          options={[
            { key: '500', label: '500 m', hint: 'About six minutes on foot' },
            { key: '1000', label: '1 km', hint: 'About twelve minutes on foot' },
            { key: '1500', label: '1.5 km' },
            { key: '2000', label: '2 km' },
          ]}
        />
      </ContextField>
    </>
  );

  return (
    <InsightsShell
      footnote={
        <div className="grid gap-2">
          <SourceNote source="onemap" detail="Walking times are straight-line distance at eighty metres a minute, the figure LTA plans pedestrian routes with, so they are an estimate and are labelled as one." />
          {market && <SourceNote detail="The market panel is district-level: URA publishes a district, not a neighbourhood." />}
        </div>
      }
    >
      <InsightsHeader
        module="neighbourhood"
        title="Neighbourhood"
        description="What sits around an address, with the walk from the door."
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-p1-success-soft px-2.5 py-1 text-[11.5px] font-medium text-p1-success ring-1 ring-p1-success-border">
            <span className="h-1.5 w-1.5 rounded-full bg-p1-success" aria-hidden />
            Live government data
          </span>
        }
        actions={<LinkButton href="/phase1/properties" variant="outline">Property map</LinkButton>}
        context={
          <ContextBar summary={active ? `${active.label} · within ${within / 1000}km` : 'Nothing chosen yet'} sheetTitle="Choose a location">
            {controls}
          </ContextBar>
        }
      />

      {!active ? (
        <InsightPanel index={1}>
          <InsightEmpty
            icon={<MapPin size={20} />}
            title="Choose a listing, or search an address"
            description={placed.length === 0
              ? 'None of your listings has been matched to a point on the map yet. Search any Singapore address instead — a postal code is enough.'
              : 'Pick one above and the area around it is looked up straight away.'}
          />
        </InsightPanel>
      ) : (
        <>
          {/* ------------------------------------------------------- the place */}
          <div className="mb-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <section
              className="ins-rise overflow-hidden rounded-2xl border border-ins-line bg-ins-panel shadow-ins"
              style={{ '--i': 1 } as React.CSSProperties}
              aria-label="Where this is"
            >
              <PropertyMap lat={active.lat} lng={active.lng} label={active.label} height={260} className="rounded-none border-0" />
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-4 py-3.5">
                <div className="min-w-0">
                  <h2 className="truncate font-p1display text-[17px] font-bold leading-tight text-p1-text">{active.label}</h2>
                  <p className="mt-0.5 truncate text-[12.5px] text-p1-text-3">
                    {listing && !point
                      ? `${districtLabel(listing.district)} · ${listing.address}`
                      : `${active.lat.toFixed(5)}, ${active.lng.toFixed(5)}${active.postal ? ` · Singapore ${active.postal}` : ''}`}
                  </p>
                </div>
                <span className="shrink-0 text-[12px] text-p1-text-3">
                  {loading ? 'Looking up…' : `${totalFound} places within ${within / 1000}km`}
                </span>
              </div>
            </section>

            <div
              className="ins-rise grid content-start gap-3"
              style={{ '--i': 2 } as React.CSSProperties}
            >
              {/* A lookup in flight is not a neighbourhood with nothing in it.
                  While the three registers are being asked, the tiles are
                  placeholders; a "0" here would be a claim about the area that
                  nobody has checked yet. */}
              {loading ? <MetricSkeleton count={4} /> : (
              <MetricRail min={200}>
                <InsightMetric
                  label="Nearest station"
                  subject={nearestMrt?.name}
                  value={nearestMrt ? walk(nearestMrt.metres) : null}
                  unavailable={mrtFailed ?? 'No station exit within the radius'}
                  suffix=" min"
                  icon={<TrainFront size={16} />}
                  tone="primary"
                  emphasis
                  hint={nearestMrt ? `${nearestMrt.detail ?? 'Station exit'} · about ${nearestMrt.metres} m` : undefined}
                >
                  {nearestMrt && <WalkBar minutes={walk(nearestMrt.metres)} label={`Walk to ${nearestMrt.name}`} />}
                </InsightMetric>

                {/* Zero is a reading. A register that answered "nothing within
                    the radius" is a fact about the neighbourhood; only a register
                    that did not answer is an absence, and only that one gets the
                    em dash. */}
                <InsightMetric
                  label="Schools"
                  subject={`Within ${within / 1000}km`}
                  value={schoolsCat?.problem ? null : (schoolsCat?.items.length ?? 0)}
                  unavailable={schoolsCat?.problem}
                  icon={<GraduationCap size={16} />}
                  tone="info"
                  hint={schoolsCat?.problem ? undefined
                    : schools?.status === 'ok' && schools.pending ? `${schools.pending} not yet mapped — count may be short`
                      : schoolsCat?.items[0] ? `Nearest: ${schoolsCat.items[0].name}` : 'None within the radius'}
                />

                <InsightMetric
                  label="Food"
                  subject="Hawker centres"
                  value={foodCat ? foodCat.items.length : null}
                  unavailable={amenityProblem}
                  icon={<UtensilsCrossed size={16} />}
                  tone="accent"
                  hint={!foodCat ? undefined : foodCat.items[0] ? `Nearest: about ${walk(foodCat.items[0].metres)} min` : 'None within the radius'}
                />

                <InsightMetric
                  label="Healthcare"
                  subject="Polyclinics and hospitals"
                  value={healthCount}
                  unavailable={amenities && amenities.status !== 'ok' ? amenities.reason : 'Those registers did not answer in time.'}
                  icon={<Stethoscope size={16} />}
                  tone="success"
                  hint={healthCount === null ? undefined : healthCount ? 'Within the radius' : 'None within the radius'}
                />
              </MetricRail>
              )}

              {summaryText && (
                <div className="rounded-2xl border border-ins-line bg-ins-panel p-4 shadow-ins">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-p1-text">
                    <Sparkles size={14} className="text-p1-text-3" aria-hidden />
                    For the listing description
                  </div>
                  <p className="mt-1.5 text-[13px] leading-5 text-p1-text-2">{summaryText}</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={copySummary} leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}>
                    {copied ? 'Copied' : 'Copy this'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------- what is around it */}
          {loading ? (
            <InsightPanel index={3} className="mb-5" title="Looking up the area" question="Three registers, queried together.">
              <ChartSkeleton height={200} />
            </InsightPanel>
          ) : amenities?.status === 'no_token' ? (
            <DataUnavailable
              className="mb-5"
              kind="not_configured"
              title="The theme service is not configured"
              reason={`${amenities.reason} The map, the address search and the market figures below still work.`}
            />
          ) : amenities?.status === 'failed' ? (
            <DataUnavailable
              className="mb-5"
              title="That lookup did not come back"
              reason={amenities.reason}
              onRetry={() => setAttempt((n) => n + 1)}
            />
          ) : (
            <InsightPanel
              index={3}
              className="mb-5"
              padding="none"
              title="What is around it"
              question="Nearest first, with the walk from the door."
              footer={
                problems.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[12px] leading-5 text-p1-text-3">
                      {problems.map((p) => p.label).join(', ')} did not answer, so {problems.length > 1 ? 'those categories are' : 'that category is'} not
                      counted. This is a failed lookup, not an empty neighbourhood.
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => setAttempt((n) => n + 1)}>Retry</Button>
                  </div>
                ) : (
                  <span className="text-[12px] text-p1-text-3">
                    Every category answered. Each names the register it came from.
                  </span>
                )
              }
            >
              {/* The categories, as chips. Progressive disclosure: one at a time,
                  because eight lists at once is the wall of text this replaces. */}
              <div className="grid lg:grid-cols-[300px_minmax(0,1fr)]">
              <div className="hidden border-r border-ins-line p-5 lg:block">
                <h3 className="mb-3 text-[12.5px] font-semibold text-p1-text-2">Places within {within / 1000}km</h3>
                <BarList
                  caption={`Places found within ${within / 1000} km, by category`}
                  slot={2}
                  missingLabel="No answer"
                  valueLabel={(n) => `${n}`}
                  items={categories.map((c) => ({
                    key: c.key,
                    label: c.label,
                    value: c.problem ? null : c.items.length,
                    marked: c.key === shownCategory?.key,
                    onSelect: c.problem ? undefined : () => setCategory(c.key),
                    selectLabel: `${c.label}: ${c.items.length} places. Show them.`,
                  }))}
                />
              </div>
              <div className="min-w-0">
              <div className="p1-noscrollbar ins-snap-x flex gap-2 overflow-x-auto border-b border-ins-line px-4 py-3 lg:hidden">
                {categories.map((c) => {
                  const on = c.key === shownCategory?.key;
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(c.key)}
                      aria-pressed={on}
                      disabled={!!c.problem}
                      className={cx(
                        'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors',
                        on
                          ? 'border-p1-primary bg-p1-primary-soft text-p1-primary dark:text-p1-info'
                          : 'border-ins-line bg-ins-panel text-p1-text-2 hover:border-ins-line-strong hover:text-p1-text',
                        c.problem && 'cursor-not-allowed opacity-50',
                      )}
                      title={c.problem ?? c.source}
                    >
                      <Icon size={14} aria-hidden />
                      {c.label}
                      <span className={cx('rounded-full px-1.5 text-[11px] tabular-nums', on ? 'bg-p1-primary/15' : 'bg-ins-inset text-p1-text-3')}>
                        {c.problem ? '—' : c.items.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {!shownCategory || shownCategory.items.length === 0 ? (
                <InsightEmpty
                  icon={<Navigation size={20} />}
                  title={shownCategory?.problem ? `${shownCategory.label} did not answer` : `Nothing in ${shownCategory?.label.toLowerCase() ?? 'that category'} within ${within / 1000}km`}
                  description={shownCategory?.problem
                    ?? 'Widen the radius. Parts of the island genuinely have very little inside five hundred metres.'}
                  action={shownCategory?.problem
                    ? <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>Retry the lookup</Button>
                    : Number(radius) < 2000
                      ? <Button variant="outline" onClick={() => setRadius(String(Math.min(2000, Number(radius) * 2)))}>Widen to {Math.min(2, (Number(radius) * 2) / 1000)} km</Button>
                      : undefined}
                />
              ) : (
                <>
                  <ul className="divide-y divide-ins-line">
                    {shownCategory.items.slice(0, 12).map((a, i) => (
                      <li
                        key={`${a.name}-${a.metres}-${i}`}
                        className="ins-swap flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-ins-inset"
                        style={{ animationDelay: `${i * 22}ms` }}
                      >
                        <span className="w-6 shrink-0 text-[12px] font-semibold tabular-nums text-p1-text-3">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-medium text-p1-text">{a.name}</div>
                          {(a.detail || a.address) && (
                            <div className="truncate text-[12px] text-p1-text-3">{a.detail ?? a.address}</div>
                          )}
                        </div>
                        <div className="w-32 shrink-0 sm:w-44">
                          <WalkBar minutes={walk(a.metres)} ceiling={Math.max(6, within / 80)} label={`about ${walk(a.metres)} minutes on foot`} />
                          <div className="mt-0.5 text-right text-[11px] tabular-nums text-p1-text-3">about {a.metres} m</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="border-t border-ins-line px-4 py-2.5 text-[12px] text-p1-text-3">
                    {shownCategory.items.length > 12
                      ? `The twelve nearest of ${shownCategory.items.length}. `
                      : ''}
                    Source: {shownCategory.source}.
                  </p>
                </>
              )}
              </div>
              </div>
            </InsightPanel>
          )}

          {/* -------------------------------------------------------- the market */}
          {market && (
            <InsightPanel
              index={4}
              title={`The rental market in ${districtLabel(market.district)}`}
              question="What are comparable homes in this district letting for?"
              actions={<DataFreshness />}
              footer={
                <p className="text-[12px] leading-5 text-p1-text-3">
                  District-level, across {market.projects.length} covered development{market.projects.length === 1 ? '' : 's'}
                  {market.projects.length ? ` — ${market.projects.slice(0, 3).join(', ')}${market.projects.length > 3 ? ` and ${market.projects.length - 3} more` : ''}` : ''}.
                  URA publishes a district, not a neighbourhood, so this is not a figure for the streets around the pin.
                </p>
              }
            >
              {market.contracts === 0 ? (
                <InsightEmpty
                  icon={<TrendingUp size={20} />}
                  title="No contracts in this district"
                  description="The held contract set does not cover a development in this district, so no district median can be stated."
                />
              ) : (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
                  <MetricRail min={200}>
                    <InsightMetric
                      label="Median rent"
                      subject="This district, 12 months"
                      value={market.medianRent}
                      prefix="$"
                      icon={<TrendingUp size={16} />}
                      tone="primary"
                      delta={{ pct: market.movementPct, label: 'last third of the year against the first' }}
                    >
                      <MiniTrend points={market.rentByMonth} label="District median rent by month" width={110} />
                    </InsightMetric>
                    <InsightMetric
                      label="Per sqft"
                      subject="A month"
                      value={market.medianPsf}
                      prefix="$"
                      decimals={2}
                      icon={<Building2 size={16} />}
                      tone="info"
                      hint={`${market.contracts} contracts`}
                    />
                  </MetricRail>

                  <TrendChart
                    caption={`Median monthly rent in District ${market.district} by lease month`}
                    labels={months.map(shortMonth)}
                    height={210}
                    valueLabel={(n) => `$${Math.round(n).toLocaleString('en-SG')}`}
                    reference={market.medianRent ? { value: market.medianRent, label: `Year median ${sgd(market.medianRent)}` } : null}
                    series={[{ key: 'd', label: 'Median rent', points: market.rentByMonth, slot: 0 }]}
                    emptyMessage="Too few contracts in this district to draw a trend."
                  />
                </div>
              )}
            </InsightPanel>
          )}

          {district !== null && !marketAvailable && <MarketUnavailable compact />}

          {point && marketAvailable && (
            <p className="mt-4 text-[12.5px] leading-5 text-p1-text-3">
              Market figures are shown for a listing of your own, where the district is known. This is a searched
              address, so no district median is claimed for it.{' '}
              <span className="text-p1-text-2">Last covered month: {monthLabel(MARKET_MONTHS[MARKET_MONTHS.length - 1])}.</span>
            </p>
          )}
        </>
      )}
    </InsightsShell>
  );
}
