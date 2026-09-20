/**
 * Every salesperson with something live, and the register entry behind them.
 *
 * The compliance line leads rather than hides at the bottom: the registration
 * number, the agency and its licence are the reason a stranger should believe
 * any of this, so they are on the card. There are no ratings, no review counts
 * and no response times, because nothing in this product records any of them
 * and a property portal inventing trust signals is the worst version of one.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, Building2, MapPin, ShieldCheck } from 'lucide-react';
import { marketAgents } from '../../../../lib/phase1/marketplace';
import { districtCode, districtLabel } from '../../../../lib/phase1/districts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Property agents on V-RENT — Singapore',
  description: 'Every salesperson advertising on V-RENT, with their CEA registration number, agency and the areas they are listing in.',
  alternates: { canonical: '/phase1/homes/agents' },
};

const initialsOf = (name: string) =>
  name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export default async function AgentsPage() {
  const agents = await marketAgents();
  const homes = agents.reduce((n, a) => n + a.count, 0);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="vr-rise max-w-2xl">
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.03em] text-p1-text sm:text-[40px]">Agents</h1>
        <p className="mt-3 text-[16px] leading-7 text-p1-text-3">
          {agents.length === 0
            ? 'Nobody has a home live right now. Agents appear here the moment they publish one.'
            : <>{agents.length} {agents.length === 1 ? 'salesperson' : 'salespeople'} advertising {homes} {homes === 1 ? 'home' : 'homes'}. Every one of them is matched to the Council for Estate Agencies register before a listing goes live.</>}
        </p>
      </header>

      {agents.length > 0 && (
        <ul className="vr-stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map(({ agent: a, count, districts }) => (
            <li key={a.id}>
              <Link
                href={`/phase1/homes/agent/${a.id}`}
                className="group flex h-full flex-col rounded-2xl border border-p1-border bg-p1-surface p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-p1-border-strong hover:shadow-p1-md"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-p1-primary-soft text-[18px] font-semibold text-p1-primary" aria-hidden>{initialsOf(a.name)}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[16px] font-semibold text-p1-text">{a.name}</span>
                      {a.verified && <BadgeCheck size={16} className="shrink-0 text-p1-success" aria-label="CEA verified" />}
                    </span>
                    <span className="block truncate text-[13.5px] text-p1-text-2">{a.agency || 'Agency not stated'}</span>
                  </span>
                </div>

                <dl className="mt-4 space-y-1.5 border-t border-p1-border pt-4 text-[12.5px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-p1-text-3">CEA registration</dt>
                    <dd className="font-medium tabular-nums text-p1-text">{a.ceaNumber || '—'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-p1-text-3">Agency licence</dt>
                    <dd className="font-medium tabular-nums text-p1-text">{a.agencyLicence || '—'}</dd>
                  </div>
                </dl>

                <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-p1-text-2">
                  <li className="inline-flex items-center gap-1.5">
                    <Building2 size={14} className="text-p1-text-3" aria-hidden />
                    <span className="font-semibold tabular-nums text-p1-text">{count}</span> live
                  </li>
                  {a.experienceYears && (
                    <li className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-p1-text-3" aria-hidden />{a.experienceYears} years</li>
                  )}
                </ul>

                <div className="mt-2 flex min-w-0 items-start gap-1.5 text-[12.5px] text-p1-text-3">
                  <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden />
                  <span className="line-clamp-1">{districts.map((d) => `${districtCode(d)} ${districtLabel(d)}`).join(' · ')}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 max-w-2xl text-[12.5px] leading-5 text-p1-text-3">
        V-RENT shows no ratings, reviews or response times for agents. Nothing in the platform measures them, and a number
        that was not measured is worse than no number at all. What is shown — the registration, the licence, the areas and the
        count — is read from the register and from the listings themselves.
      </p>
    </div>
  );
}
