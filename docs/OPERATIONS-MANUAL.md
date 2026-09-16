# V-RENT — how to use it

A guide for somebody opening V-RENT for the first time. Every section says where to click and what
you get. Nothing here needs a technical background.

There are two sides to the product. **Agents** list properties and answer the people who reply.
**Staff** verify agents, review listings and watch the platform. You see one or the other depending
on how you sign in.

---

## Part one — for agents

### Getting in

1. Go to **/phase1** and click **Create an agent account**, or **Sign in** if you have one.
2. Enter your CEA registration number. It is checked against the public register while you type — if
   your name and agency come back, you are found. If they do not, the number is wrong.
3. Fill in your professional details: agency, licence number, districts, how clients reach you.
4. Wait for approval. **Verification** in the sidebar tells you exactly what is outstanding.

Most applications clear the same working day.

### Finding your way around

The sidebar is grouped by what you are trying to do.

| Group | What is in it |
| --- | --- |
| **Workspace** | Dashboard, your listings, the map, create and import |
| **Reach** | Automatic refresh |
| **Clients** | Enquiries, viewings, WhatsApp handover, client shortlists |
| **Market data** | Transactions, project comparison, neighbourhood |
| **Business** | Subscription, performance, reports |
| **Account** | Profile, public page, QR code, verification, settings |
| **Help** | Guides, sessions, support |

### Putting a property online

**Create listing** in the sidebar.

1. **Where is it.** Type the postal code and the project, road and district fill themselves in. If
   there is no postal code yet — a new launch, a landed road — switch to **Choose on the map** and
   drop a pin instead.
2. **The facts.** Bedrooms, size, furnishing, availability, minimum lease. These are what a tenant
   filters by, so a listing missing them is invisible to the people most likely to take it.
3. **Photographs.** Eight to twelve, landscape, lights on and blinds open. The first is the cover and
   decides whether anybody opens the rest.
4. **Publish.** Four things must be true: your account is verified, your subscription is active, you
   have quota left, and the required fields are complete. If one is not, the screen names it and
   links to the page that fixes it.

Saving a draft at any point is fine. Nothing is published until you say so.

**Bulk import** takes a spreadsheet instead. Map your column names once; every row is checked and
previewed before a single listing is created.

### Changing what you already have

**Listings** in the sidebar is the working view. Filter by standing, district, price or lease term.
Each listing shows a health score — what it is missing and why that matters. From here you can
pause, resume, renew, duplicate, archive or edit.

**Properties** shows the same inventory on a map of Singapore, which is how most tenants search.

### Answering people

**Enquiries** is the queue, oldest unanswered first. Tenants take the first sensible reply, not the
best one, so work it from the top.

**WhatsApp handover** is for when the conversation should move to WhatsApp. Pick the enquiry, pick a
template, edit the message, and click **Open in WhatsApp** — it opens with the text already written
and the enquiry is marked replied. Your name, CEA registration and agency go into every template
automatically.

**Viewings** stops the back-and-forth about times. Publish the hours you can be at a property and a
tenant takes one. **Add a week of evenings** fills seven days in one click. When somebody books, you
see their name and number on the slot.

### Sending properties to a client

**Client shortlists**.

1. Narrow the list down — district, bedrooms, rent ceiling, or search by project.
2. Tick the units the client is going to see.
3. Put the client's name and a note on it, and save it so you can come back to it.
4. **Export as PDF.**

The document is one page per property: photographs, a map, the full description, the facts, and
where the asking rent sits against what comparable units actually let for. Your name, registration
and agency licence go on every page, which the advertising rules require on anything you send a
client.

### Staying visible

- **Automatic refresh** — keeps a listing near the top of new results without you editing it every
  morning. Every other day is usually enough. One refresh a day per listing, whatever you set.

Fix a listing's health score before refreshing it. Traffic to a listing with three photographs and
no description is traffic that bounces.

### Knowing what to charge

- **Transactions** — what comparable units actually let for, by project, size and lease month.
  Filter to the project, read the median, not the top. The highest rent in a project was somebody in
  a hurry with a company budget.
- **Compare projects** — two or three developments on the same rows: rent, per square foot, age,
  tenure, distance to the station. The shaded cell is the better number on that row.
- **Floor plans** — the unit mix for a development. Download a plan or attach it to one of your
  listings.
