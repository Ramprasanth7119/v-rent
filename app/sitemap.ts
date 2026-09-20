/**
 * The sitemap: every public page that has something on it.
 *
 * Built from the live marketplace, not from a static list, so it says what is
 * actually there. An area with nothing live is not in it, because the page it
 * would point at answers 404 — and a sitemap full of 404s is how a marketplace
 * teaches a search engine to stop trusting it.
 *
 * Only the tenant site is listed. The agent workspace and the operations
 * console are behind sign-in and have no business in here; `robots.ts` says
 * the same thing in the other direction.
 */

import type { MetadataRoute } from 'next';
import { marketAgents, marketListings } from '../lib/phase1/marketplace';
import { districtFacets, projectFacets, stationFacets } from '../lib/phase1/market-explore';
import { absolute, publicOrigin } from '../lib/phase1/public-origin';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await publicOrigin();
  const at = (path: string) => absolute(origin, path);

  /* An empty marketplace still has a front door and an explore page; both say
     so honestly rather than 404, so both stay listed. */
  let listings: Awaited<ReturnType<typeof marketListings>> = [];
  let agents: Awaited<ReturnType<typeof marketAgents>> = [];
  try {
    [listings, agents] = await Promise.all([marketListings(), marketAgents()]);
  } catch {
    /* The store is unavailable. Publish the fixed pages rather than nothing:
       an empty sitemap reads as "everything was removed". */
    return [
      { url: at('/phase1/homes'), changeFrequency: 'daily', priority: 1 },
      { url: at('/phase1/homes/search'), changeFrequency: 'daily', priority: 0.9 },
      { url: at('/phase1/homes/explore'), changeFrequency: 'daily', priority: 0.8 },
    ];
  }

  const newest = listings[0]?.listing.publishedAt;

  return [
    { url: at('/phase1/homes'), lastModified: newest, changeFrequency: 'daily', priority: 1 },
    { url: at('/phase1/homes/search'), changeFrequency: 'daily', priority: 0.9 },
    { url: at('/phase1/homes/search?deal=sale'), changeFrequency: 'daily', priority: 0.7 },
    { url: at('/phase1/homes/explore'), lastModified: newest, changeFrequency: 'daily', priority: 0.8 },
    { url: at('/phase1/homes/agents'), changeFrequency: 'weekly', priority: 0.6 },

    ...districtFacets(listings).map((f) => ({
      url: at(f.href), changeFrequency: 'daily' as const, priority: 0.7,
    })),
    ...stationFacets(listings).map((f) => ({
      url: at(f.href), changeFrequency: 'daily' as const, priority: 0.6,
    })),
    /* The same rule the explore page applies: a development with one unit is
       found through search, so only the ones with more than one are listed. */
    ...projectFacets(listings).filter((f) => f.count > 1).map((f) => ({
      url: at(f.href), changeFrequency: 'weekly' as const, priority: 0.6,
    })),

    ...agents.map(({ agent }) => ({
      url: at(`/phase1/homes/agent/${agent.id}`), changeFrequency: 'weekly' as const, priority: 0.5,
    })),

    ...listings.map((m) => ({
      url: at(`/phase1/homes/${m.ownerId}/${m.listing.id}`),
      lastModified: m.listing.updatedAt ?? m.listing.publishedAt ?? m.listing.createdAt,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];
}
