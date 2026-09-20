"use client";

/**
 * The nearby places of one category, drawn around the property, with the route
 * to whichever one the agent has clicked.
 *
 * The same OneMap tiles and the same dynamically-imported Leaflet as the
 * address picker next to it — a second mapping library for a second map would
 * be two megabytes to say the same thing.
 *
 * A small figure walks the route, or a car drives it, so the length of the
 * journey is felt rather than only read. It is decoration over a line that is
 * already drawn, and it stops for anyone who asks for less motion.
 *
 * The map is the picture; the list beside it is the content. Everything here
 * is reachable from the list, so a screen reader loses nothing by skipping it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';
import { Loader2, Maximize2, Minimize2, Crosshair } from 'lucide-react';
import { cx } from '../kit';
import type { RouteResult } from '../../../lib/phase1/directions';
import {
  formatDistance, metresApart, nearbyCategory, placeKey, type NearbyCategory, type NearbyPlace,
} from '../../../lib/phase1/nearby';

/**
 * One colour per category, fixed rather than themed: these are painted onto
 * OneMap's tiles, which look the same whichever theme the application is in.
 */
const PIN: Record<NearbyCategory, string> = {
  transport: '#2563EB',
  schools: '#0284C7',
  healthcare: '#E11D48',
  food: '#D97706',
  parks: '#15803D',
  community: '#7C3AED',
};

const TILES = 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noreferrer">OneMap</a> © Singapore Land Authority';

/** One loop of the traveller, in seconds: longer for a longer journey, within reason. */
const loopSeconds = (metres: number) => Math.min(16, Math.max(5, metres / 130));

