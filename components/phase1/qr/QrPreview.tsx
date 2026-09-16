"use client";

/**
 * The code itself, what it opens, and what can be done with it.
 *
 * The code sits on white in both themes: a scanner needs dark on light, and a
 * code shown light-on-dark is the one people photograph and cannot scan.
 */

import React from 'react';
import {
  AlertTriangle, CheckCircle2, Copy, Download, ExternalLink, FlaskConical, Link2Off, Printer, QrCode, RefreshCw, Share2,
} from 'lucide-react';
import { Button, IconButton, Spinner, Tooltip, cx } from '../kit';
import { displayAddress, type Destination } from './destination';

export type QrStatus = 'ready' | 'generating' | 'failed' | 'blocked';

const STATUS: Record<QrStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  ready: { label: 'Ready', cls: 'bg-p1-success-soft text-p1-success', icon: <CheckCircle2 size={13} aria-hidden /> },
  generating: { label: 'Generating', cls: 'bg-p1-subtle text-p1-text-2', icon: <Spinner size={12} /> },
  failed: { label: 'Could not generate', cls: 'bg-p1-danger-soft text-p1-danger', icon: <AlertTriangle size={13} aria-hidden /> },
  blocked: { label: 'Not generated', cls: 'bg-p1-subtle text-p1-text-3', icon: <QrCode size={13} aria-hidden /> },
};

const BLOCKED_COPY: Record<Exclude<Destination, { ok: true }>['reason'], { title: string; body: string }> = {
  'no-listing': { title: 'Choose a listing', body: 'Pick a live listing on the left and its code appears here.' },
  'no-address': { title: 'Add an address', body: 'Type the web address the code should open.' },
  'invalid-address': { title: 'Check the address', body: 'That is not a web address a phone can open. It should look like example.com/page.' },
  unavailable: { title: 'Address unavailable', body: 'The link for this page could not be worked out. Reload the page and try again.' },
};

export function QrPreview({
  dest, status, png, title, subtitle, busy, onDownload, onCopy, onShare, onPrint, onRegenerate,
}: {
  dest: Destination;
  status: QrStatus;
  png: string;
  title: string;
  subtitle: string;
  busy: 'png' | 'svg' | 'share' | null;
  onDownload: (kind: 'png' | 'svg') => void;
  onCopy: () => void;
  onShare: () => void;
  onPrint: () => void;
  onRegenerate: () => void;
}) {
  const s = STATUS[status];
  const ready = status === 'ready' && dest.ok && Boolean(png);
  const blocked = !dest.ok ? BLOCKED_COPY[dest.reason] : null;

  return (
    <section aria-labelledby="qr-preview-h" className="overflow-hidden rounded-2xl border border-p1-border bg-p1-surface shadow-p1-sm">
      <div className="flex items-center justify-between gap-3 border-b border-p1-border px-5 py-3.5">
        <h2 id="qr-preview-h" className="text-[15px] font-semibold tracking-[-0.01em] text-p1-text">Preview</h2>
        <div className="flex items-center gap-1.5" data-print-hide>
          <span role="status" className={cx('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium', s.cls)}>
            {s.icon}{s.label}
          </span>
          <IconButton label="Regenerate the code" size="sm" onClick={onRegenerate} disabled={!dest.ok || status === 'generating'}>
            <RefreshCw size={14} aria-hidden />
          </IconButton>
        </div>
      </div>

      <div className="px-5 pb-5 pt-5">
        {/* Always white: see the note at the top of the file. */}
        <div className="mx-auto flex aspect-square w-full max-w-[272px] items-center justify-center rounded-xl border border-p1-border bg-white p-3 shadow-[inset_0_0_0_1px_rgba(16,24,40,0.02)] print:max-w-[90mm] print:border-0">
          {ready ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={png} alt={`QR code that opens ${title}`} className="vr-fade h-full w-full object-contain [image-rendering:pixelated]" />
          ) : status === 'generating' ? (
            <div className="grid h-full w-full place-items-center rounded-lg bg-slate-50" aria-hidden><Spinner size={22} className="text-slate-400" /></div>
          ) : (
            <div className="flex flex-col items-center px-4 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500" aria-hidden>
                {status === 'failed' ? <AlertTriangle size={20} /> : blocked?.title === 'Check the address' ? <Link2Off size={20} /> : <QrCode size={20} />}
              </span>
              <p className="mt-3 text-[14px] font-semibold text-slate-800">{status === 'failed' ? 'The code could not be made' : blocked?.title}</p>
              <p className="mt-1 text-[12.5px] leading-5 text-slate-500">
                {status === 'failed' ? 'Try again. If it keeps happening, shorten the address.' : blocked?.body}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="truncate font-p1display text-[16px] font-bold tracking-[-0.01em] text-p1-text" title={title}>{title}</p>
          <p className="mt-0.5 truncate text-[12.5px] text-p1-text-3" title={subtitle}>{subtitle}</p>
        </div>

        {dest.ok && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-p1-border bg-p1-subtle/60 py-1.5 pl-3 pr-1.5" data-print-hide>
            <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-p1-text-2" title={dest.url}>{displayAddress(dest.url)}</span>
            {!dest.sample && (
              <Tooltip content="Open in a new tab">
                <a
                  href={dest.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open the address in a new tab"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-p1-text-3 hover:bg-p1-surface hover:text-p1-text focus-visible:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none"
                >
                  <ExternalLink size={14} aria-hidden />
                </a>
              </Tooltip>
            )}
            <Button size="sm" variant="ghost" onClick={onCopy} leftIcon={<Copy size={14} />} aria-label="Copy link">Copy</Button>
          </div>
        )}
        {dest.ok && dest.sample && (
          <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-5 text-p1-text-3" data-print-hide>
            <FlaskConical size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--p1-demo)' }} aria-hidden />
            A sample address. Demo codes never open a real page or a real account.
          </p>
        )}
        {/* On paper, the address in full for anyone who will not scan. */}
        {dest.ok && <p className="mt-3 hidden break-all text-center font-mono text-[11px] text-black print:block">{dest.url}</p>}

        <div className="mt-5 grid gap-2" data-print-hide>
          <Button variant="primary" block disabled={!ready || busy !== null} onClick={() => onDownload('png')} aria-label="Download PNG" leftIcon={busy === 'png' ? <Spinner size={15} /> : <Download size={16} />}>
            Download PNG
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={!ready || busy !== null} onClick={() => onDownload('svg')} aria-label="Download SVG for print" leftIcon={busy === 'svg' ? <Spinner size={15} /> : <Download size={15} />}>
              SVG <span className="hidden font-normal text-p1-text-3 min-[380px]:inline">· print</span>
            </Button>
            <Button variant="outline" disabled={!ready || busy !== null} onClick={onShare} aria-label="Share link" leftIcon={busy === 'share' ? <Spinner size={15} /> : <Share2 size={15} />}>
              Share
            </Button>
          </div>
          <Button variant="ghost" block disabled={!ready} onClick={onPrint} aria-label="Print the code" leftIcon={<Printer size={15} />}>
            Print
          </Button>
        </div>
      </div>
    </section>
  );
}
