"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { PageHead, Stat, StatusChip, Field, SpecNote } from '../../../../../components/phase1/bits';
import { PropertyImage } from '../../../../../components/phase1/PropertyImage';
import { useToast } from '../../../../../components/phase1/Toast';
import { AGENTS, listingsForAgent } from '../../../../../lib/phase1/agents';
import { sgd } from '../../../../../lib/phase1/data';
import { ArrowLeft, ShieldCheck, ShieldAlert, Ban, RotateCcw, Mail, Phone, Building2 } from 'lucide-react';

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { push } = useToast();
  const agent = AGENTS.find((a) => a.id === id);
  const [suspended, setSuspended] = useState(false);

  if (!agent) {
    return (
      <>
        <PageHead module="M14 · Administrative Console" title="Agent not found" />
        <Card className="py-12 text-center">
          <Link href="/phase1/admin/agents"><Button variant="outline">Back to agents</Button></Link>
        </Card>
      </>
    );
  }

  const listings = listingsForAgent(agent.name);
  const published = listings.filter((l) => l.status === 'published');
  const inventoryValue = published.reduce((n, l) => n + l.monthlyRent, 0);
  const expired = agent.status === 'verification_expired';
  const effectiveStatus = suspended ? 'suspended' : agent.status;

  return (
    <>
      <Link
        href="/phase1/admin/agents"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-brand-gold"
      >
        <ArrowLeft size={13} /> Agents
      </Link>

      <PageHead
        module="M14 · Administrative Console"
        title={agent.name}
        blurb={`${agent.agency} · joined ${agent.joinedAt}`}
        actions={
          <>
            {effectiveStatus === 'suspended' ? (
              <Button variant="gold" leftIcon={<RotateCcw size={13} />}
                onClick={() => { setSuspended(false); push({ tone: 'success', title: 'Agent reinstated', body: 'Publication rights restored.' }); }}>
                Reinstate
              </Button>
            ) : (
              <Button variant="destructive" leftIcon={<Ban size={13} />}
                onClick={() => { setSuspended(true); push({ tone: 'warn', title: 'Agent suspended', body: 'Sessions revoked; publication rights withdrawn immediately.' }); }}>
                Suspend
              </Button>
            )}
          </>
        }
      />

      {/* verification banner */}
      <Card className={
        effectiveStatus === 'approved'
          ? 'mb-5 border-emerald-300/60 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
          : 'mb-5 border-red-300/60 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20'
      }>
        <div className="flex items-start gap-3">
          {effectiveStatus === 'approved'
            ? <ShieldCheck size={17} className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            : <ShieldAlert size={17} className="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">
              {effectiveStatus === 'approved' && `CEA registration valid until ${agent.ceaValidUntil}`}
              {effectiveStatus === 'verification_expired' && `CEA registration lapsed on ${agent.ceaValidUntil}`}
              {effectiveStatus === 'under_review' && 'Awaiting verification decision'}
              {effectiveStatus === 'suspended' && 'Account suspended by an administrator'}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              {effectiveStatus === 'approved' &&
                'Re-checked daily against the CEA register published on data.gov.sg. The badge expires by itself if the registration is not renewed.'}
              {effectiveStatus === 'verification_expired' &&
                'Account access is retained but publication rights are withdrawn. Live listings entered the grace period automatically.'}
              {effectiveStatus === 'under_review' &&
                'No listings may be created until a verification officer approves the application.'}
              {effectiveStatus === 'suspended' &&
                'Server-side sessions were revoked, so this took effect on the agent’s next request rather than at token expiry.'}
            </p>
          </div>
        </div>
      </Card>

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Listings" value={listings.length} sub={`${published.length} published`} />
        <Stat label="Monthly inventory" value={sgd(inventoryValue)} sub="Sum of published rents" />
        <Stat label="Plan" value={agent.plan ?? 'None'} tone={agent.plan ? 'default' : 'warn'} />
        <Stat
          label="CEA valid to"
          value={agent.ceaValidUntil}
          tone={expired ? 'bad' : 'good'}
          sub={expired ? 'Publication blocked' : 'Re-checked daily'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* profile */}
        <div className="space-y-3">
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-white">
                {agent.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{agent.name}</div>
                <div className="font-mono text-[11px] text-neutral-500">{agent.ceaNumber}</div>
              </div>
            </div>
            <div className="space-y-3 border-t border-border pt-4">
              <Field label="Agency" value={<span className="flex items-start gap-1.5"><Building2 size={12} className="mt-0.5 flex-shrink-0 text-neutral-400" />{agent.agency}</span>} />
              <Field label="Agency licence" value={<span className="font-mono">{agent.agencyLicence}</span>} />
              <Field label="Email" value={<span className="flex items-start gap-1.5 break-all"><Mail size={12} className="mt-0.5 flex-shrink-0 text-neutral-400" />{agent.email}</span>} />
              <Field label="Mobile" value={<span className="flex items-center gap-1.5"><Phone size={12} className="flex-shrink-0 text-neutral-400" />{agent.mobile}</span>} />
            </div>
          </Card>

          <Card>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Biography</div>
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{agent.bio}</p>
            {agent.specialisations.length > 0 && (
              <>
                <div className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Specialisations</div>
                <div className="flex flex-wrap gap-1.5">
                  {agent.specialisations.map((s) => (
                    <span key={s} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">{s}</span>
                  ))}
                </div>
              </>
            )}
            <div className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Languages</div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">{agent.languages.join(', ')}</div>
            <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-neutral-500">
              This profile is captured in Phase 1 and becomes the public agent page in Phase 2 — an
              exposure decision, not a data change.
            </p>
          </Card>
        </div>

        {/* their listings */}
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-foreground">Listings by this agent</h2>
            <span className="text-xs tabular-nums text-neutral-400">{listings.length} total</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {listings.map((l) => (
              <Card key={l.id} hoverEffect className="overflow-hidden p-0">
                <div className="relative">
                  <PropertyImage seed={l.reference + l.project} variant={0} rounded="rounded-none" className="aspect-[16/9] w-full" />
                  <div className="absolute left-2.5 top-2.5">
                    <StatusChip status={l.status} />
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                    {l.images} photos
                  </div>
                </div>
                <div className="p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{l.project}</span>
                    <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {sgd(l.monthlyRent)}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                    {l.unitNo} · {l.address}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-500">
                    <span>{l.bedrooms} bed</span><span className="text-neutral-300 dark:text-neutral-700">·</span>
                    <span>{l.bathrooms} bath</span><span className="text-neutral-300 dark:text-neutral-700">·</span>
                    <span>{l.sizeSqft.toLocaleString()} sqft</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
                    <span className="font-mono text-[10px] text-neutral-400">{l.reference}</span>
                    <span className="text-[10px] text-neutral-400">
                      D{String(l.district).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {listings.length === 0 && (
            <Card className="py-12 text-center">
              <p className="text-sm text-neutral-400">This agent has no listings yet.</p>
              <p className="mx-auto mt-1.5 max-w-sm text-xs text-neutral-500">
                {agent.status === 'under_review'
                  ? 'Expected — listings cannot be created before verification is approved.'
                  : 'No inventory recorded.'}
              </p>
            </Card>
          )}
        </div>
      </div>

      <SpecNote>
        Listings are attached to a property and a unit, not just to an agent. That separation is what
        makes it possible to see every listing ever made for a given unit — across agents and across
        years — which is the basis of the price history and duplicate detection planned for Phase 2.
      </SpecNote>
    </>
  );
}
