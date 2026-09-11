"use client";

/**
 * Search placement.
 *
 * Featuring lifts one listing. Placement lifts the agent: in the districts they
 * buy, their name appears above other agents when a tenant searches. It is sold
 * by the day and priced by how contested the district is, which is the only
 * defensible way to price it — an agent will accept paying more for D9 and will
 * not accept paying D9 money for D25.
 *
 * The screen leads with the districts the agent already works, because those
 * are the ones worth buying and the ones they can judge the price of.
 */

import { useMemo, useState } from 'react';
import { Award, MapPin, Wallet, TrendingUp, Info, Check } from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, Callout, MetricStrip, Metric,
  EmptyState, SearchInput, LinkButton, cx,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { useDemo, TODAY } from '../../../lib/phase1/DemoContext';
import { sgd } from '../../../lib/phase1/data';
import { districtName } from '../../../lib/phase1/performance';
import { PLACEMENT_TIERS, placementTier, type PlacementBid } from '../../../lib/phase1/tools';

const ALL_DISTRICTS = Array.from({ length: 28 }, (_, i) => i + 1);

export default function PlacementPage() {
  const { state, setTools } = useDemo();
  const bids = state.tools.placements;
  const [query, setQuery] = useState('');

  /* Where the agent already has stock. Buying placement in a district you
     cannot service is money spent on enquiries you will have to turn down. */
  const worked = useMemo(() => {
    const counts = new Map<number, number>();
    for (const l of state.listings) {
      if (l.archived) continue;
      counts.set(l.district, (counts.get(l.district) ?? 0) + 1);
    }
    return counts;
  }, [state.listings]);

  const bidFor = (d: number) => bids.find((b) => b.district === d) ?? null;
  const active = bids.filter((b) => b.active);
  const dailyTotal = active.reduce((n, b) => n + b.dailySgd, 0);

  const toggle = (district: number) => {
    const existing = bidFor(district);
    if (existing) {
      setTools({ placements: bids.map((b) => (b.district === district ? { ...b, active: !b.active } : b)) });
      return;
    }
    const bid: PlacementBid = {
      district,
      dailySgd: placementTier(district).dailySgd,
      startedAt: TODAY.toISOString().slice(0, 10),
      active: true,
    };
    setTools({ placements: [...bids, bid] });
  };

  const q = query.trim().toLowerCase();
  const visible = ALL_DISTRICTS.filter((d) => {
    if (!q) return true;
    return `d${String(d).padStart(2, '0')} ${d} ${districtName(d)}`.toLowerCase().includes(q);
  });

  const ordered = [...visible].sort((a, b) => (worked.get(b) ?? 0) - (worked.get(a) ?? 0) || a - b);

  return (
    <>
      <PageHeader
        eyebrow="Profile and reputation"
        title="Search placement"
        description="Appear above other agents in the districts you work. Sold by the day, priced by how contested the district is, and stopped whenever you want."
        actions={<LinkButton href="/phase1/profile" variant="outline">Your agent profile</LinkButton>}
      />

      <MetricStrip className="mb-6" cols={3}>
        <Metric label="Districts held" value={active.length} hint={active.length ? active.map((b) => `D${b.district}`).join(', ') : 'None yet'} icon={<MapPin size={15} />} />
        <Metric label="Daily spend" value={dailyTotal ? sgd(dailyTotal) : '—'} hint={dailyTotal ? `${sgd(dailyTotal * 30)} over 30 days` : 'Nothing committed'} icon={<Wallet size={15} />} />
        <Metric label="Districts you list in" value={worked.size} hint="From your own portfolio" icon={<TrendingUp size={15} />} />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard
          title="Districts"
          description="The ones you already list in are first."
          icon={<Award size={16} />}
          actions={<SearchInput size="sm" value={query} onChange={setQuery} label="Find a district" placeholder="District or area" />}
          padding="md"
        >
          {ordered.length === 0 ? (
            <EmptyState compact title="No district matches that" description="Try a number, or an area name such as Bukit Timah." />
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {ordered.map((d) => {
                const tier = placementTier(d);
                const bid = bidFor(d);
                const held = Boolean(bid?.active);
                const stock = worked.get(d) ?? 0;
                return (
                  <li key={d}>
                    <div
                      className={cx(
                        'flex h-full flex-col rounded-xl border p-4 transition-colors',
                        held ? 'border-p1-primary bg-p1-primary-soft/50' : 'border-p1-border bg-p1-surface',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-p1display text-[15px] font-bold text-p1-text">
                            D{String(d).padStart(2, '0')} {districtName(d)}
                          </div>
                          <div className="mt-0.5 text-[12.5px] text-p1-text-3">
                            {tier.label} · {sgd(tier.dailySgd)} a day
                          </div>
                        </div>
                        {stock > 0 && <Pill tone="accent">{stock} listing{stock === 1 ? '' : 's'}</Pill>}
                      </div>

                      <div className="mt-3.5 flex items-center justify-between gap-3">
                        <span className="text-[12.5px] text-p1-text-3">
                          {held ? `Held since ${new Date(bid!.startedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}` : 'Not held'}
                        </span>
                        <Button
                          size="sm"
                          variant={held ? 'outline' : 'primary'}
                          leftIcon={held ? <Check size={14} /> : undefined}
                          onClick={() => toggle(d)}
                        >
                          {held ? 'Release' : 'Hold district'}
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <aside className="grid min-w-0 content-start gap-4 [&>*]:min-w-0">
          <Card className="border-transparent bg-p1-sidebar text-white" padding="lg">
            <div className="font-p1display text-[17px] font-bold text-white">What you are buying</div>
            <p className="mt-2 text-[13.5px] leading-5 text-white/75">
              Your name and CEA registration above the ordinary agent results for that district, with a marker saying
              the position is paid. It does not change where your listings rank — that is featuring.
            </p>
            <ul className="mt-4 space-y-2 border-t border-white/12 pt-4 text-[13.5px] text-white/75">
              {Object.entries(PLACEMENT_TIERS).map(([key, t]) => (
                <li key={key} className="flex items-center justify-between gap-3">
                  <span>{t.label}</span>
                  <span className="font-medium tabular-nums text-p1-accent">{sgd(t.dailySgd)} / day</span>
                </li>
              ))}
            </ul>
          </Card>

          {active.length > 0 && (
            <Card padding="md">
              <div className="text-[13.5px] font-semibold text-p1-text">Running total</div>
              <ul className="mt-2.5 divide-y divide-p1-border text-[13.5px]">
                {active.map((b) => (
                  <li key={b.district} className="flex items-center justify-between py-2">
                    <span className="text-p1-text-2">D{String(b.district).padStart(2, '0')} {districtName(b.district)}</span>
                    <span className="font-medium tabular-nums text-p1-text">{sgd(b.dailySgd)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-p1-border pt-3">
                <span className="text-[13.5px] font-semibold text-p1-text">A day</span>
                <span className="font-p1display text-[18px] font-bold tabular-nums text-p1-text">{sgd(dailyTotal)}</span>
              </div>
            </Card>
          )}

          <Callout tone="info" title="What is real here" icon={<Info size={17} />}>
            Holding and releasing a district is working and stored against your workspace. The ranking it buys sits on
            the public tenant site, which is the later phase — so there is nothing on this prototype for it to sort.
          </Callout>
        </aside>
      </div>
    </>
  );
}
