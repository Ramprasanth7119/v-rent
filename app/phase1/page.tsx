"use client";

import Link from 'next/link';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHead } from '../../components/phase1/bits';
import { INCUMBENT_PRICING, PLANS, sgd } from '../../lib/phase1/data';
import { ArrowRight, ShieldCheck, Lock, FileUp } from 'lucide-react';

const JOURNEY = [
  { m: 'M1', t: 'Create account', d: 'Email and password, sessions, admin two-factor', href: '/phase1/signup' },
  { m: 'M2', t: 'Verify contact', d: 'Email link and six-digit SMS code', href: '/phase1/verify' },
  { m: 'M6', t: 'Profile and CEA details', d: 'Professional profile, registration number, agency', href: '/phase1/profile' },
  { m: 'M7 · M8', t: 'Verification and approval', d: 'Registry match, then a human decision', href: '/phase1/status' },
  { m: 'M9', t: 'Choose a plan', d: 'Entitlements decide quota, not hard-coded columns', href: '/phase1/plans' },
  { m: 'M10', t: 'Pay', d: 'Cards and PayNow, activated only by webhook', href: '/phase1/checkout' },
  { m: 'M12', t: 'Create and publish listings', d: 'The publish gate enforces all five conditions', href: '/phase1/listings' },
];

const BACKOFFICE = [
  { m: 'M7', t: 'Verification queue', d: 'Registry match outcomes, evidence, decisions', href: '/phase1/admin/verification' },
  { m: 'M13', t: 'Moderation queue', d: 'Listing review, reasons, duplicate flags', href: '/phase1/admin/moderation' },
  { m: 'M10', t: 'Subscriptions', d: 'Plan membership, failures, reconciliation', href: '/phase1/admin/subscriptions' },
  { m: 'M14', t: 'Reports and audit', d: 'Onboarding funnel and the audit trail', href: '/phase1/admin/reports' },
];

export default function Phase1Home() {
  return (
    <>
      <PageHead
        module="V-RENT Phase 1"
        title="Agent platform prototype"
        blurb="A clickable walkthrough of every Phase 1 module. Nothing here is connected to a server — all data is fixed so the demonstration behaves the same way every time."
      />

      <Card className="mb-8 border-brand-gold/30 bg-brand-gold/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <div className="text-sm font-semibold text-foreground">Start with the agent journey</div>
            <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              Walk it in order for the full story, or use <strong>Skip ahead</strong> in the sidebar to
              jump to an approved, subscribed agent and go straight to the listing screens.
            </p>
          </div>
          <Link href="/phase1/signup">
            <Button variant="gold" rightIcon={<ArrowRight size={15} />}>Begin walkthrough</Button>
          </Link>
        </div>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        Agent journey
      </h2>
      <div className="mb-9 grid gap-2.5">
        {JOURNEY.map((s, i) => (
          <Link key={s.href} href={s.href}>
            <Card hoverEffect className="flex items-center gap-4 py-3.5">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-navy text-xs font-semibold text-white tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium text-foreground">{s.t}</span>
                  <span className="font-mono text-[10px] text-neutral-400">{s.m}</span>
                </div>
                <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{s.d}</div>
              </div>
              <ArrowRight size={15} className="flex-shrink-0 text-neutral-300 dark:text-neutral-600" />
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        Back office
      </h2>
      <div className="mb-9 grid gap-2.5 sm:grid-cols-2">
        {BACKOFFICE.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card hoverEffect className="h-full py-3.5">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-medium text-foreground">{s.t}</span>
                <span className="font-mono text-[10px] text-neutral-400">{s.m}</span>
              </div>
              <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{s.d}</div>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        Three things to point out
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <ShieldCheck size={17} className="mb-2 text-brand-gold" />
          <div className="text-sm font-medium text-foreground">Verification that expires</div>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            Both incumbents verify CEA status once at signup. We re-check the register daily and
            withdraw publication rights automatically when a registration lapses.
          </p>
        </Card>
        <Card>
          <Lock size={17} className="mb-2 text-brand-gold" />
          <div className="text-sm font-medium text-foreground">One publish gate</div>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            Approval, subscription, quota, content and moderation are checked in a single server-side
            function. The demo lets you break each condition and watch publication refuse.
          </p>
        </Card>
        <Card>
          <FileUp size={17} className="mb-2 text-brand-gold" />
          <div className="text-sm font-medium text-foreground">Bulk import</div>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            An agent with thirty listings elsewhere will not retype them. This was the main gap found
            in the competitive review, and it is the biggest switching lever we have.
          </p>
        </Card>
      </div>

      <Card className="mt-8">
        <div className="mb-3 text-sm font-semibold text-foreground">Price positioning</div>
        <div className="space-y-2">
          {INCUMBENT_PRICING.map((p) => (
            <div key={p.name} className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">
                {p.name} <span className="text-xs text-neutral-400">— {p.note}</span>
              </span>
              <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                {sgd(p.priceYearSgd)}<span className="text-xs font-normal text-neutral-400">/yr</span>
              </span>
            </div>
          ))}
          <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-2.5 text-sm">
            <span className="font-medium text-foreground">V-RENT, indicative — subject to client confirmation</span>
            <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {sgd(PLANS[0].priceYearSgd)}–{sgd(PLANS[2].priceYearSgd)}<span className="text-xs font-normal text-neutral-400">/yr</span>
            </span>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          Incumbent pricing verified 28 August 2026. V-RENT figures are placeholders used to
          demonstrate the plan mechanism — final pricing is open question Q5.
        </p>
      </Card>
    </>
  );
}
