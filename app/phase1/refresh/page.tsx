"use client";

/**
 * Automatic refresh.
 *
 * Agents keep a listing near the top of "newest first" by editing it — a space
 * added to the description, then removed — every morning. It is busywork the
 * platform can do, and doing it openly is better than pretending the practice
 * does not exist: a scheduled refresh is visible to moderation, rate-limited,
 * and stops on a listing that is no longer live.
 *
 * The screen is one row per listing rather than a form, because the question an
 * agent has is "which of mine are being kept up" and not "how do I configure a
 * schedule".
 */

import { useMemo, useState } from 'react';
import { RefreshCw, Clock, Zap, PauseCircle, Info } from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, Callout, MetricStrip, Metric,
  EmptyState, InlineSelect, Toggle, LinkButton, FilterChips, cx,
} from '../../../components/phase1/kit';
import { StatusBadge } from '../../../components/phase1/status';
import { useDemo, TODAY } from '../../../lib/phase1/DemoContext';
import { sgd } from '../../../lib/phase1/data';
import { districtName } from '../../../lib/phase1/performance';
import type { RefreshCadence, RefreshRule } from '../../../lib/phase1/tools';

const CADENCE: { key: RefreshCadence; label: string }[] = [
  { key: 'off', label: 'Off' },
  { key: 'daily', label: 'Every day' },
  { key: 'alternate', label: 'Every other day' },
  { key: 'weekly', label: 'Once a week' },
];

const HOURS = [8, 9, 10, 11, 12, 17, 18, 19, 20];
const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

const CADENCE_NOTE: Record<RefreshCadence, string> = {
  off: 'Not refreshed. It sits where it sits.',
  daily: 'Back to the top of new results each morning.',
  alternate: 'Every second day — enough to stay visible without looking automated.',
  weekly: 'Once a week, for a listing that is doing well on its own.',
};

type Scope = 'all' | 'on' | 'off';

