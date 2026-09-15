# V-RENT Phase 1 Dashboard UX Specification

## 1. Dashboard Goal

**Purpose**: Command center for real estate agents to manage their rental listings and respond to tenant enquiries in Singapore. Every element serves a single workflow: scan position → understand what needs attention → take action. Nothing is decorative.

**Success Metric**: Agent can identify and act on the top 3 things requiring their attention within 10 seconds of landing on dashboard.

---

## 2. Agent's Most Important Jobs-to-Be-Done (JTBD)

Ordered by frequency and consequence:

### JTBD 1: "Respond to tenant enquiries" (Daily, high urgency)
- See new/unread enquiries count immediately
- Understand which property was enquired about
- Reply via WhatsApp, call, or email without leaving dashboard
- Mark as replied, archive, or prioritize

**Pain Point**: Missing enquiries = lost tenants  
**Success Indicator**: Response time <2 hours

### JTBD 2: "Ensure listings stay live and compliant" (Daily, high consequence)
- Know active vs. paused listings count
- Spot listings expiring soon (30, 7, 1 day warnings)
- See rejected listings and fix them
- Confirm CEA registration is current
- Verify payment method is valid

**Pain Point**: Listings going offline unexpectedly = lost revenue  
**Success Indicator**: No surprise expirations or moderation rejections

### JTBD 3: "Maximize rental yield" (Weekly, medium urgency)
- See which listings perform best (views, enquiries)
- Identify underperforming listings (health score)
- Decide when to renew vs. pause
- Track weekly trends (views up/down)

**Pain Point**: Wasted quota on weak listings  
**Success Indicator**: Conversion rate ≥5% (tenant inquiries per 100 views)

### JTBD 4: "Know my account status" (On-demand, low urgency)
- Current quota used vs. plan limit
- Plan name and renewal date (if applicable)
- Billing status (payment due?)
- Profile completeness

**Pain Point**: Account surprises (quota full, payment failed)  
**Success Indicator**: Agent knows quota availability before creating

### JTBD 5: "Create & manage listings" (Weekly, medium urgency)
- Quick access to create new listing
- See all listings at a glance with status
- Navigate to edit/publish/manage any listing

**Pain Point**: Unclear which listings need attention  
**Success Indicator**: Can jump to a specific listing in <3 clicks

---

## 3. Above-the-Fold Hierarchy

Everything agent sees without scrolling on desktop (≤1200px height):

