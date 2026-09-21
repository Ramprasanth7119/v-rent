/**
 * The checks that decide whether something untrusted gets in.
 *
 * These are the ones that cannot be verified by looking at a screen: a webhook
 * signature accepted when it should not be looks exactly like one accepted
 * correctly, and a sanitiser that lets an unexpected field through looks like
 * nothing at all until the file it wrote back will not parse.
 */

import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { sanitisePatch } from '../lib/phase1/workspace';
import { decide } from '../lib/phase1/verification-policy';

/**
 * Who may write the verification fields.
 *
 * `sanitisePatch` is shared: the operations console writes `approval` through
 * it too, so it has to keep accepting the field. The line is drawn at the
 * route instead — an agent's own session may not set the officer's decision,
 * nor what the CEA register says about their registration. It used to be able
 * to, and `PATCH {"approval":"approved"}` with nothing but a valid agent
 * cookie walked an account past the queue for good: the one reconciliation
 * that could have put it back only fires on a workspace still at
 * `not_submitted`.
 */
describe('the agent workspace route', () => {
  const route = readFileSync(join(__dirname, '../app/api/phase1/workspace/route.ts'), 'utf8');

  it('names the fields an agent may not set', () => {
    const list = route.match(/const OFFICER_OWNED = \[([^\]]*)\]/);
    expect(list, 'OFFICER_OWNED is gone from the route').not.toBeNull();
    for (const field of ['approval', 'ceaValid', 'ceaValidUntil']) {
      expect(list![1], field).toContain(`'${field}'`);
    }
  });

  it('strips them from the patch rather than only refusing the request', () => {
    // A patch carrying one allowed field and one refused field still applies
    // the allowed one, so the refusal cannot be dodged by bundling.
    expect(route).toMatch(/for \(const key of refused\) delete patch\[key\]/);
    expect(route).toMatch(/status: 403/);
  });

  it('leaves the operations console able to record the decision', () => {
    const console_ = readFileSync(join(__dirname, '../app/api/phase1/admin/verification/route.ts'), 'utf8');
    expect(console_).toMatch(/approval:/);
  });
});

describe('workspace sanitising', () => {
  it('keeps only the fields a workspace has', () => {
    const patch = sanitisePatch({
      approval: 'approved',
      // None of these are workspace fields, and none should survive.
      role: 'admin',
      passwordHash: 'nope',
      __proto__: { polluted: true },
    }) as Record<string, unknown>;

    expect(patch.approval).toBe('approved');
    expect(patch.role).toBeUndefined();
    expect(patch.passwordHash).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('refuses a status or a plan it does not recognise', () => {
    expect(sanitisePatch({ approval: 'president' }).approval).toBeUndefined();
    expect(sanitisePatch({ subscription: 'free-forever' }).subscription).toBeUndefined();
    expect(sanitisePatch({ planCode: 'unlimited' }).planCode).toBeNull();
    expect(sanitisePatch({ planCode: 'premium' }).planCode).toBe('premium');
  });

  it('caps what a listing can carry', () => {
    const patch = sanitisePatch({
      listings: [{
        id: 'lst-1',
        description: 'x'.repeat(9000),
        images: 9999,
        propertyType: 'Castle',
        status: 'definitely-published',
        amenities: Array.from({ length: 200 }, (_, i) => `a${i}`),
      }],
    });

    const l = patch.listings?.[0];
    expect(l?.description?.length).toBe(4000);
    expect(l?.images).toBe(60);
    // An unknown property type or status falls back rather than passing through.
    expect(l?.propertyType).toBe('Condominium');
    expect(l?.status).toBe('draft');
    expect(l?.amenities?.length).toBe(40);
  });

  it('drops a listing with no id, since nothing can address it', () => {
    expect(sanitisePatch({ listings: [{ project: 'Nowhere' }] }).listings).toHaveLength(0);
  });

  it('only accepts photo ids in the shape we generate', () => {
    const patch = sanitisePatch({
      listings: [{
        id: 'lst-1',
        photos: ['0123456789abcdef.jpg', '../../etc/passwd', 'nice-try.sh', 'fedcba9876543210.jpg'],
      }],
    });
    expect(patch.listings?.[0].photos).toEqual(['0123456789abcdef.jpg', 'fedcba9876543210.jpg']);
  });

  it('keeps notification preferences to the events that exist', () => {
    const patch = sanitisePatch({
      notifications: { enquiry: { email: false, sms: true }, madeUpEvent: { email: true, sms: true } },
    });
    expect(patch.notifications?.enquiry).toEqual({ email: false, sms: true });
    expect(patch.notifications?.madeUpEvent).toBeUndefined();
    // The rest are filled from the defaults rather than left missing.
    expect(patch.notifications?.moderation).toBeDefined();
  });
});

describe('verification policy', () => {
  it('reviews by hand below the threshold and automates above it', () => {
    expect(decide(0).autoApprove).toBe(false);
    expect(decide(25).autoApprove).toBe(false);
    expect(decide(26).autoApprove).toBe(true);
  });

  it('counts down to the switch', () => {
    expect(decide(24).remaining).toBe(2);
    expect(decide(25).remaining).toBe(1);
    expect(decide(40).remaining).toBe(0);
  });
});

describe('Stripe webhook verification', () => {
  const secret = 'whsec_test_secret_value';
  const body = JSON.stringify({
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_1', client_reference_id: 'VR-REF-001' } },
  });

  const sign = (payload: string, at: number) =>
    createHmac('sha256', secret).update(`${at}.${payload}`).digest('hex');

  const header = (v: string) => new Headers({ 'stripe-signature': v });

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  });

  it('accepts a signature it made itself', async () => {
    const { stripeProvider } = await import('../lib/payments/providers/stripe');
    const now = Math.floor(Date.now() / 1000);
    const event = await stripeProvider.verifyWebhook(body, header(`t=${now},v1=${sign(body, now)}`));
    expect(event?.status).toBe('paid');
    expect(event?.ref).toBe('VR-REF-001');
  });

  it('rejects a body changed after signing', async () => {
    const { stripeProvider } = await import('../lib/payments/providers/stripe');
    const now = Math.floor(Date.now() / 1000);
    const signature = sign(body, now);
    const tampered = body.replace('VR-REF-001', 'VR-REF-999');
    expect(await stripeProvider.verifyWebhook(tampered, header(`t=${now},v1=${signature}`))).toBeNull();
  });

  it('rejects a replay of a signature from ten minutes ago', async () => {
    const { stripeProvider } = await import('../lib/payments/providers/stripe');
    const old = Math.floor(Date.now() / 1000) - 600;
    expect(await stripeProvider.verifyWebhook(body, header(`t=${old},v1=${sign(body, old)}`))).toBeNull();
  });

  it('rejects a missing or malformed header', async () => {
    const { stripeProvider } = await import('../lib/payments/providers/stripe');
    expect(await stripeProvider.verifyWebhook(body, new Headers())).toBeNull();
    expect(await stripeProvider.verifyWebhook(body, header('nonsense'))).toBeNull();
  });

  it('will not run on a live key while the POC is in test mode', async () => {
    const { stripeProvider } = await import('../lib/payments/providers/stripe');
    expect(stripeProvider.isConfigured()).toBe(true);
    process.env.STRIPE_SECRET_KEY = 'sk_live_real_money';
    expect(stripeProvider.isConfigured()).toBe(false);
  });
});
