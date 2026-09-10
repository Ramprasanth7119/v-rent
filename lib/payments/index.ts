import { dodoProvider } from './providers/dodo';
import { paynowProvider } from './providers/paynow';
import { razorpayProvider } from './providers/razorpay';
import { stripeProvider } from './providers/stripe';
import type { PaymentProvider, ProviderId } from './types';

export const PROVIDERS: Record<ProviderId, PaymentProvider> = {
  paynow: paynowProvider,
  razorpay: razorpayProvider,
  stripe: stripeProvider,
  dodo: dodoProvider,
};

export function getProvider(id: string): PaymentProvider | null {
  return (PROVIDERS as Record<string, PaymentProvider>)[id] ?? null;
}

export function isProviderId(id: string): id is ProviderId {
  return id in PROVIDERS;
}

export * from './types';
