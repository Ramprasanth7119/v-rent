"use client";

/**
 * The video tour.
 *
 * Optional and expected to stay that way — most listings will never have one,
 * and this control is written so that a listing without a video never reads as
 * unfinished.
 *
 * The file goes from this browser to Cloudinary, not through our server; see
 * `lib/phase1/video.ts` for why it has to. Two consequences show up here. An
 * upload of this size needs a progress bar, which is why it is an
 * XMLHttpRequest rather than a fetch — fetch still cannot report how much of a
 * request body has gone. And the upload is only half of it: Cloudinary is
 * asked to confirm the file afterwards, and the listing records nothing until
 * it has.
 *
 * When there are no credentials there is no upload, and the section says so
 * instead of offering a button that cannot work.
 */

import { useEffect, useRef, useState } from 'react';
import { Clapperboard, Play, Trash2, Upload } from 'lucide-react';
import { Button, Spinner } from '../kit';
import { useToast } from '../Toast';
import { MediaSection } from './MediaSection';
import { VIDEO_ACCEPT, type VideoNote, videoLength, videoProblem, videoSize } from '../../../lib/phase1/video';

/** Raise the file to Cloudinary, reporting how far it has got. */
function putToCloudinary(
  endpoint: string,
  fields: Record<string, string | number>,
  apiKey: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.set(k, String(v));
    body.set('api_key', apiKey);
    body.set('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(new Error('The video did not reach the media service.')));
    xhr.onerror = () => reject(new Error('The upload was interrupted.'));
    xhr.send(body);
  });
}

export function VideoUpload({
  listingId,
  video,
  onChange,
}: {
  /** Null before the listing is first saved; the section says so. */
  listingId: string | null;
  video: VideoNote | null;
  onChange: (video: VideoNote | null) => void;
}) {
  const { push } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetch('/api/phase1/video')
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => { if (live) setAvailable(d.configured === true); })
      .catch(() => { if (live) setAvailable(false); });
    return () => { live = false; };
  }, []);

  const upload = async (file: File) => {
    if (!listingId) return;

    /* Checked before anything is signed, so the wrong file is caught now
       rather than after several minutes of uploading. */
    const problem = videoProblem(file);
    if (problem) { push({ tone: 'error', title: 'Video not added', body: problem }); return; }

    setBusy(true);
    setPct(0);
    try {
      const signRes = await fetch('/api/phase1/video', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listingId, contentType: file.type, bytes: file.size }),
      });
      const signed = await signRes.json().catch(() => ({}));
      if (!signRes.ok) throw new Error(signed?.error ?? 'The upload could not be started.');

      await putToCloudinary(signed.endpoint, signed.fields, signed.apiKey, file, setPct);

      /* Recorded only once the media service confirms what it holds. */
      const confirmRes = await fetch('/api/phase1/video', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      const confirmed = await confirmRes.json().catch(() => ({}));
      if (!confirmRes.ok) throw new Error(confirmed?.error ?? 'The video uploaded but could not be saved.');

      onChange(confirmed.video as VideoNote);
      push({ tone: 'success', title: 'Video tour added' });
    } catch (err) {
      push({ tone: 'error', title: 'Video not added', body: err instanceof Error ? err.message : 'Try again in a moment.' });
    } finally {
      setBusy(false);
      setPct(null);
      if (input.current) input.current.value = '';
    }
  };

  const remove = async () => {
    if (!listingId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/phase1/video?listing=${encodeURIComponent(listingId)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'It was not removed.');
      onChange(null);
      push({ tone: 'success', title: 'Video tour removed' });
    } catch (err) {
      push({ tone: 'error', title: 'It was not removed', body: err instanceof Error ? err.message : 'Try again in a moment.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <MediaSection
      icon={<Clapperboard size={15} />}
      title="Video tour"
      limits="MP4, MOV or WebM, up to 100 MB"
      optional
    >
      {available === false ? (
        <p className="text-[13px] leading-5 text-p1-text-3">
          Video tours are not switched on for this account yet. Everything else on this step works as usual, and a
          listing without a video is complete.
        </p>
      ) : !listingId ? (
        <p className="text-[13px] text-p1-text-3">Save the listing first, then a video can be attached to it.</p>
      ) : video ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-p1-border bg-p1-bg p-2.5">
          <a
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className="group relative block h-16 w-28 shrink-0 overflow-hidden rounded-md bg-p1-subtle"
            aria-label="Play the video tour"
          >
            {/* Cloudinary's own frame from the video, so the agent recognises
                which take they uploaded without opening it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={video.posterUrl} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white group-hover:bg-black/35" aria-hidden>
              <Play size={20} fill="currentColor" />
            </span>
          </a>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-medium text-p1-text">
              Video tour{videoLength(video.durationSec) && ` · ${videoLength(video.durationSec)}`}
            </div>
            <div className="text-[12px] tabular-nums text-p1-text-3">{videoSize(video.bytes)} · {video.format.toUpperCase()}</div>
          </div>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            aria-label="Remove the video tour"
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
            loading={busy && pct === null}
            disabled={busy || available === null}
            leftIcon={<Upload size={15} />}
            onClick={() => input.current?.click()}
          >
            Add a video tour
          </Button>

          {pct !== null && (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-p1-subtle">
                <div className="h-full rounded-full bg-p1-primary transition-[width]" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-[12px] tabular-nums text-p1-text-3">
                {pct < 100 ? `Uploading — ${pct}%` : 'Finishing up…'}
              </p>
            </div>
          )}

          {pct === null && (
            <p className="mt-2 text-[12.5px] leading-5 text-p1-text-3">
              A slow walk through the unit, held steady, does more than a seventh photograph. Skip it if you have not
              got one.
            </p>
          )}
        </div>
      )}

      <input
        ref={input}
        type="file"
        accept={VIDEO_ACCEPT}
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }}
      />
    </MediaSection>
  );
}
