"use client";

/**
 * Pick a property by dropping a pin on the map.
 *
 * The other way into the address step is typing — a postal code or a street —
 * and it is the fast path when the agent knows the building. This is the path
 * for when they do not: a new launch with no postal code issued yet, a landed
 * property on a road with forty numbers, or a viewing they drove to and can
 * point at on a map but could not spell.
 *
 * The tiles are OneMap's own, from the Singapore Land Authority. They are free
 * and need no token, which is why the map works out of the box; the reverse
 * lookup that turns a pin into an address is the part OneMap gates behind a
 * registered key, so that is served by our own route and degrades to "tell me
 * the postal code" when the key is not configured yet.
 *
 * Leaflet is loaded dynamically because it touches `window` at import time and
 * would break the server render.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { Crosshair, Loader2, MapPin, Search, Undo2 } from 'lucide-react';
import type { AddressMatch } from '../../../lib/phase1/onemap';
import { cx } from '../kit';

/** Roughly the middle of the island, framed so the whole of it is in view. */
const CENTRE: [number, number] = [1.3521, 103.8198];
const BOUNDS: [[number, number], [number, number]] = [
  [1.144, 103.535],
  [1.494, 104.103],
];

type Resolution =
  | { state: 'idle' }
  | { state: 'resolving' }
  | { state: 'matched'; match: AddressMatch }
  | { state: 'needs_postal'; lat: number; lng: number; reason: string }
  | { state: 'failed'; reason: string };

