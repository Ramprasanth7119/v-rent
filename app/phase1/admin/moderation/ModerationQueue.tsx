"use client";

/**
 * The moderation desk.
 *
 * Every card is a listing that exists in some agent's workspace, and a decision
 * here writes to that workspace. Rejecting requires a reason for a plain
 * reason: the agent's next screen is the wizard, and "rejected" with nothing
 * else tells them nothing about what to change.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PageHeader, StatCard, Card, Button, EmptyState, Callout, SelectInput, TextArea, SearchInput, FilterBar, cx } from '../../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../../components/phase1/status';
import { ConfirmDialog } from '../../../../components/phase1/overlays';
import { PropertyImage } from '../../../../components/phase1/PropertyImage';
import { coverPhoto } from '../../../../lib/phase1/photos';
import { useToast } from '../../../../components/phase1/Toast';
import type { ModerationItem } from '../../../../lib/phase1/admin-moderation';
import { REJECTION_REASONS, sgd } from '../../../../lib/phase1/data';
import { DEAL_LABEL, dealOf, priceLabel } from '../../../../lib/phase1/pricing';
import { Gavel, Check, X, Bed, Bath, Maximize, Camera, ShieldCheck, Inbox, ExternalLink, Copy } from 'lucide-react';

export default function ModerationQueue({ items }: { items: ModerationItem[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [rejecting, setRejecting] = useState<ModerationItem | null>(null);
  const [reason, setReason] = useState(REJECTION_REASONS[0]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState('');

  // The same search the directory offers: an officer looking for one listing
  // knows the reference, the project, or the agent — rarely all three.
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? items.filter((i) => [i.listing.reference, i.listing.project, i.listing.address, i.listing.postalCode, i.ownerName, i.ownerCea]
        .some((v) => v.toLowerCase().includes(needle)))
    : items;

  const resubmitted = items.filter((i) => i.kind === 'resubmitted').length;
  const thin = items.filter((i) => i.listing.images < 5).length;
  const clashing = items.filter((i) => i.duplicates.length > 0).length;

  const decide = async (item: ModerationItem, action: 'approve' | 'reject', why?: string) => {
    setBusy(item.listing.id);
    try {
      const res = await fetch('/api/phase1/admin/moderation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ownerId: item.ownerId, listingId: item.listing.id, action, reason: why }),
      });
      if (!res.ok) throw new Error(String(res.status));
      push(action === 'approve'
        ? { tone: 'success', title: 'Listing approved', body: `${item.listing.project} ${item.listing.unitNo} stays live and is marked reviewed.` }
        : { tone: 'warn', title: 'Listing rejected', body: `${item.ownerName} sees the reason and can correct and resubmit it.` });
      router.refresh();
    } catch {
      push({ tone: 'error', title: 'That did not go through', body: 'Nothing was changed. Try again in a moment.' });
    } finally {
      setBusy(null);
    }
  };

  const confirmReject = () => {
    const item = rejecting;
    if (!item) return;
    setRejecting(null);
    void decide(item, 'reject', note.trim() ? `${reason}. ${note.trim()}` : `${reason}.`);
    setNote('');
  };

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Moderation queue"
        description="V-RENT moderates after publication. A listing goes live when the publish gate passes and is reviewed here afterwards."
      />

      <div className="vr-stagger mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Waiting on a decision" value={items.length} tone={items.length ? 'warning' : 'default'} icon={<Gavel size={16} />} />
        <StatCard label="Corrected and resubmitted" value={resubmitted} hint="rejected once already" icon={<Inbox size={16} />} />
        <StatCard label="Fewer than five photos" value={thin} tone={thin ? 'warning' : 'default'} hint="most common reason to reject" icon={<Camera size={16} />} />
        <StatCard label="Same unit advertised twice" value={clashing} tone={clashing ? 'warning' : 'default'} hint="an open mandate, or a duplicate" icon={<Copy size={16} />} />
      </div>

      {items.length > 0 && (
        <FilterBar className="mb-5">
          <SearchInput
            value={q}
            onChange={setQ}
            label="Search the queue"
            placeholder="Search by reference, project, address or agent"
          />
        </FilterBar>
      )}

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Gavel size={26} />}
            title={needle ? 'Nothing matches that' : 'Nothing to review'}
            description="Listings arrive here the moment an agent publishes one, and again whenever a rejected listing is corrected and resubmitted."
            action={<Link href="/phase1/admin/agents" className="text-[14px] font-medium text-p1-primary hover:underline underline-offset-4 dark:text-p1-info">Open the agent directory</Link>}
          />
        </Card>
      ) : (
        <ul className="vr-stagger space-y-4">
          {shown.map((item) => {
            const l = item.listing;
            const thinPhotos = l.images < 5;
            return (
              <li key={`${item.ownerId}-${l.id}`}>
                <Card padding="none" className="overflow-hidden">
                  <div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
                    <PropertyImage seed={l.reference + l.project} variant={0} rounded="rounded-none" src={coverPhoto(item.ownerId, l)} alt="" className="h-full min-h-[150px] w-full object-cover" />

                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-[16px] font-semibold text-p1-text">{l.project} {l.unitNo}</h2>
                            <StatusBadge kind="listing" value={l.status} size="sm" />
                            {item.kind === 'resubmitted' && <Pill tone="info">Resubmitted</Pill>}
                            {dealOf(l) === 'sale' && <Pill>{DEAL_LABEL.sale}</Pill>}
                          </div>
                          <p className="mt-0.5 truncate text-[13.5px] text-p1-text-2">{l.address}, Singapore {l.postalCode}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-[17px] font-semibold tabular-nums text-p1-text">{priceLabel(l).amount}<span className="text-[12px] font-normal text-p1-text-3">{priceLabel(l).suffix}</span></div>
                          <div className="font-mono text-[12px] text-p1-text-3">{l.reference}</div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-p1-text-2">
                        <span className="flex items-center gap-1.5"><Bed size={14} aria-hidden />{l.bedrooms} bed</span>
                        <span className="flex items-center gap-1.5"><Bath size={14} aria-hidden />{l.bathrooms} bath</span>
                        <span className="flex items-center gap-1.5"><Maximize size={14} aria-hidden />{l.sizeSqft.toLocaleString()} sqft</span>
                        <span className={cx('flex items-center gap-1.5', thinPhotos && 'font-medium text-p1-warning')}>
                          <Camera size={14} aria-hidden />{l.images} photo{l.images === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-p1-border pt-3 text-[13px] text-p1-text-2">
                        <ShieldCheck size={14} className="text-p1-success" aria-hidden />
                        <Link href={`/phase1/admin/agents/${item.ownerId}`} className="font-medium text-p1-text hover:underline underline-offset-4">{item.ownerName}</Link>
                        <span className="text-p1-text-3">·</span>
                        <span className="font-mono">{item.ownerCea}</span>
                        {item.ownerAgency && <><span className="text-p1-text-3">·</span><span className="truncate">{item.ownerAgency}</span></>}
                      </div>

                      {l.rejectionReason && (
                        <Callout tone="warning" title="Previously rejected" compact className="mt-3">{l.rejectionReason}</Callout>
                      )}

                      {item.duplicates.length > 0 && (
                        <div className="mt-3 rounded-lg border border-p1-warning-border bg-p1-warning-soft/60 px-4 py-3">
                          <div className="flex items-center gap-2 text-[13.5px] font-semibold text-p1-text">
                            <Copy size={14} className="text-p1-warning" aria-hidden />
                            {item.duplicates.length === 1
                              ? 'This unit is advertised somewhere else too'
                              : `This unit is advertised ${item.duplicates.length} other times`}
                          </div>
                          <ul className="mt-2 space-y-1.5 text-[13.5px] text-p1-text-2">
                            {item.duplicates.map((d) => (
                              <li key={d.listingId} className="flex flex-wrap items-baseline gap-x-2">
                                <Link href={`/phase1/admin/agents/${d.ownerId}`} className="font-medium text-p1-text hover:underline underline-offset-4">{d.ownerName}</Link>
                                <span className="font-mono text-[12.5px] text-p1-text-3">{d.reference}</span>
                                <span className="tabular-nums">{sgd(d.monthlyRent)}</span>
                                {d.monthlyRent !== l.monthlyRent && (
                                  <span className="text-p1-warning">
                                    {d.monthlyRent > l.monthlyRent ? '+' : '−'}{sgd(Math.abs(d.monthlyRent - l.monthlyRent))} against this one
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 text-[12.5px] leading-5 text-p1-text-3">
                            An open mandate to several agencies is normal and not misconduct. What a tenant should not
                            meet is the same flat at three different rents — if the asking prices disagree, that is the
                            thing to resolve.
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button
                          variant="accent"
                          leftIcon={<Check size={15} />}
                          loading={busy === l.id}
                          onClick={() => void decide(item, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button variant="danger-outline" leftIcon={<X size={15} />} disabled={busy === l.id} onClick={() => setRejecting(item)}>
                          Reject
                        </Button>
                        <Link
                          href={`/phase1/share/${item.ownerId}/${l.id}`}
                          target="_blank"
                          className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-[14px] font-medium text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text"
                        >
                          See it as a tenant <ExternalLink size={14} aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        destructive
        confirmLabel="Reject listing"
        title="Reject this listing?"
        description="It comes down immediately and the agent is told why. They can correct it and send it back."
        onConfirm={confirmReject}
      >
        <SelectInput
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          options={REJECTION_REASONS.map((r) => ({ value: r, label: r }))}
        />
        <TextArea
          label="Anything else the agent should know"
          rows={3}
          className="mt-4"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          hint="Optional. Added to the reason shown on their listing."
        />
      </ConfirmDialog>

    </>
  );
}
