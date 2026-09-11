/**
 * The report filter set, and the rows it produces.
 *
 * Two screens need exactly the same answer: the report builder, where the agent
 * narrows things down and watches the count, and the printable document, which
 * has to contain the set they were looking at when they pressed the button. The
 * only safe way to guarantee that is for both to run this code over the same
 * filter object, carried between them in the URL.
 */

import type { DemoListing } from './data';
import type { Enquiry } from './workspace';
import { dealOf } from './pricing';
import { districtName, listingStats, ENQUIRY_STATUS } from './performance';
import { listingHealth } from './health';

export type ReportKind = 'inventory' | 'enquiries' | 'performance' | 'compliance';

export interface ReportFilters {
  kind: ReportKind;
  /** '7' | '30' | '90' | '180' | '365' | 'all' | 'custom' */
  period: string;
  from: string;
  to: string;
  status: string[];
  deal: 'all' | 'rent' | 'sale';
  district: string;
  beds: string;
  types: string[];
  furnishing: string;
  minPrice: string;
  maxPrice: string;
  minSize: string;
  maxSize: string;
  /** Only listings with at least this health score. */
  minHealth: string;
  /** Enquiry filters, used by the enquiry report. */
  enquiryStatus: string[];
  channel: string;
  /** Free text over reference, project, address and unit. */
  q: string;
  sort: string;
  dir: 'asc' | 'desc';
}

export const PROPERTY_TYPES = ['Condominium', 'HDB', 'Apartment', 'Landed', 'Executive Condominium'] as const;
export const FURNISHINGS = ['Unfurnished', 'Partially furnished', 'Fully furnished'] as const;
export const LISTING_STATUSES = ['published', 'draft', 'pending_review', 'paused', 'rejected', 'expired'] as const;
export const ENQUIRY_STATUSES = ['new', 'replied', 'viewing', 'closed'] as const;
export const CHANNELS = ['V-RENT', 'WhatsApp', 'Phone'] as const;

export const PERIODS = [
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last quarter' },
  { key: '180', label: 'Last 6 months' },
  { key: '365', label: 'Last year' },
  { key: 'all', label: 'Everything' },
  { key: 'custom', label: 'Custom range' },
];

export const SORTS: { key: string; label: string; kinds: ReportKind[] }[] = [
  { key: 'created', label: 'Date created', kinds: ['inventory', 'performance', 'compliance'] },
  { key: 'price', label: 'Price', kinds: ['inventory', 'performance', 'compliance'] },
  { key: 'project', label: 'Project name', kinds: ['inventory', 'performance', 'compliance'] },
  { key: 'district', label: 'District', kinds: ['inventory', 'performance', 'compliance'] },
  { key: 'views', label: 'Views', kinds: ['performance'] },
  { key: 'health', label: 'Listing health', kinds: ['performance', 'compliance'] },
  { key: 'received', label: 'Date received', kinds: ['enquiries'] },
  { key: 'name', label: 'Name', kinds: ['enquiries'] },
];

