"use client";

import Link from 'next/link';
import { PageHeader, StatCard, SectionCard, Card, KeyValue, LinkButton, PresenterNote } from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { AUDIT_LOG, MODERATION_QUEUE, SUBSCRIPTIONS, VERIFICATION_QUEUE } from '../../../lib/phase1/data';
import { AGENTS } from '../../../lib/phase1/agents';
import { ShieldCheck, Gavel, Receipt, Users, ArrowRight, Database, RefreshCw, Building2, UserPlus } from 'lucide-react';

export default function AdminOverviewPage() {
  const attention = SUBSCRIPTIONS.filter((s) => s.status === 'past_due' || s.status === 'expired').length;
  const approved = AGENTS.filter((a) => a.status === 'approved').length;

  const queues = [
    { icon: ShieldCheck, title: 'Verification queue', count: VERIFICATION_QUEUE.length, oldest: 'Oldest waiting 2 days', href: '/phase1/admin/verification' },
    { icon: Gavel, title: 'Moderation queue', count: MODERATION_QUEUE.length, oldest: 'Oldest waiting 1 day', href: '/phase1/admin/moderation' },
    { icon: Receipt, title: 'Subscriptions needing attention', count: attention, oldest: 'Oldest past due 4 days', href: '/phase1/admin/subscriptions' },
    { icon: Users, title: 'Agents awaiting a decision', count: AGENTS.filter((a) => a.status === 'under_review').length, oldest: 'Newest registered today', href: '/phase1/admin/agents' },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Back office"
        title="Administration"
        description="Everything that needs a person today: verification decisions, listing reviews, and payments that need attention."
      />

      <div className="vr-stagger mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Verification queue" value={VERIFICATION_QUEUE.length} hint="pending decisions" tone="warning" icon={<ShieldCheck size={16} />} href="/phase1/admin/verification" />
        <StatCard label="Moderation queue" value={MODERATION_QUEUE.length} hint="listings to review" icon={<Gavel size={16} />} href="/phase1/admin/moderation" />
        <StatCard label="Subscriptions" value={attention} hint="past due or expired" tone="danger" icon={<Receipt size={16} />} href="/phase1/admin/subscriptions" />
        <StatCard label="Agents" value={AGENTS.length} hint={`${approved} verified`} icon={<Users size={16} />} href="/phase1/admin/agents" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard title="Work queues" description="Oldest items first. Each queue records who decided and when." padding="none">
          <ul className="divide-y divide-p1-border">
            {queues.map((q) => (
              <li key={q.title} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-p1-primary-soft text-p1-primary" aria-hidden><q.icon size={20} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-p1-text">{q.title}</span>
                    <Pill tone={q.count > 0 ? 'warning' : 'neutral'}>{q.count} waiting</Pill>
                  </div>
                  <div className="mt-0.5 text-[13px] text-p1-text-3">{q.oldest}</div>
                </div>
                <LinkButton href={q.href} variant="outline" size="sm" rightIcon={<ArrowRight size={14} />}>Open queue</LinkButton>
              </li>
            ))}
          </ul>
        </SectionCard>

        <div className="space-y-5">
          <Card>
            <h2 className="text-[16px] font-semibold text-p1-text">Today</h2>
            <p className="mt-0.5 text-[13px] text-p1-text-3">28 August 2026</p>
            <KeyValue className="mt-3" rows={[
              { k: <span className="flex items-center gap-2"><Database size={14} aria-hidden /> Register synchronised</span>, v: '06:00 · 4,812 records' },
              { k: <span className="flex items-center gap-2"><RefreshCw size={14} aria-hidden /> Reconciliation</span>, v: '03:00 · no divergence' },
              { k: <span className="flex items-center gap-2"><Building2 size={14} aria-hidden /> Listings published</span>, v: '7' },
              { k: <span className="flex items-center gap-2"><UserPlus size={14} aria-hidden /> New registrations</span>, v: '3' },
            ]} />
          </Card>

          <Card padding="none">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-[16px] font-semibold text-p1-text">Recent audit activity</h2>
              <Link href="/phase1/admin/reports" className="text-[13px] font-medium text-p1-accent-text hover:underline underline-offset-4">View all</Link>
            </div>
            <ul className="divide-y divide-p1-border border-t border-p1-border">
              {AUDIT_LOG.slice(0, 5).map((r, i) => (
                <li key={i} className="px-5 py-3">
                  <div className="text-[14px] text-p1-text">{r.action}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] text-p1-text-3">
                    <span className="font-mono">{r.at}</span>
                    <span>·</span>
                    <span className="font-mono">{r.actor}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <PresenterNote>
        Every screen in the console reads from the same audit log the actions write to, in the same transaction. Administrator accounts require two-factor authentication and permissions are checked on the server — a moderator never sees refund controls.
      </PresenterNote>
    </>
  );
}
