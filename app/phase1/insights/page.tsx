"use client";

/**
 * Insights — the overview.
 *
 * One screen that answers "what is happening": the rental market in four
 * figures and two charts, where the agent's own listings sit against it, the
 * few things in the market worth saying out loud, and the agent's portfolio.
 * The deeper screens are reached from the rail above and from each panel's own
 * link, so there are no navigation tiles here repeating the rail.
 *
 * The market figures are the illustrative contract set, so they are shown only
 * with Demo Data ON (`useMarketAvailable`). With it OFF the market sections say
 * "Data unavailable" and the portfolio section — the agent's real records —
 * still stands.
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Building2, TrendingUp, Ruler, Home, FileSpreadsheet, LineChart, Flame, Scale,
} from 'lucide-react';
import { LinkButton, cx } from '../../../components/phase1/kit';
import { PropertyImage } from '../../../components/phase1/PropertyImage';
import {
  InsightsShell, InsightsHeader, InsightPanel, SourceNote, DataFreshness, ChipGroup,
  InsightMetric, MetricRail, MiniTrend, TrendChart, BarList, ShareDonut, MarketUnavailable,
  InsightEmpty, seriesColour, seriesSoft, useMarketAvailable,
} from '../../../components/phase1/insights';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { useSession } from '../../../lib/phase1/SessionContext';
import { LISTING_STATUS_LABEL, sgd, type DemoListing, type ListingStatus } from '../../../lib/phase1/data';
import { coverPhoto } from '../../../lib/phase1/photos';
import {
  EMPTY_FILTERS, bedroomMix, districtRanking, marketSignals, monthsIn, selectTransactions, snapshot,
} from '../../../lib/phase1/insights';
import { MARKET_MONTHS, monthLabel } from '../../../lib/phase1/market';
import { marketPosition, type MarketPosition } from '../../../lib/phase1/market-position';
import { floorLabel } from '../../../lib/phase1/floor';
import { districtCode } from '../../../lib/phase1/districts';

/** The measures' colours, the same on every Insights screen. */
const RENT = 0;
const VOLUME = 1;
const PSF = 2;
const MINE = 3;

const shortMonth = (m: string) => monthLabel(m).replace(' 20', " '");
const money = (n: number) => `$${Math.round(n).toLocaleString('en-SG')}`;
const DAY = 86_400_000;

const STATUS_SLOT: Partial<Record<ListingStatus, number>> = {
  published: 2, draft: 0, pending_review: 1, rejected: 4, paused: 3, expired: 5,
};

