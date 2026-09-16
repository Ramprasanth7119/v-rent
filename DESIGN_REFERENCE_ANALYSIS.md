# V-RENT — Design Reference Analysis

**Status:** analysis, then a first implementation pass. Sections 0–15 are the original analysis, unchanged. The **Addendum** at the end records where building against the real code corrected them — read it before acting on §4.3, §6.4, §7, §12 or §15.
**Date:** 16 September 2026
**Inputs:** 7 reference boards (`IMG-20260916-WA0001…WA0008`), the UI/UX video review report (`V-Rent_UI_UX_Video_Review_Report_Admin_Agent.pdf`, 18 pages), and the live V-RENT codebase.

---

## 0. Read this first — what the references actually are

Before any of the analysis below is used, one fact has to be on the record, because it changes how much authority these images carry.

**The reference boards are concept art generated for the review, not screenshots of shipping products.** Pages 14 and 15 of the review PDF introduce two of these same boards with the words *"Generated concept reference for the visual direction. It does not add modules; your current information architecture remains the source of truth."* The boards share one generator's fingerprints: every board uses the same stock faces, the same six invented agent names (Rahul Mehta, Anjali Rao, Vikram S, Neha Kapoor, Arjun Nair, Priya Sharma), and the same six invented properties (Ocean View Apartment, Urban Stay, Lake View Villa, City Nest, Green Residency, Sunrise Home). Several boards contain visibly garbled text — "Asiee" for "Active", "Oenhboard" for "Dashboard", "Angulies" for "Enquiries" — in the smaller tiles.

Two consequences:

1. **Treat them as a mood and hierarchy brief, not a specification.** Where a board shows a layout decision, that is signal. Where it shows a pixel value, a label, a number or a module name, that is generated filler and must be checked against V-RENT's real data and real IA.
2. **The market shown is not V-RENT's market.** The boards price in `₹` and `$`, place properties in Chennai, Bangalore, Hyderabad and Coimbatore, and use a short-stay vocabulary — *Bookings, Customers, Check-in, Check-out, Confirmed, Cancelled*. V-RENT is a Singapore rental platform: `S$`, districts D01–D28, CEA registration, and a workflow of *Enquiries → Viewings*, not bookings. Section 12 lists this as the single most important thing not to copy.

The review PDF is the more authoritative document of the two inputs, because it was written against recordings of the actual application. Where the PDF and the boards disagree, the PDF wins. Its own summary of the direction is the sentence this analysis is built around:

> *"Same modules, fewer words, stronger hierarchy, consistent components, clearer actions."*
> — Review PDF, §1

---

## 1. Reference inventory

### 1.1 Boards supplied

Seven image files were found and every one was inspected in full.

| # | File | Board title | Screens shown | Modes |
|---|------|-------------|---------------|-------|
| B1 | `IMG-20260916-WA0001(1).jpg` | *(untitled three-panel)* | Admin Overview; Agent Listings; Agent Enquiries | Light + Dark, side by side |
| B2 | `IMG-20260916-WA0002(1).jpg` | Admin Portal / Agent Portal | Admin: Login, Dashboard, Property Management, User & Agent Management, Booking Management, Reports & Analytics, Settings, Dashboard (dark). Agent: Login, Dashboard, Property Listings, Booking Management, Profile/Settings | Mostly light, 1 dark |
| B3 | `IMG-20260916-WA0003(1).jpg` | Admin Portal – All Screens | Login, Overview, Verification, Moderation, Agents, Subscriptions, Reports & Audit, Settings (+ brand panel) | Light full-size, dark thumbnail strip |
| B4 | `IMG-20260916-WA0004(1).jpg` | Admin Portal – All Screens | Login, Overview, Verification, Moderation, Agents, Subscriptions, Reports & Audit | Light full-size, dark full strip |
| B5 | `IMG-20260916-WA0006(1).jpg` | Admin + Agent Portal – All Screens | Admin: Overview, Verification, Moderation, Agents, Subscriptions, Reports & Audit. Agent: Dashboard, Listings, Enquiries, Viewings, Performance, Marketing, Insights, Subscription, Profile & CEA | Light + dark, both full-size |
| B6 | `IMG-20260916-WA0007(2).jpg` | Admin / Agent Portal – UI Suggestions | Admin: Login, Dashboard, Users/Agents, Properties, Bookings, Profile & Settings. Agent: Login, Dashboard, Properties, Bookings, Customers, Profile & Settings | Light + dark, both full-size |
| B7 | `IMG-20260916-WA0008(1).jpg` | Admin + Agent Portal – All Screens | Admin: Login, Dashboard, Verification, Moderation, Agents, Subscriptions, Reports & Audit, Settings + 3 mobile frames. Agent: Login, Dashboard, Listings, Enquiries, Viewings, Performance, Marketing, Insights, Subscription, Profile & CEA + 3 mobile frames | Light (admin) + Dark (agent), with mobile |

### 1.2 Reconciling this with "approximately 26 reference images"

The seven files carry **26 distinct screen designs** between them, which is almost certainly what the count of 26 refers to. Deduplicated:

**Admin (12):** Login · Overview/Dashboard · Verification · Moderation · Agents · Subscriptions · Reports & Audit · Settings · Properties · Bookings · Users · Profile/Settings
**Agent (14):** Login · Dashboard · Listings · Enquiries · Viewings · Performance · Marketing · Insights · Subscription · Profile & CEA · Properties · Bookings · Customers · Profile/Settings

Counting each light/dark pairing separately would give roughly 45 panels; counting files gives 7. 26 is the count of unique screens, so this inventory is treated as complete.

### 1.3 Duplicates, variations and gaps — stated explicitly

- **B3 and B4 are variations of one board,** not two designs. Same eight admin modules, same donut, same trend chart, same brand line. B3 adds a Settings screen and renders dark mode as a thumbnail strip; B4 drops Settings and renders dark mode full size. Where they differ in detail, B4's dark panels are the more legible of the two.
- **B5 and B7 are the strongest and most authoritative boards.** They are the only two whose agent navigation matches V-RENT's actual modules exactly — Dashboard, Listings, Enquiries, Viewings, Performance, Marketing, Insights, Subscription, Profile & CEA. Everything in this document that concerns the agent portal leans on these two.
- **B2 and B6 describe a different product.** Their agent portal is Dashboard / Properties / Bookings / Customers / Profile, and their admin portal has Properties and Bookings. That is a short-stay or property-management product, not V-RENT. Their *visual* patterns are usable; their *information architecture* is not.
- **B1 is the highest-fidelity board** and the best source for card, chip and chart anatomy, because it renders only three screens at large size instead of packing in twelve.
- **One file is missing from the supplied sequence.** The series runs WA0001, 0002, 0003, 0004, **0006**, 0007, 0008 — `IMG-20260916-WA0005` was not supplied. Nothing in the other boards implies what it contained. If the intended set was numbered 1–8 continuously, this analysis is missing one board.
- **Uncertainties recorded rather than invented:** exact spacing, radius and type values cannot be measured from a JPEG composite, so every numeric value proposed in sections 4–6 is derived from V-RENT's existing tokens and the review PDF's 4/8-point recommendation, not read off the images. Several small tiles on B2, B6 and B7 have illegible generated text; no conclusion in this document rests on them.

