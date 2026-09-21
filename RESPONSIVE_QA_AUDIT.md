# Agent portal — responsive and UX audit

Scope: the agent workspace under `/phase1`. The public marketplace
(`/phase1/homes/**`), the operations console (`/phase1/admin/**`) and the
pre-phase-1 routes at the top level (`/`, `/search`, `/property/[id]`, …) were
left out of this pass.

Method: 29 routes measured at 15 widths — 320, 360, 375, 412, 600, 768, 820,
900, 1024, 1100, 1280, 1366, 1440, 1536, 1920 — in a real browser over the
DevTools protocol, light and dark. Each measurement records the document's
scroll width against the viewport, every element crossing the right-hand edge
that no scroll container owns, every interactive box under 30px, images with no
`alt`, controls with no accessible name, `href="#"` links, and anything the page
logged to the console. 435 measurements in the light pass (29 routes × 15
widths) and 145 in a dark pass at 320, 375, 768, 1280 and 1920.

Result after the fixes below: **0 horizontal overflows, 0 page errors, 0 console
warnings** across all 580.

---

## 1. Routes covered

| Route | What it is | Result |
| --- | --- | --- |
| `/phase1/dashboard` | Day's work: KPIs, performance chart, recent enquiries, viewings, top listings | pass |
| `/phase1/listings` | Portfolio, grid and list views, filters, pagination | pass |
| `/phase1/listings/[id]` | One listing: overview, agent views, performance, health | pass |
| `/phase1/listings/new` | Five-step create wizard | pass |
| `/phase1/listings/import` | Bulk import | pass |
| `/phase1/listings/export` | Client document (renders without the workspace frame) | pass |
| `/phase1/properties` | Saved properties | pass |
| `/phase1/enquiries` | Inbox, stages, detail panel | pass |
| `/phase1/viewings` | Viewing slots and bookings | pass |
| `/phase1/shortlists` | Client shortlists | pass |
| `/phase1/whatsapp` | WhatsApp handover | pass |
| `/phase1/performance` | Live listings and the traffic they brought | pass |
| `/phase1/insights` | Market intelligence: donut, trend, per-district bars | pass |
| `/phase1/market/transactions` | Transactions table | pass |
| `/phase1/market/compare` | Project comparison | pass |
| `/phase1/neighbourhood` | Neighbourhood view | pass |
| `/phase1/reports` | Reports | pass |
| `/phase1/directory` | Every live property, with selection and export | pass |
| `/phase1/qr` | QR for a listing | pass |
| `/phase1/agent` | The agent's own public page | pass |
| `/phase1/refresh` | Automatic refresh | pass |
| `/phase1/learn`, `/learn/sessions` | Guides and sessions | pass |
| `/phase1/support` | Support | pass |
| `/phase1/plans`, `/checkout`, `/payment` | Plan, subscription, payment | pass |
| `/phase1/profile` | Profile and CEA | pass |
| `/phase1/settings` | Notification preferences | pass |
| `/phase1/status` | Verification progress | pass, and one panel removed — see §3 |
| `/phase1/login`, `/signup` | Authentication | pass |

Flows walked, not only rendered: sign in → dashboard → listings → open a
listing → health panel; create-listing wizard step 1; enquiries inbox; settings;
profile; verification status; signed-out access to every protected route.

---

## 2. Responsive fixes

**The header did not fit a 320px phone.** The row is the menu button, the mark
and the control cluster (Demo Data switch, theme, notifications, avatar).
Spelling "Demo Data" out needs 370px of it, so at 320 the avatar sat 34px past
the right edge and *every* page in the portal scrolled sideways — the overflow
was in the shell, so it was on all 29 routes at once. The word is now dropped
below 375px, which is the narrowest phone that still fits it; the dot and the
track still show which way the switch is set and `aria-label` still names it.
→ `components/phase1/DemoDataSwitch.tsx`

**Header icon buttons gave up their width instead of holding it.** They had no
`shrink-0`, so when the row ran short the 36px targets were squeezed — "Open
menu" measured 20px across at 320. Fixing the overflow above would have hidden
this rather than fixed it, so both were done.
→ `components/phase1/Shell.tsx`

**Notification checkboxes were squeezed to 13px.** Two boxes on
`/phase1/settings` sit in a flex row beside their labels and lacked `shrink-0`,
so on a narrow screen the label took their width. The same control in
`components/phase1/ui/form.tsx` already had it.
→ `app/phase1/settings/page.tsx`

**Pagination printed one button per page.** `Array.from({ length: pages })` —
12 pages is a row of 12, and the API activity log is hundreds. One call site had
already capped itself at 999 buttons, which is the same bug with a ceiling on
it. Now a window: the ends, the current page and its neighbours, and a gap. The
cap is gone, so the page count is truthful again.
→ `components/phase1/ui/data.tsx`, `app/phase1/admin/reports/ApiActivity.tsx`

