/**
 * V-RENT Phase 1 — static demo data.
 *
 * This is a presentation prototype. Nothing here talks to a server; every value
 * is fixed so the walkthrough behaves identically on every run.
 */

export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'paused'
  | 'rejected'
  | 'expired';

export interface DemoListing {
  id: string;
  reference: string;
  project: string;
  address: string;
  postalCode: string;
  unitNo: string;
  district: number;
  propertyType: 'Condominium' | 'HDB' | 'Apartment' | 'Landed';
  bedrooms: number;
  bathrooms: number;
  sizeSqft: number;
  monthlyRent: number;
  availableFrom: string;
  minLeaseMonths: number;
  furnishing: 'Unfurnished' | 'Partially furnished' | 'Fully furnished';
  status: ListingStatus;
  images: number;
  createdAt: string;
  publishedAt?: string;
  expiresAt?: string;
  rejectionReason?: string;
}

export interface PlanOption {
  code: 'starter' | 'professional' | 'premium';
  name: string;
  priceYearSgd: number;
  entitlements: { key: string; label: string; value: string }[];
  highlight?: string;
}

export interface VerificationCase {
  id: string;
  agentName: string;
  ceaNumber: string;
  agency: string;
  agencyLicence: string;
  submittedAt: string;
  match: 'strong' | 'weak' | 'not_found' | 'expired';
  discrepancy?: string;
  registryName?: string;
  registryExpiry?: string;
  evidence?: string;
}

export interface ModerationCase {
  id: string;
  reference: string;
  project: string;
  agent: string;
  submittedAt: string;
  flag?: string;
}

export interface SubscriptionRow {
  agent: string;
  plan: string;
  status: 'active' | 'past_due' | 'expired' | 'cancelled';
  method: 'PayNow' | 'Card';
  renewsOn: string;
  amountSgd: number;
}

export interface AuditRow {
  at: string;
  actor: string;
  action: string;
  entity: string;
}

/* ------------------------------------------------------------------ plans */

export const PLANS: PlanOption[] = [
  {
    code: 'starter',
    name: 'Starter',
    priceYearSgd: 588,
    entitlements: [
      { key: 'active_listing_limit', label: 'Active listings', value: '10' },
      { key: 'images_per_listing', label: 'Images per listing', value: '20' },
      { key: 'listing_duration_days', label: 'Listing duration', value: '60 days' },
      { key: 'featured_slots', label: 'Featured slots', value: 'None' },
    ],
  },
  {
    code: 'professional',
    name: 'Professional',
    priceYearSgd: 1188,
    highlight: 'Most agents',
    entitlements: [
      { key: 'active_listing_limit', label: 'Active listings', value: '30' },
      { key: 'images_per_listing', label: 'Images per listing', value: '30' },
      { key: 'listing_duration_days', label: 'Listing duration', value: '90 days' },
      { key: 'featured_slots', label: 'Featured slots', value: '2 (Phase 6)' },
    ],
  },
  {
    code: 'premium',
    name: 'Premium',
    priceYearSgd: 2388,
    entitlements: [
      { key: 'active_listing_limit', label: 'Active listings', value: '100' },
      { key: 'images_per_listing', label: 'Images per listing', value: '40' },
      { key: 'listing_duration_days', label: 'Listing duration', value: '120 days' },
      { key: 'featured_slots', label: 'Featured slots', value: '6 (Phase 6)' },
    ],
  },
];

/** Published incumbent pricing, verified 28 Aug 2026 — used for the comparison strip. */
export const INCUMBENT_PRICING = [
  { name: 'PropertyGuru Bronze', priceYearSgd: 1949, note: 'entry tier, after GST' },
  { name: 'PropertyGuru Platinum', priceYearSgd: 27455, note: 'top tier, after GST' },
];

/* --------------------------------------------------------------- listings */