### 1.4 Current-state evidence (not references)

The review PDF embeds **20 sampled frames of the live application** — ten admin (`V-RENT Admin_0…9`) and ten agent (`VRENT v1_0…9`). These are the *before* state, and they were inspected alongside the references:

Admin frames show Overview with a red past-due banner, a four-metric strip with inline sparklines, a "Needs a person" queue with progress bars, a listings donut, Reports & Audit with Platform/Audit trail/API activity tabs, an onboarding funnel with red drop labels, an Agents table, a Subscriptions table, and an empty Verification state.
Agent frames show the sign-in split screen, the dashboard as it was before the current transformation ("Good morning, Peggy", four KPI cards, "You're all caught up", "No enquiries yet"), Enquiries with a four-metric strip and amber insight banner, Transactions, Project comparison, Search placement, New listing step 1, the Reports filter panel, and Public page settings.

The gap between these frames and the boards is the actual brief, and it is narrower than it looks. The current app is not badly designed — the PDF scores it 7.7/10 and says the path is *"refinement rather than reinvention"*. What the boards have that the frames lack is mostly: **property photography, larger numerals, softer surfaces, fewer words per screen, and more air.**

---

## 2. Cross-reference design language

Not a summary of each board — the patterns that appear on **four or more** of the seven.

### A. Visual hierarchy

Every board, admin and agent, uses the same five-step vertical order:

```
page title (+ one-line subtitle)   →   primary action, top right
KPI row (3–4 items, never more)
attention / queue / activity
one main chart    +    one supporting chart
detail table or card grid
```

The consistency is the finding. The review PDF states the same order independently in §3 and calls it "Pattern A". Where a board breaks it — B2's admin dashboard puts the chart before the queue — the screen reads worse.

### B. Typography

One sans family throughout, four weights in use. The distinguishing move is **numeral scale**: KPI figures are set at roughly 2.2–2.5× the label beneath them and in the heaviest weight on the screen, while the label is small, regular and low-contrast. The number is the content; the word is the caption. No board uses a serif, a display face, or letter-spaced uppercase for anything except small section labels.

Headings are notably *restrained* — "Welcome Back!", "My Listings", "Enquiries" are set at what reads as 20–24px, not 36px. The PDF names this explicitly: *"Avoid oversized headings that consume workspace."*

### C. Spacing rhythm

Consistent 4/8 grid. Card padding ~20–24px, grid gaps ~16–20px, section gaps ~24px. Table and list rows are compact (~52–64px) but never cramped, and each row has a clear left-to-right rhythm: identity, then content, then status, then action.

### D. Grid and layout

Fixed left sidebar (~220–240px, icon+label), fixed top bar, fluid content. Content is a 12-column feel with three repeating splits: **4×1** (KPI row), **2:1** (main chart + side chart/list), **3-up or 2-up** (property card grid). B1 and B5 both use 2:1 for chart-plus-donut and 3-up for property cards.

### E. Colour philosophy

This is the most consistent thing across all seven boards, and the most important.

**One blue carries the entire product.** Primary buttons, the selected navigation item, the chart line, the chart's area fill, the active filter chip, the price figure, and the value pill on the chart are all the same blue. Everything else on the page is neutral. Colour beyond that blue appears only in three places: soft tinted tiles behind KPI icons, status chips, and donut segments. There are no decorative gradients anywhere on any board, no glow, no glass, and no colour used simply to fill space.

The status vocabulary is stable across boards: **green = active/confirmed/approved, amber = pending/expiring/under review, red = rejected/expired/overdue/cancelled, purple or blue = viewing/in-progress, grey = draft/inactive.**

### F. Surface hierarchy

Three levels, no more: page background (very light grey, never pure white) → card surface (white) → inset surface (light grey, used for chart plots, progress tracks and filter-chip rails). Separation is by **hairline border first, shadow second**; shadows are barely visible and used only where a card genuinely floats.

### G. Card design

Two card types only, and knowing which is which matters:

- **Data card** — hairline border, ~12px radius, 20–24px padding, title row with an optional right-aligned control, then content. Used for charts, lists, queues.
- **Property card** — photograph first at 16:9 or 4:3, status chip over the top-left of the photo, a heart/save button over the top-right, then a tight text block: project name, location, a bed/bath spec row with small icons, and the price in bold blue. This is the only card on any board where colour, image and weight all concentrate in one place, which is exactly what makes the boards read as property products rather than generic SaaS.

### H. Navigation

Identical on every board. Sidebar with a brand lockup at top, then a flat list of icon+label items. The active item is a filled soft-blue pill with a blue icon and a semibold label. There is no accordion, no nested tree, and no more than about ten items. Mobile collapses to a bottom tab bar of 4–5 icons.

### I. Buttons and controls

Exactly one filled blue primary button per screen, top right, usually `+ Add Property` / `+ Add Agent`. Everything else is a ghost icon button, a kebab menu, or a text link. Filter state is expressed as a **chip row with counts** — `All 32 · Active 24 · Pending 4 · Draft 2 · Expired 2` — with the selected chip filled blue. That chip row with counts appears on six of seven boards and is one of the strongest patterns in the set.

### J. Forms

Only the login screens and B2/B7 settings show forms. Single column, label above field, generous field height, one full-width primary button. Login is a 50/50 split: brand photograph or illustration on one side, form on the other, with minimal marketing copy.

### K. Tables

Compact rows, light header, left-aligned text, right-aligned numbers, a status chip column, and an action column that is either a kebab or two or three ghost icon buttons. An avatar or a property thumbnail anchors the first column on every table that lists people or properties. No zebra striping anywhere.

### L. Charts

Deliberately plain and worth describing precisely, because this is where V-RENT's current app differs most.

- **Line/area chart:** one series, smooth curve, blue stroke, soft blue area fill fading to nothing, visible circular dots at each reading, horizontal gridlines only, sparse axis labels (`Jan Feb Mar Apr May Jun`), and **a blue rounded value pill labelling the notable point** (`420`). No legend, because there is one series.
- **Donut:** thick ring, 3–5 segments, the total set large in the middle (`862`, `124 Total`), legend to the right as small coloured dots with label and value. Never a pie.
- **Bar chart:** single-colour vertical bars, thin, rounded caps, plenty of gap.
- **Horizontal bars:** used for rankings (Top Cities) with the value or percentage at the right end.
- **Progress bars:** used for usage limits (`Listings 24/50`, `Storage 2.4GB/10GB`) — a track, a blue or gradient fill, a fraction label.

What is absent is as informative: no dual axes, no stacked areas, no scatter, no 3D, no chart junk, no animated background.

