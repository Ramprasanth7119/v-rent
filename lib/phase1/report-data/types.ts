/**
 * Where the property report gets its figures.
 *
 * The report renders one model — contracts, history, trend, comparables,
 * competing listings, nearby places, photographs — and never asks where it came
 * from. A provider answers each question. The original provider reads the
 * property's own data and the live lookups; the demo provider generates
 * illustrative figures around the property. Choosing between them happens once,
 * from the toolbar switch, in `providerFor`.
 */

import type { DemoListing } from '../data';
import type { AmenityGroup } from '../amenities';
import type { PlaceKind, PlacesLookup } from '../places';
import type { Project, Transaction } from '../market';
import type { MarketResult } from '../market-position';
import type { DealType } from '../pricing';
import type { CompetingResult, HistoryResult, UnitListing } from '../report-insights';

export type ReportDataMode = 'original' | 'demo';

/** Everyday amenities around one property, as the neighbourhood lookup returns them. */
export type Around = { groups: AmenityGroup[]; missing: string[]; retrievedAt?: string };

export interface ReportDataProvider {
  readonly mode: ReportDataMode;
  /** Printed on every sheet and in the toolbar while this provider's figures are shown. Null for original data. */
  readonly notice: string | null;
  /** How the contract figures are described in the report. */
  readonly dataset: {
    live: boolean;
    name: string;
    publisher: string;
    coverage: string;
    note: string;
    /** The badge beside a market figure. Null when the figures need none. */
    badge: string | null;
  };
  /** Replaces the closing sentence about the market figures' source. Undefined keeps the dataset's own wording. */
  readonly marketNote?: string | null;
  /** How competing listings are described: "listings live on V-RENT", or the demo equivalent. */
  readonly activeSource: string;
  /** The source to credit for a public dataset. */
  credit(publisher: string): string;
  /** Labels and sentences that say where the figures came from. */
  readonly wording: {
    /** Badge for a neighbourhood dataset that answered in full. */
    verified: string;
    /** The data-confidence row for the contract dataset. */
    datasetBadge: string;
    datasetDetail: string;
    /** Closes the confidence note under the price position. */
    shortNote: string;
    /** Fine print under the development sheet. */
    developmentNote: string;
    /** Fine print under the competing listings. */
    activeNote(deal: DealType): string;
    /** The sources-page line for competing listings. */
    activeRow(date: string): string;
    /** Fine print under the location sheet. */
    retrieved(date: string): string;
  };

  /** The contracts behind price position, comparables, history, trend and the development mix. */
  contracts(l: DemoListing): Transaction[];
  development(l: DemoListing): Project | null;
  position(l: DemoListing): MarketResult;
  history(l: DemoListing): HistoryResult;
  earlier(l: DemoListing, all: DemoListing[]): UnitListing[];
  photos(ownerId: string | undefined, l: DemoListing): string[];

  places(l: DemoListing, kind: PlaceKind, signal?: AbortSignal): Promise<PlacesLookup>;
  around(l: DemoListing, signal?: AbortSignal): Promise<Around | null>;
  competing(l: DemoListing, signal?: AbortSignal): Promise<CompetingResult>;
}
