"use client";

/**
 * Profile QR code.
 *
 * The use is physical: a name card, a viewing sign in a lift lobby, a slide at
 * an agency briefing. So the screen is about producing a file that survives
 * being printed — a vector, at the error-correction level that tolerates a
 * thumbprint, with the address written underneath for anyone who will not
 * scan it.
 *
 * The code is generated in the browser. There is no call to a QR service,
 * which matters because those services log every URL they are asked to encode.
 */

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Link2, Check, Copy, Info, Printer } from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, Callout, SelectInput, TextInput,
  LinkButton, Segmented, cx,
} from '../../../components/phase1/kit';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { districtName } from '../../../lib/phase1/performance';
import { agentSlug } from '../../../lib/phase1/tools';

type Target = 'profile' | 'listing' | 'custom';
type Style = 'ink' | 'brand';

const SIZES = [
  { value: '512', label: 'Name card — 512px' },
  { value: '1024', label: 'Poster — 1024px' },
  { value: '2048', label: 'Large sign — 2048px' },
];

export default function QrPage() {
  const { state } = useDemo();
  const p = state.profile;

  const [target, setTarget] = useState<Target>('profile');
  const [listingId, setListingId] = useState('');
  const [custom, setCustom] = useState('');
  const [size, setSize] = useState('1024');
  const [style, setStyle] = useState<Style>('ink');
  const [png, setPng] = useState('');
  const [svg, setSvg] = useState('');
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState('');

  const live = useMemo(
    () => state.listings.filter((l) => !l.archived && (l.status === 'published' || l.status === 'paused')),
    [state.listings],
  );

  const slug = state.tools.publicPage.slug || agentSlug(p.fullName, p.ceaNumber);
  const chosen = live.find((l) => l.id === listingId) ?? live[0] ?? null;

  const url = target === 'custom'
    ? (custom.trim() || 'https://vrent.sg')
    : target === 'listing'
      ? `https://vrent.sg/p/${chosen?.reference?.toLowerCase() ?? 'listing'}`
      : `https://vrent.sg/a/${slug}`;

  const caption = target === 'listing' && chosen
    ? `${chosen.project} ${chosen.unitNo} · D${String(chosen.district).padStart(2, '0')} ${districtName(chosen.district)}`
    : target === 'custom'
      ? 'Custom address'
      : `${p.fullName.replace(/\s*\(.*\)\s*$/, '')} · CEA ${p.ceaNumber}`;

  const dark = style === 'brand' ? '#062B3A' : '#000000';

  useEffect(() => {
    let cancelled = false;
    const opts = {
      // 'H' tolerates about 30% of the code being obscured — a logo, a fold in a
      // name card, a thumb on a sign.
      errorCorrectionLevel: 'H' as const,
      margin: 2,
      color: { dark, light: '#FFFFFF' },
    };
    (async () => {
      try {
        const [asPng, asSvg] = await Promise.all([
          QRCode.toDataURL(url, { ...opts, width: Number(size) }),
          QRCode.toString(url, { ...opts, type: 'svg', width: 512 }),
        ]);
        if (cancelled) return;
        setPng(asPng);
        setSvg(asSvg);
        setFailed('');
      } catch {
        if (!cancelled) setFailed('That address could not be encoded. Check it and try again.');
      }
    })();
    return () => { cancelled = true; };
  }, [url, size, dark]);

  const save = (kind: 'png' | 'svg') => {
    const name = `v-rent-qr-${target}-${size}.${kind}`;
    const href = kind === 'png' ? png : URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.click();
    if (kind === 'svg') URL.revokeObjectURL(href);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Profile and reputation"
        title="Profile QR code"
        description="A code for a name card, a viewing sign or a slide. It opens your public page — or one listing — and it is generated here rather than by an outside service."
        actions={<LinkButton href="/phase1/agent" variant="outline">Your public page</LinkButton>}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <SectionCard title="What it opens" icon={<Link2 size={16} />}>
          <div className="grid gap-5">
            <Segmented
              label="Destination"
              value={target}
              onChange={setTarget}
              options={[
                { key: 'profile', label: 'My public page' },
                { key: 'listing', label: 'One listing' },
                { key: 'custom', label: 'Another address' },
              ]}
            />

            {target === 'listing' && (
              live.length > 0 ? (
                <SelectInput
                  label="Listing"
                  value={chosen?.id ?? ''}
                  onChange={(e) => setListingId(e.target.value)}
                  options={live.map((l) => ({
                    value: l.id,
                    label: `${l.project} ${l.unitNo} — ${l.reference}`,
                  }))}
                />
              ) : (
                <Callout tone="warning" compact>
                  You have no live listings to point a code at. The code falls back to your public page.
                </Callout>
              )
            )}

            {target === 'custom' && (
              <TextInput
                label="Address"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="https://"
                hint="Anything you want the code to open — a booking link, a floor plan, a form."
              />
            )}

            <div className="flex items-center gap-2 rounded-lg border border-p1-border bg-p1-subtle px-3.5 py-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-p1-text">{url}</span>
              <Button size="sm" variant="ghost" onClick={copy} leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput
                label="Size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                hint="Only affects the PNG. The SVG scales to anything."
                options={SIZES}
              />
              <div>
                <span className="mb-2 block text-[13.5px] font-semibold text-p1-text">Colour</span>
                <Segmented
                  label="Colour"
                  value={style}
                  onChange={setStyle}
                  options={[
                    { key: 'ink', label: 'Black' },
                    { key: 'brand', label: 'V-RENT petrol' },
                  ]}
                />
                <p className="mt-2 text-[12.5px] text-p1-text-3">
                  Black scans most reliably on a photocopier. Petrol is for anything printed properly.
                </p>
              </div>
            </div>

            {failed && <Callout tone="danger" compact>{failed}</Callout>}
          </div>
        </SectionCard>

        <aside className="grid min-w-0 content-start gap-4 [&>*]:min-w-0">
          <Card padding="lg" className="text-center">
            <div className={cx('mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center rounded-xl border border-p1-border bg-white p-4')}>
              {png ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={png} alt={`QR code opening ${url}`} className="h-full w-full object-contain" />
              ) : (
                <QrCode size={48} className="text-p1-text-3" aria-hidden />
              )}
            </div>
            <div className="mt-4 font-p1display text-[15px] font-bold text-p1-text">Scan for V-RENT</div>
            <div className="mt-0.5 text-[12.5px] text-p1-text-3">{caption}</div>

            <div className="mt-5 grid gap-2">
              <Button variant="primary" block disabled={!png} onClick={() => save('png')} leftIcon={<Download size={16} />}>
                Download PNG
              </Button>
              <Button variant="outline" block disabled={!svg} onClick={() => save('svg')} leftIcon={<Download size={16} />}>
                Download SVG — for print
              </Button>
              <Button variant="ghost" block disabled={!png} onClick={() => window.print()} leftIcon={<Printer size={16} />}>
                Print this sheet
              </Button>
            </div>
          </Card>

          <Callout tone="info" title="Printing it" icon={<Info size={17} />}>
            Send the SVG to a printer — it stays sharp at any size. Keep the code at least 25mm across on a name card
            and 100mm on a lift-lobby sign, and leave the white border alone: a scanner needs it to find the code.
          </Callout>
        </aside>
      </div>
    </>
  );
}
