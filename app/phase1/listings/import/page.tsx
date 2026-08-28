"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { PageHead, SpecNote } from '../../../../components/phase1/bits';
import { useDemo } from '../../../../lib/phase1/DemoContext';
import { sgd } from '../../../../lib/phase1/data';
import { Upload, Check, AlertTriangle, X, FileSpreadsheet } from 'lucide-react';

interface Row {
  postal: string;
  unit: string;
  project: string;
  beds: number;
  sqft: number;
  rent: number;
  status: 'ok' | 'warn' | 'error';
  message?: string;
}

/** A fixed sample file, so the demo shows the same outcomes every time. */
const PARSED: Row[] = [
  { postal: '018987', unit: '#22-06', project: 'The Sail @ Marina Bay', beds: 2, sqft: 883, rent: 6500, status: 'ok' },
  { postal: '119003', unit: '#21-11', project: 'Normanton Park', beds: 3, sqft: 1109, rent: 5800, status: 'ok' },
  { postal: '541118', unit: '#12-330', project: 'Rivervale Delta', beds: 3, sqft: 1001, rent: 3300, status: 'ok' },
  { postal: '428407', unit: '#08-02', project: 'The Continuum', beds: 2, sqft: 764, rent: 5200, status: 'ok' },
  {
    postal: '018987', unit: '#34-12', project: 'The Sail @ Marina Bay', beds: 2, sqft: 936, rent: 6800,
    status: 'warn', message: 'You already have a published listing for this unit — import will create a draft',
  },
  {
    postal: '99999', unit: '#03-01', project: 'Unknown', beds: 2, sqft: 700, rent: 3800,
    status: 'error', message: 'Postal code not found in OneMap — row skipped',
  },
  {
    postal: '650123', unit: '', project: 'Blk 123 Bukit Batok', beds: 4, sqft: 1184, rent: 0,
    status: 'error', message: 'Missing unit number and monthly rent — row skipped',
  },
];