export const KIND_LABEL: Record<ReportKind, string> = {
  inventory: 'Listing inventory',
  enquiries: 'Enquiries',
  performance: 'Performance',
  compliance: 'Compliance and expiry',
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function defaultFilters(today: Date): ReportFilters {
  return {
    kind: 'inventory',
    period: '30',
    from: iso(new Date(today.getTime() - 30 * 86_400_000)),
    to: iso(today),
    status: [],
    deal: 'all',
    district: 'all',
    beds: 'all',
    types: [],
    furnishing: 'all',
    minPrice: '',
    maxPrice: '',
    minSize: '',
    maxSize: '',
    minHealth: '',
    enquiryStatus: [],
    channel: 'all',
    q: '',
    sort: 'created',
    dir: 'desc',
  };
}

/* -------------------------------------------------------- URL carriage */

export function filtersToQuery(f: ReportFilters): string {
  const p = new URLSearchParams();
  p.set('kind', f.kind);
  p.set('period', f.period);
  if (f.period === 'custom') { p.set('from', f.from); p.set('to', f.to); }
  if (f.status.length) p.set('status', f.status.join('.'));
  if (f.deal !== 'all') p.set('deal', f.deal);
  if (f.district !== 'all') p.set('district', f.district);
  if (f.beds !== 'all') p.set('beds', f.beds);
  if (f.types.length) p.set('types', f.types.join('.'));
  if (f.furnishing !== 'all') p.set('furnishing', f.furnishing);
  if (f.minPrice) p.set('minPrice', f.minPrice);
  if (f.maxPrice) p.set('maxPrice', f.maxPrice);
  if (f.minSize) p.set('minSize', f.minSize);
  if (f.maxSize) p.set('maxSize', f.maxSize);
  if (f.minHealth) p.set('minHealth', f.minHealth);
  if (f.enquiryStatus.length) p.set('estatus', f.enquiryStatus.join('.'));
  if (f.channel !== 'all') p.set('channel', f.channel);
  if (f.q) p.set('q', f.q);
  p.set('sort', f.sort);
  p.set('dir', f.dir);
  return p.toString();
}

export function filtersFromQuery(p: URLSearchParams, today: Date): ReportFilters {
  const base = defaultFilters(today);
  const list = (k: string) => (p.get(k) ? p.get(k)!.split('.').filter(Boolean) : []);
  const kind = p.get('kind') as ReportKind | null;
  return {
    ...base,
    kind: kind && kind in KIND_LABEL ? kind : base.kind,
    period: p.get('period') ?? base.period,
    from: p.get('from') ?? base.from,
    to: p.get('to') ?? base.to,
    status: list('status'),
    deal: (p.get('deal') as ReportFilters['deal']) ?? 'all',
    district: p.get('district') ?? 'all',
    beds: p.get('beds') ?? 'all',
    types: list('types'),
    furnishing: p.get('furnishing') ?? 'all',
    minPrice: p.get('minPrice') ?? '',
    maxPrice: p.get('maxPrice') ?? '',
    minSize: p.get('minSize') ?? '',
    maxSize: p.get('maxSize') ?? '',
    minHealth: p.get('minHealth') ?? '',
    enquiryStatus: list('estatus'),
    channel: p.get('channel') ?? 'all',
    q: p.get('q') ?? '',
    sort: p.get('sort') ?? base.sort,
    dir: (p.get('dir') as 'asc' | 'desc') ?? base.dir,
  };
}

/* ------------------------------------------------------------ selection */

export function reportWindow(f: ReportFilters, today: Date): { from: string; to: string } | null {
  if (f.period === 'all') return null;
  if (f.period === 'custom') return { from: f.from, to: f.to };
  const days = Number(f.period) || 30;
  return { from: iso(new Date(today.getTime() - days * 86_400_000)), to: iso(today) };
}

const price = (l: DemoListing) => (dealOf(l) === 'sale' ? (l.salePriceSgd ?? 0) : l.monthlyRent);

export function selectListings(all: DemoListing[], f: ReportFilters, today: Date): DemoListing[] {
  const w = reportWindow(f, today);
  const min = Number(f.minPrice) || 0;
  const max = Number(f.maxPrice) || Infinity;
  const minSize = Number(f.minSize) || 0;
  const maxSize = Number(f.maxSize) || Infinity;
  const minHealth = Number(f.minHealth) || 0;
  const q = f.q.trim().toLowerCase();

  const rows = all.filter((l) => {
    if (l.archived) return false;
    if (f.status.length && !f.status.includes(l.status)) return false;
    if (f.deal !== 'all' && dealOf(l) !== f.deal) return false;
    if (f.district !== 'all' && String(l.district) !== f.district) return false;
    if (f.beds !== 'all' && (f.beds === '4' ? l.bedrooms < 4 : String(l.bedrooms) !== f.beds)) return false;
    if (f.types.length && !f.types.includes(l.propertyType)) return false;
    if (f.furnishing !== 'all' && l.furnishing !== f.furnishing) return false;
    const p = price(l);
    if (p < min || p > max) return false;
    if (l.sizeSqft < minSize || l.sizeSqft > maxSize) return false;
    if (minHealth && listingHealth(l).score < minHealth) return false;
    if (q && !`${l.reference} ${l.project} ${l.address} ${l.unitNo} ${l.postalCode}`.toLowerCase().includes(q)) return false;
    // Enquiries are windowed on the enquiry, not on when the listing was made.
    if (f.kind !== 'enquiries' && w) {
      const created = (l.createdAt ?? '').slice(0, 10);
      if (created && (created < w.from || created > w.to)) return false;
    }
    return true;
  });

  return sortListings(rows, f);
}

function sortListings(rows: DemoListing[], f: ReportFilters): DemoListing[] {
  const dir = f.dir === 'asc' ? 1 : -1;
  const value = (l: DemoListing): string | number => {
    switch (f.sort) {
      case 'price': return price(l);
      case 'project': return `${l.project} ${l.unitNo}`;
      case 'district': return l.district;
      case 'views': return listingStats(l).views30d;
      case 'health': return listingHealth(l).score;
      default: return l.createdAt ?? '';
    }
  };
  return [...rows].sort((a, b) => {
    const va = value(a), vb = value(b);
    const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return r * dir;
  });
}

export function selectEnquiries(all: Enquiry[], listings: DemoListing[], f: ReportFilters, today: Date): Enquiry[] {
  const w = reportWindow(f, today);
  const ids = new Set(listings.map((l) => l.id));
  const q = f.q.trim().toLowerCase();
  const dir = f.dir === 'asc' ? 1 : -1;

  const rows = all.filter((e) => {
    if (!ids.has(e.listingId)) return false;
    if (w) {
      const at = e.at.slice(0, 10);
      if (at < w.from || at > w.to) return false;
    }
    if (f.enquiryStatus.length && !f.enquiryStatus.includes(e.status)) return false;
    if (f.channel !== 'all' && e.channel !== f.channel) return false;
    if (q && !`${e.name} ${e.contact} ${e.message}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return rows.sort((a, b) => {
    const r = f.sort === 'name' ? a.name.localeCompare(b.name) : a.at.localeCompare(b.at);
    return r * dir;
  });
}

/* ---------------------------------------------------------------- rows */

export interface ReportTable {
  columns: string[];
  rows: (string | number)[][];
  /** Columns holding money, so a printed table can right-align and format them. */
  numeric: number[];
}

const dstr = (d: number) => `D${String(d).padStart(2, '0')} ${districtName(d)}`;

export function buildTable(
  f: ReportFilters,
  listings: DemoListing[],
  enquiries: Enquiry[],
): ReportTable {
  const byId = new Map(listings.map((l) => [l.id, l]));

  if (f.kind === 'enquiries') {
    return {
      columns: ['Received', 'Listing', 'Reference', 'Unit', 'Name', 'Contact', 'Channel', 'Status',
        'Budget (S$)', 'Move in', 'Message'],
      numeric: [8],
      rows: enquiries.map((e) => {
        const l = byId.get(e.listingId);
        return [
          e.at.slice(0, 10), l?.project ?? e.listingId, l?.reference ?? '', l?.unitNo ?? '',
          e.name, e.contact, e.channel, ENQUIRY_STATUS[e.status].label,
          e.budget ?? '', e.moveIn ?? '', e.message.replace(/\s+/g, ' ').trim(),
        ];
      }),
    };
  }

  if (f.kind === 'performance') {
    return {
      columns: ['Reference', 'Project', 'Unit', 'Status', 'Views (30 days)', 'Views (7 days)',
        'Enquiries (30 days)', 'Saves', 'Enquiries per 100 views', 'Listing health'],
      numeric: [4, 5, 6, 7, 8, 9],
      rows: listings.map((l) => {
        const s = listingStats(l);
        return [
          l.reference, l.project, l.unitNo, l.status, s.views30d, s.views7d,
          s.enquiries30d, s.saves, Number(s.conversion.toFixed(1)), listingHealth(l).score,
        ];
      }),
    };
  }

  if (f.kind === 'compliance') {
    return {
      columns: ['Reference', 'Project', 'Unit', 'Status', 'Published', 'Expires', 'Days left',
        'Photos', 'Floor plan', 'Listing health', 'What is missing'],
      numeric: [6, 7, 9],
      rows: listings.map((l) => {
        const h = listingHealth(l);
        const days = l.expiresAt
          ? Math.round((new Date(l.expiresAt).getTime() - Date.now()) / 86_400_000)
          : '';
        return [
          l.reference, l.project, l.unitNo, l.status, l.publishedAt?.slice(0, 10) ?? '',
          l.expiresAt?.slice(0, 10) ?? '', days, l.photos?.length ?? l.images,
          l.hasFloorPlan ? 'Yes' : 'No', h.score,
          h.missing.map((i) => i.label).join('; ') || 'Nothing',
        ];
      }),
    };
  }

  return {
    columns: ['Reference', 'Status', 'Deal', 'Project', 'Unit', 'Address', 'Postal code', 'District',
      'Property type', 'Bedrooms', 'Bathrooms', 'Size (sqft)', 'Price (S$)', 'Furnishing', 'Photos',
      'Created', 'Published', 'Expires'],
    numeric: [9, 10, 11, 12, 14],
    rows: listings.map((l) => [
      l.reference, l.status, dealOf(l), l.project, l.unitNo, l.address, l.postalCode, dstr(l.district),
      l.propertyType, l.bedrooms, l.bathrooms, l.sizeSqft, price(l),
      l.furnishing, l.photos?.length ?? l.images,
      l.createdAt?.slice(0, 10) ?? '', l.publishedAt?.slice(0, 10) ?? '', l.expiresAt?.slice(0, 10) ?? '',
    ]),
  };
}

/** The filters in words, for the top of a printed report. */
export function describeFilters(f: ReportFilters, today: Date): string[] {
  const out: string[] = [];
  const w = reportWindow(f, today);
  out.push(w ? `Period: ${w.from} to ${w.to}` : 'Period: all time');
  if (f.status.length) out.push(`Standing: ${f.status.join(', ').replace(/_/g, ' ')}`);
  if (f.deal !== 'all') out.push(`Deal: for ${f.deal}`);
  if (f.district !== 'all') out.push(`District: ${dstr(Number(f.district))}`);
  if (f.beds !== 'all') out.push(`Bedrooms: ${f.beds === '4' ? '4 or more' : f.beds}`);
  if (f.types.length) out.push(`Property type: ${f.types.join(', ')}`);
  if (f.furnishing !== 'all') out.push(`Furnishing: ${f.furnishing}`);
  if (f.minPrice || f.maxPrice) out.push(`Price: ${f.minPrice || 'any'} to ${f.maxPrice || 'any'}`);
  if (f.minSize || f.maxSize) out.push(`Size: ${f.minSize || 'any'} to ${f.maxSize || 'any'} sqft`);
  if (f.minHealth) out.push(`Listing health at least ${f.minHealth}`);
  if (f.enquiryStatus.length) out.push(`Enquiry standing: ${f.enquiryStatus.join(', ')}`);
  if (f.channel !== 'all') out.push(`Channel: ${f.channel}`);
  if (f.q) out.push(`Matching “${f.q}”`);
  return out;
}

/** How many narrowing choices are in play, for the "3 filters applied" line. */
export function countFilters(f: ReportFilters): number {
  return [
    f.status.length > 0, f.deal !== 'all', f.district !== 'all', f.beds !== 'all',
    f.types.length > 0, f.furnishing !== 'all', Boolean(f.minPrice), Boolean(f.maxPrice),
    Boolean(f.minSize), Boolean(f.maxSize), Boolean(f.minHealth),
    f.enquiryStatus.length > 0, f.channel !== 'all', Boolean(f.q.trim()),
  ].filter(Boolean).length;
}
