# V-RENT — PropTech Super Platform (Proof of Concept)

V-RENT is a Singapore-headquartered, enterprise-grade PropTech Super Platform that unifies residential property search marketplaces, agency ERP operations, compliance registers, MAS lending simulators, and AI portfolios advisors under one scalable interface.

---

## 🎙️ Demo Elevator Pitch (Read Aloud to Client)

> *"Welcome. Today, we are presenting V-RENT: a unified PropTech Super Platform built specifically for Singapore's next-generation estate agencies. Rather than separating property searches, broker CRMs, bank calculators, and document signing into isolated applications, V-RENT integrates the entire lead-to-close loop. Powered by 'Ava'—our contextual real-estate AI—consumers get instant URA-correlated valuations, and brokers benefit from automated listing builders and smart lead scoring. The platform is designed from day one to enforce CEA compliance, PDPA integrity, and MAS Total Debt Servicing Ratio (TDSR) metrics. V-RENT isn't a listings directory; it is the operating system for your agency network."*

---

## 🛠️ Persona Demo Switcher

This proof-of-concept features a **Dynamic Persona Switcher Panel** at the bottom of the viewport. Click on any persona to instantly load their customized workspace and simulate their permissions context:

1.  **Consumer:** Public marketplace search grids, financial stamp duty (ABSD) calculators, and interactive district map search drawers.
2.  **Agent CRM:** Kanban pipeline manager, listings analytics, and the AI Listing Generator tool.
3.  **Agency ERP:** Branch leadership rosters, billing packages, and the round-robin lead distribution rules panel.
4.  **Investor Wealth:** Portfolio net yield trackers, capital appreciation charts, and high-yield opportunities matching feeds.
5.  **System Admin:** Compliance logs, NRIC license verifications, and external API integration connection registers.

*Quick Key Trigger:* Press `⌘K` or `Ctrl+K` from any screen to launch the global Command Palette overlay for rapid keyboard-first navigation.

---

## 🚀 How to Run the POC Locally

1.  Ensure you have Node.js installed on your machine.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Boot the Next.js development server:
    ```bash
    npm run dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 📁 Project Architecture & Directories

```
/app
  /layout.tsx           # Integrates global PersonaProvider & DashboardShell
  /globals.css          # Core CSS variables, glassmorphic styling, and dark theme
  /page.tsx             # Bento-grid editorial consumer Homepage
  /search               # Split list-map filter search results
  /map                  # Split resizable region SVG map exploration
  /property/[id]        # Listings details, URA price charts, lease decays, and booking calendars
  /vault                # Secure document uploads, audit history, and Singpass signing
  /advisor              # Ava AI Assistant / Agent Copilot workspace
  /calculator           # Financial mortgage tools compiling ABSD, BSD, TDSR check
  /valuation            # Instant property automated valuation model
  /agent                # CRM drag-and-drop Kanban, analytics, and AI description generator
  /agency               # ERP agent performance rankings, subscriptions billing, lead engines
  /investor             # Investor asset allocations, growth SVG lines, opportunity lists
  /admin                # Moderator queues, Singpass user validation nodes, integrations configurations
  /auth                 # Signup logins, onboarding roles selector, pending CEA registers
  /agents               # Public agent directories index and profiles
/components
  /ui                   # Button, Card, Badge, Input, Select, Modal, Drawer, Tabs, Table primitives
  /layout               # Sidebar shells per persona context, PersonaContext provider
  /property             # PropertyCard structures, InteractiveSVGMap vector coordinate overlays
  /ai-chat              # Core chatbot utilities
/lib
  /mock-data            # Static typed properties, agents, documents, transactions JSON data
  /services             # Asynchronous mock API client logic with setTimeout delays
```