- **Neighbourhood** — what is actually around an address, with the walk from the door. Hawker
  centres, parks, hospitals, libraries and more, from the government's own registers. There is a
  copy button that turns it into a sentence for your listing description.

### Being findable

- **Profile** — your name, agency, districts and contact details. These appear on every listing.
- **Public page** — one link you can give anybody: your verified registration, the districts you
  work, and everything you currently have live. Preview it before you turn it on.
- **QR code** — a code for a name card or a viewing sign. Download the SVG for anything printed
  properly; the PNG is for a slide. Keep it at least 25mm across on a card.

### Reports

**Reports** produces four things: listing inventory, enquiries, performance, and compliance and
expiry. Choose one, narrow it with the filters, and watch the row count. Then take it as a **CSV**
for a spreadsheet, a **PDF** for somebody who will read it, or a **photo shortlist** for a client.

### Money

**Subscription** shows your plan, renewal date and past invoices. **Plans** compares the three and
shows how much of your listing quota is used.

### When you are stuck

**Guides** are five short sequences — registration through to keeping a portfolio visible — and each
step links to the screen that does it. **Sessions** are recorded walkthroughs, indexed by chapter.
**Support** answers the five questions asked most, and opens a ticket with your account and
registration already attached if none of them fit.

---

## Part two — for staff

Sign in with an operations account. The console is at **/phase1/admin** and is not advertised to
agents: an agent who guesses the address gets a "not found", not a login prompt.

### Overview

Opens with the one number that matters: how many things need a person right now. Under it, each
queue shows how long the oldest item has been waiting against the time the platform promises —
24 hours for verification, 12 for moderation, 72 for payments. Anything past its promise is marked
and sorted to the top of its queue.

Below that: what the API served, when in the week work actually arrives, the listing mix, who is
carrying the queues, and what is being earned.

### The queues

- **Verification** — applications waiting on a decision. Each shows the account's details beside
  what the CEA register says, field by field, with disagreements marked. Approve or reject with a
  reason; both are written to the audit trail with your name on them.
- **Moderation** — listings published but not yet reviewed, and ones corrected after a rejection.
  Duplicates of the same unit advertised by somebody else are flagged.
- **Agents** — the full directory. Open one to see their portfolio, their standing and every
  decision ever made about them. Suspending an agent takes away the right to publish; they keep
  their account and their listings.

### Billing

**Subscriptions** leads with annual recurring revenue and a twelve-month renewal calendar — the
tallest bar is the month that needs a retention plan. Under it: where the revenue sits by plan, how
much of the book is still paying, how they pay, and a "chase these today" list of anything past due.
Retry a payment or issue a refund from either the list or the table.

### Reports and audit

Three tabs.

- **Platform** — the onboarding funnel, listings by standing, conversion, and decision volume. The
  funnel is modelled for the business case and is labelled as such; everything else is read from
  this instance.
- **Audit trail** — every verification, moderation and suspension decision with the officer who made
  it and the reason given. Filter by kind, by officer, or by whether it went against the agent.
  Downloads as CSV.
- **API activity** — every call the platform served. Filter by *only problems*, *broke on our side*,
  *slower than 500ms* or *rate limited*, then narrow by time, part of the product, endpoint, caller
  or method. Click a row for the full detail.

On that last tab, "Refused" and "Failed" mean different things. **Refused** is somebody not signed
in or not allowed to see something — the platform working correctly. **Failed** is something broken
on our side. Those are the ones to look at.

---

## Where the data comes from

| What | Source |
| --- | --- |
| Agent registrations | The public CEA register on data.gov.sg, checked live |
| Addresses, postal codes, districts | OneMap, Singapore Land Authority |
| Maps | OneMap static maps |
| Amenities around an address | OneMap theme service — each group names its own agency |
| Rental transaction history | Stands in for URA's lodged rental contracts, which needs a URA account |

Anything modelled rather than measured says so on the screen it appears on.

---

## Two things worth knowing

**Nothing is hidden when it does not work.** If a service is unavailable or a feature depends on
something outside this build, the screen says so in a sentence and keeps working around it.

**Every decision is written down.** Approvals, rejections and suspensions all carry the officer who
made them, the time, and the reason. That record cannot be edited afterwards.
