"use client";

/**
 * One enquiry, opened.
 *
 * The list answers who, which property, what stage and what next. This panel
 * carries the rest — what they asked for, how that sits against the unit,
 * what they wrote, how to reach them — and the buttons that move the enquiry
 * along. The buttons offered are only the ones that make sense from where the
 * enquiry is now.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, CalendarCheck, CalendarDays, Check, Mail, MessageCircle, Phone, RotateCcw, X,
} from 'lucide-react';
import { Avatar, Button, LinkButton, cx } from '../kit';
import { Drawer } from '../overlays';
import { DemoBadge } from '../DemoDataSwitch';
import { Channel, NextAction, PropertyLine, StagePill } from './parts';
import type { DemoListing } from '../../../lib/phase1/data';
import { sgd } from '../../../lib/phase1/data';
import type { Enquiry, EnquiryStatus } from '../../../lib/phase1/workspace';
import {
  contactKind, contactLinks, enquiryTime, fitChecks, isSeededSample, readStage,
} from '../../../lib/phase1/enquiries';
import { sgDate, sgDateTime, sgRelative } from '../../../lib/phase1/format';

const FIT_DOT = { success: 'bg-p1-success', warning: 'bg-p1-warning', neutral: 'bg-p1-border-strong' } as const;

export function EnquiryDetail({
  e, listing, own, ownerId, demo, now, onClose, onStatus,
}: {
  e: Enquiry | null;
  listing: DemoListing | undefined;
  own: boolean;
  ownerId?: string;
  demo: boolean;
  now: Date;
  onClose: () => void;
  onStatus: (status: EnquiryStatus, extra?: Pick<Enquiry, 'outcome' | 'viewingAt'>) => void;
}) {
  const [when, setWhen] = useState('');
  if (!e) return null;

  const r = readStage(e, now);
  const received = new Date(enquiryTime(e));
  const fits = fitChecks(e, listing);
  const links = contactLinks(e.contact);
  // A masked demo contact is still shown with its (disabled) buttons, so the panel looks as it will for a real one.
  const kind = demo ? (e.contact.includes('@') ? 'email' : 'phone') : contactKind(e.contact);
  // An old seeded sample's number was made up and may be somebody's: never dial or message it.
  const blocked = demo || isSeededSample(e.id);

  const confirmViewing = () => {
    if (!when) return;
    onStatus('viewing', { viewingAt: new Date(`${when}:00+08:00`).toISOString() });
    setWhen('');
  };

  const actions: React.ReactNode[] = [];
  if (e.status === 'new') {
    actions.push(
      <Button key="close" variant="ghost" leftIcon={<X size={15} />} onClick={() => onStatus('closed', { outcome: 'lost' })}>Not suitable</Button>,
      <Button key="contacted" leftIcon={<Check size={15} />} onClick={() => onStatus('replied')}>Mark as contacted</Button>,
    );
  } else if (e.status === 'replied') {
    actions.push(
      <Button key="lost" variant="ghost" leftIcon={<X size={15} />} onClick={() => onStatus('closed', { outcome: 'lost' })}>Unsuccessful</Button>,
      <Button key="followed" variant="outline" leftIcon={<RotateCcw size={15} />} onClick={() => onStatus('replied')}>Followed up</Button>,
      <Button key="viewing" leftIcon={<CalendarDays size={15} />} onClick={() => onStatus('viewing')}>Viewing requested</Button>,
    );
  } else if (e.status === 'viewing') {
    actions.push(
      <Button key="lost" variant="ghost" leftIcon={<X size={15} />} onClick={() => onStatus('closed', { outcome: 'lost' })}>Unsuccessful</Button>,
      <Button key="let" leftIcon={<Check size={15} />} onClick={() => onStatus('closed', { outcome: 'let' })}>Close as let</Button>,
    );
  } else {
    actions.push(
      <Button key="reopen" variant="outline" leftIcon={<RotateCcw size={15} />} onClick={() => onStatus('replied')}>Reopen</Button>,
    );
  }

  return (
    <Drawer
      open
      onClose={onClose}
      width="md"
      title={
        <span className="flex items-center gap-3">
          <Avatar name={e.name} size="md" tone={e.status === 'new' ? 'primary' : 'neutral'} />
          <span className="min-w-0">
            <span className="block truncate">{e.name}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] font-normal text-p1-text-3">
              <span suppressHydrationWarning title={sgDateTime(received)}>{sgRelative(received, now)}</span>
              <span aria-hidden>·</span>
              <Channel channel={e.channel} />
            </span>
          </span>
        </span>
      }
      footer={actions}
    >
      <div className="space-y-6">
        {demo && (
          <div className="flex items-start gap-2 rounded-lg border border-p1-warning-border bg-p1-warning-soft/60 px-3 py-2.5 text-[12.5px] leading-5 text-p1-text-2">
            <DemoBadge />
            <span>A sample enquiry. Contact actions are off and changes last only until you reload.</span>
          </div>
        )}

        {/* ------------------------------------------------ where it stands */}
        <section aria-label="Status" className="rounded-xl border border-p1-border bg-p1-subtle/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StagePill r={r} />
            <NextAction r={r} />
          </div>
          {e.viewingAt && (
            <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-p1-text-2">
              <CalendarCheck size={14} aria-hidden className="text-p1-text-3" />
              Viewing {new Date(e.viewingAt).getTime() > now.getTime() ? 'on' : 'held'}{' '}
              <span className="font-medium text-p1-text">{sgDateTime(e.viewingAt)}</span>
            </p>
          )}
          {e.status === 'viewing' && !e.viewingAt && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="mb-1 block text-[12.5px] font-medium text-p1-text-2">Agreed time</span>
                <input
                  type="datetime-local"
                  value={when}
                  onChange={(ev) => setWhen(ev.target.value)}
                  className="h-10 w-full rounded-lg border border-p1-border-strong bg-p1-surface px-3 text-[13.5px] text-p1-text focus-visible:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none"
                />
              </label>
              <Button size="md" variant="secondary" disabled={!when} onClick={confirmViewing}>Book viewing</Button>
            </div>
          )}
          {e.lastActionAt && (
            <p className="mt-2 text-[12.5px] text-p1-text-3" suppressHydrationWarning>
              Last moved along {sgRelative(e.lastActionAt, now)}
            </p>
          )}
        </section>

        {/* ------------------------------------------------------ the property */}
        <section aria-labelledby="enq-prop">
          <h3 id="enq-prop" className="mb-2 text-[12.5px] font-semibold text-p1-text-3">Property</h3>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-p1-border p-3">
            <PropertyLine l={listing} own={own} ownerId={ownerId} />
            {listing && own && (
              <Link href={`/phase1/listings/${listing.id}`} className="shrink-0 rounded-lg p-2 text-p1-text-3 hover:bg-p1-subtle hover:text-p1-text" aria-label={`Open ${listing.project}`}>
                <ArrowRight size={16} aria-hidden />
              </Link>
            )}
          </div>
          {listing && !own && <p className="mt-1.5 text-[12px] text-p1-text-3">Sample listing — not in your portfolio.</p>}
        </section>

        {/* -------------------------------------------------- what they want */}
        <section aria-labelledby="enq-want">
          <h3 id="enq-want" className="mb-2 text-[12.5px] font-semibold text-p1-text-3">What they are looking for</h3>
          <dl className="grid grid-cols-3 gap-2">
            {[
              { k: 'Budget', v: e.budget ? `${sgd(e.budget)}/mo` : 'Not given' },
              { k: 'Move-in', v: e.moveIn ? sgDate(e.moveIn) : 'Flexible' },
              { k: 'Bedrooms', v: typeof e.bedrooms === 'number' ? String(e.bedrooms) : 'Not given' },
            ].map((x) => (
              <div key={x.k} className="rounded-lg border border-p1-border px-3 py-2">
                <dt className="text-[12px] text-p1-text-3">{x.k}</dt>
                <dd className={cx('mt-0.5 text-[14px] font-semibold tabular-nums', x.v === 'Not given' ? 'text-p1-text-3' : 'text-p1-text')}>{x.v}</dd>
              </div>
            ))}
          </dl>
          {fits.length > 0 && (
            <ul className="mt-3 space-y-1.5" aria-label="Against this unit">
              {fits.map((f) => (
                <li key={f.key} className="flex items-center gap-2 text-[13px] text-p1-text-2">
                  <span aria-hidden className={cx('h-2 w-2 shrink-0 rounded-full', FIT_DOT[f.tone])} />
                  <span className="font-medium text-p1-text">{f.label}</span>
                  <span className="min-w-0">{f.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* --------------------------------------------------------- message */}
        <section aria-labelledby="enq-msg">
          <h3 id="enq-msg" className="mb-2 text-[12.5px] font-semibold text-p1-text-3">Message</h3>
          <blockquote className="rounded-xl border-l-[3px] border-p1-primary bg-p1-subtle/50 px-4 py-3 text-[14px] leading-6 text-p1-text">
            {e.message}
          </blockquote>
        </section>

        {/* --------------------------------------------------------- contact */}
        <section aria-labelledby="enq-contact">
          <h3 id="enq-contact" className="mb-2 text-[12.5px] font-semibold text-p1-text-3">Contact</h3>
          <p className="text-[14px] font-medium tabular-nums text-p1-text">{e.contact}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {kind === 'phone' && (
              <>
                <ContactButton href={links.call} disabled={blocked} icon={<Phone size={15} />}>Call</ContactButton>
                <ContactButton href={links.whatsapp} disabled={blocked} icon={<MessageCircle size={15} />} external>WhatsApp</ContactButton>
              </>
            )}
            {kind === 'email' && (
              <ContactButton href={links.email} disabled={blocked} icon={<Mail size={15} />}>Email</ContactButton>
            )}
          </div>
          {demo && <p className="mt-2 text-[12px] text-p1-text-3">Sample contact details are masked; nothing can be sent from a demo record.</p>}
          {!demo && isSeededSample(e.id) && <p className="mt-2 text-[12px] text-p1-warning">An example an earlier version of V-RENT added to your workspace. Its number was made up, so it cannot be called or messaged from here.</p>}
        </section>
      </div>
    </Drawer>
  );
}

function ContactButton({
  href, disabled, icon, external, children,
}: { href?: string; disabled: boolean; icon: React.ReactNode; external?: boolean; children: React.ReactNode }) {
  if (!href || disabled) {
    return <Button variant="outline" size="sm" leftIcon={icon} disabled>{children}</Button>;
  }
  return (
    <LinkButton
      href={href}
      variant="outline"
      size="sm"
      leftIcon={icon}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </LinkButton>
  );
}
