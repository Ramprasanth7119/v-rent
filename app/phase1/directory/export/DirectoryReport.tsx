"use client";

/**
 * The property directory, printed.
 *
 * An agent who has narrowed the directory to eleven properties around Tiong
 * Bahru needs to hand that to a client, a landlord or a colleague, and a
 * screenshot of a grid is not a document. This is the same eleven properties
 * as a report: what the list is, what it was sorted by, and then one card each
 * with every fact on the listing and the agent who published it.
 *
 * It reads the query from the URL and runs the same `applyDirectory` the
 * screen runs, so what prints is what was on screen. A printed list that
 * quietly differs from the one it came from is worse than no printing.
 *
 * The contact block is the point of the exercise. Unlike the client shortlist,
 * which is about the agent's own properties, this is a list of other people's,
 * and a property nobody can be reached about is not a lead.
 *
 * Laid out through `FlowDocument`, so a long amenity list moves the next
 * property to the next sheet rather than being cut off at the bottom of this
 * one. Same sheets, fonts and print rules as the client report.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '../../../../components/phase1/kit';
import type { MarketListing } from '../../../../lib/phase1/marketplace';
import { districtCode, districtLabel } from '../../../../lib/phase1/districts';
import { floorLabel } from '../../../../lib/phase1/floor';
import { dealOf, priceLabel, psf } from '../../../../lib/phase1/pricing';
import { sgDate, sgDateLong } from '../../../../lib/phase1/format';
import { formatDistance } from '../../../../lib/phase1/nearby';
import {
  applyDirectory, describeQuery, queryFromParams, sortLabel,
} from '../../../../lib/phase1/directory-filter';
import { FlowDocument, type Block, type FlowLayout } from '../../listings/export/flow';
import {
  C, SANS, Body, Eyebrow, Fine, KV, Photo, Section, Table, Title, type Col,
} from '../../listings/export/ui';

/** The columns of the summary table, which is the whole list at a glance. */
const COLS: Col[] = [
  { head: 'Property', width: '30%' },
  { head: 'District', width: '14%' },
  { head: 'Layout', width: '16%' },
  { head: 'Size', align: 'right', width: '12%' },
  { head: 'Price', align: 'right', width: '16%' },
  { head: 'Agent', width: '12%' },
];

