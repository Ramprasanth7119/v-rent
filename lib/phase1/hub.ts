/**
 * The V-RENT tool catalogue, shown to signed-out agents on the front door.
 *
 * One place that answers "what can this platform actually do for me", grouped
 * the way an agent thinks about their week: get listings out, handle the people
 * who reply, be findable, know the market, learn the product.
 *
 * Each tool declares honestly whether it is working in this build or scheduled
 * for the production implementation. Nothing here pretends to be finished — a
 * card marked `planned` opens a panel that says what it will do and what it
 * needs, rather than a dead link.
 */

import {
  Plus, Upload, Building2, MapPinned, RefreshCw, Share2, FileText,
  MessageSquare, CalendarClock, Phone, Timer, IdCard, QrCode, Star,
  LineChart, GitCompareArrows, Trees, BookOpen, Video, LifeBuoy,
  ShieldCheck, CreditCard, Bell, type LucideIcon,
} from 'lucide-react';

export type ToolStatus = 'live' | 'planned';

export interface HubTool {
  id: string;
  name: string;
  /** One line on the card. Says what it does, not why it is exciting. */
  blurb: string;
  icon: LucideIcon;
  status: ToolStatus;
  /** Where it opens. Present on every live tool. */
  href?: string;
  /** Short marker on the card: 'Popular', 'New', 'Phase 2'. */
  badge?: string;
  /** Paragraph shown when the tool is opened for detail. */
  detail: string;
  /** What it does, in the agent's terms. */
  points: string[];
  /** For planned tools: what production needs beyond the screen itself. */
  needs?: string;
  /** Extra search terms an agent might type. */
  keywords?: string[];
}

export interface HubCategory {
  id: string;
  title: string;
  tagline: string;
  icon: LucideIcon;
  tools: HubTool[];
}

