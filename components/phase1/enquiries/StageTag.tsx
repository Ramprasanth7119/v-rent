"use client";

/**
 * The enquiry's stage as a pill, in the dashboard's colours: new is blue,
 * contacted amber, viewing violet, let green. A new enquiry that has waited
 * too long turns red. The word always says it; the colour only repeats it.
 *
 * Used by the Enquiries screen and its detail panel. Other screens keep the
 * shared `StagePill`.
 */

import React from 'react';
import type { EnquiryStage, StageReading } from '../../../lib/phase1/enquiries';
import { Accent, Pill } from '../dashboard/parts';

export const STAGE_ACCENT: Record<EnquiryStage, Accent> = {
  new: 'blue',
  overdue: 'red',
  contacted: 'amber',
  follow_up: 'amber',
  viewing_requested: 'violet',
  viewing_scheduled: 'violet',
  viewed: 'violet',
  let: 'green',
  lost: 'slate',
  closed: 'slate',
};

export function StageTag({ r, className = '' }: { r: StageReading; className?: string }) {
  return (
    <Pill accent={STAGE_ACCENT[r.stage]} className={className}>
      {r.stage === 'overdue' ? 'New · overdue' : r.label}
    </Pill>
  );
}
