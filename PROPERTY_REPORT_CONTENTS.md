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

Demo data is generated in the browser (`lib/phase1/report-data/demo.ts`). It is
never requested from or returned by an API, never saved and never written to a
listing, and it passes the same consistency checks as the original data.

## Client Report

`app/phase1/listings/export/client-edition.tsx`. The number of properties
decides the structure; the template is the same.

| Selection | Pages (typical) | Structure |
|-----------|-----------------|-----------|
| 1 property | 3–4 | Property overview · Photographs and location · Price and market position · AI Analysis with the sources note |
| 2–3 properties | 4–5 | Shortlist overview with insights · Side-by-side comparison · one page per property (the last also carries the sources note) |
| 4+ properties | 5 for five, 10 for ten | Summary table (with insights for up to six) · landscape comparison · compact snapshots, two to a page · sources note |

### One property
1. **Property overview**: who it is prepared for, the name, address and
   district, the photograph (or a plain "No photograph supplied" frame), the
   key figures (asking rent or price, per sq ft, layout, floor area,
   availability), the property and listing details, what is nearby, and **Why
   this property matters** (a factual positioning line and up to three measured
   facts, then the agent's description and note).
2. **Photographs and location**: every further photograph the agent supplied,
   then the OneMap map of the address beside what is nearby — MRT/LRT
   stations, schools, healthcare and daily needs, nearest first, with
   distances. Bus stops are not included: no bus-stop dataset is connected.
3. **Price and market position**, only when there is evidence: asking against
   the comparable median, the position on the observed range, a benchmark
   chart, the 12-month price history chart of the development (or district),
   and the six most relevant contracts. With current listings only, a short
   listings comparison instead, and the analysis continues on the same page.
   With neither, this page is left out.
4. **AI Analysis**, then the sources note.

### Two or three properties
1. **Shortlist overview**: property cards (photograph, name, price, size,
   layout), an at-a-glance table (property, type, location, size, asking,
   PSF, status), the agent's note and the **Shortlist insights**.
2. **Comparison**: the properties side by side (asking, per sq ft, floor area,
   layout, type, location, tenure and completion, nearest MRT, comparable
   median, market position, 12-month movement, price history, evidence,
   availability) and **Where each asking rate sits**.
3. **One page per property**: photograph with the further photographs as a
   strip, facts, the map with the nearest stations, schools, healthcare and
   daily needs, then a short AI Analysis
   (past five years, current position, forward outlook, up to four
   considerations).

### Four or more properties
1. **Summary**: a table with a small photograph per property. Long lists
   continue on further pages with the header repeated. Up to six properties,
   the shortlist insights follow on the same page.
2. **Comparison** on a landscape sheet: every property as a row (type, layout,
   size, asking, PSF, median PSF, position, 12-month movement, nearest MRT,
   evidence), split every 10–13 rows with the header repeated; then **Where
   each asking rate sits** and, for more than six properties, the insights.
3. **Snapshots**, two to a page: photograph (further photographs as a strip),
   map, facts including the nearest station and other nearby places, and a one-line AI Analysis
   per question with up to four considerations.

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
4. **Key considerations**. Three to five property-specific points, one per
   topic (pricing position, recent movement, connectivity, competition, size,
   schools, tenure, data limits), marked positive, attention or neutral.

Each analysis carries an **Evidence** level: *Moderate* (a local sample of 20
or more contracts), *Limited* (a small or non-local sample) or *Insufficient
data* (no comparison), and its limitations.

**Shortlist insights** state factual differences: the price and per-sq-ft
spread, which properties sit within, above or below their ranges, which have no
comparable evidence and why, where comparable rents moved most, which have a
price history, station distance and size. They never pick a winner or rank the
properties.

### Page breaks
Every sheet is a fixed A4 page, and content that does not fit would be cut
off. The client edition is therefore laid out as blocks (a heading with its
text, a table with its header, a photograph with its facts). Each block is
measured at the printed width and packed onto pages
(`lib/phase1/paginate.ts`): a block is never split, a heading stays with what
follows it, long tables are split into runs that repeat their header, and a
landscape sheet is used only for the wide comparison. From tablet width the
sheet on screen is the printed page, and the toolbar warns **Page N too long**
if anything still overflows.

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
| Benchmark bar (range, quartiles, median, asking) | One property, price and market position | Where does the asking rate sit? |
| 12-month price history (development or district median per sq ft) | One property, price and market position | Has this building's rent moved? |
| Where each asking rate sits (one strip per property on its own range) | Two or more properties, comparison | How do the properties sit against their own markets? |

Removed from the client report, and kept in the detailed report: the floor
area scatter (repeats the contracts table), the trend chart with a projected
three months (a numerical projection), the monthly contract volume bars, the
asking-rate bars across properties (compares different markets directly) and
the neighbourhood distance bars.

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
