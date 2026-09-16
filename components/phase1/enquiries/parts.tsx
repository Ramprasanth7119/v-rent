"use client";

/**
 * The small pieces the enquiry screens share: the stage pill, the next action,
 * the channel mark, and the property line.
 */

import React from 'react';
import { Building2, MessageCircle, MessageSquare, Phone } from 'lucide-react';
import { cx } from '../kit';
import { Pill } from '../status';
import { PropertyImage } from '../PropertyImage';
import type { DemoListing } from '../../../lib/phase1/data';
import { sgd } from '../../../lib/phase1/data';
import type { Enquiry } from '../../../lib/phase1/workspace';
import type { StageReading } from '../../../lib/phase1/enquiries';
import { coverPhoto } from '../../../lib/phase1/photos';

export const CHANNEL_ICON: Record<Enquiry['channel'], React.ReactNode> = {
  'V-RENT': <MessageSquare size={13} aria-hidden />,
  WhatsApp: <MessageCircle size={13} aria-hidden />,
  Phone: <Phone size={13} aria-hidden />,
};

export function Channel({ channel, className = '' }: { channel: Enquiry['channel']; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 text-[12.5px] text-p1-text-3', className)}>
      {CHANNEL_ICON[channel]}{channel}
    </span>
  );
}

export function StagePill({ r }: { r: StageReading }) {
  return (
    <span className="inline-flex transition-opacity duration-200" key={r.stage}>
      <Pill tone={r.tone}>{r.label}</Pill>
    </span>
  );
}

const URGENCY_TEXT: Record<StageReading['urgency'], string> = {
  high: 'text-p1-danger',
  medium: 'text-p1-warning',
  low: 'text-p1-text-2',
  none: 'text-p1-text-3',
};

/** The next step in words, coloured by how soon it is needed. */
export function NextAction({ r, className = '', small = false }: { r: StageReading; className?: string; small?: boolean }) {
  const size = small ? 'text-[12px]' : 'text-[13px]';
  if (!r.action) return <span className={cx(size, 'text-p1-text-3', className)}>Nothing to do</span>;
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-medium', size, URGENCY_TEXT[r.urgency], className)}>
      {(r.urgency === 'high' || r.urgency === 'medium') && (
        <span aria-hidden className={cx('h-1.5 w-1.5 shrink-0 rounded-full', r.urgency === 'high' ? 'bg-p1-danger' : 'bg-p1-warning')} />
      )}
      {r.action}
    </span>
  );
}

/** Thumbnail, development, unit and rent. The photograph is the agent's own; a sample listing gets a mark. */
export function PropertyLine({
  l, ownerId, own, size = 'md', className = '',
}: { l: DemoListing | undefined; ownerId?: string; own: boolean; size?: 'sm' | 'md'; className?: string }) {
  if (!l) return <span className={cx('text-[13px] text-p1-text-3', className)}>Listing removed</span>;
  const src = own ? coverPhoto(ownerId, l) : undefined;
  const box = size === 'sm' ? 'h-9 w-12' : 'h-11 w-[60px]';
  return (
    <span className={cx('flex min-w-0 items-center gap-3', className)}>
      {src ? (
        <PropertyImage seed={l.reference + l.project} src={src} alt="" rounded="rounded-md" className={cx(box, 'shrink-0')} />
      ) : (
        <span aria-hidden className={cx(box, 'flex shrink-0 items-center justify-center rounded-md border border-p1-border bg-p1-subtle text-p1-text-3')}>
          <Building2 size={16} />
        </span>
      )}
      <span className="min-w-0">
        <span className={cx('block truncate font-semibold text-p1-text', size === 'sm' ? 'text-[13px]' : 'text-[14px]')}>{l.project}</span>
        <span className="block truncate text-[12.5px] text-p1-text-3">
          {l.unitNo && l.unitNo !== '—' ? `${l.unitNo} · ` : ''}{l.bedrooms ? `${l.bedrooms} bed · ` : ''}{sgd(l.monthlyRent)}/mo
        </span>
      </span>
    </span>
  );
}
