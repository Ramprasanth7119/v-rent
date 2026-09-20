"use client";

/**
 * QR code.
 *
 * The use is physical: a name card, a viewing sign in a lift lobby, a slide at
 * an agency briefing. So the screen is about producing a file that survives
 * being printed — a vector, at the error-correction level that tolerates a
 * thumbprint, with the address written underneath for anyone who will not
 * scan it.
 *
 * The code is generated in the browser. There is no call to a QR service,
 * which matters because those services log every URL they are asked to encode.
 *
 * What it encodes comes from `destination.ts`: a page this application serves
 * with Demo Data OFF, a sample address with it ON. The listings and profile
 * come from the workspace provider, like every other screen.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import QRCode from 'qrcode';
import { Building2, Globe, Link2, Palette, UserRound } from 'lucide-react';
import {
  Avatar, LinkButton, PageHeader, Segmented, SelectInput, TextInput,
} from '../../../components/phase1/kit';
import { useToast } from '../../../components/phase1/Toast';
import { ListingPicker } from '../../../components/phase1/qr/ListingPicker';
import { QrPreview, type QrStatus } from '../../../components/phase1/qr/QrPreview';
import { destinationFor, fileName, type Target } from '../../../components/phase1/qr/destination';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { useSession } from '../../../lib/phase1/SessionContext';
import { districtName } from '../../../lib/phase1/performance';

type Ink = 'ink' | 'brand';

const SIZES = [
  { value: '512', label: 'Name card · 512 px' },
  { value: '1024', label: 'Poster · 1024 px' },
  { value: '2048', label: 'Large sign · 2048 px' },
];

const INK: Record<Ink, string> = { ink: '#000000', brand: '#0E2124' };

/* The address this page is served from. Empty on the server, so the first render matches. */
const noSubscribe = () => () => {};
const useOrigin = () => useSyncExternalStore(noSubscribe, () => window.location.origin, () => '');

