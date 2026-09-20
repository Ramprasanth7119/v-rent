"use client";

/**
 * What is around a home, on the public listing page.
 *
 * The places themselves are found on the server and handed down whole, so this
 * draws rather than fetches. The one thing it does go and ask for is a route,
 * and only when a visitor picks a place: the panel shows a distance for
 * everything and a travel time for nothing until somebody asks for one, at
 * which point OneMap is asked for the actual route and the minutes come back
 * measured.
 *
 * That is the whole reason this component exists. What it replaced multiplied
 * the straight-line distance by 1.3, divided by a walking pace and printed the
 * result as "4 min walk" — a number nobody had measured, about a route nobody
 * had taken, on the page where a tenant decides whether a flat is near enough
 * to the station to take. `lib/phase1/nearby.ts` says in its own source why no
 * helper for that exists, and this page is now the same shape as the wizard
 * the agent filled in.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Footprints, GraduationCap, HeartPulse, Library,
  Car, TrainFront, Trees, UtensilsCrossed, X,
} from 'lucide-react';
import {
  NEARBY_CATEGORIES, formatDistance, formatDuration, formatRadius, groupOf,
  nearbyAllUnavailable, nearbyCategory, placeKey, placesWithin, radiusOptions,
  type NearbyCategory, type NearbyLookup, type NearbyPlace,
} from '../../../lib/phase1/nearby';
import { demoDirections } from '../../../lib/phase1/nearby-demo';
import type { RouteMode, RouteResult } from '../../../lib/phase1/directions';
import { NearbyMap } from '../listing/NearbyMap';
import { cx } from '../kit';

const ICONS: Record<NearbyCategory, typeof TrainFront> = {
  transport: TrainFront,
  schools: GraduationCap,
  healthcare: HeartPulse,
  food: UtensilsCrossed,
  parks: Trees,
  community: Library,
};

/** How many a category found, for the tab. An unavailable source has no number. */
const countOf = (lookup: NearbyLookup, key: NearbyCategory): number | null => {
  const g = groupOf(lookup, key);
  return g && g.status === 'ok' ? g.items.length : null;
};

/* ------------------------------------------------------------------ tabs */

