"use client";

/**
 * The floor plan, uploaded beside the photographs.
 *
 * Separate from the gallery because it behaves differently in every way that
 * matters to the person using it: there is one, not six; it is often a PDF;
 * and it is the thing a client asks for by name after the viewing. So it gets
 * its own control that says what it will accept, rather than a seventh slot in
 * a photo grid that would reject the PDF they just dragged into it.
 *
 * It uploads immediately rather than waiting for the listing to be saved,
 * because the listing already exists by the time this is useful — and a plan
 * that only uploads on save is a plan an agent loses by closing the tab.
 */

import { useRef, useState } from 'react';
import { FileText, Map, Trash2, Upload } from 'lucide-react';
import { Button, Spinner } from '../kit';
import { useToast } from '../Toast';
import { MediaSection } from './MediaSection';

export interface FloorPlanNote {
  filename: string;
  contentType: string;
  bytes: number;
  at: string;
}

const MB = 1024 * 1024;
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

const sizeText = (bytes: number) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export function FloorPlanUpload({
  listingId,
  ownerId,
  plan,
  onChange,
}: {
  /** Null before the listing is first saved; the control says so. */
  listingId: string | null;
  ownerId: string;
  plan: FloorPlanNote | null;
  onChange: (plan: FloorPlanNote | null) => void;
}) {
  const { push } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!listingId) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set('listingId', listingId);
      body.set('file', file);
      const res = await fetch('/api/phase1/floorplan', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'The upload did not go through.');
      onChange({ filename: data.floorPlan.filename, contentType: file.type, bytes: data.floorPlan.bytes, at: new Date().toISOString() });
      push({ tone: 'success', title: 'Floor plan added' });
    } catch (err) {
      push({ tone: 'error', title: 'Floor plan not added', body: err instanceof Error ? err.message : 'Try again in a moment.' });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const remove = async () => {
    if (!listingId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/phase1/floorplan?listing=${encodeURIComponent(listingId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onChange(null);
      push({ tone: 'success', title: 'Floor plan removed' });
    } catch {
      push({ tone: 'error', title: 'It was not removed', body: 'Try again in a moment.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <MediaSection icon={<Map size={15} />} title="Floor plan" limits="PDF, JPEG, PNG or WebP, up to 4 MB" optional>
      {!listingId ? (
        <p className="text-[13px] text-p1-text-3">
          Save the listing first, then the floor plan can be attached to it.
        </p>
      ) : plan ? (
        <div className="flex items-center gap-3 rounded-lg border border-p1-border bg-p1-bg px-3 py-2.5">
          <FileText size={18} className="shrink-0 text-p1-text-3" aria-hidden />
          <span className="min-w-0 flex-1">
            <a
              href={`/api/phase1/floorplan?owner=${encodeURIComponent(ownerId)}&listing=${encodeURIComponent(listingId)}&v=${encodeURIComponent(plan.at)}`}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-[13.5px] font-medium text-p1-text hover:text-p1-primary"
            >
              {plan.filename}
            </a>
            <span className="block text-[12px] tabular-nums text-p1-text-3">{sizeText(plan.bytes)}</span>
          </span>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            aria-label="Remove the floor plan"
            className="p1-press flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-p1-text-3 hover:bg-p1-danger-soft hover:text-p1-danger disabled:opacity-50"
          >
            {busy ? <Spinner size={14} /> : <Trash2 size={15} />}
          </button>
        </div>
      ) : (
        <div>
          <Button
            variant="outline"
            size="sm"
            loading={busy}
            leftIcon={<Upload size={15} />}
            onClick={() => input.current?.click()}
          >
            Add a floor plan
          </Button>
          <p className="mt-2 text-[12.5px] leading-5 text-p1-text-3">
            Clients ask for this more than any other document. A PDF stays sharp when they zoom in on the dimensions.
          </p>
        </div>
      )}

      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }}
      />
    </MediaSection>
  );
}