### M. Maps

**No board shows a map.** V-RENT has OneMap integration, neighbourhood and floorplan screens. The references offer no guidance here, and this is recorded as a genuine gap rather than filled with invention.

### N. Property imagery

Photography is the single biggest visual difference between the boards and the current app. Every board that touches listings puts a real interior photograph at the top of the card. Even the enquiry rows carry a small property thumbnail beside the person's avatar. Photographs are always rectangular with a modest radius, never circular, never with a gradient scrim except behind an overlaid chip.

### O. Filters

Persistent search input in the top bar or directly above content, then the chip row with counts, then a card/list view toggle and a filter icon on the right. Three of seven boards show the grid/list toggle as a pair of small icon buttons.

### P. Status indicators

Pill-shaped, small, soft tinted background with a darker text of the same hue, ~11–12px semibold, sometimes with a leading dot. Always accompanied by a word — no board relies on colour alone, which matches the accessibility requirement rather than fighting it.

### Q. Micro-interactions

Static images, so this is inference, but three things are directly implied: card hover elevation (B7 shows one card lifted), navigation active state as a filled pill (implying a transition between items), and the chart's value pill (implying a hover tooltip of the same shape).

### R. Motion principles

Not directly observable. The PDF is silent on motion. Section 9 proposes a system from first principles constrained by what the boards imply.

### S. Responsive behaviour

Only B7 shows it, and it is clear: bottom tab bar, 2×2 KPI grid, horizontally scrolling chip row, single-column image-first property cards, list rows reduced to avatar + name + one line + chevron. The layout is *rebuilt*, not scaled.

### The four questions

**What makes these look premium?** Photography given real space; large confident numerals against small quiet labels; generous whitespace; one accent colour used with discipline; hairlines instead of heavy borders; and nothing decorative anywhere. Premium here is subtraction, not addition.

**What makes them look modern?** Soft tinted icon tiles, pill-shaped chips and filters, ~12px radii, three flat surface levels, and charts stripped to a single series.

**What makes them professional rather than flashy?** No gradients, no glow, no glass, no animation implied beyond hover, and a status vocabulary that always pairs colour with a word. The boards look like tools, not like marketing.

**What repeats across multiple references?** In order of how many boards carry it: one blue for everything interactive (7/7); KPI row of exactly 3–4 items with soft icon tiles (7/7); pill status chips with words (7/7); sidebar with filled-pill active state (7/7); filter chips with counts (6/7); photograph-first property cards with a status chip over the image and a bold blue price (5/7); single-series line chart with dots and a value pill (5/7); donut with a large centred total and a right-hand legend (5/7); an activity or enquiry list with a coloured icon tile or avatar and a relative timestamp (5/7); a compact table with an avatar in column one and a kebab at the end (5/7).

---

## 3. Signal vs decoration

Every major pattern classified. This is the section that decides what actually gets built.

| Pattern | Class | Why |
|---|---|---|
| KPI row limited to 3–4 items | **Productive** | Forces a decision about what matters. The current agent dashboard already learned this. |
| Large numeral, small label | **Productive** | The figure is scannable at a glance; the label is only needed once. |
| Filter chips with live counts | **Productive** | The count *is* the information — it tells you whether the filter is worth clicking before you click it. |
| Photograph-first property card | **Productive** | For a property product the image is the primary data, not decoration. |
| Status chip with colour **and** word | **Productive** | Meets the non-colour-only requirement while being faster to scan than text alone. |
| Attention/queue block directly under the KPI row | **Productive** | Answers "what do I do now" in the first viewport. |
| Single-series chart with visible dots | **Productive** | Dots make individual readings hoverable and legible; a bare line does not. |
| Value pill on the chart's notable point | **Productive** | Gives the chart a takeaway without needing a legend or a paragraph. |
| Progress bar for a usage limit | **Productive** | A fraction and a length answer "how close am I" in one object. |
| Detail in a right-hand drawer | **Productive** | Preserves queue context. The PDF recommends it for verification and moderation. |
| Grid/list view toggle | **Productive** | Same data, two densities, user's choice. |
| Relative timestamps (`2 mins ago`) | **Productive** | Cheaper to read than a date for recent activity. |
| Soft tinted icon tile beside a KPI | **Polish** | Adds category recognition and warmth at near-zero cost. Not load-bearing. |
| Hairline borders over shadows | **Polish** | Reduces visual weight; makes dense screens calmer. |
| ~12px radius everywhere | **Polish** | Consistency reads as intentional. The value itself doesn't matter. |
| Card hover elevation | **Polish** | Confirms clickability. Must stay under ~2px of movement. |
| Avatar in the first table column | **Polish** | Faster recognition of a known person; carries no data. |
| Bold blue price on a property card | **Polish**, close to productive | Makes the one number an agent scans for findable without reading. |
| Login split-screen with a building photo | **Decorative** | Costs a large image on the least valuable screen. Keep it modest or skip it. |
| Brand panel — "Better Rentals. Brighter Lives." | **Decorative** | Board furniture for presenting the concept. Not a product surface. |
| Donut as the *primary* status view | **Decorative when it replaces a list** | Five segments in a ring is harder to read than five labelled rows. Useful as a secondary, glanceable shape only. |
| Heart/save button on the agent's own listing card | **Decorative** | Copied from a tenant-facing card. An agent does not favourite their own listing. Drop it. |
| Every value in its own card (B2) | **Decorative, actively harmful** | The PDF calls this out: *"do not put every small value inside a card."* |

**Rule taken from this table:** V-RENT builds everything in the Productive rows, adopts the Polish rows where they cost nothing, and builds nothing from the Decorative rows.

---

## 4. The current V-RENT system — audit before proposal

The proposal in sections 5–7 extends what exists. It does not replace it. Here is what exists.

### 4.1 Tokens (`app/globals.css`)

A complete two-theme custom-property system already scoped under `.p1`:

- **Surfaces:** `--p1-bg` `#F7F8FA` → `#0B1220`, `--p1-surface` `#FFFFFF` → `#111827`, `--p1-elevated` `#FFFFFF` → `#172033`, `--p1-subtle` `#F2F4F7` → `#1A2436`
- **Borders:** `--p1-border` `#E5E7EB` → `#263247`, `--p1-border-strong` `#D0D5DD` → `#364459`
- **Ink:** `--p1-text` `#111827` → `#F8FAFC`, `--p1-text-2` `#475467` → `#CBD5E1`, `--p1-text-3` `#667085` → `#94A3B8`
- **Primary:** `#2563EB` → `#60A5FA`, with `-hover`, `-soft`, `-on`
- **Accent (amber):** `#F5A524` → `#FBBF24` — reserved for *featured* and cover photography
- **Status:** success `#059669` → `#34D399`, warning `#D97706` → `#FBBF24`, danger `#DC2626` → `#F87171`, info `#0284C7` → `#38BDF8`, each with `-soft` and `-border`
- **Elevation:** `--p1-shadow-sm/md/lg`, plus `--p1-ring`
- **Motion:** `--p1-ease`, `--p1-fast` 140ms, `--p1-normal` 200ms, `--p1-slow` 360ms
- **Type:** `--font-p1-sans` is Inter with `cv11, ss01, ss03` and `-0.006em` tracking

