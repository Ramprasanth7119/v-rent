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
 * The limits are stated before anything is chosen, checked here, and checked
 * again on the server. An agent who picks too many, or a screenshot instead of
 * a photograph, gets told which file and why rather than a silent failure.
 */

import React, { useRef, useState } from 'react';
import { Upload, Trash2, ChevronLeft, ChevronRight, ImageOff, AlertTriangle, Star } from 'lucide-react';
import { Pill } from '../status';
import { IconButton, cx } from '../kit';

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
  dark: 'looks underexposed — shoot with the lights on, or in daylight',
  blurry: 'looks soft or out of focus',
  duplicate: 'is the same photograph as one already on this listing',
};

export const photoUrl = (ownerId: string, listingId: string, id: string) =>
  `/api/phase1/photos/${ownerId}/${listingId}/${id}`;

/** Ids of the shots already on the server, in order. */
export const savedIds = (shots: Shot[]) => shots.flatMap((s) => (s.kind === 'saved' ? [s.id] : []));

/** Files still waiting to be uploaded, in order. */
export const pendingFiles = (shots: Shot[]) => shots.flatMap((s) => (s.kind === 'pending' ? [s.file] : []));

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

  const room = MAX_PHOTOS - shots.length;
  const full = room <= 0;

  const accept = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const picked = Array.from(fileList);
    const complaints: string[] = [];
    const good: File[] = [];

    for (const file of picked) {
      const wrong = describe(file);
      if (wrong) {
        complaints.push(`${file.name} ${wrong}.`);
        continue;
      }
      if (good.length >= room) {
        complaints.push(`${file.name} was not added — a listing takes ${MAX_PHOTOS} photographs.`);
        continue;
      }
      good.push(file);
    }

    setProblems(complaints);
    if (good.length === 0) return;

    const added: Shot[] = good.map((file) => ({ kind: 'pending', file, url: URL.createObjectURL(file) }));
    onChange([...shots, ...added], good);
  };

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= shots.length) return;
    const next = [...shots];
    [next[i], next[j]] = [next[j], next[i]];
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
      {/* ------------------------------------------------------ drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!full) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!full) accept(e.dataTransfer.files); }}
        className={cx(
          'rounded-xl border-2 border-dashed transition-colors',
          full ? 'border-p1-border bg-p1-subtle/30' : dragging ? 'border-p1-accent bg-p1-accent-soft/50' : 'border-p1-border-strong bg-p1-subtle/40',
        )}
      >
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={full || busy}
          className="flex w-full flex-col items-center justify-center px-4 py-9 text-center disabled:cursor-not-allowed cursor-pointer"
        >
          <span className={cx('flex h-12 w-12 items-center justify-center rounded-full', full ? 'bg-p1-subtle text-p1-text-3' : 'bg-p1-primary-soft text-p1-primary dark:text-p1-text')} aria-hidden>
            {full ? <ImageOff size={22} /> : <Upload size={22} />}
          </span>
          <span className="mt-3 text-[15px] font-semibold text-p1-text">
            {full ? `All ${MAX_PHOTOS} photographs added` : busy ? 'Uploading…' : 'Drag photographs here, or choose files'}
          </span>
          <span className="mt-1 text-[13px] text-p1-text-3">
            {full
              ? 'Remove one to add another.'
              : `JPEG, PNG, WebP or HEIC · up to ${MAX_MB} MB each · ${room} of ${MAX_PHOTOS} remaining`}
          </span>
        </button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={(e) => { accept(e.target.files); e.target.value = ''; }}
        />
      </div>

      {problems.length > 0 && (
        <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-lg border border-p1-warning-border bg-p1-warning-soft px-3.5 py-2.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-p1-warning" aria-hidden />
          <ul className="min-w-0 space-y-0.5 text-[13.5px] leading-5 text-p1-text">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}

      {/* --------------------------------------------------------- the set */}
      {notes.length > 0 && (
        <div className="mt-3 rounded-lg border border-p1-warning-border bg-p1-warning-soft/60 px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-[13.5px] font-semibold text-p1-text">
            <AlertTriangle size={15} className="text-p1-warning" aria-hidden />
            Worth a second look
          </div>
          <ul className="mt-1.5 space-y-0.5 text-[13.5px] leading-5 text-p1-text-2">
            {notes.map((n) => <li key={n.id}>{n.name} {NOTE_TEXT[n.issue]}.</li>)}
          </ul>
          <p className="mt-1.5 text-[12.5px] leading-5 text-p1-text-3">
            Nothing is blocked — photograph quality is the most common reason a listing comes back from moderation,
            so it is worth knowing now rather than tomorrow.
          </p>
        </div>
      )}

      {shots.length > 0 && (
        <>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Photographs on this listing">
            {shots.map((s, i) => (
              <li key={s.kind === 'saved' ? s.id : s.url} className="overflow-hidden rounded-xl border border-p1-border bg-p1-surface">
                <div className="relative aspect-[4/3] bg-p1-subtle">
                  {/* A stored photograph is served by our own route; a pending one
                      is a blob in this tab. Neither benefits from the image
                      optimiser, and both must render before any network is up. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src(s)} alt={`Photograph ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && (
                    <Pill tone="accent" className="absolute left-2 top-2">
                      <Star size={11} className="mr-1" aria-hidden /> Cover
                    </Pill>
                  )}
                  {s.kind === 'pending' && <Pill className="absolute right-2 top-2">Not saved yet</Pill>}
                </div>
                <div className="flex items-center justify-between gap-1 px-1.5 py-1">
                  <div className="flex">
                    <IconButton size="sm" label={`Move photograph ${i + 1} earlier`} onClick={() => move(i, -1)} disabled={i === 0 || busy}><ChevronLeft size={16} /></IconButton>
                    <IconButton size="sm" label={`Move photograph ${i + 1} later`} onClick={() => move(i, 1)} disabled={i === shots.length - 1 || busy}><ChevronRight size={16} /></IconButton>
                  </div>
                  <span className="text-[12px] tabular-nums text-p1-text-3">{i + 1}</span>
                  <IconButton size="sm" label={`Remove photograph ${i + 1}`} disabled={busy} onClick={() => remove(i)} className="text-p1-danger hover:text-p1-danger"><Trash2 size={15} /></IconButton>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] leading-5 text-p1-text-3">
            The first photograph is the cover — it is the one a tenant sees in search results. Drag order with the
            arrows.
          </p>
        </>
      )}
    </div>
  );
}
