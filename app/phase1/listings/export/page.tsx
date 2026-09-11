"use client";

/**
 * The client shortlist, as a document.
 *
 * An agent sends this before a viewing day and it has to stand on its own: the
 * client opens it two days later, on a phone, with none of the conversation
 * that produced it. So every property gets a full page — photographs, the map,
 * the facts a tenant filters on, the description in full, and where the asking
 * rent sits against what comparable units actually let for — rather than a row
 * in a table that raises more questions than it settles.
 *
 * Structure is deliberate. A cover that summarises, one page per property so
 * nothing is split across a fold, and a closing page with the compliance block
 * the advertising rules require. A running header and footer repeat on every
 * sheet, because a page that arrives detached from the others should still say
 * whose it is.
 *
 * It prints through the browser. Production renders the same markup with a
 * headless browser so it can be emailed without a person present, which is why
 * the pagination lives in a stylesheet rather than in a canvas.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Printer, Bed, Bath, Maximize, Sofa, CalendarDays, TrainFront,
  ShieldCheck, MapPin, Building2, KeyRound, Ruler, FileText,
} from 'lucide-react';
import { Button, EmptyState, cx } from '../../../../components/phase1/kit';
import { PropertyImage } from '../../../../components/phase1/PropertyImage';
import { useDemo, TODAY, preferredName } from '../../../../lib/phase1/DemoContext';
import { useSession } from '../../../../lib/phase1/SessionContext';
import { DemoListing, sgd } from '../../../../lib/phase1/data';
import { DEAL_LABEL, dealOf, priceLabel, psf } from '../../../../lib/phase1/pricing';
import { districtName } from '../../../../lib/phase1/performance';
import { listingPhotos } from '../../../../lib/phase1/photos';
import { sgDateLong, sgDate } from '../../../../lib/phase1/format';
import {
  CONFIDENCE_NOTE, VERDICT_NOTE, marketPosition, type MarketPosition,
} from '../../../../lib/phase1/market-position';

export default function ExportPage() {
  return (
    <Suspense fallback={null}>
      <Shortlist />
    </Suspense>
  );
}

/* ---------------------------------------------------------------- pieces */

/** Ink used only inside the document, so it survives the reader's theme. */
const INK = '#12232A';
const MUTED = '#5A6E76';
const RULE = '#DCE5E8';
const WASH = '#F2F6F7';

/**
 * The strip at the top and bottom of every sheet after the cover.
 *
 * Repeated per section rather than positioned `fixed`, which is the usual
 * trick: Chrome places a fixed element against the page box in a way that puts
 * it in the wrong margin once the document runs past one sheet, and there is no
 * way to test for that beyond printing and looking. A strip per section is
 * deterministic, and it can carry a page number, which the fixed version
 * cannot.
 */
function PageFrame({
  page, total, title, right, footLeft, children,
}: {
  page: number; total: number; title: string; right: string; footLeft: string; children: React.ReactNode;
}) {
  return (
    <section className="vr-page vr-break flex flex-col px-10 py-6">
      <div
        className="flex items-baseline justify-between gap-4 pb-2 text-[9px] uppercase tracking-[0.08em]"
        style={{ color: MUTED, borderBottom: `0.5px solid ${RULE}` }}
      >
        <span className="font-bold tracking-[0.06em]" style={{ color: INK }}>V-RENT</span>
        <span className="truncate">{title}</span>
        <span>{right}</span>
      </div>

      <div className="flex-1 pt-4">{children}</div>

      <div
        className="mt-4 flex items-baseline justify-between gap-4 pt-2 text-[9px]"
        style={{ color: MUTED, borderTop: `0.5px solid ${RULE}` }}
      >
        <span className="truncate">{footLeft}</span>
        <span className="shrink-0 tabular-nums">Page {page} of {total}</span>
      </div>
    </section>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Bed; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="mt-[3px] shrink-0" style={{ color: MUTED }} aria-hidden />
      <div className="min-w-0">
        <div className="text-[9.5px] uppercase tracking-[0.07em]" style={{ color: MUTED }}>{label}</div>
        <div className="text-[12.5px] font-medium leading-snug" style={{ color: INK }}>{value}</div>
      </div>
    </div>
  );
}

