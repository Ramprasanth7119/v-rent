"use client";

import { useRef, useState } from 'react';
import {
  Button, LinkButton, Card, SectionCard, PageHeader, StatCard, Callout, DataTable, Column, EmptyState } from '../../../../components/phase1/kit';
import { Pill } from '../../../../components/phase1/status';
import { ConfirmDialog } from '../../../../components/phase1/overlays';
import { useToast } from '../../../../components/phase1/Toast';
import { useDemo, preferredName, TODAY_ISO } from '../../../../lib/phase1/DemoContext';
import { DemoListing, sgd } from '../../../../lib/phase1/data';
import { CsvRow, readRows, toNumber } from '../../../../lib/phase1/csv';
import { districtFromPostal } from '../../../../lib/phase1/onemap';
import { normaliseDeal } from '../../../../lib/phase1/pricing';
import { Upload, Check, AlertTriangle, X, FileSpreadsheet, Download, CheckCircle2, ListChecks, FilePlus2 } from 'lucide-react';

interface Row {
  postal: string;
  unit: string;
  project: string;
  address: string;
  beds: number;
  baths: number;
  sqft: number;
  rent: number;
  deal: 'rent' | 'sale';
  salePrice: number;
  furnishing: DemoListing['furnishing'];
  availableFrom: string;
  description: string;
  district: number;
  status: 'ok' | 'warn' | 'error';
  message?: string;
}

const FURNISHINGS: DemoListing['furnishing'][] = ['Unfurnished', 'Partially furnished', 'Fully furnished'];

/**
 * Turn one spreadsheet row into something that can become a listing, or say
 * why it cannot.
 *
 * Warnings import; errors do not. The line between them is whether the row can
 * produce a listing an agent would recognise: a missing rent cannot, a unit
 * they have already listed can — as a draft they can compare.
 */
