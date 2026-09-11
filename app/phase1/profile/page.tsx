"use client";

/**
 * The agent's profile.
 *
 * Two kinds of fact live here and they are not treated alike. Name, registration
 * number, agency and licence come from the CEA register and are shown read-only:
 * they are what appears on every advertisement, and letting an agent type over
 * them would put a claim on a listing that the register does not support.
 * Everything else — how tenants reach you, what you write about yourself — is
 * the agent's own and is editable, saved as it is typed.
 *
 * This screen used to be step three of an eight-step application, with an
 * agency dropdown of four hard-coded firms. An account now arrives already
 * verified against the register, so the application is over before this screen
 * is reached.
 */

import {
  Avatar, Button, Callout, Card, Field, FieldGrid, PageHeader, ProgressBar, SectionCard,
  TextArea, TextInput,
} from '../../../components/phase1/kit';
import { StatusBadge } from '../../../components/phase1/status';
import { useToast } from '../../../components/phase1/Toast';
import { useDemo, preferredName } from '../../../lib/phase1/DemoContext';
import { User, Briefcase, BadgeCheck, Camera, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { state, setProfile, saving } = useDemo();
  const { push } = useToast();
  const p = state.profile;

  const registered = Boolean(p.ceaNumber);
  const name = preferredName(p.fullName) || 'Your name';

  // Completeness covers only what the agent controls; the register fields are
  // always present and counting them would flatter the number.
  const own = [p.mobile, p.bio, p.experienceYears];
  const completeness = Math.round((own.filter((v) => v.trim().length > 0).length / own.length) * 100);

  const agentStatus = state.profileSubmitted ? state.approval : 'not_submitted';

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        description="What tenants see beside your listings, and what the law requires on every advertisement."
        actions={<StatusBadge kind="agent" value={agentStatus} size="lg" />}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <SectionCard
            title="From the CEA register"
            description="Matched against the public register on data.gov.sg when your account was verified."
            icon={<BadgeCheck size={18} />}
            actions={<Link href="/phase1/status" className="text-[13px] font-medium text-p1-primary hover:underline underline-offset-4 dark:text-p1-info">Verification</Link>}
          >
            {registered ? (
              <>
                <FieldGrid cols={2}>
                  <Field label="Registered name" value={p.fullName} />
                  <Field label="Registration number" value={p.ceaNumber} mono />
                  <Field label="Agency" value={p.agency} />
                  <Field label="Agency licence" value={p.agencyLicence} mono />
                </FieldGrid>
                <Callout tone="neutral" title="Appears on every advertisement" className="mt-5">
                  <span className="font-medium text-p1-text">{p.fullName} · {p.ceaNumber} · {p.agency} ({p.agencyLicence})</span>
                  <span className="mt-1 block">
                    Singapore advertising rules require the salesperson name, registration number and agency licence
                    number on every listing. These follow the register — move agency and V-RENT picks it up at the next
                    daily check, rather than asking you to retype it.
                  </span>
                </Callout>
              </>
            ) : (
              <Callout tone="warning" title="No CEA registration on this account">
                Agent accounts are created against a registration number. This account has none, so no listing can be
                published from it.
              </Callout>
            )}
          </SectionCard>

          <SectionCard title="How tenants reach you" icon={<User size={18} />}>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextInput
                label="Mobile number"
                inputMode="tel"
                value={p.mobile}
                onChange={(e) => setProfile({ mobile: e.target.value })}
                hint="Shown to tenants who ask to call. Changing it asks for a new confirmation code."
              />
              <Field label="Email address" value={p.email} />
            </div>
            <p className="mt-4 text-[13px] leading-5 text-p1-text-3">
              Your email address is how you sign in, so it is changed from{' '}
              <Link href="/phase1/settings" className="font-medium text-p1-primary hover:underline underline-offset-4 dark:text-p1-info">Settings</Link>{' '}
              rather than here.
            </p>
          </SectionCard>

          <SectionCard title="Professional information" icon={<Briefcase size={18} />}>
            <div className="grid gap-5">
              <TextInput
                label="Years of experience"
                inputMode="numeric"
                value={p.experienceYears}
                onChange={(e) => setProfile({ experienceYears: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                hint="Helps tenants choose an agent they trust."
                containerClassName="sm:max-w-xs"
              />
              <TextArea
                label="Professional biography"
                rows={4}
                value={p.bio}
                onChange={(e) => setProfile({ bio: e.target.value })}
                hint="Two or three sentences about the areas and property types you focus on. Yours to write — V-RENT will not invent one for you."
              />
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className="text-[13px] text-p1-text-3">{saving ? 'Saving…' : 'Changes are saved as you type.'}</span>
            <Button
              variant="outline"
              onClick={() => push({ tone: 'success', title: 'Profile saved', body: 'Your details are up to date.' })}
            >
              Done
            </Button>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar name={name} size="xl" />
                <button type="button" aria-label="Add profile photo" className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-p1-surface bg-p1-primary text-white shadow-p1-sm"><Camera size={15} /></button>
              </div>
              <div className="mt-3 text-[17px] font-semibold text-p1-text">{name}</div>
              <div className="text-[14px] text-p1-text-2">{p.agency || 'No agency on file'}</div>
              {registered && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-p1-text-3">
                  <ShieldCheck size={14} className="text-p1-success" aria-hidden /> {p.ceaNumber}
                </div>
              )}
            </div>
            <ProgressBar value={completeness} label="Profile completeness" className="mt-5" tone={completeness === 100 ? 'success' : 'accent'} />
            <p className="mt-2 text-[13px] leading-5 text-p1-text-3">
              A biography, a mobile number and your years of experience are all a tenant has to judge you by before
              they call.
            </p>
          </Card>

          <Card className="bg-p1-subtle/60">
            <div className="text-[14px] font-semibold text-p1-text">Where these details appear</div>
            <ul className="mt-2 space-y-1.5 text-[14px] leading-5 text-p1-text-2">
              <li>The compliance line on every listing you publish.</li>
              <li>Your public agent page, once the tenant site opens.</li>
              <li>The enquiry a tenant sends, so they know who replied.</li>
            </ul>
            <Link href="/phase1/listings" className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-p1-primary hover:underline underline-offset-4 dark:text-p1-info">
              See your listings <ArrowRight size={13} aria-hidden />
            </Link>
          </Card>
        </div>
      </div>

    </>
  );
}
