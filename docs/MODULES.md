# V-RENT — what each part of the platform is

A reference for presenting the proof of concept. One entry per item in the
navigation, in the order it appears on screen, with what is actually on each
screen. A worked example runs through the whole product at the end.

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
enquiries. Signed out, it makes the case for registering; the catalogue below is
identical either way.

Tools not built in this prototype say so on the card and explain what they would
do when opened, rather than pretending or dead-ending.

### Dashboard
The working day in one screen, ordered by consequence rather than by category.

**On the screen:** *Needs you* — the specific things waiting, most consequential
first: a listing rejected in moderation, enquiries with no reply, a listing with
no photographs. Each row carries the action that resolves it. Then *Ready to
publish?* — the five-point gate, showing which check is blocking. Then *Listing
performance* over the last seven days, *Recently updated*, *Weakest listings* by
health score, and *Best performer*.

Across the top: active listings against the plan quota, drafts, listings
expiring within thirty days, unanswered enquiries, and views over seven days.

### Listings
Everything the agent has listed, filterable by status, deal type and district.

**On the screen:** the listing table with each unit's status, photograph count,
rent and address. Publish a draft, pause what is let, archive what is finished.
When publication is blocked, the screen says so and names the reason rather than
disabling the button silently.

Each listing moves through: draft → pending review → published → paused /
expired / rejected. A rejected listing keeps its content so it can be corrected
and resubmitted.

### Properties
Every building and development the agent has units in. Listings attach to a
property, so one address is never entered twice and a building's details stay
consistent across every unit in it.

### Create listing
A seven-step guided flow. Each step gates the next, and a tip in the side rail
speaks to the step actually open.

1. **Sale or rent** — what this listing is
2. **Property** — find the address
3. **Unit** — unit number and size
4. **Rental terms** — rent and lease
5. **Description** — text and amenities
6. **Photos** — at least one
7. **Review** — check and publish

The review step runs the publish gate: agent approved by an administrator, CEA
registration still valid, subscription active, listing quota available, and
required fields complete with images scanned. All five must pass. Photographs
are uploaded when the listing is saved, and the dialog stays open until they are
safely stored.

### Bulk import
For an agent bringing a portfolio across from another portal.

**On the screen:** a *Column template* to download, and *How import works*.
Upload a spreadsheet and every row is reported back individually — rows that are
fine import, rows with a warning import anyway, and rows that cannot be used are
skipped with the reason named, such as a missing field or a postal code outside
a Singapore sector.

## Reach

Three paid tools, all of them optional, all sold by the day, and all reported
against what they actually produced rather than what they promised. They answer
three different questions: *this one listing needs attention*, *this listing
keeps sinking down the results*, and *I want to be the agent people find in this
district*.

| | What it promotes | Priced by | Typical cost |
| --- | --- | --- | --- |
| Featured placement | One listing | Length of run | S$84 – S$240 |
| Automatic refresh | One listing, repeatedly | No separate charge | — |
| Search placement | The agent | District | S$7 – S$18 a day |

---

### Featured placement

Puts **one listing** at the top of its district and property type for a fixed
run. It is the tool for a unit that is good but is not being seen — a
well-photographed flat in a district with four hundred competing listings.

**How it is priced.** Per day, and the rate falls the longer the commitment:

| Run | Rate | Total |
| --- | --- | --- |
| 7 days | S$12 a day | S$84 |
| 14 days | S$10 a day | S$140 |
| 30 days | S$8 a day | S$240 |

**What it forecasts.** Before committing, the screen shows a range of additional
views, not a single number — a single figure would be a promise the product
cannot keep. The range is derived from that listing's own traffic over the last
thirty days, so the agent can check it against what they already know.

**What it reports.** Once a run is going, it is listed against what it produced:
views and enquiries, beside the spend. A run can be stopped early.

#### Example — featuring a Tiong Bahru flat for a fortnight

1. Open **Reach → Featured placement**.
2. Under *Start a featured run*, choose the listing. Only listings that can
   actually be featured are offered — the listing must be **published** (a
   draft, a paused or an expired listing is not), and a listing already in a
   run cannot be entered into a second one.
