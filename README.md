# V-RENT

A rental platform for Singapore property agents, and the operations console behind it.

The working build is under `/phase1`. It covers the whole of an agent's week — getting a unit
online, answering the people who reply, staying visible, and keeping CEA registration and
subscription in good standing — plus the back office that verifies agents, moderates listings and
watches the platform.

Everything an agent does is checked where it has to be: the registration number against the public
CEA register, the address against the Singapore Land Authority's, and publishing against a gate that
states what is blocking it.

## Running it

```
npm install
cp .env.example .env.local     # then fill in the values below
npm run dev                    # http://localhost:3000/phase1
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest, once |
| `npm run test:watch` | Vitest, watching |

### Environment

`.env.local` is not committed. Nothing below is required to start the server; each one degrades
honestly when it is missing, and the screen that needs it says so.

| Variable | Needed for |
| --- | --- |
| `VRENT_ADMIN_EMAIL`, `VRENT_ADMIN_PASSWORD` | The operations account, seeded on first sign-in |
| `VRENT_DEMO_AGENT_EMAIL`, `VRENT_DEMO_AGENT_PASSWORD` | A demo agent account with a portfolio already in it |
| `VRENT_DEMO_AGENT_CEA`, `VRENT_DEMO_AGENT_MOBILE` | That account's registration details |
| `ONEMAP_TOKEN` | Reverse geocoding and neighbourhood amenities. Tiles, search and static maps need no token. |
| `MONGODB_URI` | Where records are kept. **Set this on any deployment** — see below. |
| `MONGODB_DB` | Database name. Otherwise taken from the URI, or `vrent`. |
| `VRENT_SESSION_SECRET` | Signing cookies. **Required on any serverless deployment** — see below. |
| `VRENT_DATA_DIR` | Overrides where state is written. See below. |
| `VRENT_PUBLIC_ORIGIN` | The address the tenant site answers on, for the sitemap, `robots.txt` and canonical links. Without it the request's own host is used, which is right on a laptop and on most deployments. |

OneMap issues short-lived tokens. When one expires the pin-drop falls back to asking for a postal
code and the neighbourhood screen says the service is not configured; nothing else is affected.

## What is real

| Works against a live service | Notes |
| --- | --- |
| CEA registration lookup | `data.gov.sg`, resource `d_07c63be0f37e6e59c07a4ddc2fd87fcb`. Field filters go in the `filters` parameter. |
| Address search and postal code lookup | OneMap `elastic/search`. No token. |
| Static maps | OneMap, proxied so the token stays server-side. Capped at 512 × 512 by the service. |
| Reverse geocoding | OneMap `revgeocode`. Needs `ONEMAP_TOKEN`. |
| Neighbourhood amenities | OneMap theme service — hawker centres, parks, hospitals, libraries and four more. Needs `ONEMAP_TOKEN`. |

Modelled rather than measured, and labelled as such on screen: the rental transaction history, the
onboarding funnel on the reports page, and the recorded sessions in the learning library.

## Layout

```
app/phase1/            Agent workspace and operations console
app/phase1/admin/      Back office: queues, directory, billing, reports
app/api/               Route handlers. Every export is wrapped by logged().
components/phase1/     The kit: kit.tsx re-exports everything under ui/
lib/phase1/            Domain logic, stores and derived figures
lib/auth/              Accounts, sessions, CEA register client
tests/                 Vitest
```

Two things are worth knowing before changing anything:

**The design system is scoped.** Tokens live under the `.p1` class in `app/globals.css` and are
exposed as `bg-p1-*`, `text-p1-*`, `font-p1display`. Build new screens from `components/phase1/kit`,
not from `components/ui` — the latter belongs to the older consumer app in this repository.

**State is files, not a database.** Accounts, workspaces, the audit trail and the request log are
JSON under `.data/`, written through a per-key mutex and an atomic rename. Every caller goes through
the small set of functions at the bottom of each store, so swapping the storage is a change to one
file each.

## Where records live

Everything goes through `lib/store/driver.ts`, which has two backends.

| `MONGODB_URI` | Backend |
| --- | --- |
| Set | MongoDB, one collection per kind of record |
| Not set | JSON files under the data directory below |

The file backend is kept on purpose: a laptop should need no database to run the product, and the
tests should not need one either. Everywhere else, set the URI. A cloud platform mounts the
deployment read-only and gives the function a `/tmp` that belongs to one instance and is discarded
when it recycles — so without a database, signing in fails outright, and once that is worked around,
an account created at two o'clock is gone by three.

| Collection | Holds |
| --- | --- |
| `accounts` | Registration and sign-in |
| `workspaces` | Everything an agent owns: listings, enquiries, tools |
| `audit` | Verification, moderation and suspension decisions |
| `requests` | Every API call: method, route, status, duration, signed-in account |
| `photos` | Uploaded photographs, full size and thumbnail |
| `settings` | Single values, including a generated signing key |

On MongoDB Atlas, Network Access has to allow the platform's addresses. Vercel publishes no fixed
range, so in practice that means `0.0.0.0/0` with a strong password on a user scoped to this
database.

### The file directory

`lib/storage.ts` resolves it once: `.data` beside the source normally, `/tmp/vrent-data` on a
serverless runtime — the only writable path there — and `VRENT_DATA_DIR` overrides both. It is
gitignored. Deleting it resets the instance; accounts re-seed from the environment on the next
sign-in.

### When the database is unreachable

`/api/health` says so, along with everything else this instance is missing. Sign-in and sign-up
answer with a sentence explaining it is not the visitor's fault. The first attempt waits out one
connection timeout; the rest of that request fails immediately rather than waiting out six of them,
and the next request tries again.

### Sessions

The session cookie is HMAC-signed. The key comes from `VRENT_SESSION_SECRET`; with none set it is
generated once and written beside the data, which is fine on a laptop and wrong anywhere the storage
does not outlive the process.

On serverless each instance would generate its own key, so a cookie signed at sign-in is rejected by
whichever instance serves the next request. The session appears to work and then evaporates: pages
render as though nobody is signed in, and the operations console answers 404 to its own
administrator. Every symptom points somewhere other than the cause, so the server refuses to sign a
session it cannot verify later and says exactly what is missing.

Generate one with `openssl rand -hex 32`. Changing it signs everybody out, which is the intended way
to revoke every session at once.

`middleware.ts` verifies the same signature on the edge when the key is in the environment, so an
unusable cookie is cleared and its holder sent to sign in rather than let through to a page that will
render signed-out. Without the key it falls back to checking the cookie is present — safe on a
laptop, where the key in the file does not change underneath anybody.

## Request logging

`lib/phase1/reqlog.ts` exports `logged()`, which wraps a route export without changing its
signature:

```ts
async function GET_handler(req: Request) { /* … */ }
export const GET = logged(GET_handler);
```

It records method, route (with dynamic segments collapsed back to `[id]`), status, duration and the
signed-in account. It does not record bodies, query strings or headers. Rows buffer in memory and
flush in batches, so the log is never the slowest thing in a request.

The operations console reads it at **Reports & audit → API activity**, with endpoints named for what
they do rather than for their path.

## Checking a deployment

`GET /api/health` reports the backend, whether it is reachable and how long it took, which
environment variables are set — presence, never values — and a plain-English list of what will go
wrong. It is the first thing to open when a deployment behaves oddly.

## Talking to other people's servers

Every outbound call goes through `fetchWithTimeout` in `lib/http.ts`, which gives up after six
seconds. `fetch` has no default timeout, so a government service having a slow afternoon would
otherwise become a request of ours that hangs until the platform kills it — and on a serverless
runtime that burns the whole function budget. Every screen that makes one of these calls already
knows how to say "that lookup did not come back"; the timeout is what lets it.

## Conventions

- Comments explain why, not what. If a line needs explaining, the explanation is the reason it is
  written that way, not a restatement of it.
- British English in UI copy. Singapore dates and currency throughout: format dates with
  `lib/phase1/format`, which pins the timezone so the server and the browser agree.
- Money is always `sgd()` from `lib/phase1/data`.
- A screen that cannot do something says so on the screen, in a sentence, rather than hiding the
  control or pretending.

## Tests

`npm test` covers the parts where being wrong is expensive: session signing and password hashing,
the publish gate, listing filters and sorting, the CSV importer, and Singapore-specific validation —
postal codes, CEA registration numbers, districts and price formatting.
