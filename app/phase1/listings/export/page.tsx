"use client";

/**
 * The branded client shortlist, as a printable document.
 *
 * An agent filters their listings, exports the set, and sends the file to a
 * client before a viewing day. The scope calls this the highest-frequency daily
 * task, and the thing that makes it worth doing at all is that the CEA
 * compliance block goes on every page automatically — the part agents currently
 * assemble by hand and sometimes forget.
 *
 * It renders as a real page and prints to PDF through the browser. Production
 * generates the same layout server-side with Playwright so it can be emailed
 * without a person present; the markup below is what that renderer would load,
 * which is why the print rules live in a stylesheet rather than in a canvas.
 */

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer, Bed, Bath, Maximize, Sofa, CalendarDays, TrainFront, ShieldCheck } from 'lucide-react';
import { Button, EmptyState, cx } from '../../../../components/phase1/kit';
import { useDemo, TODAY, preferredName } from '../../../../lib/phase1/DemoContext';
import { useSession } from '../../../../lib/phase1/SessionContext';
import { DemoListing } from '../../../../lib/phase1/data';
import { DEAL_LABEL, dealOf, priceLabel, psf } from '../../../../lib/phase1/pricing';
import { districtName } from '../../../../lib/phase1/performance';
import { listingPhotos } from '../../../../lib/phase1/photos';

export default function ExportPage() {
  return (
    <Suspense fallback={null}>
      <Shortlist />
    </Suspense>
  );
}

