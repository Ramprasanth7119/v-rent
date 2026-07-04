# V-RENT — Singapore PropTech Super Platform

V-RENT is an enterprise-grade PropTech Super Platform benchmarked against PropertyGuru and 99.co. It unifies residential/commercial property search marketplaces, direct owner listing wizards, agency ERP operations, secure document vaults, MAS lending simulators, and context-aware AI advisors under one highly responsive Next.js interface.

---

## 🎙️ Demo Elevator Pitch
> *"Welcome. Today, we are presenting V-RENT: a unified PropTech Super Platform built specifically for Singapore's next-generation estate agencies and modern homebuyers. Rather than separating property searches, broker CRMs, bank calculators, and document signing into isolated applications, V-RENT integrates the entire lead-to-close loop. Powered by 'Ava'—our contextual real-estate AI—consumers get instant URA-correlated valuations, and brokers benefit from automated listing builders and smart lead scoring. The platform is designed from day one to enforce CEA compliance, PDPA integrity, and MAS Total Debt Servicing Ratio (TDSR) metrics. V-RENT isn't just a listings directory; it is the operating system for your agency network."*

---

## 🛠️ Dynamic Persona Demo Switcher
At the bottom of the viewport is a **Dynamic Persona Switcher Panel**. Click any persona to instantly swap workspace context and simulate active roles and permissions:
1.  **Consumer**: Search marketplace grids, view URA charts, adjust interactive budget sliders, explore map district drawers.
2.  **Agent CRM**: Kanban lead pipelines, listing analytics metrics, AI Listing Description copy generators.
3.  **Agency ERP**: Branch ranks, billing packages, round-robin lead allocation config boards.
4.  **Investor Wealth**: Asset distribution charts, portfolio net yields, high-yield opportunity trackers.
5.  **System Admin**: Verification queues, Singpass validation nodes, integration API key registers.

*Quick Navigation Key:* Press `Ctrl+K` or `⌘K` from any screen to summon the global Command Palette navigation overlay.

---

## 🚀 How to Run locally

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Run development server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your web browser.
3.  **Build production version**:
    ```bash
    npm run build
    ```

---

## 📁 Project Architecture & Directories

```
/app
  /layout.tsx           # Integrates global PersonaProvider & DashboardShell wrapper
  /globals.css          # Core CSS variables, glassmorphism, and dark-theme configurations
  /page.tsx             # Bento-grid landing homepage featuring the Interactive Budget Slider
  /search               # Split list-map filter marketplace search board
  /search/wanted        # Buyer Wanted board listing active buyer requests
  /map                  # Split resizable map exploration stacking vertically on mobile
  /property/[id]        # Listings details, URA price charts, lease decays, and booking calendars
  /vault                # Secure document uploads, audit history, and Singpass signing
  /advisor              # Ava AI Assistant / Agent Copilot chat workspace
  /calculator           # Financial mortgage tools compiling ABSD, BSD, and TDSR limits
  /valuation            # Instant property Automated Valuation Model (AVM)
  /agent                # CRM drag-and-drop Kanban, analytics, and AI description generator
  /agency               # ERP agent performance rankings, subscriptions billing, lead engines
  /investor             # Investor asset allocations, opportunity lists, yield projections
  /admin                # Moderator queues, Singpass user validation nodes, integrations
  /auth                 # Signup logins, onboarding roles selector, pending CEA registers
  /agents               # Public agent directories index and profiles
  /compare              # Side-by-side properties comparison board
  /coliving             # Co-living shared rooms matching portal
  /commercial           # Commercial offices and retail spaces register
  /renovation           # Renovation budget estimation range slider
  /loyalty              # Points ledger and rewards vouchers redemption hub
/components
  /ui                   # Button, Card, Badge, Input, Select, Modal, Drawer, Tabs, Table primitives
  /layout               # Sidebar shells per persona context, PersonaContext provider
  /property             # PropertyCard structures, InteractiveSVGMap vector coordinate overlays
  /ai-chat              # Core chatbot utilities
/lib
  /mock-data            # Static typed properties, agents, documents, transactions JSON data
  /services             # Asynchronous mock API client logic with setTimeout delays
```

---

## 💻 Tech Stack
-   **Framework**: Next.js (App Router, Turbopack)
-   **Language**: TypeScript (Strict checks)
-   **Styling**: Tailwind CSS (PostCSS v4)
-   **Icons**: Lucide React
-   **Maps**: Google Maps JS SDK + Custom SVG Polygon Coordinates projection
