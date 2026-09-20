"use client";

/**
 * "Location & nearby places" — the neighbourhood around the address the agent
 * has just chosen: a strip of categories across the top, the chosen one listed
 * on the left with a radius to narrow it by, and the same places pinned on a
 * map to the right.
 *
 * Clicking a place, in the list or on the map, routes to it: OneMap walks or
 * drives the real network and the line, the distance and the time all come
 * back measured. Everything else in the panel is a straight line and says so —
 * there is no arithmetic here that turns metres into minutes.
 *
 * One category at a time is what keeps this a panel rather than a second page
 * of the form. The list scrolls inside its own box; the form does not grow.
 *
 * Nothing here is saved. The lookup is made from the coordinates every time
 * the address is set, so a listing edited next year shows the station that
 * opened in the meantime rather than a copy of today's answer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown, ChevronLeft, ChevronRight, Compass, Footprints, GraduationCap, HeartPulse, Landmark, RefreshCw,
  Car, TrainFront, Trees, UtensilsCrossed, X,
} from 'lucide-react';
import { Button, Skeleton, cx } from '../kit';
import { DemoBadge } from '../DemoDataSwitch';
import { useDemo } from '../../../lib/phase1/DemoContext';
import type { RouteMode, RouteResult } from '../../../lib/phase1/directions';
import {
  NEARBY_CATEGORIES, formatDistance, formatDuration, formatRadius, groupOf, nearbyAllUnavailable, nearbyCategory,
  nearbyKey, placeKey, placesWithin, radiusOptions,
  type NearbyCategory, type NearbyGroup, type NearbyLookup, type NearbyPlace,
} from '../../../lib/phase1/nearby';
import { demoDirections, demoNearby } from '../../../lib/phase1/nearby-demo';
import { NearbyMap } from './NearbyMap';

/* One icon per category. Decoration: every tab carries its name in words too,
   so nothing here is the only thing saying which category is which. */
const ICON: Record<NearbyCategory, typeof TrainFront> = {
  transport: TrainFront,
  schools: GraduationCap,
  healthcare: HeartPulse,
  food: UtensilsCrossed,
  parks: Trees,
  community: Landmark,
};

const TRAVEL: { mode: RouteMode; label: string; Icon: typeof Car }[] = [
  { mode: 'walk', label: 'Walk', Icon: Footprints },
  { mode: 'drive', label: 'Drive', Icon: Car },
];

/**
 * Answers already given, so stepping back to the address and forward again
 * does not ask two government services the same question. Small on purpose:
 * one agent works on a handful of addresses in a sitting.
 */
const answered = new Map<string, NearbyLookup>();
const routed = new Map<string, RouteResult>();
function remember<T>(store: Map<string, T>, key: string, value: T) {
  if (store.size > 40) store.clear();
  store.set(key, value);
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; lookup: NearbyLookup }
  | { status: 'error'; reason: string };

