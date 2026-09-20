/**
 * One postal district: what is live in it, what it costs, and where it is.
 *
 * A 404 when the district has nothing live. The alternative — a page saying
 * "0 homes in Bedok" for a search engine to index — is worse than not having
 * the page, and it is the sort of empty shell the brief rules out.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { marketListings } from '../../../../../lib/phase1/marketplace';
import { DISTRICTS, districtCode, districtLabel } from '../../../../../lib/phase1/districts';
import { districtFacets, districtListings, dominantSpread, spread, stationOf } from '../../../../../lib/phase1/market-explore';
import { Collection, money } from '../../../../../components/phase1/market/Collection';
import { breadcrumbJsonLd, collectionJsonLd } from '../../../../../lib/phase1/market-jsonld';
import { absolute, publicOrigin } from '../../../../../lib/phase1/public-origin';

export const dynamic = 'force-dynamic';

const read = (raw: string) => {
  const n = Number(raw);
  return Number.isInteger(n) && DISTRICTS[n] ? n : null;
};

export async function generateMetadata({ params }: { params: Promise<{ district: string }> }): Promise<Metadata> {
  const d = read((await params).district);
  if (d === null) return { title: 'Area not found — V-RENT' };
  const items = districtListings(await marketListings(), d);
  if (items.length === 0) return { title: 'Area not found — V-RENT' };
  const s = spread(items, 'rent');
  const title = `Homes to rent in ${districtLabel(d)} (${districtCode(d)}), Singapore`;
  return {
    title: `${title} — V-RENT`,
    description: s
      ? `${items.length} homes live in ${districtLabel(d)}. Asking from ${money(s.low, 'rent')} a month. ${DISTRICTS[d]?.areas ?? ''}`
      : `${items.length} homes live in ${districtLabel(d)}, Singapore. ${DISTRICTS[d]?.areas ?? ''}`,
    alternates: { canonical: `/phase1/homes/d/${d}` },
    openGraph: { title, type: 'website', siteName: 'V-RENT' },
  };
}

export default async function DistrictPage({ params }: { params: Promise<{ district: string }> }) {
  const d = read((await params).district);
  if (d === null) notFound();

  const all = await marketListings();
  const items = districtListings(all, d);
  if (items.length === 0) notFound();

  /* Neighbours worth offering: the other districts with stock, busiest first,
     and the stations these homes actually sit near. */
  const others = districtFacets(all).filter((f) => f.slug !== String(d)).slice(0, 5);
  const stations = [...new Map(items
    .map((m) => stationOf(m.listing))
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .map((s) => [s.slug, s]))
    .values()].slice(0, 5);

  const origin = await publicOrigin();
  const url = absolute(origin, `/phase1/homes/d/${d}`);
  const name = `Homes in ${districtLabel(d)} (${districtCode(d)}), Singapore`;

  return (
    <Collection
      jsonLd={[
        collectionJsonLd({ url, name, description: DISTRICTS[d]?.areas ?? '', items, origin }),
        breadcrumbJsonLd([
          { name: 'Rent', url: absolute(origin, '/phase1/homes/search') },
          { name: 'Explore', url: absolute(origin, '/phase1/homes/explore') },
          { name: districtLabel(d), url },
        ]),
      ]}
      kicker={[{ label: 'Rent', href: '/phase1/homes/search' }, { label: 'Explore', href: '/phase1/homes/explore' }]}
      title={`${districtLabel(d)} · ${districtCode(d)}`}
      blurb={`${DISTRICTS[d]?.areas ?? ''}. Everything below is live on V-RENT and advertised by a salesperson checked against the CEA register.`}
      items={items}
      spread={dominantSpread(items)}
      searchHref={`/phase1/homes/search?district=${d}`}
      related={[
        ...stations.map((s) => ({ label: `${s.name} ${s.kind}`, href: `/phase1/homes/mrt/${s.slug}`, hint: 'Station' })),
        ...others.map((f) => ({ label: f.label, href: f.href, hint: `${f.count} ${f.count === 1 ? 'home' : 'homes'}` })),
      ]}
    />
  );
}