3. Choose the length. Picking **14 days** shows *S$10/day · S$140 total*, and
   the forecast updates — if the listing has been getting about 8 views a day,
   it projects roughly **240 to 380 additional views** over the run.
4. Confirm. The run appears under *Runs* with its end date.
5. Come back during the run. The row now reads, for example, *14 days at
   S$10/day · 310 views · 6 enquiries* — the spend and the result side by side.
6. To stop early, open the run and confirm. The remaining days are not charged.

**What to point out in a demo:** the forecast is a range and the product says
why. And the result is reported against the spend, which is the number an agent
actually wants and the number portals are usually vaguest about.

---

### Automatic refresh

Keeps **one listing** near the top of *new* results without the agent opening it
every morning. Singapore portals order by recency, so a listing that is not
touched sinks whether or not it is still available — and the usual workaround is
an agent republishing by hand at seven every morning.

**How it is set.** Per listing, with a cadence and an hour:

| Cadence | What it means |
| --- | --- |
| Off | Left alone |
| Daily | Every day |
| Every other day | Enough to stay visible without looking automated |
| Once a week | For a listing that is not urgent |

The hour is chosen in Singapore time, so a refresh can be set to land just
before tenants start looking.

**What it records.** Every run is counted and the last one is timestamped, so
the agent can see it happened rather than trusting that it did.

**What it does not do.** A refresh changes the listing's position in the
results, never its content and never its price. It is stated on the screen,
because an agent handing this to a colleague needs to know it cannot quietly
alter an advertisement.

#### Example — refreshing a portfolio without doing it by hand

1. Open **Reach → Automatic refresh**.
2. *Your live listings* lists everything published. Drafts do not appear —
   there is nothing to refresh.
3. For the Marina Bay unit, set the cadence to **Every other day** and the hour
   to **08:00**.
4. For a listing that has been on the market a while, set **Daily**.
5. To set the whole portfolio at once, use *Refresh everything on alternate
   days*.
6. Return the next week. Each listing shows its run count and when it last ran —
   for example *14 runs · last ran 12 Sept, 08:00*.

**What to point out in a demo:** "Every other day" is the default advice rather
than daily, and the screen says why — a listing that reappears every single
morning reads as automated to anyone watching the results.

---

### Search placement

Promotes **the agent**, not a listing. It puts them above other agents in the
results for the districts they work, which is what matters for an agent building
a name in one area rather than pushing a single unit.

**How it is priced.** By district, and by how contested that district is:

| Tier | Districts | Rate |
| --- | --- | --- |
| Core Central | D01, D02, D04, D06, D09, D10, D11 | S$18 a day |
| City fringe | D03, D05, D07, D08, D12, D13, D14, D15 | S$12 a day |
| Outside central | D16 – D28 | S$7 a day |

An agent can hold several districts at once, and each is stopped on its own.

#### Example — holding two districts for a month

1. Open **Reach → Search placement**.
2. *Districts* lists all 28 with their tier and daily rate. Search to narrow it.
3. Take **D15 (East Coast)** at S$12 a day and **D19 (Hougang)** at S$7 a day.
4. The running total is S$19 a day — about **S$570 for a thirty-day month**.
5. Each district shows *Held since* its start date, and can be released on its
   own. Dropping D15 leaves D19 running.

**What to point out in a demo:** the price is set by the district, not by an
auction, so an agent can budget it. The tiers are the real Singapore districts,
so a Singaporean agent recognises the pricing as sensible without it being
explained — D09, D10 and D11 costing most is exactly what they would expect.

---

### How the three fit together

A rough guide for the demo, if someone asks which they would use:

- **One listing is not getting seen** → Featured placement, for a fixed run.
- **Listings sink down the results over time** → Automatic refresh, set once and
  left running.
- **The agent wants to be found in a district** → Search placement, by the day.

Featured placement and automatic refresh both promote a listing and can run on
the same one at the same time. Search placement is the only one of the three
that promotes the person.

## Clients

### Enquiries
Every enquiry waiting for a reply, with the channel it arrived through (V-RENT,
WhatsApp or phone), which listing it is about, and how long it has been waiting.
Filterable by status. The sidebar carries a badge showing how many are
unanswered.

