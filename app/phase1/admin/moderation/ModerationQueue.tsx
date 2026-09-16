"use client";

/**
 * The moderation desk.
 *
 * Every item is a listing that exists in some agent's workspace, and a decision
 * here writes to that workspace. The screen is built for deciding quickly: a
 * narrow queue, the listing as the tenant will see it, and a panel that says
 * what is worth checking before the officer approves or rejects. Rejecting
 * requires a reason, because the agent's next screen is the wizard and
 * "rejected" alone tells them nothing about what to change.
 *
 * Keyboard: j/k or ↑/↓ move, a approves, r opens the rejection.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card, Button, EmptyState, SelectInput, TextArea, SearchInput, Kbd, Tooltip, cx,
} from '../../../../components/phase1/kit';
import { StatusBadge } from '../../../../components/phase1/status';
import { ConfirmDialog } from '../../../../components/phase1/overlays';
import { PropertyImage } from '../../../../components/phase1/PropertyImage';
import { coverPhoto, listingPhotos } from '../../../../lib/phase1/photos';
import { useToast } from '../../../../components/phase1/Toast';
import { useDemoDataOn } from '../../../../lib/phase1/report-data/switch';
import { DEMO_LIVE_ACTION_BLOCKED } from '../../../../lib/phase1/report-data';
import type { ModerationItem } from '../../../../lib/phase1/admin-moderation';
import { DemoListing, REJECTION_REASONS, sgd } from '../../../../lib/phase1/data';
import { DEAL_LABEL, dealOf, priceLabel } from '../../../../lib/phase1/pricing';
import { districtCode, districtLabel } from '../../../../lib/phase1/districts';
import { sgDate } from '../../../../lib/phase1/format';
import {
  Gavel, Check, X, Camera, ShieldCheck, ExternalLink, Copy, AlertTriangle, CircleCheck, Info, RotateCcw, MapPin,
} from 'lucide-react';

type Level = 'ok' | 'warn' | 'info';
interface Issue { key: string; level: Level; title: string; detail?: string }

const keyOf = (i: ModerationItem) => `${i.ownerId}/${i.listing.id}`;

/** Monthly rent per square foot, rentals only. */
const rentPsf = (l: DemoListing) => (dealOf(l) === 'rent' && l.sizeSqft > 0 && l.monthlyRent > 0 ? l.monthlyRent / l.sizeSqft : null);

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function issuesFor(item: ModerationItem, psfMedian: number | null, psfCount: number): Issue[] {
  const l = item.listing;
  const out: Issue[] = [];
  const price = dealOf(l) === 'sale' ? l.salePriceSgd ?? 0 : l.monthlyRent;

  const missing = [
    !l.project && 'project', !l.address && 'address', !l.postalCode && 'postal code', !l.unitNo && 'unit number',
    !(l.sizeSqft > 0) && 'floor area', !(l.bedrooms > 0) && 'bedrooms', !(price > 0) && 'price', !l.availableFrom && 'availability',
  ].filter(Boolean) as string[];
  out.push(missing.length
    ? { key: 'fields', level: 'warn', title: 'Required fields missing', detail: missing.join(', ') }
    : { key: 'fields', level: 'ok', title: 'Required fields complete' });

  out.push(l.images < 5
    ? { key: 'photos', level: 'warn', title: `Only ${l.images} photo${l.images === 1 ? '' : 's'}`, detail: 'Fewer than five is the most common reason to reject.' }
    : { key: 'photos', level: 'ok', title: `${l.images} photos` });

  const len = (l.description ?? '').trim().length;
  out.push(len < 80
    ? { key: 'desc', level: 'warn', title: 'Description is short', detail: `${len} characters — under 80 rarely tells a tenant enough.` }
    : { key: 'desc', level: 'ok', title: 'Description has substance' });

  if (item.duplicates.length) {
    out.push({ key: 'dup', level: 'warn', title: `Unit advertised ${item.duplicates.length} other time${item.duplicates.length === 1 ? '' : 's'}`, detail: 'Check the asking prices agree.' });
  }

  const psf = rentPsf(l);
  if (psf !== null && psfMedian !== null) {
    const ratio = psf / psfMedian;
    if (ratio > 2 || ratio < 0.5) {
      out.push({
        key: 'price', level: 'warn', title: `Rent is ${ratio > 1 ? `${ratio.toFixed(1)}× above` : `${(1 / ratio).toFixed(1)}× below`} the queue`,
        detail: `Heuristic: S$${psf.toFixed(2)} psf against a median of S$${psfMedian.toFixed(2)} across ${psfCount} rentals in this queue.`,
      });
    }
  }

  if (item.kind === 'resubmitted') out.push({ key: 'resub', level: 'info', title: 'Resubmitted after a rejection' });
  return out;
}

