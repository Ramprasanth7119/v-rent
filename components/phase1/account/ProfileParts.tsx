"use client";

/**
 * The pieces of Profile & CEA.
 *
 * The registration is shown the way a licence is carried: one card with the
 * name, the number and the agency, and a plain statement of whether it stands.
 * Beside it, how that was established — each check with its own date — so
 * "verified" is something the agent can read the reasons for, not a badge to
 * take on trust. Every value comes from the workspace or the account; nothing
 * here decides verification.
 */

import Link from 'next/link';
import React from 'react';
import { ArrowUpRight, Check, Clock, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { Card, CardHead, CountUp, Radial, cx } from '../kit';
import { CopyText } from '../market/CopyText';
import { InkLabel, InkPanel, InkStatus } from './InkPanel';
import type { Term } from '../../../lib/phase1/account';
import { sgDate } from '../../../lib/phase1/format';

export type Standing = 'verified' | 'in_progress' | 'lapsed' | 'unregistered' | 'suspended';

const STANDING: Record<Standing, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  verified: { label: 'CEA verified', tone: 'success' },
  in_progress: { label: 'Verification in progress', tone: 'warning' },
  lapsed: { label: 'Registration lapsed', tone: 'danger' },
  suspended: { label: 'Account suspended', tone: 'danger' },
  unregistered: { label: 'No registration', tone: 'neutral' },
};

/* ------------------------------------------------------------ the card */

export function IdentityCard({
  name, registeredName, agency, licence, ceaNumber, standing, since,
}: {
  name: string; registeredName: string; agency: string; licence: string; ceaNumber: string;
  standing: Standing; since?: string;
}) {
  const s = STANDING[standing];
  const initials = name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '—';
  return (
    <InkPanel aria-labelledby="id-h" className="vr-rise flex min-h-[300px] flex-col p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <InkLabel>Registered salesperson · Singapore</InkLabel>
        <InkStatus
          tone={s.tone}
          icon={standing === 'verified' ? <ShieldCheck size={13} aria-hidden /> : standing === 'lapsed' || standing === 'suspended' ? <ShieldAlert size={13} aria-hidden /> : undefined}
        >
          {s.label}
        </InkStatus>
      </div>

      <div className="mt-6 flex items-center gap-4 sm:gap-5">
        <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 font-p1display text-[24px] font-bold tracking-tight text-white ring-1 ring-inset ring-white/20 sm:h-20 sm:w-20 sm:text-[28px]">
          {initials}
        </span>
        <div className="min-w-0">
          <h2 id="id-h" className="truncate font-p1display text-[28px] font-bold leading-tight tracking-[-0.02em] sm:text-[36px]">{name}</h2>
          <p className="mt-1 truncate text-[13.5px] text-white/65">{agency || 'No agency on file'}</p>
        </div>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[var(--p1-ink-line)] pt-5">
        <div className="min-w-0">
          <dt className="text-[12px] text-white/55">CEA registration no.</dt>
          <dd className="mt-1 font-mono text-[17px] font-semibold tracking-[0.04em] text-white">{ceaNumber || '—'}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[12px] text-white/55">Agency licence</dt>
          <dd className="mt-1 truncate font-mono text-[15px] font-semibold tracking-[0.03em] text-white">{licence || '—'}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="text-[12px] text-white/55">Name on the register</dt>
          <dd className="mt-1 truncate text-[14px] font-medium uppercase tracking-[0.02em] text-white/90">{registeredName || '—'}</dd>
        </div>
      </dl>

      {since && <p className="mt-auto pt-6 text-[12px] text-white/50">V-RENT member since {sgDate(since)}</p>}
    </InkPanel>
  );
}

/* ------------------------------------------------------- the registration */