**Touch targets under 24px.** The card-header link ("View all", "Inbox", "All
listings") was a 19px text box; the help mark was 20px square. Both now have a
28px box, pulled back by a negative margin so nothing moves on the line they sit
on.
→ `components/phase1/dashboard/parts.tsx`, `components/phase1/ui/form.tsx`

Not changed, and why: the listing, directory and enquiry row titles measure
20–22px, but each sits inside a row whose whole area is the target (the enquiry
one uses `after:absolute after:inset-0` to stretch it). The measurement is of
the text, not of what a thumb hits.

---

## 3. Functional and security fixes

**An agent could approve their own verification.** `PATCH
/api/phase1/workspace` accepted `approval` and `ceaValid` — the two fields the
operations console writes into the same record, and the ones that decide
whether an account may publish. A valid agent session and
`{"approval":"approved"}` took an account straight past the officer queue, and
nothing put it back: the one reconciliation that exists only fires on a
workspace still sitting at `not_submitted`. Verified against the running server
before and after the fix.

The route now refuses those fields from an agent session (403 when that is all
the patch carried, stripped when it is bundled with a legitimate change). The
guard is in the route rather than in `sanitisePatch`, because the console writes
the same shape through its own route and must keep being allowed to.
→ `app/api/phase1/workspace/route.ts`

**"Prototype controls" removed from `/phase1/status`.** A panel on the agent's
own verification page offered "Simulate officer approval" and "Simulate
registration lapsing" — the buttons that used the hole above. The approval is
walked through in the console at `/phase1/admin/verification`, which is where it
belongs.
→ `app/phase1/status/page.tsx`

**The create tab in the mobile bottom bar had no name.** Every other tab prints
its label underneath; that one shows the icon alone with `aria-hidden` on it, so
a screen reader reached it and announced "link".
→ `components/phase1/Shell.tsx`

**The navigation drawer said `aria-modal` without behaving like one.** Escape
and the scroll lock were there; focus was not. A keyboard user opened the drawer
and tabbed straight through it into the page it was covering. Focus now starts
inside it, Tab cycles within it, and closing returns focus to the button that
opened it.
→ `components/phase1/Shell.tsx`

**Breadcrumb segments showing raw path names.** `directory`, `forgot` and
`reset` had no entry in the shell's title map, so they printed lowercase and
unpunctuated.
→ `components/phase1/Shell.tsx`

---

## 4. Checked and found correct

- **No horizontal overflow** at any of the 15 widths, on any of the 29 routes,
  in either theme.
- **Tables.** `DataTable` already scrolls horizontally inside a bordered box
  with a sticky header and a `hideBelow` prop per column, so columns drop by
  priority rather than being crushed. Nothing needed doing.
- **Charts** at 390: the donut, the rent trend with its axis labels, and the
  per-district bars all stay legible; the transactions strip scrolls rather than
  shrinking.
- **Navigation.** Desktop sidebar with a collapsible rail, mobile drawer plus a
  five-item bottom bar, skip link, breadcrumbs two levels down, and a
  `/`-and-Ctrl-K search. No `href="#"`, no dummy routes, no "Coming Soon"
  anywhere in the portal.
- **Authentication.** Every protected route answers 307 to
  `/phase1/login?next=…` when signed out; the `next` parameter is carried.
- **Empty states** carry a sentence and an action ("No viewings booked · Publish
  viewing slots so tenants can book a time · Add slots").
- **Demo Data.** One switch, one cookie, read on the server so the first paint
  matches; no path anywhere in the data layer turns a database error into demo
  data. ON writes nothing back to the account.
- **Data provenance.** The insights screens label their dataset ("Illustrative ·
  to Aug 2026", and a closing note that it is not market evidence).
- **Phone number field.** One component, `+65` fixed rather than a
  one-country dropdown, digits grouped 4-4 as typed, pasted numbers stripped of
  their code. Already adopted in all three places that ask for a number —
  profile, sign-up and viewings.
- **Images** all carry `alt`, including the generated placeholder, which uses
  `role="img"` with a label.

---

## 5. Known gaps (not fixed here)

- **Every screen shares one browser-tab title.** All 29 read "V-RENT — Agent
  Platform", because each page is a client component and so cannot export
  `metadata`. Setting `document.title` from the shell does not hold — Next
  re-asserts the layout's title after the effect runs, and rendering a second
  `<title>` leaves three in the head with the first one winning. The fix is a
  thin server wrapper per route that exports its own `metadata`; that is a
  separate piece of work across ~25 files.
- **Subscription state is still set by the browser.** `PATCH
  /api/phase1/workspace` accepts `subscription`, `planCode` and `paymentMethod`,
  and `/phase1/payment` flips `subscription: 'active'` from the client once the
  intent settles. The payment itself is verified server-side and reveal credit
  is already granted by the webhook, but the plan flag is not: a hand-rolled
  PATCH would set it without paying. It belongs derived from the payment store
  on read. Left alone here only because the payments layer is mid-change; it
  should not stay this way.
- The `/phase1/status` verification walkthrough now needs the operations console
  to advance an account past "under review". That is correct, and worth knowing
  before the next demo.
- **A hydration warning was logged once against `/phase1/listings/export`** —
  `data-overflow` on the sheet `<section>` differing between the server render
  and the first client render, which React says it will not patch up. It did not
  reproduce on a fresh load at 390, 768, 1440 or 1920, and the export sheet is
  in a file being changed elsewhere, so it is recorded rather than chased. The
  flag comes from a layout measurement taken in the browser, which is the shape
  of thing that produces exactly this warning if it is read during the first
  render rather than after it.