const LEVEL_ICON: Record<Level, { icon: typeof Check; cls: string }> = {
  ok: { icon: CircleCheck, cls: 'text-p1-success' },
  warn: { icon: AlertTriangle, cls: 'text-p1-warning' },
  info: { icon: Info, cls: 'text-p1-info' },
};

export default function ModerationQueue({ items }: { items: ModerationItem[] }) {
  const router = useRouter();
  const { push } = useToast();
  const demoOn = useDemoDataOn();
  const [rejecting, setRejecting] = useState<ModerationItem | null>(null);
  const [reason, setReason] = useState(REJECTION_REASONS[0]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(items[0] ? keyOf(items[0]) : null);
  const [photo, setPhoto] = useState(0);
  const workspace = useRef<HTMLDivElement>(null);

  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => (needle
    ? items.filter((i) => [i.listing.reference, i.listing.project, i.listing.address, i.listing.postalCode, i.ownerName, i.ownerCea]
        .some((v) => v.toLowerCase().includes(needle)))
    : items), [items, needle]);

  const selected = shown.find((i) => keyOf(i) === selectedKey) ?? shown[0] ?? null;

  // The price check compares rentals in this queue with each other, and only
  // when there are enough of them for a median to mean something.
  const psfs = useMemo(() => items.map((i) => rentPsf(i.listing)).filter((x): x is number => x !== null), [items]);
  const psfMedian = psfs.length >= 4 ? median(psfs) : null;
  const issueMap = useMemo(() => new Map(items.map((i) => [keyOf(i), issuesFor(i, psfMedian, psfs.length)])), [items, psfMedian, psfs.length]);

  const select = useCallback((k: string, scroll = false) => {
    setSelectedKey(k);
    setPhoto(0);
    if (scroll) requestAnimationFrame(() => document.getElementById(`mod-${k.replace('/', '-')}`)?.scrollIntoView({ block: 'nearest' }));
  }, []);

  const decide = useCallback(async (item: ModerationItem, action: 'approve' | 'reject', why?: string) => {
    // The queue holds live listings; Demo Data never changes them.
    if (demoOn) {
      push(DEMO_LIVE_ACTION_BLOCKED);
      return;
    }
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
      const i = shown.findIndex((x) => keyOf(x) === keyOf(item));
      const next = shown[i + 1] ?? shown[i - 1];
      if (next) select(keyOf(next), true);
      router.refresh();
    } catch {
      push({ tone: 'error', title: 'That did not go through', body: 'Nothing was changed. Try again in a moment.' });
    } finally {
      setBusy(null);
    }
  }, [demoOn, push, router, select, shown]);

  const confirmReject = () => {
    const item = rejecting;
    if (!item) return;
    setRejecting(null);
    void decide(item, 'reject', note.trim() ? `${reason}. ${note.trim()}` : `${reason}.`);
    setNote('');
  };

  // Keyboard shortcuts, off while typing or while a dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || rejecting || document.querySelector('[role="dialog"]')) return;
      if (!selected || !shown.length) return;
      const i = shown.findIndex((x) => keyOf(x) === keyOf(selected));
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); const n = shown[Math.min(shown.length - 1, i + 1)]; select(keyOf(n), true); }
      if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); const n = shown[Math.max(0, i - 1)]; select(keyOf(n), true); }
      if (e.key === 'a' && !busy) { e.preventDefault(); void decide(selected, 'approve'); }
      if (e.key === 'r' && !busy) { e.preventDefault(); setRejecting(selected); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected, shown, busy, rejecting, decide, select]);

  const resubmitted = items.filter((i) => i.kind === 'resubmitted').length;

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-p1-text">Moderation</h1>
          <span className="rounded-full bg-p1-subtle px-2 py-0.5 text-[12.5px] font-semibold tabular-nums text-p1-text-2">{items.length} to review</span>
          {resubmitted > 0 && <span className="rounded-full bg-p1-info-soft px-2 py-0.5 text-[12.5px] font-medium tabular-nums text-p1-info">{resubmitted} resubmitted</span>}
        </div>
        <p className="hidden items-center gap-3 text-[12px] text-p1-text-3 md:flex" aria-label="Keyboard shortcuts">
          <span className="inline-flex items-center gap-1"><Kbd>J</Kbd><Kbd>K</Kbd> move</span>
          <span className="inline-flex items-center gap-1"><Kbd>A</Kbd> approve</span>
          <span className="inline-flex items-center gap-1"><Kbd>R</Kbd> reject</span>
        </p>
      </header>

      {items.length === 0 ? (
        <Card padding="none">
          <EmptyState compact icon={<Gavel size={18} />} title="Nothing to review" className="py-10"
            description="Listings arrive the moment an agent publishes, and again when a rejected listing is resubmitted." />
        </Card>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* ------------------------------------------------------ queue */}
          <Card padding="none" className="h-fit overflow-hidden lg:sticky lg:top-[80px]">
            <div className="border-b border-p1-border p-2.5">
              <SearchInput value={q} onChange={setQ} label="Search the queue" placeholder="Reference, project or agent" size="sm" />
            </div>
            {shown.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-p1-text-3">Nothing matches that.</p>
            ) : (
              <ul className="max-h-[260px] divide-y divide-p1-border overflow-y-auto lg:max-h-[calc(100dvh-190px)]" role="listbox" aria-label="Listings to review">
                {shown.map((item) => {
                  const l = item.listing;
                  const k = keyOf(item);
                  const on = selected ? keyOf(selected) === k : false;
                  const warns = (issueMap.get(k) ?? []).filter((x) => x.level === 'warn').length;
                  return (
                    <li key={k} id={`mod-${k.replace('/', '-')}`} role="option" aria-selected={on}>
                      <button type="button" onClick={() => { select(k); if (window.innerWidth < 1024) workspace.current?.scrollIntoView({ behavior: 'smooth' }); }}
                        className={cx('relative flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors', on ? 'bg-p1-primary-soft/60' : 'hover:bg-p1-subtle/60')}>
                        {on && <span className="absolute inset-y-0 left-0 w-0.5 bg-p1-primary" aria-hidden />}
                        <PropertyImage seed={l.reference + l.project} src={coverPhoto(item.ownerId, l)} alt="" rounded="rounded-md" className="h-10 w-12 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-p1-text">{l.project}</span>
                          <span className="block truncate text-[12px] text-p1-text-3">{item.ownerName}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {item.kind === 'resubmitted' && <Tooltip content="Resubmitted after rejection"><RotateCcw size={13} className="text-p1-info" aria-label="Resubmitted" /></Tooltip>}
                          {item.duplicates.length > 0 && <Tooltip content="Unit advertised elsewhere"><Copy size={13} className="text-p1-warning" aria-label="Duplicate" /></Tooltip>}
                          {warns > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-p1-warning-soft px-1 text-[11px] font-semibold tabular-nums text-p1-warning" title={`${warns} to check`}>{warns}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* -------------------------------------------------- workspace */}
          {selected && (() => {
            const item = selected;
            const l = item.listing;
            const k = keyOf(item);
            const photos = listingPhotos(item.ownerId, l);
            const issues = issueMap.get(k) ?? [];
            const warns = issues.filter((x) => x.level === 'warn').length;
            const p = priceLabel(l);
            const current = Math.min(photo, Math.max(0, photos.length - 1));
            return (
              <div ref={workspace} key={k} className="p1-in grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                <Card padding="none" as="section" aria-label={`${l.project} ${l.unitNo}`} className="min-w-0 overflow-hidden">
                  {/* gallery */}
                  <div className="border-b border-p1-border bg-p1-subtle/50 p-3">
                    <PropertyImage key={current} seed={l.reference + l.project} variant={current} src={photos[current]} alt={`Photograph ${current + 1}`} rounded="rounded-lg" className="p1-xfade aspect-[16/9] w-full" label={photos.length === 0} />
                    {photos.length > 1 && (
                      <div className="mt-2 flex gap-2 overflow-x-auto">
                        {photos.map((src, i) => (
                          <button key={src} type="button" onClick={() => setPhoto(i)} aria-label={`Photograph ${i + 1}`} aria-current={i === current || undefined}
                            className={cx('shrink-0 cursor-pointer overflow-hidden rounded-md transition-opacity', i === current ? 'ring-2 ring-p1-primary' : 'opacity-60 hover:opacity-100')}>
                            <PropertyImage seed={l.reference} variant={i} src={`${src}?size=thumb`} alt="" rounded="rounded-md" className="h-12 w-16" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* listing */}
                  <div className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-p1-text">{l.project} <span className="font-normal text-p1-text-3">{l.unitNo}</span></h2>
                          <StatusBadge kind="listing" value={l.status} size="sm" />
                          <span className="font-mono text-[12px] text-p1-text-3">{l.reference}</span>
                          {dealOf(l) === 'sale' && <span className="rounded-full border border-p1-border bg-p1-subtle px-2 py-0.5 text-[12px] font-medium text-p1-text-2">{DEAL_LABEL.sale}</span>}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-p1-text-2"><MapPin size={13} className="shrink-0 text-p1-text-3" aria-hidden />{l.address}{l.address.includes(l.postalCode) ? '' : `, ${l.postalCode}`} · {districtCode(l.district)} {districtLabel(l.district)}</p>
                      </div>
                      <div className="font-p1display text-[20px] font-bold tabular-nums tracking-[-0.02em] text-p1-primary">{p.amount}<span className="text-[12.5px] font-normal text-p1-text-3">{p.suffix}</span></div>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-p1-border p-3 text-[13px] sm:grid-cols-4">
                      {[
                        ['Type', l.propertyType],
                        ['Layout', `${l.bedrooms} bed · ${l.bathrooms} bath`],
                        ['Floor area', l.sizeSqft ? `${l.sizeSqft.toLocaleString('en-SG')} sqft` : '—'],
                        ['Available', l.availableFrom ? sgDate(l.availableFrom) : '—'],
                      ].map(([dt, dd]) => (
                        <div key={dt}><dt className="text-[11.5px] text-p1-text-3">{dt}</dt><dd className="mt-0.5 font-medium text-p1-text">{dd}</dd></div>
                      ))}
                    </dl>

                    <p className={cx('mt-4 whitespace-pre-line text-[14px] leading-6', l.description ? 'text-p1-text-2' : 'text-p1-text-3')}>
                      {l.description || 'No description.'}
                    </p>

                    {l.rejectionReason && (
                      <div className="mt-4 rounded-lg border border-p1-info-border bg-p1-info-soft/60 px-3.5 py-2.5 text-[13px]">
                        <div className="font-semibold text-p1-text">Previously rejected</div>
                        <div className="mt-0.5 text-p1-text-2">{l.rejectionReason}</div>
                      </div>
                    )}

                    {item.duplicates.length > 0 && (
                      <div className="mt-4 rounded-lg border border-p1-warning-border bg-p1-warning-soft/50 px-3.5 py-3">
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-p1-text">
                          <Copy size={14} className="text-p1-warning" aria-hidden />
                          {item.duplicates.length === 1 ? 'Also advertised by another listing' : `Also advertised ${item.duplicates.length} other times`}
                        </div>
                        <ul className="mt-2 space-y-1 text-[13px] text-p1-text-2">
                          {item.duplicates.map((d) => (
                            <li key={d.listingId} className="flex flex-wrap items-baseline gap-x-2">
                              <Link href={`/phase1/admin/agents/${d.ownerId}`} className="font-medium text-p1-text hover:underline underline-offset-4">{d.ownerName}</Link>
                              <span className="font-mono text-[12px] text-p1-text-3">{d.reference}</span>
                              <span className="tabular-nums">{sgd(d.monthlyRent)}</span>
                              {d.monthlyRent !== l.monthlyRent && (
                                <span className="text-p1-warning">{d.monthlyRent > l.monthlyRent ? '+' : '−'}{sgd(Math.abs(d.monthlyRent - l.monthlyRent))}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-[12px] leading-5 text-p1-text-3">
                          An open mandate to several agencies is normal. What a tenant should not meet is the same flat at different rents.
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-p1-border pt-3 text-[13px] text-p1-text-2">
                      <ShieldCheck size={14} className="text-p1-success" aria-hidden />
                      <Link href={`/phase1/admin/agents/${item.ownerId}`} className="font-medium text-p1-text hover:underline underline-offset-4">{item.ownerName}</Link>
                      <span className="font-mono text-[12.5px] text-p1-text-3">{item.ownerCea}</span>
                      {item.ownerAgency && <span className="truncate text-p1-text-3">· {item.ownerAgency}</span>}
                    </div>
                  </div>
                </Card>

                {/* moderation panel */}
                <Card padding="none" as="section" aria-label="Moderation decision" className="overflow-hidden lg:order-first xl:order-none xl:sticky xl:top-[80px]">
                  <div className="flex items-center justify-between border-b border-p1-border px-4 py-3">
                    <h3 className="text-[14px] font-semibold text-p1-text">Potential issues</h3>
                    <span className={cx('rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums', warns ? 'bg-p1-warning-soft text-p1-warning' : 'bg-p1-success-soft text-p1-success')}>
                      {warns ? `${warns} to check` : 'None found'}
                    </span>
                  </div>
                  <ul className="divide-y divide-p1-border">
                    {issues.map((iss) => {
                      const L = LEVEL_ICON[iss.level];
                      return (
                        <li key={iss.key} className="flex gap-2.5 px-4 py-2.5">
                          <L.icon size={15} className={cx('mt-0.5 shrink-0', L.cls)} aria-hidden />
                          <div className="min-w-0">
                            <div className={cx('text-[13px]', iss.level === 'ok' ? 'text-p1-text-2' : 'font-medium text-p1-text')}>
                              {iss.title}<span className="sr-only">{iss.level === 'warn' ? ' — worth checking' : iss.level === 'ok' ? ' — fine' : ''}</span>
                            </div>
                            {iss.detail && <div className="mt-0.5 text-[12px] leading-4 text-p1-text-3">{iss.detail}</div>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="space-y-2 border-t border-p1-border bg-p1-subtle/40 p-4">
                    <Button block leftIcon={<Check size={15} />} loading={busy === l.id} onClick={() => void decide(item, 'approve')}>Approve</Button>
                    <Button block variant="danger-outline" leftIcon={<X size={15} />} disabled={busy === l.id} onClick={() => setRejecting(item)}>Reject</Button>
                    <Link href={`/phase1/share/${item.ownerId}/${l.id}`} target="_blank" className="flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text">
                      See it as a tenant <ExternalLink size={13} aria-hidden />
                    </Link>
                  </div>
                  <p className="flex items-center gap-1.5 border-t border-p1-border px-4 py-2 text-[11.5px] text-p1-text-3">
                    <Camera size={12} aria-hidden /> {l.images} photo{l.images === 1 ? '' : 's'} · updated {sgDate(l.updatedAt ?? l.createdAt)}
                  </p>
                </Card>
              </div>
            );
          })()}
        </div>
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
        <SelectInput label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} options={REJECTION_REASONS.map((r) => ({ value: r, label: r }))} />
        <TextArea
          label="Anything else the agent should know"
          rows={3}
          containerClassName="mt-4"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          hint="Optional. Added to the reason shown on their listing."
        />
      </ConfirmDialog>
    </>
  );
}
