/**
 * Agent roster and the listings belonging to agents other than the demo user.
 * Powers the back-office agent screens.
 */

import { DemoListing, SEED_LISTINGS } from './data';

export interface AgentRow {
  id: string;
  name: string;
  ceaNumber: string;
  agency: string;
  agencyLicence: string;
  status: 'approved' | 'under_review' | 'suspended' | 'verification_expired';
  plan: string | null;
  joinedAt: string;
  ceaValidUntil: string;
  email: string;
  mobile: string;
  bio: string;
  specialisations: string[];
  languages: string[];
}

export const AGENTS: AgentRow[] = [
  {
    id: 'agt-1', name: 'Tan Wei Ming', ceaNumber: 'R052184C',
    agency: 'Huttons Asia Pte Ltd', agencyLicence: 'L3008899K',
    status: 'approved', plan: 'Professional', joinedAt: '2026-07-04', ceaValidUntil: '2027-03-31',
    email: 'weiming.tan@huttons.example', mobile: '+65 9123 4567',
    bio: 'Seven years in East Coast and city-fringe rentals. Focused on expatriate leasing and HDB upgraders.',
    specialisations: ['Expatriate leasing', 'City fringe', 'HDB'],
    languages: ['English', 'Mandarin', 'Hokkien'],
  },
  {
    id: 'agt-2', name: 'Priya Nair', ceaNumber: 'R061947B',
    agency: 'PropNex Realty Pte Ltd', agencyLicence: 'L3008022J',
    status: 'approved', plan: 'Starter', joinedAt: '2026-08-02', ceaValidUntil: '2027-01-31',
    email: 'priya.nair@propnex.example', mobile: '+65 9234 5678',
    bio: 'Specialises in family relocations across the north-east, handling the tenancy from viewing to handover.',
    specialisations: ['Family relocation', 'North-east', 'Condominium'],
    languages: ['English', 'Tamil', 'Malay'],
  },
  {
    id: 'agt-3', name: 'Daniel Ong', ceaNumber: 'R047712F',
    agency: 'OrangeTee & Tie Pte Ltd', agencyLicence: 'L3009250K',
    status: 'approved', plan: 'Premium', joinedAt: '2026-05-19', ceaValidUntil: '2027-08-31',
    email: 'daniel.ong@orangetee.example', mobile: '+65 9345 6789',
    bio: 'Prime district leasing, primarily districts 9 to 11. Twelve years in the market.',
    specialisations: ['Prime district', 'Luxury leasing'],
    languages: ['English', 'Mandarin'],
  },
  {
    id: 'agt-4', name: 'Marcus Lim', ceaNumber: 'R058921A',
    agency: 'ERA Realty Network Pte Ltd', agencyLicence: 'L3002382K',
    status: 'verification_expired', plan: 'Professional', joinedAt: '2026-06-01', ceaValidUntil: '2026-06-30',
    email: 'marcus.lim@era.example', mobile: '+65 9456 7890',
    bio: 'Central region rentals and co-living placements.',
    specialisations: ['Co-living', 'Central region'],
    languages: ['English', 'Mandarin'],
  },
  {
    id: 'agt-5', name: 'Chloe Fernandez', ceaNumber: 'R079930X',
    agency: 'Independent', agencyLicence: '—',
    status: 'under_review', plan: null, joinedAt: '2026-08-28', ceaValidUntil: '—',
    email: 'chloe.f@example.com', mobile: '+65 9567 8901',
    bio: 'New registration, pending verification.',
    specialisations: [],
    languages: ['English'],
  },
];