export default function ImportPage() {
  const router = useRouter();
  const { addListing, state, listingLimit, activeListings } = useDemo();
  const [stage, setStage] = useState<'upload' | 'preview' | 'done'>('upload');

  const ok = PARSED.filter((r) => r.status === 'ok');
  const warn = PARSED.filter((r) => r.status === 'warn');
  const bad = PARSED.filter((r) => r.status === 'error');
  const importable = ok.length + warn.length;
  const remaining = Math.max(0, listingLimit - activeListings);
  const exceeds = importable > remaining && listingLimit > 0;

  const runImport = () => {
    [...ok, ...warn].forEach((r, i) => {
      addListing({
        id: `imp-${i}-${Math.random().toString(36).slice(2, 6)}`,
        reference: `VR-${24200 + i}`,
        project: r.project,
        address: r.project,
        postalCode: r.postal,
        unitNo: r.unit,
        district: 1,
        propertyType: 'Condominium',
        bedrooms: r.beds,
        bathrooms: 2,
        sizeSqft: r.sqft,
        monthlyRent: r.rent,
        availableFrom: '2026-10-01',
        minLeaseMonths: 12,
        furnishing: 'Partially furnished',
        status: 'draft',
        images: 0,
        createdAt: '2026-08-28',
      });
    });
    setStage('done');
  };

  return (
    <>
      <PageHead
        module="M12 · Listing Management"
        title="Bulk import"
        blurb="Added after the competitive review. An agent already carrying thirty listings elsewhere will not retype them, which makes this the single biggest barrier to switching."
      />

      {stage === 'upload' && (
        <>
          <Card>
            <button
              onClick={() => setStage('preview')}
              className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 transition-colors hover:border-brand-gold/50 hover:bg-brand-gold/5"
            >
              <Upload size={24} className="mb-3 text-neutral-400" />
              <span className="text-sm font-medium text-foreground">Drop a CSV file, or click to select</span>
              <span className="mt-1 text-xs text-neutral-500">Up to 500 rows per file</span>
            </button>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-neutral-50 px-3.5 py-3 dark:bg-neutral-950/40">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet size={16} className="text-neutral-400" />
                <div>
                  <div className="text-xs font-medium text-foreground">Column template</div>
                  <div className="font-mono text-[10px] text-neutral-500">
                    postal_code, unit_no, project, bedrooms, bathrooms, sqft, monthly_rent, furnishing, available_from, description
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline">Download template</Button>
            </div>
          </Card>

          <Card className="mt-4 border-amber-300/50 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                Import accepts data the agent supplies for their <strong>own</strong> listings. It does not
                pull data from a competing portal — scraping those platforms would breach their terms, and
                that boundary is written into the specification.
              </p>
            </div>
          </Card>
        </>
      )}

      {stage === 'preview' && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <Card className="py-3"><div className="text-[11px] uppercase tracking-wider text-neutral-500">Rows parsed</div><div className="mt-1 text-xl font-semibold tabular-nums text-foreground">{PARSED.length}</div></Card>
            <Card className="py-3"><div className="text-[11px] uppercase tracking-wider text-neutral-500">Ready</div><div className="mt-1 text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{ok.length}</div></Card>
            <Card className="py-3"><div className="text-[11px] uppercase tracking-wider text-neutral-500">Warnings</div><div className="mt-1 text-xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">{warn.length}</div></Card>
            <Card className="py-3"><div className="text-[11px] uppercase tracking-wider text-neutral-500">Skipped</div><div className="mt-1 text-xl font-semibold tabular-nums text-red-600 dark:text-red-400">{bad.length}</div></Card>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-neutral-50/60 text-[11px] uppercase tracking-wider text-neutral-500 dark:bg-neutral-950/30">
                    <th className="px-4 py-3 font-semibold">Row</th>
                    <th className="px-4 py-3 font-semibold">Property</th>
                    <th className="px-4 py-3 font-semibold">Unit</th>
                    <th className="px-4 py-3 font-semibold">Rent</th>
                    <th className="px-4 py-3 font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PARSED.map((r, i) => (
                    <tr key={i} className={r.status === 'error' ? 'opacity-60' : ''}>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-400 tabular-nums">{i + 2}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium text-foreground">{r.project}</div>
                        <div className="font-mono text-[11px] text-neutral-500">S({r.postal})</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{r.unit || '—'}</td>
                      <td className="px-4 py-3 text-xs tabular-nums text-foreground">{r.rent ? sgd(r.rent) : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                            r.status === 'ok' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : r.status === 'warn' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'}`}>
                            {r.status === 'ok' ? <Check size={9} strokeWidth={3} /> : r.status === 'warn' ? <AlertTriangle size={9} /> : <X size={9} strokeWidth={3} />}
                          </span>
                          <span className="text-[11px] leading-snug text-neutral-600 dark:text-neutral-400">
                            {r.message ?? 'Validated'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                {importable} listings will be created as <strong>drafts</strong>. Quota is consumed only
                when each one is published, and every row still passes the same publish gate.
                {listingLimit > 0 && (
                  <> You have {remaining} of {listingLimit} slots free on {state.plan?.name}.</>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStage('upload')}>Choose another file</Button>
                <Button variant="gold" onClick={runImport}>Import {importable} listings</Button>
              </div>
            </div>
            {exceeds && (
              <p className="mt-3 text-[11px] text-amber-600 dark:text-amber-400">
                Importing more than the remaining quota is allowed — the excess simply stays in draft
                until quota frees up or the plan is upgraded.
              </p>
            )}
          </Card>
        </>
      )}

      {stage === 'done' && (
        <Card className="py-10 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Check size={20} strokeWidth={3} />
          </div>
          <div className="text-sm font-semibold text-foreground">{importable} listings imported as drafts</div>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            {bad.length} row{bad.length === 1 ? ' was' : 's were'} skipped and a per-row error report has
            been emailed. Add photographs to each draft, then publish.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="gold" onClick={() => router.push('/phase1/listings')}>View my listings</Button>
            <Button variant="outline" onClick={() => setStage('upload')}>Import another file</Button>
          </div>
        </Card>
      )}

      <SpecNote>
        Every imported row passes through the same validation and the same publish gate as a manually
        created listing, and consumes quota identically. A dry-run preview before anything is written is
        what keeps a mistyped column from creating fifty bad listings.
      </SpecNote>
    </>
  );
}
