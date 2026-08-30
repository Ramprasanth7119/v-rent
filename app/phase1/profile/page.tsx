"use client";

import { useRouter } from 'next/navigation';
import { Avatar, Button, Callout, Card, PageHeader, PresenterNote, ProgressBar, SectionCard, SelectInput, Stepper, TextArea, TextInput } from '../../../components/phase1/kit';
import { StatusBadge } from '../../../components/phase1/status';
import { JOURNEY_STEPS, journeyCompleted } from '../../../components/phase1/journey';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { User, Briefcase, Building2, BadgeCheck, ArrowRight, Camera } from 'lucide-react';

const AGENCIES = [
  { value: 'Huttons Asia Pte Ltd|L3008899K', label: 'Huttons Asia Pte Ltd (L3008899K)' },
  { value: 'PropNex Realty Pte Ltd|L3008022J', label: 'PropNex Realty Pte Ltd (L3008022J)' },
  { value: 'ERA Realty Network Pte Ltd|L3002382K', label: 'ERA Realty Network Pte Ltd (L3002382K)' },
  { value: 'OrangeTee & Tie Pte Ltd|L3009250K', label: 'OrangeTee & Tie Pte Ltd (L3009250K)' },
];

const CEA_PATTERN = /^R\d{6}[A-Z]$/;

export default function ProfilePage() {
  const router = useRouter();
  const { state, set, setProfile } = useDemo();
  const p = state.profile;

  const ceaValid = CEA_PATTERN.test(p.ceaNumber.toUpperCase());
  const filled = [p.fullName, p.bio, p.agency].every((v) => v.trim().length > 0);
  const ready = ceaValid && filled;

  const completeness = Math.round(
    ([p.fullName, p.bio, p.agency, p.experienceYears, ceaValid ? 'x' : ''].filter(
      (v) => v && v.trim().length > 0
    ).length /
      5) *
      100
  );

  const submit = () => {
    set({ profileSubmitted: true, approval: 'under_review' });
    router.push('/phase1/status');
  };

  const agentStatus = state.profileSubmitted ? state.approval : 'not_submitted';

  return (
    <>
      <PageHeader
        eyebrow="Step 3 of 8"
        title="Your professional profile"
        description="Tell us who you are and where you practise. This becomes your public agent profile once tenants can search."
      />
      <Stepper steps={JOURNEY_STEPS} current={2} completed={journeyCompleted(state)} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (ready) submit(); }}>
          <SectionCard title="Personal information" icon={<User size={18} />}>
            <div className="grid gap-5">
              <TextInput label="Display name" required value={p.fullName} onChange={(e) => setProfile({ fullName: e.target.value })} hint="Shown on your listings. Must match your name on the CEA register." />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput label="Email address" type="email" value={p.email} onChange={(e) => setProfile({ email: e.target.value })} hint="Confirmed in the previous step." />
                <TextInput label="Mobile number" inputMode="tel" value={p.mobile} onChange={(e) => setProfile({ mobile: e.target.value })} hint="Where tenants and V-RENT will call you." />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Professional information" icon={<Briefcase size={18} />}>
            <div className="grid gap-5">
              <TextInput
                label="Years of experience"
                inputMode="numeric"
                value={p.experienceYears}
                onChange={(e) => setProfile({ experienceYears: e.target.value.replace(/\D/g, '') })}
                hint="Helps tenants choose an agent they trust."
                containerClassName="sm:max-w-xs"
              />
              <TextArea label="Professional biography" required rows={4} value={p.bio} onChange={(e) => setProfile({ bio: e.target.value })} hint="Two or three sentences about the areas and property types you focus on." />
            </div>
          </SectionCard>

          <SectionCard title="Agency" icon={<Building2 size={18} />}>
            <SelectInput
              label="Agency"
              required
              options={AGENCIES}
              value={`${p.agency}|${p.agencyLicence}`}
              onChange={(e) => {
                const [agency, agencyLicence] = e.target.value.split('|');
                setProfile({ agency, agencyLicence });
              }}
              hint="The agency licence number appears on every advertisement you publish."
            />
          </SectionCard>

          <SectionCard title="CEA registration" description="We check this against the CEA salesperson register published on data.gov.sg." icon={<BadgeCheck size={18} />}>
            <TextInput
              label="CEA registration number"
              required
              value={p.ceaNumber}
              onChange={(e) => setProfile({ ceaNumber: e.target.value.toUpperCase() })}
              error={p.ceaNumber && !ceaValid ? 'Expected format R123456A — one letter, six digits, one letter.' : undefined}
              hint="Found on your CEA card. One account per registration."
              containerClassName="sm:max-w-sm"
            />
            <Callout tone="neutral" title="Appears on every advertisement" className="mt-5">
              <span className="font-medium text-p1-text">{p.fullName} · {p.ceaNumber} · {p.agency} ({p.agencyLicence})</span>
              <span className="mt-1 block">Singapore advertising rules require the salesperson name, registration number and agency licence number on every listing.</span>
            </Callout>
          </SectionCard>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {!ready && <span className="text-[14px] text-p1-text-3">Complete the required fields to continue.</span>}
            <Button type="submit" variant="accent" size="lg" disabled={!ready} rightIcon={<ArrowRight size={17} />}>Submit for verification</Button>
          </div>
        </form>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar name={p.fullName || 'Agent'} size="xl" />
                <button type="button" aria-label="Add profile photo" className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-p1-surface bg-p1-accent text-p1-accent-on shadow-p1-sm cursor-pointer"><Camera size={15} /></button>
              </div>
              <div className="mt-3 text-[17px] font-semibold text-p1-text">{p.fullName || 'Your name'}</div>
              <div className="text-[14px] text-p1-text-2">{p.agency}</div>
              <div className="mt-3"><StatusBadge kind="agent" value={agentStatus} /></div>
            </div>
            <ProgressBar value={completeness} label="Profile completeness" className="mt-5" tone={completeness === 100 ? 'success' : 'accent'} />
            <p className="mt-2 text-[13px] leading-5 text-p1-text-3">A complete profile is reviewed faster and looks better to tenants.</p>
          </Card>
          <Card className="bg-p1-subtle/60">
            <div className="text-[14px] font-semibold text-p1-text">What happens after you submit</div>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14px] leading-5 text-p1-text-2">
              <li>Your CEA number is matched against the public register.</li>
              <li>A verification officer confirms the match — usually within one business day.</li>
              <li>You choose a plan and start listing.</li>
            </ol>
          </Card>
        </div>
      </div>

      <PresenterNote>
        A unique constraint prevents two accounts claiming the same CEA registration number. Agency membership is stored in its own table even though Phase 1 supports individual agents only, so agency accounts later are an added feature rather than a data migration. Changing the CEA number or agency after approval re-triggers verification, because the agency licence number appears on every advertisement already published. Name, registration number and licence number are frozen into a compliance snapshot when a listing is published.
      </PresenterNote>
    </>
  );
}