```
┌──────────────────────────────────────────────────────────────────┐
│ SECTION 1: PAGE HEADER                                           │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ [Greeting] "[Agent Name]"                                 │  │
│ │ [Today's date] — "[Status summary]"  [Primary CTA] [+CTA] │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ SECTION 2: KPI STRIP (6 Cards, Horizontal Scroll on Mobile)   │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────┐         │
│ │ Active   │ Drafts   │ Expiring │ Enquiries│ Views/7d │ Conv.%  │
│ │ 5/12     │ 2        │ 1        │ 2 🔴     │ 482 ↑12% │ 4.8%    │
│ └──────────┴──────────┴──────────┴──────────┴──────────┴─────────┘
│                                                                   │
│ SECTION 3: ACTION CENTER (Left Col) & INSIGHTS (Right Col)     │
│ ┌──────────────────────────────┬────────────────────────────┐   │
│ │                              │                            │   │
│ │ NEEDS YOU (1 action)         │ THIS WEEK (Insight)        │   │
│ │ ┌────────────────────────────┤ ┌──────────────────────────┤   │
│ │ │ ⚠️ 2 enquiries need reply  │ │ 💡 Your Bukit Merah      │   │
│ │ │ 2 tenants haven't heard   │ │ unit is hot—high traffic  │   │
│ │ │ back in 48 hours          │ │ but low conversion        │   │
│ │ │ [Open Enquiries]          │ │ [Optimize Listing →]     │   │
│ │ └────────────────────────────┤ └──────────────────────────┤   │
│ │                              │ WEAKEST LISTINGS          │   │
│ │ READY TO PUBLISH?           │ ┌──────────────────────────┤   │
│ │ ┌────────────────────────────┤ │ ⬇️ 32 Jln Rajah (health  │   │
│ │ │ ✓ CEA registered          │ │ │ 52%)                    │   │
│ │ │ ✓ Payment method valid     │ │ │ Missing: floorplan      │   │
│ │ │ ✓ Listings reviewed        │ │ └──────────────────────────┤   │
│ │ │ ✓ Photos added            │ │ BEST PERFORMER          │   │
│ │ │ ✓ Prices set              │ │ ┌──────────────────────────┤   │
│ │ └────────────────────────────┤ │ ⬆️ Pinnacle Duxton 28-F   │   │
│ │                              │ │ 14 enquiries, 128 views   │   │
│ │                              │ └──────────────────────────┤   │
│ │                              │ QUOTA PROGRESS            │   │
│ │                              │ ┌──────────────────────────┤   │
│ │                              │ │ 5 / 12 active (58%)      │   │
│ │                              │ │ [Progress bar] Premium   │   │
│ │                              │ └──────────────────────────┤   │
│ └──────────────────────────────┴────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**Visible on first load** (no scroll):
- Greeting + status summary
- All 6 KPI metrics (may scroll horizontally on mobile)
- Action Center (what needs attention)
- Insights panel (what to watch)
- Quota status

---

## 4. Primary CTA (Call-to-Action)

**Placement**: Page header, top-right  
**Label**: "Create listing"  
**Style**: Primary button (filled, dominant color)  
**Icon**: Plus icon  
**Action**: `/phase1/listings/new`  
**Rationale**: Agents want to add listings. Easy discovery = more quota utilization.

**Secondary CTA**: "Import listings"  
**Style**: Outline button  
**Icon**: Upload icon  
**Action**: `/phase1/listings/import`  
**Rationale**: Power users can bulk import; doesn't clutter primary flow.

---

## 5. Secondary Actions

Listed by priority and placement:

| Action | Placement | Trigger | Link |
|--------|-----------|---------|------|
| Open Enquiries | Action Center (needs-you section) | New unread enquiries exist | `/phase1/enquiries` |
| Fix Payment | Action Center (danger tone) | Subscription past_due | `/phase1/checkout` |
| Verify CEA | Action Center (danger tone) | CEA registration lapsed | `/phase1/status` |
| Correct Listing | Action Center (per rejected listing) | Listing rejected | `/phase1/listings/new?edit={id}` |
| Add Photos | Action Center (per draft with no images) | Draft has 0 images | `/phase1/listings/new?edit={id}&step=media` |
| Review Expiring | Action Center (per expiring listing) | ≤30 days to expiry | `/phase1/listings/{id}` |
| Full Performance Report | Metric strip or perf. card | Agent clicks "View all" | `/phase1/performance` |
| All Listings | Recent/weakest sections | Agent clicks "View all" | `/phase1/listings` |
| Edit Listing | Recently updated / context menu | Agent clicks listing row | `/phase1/listings/{id}` |
| Change Plan | Quota card | Agent wants different quota | `/phase1/plans` |

---

## 6. KPI / Metric Strategy

**Metrics Shown** (in this exact order):

1. **Active Listings** (left-most)
   - Display: `X / Y` (active / plan limit)
   - Icon: Building2
   - Link: Filter to active listings (`/phase1/listings?status=published`)
   - Tone: Danger if ≥ plan limit, default otherwise
   - Hint: "Z slots left" or "No plan yet"
   - **Why**: Agent needs to know quota availability before creating

2. **Drafts**
   - Display: `N` (count of draft listings)
   - Icon: CircleDashed
   - Link: Filter to drafts (`/phase1/listings?status=draft`)
   - Tone: Default (not urgent)
   - Hint: "Not submitted"
   - **Why**: Agent should know if they have incomplete work

3. **Expiring Soon**
   - Display: `N` (listings expiring in ≤30 days)
   - Icon: CalendarClock
   - Link: Filter to published/expiring listings
   - Tone: Warning if N > 0, default otherwise
   - Hint: "Within 30 days"
   - **Why**: Early warning to prevent accidental offline listings

4. **New Enquiries**
   - Display: `N` (count of new/unread enquiries)
   - Icon: MessageSquare
   - Link: Enquiries inbox (`/phase1/enquiries`)
   - Tone: Info if N > 0, default otherwise
   - Hint: "Awaiting reply"
   - **Why**: Most time-sensitive job-to-be-done; top priority

5. **Views, Last 7 Days**
   - Display: `N` (formatted with thousand separator)
   - Icon: Eye
   - Link: Full performance report (`/phase1/performance`)
   - Delta indicator: ↑/↓ % week-on-week with label "week on week"
   - Tone: Default (informational)
   - Hint: "All live listings"
   - **Why**: Key health metric; agent wants to see if portfolio is gaining traction

6. **Enquiry Rate**
   - Display: `X%` (enquiries per 100 views)
   - Icon: Percent
   - Link: Full performance report
   - Tone: Success (≥5%), default (3–5%), warning (<3%)
   - Hint: "Per 100 views"
   - **Why**: Conversion metric; tells agent if listings are attracting qualified tenants

**Responsive Behavior**:
- **Desktop (≥1200px)**: All 6 metrics visible, 6 columns
- **Tablet (768–1200px)**: All 6 metrics visible, 3 columns (2 rows)
- **Mobile (<768px)**: Horizontal scroll strip, show 3 at a time, scroll to reveal next 3

**Interaction**:
- Click any metric to navigate to relevant section
- Hover shows tooltip (optional)
- No drilling down from metric itself (keep KPI strip lightweight)

---

## 7. Action Center ("Needs You" Section)

**Purpose**: Surface high-consequence items that require agent action, ordered by severity.

**Title**: "Needs you"  
**Subtitle** (if actions exist): "{N} item(s), most consequential first"  
**Subtitle** (if empty): None

**Structure**: Vertical list, full-width on mobile, left column on desktop

**Items** (in this order of severity):

### Danger (Must act today)
1. **CEA Registration Lapsed**
   - Icon: ShieldAlert (red)
   - Title: "Your CEA registration has lapsed"
   - Why: "Publication is paused until the public register shows a valid registration."
   - CTA: "Open verification" → `/phase1/status`

2. **Payment Failed**
   - Icon: CreditCard (red)
   - Title: "Renewal payment failed"
   - Why: "Listings stay live during the grace period. Update the payment method before it ends."
   - CTA: "Fix payment" → `/phase1/checkout`

3. **Listing Rejected**
   - Icon: Gavel (red)
   - Title: "{Property} {Unit} was rejected"
   - Why: "{Reason}" (e.g., "Missing required floorplan")
   - CTA: "Correct it" → `/phase1/listings/new?edit={id}`
   - **Note**: Show once per rejected listing; most recent first

### Warning (Act soon)
4. **New Enquiries Waiting**
   - Icon: MessageSquare (yellow)
   - Title: "{N} enquiry/enquiries waiting for a reply"
   - Why: "Tenants who enquired in the last two days have not heard back."
   - CTA: "Open enquiries" → `/phase1/enquiries`
   - **Threshold**: Only show if N > 0

5. **Draft Has No Photos**
   - Icon: Camera (yellow)
   - Title: "{Property} {Unit} has no photographs"
   - Why: "A listing without photos cannot be published and gets almost no enquiries."
   - CTA: "Add photos" → `/phase1/listings/new?edit={id}&step=media`
   - **Threshold**: Only show for drafts where images === 0

6. **Listing Expiring Soon**
   - Icon: CalendarClock (yellow or red depending on days left)
   - Title: "{Property} {Unit} expires in {N} days"
   - Why: "It comes off the tenant site on expiry and releases its quota slot."
   - CTA: "Review" → `/phase1/listings/{id}`
   - **Thresholds**:
     - 1–7 days left: Danger tone (red icon)
     - 8–30 days left: Warning tone (yellow icon)
   - **Note**: Show once per expiring listing; soonest first

### Info (Monitor)
7. **Listing Under Review**
   - Icon: Gavel (blue)
   - Title: "{Property} {Unit} is with a moderator"
   - Why: "Usually reviewed within one business day. No action needed from you."
   - CTA: "View" → `/phase1/listings/{id}`
   - **Note**: Informational only; shows progress

**Empty State** (if no actions):
- Icon: Check (green)
- Title: "Nothing outstanding"
- Subtitle: "Every listing is healthy and your account is in order."
- No CTA

**Visual Design**:
- Background: White card with subtle border
- Padding: None (full-width list)
- Dividers: Horizontal line between items
- Each item: flex row, left-to-right
  - Dot (color-coded: red/yellow/blue) — tiny 2×2px circle, left-aligned
  - Icon (15px) — specific to action type
  - Content (flex-1): title (14px semibold) + why (13px regular, muted color)
  - CTA button (shrink-0) — variant depends on tone (danger = primary button, warning/info = outline)
- Mobile: Stack vertically; button full-width on narrow screens

**Interaction**:
- Click anywhere on row → navigate to action (except button click)
- Hover: subtle background change (bg-neutral/60)
- Button: Standard button hover effect

---

## 8. Listing Overview ("Ready to Publish?" Gate)

**Purpose**: Quick checklist showing if listings can be published. Acts as pre-flight check.

**Title**: "Ready to publish?"  
**Subtitle**: "Every listing must pass these five checks before it goes live."  
**Status Badge** (top-right): 
- If all pass: ✓ Green badge "All checks passed"
- If any fail: ✗ Red badge "Action needed"

**Checks** (5 items in this order):

1. **CEA Registration Valid**
   - Icon: ✓ or ✗ (green or red circle)
   - Label: "CEA Registration"
   - Detail: "Your agent license is current in the public register."
   - Action (if fail): Link to `/phase1/status` (Fix)

2. **Payment Method Valid**
   - Icon: ✓ or ✗
   - Label: "Payment method"
   - Detail: "Billing account is active and not past due."
   - Action (if fail): Link to `/phase1/checkout` (Fix)

3. **Moderation Approval**
   - Icon: ✓ or ✗
   - Label: "Moderation review"
   - Detail: "No listings rejected for policy violations."
   - Action (if fail): Link to nearest rejected listing (Fix)

4. **Photos Uploaded**
   - Icon: ✓ or ✗
   - Label: "Photos added"
   - Detail: "All draft listings have at least one photo."
   - Action (if fail): Link to listings page filtered to drafts (Fix)

5. **Pricing Set**
   - Icon: ✓ or ✗
   - Label: "Pricing configured"
   - Detail: "All listings have rent amount and lease term specified."
   - Action (if fail): Link to listings page (Fix)

**Visual Design**:
- Background: White card
- Padding: None (list items only)
- Dividers: Horizontal line between checks
- Each check: flex row
  - Colored circle (green/red, 24px) with icon (✓/✗, 13px)
  - Content (flex-1): label (14px semibold) + detail (13px, muted)
  - Action link (shrink-0, if fail) — 13px text link "Fix"
- Mobile: Stack vertically

**Interaction**:
- Click row → navigate to fix action (if fail)
- Hover: no effect (read-only status display)

---

## 9. Listing Performance

**Placement**: Main content area, below gates  
**Visibility**: Only show if ≥1 published listing exists  
**Title**: "Listing performance"  
**Subtitle**: "Last 7 days across everything live"  
**Action Link** (top-right): "Full report →" (`/phase1/performance`)

**Layout**: 2-column on desktop, 1 column on mobile

### Column 1: Trend Chart (≈200px wide on desktop)
- **Label**: "Views, 14 days"
- **Chart**: Bar chart (sparkline-style), 14 bars for 14 days
- **Height**: 72px
- **Stats below**:
  - Enquiries, 7d: `{N}` (bold)
  - Saves, 7d: `{N}` (bold)
- **Intent**: Show portfolio health at a glance; tap to drill into full report

### Column 2: Top Performers (flex-1)
- **Label**: "Enquiries by listing"
- **Chart**: Horizontal bar chart, top 4 listings by enquiries in last 7 days
- **Each bar**:
  - Label: "{Property} {Unit}"
  - Hint: "{District name}" (gray, smaller)
  - Value: "{N} enquiries" (bold, right-aligned)
- **Intent**: Identify which listings are working; which need attention

**Visual Design**:
- Background: White card
- Padding: 20px
- Charts: Use existing chart components (MiniBars, HBars)
- Typography: 12.5px labels, 13px values, 12.5px hints
- Color: Use consistent color palette (charts should match brand)

**Interaction**:
- Click chart → navigate to `/phase1/performance`
- Click any bar → navigate to listing detail
- Hover: tooltip (optional) shows full numbers

---

## 10. Recently Updated (Listing Carousel)

**Placement**: Main content, bottom of left column  
**Title**: "Recently updated"  
**Action Link**: "All listings →" (`/phase1/listings`)

**Structure**: Vertical list, top 5 listings sorted by last update time (newest first)

**Each Row**:
- Property thumbnail (photo + name): "{Project} {Unit}"
- Subtext: "{Unit} · ${Price} {PSF} · {District}"
- Inline stats (hidden on mobile): "{Views}, {Enquiries}" (if published)
- Health ring (34px, hidden on small screens)
- Status badge (compact)
- Context menu (⋯) with action options

**Visual Design**:
- Background: White card, no padding (list items only)
- Dividers: Horizontal line between rows
- Hover: subtle background change
- Mobile: Hide stats, hide health ring; show full-width

**Interaction**:
- Click property cell → `/phase1/listings/{id}`
- Click status badge → dialog or navigate
- Click context menu → action dropdown

**Empty State** (if no listings):
- Icon: Empty (no listings illustration)
- Title: "No listings yet"
- Subtitle: "Create your first rental listing to get started."
- CTA: "Create listing" → `/phase1/listings/new`

---

## 11. Insights Panel ("This Week" Card)

**Placement**: Right column, top (desktop only; moves below action-center on mobile)  
**Visibility**: Only show if agent has publishable listings

**Content**: Dynamic insight generated by `weeklyInsight()` function

**Structure**:
- Background: Accent color (light, e.g., blue-tinted)
- Padding: 16px
- Left icon: Lightbulb (18px)
- Content:
  - Label (12px bold): "This week"
  - Headline (14.5px bold): "{Insight headline}"
  - Detail (13px regular): "{Insight detail explanation}"
  - CTA Button (if applicable): Optional action link

**Examples of Insights** (generated dynamically):
- "Your Bukit Merah unit is attracting attention but not converting—consider adding a virtual tour"
- "Marina Bay listings are hot this week—you have 3 in that area with good demand"
- "Views are down 20% week-over-week; consider refreshing photos or lowering rent"

**Visual Design**:
- Color: Soft accent background (#E8F0FF or similar)
- Text color: Standard text (dark) for headlines, muted for detail
- Icon color: Accent color

**Interaction**:
- Click headline or CTA → navigate (if href exists)
- No hover effect (informational only)

---

## 12. Sidebar Panels (Right Column on Desktop)

**Placement**: Right side, 340px wide (desktop only)  
**Mobile**: Stack below main content; full-width

**Panels** (in this order):

### Panel 1: Weakest Listings
- **Title**: "Weakest listings"
- **Subtitle**: "Lowest Listing Health"
- **Content**: Top 3 listings by lowest health score
- **Each item**:
  - Health ring (34px)
  - Property name (13.5px bold)
  - Missing info hint (12.5px, muted)
  - Chevron (16px, right)
- **Link**: Click row → `/phase1/listings/{id}`
- **Hover**: Subtle background change

### Panel 2: Best Performer
- **Title**: "Best performer"
- **Subtitle**: "Most enquiries this week"
- **Visibility**: Only if ≥1 published listing
- **Content**:
  - Property thumbnail + name
  - District name
  - Stat line (13px): "{N} enquiries · {M} views"
  - Pulse indicator (sparkline, optional)
- **Link**: Click → `/phase1/listings/{id}`

### Panel 3: Quota Progress
- **Title**: "Quota"
- **Content**:
  - Large number (24px): "{Active} / {Limit}"
  - Plan name pill (danger/warning/neutral tone)
  - Progress bar (if limit > 0)
  - Help text (if no plan)
- **Link**: "Change plan" → `/phase1/plans`
- **Tone**:
  - Danger: ≥100% used
  - Warning: 80–99% used
  - Default: <80% used

**Visual Design**:
- Each panel: White card
- Padding: Varies (sm for simple, none for lists)
- Dividers: Between list items
- Spacing: 16px gap between panels

---

## 13. Recommended Navigation Emphasis

### Primary Nav (Always Visible)

**Desktop Sidebar** (Recommended, not shown in spec but referenced):
```
Logo
├─ Dashboard (current)
├─ Listings
├─ Enquiries
├─ Profile
└─ Help
```

**Mobile Bottom Nav** (Recommended, not shown):
```
Dashboard | Listings | Enquiries | Profile
```

### In-Dash Navigation Cues

- **Metric cards**: All link to relevant filters/sections
- **Action center**: Each action links to required workflow
- **"View all" links**: Consistently placed top-right of sections
- **Context menus**: Available on listing rows for quick actions

---

## 14. Responsive Behavior

### Desktop (≥1200px)
- **Layout**: 2-column (main content + right sidebar)
- **Metrics strip**: 6 columns (horizontal, no scroll)
- **Main section**: Full-width list (action center, performance, recent)
- **Sidebar**: Fixed 340px width, stacks panels vertically
- **Performance card**: 2-column (chart left, bars right)

### Tablet (768–1200px)
- **Layout**: 1-column (stack everything vertically)
- **Metrics strip**: 3 columns (2 rows, no scroll)
- **Main section**: Full-width
- **Sidebar**: Moves below main content; full-width
- **Performance card**: 1-column (chart, then bars)

### Mobile (<768px)
- **Layout**: 1-column
- **Metrics strip**: Horizontal scroll, show 3 at a time
- **All sections**: Full-width
- **Cards**: Padding reduced; padding: 12px
- **Lists**: Padding reduced to 12px; hide secondary info (stats, health rings)
- **Performance card**: Chart only (bars may be hidden or scrollable)
- **Context menu**: Icon button (⋯) instead of dropdown
- **Buttons**: Full-width CTAs; reduce font size to 13px

### Touch/Interaction
- **Tap targets**: Minimum 44px (desktop 40px)
- **Spacing**: Increased on mobile (16px gaps minimum)
- **Overflow**: No horizontal scroll except metrics strip
- **Swipe**: Not required for Phase 1

---

## 15. Loading / Empty / Error States

### Loading State

**Initial Page Load**:
- Skeleton loaders for KPI cards
- Skeleton for action center (3 placeholder rows)
- Skeleton for sidebar panels
- No blocking; show what's available immediately

**Async Data** (Performance chart, insights):
- Show placeholder while loading (gray bar or shimmer)
- Don't block page interaction
- Show data as soon as available (stream in)

**Code**:
```tsx
{loading && <Skeleton />}
{!loading && data && <Component {...data} />}
{error && <ErrorState />}
```

### Empty States

**No Listings**:
- **Context**: Dashboard loads, but agent has 0 listings
- **Icon**: Empty inbox or building illustration
- **Title**: "No listings yet"
- **Subtitle**: "Create your first rental listing to get started."
- **CTA**: "Create listing" button (primary)
- **Placement**: Main content area (replace action center & performance)

**No Enquiries**:
- **Context**: Agent has listings but no new enquiries
- **Metrics**: Show 0 in "New Enquiries" KPI card
- **Dashboard**: Continue to show, no special state needed

**No Active Plan**:
- **Context**: Agent hasn't subscribed to any plan
- **Quota card**: Show "No plan is active, so no quota is allocated. These listings cannot be published yet."
- **CTA**: "Choose a plan" → `/phase1/plans`

**No Performance Data**:
- **Context**: Listings are very new, no traffic yet
- **Performance card**: Hide entirely (only show if ≥1 published listing with data)

### Error States

**Failed to Load Dashboard**:
- **Message**: "Unable to load dashboard. Please refresh or check your internet connection."
- **Icon**: Error icon (⚠️)
- **CTA**: "Refresh page"
- **Placement**: Full-screen, centered
- **Fallback**: Retry every 30 seconds automatically

**Listing Load Error**:
- **Context**: Recently updated section fails to load
- **Message**: "Unable to load your listings."
- **CTA**: "Try again"
- **Placement**: In section, not full-screen

**Metrics Unavailable**:
- **Context**: Specific metric data fails (e.g., performance API down)
- **Display**: Show "—" (dash) instead of number
- **Tooltip** (hover): "Data temporarily unavailable"
- **Tone**: Default (not error, since rest of dashboard works)

---

## 16. Micro-Interactions

### Hover States

**Metric Cards**:
- Background: Subtle shadow or border change
- Cursor: Pointer
- Icon: Slight color shift (default → accent)

**Action Center Rows**:
- Background: `bg-neutral/60` (subtle)
- No transition jump (immediate)

**Listing Rows**:
- Background: `bg-subtle/60`
- Transition: 150ms ease

**Buttons**:
- Primary: Darker shade on hover
- Outline: Border color change to darker
- Link: Text underline on hover

### Click Feedback

**All Links/Buttons**:
- No loading delay visible (instant navigation in most cases)
- If loading >500ms, show loading spinner inline
- No page blink/flicker

**Action Modals** (if used):
- Slide in from right or bottom (platform dependent)
- Overlay: Transparent dark background
- Close: ESC key or close button

### Badge Animations (Optional, Phase 2)

**Enquiry Badge**:
- New enquiry arrives → subtle pulse animation (2 cycles)
- Fade out after 3 seconds
- Still shows count, just visual indicator of newness

### Transitions

**Page Navigation**:
- No transition (instant page load)
- If needed, fade in content (200ms)

**Card Expansion** (if expanding details):
- Smooth height change (300ms)
- Icon rotation (arrow up/down)

---

## 17. Information That Should NOT Be Shown

**Do NOT include**:

- **Tenant names or contact info** on dashboard (privacy; only in enquiries section)
- **Full property addresses** as thumbnails (just "Project Unit" is enough)
- **Agent commission rates** (belongs in account settings, not dashboard)
- **System-level metrics** (page load time, API latency, DB stats)
- **Marketing cruft** (upsell banners, "upgrade now" nags, testimonials)
- **Onboarding tooltips** (use help center, not dashboard)
- **Social media links** (not relevant to agent workflow)
- **Sample data when not in demo mode** (confusing; clearly label demo data)
- **Predicted metrics** (e.g., "estimated next month's views"); only show actual data
- **Feature announcements** (use email or separate help section)

---

## 18. Recommended Component Structure

### Layout Components (from phase1/kit)
```
PageHeader
  ├─ Eyebrow (date)
  ├─ Title (greeting + name)
  ├─ Description (status summary)
  └─ Actions (primary + secondary CTA)

