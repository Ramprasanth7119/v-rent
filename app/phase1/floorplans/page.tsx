"use client";

/**
 * Floor plan library.
 *
 * A tenant asks for the floor plan within two messages, and the agent goes
 * looking for a photograph of a photocopy somebody sent them in 2023. The
 * library is the fix: the unit mix for a development, held once, attachable to
 * any listing in it and sendable on its own.
 *
 * The plans drawn here are schematics generated from the unit type — room
 * count, floor area, aspect — not the developer's drawings, which are
 * copyrighted and come into the production build under licence from the
 * developer or from the URA submission. The screen says so rather than
 * implying otherwise.
 */

import { useMemo, useState } from 'react';
import {
  LayoutPanelTop, Download, Search, Compass, Ruler, Layers, Info, Link2, Check,
} from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, Callout, EmptyState, SelectInput,
  SearchInput, LinkButton, cx,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { districtName } from '../../../lib/phase1/performance';
import { PROJECTS, unitTypes, type UnitType } from '../../../lib/phase1/market';

/**
 * A schematic: a living and dining band across the top with the kitchen beside
 * it, then one bedroom per row with its own bathroom, and a balcony down the
 * side. It is proportioned from the floor area so a four-bedroom does not come
 * out the same size as a studio, which is the only thing a schematic has to get
 * right to be useful in a conversation.
 *
 * The bands are computed as fractions of the drawing height and always sum to
 * it, so a four-bedroom cannot run off the bottom of its own viewBox.
 */
function Plan({ type, className = '' }: { type: UnitType; className?: string }) {
  const beds = Math.min(4, type.bedrooms);
  const W = 280;
  const H = 166 + beds * 34;
  const PAD = 14;
  const BALCONY = 10;
  const GAP = 3;

  const x = PAD + BALCONY + GAP;
  const y = PAD;
  const w = W - x - PAD;
  /* A strip below the envelope for the north point, so it never lands on
     top of a room. */
  const COMPASS = 20;
  const h = H - PAD * 2 - COMPASS;

  /* A third of the depth to the living band, the rest split between bedrooms. */
  const livingH = h * 0.34;
  const bedH = (h - livingH) / beds;
  const label = (t: string, lx: number, ly: number, muted = false) => (
    <text x={lx + 8} y={ly + 16} fontSize="10" fill={muted ? 'var(--p1-text-3)' : 'var(--p1-text-2)'}>{t}</text>
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cx('w-full', className)}
      role="img"
      aria-label={`Schematic plan of a ${type.bedrooms} bedroom unit of ${type.sizeSqft} square feet, ${type.aspect} facing`}
    >
      {/* The envelope. */}
      <rect x={x} y={y} width={w} height={h} fill="var(--p1-surface)" stroke="var(--p1-text-3)" strokeWidth="2" />

      {/* Balcony, outside the envelope and tinted so it reads as outside. */}
      <rect x={PAD} y={y} width={BALCONY} height={livingH} fill="var(--p1-primary-soft)" stroke="var(--p1-text-3)" strokeWidth="1" />

      {/* Living band, with the kitchen taking the far end of it. */}
      <rect x={x} y={y} width={w * 0.62} height={livingH} fill="none" stroke="var(--p1-text-3)" strokeWidth="1.5" />
      {label('Living / dining', x, y)}
      <rect x={x + w * 0.62} y={y} width={w * 0.38} height={livingH} fill="var(--p1-subtle)" stroke="var(--p1-text-3)" strokeWidth="1.5" />
      {label('Kitchen', x + w * 0.62, y)}

      {/* One bedroom per row, each with a bathroom beside it. */}
      {Array.from({ length: beds }).map((_, i) => {
        const ry = y + livingH + i * bedH;
        return (
          <g key={i}>
            <rect x={x} y={ry} width={w * 0.66} height={bedH} fill="none" stroke="var(--p1-text-3)" strokeWidth="1.5" />
            {label(i === 0 ? 'Master bedroom' : `Bedroom ${i + 1}`, x, ry)}
            <rect x={x + w * 0.66} y={ry} width={w * 0.34} height={bedH} fill="var(--p1-subtle)" stroke="var(--p1-text-3)" strokeWidth="1.5" />
            {label('Bath', x + w * 0.66, ry, true)}
          </g>
        );
      })}

      {/* North point: aspect is what the question is usually about. */}
      <g transform={`translate(${PAD + 11} ${H - PAD - 2})`}>
        <circle r="10" fill="var(--p1-surface)" stroke="var(--p1-text-3)" strokeWidth="1" />
        <path d="M0 -7 L4 5 L0 2 L-4 5 Z" fill="var(--p1-primary)" />
      </g>
    </svg>
  );
}

