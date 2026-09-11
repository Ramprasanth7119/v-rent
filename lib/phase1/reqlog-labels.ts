/**
 * How a request row reads on screen.
 *
 * Separate from `reqlog.ts` because that module touches the filesystem, and a
 * client component importing the writer would drag `node:fs` into the bundle.
 *
 * The point of the labels is that an operations officer is not a back-end
 * engineer. `POST /api/phase1/admin/agents/[id]` tells them nothing;
 * "Suspend or reinstate an agent" tells them whether the error they are looking
 * at matters. Anything not in the table falls back to the path, which is honest
 * rather than wrong.
 */

export interface RequestRow {
  id: string;
  at: string;
  method: string;
  route: string;
  path: string;
  status: number;
  ms: number;
  actor?: string;
  role?: 'agent' | 'admin' | 'anonymous';
  error?: string;
}

export interface EndpointMeta {
  label: string;
  /** Which part of the product it belongs to, for grouping a filter. */
  area: 'Accounts' | 'Listings' | 'Addresses' | 'Payments' | 'Operations' | 'Registry';
  /** True where the call leaves our servers for somebody else's. */
  external?: string;
}

export const ENDPOINTS: Record<string, EndpointMeta> = {
  '/api/auth/login': { label: 'Sign in', area: 'Accounts' },
  '/api/auth/logout': { label: 'Sign out', area: 'Accounts' },
  '/api/auth/signup': { label: 'Create an account', area: 'Accounts' },
  '/api/auth/session': { label: 'Read the session', area: 'Accounts' },
  '/api/auth/password/forgot': { label: 'Request a password reset', area: 'Accounts' },
  '/api/auth/password/reset': { label: 'Complete a password reset', area: 'Accounts' },
  '/api/auth/verify-email/send': { label: 'Send an email confirmation', area: 'Accounts' },
  '/api/auth/verify-email/confirm': { label: 'Confirm an email address', area: 'Accounts' },
  '/api/cea/lookup': { label: 'CEA registration lookup', area: 'Registry', external: 'data.gov.sg' },
  '/api/phase1/address': { label: 'Address search', area: 'Addresses', external: 'OneMap' },
  '/api/phase1/address/reverse': { label: 'What is at this point', area: 'Addresses', external: 'OneMap' },
  '/api/phase1/neighbourhood': { label: 'Neighbourhood amenities', area: 'Addresses', external: 'OneMap' },
  '/api/phase1/map': { label: 'Map tiles and markers', area: 'Addresses', external: 'OneMap' },
  '/api/phase1/workspace': { label: 'Read or save a workspace', area: 'Listings' },
  '/api/phase1/workspace/reset': { label: 'Reset a workspace', area: 'Listings' },
  '/api/phase1/photos': { label: 'Upload a photograph', area: 'Listings' },
  '/api/phase1/photos/[id]/[id]/[id]': { label: 'Serve a photograph', area: 'Listings' },
  '/api/phase1/enquiries': { label: 'Receive an enquiry', area: 'Listings' },
  '/api/payments/intents': { label: 'Start a payment', area: 'Payments' },
  '/api/payments/intents/[id]': { label: 'Check a payment', area: 'Payments' },
  '/api/payments/sandbox': { label: 'Sandbox payment', area: 'Payments' },
  '/api/payments/webhooks/[id]': { label: 'Payment webhook', area: 'Payments', external: 'provider' },
  '/api/phase1/admin/queues': { label: 'Queue counts', area: 'Operations' },
  '/api/phase1/admin/verification': { label: 'Decide an application', area: 'Operations' },
  '/api/phase1/admin/moderation': { label: 'Decide a listing', area: 'Operations' },
  '/api/phase1/admin/agents/[id]': { label: 'Suspend or reinstate an agent', area: 'Operations' },
};

export const AREAS = ['Accounts', 'Listings', 'Addresses', 'Payments', 'Operations', 'Registry'] as const;

export const endpointLabel = (route: string) => ENDPOINTS[route]?.label ?? route;
export const endpointArea = (route: string) => ENDPOINTS[route]?.area ?? null;

/**
 * The outcome, in the words an officer would use.
 *
 * A 404 from the operations console is not a fault — it is the console refusing
 * to admit it exists to somebody who may not open it — so "refused" rather than
 * "error" is both kinder and more accurate.
 */
export type Outcome = 'ok' | 'refused' | 'invalid' | 'limited' | 'failed';

export function outcomeOf(status: number): Outcome {
  if (status >= 500) return 'failed';
  if (status === 429) return 'limited';
  if (status === 401 || status === 403 || status === 404) return 'refused';
  if (status >= 400) return 'invalid';
  return 'ok';
}

export const OUTCOME: Record<Outcome, { label: string; hint: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  ok: { label: 'Succeeded', hint: 'The call did what was asked.', tone: 'success' },
  refused: { label: 'Refused', hint: 'Not signed in, or not allowed to see it.', tone: 'neutral' },
  invalid: { label: 'Rejected', hint: 'The request itself was wrong — a bad field or a missing one.', tone: 'warning' },
  limited: { label: 'Rate limited', hint: 'Too many calls too quickly; the caller was asked to wait.', tone: 'warning' },
  failed: { label: 'Failed', hint: 'Something on our side broke. These are the ones to look at.', tone: 'danger' },
};

export const ROLE_LABEL: Record<string, string> = {
  agent: 'Agent',
  admin: 'Staff',
  anonymous: 'Signed out',
};

/** Anything over this is worth a second look on a screen full of 40ms calls. */
export const SLOW_MS = 500;
