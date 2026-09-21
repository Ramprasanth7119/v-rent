# V-RENT Property Report

## Purpose

A printable A4 report an agent sends a client about one property or a
shortlist. The client should be able to answer, within a few minutes:
what is this property, how is it priced, how has it performed, how does it
compare, what does the evidence suggest about its future, and what to pay
attention to. Anything that could not be checked is marked, never shown as zero.

Open it from **Client shortlists** or **Listings**, then choose **Save as PDF**.

## Report Editions

- **Client Report** (default). The shortlist a client reads: one template that
  scales with the number of properties, with an **AI Analysis** for each
  property. Described below.
- **Detailed Report**. The agent's full edition: every page for every property,
  plus contents, neighbourhood detail (schools, healthcare, daily needs, places
  to visit), more comparable contracts, the contracts annex and the calculation
  method. About 15 pages for a rental with full data. Described under
  "Detailed Report, Page by Page".

Switch between them with the toggle at the top of the report.

## Demo Data

The one **Demo Data** switch in the application header chooses where every
figure comes from. The report has no switch of its own; the toolbar shows a
Demo data chip while it is on, and `demo=on` in the address opens it that way.

- **ON** uses the demo account and illustrative data generated around each
  property: a year of contracts, history, comparables, competing listings,
  schools, transport and daily needs. Names of developments, schools and places
  are fictional. Demo listings show the demo account's own sample photographs.
- **OFF** uses the signed-in agent's own records: the listing as saved (MongoDB
  on a deployment), its uploaded photographs, the held contract dataset and the
  live neighbourhood and competing-listing lookups. Until the URA contract feed
  is connected no contracts are held, so the report says **Verified contract
  records not connected** instead of showing a comparison. A lookup that fails
  reads "Data unavailable" or "Unable to verify"; nothing is filled in, and demo
  figures are never used in its place.

While demo data is shown, every sheet carries a **Demo data** mark in the header
and "Illustrative data for demonstration purposes" in the footer, and the
sources note says so. The saved PDF title ends in "Demo data".

Demo data covers every kind of home: an HDB flat is compared with generated
HDB leases and a landed home with landed leases, so no demo report reads
"Insufficient data". With the switch off, HDB and landed rentals are still not
compared, because the held contract dataset covers only private non-landed
homes. Each demo development has two or three leases of the property's layout
a month, enough for a *Moderate* evidence level.

Demo data is generated in the browser (`lib/phase1/report-data/demo.ts`). It is
never requested from or returned by an API, never saved and never written to a
listing, and it passes the same consistency checks as the original data.

## Client Report

`app/phase1/listings/export/client-edition.tsx`, with its diagrams in
`client-visuals.tsx` and their figures in `lib/phase1/report-digest.ts`. The
number of properties decides the structure; the template is the same. Every
report opens with a **cover**: who it is prepared for, the title, the
photographs, the key figures (or the shortlisted homes), **Inside this report**
with the page each part starts on, and the agent's card.

| Selection | Pages (typical, demo data) | Structure |
|-----------|----------------------------|-----------|
| 1 property | 7 | Cover · key figures and AI read-out · how to read · the property · location · market evidence · recent leases and neighbours · what else is advertised · AI Analysis · sources |
| 2–3 properties | 8 for two, 10 for three | Cover · shortlist overview with insights · side by side with the AI read-out for each · two pages per property · how to read · sources |
| 4+ properties | 7 for five, 11 for ten | Cover · summary table · landscape comparison and AI read-out matrix · compact snapshots, two to a page · how to read · sources |

Sections follow one another on the page; a new page starts only for the key
figures, the property, the AI Analysis and each property of a short list.

### One property
1. **Cover**, as above, with the asking price, rate per sq ft, layout, floor
   area and availability.
2. **Key figures**: the **comparable rent band** (the middle half of comparable
   lease rates applied to this floor area, labelled "a comparison, not a
   valuation", with the asking rent marked on it); the **price ladder** (the
   lowest-to-highest range, with its median, of similar homes leased in this
   development, similar-size homes leased in nearby developments, and similar
   homes advertised now, against a dashed line at the asking price); the **AI
   read-out** (see below); and **How to read this report** in four steps.