function assess(row: CsvRow, existing: DemoListing[]): Row {
  const postal = (row.postal ?? '').replace(/\D/g, '');
  const unit = (row.unit ?? '').trim();
  const deal = /sale|sell|buy/i.test(row.deal ?? '') ? 'sale' : 'rent';
  const rent = toNumber(row.rent);
  const salePrice = toNumber(row.salePrice);
  const price = deal === 'sale' ? salePrice : rent;

  const furnishing = FURNISHINGS.find((f) => f.toLowerCase() === (row.furnishing ?? '').trim().toLowerCase())
    ?? 'Partially furnished';

  const base: Row = {
    postal,
    unit: unit ? `#${unit.replace(/^#/, '')}` : '',
    project: (row.project ?? '').trim() || (row.address ?? '').trim(),
    address: (row.address ?? '').trim() || (row.project ?? '').trim(),
    beds: toNumber(row.beds),
    baths: toNumber(row.baths) || 1,
    sqft: toNumber(row.sqft),
    rent,
    deal,
    salePrice,
    furnishing,
    availableFrom: (row.availableFrom ?? '').trim() || '2026-10-01',
    description: (row.description ?? '').trim(),
    district: districtFromPostal(postal),
    status: 'ok',
  };

  const missing: string[] = [];
  if (postal.length !== 6) missing.push('a six-digit postal code');
  if (!base.unit) missing.push('a unit number');
  if (!price) missing.push(deal === 'sale' ? 'an asking price' : 'a monthly rent');
  if (!base.sqft) missing.push('a floor area');

  if (missing.length) {
    return { ...base, status: 'error', message: `Missing ${missing.join(', ')} — row skipped` };
  }
  if (!base.district) {
    return { ...base, status: 'error', message: `${postal} is not a Singapore postal sector — row skipped` };
  }

  const clash = existing.find(
    (l) => !l.archived && l.postalCode === postal && l.unitNo.replace(/[\s#]/g, '') === base.unit.replace(/[\s#]/g, ''),
  );
  if (clash) {
    return { ...base, status: 'warn', message: `You already have ${clash.reference} for this unit — this will import as a separate draft` };
  }

  return base;
}

const COLUMNS = ['postal_code', 'unit_no', 'project', 'bedrooms', 'bathrooms', 'sqft', 'monthly_rent', 'furnishing', 'available_from', 'description'];

export default function ImportPage() {
  const { push } = useToast();
  const { addListing, state, listingLimit, activeListings } = useDemo();
  const [stage, setStage] = useState<'upload' | 'preview' | 'done'>('upload');
  const [confirm, setConfirm] = useState(false);
  const [parsed, setParsed] = useState<Row[]>([]);
  const [fileName, setFileName] = useState('');
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [readError, setReadError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  /** Read the file the agent chose, in the browser. Nothing is sent anywhere. */
  const takeFile = async (file: File | undefined) => {
    if (!file) return;
    setReadError(null);
    if (file.size > 2 * 1024 * 1024) {
      setReadError('That file is over 2 MB. A listing spreadsheet is text — check it is a CSV rather than a workbook.');
      return;
    }
    try {
      const { rows, mapping, columns } = readRows(await file.text());
      if (rows.length === 0) {
        setReadError('There are no rows under the heading line.');
        return;
      }
      if (mapping.postal === undefined || mapping.unit === undefined) {
        setReadError('The heading line has no postal code or unit column. Use the template below and try again.');
        return;
      }
      const known = new Set(Object.values(mapping));
      setUnmapped(columns.filter((_, i) => !known.has(i)));
      setParsed(rows.slice(0, 500).map((r) => assess(r, state.listings)));
      setFileName(file.name);
      setStage('preview');
    } catch {
      setReadError('That file could not be read as CSV.');
    }
  };

  const ok = parsed.filter((r) => r.status === 'ok');
  const warn = parsed.filter((r) => r.status === 'warn');
  const bad = parsed.filter((r) => r.status === 'error');
  const importable = ok.length + warn.length;
  const remaining = Math.max(0, listingLimit - activeListings);
  const exceeds = importable > remaining && listingLimit > 0;

  const runImport = () => {
    setConfirm(false);
    [...ok, ...warn].forEach((r, i) => {
      addListing(normaliseDeal({
        id: `imp-${i}-${Math.random().toString(36).slice(2, 6)}`,
        reference: `VR-${24200 + i}`,
        agent: preferredName(state.profile.fullName),
        project: r.project,
        address: r.address,
        postalCode: r.postal,
        unitNo: r.unit,
        district: r.district,
        propertyType: 'Condominium',
        dealType: r.deal,
        bedrooms: r.beds,
        bathrooms: r.baths,
        sizeSqft: r.sqft,
        monthlyRent: r.rent,
        salePriceSgd: r.deal === 'sale' ? r.salePrice : undefined,
        description: r.description || undefined,
        availableFrom: r.availableFrom,
        minLeaseMonths: 12,
        furnishing: r.furnishing,
        status: 'draft',
        images: 0,
        createdAt: TODAY_ISO,
      }));
    });
    push({ tone: 'success', title: `${importable} drafts created`, body: 'Add photos to each draft, then publish.' });
    setStage('done');
  };

  const result = (r: Row) => {
    const map = {
      ok: { tone: 'success' as const, Icon: Check, text: 'Ready' },
      warn: { tone: 'warning' as const, Icon: AlertTriangle, text: 'Warning' },
      error: { tone: 'danger' as const, Icon: X, text: 'Skipped' },
    }[r.status];
    return (
      <div className="flex flex-col items-start gap-1">
        <Pill tone={map.tone}><map.Icon size={12} strokeWidth={2.5} className="mr-1" aria-hidden />{map.text}</Pill>
        {r.message && <span className="text-[13px] leading-5 text-p1-text-2">{r.message}</span>}
      </div>
    );
  };

  const columns: Column<Row & { i: number }>[] = [
    { key: 'row', header: 'Row', width: '64px', render: (r) => <span className="font-mono text-[13px] tabular-nums text-p1-text-3">{r.i + 2}</span> },
    { key: 'property', header: 'Property', render: (r) => <><div className="text-[14px] font-medium text-p1-text">{r.project}</div><div className="font-mono text-[13px] text-p1-text-3">S({r.postal})</div></> },
    { key: 'unit', header: 'Unit', render: (r) => <span className="font-mono text-[14px]">{r.unit || '—'}</span> },
    { key: 'rent', header: 'Rent', align: 'right', render: (r) => <span className="tabular-nums">{r.rent ? sgd(r.rent) : '—'}</span> },
    { key: 'result', header: 'Result', render: result },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Listings', href: '/phase1/listings' }, { label: 'Bulk import' }]}
        eyebrow="Listings"
        title="Bulk import"
        description="Bringing a portfolio across from another portal? Upload a spreadsheet and we will create a draft for every valid row."
      />

      {stage === 'upload' && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <Card>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); void takeFile(e.dataTransfer.files[0]); }}
              >
                <button type="button" onClick={() => input.current?.click()}
                  className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-p1-border-strong bg-p1-subtle/40 px-4 py-14 text-center transition-colors hover:border-p1-primary hover:bg-p1-primary-soft/60 cursor-pointer">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-p1-primary-soft text-p1-primary" aria-hidden><Upload size={26} /></span>
                  <span className="mt-4 text-[16px] font-semibold text-p1-text">Drag your CSV here, or choose a file</span>
                  <span className="mt-1 text-[13px] text-p1-text-3">
                    Up to 500 rows · read in your browser · nothing is created until you confirm
                  </span>
                </button>
                <input
                  ref={input}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => { void takeFile(e.target.files?.[0]); e.target.value = ''; }}
                />
              </div>

              {readError && (
                <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-lg border border-p1-danger-border bg-p1-danger-soft px-3.5 py-2.5 text-[13.5px] text-p1-text">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-p1-danger" aria-hidden />
                  {readError}
                </div>
              )}
            </Card>

            <SectionCard title="Column template" description="Use these column headings, in any order." icon={<FileSpreadsheet size={17} />}
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download size={15} />}
                  onClick={() => {
                    // A file with the headings and one filled row, so the shape
                    // is obvious without reading anything.
                    const csv = [
                      COLUMNS.join(','),
                      '018987,22-06,The Sail @ Marina Bay,2,2,883,6500,Partially furnished,2026-10-01,Bright high-floor unit',
                    ].join('\n');
                    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'v-rent-listing-template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download template
                </Button>
              }>
              <div className="flex flex-wrap gap-2">{COLUMNS.map((c) => <Pill key={c} className="font-mono">{c}</Pill>)}</div>
            </SectionCard>
          </div>

          <SectionCard title="How import works" padding="sm">
            <ol className="space-y-4">
              {[
                { Icon: Upload, t: 'Upload', d: 'Choose a CSV exported from your own records.' },
                { Icon: ListChecks, t: 'Check', d: 'Every row is validated against the address register and your quota. Nothing is written yet.' },
                { Icon: FilePlus2, t: 'Create drafts', d: 'Valid rows become drafts. Add photos, then publish each one.' },
              ].map((s, i) => (
                <li key={s.t} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-p1-subtle text-p1-primary dark:text-p1-info" aria-hidden><s.Icon size={17} /></span>
                  <div>
                    <div className="text-[14px] font-semibold text-p1-text">{i + 1}. {s.t}</div>
                    <div className="mt-0.5 text-[13px] leading-5 text-p1-text-2">{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      )}

      {stage === 'preview' && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[15px] font-semibold text-p1-text">
                <FileSpreadsheet size={16} className="text-p1-text-3" aria-hidden />
                <span className="truncate">{fileName}</span>
              </div>
              {unmapped.length > 0 && (
                <p className="mt-1 text-[13px] leading-5 text-p1-text-3">
                  {/* Said rather than silently dropped: a column an agent
                      carefully filled in and that goes nowhere is worth a line. */}
                  Ignored {unmapped.length === 1 ? 'one column' : `${unmapped.length} columns`} we do not recognise:{' '}
                  {unmapped.slice(0, 6).join(', ')}{unmapped.length > 6 ? '…' : ''}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => { setStage('upload'); setParsed([]); }}>
              Choose a different file
            </Button>
          </div>

          <div className="vr-stagger mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Rows found" value={parsed.length} />
            <StatCard label="Ready" value={ok.length} tone="success" />
            <StatCard label="Warnings" value={warn.length} tone="warning" hint="Will still import" />
            <StatCard label="Skipped" value={bad.length} tone="danger" hint="Fix and re-upload" />
          </div>

          <DataTable<Row & { i: number }>
            columns={columns}
            rows={parsed.map((r, i) => ({ ...r, i }))}
            rowKey={(r) => String(r.i)}
            caption="Import preview"
            minWidth={680}
            rowClassName={(r) => (r.status === 'error' ? 'opacity-70' : '')}
          />

          <Callout tone="info" className="mt-5" title={`${importable} listings will be created as drafts`}
            action={
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setStage('upload')}>Choose another file</Button>
                <Button variant="primary" onClick={() => setConfirm(true)}>Import {importable} listings</Button>
              </div>
            }>
            A slot on your plan is used only when a draft is published, and each one passes the same checks as a listing you create by hand.
            {listingLimit > 0 && <> You have {remaining} of {listingLimit} slots free on {state.plan?.name}.</>}
            {exceeds && <> Importing more than the free slots is fine — the extra drafts wait until a slot frees up or you upgrade.</>}
          </Callout>

          <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={runImport}
            title={`Import ${importable} listings as drafts?`}
            description={`${bad.length} skipped row${bad.length === 1 ? '' : 's'} will be listed in an error report emailed to you.`}
            confirmLabel="Create drafts" />
        </>
      )}

      {stage === 'done' && (
        <Card>
          <EmptyState icon={<CheckCircle2 size={28} className="text-p1-success" />}
            title={`${importable} listings imported as drafts`}
            description={`${bad.length} row${bad.length === 1 ? ' was' : 's were'} skipped and a per-row error report has been emailed to you. Add photos to each draft, then publish.`}
            action={<>
              <LinkButton href="/phase1/listings" variant="primary">View my listings</LinkButton>
              <Button variant="outline" onClick={() => setStage('upload')}>Import another file</Button>
            </>} />
        </Card>
      )}

    </>
  );
}
