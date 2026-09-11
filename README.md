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

## Data that outlives a restart

| File | Written by |
| --- | --- |
| `.data/accounts.json` | Registration and sign-in |
| `.data/workspaces.json` | Everything an agent owns: listings, enquiries, tools |
| `.data/audit.json` | Verification, moderation and suspension decisions. Append-only. |
| `.data/requests.json` | Every API call: method, route, status, duration, signed-in account |

`.data/` is gitignored. Deleting it resets the instance; accounts re-seed on next sign-in.

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
