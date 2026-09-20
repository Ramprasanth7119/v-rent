/**
 * What a crawler may read.
 *
 * The tenant site is meant to be found; everything else is not. The agent
 * workspace, the operations console, the share links and the API are all
 * disallowed — not as a security measure, which is the server's job, but so
 * that a sign-in page never becomes the search result for somebody's flat.
 *
 * The share prefix is excluded for a different reason again: those addresses
 * are sent to one person about one unit, and they forward to the public
 * listing, which is the address that should be indexed instead.
 */

import type { MetadataRoute } from 'next';
import { absolute, publicOrigin } from '../lib/phase1/public-origin';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await publicOrigin();
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/phase1/homes'],
        disallow: [
          '/api/',
          '/phase1/admin',
          '/phase1/dashboard',
          '/phase1/listings',
          '/phase1/enquiries',
          '/phase1/viewings',
          '/phase1/insights',
          '/phase1/reports',
          '/phase1/performance',
          '/phase1/profile',
          '/phase1/settings',
          '/phase1/checkout',
          '/phase1/plans',
          '/phase1/payment',
          '/phase1/share/',
          '/phase1/qr',
          '/phase1/login',
          '/phase1/signup',
          '/phase1/forgot',
          '/phase1/reset',
          '/phase1/verify',
        ],
      },
    ],
    sitemap: absolute(origin, '/sitemap.xml'),
  };
}
