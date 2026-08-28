"use client";

/**
 * Holds the state of the Phase 1 walkthrough.
 *
 * Everything lives in memory. Refreshing the browser resets the demo, which is
 * deliberate — a presenter should be able to start clean at any point.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { DemoListing, ListingStatus, PLANS, PlanOption, SEED_LISTINGS } from './data';

export type ApprovalStatus =
  | 'not_submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'expired';

export interface AgentProfile {
  fullName: string;
  email: string;
  mobile: string;
  ceaNumber: string;
  agency: string;
  agencyLicence: string;
  bio: string;
  experienceYears: string;
}

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
}

const BLANK_PROFILE: AgentProfile = {
  fullName: 'Tan Wei Ming',
  email: 'weiming.tan@huttons.example',
  mobile: '+65 9123 4567',
  ceaNumber: 'R052184C',
  agency: 'Huttons Asia Pte Ltd',
  agencyLicence: 'L3008899K',
  bio: 'Seven years in East Coast and city-fringe rentals. Focused on expatriate leasing and HDB upgraders.',
  experienceYears: '7',
};

const INITIAL: DemoState = {
  emailVerified: false,
  mobileVerified: false,
  profileSubmitted: false,
  approval: 'not_submitted',
  ceaValid: true,
  ceaValidUntil: '2027-03-31',
  plan: null,
  subscription: 'none',
  paymentMethod: null,
  profile: BLANK_PROFILE,
  listings: SEED_LISTINGS,
};

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
  setListingStatus: (id: string, status: ListingStatus, reason?: string) => void;
  activeListings: number;
  listingLimit: number;
  gate: GateCheck[];
  canPublish: boolean;
}

const Ctx = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(INITIAL);

  const set = (patch: Partial<DemoState>) => setState((s) => ({ ...s, ...patch }));
  const setProfile = (patch: Partial<AgentProfile>) =>
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  const reset = () => setState(INITIAL);

  const skipToActive = () =>
    setState((s) => ({
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

  const addListing = (l: DemoListing) => setState((s) => ({ ...s, listings: [l, ...s.listings] }));

  const setListingStatus = (id: string, status: ListingStatus, reason?: string) =>
    setState((s) => ({
      ...s,
      listings: s.listings.map((l) =>
        l.id === id
          ? {
              ...l,
              status,
              rejectionReason: reason ?? l.rejectionReason,
              publishedAt: status === 'published' ? '2026-08-28' : l.publishedAt,
            }
          : l
      ),
    }));

  const activeListings = state.listings.filter(
    (l) => l.status === 'published' || l.status === 'paused'
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
    setListingStatus,
    activeListings,
    listingLimit,
    gate,
    canPublish,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDemo must be used inside DemoProvider');
  return v;
}
