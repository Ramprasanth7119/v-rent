# V-RENT — what each part of the platform is

A reference for presenting the proof of concept. One entry per item in the
navigation, in the order it appears on screen.

V-RENT has two separate workspaces behind one sign-in. Which one you get is
decided by the account, not by a setting:

- **Agent workspace** — for CEA-registered property agents.
- **Operations console** — for V-RENT staff. Agents cannot reach it; the routes
  return "not found" rather than "forbidden", so its existence is not
  advertised.

---

# Agent workspace

## Workspace

### Agent hub
The front door. Every tool the platform offers, grouped the way an agent's week
is organised, with a search across all of them. Signed in, the top of the page
shows their own position — verification standing, plan, inventory, unanswered
enquiries. Signed out, it makes the case for registering. Tools not built in
this prototype say so on the card rather than dead-ending.

### Dashboard
The working day in one screen. What needs attention today, ordered by
consequence — a listing with no photographs, enquiries waiting for a reply, a
listing that was rejected. Alongside it: active listings against the plan quota,
drafts, listings expiring, views over seven days, and the publish checklist.

### Listings
Every listing the agent has, in one place. Publish drafts, pause what is let,
archive what is finished. Each listing carries its status through a lifecycle:
draft → pending review → published → paused / expired / rejected.

### Properties
Every building and development the agent has units in. Listings attach to a
property, so one address is never entered twice, and a building's details stay
consistent across all the units in it.

### Create listing
A seven-step guided flow: what the listing is, the property, the unit and size,
rental terms, description and amenities, photographs, then review. Each step
gates the next. The final step runs the publish checklist — agent approved, CEA
registration valid, subscription active, quota available, required fields and
images complete — and publishing is blocked until all five pass.

### Bulk import
For an agent bringing a portfolio across from another portal. Upload a
spreadsheet, and a draft is created for every valid row. Each row is reported
back individually: rows that are fine import, rows with a warning import anyway,
and rows that cannot be used are skipped with the reason named — a missing
field, or a postal code that is not a Singapore sector.

## Reach

### Featured placement
Puts one listing at the top of its district and property type for a fixed run.
Priced per day, cheaper the longer the commitment, and reported against what it
actually produced rather than sold on a promise.

### Automatic refresh
Keeps a listing near the top of new results without the agent opening it every
morning. The cadence is set once per listing; the platform does the lift and
records that it did it.

### Search placement
Puts the agent above other agents in the districts they work. Sold by the day,
priced by how contested the district is, and stoppable at any time.

## Clients

### Enquiries
Every enquiry waiting for a reply, with the channel it came through (V-RENT,
WhatsApp or phone), which listing it is about, and how long it has been waiting.
Filterable by status. Carries a badge in the sidebar showing how many are
unanswered.

### Viewings
A viewing scheduler. The agent publishes when they can be at a property; a
tenant takes a slot. Replaces the six messages it normally takes to find an hour
that suits both people.

### WhatsApp handover
Singapore tenants move to WhatsApp within a message or two, and the enquiry
record is usually lost at that moment. This composes the message from the
enquiry, opens WhatsApp with it already written, and marks the enquiry replied
on the way out — so the conversation moves but the record stays against the
listing.

### Client shortlists
The units a client is going to see, kept as a named selection and exported as a
branded PDF with the agent's CEA details on every page. The export includes a
cover, one page per property with photographs and a map, market evidence for the
price, and a closing page.

## Market data

### Transactions
What comparable units actually let for, by project, size and lease month. Lets
an agent price a unit from evidence rather than from what the last agent
guessed.

### Compare projects
Two or three developments on the same rows — age, size, what they let for, and
what that is per square foot — so the comparison is read rather than worked out.

### Floor plans
The unit mix for a development, held once. A plan can be attached to a listing
or sent to a client on its own.

### Neighbourhood
What actually sits around an address, with the walking time from the door —
hawker centres, parks, sport facilities, polyclinics, hospitals, libraries,
community clubs and schools. Drawn live from the Singapore Land Authority's
OneMap datasets, not from a stored list.

## Business

### Subscription
Plan selection, checkout and billing. Plans differ by listing quota and the
reach tools included. Payment runs through a sandbox in this prototype; PayNow
and card are both represented.

### Performance
How the live listings are doing — views, enquiries and conversion rate per
listing over seven or thirty days, the best performer, and the listings needing
a lift. Shares its data with Enquiries; the same numbers read two ways.

