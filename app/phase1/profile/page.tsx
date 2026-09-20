"use client";

/**
 * Profile & CEA.
 *
 * Two kinds of fact, treated differently. The registration comes from the CEA
 * register and is read-only: it is what appears on every advertisement, and
 * letting an agent type over it would put a claim on a listing the register
 * does not support. How tenants reach the agent and what they write about
 * themselves is theirs, and saves as it is typed.
 *
 * The page opens on the registration, carried like a licence, with its
 * validity beside it; then the agent's own details beside how the account was
 * verified. Verification is read, never decided, here — the checks mirror the
 * application timeline on /phase1/status.
 */

import Link from 'next/link';
import { ArrowUpRight, Check, Mail, Megaphone, Settings } from 'lucide-react';
import {
  Card, CardHead, Callout, LinkButton, PageHeader, Spinner, TextArea, TextInput,
} from '../../../components/phase1/kit';
import { DemoBadge } from '../../../components/phase1/DemoDataSwitch';
import {
  CompletenessCard, IdentityCard, RegistrationPanel, VerificationSteps, type Standing, type VerifyCheck,
} from '../../../components/phase1/account/ProfileParts';
import { useDemo, preferredName } from '../../../lib/phase1/DemoContext';
import { useSession } from '../../../lib/phase1/SessionContext';
import { daysUntilDate, termBetween } from '../../../lib/phase1/account';
import { sgDate } from '../../../lib/phase1/format';
import { SG_MOBILE_DISPLAY, normaliseSgMobile, sgMobileProblem } from '../../../lib/phase1/mobile';
import { firstIssueMessage } from '../../../lib/phase1/content-policy';
import { DEMO_NOTICE } from '../../../lib/phase1/report-data';

/** The register's end date is the last day the registration holds, Singapore time. */
const endOfDay = (iso: string) => new Date(`${iso}T23:59:59+08:00`);