This is the same view as Performance, opened on its own tab — the same numbers
read two ways.

### Viewings
A viewing scheduler, replacing the six messages it usually takes to find an hour
that suits both people.

**On the screen:** *Your schedule* of published slots, and *Publish a slot* to
add availability at a property. A tenant takes a slot; the agent can also book
one on a tenant's behalf, and remove a slot that is no longer free.

### WhatsApp handover
Singapore tenants move to WhatsApp within a message or two, and the enquiry
record is usually lost at that moment.

**On the screen:** *Open enquiries* — those with a mobile number, since an email
address cannot be reached this way — and *Compose*, which writes the message
from the enquiry. Opening WhatsApp carries the message already written, and the
enquiry is marked replied on the way out, so the conversation moves but the
record stays against the listing.

### Client shortlists
The units a client is going to see, kept as a named selection and exported as a
document.

**On the screen:** *Choose the units*, *Saved shortlists*, and *What goes in the
document*. The export is covered in the worked example below.

## Market data

### Transactions
What comparable units actually let for, so a unit is priced from evidence rather
than from what the last agent guessed.

**On the screen:** *Narrow it down* by project, size and lease month;
*Contracts* lists the matches; *Where this comes from* names the source. These
are lease contracts lodged with the Urban Redevelopment Authority, which every
private residential tenancy in Singapore must be — not asking prices scraped
from a portal.

### Compare projects
Two or three developments on the same rows — age, size, what they let for, and
what that is per square foot — so the comparison is read rather than worked out.

**On the screen:** *Choose two projects*, then *Read across*.

### Floor plans
The unit mix for a development, held once. A plan can be attached to a listing
or sent to a client on its own. *About these drawings* states what they are and
are not.

### Neighbourhood
What actually sits around an address, with the walk from the door.

**On the screen:** choose a listing or search an address, and the platform reads
the Singapore Land Authority's own theme datasets live — hawker centres, parks,
sport facilities, polyclinics, hospitals, libraries, community clubs and private
education. Distances are measured from the point OneMap matched the address to.
A category the service does not answer for is named rather than quietly omitted.

## Business

### Subscription
Plan selection and checkout. Plans differ by listing quota and the reach tools
included — **Starter** and **Professional** in this prototype.

**On the screen:** *How would you like to pay?* — PayNow or credit and debit
card. Payment runs in sandbox mode here; no money moves.

### Performance
How the live listings are doing.

**On the screen:** views, enquiries and conversion rate per listing over seven
or thirty days, *Best performer*, and the listings *needing a lift*. Its second
tab is Enquiries.

### Reports
Downloadable reports, narrowed before they are taken.

**On the screen:** *Filters* by channel, deal type and listing health score. The
row count updates as the filters change, so the agent can see what they are
about to take before taking it.

## Account

### Profile
What tenants see beside the listings, and what Singapore law requires on every
advertisement. The screen is deliberately in two halves.

**From the CEA register** — registered name, registration number, agency and
agency licence. Read-only, and reconciled against the account every time the
page loads, so moving agency is picked up without retyping. *Appears on every
advertisement* shows the exact compliance line that will be printed.

**Yours to write** — mobile number, professional biography, years of experience,
under *How tenants reach you* and *Professional information*. Saved as you type.
The biography is deliberately left empty on a new account: a biography invented
for a real person is the one thing on the screen they know to be false.

### Public page
One link an agent can give a tenant.

**On the screen:** *Your link*, *What the page says*, and *What to show* —
control over the headline, the districts worked, whether the enquiry form
appears, and whether the track record is shown.

### QR code
A code for a name card, a viewing sign or a slide. *What it opens* — the public
agent page, or a single listing. *Printing it* covers size and placement.
Generated inside the product, so no listing data leaves the platform to make it.

### Verification
Where the application stands, as a numbered sequence, so the agent never has to
ask.

**On the screen:** *Progress* through the steps, *Submitted details*, and *What
happens next*. It shows what is done, what is with a verification officer, and
what is still the agent's to complete.

### Settings
**On the screen:** *Notifications* — per channel, email and SMS, for each kind
of event. *Appearance* — light and dark. *Account status* — email and mobile
confirmation, and the email address, which is changed here rather than on the
profile because it is how the agent signs in.

