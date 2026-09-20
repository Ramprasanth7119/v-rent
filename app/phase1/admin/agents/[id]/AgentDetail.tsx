"use client";

/**
 * One agent, as an operations officer sees them.
 *
 * Suspension is the everyday thing on this screen that changes another person's
 * account, and for an account that actually exists it is written to their
 * workspace through the admin API — the same record the publish gate reads, so
 * the agent's next request finds publication withdrawn. On a sample row there
 * is nobody to suspend, so the control says so rather than pretending.
 *
 * Deletion sits apart from the rest, below a rule and behind the agent's own
 * email address typed out, because it is the one action here that cannot be
 * taken back. Suspension is offered first and in plainer clothing: it is what
 * an officer reaching for this usually wants.
 *
 * Laid out as a record: who they are across the top, four numbers, the detail
 * in tabs, and every action an officer can take in one card on the right.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card, Callout, Button, Avatar, EmptyState, SelectMenu, TextArea, TextInput, KPI, Tabs, Timeline, Tooltip, DataTable, Column, cx,
} from '../../../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../../../components/phase1/status';
import { ConfirmDialog, Dialog } from '../../../../../components/phase1/overlays';
import { PropertyImage } from '../../../../../components/phase1/PropertyImage';
import { CopyText } from '../../../../../components/phase1/market/CopyText';
import { coverPhoto } from '../../../../../lib/phase1/photos';
import { useToast } from '../../../../../components/phase1/Toast';
import { useDemoDataOn } from '../../../../../lib/phase1/report-data/switch';
import { DEMO_LIVE_ACTION_BLOCKED } from '../../../../../lib/phase1/report-data';
import type { DirectoryAgent } from '../../../../../lib/phase1/admin-directory';
import { DemoListing } from '../../../../../lib/phase1/data';
import { dealOf, priceLabel } from '../../../../../lib/phase1/pricing';
import { districtCode } from '../../../../../lib/phase1/districts';
import { TODAY, TODAY_ISO } from '../../../../../lib/phase1/workspace';
import { sgDate } from '../../../../../lib/phase1/format';
import {
  ChevronLeft, Ban, RotateCcw, Mail, Phone, Building2, MessageSquare, Check, X, Building, ShieldCheck, CalendarDays,
  FileText, Info, Wallet, CalendarClock, Trash2,
} from 'lucide-react';

const REASONS = [
  { value: 'fraud', label: 'Fraud suspected' },
  { value: 'cea', label: 'CEA complaint' },
  { value: 'payment', label: 'Payment dispute' },
  { value: 'other', label: 'Other' },
];

type Tab = 'overview' | 'listings' | 'activity';

export default function AgentDetail({ agent, listings }: { agent: DirectoryAgent; listings: DemoListing[] }) {
  const router = useRouter();
  const { push } = useToast();
  const demoOn = useDemoDataOn();
  const [override, setOverride] = useState<DirectoryAgent['status'] | null>(null);
  const [confirm, setConfirm] = useState<null | 'suspend' | 'reinstate' | 'approve' | 'reject' | 'delete'>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reason, setReason] = useState('fraud');
  /* Typed out by the officer to arm the delete. Cleared whenever the dialog
     closes, so a half-typed address cannot be left sitting there armed. */
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [message, setMessage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  const published = listings.filter((l) => l.status === 'published');
  const drafts = listings.filter((l) => l.status === 'draft');
  const rentals = published.filter((l) => dealOf(l) === 'rent');
  const inventoryValue = rentals.reduce((n, l) => n + l.monthlyRent, 0);
  const effectiveStatus = override ?? agent.status;
  const expired = effectiveStatus === 'verification_expired';
  const isSuspended = effectiveStatus === 'suspended';
  /* The decision this screen exists to support, when there is one to make. */
  const awaitingDecision = effectiveStatus === 'under_review';

  const endTime = agent.ceaValidUntil ? new Date(`${agent.ceaValidUntil}T23:59:59+08:00`).getTime() : NaN;
  const ceaDays = Number.isNaN(endTime) ? null : Math.ceil((endTime - TODAY.getTime()) / 86_400_000);

  /** Real accounts are changed on the server; sample rows only on this screen. */
  const act = async (action: 'suspend' | 'reinstate') => {
    setConfirm(null);
    const next = action === 'suspend' ? 'suspended' : 'approved';

    if (!agent.real) {
      setOverride(next);
      push({ tone: 'info', title: 'Sample agent', body: 'Nothing was changed — this row is demonstration data, not an account.' });
      return;
    }
    if (demoOn) {
      push(DEMO_LIVE_ACTION_BLOCKED);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/phase1/admin/agents/${agent.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setOverride(next);
      push(action === 'suspend'
        ? { tone: 'warn', title: 'Agent suspended', body: 'Publication rights withdrawn. It applies on their next request.' }
        : { tone: 'success', title: 'Agent reinstated', body: 'Publication rights restored.' });
      router.refresh();
    } catch {
      push({ tone: 'error', title: 'That did not go through', body: 'The account was not changed. Try again in a moment.' });
    } finally {
      setBusy(false);
    }
  };

  const closeDelete = () => {
    setConfirm(null);
    setConfirmEmail('');
    setDeleteReason('');
  };

  /**
   * Delete the account, its workspace and its photographs.
   *
   * The server decides what may go; this only carries the officer's reason and
   * reports what came back. There is nothing to return to afterwards, so the
   * screen leaves for the directory rather than re-reading a record that is no
   * longer there.
   */
  const remove = async () => {
    if (!agent.real) {
      closeDelete();
      push({ tone: 'info', title: 'Sample agent', body: 'Nothing was changed — this row is demonstration data, not an account.' });
      return;
    }
    if (demoOn) {
      closeDelete();
      push(DEMO_LIVE_ACTION_BLOCKED);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/phase1/admin/agents/${agent.id}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? String(res.status));

      const { listings: gone = 0, photos = 0 } = payload?.removed ?? {};
      closeDelete();
      push({
        tone: 'success',
        title: `${agent.name} deleted`,
        body: `The account, ${gone} ${gone === 1 ? 'listing' : 'listings'} and ${photos} ${photos === 1 ? 'photograph' : 'photographs'} were removed. The decision is in the audit trail.`,
      });
      router.push('/phase1/admin/agents');
      router.refresh();
    } catch (err) {
      push({
        tone: 'error',
        title: 'The account was not deleted',
        body: err instanceof Error && err.message.length > 3 ? err.message : 'Nothing was removed. Try again in a moment.',
      });
      setBusy(false);
    }
  };

  /**
   * Approve or reject the application — the same endpoint the verification
   * queue posts to, so a decision taken here is the decision taken there.
   */
  const decide = async (action: 'approve' | 'reject') => {
    setConfirm(null);
    const next = action === 'approve' ? 'approved' : 'rejected';

    if (!agent.real) {
      setOverride(next);
      push({ tone: 'info', title: 'Sample agent', body: 'Nothing was changed — this row is demonstration data, not an account.' });
      return;
    }
    if (demoOn) {
      push(DEMO_LIVE_ACTION_BLOCKED);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/phase1/admin/verification', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accountId: agent.id, action, reason: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setOverride(next);
      setRejectReason('');
      push(action === 'approve'
        ? { tone: 'success', title: 'Application approved', body: 'The agent can choose a plan and publish.' }
        : { tone: 'warn', title: 'Application rejected', body: 'The agent has been told what to correct.' });
      router.refresh();
    } catch {
      push({ tone: 'error', title: 'That did not go through', body: 'The application was not changed. Try again in a moment.' });
    } finally {
      setBusy(false);
    }
  };

  const banner = {
    approved: null,
    verification_expired: { tone: 'danger' as const, title: `CEA registration lapsed on ${sgDate(agent.ceaValidUntil)}`, body: 'They can still sign in, but cannot publish until the register shows a renewal.' },
    rejected: { tone: 'danger' as const, title: 'Application rejected', body: 'They keep their account and drafts, and can apply again once corrected.' },
    under_review: { tone: 'warning' as const, title: 'Awaiting a verification decision', body: 'Nothing can be published until an officer approves the application.' },
    suspended: { tone: 'danger' as const, title: 'Suspended by an administrator', body: 'Publication rights are withdrawn. The account and drafts are kept.' },
  }[effectiveStatus];

  const history = [
    { key: 'reg', label: 'Registered and verified contact details', state: 'done' as const, at: sgDate(agent.joinedAt) },
    { key: 'match', label: 'CEA register match proposed', state: 'done' as const, at: sgDate(agent.joinedAt) },
    agent.status === 'under_review'
      ? { key: 'decision', label: 'Officer decision', state: 'current' as const, detail: 'Usually within one business day' }
      : { key: 'decision', label: agent.status === 'rejected' ? 'Application rejected' : 'Approved after CEA register match', state: agent.status === 'rejected' ? 'failed' as const : 'done' as const, at: sgDate(agent.joinedAt) },
    { key: 'recheck', label: 'Daily re-check against the register', state: agent.status === 'under_review' ? 'upcoming' as const : 'done' as const, at: agent.status === 'under_review' ? undefined : sgDate(TODAY_ISO) },
  ];

  const listingColumns: Column<DemoListing>[] = [
    {
      key: 'property', header: 'Property', width: '42%',
      render: (l) => (
        <div className="flex min-w-0 items-center gap-3">
          <PropertyImage seed={l.reference + l.project} src={coverPhoto(agent.id, l)} alt="" rounded="rounded-md" className="h-10 w-14 shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium text-p1-text">{l.project}</div>
            <div className="truncate text-[12.5px] text-p1-text-3">{l.reference} · {l.address}</div>
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', nowrap: true, render: (l) => <StatusBadge kind="listing" value={l.status} size="sm" /> },
    { key: 'price', header: 'Price', align: 'right', nowrap: true, render: (l) => <span className="tabular-nums font-medium">{priceLabel(l).amount}<span className="text-[12px] font-normal text-p1-text-3">{priceLabel(l).suffix}</span></span> },
    { key: 'layout', header: 'Layout', hideBelow: 'lg', nowrap: true, muted: true, render: (l) => `${l.bedrooms} bed · ${l.sizeSqft.toLocaleString('en-SG')} sqft` },
    { key: 'district', header: 'District', hideBelow: 'md', nowrap: true, muted: true, render: (l) => districtCode(l.district) },
    { key: 'photos', header: 'Photos', align: 'right', hideBelow: 'xl', nowrap: true, muted: true, render: (l) => <span className="tabular-nums">{l.images}</span> },
  ];

  const details: { k: string; v: React.ReactNode; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { k: 'Agency', v: agent.agency || '—', icon: Building2 },
    { k: 'Agency licence', v: agent.agencyLicence ? <span className="font-mono text-[13.5px]">{agent.agencyLicence}</span> : '—', icon: FileText },
    { k: 'Email', v: agent.email ? <a href={`mailto:${agent.email}`} className="break-all hover:text-p1-primary">{agent.email}</a> : '—', icon: Mail },
    { k: 'Mobile', v: agent.mobile || '—', icon: Phone },
    { k: 'CEA valid until', v: agent.ceaValidUntil ? sgDate(agent.ceaValidUntil) : '—', icon: ShieldCheck },
    { k: 'Joined', v: sgDate(agent.joinedAt), icon: CalendarDays },
  ];

  return (
    <>
      <Link href="/phase1/admin/agents" className="mb-4 inline-flex h-8 items-center gap-1 rounded-md pr-2 text-[13.5px] font-medium text-p1-text-3 hover:text-p1-text">
        <ChevronLeft size={16} aria-hidden /> Agents
      </Link>

      {/* ----------------------------------------------------- profile card */}
      <section className="vr-rise mb-5 rounded-xl border border-p1-border bg-p1-surface">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar name={agent.name} size="lg" tone={agent.real ? 'primary' : 'neutral'} className="sm:h-16 sm:w-16 sm:text-[20px]" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-p1-text sm:text-[24px]">{agent.name}</h1>
                <StatusBadge kind="agent" value={effectiveStatus} size="md" />
                {!agent.real && (
                  <Tooltip content="Demonstration roster, not an account on this instance. Actions change nothing.">
                    <span tabIndex={0} className="rounded-md bg-p1-subtle px-1.5 py-0.5 text-[11.5px] font-medium text-p1-text-3">Sample data</span>
                  </Tooltip>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px] text-p1-text-2">
                {agent.ceaNumber ? <CopyText value={agent.ceaNumber} label="CEA registration number" /> : <span className="text-p1-text-3">No CEA registration</span>}
                {agent.agency && <span className="inline-flex min-w-0 items-center gap-1.5"><Building2 size={14} className="shrink-0 text-p1-text-3" aria-hidden /><span className="truncate">{agent.agency}</span></span>}
                <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-p1-text-3" aria-hidden />Joined {sgDate(agent.joinedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {banner && (
        <Callout tone={banner.tone} title={banner.title} compact className="mb-5">{banner.body}</Callout>
      )}

      {/* ------------------------------------------------------------ KPIs */}
      <section aria-label="Agent at a glance" className="vr-stagger mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="Live listings" value={published.length} of={listings.length} icon={<Building size={16} />} iconTone="primary" sub={`${listings.length} in portfolio`} />
        <KPI label="Drafts" value={drafts.length} icon={<FileText size={16} />} iconTone="neutral" sub="Not yet published" />
        <KPI label="Rent listed" value={inventoryValue} prefix="S$" compact icon={<Wallet size={16} />} iconTone="success" sub={`a month · ${rentals.length} ${rentals.length === 1 ? 'rental' : 'rentals'}`} />
        <KPI
          label="CEA registration"
          value={ceaDays === null ? 0 : Math.max(0, ceaDays)}
          suffix=" days"
          icon={<CalendarClock size={16} />} iconTone="accent"
          tone={expired || (ceaDays !== null && ceaDays < 0) ? 'danger' : ceaDays !== null && ceaDays <= 60 ? 'warning' : 'default'}
          sub={ceaDays === null ? 'No end date on record' : ceaDays < 0 ? `Lapsed ${sgDate(agent.ceaValidUntil)}` : `Valid to ${sgDate(agent.ceaValidUntil)}`}
        />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ---------------------------------------------------------- tabs */}
        <div className="min-w-0">
          <Card padding="none" className="overflow-hidden">
            <div className="px-4 sm:px-5">
              <Tabs<Tab>
                label="Agent record"
                value={tab}
                onChange={setTab}
                className="border-b-0"
                items={[
                  { key: 'overview', label: 'Overview' },
                  { key: 'listings', label: 'Listings', count: listings.length },
                  { key: 'activity', label: 'Activity' },
                ]}
              />
            </div>

            <div key={tab} className="p1-in border-t border-p1-border">
              {tab === 'overview' && (
                <div>
                  <dl className="grid sm:grid-cols-2">
                    {details.map((d) => (
                      <div key={d.k} className="flex items-start gap-3 border-b border-p1-border px-5 py-3.5 sm:[&:nth-child(odd)]:border-r">
                        <d.icon size={16} className="mt-0.5 shrink-0 text-p1-text-3" />
                        <div className="min-w-0 flex-1">
                          <dt className="text-[12.5px] text-p1-text-3">{d.k}</dt>
                          <dd className="mt-0.5 text-[14px] text-p1-text">{d.v}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                  <div className="p-5">
                    <h2 className="text-[13px] font-medium text-p1-text-3">About</h2>
                    <p className={cx('mt-1.5 text-[14px] leading-6', agent.bio ? 'text-p1-text-2' : 'text-p1-text-3')}>
                      {agent.bio || 'No biography written yet.'}
                    </p>
                    {agent.specialisations.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-[13px] font-medium text-p1-text-3">Specialisations</h3>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">{agent.specialisations.map((s) => <Pill key={s}>{s}</Pill>)}</div>
                      </div>
                    )}
                    {agent.languages.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-[13px] font-medium text-p1-text-3">Languages</h3>
                        <p className="mt-1 text-[14px] text-p1-text-2">{agent.languages.join(', ')}</p>
                      </div>
                    )}
                    {listings.length > 0 && (
                      <button type="button" onClick={() => setTab('listings')} className="mt-5 inline-flex cursor-pointer items-center gap-1 text-[13.5px] font-medium text-p1-primary hover:underline underline-offset-4">
                        See all {listings.length} listings
                      </button>
                    )}
                  </div>
                </div>
              )}

              {tab === 'listings' && (
                listings.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Building size={20} />}
                    title="No listings yet"
                    description={effectiveStatus === 'under_review' ? 'Nothing can be published before verification is approved.' : 'This agent has not created any listings.'}
                  />
                ) : (
                  <>
                    <div className="hidden sm:block">
                      <DataTable flush columns={listingColumns} rows={listings} rowKey={(l) => l.id} caption={`Listings by ${agent.name}`} minWidth={560} />
                    </div>
                    <ul className="divide-y divide-p1-border sm:hidden">
                      {listings.map((l) => (
                        <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                          <PropertyImage seed={l.reference + l.project} src={coverPhoto(agent.id, l)} alt="" rounded="rounded-md" className="h-12 w-16 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[14px] font-medium text-p1-text">{l.project}</div>
                            <div className="truncate text-[12.5px] text-p1-text-3">{priceLabel(l).amount}{priceLabel(l).suffix} · {l.bedrooms} bed · {districtCode(l.district)}</div>
                          </div>
                          <StatusBadge kind="listing" value={l.status} size="sm" />
                        </li>
                      ))}
                    </ul>
                  </>
                )
              )}

              {tab === 'activity' && (
                <div className="p-5">
                  <Timeline items={history} />
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ------------------------------------------------- account actions */}
        <aside className="order-first space-y-4 lg:order-none">
          <Card padding="none" as="section" aria-labelledby="actions-h" className="lg:sticky lg:top-20">
            <div className="flex items-center justify-between gap-2 border-b border-p1-border px-4 py-3.5">
              <h2 id="actions-h" className="text-[14px] font-semibold text-p1-text">Account actions</h2>
              {!agent.real && (
                <Tooltip content="Sample rows change nothing on the server.">
                  <span tabIndex={0} className="text-p1-text-3"><Info size={15} aria-label="About sample rows" /></span>
                </Tooltip>
              )}
            </div>
            <div className="space-y-2 p-4">
              {awaitingDecision && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" loading={busy} leftIcon={<X size={15} />} onClick={() => setConfirm('reject')}>Reject</Button>
                  <Button loading={busy} leftIcon={<Check size={15} />} onClick={() => setConfirm('approve')}>Approve</Button>
                </div>
              )}
              <Button variant="outline" block leftIcon={<MessageSquare size={15} />} onClick={() => setMessage(true)}>Message agent</Button>
              {isSuspended ? (
                <Button variant="outline" block loading={busy} leftIcon={<RotateCcw size={15} />} onClick={() => setConfirm('reinstate')}>Reinstate access</Button>
              ) : (
                <Button variant="danger-outline" block loading={busy} leftIcon={<Ban size={15} />} onClick={() => setConfirm('suspend')}>Suspend agent</Button>
              )}
            </div>
            {/* Below a rule and worded as what it is. Suspension above covers
                almost every case an officer opens this card for. */}
            <div className="border-t border-p1-border px-4 py-3">
              <button
                type="button"
                onClick={() => setConfirm('delete')}
                disabled={busy}
                className="p1-in inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg px-2 text-[13px] font-medium text-p1-danger hover:bg-p1-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={14} aria-hidden /> Delete account
              </button>
              <p className="mt-1 px-2 text-[12.5px] leading-5 text-p1-text-3">
                Removes the account, its listings and its photographs. This cannot be undone.
              </p>
            </div>
            <dl className="divide-y divide-p1-border border-t border-p1-border text-[13.5px]">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-p1-text-3">Plan</dt>
                <dd className={agent.plan ? 'font-medium text-p1-text' : 'text-p1-text-3'}>{agent.plan ?? 'No plan'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-p1-text-3">Publishing</dt>
                <dd className={cx('font-medium', effectiveStatus === 'approved' ? 'text-p1-success' : 'text-p1-danger')}>
                  {effectiveStatus === 'approved' ? 'Allowed' : 'Blocked'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-p1-text-3">Record</dt>
                <dd className="text-p1-text-2">{agent.real ? 'Account on this instance' : 'Sample roster'}</dd>
              </div>
            </dl>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm === 'suspend'} onClose={() => setConfirm(null)} tone="danger" icon={<Ban size={20} />} confirmLabel="Suspend agent"
        title="Suspend this agent?"
        description={agent.real
          ? 'Publication rights are withdrawn on their next request. Their account and listings are kept, hidden.'
          : 'This row is demonstration data, so nothing will actually change.'}
        onConfirm={() => void act('suspend')}
      >
        <SelectMenu variant="button" label="Reason" value={reason} onChange={setReason} options={REASONS} />
        <p className="mt-1.5 text-[12.5px] text-p1-text-3">Recorded in the audit log and shown to the agent.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'reinstate'} onClose={() => setConfirm(null)} tone="success" icon={<RotateCcw size={20} />} confirmLabel="Reinstate"
        title="Reinstate this agent?" description="Access and publication rights are restored. Their listings return to their previous state."
        onConfirm={() => void act('reinstate')}
      />

      <ConfirmDialog
        open={confirm === 'approve'} onClose={() => setConfirm(null)} tone="success" icon={<ShieldCheck size={20} />} confirmLabel="Approve application"
        title="Approve this application?"
        description={agent.real
          ? 'The agent can choose a plan and publish. The decision is recorded against your name.'
          : 'This row is demonstration data, so nothing will actually change.'}
        onConfirm={() => void decide('approve')}
      />

      <ConfirmDialog
        open={confirm === 'reject'} onClose={() => setConfirm(null)} tone="danger" icon={<X size={20} />} confirmLabel="Reject application"
        title="Reject this application?"
        description="They keep their account and drafts, are told what to correct, and can apply again."
        confirmDisabled={rejectReason.trim().length === 0}
        onConfirm={() => void decide('reject')}
      >
        <TextArea
          id="reject-reason"
          label="What needs correcting"
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value.slice(0, 500))}
          placeholder="The registration number does not match the name on the CEA register."
          hint="Sent to the agent and recorded in the audit trail."
          counter={`${rejectReason.length}/500`}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'delete'} onClose={closeDelete} tone="danger" icon={<Trash2 size={20} />} confirmLabel="Delete account"
        loading={busy}
        title={`Delete ${agent.name}?`}
        description={agent.real
          ? `The account, ${agent.listingsTotal} ${agent.listingsTotal === 1 ? 'listing' : 'listings'} and every uploaded photograph are removed. The agent is emailed. This cannot be undone — suspending them keeps the record and can be reversed.`
          : 'This row is demonstration data, so nothing will actually change.'}
        confirmDisabled={agent.real && (confirmEmail.trim().toLowerCase() !== agent.email.toLowerCase() || deleteReason.trim().length < 10)}
        onConfirm={() => void remove()}
      >
        <TextArea
          id="delete-reason"
          label="Why the account is being deleted"
          rows={2}
          value={deleteReason}
          onChange={(e) => setDeleteReason(e.target.value.slice(0, 500))}
          placeholder="Duplicate registration created in error; the agent asked for it to be removed."
          hint="Recorded in the audit trail, which is kept after the account is gone."
          counter={`${deleteReason.length}/500`}
        />
        <div className="mt-3">
          <TextInput
            id="delete-confirm-email"
            label={`Type ${agent.email} to confirm`}
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={agent.email}
          />
        </div>
      </ConfirmDialog>

      <Dialog
        open={message}
        onClose={() => setMessage(false)}
        title={`Message ${agent.name}`}
        description="Sent by email and shown in their notifications."
        icon={<Mail size={19} />}
        layout="inline"
        footer={<><Button variant="outline" size="lg" className="flex-1 sm:flex-none" onClick={() => setMessage(false)}>Cancel</Button><Button size="lg" className="flex-1 sm:flex-none" onClick={() => { setMessage(false); push({ tone: 'success', title: 'Message sent' }); }}>Send message</Button></>}
      >
        <TextArea id="agent-msg" label="Message" rows={4} defaultValue="Hello, could you upload a clearer copy of your CEA card?" />
      </Dialog>
    </>
  );
}