**Finding: the token layer needs almost nothing.** `#2563EB`/`#60A5FA` is already the boards' blue. The three-level surface hierarchy already matches. The status palette already matches the boards' vocabulary. What is missing is small and specific, and is listed in 5.4.

### 4.2 Components (`components/phase1/ui/*`, re-exported by `kit.tsx`)

| Module | Exports |
|---|---|
| `primitives` | `cx` `Spinner` `Button` `LinkButton` `IconButton` `Avatar` `Kbd` |
| `surface` | `Card` `SectionCard` `Breadcrumbs` `PageHeader` `SectionTitle` `MetricStrip` `Metric` `StatCard` `ProgressBar` `Callout` `Field` `FieldGrid` `KeyValue` `PresenterNote` |
| `form` | `FormField` `TextInput` `PasswordInput` `TextArea` `SelectInput` `InlineSelect` `Checkbox` `Toggle` `Segmented` `ChoiceCard` `HelpTip` `SearchInput` |
| `data` | `FilterChips` `FilterBar` `SortButton` `Pagination` `DataTable` `Tabs` |
| `feedback` | `EmptyState` `ErrorState` `Skeleton` `SkeletonCard` `SkeletonPropertyCard` `SkeletonTable` `SkeletonPage` |
| `display` | `KPI` `KPISkeleton` `Tooltip` `Timeline` `SuccessCheck` |
| `viz` | `useInView` `CountUp` `AreaChart` `Donut` `Heatmap` `Funnel` `Radial` `StackedBars` `Bullet` |
| `charts` | `Sparkline` `MiniBars` `HBars` `Ring` |
| `nav` / `menu` / `listbox` | `Stepper` `Menu` `SelectMenu` `AnchoredLayer` |
| `status.tsx` | `StatusBadge` `StatusDot` `Pill` + `LISTING_STATUS` `AGENT_STATUS` `MATCH_STATUS` `SUBSCRIPTION_STATUS` `CHECK_STATUS` |
| `overlays.tsx` | `Dialog` `ConfirmDialog` `Drawer` |
| `bits.tsx` | `PageHead` `Stat` `GateRow` `StatusChip` `MatchChip` `StepRail` `SpecNote` |

**Finding: every component group the PDF recommends already exists.** The PDF's suggested list — AppShell, Sidebar, Topbar, PageHeader, KPI Card, FilterBar, StatusBadge, DataTable, PropertyCard, ChartCard, EmptyState, DetailDrawer, ConfirmDialog, Toast, FormField, ThemeToggle — maps onto `Shell` + `PageHeader` + `KPI` + `FilterBar` + `StatusBadge` + `DataTable` + `ListingCard`/`PropertyCard` + `Card` + `EmptyState` + `Drawer` + `ConfirmDialog` + `Toast` + `FormField` + the header theme control. **Nothing on that list needs to be created.** This must be stated clearly, because the obvious failure mode of a reference-driven redesign is building a second set of components beside the first.

### 4.3 Gaps the audit found

1. **`Drawer` exists but the queues don't use it.** It is used on the map, in admin reports, in tool cards and in search filters — but not in Verification, Moderation, Agents or Enquiries, which are exactly the queues the PDF says should keep context.
2. **Two property cards exist** — `listing/ListingCard.tsx` (agent side) and `market/PropertyCard.tsx` (tenant side). They have diverged. This is the one place where consolidation, not addition, is the right move.
3. **Photography is under-used on agent surfaces.** `PropertyImage` exists and handles a missing photo honestly, but agent-side lists are still mostly text rows.
4. **`Funnel` is in the kit and is a trap.** It marks the largest absolute drop in danger red, which on a property funnel is always views→saves — a ~90% fall that is completely normal. It was removed from the agent dashboard for exactly this reason and should not be reintroduced elsewhere without the same scrutiny. The PDF's §9 recommendation of a conversion funnel for Insights should be read as "show the conversion story", not "use a funnel shape".
5. **Word count per screen is high.** The sampled frames show explanatory paragraphs — "Where this comes from", "What is real here", "What comes out" — that no reference board has an equivalent of. These are honest and useful in a prototype being demonstrated; they are the main thing standing between the current screens and the boards' calm. They should become tooltips and `HelpTip`s rather than blocks.

---

## 5. Proposed V-RENT design system

Everything below is an **extension of the existing `.p1` tokens**, expressed as additions or confirmations. Nothing proposes replacing a token that already works.

### 5.1 Typography

One family: Inter, already loaded as `--font-p1-sans`. Four weights: 400, 500, 600, 700.

| Role | Size / weight | Notes |
|---|---|---|
| Page title | 22–24px / 600 | Confirms the boards' restraint. Not 32px. |
| Section title (in-card) | 14–15px / 600 | |
| Section label (rail/group) | 11px / 600, uppercase, +0.08em | Already used in the sidebar |
| Body | 13.5–14px / 400 | |
| Secondary / caption | 12–12.5px / 400, `--p1-text-3` | |
| Micro label | 11–11.5px / 500 | Chips, axis labels |
| **Hero numeral** | 42–48px / 700, `tabular-nums`, −0.02em | One per screen, maximum |
| **KPI numeral** | 24–28px / 700, `tabular-nums` | The KPI row |
| **In-card figure** | 18–22px / 700, `tabular-nums` | |
| Price | 16–18px / 700, `--p1-primary` | The boards' single most recognisable property signal |

`tabular-nums` on every figure that can change, so numbers don't jitter during a count-up.

### 5.2 Spacing

4px base. Permitted values: 4, 8, 12, 16, 20, 24, 32, 40, 48.

- Card padding: **20px** default, **16px** compact, **24px** hero
- Grid gap: **16px** cards, **20px** sections
- Section vertical rhythm: **20px** between blocks, **32px** before a new titled section
- Table/list row: **56px** default, **48px** compact, **64px** with a thumbnail
- Control height: **38px** (already the sidebar item height), **40px** for primary buttons
- Minimum interactive target **24×24 CSS px** (WCAG 2.2 AA, cited by the PDF §9); prefer 36×36 for anything an agent uses repeatedly

### 5.3 Shape

| Element | Radius |
|---|---|
| Card, panel | 12px |
| Property image | 12px (card-level), 8px (thumbnail) |
| Button, input, select | 8px |
| Chip, badge, pill | full (999px) |
| Icon tile | 8px |
| Progress track / bar | full |
| Avatar | full |

### 5.4 What actually needs adding to the token layer

Only four things. Everything else is already there.

