/**
 * An agent, as a tenant sees them: who they are, that the register agrees, and
 * what they have live. Trust first, then the homes.
 */

import { notFound } from 'next/navigation';
import { BadgeCheck, Building2, CalendarDays, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { marketAgent } from '../../../../../lib/phase1/marketplace';
import { districtCode, districtLabel } from '../../../../../lib/phase1/districts';
import { sgDate } from '../../../../../lib/phase1/format';
import { PropertyCard } from '../../../../../components/phase1/market/PropertyCard';
import { CopyText } from '../../../../../components/phase1/market/CopyText';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ owner: string }> }) {
  const { owner } = await params;
  const found = await marketAgent(owner);
  return { title: found ? `${found.agent.name}, ${found.agent.agency} — V-RENT` : 'Agent not found — V-RENT' };
}

export default async function AgentProfilePage({ params }: { params: Promise<{ owner: string }> }) {
  const { owner } = await params;
  const found = await marketAgent(owner);
  if (!found) notFound();
  const { agent: a, listings } = found;
  const districts = [...new Set(listings.map((m) => m.listing.district))].sort((x, y) => x - y);
  const initials = a.name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const wa = a.mobile ? `https://wa.me/${a.mobile.replace(/[^\d]/g, '').replace(/^(?!65)(\d{8})$/, '65$1')}` : null;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <section className="vr-rise rounded-2xl border border-p1-border bg-p1-surface p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-p1-primary-soft text-[26px] font-semibold text-p1-primary" aria-hidden>{initials}</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-p1-text sm:text-[30px]">{a.name}</h1>
            <p className="mt-0.5 text-[15px] text-p1-text-2">{a.agency || 'Agency not stated'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {a.verified ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-p1-success-soft px-2 py-1 text-[12.5px] font-semibold text-p1-success"><ShieldCheck size={14} aria-hidden /> CEA verified</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-p1-subtle px-2 py-1 text-[12.5px] font-medium text-p1-text-2">Verification pending</span>
              )}
              <CopyText value={a.ceaNumber} label="CEA registration number" />
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-p1-text-2">
              <li className="inline-flex items-center gap-2"><Building2 size={15} className="text-p1-text-3" aria-hidden /><span className="font-semibold tabular-nums text-p1-text">{listings.length}</span> active {listings.length === 1 ? 'listing' : 'listings'}</li>
              {districts.length > 0 && <li className="inline-flex items-center gap-2"><MapPin size={15} className="text-p1-text-3" aria-hidden />{districts.slice(0, 4).map((d) => districtLabel(d)).join(', ')}{districts.length > 4 ? ` +${districts.length - 4}` : ''}</li>}
              {a.experienceYears && <li className="inline-flex items-center gap-2"><BadgeCheck size={15} className="text-p1-text-3" aria-hidden />{a.experienceYears} years in practice</li>}
              <li className="inline-flex items-center gap-2"><CalendarDays size={15} className="text-p1-text-3" aria-hidden />On V-RENT since {sgDate(a.memberSince)}</li>
            </ul>
            {a.bio && <p className="mt-5 max-w-2xl text-[15px] leading-7 text-p1-text-2">{a.bio}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 md:flex-col">
            {a.mobile && <a href={`tel:${a.mobile.replace(/\s/g, '')}`} className="p1-press inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-p1-primary px-4 text-[14px] font-medium text-p1-primary-on hover:bg-p1-primary-hover"><Phone size={15} aria-hidden /> Call</a>}
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="p1-press inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-p1-border-strong px-4 text-[14px] font-medium text-p1-text hover:bg-p1-subtle">WhatsApp</a>}
            {a.email && <a href={`mailto:${a.email}`} className="p1-press inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-p1-border-strong px-4 text-[14px] font-medium text-p1-text hover:bg-p1-subtle"><Mail size={15} aria-hidden /> Email</a>}
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="homes-h" className="min-w-0">
          <h2 id="homes-h" className="mb-4 text-[18px] font-semibold tracking-[-0.015em] text-p1-text">Homes by {a.callName}</h2>
          {listings.length === 0 ? (
            <div className="rounded-2xl border border-p1-border bg-p1-surface px-6 py-12 text-center">
              <p className="text-[15px] font-semibold text-p1-text">Nothing live right now</p>
              <p className="mt-1 text-[14px] text-p1-text-3">Contact {a.callName} about upcoming units.</p>
            </div>
          ) : (
            <ul className="vr-stagger grid gap-5 sm:grid-cols-2">
              {listings.map((m) => <li key={m.listing.id}><PropertyCard item={m} /></li>)}
            </ul>
          )}
        </section>

        <aside>
          <div className="rounded-2xl border border-p1-border bg-p1-surface">
            <div className="flex items-center justify-between gap-3 border-b border-p1-border px-5 py-4">
              <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-p1-text-3">CEA register</span>
              {a.verified && <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-p1-success"><ShieldCheck size={14} aria-hidden /> Verified</span>}
            </div>
            <dl className="divide-y divide-p1-border px-5">
              {[
                ['Registered name', a.registeredName],
                ['Registration no.', a.ceaNumber],
                ['Agency', a.agency],
                ['Agency licence', a.agencyLicence],
                ...(a.registeredUntil ? [['Registered until', sgDate(a.registeredUntil)]] : []),
                ...(a.verifiedAt ? [['Verified on', sgDate(a.verifiedAt)]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-3 text-[13.5px]">
                  <dt className="text-p1-text-3">{k}</dt>
                  <dd className="text-right font-medium text-p1-text">{v || '—'}</dd>
                </div>
              ))}
            </dl>
            <p className="border-t border-p1-border px-5 py-3.5 text-[12.5px] leading-5 text-p1-text-3">
              Checked against the Council for Estate Agencies public register. You can confirm it at cea.gov.sg.
            </p>
          </div>
          {districts.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {districts.map((d) => <span key={d} className="rounded-md border border-p1-border bg-p1-surface px-2 py-1 text-[12px] font-medium text-p1-text-2">{districtCode(d)} {districtLabel(d)}</span>)}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