function Step({ n, icon, title, hint, children }: { n: number; icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`qr-step-${n}`} className="rounded-2xl border border-p1-border bg-p1-surface p-5 shadow-p1-sm sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-p1-subtle text-p1-text-2">{icon}</span>
        <div className="min-w-0">
          <h2 id={`qr-step-${n}`} className="text-[15px] font-semibold tracking-[-0.01em] text-p1-text">
            <span className="mr-1.5 text-p1-text-3">{n}.</span>{title}
          </h2>
          {hint && <p className="mt-0.5 text-[12.5px] text-p1-text-3">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function QrPage() {
  const { state, demo } = useDemo();
  const { user } = useSession();
  const { push } = useToast();
  const origin = useOrigin();
  const p = state.profile;

  const live = useMemo(
    () => state.listings.filter((l) => !l.archived && (l.status === 'published' || l.status === 'paused')),
    [state.listings],
  );

  const [target, setTarget] = useState<Target>(() => (live.length ? 'listing' : 'profile'));
  const [listingId, setListingId] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [touched, setTouched] = useState(false);
  const [size, setSize] = useState('1024');
  const [ink, setInk] = useState<Ink>('ink');
  const [nonce, setNonce] = useState(0);
  const [code, setCode] = useState<{ key: string; png: string; svg: string } | { key: string; failed: true } | null>(null);
  const [busy, setBusy] = useState<'png' | 'svg' | 'share' | null>(null);

  // A choice that is no longer on screen (Demo Data turned, a listing unpublished) falls back to the first one.
  const chosen = live.find((l) => l.id === listingId) ?? live[0] ?? null;
  const dest = destinationFor({ target, demo, origin, ownerId: user?.id, listing: chosen, custom });
  const name = p.fullName.replace(/\s*\(.*\)\s*$/, '') || 'Your public page';

  const title = target === 'listing'
    ? (chosen ? `${chosen.project}` : 'Listing')
    : target === 'profile' ? name : 'Custom address';
  const subtitle = target === 'listing'
    ? (chosen ? `D${String(chosen.district).padStart(2, '0')} ${districtName(chosen.district)} · ${chosen.reference}` : 'No listing chosen')
    : target === 'profile' ? [p.agency, p.ceaNumber && `CEA ${p.ceaNumber}`].filter(Boolean).join(' · ') || 'Public profile'
      : 'Opens the address you entered';

  const url = dest.ok ? dest.url : '';
  const key = `${url}|${size}|${ink}|${nonce}`;
  /* The regenerate that is waiting to be announced, so its toast lands with the new code rather than before it. */
  const announce = useRef<number | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const opts = {
      // 'H' tolerates about 30% of the code being obscured — a logo, a fold in a
      // name card, a thumb on a sign.
      errorCorrectionLevel: 'H' as const,
      margin: 2,
      color: { dark: INK[ink], light: '#FFFFFF' },
    };
    Promise.all([
      QRCode.toDataURL(url, { ...opts, width: Number(size) }),
      QRCode.toString(url, { ...opts, type: 'svg', width: 512 }),
    ])
      .then(([png, svg]) => {
        if (cancelled) return;
        setCode({ key, png, svg });
        if (announce.current === nonce) push({ tone: 'success', title: 'QR code regenerated' });
      })
      .catch(() => {
        if (cancelled) return;
        setCode({ key, failed: true });
        if (announce.current === nonce) push({ tone: 'error', title: 'The code could not be regenerated', body: 'Try again in a moment.' });
      })
      .finally(() => { if (!cancelled && announce.current === nonce) announce.current = null; });
    return () => { cancelled = true; };
  }, [url, size, ink, key, nonce, push]);

  const current = code && code.key === key ? code : null;
  const status: QrStatus = !dest.ok ? 'blocked' : !current ? 'generating' : 'failed' in current ? 'failed' : 'ready';
  const png = current && !('failed' in current) ? current.png : '';
  const svg = current && !('failed' in current) ? current.svg : '';

  const download = useCallback((kind: 'png' | 'svg') => {
    if (busy || !png) return;
    setBusy(kind);
    let href = '';
    try {
      href = kind === 'png' ? png : URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const a = document.createElement('a');
      a.href = href;
      a.download = fileName(title, size, kind);
      document.body.appendChild(a);
      a.click();
      a.remove();
      push({ tone: 'success', title: kind === 'png' ? 'PNG downloaded' : 'SVG downloaded', body: kind === 'svg' ? 'Send this one to a printer. It stays sharp at any size.' : undefined });
    } catch {
      push({ tone: 'error', title: 'The download did not start', body: 'Check that downloads are allowed for this site, then try again.' });
    } finally {
      // Revoked a moment later: some browsers read the file after `click` returns.
      if (kind === 'svg' && href) setTimeout(() => URL.revokeObjectURL(href), 1500);
      setTimeout(() => setBusy(null), 400);
    }
  }, [busy, png, svg, title, size, push]);

  const copy = useCallback(async (quiet = false) => {
    if (!url) return false;
    try {
      await navigator.clipboard.writeText(url);
      if (!quiet) push({ tone: 'success', title: 'Link copied' });
      return true;
    } catch {
      if (!quiet) push({ tone: 'error', title: 'The link could not be copied', body: 'Your browser blocked the clipboard. Select the address and copy it instead.' });
      return false;
    }
  }, [url, push]);

  const share = useCallback(async () => {
    if (busy || !url) return;
    setBusy('share');
    try {
      if (typeof navigator.share === 'function') {
        try {
          const file = png ? new File([await (await fetch(png)).blob()], fileName(title, size, 'png'), { type: 'image/png' }) : null;
          const withFile = file && navigator.canShare?.({ files: [file] });
          await navigator.share({ title: `${title} — V-RENT`, url, ...(withFile ? { files: [file] } : {}) });
          push({ tone: 'success', title: 'Shared' });
        } catch (e) {
          // Closing the share sheet is a choice, not a failure.
          if ((e as DOMException)?.name !== 'AbortError') push({ tone: 'error', title: 'Sharing did not complete', body: 'Try again, or copy the link instead.' });
        }
      } else if (await copy(true)) {
        push({ tone: 'info', title: 'Link copied instead', body: 'This browser cannot open a share sheet. Paste the link wherever you want to share it.' });
      } else {
        push({ tone: 'error', title: 'Sharing is not available here', body: 'Select the address and copy it instead.' });
      }
    } finally {
      setBusy(null);
    }
  }, [busy, url, png, title, size, copy, push]);

  const regenerate = () => {
    announce.current = nonce + 1;
    setNonce(nonce + 1);
  };

  const customError = target === 'custom' && touched && dest.ok === false && dest.reason === 'invalid-address'
    ? 'Enter a web address, such as example.com/page.'
    : undefined;

  return (
    <>
      <div data-print-hide>
        <PageHeader
          eyebrow="Marketing"
          title="QR code"
          description="Make a code for a listing or your public page, for name cards, viewing signs and slides. It is generated on this device."
          actions={<LinkButton href="/phase1/agent" variant="outline" leftIcon={<Globe size={15} />}>Your public page</LinkButton>}
        />
      </div>

      {/* Phones read top to bottom, so the preview follows the choice it previews; from lg it sits beside both steps. */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        {/* One column from lg; below it the wrapper dissolves so `order` can put the preview after step 1. */}
        <div className="contents lg:col-start-1 lg:row-start-1 lg:grid lg:min-w-0 lg:gap-5" data-print-hide>
          <div className="order-1 min-w-0 lg:order-none">
            <Step n={1} icon={<Link2 size={15} />} title="What the code opens">
              <div className="grid gap-4">
                <Segmented<Target>
                  label="Destination"
                  value={target}
                  onChange={setTarget}
                  className="justify-self-start [&>button]:whitespace-nowrap"
                  options={[
                    { key: 'listing', label: 'Listing', icon: <Building2 size={14} /> },
                    { key: 'profile', label: 'Profile', icon: <UserRound size={14} /> },
                    { key: 'custom', label: 'Other link', icon: <Link2 size={14} /> },
                  ]}
                />

                {target === 'listing' && (
                  <ListingPicker listings={live} value={chosen?.id ?? null} onChange={setListingId} ownerId={user?.id} />
                )}

                {target === 'profile' && (
                  <div className="flex items-center gap-3 rounded-xl border border-p1-border bg-p1-subtle/50 p-3">
                    <Avatar name={name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-p1-text">{name}</p>
                      <p className="truncate text-[12.5px] text-p1-text-3">{subtitle}</p>
                    </div>
                    <span className="hidden shrink-0 text-[12.5px] text-p1-text-3 sm:inline">
                      Your public page and live listings
                    </span>
                  </div>
                )}

                {target === 'custom' && (
                  <TextInput
                    label="Web address"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="example.com/floor-plan"
                    error={customError}
                    hint={customError ? undefined : 'A booking form, a floor plan, a video tour. Web addresses only.'}
                  />
                )}
              </div>
            </Step>
          </div>

          <div className="order-3 min-w-0 lg:order-none" data-print-hide>
            <Step n={2} icon={<Palette size={15} />} title="Format" hint="Both files are made from the same code.">
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectInput
                  label="PNG size"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  hint="The SVG scales to any size."
                  options={SIZES}
                />
                <div>
                  <span id="qr-ink-label" className="mb-2 block text-[13.5px] font-semibold text-p1-text">Colour</span>
                  <Segmented<Ink>
                    label="Colour"
                    value={ink}
                    onChange={setInk}
                    options={[
                      { key: 'ink', label: 'Black', icon: <span className="block h-3 w-3 rounded-full bg-black ring-1 ring-p1-border" /> },
                      { key: 'brand', label: 'Charcoal', icon: <span className="block h-3 w-3 rounded-full ring-1 ring-p1-border" style={{ background: INK.brand }} /> },
                    ]}
                  />
                  <p className="mt-2 text-[12.5px] text-p1-text-3">Black scans best from a photocopy.</p>
                </div>
              </div>
            </Step>
          </div>

          <div className="order-4 min-w-0 lg:order-none" data-print-hide>
            <p className="px-1 text-[12.5px] leading-5 text-p1-text-3">
              For print, keep the code at least 25 mm wide on a name card and 100 mm on a sign, and leave the white border around it.
            </p>
          </div>
        </div>

        <aside className="order-2 min-w-0 self-start lg:sticky lg:top-24 lg:order-none lg:col-start-2 lg:row-start-1" aria-label="QR code preview">
          <QrPreview
            dest={dest}
            status={status}
            png={png}
            title={title}
            subtitle={subtitle}
            busy={busy}
            onDownload={download}
            onCopy={() => void copy()}
            onShare={() => void share()}
            onPrint={() => window.print()}
            onRegenerate={regenerate}
          />
        </aside>
      </div>
    </>
  );
}