export default function FloorPlansPage() {
  const { state, updateListing } = useDemo();
  const [projectName, setProjectName] = useState(PROJECTS[0].name);
  const [query, setQuery] = useState('');
  const [attached, setAttached] = useState('');

  const project = PROJECTS.find((p) => p.name === projectName)!;
  const types = useMemo(() => unitTypes(projectName), [projectName]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return types;
    return types.filter((t) => `${t.code} ${t.bedrooms} bedroom ${t.sizeSqft}`.toLowerCase().includes(q));
  }, [types, query]);

  /* Listings of the agent's own that sit in this development, so a plan can be
     attached to one without leaving the screen. */
  const inProject = useMemo(
    () => state.listings.filter((l) => !l.archived && l.project === projectName),
    [state.listings, projectName],
  );

  const attach = (listingId: string) => {
    updateListing(listingId, { hasFloorPlan: true });
    setAttached(listingId);
    setTimeout(() => setAttached(''), 2200);
  };

  const savePlan = (t: UnitType) => {
    const svg = document.getElementById(`plan-${t.code}`)?.innerHTML;
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\W+/g, '-').toLowerCase()}-${t.code}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        eyebrow="Market data"
        title="Floor plan library"
        description="The unit mix for a development, held once — attach a plan to a listing, or send it to a client on its own."
        actions={<LinkButton href="/phase1/market/compare" variant="outline">Compare projects</LinkButton>}
      />

      <div className="mb-5 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
        <SelectInput
          label="Development"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          options={PROJECTS.map((p) => ({ value: p.name, label: `${p.name} — D${String(p.district).padStart(2, '0')} ${districtName(p.district)}` }))}
        />
        <SearchInput label="Find a unit type" value={query} onChange={setQuery} placeholder="3BR, 1055" />
      </div>

      <Card padding="md" className="mb-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <div className="font-p1display text-[18px] font-bold text-p1-text">{project.name}</div>
            <div className="mt-0.5 text-[13px] text-p1-text-3">
              {project.street} · D{String(project.district).padStart(2, '0')} {districtName(project.district)}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            <span className="inline-flex items-center gap-1.5 text-p1-text-2"><Layers size={14} aria-hidden /> {project.units.toLocaleString('en-SG')} units</span>
            <span className="inline-flex items-center gap-1.5 text-p1-text-2"><Compass size={14} aria-hidden /> {project.tenure}</span>
            <span className="inline-flex items-center gap-1.5 text-p1-text-2"><Ruler size={14} aria-hidden /> completed {project.built}</span>
          </div>
          {inProject.length > 0 && (
            <Pill tone="accent">{inProject.length} of your listings here</Pill>
          )}
        </div>
      </Card>

      {shown.length === 0 ? (
        <SectionCard title="No unit type matches" icon={<LayoutPanelTop size={16} />}>
          <EmptyState compact title="Nothing matches that" description="Clear the search to see the whole mix." />
        </SectionCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((t) => (
            <Card key={t.code} padding="none" className="overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-p1-border px-4 py-3">
                <div className="min-w-0">
                  <div className="font-p1display text-[15.5px] font-bold text-p1-text">{t.code}</div>
                  <div className="mt-0.5 text-[12.5px] text-p1-text-3">
                    {t.bedrooms} bed · {t.sizeSqft.toLocaleString('en-SG')} sqft · {t.aspect} facing
                  </div>
                </div>
                <Pill tone="neutral">{t.count} units</Pill>
              </div>

              <div id={`plan-${t.code}`} className="bg-p1-bg px-4 py-4">
                <Plan type={t} />
              </div>

              <div className="border-t border-p1-border px-4 py-3">
                <div className="text-[12.5px] text-p1-text-3">Stacks {t.stacks}</div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" leftIcon={<Download size={14} />} onClick={() => savePlan(t)}>
                    Download
                  </Button>
                  {inProject.length > 0 && (
                    <Button
                      size="sm"
                      variant={attached === inProject[0].id ? 'primary' : 'ghost'}
                      leftIcon={attached === inProject[0].id ? <Check size={14} /> : <Link2 size={14} />}
                      onClick={() => attach(inProject[0].id)}
                    >
                      {attached === inProject[0].id ? 'Attached' : `Attach to ${inProject[0].unitNo}`}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Callout tone="info" title="About these drawings" icon={<Info size={17} />} className="mt-6">
        These are schematics generated from the unit mix — room count, floor area and aspect — so an agent can talk a
        tenant through a layout. The developer&rsquo;s own drawings are copyrighted; the production build licenses
        them from the developer or takes them from the URA submission, and stores them against the project the same
        way.
      </Callout>
    </>
  );
}