const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function Shortlist() {
  const params = useSearchParams();
  const { state } = useDemo();
  const { user } = useSession();
  const [ready, setReady] = useState(false);

  // The ids come from the listings screen, so the document is exactly the set
  // the agent had on screen — filters, sort order and all.
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean);
  const chosen: DemoListing[] = ids.length
    ? ids.map((id) => state.listings.find((l) => l.id === id)).filter((l): l is DemoListing => Boolean(l))
    : [];

  const p = state.profile;
  const printedOn = TODAY.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });

  // Photographs have to be in the page before the print dialog opens, or the
  // saved PDF has empty frames.
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(timer);
  }, []);

  if (chosen.length === 0) {
    return (
      <div className="mx-auto max-w-[820px] px-4 py-10">
        <EmptyState
          title="Nothing selected for the shortlist"
          description="Filter your listings, then choose Export shortlist. The document contains whatever the filter left on screen."
          action={<Link href="/phase1/listings" className="text-[14px] font-medium text-p1-primary hover:underline underline-offset-4 dark:text-p1-info">Back to listings</Link>}
        />
      </div>
    );
  }

  return (
    <div className="p1 min-h-screen bg-p1-bg font-p1sans">
      {/* Everything in here is screen-only; the document below is what prints. */}
      <div className="no-print sticky top-0 z-10 border-b border-p1-border bg-p1-surface">
        <div className="mx-auto flex h-14 w-full max-w-[820px] items-center justify-between gap-3 px-4">
          <Link href="/phase1/listings" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-p1-text-2 hover:text-p1-text">
            <ArrowLeft size={15} aria-hidden /> Back to listings
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-p1-text-3">{chosen.length} {chosen.length === 1 ? 'listing' : 'listings'}</span>
            <Button leftIcon={<Printer size={16} />} disabled={!ready} onClick={() => window.print()}>
              {ready ? 'Save as PDF' : 'Preparing…'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[820px] px-4 py-6 print:max-w-none print:p-0">
        <article className="vr-doc rounded-xl border border-p1-border bg-white p-8 text-[#111827] shadow-p1-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {/* ---------------------------------------------------- masthead */}
          <header className="flex items-start justify-between gap-6 border-b-2 border-[#14346B] pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#14346B] font-p1display text-[21px] font-semibold text-white">V</span>
                <span className="font-p1display text-[20px] font-semibold tracking-tight">V-RENT</span>
              </div>
              <h1 className="mt-4 font-p1display text-[26px] font-medium leading-tight">Property shortlist</h1>
              <p className="mt-1 text-[13.5px] text-[#4B5563]">Prepared {printedOn} · {chosen.length} {chosen.length === 1 ? 'property' : 'properties'}</p>
            </div>
            <div className="text-right text-[13px] leading-6">
              <div className="text-[15px] font-semibold">{preferredName(p.fullName)}</div>
              <div className="text-[#4B5563]">{p.agency}</div>
              <div className="text-[#4B5563]">{p.mobile}</div>
              <div className="break-all text-[#4B5563]">{p.email}</div>
            </div>
          </header>

          {/* ---------------------------------------------------- the units */}
          {chosen.map((l, i) => {
            const photos = listingPhotos(user?.id, l);
            const price = priceLabel(l);
            const facts = [
              { icon: Bed, v: `${l.bedrooms} bed` },
              { icon: Bath, v: `${l.bathrooms} bath` },
              { icon: Maximize, v: `${l.sizeSqft.toLocaleString()} sqft` },
              { icon: Sofa, v: l.furnishing },
              { icon: CalendarDays, v: `From ${fmtDate(l.availableFrom)}` },
              ...(l.nearestMrt ? [{ icon: TrainFront, v: l.nearestMrt }] : []),
            ];

            return (
              <section key={l.id} className={cx('vr-unit break-inside-avoid border-b border-[#E5E7EB] py-6', i === 0 && 'pt-6')}>
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#14346B] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                        {DEAL_LABEL[dealOf(l)]}
                      </span>
                      <span className="font-mono text-[12px] text-[#6B7280]">{l.reference}</span>
                    </div>
                    <h2 className="mt-2 font-p1display text-[19px] font-medium leading-tight">{l.project} {l.unitNo}</h2>
                    <p className="mt-0.5 text-[13.5px] text-[#4B5563]">
                      {l.address}, Singapore {l.postalCode} · D{String(l.district).padStart(2, '0')} {districtName(l.district)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[21px] font-semibold tabular-nums">{price.amount}<span className="text-[12px] font-normal text-[#6B7280]">{price.suffix && ` ${price.suffix}`}</span></div>
                    <div className="text-[12px] text-[#6B7280]">{psf(l)}</div>
                  </div>
                </div>

                {photos.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {photos.slice(0, 3).map((src, n) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={src} src={src} alt={`${l.project} photograph ${n + 1}`} className="aspect-[4/3] w-full rounded-md object-cover" />
                    ))}
                  </div>
                )}

                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
                  {facts.map((f) => (
                    <li key={f.v} className="inline-flex items-center gap-1.5">
                      <f.icon size={13} className="text-[#6B7280]" aria-hidden />{f.v}
                    </li>
                  ))}
                </ul>

                {l.description && (
                  <p className="mt-3 max-w-[64ch] text-[13.5px] leading-6 text-[#374151]">{l.description}</p>
                )}
              </section>
            );
          })}

          {/* ------------------------------------------------- compliance */}
          <footer className="vr-compliance mt-6 rounded-lg bg-[#F3F4F6] px-5 py-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <ShieldCheck size={15} aria-hidden /> Advertised by a CEA-registered salesperson
            </div>
            <p className="mt-1.5 text-[13.5px] leading-6">
              {p.fullName} · {p.ceaNumber} · {p.agency} ({p.agencyLicence})
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[#6B7280]">
              Singapore advertising rules require the salesperson name, registration number and agency licence number on
              every property advertisement. Verify this registration at cea.gov.sg. Details were correct on{' '}
              {printedOn} and are subject to change.
            </p>
          </footer>
        </article>
      </div>

      {/*
        Print rules. `print-color-adjust` keeps the masthead rule and the badges
        from being dropped by the browser's ink-saving default, and the running
        footer repeats the compliance line on every sheet.
      */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm 12mm 16mm;
          }
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .vr-doc {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .vr-unit { break-inside: avoid; page-break-inside: avoid; }
          .vr-compliance { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
