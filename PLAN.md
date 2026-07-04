# V-RENT Build Plan (PLAN.md)

This document contains the step-by-step implementation plan for V-RENT, detailing the exact screens, components, mock data structures, and services to be created.

---

## 1. Phase 1: Mock Data & Core Services

We will define static typed data modules that represent real Singapore metrics (e.g. Districts 1-28, real HDB/Condo pricing scales, realistic names, CEA registration formats, and files).

### A. Mock Data Files (`lib/mock-data/`)
*   `properties.ts`: At least 40 listings across Singapore (Condos, HDBs, Landed, Commercial, New Launches) with district numbers, price, psf, bed/bath, image placeholders (styled SVG/unspash), MRT distance, tenure, features, and AI-match percentages.
*   `agents.ts`: At least 15 agent profiles (CEA number, branches, languages, rating, transactions, focus areas).
*   `leads.ts`: At least 20 pipeline lead profiles (name, phone, interest properties, score, status, source).
*   `transactions.ts`: Monthly transaction histories for projects (to power graphs).
*   `documents.ts`: At least 8 documents (tenancy agreement, OTP, KYC documents, etc.) with statuses.
*   `insights.ts`: 8 blog/market reports.

### B. Mock API Service Layer (`lib/services/`)
*   `properties.ts`: `getListings()`, `getListingById()`, `searchListings()`.
*   `agents.ts`: `getAgents()`, `getAgentById()`.
*   `crm.ts`: `getLeads()`, `updateLeadStage()`, `addLeadNote()`.
*   `valuation.ts`: `getValuation()`.
*   `documents.ts`: `getDocuments()`, `uploadDocument()`, `signDocument()`.
*   `chat.ts`: `sendChatMessage()`.

---

## 2. Phase 2: Design System, Tokens & UI Primitives

*   **Design Tokens** (`lib/design-tokens/` & `app/globals.css` extension):
    *   Setup theme variables (navy primary `#0B1E3F`, gold accent `#D4AF37`, neutrals, semantics).
    *   Setup custom glassmorphism layers, shadow recipes, and spring transition tokens.
*   **UI Primitives** (`components/ui/`):
    *   `Button.tsx` (Variants: primary, secondary, outline, ghost, gold-accent, destructive).
    *   `Input.tsx` / `Select.tsx` / `DatePicker.tsx` (Styled dark-mode & light-mode inputs).
    *   `Card.tsx` (Premium container with subtle border & shadow transitions).
    *   `Badge.tsx` (Standard, AI-Match, Verified, Gold).
    *   `Modal.tsx` & `Drawer.tsx` (Spring-animated panels).
    *   `Table.tsx` / `Tabs.tsx` (Sortable headers, smooth tab sliders).
    *   `CommandPalette.tsx` (⌘K search overlay).

---

## 3. Phase 3: Layouts & Global Components

*   `components/layout/DashboardShell.tsx`: Main layout manager. Surrounds all pages and provides a top **"Persona Switcher" panel** for demo review (switch between Consumer, Agent, Agency Admin, Investor, Platform Admin).
*   `components/layout/Navbar.tsx`: Consumer public header & footer.
*   `components/layout/AgentSidebar.tsx`: Linear-style left navigation for Agents.
*   `components/layout/AdminSidebar.tsx`: Left navigation for Platform Admins.
*   `components/layout/InvestorSidebar.tsx`: Left navigation for Investors.

---

## 4. Phase 4: Shared Feature Components

*   `components/property/PropertyCard.tsx`: Grid, list, and map-preview designs.
*   `components/property/InteractiveSVGMap.tsx`: Premium vector map of Singapore. Permits clicking on regions (Orchard, Marine Parade, Tampines, Jurong, Woodlands) to filter properties, toggle heatmaps, and show/hide MRT overlay.
*   `components/property/ValuationWidget.tsx`: Dynamic instant valuation widget.
*   `components/ai-chat/AdvisorChat.tsx`: AI advisor screen with interactive widget output.
*   `components/charts/`: Custom chart components wrapping canvas/SVG or SVG drawing to ensure bulletproof rendering without heavy recharts setups (or recharts if installed). Let's build lightweight, highly-styled responsive SVG graphs which look stunning and are 100% stable in Next.js SSR.

---

## 5. Phase 5: Routes & Dashboards

We will implement the following routes in `app/`:

### Public/Consumer Screens
1.  **Homepage** (`app/page.tsx`): Bento layout, natural-language search bar, live pulse strip, directory spotlights, featured carousels.
2.  **Property Search** (`app/search/page.tsx`): Left list panel, right map search toggle, filter drawer.
3.  **Map Search** (`app/map/page.tsx`): Dual pane split-screen, vector map, slide-out drawer details.
4.  **Property Detail** (`app/property/[id]/page.tsx`): Full image carousel, lease-decay chart, sticky booking bar, AI recommendation reasoning, contact form.
5.  **Advisor Chat** (`app/advisor/page.tsx`): Full screen conversational interface with Ava.
6.  **Public Agents** (`app/agents/page.tsx` / `app/agents/[id]/page.tsx`): Agent directory & branded profiles.
7.  **Financial Hub** (`app/calculator/page.tsx`): Stamp duty, TDSR, affordability calculators.
8.  **Valuation Hub** (`app/valuation/page.tsx`): Quick address valuation estimator.
9.  **Investment Hub** (`app/invest/page.tsx`): Capital/yield marketing + opportunities list.

### Auth & Onboarding
10. **Authentication** (`app/auth/page.tsx`): Mock login, role selection, CEA registration upload.

### Persona Dashboards
11. **Agent Portal** (`app/agent/page.tsx`): CRM pipeline Kanban, My Listings manager, AI Description generator.
12. **Agency Admin Portal** (`app/agency/page.tsx`): Branch rosters, agent performance metrics, billing panels.
13. **Investor Dashboard** (`app/investor/page.tsx`): Portfolio details, appreciation charts, opportunity feed.
14. **Platform Admin Portal** (`app/admin/page.tsx`): Moderation queue, User management list, Integrations config toggles, audit trails.
15. **Document Vault** (`app/vault/page.tsx`): Upload interface, digital signatures.