## Help

### Guides
Five short sequences covering registration through to keeping a portfolio
visible. Each step links to the screen that performs it. *Still stuck?* routes
to Support.

### Sessions
Recorded walkthroughs of each part of the workspace, indexed by chapter so an
agent can go straight to the ninety seconds they need.

### Support
**On the screen:** *The questions we are asked most*, *Open a ticket*, and *Your
tickets*. The account, registration and plan travel with the message, so nobody
is asked to repeat them.

---

# Operations console

### Overview
An operations console is opened for one reason — to find out what needs a person
— so that is answered first, in one number, at the top.

**On the screen:** *When the work arrives* through the day, *Officer load* —
who is clearing it, *Decisions, fourteen days*, *Latest decisions*, *Listings on
the platform*, *Subscriptions*, and *What the platform served*.

## Queues

### Verification
Applications from CEA-registered salespersons, each compared against the public
register at the moment the officer opens it.

**On the screen:** every application shows what the register says — *Register
agrees on every field*, *One or more fields differ*, *Not on the active
register*, or *Register did not answer* — so the officer decides on evidence.
Approve or reject; a rejection needs a written reason, because the agent has to
know what to correct. A rejection withholds the right to advertise: the account
and its drafts remain. Every decision is recorded against the officer's name.

### Moderation
V-RENT moderates after publication, not before: a listing goes live when the
publish gate passes and is reviewed here afterwards.

**On the screen:** listings arrive the moment an agent publishes, and again
whenever a rejected listing is corrected and resubmitted; *Previously rejected*
flags a repeat. A rejected listing comes down immediately and the agent is told
why.

## Directory

### Agents
Every registered agent, with verification standing, plan and listing inventory.

**On the screen:** filter by *All*, *Registered here*, *CEA expired*; sort by
*Recently joined*, *Most listings* or name. Opening an agent shows their full
record and listings, and the actions available — approve or reject a pending
application, message them, or suspend them. Suspension withdraws publication
rights without deleting anything.

## Billing

### Subscriptions
The four questions asked here, in the order they are asked: what are we earning,
what is about to stop earning, who has to be chased today, and what does the
ledger say.

**On the screen:** *Where the revenue sits*, *Standing of the book*, *How they
pay*, *A renewal payment failed*, *Chase these today*, and *Every subscription*.

## Insight

### Reports & audit
Three tabs, because three different people ask three different questions.

- **Platform** — for whoever decides what to build next: *End-to-end
  conversion*, *Listings by standing*, growth and adoption.
- **Audit trail** — for whoever has to defend a decision: every action taken by
  staff, with who did it, to whom, when and why.
- **API activity** — for whoever is on call: *Calls*, *How calls ended*,
  *Busiest endpoints*, response times and status codes, with
  operator-friendly filters.

---

# A worked example, start to finish

One pass through the product, from a new agent to a document in a client's
hands. This is the demo path — every step below works.

### 1. Create the account

1. Open **/phase1/signup**.
2. Enter the CEA registration number and submit it. The platform queries the
   public register on data.gov.sg and shows the registered name, agency and
   licence number it found.
   *If the agent does not have their number to hand, they can search the
   register by name instead and pick themselves from the results.*
3. Enter an email address, a mobile number and a password. The rules are checked
   as you type; the eye at the end of the field reveals what was entered.
4. Submit. The registration is verified again on the server — the browser is not
   trusted — and the account opens.

**What to point out:** an unregistered number cannot open an account, and a
number already linked to another account is refused.

### 2. Get verified

5. The new account lands on the dashboard with *Under review*.
6. In another browser, sign in as the operations account and open
   **Queues → Verification**. The new agent is already there — the console polls
   for work, so nothing was refreshed.
7. Open the application. The register comparison is shown field by field.
8. **Approve**.
9. Return to the agent's tab without touching it. Within about fifteen seconds
   it says *Verified*.

**What to point out:** neither side reloaded. Approve and reject are also
available on the agent's own record under **Directory → Agents**, so an officer
who is reading an application can act on it there.

### 3. Choose a plan

