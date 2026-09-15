"use client";

/**
 * Agent hub — the front door of the workspace.
 *
 * Its job is discovery, not walkthrough: an agent lands here and finds every
 * tool the platform gives them, grouped the way their week is organised, with
 * a search across the lot. Signed in, the top of the page is their own position
 * — verification, plan, inventory, unanswered enquiries. Signed out, it is the
 * case for registering, and the catalogue below is identical either way.
 *
 * Tools that are not built in this prototype say so on the card and explain
 * themselves when opened, rather than pretending or dead-ending.
 */

import { useMemo, useState } from 'react';
import {
  ArrowRight, ShieldCheck, Search as SearchIcon, Plus, LogIn, UserPlus,
  Building2, Eye, MessageSquare, Gauge, Check, Sparkles } from 'lucide-react';
import {
  Card, LinkButton, SectionTitle, MetricStrip, Metric, SearchInput, FilterChips,
  EmptyState, cx } from '../kit';
import { Pill } from '../status';
import { ToolCard, ToolDetail } from './ToolCard';
import { HUB_CATEGORIES, HubTool, LIVE_TOOL_COUNT, matchesTool } from '../../../lib/phase1/hub';
import { useSession, shortName, agencyLabel } from '../../../lib/phase1/SessionContext';
import { useDemo, TODAY } from '../../../lib/phase1/DemoContext';
import { PLANS, sgd } from '../../../lib/phase1/data';
import { totals } from '../../../lib/phase1/performance';

const CATEGORY_OPTIONS = [
  { key: 'all', label: 'All' },
  ...HUB_CATEGORIES.map((c) => ({ key: c.id, label: c.title.replace(/ and .*/, '') })),
];

/** Days until a CEA registration lapses, from the register date on the session. */
function daysLeft(endDate?: string): number | null {
  if (!endDate) return null;
  const end = new Date(`${endDate}T23:59:59+08:00`);
  if (Number.isNaN(end.getTime())) return null;
  return Math.ceil((end.getTime() - TODAY.getTime()) / 86_400_000);
}

/**
 * A skyline behind the hero text.
 *
 * Drawn rather than photographed: it has to survive both themes, add no
 * network request, and never compete with the headline — which is why it sits
 * at the foot of the panel at low opacity and fades into the surface.
 */
function Skyline() {
  return (
    <svg
      viewBox="0 0 1200 200"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] w-full text-p1-primary opacity-[0.10] dark:opacity-[0.18]"
    >
      {/* One continuous silhouette. Separated rectangles read as a bar chart;
          a skyline is buildings standing shoulder to shoulder at different
          heights, with the odd spire breaking the line. */}
      <path
        fill="currentColor"
        d="M0 200 V150 h46 V118 h38 V150 h30 V96 h54 V64 h6 V30 h6 V64 h6 V96 h40 V132 h44 V88 h58 V128 h34 V150 h52 V104 h48 V70 h5 V36 h5 V70 h5 V104 h42 V140 h60 V112 h44 V146 h38 V84 h56 V120 h48 V150 h40 V98 h50 V58 h6 V26 h6 V58 h6 V98 h46 V134 h56 V110 h42 V144 h52 V92 h48 V126 h38 V152 h44 V116 h40 V200 Z"
      />
    </svg>
  );
}

