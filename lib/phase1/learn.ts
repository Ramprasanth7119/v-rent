/**
 * Getting started guides and recorded sessions.
 *
 * Written here rather than fetched from a content system because the content is
 * the product: each guide is the sequence a new agent actually has to follow,
 * and it links to the screen that does the step. A guide that cannot send you
 * to the thing it describes is a PDF with extra steps.
 */

export interface GuideStep {
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
}

export interface Guide {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  /** What the agent is able to do afterwards. */
  outcome: string;
  steps: GuideStep[];
}

export const GUIDES: Guide[] = [
  {
    id: 'register',
    title: 'Register and get verified',
    summary: 'From an email address to an approved account, checked against the CEA register.',
    minutes: 6,
    outcome: 'An approved account that is allowed to publish.',
    steps: [
      {
        title: 'Create the account',
        body: 'Your email address and a password. Nothing is published from an account that has not confirmed the address it was created with.',
        href: '/phase1/signup',
        linkLabel: 'Create an account',
      },
      {
        title: 'Enter your CEA registration number',
        body: 'It is checked against the public Council for Estate Agencies register while you type. If your name and agency come back, the platform has found you; if they do not, the number is wrong and no amount of retyping will fix it.',
        href: '/phase1/verify',
        linkLabel: 'Check a registration',
      },
      {
        title: 'Complete your professional details',
        body: 'Agency, licence number, the districts you work and how clients reach you. These go onto every listing and every document you export, which is what the advertising rules require.',
        href: '/phase1/profile',
        linkLabel: 'Open your profile',
      },
      {
        title: 'Wait for approval',
        body: 'Most applications clear the same working day. The status screen says exactly what is outstanding rather than "pending".',
        href: '/phase1/status',
        linkLabel: 'Application status',
      },
    ],
  },
  {
    id: 'first-listing',
    title: 'Publish your first listing',
    summary: 'Address, facts, photographs, and the gate that decides whether it goes live.',
    minutes: 9,
    outcome: 'One listing live, and an understanding of what stops the next one.',
    steps: [
      {
        title: 'Start from the address',
        body: 'Type the postal code and the project, road and district fill themselves in from the Singapore Land Authority register. If there is no postal code yet — a new launch, a landed road — drop a pin on the map instead.',
        href: '/phase1/listings/new',
        linkLabel: 'Create a listing',
      },
      {
        title: 'Give the facts a tenant filters on',
        body: 'Bedrooms, size, furnishing, availability and minimum lease. These are what a search narrows by, so a listing missing them is invisible to the people most likely to take it.',
      },
      {
        title: 'Photograph it properly',
        body: 'Eight to twelve photographs, landscape, taken with the lights on and the blinds open. The first one is the cover and decides whether anybody opens the rest. The uploader checks resolution before it accepts one.',
      },
      {
        title: 'Clear the publish gate',
        body: 'Verified account, active subscription, quota available, required fields complete. The gate lists what is missing with a link to the screen that fixes it.',
        href: '/phase1/listings',
        linkLabel: 'Listing manager',
      },
    ],
  },
  {
    id: 'enquiries',
    title: 'Answer enquiries so they turn into viewings',
    summary: 'Speed is the whole game, and the product measures yours.',
    minutes: 5,
    outcome: 'A reply routine that does not depend on remembering.',
    steps: [
      {
        title: 'Work the inbox oldest first',
        body: 'Tenants take the first sensible reply, not the best one. The inbox is ordered by how long somebody has been waiting rather than by when they wrote.',
        href: '/phase1/performance',
        linkLabel: 'Enquiry inbox',
      },
      {
        title: 'Move it to WhatsApp without losing it',
        body: 'Compose the first message from a template, open WhatsApp with it already written, and the enquiry is marked replied on the way out.',
        href: '/phase1/whatsapp',
        linkLabel: 'WhatsApp handover',
      },
      {
        title: 'Offer two specific times',
        body: '"When are you free" costs four messages. Publish your slots and let the tenant take one.',
        href: '/phase1/viewings',
        linkLabel: 'Viewing scheduler',
      },
    ],
  },
  {
    id: 'pricing',
    title: 'Price a unit from evidence',
    summary: 'What comparable units actually let for, and how to use it in a conversation.',
    minutes: 7,
    outcome: 'A number you can defend to a landlord.',
    steps: [
      {
        title: 'Find the comparables',
        body: 'Same project if you can, same district and size band if you cannot. Twelve months is enough history; three is noise.',
        href: '/phase1/market/transactions',
        linkLabel: 'Transaction search',
      },
      {
        title: 'Use the median, not the top',
        body: 'The highest rent in a project was somebody in a hurry with a company budget. The median is what the next tenant will pay.',
      },
      {
        title: 'Put it beside the alternative',
        body: 'A landlord arguing for more is usually comparing to a newer development. Show both on the same rows.',
        href: '/phase1/market/compare',
        linkLabel: 'Project comparison',
      },
    ],
  },
  {
    id: 'visible',
    title: 'Keep a listing visible',
    summary: 'Refreshing, featuring and what each is actually for.',
    minutes: 4,
    outcome: 'A listing that stays in front of people without daily work.',
    steps: [
      {
        title: 'Fix the health score first',
        body: 'Paid placement on a listing with three photographs and no description buys traffic that bounces. The health score says what is missing.',
        href: '/phase1/listings',
        linkLabel: 'Listing manager',
      },
      {
        title: 'Schedule a refresh',
        body: 'Keeps the listing near the top of new results without you editing it every morning. Alternate days is enough.',
        href: '/phase1/refresh',
        linkLabel: 'Automatic refresh',
      },
      {
        title: 'Feature it when it is not moving',
        body: 'A paid slot above the ordinary results, priced per day. Use it on a unit that is good and quiet, not on one that is overpriced.',
        href: '/phase1/featured',
        linkLabel: 'Featured placement',
      },
    ],
  },
];

