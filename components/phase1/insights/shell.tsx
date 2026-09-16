"use client";

/**
 * The frame every Insights screen sits in.
 *
 * Four screens answer four market questions, and before this they were four
 * separate pages that happened to share a sidebar group. The frame is what
 * makes them one instrument: the same header object on each, carrying the same
 * four answers in the same order, so moving between them is a move inside a
 * tool rather than a navigation across a site.
 *
 * The header is a single raised panel rather than a stack of loose rows. It
 * holds, in the order a reader needs them:
 *
 *   1. where they are        — the module name and the rail of modules
 *   2. what they are seeing  — title and one sentence
 *   3. what it is about      — the context strip: project, place, period
 *   4. what they can do      — the actions, at the end of the line
 *
 * Underneath it, each screen composes its own sections. What they share is the
 * provenance line at the foot: on a product that tells an agent what to charge
 * a landlord, where the number came from is part of the number.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LineChart, GitCompareArrows, Trees, FileSpreadsheet,
  Compass, Info, Database, AlertTriangle,
} from 'lucide-react';
import { cx } from '../kit';
import { MARKET_SOURCE, MARKET_MONTHS, monthLabel } from '../../../lib/phase1/market';

type Icon = React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;

export interface InsightModule {
  key: string;
  href: string;
  label: string;
  /** Short enough for the rail on a phone. */
  short: string;
  icon: Icon;
  /** The question this module exists to answer. */
  question: string;
  blurb: string;
}

/**
 * The four modules, in the order an agent works through them: what the market
 * did, how two developments compare, what is around the
 * address, and then the thing they send a client.
 */
export const INSIGHT_MODULES: InsightModule[] = [
  {
    key: 'transactions',
    href: '/phase1/market/transactions',
    label: 'Transactions',
    short: 'Transactions',
    icon: LineChart,
    question: 'What is letting, and for how much?',
    blurb: 'Lodged rental contracts by project, size and month, with the median and the spread they came from.',
  },
  {
    key: 'compare',
    href: '/phase1/market/compare',
    label: 'Compare projects',
    short: 'Compare',
    icon: GitCompareArrows,
    question: 'How does this development stand against that one?',
    blurb: 'Up to three developments on the same rows, with each figure placed against the others rather than merely listed.',
  },
  {
    key: 'neighbourhood',
    href: '/phase1/neighbourhood',
    label: 'Neighbourhood',
    short: 'Area',
    icon: Trees,
    question: 'What is around the address?',
    blurb: 'Stations, schools, food, healthcare and parks at the walk from the door, from the agencies that publish them.',
  },
  {
    key: 'reports',
    href: '/phase1/reports',
    label: 'Reports',
    short: 'Reports',
    icon: FileSpreadsheet,
    question: 'Can I send this to someone?',
    blurb: 'Turn any of the above into a document that carries your CEA registration.',
  },
];

export const INSIGHTS_HOME = '/phase1/insights';

/* ------------------------------------------------------------- module rail */

/**
 * The four modules as one control.
 *
 * The indicator is a single element that slides, so moving from Transactions
 * to Compare reads as a move rather than as one underline vanishing and
 * another appearing somewhere else. It scrolls horizontally on a phone and the
 * selected module is scrolled into view, because a rail whose current item is
 * off-screen tells the reader nothing.
 */
