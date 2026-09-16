"use client";

/**
 * Business → Performance.
 *
 * Which listings are working. The data comes from the workspace provider and
 * nowhere else: with Demo Data ON that is the demo account, whose traffic is
 * modelled; with it OFF it is the agent's own listings, whose traffic is not
 * measured yet, so the screen shows what is real (listings, enquiries,
 * viewings) and says plainly that the rest is not counted.
 *
 * The people waiting for a reply have their own screen, /phase1/enquiries.
 */

import { useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { Card, EmptyState, LinkButton, PageHeader, Segmented } from '../../../components/phase1/kit';
import { TrendPanel } from '../../../components/phase1/performance/TrendPanel';
import { InsightCard, Leaderboard, NeedsLift, Spotlight, type Ranked } from '../../../components/phase1/performance/panels';
import { BrowseCalendar, DistrictDonut, UnitSizeDemand } from '../../../components/phase1/performance/charts';
import { LiveView } from '../../../components/phase1/performance/LiveView';
import { listingWindow, portfolioWindow, type WindowDays } from '../../../components/phase1/performance/model';
import { TODAY, useDemo } from '../../../lib/phase1/DemoContext';
import { useEnquiries } from '../../../lib/phase1/useEnquiries';
import { useSession } from '../../../lib/phase1/SessionContext';
import { weeklyInsight } from '../../../lib/phase1/performance';

const WINDOWS: { key: `${WindowDays}`; label: string }[] = [
  { key: '7', label: '7D' }, { key: '30', label: '30D' }, { key: '90', label: '90D' },
];

export default function PerformanceView() {
  const { state } = useDemo();
  const { user } = useSession();
  const { newCount, enquiries: inbox } = useEnquiries();
  const [win, setWin] = useState<`${WindowDays}`>('30');
  const days = Number(win) as WindowDays;

  const live = useMemo(
    () => state.listings.filter((l) => !l.archived && (l.status === 'published' || l.status === 'paused' || l.status === 'expired')),
    [state.listings],
  );

  const portfolio = useMemo(() => portfolioWindow(live, days), [live, days]);
  const ranked: Ranked[] = useMemo(() => live.map((l) => ({ l, w: listingWindow(l, days) })), [live, days]);
  const insight = useMemo(() => weeklyInsight(state.listings.filter((l) => !l.archived)), [state.listings]);

  const byEnquiries = useMemo(
    () => [...ranked].sort((a, b) => b.w.enquiries - a.w.enquiries || b.w.views - a.w.views),
    [ranked],
  );
  const best = byEnquiries[0];
  const weakest = byEnquiries.slice(1).reverse().slice(0, 3);

  const measured = live.length > 0 && portfolio.measured;

  return (
    <>
      <PageHeader
        eyebrow="Business"
        title="Performance"
        description={measured
          ? 'How your live listings are doing, and which of them need a lift.'
          : 'Your live listings and the enquiries they have brought in.'}
        actions={measured ? (
          <Segmented<`${WindowDays}`> label="Reporting period" value={win} onChange={setWin} options={WINDOWS} />
        ) : undefined}
      />

      {live.length === 0 ? (
        <Card className="rounded-2xl">
          <EmptyState
            icon={<Building2 size={26} />}
            title="Nothing is live yet"
            description="Performance appears once a listing is published. Publish a draft to start receiving enquiries."
            action={<LinkButton href="/phase1/listings?status=draft" variant="primary">See your drafts</LinkButton>}
          />
        </Card>
      ) : !measured ? (
        <LiveView live={live} enquiries={inbox} waiting={newCount} ownerId={user?.id} />
      ) : (
        <div className="vr-stagger space-y-5">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <TrendPanel data={portfolio} days={days} today={TODAY} waiting={newCount} />
            {best && <Spotlight item={best} ownerId={user?.id} days={days} />}
          </div>

          <Leaderboard rows={ranked} ownerId={user?.id} days={days} />

          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
            <DistrictDonut rows={ranked} days={days} />
            <UnitSizeDemand live={live} today={TODAY} />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="md:col-span-2 xl:col-span-1"><BrowseCalendar live={live} today={TODAY} /></div>
            {insight && <InsightCard insight={insight} />}
            {weakest.length > 0 && (
              <div className={insight ? undefined : 'md:col-span-1'}>
                <NeedsLift rows={weakest} all={ranked} days={days} />
              </div>
            )}
          </div>

          <p className="px-1 text-[12px] leading-5 text-p1-text-3">
            Figures for the demo account are modelled from each listing so the walkthrough reads the same every time.
            Enquiries waiting for a reply come from the inbox. Your own listings are measured once the tenant site is live.
          </p>
        </div>
      )}
    </>
  );
}
