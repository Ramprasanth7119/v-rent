"use client";

/**
 * Account → Settings.
 *
 * Notification choices are stored against the account, so they survive a
 * reload and follow the agent to another device. Appearance is deliberately
 * not: a dark theme is a property of the screen someone is sitting at, not of
 * who they are.
 */

import { useState } from 'react';
import {
  Button, LinkButton, Card, SectionCard, PageHeader, Toggle, Segmented, Field, FieldGrid,
  Callout, Avatar } from '../../../components/phase1/kit';
import { StatusBadge } from '../../../components/phase1/status';
import { useToast } from '../../../components/phase1/Toast';
import { useTheme } from '../../../components/phase1/hooks';
import { usePersona } from '../../../components/layout/PersonaContext';
import { useDemo, preferredName } from '../../../lib/phase1/DemoContext';
import {
  Bell, Mail, MessageSquare, Sun, Moon, IdCard, ShieldCheck, CreditCard, ArrowRight } from 'lucide-react';

type Density = 'comfortable' | 'compact';

/** What each stored preference key means on screen. */
const EVENTS: { key: string; label: string; description: string; always?: string }[] = [
  { key: 'enquiry', label: 'New enquiry', description: 'A tenant asks about one of your listings.' },
  { key: 'moderation', label: 'Moderation outcome', description: 'A listing is approved or rejected by a moderator.', always: 'A rejection is always sent — it stops the listing being advertised.' },
  { key: 'expiry', label: 'Listing expiring', description: 'Seven days before a published listing expires.' },
  { key: 'cea', label: 'CEA registration', description: 'Sixty days before your registration lapses, and if the register changes.', always: 'A lapsed registration is always sent — publication stops with it.' },
  { key: 'billing', label: 'Billing and renewal', description: 'Payment taken, payment failed, and renewal reminders.' },
  { key: 'product', label: 'Product updates', description: 'New features and changes to the platform.' },
];

