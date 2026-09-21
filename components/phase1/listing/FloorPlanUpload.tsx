"use client";

/**
 * The floor plans, uploaded beside the photographs.
 *
 * Separate from the gallery because they behave differently in every way that
 * matters to the person using them: they are often PDFs, and a plan is the
 * thing a client asks for by name after the viewing. So they get their own
 * control that says what it will accept, rather than more slots in a photo grid
 * that would reject the PDF just dragged into it.
 *
 * Two things this fixes that the single-slot version got wrong.
 *
 * There can be more than one. A maisonette has a plan per storey, a development
 * hands out a stack plan beside the unit plan, and a scanned brochure arrives a
 * page at a time — and the old control took the second upload and quietly
 * replaced the first with it.
 *
 * And it no longer waits for the photographs. A plan needs a listing to hang
 * on, and in the new-listing wizard there is no listing until something creates
 * one — which used to be the photograph upload, so this section sat greyed out
 * saying "save the listing first" until photographs had gone up. An agent
 * holding the PDF and not yet the photographs was stuck for no reason. Now
 * picking a file creates the draft (`ensureListing`) and attaches the plan to
 * it. Photographs are still required to publish; they are simply no longer
 * required to upload a different kind of file.
 */

import { useRef, useState } from 'react';
import { FileText, Map, Trash2, Upload } from 'lucide-react';
import { Button, Spinner } from '../kit';
import { useToast } from '../Toast';
import { MediaSection } from './MediaSection';
import {
  FLOORPLAN_ACCEPT, MAX_FLOOR_PLANS, MAX_FLOORPLAN_BYTES, type FloorPlanNote,
  floorPlanHref, floorPlanProblem, floorPlanSize,
} from '../../../lib/phase1/floorplan';

export type { FloorPlanNote };

export function FloorPlanUpload({
  listingId,
  ensureListing,
  ownerId,
  plans,
  onChange,
  unavailable,
}: {
  /** Null in the new-listing wizard until something has created the draft. */
  listingId: string | null;
  /**
   * Creates the draft this plan will hang on, and returns its id. Absent when
   * the caller already has a listing; returns null when it could not make one,
   * having said why itself.
   */
  ensureListing?: () => Promise<string | null>;
  ownerId: string;
  plans: FloorPlanNote[];
  onChange: (plans: FloorPlanNote[]) => void;
  /** Said in place of the button when uploading cannot work at all — demo data. */
  unavailable?: string;
}) {
  const { push } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const room = MAX_FLOOR_PLANS - plans.length;

  const upload = async (files: File[]) => {
    /* Checked here so the wrong file is named in the same second it is picked,
       and so a folder of eight does not start an upload that the sixth will be
       refused for. */
    const taking = files.slice(0, room);
    if (files.length > taking.length) {
      push({ tone: 'warn', title: 'Not all of them fit', body: `A listing takes ${MAX_FLOOR_PLANS} floor plans. The first ${taking.length} will be added.` });
    }

    setBusy(true);
    try {
      const id = listingId ?? (ensureListing ? await ensureListing() : null);
      if (!id) return;

      let latest = plans;
      for (const file of taking) {
        const problem = floorPlanProblem(file);
        if (problem) { push({ tone: 'error', title: `${file.name} was not added`, body: problem }); continue; }

        const body = new FormData();
        body.set('listingId', id);
        body.set('file', file);
        const res = await fetch('/api/phase1/floorplan', { method: 'POST', body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          push({ tone: 'error', title: `${file.name} was not added`, body: data?.error ?? 'The upload did not go through.' });
          continue;
        }
        latest = data.floorPlans as FloorPlanNote[];
        onChange(latest);
      }

      const added = latest.length - plans.length;
      if (added > 0) push({ tone: 'success', title: added === 1 ? 'Floor plan added' : `${added} floor plans added` });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const remove = async (plan: FloorPlanNote) => {
    if (!listingId) return;
    setRemoving(plan.id);
    try {
      const res = await fetch(
        `/api/phase1/floorplan?listing=${encodeURIComponent(listingId)}&plan=${encodeURIComponent(plan.id)}`,
        { method: 'DELETE' },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error);
      onChange((data.floorPlans as FloorPlanNote[]) ?? plans.filter((p) => p.id !== plan.id));
      push({ tone: 'success', title: 'Floor plan removed' });
    } catch {
      push({ tone: 'error', title: 'It was not removed', body: 'Try again in a moment.' });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <MediaSection
      icon={<Map size={15} />}
      title="Floor plans"
      limits={`PDF, JPEG, PNG or WebP · up to ${MAX_FLOOR_PLANS} files of ${MAX_FLOORPLAN_BYTES / (1024 * 1024)} MB`}
      optional
    >
      {plans.length > 0 && (
        <ul className="mb-3 space-y-2">
          {plans.map((plan) => (
            <li key={plan.id} className="flex items-center gap-3 rounded-lg border border-p1-border bg-p1-bg px-3 py-2.5">
              <FileText size={18} className="shrink-0 text-p1-text-3" aria-hidden />
              <span className="min-w-0 flex-1">
                <a
                  href={floorPlanHref(ownerId, listingId ?? '', plan)}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-[13.5px] font-medium text-p1-text hover:text-p1-primary"
                >
                  {plan.filename}
                </a>
                <span className="block text-[12px] tabular-nums text-p1-text-3">{floorPlanSize(plan.bytes)}</span>
              </span>
              <button
                type="button"
                onClick={() => void remove(plan)}
                disabled={removing !== null}
                aria-label={`Remove ${plan.filename}`}
                className="p1-press flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-p1-text-3 hover:bg-p1-danger-soft hover:text-p1-danger disabled:opacity-50"
              >
                {removing === plan.id ? <Spinner size={14} /> : <Trash2 size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {unavailable ? (
        <p className="text-[13px] leading-5 text-p1-text-3">{unavailable}</p>
      ) : (
        <div>
          <Button
            variant="outline"
            size="sm"
            loading={busy}
            disabled={room <= 0}
            leftIcon={<Upload size={15} />}
            onClick={() => input.current?.click()}
          >
            {plans.length === 0 ? 'Add a floor plan' : 'Add another'}
          </Button>
          <p className="mt-2 text-[12.5px] leading-5 text-p1-text-3">
            {room <= 0
              ? `That is the ${MAX_FLOOR_PLANS} this listing takes. Remove one to add another.`
              : plans.length === 0
                ? 'Clients ask for this more than any other document. A PDF stays sharp when they zoom in on the dimensions.'
                : 'A second storey, a stack plan, or the rest of a scanned brochure — add as many as the unit has.'}
          </p>
        </div>
      )}

      <input
        ref={input}
        type="file"
        multiple
        accept={FLOORPLAN_ACCEPT}
        className="sr-only"
        onChange={(e) => { const f = Array.from(e.target.files ?? []); if (f.length) void upload(f); }}
      />
    </MediaSection>
  );
}
