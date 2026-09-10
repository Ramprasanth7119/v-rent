# V-RENT — Agent subscription payments

Research and implementation notes for collecting the agent subscription fee.
Rates verified 3 September 2026 against each provider's published pricing.

---

## 1. The decision in one line

**PayNow is the primary rail, Razorpay Singapore is the account that provides it
and the card fallback, and Dodo is the fallback only if V-RENT never gets a
Singapore entity.**

Everything below is the working behind that.

---

## 2. The constraint that decides it

PayNow Corporate is only available to an entity **incorporated in Singapore with
a UEN and an SGD business account**. A foreign company cannot collect PayNow.

So the first question is not "which gateway" but "which entity":

| Merchant entity | PayNow | Best option |
| --- | --- | --- |
| Singapore Pte Ltd (with UEN) | Yes | **Razorpay Singapore** — PayNow + cards on one account |
| Indian Pvt Ltd, no SG entity | No | **Dodo** (merchant of record), or incorporate in SG |
| Indian Pvt Ltd using Razorpay India | No | Cross-border card only, ~3%+, 18% GST on fees, FEMA paperwork |

Razorpay India and Razorpay Singapore are different products. Razorpay India
cannot settle SGD from Singapore agents and has no PayNow.

---

## 3. Published rates

| | PayNow (via Razorpay SG) | Card (Razorpay SG) | Dodo Payments |
| --- | --- | --- | --- |
| Model | Direct bank rail | Gateway, V-RENT is merchant | Merchant of record |
| Fee | 0.60% + S$0.30 | 2.90% + S$0.40 domestic; 3.50% + S$0.40 international | 4% + US$0.40, +1.5% intl, +0.5% subscription |
| Setup / monthly | None | None | None |
| Refund fee | Free (ex tax) | Free (ex tax) | US$1 |
| Chargeback | Not possible on this rail | Yes, card scheme rules | US$30 (Dodo absorbs the liability) |
| Payout | To SGD bank account | To SGD bank account | Free standard; US$25 SWIFT; US$5 under US$1,000 |
| Who files the GST | V-RENT | V-RENT | Dodo |
| Supports PayNow | Yes | — | **No** |

### PayNow operating limits (Razorpay Singapore, published)

| | |
| --- | --- |
| Minimum transaction | S$1 |
| Maximum | **S$2,000 per customer per day** |
| QR validity | 10 minutes |
| Refund window | 30 days from the transaction date |

The S$2,000 cap is the one that matters: **any plan priced above S$2,000 cannot be
collected by PayNow in a single transfer.** The code refuses that combination
server-side (`paynow_limit_exceeded`) and the UI disables the option on such a
plan, so cheaper tiers take PayNow and anything above the cap goes to card. Worth
knowing before the client fixes the price list.

---

## 4. Worked example — a S$100 agent fee

Assuming V-RENT is a Singapore Pte Ltd and the S$100 shown to the agent is
GST-inclusive.

### 4a. PayNow

| Step | Amount |
| --- | --- |
| Agent transfers | S$100.00 |
| Processing fee 0.60% + S$0.30 | −S$0.90 |
| GST 9% on that fee (claimable as input tax) | −S$0.08 |
| **Lands in the bank** | **S$99.02** |
| GST 9% owed to IRAS on the sale (if registered) | −S$8.26 |
| **Kept** | **S$90.76** |

Not GST-registered: nothing goes to IRAS and nothing is charged, so S$99.02 is kept —
but no GST may appear on the invoice at all.

### 4b. Card via Razorpay

| Step | Amount |
| --- | --- |
| Agent pays | S$100.00 |
| Processing fee 2.90% + S$0.40 | −S$3.30 |
| GST 9% on that fee | −S$0.30 |
| **Lands in the bank** | **S$96.40** |
| GST to IRAS | −S$8.26 |
| **Kept** | **S$88.14** |

### 4c. Dodo (merchant of record)

| Step | Amount |
| --- | --- |
| Agent pays Dodo | S$100.00 |
| Dodo fee ≈ 6% + S$0.55 | −S$6.55 |
| **Dodo pays out** | **S$93.45** |
| GST to IRAS | S$0 — Dodo collected and filed it |
| **Kept** | **S$93.45** |

Dodo looks better than the card row *only because* V-RENT never touches the GST.
Against PayNow it is roughly seven times the cost of collection, and it cannot
offer PayNow at all — which is the method most Singapore agents will reach for.

### 4d. Cost of collection, as a rate

The plan prices in the prototype are placeholders the client has not confirmed,
so no revenue projection here would mean anything. The ratio is the durable part:

| Method | Rate | Relative cost |
| --- | --- | --- |
| PayNow | 0.60% + S$0.30 | **1×** |
| Razorpay card | 2.90% + S$0.40 | roughly 4–5× PayNow |
| Dodo | ~6% + S$0.55 | roughly 7–10× PayNow |

Multiply by whatever the client settles on. One thing to watch whatever the
price: once taxable turnover passes S$1 M, GST registration is compulsory — so
the invoice should be built GST-ready from the start.

---

## 5. Tax positions, plainly