MetricStrip
  ├─ Metric (active)
  ├─ Metric (drafts)
  ├─ Metric (expiring)
  ├─ Metric (enquiries)
  ├─ Metric (views)
  └─ Metric (conversion)

Grid (2-column layout)
  ├─ Column 1 (main)
  │  ├─ SectionCard (needs-you)
  │  ├─ SectionCard (ready-to-publish)
  │  ├─ SectionCard (performance)
  │  └─ SectionCard (recently-updated)
  └─ Column 2 (sidebar)
     ├─ Card (insight)
     ├─ SectionCard (weakest)
     ├─ SectionCard (best)
     └─ Card (quota)
```

### Data Components
```
ActionRow (from actions[])
  ├─ Tone indicator (dot)
  ├─ Icon
  ├─ Content (title + why)
  └─ CTA button

GateRow (from gate[])
  ├─ Status indicator (✓/✗)
  ├─ Content (label + detail)
  └─ Fix link (if fail)

ListingRow
  ├─ PropertyCell (photo + name)
  ├─ Stats (views, enquiries)
  ├─ HealthRing
  ├─ StatusBadge
  └─ Menu (actions)

Chart (Performance)
  ├─ MiniBars (14-day trend)
  └─ HBars (top 4 performers)

HealthRing (visual indicator)
  ├─ Circular progress
  └─ Score label