1. **A chart palette.** There is no `--p1-chart-1…5`. Donut segments and multi-series bars currently pick status colours ad hoc, which is why the current admin donut reads as "green = good, red = bad" when it actually means "active / under review / rejected / expired". A four-to-five colour categorical ramp, derived from the primary blue and distinguishable in both themes and in greyscale, should be named explicitly.
2. **Icon-tile tone tokens.** The soft tinted square behind a KPI icon is the boards' most repeated polish element. It already exists as `IconTile` in `components/phase1/dashboard/parts.tsx` with six tones — it should be promoted into the shared kit rather than left in the dashboard folder, since Listings, Enquiries, Performance and the admin modules all want it.
3. **A `--p1-scrim`** for text over photography, so the status chip over a property image has one defined treatment instead of a per-component rgba.
4. **Confirmation, not change, for the blue.** `#2563EB` / `#60A5FA` stays. It is the boards' blue. No new brand colour is proposed.

### 5.5 Surfaces

| Level | Light | Dark | Use |
|---|---|---|---|
| Page | `#F7F8FA` | `#0B1220` | Behind everything |
| Surface | `#FFFFFF` | `#111827` | Cards, sidebar, header |
| Elevated | `#FFFFFF` + `shadow-md` | `#172033` | Menus, drawers, dialogs |
| Inset | `#F2F4F7` | `#1A2436` | Chart plots, progress tracks, chip rails |
| Hairline | `#E5E7EB` | `#263247` | The default separator |

Rule: **separate with a hairline; use a shadow only when the surface genuinely floats above the page.** This already matches both the boards and the existing tokens.

---

## 6. Colour and theme strategy

### 6.1 The light-mode navigation problem — already solved

The brief flags that *"navigation remained visually black in light mode."* **This has been fixed and is guarded.** `globals.css` carries the comment that `--p1-sidebar` is for *"deep feature panel (promotional cards, sign-in art). Never navigation chrome: the sidebar and header follow the theme's surface tokens"*, and `tests/theme-chrome.test.ts` asserts it — it reads the tokens out of the CSS, checks that light chrome sits above 0.85 luminance and dark chrome below it, and checks that `Shell.tsx` never reaches past the tokens for a fixed dark colour.

**Recommendation: keep that test and extend it** rather than re-solving the problem. It is the correct architectural answer — theme as a first-class concern enforced by a test, not by discipline.

### 6.2 Theme principle

From the PDF §5, and worth quoting because it is the rule that prevents a second design:

> *"Do not create a separate visual design for Dark Mode. Use the same component geometry, spacing and interaction patterns, changing only tokens."*

Concretely: identical layout, identical positions, identical labels, identical radii, identical row heights. Only `background`, `surface`, `border`, `text` and `accent` change.

### 6.3 Per-mode guidance

| Concern | Light | Dark |
|---|---|---|
| Page background | Warm-neutral grey, never pure white | Deep navy `#0B1220`, never pure black |
| Surface | White | `#111827`, one clear step above the page |
| Border | Visible but quiet hairline | Slightly higher relative contrast than light, or it disappears |
| Primary | `#2563EB` | `#60A5FA` — lightened for contrast on dark, same hue |
| Chart line | Primary | Primary; **do not brighten a chart because the theme is dark** (PDF §7) |
| Chart fill | ~10–14% primary | ~14–18% primary; keep it below the gridlines in weight |
| Status | Saturated on soft tint | Lightened on dark tint, same hue family |
| Focus ring | `--p1-ring`, must clear the surface in both | Same — verify against `#111827`, not against the page |
| Photography | Unchanged | Unchanged — do **not** dim property photos in dark mode; the property is the content |

### 6.4 Chart palette (the one genuine addition)

Categorical, five steps, ordered by prominence, with the constraint that they must survive greyscale:

1. Primary blue — the default series, always
2. A desaturated teal
3. Amber (`--p1-accent` family)
4. A muted violet
5. Neutral grey — always "other" / "draft", never a real category

Status colours (`success`/`warning`/`danger`) stay *out* of the categorical ramp. They are reserved for meaning. This is the fix for the current donut reading as a verdict when it is a distribution.

---

## 7. Component patterns

Each row says what exists, what the references add, and — critically — whether anything new is needed.

| Pattern | Exists as | What the references add | New component? |
|---|---|---|---|
| App shell | `Shell.tsx` | Nothing structural. Active state already a filled pill. | **No** |
| Page header | `PageHeader`, `PageHead` | Date beside the greeting; one primary action top-right | **No** — props only |
| KPI row | `KPI`, `MetricStrip`, `StatCard` | Soft tinted icon tile; 3–4 max; larger numeral | **No** — extend `KPI` with a tone/icon prop |
| Icon tile | `IconTile` (dashboard-local) | Used across all modules on the boards | **Promote** to `ui/display` |
| Filter chips | `FilterChips`, `FilterBar` | Counts inside the chip; selected chip filled blue | **No** — count prop |
| Property card | `ListingCard` + `market/PropertyCard` | Photo-first, status chip over image, bed/bath spec row, bold blue price | **No** — **consolidate the two** |
| Property thumbnail row | partly in `EnquiryFeed` | Thumbnail beside the avatar in enquiry and viewing rows | **No** — reuse `PropertyImage` |
| Status chip | `StatusBadge`, `StatusChip`, `Pill` | Nothing — already correct, already word+colour | **No** |
| Data table | `DataTable` | Avatar in column one, kebab at the end, fewer columns | **No** — column config |
| Detail drawer | `Drawer` | Queue detail without losing the queue | **No** — **apply it** to Verification, Moderation, Agents, Enquiries |
| Chart card | `Card` + `viz`/`charts` | Title + range control in the header; one takeaway | **No** |
| Line/area chart | `AreaChart` (has `dots`, `markPeak`) | Already matches the boards after the dashboard work | **No** |
| Donut | `Donut` | Large centred total, legend right | **No** — needs the chart palette |
| Usage progress | `ProgressBar` | Fraction label beside the bar | **No** |
| Empty state | `EmptyState` | Icon + one line + one action | **No** — copy discipline |
| Grid/list toggle | `Segmented` | Card ↔ list on Listings | **No** |
| Action card (Marketing) | `ToolCard` | icon + short title + status + action, one shared pattern for all seven tools | **No** |

**The conclusion of this table is the most useful finding in the document: the reference direction requires roughly one promotion, one consolidation, three prop extensions and a lot of application. It does not require a new component library.**

---

## 8. Data visualization patterns

### 8.1 Rules taken from the boards

1. **One takeaway per chart.** If the chart needs a paragraph, it is the wrong chart.
2. **One series unless comparison is the point.** Five of seven boards show single-series line charts.
3. **Dots on short series.** Legible up to ~30 readings; drop them beyond that.
4. **Label the notable point** with a pill rather than labelling every point.
5. **Horizontal gridlines only**, sparse, low contrast. No vertical grid, no border box.
6. **Sparse axis labels.** Six on a twelve-month axis is enough.
7. **No legend for one series.** Put the metric in the card title instead.
8. **Range control lives in the card header**, right-aligned, compact — `7D 30D 90D 12M` or `This Year`.
9. **Donut for distribution only**, never for a verdict, with the total in the middle.
10. **Horizontal bars for rankings**, value at the right end.

