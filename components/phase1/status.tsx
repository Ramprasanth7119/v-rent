"use client";

/**
 * One status system for the whole Phase 1 prototype.
 * Every status carries an icon and a label, so meaning never depends on colour alone.
 */

import React from 'react';
import {
  Check, Clock, AlertCircle, X, Pause, CircleDashed, ShieldCheck, ShieldAlert,
  Ban, Search, CalendarX, CreditCard, HelpCircle,
} from 'lucide-react';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

interface StatusDef {
  label: string;
  tone: Tone;
  icon: React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;
  help?: string;
}

/** Listing lifecycle. */
export const LISTING_STATUS: Record<string, StatusDef> = {
  draft:          { label: 'Draft',          tone: 'neutral', icon: CircleDashed, help: 'Saved but not yet submitted. Not visible to anyone else.' },
  pending_review: { label: 'Pending review', tone: 'warning', icon: Clock,        help: 'Submitted and waiting for a moderator.' },
  published:      { label: 'Published',      tone: 'success', icon: Check,        help: 'Live. Will be visible to tenants once the public site opens.' },
  paused:         { label: 'Paused',         tone: 'info',    icon: Pause,        help: 'Temporarily hidden by you. Resume any time.' },
  rejected:       { label: 'Rejected',       tone: 'danger',  icon: X,            help: 'A moderator declined this listing. See the reason and resubmit.' },
  expired:        { label: 'Expired',        tone: 'neutral', icon: CalendarX,    help: 'Listing duration ran out. Renew to publish again.' },
  suspended:      { label: 'Suspended',      tone: 'danger',  icon: Ban,          help: 'Withdrawn by an administrator.' },
};

/** Agent account standing. */
export const AGENT_STATUS: Record<string, StatusDef> = {
  approved:             { label: 'Verified',        tone: 'success', icon: ShieldCheck, help: 'CEA registration matched and approved by an officer.' },
  under_review:         { label: 'Under review',    tone: 'warning', icon: Clock,       help: 'Application is with a verification officer.' },
  not_submitted:        { label: 'Not submitted',   tone: 'neutral', icon: CircleDashed },
  rejected:             { label: 'Rejected',        tone: 'danger',  icon: X },
  suspended:            { label: 'Suspended',       tone: 'danger',  icon: Ban,         help: 'Publication rights withdrawn by an administrator.' },
  verification_expired: { label: 'CEA expired',     tone: 'danger',  icon: ShieldAlert, help: 'Registration lapsed on the CEA register. Publication is blocked until renewed.' },
};

/** Automated CEA match outcome. */
export const MATCH_STATUS: Record<string, StatusDef> = {
  strong:    { label: 'Registration verified', tone: 'success', icon: ShieldCheck, help: 'Name, registration number and agency all agree with the CEA register.' },
  weak:      { label: 'Needs review',          tone: 'warning', icon: AlertCircle, help: 'The registration exists but a detail differs. An officer must decide.' },
  not_found: { label: 'Not found',             tone: 'danger',  icon: Search,      help: 'No matching registration number in the current register.' },
  expired:   { label: 'Registration expired',  tone: 'danger',  icon: CalendarX,   help: 'The registration lapsed and is no longer in the register.' },
};

/** Subscription standing. */
export const SUBSCRIPTION_STATUS: Record<string, StatusDef> = {
  none:      { label: 'No plan',   tone: 'neutral', icon: CircleDashed },
  active:    { label: 'Active',    tone: 'success', icon: Check },
  past_due:  { label: 'Past due',  tone: 'warning', icon: CreditCard, help: 'A renewal payment failed. Listings stay live during the grace period.' },
  expired:   { label: 'Expired',   tone: 'danger',  icon: CalendarX },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: X },
};

/** Generic verification of a contact channel etc. */
export const CHECK_STATUS: Record<string, StatusDef> = {
  verified: { label: 'Verified', tone: 'success', icon: Check },
  pending:  { label: 'Pending',  tone: 'warning', icon: Clock },
  action:   { label: 'Action required', tone: 'danger', icon: AlertCircle },
  unknown:  { label: 'Unknown',  tone: 'neutral', icon: HelpCircle },
};

export const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-p1-subtle text-p1-text-2 border-p1-border',
  success: 'bg-p1-success-soft text-p1-success border-p1-success-border',
  warning: 'bg-p1-warning-soft text-p1-warning border-p1-warning-border',
  danger:  'bg-p1-danger-soft text-p1-danger border-p1-danger-border',
  info:    'bg-p1-info-soft text-p1-info border-p1-info-border',
  accent:  'bg-p1-accent-soft text-p1-accent-text border-p1-accent/40',
};

export const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-p1-text-2',
  success: 'text-p1-success',
  warning: 'text-p1-warning',
  danger:  'text-p1-danger',
  info:    'text-p1-info',
  accent:  'text-p1-accent-text',
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-p1-text-3',
  success: 'bg-p1-success',
  warning: 'bg-p1-warning',
  danger:  'bg-p1-danger',
  info:    'bg-p1-info',
  accent:  'bg-p1-accent',
};

type Kind = 'listing' | 'agent' | 'match' | 'subscription' | 'check';
const MAPS: Record<Kind, Record<string, StatusDef>> = {
  listing: LISTING_STATUS,
  agent: AGENT_STATUS,
  match: MATCH_STATUS,
  subscription: SUBSCRIPTION_STATUS,
  check: CHECK_STATUS,
};

export function statusDef(kind: Kind, value: string): StatusDef {
  return MAPS[kind][value] ?? { label: value, tone: 'neutral', icon: HelpCircle };
}

/**
 * Icon + text status pill. `size="md"` for tables and cards; `size="lg"` for banners.
 * The `title` carries the plain-language explanation as a tooltip.
 */
export function StatusBadge({
  kind, value, size = 'md', className = '', showHelp = true,
}: {
  kind: Kind; value: string; size?: 'sm' | 'md' | 'lg'; className?: string; showHelp?: boolean;
}) {
  const d = statusDef(kind, value);
  const Icon = d.icon;
  const sz = {
    sm: 'h-6 px-2 text-[12px] gap-1',
    md: 'h-7 px-2.5 text-[13px] gap-1.5',
    lg: 'h-9 px-3.5 text-[15px] gap-2',
  }[size];
  const iconSize = { sm: 11, md: 13, lg: 16 }[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border font-medium leading-none ${TONE_CLASS[d.tone]} ${sz} ${className}`}
      title={showHelp ? d.help : undefined}
    >
      <Icon size={iconSize} strokeWidth={2.5} aria-hidden />
      {d.label}
    </span>
  );
}

/** Tiny coloured dot + label, for dense rows. */
export function StatusDot({ kind, value, className = '' }: { kind: Kind; value: string; className?: string }) {
  const d = statusDef(kind, value);
  return (
    <span className={`inline-flex items-center gap-2 text-[13px] font-medium ${TONE_TEXT[d.tone]} ${className}`}>
      <span className={`h-2 w-2 rounded-full ${TONE_DOT[d.tone]}`} aria-hidden />
      {d.label}
    </span>
  );
}

/** Generic pill for values that are not a lifecycle status (district, plan name, counts). */
export function Pill({ children, tone = 'neutral', className = '' }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2 text-[12px] font-medium leading-none ${TONE_CLASS[tone]} ${className}`}>
      {children}
    </span>
  );
}
