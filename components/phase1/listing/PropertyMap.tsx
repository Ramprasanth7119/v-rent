"use client";

/**
 * Where the property is, drawn by OneMap.
 *
 * Shown wherever an address has been matched — the wizard, the listing, the
 * shared page — because "2 Marina Boulevard" means nothing to someone who does
 * not already know the building, and a picture of the spot does.
 */

import { MapPin } from 'lucide-react';
import { cx } from '../kit';

export function PropertyMap({
  lat,
  lng,
  label,
  height = 220,
  className = '',
}: {
  lat?: number;
  lng?: number;
  label?: string;
  height?: number;
  className?: string;
}) {
  if (lat === undefined || lng === undefined) return null;
  // OneMap caps a static image at 512 square, so the picture is requested at
  // that and stretched; a map at this size loses nothing by it.
  const src = `/api/phase1/map?lat=${lat}&lng=${lng}&w=512&h=${Math.min(512, Math.round(height * 1.6))}`;

  return (
    <figure className={cx('overflow-hidden rounded-xl border border-p1-border bg-p1-subtle', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- proxied from OneMap, fixed size, must print */}
      <img src={src} alt={label ? `Map showing ${label}` : 'Map of the property'} className="w-full object-cover" style={{ height }} loading="lazy" />
      <figcaption className="flex items-center justify-between gap-3 border-t border-p1-border px-3.5 py-2 text-[12.5px] text-p1-text-3">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin size={13} className="shrink-0" aria-hidden />
          <span className="truncate">{label ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`}</span>
        </span>
        <span className="shrink-0">OneMap · SLA</span>
      </figcaption>
    </figure>
  );
}