export default function InsightsOverviewPage() {
  const router = useRouter();
  const { state, openedAt } = useDemo();
  const { user } = useSession();
  const market = useMarketAvailable();
  const [trend, setTrend] = useState<'rent' | 'volume'>('rent');

  const months = useMemo(() => monthsIn('12'), []);
  const rows = useMemo(() => (market ? selectTransactions({ ...EMPTY_FILTERS, months: '12' }) : []), [market]);
  const snap = useMemo(() => snapshot(rows, '12'), [rows]);
  const mix = useMemo(() => bedroomMix(rows), [rows]);
  const districts = useMemo(() => (market ? districtRanking('12') : []), [market]);
  const signals = useMemo(() => (market ? marketSignals('12') : []), [market]);

  /* ---------------------------------------------------- the agent's own */
  const mine = useMemo(() => state.listings.filter((l) => !l.archived), [state.listings]);
  const live = mine.filter((l) => l.status === 'published');
  const since = openedAt.getTime() - 30 * DAY;
  const recent = state.enquiries.filter((e) => new Date(e.at).getTime() >= since).length;

  const statusShares = useMemo(() => {
    const counts = new Map<ListingStatus, number>();
    for (const l of mine) counts.set(l.status, (counts.get(l.status) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => ({ key: s, label: LISTING_STATUS_LABEL[s] ?? s, value: n, slot: STATUS_SLOT[s] ?? 5 }));
  }, [mine]);

  const byListing = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of state.enquiries) counts.set(e.listingId, (counts.get(e.listingId) ?? 0) + 1);
    return mine
      .map((l) => ({ l, n: counts.get(l.id) ?? 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
  }, [mine, state.enquiries]);

  /* Where each live rental sits against its comparable contracts. */
  const positions = useMemo(() => {
    if (!market) return [];
    return live
      .filter((l) => (l.dealType ?? 'rent') === 'rent')
      .map((l) => ({ l, p: marketPosition(l) }))
      .filter((x): x is { l: DemoListing; p: MarketPosition } => x.p.status === 'ok')
      .sort((a, b) => Math.abs(b.p.deltaPct) - Math.abs(a.p.deltaPct))
      .slice(0, 5);
  }, [market, live]);

  const trendSeries = trend === 'rent'
    ? [{ key: 'rent', label: 'Median rent', points: snap.rentByMonth, slot: RENT }]
    : [{ key: 'volume', label: 'Contracts', points: snap.volumeByMonth, slot: VOLUME }];

  return (
    <InsightsShell
      footnote={market ? (
        <SourceNote detail={`${snap.projects} developments, the 12 months to ${monthLabel(MARKET_MONTHS[MARKET_MONTHS.length - 1])}.`} />
      ) : (
        <SourceNote source="workspace" detail="Your portfolio figures come from your own listings and enquiries." />
      )}
    >
      <InsightsHeader
        module="overview"
        title="Property intelligence"
        description="The rental market, where your listings sit in it, and how your portfolio is doing."
        meta={market ? <DataFreshness /> : undefined}
        actions={
          <>
            <LinkButton href="/phase1/reports" variant="outline" leftIcon={<FileSpreadsheet size={15} />} className="max-sm:flex-1">
              Reports
            </LinkButton>
            {market && (
              <LinkButton href="/phase1/market/transactions" variant="primary" className="max-sm:flex-1">
                Transactions
              </LinkButton>
            )}
          </>
        }
      />

      {/* ---------------------------------------------------------- the figures */}
      <MetricRail index={1} min={160} className="mb-5">
        <InsightMetric
          label="Median rent"
          subject="All developments · 12 months"
          value={market ? snap.medianRent : null}
          unavailable="Data unavailable"
          prefix="$"
          icon={<TrendingUp size={16} />}
          accent={RENT}
          delta={market ? { pct: snap.movementPct, label: 'last third of the year against the first' } : undefined}
          hint={snap.q1Rent && snap.q3Rent ? `Middle half ${money(snap.q1Rent)}–${money(snap.q3Rent)}` : undefined}
        >
          {market && <MiniTrend points={snap.rentByMonth} slot={RENT} label="Median rent by month" width={132} />}
        </InsightMetric>

        <InsightMetric
          label="Rent per sqft"
          subject="A month, all sizes"
          value={market ? snap.medianPsf : null}
          unavailable="Data unavailable"
          prefix="$"
          decimals={2}
          icon={<Ruler size={16} />}
          accent={PSF}
          hint="What the space costs, size aside"
        >
          {market && <MiniTrend points={snap.psfByMonth} slot={PSF} label="Rent per square foot by month" width={132} />}
        </InsightMetric>

        <InsightMetric
          label="Contracts"
          subject="Lodged in 12 months"
          value={market ? snap.count : null}
          unavailable="Data unavailable"
          icon={<Building2 size={16} />}
          accent={VOLUME}
          hint={market ? `${snap.projects} developments · ${districts.length} districts` : undefined}
        >
          {market && <MiniTrend points={snap.volumeByMonth} slot={VOLUME} label="Contracts by month" width={132} />}
        </InsightMetric>

        <InsightMetric
          label="Your live listings"
          subject={`${mine.length} in your portfolio`}
          value={live.length}
          icon={<Home size={16} />}
          accent={MINE}
          hint={`${recent} enquir${recent === 1 ? 'y' : 'ies'} in the last 30 days`}
        />
      </MetricRail>

      {/* ------------------------------------------------------------ the market */}
      {!market ? (
        <MarketUnavailable className="ins-rise mb-5" />
      ) : (
        <>
          <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
            <InsightPanel
              index={2}
              title={trend === 'rent' ? 'Median rent, month by month' : 'Contracts, month by month'}
              question={trend === 'rent' ? 'Which way have rents moved?' : 'How much is actually letting?'}
              actions={
                <ChipGroup
                  label="What to plot"
                  size="sm"
                  value={trend}
                  onChange={setTrend}
                  options={[{ key: 'rent', label: 'Rent' }, { key: 'volume', label: 'Contracts' }]}
                />
              }
            >
              <TrendChart
                key={trend}
                caption={trend === 'rent' ? 'Median monthly rent across all developments' : 'Contracts lodged each month'}
                labels={months.map(shortMonth)}
                height={250}
                kind={trend === 'rent' ? 'area' : 'bars'}
                valueLabel={trend === 'rent' ? money : (n) => Math.round(n).toLocaleString('en-SG')}
                reference={trend === 'rent' && snap.medianRent ? { value: snap.medianRent, label: `Median ${sgd(snap.medianRent)}` } : null}
                series={trendSeries}
              />
            </InsightPanel>

            <InsightPanel index={3} title="What is letting" question="Share of contracts by unit size.">
              <ShareDonut
                size={150}
                shares={mix.map((b, i) => ({ key: b.label, label: b.label, value: b.count, slot: i === 0 ? 0 : i === 1 ? 2 : i === 2 ? 1 : 3 }))}
                centre={(
                  <>
                    <span className="font-p1display text-[22px] font-bold leading-none tabular-nums text-p1-text">{snap.count}</span>
                    <span className="mt-1 text-[11px] text-p1-text-3">contracts</span>
                  </>
                )}
              />
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-ins-line pt-3">
                {mix.map((b) => (
                  <div key={b.label} className="min-w-0">
                    <div className="text-[11.5px] text-p1-text-3">{b.label} median</div>
                    <div className="text-[14px] font-semibold tabular-nums text-p1-text">{b.medianRent ? sgd(b.medianRent) : '—'}</div>
                  </div>
                ))}
              </div>
            </InsightPanel>
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <InsightPanel
              index={4}
              title="Rent per sqft by district"
              question="Where is space dearest? Select a district to see its contracts."
            >
              <BarList
                caption="Average rent per square foot by district, last 12 months"
                slot={PSF}
                items={districts.slice(0, 8).map((d) => ({
                  key: String(d.district),
                  label: d.label,
                  sub: `· ${d.contracts} leases`,
                  value: d.medianPsf,
                  display: d.medianPsf === null ? undefined : `$${d.medianPsf.toFixed(2)}`,
                  onSelect: () => router.push(`/phase1/market/transactions?district=${d.district}`),
                  selectLabel: `${d.label}: $${d.medianPsf?.toFixed(2)} per sqft on ${d.contracts} contracts. Open its transactions.`,
                }))}
              />
              {districts.length > 8 && (
                <p className="mt-3 text-[12px] text-p1-text-3">The 8 dearest of {districts.length} covered districts.</p>
              )}
            </InsightPanel>

            <InsightPanel
              index={5}
              padding="none"
              title="Your listings against the market"
              question="Asking rent per sqft, placed in the range comparable homes let for."
            >
              {positions.length === 0 ? (
                <InsightEmpty
                  icon={<Scale size={20} />}
                  title="Nothing to place yet"
                  description="Live rental listings with a size and a rent appear here, placed against comparable contracts."
                  action={<LinkButton href="/phase1/listings" variant="outline">Your listings</LinkButton>}
                />
              ) : (
                <ul className="divide-y divide-ins-line">
                  {positions.map(({ l, p }) => (
                    <li key={l.id}>
                      <Link
                        href={`/phase1/listings/${l.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ins-inset sm:px-5"
                      >
                        <PropertyImage seed={l.reference + l.project} src={coverPhoto(user?.id, l)} alt="" rounded="rounded-lg" className="h-11 w-14 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[13.5px] font-semibold text-p1-text">{l.project}</span>
                            <PositionChip p={p} />
                          </div>
                          <div className="truncate text-[12px] text-p1-text-3">
                            {l.bedrooms} bed · {sgd(l.monthlyRent)} · ${p.unitPsf.toFixed(2)} psf vs median ${p.medianPsf.toFixed(2)}
                          </div>
                          <RangeTrack p={p} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </InsightPanel>
          </div>

          {signals.length > 0 && (
            <section className="ins-rise mb-5" style={{ '--i': 6 } as React.CSSProperties} aria-labelledby="ins-signals">
              <h2 id="ins-signals" className="mb-3 text-[15px] font-semibold text-p1-text">Worth knowing</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {signals.map((s) => {
                  const Icon = s.key === 'riser' ? TrendingUp : s.key === 'busiest' ? Flame : LineChart;
                  return (
                    <Link
                      key={s.key}
                      href={s.href}
                      className="ins-hoist group flex flex-col rounded-2xl border border-ins-line bg-ins-panel p-4 shadow-ins focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-p1-primary sm:p-5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: seriesSoft(s.slot), color: seriesColour(s.slot) }} aria-hidden>
                          <Icon size={16} />
                        </span>
                        <span className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-p1-text-3">{s.label}</span>
                      </div>
                      <p className="mt-3 font-p1display text-[17px] font-bold leading-snug tracking-[-0.01em] text-p1-text">{s.headline}</p>
                      <p className="mt-1 flex-1 text-[13px] leading-5 text-p1-text-2">{s.detail}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-p1-primary dark:text-p1-info">
                        Look closer
                        <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* --------------------------------------------------------- the portfolio */}
      <InsightPanel
        index={7}
        title="Your portfolio"
        question="Where your listings stand, and which ones people ask about."
        actions={
          <Link href="/phase1/performance" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-p1-primary transition-colors hover:bg-p1-primary-soft dark:text-p1-info">
            Performance <ArrowRight size={13} aria-hidden />
          </Link>
        }
      >
        {mine.length === 0 ? (
          <InsightEmpty
            icon={<Home size={20} />}
            title="No listings yet"
            description="Your portfolio appears here once you add a listing."
            action={<LinkButton href="/phase1/listings/new" variant="primary">New listing</LinkButton>}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:divide-x lg:divide-ins-line">
            <div className="min-w-0">
              <h3 className="mb-3 text-[12.5px] font-semibold text-p1-text-2">Listings by standing</h3>
              <ShareDonut
                size={140}
                shares={statusShares}
                centre={(
                  <>
                    <span className="font-p1display text-[22px] font-bold leading-none tabular-nums text-p1-text">{mine.length}</span>
                    <span className="mt-1 text-[11px] text-p1-text-3">listings</span>
                  </>
                )}
              />
            </div>
            <div className="min-w-0 lg:pl-6">
              <h3 className="mb-3 text-[12.5px] font-semibold text-p1-text-2">Enquiries by listing, all time</h3>
              <BarList
                caption="Enquiries received for each listing"
                slot={MINE}
                emptyMessage="No enquiries yet."
                valueLabel={(n) => `${n}`}
                items={byListing.map(({ l, n }) => ({
                  key: l.id,
                  label: l.project,
                  sub: floorLabel(l) || districtCode(l.district),
                  value: n,
                  onSelect: () => router.push(`/phase1/listings/${l.id}`),
                  selectLabel: `${l.project}: ${n} enquiries. Open the listing.`,
                }))}
              />
            </div>
          </div>
        )}
      </InsightPanel>
    </InsightsShell>
  );
}

/* ------------------------------------------------------------ position bits */

function PositionChip({ p }: { p: MarketPosition }) {
  const tone = p.verdict === 'in line'
    ? 'bg-ins-inset text-p1-text-2'
    : p.verdict === 'above' ? 'bg-p1-warning-soft text-p1-warning' : 'bg-p1-info-soft text-p1-info';
  const arrow = p.verdict === 'in line' ? '→' : p.deltaPct > 0 ? '↑' : '↓';
  return (
    <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums', tone)} title={p.basisLabel}>
      <span aria-hidden>{arrow} </span>
      {p.verdict === 'in line' ? 'In line' : `${p.deltaPct > 0 ? '+' : ''}${p.deltaPct.toFixed(1)}%`}
    </span>
  );
}

/**
 * The comparable range as a track: full range faint, middle half stronger, the
 * median as a tick and the listing as a dot.
 */
function RangeTrack({ p }: { p: MarketPosition }) {
  const lo = Math.min(p.minPsf, p.unitPsf);
  const hi = Math.max(p.maxPsf, p.unitPsf);
  const at = (v: number) => `${((v - lo) / (hi - lo || 1)) * 100}%`;
  return (
    <div className="relative mt-2 h-3" aria-hidden>
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-ins-inset" />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
        style={{ left: at(p.q1Psf), width: `calc(${at(p.q3Psf)} - ${at(p.q1Psf)})`, background: seriesSoft(PSF), boxShadow: `inset 0 0 0 1px ${seriesColour(PSF)}` }}
      />
      <div className="absolute top-0 h-3 w-px bg-p1-text-3" style={{ left: at(p.medianPsf) }} />
      <div
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ins-panel"
        style={{ left: at(p.unitPsf), background: seriesColour(MINE) }}
      />
    </div>
  );
}
