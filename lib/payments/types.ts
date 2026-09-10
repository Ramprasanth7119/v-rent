/** Shared vocabulary for the payment layer. Providers implement this contract. */

export type ProviderId = 'paynow' | 'razorpay' | 'dodo';

export type IntentStatus =
  | 'created'          // row exists, provider not yet called
  | 'awaiting_payment' // provider has a session/order/QR open
  | 'paid'             // terminal, money confirmed by a verified webhook
  | 'failed'           // terminal
  | 'expired'          // terminal
  | 'cancelled';       // terminal

export const TERMINAL: readonly IntentStatus[] = ['paid', 'failed', 'expired', 'cancelled'];

/** Forward-only state machine. Out-of-order webhooks land on a closed door. */
export const ALLOWED_TRANSITIONS: Record<IntentStatus, IntentStatus[]> = {
  created: ['awaiting_payment', 'failed', 'cancelled', 'expired', 'paid'],
  awaiting_payment: ['paid', 'failed', 'expired', 'cancelled'],
  paid: [],
  failed: [],
  expired: [],
  cancelled: [],
};

/** Money is always integer minor units (cents). Never a float. */
export interface Money {
  /** Integer cents. S$1,188.00 is 118800. */
  cents: number;
  currency: 'SGD' | 'INR' | 'USD';
}

export interface TaxLine {
  label: string;
  /** e.g. 0.09 for Singapore GST. */
  rate: number;
  cents: number;
  /** Who is legally accountable for remitting this tax. */
  remittedBy: 'v-rent' | 'merchant-of-record' | 'not-applicable';
}

export interface PaymentIntent {
  /** Our reference. Shown to the agent, quoted in bank statements, unique. */
  ref: string;
  provider: ProviderId;
  status: IntentStatus;
  planCode: string;
  agentId: string;
  /** What the agent is charged, tax inclusive. */
  total: Money;
  subtotal: Money;
  tax: TaxLine;
  /** Estimated processing cost to V-RENT, for internal reporting only. */
  providerFeeCents: number;
  /** Provider-side identifier (order id, session id, or PayNow reference). */
  providerRef: string | null;
  /** Where the browser should go, when the provider hosts the page. */
  redirectUrl: string | null;
  /** PayNow only: EMVCo payload plus a rendered QR. */
  qr: { payload: string; dataUrl: string } | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  /** Last verified webhook event id applied to this intent. */
  lastEventId: string | null;
  failureReason: string | null;
}

export interface CreateIntentInput {
  provider: ProviderId;
  planCode: string;
  agentId: string;
  agentEmail: string;
  agentName: string;
  subtotalCents: number;
  ref: string;
  returnUrl: string;
}

/** What a provider hands back after it has opened a payment session. */
export interface ProviderSession {
  providerRef: string;
  redirectUrl?: string;
  qr?: { payload: string; dataUrl: string };
  expiresAt: number;
}

export interface VerifiedEvent {
  /** Provider's unique event id — the dedupe key. */
  eventId: string;
  /** Our intent ref, recovered from the payload. */
  ref: string;
  status: IntentStatus;
  providerRef: string | null;
  reason: string | null;
}

export interface PaymentProvider {
  readonly id: ProviderId;
  readonly label: string;
  /** False when the environment has no credentials — the route then uses sandbox mode. */
  isConfigured(): boolean;
  createSession(input: CreateIntentInput): Promise<ProviderSession>;
  /**
   * Verifies the signature over the RAW body and returns the event, or null
   * when the signature does not check out. Never parse before verifying.
   */
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedEvent | null>;
}
