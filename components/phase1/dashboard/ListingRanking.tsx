"use client";

/**
 * Which listings turn attention into contact.
 *
 * It deliberately does not rank by views: the showcase above already shows
 * views on every card, and a second chart of the same order would be the same
 * page twice. What no other panel says is the rate — a listing seen a thousand
 * times and written about twice is a different problem from one nobody finds,
 * and only one of them is fixed by photographs and a better price.
 *
 * Bars rather than a table, because the question is relative: the agent wants
 * the one that lags, and a length answers that before a number does. The view
 * count rides alongside so a rate off forty views is not read as a rate off a
 * thousand.
 */

import Link from 'next/link';
import React from 'react';
import { Card } from '../kit';
import { DemoListing } from '../../../lib/phase1/data';
import { ListingStats } from '../../../lib/phase1/performance';
import { districtLabel } from '../../../lib/phase1/districts';
import { CardHead } from './parts';

export function ListingRanking({ rows }: { rows: { l: DemoListing; s: ListingStats }[] }) {
  const ranked = [...rows].sort((a, b) => b.s.conversion - a.s.conversion);
  if (ranked.length === 0) return null;
  const max = Math.max(0.1, ...ranked.map((r) => r.s.conversion));
  const best = ranked[0].s.conversion;
  const worst = ranked[ranked.length - 1].s.conversion;

  return (
    <Card as="section" aria-labelledby="rank-h">
      <CardHead id="rank-h" title="Enquiry rate by listing" sub="Enquiries per 100 views, last 30 days" />

      <ul className="mt-4 space-y-3.5">
        {ranked.map(({ l, s }) => (
          <li key={l.id}>
            <Link href={`/phase1/listings/${l.id}`} className="group block rounded-lg px-1 py-1 transition-colors hover:bg-p1-subtle/60">
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[13.5px] font-medium text-p1-text group-hover:text-p1-primary">
                  {l.project}<span className="ml-2 font-normal text-p1-text-3">{districtLabel(l.district)}</span>
                </span>
                <span className="shrink-0 font-p1display text-[15px] font-bold tabular-nums text-p1-text">{s.conversion.toFixed(1)}</span>
              </span>
              <span className="mt-1.5 flex items-center gap-3">
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-p1-subtle" aria-hidden>
                  <span
                    className="vr-grow block h-full rounded-full bg-p1-primary dark:bg-p1-info"
                    style={{ width: `${Math.max(3, (s.conversion / max) * 100)}%` }}
                  />
                </span>
                <span className="w-[86px] shrink-0 text-right text-[11.5px] tabular-nums text-p1-text-3">
                  {s.views30d.toLocaleString('en-SG')} views
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {ranked.length > 1 && best > 0 && (
        <p className="mt-4 border-t border-p1-border pt-3 text-[12px] leading-[1.45] text-p1-text-3">
          {ranked[0].l.project} converts at {(best / Math.max(0.1, worst)).toFixed(1)} times the rate of {ranked[ranked.length - 1].l.project}.
          A gap like that is usually photographs, the asking figure, or the description.
        </p>
      )}
    </Card>
  );
}