export const OTHER_LISTINGS: DemoListing[] = [
  {
    id: 'oth-1', reference: 'VR-24090', agent: 'Priya Nair',
    description: 'Corner unit with an unblocked north-facing outlook, minutes from Sengkang interchange.',
    project: 'Rivervale Delta', address: '118B Rivervale Drive', postalCode: '541118', unitNo: '#12-330',
    district: 19, propertyType: 'HDB', bedrooms: 3, bathrooms: 2, sizeSqft: 1001, monthlyRent: 3300,
    availableFrom: '2026-09-20', minLeaseMonths: 24, furnishing: 'Partially furnished',
    status: 'published', images: 12, createdAt: '2026-08-06', publishedAt: '2026-08-07', expiresAt: '2026-11-05',
  },
  {
    id: 'oth-2', reference: 'VR-24093', agent: 'Priya Nair',
    description: 'Two bedroom in a mature estate, close to Compass One and the LRT.',
    project: 'The Topiary', address: '5 Fernvale Lane', postalCode: '797506', unitNo: '#08-14',
    district: 28, propertyType: 'Condominium', bedrooms: 2, bathrooms: 2, sizeSqft: 764, monthlyRent: 3600,
    availableFrom: '2026-10-05', minLeaseMonths: 12, furnishing: 'Fully furnished',
    status: 'published', images: 10, createdAt: '2026-08-11', publishedAt: '2026-08-12', expiresAt: '2026-11-10',
  },
  {
    id: 'oth-3', reference: 'VR-24071', agent: 'Daniel Ong',
    description: 'Penthouse duplex with a private roof terrace and skyline views across three aspects.',
    project: 'Martin Modern', address: '8 Martin Place', postalCode: '237992', unitNo: '#28-01',
    district: 9, propertyType: 'Condominium', bedrooms: 4, bathrooms: 4, sizeSqft: 2109, monthlyRent: 18500,
    availableFrom: '2026-09-10', minLeaseMonths: 24, furnishing: 'Fully furnished',
    status: 'published', images: 22, createdAt: '2026-07-15', publishedAt: '2026-07-16', expiresAt: '2026-10-14',
  },
  {
    id: 'oth-4', reference: 'VR-24074', agent: 'Daniel Ong',
    description: 'Freehold three bedroom off Orchard Boulevard, walking distance to Somerset MRT.',
    project: 'Boulevard 88', address: '88 Orchard Boulevard', postalCode: '248649', unitNo: '#19-03',
    district: 10, propertyType: 'Condominium', bedrooms: 3, bathrooms: 3, sizeSqft: 1798, monthlyRent: 16000,
    availableFrom: '2026-11-01', minLeaseMonths: 24, furnishing: 'Fully furnished',
    status: 'paused', images: 18, createdAt: '2026-07-20', publishedAt: '2026-07-21', expiresAt: '2026-10-19',
  },
  {
    id: 'oth-5', reference: 'VR-24088', agent: 'Marcus Lim',
    description: 'Co-living room with private bathroom, utilities and weekly cleaning included.',
    project: 'Cove @ Tiong Bahru', address: '55 Tiong Bahru Road', postalCode: '160055', unitNo: '#04-11',
    district: 3, propertyType: 'Apartment', bedrooms: 1, bathrooms: 1, sizeSqft: 320, monthlyRent: 1850,
    availableFrom: '2026-09-01', minLeaseMonths: 6, furnishing: 'Fully furnished',
    status: 'expired', images: 8, createdAt: '2026-06-02', publishedAt: '2026-06-03', expiresAt: '2026-09-01',
  },
];

/** Every listing in the prototype, across all agents. */
export const ALL_LISTINGS: DemoListing[] = [...SEED_LISTINGS, ...OTHER_LISTINGS];

export const listingsForAgent = (name: string) => ALL_LISTINGS.filter((l) => l.agent === name);

/** Per-listing activity, keyed by reference. */
export const LISTING_ACTIVITY: Record<string, { at: string; actor: string; what: string }[]> = {
  'VR-24081': [
    { at: '2026-08-04 10:22', actor: 'system', what: 'Published — the publish gate passed all five conditions' },
    { at: '2026-08-04 10:22', actor: 'system', what: 'Compliance snapshot captured and frozen' },
    { at: '2026-08-03 16:40', actor: 'ops.lena', what: 'Approved in moderation' },
    { at: '2026-08-03 15:02', actor: 'agent.tan', what: 'Submitted for review' },
    { at: '2026-08-02 11:15', actor: 'agent.tan', what: 'Draft created from a OneMap address match' },
  ],
  'VR-24058': [
    { at: '2026-08-19 09:30', actor: 'ops.marcus', what: 'Rejected — photographs inconsistent with the described unit' },
    { at: '2026-08-18 17:44', actor: 'agent.tan', what: 'Submitted for review' },
    { at: '2026-08-18 17:10', actor: 'agent.tan', what: 'Draft created' },
  ],
};

export const DEFAULT_ACTIVITY = [
  { at: '2026-08-24 14:02', actor: 'agent.tan', what: 'Draft created' },
];

/** Controlled amenity vocabulary — not free text. */
export const AMENITIES = [
  'Swimming pool', 'Gymnasium', 'Covered parking', 'Air conditioning',
  'Balcony', '24-hour security', 'BBQ pits', 'Children playground',
];
