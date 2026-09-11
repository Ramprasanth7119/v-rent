"use client";

/**
 * The report, as a document.
 *
 * The CSV is for somebody who is going to work on the numbers. This is for
 * somebody who is going to read them — a landlord, a team leader, a compliance
 * officer — and it has to look like a document rather than a screenshot of a
 * table: a masthead, the filters stated so the reader knows what they are
 * looking at, totals, and the CEA compliance block the advertising rules
 * require on anything an agent sends out.
 *
 * It prints to PDF through the browser. Production renders the same markup
 * server-side so a report can be emailed on a schedule with nobody present,
 * which is why the print rules are a stylesheet and not a canvas.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer, ShieldCheck } from 'lucide-react';
import { Button, EmptyState, cx } from '../../../../components/phase1/kit';
import { useDemo, TODAY, preferredName } from '../../../../lib/phase1/DemoContext';
import { sgd } from '../../../../lib/phase1/data';
import { dealOf } from '../../../../lib/phase1/pricing';
import { listingStats } from '../../../../lib/phase1/performance';
import {
  KIND_LABEL, buildTable, describeFilters, filtersFromQuery, reportWindow,
  selectEnquiries, selectListings,
} from '../../../../lib/phase1/reporting';

export default function ReportPrintPage() {
  return (
    <Suspense fallback={null}>
      <Document />
    </Suspense>
  );
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });

function Document() {
  const params = useSearchParams();
  const { state } = useDemo();
  const [ready, setReady] = useState(false);

  const f = useMemo(() => filtersFromQuery(params, TODAY), [params]);
  const listings = useMemo(() => selectListings(state.listings, f, TODAY), [state.listings, f]);
  const enquiries = useMemo(() => selectEnquiries(state.enquiries, listings, f, TODAY), [state.enquiries, listings, f]);
  const table = useMemo(() => buildTable(f, listings, enquiries), [f, listings, enquiries]);

  const p = state.profile;
  const printedOn = fmtDate(TODAY);
  const win = reportWindow(f, TODAY);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 250);
    return () => clearTimeout(t);
  }, []);

  /* The numbers a reader looks for first. Which ones matter depends on the
     report, so each kind states its own rather than everything stating rows. */
  const totals = useMemo(() => {
    if (f.kind === 'enquiries') {
      const answered = enquiries.filter((e) => e.status !== 'new').length;
      return [
        { label: 'Enquiries', value: String(enquiries.length) },
        { label: 'Answered', value: `${answered} of ${enquiries.length}` },
        { label: 'Listings involved', value: String(new Set(enquiries.map((e) => e.listingId)).size) },
      ];
    }
    if (f.kind === 'performance') {
      const views = listings.reduce((n, l) => n + listingStats(l).views30d, 0);
      const enq = listings.reduce((n, l) => n + listingStats(l).enquiries30d, 0);
      return [
        { label: 'Listings', value: String(listings.length) },
        { label: 'Views, 30 days', value: views.toLocaleString('en-SG') },
        { label: 'Enquiries, 30 days', value: String(enq) },
      ];
    }
    const rents = listings.filter((l) => dealOf(l) === 'rent');
    const median = (xs: number[]) => {
      if (!xs.length) return 0;
      const s = [...xs].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)];
    };
    return [
      { label: 'Listings', value: String(listings.length) },
      { label: 'Published', value: String(listings.filter((l) => l.status === 'published').length) },
      { label: 'Median rent', value: rents.length ? sgd(median(rents.map((l) => l.monthlyRent))) : '—' },
    ];
  }, [f.kind, listings, enquiries]);

  if (table.rows.length === 0) {
    return (
      <div className="mx-auto max-w-[820px] px-4 py-10">
        <EmptyState
          title="Nothing matched those filters"
          description="Go back to the report builder, widen the period or clear a filter, and export again."
          action={
            <Link href="/phase1/reports" className="text-[14px] font-medium text-p1-primary underline-offset-4 hover:underline dark:text-p1-info">
              Back to reports
            </Link>
          }
        />
      </div>
    );
  }

  /* A wide table needs a landscape sheet. Narrow ones read better upright, and
     forcing every report to landscape wastes half a page of an A4. */
  const landscape = table.columns.length > 9;

  return (
    <div className="p1 min-h-screen bg-p1-bg">
      <div className="no-print sticky top-0 z-10 border-b border-p1-border bg-p1-surface">
        <div className="mx-auto flex h-14 w-full max-w-[1100px] items-center justify-between gap-3 px-4">
          <Link href="/phase1/reports" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-p1-text-2 hover:text-p1-text">
            <ArrowLeft size={15} aria-hidden /> Back to the report builder
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-p1-text-3">{table.rows.length} rows · {landscape ? 'landscape' : 'portrait'} A4</span>
            <Button leftIcon={<Printer size={16} />} disabled={!ready} onClick={() => window.print()}>
              {ready ? 'Save as PDF' : 'Preparing…'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 print:max-w-none print:p-0">
        <article className="vr-doc rounded-xl border border-p1-border bg-white p-8 text-[#111827] shadow-p1-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-[#0E2124] pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0E2124] font-p1display text-[21px] font-semibold text-white">V</span>
                <span className="font-p1display text-[20px] font-semibold tracking-tight">V-RENT</span>
              </div>
              <h1 className="mt-4 font-p1display text-[26px] font-medium leading-tight">{KIND_LABEL[f.kind]}</h1>
              <p className="mt-1 text-[13.5px] text-[#4B5563]">
                {win ? `${win.from} to ${win.to}` : 'All time'} · prepared {printedOn}
              </p>
            </div>
            <div className="text-right text-[13px] leading-6">
              <div className="text-[15px] font-semibold">{preferredName(p.fullName)}</div>
              <div className="text-[#4B5563]">{p.agency}</div>
              <div className="text-[#4B5563]">{p.mobile}</div>
              <div className="break-all text-[#4B5563]">{p.email}</div>
            </div>
          </header>

          {/* --------------------------------------------------------- totals */}
          <section className="vr-block mt-6 grid gap-4 sm:grid-cols-3">
            {totals.map((t) => (
              <div key={t.label} className="rounded-lg bg-[#F1F5F7] px-4 py-3">
                <div className="text-[12px] font-medium uppercase tracking-wide text-[#6B7280]">{t.label}</div>
                <div className="mt-1 font-p1display text-[22px] font-semibold tabular-nums">{t.value}</div>
              </div>
            ))}
          </section>

          {/* -------------------------------------------------------- filters */}
          <section className="vr-block mt-5 rounded-lg border border-[#E5E7EB] px-4 py-3">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">What this report covers</div>
            <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[#374151]">
              {describeFilters(f, TODAY).map((d) => <li key={d}>{d}</li>)}
            </ul>
          </section>

          {/* ---------------------------------------------------------- table */}
          <section className="mt-6">
            <table className="vr-table w-full border-collapse text-left text-[11.5px]">
              <thead>
                <tr>
                  {table.columns.map((c, i) => (
                    <th
                      key={c}
                      className={cx(
                        'border-b-2 border-[#0E2124] px-2 py-2 align-bottom font-semibold',
                        table.numeric.includes(i) && 'text-right',
                      )}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className={cx('vr-row', i % 2 === 1 && 'bg-[#F7FAFB]')}>
                    {r.map((cell, j) => (
                      <td
                        key={j}
                        className={cx(
                          'border-b border-[#E5E7EB] px-2 py-1.5 align-top',
                          table.numeric.includes(j) ? 'whitespace-nowrap text-right tabular-nums' : '',
                          j === table.columns.length - 1 ? 'max-w-[280px]' : '',
                        )}
                      >
                        {typeof cell === 'number' && table.columns[j].includes('S$')
                          ? sgd(cell)
                          : String(cell === '' || cell === undefined ? '—' : cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ------------------------------------------------------ compliance */}
          <footer className="vr-compliance mt-6 rounded-lg bg-[#F1F5F7] px-5 py-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <ShieldCheck size={15} aria-hidden /> Prepared by a CEA-registered salesperson
            </div>
            <p className="mt-1.5 text-[13.5px] leading-6">
              {p.fullName} · {p.ceaNumber} · {p.agency} ({p.agencyLicence})
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[#6B7280]">
              Singapore advertising rules require the salesperson name, registration number and agency licence number
              on anything an agent sends a client. Verify this registration at cea.gov.sg. The figures were correct on{' '}
              {printedOn} and change as listings do.
            </p>
          </footer>
        </article>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 ${landscape ? 'landscape' : 'portrait'};
            margin: 12mm 10mm 14mm;
          }
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .vr-doc {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Repeat the column headings on every sheet: a table that runs over a
             page break is unreadable without them. */
          .vr-table thead { display: table-header-group; }
          .vr-row { break-inside: avoid; page-break-inside: avoid; }
          .vr-block, .vr-compliance { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