3. **The property**: home and building details (type, development, tenure,
   completion, floor level, floor area, straight-line distance to Raffles
   Place), the listing (status, lease, deposit, furnishing, layout, agent),
   **Why this property** (positioning line, up to three measured facts, the
   agent's description and note) and every further photograph.
4. **Location**: the OneMap map of the address beside the **neighbourhood
   diagram** (rings at 500 m, 1 km and 2 km; every measured station, school,
   healthcare place and daily need drawn at its true bearing and distance), then
   the nearest places of each kind with distance, walking minutes and a bar on
   one scale. Bus stops are not shown: no bus-stop dataset is connected.
5. **Market evidence**, only with a comparison: asking against the comparable
   median, the position (below, within or above), the benchmark bar; the
   **twelve months** of the development's (or district's) median rent per sq ft
   as a line with a month-by-month grid of medians and lease counts; the **latest
   leases** (ten newest, same layout when there are enough, highest and lowest
   rate marked); **neighbouring developments** (each development's same-layout
   leases: count, median rent, median psf, its range of rates on a shared scale
   and the latest month, this development first); and the six most similar
   homes.
6. **What else is advertised**, when similar listings were found: the range and
   median by distance (same, nearby, other district) against this property, the
   listing count and median, and up to eight listings with how long each has
   been listed. With no comparison, a notice says why and this is the only
   price evidence.
7. **AI Analysis**, then **Sources and notes**.

### Two or three properties
1. **Cover** with a mosaic of the photographs and the homes with their prices.
2. **Shortlist overview**: a card per home (photograph, name, price, size,
   layout and the AI read-out in one sentence), the at-a-glance table, the
   agent's note and the **Shortlist insights**.
3. **Side by side**: asking, per sq ft, comparable band, floor area, layout,
   type, location, tenure and completion, nearest MRT, market position,
   12-month movement, homes advertised now and availability; the **AI read-out
   side by side** (the four signals for every home); **Where each asking rate
   sits**.
4. **Two pages per property**: the photograph and facts, the AI read-out and a
   short AI Analysis (the four questions); then location and price — map,
   neighbourhood diagram, nearby places and the price ladder.

### Four or more properties
1. **Cover**, listing the first six homes.
2. **Summary**: a table with a small photograph per home. Long lists continue
   with the header repeated. Up to six homes, the shortlist insights follow.
3. **Comparison** on landscape sheets: every home as a row, split every 10–13
   rows with the header repeated; the **AI read-out matrix**, twelve rows a
   sheet; **Where each asking rate sits**; for more than six homes, the
   insights.
4. **Snapshots**, two to a page: photograph, map, facts, the four AI signals,
   two key factors and the outlook label.

### AI read-out
Four signals, each drawn as a small diagram with its value and a caption, from
`signalsFor` in `lib/phase1/report-digest.ts`:

| Signal | Diagram | Reads |
|--------|---------|-------|
| Price check | Half dial: below, within, above the comparable range | Position and difference from the comparable median; "Listings only" or "Not compared" without contracts |
| Market direction | Arrow | Firm, steady or easing, with the 12-month change of comparable rents; "No clear trend" without one |
| Getting around | Track from the home to the station | Walking minutes and the station; "No station" with the reason |
| Evidence strength | Three bars | Moderate, limited or insufficient, with the sample |