export default function ProfilePage() {
  const { state, setProfile, saving, demo, openedAt } = useDemo();
  const { user } = useSession();
  const p = state.profile;
  const a = state.approval;

  const registered = Boolean(p.ceaNumber);
  const name = preferredName(p.fullName) || 'Your name';

  const standing: Standing = a === 'suspended'
    ? 'suspended'
    : !registered
      ? 'unregistered'
      : !state.ceaValid
        ? 'lapsed'
        : a === 'approved' ? 'verified' : 'in_progress';

  /* The register's own period, when the account's snapshot is the one on screen. */
  const snapshot = user?.cea;
  const validEnd = state.ceaValidUntil && !Number.isNaN(endOfDay(state.ceaValidUntil).getTime()) ? endOfDay(state.ceaValidUntil) : null;
  const term = snapshot && snapshot.registrationEnd === state.ceaValidUntil
    ? termBetween(`${snapshot.registrationStart}T00:00:00+08:00`, validEnd, openedAt)
    : null;
  const daysLeft = validEnd ? daysUntilDate(validEnd, openedAt) : null;

  const ceaMatched = Boolean(snapshot?.verifiedAt) || state.profileSubmitted;
  const checks: VerifyCheck[] = [
    {
      label: 'Found on the CEA public register',
      state: ceaMatched ? 'done' : 'waiting',
      detail: snapshot?.verifiedAt ? `Matched on ${sgDate(snapshot.verifiedAt)}` : ceaMatched ? 'Matched when the profile was submitted' : 'Checked automatically when you submit',
    },
    {
      label: 'Registration current',
      state: !registered ? 'waiting' : state.ceaValid ? 'done' : 'failed',
      detail: !registered ? 'No registration on this account' : state.ceaValid ? `Valid until ${sgDate(state.ceaValidUntil)}` : 'Ended on the register — publishing is paused until it is renewed',
    },
    {
      label: 'Reviewed by a V-RENT officer',
      state: a === 'approved' ? 'done' : a === 'rejected' || a === 'suspended' ? 'failed' : 'waiting',
      detail: {
        approved: 'Approved to publish',
        under_review: 'With a verification officer · usually within one business day',
        rejected: 'The details could not be matched — correct them to be reviewed again',
        suspended: 'Publication rights were withdrawn by an administrator',
        not_submitted: 'Starts once the profile is submitted',
      }[a],
      href: '/phase1/status',
    },
    {
      label: 'Email address confirmed',
      state: state.emailVerified ? 'done' : 'waiting',
      detail: state.emailVerified ? (user?.emailVerifiedAt ? `Confirmed on ${sgDate(user.emailVerifiedAt)}` : 'Confirmed') : 'Open the link sent to your inbox',
      href: '/phase1/verify',
    },
    {
      label: 'Mobile number confirmed',
      state: state.mobileVerified ? 'done' : 'waiting',
      detail: state.mobileVerified ? 'Confirmed' : 'Confirm it with a one-time code',
      href: '/phase1/verify',
    },
  ];

  // Completeness counts only what the agent controls; the register fields are always there.
  const own = [
    { done: p.mobile.trim().length > 0, label: 'Mobile number', target: 'p-mobile' },
    { done: p.experienceYears.trim().length > 0, label: 'Years of experience', target: 'p-experience' },
    { done: p.bio.trim().length > 0, label: 'Biography', target: 'p-bio' },
  ];

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader
        title="Profile & CEA"
        description="Your registration as the register holds it, and the details tenants see."
        meta={demo ? <DemoBadge title={DEMO_NOTICE} /> : undefined}
        actions={user && (
          <LinkButton href={`/phase1/homes/agent/${user.id}`} variant="outline" rightIcon={<ArrowUpRight size={15} />}>
            View public profile
          </LinkButton>
        )}
      />

      <div className="space-y-4 lg:space-y-5">
        {/* ------------------------------------------------ the registration */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-5">
          <IdentityCard
            name={name}
            registeredName={p.fullName}
            agency={p.agency}
            licence={p.agencyLicence}
            ceaNumber={p.ceaNumber}
            standing={standing}
            since={user?.createdAt}
          />
          {registered ? (
            <RegistrationPanel ceaNumber={p.ceaNumber} validUntil={state.ceaValidUntil} term={term} daysLeft={daysLeft} current={state.ceaValid} agency={p.agency} matchedOn={snapshot?.verifiedAt} />
          ) : (
            <Card padding="lg" className="flex items-center">
              <Callout tone="warning" title="No CEA registration on this account">
                Listings cannot be published without one.
              </Callout>
            </Card>
          )}
        </div>

        {/* --------------------------------------------- the agent's own, and checks */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-5">
          <div className="min-w-0 space-y-4 lg:space-y-5">
            <Card as="section" aria-labelledby="about-h" padding="none" className="vr-rise">
              <div className="p-5 sm:px-6">
                <CardHead id="about-h" title="About you" sub="Shown to tenants on your public page and listings">
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] text-p1-text-3" aria-live="polite">
                    {saving ? <><Spinner size={12} /> Saving</> : <><Check size={13} className="text-p1-success" aria-hidden /> Saved</>}
                  </span>
                </CardHead>
              </div>
              <div className="grid gap-5 border-t border-p1-border p-5 sm:grid-cols-2 sm:px-6">
                <TextInput
                  id="p-mobile"
                  label="Mobile number"
                  inputMode="tel"
                  placeholder={SG_MOBILE_DISPLAY}
                  value={p.mobile}
                  onChange={(e) => setProfile({ mobile: e.target.value })}
                  onBlur={(e) => {
                    /* Tidied when the agent leaves the field rather than as
                       they type, which would fight them mid-number. */
                    const tidy = normaliseSgMobile(e.target.value);
                    if (tidy && tidy !== p.mobile) setProfile({ mobile: tidy });
                  }}
                  error={p.mobile.trim() ? sgMobileProblem(p.mobile) ?? undefined : undefined}
                  hint="A Singapore mobile number. Shown to tenants who ask to call."
                  className="scroll-mt-28"
                />
                <div>
                  <div className="mb-1.5 text-[13.5px] font-medium text-p1-text">Email address</div>
                  <div className="flex h-11 items-center gap-2 rounded-lg border border-p1-border bg-p1-subtle px-3.5 text-[14px] text-p1-text-2">
                    <Mail size={14} aria-hidden className="shrink-0 text-p1-text-3" />
                    <span className="truncate">{p.email}</span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-p1-text-3">
                    Change it in <Link href="/phase1/settings" className="font-medium text-p1-primary hover:underline underline-offset-4">Settings</Link>.
                  </p>
                </div>
                <TextInput
                  id="p-experience"
                  label="Years of experience"
                  inputMode="numeric"
                  value={p.experienceYears}
                  onChange={(e) => setProfile({ experienceYears: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  optional
                  className="scroll-mt-28"
                />
                <div className="hidden sm:block" aria-hidden />
                <TextArea
                  id="p-bio"
                  label="Biography"
                  rows={5}
                  value={p.bio}
                  onChange={(e) => setProfile({ bio: e.target.value })}
                  className="scroll-mt-28"
                  containerClassName="sm:col-span-2"
                  counter={`${p.bio.length} / 600`}
                  maxLength={600}
                  /* A biography is advertising copy like any other: it is shown
                     on every listing this agent publishes. */
                  error={firstIssueMessage(p.bio) ?? undefined}
                  hint="The areas and property types you focus on. V-RENT will not write one for you."
                />
              </div>
            </Card>

            {registered && (
              <Card as="section" aria-labelledby="ad-h" padding="lg" className="vr-rise">
                <CardHead id="ad-h" title="On every advertisement" sub="The line the advertising rules require on anything you publish or send">
                  <Megaphone size={16} aria-hidden className="text-p1-text-3" />
                </CardHead>
                <p className="mt-4 rounded-lg border border-dashed border-p1-border-strong bg-p1-subtle/60 px-4 py-3 text-[14px] leading-6 text-p1-text">
                  {p.fullName} · <span className="font-mono tracking-[0.03em]">{p.ceaNumber}</span> · {p.agency}{p.agencyLicence && <> (<span className="font-mono tracking-[0.03em]">{p.agencyLicence}</span>)</>}
                </p>
              </Card>
            )}
          </div>

          <aside className="order-first min-w-0 space-y-4 lg:order-none lg:space-y-5">
            <VerificationSteps checks={checks} />
            <CompletenessCard items={own} />
            <Card as="section" aria-labelledby="acct-h" padding="lg" className="vr-rise">
              <CardHead id="acct-h" title="Account">
                <Link href="/phase1/settings" className="inline-flex items-center gap-1 text-[13px] font-medium text-p1-primary hover:underline underline-offset-4">
                  <Settings size={13} aria-hidden /> Settings
                </Link>
              </CardHead>
              <dl className="mt-4 divide-y divide-p1-border text-[13.5px]">
                {[
                  ['Signs in with', p.email || '—'],
                  ['Member since', user?.createdAt ? sgDate(user.createdAt) : '—'],
                  ['Account type', user?.role === 'admin' ? 'Administrator' : 'Agent'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <dt className="text-p1-text-3">{k}</dt>
                    <dd className="truncate font-medium text-p1-text">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
