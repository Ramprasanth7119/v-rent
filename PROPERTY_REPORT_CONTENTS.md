# V-RENT Property Report

## Purpose

A printable A4 report an agent sends a client about one property or a
shortlist. Each page answers one client question, from "what am I looking at?"
to "is the asking rent reasonable?", and shows the data behind the answer.
A page appears only when there is data to answer its question. Anything that
could not be checked is marked, never shown as zero.

Open it from **Client shortlists** or **Listings**, then choose **Save as PDF**.

## Report Editions

- **Client Report** (default). For a single property: about 12 pages for a
  rental with full data, 8 for a rental without photographs, history or
  competing listings, and about 5 for a sale. For a shortlist, each property gets
  at a glance, price position, location and the decision summary, after a
  shortlist overview.
- **Detailed Report**. Every page for every property, plus contents,
  neighbourhood detail (schools, healthcare, daily needs, places to visit),
  more comparable contracts, the contracts annex and the calculation method.
  About 15 pages for a rental with full data.

Switch between them with the toggle at the top of the report.

## Demo Data

The **Demo Data** switch in the report toolbar chooses where every figure comes from:

- **ON** (default) uses the property's original data: the listing as saved, its
  uploaded photographs, the held contract dataset and the live neighbourhood and
  competing-listing lookups. A lookup that fails still reads "Data unavailable"
  or "Unable to verify"; nothing is filled in.
- **OFF** uses illustrative demo data generated around the property, so every
  page can be shown populated: a year of contracts, history, trend, comparables,
  competing listings, schools, transport and daily needs. Names of developments,
  schools and places are fictional. No photographs are used (the cover is
  typographic), because no approved sample images are held.

While demo data is shown, every sheet carries a **Demo data** mark in the header
and "Illustrative data for demonstration purposes" in the footer, the toolbar
shows a Demo data chip, evidence badges read **Demo data**, and the sources page
says so. The saved PDF title ends in "Demo data".

Demo data is generated in the browser (`lib/phase1/report-data/demo.ts`). It is
never requested from or returned by an API, never saved to the store and never
written to a listing, and it passes the same consistency checks as the original
data before a page is printed. The switch is kept in the address (`demo=off`),
so a copied link opens in the same mode.

## Page by Page

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
  nearby, other), bedrooms, size, rent, PSF. Client report shows 12, detailed 20.

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
