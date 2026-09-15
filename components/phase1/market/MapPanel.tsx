"use client";

/**
 * The map beside the results.
 *
 * OneMap's own tiles, price pins drawn in CSS so they follow the theme, and
 * pins that would overlap are grouped into a count at the current zoom. A
 * group opens by zooming to fit it. Hovering a card lights its pin, and
 * choosing a pin tells the page which listing was chosen.
 *
 * Leaflet is loaded after mount because it touches `window` at import time.
 */

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { LatLngBounds, Map as LeafletMap, Marker, LayerGroup } from 'leaflet';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, Search } from 'lucide-react';
import { cx } from '../kit';

export interface MapItem {
  key: string;
  lat: number;
  lng: number;
  label: string;
  href?: string;
}

const CENTRE: [number, number] = [1.3521, 103.8198];
const BOUNDS: [[number, number], [number, number]] = [[1.13, 103.5], [1.5, 104.12]];
const CELL = 58;

export function MapPanel({
  items, activeKey = null, onSelect, onBounds, fitKey, interactive = true, navigate = false, className = '', showAreaSearch = false,
}: {
  items: MapItem[];
  activeKey?: string | null;
  onSelect?: (key: string) => void;
  /** Called when the visitor asks to search the area they have moved to. */
  onBounds?: (b: { north: number; south: number; east: number; west: number }) => void;
  /** Changing this refits the map to the items. */
  fitKey?: string;
  interactive?: boolean;
  /** Open the listing when its pin is chosen. */
  navigate?: boolean;
  className?: string;
  showAreaSearch?: boolean;
}) {
  const router = useRouter();
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const pins = useRef(new Map<string, Marker>());
  const L = useRef<typeof import('leaflet') | null>(null);
  const programmatic = useRef(false);
  const [ready, setReady] = useState(false);
  const [moved, setMoved] = useState(false);

  // The latest values, for handlers Leaflet holds from the first render.
  const latest = useRef({ items, activeKey, onSelect, navigate, router });
  useEffect(() => { latest.current = { items, activeKey, onSelect, navigate, router }; });

  const draw = () => {
    const m = map.current, lib = L.current, group = layer.current;
    if (!m || !lib || !group) return;
    group.clearLayers();
    pins.current.clear();

    const zoom = m.getZoom();
    const cells = new Map<string, MapItem[]>();
    for (const it of latest.current.items) {
      const p = m.project([it.lat, it.lng], zoom);
      const id = `${Math.floor(p.x / CELL)}:${Math.floor(p.y / CELL)}`;
      cells.set(id, [...(cells.get(id) ?? []), it]);
    }

    for (const members of cells.values()) {
      if (members.length === 1 || zoom >= 17) {
        for (const it of members) {
          const active = latest.current.activeKey === it.key;
          const marker = lib.marker([it.lat, it.lng], {
            icon: lib.divIcon({ className: 'p1-marker', html: `<span class="p1-pin${active ? ' is-active' : ''}">${it.label}</span>`, iconSize: [0, 0], iconAnchor: [0, 0] }),
            keyboard: true,
            title: it.label,
            riseOnHover: true,
            zIndexOffset: active ? 1000 : 0,
          });
          marker.on('click', () => {
            const cur = latest.current;
            cur.onSelect?.(it.key);
            if (cur.navigate && it.href) cur.router.push(it.href);
          });
          marker.addTo(group);
          pins.current.set(it.key, marker);
        }
        continue;
      }
      const lat = members.reduce((n, i) => n + i.lat, 0) / members.length;
      const lng = members.reduce((n, i) => n + i.lng, 0) / members.length;
      const cluster = lib.marker([lat, lng], {
        icon: lib.divIcon({ className: 'p1-marker', html: `<span class="p1-cluster" aria-label="${members.length} homes">${members.length}</span>`, iconSize: [0, 0], iconAnchor: [0, 0] }),
        keyboard: true,
        title: `${members.length} homes — zoom in`,
      });
      cluster.on('click', () => {
        programmatic.current = true;
        m.fitBounds(lib.latLngBounds(members.map((i) => [i.lat, i.lng] as [number, number])), { padding: [70, 70], maxZoom: 17, animate: true });
      });
      cluster.addTo(group);
    }
  };

  const fit = () => {
    const m = map.current, lib = L.current;
    const list = latest.current.items;
    if (!m || !lib) return;
    programmatic.current = true;
    if (list.length === 0) { m.setView(CENTRE, 11, { animate: true }); return; }
    if (list.length === 1) { m.setView([list[0].lat, list[0].lng], 15, { animate: true }); return; }
    m.fitBounds(lib.latLngBounds(list.map((i) => [i.lat, i.lng] as [number, number])), { padding: [48, 48], maxZoom: 15, animate: true });
  };

  useEffect(() => {
    let disposed = false;
    (async () => {
      const lib = (await import('leaflet')).default;
      if (disposed || !holder.current || map.current) return;
      L.current = lib;
      const m = lib.map(holder.current, {
        center: CENTRE,
        zoom: 11,
        minZoom: 11,
        maxZoom: 19,
        maxBounds: BOUNDS,
        maxBoundsViscosity: 0.9,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        keyboard: interactive,
        attributionControl: true,
        zoomAnimation: true,
        fadeAnimation: true,
      });
      if (interactive) m.zoomControl.setPosition('topright');
      lib.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
        detectRetina: true,
        maxZoom: 19,
        minZoom: 11,
        attribution: '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noreferrer">OneMap</a> © Singapore Land Authority',
      }).addTo(m);
      layer.current = lib.layerGroup().addTo(m);
      m.on('zoomend', draw);
      m.on('moveend', () => {
        if (programmatic.current) { programmatic.current = false; return; }
        setMoved(true);
      });
      map.current = m;
      fit();
      draw();
      setReady(true);
      setTimeout(() => m.invalidateSize(), 150);
    })();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.current?.invalidateSize()) : null;
    if (holder.current) ro?.observe(holder.current);

    return () => {
      disposed = true;
      ro?.disconnect();
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
    // Mounted once; items and the active pin are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new result set redraws the pins and, when asked, reframes the map. Both
  // run after the effect above has handed Leaflet's handlers the new items.
  useEffect(() => { draw(); }, [items]);
  useEffect(() => {
    if (!ready) return;
    fit();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the reframe is ours, so "search this area" no longer applies
    setMoved(false);
  }, [fitKey, ready]);

  // Lighting a pin does not rebuild the layer.
  useEffect(() => {
    for (const [key, marker] of pins.current) {
      const el = marker.getElement()?.querySelector('.p1-pin');
      const on = key === activeKey;
      el?.classList.toggle('is-active', on);
      marker.setZIndexOffset(on ? 1000 : 0);
    }
  }, [activeKey]);

  const searchArea = () => {
    const b: LatLngBounds | undefined = map.current?.getBounds();
    if (!b || !onBounds) return;
    onBounds({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    setMoved(false);
  };

  return (
    <div className={cx('relative overflow-hidden bg-p1-subtle', className)}>
      <div ref={holder} className="absolute inset-0" aria-label="Map of listings" role="region" />
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-p1-subtle text-[13px] text-p1-text-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-p1-surface text-p1-text-3 shadow-p1-sm"><MapPin size={18} aria-hidden /></span>
          <span className="inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" aria-hidden /> Loading map</span>
        </div>
      )}
      {showAreaSearch && moved && onBounds && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center">
          <button type="button" onClick={searchArea} className="p1-panel pointer-events-auto inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-p1-surface px-4 text-[13px] font-semibold text-p1-text shadow-p1-lg ring-1 ring-p1-border hover:bg-p1-subtle">
            <Search size={14} aria-hidden /> Search this area
          </button>
        </div>
      )}
    </div>
  );
}