### 8.2 V-RENT-specific rules the boards cannot supply

The boards have no honesty problem to solve, because their data is invented. V-RENT does, and these rules must survive any visual work:

- **Modelled figures stay labelled.** Views, saves and enquiry projections are derived deterministically per listing and carry a "Modelled" chip with an explanatory tooltip. A prettier chart does not get to drop that label.
- **Counted and modelled figures never mix inside one chart.** Viewings come from real diary bookings; views are modelled. They can sit on the same screen but not in the same funnel, because the resulting rate would be meaningless.
- **Never invent a score.** Where a composite figure is shown it must be computed from something that already exists — the portfolio "Listing quality" figure is the mean of the per-listing `listingHealth()` score shown on each listing page, not a new invented metric.
- **The funnel shape is banned** unless the drop between every stage is genuinely actionable. See 4.3(4).

---

## 9. Motion principles

The boards are static, so this is proposed from first principles under the constraint that nothing may contradict what the boards imply. The existing utilities (`vr-rise`, `vr-fade`, `vr-pop`, `vr-grow`, `vr-stagger`, `p1-viz-draw`) already cover most of it.

| Moment | Motion | Duration |
|---|---|---|
| Page entrance | Groups fade+rise 8px, staggered 40–80ms | 200–280ms |
| Section reveal on scroll | Fade in on first intersection, once | 240ms |
| Number arrival | Count-up from 0, `tabular-nums`, once per mount | 500–700ms |
| Chart draw | Stroke draws in, area fades behind it | 400–600ms |
| Chart data change | Remount on metric/range change so the draw replays | as above |
| Card hover | Border strengthens, shadow `sm`→`md`, lift ≤ 2px | 140ms |
| Property image hover | `scale(1.02)` inside a clipped frame | 200ms |
| Nav active change | Indicator slides between items | 200ms |
| Button press | `scale(0.98)` | 100ms |
| Dropdown / menu | Fade + 4px rise from the trigger edge | 140ms |
| Drawer | Slide from the right with a scrim fade | 240ms |
| Dialog | Fade + `scale(0.98→1)` | 200ms |
| Toast | Slide in, auto-dismiss, slide out | 200ms |

**Constraints, all non-negotiable:**

- Nothing animates continuously. No looping, no pulsing, no particles, no ambient movement.
- Nothing blocks input. Content is interactive before its entrance finishes.
- Animate `transform` and `opacity` only. Never `width`, `height`, `top` or `left`.
- Each element animates once per mount, not on every re-render.
- Under `prefers-reduced-motion: reduce`, **every** animation resolves immediately to its final state. Count-ups show the final number. Charts draw complete. This is already implemented in `globals.css` and must not regress.

---

## 10. Responsive principles

From B7's mobile frames and the PDF §9. The rule is to **rebuild at each breakpoint, not scale**.

| Width | Navigation | KPI row | Charts | Tables | Cards |
|---|---|---|---|---|---|
| **≥ 1280** | Full sidebar | 4 across | Full with axis labels + tooltip | All columns | 3-up |
| **1024–1279** | Full or rail | 4 across, tighter | Full, fewer axis labels | Drop 1–2 columns | 2-up |
| **768–1023** | Rail (icons) or drawer | 2×2 | Reduced labels, keep tooltip | Essential columns; rest into the row detail | 2-up |
| **< 768** | Bottom tab bar, 4–5 items | 2×2 | Single metric, compact height, keep the value pill | Becomes a card list | 1-up, image-first |

Additional rules:
- Filter chip rows scroll horizontally on mobile rather than wrapping to three lines.
- The page body never scrolls horizontally at any width. Tables, wide charts and code get their own `overflow-x` container.
- Forms are single-column below 768 with full-width controls.
- Touch targets ≥ 36px on mobile, never below the WCAG 2.2 24px floor.
- Safe-area insets respected for the bottom tab bar.

---

## 11. Property-specific adaptations

This is where the boards must be translated rather than copied, because their market is not V-RENT's.

### 11.1 Make the property the visual subject

| Surface | Adaptation |
|---|---|
| Listings | Photo-first cards; status chip over the image; **S$/month** in bold blue; bed / bath / sqft spec row with icons; views and enquiries as small figures |
| Dashboard | One spotlight property with a 16:9 photograph and its real metrics, not a row of abstract KPIs |
| Enquiries | Property thumbnail beside the person's avatar, so the row says *who* and *which property* at once |
| Viewings | Time first, then property thumbnail, then person, then status |
| Floor plans | The plan itself is the primary visual, full width; metadata secondary (PDF §6) |
| Neighbourhood | Map and data first, prose second (PDF §6) |
| Compare projects | Keep the table; photographs as column headers rather than text alone |
| Reports | Cover the report with the property image; keep the existing export structure |

### 11.2 Singapore-specific data that must replace the reference vocabulary

| Reference shows | V-RENT must show |
|---|---|
| `$2,500/mo`, `₹25,000/mo` | `S$4,500 / month` |
| Chennai, Bangalore, Hyderabad, Coimbatore | Project name + **District D01–D28** + region (Core Central / City Fringe / Outside Central) |
| `2 Bed · 2 Bath` | `2 bed · 2 bath · 947 sqft` — size matters more in Singapore than the boards allow for |
| *(absent)* | **PSF** — `S$4.75 psf` — a first-class figure on comparison and transaction screens |
| *(absent)* | **CEA registration number and validity** — a trust signal with no equivalent on any board |
| *(absent)* | Tenure (99-year leasehold / freehold), TOP/built year, unit number |
| *(absent)* | MRT proximity, schools, amenities — the OneMap-derived context |
| Bookings, Customers, Check-in/out | **Enquiries → Viewings**; there is no booking object in V-RENT |
| Confirmed / Cancelled / Completed | New / Contacted / Viewing / Closed for enquiries; Active / Pending / Draft / Expired / Rejected for listings |

### 11.3 Trust, which the boards have nothing to say about

V-RENT's differentiator is verified identity — CEA registration checked against the public register. That is the most valuable thing on the screen and it has no reference precedent. It should get a consistent treatment: a verified mark beside the agent's name, the registration number and validity date on the profile, and a clear, non-alarming lapsed state. This is the point where V-RENT stops resembling the reference boards and starts being itself.

---

## 12. DO NOT BRING INTO V-RENT

Only items actually observed in the supplied boards, or directly implied by them.

