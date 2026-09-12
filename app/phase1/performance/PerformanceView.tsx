"use client";

/**
 * Business → Performance.
 *
 * Two questions an agent asks every week: which listings are working, and who
 * is waiting for a reply. Both live here so the dashboard can stay a summary.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LinkButton, Card, SectionCard, PageHeader, MetricStrip, Metric, Callout, Segmented, Tabs,
  DataTable, Column, FilterChips, EmptyState, MiniBars, HBars, Pagination, usePagination, cx } from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { PropertyCell } from '../../../components/phase1/listing/ListingCard';
import { Pulse } from '../../../components/phase1/listing/pulse';
import { HealthRing } from '../../../components/phase1/listing/health';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { sgd } from '../../../lib/phase1/data';
import {
  listingStats, totals, ENQUIRY_STATUS, Enquiry, EnquiryStatus, weeklyInsight, districtName } from '../../../lib/phase1/performance';
import {
  Eye, MessageSquare, Bookmark, Percent, Lightbulb, TrendingUp, MessageCircle, Building2, ArrowRight, Phone, Inbox } from 'lucide-react';
import { sgDateShort } from '../../../lib/phase1/format';

type Period = '7d' | '30d';
type Tab = 'overview' | 'enquiries';
type EnqFilter = EnquiryStatus | 'all';

const CHANNEL_ICON: Record<Enquiry['channel'], React.ReactNode> = {
  'V-RENT': <MessageSquare size={13} aria-hidden />,
  WhatsApp: <MessageCircle size={13} aria-hidden />,
  Phone: <Phone size={13} aria-hidden />,
};

/**
 * Two jobs on one screen: how the live listings are doing, and the enquiries
 * waiting for a reply. They are the same numbers read two ways, so they share
 * a page — but each has its own address, because "Enquiries" and "Performance"
 * are different errands and a sidebar that sends both to the same place makes
 * the second one look broken.
 */