function PropertyCard({ m, metres, photo }: { m: MarketListing; metres: number | null; photo?: string }) {
  const l = m.listing;
  const price = priceLabel(l);
  const sale = dealOf(l) === 'sale';

  return (
    <div className="vr-block" style={{ border: `1px solid ${C.rule}`, borderRadius: 6, overflow: 'hidden' }}>
      <div className="grid" style={{ gridTemplateColumns: '150px minmax(0,1fr)' }}>
        <Photo src={photo ?? ''} alt="" className="h-full min-h-[132px] w-full object-cover" />

        <div className="min-w-0 p-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[13px] font-bold leading-tight" style={{ color: C.ink }}>{l.project}</div>
              {/* The storey, never the unit number — the same rule the rest of
                  the product follows. */}
              <div className="mt-0.5 text-[9px]" style={{ color: C.faint }}>
                {l.address}, Singapore {l.postalCode} · {districtCode(l.district)} {districtLabel(l.district)}
                {floorLabel(l) && ` · ${floorLabel(l)}`}
                {metres !== null && ` · ${formatDistance(metres)} away`}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[13px] font-bold tabular-nums" style={{ color: C.brand }}>{price.amount}</div>
              <div className="text-[8.5px]" style={{ color: C.faint }}>{price.suffix || (sale ? 'asking' : '')} · {psf(l)}</div>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-x-5">
            <KV rows={[
              ['Type', l.propertySubtype || l.propertyType],
              ['Layout', `${l.bedrooms} bed · ${l.bathrooms} bath`],
              ['Floor area', `${l.sizeSqft.toLocaleString('en-SG')} sqft`],
              ['Furnishing', l.furnishing === 'Other' ? (l.furnishingNote || 'Other') : l.furnishing],
            ]} labelWidth="46%" />
            <KV rows={[
              ['Available', sgDate(l.availableFrom)],
              ...(sale ? [] : [['Minimum lease', `${l.minLeaseMonths} months`] as [string, string]]),
              ['Nearest MRT', l.nearestMrt || 'Not stated'],
              ['Live since', sgDate(l.publishedAt ?? l.createdAt)],
            ]} labelWidth="46%" />
          </div>

          {(l.amenities?.length || l.fittings?.length) ? (
            <div className="mt-2 text-[8.5px] leading-[1.55]" style={{ color: C.text }}>
              {l.amenities?.length ? <div><span style={{ color: C.faint }}>Facilities: </span>{l.amenities.join(' · ')}</div> : null}
              {l.fittings?.length ? <div><span style={{ color: C.faint }}>In the unit: </span>{l.fittings.join(' · ')}</div> : null}
            </div>
          ) : null}

          {/* Who to ring. Without this the document is a catalogue nobody can
              act on. */}
          <div className="mt-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 pt-2 text-[9px]" style={{ borderTop: `1px solid ${C.rule}` }}>
            <span className="font-bold" style={{ color: C.ink }}>{m.agent.name}</span>
            <span style={{ color: C.text }}>{m.agent.agency}</span>
            {m.agent.mobile && <span className="font-bold tabular-nums" style={{ color: C.brand }}>{m.agent.mobile}</span>}
            {m.agent.email && <span style={{ color: C.faint }}>{m.agent.email}</span>}
            {m.agent.ceaNumber && <span style={{ color: C.faint }}>CEA {m.agent.ceaNumber}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DirectoryReport({
  items, agentLine, preparedBy,
}: {
  items: MarketListing[];
  /** The footer line on every sheet: who printed it. */
  agentLine: string;
  preparedBy: string;
}) {
  const params = useSearchParams();
  const { query, centre } = useMemo(
    () => queryFromParams(new URLSearchParams(params.toString())),
    [params],
  );

  /* `mine` is resolved on the server into the set handed here, so the viewer
     is not needed again — every row in `items` is already allowed. */
  const rows = useMemo(() => applyDirectory(items, query, centre, null), [items, query, centre]);

  const [layout, setLayout] = useState<FlowLayout | null>(null);
  const onLayout = (l: FlowLayout) => setLayout(l);

  const preparedOn = sgDateLong(new Date().toISOString().slice(0, 10));
  const chips = describeQuery(query, centre);
  const frame = {
    brandLine: 'Property directory',
    preparedOn,
    agentLine,
  };

  const blocks: Block[] = useMemo(() => {
    const out: Block[] = [];

    out.push({
      key: 'cover',
      section: 'Directory',
      keepWithNext: true,
      node: (
        <div>
          <Title
            eyebrow="Property directory"
            title={centre ? `Properties near ${centre.label}` : 'Live properties on V-RENT'}
            sub={`${rows.length} ${rows.length === 1 ? 'property' : 'properties'} · ${sortLabel(query.sort, centre !== null)} · prepared ${preparedOn} by ${preparedBy}`}
          />

          <Section label="What this list is" className="mt-6">
            {chips.length ? (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-[3px] px-2 py-[3px] text-[9px] font-semibold"
                    style={{ background: C.brandSoft, color: C.brand }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <Body>Every property currently advertised on V-RENT, with no filters applied.</Body>
            )}
            <Fine className="mt-2">
              Compiled from listings published by their own agents. Prices are asking prices, not transacted prices.
              Unit numbers are never published on V-RENT and do not appear in this document.
            </Fine>
          </Section>
        </div>
      ),
    });

    if (rows.length > 0) {
      out.push({
        key: 'summary',
        section: 'Directory',
        node: (
          <Section label="At a glance">
            <Table
              cols={COLS}
              size={8.5}
              dense
              rows={rows.map(({ m, metres }) => {
                const l = m.listing;
                const p = priceLabel(l);
                return [
                  <span key="p">
                    <span className="font-bold">{l.project}</span>
                    {metres !== null && <span style={{ color: C.faint }}> · {formatDistance(metres)}</span>}
                  </span>,
                  `${districtCode(l.district)} ${districtLabel(l.district)}`,
                  `${l.bedrooms} bd · ${l.bathrooms} ba`,
                  `${l.sizeSqft.toLocaleString('en-SG')} sqft`,
                  `${p.amount}${p.suffix ? ` ${p.suffix}` : ''}`,
                  m.agent.name,
                ];
              })}
            />
          </Section>
        ),
      });
    }

    rows.forEach(({ m, metres }, i) => {
      out.push({
        key: `p-${m.ownerId}-${m.listing.id}`,
        section: 'Properties',
        breakBefore: i === 0,
        node: (
          <div>
            {i === 0 && <Eyebrow className="mb-2">Every property in full</Eyebrow>}
            <PropertyCard m={m} metres={metres} photo={m.thumbs[0] ?? m.photos[0]} />
          </div>
        ),
      });
    });

    return out;
  }, [rows, chips, centre, query.sort, preparedOn, preparedBy]);

  return (
    <div className="min-h-screen bg-p1-bg print:bg-white">
      <div className="no-print sticky top-0 z-10 border-b border-p1-border bg-p1-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/phase1/directory" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-p1-text-2 hover:text-p1-text">
            <ArrowLeft size={15} aria-hidden /> Back to the directory
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-p1-text-3">
              {rows.length} {rows.length === 1 ? 'property' : 'properties'}
              {layout && ` · ${layout.pages} ${layout.pages === 1 ? 'page' : 'pages'}`}
            </span>
            <Button leftIcon={<Printer size={16} />} disabled={!layout} onClick={() => window.print()}>
              {layout ? 'Save as PDF' : 'Preparing…'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1180px] overflow-x-auto px-0 py-6 sm:px-4 print:max-w-none print:overflow-visible print:p-0">
        <article className="vr-doc space-y-4 print:space-y-0" style={{ color: C.ink, fontFamily: SANS }}>
          <FlowDocument blocks={blocks} frame={frame} onLayout={onLayout} />
        </article>
      </div>
    </div>
  );
}
