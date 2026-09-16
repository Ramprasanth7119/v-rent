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
  ArrowDownUp, CalendarCheck, CircleCheck, Clock, Inbox, MessageSquareReply, SlidersHorizontal,
} from 'lucide-react';
import {
  Avatar, Button, Card, CountUp, DataTable, EmptyState, FilterChips, InlineSelect, PageHeader, Pagination,
  SearchInput, SelectMenu, cx, usePagination, type Column,
} from '../../../components/phase1/kit';
import { Drawer } from '../../../components/phase1/overlays';
import { useToast } from '../../../components/phase1/Toast';
import { DemoBadge } from '../../../components/phase1/DemoDataSwitch';
import { EnquiryDetail } from '../../../components/phase1/enquiries/EnquiryDetail';
import { Channel, NextAction, PropertyLine, StagePill } from '../../../components/phase1/enquiries/parts';
import { useSession } from '../../../lib/phase1/SessionContext';
import { useEnquiries } from '../../../lib/phase1/useEnquiries';
import type { Enquiry, EnquiryStatus } from '../../../lib/phase1/workspace';
import {
  DEFAULT_QUERY, STATUS_LABEL, enquiryTime, filterEnquiries, needsAction, readStage,
  type EnquiryQuery, type SortKey, type StatusFilter,
} from '../../../lib/phase1/enquiries';
import { sgDateTime, sgRelative } from '../../../lib/phase1/format';

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
        .map((x) => ({ value: x.id, label: `${x.l!.project}${x.l!.unitNo && x.l!.unitNo !== '—' ? ` ${x.l!.unitNo}` : ''} (${x.n})` })),
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

  /* ------------------------------------------------------------- columns */
  const columns: Column<Enquiry>[] = [
    {
      key: 'who', header: 'Prospect',
      render: (e) => (
        /* Capped, so a long message is cut to a line rather than pushing the property off the screen. */
        <div className="flex w-[15rem] min-w-0 items-center gap-3 lg:w-[17rem] xl:w-[22rem] 2xl:w-[28rem]">
          <span className="relative shrink-0">
            <Avatar name={e.name} size="sm" tone={e.status === 'new' ? 'primary' : 'neutral'} />
            {e.status === 'new' && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-p1-primary ring-2 ring-p1-surface" aria-hidden />}
          </span>
          <div className="min-w-0">
            <div className={cx('truncate text-[14px] text-p1-text', e.status === 'new' ? 'font-semibold' : 'font-medium')}>
              {e.name}{e.status === 'new' && <span className="sr-only"> (unanswered)</span>}
            </div>
            <p className="truncate text-[12.5px] text-p1-text-3">{e.message}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'property', header: 'Property',
      render: (e) => <PropertyLine className="max-w-[16rem]" l={byId.get(e.listingId)} own={inbox.isOwn(e.listingId)} ownerId={user?.id} />,
    },
    { key: 'status', header: 'Status', nowrap: true, render: (e) => <StagePill r={reading(e)} /> },
    { key: 'next', header: 'Next action', nowrap: true, hideBelow: 'lg', render: (e) => <NextAction r={reading(e)} /> },
    {
      key: 'at', header: 'Received', align: 'right', nowrap: true,
      render: (e) => (
        <span className="block text-right">
          <span suppressHydrationWarning className="block text-[12.5px] tabular-nums text-p1-text-2" title={sgDateTime(new Date(enquiryTime(e)))}>
            {sgRelative(new Date(enquiryTime(e)), now)}
          </span>
          <Channel channel={e.channel} className="justify-end" />
        </span>
      ),
    },
  ];

  const sortSelect = (
    <InlineSelect<SortKey> label="Sort enquiries" value={q.sort} onChange={(v) => update({ sort: v })} options={SORTS} icon={<ArrowDownUp size={14} />} />
  );
  const propertySelect = (
    <SelectMenu label="Property" hideLabel variant="button" value={q.listingId} options={listingOptions} onChange={(v) => update({ listingId: v })} className="min-w-0" />
  );

  return (
    <>
      <PageHeader
        eyebrow="Clients"
        title="Enquiries"
        description="Who asked, about which property, and what to do next."
        meta={demo ? <DemoBadge title={inbox.notice} /> : undefined}
      />

      {demo && (
        <div role="status" className="vr-rise mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-p1-warning-border bg-p1-warning-soft/60 px-4 py-3">
          <p className="min-w-0 text-[13.5px] leading-5 text-p1-text-2">
            <span className="font-semibold text-p1-text">Sample enquiries for demonstration.</span>{' '}
            These are not real people. Contact actions are off, and changes last only until you reload.
            Turn Demo Data off in the header to see your own enquiries.
          </p>
        </div>
      )}

      {enquiries.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox size={26} />}
            title="No enquiries yet"
            description="When a tenant writes about one of your live listings — from the share link or the tenant site — the enquiry lands here with the property, their budget and move-in date. To preview a busy inbox, turn on Demo Data in the header."
          />
        </Card>
      ) : (
        <>
          {/* ------------------------------------------------------ at a glance */}
          <div className="vr-stagger mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Glance
              icon={<MessageSquareReply size={16} />} tone="info" label="Waiting for a reply" value={counts.new}
              hint={counts.overdue ? `${counts.overdue} waiting over 4 h` : counts.new ? 'All within 4 h' : 'Nobody waiting'}
              hintTone={counts.overdue ? 'danger' : undefined}
              active={q.status === 'new'} onClick={() => update({ status: q.status === 'new' ? 'all' : 'new' })}
            />
            <Glance
              icon={<Clock size={16} />} tone="warning" label="Follow-ups & decisions" value={counts.followUps}
              hint="Chase, confirm or ask for a decision"
              active={q.status === 'action'} onClick={() => update({ status: q.status === 'action' ? 'all' : 'action' })}
            />
            <Glance
              icon={<CalendarCheck size={16} />} tone="success" label="Viewings booked" value={counts.upcoming}
              hint={counts.nextViewing ? <span suppressHydrationWarning>Next {sgDateTime(counts.nextViewing.viewingAt)}</span> : 'None in the diary'}
              active={q.status === 'viewing'} onClick={() => update({ status: q.status === 'viewing' ? 'all' : 'viewing' })}
            />
            <Glance
              icon={<CircleCheck size={16} />} tone="neutral" label="Let, last 30 days" value={counts.let30}
              hint={`${counts.closed} closed in all`}
              active={q.status === 'closed'} onClick={() => update({ status: q.status === 'closed' ? 'all' : 'closed' })}
            />
          </div>

          {/* ---------------------------------------------------------- toolbar */}
          <div className="mb-4 space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <FilterChips<StatusFilter> label="Filter by status" value={q.status} onChange={(k) => update({ status: k })} options={chipOptions} scroll size="sm" />
              <div className="flex items-center gap-2">
                <SearchInput size="sm" value={q.text} onChange={(v) => update({ text: v })} placeholder="Search name, property or message" label="Search enquiries" className="min-w-0 flex-1 lg:w-72 lg:flex-none" />
                <Button
                  variant="outline" className="md:hidden" leftIcon={<SlidersHorizontal size={15} />}
                  onClick={() => setSheet(true)} aria-label={`Filters${filtersActive ? `, ${filtersActive} active` : ''}`}
                >
                  {filtersActive ? filtersActive : 'Filters'}
                </Button>
              </div>
            </div>
            <div className="hidden items-center justify-between gap-3 md:flex">
              <div className="flex min-w-0 items-center gap-2">
                <div className="w-72 min-w-0">{propertySelect}</div>
                {anyFilter && (
                  <button type="button" onClick={() => { setQ(DEFAULT_QUERY); setPage(1); }} className="cursor-pointer rounded-md px-2 py-1 text-[13px] font-medium text-p1-primary hover:bg-p1-primary-soft">
                    Clear filters
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] tabular-nums text-p1-text-3" aria-live="polite">{rows.length} of {enquiries.length}</span>
                {sortSelect}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- list */}
          {rows.length === 0 ? (
            <Card>
              <EmptyState
                compact icon={<Inbox size={22} />} title="No enquiries match"
                description="Nothing in this view. Clear the filters to see every enquiry."
                action={<Button size="sm" variant="outline" onClick={() => { setQ(DEFAULT_QUERY); setPage(1); }}>Clear filters</Button>}
              />
            </Card>
          ) : (
            <div key={`${demo}-${q.status}-${q.listingId}-${q.sort}`} className="p1-in">
              <div className="hidden md:block">
                <DataTable<Enquiry>
                  columns={columns}
                  rows={pg.slice}
                  rowKey={(e) => e.id}
                  caption="Enquiries"
                  minWidth={720}
                  onRowClick={(e) => setOpen(e.id)}
                  selected={(e) => e.id === openId}
                  rowClassName={(e) => cx(e.status === 'new' && 'bg-p1-info-soft/25')}
                />
              </div>

              <ul className="space-y-2.5 md:hidden" aria-label="Enquiries">
                {pg.slice.map((e) => {
                  const r = reading(e);
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setOpen(e.id)}
                        className={cx(
                          'block w-full cursor-pointer rounded-xl border bg-p1-surface p-3.5 text-left transition-colors hover:bg-p1-subtle/60 focus-visible:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none',
                          e.status === 'new' ? 'border-p1-info-border' : 'border-p1-border',
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <span className="relative shrink-0">
                            <Avatar name={e.name} size="sm" tone={e.status === 'new' ? 'primary' : 'neutral'} />
                            {e.status === 'new' && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-p1-primary ring-2 ring-p1-surface" aria-hidden />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className={cx('truncate text-[14.5px] text-p1-text', e.status === 'new' ? 'font-semibold' : 'font-medium')}>{e.name}</span>
                              <span suppressHydrationWarning className="shrink-0 text-[12px] tabular-nums text-p1-text-3">{sgRelative(new Date(enquiryTime(e)), now)}</span>
                            </span>
                            <Channel channel={e.channel} />
                          </span>
                        </span>
                        <PropertyLine l={byId.get(e.listingId)} own={inbox.isOwn(e.listingId)} ownerId={user?.id} size="sm" className="mt-3" />
                        <span className="mt-3 flex items-center justify-between gap-2 border-t border-p1-border pt-2.5">
                          <StagePill r={r} />
                          <NextAction r={r} className="text-right" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <Pagination page={pg.page} pages={pg.pages} onChange={setPage} from={pg.from} to={pg.to} total={pg.total} noun="enquiries" className="mt-3" />
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------ filters, on a phone */}
      <Drawer
        open={sheet}
        onClose={() => setSheet(false)}
        title="Filter enquiries"
        width="sm"
        footer={[
          <Button key="clear" variant="ghost" onClick={() => { setQ(DEFAULT_QUERY); setPage(1); }}>Clear all</Button>,
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

const GLANCE_TONE = {
  info: 'bg-p1-info-soft text-p1-info',
  warning: 'bg-p1-warning-soft text-p1-warning',
  success: 'bg-p1-success-soft text-p1-success',
  neutral: 'bg-p1-subtle text-p1-text-2',
} as const;

/** A counter that is also a filter: pressing it shows those enquiries. */
function Glance({
  icon, tone, label, value, hint, hintTone, active, onClick,
}: {
  icon: React.ReactNode; tone: keyof typeof GLANCE_TONE; label: string; value: number;
  hint: React.ReactNode; hintTone?: 'danger'; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'group min-w-0 cursor-pointer rounded-xl border bg-p1-surface p-4 text-left transition-[border-color,box-shadow] duration-150 hover:border-p1-border-strong focus-visible:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none',
        active ? 'border-p1-primary shadow-[0_0_0_1px_var(--p1-primary)]' : 'border-p1-border',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className={cx('flex h-8 w-8 items-center justify-center rounded-lg', GLANCE_TONE[tone])} aria-hidden>{icon}</span>
        <span className="font-p1display text-[26px] font-bold leading-none tabular-nums text-p1-text">
          <CountUp key={value} value={value} duration={500} />
        </span>
      </span>
      <span className="mt-3 block truncate text-[13.5px] font-medium text-p1-text">{label}</span>
      <span className={cx('mt-0.5 block truncate text-[12px]', hintTone === 'danger' ? 'text-p1-danger' : 'text-p1-text-3')}>{hint}</span>
    </button>
  );
}
