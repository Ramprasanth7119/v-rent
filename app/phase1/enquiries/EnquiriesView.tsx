"use client";

/**
 * Clients → Enquiries.
 *
 * Built around the five questions an agent opens it with: who wrote, about
 * which property, what they want, where it stands, and what to do next. The
 * list answers four of them at a glance; what they want — budget, move-in,
 * bedrooms, the message itself — is one click away in the detail panel, so
 * the list stays scannable at forty enquiries.
 *
 * The records come from `useEnquiries`, which is also what the dashboard and
 * the sidebar count read. With the Demo Data switch on they are the demo set.
 */

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDownUp, Building2, CalendarCheck, ChevronRight, Clock, Inbox, Info, KeyRound, Mail, MessageCircle,
  MessageSquareReply, Phone, SlidersHorizontal,
} from 'lucide-react';
import {
  Avatar, Button, CountUp, FilterChips, Pagination, SearchInput, cx, usePagination,
} from '../../../components/phase1/kit';
import { Drawer } from '../../../components/phase1/overlays';
import { useToast } from '../../../components/phase1/Toast';
import { DemoBadge } from '../../../components/phase1/DemoDataSwitch';
import { EnquiryDetail } from '../../../components/phase1/enquiries/EnquiryDetail';
import { CHANNEL_ICON, NextAction } from '../../../components/phase1/enquiries/parts';
import { StageTag } from '../../../components/phase1/enquiries/StageTag';
import { Accent, AccentTile, CompactSelect, Panel, PanelEmpty, Thumb } from '../../../components/phase1/dashboard';
import { useSession } from '../../../lib/phase1/SessionContext';
import { useEnquiries } from '../../../lib/phase1/useEnquiries';
import { sgd, type DemoListing } from '../../../lib/phase1/data';
import type { Enquiry, EnquiryStatus } from '../../../lib/phase1/workspace';
import {
  DEFAULT_QUERY, STATUS_LABEL, contactKind, contactLinks, enquiryTime, filterEnquiries, isSeededSample, needsAction,
  readStage, type EnquiryQuery, type SortKey, type StageReading, type StatusFilter,
} from '../../../lib/phase1/enquiries';
import { sgDateTime, sgRelative } from '../../../lib/phase1/format';
import { floorLabel } from '../../../lib/phase1/floor';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'priority', label: 'Needs me first' },
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
];

const STATUS_PARAM: StatusFilter[] = ['all', 'action', 'new', 'replied', 'viewing', 'closed'];
const DAY = 86_400_000;

const noSubscribe = () => () => {};

