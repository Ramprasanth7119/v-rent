import type { DemoState } from '../../lib/phase1/DemoContext';
import type { Step } from './kit';

/** The eight-step agent onboarding journey shown in every Stepper. */
export const JOURNEY_STEPS: Step[] = [
  { label: 'Create account', href: '/phase1/signup' },
  { label: 'Verify contact', href: '/phase1/verify' },
  { label: 'Professional details', href: '/phase1/profile' },
  { label: 'CEA verification', href: '/phase1/status' },
  { label: 'Approval', href: '/phase1/status' },
  { label: 'Subscribe', href: '/phase1/plans' },
  { label: 'Payment', href: '/phase1/checkout' },
  { label: 'Start listing', href: '/phase1/listings' },
];

/** Which journey steps are complete, derived from the demo state. */
export function journeyCompleted(state: DemoState) {
  const done = [
    true,
    state.emailVerified && state.mobileVerified,
    state.profileSubmitted,
    state.profileSubmitted,
    state.approval === 'approved',
    !!state.plan,
    state.subscription === 'active',
    false,
  ];
  return (i: number) => !!done[i];
}