1. **The Indian-market data model.** `₹`, Chennai/Bangalore/Hyderabad/Coimbatore, `2 BHK`. V-RENT is Singapore. Observed on B2, B6, B7.
2. **Bookings / Customers / Check-in / Check-out.** A short-stay IA that does not exist in V-RENT and would require new routes and new database objects to support. Observed on B2, B6. The PDF is explicit: *"Do not rewrite business logic or create new routes… No new modules are required."*
3. **The heart / save button on an agent's own listing card.** Observed on B1. An agent does not favourite their own listing; it is a tenant-side control pasted onto an agent card.
4. **A card around every individual value.** B2's admin dashboard puts four single numbers in four separate bordered boxes above two more boxes. The PDF names this directly: *"do not put every small value inside a card."*
5. **The large login photograph as a priority.** Observed on B2, B3, B7. It is the least valuable screen in the product and the boards give it the most photography.
6. **Board furniture as product UI.** "Better Rentals. Brighter Lives.", "Simple · Fast · For Everyone", the Web/Tablet/Mobile device icons, the Light Mode / Dark Mode toggle pills at the top of each board. These are presentation chrome for showing a concept, not screens.
7. **Donut as the primary way to read status.** Observed on B1, B3, B4, B5. Five segments in a ring is slower to read than five labelled rows, and the current admin donut already demonstrates the failure mode: the colour ramp makes a neutral distribution look like a pass/fail verdict.
8. **Any status expressed by colour alone.** The boards mostly get this right, but the smaller tiles on B6 and B7 reduce chips to coloured dots with no word. That must not be reproduced.
9. **Text at the sizes the smaller board tiles imply.** Several tiles on B2, B6 and B7 have 8–9px-equivalent labels. Nothing below 11px ships.
10. **Ten or more KPIs across a screen.** B7's agent performance tile pushes toward this. The discipline of 3–4 is what makes the other boards work.
11. **Duplicate charts that rank the same thing twice.** Implied rather than shown — the boards repeat their trend chart across modules. Two panels that order the same listings the same way is one panel's worth of information taking two panels' space.
12. **Any decorative gradient, glow, glass or 3D.** None of the boards actually do this, which is worth recording as a positive constraint: the references are *evidence that restraint reads as premium*. Whatever is built from them should not add what they refused.

---

## 13. Priority matrix

Ranked by patterns, not by images.

### HIGH — should influence the whole product

| Pattern | Why |
|---|---|
| One blue for every interactive element | The single strongest signal across all 7 boards; already V-RENT's primary |
| Hairline-first surface separation, 3 levels | Makes dense operational screens calm; already in the tokens |
| Numeral scale — big figure, small quiet label | The cheapest thing that reads as premium |
| Status chip: colour **and** word, one vocabulary, both portals | Correctness and consistency in one move |
| KPI row capped at 3–4 with soft icon tiles | Forces editorial decisions about what matters |
| Filter chips carrying counts | Productive in the strict sense — the count is data |
| Reduce words per screen; paragraphs become tooltips | The PDF's headline finding and the widest gap to the boards |
| Light/dark as tokens only, same geometry, enforced by test | Already architecturally right; protect it |
| Chart palette separated from status colours | Fixes an active misreading in the admin donut |

### MEDIUM — specific modules

| Pattern | Applies to |
|---|---|
| Photo-first property cards | Listings, Dashboard, Reports, Compare, public surfaces |
| Property thumbnail in activity rows | Enquiries, Viewings, Moderation |
| Detail in a right-hand drawer | Verification, Moderation, Agents, Enquiries |
| Single-series chart with dots + value pill | Performance, Insights, admin Reports |
| Donut with centred total (as a *secondary* view) | Admin Overview, Subscriptions |
| Usage progress bars | Subscription, Dashboard capacity |
| Consistent action-card pattern | Marketing's seven tools |
| Grid/list toggle | Listings |
| Avatar-anchored compact tables | Admin Agents, Subscriptions, Audit |

### LOW — nice to have

Card hover elevation · image `scale(1.02)` on hover · relative timestamps everywhere · kebab menus standardised to one position · date beside the page greeting · login split-screen refinement · sidebar collapse polish.

---

## 14. Reference → V-RENT screen matrix

| V-RENT area | Relevant reference patterns | Priority | Notes |
|---|---|---|---|
| **Agent Dashboard** | B5/B7 agent dashboard; B1 admin overview; KPI row + attention block + one trend + spotlight | HIGH | **Already rebuilt** in this direction — snapshot band, analytics + action centre, property showcase, conversion/rate panels. Remaining: nothing structural. |
| **Listings** | B1 agent listings (strongest single reference); photo-first cards, status over image, chip row with counts, grid/list toggle | HIGH | Biggest visible win available. Consolidate `ListingCard` and `market/PropertyCard` first. |
| **Property Details** | B2 property management rows; PDF "Pattern C" (title+status → key facts → action → visual → secondary) | HIGH | Photography and PSF lead; CEA and tenure in the fact block |
| **Enquiries** | B1 agent enquiries (avatar + property thumbnail + status pill + call/message icons) | HIGH | Add the property thumbnail; move reply into a drawer |
| **Viewings** | B5/B7 viewings (Today / This Week / Calendar; time first) | MEDIUM | Time as the anchor, then property, then person |
| **Performance** | B5 performance (4 metrics, one trend, top-listings bars, 7D/30D/3M/1Y) | MEDIUM | `AreaChart` already has the needed props |
| **Marketing** | B5/B7 marketing grid — icon + short title + status + action | MEDIUM | Seven existing tools, one card pattern. No new tools. |
| **Insights** | B5 insights grid; PDF §6 — Transactions chart+3 numbers, Floor plans plan-first, Neighbourhood map-first | MEDIUM | Do **not** add a funnel; show conversion as rates |
| **Transactions** | B3/B4 reports tables; right-aligned numerals, sparse rows | MEDIUM | Add PSF as a first-class column |
| **Compare Projects** | No direct reference | LOW | Keep the table; photographs as column headers |
| **Floor Plans** | No direct reference; PDF §6 only | MEDIUM | Plan is the hero, full width |
| **Neighbourhood** | **No reference — the boards contain no map** | MEDIUM | Gap recorded, not invented. Follow the PDF: map/data first, text second |
| **Reports** | B3/B4 reports & audit; period + type + export then the report | MEDIUM | Existing print route stays |
| **Account / Subscription** | B5/B7 subscription — plan, price, renewal, usage bars, one Manage action | MEDIUM | Fits one viewport; plan comparison secondary |
| **Profile & CEA** | B5/B7 profile & CEA tabs | MEDIUM | CEA has no reference equivalent — V-RENT's own pattern |
| **Admin Overview** | B1/B3/B4/B5 admin overview | HIGH | Queue directly under the KPI row; donut demoted to secondary; new chart palette |
| **Admin Verification** | B3/B4/B5 verification queue + chips | HIGH | Queue + drawer; the current empty state is already close to the PDF's advice |
| **Admin Moderation** | B3/B4/B5 moderation (thumbnail + issue + severity + age + action) | HIGH | Thumbnail is the missing piece |
| **Admin Agents** | B3/B5/B7 agents table | MEDIUM | Reduce to Agent / Location / Listings / Status / Plan / Action |
| **Admin Subscriptions** | B3/B4/B5 subscriptions (Active / Expiring / Overdue / Revenue + trend + distribution) | MEDIUM | Distribution donut needs the chart palette |
| **Admin Reports & Audit** | B3/B4/B5 reports & audit | MEDIUM | Keep Platform / Audit trail / API activity; tighten event rows |
| **Public / tenant surfaces** | B1 listing cards | MEDIUM | Same card as the agent side, minus agent-only metrics |
| **Auth** | B2/B3/B7 login split-screens | LOW | Modest brand panel; do not let it outweigh the form |

