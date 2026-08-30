"use client";

import { useState } from 'react';
import {
  Button, LinkButton, Card, SectionCard, PageHeader, StatCard, Callout, DataTable, Column, EmptyState, PresenterNote,
} from '../../../../components/phase1/kit';
import { Pill } from '../../../../components/phase1/status';
import { ConfirmDialog } from '../../../../components/phase1/overlays';
import { useToast } from '../../../../components/phase1/Toast';
import { useDemo } from '../../../../lib/phase1/DemoContext';
import { sgd } from '../../../../lib/phase1/data';
import { Upload, Check, AlertTriangle, X, FileSpreadsheet, Download, CheckCircle2, ListChecks, FilePlus2 } from 'lucide-react';

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

const COLUMNS = ['postal_code', 'unit_no', 'project', 'bedrooms', 'bathrooms', 'sqft', 'monthly_rent', 'furnishing', 'available_from', 'description'];

export default function ImportPage() {
  const { push } = useToast();
  const { addListing, state, listingLimit, activeListings } = useDemo();
  const [stage, setStage] = useState<'upload' | 'preview' | 'done'>('upload');
  const [confirm, setConfirm] = useState(false);

  const ok = PARSED.filter((r) => r.status === 'ok');
  const warn = PARSED.filter((r) => r.status === 'warn');
  const bad = PARSED.filter((r) => r.status === 'error');
  const importable = ok.length + warn.length;
  const remaining = Math.max(0, listingLimit - activeListings);
  const exceeds = importable > remaining && listingLimit > 0;

  const runImport = () => {
    setConfirm(false);
    [...ok, ...warn].forEach((r, i) => {
      addListing({
        id: `imp-${i}-${Math.random().toString(36).slice(2, 6)}`,
        reference: `VR-${24200 + i}`,
        agent: state.profile.fullName,
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
              <button type="button" onClick={() => setStage('preview')}
                className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-p1-border-strong bg-p1-subtle/40 px-4 py-14 text-center transition-colors hover:border-p1-accent hover:bg-p1-accent-soft/40 cursor-pointer">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-p1-primary-soft text-p1-primary" aria-hidden><Upload size={26} /></span>
                <span className="mt-4 text-[16px] font-semibold text-p1-text">Drag your CSV here or browse</span>
                <span className="mt-1 text-[13px] text-p1-text-3">Up to 500 rows per file · nothing is created until you confirm</span>
                <Pill className="mt-4">Prototype: click loads a sample file</Pill>
              </button>
            </Card>

            <SectionCard title="Column template" description="Use these column headings, in any order." icon={<FileSpreadsheet size={17} />}
              actions={<Button variant="outline" size="sm" leftIcon={<Download size={15} />}>Download template</Button>}>
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
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-p1-subtle text-p1-accent-text" aria-hidden><s.Icon size={17} /></span>
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
          <div className="vr-stagger mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Rows found" value={PARSED.length} />
            <StatCard label="Ready" value={ok.length} tone="success" />
            <StatCard label="Warnings" value={warn.length} tone="warning" hint="Will still import" />
            <StatCard label="Skipped" value={bad.length} tone="danger" hint="Fix and re-upload" />
          </div>

          <DataTable<Row & { i: number }>
            columns={columns}
            rows={PARSED.map((r, i) => ({ ...r, i }))}
            rowKey={(r) => String(r.i)}
            caption="Import preview"
            minWidth={680}
            rowClassName={(r) => (r.status === 'error' ? 'opacity-70' : '')}
          />

          <Callout tone="info" className="mt-5" title={`${importable} listings will be created as drafts`}
            action={
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setStage('upload')}>Choose another file</Button>
                <Button variant="accent" onClick={() => setConfirm(true)}>Import {importable} listings</Button>
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
              <LinkButton href="/phase1/listings" variant="accent">View my listings</LinkButton>
              <Button variant="outline" onClick={() => setStage('upload')}>Import another file</Button>
            </>} />
        </Card>
      )}

      <PresenterNote>
        Bulk import was added after the competitive review: an agent already carrying thirty listings elsewhere will not retype them,
        which makes this the single biggest barrier to switching. Import accepts data the agent supplies for their <strong>own</strong>
        listings — it does not scrape competing portals, which would breach their terms; that boundary is written into the specification.
        Every imported row passes through the same validation and publish gate as a manual listing, and the dry-run preview is what keeps
        a mistyped column from creating fifty bad listings.
      </PresenterNote>
    </>
  );
}