export default function SettingsPage() {
  const { state, set, saving } = useDemo();
  const { isDarkMode, setDarkMode } = usePersona();
  const { toggle: toggleTheme, ready: themeReady } = useTheme(setDarkMode, isDarkMode);
  const { push } = useToast();

  const [density, setDensity] = useState<Density>('comfortable');
  const prefs = state.notifications;

  const setPref = (key: string, channel: 'email' | 'sms', value: boolean) => {
    const current = prefs[key] ?? { email: false, sms: false };
    set({ notifications: { ...prefs, [key]: { ...current, [channel]: value } } });
  };

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="How V-RENT reaches you, and how this screen looks."
        actions={<span className="text-[13px] text-p1-text-3">{saving ? 'Saving…' : 'Saved to your account'}</span>}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionCard
            title="Notifications"
            description="Choose how V-RENT reaches you for each event."
            icon={<Bell size={18} className="text-p1-text-3" />}
            padding="none"
          >
            <div className="hidden grid-cols-[minmax(0,1fr)_88px_88px] gap-2 border-b border-p1-border px-5 py-2 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-p1-text-3 sm:grid sm:px-6">
              <span>Event</span>
              <span className="text-center">Email</span>
              <span className="text-center">SMS</span>
            </div>
            <ul className="divide-y divide-p1-border">
              {EVENTS.map((p) => (
                <li key={p.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_88px_88px] sm:px-6">
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-p1-text">{p.label}</div>
                    <div className="mt-0.5 text-[13px] leading-5 text-p1-text-2">{p.description}</div>
                    {p.always && <div className="mt-1 text-[12.5px] leading-5 text-p1-text-3">{p.always}</div>}
                  </div>
                  <div className="col-start-2 flex items-center gap-5 sm:contents">
                    <label className="flex cursor-pointer items-center gap-2 sm:justify-center">
                      <input
                        type="checkbox"
                        className="h-5 w-5 cursor-pointer rounded border-p1-border-strong accent-p1-primary"
                        checked={prefs[p.key]?.email ?? false}
                        onChange={(e) => setPref(p.key, 'email', e.target.checked)}
                      />
                      <span className="text-[13px] text-p1-text-2 sm:sr-only">
                        <Mail size={13} className="inline sm:hidden" aria-hidden /> Email for {p.label}
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 sm:justify-center">
                      <input
                        type="checkbox"
                        className="h-5 w-5 cursor-pointer rounded border-p1-border-strong accent-p1-primary"
                        checked={prefs[p.key]?.sms ?? false}
                        onChange={(e) => setPref(p.key, 'sms', e.target.checked)}
                      />
                      <span className="text-[13px] text-p1-text-2 sm:sr-only">
                        <MessageSquare size={13} className="inline sm:hidden" aria-hidden /> SMS for {p.label}
                      </span>
                    </label>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-p1-border px-5 py-3 text-[12.5px] leading-5 text-p1-text-3 sm:px-6">
              Text messages are sent from a registered Singapore sender name. Registration with SGNIC is required before any
              SMS can be delivered, so SMS stays off in the sandbox.
            </div>
          </SectionCard>

          <SectionCard title="Appearance" description="Applies to this browser only.">
            <div className="space-y-4">
              <Toggle
                checked={isDarkMode}
                onChange={() => toggleTheme()}
                label={<span className="inline-flex items-center gap-2">{isDarkMode ? <Moon size={15} aria-hidden /> : <Sun size={15} aria-hidden />} Dark theme</span>}
                description={themeReady ? 'Remembered on this device.' : 'Loading your saved preference…'}
              />
              <div>
                <div className="mb-2 text-[14px] font-medium text-p1-text">Table density</div>
                <Segmented<Density>
                  label="Table density"
                  value={density}
                  onChange={setDensity}
                  options={[{ key: 'comfortable', label: 'Comfortable' }, { key: 'compact', label: 'Compact' }]}
                />
                <p className="mt-2 text-[13px] text-p1-text-3">Compact fits roughly a third more rows on screen. Applied to listing and admin tables.</p>
              </div>
            </div>
          </SectionCard>


        </div>

        <div className="space-y-4">
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <Avatar name={preferredName(state.profile.fullName)} size="lg" />
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-p1-text">{preferredName(state.profile.fullName)}</div>
                <div className="truncate text-[12.5px] text-p1-text-2">{state.profile.agency}</div>
              </div>
            </div>
            <FieldGrid cols={1} className="mt-4">
              <Field label="Email" value={state.profile.email} />
              <Field label="Mobile" value={state.profile.mobile} />
              <Field label="CEA registration no." value={state.profile.ceaNumber} mono />
            </FieldGrid>
            <LinkButton href="/phase1/profile" variant="outline" size="sm" block className="mt-4" leftIcon={<IdCard size={15} />}>
              Edit profile
            </LinkButton>
          </Card>

          <SectionCard title="Account status" padding="sm">
            <ul className="divide-y divide-p1-border">
              <li className="flex items-center gap-3 py-2.5">
                <ShieldCheck size={16} className="shrink-0 text-p1-text-3" aria-hidden />
                <span className="flex-1 text-[13.5px] text-p1-text">Verification</span>
                <StatusBadge kind="agent" value={state.approval} size="sm" />
              </li>
              <li className="flex items-center gap-3 py-2.5">
                <CreditCard size={16} className="shrink-0 text-p1-text-3" aria-hidden />
                <span className="flex-1 text-[13.5px] text-p1-text">Subscription</span>
                <StatusBadge kind="subscription" value={state.subscription} size="sm" />
              </li>
            </ul>
            <LinkButton href="/phase1/status" variant="link" size="sm" className="mt-2 text-[13px]">
              Open verification <ArrowRight size={13} aria-hidden />
            </LinkButton>
          </SectionCard>

          <Card padding="sm" className="border-dashed">
            <div className="text-[13.5px] font-semibold text-p1-text">Data and privacy</div>
            <p className="mt-1 text-[12.5px] leading-5 text-p1-text-3">
              No personal data leaves this browser in the prototype. In production, agent identity documents are held in
              private storage with signed, expiring links, and every access is written to the audit log.
            </p>
          </Card>
        </div>
      </div>



    </>
  );
}
