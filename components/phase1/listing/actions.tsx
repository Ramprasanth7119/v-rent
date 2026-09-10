"use client";

/**
 * One place for listing actions so the listings page, cards, and detail page behave identically.
 * `useListingActions` owns the confirmation state; render `<ListingActionDialogs />` once per page.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Copy, Pause, Play, Eye, Archive, Send, EyeOff, RotateCcw, Link2 } from 'lucide-react';
import { DemoListing } from '../../../lib/phase1/data';
import { useDemo, TODAY_ISO } from '../../../lib/phase1/DemoContext';
import { useSession } from '../../../lib/phase1/SessionContext';
import { useToast } from '../Toast';
import { ConfirmDialog } from '../overlays';
import { MenuItem } from '../kit';

type Pending = { kind: 'publish' | 'pause' | 'unpublish' | 'archive' | 'renew'; listing: DemoListing } | null;

export function useListingActions() {
  const router = useRouter();
  const { push } = useToast();
  const { state, setListingStatus, addListing, updateListing, canPublish, listingLimit, activeListings } = useDemo();
  const { user } = useSession();
  const [pending, setPending] = useState<Pending>(null);

  /**
   * The public link. It carries the owning account because a listing reference
   * is only unique inside one workspace; production issues a short token per
   * listing, which is also what makes a sent link revocable.
   */
  const shareUrl = (l: DemoListing) =>
    user ? `${window.location.origin}/phase1/share/${user.id}/${l.id}` : '';

  const copyShareLink = async (l: DemoListing) => {
    const url = shareUrl(l);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      push({ tone: 'success', title: 'Share link copied', body: 'Anyone with this link sees the listing and your CEA details — no account needed.' });
    } catch {
      // Clipboard access can be refused; the link is no use if it is not on screen.
      push({ tone: 'info', title: 'Copy this link', body: url });
    }
  };

  const publish = (l: DemoListing) => {
    if (!canPublish) {
      push({ tone: 'warn', title: 'Publication is blocked', body: 'One of the publish checks is failing. Open the dashboard to see which one and how to fix it.', action: { label: 'Open dashboard', onClick: () => router.push('/phase1/dashboard') } });
      return;
    }
    setListingStatus(l.id, 'published');
    const left = Math.max(0, listingLimit - activeListings - 1);
    push({ tone: 'success', title: 'Listing published', body: `${l.project} ${l.unitNo} is live and counted in your active listings. ${left} slot${left === 1 ? '' : 's'} remain on ${state.plan?.name ?? 'your plan'}.`, action: { label: 'View listing', onClick: () => router.push(`/phase1/listings/${l.id}`) } });
  };

  const pause = (l: DemoListing) => {
    setListingStatus(l.id, 'paused');
    push({ tone: 'info', title: 'Listing paused', body: `${l.project} is hidden from tenants. Your quota slot is kept, and you can resume any time.` });
  };

  const resume = (l: DemoListing) => {
    setListingStatus(l.id, 'published');
    push({ tone: 'success', title: 'Listing resumed', body: `${l.project} is visible to tenants again.` });
  };

  const unpublish = (l: DemoListing) => {
    setListingStatus(l.id, 'draft');
    push({ tone: 'info', title: 'Listing unpublished', body: `${l.project} is back in drafts and its quota slot has been released.` });
  };

  const archive = (l: DemoListing) => {
    updateListing(l.id, { archived: true, status: l.status === 'published' || l.status === 'paused' ? 'draft' : l.status });
    push({ tone: 'info', title: 'Listing archived', body: `${l.project} is out of your workspace. Its history is kept.`, action: { label: 'Undo', onClick: () => updateListing(l.id, { archived: false, status: l.status }) } });
  };

  const renew = (l: DemoListing) => {
    if (!canPublish) { publish(l); return; }
    updateListing(l.id, { status: 'published', publishedAt: TODAY_ISO, expiresAt: '2026-11-26' });
    push({ tone: 'success', title: 'Listing renewed', body: `${l.project} is live again for another 90 days.` });
  };

  const duplicate = (l: DemoListing) => {
    const id = `lst-${Math.random().toString(36).slice(2, 8)}`;
    addListing({
      ...l,
      id,
      reference: `VR-${24110 + state.listings.length}`,
      unitNo: '#—',
      status: 'draft',
      archived: false,
      publishedAt: undefined,
      expiresAt: undefined,
      rejectionReason: undefined,
      createdAt: TODAY_ISO,
      updatedAt: TODAY_ISO,
    });
    push({ tone: 'success', title: 'Draft created from this listing', body: 'Photos and description were copied. Add the unit number, then publish.', action: { label: 'Open draft', onClick: () => router.push(`/phase1/listings/${id}`) } });
  };

  const confirm = () => {
    if (!pending) return;
    const { kind, listing } = pending;
    setPending(null);
    if (kind === 'publish') publish(listing);
    if (kind === 'pause') pause(listing);
    if (kind === 'unpublish') unpublish(listing);
    if (kind === 'archive') archive(listing);
    if (kind === 'renew') renew(listing);
  };

  /** Menu for a listing, ordered by likelihood; dangerous items last, below a divider. */
  const menuFor = (l: DemoListing, opts: { includeView?: boolean } = {}): (MenuItem | 'divider')[] => {
    const items: (MenuItem | 'divider')[] = [];
    if (opts.includeView) items.push({ key: 'view', label: 'Open listing', icon: <Eye size={15} />, href: `/phase1/listings/${l.id}` });
    items.push({ key: 'edit', label: 'Edit', icon: <Pencil size={15} />, href: `/phase1/listings/new?edit=${l.id}` });
    items.push({ key: 'preview', label: 'Preview as tenant', icon: <Eye size={15} />, href: `/phase1/listings/${l.id}?tab=preview` });
    if (l.status === 'published' || l.status === 'paused') {
      items.push({ key: 'share', label: 'Copy share link', icon: <Link2 size={15} />, onSelect: () => void copyShareLink(l) });
    }
    items.push({ key: 'dup', label: 'Duplicate', icon: <Copy size={15} />, onSelect: () => duplicate(l), hint: 'Draft' });
    if (l.status === 'draft' || l.status === 'rejected') items.push({ key: 'publish', label: 'Publish', icon: <Send size={15} />, onSelect: () => setPending({ kind: 'publish', listing: l }) });
    if (l.status === 'published') items.push({ key: 'pause', label: 'Pause', icon: <Pause size={15} />, onSelect: () => setPending({ kind: 'pause', listing: l }) });
    if (l.status === 'paused') items.push({ key: 'resume', label: 'Resume', icon: <Play size={15} />, onSelect: () => resume(l) });
    if (l.status === 'expired') items.push({ key: 'renew', label: 'Renew for 90 days', icon: <RotateCcw size={15} />, onSelect: () => setPending({ kind: 'renew', listing: l }) });
    items.push('divider');
    if (l.status === 'published' || l.status === 'paused') items.push({ key: 'unpublish', label: 'Unpublish', icon: <EyeOff size={15} />, danger: true, onSelect: () => setPending({ kind: 'unpublish', listing: l }) });
    items.push({ key: 'archive', label: 'Archive', icon: <Archive size={15} />, danger: true, onSelect: () => setPending({ kind: 'archive', listing: l }) });
    return items;
  };

  return { pending, setPending, confirm, publish, pause, resume, unpublish, archive, renew, duplicate, menuFor, canPublish, copyShareLink, shareUrl };
}

