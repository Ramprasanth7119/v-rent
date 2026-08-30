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
  | 'expired'
  | 'suspended';

export interface DemoListing {
  id: string;
  reference: string;
  agent: string;
  description?: string;
  project: string;
  address: string;
  postalCode: string;
  unitNo: string;
  district: number;
  propertyType: 'Condominium' | 'HDB' | 'Apartment' | 'Landed' | 'Executive Condominium';
  updatedAt?: string;
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
    reference: "VR-24081",
    agent: "Tan Wei Ming",
    description: "High-floor two bedroom with an unobstructed view across Marina Bay. Fully fitted kitchen, built-in wardrobes throughout, and direct sheltered access to Downtown MRT.",
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
    reference: "VR-24077",
    agent: "Tan Wei Ming",
    description: "Well-kept executive flat a short walk from Rivervale Plaza. Corner unit, bright through most of the day, with an enclosed kitchen and service yard.",
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
    reference: "VR-24102",
    agent: "Tan Wei Ming",
    description: "Efficient one bedroom in a newly completed development. Pool-facing, no west sun, and vacant for immediate handover.",
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
    reference: "VR-24066",
    agent: "Tan Wei Ming",
    description: "Two bedroom facing the internal garden. Quiet stack away from the main road, walking distance to Tampines Hub and three MRT lines.",
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
    reference: "VR-24058",
    agent: "Tan Wei Ming",
    description: "Freehold three bedroom on a high floor with a dual-aspect living area. Marble flooring, private lift lobby, and a full-height balcony.",
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
    updatedAt: '2026-08-19',
  },
  {
    id: 'lst-6', reference: 'VR-24110', agent: 'Tan Wei Ming',
    description: 'Corner terrace on a quiet cul-de-sac off Upper East Coast Road. Four bedrooms plus a study, private car porch for two, and a landscaped rear garden.',
    project: 'Frankel Estate', address: '31 Jalan Sempadan', postalCode: '457409', unitNo: '—',
    district: 15, propertyType: 'Landed', bedrooms: 4, bathrooms: 4, sizeSqft: 3210, monthlyRent: 12500,
    availableFrom: '2026-10-15', minLeaseMonths: 24, furnishing: 'Partially furnished',
    status: 'published', images: 19, createdAt: '2026-07-22', updatedAt: '2026-08-20', publishedAt: '2026-07-23', expiresAt: '2026-10-21',
  },
  {
    id: 'lst-7', reference: 'VR-24112', agent: 'Tan Wei Ming',
    description: 'Executive condominium three-bedder facing the pool. Fully fitted kitchen, two covered lots, and a five-minute walk to Sengkang MRT.',
    project: 'Rivercove Residences', address: '35 Anchorvale Lane', postalCode: '544672', unitNo: '#11-07',
    district: 19, propertyType: 'Executive Condominium', bedrooms: 3, bathrooms: 2, sizeSqft: 1055, monthlyRent: 4300,
    availableFrom: '2026-09-15', minLeaseMonths: 12, furnishing: 'Fully furnished',
    status: 'pending_review', images: 12, createdAt: '2026-08-27', updatedAt: '2026-08-28',
  },
  {
    id: 'lst-8', reference: 'VR-24049', agent: 'Tan Wei Ming',
    description: 'Renovated four-room flat opposite Bedok Mall, with a study nook and a bright corner kitchen.',
    project: 'Blk 39 Chai Chee Avenue', address: '39 Chai Chee Avenue', postalCode: '461039', unitNo: '#06-118',
    district: 16, propertyType: 'HDB', bedrooms: 3, bathrooms: 2, sizeSqft: 968, monthlyRent: 3450,
    availableFrom: '2026-06-01', minLeaseMonths: 24, furnishing: 'Unfurnished',
    status: 'expired', images: 8, createdAt: '2026-05-02', updatedAt: '2026-08-01', publishedAt: '2026-05-03', expiresAt: '2026-08-01',
  },
  {
    id: 'lst-9', reference: 'VR-24105', agent: 'Tan Wei Ming',
    description: 'Walk-up apartment in a conserved shophouse row. High ceilings, original tiles, two minutes from Tiong Bahru Market.',
    project: 'Tiong Bahru Estate', address: '71 Seng Poh Road', postalCode: '160071', unitNo: '#02-15',
    district: 3, propertyType: 'Apartment', bedrooms: 2, bathrooms: 1, sizeSqft: 1120, monthlyRent: 4600,
    availableFrom: '2026-11-01', minLeaseMonths: 12, furnishing: 'Partially furnished',
    status: 'draft', images: 0, createdAt: '2026-08-26', updatedAt: '2026-08-26',
  },
  {
    id: 'lst-10', reference: 'VR-24087', agent: 'Tan Wei Ming',
    description: 'Ninth-floor one-bedder in a newly completed development on the Bukit Timah side of Newton. Unblocked, no west sun.',
    project: 'Kopar at Newton', address: '6 Kampong Java Road', postalCode: '228881', unitNo: '#09-03',
    district: 9, propertyType: 'Condominium', bedrooms: 1, bathrooms: 1, sizeSqft: 484, monthlyRent: 4200,
    availableFrom: '2026-09-01', minLeaseMonths: 12, furnishing: 'Fully furnished',
    status: 'published', images: 16, createdAt: '2026-08-08', updatedAt: '2026-08-09', publishedAt: '2026-08-09', expiresAt: '2026-11-07',
  },
  {
    id: 'lst-11', reference: 'VR-24091', agent: 'Tan Wei Ming',
    description: 'Five-room flat on a high floor with a sea-facing balcony. Two minutes from Marine Parade MRT on the Thomson–East Coast Line.',
    project: 'Blk 82 Marine Parade Central', address: '82 Marine Parade Central', postalCode: '440082', unitNo: '#19-337',
    district: 15, propertyType: 'HDB', bedrooms: 3, bathrooms: 2, sizeSqft: 1206, monthlyRent: 4100,
    availableFrom: '2026-10-01', minLeaseMonths: 24, furnishing: 'Partially furnished',
    status: 'published', images: 13, createdAt: '2026-08-12', updatedAt: '2026-08-14', publishedAt: '2026-08-13', expiresAt: '2026-11-11',
  },
  {
    id: 'lst-12', reference: 'VR-24108', agent: 'Tan Wei Ming',
    description: 'Ground-floor two-bedder with a private patio, next to the tennis courts. Pet-friendly landlord.',
    project: 'Parc Esta', address: '900 Sims Avenue', postalCode: '408627', unitNo: '#01-42',
    district: 14, propertyType: 'Condominium', bedrooms: 2, bathrooms: 2, sizeSqft: 721, monthlyRent: 4350,
    availableFrom: '2026-09-20', minLeaseMonths: 12, furnishing: 'Fully furnished',
    status: 'draft', images: 5, createdAt: '2026-08-27', updatedAt: '2026-08-27',
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
  {
    id: 'mod-4',
    reference: 'VR-24112',
    project: 'Rivercove Residences',
    agent: 'Tan Wei Ming',
    submittedAt: '2026-08-28 09:40',
  },
  {
    id: 'mod-5',
    reference: 'VR-24101',
    project: 'Blk 265 Toh Guan Road',
    agent: 'Nurul Aisyah',
    submittedAt: '2026-08-27 10:18',
    flag: 'Description contains a mobile number — contact details are not permitted in the listing text',
  },
];

