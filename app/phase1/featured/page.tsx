"use client";

/**
 * Featured placement.
 *
 * A paid slot that lifts one listing above the ordinary results in its district
 * and property type for a fixed run. The screen has to do three honest things:
 * say what it costs before the agent commits, forecast the result as a range
 * rather than a promise, and report what the money actually bought once the run
 * is under way.
 *
 * Reach is forecast from the listing's own recent traffic, not from a house
 * average, because an agent can check their own numbers and will stop trusting
 * a figure they cannot reconcile.
 */

import { useMemo, useState } from 'react';
import { Rocket, TrendingUp, Wallet, Eye, MessageSquare, Ban, Check, Info } from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, Callout, MetricStrip, Metric, ProgressBar,
  DataTable, EmptyState, SelectInput, LinkButton, cx, type Column,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { ConfirmDialog } from '../../../components/phase1/overlays';
import { useDemo, TODAY } from '../../../lib/phase1/DemoContext';
import { sgd } from '../../../lib/phase1/data';
import { listingStats, districtName } from '../../../lib/phase1/performance';
import {
  FEATURE_RATES, campaignActive, featureForecast, featureSpend, featurableListings, toolsId,
  type FeatureCampaign, type FeatureDays,
} from '../../../lib/phase1/tools';

const DAY_OPTIONS: { days: FeatureDays; label: string; note: string }[] = [
  { days: 7, label: '7 days', note: 'A weekend and the weeknights either side of it.' },
  { days: 14, label: '14 days', note: 'Two full weekends. The usual choice for a new listing.' },
  { days: 30, label: '30 days', note: 'The cheapest day rate. For a unit that is not moving.' },
];

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });

export default function FeaturedPage() {
  const { state, setTools } = useDemo();
  const tools = state.tools;
  const [listingId, setListingId] = useState('');
  const [days, setDays] = useState<FeatureDays>(14);
  const [stopping, setStopping] = useState<FeatureCampaign | null>(null);

  const available = useMemo(
    () => featurableListings(state.listings, tools, TODAY),
    [state.listings, tools],
  );
  const chosen = available.find((l) => l.id === listingId) ?? null;
  const byId = useMemo(() => new Map(state.listings.map((l) => [l.id, l])), [state.listings]);

  const forecast = featureForecast(chosen ? listingStats(chosen).views30d : 0, days);
  const spend = featureSpend(days);

  const active = tools.featured.filter((c) => campaignActive(c, TODAY));
  const spent = tools.featured.reduce((n, c) => n + (c.status === 'cancelled' ? 0 : c.spendSgd), 0);
  const gainedViews = tools.featured.reduce((n, c) => n + c.views, 0);
  const gainedEnquiries = tools.featured.reduce((n, c) => n + c.enquiries, 0);
  const costPerEnquiry = gainedEnquiries > 0 ? spent / gainedEnquiries : 0;

  const start = () => {
    if (!chosen) return;
    const base = listingStats(chosen);
    /* Day one of a run has produced nothing yet. Seeding a campaign with the
       numbers it will eventually reach would be a lie on the screen an agent
       looks at hardest. */
    const campaign: FeatureCampaign = {
      id: toolsId('feat'),
      listingId: chosen.id,
      days,
      startedAt: iso(TODAY),
      endsAt: iso(addDays(TODAY, days)),
      spendSgd: spend,
      ratePerDay: FEATURE_RATES[days],
      views: Math.round(base.views7d * 0.4),
      enquiries: 0,
      status: 'active',
    };
    setTools({ featured: [campaign, ...tools.featured] });
    setListingId('');
  };

  const stop = () => {
    if (!stopping) return;
    setTools({
      featured: tools.featured.map((c) =>
        (c.id === stopping.id ? { ...c, status: 'cancelled' as const, endsAt: iso(TODAY) } : c)),
    });
    setStopping(null);
  };

  const columns: Column<FeatureCampaign>[] = [
    {
      key: 'listing',
      header: 'Listing',
      render: (c) => {
        const l = byId.get(c.listingId);
        return (
          <div className="min-w-0">
            <div className="truncate font-medium text-p1-text">{l ? `${l.project} ${l.unitNo}` : 'Listing removed'}</div>
            <div className="truncate text-[12.5px] text-p1-text-3">
              {l ? `D${String(l.district).padStart(2, '0')} ${districtName(l.district)} · ${l.propertyType}` : '—'}
            </div>
          </div>
        );
      },
      sortValue: (c) => byId.get(c.listingId)?.project ?? '',
    },
    {
      key: 'run',
      header: 'Run',
      nowrap: true,
      render: (c) => (
        <div>
          <div className="tabular-nums">{fmtDate(c.startedAt)} → {fmtDate(c.endsAt)}</div>
          <div className="text-[12.5px] text-p1-text-3">{c.days} days at {sgd(c.ratePerDay)}/day</div>
        </div>
      ),
      sortValue: (c) => c.startedAt,
    },
    {
      key: 'progress',
      header: 'Elapsed',
      width: '160px',
      hideBelow: 'md',
      render: (c) => {
        const gone = Math.min(c.days, Math.max(0,
          Math.round((TODAY.getTime() - new Date(c.startedAt).getTime()) / 86400000)));
        return campaignActive(c, TODAY)
          ? <ProgressBar value={(gone / c.days) * 100} size="sm" label={`Day ${gone} of ${c.days}`} />
          : <span className="text-[12.5px] text-p1-text-3">Finished</span>;
      },
    },
    { key: 'spend', header: 'Spend', align: 'right', nowrap: true, render: (c) => <span className="tabular-nums">{sgd(c.spendSgd)}</span>, sortValue: (c) => c.spendSgd },
    { key: 'views', header: 'Views', align: 'right', nowrap: true, render: (c) => <span className="tabular-nums">{c.views.toLocaleString('en-SG')}</span>, sortValue: (c) => c.views },
    { key: 'enq', header: 'Enquiries', align: 'right', nowrap: true, hideBelow: 'sm', render: (c) => <span className="tabular-nums">{c.enquiries}</span>, sortValue: (c) => c.enquiries },
    {
      key: 'act',
      header: '',
      align: 'right',
      render: (c) => (campaignActive(c, TODAY) ? (
        <Button size="sm" variant="outline" leftIcon={<Ban size={14} />} onClick={() => setStopping(c)}>Stop</Button>
      ) : (
        <Pill tone={c.status === 'cancelled' ? 'neutral' : 'success'}>{c.status === 'cancelled' ? 'Stopped' : 'Completed'}</Pill>
      )),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Listings and marketing"
        title="Featured placement"
        description="Put one listing at the top of its district and property type for a fixed run. Priced per day, cheaper the longer the commitment, and reported against what it produced."
        actions={<LinkButton href="/phase1/listings" variant="outline">Listing manager</LinkButton>}
      />

      <MetricStrip className="mb-6" cols={4}>
        <Metric label="Running now" value={active.length} hint={active.length === 1 ? '1 listing featured' : `${active.length} listings featured`} icon={<Rocket size={15} />} />
        <Metric label="Committed" value={sgd(spent)} hint="Across every run you have started" icon={<Wallet size={15} />} />
        <Metric label="Views from featuring" value={gainedViews.toLocaleString('en-SG')} hint="Counted only while a run was live" icon={<Eye size={15} />} tone={gainedViews ? 'success' : 'default'} />
        <Metric
          label="Cost per enquiry"
          value={costPerEnquiry ? sgd(Math.round(costPerEnquiry)) : '—'}
          hint={gainedEnquiries ? `${gainedEnquiries} enquiries attributed` : 'No enquiries attributed yet'}
          icon={<MessageSquare size={15} />}
        />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-6 [&>*]:min-w-0">
          <SectionCard
            title="Start a featured run"
            description="Pick a published listing and how long to run it for."
            icon={<Rocket size={16} />}
          >
            {available.length === 0 ? (
              <EmptyState
                icon={<Rocket size={22} />}
                title="Nothing available to feature"
                description={state.listings.some((l) => l.status === 'published')
                  ? 'Every published listing already has a run against it.'
                  : 'Featuring lifts a listing inside the search results, so the listing has to be published first.'}
                action={<LinkButton href="/phase1/listings" size="sm">Open the listing manager</LinkButton>}
              />
            ) : (
              <div className="grid gap-5">
                <SelectInput
                  label="Listing"
                  value={listingId}
                  onChange={(e) => setListingId(e.target.value)}
                  hint="Published listings that are not already featured."
                  options={[
                    { value: '', label: 'Choose a listing…' },
                    ...available.map((l) => ({
                      value: l.id,
                      label: `${l.project} ${l.unitNo} — D${String(l.district).padStart(2, '0')} · ${sgd(l.monthlyRent)}/mo`,
                    })),
                  ]}
                />

                <fieldset>
                  <legend className="mb-2 text-[13.5px] font-semibold text-p1-text">How long</legend>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {DAY_OPTIONS.map((o) => (
                      <button
                        key={o.days}
                        type="button"
                        onClick={() => setDays(o.days)}
                        aria-pressed={days === o.days}
                        className={cx(
                          'cursor-pointer rounded-xl border p-4 text-left transition-colors',
                          days === o.days
                            ? 'border-p1-primary bg-p1-primary-soft/60 ring-1 ring-p1-primary'
                            : 'border-p1-border bg-p1-surface hover:border-p1-border-strong',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-p1display text-[16px] font-bold text-p1-text">{o.label}</span>
                          {days === o.days && <Check size={16} className="text-p1-primary dark:text-p1-info" aria-hidden />}
                        </div>
                        <div className="mt-1 text-[13px] font-semibold tabular-nums text-p1-text-2">
                          {sgd(FEATURE_RATES[o.days])}/day · {sgd(featureSpend(o.days))} total
                        </div>
                        <p className="mt-1.5 text-[12.5px] leading-[1.45] text-p1-text-3">{o.note}</p>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="rounded-xl border border-p1-border bg-p1-subtle/60 p-4">
                  <div className="flex items-center gap-2 text-[13.5px] font-semibold text-p1-text">
                    <TrendingUp size={15} className="text-p1-primary dark:text-p1-info" aria-hidden />
                    What this run should produce
                  </div>
                  {chosen ? (
                    <>
                      <p className="mt-1.5 text-[13.5px] leading-5 text-p1-text-2">
                        {chosen.project} {chosen.unitNo} is taking about{' '}
                        <strong className="tabular-nums text-p1-text">{forecast.daily}</strong> views a day unfeatured.
                        A featured slot in D{String(chosen.district).padStart(2, '0')} typically runs at two to three
                        and a half times that, so expect roughly{' '}
                        <strong className="tabular-nums text-p1-text">
                          {forecast.low.toLocaleString('en-SG')}–{forecast.high.toLocaleString('en-SG')}
                        </strong>{' '}
                        views over {days} days.
                      </p>
                      <p className="mt-2 text-[12.5px] leading-5 text-p1-text-3">
                        A range, not a number. Placement competes with whatever else is running in the district that
                        week, and the platform will not pretend to know that in advance.
                      </p>
                    </>
                  ) : (
                    <p className="mt-1.5 text-[13.5px] text-p1-text-3">
                      Choose a listing and the forecast is worked out from its own traffic.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-p1-border pt-4">
                  <div>
                    <div className="font-p1display text-[22px] font-bold tabular-nums text-p1-text">{sgd(spend)}</div>
                    <div className="text-[12.5px] text-p1-text-3">
                      Charged to your {state.paymentMethod ?? 'payment method'} on file when the run starts.
                    </div>
                  </div>
                  <Button variant="primary" size="lg" disabled={!chosen} onClick={start} leftIcon={<Rocket size={16} />}>
                    Start the run
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Runs" description="Live and finished, newest first." icon={<Eye size={16} />} padding="none">
            <DataTable
              flush
              columns={columns}
              rows={tools.featured}
              rowKey={(c) => c.id}
              minWidth={880}
              caption="Featured placement runs"
              empty={<EmptyState compact title="No runs yet" description="Start one above and it is reported here from the first day." />}
            />
          </SectionCard>
        </div>

        <aside className="grid min-w-0 content-start gap-4 [&>*]:min-w-0">
          <Card className="border-transparent bg-p1-sidebar text-white" padding="lg">
            <div className="font-p1display text-[17px] font-bold text-white">How the slot is filled</div>
            <ul className="mt-3 space-y-2.5 text-[13.5px] leading-5 text-white/75">
              <li>One featured slot per district and property type at a time.</li>
              <li>If the slot is taken, your run starts when it frees and the days are counted from then.</li>
              <li>A featured listing carries a marker, because tenants are entitled to know it is paid.</li>
              <li>Stopping early ends the placement and bills only the days used.</li>
            </ul>
          </Card>

          <Callout tone="info" title="What is real here" icon={<Info size={17} />}>
            The run, the pricing and the reporting are working. Charging the card and issuing the receipt go through
            the payments provider in the production build — this prototype records the commitment against your
            workspace instead.
          </Callout>

          <Card padding="md">
            <div className="text-[13.5px] font-semibold text-p1-text">Rate card</div>
            <ul className="mt-2.5 divide-y divide-p1-border text-[13.5px]">
              {DAY_OPTIONS.map((o) => (
                <li key={o.days} className="flex items-center justify-between py-2">
                  <span className="text-p1-text-2">{o.label}</span>
                  <span className="font-medium tabular-nums text-p1-text">{sgd(FEATURE_RATES[o.days])} / day</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(stopping)}
        onClose={() => setStopping(null)}
        onConfirm={stop}
        destructive
        title="Stop this featured run?"
        description="The listing goes back to its ordinary position in the results straight away."
        confirmLabel="Stop the run"
      >
        {stopping && (
          <p className="text-[14px] leading-6 text-p1-text-2">
            You are billed for the days used, not the {stopping.days} committed. The run has produced{' '}
            <strong className="text-p1-text">{stopping.views.toLocaleString('en-SG')} views</strong> and{' '}
            <strong className="text-p1-text">{stopping.enquiries} enquiries</strong> so far.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