export function AgentHub() {
  const { user } = useSession();
  const { state, activeListings, listingLimit } = useDemo();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [detail, setDetail] = useState<HubTool | null>(null);

  const searching = query.trim().length > 0;

  const categories = useMemo(
    () =>
      HUB_CATEGORIES
        .filter((c) => category === 'all' || c.id === category)
        .map((c) => ({ ...c, tools: c.tools.filter((t) => matchesTool(t, query)) }))
        .filter((c) => c.tools.length > 0),
    [category, query],
  );
  const resultCount = categories.reduce((n, c) => n + c.tools.length, 0);

  /* ------------------------------------------------------------- position */

  const live = useMemo(() => state.listings.filter((l) => !l.archived), [state.listings]);
  const published = live.filter((l) => l.status === 'published').length;
  const t = useMemo(() => totals(live), [live]);
  const newEnquiries = state.enquiries.filter((e) => e.status === 'new').length;
  const quotaPct = listingLimit ? Math.min(100, Math.round((activeListings / listingLimit) * 100)) : 0;

  const ceaDays = daysLeft(user?.cea?.registrationEnd);
  const greeting = TODAY.getHours() < 12 ? 'Good morning' : TODAY.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      {/* ------------------------------------------------------------- hero
          Light rather than a slab of colour. A full-bleed saturated panel
          shouts; the Singapore portals open on a pale sky with the skyline
          behind the words, and let one blue button do the asking. */}
      <section className="relative mb-7 overflow-hidden rounded-2xl bg-p1-surface ring-1 ring-p1-border">
        <Skyline />

        <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:p-11">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-p1-surface/80 px-3 py-1 text-[12.5px] font-semibold text-p1-primary ring-1 ring-p1-border backdrop-blur">
              <Sparkles size={13} aria-hidden />
              Agent hub
            </span>

            {user ? (
              <>
                <h1 className="mt-4 font-p1display text-[32px] font-bold leading-[1.08] tracking-[-0.028em] text-p1-text sm:text-[42px]">
                  {greeting},<br className="hidden sm:block" /> {shortName(user)}
                </h1>
                <p className="mt-3.5 max-w-xl text-[15.5px] leading-7 text-p1-text-2">
                  Every tool V-RENT gives you, in one place — list a unit, answer the people who reply, and keep your
                  registration and plan in good standing.
                </p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <LinkButton href="/phase1/dashboard" size="lg" rightIcon={<ArrowRight size={17} />}>
                    Open dashboard
                  </LinkButton>
                  <LinkButton href="/phase1/listings/new" variant="outline" size="lg" leftIcon={<Plus size={17} />}>
                    Create a listing
                  </LinkButton>
                </div>
              </>
            ) : (
              <>
                <h1 className="mt-4 font-p1display text-[32px] font-bold leading-[1.08] tracking-[-0.028em] text-p1-text text-balance sm:text-[42px]">
                  One workspace for CEA-registered rental agents
                </h1>
                <p className="mt-3.5 max-w-xl text-[15.5px] leading-7 text-p1-text-2">
                  List a unit, answer the tenants who reply, and keep your registration and plan in good standing —
                  without paying incumbent prices. Your CEA registration is checked against the public register before
                  you publish, and again after.
                </p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <LinkButton href="/phase1/signup" size="lg" leftIcon={<UserPlus size={17} />}>
                    Create an account
                  </LinkButton>
                  <LinkButton href="/phase1/login" variant="outline" size="lg" leftIcon={<LogIn size={17} />}>
                    Sign in
                  </LinkButton>
                </div>
              </>
            )}
          </div>

          {/* The agent's own facts, raised off the wash as a card. */}
          <div className="w-full rounded-xl bg-p1-surface p-5 shadow-p1-md ring-1 ring-p1-border">
            {user?.cea ? (
              <>
                <div className="flex items-center gap-2 text-[13px] font-bold text-p1-text">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-p1-success-soft text-p1-success" aria-hidden>
                    <ShieldCheck size={15} />
                  </span>
                  CEA registration verified
                </div>
                <dl className="mt-4 space-y-3 text-[13.5px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-p1-text-3">Registration</dt>
                    <dd className="font-semibold tabular-nums text-p1-text">{user.cea.registrationNo}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 text-p1-text-3">Agency</dt>
                    <dd className="truncate text-right font-semibold text-p1-text">{agencyLabel(user)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-p1-text-3">Valid until</dt>
                    <dd className="font-semibold tabular-nums text-p1-text">
                      {new Date(`${user.cea.registrationEnd}T00:00:00+08:00`).toLocaleDateString('en-SG', {
                        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore',
                      })}
                    </dd>
                  </div>
                </dl>
                {ceaDays !== null && (
                  <p className="mt-4 border-t border-p1-border pt-3 text-[12.5px] leading-5 text-p1-text-3">
                    {ceaDays > 0
                      ? `${ceaDays} days remaining. Checked against the public register.`
                      : 'This registration is no longer current on the public register.'}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="text-[13px] font-bold text-p1-text">What you get on day one</div>
                <ul className="mt-4 space-y-3 text-[13.5px] leading-5 text-p1-text-2">
                  {[
                    'Registration verified against the CEA register',
                    `${LIVE_TOOL_COUNT} working tools in the agent workspace`,
                    'Yearly plans from ' + sgd(PLANS[0].priceYearSgd),
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5">
                      <Check size={15} className="mt-0.5 shrink-0 text-p1-success" aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- position */}
      {user && (
        <MetricStrip className="mb-8" cols={4}>
          <Metric
            label="Published listings"
            value={published}
            hint={`${live.length} in your portfolio`}
            icon={<Building2 size={15} />}
            href="/phase1/listings"
          />
          <Metric
            label="Views, 30 days"
            value={t.views30d.toLocaleString('en-SG')}
            hint="Across published listings"
            icon={<Eye size={15} />}
            href="/phase1/performance"
          />
          <Metric
            label="Waiting on a reply"
            value={newEnquiries}
            tone={newEnquiries > 0 ? 'warning' : 'default'}
            hint={newEnquiries > 0 ? 'Tenants who have not heard back' : 'Nothing outstanding'}
            icon={<MessageSquare size={15} />}
            href="/phase1/performance"
          />
          <Metric
            label="Listing quota"
            value={listingLimit ? `${activeListings}/${listingLimit}` : 'No plan'}
            tone={quotaPct >= 90 ? 'danger' : quotaPct >= 75 ? 'warning' : 'default'}
            hint={state.plan ? `${state.plan.name} plan` : 'No plan chosen yet'}
            icon={<Gauge size={15} />}
            href={state.plan ? '/phase1/checkout' : '/phase1/plans'}
          />
        </MetricStrip>
      )}

      {/* ------------------------------------------------------- tool search */}
      <div className="mb-6 flex flex-col gap-3 border-b border-p1-border pb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-p1display text-[21px] font-bold tracking-[-0.018em] text-p1-text">Everything in the platform</h2>
            <p className="mt-0.5 text-[13.5px] text-p1-text-3">
              All {LIVE_TOOL_COUNT} tools open and work. Where one depends on something outside this build — a
              payment provider, the public tenant site — the screen says so on the screen itself.
            </p>
          </div>
          <div className="w-full sm:w-[320px]">
            <SearchInput
              value={query}
              onChange={setQuery}
              label="Search tools"
              placeholder="Search tools"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterChips options={CATEGORY_OPTIONS} value={category} onChange={setCategory} label="Category" size="sm" />
          {(searching || category !== 'all') && (
            <span className="text-[13px] tabular-nums text-p1-text-3">
              {resultCount} {resultCount === 1 ? 'tool' : 'tools'}
            </span>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------- catalogue */}
      {categories.length === 0 ? (
        <EmptyState
          icon={<SearchIcon size={22} />}
          title={`Nothing matches “${query.trim()}”`}
          description="Try a shorter word — floor plan, quota, viewing, refresh."
        />
      ) : (
        categories.map((c) => (
          <section key={c.id} className="mb-9">
            <SectionTitle hint={c.tagline}>
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-p1-primary-soft text-p1-primary dark:text-p1-text"
                >
                  <c.icon size={16} />
                </span>
                {c.title}
              </span>
            </SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {c.tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} onOpenDetail={setDetail} />
              ))}
            </div>
          </section>
        ))
      )}

      {/* -------------------------------------------------------------- plans */}
      {!state.plan && !searching && category === 'all' && (
        <section className="mb-4">
          <SectionTitle hint="Plans differ by how many listings you may keep active at once. Billed yearly, by PayNow or card.">
            Plans
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((p) => (
              <Card key={p.code} className={cx('flex flex-col', p.highlight && 'border-p1-primary/40')}>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[15px] font-semibold text-p1-text">{p.name}</div>
                  {p.highlight && <Pill tone="accent">{p.highlight}</Pill>}
                </div>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="font-p1display text-[26px] font-medium tabular-nums text-p1-text">{sgd(p.priceYearSgd)}</span>
                  <span className="text-[13px] text-p1-text-3">/year</span>
                </div>
                <ul className="mt-4 space-y-2 text-[13.5px] leading-5 text-p1-text-2">
                  {p.entitlements.slice(0, 3).map((e) => (
                    <li key={e.key} className="flex items-baseline justify-between gap-3">
                      <span>{e.label}</span>
                      <span className="font-medium tabular-nums text-p1-text">{e.value}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-4">
                  <LinkButton href="/phase1/plans" variant={p.highlight ? 'primary' : 'outline'} block size="sm">
                    Compare plans
                  </LinkButton>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- signed-out CTA */}
      {!user && !searching && category === 'all' && (
        <Card padding="lg" className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[16px] font-semibold text-p1-text">Registration takes about three minutes</div>
            <p className="mt-1 max-w-xl text-[14px] leading-6 text-p1-text-2">
              Enter your CEA registration number and V-RENT reads your name and agency straight from the public
              register. No documents to upload, nothing to type twice.
            </p>
          </div>
          <div className="flex gap-2">
            <LinkButton href="/phase1/signup" rightIcon={<ArrowRight size={16} />}>Create an account</LinkButton>
          </div>
        </Card>
      )}

      <ToolDetail tool={detail} onClose={() => setDetail(null)} />

    </>
  );
}
