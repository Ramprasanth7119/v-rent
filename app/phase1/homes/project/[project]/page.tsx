/**
 * One development: every home live in it, and what the range across them is.
 *
 * What this page is *not* is a project page in the sense a portal means it.
 * There is no developer, no expected completion, no unit mix and no launch
 * price here, because none of those is a field on a listing and none of them
 * would be true if it were written. What there is, is every live unit in the
 * building, side by side, which is the thing a tenant comparing two flats in
 * the same block actually wants.
 *
 * Anything the listings agree on about the building itself — the tenure, the
 * year it was completed — is shown, and only when they agree.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { marketListings } from '../../../../../lib/phase1/marketplace';
import { districtLabel } from '../../../../../lib/phase1/districts';
import { projectListings, dominantSpread, spread, stationOf } from '../../../../../lib/phase1/market-explore';
import { Collection, money } from '../../../../../components/phase1/market/Collection';
import { breadcrumbJsonLd, collectionJsonLd } from '../../../../../lib/phase1/market-jsonld';
import { absolute, publicOrigin } from '../../../../../lib/phase1/public-origin';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ project: string }> }): Promise<Metadata> {
  const key = (await params).project;
  const items = projectListings(await marketListings(), key);
  if (items.length === 0) return { title: 'Development not found — V-RENT' };
  const l = items[0].listing;
  const s = spread(items, 'rent') ?? spread(items, 'sale');
  const title = `${l.project}, ${l.address} — homes available`;
  return {
    title: `${title} — V-RENT`,
    description: s
      ? `${items.length} homes live in ${l.project}, ${districtLabel(l.district)}. Asking from ${money(s.low, s.deal)}${s.deal === 'rent' ? ' a month' : ''}.`
      : `${items.length} homes live in ${l.project}, ${districtLabel(l.district)}.`,
    alternates: { canonical: `/phase1/homes/project/${key}` },
    openGraph: { title, type: 'website', siteName: 'V-RENT' },
  };
}

/** The one value they all carry, or nothing. A building has one tenure; two listings disagreeing means neither is stated. */
function agreed<T>(values: (T | undefined)[]): T | null {
  const set = [...new Set(values.filter((v): v is T => v !== undefined && v !== null && v !== ('' as unknown as T)))];
  return set.length === 1 ? set[0] : null;
}

export default async function ProjectPage({ params }: { params: Promise<{ project: string }> }) {
  const key = (await params).project;
  const items = projectListings(await marketListings(), key);
  if (items.length === 0) notFound();

  const l = items[0].listing;
  const tenure = agreed(items.map((m) => m.listing.tenure));
  const built = agreed(items.map((m) => m.listing.builtYear));
  const type = agreed(items.map((m) => m.listing.propertyType));
  const st = stationOf(l);

  const known = [
    type && `${type}`,
    tenure,
    built && `completed ${built}`,
  ].filter(Boolean).join(' · ');

  const origin = await publicOrigin();
  const url = absolute(origin, `/phase1/homes/project/${key}`);

  return (
    <>
      <Collection
        jsonLd={[
          collectionJsonLd({ url, name: `${l.project}, Singapore`, description: `${items.length} homes live in ${l.project}, ${l.address}.`, items, origin }),
          breadcrumbJsonLd([
            { name: 'Rent', url: absolute(origin, '/phase1/homes/search') },
            { name: 'Explore', url: absolute(origin, '/phase1/homes/explore') },
            { name: l.project, url },
          ]),
        ]}
        kicker={[{ label: 'Rent', href: '/phase1/homes/search' }, { label: 'Explore', href: '/phase1/homes/explore#developments' }]}
        title={l.project}
        blurb={`${l.address}, Singapore ${l.postalCode}${known ? `. ${known}` : ''}. Every unit below is live on V-RENT now.`}
        items={items}
        spread={dominantSpread(items)}
        searchHref={`/phase1/homes/search?q=${encodeURIComponent(l.project)}`}
        related={[
          { label: districtLabel(l.district), href: `/phase1/homes/d/${l.district}`, hint: 'Area' },
          ...(st ? [{ label: `${st.name} ${st.kind}`, href: `/phase1/homes/mrt/${st.slug}`, hint: 'Station' }] : []),
        ]}
      />
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-8">
        <p className="flex items-start gap-2 rounded-xl border border-p1-border bg-p1-surface px-4 py-3 text-[13px] leading-5 text-p1-text-3">
          <Building2 size={15} className="mt-0.5 shrink-0" aria-hidden />
          Everything on this page comes from the listings themselves. V-RENT does not hold developer, completion or unit-mix
          records for Singapore developments, so none is shown — rather than guessed at.
        </p>
      </div>
    </>
  );
}