export interface Session {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  presenter: string;
  recorded: string;
  chapters: { at: string; title: string }[];
}

export const SESSIONS: Session[] = [
  {
    id: 'tour',
    title: 'The workspace, end to end',
    summary: 'Every screen an agent touches in a week, in the order a week actually happens.',
    minutes: 24,
    presenter: 'V-RENT product team',
    recorded: '2026-07-14',
    chapters: [
      { at: '00:00', title: 'What the agent hub is for' },
      { at: '03:20', title: 'Creating a listing from a postal code' },
      { at: '09:05', title: 'Photographs and the quality check' },
      { at: '13:40', title: 'The publish gate, and why it blocks' },
      { at: '18:10', title: 'Enquiries, response time and handover' },
    ],
  },
  {
    id: 'compliance',
    title: 'CEA compliance without thinking about it',
    summary: 'What the advertising rules require, and where the platform carries it for you.',
    minutes: 18,
    presenter: 'V-RENT product team',
    recorded: '2026-07-28',
    chapters: [
      { at: '00:00', title: 'What has to appear on an advertisement' },
      { at: '04:15', title: 'Registration checks against the public register' },
      { at: '09:30', title: 'The compliance block on exports' },
      { at: '13:50', title: 'What happens when a registration lapses' },
    ],
  },
  {
    id: 'market',
    title: 'Pricing a unit in front of a landlord',
    summary: 'Using transaction evidence in the conversation rather than after it.',
    minutes: 21,
    presenter: 'V-RENT product team',
    recorded: '2026-08-11',
    chapters: [
      { at: '00:00', title: 'Which comparables count' },
      { at: '05:40', title: 'Median against asking' },
      { at: '11:15', title: 'Two projects side by side' },
      { at: '16:00', title: 'When to tell a landlord no' },
    ],
  },
  {
    id: 'portfolio',
    title: 'Running twenty listings without dropping one',
    summary: 'Refreshes, featuring, expiry and the reports that catch what you missed.',
    minutes: 16,
    presenter: 'V-RENT product team',
    recorded: '2026-08-25',
    chapters: [
      { at: '00:00', title: 'Reading the listing manager at a glance' },
      { at: '04:30', title: 'Scheduling refreshes for a portfolio' },
      { at: '08:45', title: 'The compliance and expiry report' },
      { at: '12:20', title: 'Client shortlists before a viewing day' },
    ],
  },
];

export const SUPPORT_AREAS = [
  'Signing in and account access',
  'CEA verification',
  'Creating or editing a listing',
  'Photographs and uploads',
  'Enquiries and viewings',
  'Subscription, billing and receipts',
  'Featured placement and refreshes',
  'Reports and exports',
  'Something else',
];