export const SEED_LISTINGS: DemoListing[] = [
  {
    id: 'lst-1',
    reference: 'VR-24081',
    project: 'The Sail @ Marina Bay',
    address: '2 Marina Boulevard',
    postalCode: '018987',
    unitNo: '#34-12',
    district: 1,
    propertyType: 'Condominium',
    bedrooms: 2,
    bathrooms: 2,
    sizeSqft: 936,
    monthlyRent: 6800,
    availableFrom: '2026-09-15',
    minLeaseMonths: 12,
    furnishing: 'Fully furnished',
    status: 'published',
    images: 14,
    createdAt: '2026-08-02',
    publishedAt: '2026-08-04',
    expiresAt: '2026-11-02',
  },
  {
    id: 'lst-2',
    reference: 'VR-24077',
    project: 'Blk 118A Rivervale Drive',
    address: '118A Rivervale Drive',
    postalCode: '541118',
    unitNo: '#09-241',
    district: 19,
    propertyType: 'HDB',
    bedrooms: 3,
    bathrooms: 2,
    sizeSqft: 1001,
    monthlyRent: 3200,
    availableFrom: '2026-09-01',
    minLeaseMonths: 24,
    furnishing: 'Partially furnished',
    status: 'published',
    images: 11,
    createdAt: '2026-07-28',
    publishedAt: '2026-07-29',
    expiresAt: '2026-10-27',
  },
  {
    id: 'lst-3',
    reference: 'VR-24102',
    project: 'Normanton Park',
    address: '11 Normanton Park',
    postalCode: '119003',
    unitNo: '#17-08',
    district: 5,
    propertyType: 'Condominium',
    bedrooms: 1,
    bathrooms: 1,
    sizeSqft: 527,
    monthlyRent: 3900,
    availableFrom: '2026-10-01',
    minLeaseMonths: 12,
    furnishing: 'Unfurnished',
    status: 'draft',
    images: 3,
    createdAt: '2026-08-24',
  },
  {
    id: 'lst-4',
    reference: 'VR-24066',
    project: 'Treasure at Tampines',
    address: '39 Tampines Lane',
    postalCode: '528473',
    unitNo: '#05-22',
    district: 18,
    propertyType: 'Condominium',
    bedrooms: 2,
    bathrooms: 2,
    sizeSqft: 689,
    monthlyRent: 4100,
    availableFrom: '2026-08-20',
    minLeaseMonths: 12,
    furnishing: 'Partially furnished',
    status: 'paused',
    images: 9,
    createdAt: '2026-07-11',
    publishedAt: '2026-07-12',
    expiresAt: '2026-10-10',
  },
  {
    id: 'lst-5',
    reference: 'VR-24058',
    project: 'The Continuum',
    address: '8 Thiam Siew Avenue',
    postalCode: '428407',
    unitNo: '#12-04',
    district: 15,
    propertyType: 'Condominium',
    bedrooms: 3,
    bathrooms: 3,
    sizeSqft: 1206,
    monthlyRent: 8500,
    availableFrom: '2026-09-30',
    minLeaseMonths: 12,
    furnishing: 'Fully furnished',
    status: 'rejected',
    images: 7,
    createdAt: '2026-08-18',
    rejectionReason: 'Photographs appear to show a different unit type from the one described.',
  },
];

/* --------------------------------------------------- admin: verification */

export const VERIFICATION_QUEUE: VerificationCase[] = [
  {
    id: 'ver-1',
    agentName: 'Tan Wei Ming',
    ceaNumber: 'R052184C',
    agency: 'Huttons Asia Pte Ltd',
    agencyLicence: 'L3008899K',
    submittedAt: '2026-08-27 09:14',
    match: 'strong',
    registryName: 'TAN WEI MING',
    registryExpiry: '2027-03-31',
  },
  {
    id: 'ver-2',
    agentName: 'Priya Nair',
    ceaNumber: 'R061947B',
    agency: 'PropNex Realty Pte Ltd',
    agencyLicence: 'L3008022J',
    submittedAt: '2026-08-27 11:42',
    match: 'weak',
    discrepancy: 'Registry name is "NAIR PRIYA DEVI". Agency and registration number agree.',
    registryName: 'NAIR PRIYA DEVI',
    registryExpiry: '2027-01-31',
    evidence: 'CEA card (uploaded)',
  },
  {
    id: 'ver-3',
    agentName: 'Marcus Lim',
    ceaNumber: 'R058921A',
    agency: 'ERA Realty Network Pte Ltd',
    agencyLicence: 'L3002382K',
    submittedAt: '2026-08-26 16:05',
    match: 'expired',
    discrepancy: 'Registration lapsed on 2026-06-30 and does not appear in the current register.',
    registryName: 'LIM WEI KIAT MARCUS',
    registryExpiry: '2026-06-30',
  },
  {
    id: 'ver-4',
    agentName: 'Chloe Fernandez',
    ceaNumber: 'R079930X',
    agency: 'Independent',
    agencyLicence: '—',
    submittedAt: '2026-08-28 08:30',
    match: 'not_found',
    discrepancy: 'No matching registration number in the register copy retrieved 28 Aug 2026, 06:00.',
  },
];