### Reports
Downloadable reports. The agent chooses what they need and narrows it with
filters; the row count updates as they go, so they can see what they are about
to take before taking it.

## Account

### Profile
What tenants see beside the listings, and what Singapore law requires on every
advertisement. Split in two: the registered name, CEA number, agency and agency
licence come from the CEA register and are read-only; the mobile number,
biography and years of experience belong to the agent. The register half is
re-checked against the account on every load, so an agency move is picked up
without retyping.

### Public page
One link an agent can give a tenant: their registration checked against the CEA
register, the districts they work, and everything they currently have live.

### QR code
A code for a name card, a viewing sign or a slide. It opens the public agent
page, or a single listing. Generated in the product rather than by an outside
service, so no listing data leaves the platform to produce it.

### Verification
Where the agent's application stands, as a numbered sequence, so they never have
to ask. Shows what has been done, what is with a verification officer, and what
is still theirs to complete.

### Settings
How V-RENT reaches the agent — notification preferences per channel, email and
mobile confirmation — and how the interface looks, including light and dark.

## Help

### Guides
Five short sequences covering registration through to keeping a portfolio
visible. Each step links to the screen that performs it.

### Sessions
Recorded walkthroughs of each part of the workspace, indexed by chapter so an
agent can go straight to the ninety seconds they need.

### Support
Reaching a person when the product is in the way. The account, registration and
plan are attached to the message, so nobody is asked to repeat them.

---

# Operations console

### Overview
An operations console is opened for one reason — to find out what needs a
person — so that is answered first, in one number, at the top. Everything below
is context for it: how fast the queues are being cleared against the promised
turnaround, when the work arrives during the day, who is clearing it, and how
the platform is holding up.

## Queues

### Verification
Applications from CEA-registered salespersons, each compared against the public
register at the moment the officer opens it. The officer approves or rejects; a
rejection needs a written reason, because the agent has to know what to correct.
A rejection withholds the right to advertise — the account and its drafts
remain. Every decision is recorded against the officer's name.

### Moderation
V-RENT moderates after publication, not before: a listing goes live when the
publish gate passes and is reviewed here afterwards. Listings arrive the moment
an agent publishes, and again whenever a rejected listing is corrected and
resubmitted. A rejected listing comes down immediately and the agent is told why.

## Directory

### Agents
Every registered agent, with their verification standing, plan and listing
inventory. Opening one shows their full record, their listings, and the actions
available — approve or reject a pending application, message them, or suspend
them. Suspension withdraws publication rights without deleting anything.

## Billing

### Subscriptions
The four questions asked in this screen, in the order they are asked: what are
we earning, what is about to stop earning, who has to be chased today, and what
does the ledger say. Annual and monthly recurring revenue, revenue by plan,
twelve months of renewals, collection status, and the transaction table.

## Insight

### Reports & audit
Three tabs, because three different people ask three different questions:

- **Platform** — for whoever decides what to build next: growth, adoption and
  usage across the platform.
- **Audit trail** — for whoever has to defend a decision: every action taken by
  staff, with who did it, to whom, when and why.
- **API activity** — for whoever is on call: every API call made against the
  platform, with response times, status codes, the busiest routes, and
  operator-friendly filters.

---

# Things worth pointing out in a demo

- **CEA registration is verified live.** Signing up checks the number against
  the public register on data.gov.sg. An unregistered number cannot open an
  account, and a number already linked to an account is refused.
- **The compliance line is automatic.** Singapore rules require the salesperson
  name, registration number and agency licence on every advertisement. These
  follow the register, and are frozen onto a listing when it goes live so a
  later agency move does not alter a published advertisement.
- **Publication is gated, not trusted.** Five checks must pass before a listing
  can go live, and the agent can see exactly which one is blocking them.
- **Both sides update without a reload.** An agent signing up appears in the
  verification queue while the officer is looking at it; an officer's approval
  reaches the agent's open tab. Neither has to refresh.
- **Nothing dead-ends.** Tools not built in this prototype say so and explain
  what they would do, rather than showing an empty screen.
- **`/api/health`** reports what any deployment actually has — the date it
  thinks it is, which database it reached and how fast, whether that storage
  survives a restart, and which environment variables are set. It reports
  whether a key is present, never its value.
