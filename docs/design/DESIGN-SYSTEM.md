# V-RENT design system

The rules every screen under `/phase1` follows. Tokens live in `app/globals.css` under
`.p1`; components live in `components/phase1/ui` and are imported from
`components/phase1/kit`.

## Direction

**Premium, trustworthy, calm, modern, fast.** A property platform first, with
operational screens for agents and staff behind it.

- The public marketplace leads with photographs, price and location.
- The agent workspace is an efficient inventory tool that says what needs doing.
- The operations console is dense and table-first. Its navy chrome keeps staff
  from mistaking it for the agent side.

The design avoids glow, heavy gradients, glassmorphism, decorative charts,
paragraphs under every title, and continuous animation.

## Audit of the proof of concept (before)

| Problem | Where | Fix |
| --- | --- | --- |
| 27 navigation links in 7 groups, 256px dark band | Shell | 7 primary items, two collapsible groups, icon rail at 1024px |
| Same fact repeated: "Verified" ×3, quota ×3 on one screen | Dashboard | Each fact appears once, and account standing shows only when it blocks something |
| Eyebrow, breadcrumb and description above every title | Every page | Title only; context moves to the header crumb on deep pages |
| KPI strip repeating the status-chip counts | Listings | Removed; the counts live on the status tabs |
| Pill-shaped buttons everywhere, petrol and gold competing | Kit | 10px radius, one blue for action |
| Seven-step wizard with a false "Draft saved" badge | Create listing | Five steps, an honest on-device autosave |
| Generated skyline art at the size of a photograph | Cards | A calm placeholder that says photos are coming, sized down |
| No tenant-facing marketplace at all | — | `/phase1/homes`: home, search with map, property detail, agent profile |
| Status as a paragraph | Application status | Timeline with the current step and the next action |
| Queue as a stack of large cards | Verification, moderation | Queue list and a review workspace side by side |

## Tokens

### Colour

| Role | Light | Dark |
| --- | --- | --- |
| Background | `#F7F8FA` | `#0B1220` |
| Surface | `#FFFFFF` | `#111827` |
| Elevated | `#FFFFFF` | `#172033` |
| Primary | `#2563EB` | `#60A5FA` |
| Text | `#111827` | `#F8FAFC` |
| Secondary text | `#667085` | `#94A3B8` |
| Border | `#E5E7EB` | `#263247` |
| Success / Warning / Error / Info | `#059669` `#D97706` `#DC2626` `#0284C7` | `#34D399` `#FBBF24` `#F87171` `#38BDF8` |

Amber (`accent`) is reserved for *Featured* and the cover photograph. Status
colour is never the only signal: every status carries an icon and a label.

### Type

Inter, one family.

| Use | Size / weight |
| --- | --- |
| Page title | 28–30px / 600, -0.02em |
| Section title | 16–18px / 600 |
| Body | 14–15px / 400 |
| Small | 12–13px |
| Button | 14px / 500–600 |
| Numbers | tabular figures wherever values are compared |

### Spacing, radius, elevation

- Spacing: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64.
- Radius: 6 (inputs in dense rows, badges) · 10 (buttons, inputs) · 14 (cards) ·
  20 (property cards on public pages, dialogs).
- Elevation: a hairline border on a surface by default. `shadow-p1-md` only for
  something that floats: menus, hovered property cards, the sticky enquiry panel.

### Motion

| Token | Value | Used for |
| --- | --- | --- |
| `--p1-fast` | 140ms | hover, press, colour changes |
| `--p1-normal` | 200ms | menus, the nav indicator, tabs, badges |
| `--p1-slow` | 360ms | drawers, gallery transitions, chart entry |
| `--p1-ease` | `cubic-bezier(.2,.8,.2,1)` | everything that arrives |

Every animation answers one question: where did this come from, what changed,
what can I interact with, or what happened. Nothing loops. Everything stops
under `prefers-reduced-motion`.

### Z-index

Sticky 20 · header 40 · overlay 100 · toast 120.

### Breakpoints

Tailwind defaults. The layouts that change shape:

| Width | Shell | Tables | Search | Property detail |
| --- | --- | --- | --- | --- |
| ≥1280 | full sidebar | table | list + map split | sticky enquiry panel |
| 1024–1279 | icon rail | table | list + map split | sticky enquiry panel |
| 768–1023 | drawer + bottom nav | table, fewer columns | list, map toggle | panel below |
| <768 | drawer + bottom nav | cards | list, map toggle | sticky bottom CTA |

## Components

From `components/phase1/kit`: `Button`, `LinkButton`, `IconButton`, `TextInput`,
`SelectInput`, `SearchInput`, `Checkbox`, `Toggle`, `Segmented`, `Badge` (`Pill`),
`StatusBadge`, `Avatar`, `Card`, `SectionCard`, `PageHeader`, `KPI`, `Metric`,
`Tabs`, `FilterChips`, `DataTable`, `Pagination`, `Menu`, `Tooltip`,
`Skeleton*`, `EmptyState`, `ErrorState`, `Stepper`, `Timeline`, `AreaChart`,
`CountUp`.

Overlays (`components/phase1/overlays`): `Dialog`, `ConfirmDialog`, `Drawer`.
Toasts (`components/phase1/Toast`).

Marketplace (`components/phase1/market`): `PropertyCard`, `PropertyGallery`,
`MapPanel`, `SaveButton`, `MarketHeader`.
