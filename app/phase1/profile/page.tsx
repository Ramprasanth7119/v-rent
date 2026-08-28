"use client";

import { useRouter } from 'next/navigation';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Textarea, Select } from '../../../components/ui/Input';
import { PageHead, SpecNote, StepRail } from '../../../components/phase1/bits';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { BadgeCheck, Info } from 'lucide-react';

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

  return (
    <>
      <PageHead
        module="M6 · Agent Profile and Agency Directory"
        title="Professional profile and CEA details"
        blurb="This becomes the public agent profile in Phase 2, so it is captured properly now."
      />
      <StepRail
        current={2}
        steps={[
          { label: 'Account', done: true },
          { label: 'Verify', done: true },
          { label: 'Profile', done: state.profileSubmitted },
          { label: 'Approval', done: state.approval === 'approved' },
          { label: 'Plan', done: !!state.plan },
          { label: 'Listings', done: false },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-5">
          <Card>
            <div className="mb-4 text-sm font-semibold text-foreground">About you</div>
            <div className="grid gap-4">
              <Input label="Display name" value={p.fullName} onChange={(e) => setProfile({ fullName: e.target.value })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Mobile" value={p.mobile} onChange={(e) => setProfile({ mobile: e.target.value })} />
                <Input
                  label="Years of experience"
                  value={p.experienceYears}
                  onChange={(e) => setProfile({ experienceYears: e.target.value.replace(/\D/g, '') })}
                />
              </div>
              <Textarea
                label="Professional biography"
                rows={3}
                value={p.bio}
                onChange={(e) => setProfile({ bio: e.target.value })}
              />
            </div>
          </Card>

          <Card>
            <div className="mb-1 text-sm font-semibold text-foreground">CEA registration</div>
            <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
              Checked against the CEA salesperson register published on data.gov.sg.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="CEA registration number"
                value={p.ceaNumber}
                onChange={(e) => setProfile({ ceaNumber: e.target.value.toUpperCase() })}
                error={p.ceaNumber && !ceaValid ? 'Expected format R123456A' : undefined}
              />
              <Select
                label="Agency"
                options={AGENCIES}
                value={`${p.agency}|${p.agencyLicence}`}
                onChange={(e) => {
                  const [agency, agencyLicence] = e.target.value.split('|');
                  setProfile({ agency, agencyLicence });
                }}
              />
            </div>
            <div className="mt-4 rounded-lg border border-border bg-neutral-50 p-3 dark:bg-neutral-950/40">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Appears on every advertisement
              </div>
              <p className="mt-1.5 text-xs text-foreground">
                {p.fullName} · {p.ceaNumber} · {p.agency} ({p.agencyLicence})
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                Advertising rules require the salesperson name, registration number and agency licence
                number on every listing. These three values are frozen into a compliance snapshot when a
                listing is published.
              </p>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-xs font-semibold text-foreground">Profile completeness</span>
              <span className="text-sm font-semibold tabular-nums text-brand-gold">{completeness}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-brand-gold transition-all duration-300"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              An agent should always know what is outstanding before they submit.
            </p>
          </Card>

          <Card className="border-brand-gold/30 bg-brand-gold/5">
            <div className="flex items-start gap-2.5">
              <BadgeCheck size={16} className="mt-0.5 flex-shrink-0 text-brand-gold" />
              <div>
                <div className="text-xs font-semibold text-foreground">One agent per registration</div>
                <p className="mt-1 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                  A unique constraint in the database prevents two accounts claiming the same CEA
                  registration number.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-2.5">
              <Info size={16} className="mt-0.5 flex-shrink-0 text-neutral-400" />
              <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                Agency membership is stored in its own table even though Phase 1 supports individual
                agents only. That is what makes agency accounts an added feature later rather than a
                data migration.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="gold" size="lg" disabled={!ready} onClick={submit}>
          Submit for verification
        </Button>
      </div>

      <SpecNote>
        Changing the CEA number or the agency after approval re-triggers verification. A change of
        agency is not an ordinary profile edit, because the agency licence number appears on every
        advertisement already published.
      </SpecNote>
    </>
  );
}