export default function PerformanceView({ initialTab = 'overview' }: { initialTab?: Tab }) {
  const { state } = useDemo();
  const [period, setPeriod] = useState<Period>('7d');
  const [tab, setTab] = useState<Tab>(initialTab);
  const [enqFilter, setEnqFilter] = useState<EnqFilter>('all');

  const live = useMemo(
    () => state.listings.filter((l) => !l.archived && (l.status === 'published' || l.status === 'paused' || l.status === 'expired')),
    [state.listings],
  );

  const t = useMemo(() => totals(live), [live]);
  const views = period === '7d' ? t.views7d : t.views30d;
  const enquiries = period === '7d' ? t.enquiries7d : t.enquiries30d;
  /** The inbox itself, as opposed to the count above. */
  const inbox = state.enquiries;
  const conversion = views ? Math.round((enquiries / views) * 1000) / 10 : 0;

  /** Week-on-week change across the whole portfolio, from the same 14-day series. */
  const prev7 = t.series.slice(0, 7).reduce((n, v) => n + v, 0);
  const last7 = t.series.slice(7).reduce((n, v) => n + v, 0);
  const viewTrend = prev7 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;

  const ranked = useMemo(
    () => [...live]
      .map((l) => ({ l, s: listingStats(l) }))
      .sort((a, b) => (period === '7d' ? b.s.enquiries7d - a.s.enquiries7d : b.s.enquiries30d - a.s.enquiries30d)),
    [live, period],
  );
  const best = ranked.slice(0, 5);
  const weakest = [...ranked].reverse().slice(0, 3);
  const insight = useMemo(() => weeklyInsight(state.listings.filter((l) => !l.archived)), [state.listings]);

  const enquiryRows = useMemo(
    () => inbox.filter((e) => enqFilter === 'all' || e.status === enqFilter),
    [enqFilter, inbox],
  );
  const pg = usePagination(enquiryRows, 8);
  const newCount = inbox.filter((e) => e.status === 'new').length;
  const listingOf = (id: string) => state.listings.find((l) => l.id === id);

  const enquiryColumns: Column<Enquiry>[] = [
    {
      key: 'from', header: 'From', width: '30%',
      render: (e) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-p1-text">{e.name}</span>
            {e.status === 'new' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-p1-info" aria-hidden />}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-5 text-p1-text-2">{e.message}</p>
        </div>
      ),
    },
    {
      key: 'listing', header: 'Listing', hideBelow: 'md',
      render: (e) => {
        const l = listingOf(e.listingId);
        return l
          ? <PropertyCell l={l} href={`/phase1/listings/${l.id}`} sub={`${l.unitNo} · ${sgd(l.monthlyRent)}/mo`} />
          : <span className="text-p1-text-3">Listing removed</span>;
      },
    },
    {
      key: 'budget', header: 'Budget · Move-in', hideBelow: 'lg', muted: true, nowrap: true,
      render: (e) => (
        <span className="text-[13px] tabular-nums">
          {e.budget ? sgd(e.budget) : '—'}
          <span className="block text-[12px] text-p1-text-3">{e.moveIn ? sgDateShort(e.moveIn) : 'Flexible'}</span>
        </span>
      ),
    },
    {
      key: 'channel', header: 'Channel', hideBelow: 'xl', nowrap: true,
      render: (e) => <span className="inline-flex items-center gap-1.5 text-[13px] text-p1-text-2">{CHANNEL_ICON[e.channel]}{e.channel}</span>,
    },
    {
      key: 'received', header: 'Received', align: 'right', nowrap: true, sortValue: (e) => e.at,
      render: (e) => <span className="text-[12.5px] tabular-nums text-p1-text-3">{e.at.replace(' ', ' · ')}</span>,
    },
    {
      key: 'status', header: 'Status', align: 'right', nowrap: true,
      render: (e) => <Pill tone={ENQUIRY_STATUS[e.status].tone}>{ENQUIRY_STATUS[e.status].label}</Pill>,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={tab === 'enquiries' ? 'Clients' : 'Business'}
        title={tab === 'enquiries' ? 'Enquiries' : 'Performance'}
        description={tab === 'enquiries'
          ? 'Every enquiry waiting for a reply, and how each listing is drawing them in.'
          : 'How your live listings are doing, and every enquiry waiting for a reply.'}
        actions={
          <Segmented<Period>
            label="Reporting period"
            value={period}
            onChange={setPeriod}
            options={[{ key: '7d', label: 'Last 7 days' }, { key: '30d', label: 'Last 30 days' }]}
          />
        }
      />

      {live.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 size={26} />}
            title="Nothing is live yet"
            description="Performance appears once a listing is published. Publish a draft to start collecting views and enquiries."
            action={<LinkButton href="/phase1/listings?status=draft" variant="primary">See your drafts</LinkButton>}
          />
        </Card>
      ) : (
        <>
          <MetricStrip cols={4} className="mb-5">
            <Metric label="Views" value={views.toLocaleString()} icon={<Eye size={15} />} emphasis
              delta={period === '7d' ? { value: `${viewTrend > 0 ? '+' : ''}${viewTrend}%`, good: viewTrend >= 0, label: 'week on week' } : undefined}
              hint={period === '7d' ? 'vs previous 7 days' : 'across all live listings'} />
            <Metric label="Enquiries" value={enquiries} icon={<MessageSquare size={15} />} emphasis
              hint={newCount ? `${newCount} still unanswered` : 'all answered'} href="#enquiries" />
            <Metric label="Saves" value={t.saves} icon={<Bookmark size={15} />} hint="Tenants who shortlisted a unit" />
            <Metric label="Enquiry rate" value={`${conversion}%`} icon={<Percent size={15} />}
              tone={conversion >= 5 ? 'success' : conversion >= 3 ? 'default' : 'warning'}
              hint="Enquiries per 100 views" />
          </MetricStrip>

          {insight && (
            <Callout tone="accent" className="mb-5" icon={<Lightbulb size={17} />} title={insight.headline}
              action={insight.href && <LinkButton href={insight.href} size="sm" variant="outline">Act on this</LinkButton>}>
              {insight.detail}
            </Callout>
          )}

          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            label="Performance sections"
            className="mb-5"
            items={[
              { key: 'overview', label: 'Overview', icon: <TrendingUp size={15} /> },
              { key: 'enquiries', label: 'Enquiries', count: inbox.length, icon: <Inbox size={15} /> },
            ]}
          />

          {tab === 'overview' ? (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 space-y-5">
                <SectionCard
                  title="Views, last 14 days"
                  description={`${t.views7d.toLocaleString()} in the last 7 days, ${prev7.toLocaleString()} in the 7 before`}
                >
                  <MiniBars data={t.series} height={96} label={`Daily views over the last 14 days, ending at ${t.series[t.series.length - 1]} views`} />
                  <div className="mt-2 flex justify-between text-[12px] text-p1-text-3">
                    <span>14 days ago</span>
                    <span className="font-medium text-p1-text-2">Last 7 days highlighted</span>
                    <span>Today</span>
                  </div>
                </SectionCard>

                <SectionCard title="Enquiries by listing" description={`Over the last ${period === '7d' ? '7' : '30'} days`}>
                  <HBars
                    rows={best.map(({ l, s }) => ({
                      label: `${l.project} ${l.unitNo}`,
                      hint: districtName(l.district),
                      value: period === '7d' ? s.enquiries7d : s.enquiries30d,
                    }))}
                  />
                </SectionCard>

                <SectionCard title="All live listings" padding="none">
                  <ul className="divide-y divide-p1-border">
                    {ranked.map(({ l, s }) => (
                      <li key={l.id}>
                        <Link href={`/phase1/listings/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-p1-subtle/60 sm:px-5">
                          <PropertyCell l={l} sub={`${l.unitNo} · ${sgd(l.monthlyRent)}/mo`} />
                          <span className="ml-auto hidden shrink-0 text-right sm:block">
                            <span className="block text-[14px] font-semibold tabular-nums text-p1-text">{period === '7d' ? s.views7d : s.views30d}</span>
                            <span className="block text-[12px] text-p1-text-3">views</span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-[14px] font-semibold tabular-nums text-p1-text">{period === '7d' ? s.enquiries7d : s.enquiries30d}</span>
                            <span className="block text-[12px] text-p1-text-3">enquiries</span>
                          </span>
                          <Pulse listing={l} className="hidden shrink-0 md:inline-flex" />
                          <ArrowRight size={16} className="shrink-0 text-p1-text-3" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              </div>

              <div className="space-y-4">
                <SectionCard title="Best performer" padding="sm">
                  {best[0] && (
                    <Link href={`/phase1/listings/${best[0].l.id}`} className="block rounded-lg p-1 hover:bg-p1-subtle/60">
                      <PropertyCell l={best[0].l} sub={`${best[0].l.unitNo} · ${districtName(best[0].l.district)}`} />
                      <div className="mt-3 flex items-center justify-between border-t border-p1-border pt-3">
                        <span className="text-[13px] text-p1-text-2">
                          <span className="font-semibold tabular-nums text-p1-text">{period === '7d' ? best[0].s.enquiries7d : best[0].s.enquiries30d}</span> enquiries
                          {' · '}
                          <span className="font-semibold tabular-nums text-p1-text">{best[0].s.conversion}%</span> rate
                        </span>
                        <Pulse listing={best[0].l} showSpark={false} />
                      </div>
                    </Link>
                  )}
                </SectionCard>

                <SectionCard title="Needs a lift" description="Fewest enquiries this period" padding="none">
                  <ul className="divide-y divide-p1-border">
                    {weakest.map(({ l, s }) => (
                      <li key={l.id}>
                        <Link href={`/phase1/listings/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-p1-subtle/60">
                          <HealthRing listing={l} size={32} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-medium text-p1-text">{l.project}</span>
                            <span className="block text-[12.5px] text-p1-text-3">
                              {period === '7d' ? s.enquiries7d : s.enquiries30d} enquiries · {l.images} photo{l.images === 1 ? '' : 's'}
                            </span>
                          </span>
                          <ArrowRight size={15} className="shrink-0 text-p1-text-3" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </SectionCard>

                <Card padding="sm" className="border-dashed">
                  <div className="text-[13.5px] font-semibold text-p1-text">How these numbers are produced</div>
                  <p className="mt-1 text-[12.5px] leading-5 text-p1-text-3">
                    The public tenant site opens in Phase 2, so nothing here is measured yet. Figures are derived from each
                    listing so the walkthrough is consistent between runs. The shape of the report is what is being reviewed,
                    not the values.
                  </p>
                </Card>
              </div>
            </div>
          ) : (
            <div id="enquiries" className="space-y-4">
              <FilterChips<EnqFilter>
                label="Filter enquiries"
                value={enqFilter}
                onChange={(k) => { setEnqFilter(k); pg.setPage(1); }}
                options={[
                  { key: 'all', label: 'All', count: inbox.length },
                  { key: 'new', label: 'New', count: newCount },
                  { key: 'viewing', label: 'Viewing booked', count: inbox.filter((e) => e.status === 'viewing').length },
                  { key: 'replied', label: 'Replied', count: inbox.filter((e) => e.status === 'replied').length },
                  { key: 'closed', label: 'Closed', count: inbox.filter((e) => e.status === 'closed').length },
                ]}
              />

              {enquiryRows.length === 0 ? (
                <Card>
                  <EmptyState compact icon={<Inbox size={22} />} title="No enquiries in this view"
                    description="Change the filter to see the rest of your enquiries." />
                </Card>
              ) : (
                <>
                  <DataTable<Enquiry>
                    columns={enquiryColumns}
                    rows={pg.slice}
                    rowKey={(e) => e.id}
                    caption="Enquiries"
                    minWidth={760}
                    rowClassName={(e) => cx(e.status === 'new' && 'bg-p1-info-soft/25')}
                  />
                  <Pagination page={pg.page} pages={pg.pages} onChange={pg.setPage} from={pg.from} to={pg.to} total={pg.total} noun="enquiries" />
                </>
              )}

              <Callout tone="neutral" compact>
                Replying, booking a viewing and closing an enquiry are Phase 1.5. This screen shows where the lead lands and
                what the agent needs to see about it.
              </Callout>
            </div>
          )}
        </>
      )}

    </>
  );
}