**In short** puts the same evidence in one sentence ("A 2-bedroom condominium
with an asking rent inside the usual range for similar homes, in a steady rental
market, 4 minutes' walk from Downtown MRT Station."). Each part appears only
when its evidence does. Green marks a favourable reading, amber one to check,
grey a missing one.

### AI Analysis
Produced by `lib/phase1/property-insight.ts` from the figures already in the
document, using fixed rules, so the same data always gives the same words and
the analysis can be tested. It uses nothing outside the document. The report
describes it as indicative analysis, not a valuation, advice or a forecast.

1. **Past 5 years**. Contract records cover 12 months, so the section states
   the window it used ("Five-year records are not held; the verified window is
   the 12 months from … to …") and describes the development's (or district's)
   median rent per sq ft across the first and second half of it. An earlier
   V-RENT listing of the unit is mentioned as an asking figure. Without records
   it says **Insufficient verified history** and why.
2. **Current position**. Within, above or below the observed comparable range,
   the difference from the comparable median per sq ft, the range, and the
   comparison with listings currently advertised.
3. **Forward outlook**. A direction (firm, broadly stable or softer) read from
   the 12-month movement of comparable rents and the contract activity, with
   the factors that could affect future rents (station distance, competing
   listings, development age or tenure). Labelled **Indicative AI Outlook — not
   a valuation or guaranteed forecast.** It never states a future price, rent,
   yield or return. Without a readable trend, or for a sale, it reads
   **Insufficient verified historical/market data for a reliable forward
   estimate.**
4. **Key factors**. Three to five property-specific points, one per topic
   (pricing position, recent movement, connectivity, competition, size,
   schools, tenure, data limits), tagged Plus, Check or Note.

On the page each question is a card with an icon, a one-line answer and a
sentence or two; the single-property page opens with the In short sentence.

Each analysis carries an **Evidence** level: *Moderate* (a local sample of 20
or more contracts), *Limited* (a small or non-local sample) or *Insufficient
data* (no comparison), and its limitations.

**Shortlist insights** state factual differences: the price and per-sq-ft
spread, which properties sit within, above or below their ranges, which have no
comparable evidence and why, where comparable rents moved most, which have a
price history, station distance and size. They never pick a winner or rank the
properties.

### Who to contact, and what the home has

Every listing in a shortlist belongs to the agent whose workspace it was
exported from, so there is one agent, not one per property. The cover carries
their full card; each property in a shortlist of two or more then carries one
line under its name — **Presented by**, the agent, the agency, the mobile
number and the CEA registration — so a client reading the fifth property does
not have to turn back to the first page to find out who to ring about it. The
single-property report puts the same number on the **Listed by** row of the
property facts instead, having the full card two pages earlier.

**Amenities** are the agent's own list from the listing (`amenities`, then
`fittings`), printed as one row beside the other property facts: up to twelve
on a single-property report, eight in a shortlist, then "and N more". The row
is marked as the agent's, because everything else on the page is measured or
counted. A listing whose agent listed nothing has no row at all — a home with
no amenities and a listing not filled in are not the same thing, and an empty
heading says the wrong one.

Maintenance fee, parking as a separate fact, orientation, developer and land
area are not held by V-RENT and are not shown. Covered parking appears only
when the agent listed it as an amenity.

### Page breaks
Every sheet is a fixed A4 page, and content that does not fit would be cut
off. The client edition is therefore laid out as blocks (a heading with its
text, a table with its header, a photograph with its facts). Each block is
measured at the printed width and packed onto pages
(`lib/phase1/paginate.ts`): a block is never split, a heading stays with what
follows it, long tables are split into runs that repeat their header, and a
landscape sheet is used only for the wide comparison tables. From tablet width the
sheet on screen is the printed page, and the toolbar warns **Page N too long**
if anything still overflows.

### Page composition
Packing a page with as much as fits and stopping there leaves the foot of most
sheets empty — a web page cut into lengths rather than a document. Two rules
take that space back:

- **The gaps take the difference.** Each sheet reports what was left of it, and
  that space is shared out between the blocks on it, so the page ends at the
  foot of the paper. This is vertical justification, and it is capped at one and
  a half times the gap again: past that, the space between two sections stops
  reading as a separation and starts reading as a missing section, so a sheet
  with little on it ends short instead of being padded out. A sheet holding one
  block has no gap to put it in and is left alone.
- **The cover fills its sheet.** The photograph is the only thing on it that can
  be any size without saying something different, so it takes the difference
  and the cover always reaches the foot of the page.

What is left is structural and deliberate: a section that ends part-way down
its last sheet, a landscape comparison too tall to share a sheet and too short
to fill one, and the closing sheet of sources. Measured over the demo
shortlists, no sheet but those ends more than about an eighth short.

### Performance
Each property's figures and analysis are worked out once per render. The client
edition asks only for the neighbourhood data it prints (stations, schools,
healthcare, daily needs), and two units at one address share each lookup, so a ten-unit
shortlist does not repeat requests.

## Detailed Report, Page by Page

| # | Page | Client question | Shown when |
|---|------|-----------------|------------|
| 1 | Cover | What is this? | Always |
| 2 | Property at a glance | What am I looking at? | Always |
| – | Photographs | What does it look like? | 4 or more photographs |
| 3 | Property history | What has happened here? | Rental with development or district contracts |
| 4 | Price position | Is the asking rent reasonable? | Rental with comparable contracts |
| 5 | Comparable properties | How does it compare with similar homes? | Same as page 4 |
| 6 | Market trend | What is the rental market doing? | Same as page 4 |
| 7 | Development insights | What stands out about the development? | Development is in the V-RENT reference and has contract activity or at least two notes |
| 8 | Location and connectivity | What is within reach? | Always (marked if not verified) |
| 9 | Competing listings | What else is on the market? | At least one comparable live listing |
| 10 | Client decision summary | What should I weigh up? | Always |
| – | Sources and important notice | Where does this come from? | Always |

### 1. Cover
- Best photograph (the agent's first), or a clean text cover without one
- Name, address, district, type
- One factual positioning line, e.g. *"3-bedroom condominium of 1,130 sqft in
  Bishan, about 240 m from Bishan MRT."* The station is named only when it is
  measured and within 1 km.
- Asking rent or price, price per sq ft, layout, floor area, availability
- Market position, nearest MRT, primary schools within 1 km, agent and CEA details

### 2. Property at a Glance
- Asking price, per sq ft, bedrooms, bathrooms, floor area
- The property: type, development, district, tenure, completion, floor level
  (read from the unit number), furnishing
- The listing: availability, lease and deposit (rentals), listing status,
  agent, CEA registration with verification status
- A second photograph, when there is one (never the cover photograph again)
- **Key takeaways**: 3 to 4 facts, e.g. range position, size against
  comparables, MRT distance, sample size

### 3. Property History
- States plainly: **unit-level transaction data unavailable**, because lodged
  contracts do not identify units. Earlier V-RENT listings of the same unit are
  shown when they exist, marked as asking figures.
- **Chart:** monthly median rent per sq ft for the development (all unit sizes),
  with the number of contracts each month and this property's asking rate as a
  dashed line. Falls back to the district when the development has too few contracts.
- Short notes: change over the year, same-bedroom count, asking rate against
  the development median
- Timeline of the latest 8 contracts

### 4. Price Position
- Asking rent, comparable median rent, asking PSF, median PSF, difference
- Headline: **Below / Within / Above observed comparable range**, with the
  difference from the median (±4% counts as in line)
- **Chart:** benchmark bar with lowest, lower quartile, median, upper quartile,
  highest and this property. Outside the range is tinted amber.
- "What this means": difference from median, share of contracts at a lower rate,
  position in the range, rent range
- Comparison basis and distribution per sq ft
- Never called "fair value": this is a comparison, not a valuation

### 5. Comparable Properties
- Banner: *Comparable basis: Same district · 3 bed · 900–1,350 sqft · 17 contracts*
- If needed: *Local sample insufficient · Nearby districts comparable sample used*
- **Chart:** floor area against monthly rent, one dot per contract, this property marked
- Table: month, development, match (same development / street / district,
  nearby, other), bedrooms, size, rent, PSF. The first 20 are shown; the rest are in the annex.

### 6. Market Trend
- Twelve-month median, change over period, latest month, indicative figure
- **Chart:** monthly median rent (**Actual**), asking rent (**Current**) and a
  3-month straight-line trend in a shaded zone (**Indicative**)
- **Chart:** comparable contracts lodged each month (transaction activity)
- One sentence under each chart, e.g. *"Median rents for comparable homes rose
  2.0% over the period."*

### 7. Development Insights
- Completion year, tenure, total units, property type
- **What stands out**: 3 data-backed notes, e.g. unit size against the
  development's median for that layout, which layouts lease most, age.
  A tenure or completion year that disagrees with the listing is flagged.
- Contracts by bedroom count (rentals)
- Developer is not recorded and is not shown

### 8. Location and Connectivity
- Map, and the nearest MRT/LRT, primary and secondary school, polyclinic,
  hospital, hawker centre and park, with distance bars and walking estimates
- Four groups, each with a count and its nearest three places:
  **Transport** (stations within 1 km), **Education** (schools within 1 km),
  **Healthcare** (within 5 km), **Daily needs** (hawker centres, parks, sport,
  libraries, community clubs within 1 km)
- Supermarkets and malls are not included: no public dataset is connected

### 9. Competing Listings
- Listings **live on V-RENT** with the same listing type, kind of home,
  bedroom count and size band, nearby districts first, then Singapore-wide
- This property's PSF, number found, median asking PSF, difference
- Statement only with 5 or more listings: *"Priced 4.8% above the median of
  12 comparable active listings, per sq ft."* Otherwise it says how many were
  found and that 5 are needed.
- Table: development, match, bedrooms, size, asking, PSF, days live
- Other portals are not included. Advertisers are never named.

### 10. Client Decision Summary
- **Why it stands out** (3) and **What to consider** (up to 3), all factual
- **Market position**: one statement
- **Data confidence** table: comparable contracts, market dataset, trend,
  unit history, active listings, transport, schools, healthcare, daily needs,
  each marked with a status (below)
- **Bottom line**: one paragraph. No advice, forecasts or guarantees.
- Agent contact and CEA registration

### Photographs
- Only the listing's own photographs. Cover uses the first; at a glance uses the
  second; the photograph page shows the rest (up to 4) when 2 or more remain.
- Fixed frames, cropped, never stretched; small frames use the 480 px version.
- A photograph that fails to load is left out and the layout closes up.

### Sources and Important Notice
- Agent-provided particulars, descriptions, photographs
- Public datasets with retrieval dates: OneMap (SLA), LTA station exits, MOE
  schools, MOH healthcare, SFA/NParks/SportSG/NLB/PA daily needs, STB/NHB places
- Market data: **illustrative lease-contract dataset in URA format, not live URA data**
- Platform data: V-RENT development reference, listings live on V-RENT

## Graphs

### Client report
Charts appear only when the data behind them exists; otherwise the report says
what is missing instead of drawing an empty chart.

| Graph | Where | Answers |
|-------|-------|---------|
| Comparable rent band | One property, key figures | What do homes like this lease for, and where is the asking rent? |
| Price ladder (development leases, nearby leases, listings) | Key figures; each property of a short list | How does the asking price line up with real figures? |
| AI signals (dial, arrow, track, bars) | Key figures; every property | The analysis at a glance |
| Neighbourhood diagram | Location; each property of a short list | What is around, in which direction, how far? |
| Nearby distance bars | Location | How far is the nearest of each kind? |
| Benchmark bar (range, quartiles, median, asking) | Market evidence | Where does the asking rate sit? |
| 12-month history with the month grid | Market evidence | Has this building's rent moved, and on how many leases? |
| Neighbouring developments range strips | Market evidence | Is this building priced like its neighbours? |
| What else is advertised (range and median by distance) | Market competition | What is the competition asking? |
| Where each asking rate sits | Two or more properties, comparison | How do the properties sit against their own markets? |

Removed from the client report, and kept in the detailed report: the floor
area scatter (repeats the contracts table), the trend chart with a projected
three months (a numerical projection), the monthly contract volume bars, the
asking-rate bars across properties (compares different markets directly).

### Detailed report

| Graph | Page | Answers |
|-------|------|---------|
| Development rent per sq ft over time | Property history | Has this building's rent moved? |
| Benchmark bar (range, quartiles, median, asking) | Price position | Where does the asking rate sit? |
| Floor area against monthly rent | Comparable properties | Is the rent reasonable for its size? |
| Median rent trend (actual, current, indicative) | Market trend | Which way is the market moving? |
| Contracts lodged each month | Market trend | How active is the market? |

A sale report shows none of these, because no sale transaction data is held.

## Comparable Method

1. Same bedroom count, floor area within ±20% (rounded to 50 sqft), same kind
   of home (condominium, apartment, EC), last 12 complete months.
2. Narrowest area with at least 10 contracts: same development, street,
   district, nearby districts, then Singapore-wide.
3. Every figure on pages 4 to 6 comes from that one set. The basis is printed.
4. HDB and landed homes are never compared with condominium contracts.

## Data Confidence

| Status | Meaning |
|--------|---------|
| **Verified** | The dataset answered. "None within" is only shown in this case. |
| **Indicative** | Calculated from a sample: medians, ranges, trends. Not a valuation. |
| **Illustrative** | Demonstration market data. The URA feed is not connected yet. |
| **Insufficient sample** | Data exists but is too thin (under 10 contracts, under 5 listings). |
| **Data unavailable** | A dataset failed or is not held. Never shown as zero. |
| **Unable to verify** | No map position, or a list came back incomplete. |

## Important Validation Rules

- Sale listings cannot display rental pricing, and rentals cannot display sale pricing.
- Invalid or inconsistent listings cannot generate a PDF. The agent sees what to
  fix and an **Edit listing** link.
- The district must match the postal code. Floor area, rooms, furnishing and
  availability must be present and plausible.
- Every market and history figure is recalculated from its own contracts
  before printing; a mismatch blocks the report.
- Competing listings that fail their checks are left out, not printed.
- API or data failures display "Data unavailable" or "Unable to verify".
- Insight sentences only restate printed figures, never recommend, and are
  omitted when their input is missing.
- No web addresses, internal IDs or debug text appear in the PDF.

## Unit Privacy

The full unit number never appears in a report, in either edition. The listing
keeps it, and the report prints only what it implies: **Floor level** ("Level
34"), read through `floorOf`. Nothing else derives from it — not the cover, the
summary, the facts, the agent block, the map, the comparison, the running
header or footer, or any sentence the analysis writes, because every sentence
is built from figures the document already shows.

This is checked rather than assumed: every generated PDF is scanned for
`#NN-NN`, for `localhost`, `http://` and `/api/` addresses, for listing and
account ids, for `undefined`, `NaN` and debug text, for raw database field
names, and for sale wording inside a rental report. The scan runs against the
text of the finished PDF, not the source.

## Known Limitations

- **Sale reports are untested.** Every demo listing is a rental and the demo
  account holds no sale listing, so the sale side of the price and history
  sections has been read in the code but never rendered.
- **One photograph per demo listing.** The gallery block (`p.photos.length > 1`)
  and the photograph strip beside a shortlist property therefore never appear
  in a demo report. A real listing carries up to ten.
- **No development facility dataset.** What a development offers is whatever
  the agent typed into the listing. Nothing is verified against a register.
- **Nearby data always answers in demo mode.** The "Data unavailable" wording
  for a failed lookup is exercised by `report.test.ts`, not by a rendered PDF.
- **`Also nearby` clamps to two lines** in a shortlist snapshot. The full list
  is on the property's own Location page in a report of three or fewer; in a
  report of four or more there is no such page, so a long place name is cut.
- **The smallest type is 5.6 pt** (7.5 px at A4): the map credit, the signal
  tile labels and their captions. Body text is 7.1–8.6 pt.
- **The detailed edition is laid out as fixed sheets**, so the page composition
  rules above do not reach it.