export function RegistrationPanel({
  ceaNumber, validUntil, term, daysLeft, current, agency, matchedOn, className = '',
}: {
  ceaNumber: string; validUntil: string; term: Term | null; daysLeft: number | null; current: boolean;
  agency: string; matchedOn?: string; className?: string;
}) {
  const soon = daysLeft !== null && daysLeft <= 60;
  const tone = !current ? 'danger' : soon ? 'warning' : 'primary';
  const bar = tone === 'danger' ? 'bg-p1-danger' : tone === 'warning' ? 'bg-p1-warning' : 'bg-p1-primary';

  return (
    <Card as="section" aria-labelledby="reg-h" padding="lg" className={cx('vr-rise flex flex-col', className)}>
      <CardHead id="reg-h" title="Registration validity" sub="As held on the CEA public register" />

      <div className="mt-5 flex items-center gap-5">
        <Radial
          /* The ring is the year ahead: a registration held for fifteen years
             would otherwise always read as nearly spent. */
          value={daysLeft === null ? 0 : Math.min(daysLeft, 365)}
          max={365}
          size={112}
          thickness={10}
          tone={tone}
          label={daysLeft !== null
            ? <span className="font-p1display text-[26px] font-bold leading-none tabular-nums text-p1-text"><CountUp value={daysLeft} /></span>
            : <span className="text-[13px] font-semibold text-p1-text-3">—</span>}
          sublabel={daysLeft !== null ? 'days left' : 'no end date'}
        />
        <dl className="min-w-0 flex-1 space-y-3">
          <div>
            <dt className="text-[12px] text-p1-text-3">Valid until</dt>
            <dd className={cx('text-[17px] font-semibold tabular-nums', !current ? 'text-p1-danger' : 'text-p1-text')}>{validUntil ? sgDate(validUntil) : 'Not on record'}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-p1-text-3">Registration no.</dt>
            <dd className="text-[15px] font-semibold text-p1-text"><CopyText value={ceaNumber} label="CEA registration number" /></dd>
          </div>
        </dl>
      </div>

      {term ? (
        <div className="mt-6">
          <div className="h-2 overflow-hidden rounded-full bg-p1-subtle" role="progressbar" aria-valuenow={term.elapsedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Share of the registration period elapsed">
            <div className={cx('acct-fill h-full rounded-full', bar)} style={{ width: `${term.elapsedPct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[12px] tabular-nums text-p1-text-3">
            <span>Registered since {sgDate(term.start)}</span>
            <span>To {sgDate(term.end)}</span>
          </div>
        </div>
      ) : (
        <dl className="mt-6 divide-y divide-p1-border border-y border-p1-border text-[13px]">
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-p1-text-3">Registered with</dt>
            <dd className="truncate font-medium text-p1-text">{agency || '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-p1-text-3">Matched on the register</dt>
            <dd className="font-medium tabular-nums text-p1-text">{matchedOn ? sgDate(matchedOn) : 'Not recorded'}</dd>
          </div>
        </dl>
      )}

      <p className={cx('mt-auto pt-5 text-[12.5px] leading-5', soon || !current ? 'text-p1-warning' : 'text-p1-text-3')}>
        {!current
          ? 'The register shows this registration has ended. Listings cannot be published until it is renewed.'
          : soon
            ? 'Renew with CEA before this date to keep your listings live. V-RENT re-checks the register daily.'
            : 'V-RENT re-checks the register daily, so a renewal shows here without you doing anything.'}
      </p>
    </Card>
  );
}

/* ------------------------------------------------------- how it was checked */

export interface VerifyCheck {
  label: string;
  state: 'done' | 'waiting' | 'failed';
  detail: string;
  href?: string;
}

const ICON = {
  done: <Check size={13} strokeWidth={3} aria-hidden />,
  waiting: <Clock size={13} aria-hidden />,
  failed: <X size={13} strokeWidth={3} aria-hidden />,
};
const DOT = {
  done: 'bg-p1-success text-white dark:text-p1-bg',
  waiting: 'bg-p1-warning-soft text-p1-warning ring-1 ring-inset ring-p1-warning-border',
  failed: 'bg-p1-danger text-white dark:text-p1-bg',
};

export function VerificationSteps({ checks, className = '' }: { checks: VerifyCheck[]; className?: string }) {
  const done = checks.filter((c) => c.state === 'done').length;
  return (
    <Card as="section" aria-labelledby="checks-h" padding="lg" className={cx('vr-rise', className)}>
      <CardHead id="checks-h" title="How your account was verified" sub={`${done} of ${checks.length} checks complete`}>
        <Link href="/phase1/status" className="group inline-flex items-center gap-1 text-[13px] font-medium text-p1-primary hover:underline underline-offset-4">
          Application <ArrowUpRight size={13} aria-hidden className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </CardHead>
      <ol className="mt-5">
        {checks.map((c, i) => (
          <li key={c.label} className="relative flex gap-3.5 pb-5 last:pb-0">
            {i < checks.length - 1 && (
              <span aria-hidden className={cx('absolute left-[11px] top-7 bottom-1 w-px', c.state === 'done' ? 'bg-p1-success/40' : 'bg-p1-border')} />
            )}
            <span className={cx('relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', DOT[c.state])}>
              {ICON[c.state]}
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-p1-text">
                {c.label}
                <span className="sr-only"> — {c.state === 'done' ? 'complete' : c.state === 'failed' ? 'failed' : 'waiting'}</span>
              </div>
              <p className="mt-0.5 text-[12.5px] leading-5 text-p1-text-3">
                {c.detail}
                {c.href && c.state !== 'done' && (
                  <> · <Link href={c.href} className="font-medium text-p1-primary hover:underline underline-offset-4">Resolve</Link></>
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* ------------------------------------------------------------ completeness */

export function CompletenessCard({ items, className = '' }: { items: { label: string; done: boolean; target: string }[]; className?: string }) {
  const pct = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  return (
    <Card as="section" aria-labelledby="complete-h" padding="lg" className={cx('vr-rise', className)}>
      <div className="flex items-center gap-4">
        <Radial
          value={pct}
          size={84}
          thickness={8}
          tone={pct === 100 ? 'success' : 'primary'}
          label={<span className="font-p1display text-[19px] font-bold tabular-nums text-p1-text"><CountUp value={pct} suffix="%" /></span>}
        />
        <div className="min-w-0">
          <h2 id="complete-h" className="text-[15px] font-semibold text-p1-text">Profile complete</h2>
          <p className="mt-0.5 text-[12.5px] leading-5 text-p1-text-3">
            {pct === 100 ? 'Tenants see everything they need.' : 'The parts of your profile only you can fill in.'}
          </p>
        </div>
      </div>
      <ul className="mt-5 space-y-1">
        {items.map((it) => (
          <li key={it.label}>
            <a
              href={`#${it.target}`}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-[13.5px] transition-colors hover:bg-p1-subtle"
            >
              <span className="flex items-center gap-2.5">
                <span aria-hidden className={cx('flex h-5 w-5 items-center justify-center rounded-full', it.done ? 'bg-p1-success-soft text-p1-success' : 'border border-dashed border-p1-border-strong')}>
                  {it.done && <Check size={11} strokeWidth={3} />}
                </span>
                <span className={it.done ? 'text-p1-text-2' : 'font-medium text-p1-text'}>{it.label}</span>
              </span>
              <span className="text-[12px] text-p1-text-3">{it.done ? 'Done' : 'Add'}</span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