/** The twelve monthly medians, drawn small enough to sit beside a paragraph. */
function TrendLine({ values }: { values: number[] }) {
  const real = values.filter(Boolean);
  if (real.length < 3) return null;
  const max = Math.max(...real);
  const min = Math.min(...real);
  const span = max - min || 1;
  const W = 168;
  const H = 40;

  const points = values.map((v, i) => ({
    x: (i / Math.max(1, values.length - 1)) * W,
    y: v ? H - ((v - min) / span) * (H - 6) - 3 : null,
  })).filter((p): p is { x: number; y: number } => p.y !== null);

  const d = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden className="shrink-0">
      <path d={`${d} L${W} ${H} L0 ${H} Z`} fill="#0A5C73" fillOpacity="0.08" />
      <path d={d} fill="none" stroke="#0A5C73" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      {points.length > 0 && (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.6" fill="#0A5C73" />
      )}
    </svg>
  );
}

function MarketSection({ market }: { market: MarketPosition }) {
  const arrow = market.changePct === null ? '' : market.changePct > 0 ? '▲' : market.changePct < 0 ? '▼' : '■';

  return (
    <section className="vr-block mt-3.5 rounded-lg" style={{ border: `1px solid ${RULE}` }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2" style={{ background: WASH, borderBottom: `1px solid ${RULE}` }}>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: INK }}>
          Market position
        </h3>
        <span className="text-[10.5px]" style={{ color: MUTED }}>
          {market.basisLabel} · {market.sample} lodged contracts
        </span>
      </div>

      <div className="grid gap-4 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <p className="text-[12.5px] leading-[1.6]" style={{ color: INK }}>
            Comparable units let at a median of <strong>{sgd(market.medianRent)}</strong> a month — a range of{' '}
            {sgd(market.lowRent)} to {sgd(market.highRent)} — which works out at{' '}
            <strong>${market.medianPsf.toFixed(2)}</strong> per square foot. This unit asks{' '}
            <strong>${market.unitPsf.toFixed(2)}</strong> per square foot,{' '}
            <strong>
              {market.deltaPct === 0
                ? 'exactly the market rate'
                : `${Math.abs(market.deltaPct)}% ${market.deltaPct > 0 ? 'above' : 'below'} that`}
            </strong>
            {' '}— {VERDICT_NOTE[market.verdict]}.
          </p>

          <dl className="mt-2.5 grid grid-cols-3 gap-x-4">
            {[
              ['Market rate', `$${market.medianPsf.toFixed(2)} psf`],
              ['Twelve months', market.changePct === null ? 'Not enough data' : `${arrow} ${Math.abs(market.changePct)}%`],
              ['Next quarter', market.outlook.length ? `${sgd(market.outlook[market.outlook.length - 1].value)} projected` : '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[9.5px] uppercase tracking-[0.07em]" style={{ color: MUTED }}>{k}</dt>
                <dd className="mt-0.5 text-[13px] font-semibold tabular-nums" style={{ color: INK }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="shrink-0">
          <TrendLine values={market.trend} />
          <div className="mt-0.5 flex justify-between text-[9px]" style={{ color: MUTED }}>
            <span>{market.trendLabels[0]}</span>
            <span>{market.trendLabels[market.trendLabels.length - 1]}</span>
          </div>
        </div>
      </div>

      {market.outlook.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px]" style={{ color: MUTED }}>
            <span className="font-semibold" style={{ color: INK }}>Projection</span>
            {market.outlook.map((o) => (
              <span key={o.label} className="tabular-nums">{o.label} — {sgd(o.value)}</span>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] leading-[1.5]" style={{ color: MUTED }}>
            Straight-line fit over the last twelve monthly medians, extended three months and rounded to the nearest
            fifty dollars. {CONFIDENCE_NOTE[market.confidence]}
          </p>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ page */

function Shortlist() {
  const params = useSearchParams();
  const { state } = useDemo();
  const { user } = useSession();
  const [ready, setReady] = useState(false);

  /* The ids come from the shortlist builder or the listings screen, so the
     document is exactly the set the agent had on screen — filters, order and
     all. The client's name and the covering note travel with them. */
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean);
  const forClient = (params.get('for') ?? '').trim();
  const note = (params.get('note') ?? '').trim();

  const chosen: DemoListing[] = useMemo(
    () => ids.map((id) => state.listings.find((l) => l.id === id)).filter((l): l is DemoListing => Boolean(l)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, state.listings],
  );

  const p = state.profile;
  const printedOn = sgDateLong(TODAY);
  const agentName = preferredName(p.fullName) || 'Your agent';
  const footer = `${p.fullName} · CEA ${p.ceaNumber} · ${p.agency}${p.agencyLicence ? ` (${p.agencyLicence})` : ''}`;

  const summary = useMemo(() => {
    if (!chosen.length) return null;
    const rents = chosen.map((l) => l.monthlyRent).filter(Boolean);
    const districts = [...new Set(chosen.map((l) => l.district))].sort((a, b) => a - b);
    const psfs = chosen.filter((l) => l.sizeSqft).map((l) => l.monthlyRent / l.sizeSqft);
    return {
      low: Math.min(...rents),
      high: Math.max(...rents),
      districts,
      avgPsf: psfs.length ? psfs.reduce((a, b) => a + b, 0) / psfs.length : 0,
      beds: [...new Set(chosen.map((l) => l.bedrooms))].sort((a, b) => a - b),
    };
  }, [chosen]);

  // Photographs and map tiles have to be in the page before the print dialog
  // opens, or the saved PDF has empty frames where they should be.
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(timer);
  }, []);

  if (chosen.length === 0) {
    return (
      <div className="mx-auto max-w-[820px] px-4 py-10">
        <EmptyState
          title="Nothing selected for the shortlist"
          description="Choose the units on the shortlist screen, or filter your listings and export what is left."
          action={
            <Link href="/phase1/shortlists" className="text-[14px] font-medium text-p1-primary underline-offset-4 hover:underline dark:text-p1-info">
              Build a shortlist
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="p1 min-h-screen bg-p1-bg">
      {/* Screen-only controls. */}
      <div className="no-print sticky top-0 z-10 border-b border-p1-border bg-p1-surface">
        <div className="mx-auto flex h-14 w-full max-w-[860px] items-center justify-between gap-3 px-4">
          <Link href="/phase1/shortlists" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-p1-text-2 hover:text-p1-text">
            <ArrowLeft size={15} aria-hidden /> Back
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-p1-text-3">
              {chosen.length + 2} pages · {chosen.length} propert{chosen.length === 1 ? 'y' : 'ies'}
            </span>
            <Button leftIcon={<Printer size={16} />} disabled={!ready} onClick={() => window.print()}>
              {ready ? 'Save as PDF' : 'Preparing…'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[860px] px-4 py-6 print:max-w-none print:p-0">
        <article className="vr-doc bg-white shadow-p1-sm print:shadow-none" style={{ color: INK }}>

          {/* ════════════════════════════════════════════════════════ cover */}
          <section className="vr-page px-10 pb-8 pt-0">
            <header className="-mx-10 px-10 py-9 text-white" style={{ background: '#0E2124' }}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg font-p1display text-[21px] font-bold" style={{ background: '#F2B322', color: '#0E2124' }}>V</span>
                <span>
                  <span className="block font-p1display text-[19px] font-bold leading-5 tracking-[-0.02em]">V-RENT</span>
                  <span className="block text-[11px]" style={{ color: '#F2B322' }}>Singapore rental platform</span>
                </span>
              </div>

              <h1 className="mt-10 font-p1display text-[36px] font-bold leading-[1.05] tracking-[-0.028em]">
                Property shortlist
              </h1>
              <p className="mt-2.5 max-w-[46ch] text-[14px] leading-6 text-white/70">
                {chosen.length} propert{chosen.length === 1 ? 'y' : 'ies'} selected
                {forClient ? <> for <strong className="font-semibold text-white">{forClient}</strong></> : null}, with the
                market evidence behind each asking rent.
              </p>

              <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-white/15 pt-6 sm:grid-cols-4">
                {[
                  ['Prepared', printedOn],
                  ['Properties', String(chosen.length)],
                  ['Rent range', summary ? `${sgd(summary.low)} – ${sgd(summary.high)}` : '—'],
                  ['Districts', summary ? summary.districts.map((d) => `D${String(d).padStart(2, '0')}`).join(', ') : '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10px] uppercase tracking-[0.09em] text-white/45">{k}</dt>
                    <dd className="mt-1 text-[13.5px] font-medium leading-snug">{v}</dd>
                  </div>
                ))}
              </dl>
            </header>

            {note && (
              <div className="mt-8 rounded-lg px-5 py-4" style={{ background: WASH, borderLeft: '3px solid #0A5C73' }}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.09em]" style={{ color: MUTED }}>A note from {agentName}</div>
                <p className="mt-1.5 text-[13px] leading-[1.65]">{note}</p>
              </div>
            )}

            {/* Contents, so a client can find the one they liked. */}
            <h2 className="mt-9 text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: MUTED }}>
              In this document
            </h2>
            <table className="mt-3 w-full border-collapse text-left text-[12.5px]">
              <thead>
                <tr>
                  {['#', 'Property', 'District', 'Beds', 'Size', 'Rent'].map((h, i) => (
                    <th
                      key={h}
                      className={cx('py-2 pr-3 text-[10px] font-semibold uppercase tracking-[0.07em]', i > 2 && 'text-right')}
                      style={{ color: MUTED, borderBottom: `1.5px solid ${INK}` }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chosen.map((l, i) => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                    <td className="py-2.5 pr-3 tabular-nums" style={{ color: MUTED }}>{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{l.project}</span>
                      <span style={{ color: MUTED }}> {l.unitNo}</span>
                    </td>
                    <td className="py-2.5 pr-3" style={{ color: MUTED }}>D{String(l.district).padStart(2, '0')}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{l.bedrooms}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{l.sizeSqft.toLocaleString('en-SG')} sqft</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">{sgd(l.monthlyRent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {summary && (
              <p className="mt-4 text-[11.5px] leading-[1.6]" style={{ color: MUTED }}>
                Averaging ${summary.avgPsf.toFixed(2)} per square foot a month across{' '}
                {summary.beds.length === 1 ? `${summary.beds[0]}-bedroom units` : `${summary.beds.join(', ')}-bedroom units`}.
                Every figure is current as at {printedOn} and subject to change.
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-end justify-between gap-6 rounded-lg px-5 py-4" style={{ background: WASH }}>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.09em]" style={{ color: MUTED }}>Prepared by</div>
                <div className="mt-1.5 font-p1display text-[17px] font-bold">{agentName}</div>
                <div className="text-[12.5px]" style={{ color: MUTED }}>{p.agency}</div>
              </div>
              <div className="text-[12.5px] leading-[1.7]" style={{ color: MUTED }}>
                <div>{p.mobile}</div>
                <div className="break-all">{p.email}</div>
                <div>CEA {p.ceaNumber}</div>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════ one page per property */}
          {chosen.map((l, i) => {
            const photos = listingPhotos(user?.id, l);
            const price = priceLabel(l);
            const market = marketPosition(l);
            const amenities = l.amenities ?? [];

            return (
              <PageFrame
                key={l.id}
                page={i + 2}
                total={chosen.length + 2}
                title={`Property ${i + 1} of ${chosen.length}${forClient ? ` · ${forClient}` : ''}`}
                right={l.reference}
                footLeft={footer}
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="min-w-0 flex-1 basis-64">
                    <span
                      className="inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
                      style={{ background: '#0A5C73' }}
                    >
                      {DEAL_LABEL[dealOf(l)]}
                    </span>
                    <h2 className="mt-2 font-p1display text-[23px] font-bold leading-[1.12] tracking-[-0.02em]">
                      {l.project} <span style={{ color: MUTED }}>{l.unitNo}</span>
                    </h2>
                    <p className="mt-1.5 text-[12.5px] leading-[1.6]" style={{ color: MUTED }}>
                      {l.address}, Singapore {l.postalCode}<br />
                      District {String(l.district).padStart(2, '0')} · {districtName(l.district)} · {l.propertyType}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-p1display text-[28px] font-bold leading-none tabular-nums">
                      {price.amount}
                      {price.suffix && <span className="text-[12px] font-normal" style={{ color: MUTED }}> {price.suffix}</span>}
                    </div>
                    <div className="mt-1 text-[11.5px]" style={{ color: MUTED }}>{psf(l)}</div>
                  </div>
                </div>

                {/* ------------------------------------------ photographs */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="col-span-2 overflow-hidden rounded-lg" style={{ border: `1px solid ${RULE}` }}>
                    {photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- our own route, fixed size, must print
                      <img src={photos[0]} alt={`${l.project} ${l.unitNo}`} className="h-[164px] w-full object-cover" />
                    ) : (
                      <PropertyImage seed={l.reference + l.project} variant={0} rounded="rounded-none" className="h-[164px] w-full object-cover" alt="" />
                    )}
                  </div>
                  <div className="grid gap-2">
                    {[1, 2].map((n) => (
                      <div key={n} className="overflow-hidden rounded-lg" style={{ border: `1px solid ${RULE}` }}>
                        {photos[n] ? (
                          // eslint-disable-next-line @next/next/no-img-element -- our own route, fixed size, must print
                          <img src={photos[n]} alt={`${l.project} photograph ${n + 1}`} className="h-[78px] w-full object-cover" />
                        ) : (
                          <PropertyImage seed={l.reference + l.project} variant={n} rounded="rounded-none" className="h-[78px] w-full object-cover" alt="" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {photos.length > 3 && (
                  <p className="mt-1.5 text-[10.5px]" style={{ color: MUTED }}>
                    {photos.length - 3} further photograph{photos.length - 3 === 1 ? '' : 's'} available on request.
                  </p>
                )}

                {/* ------------------------------------------ facts and map */}
                <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 216px' }}>
                  <div className="min-w-0">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: MUTED }}>The unit</h3>
                    <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-2.5">
                      <Fact icon={Bed} label="Bedrooms" value={String(l.bedrooms)} />
                      <Fact icon={Bath} label="Bathrooms" value={String(l.bathrooms)} />
                      <Fact icon={Maximize} label="Floor area" value={`${l.sizeSqft.toLocaleString('en-SG')} sqft`} />
                      <Fact icon={Sofa} label="Furnishing" value={l.furnishing} />
                      <Fact icon={CalendarDays} label="Available from" value={sgDate(l.availableFrom)} />
                      <Fact icon={KeyRound} label="Minimum lease" value={`${l.minLeaseMonths} months`} />
                      {l.tenure && <Fact icon={FileText} label="Tenure" value={l.tenure} />}
                      {l.builtYear && <Fact icon={Building2} label="Completed" value={String(l.builtYear)} />}
                      {l.nearestMrt && <Fact icon={TrainFront} label="Nearest MRT" value={l.nearestMrt} />}
                      {l.depositMonths && <Fact icon={Ruler} label="Deposit" value={`${l.depositMonths} month${l.depositMonths === 1 ? '' : 's'}`} />}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: MUTED }}>Where it is</h3>
                    {l.lat !== undefined && l.lng !== undefined ? (
                      <figure className="mt-2.5 overflow-hidden rounded-lg" style={{ border: `1px solid ${RULE}` }}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- proxied from OneMap, must print */}
                        <img
                          src={`/api/phase1/map?lat=${l.lat}&lng=${l.lng}&w=448&h=320`}
                          alt={`Map showing ${l.project}`}
                          className="h-[120px] w-full object-cover"
                        />
                        <figcaption className="px-2.5 py-1.5 text-[9.5px]" style={{ color: MUTED, borderTop: `1px solid ${RULE}`, background: WASH }}>
                          OneMap · Singapore Land Authority
                        </figcaption>
                      </figure>
                    ) : (
                      <p className="mt-2.5 rounded-lg px-3 py-2.5 text-[11.5px] leading-[1.5]" style={{ background: WASH, color: MUTED }}>
                        This address has not been matched to a point on the map.
                      </p>
                    )}
                    <p className="mt-2 inline-flex items-start gap-1.5 text-[10.5px] leading-[1.5]" style={{ color: MUTED }}>
                      <MapPin size={11} className="mt-[2px] shrink-0" aria-hidden />
                      {l.address}, Singapore {l.postalCode}
                    </p>
                  </div>
                </div>

                {/* ------------------------------------------- description */}
                {l.description && (
                  <section className="vr-block mt-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: MUTED }}>About this property</h3>
                    <p className="mt-1.5 max-w-[78ch] text-[12.5px] leading-[1.65]">{l.description}</p>
                  </section>
                )}

                {amenities.length > 0 && (
                  <section className="vr-block mt-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: MUTED }}>Amenities</h3>
                    <ul className="mt-2 flex flex-wrap gap-x-2 gap-y-1.5">
                      {amenities.map((a) => (
                        <li key={a} className="rounded-full px-2.5 py-1 text-[11px]" style={{ background: WASH, color: INK }}>{a}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* ----------------------------------------- market position */}
                {market && <MarketSection market={market} />}
              </PageFrame>
            );
          })}

          {/* ══════════════════════════════════════════════════ closing page */}
          <PageFrame
            page={chosen.length + 2}
            total={chosen.length + 2}
            title={`Property shortlist${forClient ? ` · ${forClient}` : ''}`}
            right={printedOn}
            footLeft={footer}
          >
            <h2 className="font-p1display text-[24px] font-bold leading-tight tracking-[-0.02em]">What happens next</h2>

            <ol className="mt-5 grid gap-4">
              {[
                ['Tell your agent which ones you want to see', 'Reply with the numbers from the contents page. Viewings run about twenty minutes each and three in an afternoon is comfortable.'],
                ['Bring what a landlord will ask for', 'Passport or NRIC, employment pass where applicable, and a recent payslip or letter of employment. Having these ready is what separates an offer accepted from an offer considered.'],
                ['Make an offer in writing', 'A Letter of Intent with a good-faith deposit of one month, which is credited against the security deposit once the tenancy agreement is signed.'],
                ['Sign and hand over', 'Stamp duty is payable to IRAS within fourteen days of signing. Your agent will walk you through the inventory list at handover.'],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums text-white"
                    style={{ background: '#0A5C73' }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-[13.5px] font-semibold">{title}</div>
                    <p className="mt-1 max-w-[76ch] text-[12.5px] leading-[1.65]" style={{ color: MUTED }}>{body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <section className="vr-block mt-8 rounded-lg px-5 py-4" style={{ background: WASH }}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: MUTED }}>About the market figures</h3>
              <p className="mt-2 max-w-[80ch] text-[12px] leading-[1.65]">
                Every rent quoted as a comparison comes from lease contracts lodged with the Urban Redevelopment
                Authority, which every private residential tenancy in Singapore must be. Medians are taken over the
                closest available set — the same project and bedroom count where enough contracts exist, the same
                district otherwise — and the basis is stated on each property so a thin sample is never mistaken for a
                broad one. Projections are a straight-line fit over twelve monthly medians and are a direction of
                travel, not a valuation.
              </p>
            </section>

            <footer className="vr-compliance mt-8 rounded-lg px-5 py-4" style={{ border: `1px solid ${RULE}` }}>
              <div className="flex items-center gap-2 text-[12.5px] font-semibold">
                <ShieldCheck size={15} aria-hidden /> Advertised by a CEA-registered salesperson
              </div>
              <p className="mt-2 text-[13px] leading-[1.7]">
                {p.fullName} · {p.ceaNumber} · {p.agency}{p.agencyLicence ? ` (${p.agencyLicence})` : ''}
              </p>
              <p className="mt-2 text-[11px] leading-[1.6]" style={{ color: MUTED }}>
                Singapore advertising rules require the salesperson name, registration number and agency licence number
                on every property advertisement. This registration can be verified on the public register at
                cea.gov.sg. Particulars were correct on {printedOn} and are subject to change without notice; they do
                not form part of any offer or contract.
              </p>
            </footer>
          </PageFrame>
        </article>
      </div>

      {/*
        Print rules.

        The running header and footer are `position: fixed`, which Chrome
        repeats on every sheet — the only way to get a repeating masthead
        without a paginating engine. `print-color-adjust` stops the browser's
        ink-saving default from dropping the dark cover and the badges, which
        would leave white text on white paper.
      */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 16mm 0 18mm;
          }
          .no-print { display: none !important; }
          body { background: #fff !important; }

          .vr-doc {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            box-shadow: none !important;
          }

          /* Each section is exactly one sheet. Fixing the height is what puts
             the strip on the fold rather than immediately under the last
             paragraph, and it makes "one page per property" a guarantee the
             layout can be measured against rather than a hope. */
          .vr-page {
            padding-left: 14mm;
            padding-right: 14mm;
            height: calc(297mm - 16mm - 18mm);
            overflow: hidden;
          }
          .vr-break { break-before: page; page-break-before: always; }
          .vr-block { break-inside: avoid; page-break-inside: avoid; }
          .vr-compliance { break-inside: avoid; }
          img { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