export function ListingActionDialogs({ a }: { a: ReturnType<typeof useListingActions> }) {
  const p = a.pending;
  const l = p?.listing;
  return (
    <>
      <ConfirmDialog open={p?.kind === 'publish'} onClose={() => a.setPending(null)} onConfirm={a.confirm} confirmLabel="Publish listing"
        title="Publish this listing?" description={l ? `${l.project} ${l.unitNo} goes live immediately, uses one listing slot, and your CEA details are frozen onto the advertisement.` : undefined} />
      <ConfirmDialog open={p?.kind === 'renew'} onClose={() => a.setPending(null)} onConfirm={a.confirm} confirmLabel="Renew listing"
        title="Renew this listing?" description={l ? `${l.project} ${l.unitNo} goes live again for 90 days and uses one listing slot.` : undefined} />
      <ConfirmDialog open={p?.kind === 'pause'} onClose={() => a.setPending(null)} onConfirm={a.confirm} confirmLabel="Pause listing"
        title="Pause this listing?" description="Tenants will not see it until you resume. Enquiries already received are kept and your quota slot stays reserved." />
      <ConfirmDialog open={p?.kind === 'unpublish'} onClose={() => a.setPending(null)} onConfirm={a.confirm} confirmLabel="Unpublish" destructive
        title="Unpublish this listing?" description="It returns to drafts and releases its quota slot. Publishing again runs the full publish check and may take a different slot." />
      <ConfirmDialog open={p?.kind === 'archive'} onClose={() => a.setPending(null)} onConfirm={a.confirm} confirmLabel="Archive listing" destructive
        title="Archive this listing?" description="It leaves your workspace and is unpublished if live. Its history, enquiries and compliance snapshot are kept for your records." />
    </>
  );
}
