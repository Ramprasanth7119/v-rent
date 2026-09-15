"use client";

import { MapPanel, type MapItem } from './MapPanel';

/** The home page's map: every live listing, a pin opens it. */
export function HeroMap({ items }: { items: MapItem[] }) {
  return <MapPanel items={items} navigate className="absolute inset-0" fitKey="hero" />;
}