export function ModuleRail({ active, className = '' }: { active?: string; className?: string }) {
  const pathname = usePathname();
  const holder = React.useRef<HTMLDivElement>(null);
  const [bar, setBar] = React.useState<{ left: number; width: number } | null>(null);
  /** Whether the rail runs past its own edge, so the edges can be softened. */
  const [overflowing, setOverflowing] = React.useState(false);

  const current = active ?? INSIGHT_MODULES.find(
    (m) => pathname === m.href || pathname.startsWith(`${m.href}/`),
  )?.key;

  React.useLayoutEffect(() => {
    const measure = () => {
      const box = holder.current;
      if (box) setOverflowing(box.scrollWidth - box.clientWidth > 2);
      const el = box?.querySelector<HTMLElement>('[data-current="true"]');
      if (!el) { setBar(null); return; }
      setBar({ left: el.offsetLeft, width: el.offsetWidth });
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (holder.current) ro?.observe(holder.current);
    return () => ro?.disconnect();
  }, [current]);

  return (
    <div
      ref={holder}
      className={cx('p1-noscrollbar relative -mx-1 flex gap-0.5 overflow-x-auto px-1', overflowing && 'ins-fade-x', className)}
    >
      <Link
        href={INSIGHTS_HOME}
        data-current={current === 'overview' || undefined}
        aria-current={current === 'overview' ? 'page' : undefined}
        className={cx(
          'relative z-[1] flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[13.5px] transition-colors duration-150',
          current === 'overview' ? 'font-semibold text-p1-text' : 'text-p1-text-3 hover:bg-p1-inset hover:text-p1-text',
        )}
      >
        <Compass size={15} strokeWidth={current === 'overview' ? 2.2 : 1.9} aria-hidden />
        Overview
      </Link>

      {INSIGHT_MODULES.map((m) => {
        const on = m.key === current;
        const Icon = m.icon;
        return (
          <Link
            key={m.key}
            href={m.href}
            data-current={on || undefined}
            aria-current={on ? 'page' : undefined}
            title={m.question}
            className={cx(
              'relative z-[1] flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[13.5px] transition-colors duration-150',
              on ? 'font-semibold text-p1-text' : 'text-p1-text-3 hover:bg-p1-inset hover:text-p1-text',
            )}
          >
            <Icon size={15} strokeWidth={on ? 2.2 : 1.9} className={on ? 'text-p1-primary' : undefined} aria-hidden />
            <span className="sm:hidden">{m.short}</span>
            <span className="hidden sm:inline">{m.label}</span>
          </Link>
        );
      })}

      {bar && (
        <span
          aria-hidden
          className="ins-indicator pointer-events-none absolute inset-y-0 z-0 rounded-lg bg-ins-inset ring-1 ring-ins-line"
          style={{ width: bar.width, transform: `translateX(${bar.left}px)`, left: 0 }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------- provenance */

/**
 * Where the figures came from, said in one line and never omitted.
 *
 * `MARKET_SOURCE.live` is false while the contract set is generated in URA's
 * publishing format rather than read from URA's feed. The line says so plainly:
 * a prototype that quietly describes modelled contracts as market evidence is
 * the one failure mode this whole module cannot afford.
 */
export function SourceNote({
  source = 'market',
  detail,
  className = '',
}: {
  /** Which provenance to describe. 'live' is for the government lookups. */
  source?: 'market' | 'onemap' | 'workspace';
  detail?: React.ReactNode;
  className?: string;
}) {
  if (source === 'market' && !MARKET_SOURCE.live) {
    return (
      <p className={cx('flex items-start gap-2 text-[12.5px] leading-5 text-p1-text-3', className)}>
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-p1-warning" aria-hidden />
        <span>
          <span className="font-semibold text-p1-text-2">Illustrative dataset, not market evidence.</span>{' '}
          {MARKET_SOURCE.note} Coverage: {MARKET_SOURCE.coverage}. {detail}
        </span>
      </p>
    );
  }
  if (source === 'onemap') {
    return (
      <p className={cx('flex items-start gap-2 text-[12.5px] leading-5 text-p1-text-3', className)}>
        <Database size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Live from OneMap&rsquo;s theme service — each agency&rsquo;s own register, read when you asked.
          Every group names the body that publishes it. {detail}
        </span>
      </p>
    );
  }
  return (
    <p className={cx('flex items-start gap-2 text-[12.5px] leading-5 text-p1-text-3', className)}>
      <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
      <span>{detail}</span>
    </p>
  );
}

/**
 * A chip for the header strip saying how current the figures are.
 *
 * On the contract set that is the last complete month URA would have published,
 * and it carries the warning tone while the feed is not connected, so the state
 * is visible from across a room rather than only in the footnote.
 */
export function DataFreshness({ asAt, live, className = '' }: { asAt?: string; live?: boolean; className?: string }) {
  const isLive = live ?? MARKET_SOURCE.live;
  const label = asAt ?? monthLabel(MARKET_MONTHS[MARKET_MONTHS.length - 1]);
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1',
        isLive
          ? 'bg-p1-success-soft text-p1-success ring-p1-success-border'
          : 'bg-p1-warning-soft text-p1-warning ring-p1-warning-border',
        className,
      )}
      title={isLive ? 'Read from the live feed' : MARKET_SOURCE.note}
    >
      <span className={cx('h-1.5 w-1.5 rounded-full', isLive ? 'bg-p1-success' : 'bg-p1-warning')} aria-hidden />
      {isLive ? `Live · to ${label}` : `Illustrative · to ${label}`}
    </span>
  );
}

/* ------------------------------------------------------------------ header */

/**
 * The header panel.
 *
 * `context` is the strip that says what the figures are about — the project
 * selector, the place, the period. It is inside the panel rather than floating
 * below it because "median rent $5,400" and "for three-bedrooms at Martin
 * Modern over the last six months" are one statement, and separating them is
 * how a screenshot ends up quoted without its qualifier.
 */
export function InsightsHeader({
  module,
  title,
  description,
  actions,
  context,
  meta,
  className = '',
}: {
  module: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  context?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cx(
        'ins-rise mb-5 overflow-hidden rounded-2xl border border-ins-line bg-ins-panel shadow-ins sm:mb-6',
        className,
      )}
    >
      {/* The module name, then the modules. Not a breadcrumb: the application
          header above already carries one, and two crumbs stacked on top of
          each other disagreeing about the hierarchy is worse than either. This
          says which product the reader is inside, and the rail says where in
          it. */}
      <div className="flex items-center gap-3 border-b border-ins-line px-4 py-2.5 sm:px-6">
        <Link
          href={INSIGHTS_HOME}
          className="hidden shrink-0 items-center gap-2 rounded-lg pr-3 text-[12px] font-semibold uppercase tracking-[0.07em] text-p1-text-3 transition-colors hover:text-p1-text lg:flex"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-p1-primary-soft text-p1-primary" aria-hidden>
            <Compass size={14} />
          </span>
          Insights
        </Link>
        <span className="hidden h-5 w-px shrink-0 bg-ins-line lg:block" aria-hidden />
        <ModuleRail active={module} className="min-w-0 flex-1" />
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 max-w-2xl">
            <h1 className="font-p1display text-[22px] font-bold leading-[1.15] tracking-[-0.02em] text-p1-text text-balance sm:text-[26px]">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 text-[13.5px] leading-6 text-p1-text-2">{description}</p>
            )}
            {meta && <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div>}
          </div>
          {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
        </div>
      </div>

      {context && (
        <div className="border-t border-ins-line bg-ins-inset px-4 py-3 sm:px-6">{context}</div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------- shell */

/**
 * The page wrapper. Carries the module's token layer and the provenance foot.
 *
 * Sections inside are expected to wear `ins-rise` with an `--i` index so the
 * page arrives in reading order; the wrapper does not impose it, because the
 * order is the screen's own argument and only the screen knows it.
 */
export function InsightsShell({
  children,
  footnote,
  className = '',
}: {
  children: React.ReactNode;
  footnote?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('p1-ins', className)}>
      {children}
      {footnote && (
        <footer className="mt-7 border-t border-ins-line pt-4">{footnote}</footer>
      )}
    </div>
  );
}

/**
 * A section of an Insights page: a panel with a title, an optional question it
 * answers, and its own actions.
 *
 * The question line is the reason the section is allowed on the page. A chart
 * that cannot be given one is decoration and should be removed instead.
 */
export function InsightPanel({
  title,
  question,
  actions,
  children,
  footer,
  padding = 'md',
  index,
  className = '',
  id,
}: {
  title?: React.ReactNode;
  question?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md';
  /** Position in the page's reveal order. */
  index?: number;
  className?: string;
  id?: string;
}) {
  const pad = { none: '', sm: 'p-4', md: 'p-4 sm:p-5' }[padding];
  return (
    <section
      id={id}
      style={index === undefined ? undefined : ({ '--i': index } as React.CSSProperties)}
      className={cx(
        'overflow-hidden rounded-2xl border border-ins-line bg-ins-panel shadow-ins',
        index !== undefined && 'ins-rise',
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-ins-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold leading-5 tracking-[-0.01em] text-p1-text">{title}</h2>}
            {question && <p className="mt-0.5 text-[12.5px] leading-5 text-p1-text-3">{question}</p>}
          </div>
          {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={pad}>{children}</div>
      {footer && <div className="border-t border-ins-line bg-ins-inset px-4 py-2.5 sm:px-5">{footer}</div>}
    </section>
  );
}