---

## 15. Recommended implementation roadmap

Aligned with the PDF's P0–P4, adjusted for what the audit found already built.

**P0 — Foundation (small, because most of it exists)**
Add the chart palette tokens. Promote `IconTile` into the shared kit. Add `--p1-scrim`. Add a `count` prop to `FilterChips` and a tone/icon prop to `KPI`. Extend `theme-chrome.test.ts` to cover the new tokens. *No visual change ships in this phase.*

**P1 — Consolidation**
Merge `ListingCard` and `market/PropertyCard` into one photo-first card with an agent variant and a tenant variant. This is the highest-leverage change in the whole programme, because that card appears on Listings, Dashboard, Homes, Search, Saved, Shortlists and Reports.

**P2 — High-use screens**
Agent Listings, then Enquiries, then Viewings. Admin Verification and Moderation, applying the existing `Drawer` to both. This is where the visible transformation happens.

**P3 — Analytics**
Admin Overview and Reports & Audit with the new chart palette; Agent Performance and Insights. Apply the §8 chart rules. Audit every existing chart against "one takeaway" and delete the ones that fail.

**P4 — Copy pass**
Walk every screen and convert explanatory paragraphs into tooltips, `HelpTip`s and empty-state one-liners. This is the PDF's single largest scoring gap (Minimal text: 6.8/10) and needs no new components at all.

**P5 — Account and secondary**
Subscription, Profile & CEA, admin Settings.

**P6 — Validation**
Responsive QA at 1440 / 1280 / 1024 / 768 / 390. Keyboard traversal of every queue and drawer. Contrast check of both themes against WCAG 2.2 AA. Every empty, loading and error state rendered, not reasoned about. `prefers-reduced-motion` verified.

---

## Appendix — what this analysis is not confident about

Recorded rather than papered over:

- **One board is missing** (`WA0005`). Conclusions here are drawn from seven of a possible eight.
- **No numeric design value was measured from the images.** All sizes, radii and spacings in sections 4–6 come from the existing tokens and the PDF's 4/8-point recommendation.
- **Motion is entirely inferred.** The references are static and the PDF is silent; section 9 is a proposal, not an extraction.
- **Maps have no reference at all.** Neighbourhood, floor plans and the OneMap surfaces get guidance from the PDF only.
- **The boards' text is partly generated and partly garbled.** No conclusion rests on a label read from a small tile.
- **The scores quoted are the review PDF's** visual/heuristic scores from video recordings. They are not measurements, and the PDF says so itself: they are *"not a formal WCAG conformance audit, usability lab study, performance test or security audit."*

---

## Addendum — what implementation corrected

Written after the first implementation pass (16 September 2026). The sections above are left as written; this records where building against the real code proved them wrong or incomplete, so nobody re-derives the original recommendation from the unamended text.

### A1. "Consolidate the two property cards" (§4.3 item 2, §7, §15 P1) — not done, and should not be

On inspection `listing/ListingCard.tsx` and `market/PropertyCard.tsx` are not duplicates. The first renders a `DemoListing` for its owner — status, health ring, action menu, expiry, modelled traffic. The second renders a `MarketListing` for a tenant — saved state, CEA-verified mark, MRT, deal type. They share a visual idea, not a data model, and merging them would have meant a large refactor across Homes, Search, Saved, Shortlists and the landing rails for no user-visible gain.

What was done instead is what the recommendation was actually for: **one visual language across both.** Both cards now lead with the photograph, carry the status or deal chip over the image, and set the price in bold `--p1-primary`. So do the public detail page, the agent detail page, the public preview, shortlists and the moderation queue.

### A2. "Listing-status donut reads as a verdict" (§6.4, §12 item 7, §13) — wrong for that chart

Listing status genuinely has valence: *rejected* is bad and *published* is good, so status colours are the right encoding there, and the admin overview and reports donuts were left as they were. The categorical ramp belongs on charts whose categories carry no valence. The real instance of the bug was **revenue by plan**, where one plan was painted `--p1-success` for no reason; both plan donuts now use the ramp.

### A3. The chart palette (§5.4, §6.4)

Not invented here. It is the first five steps of the palette the Insights module already validated (OKLCH lightness band, chroma floor, adjacent-pair separation under deuteranopia, protanopia and tritanopia, 3:1 against the surface), declared on `.p1` as `--p1-chart-1..5`. It could not simply alias the Insights tokens, because those are declared on a scoped descendant (`.p1-ins`) and custom properties only inherit downward.

One step was changed. Light `--p1-chart-2` was `#D97706`, which is byte-identical to `--p1-warning`, so a plan segment rendered in exactly the colour of the "Past due" chip beside it. It is now `#C2620A`, re-run through the validator: all checks pass. For the five-step subset the worst adjacent pair improves (ΔE 12.5 → 14.3 deutan); across the full six-step Insights ramp the binding pair is a different one, so there the change is neutral on separation and justified by the semantic collision alone. The Insights module adopted the same step.

`tests/theme-chrome.test.ts` now enforces four things: every step exists in both themes, clears 3:1 against its own surface, differs between themes, and never equals a status colour. That last test is what found the collision.

### A4. Things this document assumed were missing that already existed

- `FilterChips` already carried counts (§2 I, §7). The change it needed was the selected state: near-black → the primary blue.
- The light-mode black navigation (§6.1) was already fixed and guarded.
- `PresenterNote` was already a collapsed `<details>` (§4.3 item 5). The "What is real here" blocks were **kept on purpose**: they disclose what is prototype and what is live, and the "minimal text" advice is aimed at redundant helper copy, not at honest scope statements.

### A5. Found during QA, not anticipated here

- **Entrance animations retained their last frame.** `.p1-drawer`, `.p1-panel`, `.p1-sheet` and `.p1-overlay` used `animation-fill-mode: both`. A retained `transform: none` is still a transform, so an open drawer became the containing block for any `position: fixed` descendant. Menus and tooltips portal to the body and escaped, but any later child that does not portal would have opened in the wrong place. All four now use `backwards`.
- **Listings used `role="tab"` to filter.** A tablist with no tabpanels is incorrect semantics for narrowing one set; it is now `FilterChips` (pressed buttons in a group), which is also the reference pattern.
- **Card grid slack.** The price row's `mt-auto` opened a hole mid-card whenever a neighbour was taller. The slack now falls below the last line, where it reads as padding.
