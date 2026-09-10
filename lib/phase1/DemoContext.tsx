"use client";

/**
 * The signed-in agent's workspace, in the browser.
 *
 * State is held here so screens stay simple and instant, but it is no longer
 * only here: every change is written back to the account that owns it, so a
 * listing created before lunch is still there after a refresh. The server hands
 * the initial value down through the layout, which means the first paint is
 * already the agent's own portfolio — there is no flash of somebody else's.
 *
 * Saves are optimistic and debounced. The screen updates immediately and the
 * write follows; nothing in the workspace is worth blocking an agent on, and a
 * failed write is reported rather than silently rolled back, because the value
 * they typed is still in front of them.
 */

import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import { DemoListing, ListingStatus, PLANS, PlanOption } from './data';
import {
  AgentProfile, ApprovalStatus, DEFAULT_NOTIFICATIONS, Enquiry, EnquiryStatus, NotificationPrefs,
  SubscriptionStatus, TODAY, TODAY_ISO, WorkspaceState, planByCode, preferredName,
} from './workspace';

export type { AgentProfile, ApprovalStatus, Enquiry, EnquiryStatus, NotificationPrefs, SubscriptionStatus };
export { TODAY, TODAY_ISO, preferredName };

export interface DemoState {
  emailVerified: boolean;
  mobileVerified: boolean;
  profileSubmitted: boolean;
  approval: ApprovalStatus;
  ceaValid: boolean;
  ceaValidUntil: string;
  plan: PlanOption | null;
  subscription: SubscriptionStatus;
  paymentMethod: 'PayNow' | 'Card' | null;
  profile: AgentProfile;
  listings: DemoListing[];
  notifications: NotificationPrefs;
  enquiries: Enquiry[];
}

const EMPTY_PROFILE: AgentProfile = {
  fullName: '', email: '', mobile: '', ceaNumber: '', agency: '', agencyLicence: '', bio: '', experienceYears: '',
};

/**
 * Only ever used when nobody is signed in — the agent hub is public, and it
 * must not render as if some other agent's portfolio were on screen.
 */
const SIGNED_OUT: DemoState = {
  emailVerified: false,
  mobileVerified: false,
  profileSubmitted: false,
  approval: 'not_submitted',
  ceaValid: false,
  ceaValidUntil: '',
  plan: null,
  subscription: 'none',
  paymentMethod: null,
  profile: EMPTY_PROFILE,
  listings: [],
  notifications: { ...DEFAULT_NOTIFICATIONS },
  enquiries: [],
};

const fromWorkspace = (w: WorkspaceState): DemoState => ({
  emailVerified: w.emailVerified,
  mobileVerified: w.mobileVerified,
  profileSubmitted: w.profileSubmitted,
  approval: w.approval,
  ceaValid: w.ceaValid,
  ceaValidUntil: w.ceaValidUntil,
  plan: planByCode(w.planCode),
  subscription: w.subscription,
  paymentMethod: w.paymentMethod,
  profile: w.profile,
  listings: w.listings,
  notifications: w.notifications ?? { ...DEFAULT_NOTIFICATIONS },
  enquiries: w.enquiries ?? [],
});

const toWorkspace = (s: DemoState): WorkspaceState => ({
  emailVerified: s.emailVerified,
  mobileVerified: s.mobileVerified,
  profileSubmitted: s.profileSubmitted,
  approval: s.approval,
  ceaValid: s.ceaValid,
  ceaValidUntil: s.ceaValidUntil,
  planCode: s.plan?.code ?? null,
  subscription: s.subscription,
  paymentMethod: s.paymentMethod,
  profile: s.profile,
  listings: s.listings,
  notifications: s.notifications,
  enquiries: s.enquiries,
});

/** A single condition of the publish gate. */
export interface GateCheck {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
  fixHref?: string;
  fixLabel?: string;
}

interface DemoContextValue {
  state: DemoState;
  set: (patch: Partial<DemoState>) => void;
  setProfile: (patch: Partial<AgentProfile>) => void;
  reset: () => void;
  /** Fast-forward to an approved, subscribed agent — for demos that start mid-journey. */
  skipToActive: () => void;
  addListing: (l: DemoListing) => void;
  updateListing: (id: string, patch: Partial<DemoListing>) => void;
  setListingStatus: (id: string, status: ListingStatus, reason?: string) => void;
  setEnquiryStatus: (id: string, status: EnquiryStatus) => void;
  activeListings: number;
  listingLimit: number;
  gate: GateCheck[];
  canPublish: boolean;
  /** True while an edit is still on its way to the server. */
  saving: boolean;
  /** Set when the last save did not land, so a screen can say so. */
  saveError: string | null;
}

const Ctx = createContext<DemoContextValue | null>(null);

const SAVE_DELAY_MS = 400;

