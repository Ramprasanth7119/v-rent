/**
 * One station: the homes whose agent named it as the nearest one.
 *
 * Said that way on the page, and meant that way. This is not a radius search
 * around a station's coordinates — it is the station the person who knows the
 * flat wrote on the listing. Claiming otherwise would put homes on the page
 * that nobody ever said were near it.
 *
 * A 404 when no live listing names the station.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { marketListings } from '../../../../../lib/phase1/marketplace';
import { districtLabel } from '../../../../../lib/phase1/districts';
import { dominantSpread, spread, stationFacets, stationListings, stationOf } from '../../../../../lib/phase1/market-explore';
import { Collection, money } from '../../../../../components/phase1/market/Collection';
import { breadcrumbJsonLd, collectionJsonLd } from '../../../../../lib/phase1/market-jsonld';
import { absolute, publicOrigin } from '../../../../../lib/phase1/public-origin';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ station: string }> }): Promise<Metadata> {
  const key = (await params).station;
  const items = stationListings(await marketListings(), key);
  const st = items[0] && stationOf(items[0].listing);
  if (!st) return { title: 'Station not found — V-RENT' };
  const s = spread(items, 'rent');
  const title = `Homes near ${st.name} ${st.kind}, Singapore`;
  return {
    title: `${title} — V-RENT`,
    description: s
      ? `${items.length} homes live near ${st.name} ${st.kind}. Asking from ${money(s.low, 'rent')} a month.`
      : `${items.length} homes live near ${st.name} ${st.kind}, Singapore.`,
    alternates: { canonical: `/phase1/homes/mrt/${key}` },
    openGraph: { title, type: 'website', siteName: 'V-RENT' },
  };
}

export default async function StationPage({ params }: { params: Promise<{ station: string }> }) {
  const key = (await params).station;
  const all = await marketListings();
  const items = stationListings(all, key);
  const st = items[0] && stationOf(items[0].listing);
  if (!st) notFound();

  const districts = [...new Set(items.map((m) => m.listing.district))].sort((a, b) => a - b);
  const others = stationFacets(all).filter((f) => f.slug !== key).slice(0, 6);

  const origin = await publicOrigin();
  const url = absolute(origin, `/phase1/homes/mrt/${key}`);
  const name = `Homes near ${st.name} ${st.kind}, Singapore`;

  return (
    <Collection
      jsonLd={[
        collectionJsonLd({ url, name, description: `Live listings whose agent named ${st.name} as the nearest station.`, items, origin }),
        breadcrumbJsonLd([
          { name: 'Rent', url: absolute(origin, '/phase1/homes/search') },
          { name: 'Explore', url: absolute(origin, '/phase1/homes/explore') },
          { name: `${st.name} ${st.kind}`, url },
        ]),
      ]}
      kicker={[{ label: 'Rent', href: '/phase1/homes/search' }, { label: 'Explore', href: '/phase1/homes/explore#stations' }]}
      title={`Near ${st.name} ${st.kind}`}
      blurb={`Homes whose agent named ${st.name} as the nearest station. How far each one actually is, measured against the Land Transport Authority's station exits, is on its own page.`}
      items={items}
      spread={dominantSpread(items)}
      searchHref={`/phase1/homes/search?q=${encodeURIComponent(st.name)}`}
      related={[
        ...districts.map((d) => ({ label: districtLabel(d), href: `/phase1/homes/d/${d}`, hint: 'Area' })),
        ...others.map((f) => ({ label: f.label, href: f.href, hint: `${f.count} ${f.count === 1 ? 'home' : 'homes'}` })),
      ]}
    />
  );
}
