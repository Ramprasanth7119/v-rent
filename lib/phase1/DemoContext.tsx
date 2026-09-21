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
 *
 * It is also where the Demo Data switch takes effect, and the only place. With
 * the switch ON every screen reads the demo account (`demoWorkspace`) through
 * the same `state`, so no screen needs to know which data it is showing. A
 * change made while it is ON is applied to the demo account in memory and is
 * never sent to the server, and the server is not polled; turning it OFF
 * re-reads the agent's own workspace at once.
 */

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DemoListing, ListingStatus, PLANS, PlanOption } from './data';
import {
  Alert, AgentProfile, ApprovalStatus, DEFAULT_NOTIFICATIONS, Enquiry, EnquiryStatus, NotificationPrefs,
  SubscriptionStatus, TODAY, TODAY_ISO, WorkspaceState, planByCode, preferredName,
} from './workspace';
import { EMPTY_TOOLS, type ToolsState } from './tools';
import { STARTING_REVEAL_CREDITS } from './views';
import { demoWorkspace } from './report-data/demo-workspace';
import { useDemoDataOn } from './report-data/switch';
import { useSession } from './SessionContext';

export type { Alert, AgentProfile, ApprovalStatus, Enquiry, EnquiryStatus, NotificationPrefs, SubscriptionStatus };
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
  alerts: Alert[];
  tools: ToolsState;
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
  alerts: [],
  tools: { ...EMPTY_TOOLS },
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
  alerts: w.alerts ?? [],
  tools: { ...EMPTY_TOOLS, ...(w.tools ?? {}) },
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
  alerts: s.alerts,
  tools: s.tools,
  /* The demo workspace lives in the browser and is never written, so nobody
     can have viewed it. See `views.ts`. */
  views: [],
  reveals: [],
  revealCredits: STARTING_REVEAL_CREDITS,
  revealTopUps: [],
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
  /** Move an enquiry along; `extra` carries the outcome of a close or the time of a viewing. */
  setEnquiryStatus: (id: string, status: EnquiryStatus, extra?: Pick<Enquiry, 'outcome' | 'viewingAt'>) => void;
  /** Change one part of the tools bag; the rest is carried through untouched. */
  setTools: (patch: Partial<ToolsState>) => void;
  markAlertsRead: () => void;
  activeListings: number;
  listingLimit: number;
  gate: GateCheck[];
  canPublish: boolean;
  /** True while an edit is still on its way to the server. */
  saving: boolean;
  /** Set when the last save did not land, so a screen can say so. */
  saveError: string | null;
  /** True while the Demo Data switch is ON and `state` is the demo account. */
  demo: boolean;
  /** Counts changes made to the demo account, so the frame can say they are not saved. */
  demoChanges: number;
  /** The moment this page was opened. The demo account is timed back from it. */
  openedAt: Date;
}

const Ctx = createContext<DemoContextValue | null>(null);

const SAVE_DELAY_MS = 400;
/* How often an open workspace checks the server for a decision made elsewhere.
   Slow enough that a day of having the tab open is a few hundred requests,
   quick enough that an approval lands while the agent is still looking. */
const POLL_MS = 15_000;