/* ------------------------------------------------- admin: subscriptions */

export const SUBSCRIPTIONS: SubscriptionRow[] = [
  { agent: 'Tan Wei Ming', plan: 'Professional', status: 'active', method: 'PayNow', renewsOn: '2027-08-04', amountSgd: 1188 },
  { agent: 'Priya Nair', plan: 'Starter', status: 'active', method: 'PayNow', renewsOn: '2027-02-19', amountSgd: 588 },
  { agent: 'Daniel Ong', plan: 'Premium', status: 'past_due', method: 'Card', renewsOn: '2026-08-25', amountSgd: 2388 },
  { agent: 'Sherry Tan', plan: 'Professional', status: 'active', method: 'Card', renewsOn: '2027-05-30', amountSgd: 1188 },
  { agent: 'Marcus Lim', plan: 'Professional', status: 'expired', method: 'Card', renewsOn: '2026-06-30', amountSgd: 1188 },
  { agent: 'Nurul Aisyah', plan: 'Starter', status: 'active', method: 'PayNow', renewsOn: '2027-07-12', amountSgd: 588 },
  { agent: 'Kevin Chua', plan: 'Premium', status: 'active', method: 'PayNow', renewsOn: '2027-04-03', amountSgd: 2388 },
  { agent: 'Rachel Goh', plan: 'Professional', status: 'cancelled', method: 'Card', renewsOn: '2026-09-14', amountSgd: 1188 },
];

/* --------------------------------------------------------- admin: audit */

export const AUDIT_LOG: AuditRow[] = [
  { at: '2026-08-28 08:31', actor: 'system', action: 'CEA register synchronised (4,812 records)', entity: 'cea_registry_records' },
  { at: '2026-08-28 08:12', actor: 'ops.lena', action: 'Approved agent after strong registry match', entity: 'agent:R052184C' },
  { at: '2026-08-28 07:55', actor: 'agent.tan', action: 'Submitted listing for review', entity: 'listing:VR-24103' },
  { at: '2026-08-27 19:44', actor: 'system', action: 'Payment webhook verified, subscription activated', entity: 'subscription:sub_8841' },
  { at: '2026-08-27 16:20', actor: 'ops.marcus', action: 'Rejected listing — photographs inconsistent', entity: 'listing:VR-24058' },
  { at: '2026-08-27 09:02', actor: 'system', action: 'Agent moved to verification_expired', entity: 'agent:R058921A' },
  { at: '2026-08-26 17:31', actor: 'ops.lena', action: 'Approved listing in moderation', entity: 'listing:VR-24091' },
  { at: '2026-08-26 14:10', actor: 'agent.priya', action: 'Paused listing', entity: 'listing:VR-24093' },
  { at: '2026-08-26 11:45', actor: 'finance.ho', action: 'Refund issued — duplicate charge', entity: 'invoice:inv_2291' },
  { at: '2026-08-25 09:00', actor: 'system', action: 'Renewal payment failed, subscription moved to past_due', entity: 'subscription:sub_8790' },
  { at: '2026-08-24 16:22', actor: 'agent.tan', action: 'Bulk import — 4 drafts created, 2 rows skipped', entity: 'import:imp_118' },
  { at: '2026-08-24 10:05', actor: 'ops.marcus', action: 'Requested more information from agent', entity: 'agent:R061947B' },
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
  suspended: 'Suspended',
};
