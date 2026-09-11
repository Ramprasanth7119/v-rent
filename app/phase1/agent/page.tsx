"use client";

/**
 * Public agent page.
 *
 * A tenant who has been given a name wants to know two things before they get
 * in a car: is this person actually registered, and do they have anything like
 * what I am looking for. Both answers already exist in the workspace — the CEA
 * check and the live listings — so the public page is mostly a decision about
 * what to show rather than a new set of data.
 *
 * The preview is the page, not a picture of it: the same components, the same
 * data, laid out at the width a phone would give it. An agent will not turn
 * something on that they cannot see the effect of.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IdCard, Eye, Link2, Copy, Check, ShieldCheck, Phone, Mail, MapPin, Info, QrCode,
} from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, Callout, MetricStrip, Metric, EmptyState,
  TextInput, TextArea, Toggle, LinkButton, Avatar, cx,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { useDemo, TODAY, preferredName } from '../../../lib/phase1/DemoContext';
import { sgd } from '../../../lib/phase1/data';
import { districtName } from '../../../lib/phase1/performance';
import { agentSlug } from '../../../lib/phase1/tools';

export default function PublicAgentPage() {
  const { state, setTools } = useDemo();
  const p = state.profile;
  const page = state.tools.publicPage;
  const [copied, setCopied] = useState(false);

  const slug = page.slug || agentSlug(p.fullName, p.ceaNumber);
  const url = `vrent.sg/a/${slug}`;

  const live = useMemo(
    () => state.listings.filter((l) => !l.archived && l.status === 'published'),
    [state.listings],
  );

  const districts = useMemo(() => {
    const set = [...new Set(live.map((l) => l.district))].sort((a, b) => a - b);
    return set.map((d) => `D${String(d).padStart(2, '0')} ${districtName(d)}`);
  }, [live]);

  const set = (patch: Partial<typeof page>) => setTools({ publicPage: { ...page, ...patch } });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const headline = page.headline
    || `${p.agency ? `${p.agency} salesperson` : 'CEA-registered salesperson'} letting in ${districts.slice(0, 2).join(' and ') || 'Singapore'}`;

  const years = Number(p.experienceYears) || 0;

  return (
    <>
      <PageHeader
        eyebrow="Profile and reputation"
        title="Public agent page"
        description="One link a tenant can be given: your registration checked against the CEA register, the districts you work, and everything you currently have live."
        actions={<LinkButton href="/phase1/qr" variant="outline" leftIcon={<QrCode size={16} />}>Make a QR code</LinkButton>}
      />

      <MetricStrip className="mb-6" cols={3}>
        <Metric label="Live listings shown" value={live.length} hint={live.length ? 'Updated the moment you publish' : 'Nothing published yet'} icon={<Eye size={15} />} />
        <Metric label="Districts covered" value={districts.length} hint={districts.slice(0, 3).join(', ') || '—'} icon={<MapPin size={15} />} />
        <Metric label="Page" value={page.visible ? 'Visible' : 'Hidden'} tone={page.visible ? 'success' : 'warning'} hint={page.visible ? 'Anyone with the link can open it' : 'The link returns nothing'} icon={<IdCard size={15} />} />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* --------------------------------------------------------- settings */}
        <div className="grid min-w-0 content-start gap-4 [&>*]:min-w-0">
          <SectionCard title="Your link" icon={<Link2 size={16} />}>
            <div className="flex items-center gap-2 rounded-lg border border-p1-border bg-p1-subtle px-3.5 py-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-p1-text">{url}</span>
              <Button size="sm" variant="ghost" onClick={copy} leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <TextInput
              className="mt-4"
              label="Handle"
              value={page.slug}
              onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              placeholder={agentSlug(p.fullName, p.ceaNumber)}
              hint="Leave it empty and it is made from your name and registration number."
              optional
            />
          </SectionCard>

          <SectionCard title="What the page says" icon={<IdCard size={16} />}>
            <div className="grid gap-4">
              <TextArea
                label="Headline"
                rows={3}
                value={page.headline}
                onChange={(e) => set({ headline: e.target.value })}
                placeholder={headline}
                hint="One line under your name. Leave it empty and it is written from your districts."
                optional
              />
              <TextInput
                label="Districts you cover"
                value={page.districts}
                onChange={(e) => set({ districts: e.target.value })}
                placeholder={districts.join(', ') || 'D9, D10, D11'}
                hint="Leave it empty and it follows your live listings."
                optional
              />
            </div>
          </SectionCard>

          <SectionCard title="What to show" icon={<Eye size={16} />}>
            <div className="grid gap-4">
              <Toggle
                checked={page.visible}
                onChange={(v) => set({ visible: v })}
                label="Page is visible"
                description="Turn it off and the link stops resolving. Your listings stay live."
              />
              <Toggle
                checked={page.showEnquiryForm}
                onChange={(v) => set({ showEnquiryForm: v })}
                label="Enquiry form"
                description="A tenant can write to you without having your number."
              />
              <Toggle
                checked={page.showTrackRecord}
                onChange={(v) => set({ showTrackRecord: v })}
                label="Track record"
                description="Years registered and how many units you have live. Not transaction values."
              />
            </div>
          </SectionCard>

          <Callout tone="info" title="What is real here" icon={<Info size={17} />}>
            The settings and the preview are working and stored against your workspace. The page is served from the
            public tenant site, which is the later phase — so the address above does not resolve yet.
          </Callout>
        </div>

        {/* ---------------------------------------------------------- preview */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-p1display text-[17px] font-bold text-p1-text">Preview</h2>
            <span className="text-[12.5px] text-p1-text-3">Exactly what a tenant sees</span>
          </div>

          <Card padding="none" className={cx('overflow-hidden', !page.visible && 'opacity-60')}>
            {/* ------------------------------------------------------ masthead */}
            <div className="bg-p1-sidebar px-6 py-7 text-white sm:px-8">
              <div className="flex flex-wrap items-start gap-5">
                <Avatar name={preferredName(p.fullName) || 'Agent'} size="xl" tone="accent" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-p1display text-[24px] font-bold leading-tight text-white">
                    {preferredName(p.fullName) || 'Your name'}
                  </h3>
                  <p className="mt-1 text-[14px] leading-6 text-white/70">{headline}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold text-p1-accent">
                      <ShieldCheck size={13} aria-hidden />
                      CEA {p.ceaNumber || 'R000000A'}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] text-white/80">{p.agency || 'Your agency'}</span>
                    {page.showTrackRecord && years > 0 && (
                      <span className="rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] text-white/80">
                        {years} {years === 1 ? 'year' : 'years'} registered
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full bg-p1-accent px-4 py-2 text-[13.5px] font-semibold text-[#0E2124]">
                  <Phone size={14} aria-hidden />
                  {p.mobile || '+65 0000 0000'}
                </span>
                {page.showEnquiryForm && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[13.5px] font-semibold text-white">
                    <Mail size={14} aria-hidden />
                    Write to this agent
                  </span>
                )}
              </div>
            </div>

            {/* ----------------------------------------------------- verified */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-p1-border bg-p1-success-soft/50 px-6 py-3.5 sm:px-8">
              <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-p1-text">
                <ShieldCheck size={16} className="text-p1-success" aria-hidden />
                Registration verified against the public CEA register
              </span>
              <span className="text-[12.5px] text-p1-text-3">
                Checked {TODAY.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}
                {state.ceaValidUntil && ` · valid until ${new Date(state.ceaValidUntil).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </span>
            </div>

            {/* ----------------------------------------------------- listings */}
            <div className="px-6 py-6 sm:px-8">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-p1display text-[18px] font-bold text-p1-text">
                  {live.length} {live.length === 1 ? 'property available' : 'properties available'}
                </h4>
                <span className="text-[13px] text-p1-text-3">
                  {(page.districts || districts.join(', ')) || 'Singapore'}
                </span>
              </div>

              {live.length === 0 ? (
                <EmptyState
                  compact
                  title="Nothing live at the moment"
                  description="Your page still shows your verified registration and your contact details. Publish a listing and it appears here."
                  action={<LinkButton href="/phase1/listings/new" size="sm">Create a listing</LinkButton>}
                />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {live.slice(0, 6).map((l) => (
                    <li key={l.id} className="rounded-xl border border-p1-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-p1display text-[15px] font-bold text-p1-text">{l.project}</div>
                          <div className="mt-0.5 truncate text-[12.5px] text-p1-text-3">
                            D{String(l.district).padStart(2, '0')} {districtName(l.district)}
                          </div>
                        </div>
                        <Pill tone="accent">{l.propertyType === 'Executive Condominium' ? 'EC' : l.propertyType}</Pill>
                      </div>
                      <div className="mt-3 flex items-baseline justify-between gap-2">
                        <span className="font-p1display text-[17px] font-bold tabular-nums text-p1-text">{sgd(l.monthlyRent)}</span>
                        <span className="text-[12.5px] text-p1-text-2">
                          {l.bedrooms} bed · {l.sizeSqft.toLocaleString('en-SG')} sqft
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {live.length > 6 && (
                <p className="mt-3 text-[13px] text-p1-text-3">And {live.length - 6} more on the page.</p>
              )}
            </div>

            {/* --------------------------------------------------- compliance */}
            <div className="border-t border-p1-border bg-p1-subtle/60 px-6 py-4 text-[12.5px] leading-5 text-p1-text-3 sm:px-8">
              {p.fullName || 'Your name'} · {p.ceaNumber || 'R000000A'} · {p.agency || 'Your agency'}
              {p.agencyLicence && ` (${p.agencyLicence})`}. Verify this registration at{' '}
              <Link href="https://www.cea.gov.sg" target="_blank" rel="noreferrer" className="underline underline-offset-2">cea.gov.sg</Link>.
            </div>
          </Card>

          {!page.visible && (
            <Callout tone="warning" className="mt-3">
              The page is hidden. Anyone following your link gets nothing until you turn it back on.
            </Callout>
          )}
        </div>
      </div>
    </>
  );
}