| | V-RENT is the seller (PayNow / Razorpay) | Dodo is the seller |
| --- | --- | --- |
| Who charges GST | V-RENT, once registered | Dodo |
| Who files it | V-RENT, quarterly to IRAS | Dodo |
| Invoice shows | V-RENT + GST reg. no. | Dodo Payments |
| GST on the processing fee | 9%, reclaimable as input tax once registered | Not applicable |
| V-RENT's own revenue | The sale to the agent | The net payout from Dodo |
| From 1 Apr 2026 | New voluntary registrants must issue InvoiceNow e-invoices | Dodo's problem |

Set this in one place: `PAYMENTS_TAX_TREATMENT` = `not-gst-registered` |
`gst-registered` | `merchant-of-record`. It drives the tax line and the invoice
and nothing else in the code changes.

---

## 5b. Test now, KYC before live — confirmed for all three

Every provider here gives working test credentials before any KYC, and gates only
the movement of real money behind verification. Nothing about the integration
changes between the two — same API, same webhooks, different keys.

| | Test today | To go live |
| --- | --- | --- |
| **Razorpay Singapore** | Dashboard has a Live/Test toggle; generate a Test Key ID + Secret straight after signup. Test keys cannot move real money. | KYB: **ACRA registration**, proof of incorporation, proof of address, business/website description, ID for every beneficial owner over 25%. Then generate live keys. |
| **Dodo Payments** | Sandbox at `test.dodopayments.com` with test cards; webhooks and API calls all work. | Account Verification: Individual or Registered Entity, ID and address proof, payout details, then a manual compliance review against their Merchant Acceptance Policy. |
| **PayNow** | No sandbox of its own — it is a bank rail, not an API product. Test it through Razorpay's test mode, or against the QR our code generates. | A **Singapore UEN**, an SGD business account, and PayNow Corporate enabled by the bank. |

The one asymmetry worth naming: Razorpay Singapore's KYB explicitly requires
**ACRA registration**, so its test mode is usable by anyone today but its live
mode is not available to an entity that is not registered in Singapore.

Our sandbox mode is a third layer under all of this: with an empty `.env` the
routes run the real signature verification, the real state machine and a real
PayNow QR, and fake only the provider's HTTP call — so the flow can be demoed to
the client before a single account is opened.

---

## 6. Honest caveats

- **Razorpay Singapore is young.** It launched in Singapore in March 2025. It is
  the cheapest PayNow rate published and it covers both methods on one account,
  but it does not yet have the enterprise track record of Stripe, Adyen or 2C2P.
  If the client's definition of "enterprise" is a bank-grade SLA and a named
  account manager, HitPay (PayNow 0.65% + S$0.30 above S$100) and Stripe (PayNow
  1.3%) are the usual Singapore comparators. The code here is written against a
  provider interface, so swapping the card/PayNow provider is one new file.
- **Dodo is the newest of the three** and the least suited to a Singapore-only
  product. Its value is global tax compliance, which V-RENT does not need if it
  sells only to Singapore CEA agents.
- **Fee GST** — a 9% GST charge on Razorpay's own fees is expected for a
  Singapore merchant but is not stated on their public pricing page. Confirm it
  on the merchant agreement before quoting a final number to the client.

---

## 7. What is in the codebase

```
lib/payments/
  types.ts          domain types + the forward-only state machine
  money.ts          integer-cent maths, GST inclusive/exclusive splits
  config.ts         env-driven config, published fee model
  concurrency.ts    KeyedMutex, Semaphore, TokenBucket
  store.ts          intent store: per-ref locks, idempotency keys, event dedupe
  http.ts           timeouts, bounded retries with jitter, outbound semaphore
  paynow-qr.ts      EMVCo / SGQR payload builder + CRC-16/CCITT
  service.ts        orchestration — the only module a route calls
  client.ts         browser hooks: idempotent start, backing-off poller
  providers/
    paynow.ts       dynamic QR + signed reconciliation callback
    razorpay.ts     hosted Payment Link + HMAC-SHA256 webhook verification
    dodo.ts         hosted checkout + Standard Webhooks verification

app/api/payments/
  intents/route.ts             POST — open a payment (Idempotency-Key required)
  intents/[ref]/route.ts       GET  — status poll
  webhooks/[provider]/route.ts POST — verify, dedupe, transition
  sandbox/route.ts             POST — emits a correctly signed webhook; 404 when live

app/phase1/payment/            the payment screen
app/phase1/payment/sandbox/    stand-in for a hosted checkout page
scripts/loadtest-payments.mjs  concurrency check
```

Run it with no credentials at all: sandbox mode uses the real signature, state
machine and QR code, and only fakes the provider's HTTP call.

```
npm run build && npx next start -p 3100
npm run loadtest:payments -- http://localhost:3100 100
```

---

## 8. Concurrency — what holds under load

Measured on a production build, 300 simultaneous agents, single Node process:

| Check | Result |
| --- | --- |
| 300 concurrent checkouts | 300 created, 0 server errors, 300 unique references |
| Create latency | p50 1,096 ms · p95 1,678 ms |
| 25 simultaneous clicks, one idempotency key | 1 payment |
| Every webhook delivered 3× at once (900 posts) | applied exactly once each |
| `paid` and `failed` racing on one payment | terminal state never overwritten |
| 400 concurrent status polls | all answered |
| Unsigned webhook | 401, never parsed |
| One IP flooding the create route | throttled; other agents unaffected |

How:

- **Idempotency-Key** on create. First caller claims the key under a lock; every
  later caller with the same key gets the same payment back.
- **Per-payment lock** around every read-modify-write, so two webhooks for one
  payment cannot interleave.
- **Event-id dedupe** on the provider's own unique event id.
- **Forward-only transitions.** Terminal is terminal; a late `failed` cannot undo
  a `paid`.
- **Raw-body signature verification** in constant time, before any parsing, with
  a 5-minute timestamp window against replay.
- **Server-side pricing.** The amount comes from the plan catalogue, never the
  request body.
- **Bounded outbound concurrency** with an 8 s timeout and jittered retries, so a
  slow provider cannot pile up sockets.
- **Per-IP token bucket** on create, so one client cannot starve the rest.
- **Polling that backs off** 2 s → 8 s with jitter and pauses on a hidden tab.

### Before this goes to production

The in-memory store is single-process. On more than one instance, replace three
functions in `lib/payments/store.ts` — the call sites do not change:

| In-memory now | Production |
| --- | --- |
| `withIntent` | `SELECT … FOR UPDATE` in a transaction |
| `claimIdempotencyKey` | `INSERT … ON CONFLICT DO NOTHING RETURNING` |
| `claimEvent` | unique index on `webhook_events(event_id)` |

Also required before live: real credentials and `PAYMENTS_MODE=live`; the raw
webhook payload persisted for dispute evidence; a daily reconciliation job
against the provider's settlement report; and a trusted-proxy check before
believing `X-Forwarded-For`.

---

## 9. Go-live checklist

**Entity and banking**
- [ ] Decide the merchant entity — Singapore Pte Ltd, or accept no PayNow
- [ ] UEN issued; SGD business current account opened
- [ ] PayNow Corporate enabled on that account, UEN as the proxy
- [ ] Decide GST registration (compulsory above S$1 M taxable turnover)
- [ ] If registering from 1 Apr 2026, plan for InvoiceNow e-invoicing

**Provider onboarding**
- [x] Test-mode keys work without any KYC on both Razorpay and Dodo
- [ ] Razorpay Singapore KYB: **ACRA registration**, incorporation proof, address
      proof, business description, IDs for anyone holding over 25%
- [ ] Confirm in writing: settlement cycle (T+n), GST on fees, chargeback terms
- [ ] Dodo account only if the entity question lands on "no SG entity"
- [ ] Negotiate volume pricing once monthly volume is known
- [ ] Switch `PAYMENTS_MODE=live` only after live keys and webhook secrets are in
      the secret manager

**Build**
- [x] Provider interface with PayNow, Razorpay and Dodo behind it
- [x] Idempotent create-intent, keyed on `Idempotency-Key`
- [x] Signature-verified, deduped, order-independent webhooks
- [x] Forward-only payment state machine
- [x] Server-side pricing and GST split
- [x] Dynamic PayNow QR with our reference embedded for reconciliation
- [x] Rate limiting, outbound concurrency caps, retry with backoff
- [x] Sandbox mode that exercises the production path
- [x] Concurrency test in CI (`npm run loadtest:payments`)
- [ ] Swap the in-memory store for Postgres
- [ ] Persist the raw webhook payload for disputes
- [ ] Daily reconciliation against the settlement report
- [ ] Receipt / tax invoice PDF with the GST number
- [ ] Dunning and renewal reminders (30 days out)
- [ ] Refund and proration path for downgrades

**Compliance**
- [ ] PCI-DSS SAQ-A confirmed — card data only ever on the provider's page
- [ ] PDPA: store the payment reference, never card or bank details
- [ ] Invoice shows the correct seller for the chosen tax treatment
- [ ] Terms of service name the payment provider and the refund policy
- [ ] Webhook secrets in a secret manager, not in the repo; rotation planned

**Operations**
- [ ] Alert on webhook failure rate and on intents stuck in `awaiting_payment`
- [ ] Admin view: search a payment by reference, resend a receipt
- [ ] Runbook: an agent paid but is not activated (find the ref, replay the event)
- [ ] Load test in CI against the production build, not the dev server

---

## Sources

- Razorpay Singapore pricing — https://razorpay.com/sg/pricing/
- Razorpay webhook validation — https://razorpay.com/docs/webhooks/validate-test/
- Dodo Payments pricing — https://dodopayments.com/pricing
- Dodo webhooks (Standard Webhooks) — https://docs.dodopayments.com/developer-resources/webhooks
- HitPay transaction fees — https://hitpayapp.com/blog/hitpay-transaction-fee
- Stripe PayNow — https://stripe.com/resources/more/paynow-an-in-depth-guide
- IRAS GST registration threshold — 9%, S$1 M taxable turnover
