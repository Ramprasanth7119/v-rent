/**
 * The front door.
 *
 * Signed out, V-RENT opens like a property portal: one search across what is
 * listed, the market in numbers, ways in by property type and by area, the
 * newest homes, the agents behind them — and then the case for agents, with
 * the plans and a straight comparison against incumbent pricing. Every count,
 * price and card is read from live listings.
 *
 * Signed in, there is nothing here for the visitor: an agent goes straight to
 * the dashboard and an administrator to the operations console, as after login.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight, BadgeCheck, Building, Building2, Castle, Check, Home, Hotel, MapPinned, MessageSquareText, Search, ShieldCheck, Warehouse,
} from 'lucide-react';
import { currentUser } from '../../lib/auth/session';
import { marketAgents, marketListings } from '../../lib/phase1/marketplace';
import { DISTRICTS, districtCode } from '../../lib/phase1/districts';
import { INCUMBENT_PRICING, PLANS, sgd } from '../../lib/phase1/data';
import { Skyline } from '../../components/phase1/landing/Skyline';
import { PortalSearch } from '../../components/phase1/landing/PortalSearch';
import { ListingRail } from '../../components/phase1/landing/ListingRail';
import { AreaExplorer } from '../../components/phase1/landing/AreaExplorer';
import { AgentTools } from '../../components/phase1/landing/AgentTools';
import type { Suggestion } from '../../components/phase1/market/HeroSearch';
import { isSale, mrt } from '../../components/phase1/market/format';

export const dynamic = 'force-dynamic';

const TYPES = [
  { key: 'HDB', label: 'HDB flats', icon: Building, blurb: 'Public housing across the heartlands' },
  { key: 'Condominium', label: 'Condominiums', icon: Building2, blurb: 'Pools, gyms and security' },
  { key: 'Apartment', label: 'Apartments', icon: Hotel, blurb: 'Walk-ups and smaller blocks' },
  { key: 'Executive Condominium', label: 'Executive condos', icon: Warehouse, blurb: 'Condo living at HDB-adjacent prices' },
  { key: 'Landed', label: 'Landed homes', icon: Castle, blurb: 'Terraces, semi-Ds and bungalows' },
];

const FAQ = [
  { q: 'Do I need an account to enquire about a home?', a: 'No. Send an enquiry from any listing with your name and how to reach you. It goes to that agent only, with the listing reference attached.' },
  { q: 'How do you know an agent is who they say they are?', a: 'Every advertiser registers with their CEA registration number. V-RENT reads their name and agency from the public Council for Estate Agencies register, and a verification officer approves the account before anything is published.' },
  { q: 'Where do the addresses and maps come from?', a: 'Each listing is matched to OneMap, the Singapore Land Authority’s address register, so it sits on a real building with its postal district.' },
  { q: 'What does it cost an agent to list?', a: `Plans are billed yearly and start at ${sgd(PLANS[0].priceYearSgd)}. They differ by how many listings you can keep live at once.` },
];

const median = (values: number[]) => {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

export default async function FrontDoor() {
  const user = await currentUser();
  if (user) redirect(user.role === 'admin' ? '/phase1/admin' : '/phase1/dashboard');

  const [listings, agents] = await Promise.all([marketListings(), marketAgents()]);
  const rentals = listings.filter((m) => !isSale(m.listing));

  const stock: Record<number, { count: number; from: number | null }> = {};
  for (const m of listings) {
    const d = m.listing.district;
    const cur = stock[d] ?? { count: 0, from: null };
    const rent = isSale(m.listing) ? null : m.listing.monthlyRent;
    stock[d] = { count: cur.count + 1, from: rent === null ? cur.from : cur.from === null ? rent : Math.min(cur.from, rent) };
  }
  const districtsCovered = Object.keys(stock).length;
  const medianRent = median(rentals.map((m) => m.listing.monthlyRent));

  const byType = TYPES.map((t) => {
    const matching = rentals.filter((m) => m.listing.propertyType === t.key);
    return { ...t, count: matching.length, from: matching.length ? Math.min(...matching.map((m) => m.listing.monthlyRent)) : null };
  });

  const popular = Object.entries(stock).sort((a, b) => b[1].count - a[1].count).slice(0, 5).map(([d]) => Number(d));

  const suggestions: Suggestion[] = [
    ...Object.keys(DISTRICTS).map(Number).sort((a, b) => (stock[b]?.count ?? 0) - (stock[a]?.count ?? 0)).map((d) => ({
      kind: 'district' as const, label: DISTRICTS[d].name, hint: `${districtCode(d)} · ${stock[d]?.count ? `${stock[d].count} ${stock[d].count === 1 ? 'home' : 'homes'}` : DISTRICTS[d].areas}`, query: { district: String(d) },
    })),
    ...[...new Map(listings.map((m) => [m.listing.project, m])).values()].map((m) => ({
      kind: 'project' as const, label: m.listing.project, hint: `${m.listing.address} · ${districtCode(m.listing.district)}`, query: { q: m.listing.project },
    })),
    ...[...new Set(listings.map((m) => mrt(m.listing)).filter((s): s is string => Boolean(s)))].map((s) => ({
      kind: 'station' as const, label: s, hint: 'Station', query: { q: s.replace(/ (MRT|LRT)$/, '') },
    })),
  ];

  const starter = PLANS[0];
  const bronze = INCUMBENT_PRICING[0];
  const ratio = bronze ? Math.round((bronze.priceYearSgd / starter.priceYearSgd) * 10) / 10 : null;

  return (
    <>
      {/* ================================================================ hero */}
      <section className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#0B1220_0%,#0F1D3A_62%,#16295A_100%)] text-white">
        <Skyline className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[190px] w-full sm:h-[250px] lg:h-[300px]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_78%_8%,rgba(96,165,250,0.22),transparent_70%)]" />

        <div className="mx-auto w-full max-w-[1280px] px-4 pb-44 pt-12 sm:px-6 sm:pb-56 sm:pt-16 lg:px-8 lg:pb-64 lg:pt-20">
          <div className="vr-rise max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12.5px] font-medium text-white/80 ring-1 ring-white/15">
              <ShieldCheck size={13} className="text-[#34D399]" aria-hidden />
              Every agent checked against the CEA register
            </p>
            <h1 className="mt-5 text-[36px] font-semibold leading-[1.06] tracking-[-0.035em] sm:text-[52px] lg:text-[60px]">
              Find your next home in Singapore.
            </h1>
            <p className="mt-4 max-w-xl text-[16px] leading-7 text-white/70 sm:text-[17px]">
              Homes to rent and buy from verified agents, on real addresses, with nothing between you and the person listing it.
            </p>
          </div>

          <div className="vr-rise mt-8 max-w-[1080px]" style={{ animationDelay: '80ms' }}>
            <PortalSearch suggestions={suggestions} />
            {popular.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
                <span className="text-white/60">Popular:</span>
                {popular.map((d) => (
                  <Link key={d} href={`/phase1/homes/search?district=${d}`} className="rounded-full bg-white/10 px-3 py-1 font-medium text-white/90 ring-1 ring-white/15 transition-colors hover:bg-white/20">
                    {DISTRICTS[d].name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
        {/* ============================================================ numbers */}
        <section aria-label="V-RENT today" className="relative z-10 -mt-14 grid grid-cols-2 overflow-hidden rounded-2xl border border-p1-border bg-p1-surface shadow-p1-lg lg:grid-cols-4">
          {[
            { v: listings.length.toLocaleString('en-SG'), k: listings.length === 1 ? 'Home live now' : 'Homes live now' },
            { v: agents.length.toLocaleString('en-SG'), k: agents.length === 1 ? 'Verified agent listing' : 'Verified agents listing' },
            { v: `${districtsCovered} of 28`, k: 'Districts with homes' },
            { v: medianRent ? `S$${medianRent.toLocaleString('en-SG')}` : '—', k: 'Median asking rent' },
          ].map((s, i) => (
            <div key={s.k} className={`px-5 py-5 sm:px-7 ${i % 2 ? 'border-l border-p1-border' : ''} ${i > 1 ? 'border-t border-p1-border lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
              <div className="text-[26px] font-semibold tracking-[-0.025em] tabular-nums text-p1-text sm:text-[30px]">{s.v}</div>
              <div className="mt-0.5 text-[13px] text-p1-text-3">{s.k}</div>
            </div>
          ))}
        </section>

        {/* ======================================================= by type */}
        <section className="pt-16" aria-labelledby="types-h">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 id="types-h" className="text-[24px] font-semibold tracking-[-0.02em] text-p1-text">Browse by property type</h2>
              <p className="mt-1 text-[14px] text-p1-text-3">Homes to rent, grouped the way Singapore lives.</p>
            </div>
          </div>
          <ul className="vr-stagger grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {byType.map((t) => (
              <li key={t.key} className={t.key === 'Landed' ? 'col-span-2 md:col-span-1' : ''}>
                <Link href={`/phase1/homes/search?type=${encodeURIComponent(t.key)}`} className="group flex h-full flex-col rounded-2xl border border-p1-border bg-p1-surface p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-p1-border-strong hover:shadow-p1-md">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-p1-primary-soft text-p1-primary transition-colors duration-200 group-hover:bg-p1-primary group-hover:text-p1-primary-on" aria-hidden>
                    <t.icon size={22} />
                  </span>
                  <span className="mt-5 text-[16px] font-semibold text-p1-text">{t.label}</span>
                  <span className="mt-1 text-[13px] leading-5 text-p1-text-3">{t.blurb}</span>
                  <span className="mt-auto flex items-center justify-between pt-4 text-[13px]">
                    <span className={t.count ? 'font-medium text-p1-text-2' : 'text-p1-text-3'}>
                      {t.count ? <><span className="tabular-nums">{t.count}</span> {t.count === 1 ? 'home' : 'homes'}</> : 'None listed yet'}
                    </span>
                    <ArrowRight size={15} className="text-p1-text-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-p1-primary" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ===================================================== new homes */}
        <section className="pt-16" aria-labelledby="new-h">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 id="new-h" className="text-[24px] font-semibold tracking-[-0.02em] text-p1-text">Newly listed</h2>
              <p className="mt-1 text-[14px] text-p1-text-3">The latest homes published by verified agents.</p>
            </div>
            {listings.length > 0 && <Link href="/phase1/homes/search" className="inline-flex shrink-0 items-center gap-1 text-[14px] font-medium text-p1-primary hover:underline underline-offset-4">See all {listings.length} <ArrowRight size={14} aria-hidden /></Link>}
          </div>
          {listings.length === 0 ? (
            <div className="rounded-2xl border border-p1-border bg-p1-surface px-6 py-14 text-center">
              <h3 className="text-[16px] font-semibold text-p1-text">No homes are live right now</h3>
              <p className="mt-1 text-[14px] text-p1-text-3">Listings appear here the moment an agent publishes one.</p>
            </div>
          ) : (
            <ListingRail items={listings.slice(0, 12)} label="Newly listed homes" />
          )}
        </section>

        {/* ======================================================== areas */}
        <section className="pt-16" aria-labelledby="areas-h">
          <div className="mb-4">
            <h2 id="areas-h" className="text-[24px] font-semibold tracking-[-0.02em] text-p1-text">Explore by area</h2>
            <p className="mt-1 text-[14px] text-p1-text-3">All 28 postal districts, in the three regions rents are priced by.</p>
          </div>
          <AreaExplorer stock={stock} />
        </section>

        {/* ===================================================== how it works */}
        <section className="pt-16" aria-labelledby="how-h">
          <h2 id="how-h" className="text-[24px] font-semibold tracking-[-0.02em] text-p1-text">Renting on V-RENT</h2>
          <ol className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-p1-border bg-p1-border md:grid-cols-3">
            {[
              { icon: Search, title: 'Search real listings', body: 'Every home sits on an address matched to OneMap, on a map you can move.' },
              { icon: BadgeCheck, title: 'Check who is listing it', body: 'The agent’s CEA registration, agency and licence are on every listing.' },
              { icon: MessageSquareText, title: 'Enquire in a minute', body: 'Message or call the agent directly. No account, no middleman.' },
            ].map((s, i) => (
              <li key={s.title} className="flex gap-4 bg-p1-surface p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-p1-subtle text-[14px] font-semibold tabular-nums text-p1-text-2" aria-hidden>{i + 1}</span>
                <span>
                  <span className="flex items-center gap-2 text-[15px] font-semibold text-p1-text"><s.icon size={16} className="text-p1-primary" aria-hidden />{s.title}</span>
                  <span className="mt-1 block text-[13.5px] leading-5 text-p1-text-3">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* ======================================================== agents */}
        {agents.length > 0 && (
          <section className="pt-16" aria-labelledby="agents-h">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 id="agents-h" className="text-[24px] font-semibold tracking-[-0.02em] text-p1-text">Verified agents</h2>
                <p className="mt-1 text-[14px] text-p1-text-3">Registered salespersons with homes live on V-RENT.</p>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {agents.slice(0, 8).map(({ agent, count, districts }) => (
                <li key={agent.id}>
                  <Link href={`/phase1/homes/agent/${agent.id}`} className="group flex h-full flex-col rounded-2xl border border-p1-border bg-p1-surface p-5 transition-[border-color,box-shadow] duration-200 hover:border-p1-border-strong hover:shadow-p1-md">
                    <span className="flex items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-p1-primary-soft text-[15px] font-semibold text-p1-primary" aria-hidden>
                        {agent.name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[15px] font-semibold text-p1-text">{agent.name}</span>
                          {agent.verified && <BadgeCheck size={16} className="shrink-0 text-p1-success" aria-label="CEA verified" />}
                        </span>
                        <span className="block truncate text-[12.5px] text-p1-text-3">{agent.agency || 'Agency not stated'}</span>
                      </span>
                    </span>
                    <span className="mt-4 flex items-center justify-between border-t border-p1-border pt-3 text-[12.5px]">
                      <span className="text-p1-text-2"><span className="font-semibold tabular-nums text-p1-text">{count}</span> {count === 1 ? 'home' : 'homes'} · {districts.slice(0, 3).map(districtCode).join(', ')}</span>
                      <span className="font-mono text-p1-text-3">{agent.ceaNumber}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* ========================================================= for agents */}
      <section id="for-agents" className="mt-20 scroll-mt-16 border-y border-p1-border bg-p1-surface" aria-labelledby="for-agents-h">
        <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:px-8">
          <div>
            <p className="text-[13px] font-semibold text-p1-primary">For CEA-registered agents</p>
            <h2 id="for-agents-h" className="mt-2 text-[30px] font-semibold leading-[1.15] tracking-[-0.025em] text-p1-text sm:text-[36px]">
              List, reply and stay compliant — at a fraction of portal prices.
            </h2>
            <ul className="mt-6 space-y-3">
              {[
                'Register with your CEA number. Your name and agency come straight from the public register.',
                'Every listing carries your registration and agency licence, as CEA rules require.',
                'Enquiries, viewings, WhatsApp handover and client shortlists in one workspace.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-[15px] leading-6 text-p1-text-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-p1-success-soft text-p1-success" aria-hidden><Check size={14} strokeWidth={2.5} /></span>
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/phase1/signup" className="p1-press inline-flex h-12 items-center gap-2 rounded-lg bg-p1-primary px-5 text-[15px] font-semibold text-p1-primary-on hover:bg-p1-primary-hover">Create an agent account <ArrowRight size={16} aria-hidden /></Link>
              <Link href="/phase1/login" className="p1-press inline-flex h-12 items-center rounded-lg border border-p1-border-strong px-5 text-[15px] font-medium text-p1-text hover:bg-p1-subtle">Sign in</Link>
            </div>
          </div>

          {bronze && (
            <div className="rounded-2xl border border-p1-border bg-p1-bg p-6 sm:p-8">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[15px] font-semibold text-p1-text">A year of listing, compared</h3>
                {ratio && <span className="rounded-md bg-p1-success-soft px-2 py-0.5 text-[12.5px] font-semibold text-p1-success">{ratio}× less</span>}
              </div>
              <div className="mt-6 space-y-5">
                {[
                  { label: `V-RENT ${starter.name}`, value: starter.priceYearSgd, ours: true },
                  { label: bronze.name, value: bronze.priceYearSgd, ours: false },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex items-baseline justify-between gap-3 text-[14px]">
                      <span className={row.ours ? 'font-semibold text-p1-text' : 'text-p1-text-2'}>{row.label}</span>
                      <span className="font-semibold tabular-nums text-p1-text">{sgd(row.value)}</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-p1-subtle">
                      <div className={`vr-grow h-full rounded-full ${row.ours ? 'bg-p1-primary' : 'bg-p1-text-3/50'}`} style={{ width: `${Math.max(4, (row.value / bronze.priceYearSgd) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[12.5px] leading-5 text-p1-text-3">
                Published yearly prices, {bronze.note}. Their top tier is {sgd(INCUMBENT_PRICING[INCUMBENT_PRICING.length - 1].priceYearSgd)} a year.
              </p>
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-[1280px] px-4 pb-16 sm:px-6 lg:px-8">
          <h3 className="mb-4 text-[18px] font-semibold tracking-[-0.015em] text-p1-text">Everything in the agent workspace</h3>
          <AgentTools />
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
        {/* ========================================================= pricing */}
        <section id="pricing" className="scroll-mt-16 pt-16" aria-labelledby="pricing-h">
          <div className="text-center">
            <h2 id="pricing-h" className="text-[28px] font-semibold tracking-[-0.025em] text-p1-text">Plans for agents</h2>
            <p className="mt-1.5 text-[14.5px] text-p1-text-3">Billed yearly by PayNow or card. Plans differ by how many listings you can keep live.</p>
          </div>
          <ul className="mx-auto mt-8 grid max-w-[1040px] gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <li key={p.code} className={`relative flex flex-col rounded-2xl border bg-p1-surface p-6 ${p.highlight ? 'border-p1-primary shadow-p1-md' : 'border-p1-border'}`}>
                {p.highlight && <span className="absolute -top-3 left-6 rounded-full bg-p1-primary px-2.5 py-0.5 text-[12px] font-semibold text-p1-primary-on">{p.highlight}</span>}
                <h3 className="text-[16px] font-semibold text-p1-text">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-[32px] font-semibold tracking-[-0.025em] tabular-nums text-p1-text">{sgd(p.priceYearSgd)}</span>
                  <span className="text-[14px] text-p1-text-3">/year</span>
                </div>
                <div className="text-[13px] text-p1-text-3">about {sgd(Math.round(p.priceYearSgd / 12))} a month</div>
                <ul className="mt-5 space-y-2.5 border-t border-p1-border pt-5">
                  {p.entitlements.map((e) => (
                    <li key={e.key} className="flex items-baseline justify-between gap-3 text-[14px]">
                      <span className="text-p1-text-2">{e.label}</span>
                      <span className="font-medium tabular-nums text-p1-text">{e.value}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/phase1/signup" className={`p1-press mt-6 flex h-11 items-center justify-center rounded-lg text-[14.5px] font-semibold ${p.highlight ? 'bg-p1-primary text-p1-primary-on hover:bg-p1-primary-hover' : 'border border-p1-border-strong text-p1-text hover:bg-p1-subtle'}`}>
                  Start with {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ============================================================= FAQ */}
        <section className="mx-auto max-w-[820px] pb-20 pt-20" aria-labelledby="faq-h">
          <h2 id="faq-h" className="text-center text-[28px] font-semibold tracking-[-0.025em] text-p1-text">Questions</h2>
          <div className="mt-8 divide-y divide-p1-border overflow-hidden rounded-2xl border border-p1-border bg-p1-surface">
            {FAQ.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[15.5px] font-medium text-p1-text hover:bg-p1-subtle/60 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-p1-subtle text-p1-text-2 transition-transform duration-200 group-open:rotate-45" aria-hidden>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 1v10M1 6h10" /></svg>
                  </span>
                </summary>
                <p className="px-6 pb-5 text-[14.5px] leading-7 text-p1-text-2">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl bg-p1-subtle px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-3">
              <span className="hidden h-11 w-11 items-center justify-center rounded-xl bg-p1-surface text-p1-primary sm:flex" aria-hidden><Home size={20} /></span>
              <div>
                <div className="text-[16px] font-semibold text-p1-text">Ready to look?</div>
                <div className="text-[14px] text-p1-text-3">{listings.length} homes across {districtsCovered} districts, on a map.</div>
              </div>
            </div>
            <Link href="/phase1/homes/search" className="p1-press inline-flex h-11 items-center gap-2 rounded-lg bg-p1-primary px-5 text-[14.5px] font-semibold text-p1-primary-on hover:bg-p1-primary-hover">
              <MapPinned size={16} aria-hidden /> Open the map
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