export function NearbyMap({
  lat,
  lng,
  places,
  category,
  label,
  selected,
  route,
  onSelect,
  className = '',
}: {
  lat: number;
  lng: number;
  places: NearbyPlace[];
  category: NearbyCategory;
  label?: string;
  selected: NearbyPlace | null;
  route: RouteResult | null;
  onSelect: (place: NearbyPlace) => void;
  className?: string;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const pins = useRef<LayerGroup | null>(null);
  const line = useRef<LayerGroup | null>(null);

  const [ready, setReady] = useState(false);
  const [big, setBig] = useState(false);

  /* Created once. The property does not move while the section is open; when
     the address changes the wizard remounts this with a new key. */
  useEffect(() => {
    let disposed = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (disposed || !holder.current || map.current) return;

      const instance = L.map(holder.current, {
        center: [lat, lng],
        zoom: 15,
        minZoom: 11,
        maxZoom: 18,
        zoomControl: true,
        attributionControl: true,
        /* The panel sits in a long form. A wheel over the map should scroll
           the page; the map zooms on its own controls. */
        scrollWheelZoom: false,
      });

      L.tileLayer(TILES, { detectRetina: true, maxZoom: 18, minZoom: 11, attribution: ATTRIBUTION }).addTo(instance);

      /* The property, drawn differently from everything else: a teardrop
         against circles, so which pin is the home never depends on colour. */
      L.marker([lat, lng], {
        title: label ?? 'This property',
        zIndexOffset: 500,
        icon: L.divIcon({
          className: '',
          html:
            '<span style="display:block;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);'
            + 'background:#111827;border:3px solid #fff;box-shadow:0 4px 10px rgba(16,24,40,.35)"></span>',
          iconSize: [26, 26],
          iconAnchor: [13, 26],
        }),
      }).addTo(instance);

      line.current = L.layerGroup().addTo(instance);
      pins.current = L.layerGroup().addTo(instance);
      map.current = instance;
      setReady(true);
      // Leaflet measures its container on creation; inside a panel that has
      // just been revealed the height is still settling, so measure again.
      setTimeout(() => instance.invalidateSize(), 120);
    })();

    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
      pins.current = null;
      line.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the starting view, not a live input
  }, []);

  /* Re-measure after the box changes height, or Leaflet paints grey gutters. */
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => map.current?.invalidateSize(), 220);
    return () => clearTimeout(timer);
  }, [ready, big]);

  /** Everything shown, in frame — the route when there is one, the pins when there is not. */
  const frame = useCallback(async () => {
    const L = (await import('leaflet')).default;
    if (!map.current) return;
    const points: [number, number][] = route?.status === 'ok' && route.path.length
      ? route.path
      : [[lat, lng], ...places.map((p) => [p.lat, p.lng] as [number, number])];
    /* One place on top of the property is a bounds of zero size, which Leaflet
       fits at maximum zoom. Pad it into something readable. */
    map.current.fitBounds(L.latLngBounds(points).pad(0.22), { maxZoom: 17, animate: true });
  }, [lat, lng, places, route]);

  /* Markers follow the chosen category, the radius, and which place is picked. */
  useEffect(() => {
    if (!ready || !map.current || !pins.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !map.current || !pins.current) return;

      pins.current.clearLayers();
      const colour = PIN[category];
      for (const place of places) {
        const on = selected ? placeKey(selected) === placeKey(place) : false;
        const size = on ? 22 : 15;
        L.marker([place.lat, place.lng], {
          title: `${place.name} — ${formatDistance(place.distanceMetres)} from the property`,
          zIndexOffset: on ? 400 : 0,
          keyboard: false,
          icon: L.divIcon({
            className: '',
            html:
              `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${colour};`
              + `border:${on ? 3 : 2.5}px solid #fff;box-shadow:0 2px 6px rgba(16,24,40,.4)${on ? `;outline:3px solid ${colour}55` : ''}"></span>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
        })
          .bindTooltip(`${place.name} · ${formatDistance(place.distanceMetres)}`, { direction: 'top', offset: [0, -8] })
          .on('click', () => onSelect(place))
          .addTo(pins.current!);
      }
    })();

    return () => { cancelled = true; };
  }, [ready, places, category, selected, onSelect]);

  /* The route to the picked place, and the figure travelling it. */
  useEffect(() => {
    if (!ready || !map.current || !line.current) return;
    let cancelled = false;
    let frameId = 0;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !map.current || !line.current) return;

      line.current.clearLayers();
      if (route?.status !== 'ok' || route.path.length < 2) return;
      const path = route.path;

      /* Drawn twice: a white casing under a coloured line, so the route stays
         legible over a park, a motorway and a built-up block alike. */
      L.polyline(path, { color: '#FFFFFF', weight: 8, opacity: 0.9, lineCap: 'round' }).addTo(line.current);
      L.polyline(path, {
        color: PIN[category],
        weight: 4,
        opacity: 1,
        lineCap: 'round',
        dashArray: route.mode === 'walk' ? '1 7' : undefined,
      }).addTo(line.current);

      map.current.fitBounds(L.latLngBounds(path).pad(0.22), { maxZoom: 17, animate: true });

      /* ----------------------------------------------------- the traveller */

      const walking = route.mode === 'walk';
      const traveller = L.marker(path[0], {
        interactive: false,
        keyboard: false,
        zIndexOffset: 600,
        icon: L.divIcon({
          className: '',
          html:
            '<span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;'
            + 'border-radius:999px;background:#fff;box-shadow:0 2px 7px rgba(16,24,40,.45);font-size:14px;'
            + `line-height:1;will-change:transform">${walking ? '🚶' : '🚗'}</span>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).addTo(line.current);

      /* How far along the route each vertex sits, so the figure travels at an
         even pace rather than jumping between widely spaced points. */
      const legs: number[] = [];
      let total = 0;
      for (let i = 1; i < path.length; i += 1) {
        const d = Math.max(1, metresApart(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]));
        legs.push(d);
        total += d;
      }

      const still = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (still) return;

      const period = loopSeconds(total) * 1000;
      const started = performance.now();

      const step = (now: number) => {
        if (cancelled || !line.current) return;
        /* A pause at the end of each run, so the journey reads as
           start-to-finish rather than as a loop with no beginning. */
        const t = Math.min(1, ((now - started) % (period + 900)) / period);

        let travelled = t * total;
        let at = 0;
        while (at < legs.length - 1 && travelled > legs[at]) { travelled -= legs[at]; at += 1; }
        const along = Math.min(1, travelled / legs[at]);
        const [aLat, aLng] = path[at];
        const [bLat, bLng] = path[at + 1];
        traveller.setLatLng([aLat + (bLat - aLat) * along, aLng + (bLng - aLng) * along]);

        const el = traveller.getElement()?.firstElementChild as HTMLElement | undefined;
        if (el) {
          /* Both glyphs face left as drawn, so a journey heading east is
             mirrored. The walker also takes a short bob with each step. */
          const facing = bLng < aLng ? 1 : -1;
          const bob = walking ? Math.sin((now - started) / 110) * 2 : 0;
          el.style.transform = `translateY(${bob.toFixed(2)}px) scaleX(${facing})`;
        }
        frameId = requestAnimationFrame(step);
      };
      frameId = requestAnimationFrame(step);
    })();

    return () => { cancelled = true; if (frameId) cancelAnimationFrame(frameId); };
  }, [ready, route, category]);

  return (
    <div
      className={cx(
        'relative w-full overflow-hidden bg-p1-subtle transition-[height]',
        big ? 'h-[520px] lg:h-[560px]' : 'h-[260px] lg:h-full lg:min-h-[340px]',
        className,
      )}
    >
      <div
        ref={holder}
        className="h-full w-full"
        role="img"
        aria-label={
          places.length
            ? `Map of the property and ${places.length} nearby ${nearbyCategory(category).label.toLowerCase()} places. The same places are listed beside it.`
            : 'Map of the property.'
        }
      />

      {ready && (
        <div className="absolute right-2 top-2 z-[400] flex overflow-hidden rounded-lg border border-p1-border bg-p1-surface/95 shadow-p1-sm backdrop-blur">
          <button
            type="button"
            onClick={() => void frame()}
            className="cursor-pointer px-2 py-1.5 text-p1-text-2 outline-none hover:bg-p1-subtle hover:text-p1-text focus-visible:ring-2 focus-visible:ring-p1-ring"
            title="Fit everything shown into view"
          >
            <Crosshair size={15} aria-hidden />
            <span className="sr-only">Fit everything shown into view</span>
          </button>
          <button
            type="button"
            onClick={() => setBig((v) => !v)}
            aria-pressed={big}
            className="cursor-pointer border-l border-p1-border px-2 py-1.5 text-p1-text-2 outline-none hover:bg-p1-subtle hover:text-p1-text focus-visible:ring-2 focus-visible:ring-p1-ring"
            title={big ? 'Shrink the map' : 'Enlarge the map'}
          >
            {big ? <Minimize2 size={15} aria-hidden /> : <Maximize2 size={15} aria-hidden />}
            <span className="sr-only">{big ? 'Shrink the map' : 'Enlarge the map'}</span>
          </button>
        </div>
      )}

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-p1-subtle text-[13px] text-p1-text-3">
          <Loader2 size={15} className="animate-spin" aria-hidden />
          Loading the map
        </div>
      )}
    </div>
  );
}