export default function EnquiriesView() {
  const inbox = useEnquiries();
  const { enquiries, byId, now, demo } = inbox;
  const { user } = useSession();
  const { push } = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [picked, setQ] = useState<EnquiryQuery>(() => {
    const s = params.get('status') as StatusFilter | null;
    return { ...DEFAULT_QUERY, status: s && STATUS_PARAM.includes(s) ? s : 'all' };
  });
  const [sheet, setSheet] = useState(false);
  const openId = params.get('enquiry');

  /* A property picked in one data set is not carried into the other. */
  const q = useMemo(
    () => (picked.listingId && !byId.has(picked.listingId) ? { ...picked, listingId: '' } : picked),
    [picked, byId],
  );

  const rows = useMemo(() => filterEnquiries(enquiries, q, byId, now), [enquiries, q, byId, now]);
  const pg = usePagination(rows, 10);
  const { setPage } = pg;
  const update = (patch: Partial<EnquiryQuery>) => { setQ((x) => ({ ...x, ...patch })); setPage(1); };

  const readings = useMemo(() => new Map(enquiries.map((e) => [e.id, readStage(e, now)])), [enquiries, now]);
  const reading = (e: Enquiry) => readings.get(e.id) ?? readStage(e, now);

  /* ------------------------------------------------------------- counters */
  const counts = useMemo(() => {
    const by = (s: EnquiryStatus) => enquiries.filter((e) => e.status === s).length;
    const stages = enquiries.map((e) => readStage(e, now));
    return {
      all: enquiries.length,
      action: stages.filter(needsAction).length,
      new: by('new'),
      overdue: stages.filter((r) => r.stage === 'overdue').length,
      replied: by('replied'),
      viewing: by('viewing'),
      closed: by('closed'),
      followUps: stages.filter((r) => r.stage === 'follow_up' || r.stage === 'viewed' || r.stage === 'viewing_requested').length,
      upcoming: enquiries.filter((e) => e.viewingAt && new Date(e.viewingAt).getTime() > now.getTime()).length,
      nextViewing: enquiries
        .filter((e) => e.viewingAt && new Date(e.viewingAt).getTime() > now.getTime())
        .sort((a, b) => a.viewingAt!.localeCompare(b.viewingAt!))[0],
      let30: enquiries.filter((e) => e.outcome === 'let' && now.getTime() - new Date(e.lastActionAt ?? e.at).getTime() <= 30 * DAY).length,
    };
  }, [enquiries, now]);

  /* The listings anyone has asked about, for the property filter. */
  const listingOptions = useMemo(() => {
    const seen = new Map<string, number>();
    for (const e of enquiries) seen.set(e.listingId, (seen.get(e.listingId) ?? 0) + 1);
    return [
      { value: '', label: 'All properties' },
      ...[...seen.entries()]
        .map(([id, n]) => ({ id, n, l: byId.get(id) }))
        .filter((x) => x.l)
        .sort((a, b) => b.n - a.n)
        .map((x) => ({ value: x.id, label: `${x.l!.project} (${x.n})` })),
    ];
  }, [enquiries, byId]);

  /* -------------------------------------------------------------- detail */
  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(window.location.search);
    if (id) next.set('enquiry', id); else next.delete('enquiry');
    const s = next.toString();
    router.replace(`${pathname}${s ? `?${s}` : ''}`, { scroll: false });
  };
  // The drawer renders into a portal, which exists only in the browser; a link that
  // opens straight onto an enquiry waits for hydration so both renders agree.
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const open = mounted && openId ? enquiries.find((e) => e.id === openId) ?? null : null;

  const move = (status: EnquiryStatus, extra?: Pick<Enquiry, 'outcome' | 'viewingAt'>) => {
    if (!open) return;
    inbox.setStatus(open.id, status, extra);
    const label = status === 'closed' ? (extra?.outcome === 'let' ? 'Closed as let' : 'Closed as unsuccessful')
      : status === 'viewing' ? (extra?.viewingAt ? 'Viewing booked' : 'Marked as viewing requested')
        : status === 'replied' ? 'Marked as contacted' : STATUS_LABEL[status];
    push({ tone: 'success', title: label, body: demo ? 'Sample enquiry — this change is not saved.' : `${open.name} · ${byId.get(open.listingId)?.project ?? ''}` });
  };

  const filtersActive = (q.listingId ? 1 : 0) + (q.sort !== 'priority' ? 1 : 0);
  const anyFilter = q.status !== 'all' || !!q.listingId || !!q.text;

  const chipOptions: { key: StatusFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'action', label: 'Needs action', count: counts.action },
    { key: 'new', label: 'New', count: counts.new },
    { key: 'replied', label: 'Contacted', count: counts.replied },
    { key: 'viewing', label: 'Viewing', count: counts.viewing },
    { key: 'closed', label: 'Closed', count: counts.closed },
  ];

  const sortSelect = (
    <CompactSelect<SortKey>
      label="Sort enquiries"
      value={q.sort}
      onChange={(v) => update({ sort: v })}
      options={SORTS.map((o) => ({ value: o.key, label: o.label }))}
      icon={<ArrowDownUp size={13} />}
    />
  );
  const propertySelect = (
    <CompactSelect<string>
      label="Property"
      value={q.listingId}
      onChange={(v) => update({ listingId: v })}
      options={listingOptions}
      icon={<Building2 size={13} />}
      className="w-full md:w-64"
    />
  );
  const clear = () => { setQ(DEFAULT_QUERY); setPage(1); };

  return (
    <>
      {/* ----------------------------------------------------------- header */}
      <header className="vr-rise mb-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 sm:mb-6">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 font-p1display text-[24px] font-bold tracking-[-0.025em] text-p1-text sm:text-[28px]">
            Enquiries
            {demo && <DemoBadge title={inbox.notice} />}
          </h1>
          <p className="mt-0.5 text-[13.5px] text-p1-text-3">
            {counts.action
              ? <><span className="font-medium text-p1-text-2">{counts.action}</span> {counts.action === 1 ? 'enquiry needs' : 'enquiries need'} you{counts.overdue ? <>, <span className="font-medium text-p1-danger">{counts.overdue} overdue</span></> : ''}.</>
              : 'Who asked, about which property, and what to do next.'}
          </p>
        </div>
        {enquiries.length > 0 && (
          <div className="w-full sm:w-80">
            <SearchInput
              size="sm"
              value={q.text}
              onChange={(v) => update({ text: v })}
              placeholder="Search name, property or message"
              label="Search enquiries"
            />
          </div>
        )}
      </header>

      {demo && (
        <p role="status" className="vr-rise mb-4 flex items-start gap-2 rounded-xl border border-p1-warning-border bg-p1-warning-soft/60 px-3.5 py-2.5 text-[12.5px] leading-5 text-p1-text-2">
          <Info size={14} aria-hidden className="mt-0.5 shrink-0 text-p1-warning" />
          <span><span className="font-semibold text-p1-text">Sample enquiries.</span> These are not real people, so calling and messaging are off, and changes last until you reload.</span>
        </p>
      )}

      {enquiries.length === 0 ? (
        <Panel id="enq-list-h" title="Inbox">
          <PanelEmpty
            icon={<Inbox size={18} />}
            title="No enquiries yet"
            body="When a tenant writes about one of your live listings, the enquiry lands here with the property, their budget and move-in date. To preview a busy inbox, turn on Demo Data in the header."
          />
        </Panel>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {/* ------------------------------------------------------ at a glance */}
          <section aria-label="At a glance" className="vr-stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Glance
              icon={<MessageSquareReply size={18} />} accent="blue" label="Waiting for a reply" value={counts.new}
              hint={counts.overdue ? `${counts.overdue} waiting over 4 h` : counts.new ? 'All within 4 h' : 'Nobody waiting'}
              hintTone={counts.overdue ? 'danger' : undefined}
              active={q.status === 'new'} onClick={() => update({ status: q.status === 'new' ? 'all' : 'new' })}
            />
            <Glance
              icon={<Clock size={18} />} accent="amber" label="Follow-ups & decisions" value={counts.followUps}
              hint="Chase, confirm or ask for a decision"
              active={q.status === 'action'} onClick={() => update({ status: q.status === 'action' ? 'all' : 'action' })}
            />
            <Glance
              icon={<CalendarCheck size={18} />} accent="violet" label="Viewings booked" value={counts.upcoming}
              hint={counts.nextViewing ? <span suppressHydrationWarning>Next {sgDateTime(counts.nextViewing.viewingAt)}</span> : 'None in the diary'}
              active={q.status === 'viewing'} onClick={() => update({ status: q.status === 'viewing' ? 'all' : 'viewing' })}
            />
            <Glance
              icon={<KeyRound size={18} />} accent="green" label="Let, last 30 days" value={counts.let30}
              hint={`${counts.closed} closed in all`}
              active={q.status === 'closed'} onClick={() => update({ status: q.status === 'closed' ? 'all' : 'closed' })}
            />
          </section>

          {/* ------------------------------------------------------------ inbox */}
          <section aria-labelledby="enq-list-h" className="vr-rise overflow-hidden rounded-2xl border border-p1-border bg-p1-surface shadow-p1-sm" style={{ animationDelay: '60ms' }}>
            <h2 id="enq-list-h" className="sr-only">Enquiries</h2>

            <div className="flex flex-col gap-3 border-b border-p1-border px-4 py-3 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
              <StatusTabs value={q.status} onChange={(k) => update({ status: k })} options={chipOptions} />
              <div className="flex items-center gap-2">
                <div className="hidden md:block">{propertySelect}</div>
                <div className="hidden md:block">{sortSelect}</div>
                <Button
                  variant="outline" size="sm" className="md:hidden" leftIcon={<SlidersHorizontal size={14} />}
                  onClick={() => setSheet(true)} aria-label={`Filters${filtersActive ? `, ${filtersActive} active` : ''}`}
                >
                  {filtersActive ? `Filters · ${filtersActive}` : 'Filters'}
                </Button>
                <span className="ml-auto text-[12.5px] tabular-nums text-p1-text-3 md:hidden" aria-hidden>{rows.length} of {enquiries.length}</span>
              </div>
            </div>

            {(anyFilter || rows.length !== enquiries.length) && (
              <div className="hidden items-center justify-between gap-3 border-b border-p1-border bg-p1-bg/60 px-5 py-2 md:flex">
                <span className="text-[12.5px] tabular-nums text-p1-text-3" aria-live="polite">Showing {rows.length} of {enquiries.length}</span>
                {anyFilter && (
                  <button type="button" onClick={clear} className="cursor-pointer rounded-md px-2 py-0.5 text-[12.5px] font-medium text-p1-primary hover:bg-p1-primary-soft">
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {rows.length === 0 ? (
              <PanelEmpty
                icon={<Inbox size={18} />}
                title="No enquiries match"
                body="Nothing in this view. Clear the filters to see every enquiry."
                action={<Button size="sm" variant="outline" onClick={clear}>Clear filters</Button>}
              />
            ) : (
              <div key={`${demo}-${q.status}-${q.listingId}-${q.sort}`} className="p1-in">
                <div aria-hidden className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_132px_minmax(0,150px)_84px] items-center gap-4 border-b border-p1-border bg-p1-bg/60 px-5 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-p1-text-3 md:grid">
                  <span>Client</span><span>Property</span><span>Status</span><span className="hidden lg:block">Next action</span><span className="text-right">Contact</span>
                </div>
                <ul aria-label="Enquiries" className="vr-stagger divide-y divide-p1-border">
                  {pg.slice.map((e) => (
                    <Row
                      key={e.id}
                      e={e}
                      r={reading(e)}
                      l={byId.get(e.listingId)}
                      own={inbox.isOwn(e.listingId)}
                      ownerId={user?.id}
                      now={now}
                      demo={demo}
                      selected={e.id === openId}
                      onOpen={() => setOpen(e.id)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {rows.length > 0 && (
              <div className="border-t border-p1-border px-4 py-3 sm:px-5">
                <Pagination page={pg.page} pages={pg.pages} onChange={setPage} from={pg.from} to={pg.to} total={pg.total} noun="enquiries" />
              </div>
            )}
          </section>
        </div>
      )}

      {/* ------------------------------------------------ filters, on a phone */}
      <Drawer
        open={sheet}
        onClose={() => setSheet(false)}
        title="Filter enquiries"
        width="sm"
        footer={[
          <Button key="clear" variant="ghost" onClick={clear}>Clear all</Button>,
          <Button key="done" onClick={() => setSheet(false)}>Show {rows.length} {rows.length === 1 ? 'enquiry' : 'enquiries'}</Button>,
        ]}
      >
        <div className="space-y-5">
          <div>
            <div className="mb-2 text-[13px] font-semibold text-p1-text">Status</div>
            <FilterChips<StatusFilter> label="Status" value={q.status} onChange={(k) => update({ status: k })} options={chipOptions} size="sm" />
          </div>
          <div>
            <div className="mb-2 text-[13px] font-semibold text-p1-text">Property</div>
            {propertySelect}
          </div>
          <div>
            <div className="mb-2 text-[13px] font-semibold text-p1-text">Order</div>
            {sortSelect}
          </div>
        </div>
      </Drawer>

      <EnquiryDetail
        key={open?.id ?? 'none'}
        e={open}
        listing={open ? byId.get(open.listingId) : undefined}
        own={open ? inbox.isOwn(open.listingId) : false}
        ownerId={user?.id}
        demo={demo}
        now={now}
        onClose={() => setOpen(null)}
        onStatus={move}
      />
    </>
  );
}

/* ------------------------------------------------------------------ pieces */

/** Status tabs with counts, in the dashboard's pill style. */
function StatusTabs({ value, onChange, options }: {
  value: StatusFilter;
  onChange: (k: StatusFilter) => void;
  options: { key: StatusFilter; label: string; count?: number }[];
}) {
  return (
    <div role="group" aria-label="Filter by status" className="p1-noscrollbar -mx-1 flex min-w-0 gap-1 overflow-x-auto px-1">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.key)}
            className={cx(
              'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-p1-primary',
              on ? 'bg-p1-primary text-p1-primary-on shadow-p1-sm' : 'text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text',
            )}
          >
            {o.label}
            {typeof o.count === 'number' && (
              <span className={cx('rounded-md px-1.5 text-[11.5px] font-semibold tabular-nums', on ? 'bg-white/20' : 'bg-p1-subtle text-p1-text-3')}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * One enquiry. The whole row opens it; the call and message buttons sit above
 * that and do their own thing, so neither is a control inside another.
 */
function Row({
  e, r, l, own, ownerId, now, demo, selected, onOpen,
}: {
  e: Enquiry;
  r: StageReading;
  l: DemoListing | undefined;
  own: boolean;
  ownerId?: string;
  now: Date;
  demo: boolean;
  selected: boolean;
  onOpen: () => void;
}) {
  const fresh = e.status === 'new';
  const links = contactLinks(e.contact);
  const blocked = demo || isSeededSample(e.id);
  const kind = demo ? (e.contact.includes('@') ? 'email' : 'phone') : contactKind(e.contact);
  const off = blocked ? 'Contact is off for sample enquiries' : undefined;

  return (
    <li
      className={cx(
        'group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 px-4 py-3 transition-colors hover:bg-p1-subtle/60 sm:px-5',
        'md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_132px_minmax(0,150px)_84px]',
        selected && 'bg-p1-primary-soft/60',
        fresh && !selected && 'bg-p1-primary-soft/25',
      )}
    >
      {/* client — the button stretches over the whole row */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative shrink-0">
          <Avatar name={e.name} size="sm" tone={fresh ? 'primary' : 'neutral'} />
          {fresh && <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-p1-primary ring-2 ring-p1-surface" />}
        </span>
        <span className="min-w-0">
          <button
            type="button"
            onClick={onOpen}
            aria-current={selected || undefined}
            className="block max-w-full cursor-pointer truncate text-left text-[13.5px] text-p1-text after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-p1-primary"
          >
            <span className={fresh ? 'font-semibold' : 'font-medium'}>{e.name}</span>
            {fresh && <span className="sr-only"> (unanswered)</span>}
          </button>
          <span className="flex items-center gap-1.5 text-[11.5px] text-p1-text-3">
            <span suppressHydrationWarning className="tabular-nums" title={sgDateTime(new Date(enquiryTime(e)))}>{sgRelative(new Date(enquiryTime(e)), now)}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">{CHANNEL_ICON[e.channel]}{e.channel}</span>
          </span>
        </span>
      </div>

      <span className="justify-self-end md:hidden"><StageTag r={r} /></span>

      {/* property */}
      <div className="col-span-2 flex min-w-0 items-center gap-2.5 md:col-span-1">
        <Thumb l={l} ownerId={ownerId} own={own} />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium text-p1-text">{l ? l.project : 'Listing removed'}</span>
          {l && (
            <span className="block truncate text-[11.5px] text-p1-text-3">
              {floorLabel(l) ? `${floorLabel(l)} · ` : ''}{l.bedrooms ? `${l.bedrooms} bed · ` : ''}{sgd(l.monthlyRent)}/mo
            </span>
          )}
        </span>
      </div>

      <span className="hidden md:block"><StageTag r={r} /></span>

      {/* next action; on a phone it shares a line with the contact buttons */}
      <div className="col-span-2 flex min-w-0 items-center justify-between gap-3 border-t border-p1-border pt-2.5 md:contents">
        <NextAction r={r} small className="min-w-0 truncate md:hidden lg:inline-flex" />
        <span className="relative z-[1] flex items-center justify-end gap-1.5">
          {kind === 'phone' && (
            <>
              <IconLink href={links.call} off={off} label={`Call ${e.name}`} icon={<Phone size={14} />} />
              <IconLink href={links.whatsapp} off={off} label={`WhatsApp ${e.name}`} icon={<MessageCircle size={14} />} external />
            </>
          )}
          {kind === 'email' && <IconLink href={links.email} off={off} label={`Email ${e.name}`} icon={<Mail size={14} />} />}
          <ChevronRight size={16} aria-hidden className="hidden text-p1-text-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-p1-primary md:block" />
        </span>
      </div>
    </li>
  );
}

/** A square icon link for a contact action, or a disabled one that says why. */
function IconLink({ href, off, label, icon, external }: {
  href?: string; off?: string; label: string; icon: React.ReactNode; external?: boolean;
}) {
  const box = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors';
  if (!href || off) {
    return (
      <span role="img" aria-label={`${label} (${off ?? 'unavailable'})`} title={off ?? 'Unavailable'} className={cx(box, 'cursor-not-allowed border-p1-border text-p1-text-3/60')}>
        {icon}
      </span>
    );
  }
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      className={cx(box, 'border-p1-border text-p1-text-2 hover:border-p1-primary/40 hover:bg-p1-primary-soft hover:text-p1-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-p1-primary')}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {icon}
    </a>
  );
}

/** A counter that is also a filter: pressing it shows those enquiries. */
function Glance({
  icon, accent, label, value, hint, hintTone, active, onClick,
}: {
  icon: React.ReactNode; accent: Accent; label: string; value: number;
  hint: React.ReactNode; hintTone?: 'danger'; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'group flex min-w-0 cursor-pointer flex-col rounded-2xl border bg-p1-surface p-4 text-left shadow-p1-sm transition-[border-color,box-shadow] duration-200 sm:px-5',
        'hover:border-p1-border-strong hover:shadow-p1-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-p1-primary',
        active ? 'border-p1-primary shadow-[0_0_0_1px_var(--p1-primary)]' : 'border-p1-border',
      )}
    >
      <span className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-3.5">
        <AccentTile accent={accent} size="lg">{icon}</AccentTile>
        <span className="w-full min-w-0 flex-1">
          <CountUp key={value} value={value} duration={500} className="font-p1display text-[24px] font-bold leading-none tracking-[-0.025em] text-p1-text sm:text-[26px]" />
          <span className="mt-1 block text-[12.5px] font-medium leading-tight text-p1-text-2 sm:truncate">{label}</span>
        </span>
      </span>
      <span className={cx('mt-2 text-[11.5px] leading-snug sm:mt-2.5 sm:truncate', hintTone === 'danger' ? 'font-medium text-p1-danger' : 'text-p1-text-3')}>{hint}</span>
    </button>
  );
}
