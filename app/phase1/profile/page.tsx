"use client";

/**
 * Profile & CEA.
 *
 * Two kinds of fact, treated differently. The registration comes from the CEA
 * register and is read-only: it is what appears on every advertisement, and
 * letting an agent type over it would put a claim on a listing the register
 * does not support. How tenants reach the agent and what they write about
 * themselves is theirs, and saves as it is typed.
 */

import Link from 'next/link';
import { ArrowUpRight, Check, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Avatar, Callout, Card, LinkButton, Spinner, TextArea, TextInput, cx } from '../../../components/phase1/kit';
import { CopyText } from '../../../components/phase1/market/CopyText';
import { useDemo, preferredName } from '../../../lib/phase1/DemoContext';
import { useSession } from '../../../lib/phase1/SessionContext';
import { sgDate } from '../../../lib/phase1/format';

export default function ProfilePage() {
  const { state, setProfile, saving } = useDemo();
  const { user } = useSession();
  const p = state.profile;

  const registered = Boolean(p.ceaNumber);
  const verified = state.approval === 'approved' && state.ceaValid;
  const name = preferredName(p.fullName) || 'Your name';

  // Completeness counts only what the agent controls; the register fields are always there.
  const own = [
    { done: p.mobile.trim().length > 0, label: 'Mobile number' },
    { done: p.experienceYears.trim().length > 0, label: 'Years of experience' },
    { done: p.bio.trim().length > 0, label: 'Biography' },
  ];
  const completeness = Math.round((own.filter((o) => o.done).length / own.length) * 100);
  const missing = own.filter((o) => !o.done);

  const register: [string, React.ReactNode][] = [
    ['Registered name', p.fullName],
    ['Registration no.', <CopyText key="cea" value={p.ceaNumber} label="CEA registration number" />],
    ['Agency', p.agency],
    ['Agency licence', p.agencyLicence],
    ['Registered until', state.ceaValidUntil ? sgDate(state.ceaValidUntil) : '—'],
    ...(user?.cea?.verifiedAt ? [['Verified on', sgDate(user.cea.verifiedAt)] as [string, React.ReactNode]] : []),
  ];

  return (
    <>
      <header className="vr-rise mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-p1-text sm:text-[28px]">Profile & CEA</h1>
        {user && (
          <LinkButton href={`/phase1/homes/agent/${user.id}`} variant="outline" rightIcon={<ArrowUpRight size={15} />}>
            View public profile
          </LinkButton>
        )}
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {/* ------------------------------------------------ the register */}
          <Card padding="none" as="section" aria-labelledby="cea-h">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <h2 id="cea-h" className="text-[15px] font-semibold text-p1-text">CEA registration</h2>
              {registered && (verified ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-p1-success-soft px-2 py-1 text-[12.5px] font-semibold text-p1-success">
                  <ShieldCheck size={14} aria-hidden /> CEA verified
                </span>
              ) : !state.ceaValid ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-p1-danger-soft px-2 py-1 text-[12.5px] font-semibold text-p1-danger">
                  <ShieldAlert size={14} aria-hidden /> Registration lapsed
                </span>
              ) : (
                <Link href="/phase1/status" className="inline-flex items-center gap-1.5 rounded-md bg-p1-warning-soft px-2 py-1 text-[12.5px] font-semibold text-p1-warning">
                  Verification in progress
                </Link>
              ))}
            </div>

            {registered ? (
              <>
                <dl className="grid border-t border-p1-border sm:grid-cols-2">
                  {register.map(([k, v], i) => (
                    <div key={k} className={cx('px-5 py-3.5', i >= 2 && 'border-t border-p1-border', i % 2 === 1 && 'sm:border-l sm:border-p1-border', i === 1 && 'border-t border-p1-border sm:border-t-0')}>
                      <dt className="text-[12.5px] text-p1-text-3">{k}</dt>
                      <dd className="mt-1 break-words text-[14.5px] font-medium text-p1-text">{v || '—'}</dd>
                    </div>
                  ))}
                </dl>
                <div className="rounded-b-xl border-t border-p1-border bg-p1-subtle/60 px-5 py-3.5">
                  <div className="text-[12px] font-medium text-p1-text-3">On every advertisement</div>
                  <p className="mt-0.5 text-[13.5px] text-p1-text">{p.fullName} · {p.ceaNumber} · {p.agency}{p.agencyLicence && ` (${p.agencyLicence})`}</p>
                </div>
              </>
            ) : (
              <div className="border-t border-p1-border p-5">
                <Callout tone="warning" title="No CEA registration on this account">
                  Listings cannot be published without one.
                </Callout>
              </div>
            )}
          </Card>

          {/* ------------------------------------------------ the agent's own */}
          <Card padding="none" as="section" aria-labelledby="about-h">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <h2 id="about-h" className="text-[15px] font-semibold text-p1-text">About you</h2>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-p1-text-3" aria-live="polite">
                {saving ? <><Spinner size={12} /> Saving</> : <><Check size={13} className="text-p1-success" aria-hidden /> Saved</>}
              </span>
            </div>
            <div className="grid gap-5 border-t border-p1-border p-5 sm:grid-cols-2">
              <TextInput
                label="Mobile number"
                inputMode="tel"
                value={p.mobile}
                onChange={(e) => setProfile({ mobile: e.target.value })}
                hint="Shown to tenants who ask to call."
              />
              <div>
                <div className="mb-1.5 text-[13.5px] font-medium text-p1-text">Email address</div>
                <div className="flex h-11 items-center rounded-lg border border-p1-border bg-p1-subtle px-3.5 text-[14px] text-p1-text-2">
                  <span className="truncate">{p.email}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] text-p1-text-3">
                  Change it in <Link href="/phase1/settings" className="font-medium text-p1-primary hover:underline underline-offset-4">Settings</Link>.
                </p>
              </div>
              <TextInput
                label="Years of experience"
                inputMode="numeric"
                value={p.experienceYears}
                onChange={(e) => setProfile({ experienceYears: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                optional
              />
              <div className="hidden sm:block" aria-hidden />
              <TextArea
                label="Biography"
                rows={4}
                value={p.bio}
                onChange={(e) => setProfile({ bio: e.target.value })}
                containerClassName="sm:col-span-2"
                counter={`${p.bio.length} / 600`}
                maxLength={600}
                hint="The areas and property types you focus on. V-RENT will not write one for you."
              />
            </div>
          </Card>
        </div>

        {/* ------------------------------------------------------- summary */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <div className="flex items-center gap-3">
              <Avatar name={name} size="lg" />
              <div className="min-w-0">
                <div className="truncate text-[16px] font-semibold text-p1-text">{name}</div>
                <div className="truncate text-[13px] text-p1-text-3">{p.agency || 'No agency on file'}</div>
              </div>
            </div>

            <div className="mt-5 border-t border-p1-border pt-4">
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="text-p1-text-2">Profile complete</span>
                <span className="font-semibold tabular-nums text-p1-text">{completeness}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-p1-subtle" role="progressbar" aria-valuenow={completeness} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
                <div className={cx('h-full rounded-full transition-[width] duration-500', completeness === 100 ? 'bg-p1-success' : 'bg-p1-primary')} style={{ width: `${completeness}%` }} />
              </div>
              {missing.length > 0 ? (
                <ul className="mt-3 space-y-1.5 text-[13px] text-p1-text-3">
                  {missing.map((m) => <li key={m.label} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-p1-border-strong" aria-hidden />Add {m.label.toLowerCase()}</li>)}
                </ul>
              ) : (
                <p className="mt-3 text-[13px] text-p1-text-3">Tenants see everything they need.</p>
              )}
            </div>

            <Link href="/phase1/status" className="mt-4 flex items-center justify-between border-t border-p1-border pt-4 text-[13.5px] font-medium text-p1-text hover:text-p1-primary">
              Verification status <ArrowUpRight size={14} className="text-p1-text-3" aria-hidden />
            </Link>
          </Card>
        </aside>
      </div>
    </>
  );
}