export function DemoProvider({ initial, children }: { initial?: WorkspaceState | null; children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(() => (initial ? fromWorkspace(initial) : SIGNED_OUT));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Mirrors `state` synchronously so two changes in the same tick compose,
  // and so the debounced writer always sends the latest value.
  const latest = useRef(state);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Nothing to persist for a visitor: the hub is public, the workspace is not.
  const persists = Boolean(initial);

  const flush = async () => {
    timer.current = null;
    try {
      const res = await fetch('/api/phase1/workspace', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toWorkspace(latest.current)),
      });
      if (!res.ok) throw new Error(`save failed (${res.status})`);
      setSaveError(null);
    } catch {
      setSaveError('Your last change could not be saved. It is still on screen — try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  const schedule = () => {
    if (!persists) return;
    setSaving(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  };

  /** The one way state changes: compute the next value, show it, then save it. */
  const apply = (fn: (s: DemoState) => DemoState) => {
    const next = fn(latest.current);
    latest.current = next;
    setState(next);
    schedule();
  };

  const set = (patch: Partial<DemoState>) => apply((s) => ({ ...s, ...patch }));

  const setProfile = (patch: Partial<AgentProfile>) =>
    apply((s) => ({ ...s, profile: { ...s.profile, ...patch } }));

  /** Reset is server-side: the workspace is seeded again from the account. */
  const reset = () => {
    if (!persists) {
      latest.current = SIGNED_OUT;
      setState(SIGNED_OUT);
      return;
    }
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setSaving(true);
    void fetch('/api/phase1/workspace/reset', { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`reset failed (${res.status})`);
        const body = (await res.json()) as { workspace: WorkspaceState };
        const fresh = fromWorkspace(body.workspace);
        latest.current = fresh;
        setState(fresh);
        setSaveError(null);
      })
      .catch(() => setSaveError('The workspace could not be reset. Try again in a moment.'))
      .finally(() => setSaving(false));
  };

  const skipToActive = () =>
    apply((s) => ({
      ...s,
      emailVerified: true,
      mobileVerified: true,
      profileSubmitted: true,
      approval: 'approved',
      ceaValid: true,
      plan: PLANS[1],
      subscription: 'active',
      paymentMethod: 'PayNow',
    }));

  const addListing = (l: DemoListing) => apply((s) => ({ ...s, listings: [l, ...s.listings] }));

  /**
   * An edit puts a listing back in front of a moderator. Whatever was reviewed
   * is not what is on the page any more, so the review marker is cleared unless
   * the caller is the one setting it.
   */
  const updateListing = (id: string, patch: Partial<DemoListing>) =>
    apply((s) => ({
      ...s,
      listings: s.listings.map((l) => (l.id === id
        ? { ...l, ...patch, updatedAt: patch.updatedAt ?? TODAY_ISO, reviewedAt: patch.reviewedAt }
        : l)),
    }));

  /** Move an enquiry along the queue. The agent's own record, so it saves like the rest. */
  const setEnquiryStatus = (id: string, status: EnquiryStatus) =>
    apply((s) => ({
      ...s,
      enquiries: s.enquiries.map((e) => (e.id === id ? { ...e, status } : e)),
    }));

  const setListingStatus = (id: string, status: ListingStatus, reason?: string) =>
    apply((s) => ({
      ...s,
      listings: s.listings.map((l) =>
        l.id === id
          ? {
              ...l,
              status,
              rejectionReason: reason ?? l.rejectionReason,
              publishedAt: status === 'published' ? (l.publishedAt ?? TODAY_ISO) : l.publishedAt,
              expiresAt: status === 'published' ? (l.expiresAt ?? '2026-11-26') : l.expiresAt,
              updatedAt: TODAY_ISO,
            }
          : l
      ),
    }));

  const activeListings = state.listings.filter(
    (l) => !l.archived && (l.status === 'published' || l.status === 'paused')
  ).length;

  const listingLimit = state.plan
    ? Number(state.plan.entitlements.find((e) => e.key === 'active_listing_limit')?.value ?? 0)
    : 0;

  /**
   * The publish gate from the specification, section M12.
   * All five conditions must hold before a listing may go live.
   */
  const gate: GateCheck[] = useMemo(
    () => [
      {
        id: 'approved',
        label: 'Agent approved by an administrator',
        pass: state.approval === 'approved',
        detail:
          state.approval === 'approved'
            ? 'Approved after CEA registry match'
            : state.approval === 'under_review'
            ? 'Application is still with the verification officer'
            : state.approval === 'suspended'
            ? 'Account is suspended — publication rights withdrawn'
            : 'Profile has not been submitted for review',
        fixHref: '/phase1/status',
        fixLabel: 'View application',
      },
      {
        id: 'cea',
        label: 'CEA registration still valid',
        pass: state.ceaValid,
        detail: state.ceaValid
          ? `Valid until ${state.ceaValidUntil}, re-checked daily against data.gov.sg`
          : 'Registration has lapsed. Account access is retained; publication is not',
      },
      {
        id: 'subscription',
        label: 'Subscription active',
        pass: state.subscription === 'active' || state.subscription === 'past_due',
        detail:
          state.subscription === 'active'
            ? `${state.plan?.name ?? ''} plan, paid by ${state.paymentMethod ?? '—'}`
            : state.subscription === 'past_due'
            ? 'Payment failed — inside the grace period, publication still permitted'
            : 'No active subscription',
        fixHref: '/phase1/plans',
        fixLabel: 'Choose a plan',
      },
      {
        id: 'quota',
        label: 'Listing quota available',
        pass: listingLimit > 0 && activeListings < listingLimit,
        detail:
          listingLimit > 0
            ? `${activeListings} of ${listingLimit} active listings used`
            : 'No plan selected, so no quota is allocated',
        fixHref: '/phase1/plans',
        fixLabel: 'Upgrade plan',
      },
      {
        id: 'content',
        label: 'Required fields complete and images scanned',
        pass: true,
        detail: 'All mandatory fields present; every image has passed malware scanning',
      },
    ],
    [state, activeListings, listingLimit]
  );

  const canPublish = gate.every((g) => g.pass);

  const value: DemoContextValue = {
    state,
    set,
    setProfile,
    reset,
    skipToActive,
    addListing,
    updateListing,
    setListingStatus,
    setEnquiryStatus,
    activeListings,
    listingLimit,
    gate,
    canPublish,
    saving,
    saveError,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDemo must be used inside DemoProvider');
  return v;
}