```

---

## 19. Visual Hierarchy

### Color Usage

**Text Hierarchy**:
- **Level 1 (Hero)**: 24px, bold, primary text (`p1-text`)
- **Level 2 (Section title)**: 16px, bold, primary text
- **Level 3 (Subsection)**: 14px, semi-bold, primary text
- **Level 4 (Body)**: 13–14px, regular, primary text (`p1-text`)
- **Level 5 (Hint/Meta)**: 12.5px, regular, muted text (`p1-text-2`)
- **Level 6 (Help text)**: 11.5px, regular, very muted (`p1-text-3`)

**Status Colors**:
- **Danger** (urgent, red): CEA lapsed, payment failed, rejection, quota full
- **Warning** (soon, yellow): Expiring soon, new enquiries, missing photos
- **Success** (good, green): Checks passed, conversion rate healthy
- **Info** (neutral, blue): Listing under review, quota mid-range
- **Accent** (insight, blue-ish): "This week" insight card

**Tones**:
- `p1-text`: Primary black/near-black
- `p1-text-2`: Muted gray (secondary content)
- `p1-text-3`: Very muted gray (tertiary, help text)
- `p1-border`: Divider lines (light gray)
- `p1-subtle`: Light background (hover states)
- `p1-accent`: Brand accent (insights, highlights)

### Spacing

**Vertical**:
- Section gap: 20px (desktop), 16px (mobile)
- Card padding: 20px (desktop), 16px (mobile), 12px (compact)
- Row padding: 16px (desktop), 12px (mobile)
- Item spacing within list: 0 (dividers provide separation)

**Horizontal**:
- Content padding: 24px (desktop), 16px (tablet), 12px (mobile)
- Column gap: 24px (desktop), 16px (tablet), 0 (mobile)
- Sidebar width: 340px (desktop only)

### Typography

**Fonts**:
- **Body**: System font stack (SF Pro, Segoe UI, etc.)
- **Monospace** (numbers): Tabular numbers for alignment
- **No italics** unless emphasis needed (rare)

**Font Sizes**:
- **Hero/Display**: 28–32px (page title)
- **Heading 1**: 20px (section title)
- **Heading 2**: 14px (subsection)
- **Body**: 13–14px (standard content)
- **Caption**: 12–13px (metadata, hints)
- **Tiny**: 11–12px (help text, tooltips)

---

## 20. Design Principles

### Principle 1: Scan → Understand → Act

Every element should support this flow:
- **Scan** (5 sec): Glance and identify what needs attention
- **Understand** (3 sec): Read titles, see colors, understand severity
- **Act** (2 sec): Click button, navigate to action

**Application**:
- Action center uses color-coded dots and icons (scan phase)
- "Why" text explains consequence (understand phase)
- Clear CTA button moves to action (act phase)

### Principle 2: Agent's Time is Valuable

- Remove every decorative element
- Every number links somewhere
- Every section has a reason to exist
- No empty space = no clutter

**Application**:
- No "Welcome to V-RENT" hero blurbs
- No stock illustrations (except empty states)
- No animations that don't convey info

### Principle 3: Trust Through Transparency

- Show data freshness ("Updated today")
- Clear about what's verified vs. predicted
- Explain why we're surfacing something
- No dark patterns (e.g., pre-checked boxes)

**Application**:
- "Needs you" section shows "why" for each action
- Performance data shows "Last 7 days"
- Status badges clearly indicate state (published, paused, etc.)

### Principle 4: Mobile-First Is Not Optional

- Assume agent is on phone (on-site, with tenant)
- All workflows must work at 400px width
- Touch-friendly (44px tap targets minimum)
- No horizontal scroll except metrics strip

**Application**:
- No 3-column layouts on mobile
- All buttons full-width when needed
- Context menu, not dropdown arrow

### Principle 5: Respect Singapore Context

- Show prices in SGD (with $ prefix)
- Use local property terminology (HDB, condo, landed, etc.)
- Reference Singapore districts (D01–D28)
- Support common agent workflows (WhatsApp reply, PDF export)

**Application**:
- District names in all listing references
- PSF is primary comparison metric (not $/sqm)
- WhatsApp is primary messaging channel

### Principle 6: Decisions, Not Options

- Show recommended action, not 10 choices
- Use sensible defaults (sort by date, filter by active)
- No "customize this dashboard" (too much cognitive load)

**Application**:
- Action center shows top 3–5 issues (not all issues)
- Metrics strip is fixed (not customizable)
- "Recently updated" is sorted by date (not by agent choice)

---

## FINAL DASHBOARD BLUEPRINT

### Exact Page Structure (Top to Bottom)

```
┌─ PAGE HEADER ─────────────────────────────────────────────────────┐
│                                                                     │
│  Eyebrow: [Today's date, e.g., "Wednesday, 14 September"]         │
│                                                                     │
│  Title: "{Greeting}, {Agent Name}"                                │
│  [e.g., "Good afternoon, Priya"]                                  │
│                                                                     │
│  Description: "[Status summary]"                                  │
│  [If actions: "2 items need you today. The rest of your..."]      │
│  [If clean: "Nothing needs you today. Your listings..."]          │
│                                                                     │
│  Actions:                                                          │
│    [Import listings] [Create listing] ← Primary CTA (right)       │
│                                                                     │
└───────────────────────────────────────────────────────────────────┘

┌─ METRIC STRIP ────────────────────────────────────────────────────┐
│                                                                     │
│ ┌─────────────┬─────────────┬─────────────┬─────────────┬──────────┤ │
│ │ Active      │ Drafts      │ Expiring    │ Enquiries   │ Views/7d │ │
│ │ 🏢 5/12     │ ⭕ 2        │ ⏰ 1 🟠    │ 💬 2 🔵    │ 👁 482  │ │
│ │ [link]      │ [link]      │ [link]      │ [link]      │ ↑12% [l]│ │
│ │ "5 slots"   │ "Not submit"│ "<30 days"  │ "Awaiting"  │ "7d ago"│ │
│ └──────┬──────┴─────────────┴─────────────┴─────────────┴──────────┤ │
│        │                                                    │        │ │
│        └─ (Metric 6: Conversion rate, if space exists) ────┘        │ │
│                                                                     │
└───────────────────────────────────────────────────────────────────┘

┌─ MAIN CONTENT (Desktop: 2-Col | Mobile: 1-Col) ───────────────────┐
│                                                                     │
│ ┌─── COLUMN 1 (Main Content) ────────────────────────────────────┐ │
│ │                                                                 │ │
│ │  ┌─ SECTION 1: NEEDS YOU ─────────────────────────────────┐   │ │
│ │  │                                                         │   │ │
│ │  │  Title: "Needs you"                                   │   │ │
│ │  │  Subtitle: "2 items, most consequential first"        │   │ │
│ │  │                                                         │   │ │
│ │  │  [⚠️] [Icon] "2 enquiries waiting for a reply"        │   │ │
│ │  │       "Tenants who enquired in last 2 days..."        │   │ │
│ │  │                                    [Open enquiries]   │   │ │
│ │  │  ─────────────────────────────────────────────────    │   │ │
│ │  │  [⚠️] [Icon] "Pinnacle Duxton 28-F expires in 7 d" │   │ │
│ │  │       "It comes off the site on expiry..."           │   │ │
│ │  │                                            [Review]   │   │ │
│ │  │                                                         │   │ │
│ │  └─────────────────────────────────────────────────────────┘   │ │
│ │                                                                 │ │
│ │  ┌─ SECTION 2: READY TO PUBLISH? ─────────────────────────┐   │ │
│ │  │                                                         │   │ │
│ │  │  Title: "Ready to publish?"                           │   │ │
│ │  │  Subtitle: "Every listing must pass these 5 checks"  │   │ │
│ │  │                                          ✓ All pass   │   │ │
│ │  │                                                         │   │ │
│ │  │  [✓] "CEA Registration" — "Your license is current"  │   │ │
│ │  │  [✓] "Payment method" — "Billing account is active"  │   │ │
│ │  │  [✓] "Moderation review" — "No rejections"           │   │ │
│ │  │  [✓] "Photos added" — "All drafts have images"       │   │ │
│ │  │  [✓] "Pricing configured" — "All listings priced"    │   │ │
│ │  │                                                         │   │ │
│ │  └─────────────────────────────────────────────────────────┘   │ │
│ │                                                                 │ │
│ │  ┌─ SECTION 3: LISTING PERFORMANCE ──────────────────────┐   │ │
│ │  │                                                         │   │ │
│ │  │  Title: "Listing performance"                         │   │ │
│ │  │  Subtitle: "Last 7 days across everything live"       │   │ │
│ │  │                                       [Full report →]  │   │ │
│ │  │                                                         │   │ │
│ │  │  ┌─ Col A ─┬─ Col B ─────────────────────────────────┐│   │ │
│ │  │  │Views,  │Enquiries by listing                      ││   │ │
│ │  │  │14 days │                                          ││   │ │
│ │  │  │[Chart] │[Pinnacle Duxton: ████████ 14 enquiries]  ││   │ │
│ │  │  │        │[Marina Bay: ███████ 11 enquiries]        ││   │ │
│ │  │  │Enquiry │[The Pinnacle: ██████ 8 enquiries]        ││   │ │
│ │  │  │  10    │[Bukit Merah: ████ 5 enquiries]           ││   │ │
│ │  │  │Saves   │                                          ││   │ │
│ │  │  │  3     │                                          ││   │ │
│ │  │  └────────┴─────────────────────────────────────────┘│   │ │
│ │  │                                                         │   │ │
│ │  └─────────────────────────────────────────────────────────┘   │ │
│ │                                                                 │ │
│ │  ┌─ SECTION 4: RECENTLY UPDATED ────────────────────────┐   │ │
│ │  │                                                         │   │ │
│ │  │  Title: "Recently updated"                            │   │ │
│ │  │                               [All listings →]        │   │ │
│ │  │                                                         │   │ │
│ │  │  [Photo] The Pinnacle 28-F   [Stats] [Ring] [Status] │   │ │
│ │  │          28-F · $5,500 · D09                          │   │ │
│ │  │  ─────────────────────────────────────────────────    │   │ │
│ │  │  [Photo] Marina Bay 15-A     [Stats] [Ring] [Status] │   │ │
│ │  │          15-A · $6,200 · D01                          │   │ │
│ │  │  ─────────────────────────────────────────────────    │   │ │
│ │  │  [Photo] Bukit Merah 32-K    [Stats] [Ring] [Status] │   │ │
│ │  │          32-K · $2,800 · D12                          │   │ │
│ │  │  ─────────────────────────────────────────────────    │   │ │
│ │  │  [Photo] Clarke Quay 08-D    [Stats] [Ring] [Status] │   │ │
│ │  │          08-D · $4,100 · D02                          │   │ │
│ │  │  ─────────────────────────────────────────────────    │   │ │
│ │  │  [Photo] Ang Mo Kio 45-B     [Stats] [Ring] [Status] │   │ │
│ │  │          45-B · $1,900 · D27                          │   │ │
│ │  │                                                         │   │ │
│ │  └─────────────────────────────────────────────────────────┘   │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─── COLUMN 2 (Sidebar, Desktop Only) ───────────────────────────┐ │
│ │                                                                 │ │
│ │  ┌─ THIS WEEK ────────────────────────────────────────────┐   │ │
│ │  │ 💡 This week                                           │   │ │
│ │  │                                                         │   │ │
│ │  │ Your Bukit Merah unit is attracting attention but      │   │ │
│ │  │ hasn't converted yet. Consider adding a virtual tour. │   │ │
│ │  │                                    [Optimize listing]  │   │ │
│ │  │                                                         │   │ │
│ │  └─────────────────────────────────────────────────────────┘   │ │
│ │                                                                 │ │
│ │  ┌─ WEAKEST LISTINGS ─────────────────────────────────────┐   │ │
│ │  │                                                         │   │ │
│ │  │  Title: "Weakest listings"                             │   │ │
│ │  │  Subtitle: "Lowest Listing Health"                    │   │ │
│ │  │                                                         │   │ │
│ │  │  [Ring] 32 Jln Rajah                                  │   │ │
│ │  │         52% Health                                    │   │ │
│ │  │         Missing: floorplan                            │   │ │
│ │  │                                               [→]      │   │ │
│ │  │  ─────────────────────────────────────────────────    │   │ │
│ │  │  [Ring] 45 Ang Mo Kio                                 │   │ │
│ │  │         58% Health                                    │   │ │
│ │  │         Missing: rental yield note                   │   │ │
│ │  │                                               [→]      │   │ │
│ │  │  ─────────────────────────────────────────────────    │   │ │
│ │  │  [Ring] Clarke Quay 08-D                              │   │ │
│ │  │         64% Health                                    │   │ │
│ │  │         Missing: Virtual tour                         │   │ │
│ │  │                                               [→]      │   │ │
│ │  │                                                         │   │ │
│ │  └─────────────────────────────────────────────────────────┘   │ │
│ │                                                                 │ │
│ │  ┌─ BEST PERFORMER ─────────────────────────────────────┐   │ │
│ │  │                                                         │   │ │
│ │  │  Title: "Best performer"                              │   │ │
│ │  │  Subtitle: "Most enquiries this week"                │   │ │
│ │  │                                                         │   │ │
│ │  │  [Photo] The Pinnacle 28-F                            │   │ │
│ │  │          28-F · D09                                   │   │ │
│ │  │                                                         │   │ │
│ │  │  ─────────────────────────────────────────────────   │   │ │
│ │  │  14 enquiries · 128 views          [Pulse ↗]        │   │ │
│ │  │                                                         │   │ │
│ │  └─────────────────────────────────────────────────────────┘   │ │
│ │                                                                 │ │
│ │  ┌─ QUOTA PROGRESS ─────────────────────────────────────┐   │ │
│ │  │ 📊 Quota                                             │   │ │
│ │  │                                                         │   │ │
│ │  │ 5 / 12 active             [Premium]                  │   │ │
│ │  │ [████████░░] (41% filled)                            │   │ │
│ │  │                                           [Change]    │   │ │
│ │  │                                                         │   │ │
│ │  └─────────────────────────────────────────────────────────┘   │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└───────────────────────────────────────────────────────────────────┘
```

### Component Nesting

```jsx
<DashboardPage>
  <PageHeader
    eyebrow={dateLine}
    title={`${greeting}, ${name}`}
    description={statusSummary}
    actions={<> <ImportButton /> <CreateButton /> </>}
  />

  <MetricStrip cols={6}>
    <Metric {...active} />
    <Metric {...drafts} />
    <Metric {...expiring} />
    <Metric {...enquiries} />
    <Metric {...views} />
    <Metric {...conversion} />
  </MetricStrip>

  <Grid cols="2" gap="5" lg={true}>
    {/* COLUMN 1 */}
    <div className="space-y-5">
      <SectionCard title="Needs you" description={actionCount}>
        <ActionList actions={actions}>
          {empty && <EmptyState />}
        </ActionList>
      </SectionCard>

      <SectionCard title="Ready to publish?" actions={<Badge pass={allPass} />}>
        <GateList gates={gate} />
      </SectionCard>

      {published.length > 0 && (
        <SectionCard title="Listing performance" actions={<ViewAllLink />}>
          <PerformanceGrid>
            <TrendChart data={series} />
            <TopPerformersChart rows={ranked} />
          </PerformanceGrid>
        </SectionCard>
      )}

      <SectionCard title="Recently updated" actions={<ViewAllLink />}>
        <ListingList listings={recent}>
          {empty && <EmptyState />}
        </ListingList>
      </SectionCard>
    </div>

    {/* COLUMN 2 (Sidebar) */}
    <div className="space-y-4">
      {insight && <InsightCard insight={insight} />}

      <SectionCard title="Weakest listings" description="Lowest Health">
        <WeakestList listings={weakest} />
      </SectionCard>

      {ranked[0] && (
        <SectionCard title="Best performer" description="Most enquiries">
          <BestPerformerCard listing={ranked[0]} />
        </SectionCard>
      )}

      <QuotaCard quota={quota} plan={plan} />
    </div>
  </Grid>

  <ListingActionDialogs />
</DashboardPage>
```

### Mobile Stacking

```
[Mobile <768px: all sections stack 1-column]

1. PageHeader (full-width)
2. MetricStrip (horizontal scroll)
3. SectionCard (Needs you)
4. SectionCard (Ready to publish)
5. SectionCard (Performance) [chart-only]
6. SectionCard (Recently updated)
7. Card (Insight)
8. SectionCard (Weakest)
9. SectionCard (Best)
10. Card (Quota)
```

---

## Implementation Checklist

- [ ] Verify all JTBD are addressed in dashboard layout
- [ ] Metrics strip links to correct filter pages
- [ ] Action center dynamically builds from agent state
- [ ] "Ready to publish" gates reflect actual publish logic
- [ ] Performance chart uses actual data (last 7–14 days)
- [ ] Recently updated list is sortable by date descending
- [ ] Sidebar shows on desktop (≥1200px), hides on mobile
- [ ] Weakest/best performer calculations match listing health scoring
- [ ] Quota progress bar shows correct plan limits
- [ ] All CTAs link to appropriate pages
- [ ] Error states show if data fails to load
- [ ] Empty states show if agent has no listings
- [ ] Mobile layout tested at 400px width
- [ ] No horizontal scroll (except metrics strip)
- [ ] Touch targets ≥44px on mobile
- [ ] Hover states work on desktop
- [ ] Accessibility: alt text on images, ARIA labels on buttons
- [ ] Dark mode tested (if supported)
- [ ] Page loads in <2 seconds

---

**Document Version**: 1.0  
**Date**: 2026-09-14  
**Audience**: Claude Fable 5.1 (implementation)  
**Status**: Ready for build
