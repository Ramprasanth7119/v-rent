"use client";

/**
 * Photograph upload for a listing.
 *
 * Two situations, one component. Editing an existing listing, a file goes to
 * the server the moment it is chosen. Creating a new one, there is no listing
 * to attach it to yet, so the file is held and previewed locally and uploaded
 * as soon as the listing is saved — which is why a shot is either `saved` (an
 * id on the server) or `pending` (a File in this tab).
 *
 * The set is arranged directly: drag a photograph to move it, or use its menu
 * to make it the cover or remove it. Keyboard users get the same moves from
 * buttons that appear on focus. The limits are stated before anything is
 * chosen, checked here, and checked again on the server.
 */

import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2, ChevronLeft, ChevronRight, ImageOff, AlertTriangle, Star, GripVertical, Loader2 } from 'lucide-react';
import { IconButton, Tooltip, cx } from '../kit';

export const MAX_PHOTOS = 6;
export const MAX_MB = 5;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

export type Shot =
  | { kind: 'saved'; id: string }
  | { kind: 'pending'; file: File; url: string };

/** What the server noticed about a photograph, once it has looked at it. */
export interface PhotoNote { id: string; name: string; issue: 'dark' | 'blurry' | 'duplicate' }

const NOTE_TEXT: Record<PhotoNote['issue'], string> = {
  dark: 'looks underexposed',
  blurry: 'looks out of focus',
  duplicate: 'is already on this listing',
};

export const photoUrl = (ownerId: string, listingId: string, id: string) =>
  `/api/phase1/photos/${ownerId}/${listingId}/${id}`;

/** Ids of the shots already on the server, in order. */
export const savedIds = (shots: Shot[]) => shots.flatMap((s) => (s.kind === 'saved' ? [s.id] : []));

/** Files still waiting to be uploaded, in order. */
export const pendingFiles = (shots: Shot[]) => shots.flatMap((s) => (s.kind === 'pending' ? [s.file] : []));

const shotKey = (s: Shot) => (s.kind === 'saved' ? s.id : s.url);

function describe(file: File): string | null {
  if (!ACCEPT.split(',').includes(file.type)) return 'is not a JPEG, PNG, WebP or HEIC photograph';
  if (file.size > MAX_BYTES) return `is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_MB} MB`;
  return null;
}

