/**
 * The property's original data: the listing as the agent saved it, its
 * uploaded photographs, the held contract dataset, and the live neighbourhood
 * and competing-listing lookups.
 *
 * A lookup that fails stays failed. The report then prints "Data unavailable"
 * or "Unable to verify"; nothing is filled in from anywhere else.
 *
 * The same goes for the contract dataset. Until the URA feed is connected
 * (`MARKET_SOURCE.live`) there are no held contracts, so price position,
 * comparables and history are reported as unavailable rather than drawn from
 * the illustrative set — that set belongs to the demo provider.
 */

import { MARKET_SOURCE, TRANSACTIONS } from '../market';
import { marketPosition } from '../market-position';
import { listingPhotos } from '../photos';
import type { PlacesLookup } from '../places';
import { developmentOf, earlierListings, marketHistory, type CompetingResult } from '../report-insights';
import type { Around, ReportDataProvider } from './types';

const HELD = MARKET_SOURCE.live ? TRANSACTIONS : [];

export const originalDataProvider: ReportDataProvider = {
  mode: 'original',
  notice: null,
  dataset: {
    live: MARKET_SOURCE.live,
    name: MARKET_SOURCE.name,
    publisher: MARKET_SOURCE.publisher,
    coverage: MARKET_SOURCE.coverage,
    note: MARKET_SOURCE.note,
    badge: MARKET_SOURCE.live ? null : 'Data unavailable',
  },
  marketNote: undefined,
  activeSource: 'listings live on V-RENT',
  credit: (publisher) => publisher,
  wording: {
    verified: 'Verified',
    datasetBadge: MARKET_SOURCE.live ? 'Verified' : 'Unavailable',
    datasetDetail: MARKET_SOURCE.live ? MARKET_SOURCE.publisher : 'The URA rental contract feed is not yet connected',
    shortNote: 'Market data unavailable: the URA contract feed is not yet connected.',
    developmentNote: 'Completion, tenure and unit count are from the V-RENT development reference. Confirm them with the developer or URA before relying on them. The developer is not recorded.',
    activeNote: (deal) => `Only listings live on V-RENT are included; listings on other portals are not. Figures are asking ${deal === 'rent' ? 'rents' : 'prices'}, not agreed terms. Advertisers are not named.`,
    activeRow: (date) => `Listings live on V-RENT on ${date}. Other portals are not included.`,
    retrieved: (date) => `Public datasets retrieved ${date}`,
  },

  contracts: () => HELD,
  development: developmentOf,
  position: (l) => marketPosition(l, HELD),
  history: (l) => marketHistory(l, HELD),
  earlier: earlierListings,
  photos: listingPhotos,
  enquiries: (own) => ({ enquiries: own.enquiries, listings: own.listings }),

  async places(l, kind, signal) {
    const q = new URLSearchParams({ kind, lat: String(l.lat), lng: String(l.lng), postal: l.postalCode });
    try {
      const res = await fetch(`/api/phase1/places?${q.toString()}`, { cache: 'no-store', signal });
      return (await res.json()) as PlacesLookup;
    } catch {
      return { status: 'failed', kind, reason: 'No answer' };
    }
  },

  async around(l, signal): Promise<Around | null> {
    try {
      const res = await fetch(`/api/phase1/neighbourhood?lat=${l.lat}&lng=${l.lng}&radius=1000`, { cache: 'no-store', signal });
      const body = (await res.json()) as { status: string } & Partial<Around>;
      return body.status === 'ok' ? { groups: body.groups ?? [], missing: body.missing ?? [], retrievedAt: body.retrievedAt } : null;
    } catch {
      return null;
    }
  },

  async competing(l, signal): Promise<CompetingResult> {
    try {
      const res = await fetch(`/api/phase1/competing?id=${encodeURIComponent(l.id)}`, { cache: 'no-store', signal });
      return res.ok ? ((await res.json()) as CompetingResult) : { status: 'failed', reason: `HTTP ${res.status}` };
    } catch {
      return { status: 'failed', reason: 'No answer' };
    }
  },
};