export function NearbyPlaces({
  lat,
  lng,
  postal,
  label,
  className = '',
}: {
  lat?: number;
  lng?: number;
  postal?: string;
  label?: string;
  className?: string;
}) {
  const { demo } = useDemo();
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<{ view: string; lookup?: NearbyLookup; error?: string } | null>(null);

  const located = lat !== undefined && lng !== undefined;
  const key = located ? nearbyKey(lat, lng, postal) : null;
  /* One identity for "the neighbourhood currently being shown". A new address,
     the Demo Data switch flipping, or a retry all make it a different one, and
     everything derived below falls back to loading until it is answered. */
  const view = `${key ?? ''}|${demo ? 'demo' : 'live'}|${attempt}`;

  /* With the switch on nothing is fetched at all. The illustrative set is
     computed here and never reaches the endpoint or the database. */
  const demoLookup = useMemo(
    () => (demo && lat !== undefined && lng !== undefined ? demoNearby(lat, lng, postal) : null),
    [demo, lat, lng, postal],
  );
  const held = !demo && key ? answered.get(key) ?? null : null;

  useEffect(() => {
    if (demo || held || !key || lat === undefined || lng === undefined) return;
    const controller = new AbortController();

    /* The address arrives resolved, not keystroke by keystroke, so this is not
       a search debounce. It coalesces a pin being dragged across a few
       buildings, which re-resolves on every drop. */
    const timer = setTimeout(async () => {
      try {
        const q = new URLSearchParams({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
        if (postal) q.set('postal', postal);
        const res = await fetch(`/api/phase1/nearby?${q.toString()}`, { cache: 'no-store', signal: controller.signal });
        const body = (await res.json()) as NearbyLookup & { reason?: string };
        if (controller.signal.aborted) return;
        if (!res.ok || !Array.isArray(body.groups)) {
          setAnswer({ view, error: body.reason ?? 'Nearby places are temporarily unavailable.' });
          return;
        }
        remember(answered, key, body);
        setAnswer({ view, lookup: body });
      } catch {
        /* An aborted request is the address changing under us, not a failure. */
        if (!controller.signal.aborted) {
          setAnswer({ view, error: 'Nearby places are temporarily unavailable.' });
        }
      }
    }, 250);

    return () => { controller.abort(); clearTimeout(timer); };
  }, [view, key, demo, held, lat, lng, postal]);

  const state: State = !located ? { status: 'idle' }
    : demoLookup ? { status: 'ready', lookup: demoLookup }
      : held ? { status: 'ready', lookup: held }
        : answer?.view !== view ? { status: 'loading' }
          : answer.error ? { status: 'error', reason: answer.error }
            : { status: 'ready', lookup: answer.lookup! };

  const retry = useCallback(() => { if (key) answered.delete(key); setAttempt((n) => n + 1); }, [key]);

  /* ------------------------------------------------- category and radius */

  const [picked, setPicked] = useState<NearbyCategory>('transport');
  const group = state.status === 'ready' ? groupOf(state.lookup, picked) : undefined;
  const searched = group?.status === 'ok' ? group.radiusMetres : 2000;
  const options = radiusOptions(searched);

  /* Chosen per category, because the useful distance is not the same for a
     station and a hawker centre. Anything not chosen yet shows everything
     the category searched. */
  const [radii, setRadii] = useState<Partial<Record<NearbyCategory, number>>>({});
  const radius = radii[picked] ?? searched;
  const shown = placesWithin(group, radius);

  /* ------------------------------------------------------------ the route */

  const [chosen, setChosen] = useState<string | null>(null);
  const [travel, setTravel] = useState<RouteMode>('walk');
  const [leg, setLeg] = useState<{ id: string; result: RouteResult } | null>(null);

  /* Derived from the list rather than stored: narrowing the radius past the
     picked place, or switching category, drops the selection with it. */
  const selected = shown.find((p) => placeKey(p) === chosen) ?? null;
  const legId = selected && lat !== undefined && lng !== undefined
    ? `${view}|${placeKey(selected)}|${travel}` : null;
  const heldLeg = legId && !demo ? routed.get(legId) ?? null : null;

  /* Cheap and pure, so it is computed rather than memoised: the place it
     depends on is found in a list each render and is not stable enough for a
     dependency array. */
  const demoLeg = demo && selected && lat !== undefined && lng !== undefined
    ? demoDirections({ lat, lng }, { lat: selected.lat, lng: selected.lng }, travel)
    : null;

  useEffect(() => {
    if (demo || heldLeg || !legId || !selected || lat === undefined || lng === undefined) return;
    const controller = new AbortController();

    (async () => {
      try {
        const q = new URLSearchParams({
          fromLat: lat.toFixed(6), fromLng: lng.toFixed(6),
          toLat: selected.lat.toFixed(6), toLng: selected.lng.toFixed(6),
          mode: travel,
        });
        const res = await fetch(`/api/phase1/directions?${q.toString()}`, { cache: 'no-store', signal: controller.signal });
        const body = (await res.json()) as RouteResult;
        if (controller.signal.aborted) return;
        const result: RouteResult = res.ok && body.status === 'ok'
          ? body
          : { status: 'failed', mode: travel, reason: (body as { reason?: string }).reason ?? 'No route was found.' };
        remember(routed, legId, result);
        setLeg({ id: legId, result });
      } catch {
        if (!controller.signal.aborted) {
          setLeg({ id: legId, result: { status: 'failed', mode: travel, reason: 'The routing service did not answer.' } });
        }
      }
    })();

    return () => controller.abort();
  }, [legId, demo, heldLeg, selected, lat, lng, travel]);

  /* Stable, so the map does not rebuild every marker when the panel re-renders. */
  const choose = useCallback((p: NearbyPlace) => setChosen(placeKey(p)), []);

  const route: RouteResult | null = !selected ? null
    : demoLeg ?? heldLeg ?? (leg?.id === legId ? leg.result : null);
  const routing = Boolean(selected) && route === null;

  const [collapsed, setCollapsed] = useState(false);

  return (
    <section
      aria-labelledby="nearby-heading"
      className={cx('overflow-hidden rounded-xl border border-p1-border bg-p1-surface', className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 id="nearby-heading" className="flex items-center gap-2 text-[14.5px] font-semibold text-p1-text">
            <Compass size={15} className="shrink-0 text-p1-text-3" aria-hidden />
            Location &amp; nearby places
          </h3>
          <p className="mt-0.5 text-[12.5px] text-p1-text-3">
            Distances are straight lines. Pick a place for the route to it. Nothing here is saved to the listing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {state.status === 'ready' && state.lookup.mode === 'demo' && (
            <DemoBadge title="Demo Data is on, so these places and routes are illustrative and are not read from any register." />
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
            aria-controls="nearby-body"
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-p1-text-2 outline-none hover:bg-p1-subtle hover:text-p1-text focus-visible:ring-2 focus-visible:ring-p1-ring"
          >
            {collapsed ? 'Show' : 'Hide'}
            <ChevronDown size={14} className={cx('transition-transform', !collapsed && 'rotate-180')} aria-hidden />
          </button>
        </div>
      </header>

      <div id="nearby-body" hidden={collapsed}>
        {!located && (
          <p className="border-t border-p1-border px-4 py-4 text-[13.5px] leading-5 text-p1-text-3 sm:px-5">
            Select a valid property location to see nearby places.
          </p>
        )}

        {located && state.status === 'error' && <Unavailable reason={state.reason} onRetry={retry} />}

        {located && state.status === 'ready' && nearbyAllUnavailable(state.lookup) && (
          <Unavailable reason="None of the location datasets answered." onRetry={retry} />
        )}

        {located && (state.status === 'loading'
          || (state.status === 'ready' && !nearbyAllUnavailable(state.lookup))) && (
          <>
            <CategoryTabs
              picked={picked}
              onPick={(c) => { setPicked(c); setChosen(null); }}
              lookup={state.status === 'ready' ? state.lookup : null}
            />

            <div className="grid border-t border-p1-border lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
              <div className="flex min-w-0 flex-col lg:border-r lg:border-p1-border">
                <PanelHead
                  category={picked}
                  count={state.status === 'ready' ? shown.length : null}
                  radius={radius}
                  options={options}
                  onRadius={(m) => setRadii((r) => ({ ...r, [picked]: m }))}
                />

                {selected && (
                  <RouteStrip
                    place={selected}
                    travel={travel}
                    onTravel={setTravel}
                    route={route}
                    routing={routing}
                    onClear={() => setChosen(null)}
                  />
                )}

                {state.status === 'loading'
                  ? <LoadingRows />
                  : (
                    <PlaceList
                      group={group}
                      radius={radius}
                      places={shown}
                      chosen={chosen}
                      onChoose={(p) => setChosen((c) => (c === placeKey(p) ? null : placeKey(p)))}
                    />
                  )}
              </div>

              {state.status === 'ready' && lat !== undefined && lng !== undefined ? (
                <NearbyMap
                  key={picked}
                  lat={lat}
                  lng={lng}
                  label={label}
                  places={shown}
                  category={picked}
                  selected={selected}
                  route={route}
                  onSelect={choose}
                  className="order-first border-b border-p1-border lg:order-none lg:border-b-0"
                />
              ) : (
                <Skeleton className="order-first h-[260px] w-full rounded-none lg:order-none lg:h-auto lg:min-h-[340px]" />
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ tabs */

function CategoryTabs({
  picked,
  onPick,
  lookup,
}: {
  picked: NearbyCategory;
  onPick: (c: NearbyCategory) => void;
  lookup: NearbyLookup | null;
}) {
  const strip = useRef<HTMLDivElement | null>(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  /* Arrows only when the strip actually overflows — on a wide screen the six
     categories fit and a pair of permanently dead buttons helps nobody.
     Measured from a ResizeObserver, which fires after the effect rather than
     inside it. */
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const measure = () => setEdge({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    return () => { observer.disconnect(); el.removeEventListener('scroll', measure); };
  }, []);

  const nudge = (by: number) => strip.current?.scrollBy({ left: by, behavior: 'smooth' });

  /* Left and right walk the strip, as a tab list is expected to. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const at = NEARBY_CATEGORIES.findIndex((c) => c.key === picked);
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = NEARBY_CATEGORIES[(at + step + NEARBY_CATEGORIES.length) % NEARBY_CATEGORIES.length];
    onPick(next.key);
    document.getElementById(`nearby-tab-${next.key}`)?.focus();
  };

  return (
    <div className="relative border-t border-p1-border">
      <div
        ref={strip}
        role="tablist"
        aria-label="Kinds of nearby place"
        onKeyDown={onKeyDown}
        className="flex snap-x gap-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {NEARBY_CATEGORIES.map(({ key, label }) => {
          const Icon = ICON[key];
          const on = key === picked;
          const group = lookup ? groupOf(lookup, key) : undefined;
          return (
            <button
              key={key}
              id={`nearby-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="nearby-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => onPick(key)}
              className={cx(
                'flex shrink-0 snap-start cursor-pointer flex-col items-center gap-1 border-b-2 px-3.5 py-2.5 text-[12.5px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-p1-ring',
                on ? 'border-p1-primary text-p1-primary' : 'border-transparent text-p1-text-3 hover:text-p1-text-2',
              )}
            >
              <Icon size={18} aria-hidden />
              <span className="whitespace-nowrap">{label}</span>
              {group?.status === 'unavailable' && <span className="sr-only"> — temporarily unavailable</span>}
            </button>
          );
        })}
      </div>

      {edge.left && <Arrow side="left" onClick={() => nudge(-200)} />}
      {edge.right && <Arrow side="right" onClick={() => nudge(200)} />}
    </div>
  );
}

function Arrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Scroll categories left' : 'Scroll categories right'}
      className={cx(
        'absolute top-0 flex h-full w-9 cursor-pointer items-center justify-center text-p1-text-2 outline-none focus-visible:ring-2 focus-visible:ring-p1-ring',
        side === 'left'
          ? 'left-0 bg-gradient-to-r from-p1-surface via-p1-surface to-transparent'
          : 'right-0 bg-gradient-to-l from-p1-surface via-p1-surface to-transparent',
      )}
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}

/* ----------------------------------------------------------------- panel */

function PanelHead({
  category,
  count,
  radius,
  options,
  onRadius,
}: {
  category: NearbyCategory;
  count: number | null;
  radius: number;
  options: number[];
  onRadius: (metres: number) => void;
}) {
  const { label, noun } = nearbyCategory(category);
  return (
    <div className="flex items-center justify-between gap-3 bg-p1-primary px-4 py-2.5 text-p1-primary-on">
      <div className="min-w-0">
        <div className="truncate text-[14px] font-semibold">{label}</div>
        <div className="truncate text-[12.5px] opacity-90">
          {count === null ? `Looking for ${noun}…` : `${count} ${count === 1 ? noun.replace(/s$/, '') : noun} within`}
        </div>
      </div>
      <label className="shrink-0">
        <span className="sr-only">Search radius for {label}</span>
        <select
          value={radius}
          onChange={(e) => onRadius(Number(e.target.value))}
          className="h-8 cursor-pointer rounded-md border border-white/40 bg-white/15 px-2 text-[12.5px] font-medium text-p1-primary-on outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {options.map((m) => (
            /* The menu is painted by the platform, not by us: give the options
               their own colours or they inherit white-on-white in dark mode. */
            <option key={m} value={m} className="bg-p1-surface text-p1-text">{formatRadius(m)}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** The route to the picked place: how to travel, how far it is, how long it takes. */
function RouteStrip({
  place,
  travel,
  onTravel,
  route,
  routing,
  onClear,
}: {
  place: NearbyPlace;
  travel: RouteMode;
  onTravel: (m: RouteMode) => void;
  route: RouteResult | null;
  routing: boolean;
  onClear: () => void;
}) {
  return (
    <div className="border-b border-p1-border bg-p1-primary-soft/70 px-4 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-p1-text">Route to {place.name}</div>
          <div aria-live="polite" className="mt-0.5 text-[12.5px] text-p1-text-2">
            {routing && 'Finding the route…'}
            {route?.status === 'ok' && (
              <>
                <span className="font-medium tabular-nums">{formatDistance(route.distanceMetres)}</span>
                {' · '}
                <span className="tabular-nums">{formatDuration(route.seconds)}</span>
                <span className="text-p1-text-3">
                  {` ${travel === 'walk' ? 'walk' : 'drive'} along the road${route.source === 'demo' ? ', illustrative' : ''}`}
                </span>
              </>
            )}
            {route?.status === 'failed' && <span className="text-p1-text-3">{route.reason}</span>}
            {route?.status === 'no_token' && <span className="text-p1-text-3">Routing is not configured on this server.</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div role="group" aria-label="How to travel" className="flex overflow-hidden rounded-lg border border-p1-border bg-p1-surface">
            {TRAVEL.map(({ mode, label: name, Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onTravel(mode)}
                aria-pressed={travel === mode}
                className={cx(
                  'inline-flex cursor-pointer items-center gap-1 px-2 py-1 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-p1-ring',
                  travel === mode ? 'bg-p1-primary text-p1-primary-on' : 'text-p1-text-2 hover:bg-p1-subtle',
                )}
              >
                <Icon size={13} aria-hidden />
                {name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear the route"
            className="cursor-pointer rounded-md p-1 text-p1-text-3 outline-none hover:bg-p1-surface hover:text-p1-text focus-visible:ring-2 focus-visible:ring-p1-ring"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaceList({
  group,
  radius,
  places,
  chosen,
  onChoose,
}: {
  group?: NearbyGroup;
  radius: number;
  places: NearbyPlace[];
  chosen: string | null;
  onChoose: (p: NearbyPlace) => void;
}) {
  if (group?.status === 'unavailable') {
    return (
      <div id="nearby-panel" role="tabpanel" className="px-4 py-5">
        <p className="text-[13.5px] leading-5 text-p1-text-2">Temporarily unavailable.</p>
        <p className="mt-1 text-[12.5px] leading-5 text-p1-text-3">{group.reason}</p>
        <p className="mt-1 text-[12.5px] leading-5 text-p1-text-3">You can still publish the listing.</p>
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <div id="nearby-panel" role="tabpanel" className="px-4 py-5">
        <p className="text-[13.5px] leading-5 text-p1-text-3">
          No nearby places found within {formatRadius(radius)}.
        </p>
      </div>
    );
  }

  return (
    <div id="nearby-panel" role="tabpanel" className="flex min-h-0 flex-1 flex-col">
      <ul className="max-h-[300px] flex-1 overflow-y-auto">
        {places.map((place) => {
          const on = chosen === placeKey(place);
          return (
            <li key={placeKey(place)}>
              <button
                type="button"
                onClick={() => onChoose(place)}
                aria-pressed={on}
                className={cx(
                  'flex w-full cursor-pointer items-baseline justify-between gap-4 border-b border-l-2 border-p1-border px-4 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-p1-ring',
                  on ? 'border-l-p1-primary bg-p1-primary-soft' : 'border-l-transparent hover:bg-p1-subtle',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] text-p1-text">{place.name}</span>
                  <span className="block truncate text-[12px] text-p1-text-3">
                    {place.detail}
                    {place.detail && on ? ' · ' : ''}
                    {on ? 'Route shown on the map' : ''}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] font-medium tabular-nums text-p1-text-2">
                  {formatDistance(place.distanceMetres)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {group?.status === 'ok' && (
        <p className="border-t border-p1-border px-4 py-2 text-[11.5px] leading-4 text-p1-text-3">{group.source}</p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- states */

function LoadingRows() {
  return (
    <ul className="px-4" aria-busy="true" aria-label="Loading nearby places">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-baseline justify-between gap-4 border-b border-p1-border py-3 last:border-b-0">
          <Skeleton className={cx('h-3.5', ['w-2/5', 'w-1/2', 'w-1/3', 'w-2/5'][i])} />
          <Skeleton className="h-3.5 w-12 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

function Unavailable({ reason, onRetry }: { reason: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-p1-border px-4 py-4 sm:px-5">
      <p className="text-[13.5px] leading-5 text-p1-text-2">
        Nearby places are temporarily unavailable.
        <span className="block text-[12.5px] text-p1-text-3">{reason}</span>
        <span className="block text-[12.5px] text-p1-text-3">You can still publish the listing.</span>
      </p>
      <Button size="sm" variant="outline" leftIcon={<RefreshCw size={14} />} onClick={onRetry}>Try again</Button>
    </div>
  );
}