function Tabs({ lookup, tab, onTab }: { lookup: NearbyLookup; tab: NearbyCategory; onTab: (k: NearbyCategory) => void }) {
  const strip = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ start: true, end: false });

  /* The chevrons appear only where there is something to scroll to. Measured
     from the element rather than guessed from the count, because the count
     that overflows depends on the width of the names. */
  const measure = useCallback(() => {
    const el = strip.current;
    if (!el) return;
    setEnds({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener('scroll', measure); };
  }, [measure]);

  const nudge = (d: number) => strip.current?.scrollBy({ left: d * 220, behavior: 'smooth' });

  return (
    <div className="relative border-b border-p1-border">
      {!ends.start && (
        <button type="button" onClick={() => nudge(-1)} aria-label="Scroll categories left"
          className="absolute left-0 top-0 z-[1] flex h-full w-9 cursor-pointer items-center justify-start bg-gradient-to-r from-p1-surface via-p1-surface to-transparent text-p1-text-2 sm:hidden">
          <ChevronLeft size={17} />
        </button>
      )}
      <div ref={strip} role="tablist" aria-label="Nearby categories" className="p1-noscrollbar flex overflow-x-auto">
        {NEARBY_CATEGORIES.map(({ key, label }) => {
          const Icon = ICONS[key];
          const n = countOf(lookup, key);
          const on = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onTab(key)}
              className={cx(
                'relative flex min-w-[88px] flex-1 shrink-0 cursor-pointer flex-col items-center gap-1 px-3 py-2.5 text-[12px] font-medium transition-colors duration-150',
                on ? 'text-p1-primary' : 'text-p1-text-3 hover:text-p1-text',
              )}
            >
              <Icon size={19} aria-hidden />
              <span className="whitespace-nowrap">{label}</span>
              <span className="text-[11px] tabular-nums text-p1-text-3">{n === null ? '—' : n}</span>
              <span className={cx('absolute inset-x-2 bottom-0 h-0.5 origin-center rounded-full bg-p1-primary transition-transform duration-200', on ? 'scale-x-100' : 'scale-x-0')} aria-hidden />
            </button>
          );
        })}
      </div>
      {!ends.end && (
        <button type="button" onClick={() => nudge(1)} aria-label="Scroll categories right"
          className="absolute right-0 top-0 z-[1] flex h-full w-9 cursor-pointer items-center justify-end bg-gradient-to-l from-p1-surface via-p1-surface to-transparent text-p1-text-2 sm:hidden">
          <ChevronRight size={17} />
        </button>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- route */

type RouteState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'error'; reason: string }
  | { status: 'ready'; result: RouteResult };

function RouteStrip({
  place, travel, onTravel, state, onClear,
}: {
  place: NearbyPlace;
  travel: RouteMode;
  onTravel: (m: RouteMode) => void;
  state: RouteState;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-p1-border bg-p1-primary-soft px-4 py-2.5">
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-p1-text">{place.name}</span>

      <div role="tablist" aria-label="How to travel" className="inline-flex rounded-lg bg-p1-surface p-0.5 ring-1 ring-p1-border">
        {([['walk', Footprints, 'Walk'], ['drive', Car, 'Drive']] as const).map(([m, Icon, label]) => (
          <button key={m} type="button" role="tab" aria-selected={travel === m} onClick={() => onTravel(m)}
            className={cx('inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors',
              travel === m ? 'bg-p1-primary text-p1-primary-on' : 'text-p1-text-2 hover:text-p1-text')}>
            <Icon size={13} aria-hidden /> {label}
          </button>
        ))}
      </div>

      <span className="text-[13px] tabular-nums text-p1-text-2" aria-live="polite">
        {state.status === 'loading' && 'Measuring the route…'}
        {state.status === 'error' && state.reason}
        {state.status === 'ready' && (
          <>
            <span className="font-semibold text-p1-text">{formatDuration(state.result.status === 'ok' ? state.result.seconds : NaN)}</span>
            {state.result.status === 'ok' && <> · {formatDistance(state.result.distanceMetres)} along the route</>}
          </>
        )}
      </span>

      <button type="button" onClick={onClear} aria-label="Clear the route"
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-p1-text-3 hover:bg-p1-surface hover:text-p1-text">
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ list */

function PlaceList({
  places, chosen, onChoose, emptyWithin,
}: {
  places: NearbyPlace[];
  chosen: string | null;
  onChoose: (p: NearbyPlace) => void;
  emptyWithin: string;
}) {
  if (places.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-[13.5px] text-p1-text-3">
        Nothing of this kind within {emptyWithin}.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-p1-border">
      {places.map((p) => {
        const key = placeKey(p);
        const on = chosen === key;
        return (
          <li key={key}>
            <button type="button" onClick={() => onChoose(p)} aria-pressed={on}
              className={cx('flex w-full cursor-pointer items-baseline justify-between gap-4 px-4 py-2.5 text-left transition-colors duration-150',
                on ? 'bg-p1-primary-soft' : 'hover:bg-p1-subtle')}>
              <span className="min-w-0">
                <span className="block truncate text-[14px] text-p1-text">{p.name}</span>
                {p.detail && <span className="block truncate text-[12px] text-p1-text-3">{p.detail}</span>}
              </span>
              <span className="shrink-0 text-[13px] tabular-nums text-p1-text-2">{formatDistance(p.distanceMetres)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ----------------------------------------------------------------- panel */

export function NearbyPanel({
  lat, lng, label, lookup, demo = false,
}: {
  lat: number;
  lng: number;
  label?: string;
  lookup: NearbyLookup;
  /** Demo Data is on: the places are illustrative and the route is drawn here. */
  demo?: boolean;
}) {
  /* The first category that actually answered, so the panel does not open on
     an outage when five of the six are fine. */
  const opening = NEARBY_CATEGORIES.find((c) => (countOf(lookup, c.key) ?? 0) > 0)?.key
    ?? NEARBY_CATEGORIES[0].key;

  const [tab, setTab] = useState<NearbyCategory>(opening);
  const [radius, setRadius] = useState<number | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [travel, setTravel] = useState<RouteMode>('walk');
  const [answer, setAnswer] = useState<{ view: string; result?: RouteResult; error?: string } | null>(null);

  const group = groupOf(lookup, tab);
  const searched = group && group.status === 'ok' ? group.radiusMetres : 0;
  const within = radius ?? searched;
  const shown = placesWithin(group, within);
  const meta = nearbyCategory(tab);

  /* Derived rather than stored, so narrowing the radius past the chosen place
     drops the selection instead of leaving a route to something off the list. */
  const selected = shown.find((p) => placeKey(p) === chosen) ?? null;
  const view = selected ? `${placeKey(selected)}|${travel}|${demo ? 'demo' : 'live'}` : '';

  /* Demo Data never reaches the routing service; the illustrative route is
     built here from the same two points, and says so in its own source. */
  const demoLeg = demo && selected
    ? demoDirections({ lat, lng }, { lat: selected.lat, lng: selected.lng }, travel)
    : null;

  const routeState: RouteState = !selected ? { status: 'none' }
    : demoLeg ? { status: 'ready', result: demoLeg }
      : answer?.view !== view ? { status: 'loading' }
        : answer.error ? { status: 'error', reason: answer.error }
          : { status: 'ready', result: answer.result! };

  useEffect(() => {
    if (demo || !selected || answer?.view === view) return;
    const stop = new AbortController();
    const to = selected;
    const q = new URLSearchParams({
      fromLat: String(lat), fromLng: String(lng), toLat: String(to.lat), toLng: String(to.lng), mode: travel,
    });
    fetch(`/api/phase1/directions?${q}`, { signal: stop.signal })
      .then((r) => r.json() as Promise<RouteResult>)
      .then((result) => {
        if (stop.signal.aborted) return;
        setAnswer(result.status === 'ok'
          ? { view, result }
          : { view, error: result.status === 'no_token' ? 'Routing is not configured on this server.' : result.reason });
      })
      .catch((e: unknown) => {
        if ((e as Error)?.name === 'AbortError') return;
        setAnswer({ view, error: 'The route could not be measured.' });
      });
    return () => stop.abort();
  }, [view, demo, selected, answer?.view, lat, lng, travel]);

  const choose = useCallback((p: NearbyPlace) => {
    setChosen((cur) => (cur === placeKey(p) ? null : placeKey(p)));
  }, []);

  const onTab = useCallback((k: NearbyCategory) => {
    setTab(k);
    setRadius(null);
    setChosen(null);
  }, []);

  if (nearbyAllUnavailable(lookup)) {
    return (
      <div className="rounded-xl border border-p1-border bg-p1-surface px-4 py-6 text-center">
        <p className="text-[14px] font-medium text-p1-text">What is nearby could not be loaded</p>
        <p className="mt-1 text-[13px] text-p1-text-3">The national map services did not answer. This is not a quiet neighbourhood — it is an outage. Try again shortly.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-p1-border bg-p1-surface">
      <Tabs lookup={lookup} tab={tab} onTab={onTab} />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-p1-border px-4 py-2.5">
        <p className="text-[13.5px] text-p1-text">
          {group && group.status === 'ok' ? (
            <><span className="font-semibold tabular-nums">{shown.length}</span> {meta.noun} within {formatRadius(within)}</>
          ) : (
            <span className="text-p1-text-3">{meta.label} could not be loaded.</span>
          )}
        </p>
        {searched > 0 && (
          <label className="flex items-center gap-2 text-[12.5px] text-p1-text-3">
            <span>Within</span>
            <select
              value={within}
              onChange={(e) => { setRadius(Number(e.target.value)); setChosen(null); }}
              className="h-8 cursor-pointer rounded-lg border border-p1-border-strong bg-p1-surface px-2 text-[12.5px] font-medium text-p1-text focus:border-p1-primary focus:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none"
            >
              {radiusOptions(searched).map((m) => (
                <option key={m} value={m} className="bg-p1-surface text-p1-text">{formatRadius(m)}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {selected && (
        <RouteStrip place={selected} travel={travel} onTravel={setTravel} state={routeState} onClear={() => setChosen(null)} />
      )}

      {/* Stacked rather than side by side. This panel sits in the listing's
          content column, which is about 750px wide beside the enquiry panel —
          splitting that in two left a 430px map and a list too narrow for
          "Woodlands North MRT / Exit 1". Full width for each is better at
          every size, and it is the same layout on a phone. */}
      <div>
        <div className="max-h-[248px] overflow-y-auto">
          {group && group.status === 'ok'
            ? <PlaceList places={shown} chosen={chosen} onChoose={choose} emptyWithin={formatRadius(within)} />
            : <p className="px-4 py-8 text-center text-[13.5px] text-p1-text-3">{group?.status === 'unavailable' ? group.reason : 'Not available.'}</p>}
        </div>
        <NearbyMap
          lat={lat}
          lng={lng}
          places={shown}
          category={tab}
          label={label}
          selected={selected}
          route={routeState.status === 'ready' ? routeState.result : null}
          onSelect={choose}
          className="h-[280px] border-t border-p1-border sm:h-[340px]"
        />
      </div>

      <p className="border-t border-p1-border px-4 py-2.5 text-[12px] leading-5 text-p1-text-3">
        {group && group.status === 'ok' ? group.source : meta.source}. Distances are measured in a straight line;
        a travel time appears only for a route that was actually measured.
      </p>
    </div>
  );
}