export function PhotoUploader({
  shots,
  onChange,
  ownerId,
  listingId,
  busy = false,
  className = '',
  notes = [],
}: {
  shots: Shot[];
  onChange: (next: Shot[], added: File[]) => void;
  ownerId: string;
  /** Absent while the listing is still being created. */
  listingId?: string;
  busy?: boolean;
  className?: string;
  /** Quality findings from the last upload. */
  notes?: PhotoNote[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [moving, setMoving] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const room = MAX_PHOTOS - shots.length;
  const full = room <= 0;

  const accept = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const complaints: string[] = [];
    const good: File[] = [];
    for (const file of Array.from(fileList)) {
      const wrong = describe(file);
      if (wrong) { complaints.push(`${file.name} ${wrong}.`); continue; }
      if (good.length >= room) { complaints.push(`${file.name} was not added — a listing takes ${MAX_PHOTOS} photographs.`); continue; }
      good.push(file);
    }
    setProblems(complaints);
    if (good.length === 0) return;
    const added: Shot[] = good.map((file) => ({ kind: 'pending', file, url: URL.createObjectURL(file) }));
    onChange([...shots, ...added], good);
  };

  const moveTo = (from: number, to: number) => {
    if (from === to || to < 0 || to >= shots.length) return;
    const next = [...shots];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next, []);
  };

  const remove = (i: number) => {
    const gone = shots[i];
    if (gone.kind === 'pending') URL.revokeObjectURL(gone.url);
    onChange(shots.filter((_, j) => j !== i), []);
  };

  const src = (s: Shot) => (s.kind === 'pending' ? s.url : listingId ? photoUrl(ownerId, listingId, s.id) : '');

  return (
    <div className={className}>
      {shots.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Photographs on this listing">
          {shots.map((s, i) => (
            <li
              key={shotKey(s)}
              draggable={!busy}
              onDragStart={(e) => { setMoving(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
              onDragOver={(e) => { if (moving !== null) { e.preventDefault(); setOver(i); } }}
              onDragLeave={() => setOver((o) => (o === i ? null : o))}
              onDrop={(e) => { e.preventDefault(); if (moving !== null) moveTo(moving, i); setMoving(null); setOver(null); }}
              onDragEnd={() => { setMoving(null); setOver(null); }}
              className={cx(
                'p1-in group relative overflow-hidden rounded-xl border bg-p1-subtle transition-[transform,box-shadow,opacity,border-color] duration-200',
                i === 0 ? 'col-span-2 row-span-2 border-p1-border sm:col-span-2' : 'border-p1-border',
                moving === i && 'scale-[0.97] opacity-50',
                over === i && moving !== i && 'border-p1-primary shadow-[0_0_0_3px_var(--p1-ring)]',
                !busy && 'cursor-grab active:cursor-grabbing',
              )}
            >
              <div className={cx('relative w-full', i === 0 ? 'aspect-[4/3] h-full' : 'aspect-[4/3]')}>
                {/* eslint-disable-next-line @next/next/no-img-element -- a blob in this tab or our own route */}
                <img src={src(s)} alt={`Photograph ${i + 1}${i === 0 ? ', cover' : ''}`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
                {s.kind === 'pending' && busy && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/35" aria-hidden><Loader2 size={20} className="animate-spin text-white" /></span>
                )}
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2">
                {i === 0
                  ? <span className="inline-flex items-center gap-1 rounded-md bg-p1-surface/95 px-1.5 py-0.5 text-[11.5px] font-semibold text-p1-text shadow-p1-sm"><Star size={11} className="fill-p1-accent text-p1-accent" aria-hidden /> Cover</span>
                  : <span className="rounded-md bg-black/50 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">{i + 1}</span>}
                {s.kind === 'pending' && !busy && <span className="rounded-md bg-p1-surface/95 px-1.5 py-0.5 text-[11px] font-medium text-p1-text-2">Uploads on save</span>}
              </div>

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100">
                <span className="hidden items-center pl-1 text-white/80 sm:flex" aria-hidden><GripVertical size={15} /></span>
                <div className="ml-auto flex items-center gap-0.5">
                  {i > 0 && (
                    <Tooltip content="Make this the cover">
                      <IconButton size="sm" label={`Set photograph ${i + 1} as cover`} disabled={busy} onClick={() => moveTo(i, 0)} className="text-white hover:bg-white/20 hover:text-white"><Star size={15} /></IconButton>
                    </Tooltip>
                  )}
                  <IconButton size="sm" label={`Move photograph ${i + 1} earlier`} onClick={() => moveTo(i, i - 1)} disabled={i === 0 || busy} className="text-white hover:bg-white/20 hover:text-white sm:hidden sm:group-focus-within:inline-flex"><ChevronLeft size={16} /></IconButton>
                  <IconButton size="sm" label={`Move photograph ${i + 1} later`} onClick={() => moveTo(i, i + 1)} disabled={i === shots.length - 1 || busy} className="text-white hover:bg-white/20 hover:text-white sm:hidden sm:group-focus-within:inline-flex"><ChevronRight size={16} /></IconButton>
                  <IconButton size="sm" label={`Remove photograph ${i + 1}`} disabled={busy} onClick={() => remove(i)} className="text-white hover:bg-p1-danger hover:text-white"><Trash2 size={15} /></IconButton>
                </div>
              </div>
            </li>
          ))}

          {!full && (
            <li>
              <button type="button" onClick={() => input.current?.click()} disabled={busy}
                className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-p1-border-strong bg-p1-surface text-p1-text-3 transition-colors hover:border-p1-primary hover:text-p1-primary disabled:cursor-not-allowed">
                <ImagePlus size={20} aria-hidden />
                <span className="text-[12.5px] font-medium">Add more</span>
              </button>
            </li>
          )}
        </ul>
      )}

      {shots.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files); }}
          className={cx('rounded-2xl border-2 border-dashed transition-[border-color,background-color] duration-200', dragging ? 'border-p1-primary bg-p1-primary-soft' : 'border-p1-border-strong bg-p1-surface')}
        >
          <button type="button" onClick={() => input.current?.click()} disabled={busy}
            className="flex w-full cursor-pointer flex-col items-center justify-center px-4 py-12 text-center disabled:cursor-not-allowed">
            <span className={cx('flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200', dragging ? 'scale-110 bg-p1-primary text-p1-primary-on' : 'bg-p1-primary-soft text-p1-primary')} aria-hidden>
              <ImagePlus size={22} />
            </span>
            <span className="mt-3 text-[15px] font-semibold text-p1-text">{dragging ? 'Drop to add' : 'Drag photographs here'}</span>
            <span className="mt-1 text-[13px] text-p1-text-3">or <span className="font-medium text-p1-primary">browse files</span> · JPEG, PNG, WebP or HEIC · up to {MAX_MB} MB · {MAX_PHOTOS} photos</span>
          </button>
        </div>
      )}

      {shots.length > 0 && full && (
        <p className="mt-3 flex items-center gap-2 text-[13px] text-p1-text-3"><ImageOff size={14} aria-hidden /> All {MAX_PHOTOS} photographs added. Remove one to add another.</p>
      )}
      {shots.length > 1 && (
        <p className="mt-3 text-[12.5px] text-p1-text-3">Drag to reorder. The cover is what tenants see first.</p>
      )}

      <input ref={input} type="file" accept={ACCEPT} multiple className="sr-only" onChange={(e) => { accept(e.target.files); e.target.value = ''; }} />

      {busy && (
        <div className="mt-3" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-[13px] text-p1-text-2"><Loader2 size={14} className="animate-spin" aria-hidden /> Uploading photographs…</div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-p1-subtle"><div className="h-full w-1/3 animate-[p1-skeleton_1.2s_linear_infinite] rounded-full bg-p1-primary" /></div>
        </div>
      )}

      {problems.length > 0 && (
        <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-lg border border-p1-warning-border bg-p1-warning-soft px-3.5 py-2.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-p1-warning" aria-hidden />
          <ul className="min-w-0 space-y-0.5 text-[13px] leading-5 text-p1-text">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      {notes.length > 0 && (
        <div className="mt-3 rounded-lg border border-p1-warning-border bg-p1-warning-soft/60 px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-p1-text"><AlertTriangle size={14} className="text-p1-warning" aria-hidden /> Worth a second look</div>
          <ul className="mt-1 space-y-0.5 text-[13px] leading-5 text-p1-text-2">{notes.map((n) => <li key={n.id}>{n.name} {NOTE_TEXT[n.issue]}.</li>)}</ul>
        </div>
      )}
    </div>
  );
}