export function LocationPicker({
  onPick,
  initial,
}: {
  onPick: (match: AddressMatch) => void;
  initial?: { lat?: number; lng?: number };
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const pin = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [resolution, setResolution] = useState<Resolution>({ state: 'idle' });
  const [postal, setPostal] = useState('');
  const [checking, setChecking] = useState(false);

  /* ------------------------------------------------------------ resolving */

  const resolve = useCallback(async (lat: number, lng: number) => {
    setResolution({ state: 'resolving' });
    try {
      const res = await fetch(`/api/phase1/address/reverse?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`);
      const body = (await res.json()) as
        | { status: 'matched'; match: AddressMatch }
        | { status: 'needs_postal'; reason: string }
        | { status: 'failed'; reason: string };

      if (body.status === 'matched') {
        setResolution({ state: 'matched', match: body.match });
        onPick(body.match);
        return;
      }
      if (body.status === 'needs_postal') {
        setResolution({ state: 'needs_postal', lat, lng, reason: body.reason });
        return;
      }
      setResolution({ state: 'failed', reason: body.reason });
    } catch {
      setResolution({ state: 'failed', reason: 'Could not reach the address service.' });
    }
  }, [onPick]);

  /* ---------------------------------------------------------------- map */

  useEffect(() => {
    let disposed = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (disposed || !holder.current || map.current) return;

      const instance = L.map(holder.current, {
        center: initial?.lat && initial?.lng ? [initial.lat, initial.lng] : CENTRE,
        zoom: initial?.lat ? 17 : 11,
        minZoom: 11,
        maxZoom: 19,
        maxBounds: BOUNDS,
        maxBoundsViscosity: 0.9,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
        detectRetina: true,
        maxZoom: 19,
        minZoom: 11,
        // Required by the OneMap terms of use, and true: this is their map.
        attribution:
          '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noreferrer">OneMap</a> © Singapore Land Authority',
      }).addTo(instance);

      // A pin drawn in CSS rather than Leaflet's default image, which 404s
      // under a bundler unless the icon paths are rewritten.
      const icon = L.divIcon({
        className: '',
        html:
          '<span style="display:block;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);' +
          'background:#2563EB;border:3px solid #fff;box-shadow:0 4px 10px rgba(16,24,40,.35)"></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const place = (lat: number, lng: number) => {
        if (pin.current) pin.current.setLatLng([lat, lng]);
        else pin.current = L.marker([lat, lng], { icon, draggable: true }).addTo(instance);
        pin.current.off('dragend');
        pin.current.on('dragend', () => {
          const p = pin.current!.getLatLng();
          void resolve(p.lat, p.lng);
        });
        void resolve(lat, lng);
      };

      instance.on('click', (e) => place(e.latlng.lat, e.latlng.lng));
      if (initial?.lat !== undefined && initial?.lng !== undefined) {
        pin.current = L.marker([initial.lat, initial.lng], { icon, draggable: true }).addTo(instance);
      }

      map.current = instance;
      setReady(true);
      // Leaflet measures the container on creation; inside a step that was
      // just revealed the height is still settling, so measure again.
      setTimeout(() => instance.invalidateSize(), 120);
    })();

    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
      pin.current = null;
    };
    // Mounted once. `initial` is the starting view, not a live input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------- postal-code fallback path */

  const confirmPostal = async () => {
    if (resolution.state !== 'needs_postal' || !/^\d{6}$/.test(postal)) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/phase1/address?q=${postal}`);
      const body = (await res.json()) as { results?: AddressMatch[] };
      const hit = body.results?.[0];
      if (!hit) {
        setResolution({ ...resolution, reason: 'No building in the address register has that postal code.' });
        return;
      }
      // The pin is where the agent said the property is; the postal code
      // supplies the name and the district. Keep both.
      const match: AddressMatch = { ...hit, lat: resolution.lat, lng: resolution.lng };
      setResolution({ state: 'matched', match });
      onPick(match);
    } catch {
      setResolution({ ...resolution, reason: 'Could not reach the address service.' });
    } finally {
      setChecking(false);
    }
  };

  const reset = () => {
    if (pin.current && map.current) {
      map.current.removeLayer(pin.current);
      pin.current = null;
    }
    setPostal('');
    setResolution({ state: 'idle' });
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl ring-1 ring-p1-border">
        <div ref={holder} className="h-[340px] w-full bg-p1-subtle sm:h-[400px]" />

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-p1-subtle text-[13.5px] text-p1-text-3">
            <Loader2 size={15} className="animate-spin" aria-hidden />
            Loading the map
          </div>
        )}

        {ready && resolution.state === 'idle' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-p1-text/85 px-3.5 py-2 text-[12.5px] font-medium text-white backdrop-blur">
              <Crosshair size={13} aria-hidden />
              Tap the building. Drag the pin to correct it.
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------- the answer */}

      {resolution.state === 'resolving' && (
        <p className="mt-3 inline-flex items-center gap-2 text-[13.5px] text-p1-text-2">
          <Loader2 size={14} className="animate-spin" aria-hidden />
          Looking up what is at that point…
        </p>
      )}

      {resolution.state === 'matched' && (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-p1-success-border bg-p1-success-soft/60 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13.5px] font-semibold text-p1-text">
              <MapPin size={15} className="text-p1-success" aria-hidden />
              {resolution.match.project || 'Property'}
            </div>
            <p className="mt-1 text-[13.5px] leading-5 text-p1-text-2">
              {resolution.match.label}
              {resolution.match.postal && ` · Singapore ${resolution.match.postal}`}
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold text-p1-text-2 hover:bg-p1-surface hover:text-p1-text"
          >
            <Undo2 size={13} aria-hidden />
            Pick again
          </button>
        </div>
      )}

      {resolution.state === 'needs_postal' && (
        <div className="mt-3 rounded-xl border border-p1-border bg-p1-subtle p-4">
          <div className="text-[13.5px] font-semibold text-p1-text">Pin dropped. One thing left.</div>
          <p className="mt-1 text-[13px] leading-5 text-p1-text-2">
            {resolution.reason} Type the six-digit postal code and the rest — building, street and district — is filled
            in from the address register, with the pin you dropped kept as the position.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              inputMode="numeric"
              maxLength={6}
              value={postal}
              onChange={(e) => setPostal(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void confirmPostal())}
              placeholder="018987"
              aria-label="Postal code"
              className="h-10 w-[140px] rounded-lg border border-p1-border-strong bg-p1-surface px-4 text-[14px] tabular-nums text-p1-text outline-none focus:border-p1-primary focus:ring-2 focus:ring-p1-ring"
            />
            <button
              type="button"
              onClick={() => void confirmPostal()}
              disabled={!/^\d{6}$/.test(postal) || checking}
              className={cx(
                'inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-4 text-[14px] font-medium text-p1-primary-on transition-colors',
                /^\d{6}$/.test(postal) && !checking ? 'bg-p1-primary hover:bg-p1-primary-hover' : 'cursor-not-allowed bg-p1-primary/40',
              )}
            >
              {checking ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Search size={15} aria-hidden />}
              Confirm
            </button>
            <span className="text-[12.5px] tabular-nums text-p1-text-3">
              {resolution.lat.toFixed(5)}, {resolution.lng.toFixed(5)}
            </span>
          </div>
        </div>
      )}

      {resolution.state === 'failed' && (
        <p className="mt-3 text-[13.5px] text-p1-danger">{resolution.reason}</p>
      )}
    </div>
  );
}
