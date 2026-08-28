"use client";

import Link from 'next/link';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PageHead, Stat, GateRow, SpecNote, StatusChip } from '../../../components/phase1/bits';
import { PropertyImage } from '../../../components/phase1/PropertyImage';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { sgd } from '../../../lib/phase1/data';
import { Check, X, SlidersHorizontal } from 'lucide-react';

export default function DashboardPage() {
  const { state, set, gate, canPublish, activeListings, listingLimit } = useDemo();

  const drafts = state.listings.filter((l) => l.status === 'draft').length;
  const published = state.listings.filter((l) => l.status === 'published').length;
  const quotaPct = listingLimit ? Math.min(100, Math.round((activeListings / listingLimit) * 100)) : 0;

  return (
    <>
      <PageHead
        module="M9 · M12 · Entitlement Enforcement"
        title={`Welcome back, ${state.profile.fullName.split(' ')[0]}`}
        blurb="Everything on this screen is derived from one entitlement service. No screen counts listings for itself."
        actions={
          <Link href="/phase1/listings/new">
            <Button variant="gold">Create listing</Button>
          </Link>
        }
      />

      <div className="vr-stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Active listings"
          value={listingLimit ? `${activeListings} / ${listingLimit}` : '—'}
          sub={listingLimit ? `${listingLimit - activeListings} remaining on ${state.plan?.name}` : 'No plan selected'}
          tone={listingLimit && activeListings >= listingLimit ? 'bad' : 'default'}
        />
        <Stat label="Published" value={published} sub="Visible once Phase 2 opens" tone="good" />
        <Stat label="Drafts" value={drafts} sub="Saved, not submitted" />
        <Stat
          label="Plan"
          value={state.plan?.name ?? 'None'}
          sub={state.plan ? `${sgd(state.plan.priceYearSgd)} per year` : 'Choose a plan to publish'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        {/* Publish gate */}
        <Card className={canPublish ? 'border-emerald-300/60 dark:border-emerald-900/60' : 'border-red-300/60 dark:border-red-900/60'}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">The publish gate</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                canPublish
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
              }`}
            >
              {canPublish ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
              {canPublish ? 'Can publish' : 'Blocked'}
            </span>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            All five conditions are evaluated together, in one transaction, on the server. Break any of
            them with the controls on the right and watch this change.
          </p>
          <div>
            {gate.map((g) => (
              <GateRow key={g.id} pass={g.pass} label={g.label} detail={g.detail} fixHref={g.fixHref} fixLabel={g.fixLabel} />
            ))}
          </div>

          {listingLimit > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Quota used</span>
                <span className="font-medium tabular-nums text-foreground">{quotaPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${quotaPct >= 100 ? 'bg-red-500' : 'bg-brand-gold'}`}
                  style={{ width: `${quotaPct}%` }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Demo controls */}
        <div className="space-y-3">
          <Card className="border-brand-gold/30 bg-brand-gold/5">
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-brand-gold" />
              <span className="text-xs font-semibold text-foreground">Presenter controls</span>
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              These exist only in the prototype. Use them to show the gate refusing publication for each
              distinct reason.
            </p>
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={() => set({ ceaValid: !state.ceaValid })}>
                {state.ceaValid ? 'Lapse the CEA registration' : 'Restore CEA registration'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => set({ subscription: state.subscription === 'active' ? 'expired' : 'active' })}
              >
                {state.subscription === 'active' ? 'Expire the subscription' : 'Reactivate subscription'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => set({ subscription: state.subscription === 'past_due' ? 'active' : 'past_due' })}
              >
                {state.subscription === 'past_due' ? 'Clear the failed payment' : 'Fail the renewal payment'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => set({ approval: state.approval === 'suspended' ? 'approved' : 'suspended' })}
              >
                {state.approval === 'suspended' ? 'Reinstate the agent' : 'Suspend the agent'}
              </Button>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              Note that a failed renewal moves the agent to <em>past due</em> and publication is still
              allowed — inventory does not disappear the moment a card fails. The grace period length is
              open question O5.
            </p>
          </Card>

          <Card>
            <div className="mb-2.5 text-xs font-semibold text-foreground">Recent listings</div>
            <div className="space-y-2.5">
              {state.listings.slice(0, 4).map((l) => (
                <Link
                  key={l.id}
                  href={`/phase1/listings/${l.id}`}
                  className="group flex items-center gap-2.5 rounded-lg p-1.5 -mx-1.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  <PropertyImage
                    seed={l.reference + l.project}
                    variant={0}
                    className="h-9 w-12 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-foreground transition-colors group-hover:text-brand-gold">
                      {l.project}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {l.unitNo} · {sgd(l.monthlyRent)}/mo
                    </div>
                  </div>
                  <StatusChip status={l.status} />
                </Link>
              ))}
            </div>
            <Link href="/phase1/listings">
              <Button size="sm" variant="ghost" className="mt-3 w-full">View all listings</Button>
            </Link>
          </Card>
        </div>
      </div>

      <SpecNote>
        Denials are structured, not generic. The service returns the reason, the current usage and the
        applicable limit, so the interface can say “you have used 30 of 30 listings on Professional”
        rather than “forbidden”. That difference is the gap between an agent fixing the problem
        themselves and an agent raising a support ticket.
      </SpecNote>
    </>
  );
}