export default function RefreshPage() {
  const { state, setTools } = useDemo();
  const rules = state.tools.refresh;
  const [scope, setScope] = useState<Scope>('all');

  /* Only a live listing can be lifted in the results, so only live listings
     appear here. Offering the control on a draft would be a control that
     silently does nothing. */
  const eligible = useMemo(
    () => state.listings.filter((l) => !l.archived && (l.status === 'published' || l.status === 'paused')),
    [state.listings],
  );

  const ruleFor = (id: string): RefreshRule =>
    rules.find((r) => r.listingId === id) ?? { listingId: id, cadence: 'off', hour: 9, runs: 0 };

  const setRule = (id: string, patch: Partial<RefreshRule>) => {
    const current = ruleFor(id);
    const next = { ...current, ...patch };
    const others = rules.filter((r) => r.listingId !== id);
    setTools({ refresh: next.cadence === 'off' && next.runs === 0 ? others : [...others, next] });
  };

  const on = eligible.filter((l) => ruleFor(l.id).cadence !== 'off');
  const shown = eligible.filter((l) => {
    const active = ruleFor(l.id).cadence !== 'off';
    return scope === 'all' || (scope === 'on' ? active : !active);
  });

  /* A weekly refresh is one lift; a daily one is seven. Stating the week's
     total is more use than stating the cadence back to the agent. */
  const liftsPerWeek = on.reduce((n, l) => {
    const c = ruleFor(l.id).cadence;
    return n + (c === 'daily' ? 7 : c === 'alternate' ? 3 : c === 'weekly' ? 1 : 0);
  }, 0);

  const allOff = () => setTools({ refresh: rules.map((r) => ({ ...r, cadence: 'off' as const })) });

  return (
    <>
      <PageHeader
        eyebrow="Listings and marketing"
        title="Automatic refresh"
        description="Keep a listing near the top of new results without opening it every morning. Set the cadence once per listing; the platform does the lift and records that it did."
        actions={on.length > 0 ? <Button variant="outline" leftIcon={<PauseCircle size={16} />} onClick={allOff}>Turn everything off</Button> : undefined}
      />

      <MetricStrip className="mb-6" cols={3}>
        <Metric label="Listings on a schedule" value={on.length} hint={`${eligible.length} eligible`} icon={<RefreshCw size={15} />} />
        <Metric label="Lifts a week" value={liftsPerWeek} hint="Across every scheduled listing" icon={<Zap size={15} />} tone={liftsPerWeek ? 'success' : 'default'} />
        <Metric label="Refreshes run" value={rules.reduce((n, r) => n + r.runs, 0)} hint="Since you turned this on" icon={<Clock size={15} />} />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard
          title="Your live listings"
          description="A refresh only applies to a listing that is published or paused."
          icon={<RefreshCw size={16} />}
          actions={
            <FilterChips
              size="sm"
              label="Show"
              value={scope}
              onChange={setScope}
              options={[
                { key: 'all', label: 'All', count: eligible.length },
                { key: 'on', label: 'Scheduled', count: on.length },
                { key: 'off', label: 'Not scheduled', count: eligible.length - on.length },
              ]}
            />
          }
          padding={eligible.length ? 'none' : 'md'}
        >
          {eligible.length === 0 ? (
            <EmptyState
              icon={<RefreshCw size={22} />}
              title="No live listings yet"
              description="A refresh moves a listing up the new results, so there has to be one in the results first."
              action={<LinkButton href="/phase1/listings/new" size="sm">Create a listing</LinkButton>}
            />
          ) : (
            <ul className="divide-y divide-p1-border">
              {shown.map((l) => {
                const rule = ruleFor(l.id);
                const active = rule.cadence !== 'off';
                return (
                  <li key={l.id} className={cx('px-5 py-4 transition-colors', active && 'bg-p1-primary-soft/25')}>
                    <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
                      <div className="min-w-0 flex-1 basis-64">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-p1display text-[15px] font-bold text-p1-text">{l.project} {l.unitNo}</span>
                          <StatusBadge kind="listing" value={l.status} />
                        </div>
                        <div className="mt-1 text-[13px] text-p1-text-3">
                          D{String(l.district).padStart(2, '0')} {districtName(l.district)} · {l.bedrooms} bed · {sgd(l.monthlyRent)}/mo
                        </div>
                        <p className="mt-1.5 text-[12.5px] text-p1-text-2">{CADENCE_NOTE[rule.cadence]}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <InlineSelect
                          label={`Refresh cadence for ${l.project} ${l.unitNo}`}
                          value={rule.cadence}
                          onChange={(v) => setRule(l.id, { cadence: v })}
                          options={CADENCE}
                          icon={<RefreshCw size={14} />}
                        />
                        <InlineSelect
                          label={`Refresh time for ${l.project} ${l.unitNo}`}
                          value={String(rule.hour)}
                          onChange={(v) => setRule(l.id, { hour: Number(v) })}
                          options={HOURS.map((h) => ({ key: String(h), label: hourLabel(h) }))}
                          icon={<Clock size={14} />}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Zap size={14} />}
                          onClick={() => setRule(l.id, { runs: rule.runs + 1, lastRunAt: TODAY.toISOString() })}
                        >
                          Refresh now
                        </Button>
                      </div>
                    </div>

                    {rule.runs > 0 && (
                      <div className="mt-2.5 text-[12.5px] text-p1-text-3">
                        Refreshed {rule.runs} {rule.runs === 1 ? 'time' : 'times'}
                        {rule.lastRunAt && ` · last at ${new Date(rule.lastRunAt).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    )}
                  </li>
                );
              })}
              {shown.length === 0 && (
                <li className="px-5 py-10">
                  <EmptyState compact title="Nothing in this view" description="Change the filter above." />
                </li>
              )}
            </ul>
          )}
        </SectionCard>

        <aside className="grid min-w-0 content-start gap-4 [&>*]:min-w-0">
          <Card className="border-transparent bg-p1-sidebar text-white" padding="lg">
            <div className="font-p1display text-[17px] font-bold text-white">The limits, stated</div>
            <ul className="mt-3 space-y-2.5 text-[13.5px] leading-5 text-white/75">
              <li>At most one refresh a day per listing, whatever the cadence asks for.</li>
              <li>A refresh changes the listing&rsquo;s position, never its content or its price.</li>
              <li>Every run is written to the listing&rsquo;s activity, so moderation can see it.</li>
              <li>The schedule stops on its own when a listing expires or is archived.</li>
            </ul>
          </Card>

          <Callout tone="info" title="What is real here" icon={<Info size={17} />}>
            The schedule, the cadence and the record of runs are working and stored against your workspace. In
            production the lift is performed by a job running on the platform&rsquo;s clock rather than when this page
            is open.
          </Callout>

          <Card padding="md">
            <Toggle
              checked={on.length > 0}
              onChange={(v) => {
                if (v) {
                  setTools({
                    refresh: eligible.map((l) => ({ ...ruleFor(l.id), cadence: 'alternate' as const })),
                  });
                } else {
                  allOff();
                }
              }}
              label="Refresh everything on alternate days"
              description="A sensible default for a whole portfolio: visible without looking mechanical."
            />
          </Card>
        </aside>
      </div>
    </>
  );
}