10. On the agent side, open **Business → Subscription**.
11. Choose Starter, and pay by PayNow or card. Sandbox mode — no money moves.

**What to point out:** the plan sets the listing quota, and the quota is one of
the five publish checks.

### 4. Create a listing

12. Open **Workspace → Create listing**.
13. **Sale or rent** — choose rent.
14. **Property** — type an address. Matching runs against OneMap, so choosing a
    result fills the postal code, district and map position from the Singapore
    Land Authority rather than from typing.
15. **Unit** — unit number, bedrooms, bathrooms, floor area.
16. **Rental terms** — monthly rent, available from, minimum lease, deposit,
    furnishing.
17. **Description** — the text a tenant reads, and the amenities.
18. **Photos** — drag in photographs. Each is resized, a thumbnail is made, and
    both are **stored in MongoDB**, so a photograph uploaded on one server is
    visible from the next.
19. **Review** — the five checks are listed with a tick against each.
20. **Publish listing**. The dialog stays open while the photographs upload and
    says so, then the listing appears under **Listings**.

**What to point out:** the compliance line — name, CEA number, agency licence —
is shown on the review step and frozen onto the listing when it goes live, so a
later agency move does not alter a published advertisement.

### 5. Moderate it

21. Back in the operations console, **Queues → Moderation** now has the listing.
22. Approve it, or reject it with a reason and watch it return to the agent's
    *Needs you* list with the reason attached.

### 6. Send a client a document

23. On the agent side, open **Clients → Client shortlists**.
24. Tick the units the client is going to see, name the shortlist and add a
    covering note.
25. **Export as PDF**.

The document is built as follows:

- **Cover** — the shortlist, the client's name, the agent's details, and a
  contents table.
- **How to read this report** — where each figure comes from and what the
  document is not, then basic information for every property.
- **Two pages per property** — the unit: photographs (the ones uploaded at step
  18), the facts a tenant filters on, the description and amenities. Then where
  it is: the OneMap site map, what is within a kilometre with the walk from the
  door, how the asking rent sits against comparable units, and the lease
  contracts that comparison rests on.
- **Annex A** — every lease contract behind the figures.
- **Annex B** — how each figure is derived, and the sources.
- **Closing page** — what happens next, and the compliance block.

Every sheet carries who prepared it, when, for whom, and the CEA line.

26. Save as PDF and open it.

**What to point out:** the photographs in the document came out of MongoDB, and
the amenity distances were measured live from SLA datasets while the document
was being built.

### 7. Check the deployment

27. Open **/api/health**.

It reports the date the server thinks it is, which database it reached and how
fast, whether that storage survives a restart, and which environment variables
are set — presence only, never values. A misconfigured deployment names its own
problem in plain English instead of failing silently.

---

# Things worth pointing out in a demo

- **CEA registration is verified live** against the public register on
  data.gov.sg. An unregistered number cannot open an account; a number already
  linked to an account is refused.
- **The compliance line is automatic.** Singapore rules require the salesperson
  name, registration number and agency licence on every advertisement. These
  follow the register, and freeze onto a listing when it goes live.
- **Publication is gated, not trusted.** Five checks, and the agent can see
  which one is blocking them.
- **Both sides update without a reload.** A signup reaches the officer's open
  queue; an approval reaches the agent's open tab.
- **Photographs live in the database**, not on a server's disk, so they survive
  a deployment recycling.
- **Market figures are evidence, not opinion** — lodged lease contracts, with
  the individual contracts printed in the annex so a client can check them.
- **Nothing dead-ends.** Tools not built in this prototype say so and explain
  what they would do.
- **`/api/health`** says what any deployment actually has.

## What is real and what is demonstration

Worth being straight about when a developer asks:

| Real | Demonstration data |
| --- | --- |
| CEA register lookup (data.gov.sg) | Lease transaction history |
| OneMap address search, maps, amenity datasets | Views, enquiries and conversion figures |
| Accounts, sessions, workspaces, photographs (MongoDB) | Featured placement and search placement runs |
| Verification and moderation decisions, audit trail | Payments — sandbox mode, no money moves |
| API activity log | Email delivery — written to an outbox |

The screens that say *What is real here* carry this same distinction in the
product itself, on the tool it applies to.
