# V-RENT Design Decisions

This document outlines the design decisions, competitor research, and user experience (UX) strategy for V-RENT, contrasting it with incumbents like PropertyGuru and 99.co.

---

## 1. Competitor Research & Analysis (PropertyGuru vs. 99.co vs. V-RENT)

### A. Information Architecture & Top-Level Navigation
*   **PropertyGuru / 99.co:** Traditional, consumer-heavy. Navigation focuses on standard buying/renting grids, with CRM (AgentNet) segregated into a completely different portal/app.
*   **V-RENT:** Unified multi-persona shell. A cohesive interface that permits quick context-switching (Consumer, Agent, Agency Admin, Investor, Platform Admin) using premium dashboard shells, sharing the same visual tokens and component library.

### B. Search Entry & Filter Patterns
*   **PropertyGuru / 99.co:** Classic centered form with dropdowns. Fails to parse natural language or adapt search intent dynamically.
*   **V-RENT:** AI-first search. The search input is a natural-language processor that displays its reasoning process and translates inputs into structured filter chips. Filters use a progressive disclosure side-panel on the map and grid search screens, maintaining active filter visibility.

### C. Map Search & Map Drawer UX
*   **PropertyGuru / 99.co:** Traditional Google Maps integration, cluttered with markers, heavy loading latency, and modal popups.
*   **V-RENT:** Split-pane layout (List 40% / Map 60%). Markers are custom-styled to fit the dark/light premium theme, clustering gracefully. Selecting a pin slides out a spring-animated drawer with a floor-plan tab, amenities layer, and quick-comparison checkboxes. To ensure bulletproof reliability and gorgeous custom dark/light branding without API keys breaking during live demonstrations, we implement a highly interactive SVG vector map of Singapore districts with custom overlay layers (price heatmaps, MRT lines, and district highlights).

### D. Property Card Anatomy & Details Page
*   **PropertyGuru / 99.co:** Heavy visual noise, excessive promotional badges, dry text-heavy detail pages.
*   **V-RENT:** Bento-grid layouts. Property cards use clean typography, subtle hover-based image carousels, and precise AI-matched similarity badges. Property Detail pages feature full-width media galleries, a sticky summary/contact bar (Airbnb-style), a lease-decay chart for leaseholds, and integrated AI-generated instant valuation widgets.

### E. Agent & Admin Dashboard Patterns
*   **PropertyGuru / 99.co:** Visually dated, tabular, light-themed admin tools.
*   **V-RENT:** Linear-inspired, keyboard-friendly dark-mode-native dashboard for agents, admins, and investors. High data density presented cleanly with custom sparklines, lead-scoring gauges, and drag-and-drop Kanban lead boards.

---

## 2. Visual Identity & Brand System

*   **Primary Palette (Enterprise Navy):**
    *   Dark: `#0B1E3F` to `#13294B` (sleek, deep navy, projecting security and institutional trust).
    *   Light: `#FFFFFF` background with `#0B1E3F` text.
*   **Accent Palette (Warm Gold/Amber):**
    *   Accent: `#D4AF37` to `#F3C010` (used sparingly for active states, CTA borders, and verification badges).
*   **Neutral Gray Scale:**
    *   10-step custom HSL gray scale ranging from slate/zinc tones to crisp whites.
*   **Typography Scale:**
    *   Headlines: **Outfit** / Sans-serif display (confident, geometric).
    *   Body & Interface: **Geist Sans** (high legibility at small sizes, optimal for density).
*   **Radii:**
    *   Tight (`6px`) for inputs/buttons.
    *   Medium (`12px`) for standard cards.
    *   Large (`20px`) for slides/modals/drawers.

---

## 3. Key UX Principles & Accessibility

1.  **AI-First Integrity:** AI features are integrated components of the screens (e.g. structured card output in AI Chat, instant valuation in details, and lead scores in CRM) rather than a simple floating chat box.
2.  **No Placeholders:** All data (including CEA registration numbers, districts like D9 Orchard, and HDB/Condo pricing) uses realistic Singapore real-estate parameters.
3.  **Keyboard-First Speed:** Quick command palette (⌘K / Ctrl+K) accessible across dashboard views for fast switching and action triggers.
4.  **Transition Elegance:** Spring animations for drawers, shared-element layouts for route entry, and 120ms fade responses on hovers.
