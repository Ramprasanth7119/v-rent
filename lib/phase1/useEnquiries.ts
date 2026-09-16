"use client";

/**
 * The enquiry inbox, as every screen reads it.
 *
 * One hook, so the sidebar count, the dashboard and the enquiries screen are
 * always looking at the same records. Which records those are is decided once,
 * by the workspace provider: with Demo Data OFF they are the agent's own, as
 * stored; with it ON they are the demo account's, which are about the demo
 * account's listings. Nothing here chooses.
 *
 * Moving an enquiry along goes through the workspace too, which saves it for
 * the agent's own records and keeps it in memory for the demo account's.
 */

import { useMemo } from 'react';
import { useDemo } from './DemoContext';
import type { DemoListing } from './data';
import type { Enquiry, EnquiryStatus } from './workspace';
import { DEMO_NOTICE } from './report-data';
import { needsAction, readStage } from './enquiries';

export interface EnquiryInbox {
  /** True while the demo account is shown. */
  demo: boolean;
  /** The line to show while it is. Null for the agent's own records. */
  notice: string | null;
  enquiries: Enquiry[];
  /** Every listing an enquiry can point at. */
  byId: Map<string, DemoListing>;
  /** Whether a listing is in the workspace on screen, and so has a page to link to. */
  isOwn: (listingId: string) => boolean;
  setStatus: (id: string, status: EnquiryStatus, extra?: Pick<Enquiry, 'outcome' | 'viewingAt'>) => void;
  now: Date;
  newCount: number;
  actionCount: number;
}

export function useEnquiries(): EnquiryInbox {
  const { state, setEnquiryStatus, demo, openedAt } = useDemo();
  // One moment per page load, so every screen reads the inbox against the same instant.
  const now = openedAt;

  const byId = useMemo(() => new Map(state.listings.map((l) => [l.id, l])), [state.listings]);

  const counts = useMemo(() => {
    let fresh = 0;
    let action = 0;
    for (const e of state.enquiries) {
      if (e.status === 'new') fresh += 1;
      if (needsAction(readStage(e, now))) action += 1;
    }
    return { fresh, action };
  }, [state.enquiries, now]);

  return {
    demo,
    notice: demo ? DEMO_NOTICE : null,
    enquiries: state.enquiries,
    byId,
    isOwn: (id) => byId.has(id),
    setStatus: setEnquiryStatus,
    now,
    newCount: counts.fresh,
    actionCount: counts.action,
  };
}
