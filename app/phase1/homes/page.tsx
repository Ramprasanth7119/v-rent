/**
 * The tenant site's front door.
 *
 * One search, the areas people are actually listing in, the newest homes, why
 * the listings can be trusted, and who is advertising them. Every number and
 * every card is read from the live listings — nothing is padded.
 */

import Link from 'next/link';
import { ArrowRight, BadgeCheck, MapPinned, MessageSquareText, ShieldCheck } from 'lucide-react';
import { marketAgents, marketListings } from '../../../lib/phase1/marketplace';
import { DISTRICTS, districtCode } from '../../../lib/phase1/districts';
import { PropertyCard } from '../../../components/phase1/market/PropertyCard';
import { HeroSearch, type Suggestion } from '../../../components/phase1/market/HeroSearch';
import { HeroMap } from '../../../components/phase1/market/HeroMap';
import { isSale, mrt, pinPrice } from '../../../components/phase1/market/format';

export const dynamic = 'force-dynamic';

export default async function HomesPage() {
  const [listings, agents] = await Promise.all([marketListings(), marketAgents()]);
  const rentals = listings.filter((m) => !isSale(m.listing));

  /* Areas, by how much is live in them. */
  const byDistrict = new Map<number, { count: number; from: number }>();
  for (const m of rentals) {
    const cur = byDistrict.get(m.listing.district) ?? { count: 0, from: Infinity };
    byDistrict.set(m.listing.district, { count: cur.count + 1, from: Math.min(cur.from, m.listing.monthlyRent) });
  }
  const areas = [...byDistrict.entries()].sort((a, b) => b[1].count - a[1].count || a[0] - b[0]).slice(0, 6);

  const suggestions: Suggestion[] = [
    ...[...new Set(listings.map((m) => m.listing.district))].sort((a, b) => (byDistrict.get(b)?.count ?? 0) - (byDistrict.get(a)?.count ?? 0)).map((d) => ({
      kind: 'district' as const, label: DISTRICTS[d]?.name ?? `District ${d}`, hint: `${districtCode(d)} · ${DISTRICTS[d]?.areas ?? ''}`, query: { district: String(d) },
    })),
    ...[...new Map(listings.map((m) => [m.listing.project, m])).values()].map((m) => ({
      kind: 'project' as const, label: m.listing.project, hint: `${m.listing.address} · ${districtCode(m.listing.district)}`, query: { q: m.listing.project },
    })),
    ...[...new Set(listings.map((m) => mrt(m.listing)).filter((s): s is string => Boolean(s)))].map((s) => ({
      kind: 'station' as const, label: s, hint: 'Station', query: { q: s.replace(/ (MRT|LRT)$/, '') },
    })),
  ];

  const pins = listings
    .filter((m) => m.listing.lat !== undefined && m.listing.lng !== undefined)
    .map((m) => ({ key: `${m.ownerId}/${m.listing.id}`, lat: m.listing.lat!, lng: m.listing.lng!, label: pinPrice(m.listing), href: `/phase1/homes/${m.ownerId}/${m.listing.id}` }));

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="border-b border-p1-border bg-p1-surface">
        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:px-8 lg:py-20">
          <div className="vr-rise">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-p1-border bg-p1-bg px-3 py-1 text-[12.5px] font-medium text-p1-text-2">
              <span className="h-1.5 w-1.5 rounded-full bg-p1-success" aria-hidden />
              {listings.length} {listings.length === 1 ? 'home' : 'homes'} live from {agents.length} verified {agents.length === 1 ? 'agent' : 'agents'}
            </p>
            <h1 className="max-w-[14ch] text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-p1-text sm:text-[54px] lg:text-[60px]">
              Find a place worth coming home to.
            </h1>
            <p className="mt-4 max-w-md text-[16px] leading-7 text-p1-text-3">
              Every listing in Singapore on V-RENT comes from an agent checked against the CEA register.
            </p>
            <div className="mt-8">
              <HeroSearch suggestions={suggestions} />
            </div>
          </div>

          <div className="vr-fade relative hidden h-[460px] overflow-hidden rounded-2xl border border-p1-border shadow-p1-md lg:block">
            <HeroMap items={pins} />
            <div className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-lg bg-p1-surface/95 px-3 py-2 text-[12.5px] shadow-p1-md ring-1 ring-p1-border">
              <span className="font-semibold text-p1-text">Live on the map</span>
              <span className="text-p1-text-3"> · choose a price to open it</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* ------------------------------------------------------ areas */}
        {areas.length > 0 && (
          <section className="pt-14" aria-labelledby="areas">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 id="areas" className="text-[22px] font-semibold tracking-[-0.02em] text-p1-text">Popular areas</h2>
              <Link href="/phase1/homes/explore" className="inline-flex items-center gap-1 text-[14px] font-medium text-p1-primary hover:underline underline-offset-4">Explore every area <ArrowRight size={14} aria-hidden /></Link>
            </div>
            <ul className="vr-stagger grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {areas.map(([d, a]) => (
                <li key={d}>
                  <Link href={`/phase1/homes/d/${d}`} className="group flex h-full flex-col rounded-xl border border-p1-border bg-p1-surface p-4 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-p1-border-strong hover:shadow-p1-md">
                    <span className="text-[12px] font-semibold tabular-nums text-p1-primary">{districtCode(d)}</span>
                    <span className="mt-6 text-[16px] font-semibold leading-5 tracking-[-0.01em] text-p1-text">{DISTRICTS[d]?.name}</span>
                    <span className="mt-1 line-clamp-1 text-[12.5px] text-p1-text-3">{DISTRICTS[d]?.areas}</span>
                    <span className="mt-3 flex items-center justify-between border-t border-p1-border pt-3 text-[12.5px]">
                      <span className="text-p1-text-2"><span className="font-semibold tabular-nums text-p1-text">{a.count}</span> {a.count === 1 ? 'home' : 'homes'}</span>
                      <span className="tabular-nums text-p1-text-3">from S${(a.from / 1000).toFixed(1).replace(/\.0$/, '')}k</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ------------------------------------------------------ homes */}
        <section className="pt-14" aria-labelledby="latest">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 id="latest" className="text-[22px] font-semibold tracking-[-0.02em] text-p1-text">Newly listed</h2>
            {listings.length > 0 && <Link href="/phase1/homes/search" className="inline-flex items-center gap-1 text-[14px] font-medium text-p1-primary hover:underline underline-offset-4">See all {listings.length} <ArrowRight size={14} aria-hidden /></Link>}
          </div>
          {listings.length === 0 ? (
            <div className="rounded-2xl border border-p1-border bg-p1-surface px-6 py-14 text-center">
              <h3 className="text-[16px] font-semibold text-p1-text">No homes are live right now</h3>
              <p className="mt-1 text-[14px] text-p1-text-3">Listings appear here the moment an agent publishes one.</p>
            </div>
          ) : (
            <ul className="vr-stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.slice(0, 8).map((m, i) => (
                <li key={`${m.ownerId}/${m.listing.id}`}><PropertyCard item={m} priority={i < 4} /></li>
              ))}
            </ul>
          )}
        </section>

        {/* ------------------------------------------------------ trust */}
        <section className="pt-16" aria-labelledby="why">
          <h2 id="why" className="sr-only">Why V-RENT</h2>
          <ul className="grid gap-px overflow-hidden rounded-2xl border border-p1-border bg-p1-border md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: 'Verified agents only', body: 'Each advertiser is matched to the CEA register before a listing goes live.' },
              { icon: MapPinned, title: 'Real addresses', body: 'Every listing sits on a building matched to OneMap, with its postal district.' },
              { icon: MessageSquareText, title: 'Enquire directly', body: 'Message the agent from the listing. No account, no middleman.' },
            ].map((t) => (
              <li key={t.title} className="flex gap-4 bg-p1-surface p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-p1-primary-soft text-p1-primary" aria-hidden><t.icon size={19} /></span>
                <span>
                  <span className="block text-[15px] font-semibold text-p1-text">{t.title}</span>
                  <span className="mt-1 block text-[13.5px] leading-5 text-p1-text-3">{t.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------ agents */}
        {agents.length > 0 && (
          <section className="pb-16 pt-14" aria-labelledby="agents">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 id="agents" className="text-[22px] font-semibold tracking-[-0.02em] text-p1-text">Agents listing now</h2>
              <Link href="/phase1/homes/agents" className="inline-flex items-center gap-1 text-[14px] font-medium text-p1-primary hover:underline underline-offset-4">All {agents.length} <ArrowRight size={14} aria-hidden /></Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {agents.slice(0, 4).map(({ agent, count, districts }) => (
                <li key={agent.id}>
                  <Link href={`/phase1/homes/agent/${agent.id}`} className="flex h-full items-center gap-3 rounded-xl border border-p1-border bg-p1-surface p-4 transition-[border-color,box-shadow] duration-200 hover:border-p1-border-strong hover:shadow-p1-md">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-p1-primary-soft text-[14px] font-semibold text-p1-primary" aria-hidden>
                      {agent.name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[14.5px] font-semibold text-p1-text">{agent.name}</span>
                        {agent.verified && <BadgeCheck size={15} className="shrink-0 text-p1-success" aria-label="CEA verified" />}
                      </span>
                      <span className="block truncate text-[12.5px] text-p1-text-3">{agent.agency || 'Agency not stated'}</span>
                      <span className="block truncate text-[12.5px] tabular-nums text-p1-text-2">{count} {count === 1 ? 'home' : 'homes'} · {districts.map(districtCode).join(', ')}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