/* ---------------------------------------------------- admin: moderation */

export const MODERATION_QUEUE: ModerationCase[] = [
  {
    id: 'mod-1',
    reference: 'VR-24103',
    project: 'Lentor Modern',
    agent: 'Tan Wei Ming',
    submittedAt: '2026-08-28 07:55',
  },
  {
    id: 'mod-2',
    reference: 'VR-24099',
    project: 'The Sail @ Marina Bay',
    agent: 'Priya Nair',
    submittedAt: '2026-08-27 19:20',
    flag: 'Possible duplicate — unit #34-12 already has a published listing',
  },
  {
    id: 'mod-3',
    reference: 'VR-24095',
    project: 'Blk 682B Jurong West',
    agent: 'Daniel Ong',
    submittedAt: '2026-08-27 14:02',
  },
];

/* ------------------------------------------------- admin: subscriptions */

export const SUBSCRIPTIONS: SubscriptionRow[] = [
  { agent: 'Tan Wei Ming', plan: 'Professional', status: 'active', method: 'PayNow', renewsOn: '2027-08-04', amountSgd: 1188 },
  { agent: 'Priya Nair', plan: 'Starter', status: 'active', method: 'PayNow', renewsOn: '2027-02-19', amountSgd: 588 },
  { agent: 'Daniel Ong', plan: 'Premium', status: 'past_due', method: 'Card', renewsOn: '2026-08-25', amountSgd: 2388 },
  { agent: 'Sherry Tan', plan: 'Professional', status: 'active', method: 'Card', renewsOn: '2027-05-30', amountSgd: 1188 },
  { agent: 'Marcus Lim', plan: 'Professional', status: 'expired', method: 'Card', renewsOn: '2026-06-30', amountSgd: 1188 },
];

/* --------------------------------------------------------- admin: audit */

export const AUDIT_LOG: AuditRow[] = [
  { at: '2026-08-28 08:31', actor: 'system', action: 'CEA register synchronised (4,812 records)', entity: 'cea_registry_records' },
  { at: '2026-08-28 08:12', actor: 'ops.lena', action: 'Approved agent after strong registry match', entity: 'agent:R052184C' },
  { at: '2026-08-28 07:55', actor: 'agent.tan', action: 'Submitted listing for review', entity: 'listing:VR-24103' },
  { at: '2026-08-27 19:44', actor: 'system', action: 'Payment webhook verified, subscription activated', entity: 'subscription:sub_8841' },
  { at: '2026-08-27 16:20', actor: 'ops.marcus', action: 'Rejected listing — photographs inconsistent', entity: 'listing:VR-24058' },
  { at: '2026-08-27 09:02', actor: 'system', action: 'Agent moved to verification_expired', entity: 'agent:R058921A' },
];

/* ------------------------------------------------------- admin: funnel */

export const FUNNEL = [
  { stage: 'Registered', count: 412 },
  { stage: 'Contact verified', count: 366 },
  { stage: 'Profile submitted', count: 291 },
  { stage: 'Approved', count: 248 },
  { stage: 'Subscribed', count: 187 },
  { stage: 'First listing published', count: 164 },
];

export const REJECTION_REASONS = [
  'Photographs appear to show a different unit',
  'Rent inconsistent with the stated unit size',
  'Description contains contact details',
  'Duplicate of an existing published listing',
  'Insufficient or unclear photographs',
];

/* ------------------------------------------------------------- helpers */

export const sgd = (n: number) =>
  'S$' + n.toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending review',
  published: 'Published',
  paused: 'Paused',
  rejected: 'Rejected',
  expired: 'Expired',
};
