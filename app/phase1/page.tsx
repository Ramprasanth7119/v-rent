"use client";

import Link from 'next/link';
import { Card, LinkButton, PageHeader, PresenterNote, SectionTitle, cx } from '../../components/phase1/kit';
import { Pill } from '../../components/phase1/status';
import { INCUMBENT_PRICING, PLANS, sgd } from '../../lib/phase1/data';
import {
  ArrowRight, ShieldCheck, Lock, FileUp, UserPlus, Smartphone, IdCard, BadgeCheck,
  ClipboardCheck, CreditCard, Building2, Send, Users, Gavel, BarChart3,
} from 'lucide-react';

const JOURNEY = [
  { n: 1, t: 'Create account', d: 'Email, mobile and a password you choose.', href: '/phase1/signup', icon: UserPlus },
  { n: 2, t: 'Verify contact', d: 'Confirm your email link and SMS code.', href: '/phase1/verify', icon: Smartphone },
  { n: 3, t: 'Professional details', d: 'Your profile, agency and CEA number.', href: '/phase1/profile', icon: IdCard },
  { n: 4, t: 'CEA verification', d: 'Checked against the public CEA register.', href: '/phase1/status', icon: BadgeCheck },
  { n: 5, t: 'Approval', d: 'A verification officer confirms your account.', href: '/phase1/status', icon: ClipboardCheck },
  { n: 6, t: 'Subscribe', d: 'Pick a plan and pay by PayNow or card.', href: '/phase1/plans', icon: CreditCard },
  { n: 7, t: 'Create listing', d: 'Address search, unit details, photos.', href: '/phase1/listings/new', icon: Building2 },
  { n: 8, t: 'Publish', d: 'One check, then the listing goes live.', href: '/phase1/listings', icon: Send },
];

const BACKOFFICE = [
  { t: 'Agents', d: 'Every registered agent and their standing.', href: '/phase1/admin/agents', icon: Users },
  { t: 'Verification queue', d: 'CEA register matches awaiting a decision.', href: '/phase1/admin/verification', icon: ShieldCheck },
  { t: 'Moderation queue', d: 'Listings to review, with reasons and flags.', href: '/phase1/admin/moderation', icon: Gavel },
  { t: 'Reports & audit', d: 'Onboarding funnel and the audit trail.', href: '/phase1/admin/reports', icon: BarChart3 },
];

export default function Phase1Home() {
  return (
    <>
      <PageHeader
        eyebrow="V-RENT for agents"
        title="List Singapore rentals, verified and at a fair price"
        description="V-RENT is a residential rental platform for CEA-registered agents. Register, get verified, choose a plan and publish listings — all from one workspace."
      />

      {/* Hero */}
      <Card padding="lg" className="mb-10 overflow-hidden bg-p1-primary text-white border-transparent">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-p1-accent">Clickable prototype</div>
            <h2 className="font-p1display text-[26px] font-medium leading-tight sm:text-[30px]">Walk through the agent journey, then step into the back office.</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-6 text-white/80">
              Every screen here is fixed data — nothing is connected to a server, so the walkthrough behaves the same way every time.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <LinkButton href="/phase1/signup" variant="accent" size="lg" rightIcon={<ArrowRight size={17} />}>Begin the agent journey</LinkButton>
            <LinkButton href="/phase1/admin" variant="outline" size="lg" className="border-white/30 bg-transparent text-white hover:bg-white/10">Open the back office</LinkButton>
          </div>
        </div>
      </Card>

      {/* Agent journey */}
      <SectionTitle hint="Eight steps from registration to a live listing.">Agent journey</SectionTitle>
      <ol className="vr-stagger mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {JOURNEY.map((s) => (
          <li key={s.n}>
            <Link href={s.href} className="block h-full">
              <Card interactive className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-p1-primary text-[14px] font-semibold text-white tabular-nums">{s.n}</span>
                  <s.icon size={20} className="text-p1-accent-text" aria-hidden />
                </div>
                <div className="mt-4 text-[16px] font-semibold text-p1-text">{s.t}</div>
                <p className="mt-1 text-[14px] leading-5 text-p1-text-2">{s.d}</p>
                <span className="mt-auto flex items-center gap-1 pt-4 text-[13px] font-medium text-p1-accent-text">Open <ArrowRight size={14} aria-hidden /></span>
              </Card>
            </Link>
          </li>
        ))}
      </ol>

      {/* Back office */}
      <SectionTitle hint="What the V-RENT operations team sees.">Back office</SectionTitle>
      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BACKOFFICE.map((b) => (
          <Link key={b.href} href={b.href} className="block h-full">
            <Card interactive className="flex h-full items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-p1-primary-soft text-p1-primary dark:text-p1-text" aria-hidden><b.icon size={20} /></span>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-p1-text">{b.t}</div>
                <p className="mt-0.5 text-[14px] leading-5 text-p1-text-2">{b.d}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Differentiators */}
      <SectionTitle>What makes V-RENT different</SectionTitle>
      <div className="mb-10 grid gap-3 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, t: 'Verification that stays current', d: 'The CEA register is re-checked every day. If a registration lapses, publishing pauses automatically — and resumes when it is renewed.' },
          { icon: Lock, t: 'One publish check', d: 'Approval, valid registration, subscription, quota and content are checked together. When something blocks publishing, you are told exactly what and how to fix it.' },
          { icon: FileUp, t: 'Bring your listings with you', d: 'Import a spreadsheet of your existing portfolio and review it before anything is created. No retyping thirty listings.' },
        ].map((f) => (
          <Card key={f.t}>
            <f.icon size={22} className="text-p1-accent-text" aria-hidden />
            <div className="mt-3 text-[16px] font-semibold text-p1-text">{f.t}</div>
            <p className="mt-1.5 text-[14px] leading-6 text-p1-text-2">{f.d}</p>
          </Card>
        ))}
      </div>

      {/* Price positioning */}
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-semibold text-p1-text">Price positioning</h2>
          <Pill>Indicative — subject to client confirmation</Pill>
        </div>
        <dl className="mt-4 divide-y divide-p1-border">
          {INCUMBENT_PRICING.map((p) => (
            <div key={p.name} className="flex items-baseline justify-between gap-4 py-3 text-[15px]">
              <dt className="text-p1-text-2">{p.name} <span className="text-[13px] text-p1-text-3">— {p.note}</span></dt>
              <dd className="font-semibold tabular-nums text-p1-danger">{sgd(p.priceYearSgd)}<span className="text-[13px] font-normal text-p1-text-3">/yr</span></dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 py-3 text-[15px]">
            <dt className="font-semibold text-p1-text">V-RENT plans</dt>
            <dd className={cx('font-semibold tabular-nums text-p1-success')}>
              {sgd(PLANS[0].priceYearSgd)}–{sgd(PLANS[2].priceYearSgd)}<span className="text-[13px] font-normal text-p1-text-3">/yr</span>
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-[13px] leading-5 text-p1-text-3">Incumbent pricing verified 28 August 2026. V-RENT figures demonstrate the plan mechanism — final pricing is open question Q5.</p>
      </Card>

      <PresenterNote>
        Walk the journey in order for the full story, or use <strong>Skip ahead</strong> in the sidebar to jump to an approved, subscribed agent and go straight to the listing screens. <strong>Reset</strong> returns everything to the start.
      </PresenterNote>
    </>
  );
}
