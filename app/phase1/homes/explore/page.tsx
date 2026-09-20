/**
 * Explore: the ways into the marketplace that are not a search box.
 *
 * Everything on this page is counted from live listings, and a heading with
 * nothing under it does not appear at all. On a platform with no houses there
 * is no "Landed" tile; on one where no agent has named a station there is no
 * station section. The page shrinks rather than pads.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { marketListings } from '../../../../lib/phase1/marketplace';
import {
  districtFacets, intents, projectFacets, stationFacets, typeFacets,
} from '../../../../lib/phase1/market-explore';
import { FacetGrid } from '../../../../components/phase1/market/Collection';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Explore Singapore by area, station and development — V-RENT',
  description: 'Browse homes to rent and buy in Singapore by postal district, MRT station, development and property type. Every count is live.',
  alternates: { canonical: '/phase1/homes/explore' },
};

function Section({ id, title, blurb, children }: { id: string; title: string; blurb: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 pt-12" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="text-[22px] font-semibold tracking-[-0.02em] text-p1-text">{title}</h2>
      <p className="mb-5 mt-1 text-[14px] text-p1-text-3">{blurb}</p>
      {children}
    </section>
  );
}

export default async function ExplorePage() {
  const items = await marketListings();

  const districts = districtFacets(items);
  const stations = stationFacets(items);
  const projects = projectFacets(items).filter((p) => p.count > 1);
  const rentTypes = typeFacets(items, 'rent');
  const saleTypes = typeFacets(items, 'sale');
  const ways = intents(items);

  const jump = [
    districts.length && { id: 'areas', label: 'Areas' },
    stations.length && { id: 'stations', label: 'Stations' },
    projects.length && { id: 'developments', label: 'Developments' },
    (rentTypes.length || saleTypes.length) && { id: 'types', label: 'Property types' },
    ways.length && { id: 'intent', label: 'What you are after' },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="vr-rise max-w-2xl">
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.03em] text-p1-text sm:text-[40px]">Explore Singapore</h1>
        <p className="mt-3 text-[16px] leading-7 text-p1-text-3">
          {items.length === 0
            ? 'Nothing is live right now. The moment an agent publishes a home, it appears here — by area, by station and by development.'
            : <>Every area, station and development below has homes live on it today. The numbers are the {items.length} {items.length === 1 ? 'listing' : 'listings'} on V-RENT right now, not an estimate.</>}
        </p>
      </header>

      {jump.length > 1 && (
        <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2">
          {jump.map((j) => (
            <a key={j.id} href={`#${j.id}`} className="rounded-lg border border-p1-border bg-p1-surface px-3 py-1.5 text-[13.5px] font-medium text-p1-text-2 hover:border-p1-border-strong hover:text-p1-text">{j.label}</a>
          ))}
        </nav>
      )}

      {districts.length > 0 && (
        <Section id="areas" title="By area" blurb="Singapore's postal districts, by the names people use for them.">
          <FacetGrid facets={districts} />
        </Section>
      )}

      {stations.length > 0 && (
        <Section id="stations" title="By station" blurb="Where the agent named the nearest station on the listing. Distances are on each home's own page.">
          <FacetGrid facets={stations} />
        </Section>
      )}

      {projects.length > 0 && (
        <Section id="developments" title="By development" blurb="Developments with more than one home live. A single unit is easier to find through search.">
          <FacetGrid facets={projects} columns={4} />
        </Section>
      )}

      {(rentTypes.length > 0 || saleTypes.length > 0) && (
        <Section id="types" title="By property type" blurb="Only the types something is actually listed under.">
          <div className="space-y-6">
            {rentTypes.length > 0 && (
              <div>
                <h3 className="mb-3 text-[14px] font-semibold text-p1-text-2">To rent</h3>
                <FacetGrid facets={rentTypes} />
              </div>
            )}
            {saleTypes.length > 0 && (
              <div>
                <h3 className="mb-3 text-[14px] font-semibold text-p1-text-2">For sale</h3>
                <FacetGrid facets={saleTypes} />
              </div>
            )}
          </div>
        </Section>
      )}

      {ways.length > 0 && (
        <Section id="intent" title="What you are after" blurb="Searches that are already narrowed. The number is what each one returns.">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ways.map((w) => (
              <li key={w.href}>
                <Link href={w.href} className="group flex items-center justify-between gap-4 rounded-xl border border-p1-border bg-p1-surface px-4 py-3.5 transition-[border-color,box-shadow] duration-200 hover:border-p1-border-strong hover:shadow-p1-sm">
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium text-p1-text">{w.label}</span>
                    <span className="block truncate text-[12.5px] text-p1-text-3">{w.hint}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-[13px] font-semibold tabular-nums text-p1-text-2">
                    {w.count}
                    <ArrowRight size={15} className="text-p1-text-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {items.length === 0 && (
        <div className="mt-10 rounded-2xl border border-p1-border bg-p1-surface px-6 py-14 text-center">
          <h2 className="text-[16px] font-semibold text-p1-text">Nothing to explore yet</h2>
          <p className="mx-auto mt-1 max-w-md text-[14px] text-p1-text-3">
            This page fills itself from live listings. Rather than showing areas with nothing in them, it waits.
          </p>
        </div>
      )}
    </div>
  );
}
