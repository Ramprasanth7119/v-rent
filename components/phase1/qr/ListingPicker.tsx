"use client";

/**
 * Choose the listing a code opens. A radio group rather than a dropdown,
 * because the photograph and the district are how an agent recognises a unit;
 * a search box appears once there are enough listings to need one.
 */

import React, { useMemo, useState } from 'react';
import { Check, Building2 } from 'lucide-react';
import { EmptyState, LinkButton, SearchInput, cx } from '../kit';
import { PropertyImage } from '../PropertyImage';
import { StatusBadge } from '../status';
import type { DemoListing } from '../../../lib/phase1/data';
import { priceLabel } from '../../../lib/phase1/pricing';
import { coverPhoto } from '../../../lib/phase1/photos';
import { districtName } from '../../../lib/phase1/performance';

const SEARCH_FROM = 6;

export function ListingPicker({ listings, value, onChange, ownerId }: {
  listings: DemoListing[]; value: string | null; onChange: (id: string) => void; ownerId?: string;
}) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => (needle
    ? listings.filter((l) => [l.project, l.unitNo, l.reference, l.address, districtName(l.district)].some((v) => v?.toLowerCase().includes(needle)))
    : listings), [listings, needle]);

  if (listings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-p1-border-strong">
        <EmptyState
          compact
          icon={<Building2 size={18} />}
          title="No live listings yet"
          description="A listing code opens the listing's public page, so the listing needs to be published first."
          action={<LinkButton href="/phase1/listings" variant="outline" size="sm">Go to listings</LinkButton>}
        />
      </div>
    );
  }

  const move = (e: React.KeyboardEvent, i: number) => {
    const next = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const target = shown[(next + shown.length) % shown.length];
    onChange(target.id);
    document.getElementById(`qr-listing-${target.id}`)?.focus();
  };

  return (
    <div className="grid gap-3">
      {listings.length >= SEARCH_FROM && (
        <SearchInput value={q} onChange={setQ} placeholder="Search listings" label="Search listings" size="sm" />
      )}
      {shown.length === 0 ? (
        <p className="rounded-lg bg-p1-subtle px-3.5 py-3 text-[13px] text-p1-text-3">No live listing matches “{q.trim()}”.</p>
      ) : (
        <div role="radiogroup" aria-label="Listing" className="grid max-h-[372px] gap-2 overflow-y-auto overscroll-contain p-0.5">
          {shown.map((l, i) => {
            const on = l.id === value;
            const p = priceLabel(l);
            return (
              <button
                key={l.id}
                id={`qr-listing-${l.id}`}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on || (!shown.some((x) => x.id === value) && i === 0) ? 0 : -1}
                onClick={() => onChange(l.id)}
                onKeyDown={(e) => move(e, i)}
                className={cx(
                  'group flex min-h-[64px] w-full cursor-pointer items-center gap-3 rounded-xl border p-2 pr-3 text-left transition-[border-color,background-color,box-shadow] duration-150 focus-visible:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none',
                  on ? 'border-p1-primary bg-p1-primary-soft/60' : 'border-p1-border bg-p1-surface hover:border-p1-border-strong hover:bg-p1-subtle/60',
                )}
              >
                <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg">
                  <PropertyImage seed={l.reference + l.project} src={coverPhoto(ownerId, l)} alt={l.project} rounded="rounded-lg" className="h-full w-full" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[14px] font-semibold text-p1-text">{l.project}</span>
                    {l.status !== 'published' && <StatusBadge kind="listing" value={l.status} size="sm" showHelp={false} />}
                  </span>
                  <span className="block truncate text-[12.5px] text-p1-text-3">
                    {districtName(l.district)} · {p.amount}{p.suffix}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cx(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                    on ? 'border-p1-primary bg-p1-primary text-p1-primary-on' : 'border-p1-border-strong',
                  )}
                >
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
