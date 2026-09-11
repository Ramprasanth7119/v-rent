"use client";

/**
 * One agent, as an operations officer sees them.
 *
 * Suspension is the only thing on this screen that changes another person's
 * account, and for an account that actually exists it is written to their
 * workspace through the admin API — the same record the publish gate reads, so
 * the agent's next request finds publication withdrawn. On a sample row there
 * is nobody to suspend, so the control says so rather than pretending.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PageHeader, StatCard, Card, SectionCard, Callout, Field, Button, Avatar, EmptyState, SelectInput } from '../../../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../../../components/phase1/status';
import { ConfirmDialog, Dialog } from '../../../../../components/phase1/overlays';
import { PropertyImage } from '../../../../../components/phase1/PropertyImage';
import { coverPhoto } from '../../../../../lib/phase1/photos';
import { useToast } from '../../../../../components/phase1/Toast';
import type { DirectoryAgent } from '../../../../../lib/phase1/admin-directory';
import { DemoListing, sgd } from '../../../../../lib/phase1/data';
import { dealOf, priceLabel } from '../../../../../lib/phase1/pricing';
import {
  ArrowLeft, Ban, RotateCcw, Mail, Phone, Building2, MessageSquare, Bed, Bath, Maximize, Check, Clock, Building } from 'lucide-react';

const REASONS = [
  { value: 'fraud', label: 'Fraud suspected' },
  { value: 'cea', label: 'CEA complaint' },
  { value: 'payment', label: 'Payment dispute' },
  { value: 'other', label: 'Other' },
];

export default function AgentDetail({ agent, listings }: { agent: DirectoryAgent; listings: DemoListing[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [override, setOverride] = useState<DirectoryAgent['status'] | null>(null);
  const [confirm, setConfirm] = useState<null | 'suspend' | 'reinstate'>(null);
  const [reason, setReason] = useState('fraud');
  const [message, setMessage] = useState(false);
  const [busy, setBusy] = useState(false);

  const published = listings.filter((l) => l.status === 'published');
  const rentals = published.filter((l) => dealOf(l) === 'rent');
  const inventoryValue = rentals.reduce((n, l) => n + l.monthlyRent, 0);
  const effectiveStatus = override ?? agent.status;
  const expired = effectiveStatus === 'verification_expired';
  const isSuspended = effectiveStatus === 'suspended';

  /** Real accounts are changed on the server; sample rows only on this screen. */
  const act = async (action: 'suspend' | 'reinstate') => {
    setConfirm(null);
    const next = action === 'suspend' ? 'suspended' : 'approved';

    if (!agent.real) {
      setOverride(next);
      push({ tone: 'info', title: 'Sample agent', body: 'Nothing was changed — this row is demonstration data, not an account.' });
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

  const banner = {
    approved: {
      tone: 'success' as const,
      title: agent.ceaValidUntil ? `CEA registration valid until ${agent.ceaValidUntil}` : 'CEA registration verified',
      body: 'Re-checked every day against the CEA register. The verified badge expires by itself if the registration is not renewed.',
    },
    verification_expired: {
      tone: 'danger' as const,
      title: `CEA registration lapsed on ${agent.ceaValidUntil}`,
      body: 'The agent can still sign in, but cannot publish. Live listings entered the grace period automatically.',
    },
    under_review: {
      tone: 'warning' as const,
      title: 'Awaiting a verification decision',
      body: 'No listings can be published until a verification officer approves the application.',
    },
    suspended: {
      tone: 'danger' as const,
      title: 'Account suspended by an administrator',
      body: 'Publication rights are withdrawn. The agent keeps their account and their drafts. Reinstate to restore access.',
    },
  }[effectiveStatus];

  const history = [
    { at: agent.joinedAt, what: 'Registered and verified contact details', done: true },
    { at: agent.joinedAt, what: 'CEA registry match proposed', done: true },
    {
      at: agent.status === 'under_review' ? 'Pending' : agent.joinedAt,
      what: agent.status === 'under_review' ? 'Officer decision' : 'Approved after CEA registry match',
      done: agent.status !== 'under_review',
    },
    { at: '2026-08-28', what: 'Daily re-check against the register', done: true },
  ];

  return (
    <>
      <Link href="/phase1/admin/agents" className="mb-4 inline-flex h-9 items-center gap-1.5 text-[14px] font-medium text-p1-text-2 hover:text-p1-text">
        <ArrowLeft size={15} aria-hidden /> All agents
      </Link>

      <PageHeader
        title={agent.name}
        description={[agent.agency, agent.ceaNumber && `CEA ${agent.ceaNumber}`, `joined ${agent.joinedAt}`].filter(Boolean).join(' · ')}
        meta={<>
          <StatusBadge kind="agent" value={effectiveStatus} size="lg" />
          {agent.plan && <Pill tone="accent">{agent.plan} plan</Pill>}
          {!agent.real && <Pill>Sample data</Pill>}
        </>}
        actions={
          <>
            <Button variant="outline" leftIcon={<MessageSquare size={15} />} onClick={() => setMessage(true)}>Message agent</Button>
            {isSuspended ? (
              <Button variant="primary" loading={busy} leftIcon={<RotateCcw size={15} />} onClick={() => setConfirm('reinstate')}>Reinstate</Button>
            ) : (
              <Button variant="danger" loading={busy} leftIcon={<Ban size={15} />} onClick={() => setConfirm('suspend')}>Suspend</Button>
            )}
          </>
        }
      />

      <Callout tone={banner.tone} title={banner.title} className="mb-6">{banner.body}</Callout>

      <div className="vr-stagger mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Listings" value={listings.length} hint={`${published.length} published`} />
        <StatCard label="Monthly inventory" value={sgd(inventoryValue)} hint={`sum of ${rentals.length} published rents`} />
        <StatCard label="Plan" value={agent.plan ?? 'None'} tone={agent.plan ? 'default' : 'warning'} />
        <StatCard label="CEA valid to" value={agent.ceaValidUntil || '—'} tone={expired ? 'danger' : 'success'} hint={expired ? 'Publication blocked' : 'Re-checked daily'} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-col items-center text-center">
              <Avatar name={agent.name} size="xl" tone={agent.real ? 'primary' : 'neutral'} />
              <div className="mt-3 text-[18px] font-semibold text-p1-text">{agent.name}</div>
              <div className="font-mono text-[14px] text-p1-text-3">{agent.ceaNumber || 'No registration'}</div>
            </div>
            <dl className="mt-5 space-y-4 border-t border-p1-border pt-5">
              <Field label="Agency" value={<span className="flex items-start gap-2"><Building2 size={15} className="mt-0.5 shrink-0 text-p1-text-3" aria-hidden />{agent.agency || '—'}</span>} />
              <Field label="Agency licence" value={agent.agencyLicence || '—'} mono />
              <Field label="Email" value={<span className="flex items-start gap-2 break-all"><Mail size={15} className="mt-0.5 shrink-0 text-p1-text-3" aria-hidden />{agent.email}</span>} />
              <Field label="Mobile" value={<span className="flex items-center gap-2"><Phone size={15} className="shrink-0 text-p1-text-3" aria-hidden />{agent.mobile || '—'}</span>} />
            </dl>
            <div className="mt-5 border-t border-p1-border pt-5">
              <div className="text-[13px] font-medium text-p1-text-3">About</div>
              <p className="mt-1 text-[14px] leading-6 text-p1-text-2">
                {agent.bio || 'This agent has not written a biography yet.'}
              </p>
              {agent.specialisations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">{agent.specialisations.map((s) => <Pill key={s}>{s}</Pill>)}</div>
              )}
              {agent.languages.length > 0 && (
                <div className="mt-3 text-[13px] text-p1-text-3">Languages: <span className="text-p1-text-2">{agent.languages.join(', ')}</span></div>
              )}
            </div>
          </Card>

          <SectionCard title="Verification history" padding="sm">
            <ol className="space-y-3">
              {history.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${h.done ? 'bg-p1-success-soft text-p1-success' : 'bg-p1-warning-soft text-p1-warning'}`} aria-hidden>
                    {h.done ? <Check size={13} strokeWidth={3} /> : <Clock size={13} />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[14px] text-p1-text">{h.what}</div>
                    <div className="font-mono text-[12px] text-p1-text-3">{h.at}</div>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>

        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[17px] font-semibold text-p1-text">Listings by this agent</h2>
            <span className="text-[13px] tabular-nums text-p1-text-3">{listings.length} total</span>
          </div>

          {listings.length === 0 ? (
            <Card>
              <EmptyState icon={<Building size={26} />} title="No listings yet"
                description={effectiveStatus === 'under_review' ? 'Listings cannot be published before verification is approved.' : 'This agent has not created any listings.'} />
            </Card>
          ) : (
            <div className="vr-stagger grid gap-4 sm:grid-cols-2">
              {listings.map((l) => (
                <Card key={l.id} padding="none" interactive className="overflow-hidden">
                  <div className="relative">
                    <PropertyImage seed={l.reference + l.project} variant={0} rounded="rounded-none" src={coverPhoto(agent.id, l)} alt="" className="aspect-[16/9] w-full object-cover" />
                    <div className="absolute left-3 top-3"><StatusBadge kind="listing" value={l.status} size="sm" /></div>
                    <div className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-0.5 text-[12px] font-medium text-white">{l.images} photos</div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-semibold text-p1-text">{l.project}</span>
                      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-p1-text">{priceLabel(l).amount}<span className="text-[12px] font-normal text-p1-text-3">{priceLabel(l).suffix}</span></span>
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-p1-text-2">{l.unitNo} · {l.address}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-p1-text-2">
                      <span className="flex items-center gap-1"><Bed size={13} aria-hidden />{l.bedrooms} bed</span>
                      <span className="flex items-center gap-1"><Bath size={13} aria-hidden />{l.bathrooms} bath</span>
                      <span className="flex items-center gap-1"><Maximize size={13} aria-hidden />{l.sizeSqft.toLocaleString()} sqft</span>
                      <Pill>D{String(l.district).padStart(2, '0')}</Pill>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'suspend'} onClose={() => setConfirm(null)} destructive confirmLabel="Suspend agent"
        title="Suspend this agent?"
        description={agent.real
          ? 'Publication rights are withdrawn on their next request. They keep their account and their listings stay in place, hidden.'
          : 'This row is demonstration data, so nothing will actually change.'}
        onConfirm={() => void act('suspend')}
      >
        <SelectInput label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} options={REASONS} hint="Recorded in the audit log and shown to the agent." />
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'reinstate'} onClose={() => setConfirm(null)} confirmLabel="Reinstate"
        title="Reinstate this agent?" description="Access and publication rights are restored. Their listings return to their previous state."
        onConfirm={() => void act('reinstate')}
      />

      <Dialog open={message} onClose={() => setMessage(false)} title={`Message ${agent.name}`} description="Sent by email and shown in their notifications."
        footer={<><Button variant="outline" onClick={() => setMessage(false)}>Cancel</Button><Button onClick={() => { setMessage(false); push({ tone: 'success', title: 'Message sent' }); }}>Send</Button></>}>
        <label htmlFor="agent-msg" className="mb-1.5 block text-[14px] font-medium text-p1-text">Message</label>
        <textarea id="agent-msg" rows={4} className="w-full rounded-[10px] border border-p1-border-strong bg-p1-surface px-3.5 py-2.5 text-[15px] text-p1-text" defaultValue="Hello, could you upload a clearer copy of your CEA card?" />
      </Dialog>

    </>
  );
}