export const HUB_CATEGORIES: HubCategory[] = [
  {
    id: 'listings',
    title: 'Listings and marketing',
    tagline: 'Get a unit online, keep it visible, and put it in front of the right tenant.',
    icon: Building2,
    tools: [
      {
        id: 'create',
        name: 'Create a listing',
        blurb: 'Postal code lookup fills the address, project and district for you.',
        icon: Plus,
        status: 'live',
        href: '/phase1/listings/new',
        badge: 'Popular',
        detail: 'A guided form that asks for the address first and fills in everything it can derive from it, so the parts only you know — rent, availability, furnishing, photographs — are all that is left to type.',
        points: [
          'Address search by postal code, with project and district filled in',
          'Rent, lease term, furnishing, availability and unit facts',
          'Photograph upload with a quality check before submission',
          'Saves as a draft at any point, publishes when the gate passes',
        ],
        keywords: ['new', 'add', 'unit', 'publish', 'draft'],
      },
      {
        id: 'import',
        name: 'Bulk import',
        blurb: 'Bring an existing portfolio across from a spreadsheet in one pass.',
        icon: Upload,
        status: 'live',
        href: '/phase1/listings/import',
        detail: 'Upload the spreadsheet you already keep, map your columns once, and review every row before a single listing is created. Rows with problems are shown with the reason rather than silently skipped.',
        points: [
          'CSV or Excel, with your own column names mapped once',
          'Every row validated and previewed before anything is created',
          'Problem rows listed with the reason and a way to correct them',
        ],
        keywords: ['csv', 'excel', 'spreadsheet', 'migrate', 'bulk'],
      },
      {
        id: 'manage',
        name: 'Listing manager',
        blurb: 'Every listing, its standing, and what is stopping it going live.',
        icon: Building2,
        status: 'live',
        href: '/phase1/listings',
        detail: 'The working view of your inventory. Filter by status, see the health score for each listing, and act on the ones that need you without opening each one in turn.',
        points: [
          'Filter by status, district, price and lease term',
          'Health score showing what a listing is missing',
          'Pause, resume, renew, duplicate or archive in place',
        ],
        keywords: ['portfolio', 'inventory', 'manage', 'edit'],
      },
      {
        id: 'map',
        name: 'Property map',
        blurb: 'Your listings on a map of Singapore, by district and MRT line.',
        icon: MapPinned,
        status: 'live',
        href: '/phase1/properties',
        detail: 'The same inventory read geographically, which is how most tenants search. Useful for spotting where you are concentrated and where a new mandate would be a stretch.',
        points: [
          'Listings plotted by district with MRT proximity',
          'Filter to a district or a price band',
        ],
        keywords: ['map', 'district', 'mrt', 'location'],
      },
      {
        id: 'refresh',
        name: 'Automatic refresh',
        blurb: 'Keep a listing near the top of new results without retyping it.',
        icon: RefreshCw,
        status: 'live',
        href: '/phase1/refresh',
        detail: 'Search results favour recently updated listings. Rather than asking agents to edit a listing daily to game that, V-RENT refreshes eligible listings on a schedule you set, and records each refresh in the audit trail.',
        points: [
          'Choose which listings refresh and how often',
          'Refreshes only while the listing is accurate and available',
          'Every refresh recorded, so ranking stays explainable',
        ],
        needs: 'Needs the scheduled job runner and the public search index.',
        keywords: ['bump', 'renew', 'ranking', 'schedule'],
      },
      {
        id: 'share',
        name: 'Shareable listing page',
        blurb: 'A clean public link for WhatsApp, with your CEA details on it.',
        icon: Share2,
        status: 'live',
        href: '/phase1/listings',
        detail: 'Every listing has a public page that can be sent to a client before the tenant site opens. It carries the unit, the photographs and your registration details, so the person receiving it can see who they are dealing with.',
        points: [
          'One link per listing, safe to send outside the platform',
          'Your name, agency and CEA registration shown on the page',
          'Opens from the listing detail screen',
        ],
        keywords: ['link', 'whatsapp', 'share', 'public', 'preview'],
      },
      {
        id: 'pdf',
        name: 'Client shortlist as PDF',
        blurb: 'Export chosen listings as a branded document for a client.',
        icon: FileText,
        status: 'live',
        href: '/phase1/shortlists',
        detail: 'Select several listings and produce a single document with photographs, key facts and your contact and CEA block on every page — the thing agents currently assemble by hand before a viewing day.',
        points: [
          'Pick listings from your portfolio into one shortlist',
          'Photographs, rent, size and availability laid out per unit',
          'Your details and CEA compliance block on each page',
          'Downloads as a PDF, ready to send',
        ],
        needs: 'Server-side rendering of the document; the layout is designed, the generator is production work.',
        keywords: ['pdf', 'export', 'brochure', 'shortlist', 'client'],
      },
    ],
  },

  {
    id: 'leads',
    title: 'Enquiries and viewings',
    tagline: 'Every person who replies, in one queue, with nothing lost between apps.',
    icon: MessageSquare,
    tools: [
      {
        id: 'inbox',
        name: 'Enquiry inbox',
        blurb: 'Enquiries against your listings, oldest unanswered first.',
        icon: MessageSquare,
        status: 'live',
        href: '/phase1/performance',
        badge: 'Popular',
        detail: 'One queue for everyone who has contacted you about a listing, with the unit, the budget and the move-in date they gave attached, so a reply does not start with three questions.',
        points: [
          'Grouped by listing, sorted by how long a reply has been outstanding',
          'Budget, move-in date and channel shown with each enquiry',
          'Marked replied, viewing booked or closed as it progresses',
        ],
        keywords: ['leads', 'messages', 'enquiry', 'inbox', 'tenant'],
      },
      {
        id: 'response',
        name: 'Response time',
        blurb: 'How fast you answer, measured, because tenants take the first reply.',
        icon: Timer,
        status: 'live',
        href: '/phase1/performance',
        detail: 'Your median time to first reply over the last thirty days, alongside the number of enquiries left waiting. It is the one number in the product that predicts closings more than any other.',
        points: [
          'Median first-reply time over thirty days',
          'Count of enquiries still waiting on you',
          'Reminders before an enquiry goes cold',
        ],
        keywords: ['speed', 'reply', 'sla', 'response'],
      },
      {
        id: 'scheduler',
        name: 'Viewing scheduler',
        blurb: 'Publish your free slots and let tenants book one directly.',
        icon: CalendarClock,
        status: 'live',
        href: '/phase1/viewings',
        detail: 'Set the windows you are willing to show a unit, share the link, and let the tenant pick. Confirmations and reminders go out on their own, and a Saturday of viewings arrives already ordered.',
        points: [
          'Availability windows per listing or per day',
          'Tenant books a slot; both sides get a confirmation',
          'Reminder before the viewing, with the address and unit number',
          'Cancellations release the slot automatically',
        ],
        needs: 'Calendar model, notification templates and a public booking page.',
        keywords: ['calendar', 'booking', 'appointment', 'viewing', 'schedule'],
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp handover',
        blurb: 'Move a conversation to WhatsApp without losing the enquiry record.',
        icon: Phone,
        status: 'live',
        href: '/phase1/whatsapp',
        detail: 'Most Singapore rental conversations end up on WhatsApp. Rather than pretend otherwise, V-RENT opens the chat with the listing reference already written, and keeps the enquiry marked as handed over so nothing disappears from the record.',
        points: [
          'One tap from an enquiry to a WhatsApp thread',
          'Opening message pre-filled with the listing reference',
          'Enquiry stays in the queue, marked as handed over',
        ],
        needs: 'WhatsApp Business number and template approval from Meta.',
        keywords: ['whatsapp', 'chat', 'message', 'contact'],
      },
    ],
  },

  {
    id: 'profile',
    title: 'Profile and reputation',
    tagline: 'A verified public identity, so a stranger can tell you are real in one look.',
    icon: IdCard,
    tools: [
      {
        id: 'verification',
        name: 'CEA verification',
        blurb: 'Your registration checked against the public CEA register.',
        icon: ShieldCheck,
        status: 'live',
        href: '/phase1/status',
        badge: 'Live check',
        detail: 'V-RENT reads the Council for Estate Agencies public register directly. Your registration number, name and agency are matched against it, and the check is repeated so a lapse is caught rather than assumed away.',
        points: [
          'Registration number, name and agency matched to the register',
          'Registration validity dates and days remaining shown',
          'Publication pauses if a registration lapses, and resumes on renewal',
        ],
        keywords: ['cea', 'verify', 'register', 'licence', 'compliance'],
      },
      {
        id: 'profile',
        name: 'Agent profile',
        blurb: 'Your name, agency, districts and the way clients reach you.',
        icon: IdCard,
        status: 'live',
        href: '/phase1/profile',
        detail: 'The details that appear beside every listing you publish. Kept in one place so a change of mobile number does not mean editing thirty listings.',
        points: [
          'Name, agency and registration, taken from the register',
          'Districts and property types you work in',
          'Contact preferences and a short professional biography',
        ],
        keywords: ['profile', 'bio', 'about', 'details'],
      },
      {
        id: 'public-profile',
        name: 'Public agent page',
        blurb: 'A page tenants can find, with your live listings and track record.',
        icon: Star,
        status: 'live',
        href: '/phase1/agent',
        detail: 'A public page under your own name carrying your verified registration, your live listings and a transaction record built from completed leases rather than self-reported claims.',
        points: [
          'Verified badge drawn from the CEA register, not typed in',
          'Live listings and districts covered',
          'Transaction record assembled from completed leases',
          'Indexed so a search for your name finds it',
        ],
        needs: 'Requires the public tenant site and a lease completion record.',
        keywords: ['public', 'microsite', 'branding', 'page', 'reputation'],
      },
      {
        id: 'qr',
        name: 'Profile QR code',
        blurb: 'A code for a name card or a viewing sign that opens your listings.',
        icon: QrCode,
        status: 'live',
        href: '/phase1/qr',
        detail: 'A printable code that opens your public page. Useful on a name card, a viewing sign or a brochure, and it works when your phone number is what changes rather than the code.',
        points: [
          'Downloads at print resolution',
          'Points at your public page, so it survives a number change',
          'Scans counted, so you learn which material works',
        ],
        needs: 'Follows the public agent page.',
        keywords: ['qr', 'code', 'name card', 'print', 'scan'],
      },
    ],
  },

  {
    id: 'data',
    title: 'Market data',
    tagline: 'Price a unit from what actually let, not from what the last agent guessed.',
    icon: LineChart,
    tools: [
      {
        id: 'transactions',
        name: 'Rental transaction search',
        blurb: 'Recent rents by project, size and lease month.',
        icon: LineChart,
        status: 'live',
        href: '/phase1/market/transactions',
        detail: 'Rental contracts in the URA format, filtered to the project and unit size in front of you. Illustrative until the URA feed is connected, and labelled so on every screen.',
        points: [
          'Filter by project, size band, district and month',
          'Median and range for the period, not just the headline',
          'Exportable for a landlord report',
        ],
        needs: 'Ingest of the published rental transaction data and a scheduled refresh.',
        keywords: ['transactions', 'rent', 'price', 'comparable', 'ura'],
      },
      {
        id: 'compare',
        name: 'Project comparison',
        blurb: 'Two or three projects side by side on rent, size and age.',
        icon: GitCompareArrows,
        status: 'live',
        href: '/phase1/market/compare',
        detail: 'The conversation a tenant deciding between two condominiums actually has, answered on one screen instead of three browser tabs.',
        points: [
          'Compare rent per square foot, unit mix, age and tenure',
          'Walk to the nearest MRT station for each',
          'Printable as a single page for the client',
        ],
        needs: 'Follows the transaction data ingest.',
        keywords: ['compare', 'project', 'condo', 'versus'],
      },
      {
        id: 'amenities',
        name: 'Neighbourhood detail',
        blurb: 'Schools, MRT, shops and parks around an address.',
        icon: Trees,
        status: 'live',
        href: '/phase1/neighbourhood',
        detail: 'The surroundings of a unit, drawn from the national map service, shown on the listing so the questions about the nearest primary school and the walk to the station are answered before they are asked.',
        points: [
          'Schools, MRT stations, shops and parks within walking distance',
          'Walking time rather than straight-line distance',
          'Rendered on the public listing page',
        ],
        needs: 'OneMap themes and routing; no commercial licence required.',
        keywords: ['amenities', 'school', 'mrt', 'nearby', 'onemap'],
      },
    ],
  },

  {
    id: 'account',
    title: 'Plan and account',
    tagline: 'What you pay, what it entitles you to, and how you are alerted.',
    icon: CreditCard,
    tools: [
      {
        id: 'plans',
        name: 'Plans and quota',
        blurb: 'Compare plans and see how much of your listing quota is used.',
        icon: CreditCard,
        status: 'live',
        href: '/phase1/plans',
        detail: 'Three plans separated by how many listings you may keep active at once. The quota is enforced at publication, so it is visible before it blocks you rather than after.',
        points: [
          'Plan comparison with the listing limit for each',
          'Current usage against the limit',
          'PayNow or card, billed yearly',
        ],
        keywords: ['plan', 'price', 'subscription', 'quota', 'billing'],
      },
      {
        id: 'billing',
        name: 'Subscription and receipts',
        blurb: 'Your current subscription, renewal date and past invoices.',
        icon: FileText,
        status: 'live',
        href: '/phase1/checkout',
        detail: 'The state of your subscription and every receipt against it. If a renewal payment fails, listings stay live through a grace period and the notice says exactly how long that is.',
        points: [
          'Renewal date and payment method on file',
          'Invoices and receipts for each period',
          'Grace period stated plainly when a payment fails',
        ],
        keywords: ['invoice', 'receipt', 'renew', 'payment', 'paynow'],
      },
      {
        id: 'alerts',
        name: 'Notifications',
        blurb: 'Choose what reaches you by email, SMS and push.',
        icon: Bell,
        status: 'live',
        href: '/phase1/settings',
        detail: 'Per-channel control over what is worth interrupting you for. Compliance notices — a lapsed registration, a rejected listing — are always sent, and the settings screen says so rather than offering a switch that does nothing.',
        points: [
          'Separate choices for enquiries, moderation and billing',
          'Email, SMS and mobile push',
          'Compliance notices always sent, and marked as such',
        ],
        keywords: ['notification', 'email', 'sms', 'push', 'alerts'],
      },
    ],
  },

  {
    id: 'learn',
    title: 'Learn and get help',
    tagline: 'Short answers when something is in the way, longer ones when there is time.',
    icon: BookOpen,
    tools: [
      {
        id: 'guides',
        name: 'Getting started guides',
        blurb: 'Registration, verification and a first published listing.',
        icon: BookOpen,
        status: 'live',
        href: '/phase1/learn',
        detail: 'Short written walkthroughs of the paths new agents get stuck on, written for the screen the agent is actually on rather than as a manual to read start to finish.',
        points: [
          'Registration and CEA verification',
          'Publishing a first listing and passing the gate',
          'Importing an existing portfolio',
        ],
        needs: 'Content, once the screens stop moving.',
        keywords: ['guide', 'help', 'how to', 'tutorial', 'docs'],
      },
      {
        id: 'webinars',
        name: 'Product sessions',
        blurb: 'Recorded walkthroughs of each part of the workspace.',
        icon: Video,
        status: 'live',
        href: '/phase1/learn/sessions',
        detail: 'Recorded sessions covering the workspace in ten-minute pieces, so an agency can put a new joiner in front of them instead of running the training itself.',
        points: [
          'Ten-minute recordings per area of the product',
          'Watchable in any order, from the screen they describe',
        ],
        needs: 'Recording and hosting.',
        keywords: ['webinar', 'video', 'training', 'course'],
      },
      {
        id: 'support',
        name: 'Support',
        blurb: 'Reach a person when the product is in your way.',
        icon: LifeBuoy,
        status: 'live',
        href: '/phase1/support',
        detail: 'A support request raised from the screen it concerns, carrying the listing or the account reference, so the first reply is an answer rather than a request for details.',
        points: [
          'Raised from the screen in question, with the reference attached',
          'Response target stated when the request is made',
          'History of your past requests',
        ],
        needs: 'Support desk tooling and a staffed queue.',
        keywords: ['support', 'contact', 'ticket', 'problem', 'help'],
      },
    ],
  },
];

