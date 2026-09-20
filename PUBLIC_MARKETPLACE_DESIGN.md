# The public V-RENT marketplace

Research, audit and design decisions for the consumer-facing half of V-RENT.
Written before the code, and kept afterwards as the record of what was decided
and why.

---

## 1. What already exists

The brief asks for a public property marketplace. One is already here, and it is
not a stub: `/phase1/homes` is a complete tenant-facing site with its own header,
footer, search, map, listing page, agent profile and saved list. It reads live
listings from the agent workspaces through `lib/phase1/marketplace.ts`.

So this is not a greenfield build. It is an audit, a set of repairs, and the
surfaces that were missing.

### Routes that exist

| Route | What it is |
| --- | --- |
| `/phase1/homes` | Front door: hero search, popular areas, newest homes, trust, agents |
| `/phase1/homes/search` | Results and map, side by side; every filter in the URL |
| `/phase1/homes/[owner]/[id]` | One home: gallery, facts, amenities, floor plan, location, agent |
| `/phase1/homes/agent/[owner]` | An agent's public profile and their live homes |
| `/phase1/homes/saved` | Saved homes, kept in the browser |

### The data layer

`lib/phase1/marketplace.ts` is the only door between the agent side and the
public side, and it is a good one:

* `advertisers()` filters to agents who may actually advertise — not suspended,
  registration not lapsed, checked against the date rather than a stored flag.
* `publicFields()` **deletes** the unit number on the way out rather than hiding
  it in the UI, keeping the storey as a separate figure. A tenant-facing screen
  cannot leak it even by accident.
* Only `published` listings appear in lists; `paused` resolves on a direct link
  so a shared address still works and says the unit is off the market.
* `marketListingsWithUnitNumbers()` is named so that sending one to a browser
  has to be a decision.

Nothing needed rewriting here. The gaps were around it.

### What the listing data actually supports

Read from `DemoListing` in `lib/phase1/data.ts`. Everything the public product
claims has to come from one of these:

project, address, postal code, district, lat/lng, property type, property
category and subtype, bedrooms, bathrooms, sqft, deal type, monthly rent, sale
price, available from, minimum lease, deposit months, furnishing, tenure, built
year, amenities, fittings, floor level, floor plan, video tour, HDB eligibility,
photographs, published date, reviewed date.

There is **no** field for: price history, transacted prices, expected TOP,
developer, unit mix, reviews, ratings, or response times. Anything the brief
asks for that needs one of those is not built. That list is at the end.

### Location infrastructure

Already present, and reused rather than duplicated:

* `lib/phase1/places.ts` — LTA station exits and the MOE school directory from
  data.gov.sg, cached for a month, postal geocoding through OneMap.
* `lib/phase1/amenities.ts` — OneMap themes.
* `lib/phase1/nearby.ts`, `nearby-sources.ts`, `nearby-demo.ts` — the six
  categories a published dataset actually answers for, added for the listing
  wizard.
* `lib/phase1/directions.ts` — OneMap routing, walk and drive, returning real
  metres and real seconds.

### The Demo Data switch

One switch, one cookie (`vrent_demo_data`), read in the browser by
`useDemoDataOn()` and on the server by `demoDataOnServer()`. There is no second
toggle anywhere and there will not be one.

---

## 2. What the audit found wrong

Three things, in order of how much they matter.

### 2.1 The public listing page was inventing walking times

`components/phase1/market/Nearby.tsx` contained:

    const walk = (m) => `${Math.max(1, Math.round((m * 1.3) / 80))} min walk`;

A straight-line distance, multiplied by a guessed detour factor, divided by a
guessed walking pace, and printed to a tenant as a fact. A flat across a canal
from a station is told it is a four-minute walk when it is fifteen.

This is exactly what §13 forbids, and it contradicts `lib/phase1/nearby.ts`,
which documents in its own source why no such helper exists there. **Fixed.**

### 2.2 Demo Data did not reach the public marketplace

The switch was wired through the agent workspace only. The public pages read
`marketListings()`, which always read the real stores. Turning Demo Data on and
opening the tenant site showed live data, with no indication that the switch was
even on. **Fixed.**

### 2.3 Discovery and SEO were missing entirely

No explore surface, no district pages, no MRT pages, no project pages, no agent
directory, no sitemap, no robots, no structured data, no canonical URLs. A
property marketplace that search engines cannot read is not a marketplace.
**Built.**

---

## 3. Research

### 3.1 Primary: the 99.co agent portal, recorded

The strongest source was a screen recording of the 99.co Singapore agent portal,
walked through end to end earlier in this project. Patterns taken from it:

* **The icon tab strip for nearby categories.** Categories as icons with a
  horizontal scroll, a coloured header carrying the count, and a radius
  selector. Adopted in the listing wizard, and now on the public listing page.
* **Distance beside every place, as a list, with pins on the same map.** The
  list and the map are one component, not two.
* **Price as the loudest text on a card**, image above it, one line of facts,
  one line of place. Already how V-RENT's card works.
* **Filters as popovers on desktop, a sheet on mobile**, with the applied ones
  as removable chips beneath. Already how V-RENT's search works.
* Their listing page shows "11 mins (775 m)". V-RENT does not copy that, because
  V-RENT does not have a routing engine running for every place at once. It
  shows the distance, and the minutes appear only on a route actually measured.

### 3.2 Secondary: the portals as products

* [99.co](https://www.99.co/) — map-first rental search; their Home Finder ties
  budget to commute time and puts results on the map rather than in a list
  ([announcement](https://aimgroup.com/2026/02/04/singapore-based-99-co-launches-map-based-property-rental-search-tool/),
  [their write-up](https://www.99.co/singapore/insider/99-cos-home-finder-where-budget-lifestyle-and-travel-time-finally-meet/)).
  The lesson taken: **the map is a filter, not decoration.** V-RENT's "search
  this area" already does this; it is now reachable from the explore pages too.
* [PropertyGuru Singapore](https://www.propertyguru.com.sg/) — listing pages
  carry around thirty structured fields and always name the agent's CEA number
  and agency licence. The lesson taken: **the compliance line is a trust
  feature, not fine print.** V-RENT already prints it; the agent directory now
  leads with it.
* Comparison of the two Singapore portals:
  [RCS guide](https://renovationcontractorsingapore.com/blogs/news/singapore-property-platforms-guide-propertyguru-99co).

### 3.3 Design references

Figma Community real-estate kits were reviewed as research, not as templates —
[Real Estate Website UI Kit](https://www.figma.com/community/file/1542057182814737306/real-estate-website-ui-kit),
[Real Estate UI Design Kit](https://www.figma.com/community/file/1301906139672490266/real-estate-ui-design-kit-20-free-figma-screens-for-property-listings-more),
[Renta](https://www.figma.com/community/file/1549671366124062321/renta-apartment-rent-real-estate-app-ui-kit).

What they get right, and V-RENT keeps: generous image ratios, one dominant
price, cards that breathe, filter chips.

What they get wrong for this product, and V-RENT rejects: the gradient hero, the
floating glass panels, the invented "match score" badge, the decorative chart.
Every one of those needs data the product does not have, or claims a judgement
it has not earned.

---

## 4. Design language

The public site uses the phase-1 kit (`components/phase1/kit.tsx`, the `.p1`
tokens). Not a second design system — the same one, used with more air.

| | Agent workspace | Public site |
| --- | --- | --- |
| Frame | Sidebar, dense | Full width to 1440, sparse |
| Type scale | 13–15px body | 14–16px body, 40–60px headlines |
| Card | Border, flat | Border, image-led, lifts 2px on hover |
| Price | `--p1-primary` blue | The same blue. An agent and a tenant looking at the same flat see the same price in the same colour. |
| Density | Tables | Grids of three or four |

**Spacing** is Tailwind's 4px scale; sections are `pt-14`/`pt-16`, cards `p-4`
to `p-6`. **Radius** is `rounded-xl` for controls and `rounded-2xl` for cards
and panels. **Shadow** is `--p1-shadow-sm/md/lg` only; nothing glows.
**Motion** is `--p1-fast` (140ms) for state and `--p1-normal` (200ms) for
movement, and all of it is suppressed under `prefers-reduced-motion`.

Colour carries meaning and nothing else: blue is price and primary action, green
is verified, amber is paused, red is saved.

---

## 5. Information architecture

    /phase1/homes                        front door
      /search            ?deal ?q ?district ?beds ?type ?min ?max ?floor …
      /explore                           browse by area, station, type, intent
      /d/[district]                      one district
      /mrt/[station]                     one station
      /project/[project]                 one development
      /agents                            the directory
      /agent/[owner]                     one agent
      /saved                             saved and recently viewed
      /[owner]/[id]                      one home

The rule for every new page: **it exists only when there is data behind it.**
`/mrt/lakeside` returns 404 unless a live listing names Lakeside. A marketplace
that ships empty category pages to be indexed is worse than one that ships none.

---

## 6. Decisions, and the reasoning

### 6.1 Walking times

Minutes are shown only where a route was measured. The public nearby panel shows
distance for every place; choosing a place calls OneMap's routing service, and
then, and only then, shows a time. If routing is unavailable the panel says so
and keeps the distance.

### 6.2 Market context

`lib/phase1/market.ts` holds a generated lease-contract dataset. It declares
itself: `MARKET_SOURCE.live === false`. It is fine on an agent's own research
screen, where the label is read.

It is **not** on the public site. Putting generated contracts in front of a
tenant as "recent transactions" is manufacturing market statistics, whatever the
footnote says.

What the public site shows instead is real: **the asking prices of comparable
homes live on V-RENT right now** — same deal type, same district, same bedroom
count. That is a fact about this marketplace, it is labelled as asking prices
rather than transactions, and it disappears below four comparables rather than
drawing a range from two.

### 6.3 Demo Data

One switch. `demoDataOnServer()` reads the cookie; `marketListings()`,
`marketListing()`, `marketAgent()` and `marketAgents()` each branch once, at the
top, to a demo marketplace built in memory from the existing seed portfolio.

* Nothing demo is ever written. The demo marketplace is a pure function.
* There is no fallback from live to demo. If the store fails, the page says the
  listings could not be loaded.
* Every public page carries a visible demo badge while the switch is on, because
  a tenant-facing screen showing sample homes must say so.
* `?demo=on` in the address works, as it does everywhere else.

### 6.4 Saved homes stay in the browser

A tenant has no account and is not asked for one. Saved homes and recently
viewed live in `localStorage`, every read and write wrapped, and the page works
when storage is blocked. This is not a limitation to fix later; asking a tenant
to register before they can shortlist is the thing portals get wrong.

### 6.5 No public JSON API

Every public page is a server component reading the store directly. That is
faster than a fetch to our own API and leaks less. A public REST surface would
be new attack surface for no gain, so none was added.

### 6.6 The legacy `/` routes

`app/page.tsx`, `app/search`, `app/property/[id]` and about twenty siblings are
pre-phase-1 scaffolding on `lib/mock-data`. The README says the working build is
`/phase1`. They were not touched: rebuilding them is a different brief, and this
one says not to redesign unrelated pages. Flagged in the limitations.

---

## 7. Responsive

Mobile is the design, not the fallback.

* **Search**: filters in a right-hand drawer, a floating list/map toggle above
  the safe area, the map full height, the selected pin's card floating over it.
* **Listing**: the enquiry panel becomes a fixed bar carrying price and one
  button. The gallery is one frame with a count; the lightbox is swipeable.
* **Explore and the landing pages**: two columns at 390px, six at 1440.
* Touch targets are 44px. `env(safe-area-inset-bottom)` on everything fixed.

## 8. Performance

* Server components and `force-dynamic`; no listing data crosses as JSON except
  what the search page needs in order to filter in the browser.
* The nearby panel is streamed behind `<Suspense>`, so the national datasets
  never block the listing.
* Images: the first four cards eager, the rest lazy; thumbnails on cards, full
  size only in the lightbox.
* Filtering happens in the browser over the live stock. Honest about its limit:
  past a few hundred listings this becomes a paged server query, and the comment
  in `SearchView` says so.

## 9. Accessibility

Semantic landmarks and one `h1` per page; a skip link; `aria-current` on the
active nav; the combobox is a real combobox with arrow keys and
`aria-activedescendant`; every icon-only control has a label; focus is visible on
the card ring, not only on the link; `aria-live` on the result count.

---

## 10. What is deliberately not built

Not because it was hard — because the data is not there, and inventing it is the
one thing the brief and this codebase both refuse.

| Asked for | Why not |
| --- | --- |
| Price, rental or PSF history | No transaction feed. URA's rental contract API needs an account the client does not have. The generated stand-in is agent-side only, and labelled. |
| Recent comparable **transactions** | Same. Comparable **asking prices** are shown instead, and named as such. |
| New launches | No project pipeline data: no developer, no TOP, no unit mix. A new-launches page would be four fields of guesswork. |
| Bus stops, supermarkets, malls, preschools | No published dataset answers for them. OneMap's 165 themes were enumerated; none of these exist. data.gov.sg's dataset-search endpoints now return 404. |
| Agent reviews, ratings, response times, deals closed | Nothing records them. Fabricating trust signals is the worst thing a property portal can do. |
| Languages spoken, declared areas served | Not fields on the profile. Districts served are derived from live listings instead, which is real. |
| Saved-search alerts by email | Searches save to the device. Sending mail needs an address, which needs an account. |
| Commute-time search ("20 minutes to work") | Would need a routing call per listing per query. The routing service is there; the budget for it is not. |