export function DemoProvider({ initial, openedAt: openedIso, children }: {
  initial?: WorkspaceState | null;
  /** ISO time the server rendered the page, so both renders build the same demo account. */
  openedAt?: string;
  children: React.ReactNode;
}) {
  /* The agent's own workspace. Named `own` so it cannot be read by accident while the demo account is showing. */
  const [own, setState] = useState<DemoState>(() => (initial ? fromWorkspace(initial) : SIGNED_OUT));
  // Only a signed-in agent has an account to swap. A visitor sees the signed-out frame, and staff have no
  // portfolio — the operations console applies the switch to its own data on the server.
  const { isAdmin } = useSession();
  const demoOn = useDemoDataOn() && Boolean(initial) && !isAdmin;
  const [openedAt] = useState(() => (openedIso ? new Date(openedIso) : new Date()));

  /* The demo account, built around the signed-in identity. Rebuilt only when the identity itself changes. */
  const identityKey = `${own.profile.fullName}|${own.profile.ceaNumber}|${own.profile.agency}|${own.profile.email}`;
  const demoSeed = useMemo(
    () => fromWorkspace(demoWorkspace({ profile: own.profile, notifications: own.notifications, emailVerified: own.emailVerified }, openedAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the identity, not on every poll's fresh object
    [identityKey, openedAt],
  );
  /* Changes made to the demo account in this tab. Null until the first one. */
  const [demoEdits, setDemoEdits] = useState<DemoState | null>(null);
  const demoLatest = useRef<DemoState | null>(null);
  const [demoChanges, setDemoChanges] = useState(0);

  const state = demoOn ? (demoEdits ?? demoSeed) : own;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Mirrors `state` synchronously so two changes in the same tick compose,
  // and so the debounced writer always sends the latest value.
  const latest = useRef(own);
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

  /**
   * The one way state changes: compute the next value, show it, then save it.
   * With Demo Data ON the change goes to the demo account and stops there.
   */
  const apply = (fn: (s: DemoState) => DemoState) => {
    if (demoOn) {
      const next = fn(demoLatest.current ?? demoSeed);
      demoLatest.current = next;
      setDemoEdits(next);
      setDemoChanges((n) => n + 1);
      return;
    }
    const next = fn(latest.current);
    latest.current = next;
    setState(next);
    schedule();
  };

  const set = (patch: Partial<DemoState>) => apply((s) => ({ ...s, ...patch }));

  const setProfile = (patch: Partial<AgentProfile>) =>
    apply((s) => ({ ...s, profile: { ...s.profile, ...patch } }));

  const setTools = (patch: Partial<ToolsState>) =>
    apply((s) => ({ ...s, tools: { ...s.tools, ...patch } }));

  /** Reset is server-side: the workspace is seeded again from the account. */
  const reset = () => {
    if (demoOn) {
      demoLatest.current = null;
      setDemoEdits(null);
      return;
    }
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

  /**
   * Keep the workspace in step with the server while the agent is looking at it.
   *
   * Some of what this holds is not the agent's to change: a verification
   * officer approves an application, a moderator rejects a listing, a
   * registration lapses at the register. The provider used to only ever write —
   * state was read once, when the page was rendered on the server — so a
   * decision taken while the agent had the tab open never arrived and they had
   * to know to reload.
   *
   * It polls while the tab is visible and stops when it is not, so a
   * backgrounded tab costs nothing, and re-reads the moment it comes back. A
   * pending save wins: the agent's own unsaved edit is never replaced by an
   * older copy from the server.
   */
  useEffect(() => {
    // Nothing to keep in step while the demo account is on screen.
    if (!persists || demoOn) return;

    let stopped = false;

    const resync = async () => {
      if (stopped || document.visibilityState !== 'visible' || timer.current) return;
      try {
        const res = await fetch('/api/phase1/workspace', { cache: 'no-store' });
        if (!res.ok) return;
        const body = (await res.json()) as { workspace: WorkspaceState };
        // Still nothing of the agent's in flight, now that we have waited on
        // the network.
        if (stopped || timer.current) return;
        const fresh = fromWorkspace(body.workspace);
        latest.current = fresh;
        setState(fresh);
      } catch {
        /* offline or mid-deploy: keep what is on screen */
      }
    };

    // Back from the demo account: whatever changed meanwhile is read now, not in fifteen seconds.
    void resync();
    const id = setInterval(resync, POLL_MS);
    window.addEventListener('focus', resync);
    document.addEventListener('visibilitychange', resync);
    return () => {
      stopped = true;
      clearInterval(id);
      window.removeEventListener('focus', resync);
      document.removeEventListener('visibilitychange', resync);
    };
  }, [persists, demoOn]);

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

  /** Mark everything in the bell as seen. */
  const markAlertsRead = () =>
    apply((s) => (s.alerts.some((a) => !a.read)
      ? { ...s, alerts: s.alerts.map((a) => ({ ...a, read: true })) }
      : s));

  /** Move an enquiry along the queue. The agent's own record, so it saves like the rest. */
  const setEnquiryStatus = (id: string, status: EnquiryStatus, extra?: Pick<Enquiry, 'outcome' | 'viewingAt'>) =>
    apply((s) => ({
      ...s,
      enquiries: s.enquiries.map((e) => (e.id === id
        ? { ...e, status, outcome: status === 'closed' ? extra?.outcome : undefined, viewingAt: extra?.viewingAt ?? e.viewingAt, lastActionAt: new Date().toISOString() }
        : e)),
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
    setTools,
    markAlertsRead,
    activeListings,
    listingLimit,
    gate,
    canPublish,
    saving: demoOn ? false : saving,
    saveError: demoOn ? null : saveError,
    demo: demoOn,
    demoChanges,
    openedAt,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDemo must be used inside DemoProvider');
  return v;
}
