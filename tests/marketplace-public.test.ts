/**
 * The public marketplace: the discovery layer, the price context, the demo
 * marketplace and the structured data.
 *
 * The rules being defended here are the ones that are easy to break later
 * without noticing: that a facet page only exists where there are homes, that
 * a price range is never drawn from three listings, that nothing demo can be
 * mistaken for real, and — the one that was already broken once — that no
 * public screen turns a straight-line distance into minutes.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DemoListing } from '../lib/phase1/data';
import type { MarketListing, PublicAgent } from '../lib/phase1/marketplace';
import {
  districtFacets, dominantSpread, intents, projectFacets, slug, spread, stationFacets, stationOf, typeFacets,
} from '../lib/phase1/market-explore';
import { ENOUGH, priceContext } from '../lib/phase1/market-compare';
import { demoMarketAgent, demoMarketListing, demoMarketListings } from '../lib/phase1/market-demo';
import { agentJsonLd, breadcrumbJsonLd, listingJsonLd } from '../lib/phase1/market-jsonld';

const root = join(__dirname, '..');
const source = (p: string) => readFileSync(join(root, p), 'utf8');

/**
 * The same file with its prose removed.
 *
 * The guards below look for a mistake, and one of these files explains that
 * mistake at length in its own header so the next person does not repeat it.
 * Matching the explanation and the code alike would force the comment out,
 * which is the opposite of what the guard is for.
 */
const code = (p: string) => source(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* ----------------------------------------------------------- fixtures */

const AGENT: PublicAgent = {
  id: 'agent-a', name: 'Lim Wei', callName: 'Wei', registeredName: 'Lim Wei',
  agency: 'Test Realty', agencyLicence: 'L100', ceaNumber: 'R100A',
  mobile: '+65 9000 0000', email: 'a@example.invalid', bio: '', experienceYears: '4',
  verified: true, memberSince: '2024-01-01',
};

let seq = 0;
function home(over: Partial<DemoListing> = {}, ownerId = 'agent-a'): MarketListing {
  seq += 1;
  const listing: DemoListing = {
    id: `l${seq}`, reference: `VR-${seq}`, agent: 'Lim Wei', project: 'Sample Court',
    address: '1 Sample Road', postalCode: '123456', unitNo: '', district: 15,
    propertyType: 'Condominium', bedrooms: 2, bathrooms: 2, sizeSqft: 800,
    monthlyRent: 4000, availableFrom: '2026-10-01', minLeaseMonths: 12,
    furnishing: 'Fully furnished', status: 'published', images: 0,
    createdAt: '2026-09-01', publishedAt: '2026-09-02',
    ...over,
  };
  return { ownerId, agent: { ...AGENT, id: ownerId }, listing, photos: [], thumbs: [] };
}

/* --------------------------------------------------------------- slugs */

describe('addresses for the discovery pages', () => {
  it('makes a development name safe to put in a path', () => {
    expect(slug('The Sail @ Marina Bay')).toBe('the-sail-marina-bay');
    expect(slug('Blk 118A Rivervale Drive')).toBe('blk-118a-rivervale-drive');
  });

  it('never produces a leading, trailing or doubled hyphen', () => {
    for (const raw of ['  Orchard  ', '@@@Bishan@@@', 'A -- B']) {
      const s = slug(raw);
      expect(s).not.toMatch(/^-|-$|--/);
    }
  });

  it('reads a station the several ways an agent writes one', () => {
    expect(stationOf({ nearestMrt: 'Downtown (DT17)' } as DemoListing)).toMatchObject({ name: 'Downtown', kind: 'MRT', slug: 'downtown' });
    expect(stationOf({ nearestMrt: 'Rumbia LRT' } as DemoListing)).toMatchObject({ name: 'Rumbia', kind: 'LRT' });
    expect(stationOf({ nearestMrt: 'Tampines West (DT31)' } as DemoListing)?.slug).toBe('tampines-west');
  });

  it('is nothing at all when the agent left it blank', () => {
    expect(stationOf({} as DemoListing)).toBeNull();
    expect(stationOf({ nearestMrt: '   ' } as DemoListing)).toBeNull();
    expect(stationOf({ nearestMrt: 'MRT' } as DemoListing)).toBeNull();
  });
});

/* -------------------------------------------------------------- facets */

describe('what explore offers', () => {
  const items = [
    home({ district: 15, monthlyRent: 3000, nearestMrt: 'Dakota (CC8)' }),
    home({ district: 15, monthlyRent: 5200, nearestMrt: 'Dakota (CC8)' }),
    home({ district: 9, monthlyRent: 7000, nearestMrt: 'Orchard (NS22)' }),
  ];

  it('counts each area from the homes actually in it', () => {
    const f = districtFacets(items);
    expect(f.map((x) => [x.slug, x.count])).toEqual([['15', 2], ['9', 1]]);
  });

  it('quotes the cheapest of each set, not an average', () => {
    expect(districtFacets(items)[0].from).toBe(3000);
  });

  it('quotes a rent where there are rentals, never the smaller sale number', () => {
    /* A sale at S$135,000 is not cheaper than a rent at S$4,200; comparing the
       two by the raw figure is comparing nothing. */
    const mixed = districtFacets([
      home({ district: 3, dealType: 'rent', monthlyRent: 4200 }),
      home({ district: 3, dealType: 'sale', salePriceSgd: 135_000 }),
    ]);
    expect(mixed[0].deal).toBe('rent');
    expect(mixed[0].from).toBe(4200);
  });

  it('quotes the sale where a set has nothing to rent', () => {
    const sales = districtFacets([home({ district: 4, dealType: 'sale', salePriceSgd: 549_000 })]);
    expect(sales[0].deal).toBe('sale');
    expect(sales[0].from).toBe(549_000);
  });

  it('offers no facet with nothing behind it', () => {
    for (const f of [...districtFacets(items), ...stationFacets(items), ...projectFacets(items), ...typeFacets(items, 'rent')]) {
      expect(f.count).toBeGreaterThan(0);
    }
  });

  it('groups two spellings of the same station together', () => {
    const f = stationFacets([
      home({ nearestMrt: 'Bishan (NS17)' }),
      home({ nearestMrt: 'Bishan MRT' }),
    ]);
    expect(f).toHaveLength(1);
    expect(f[0].count).toBe(2);
  });

  it('shows no property type nothing is listed under', () => {
    expect(typeFacets(items, 'rent').map((t) => t.label)).toEqual(['Condominium']);
    expect(typeFacets(items, 'sale')).toEqual([]);
  });

  it('drops an intent that would return nothing rather than showing a zero', () => {
    const ways = intents([home({ bedrooms: 1, monthlyRent: 9000, furnishing: 'Unfurnished', sizeSqft: 400 })]);
    expect(ways.every((w) => w.count > 0)).toBe(true);
    expect(ways.map((w) => w.label)).not.toContain('Family homes');
    expect(ways.map((w) => w.label)).not.toContain('For sale');
  });
});

/* -------------------------------------------------------------- spread */

describe('the range across a set of homes', () => {
  it('is nothing when the set is empty', () => {
    expect(spread([], 'rent')).toBeNull();
    expect(spread([home({ dealType: 'rent' })], 'sale')).toBeNull();
  });

  it('takes the middle rather than the mean, so one penthouse does not move it', () => {
    const s = spread([2000, 2100, 2200, 2300, 40000].map((r) => home({ monthlyRent: r })), 'rent')!;
    expect(s.middle).toBe(2200);
    expect(s.low).toBe(2000);
    expect(s.high).toBe(40000);
  });

  it('describes the side of the market the set is mostly made of', () => {
    /* One rental among two sales was describing the whole area by the rental,
       under a heading that said three homes. */
    const mixed = [
      home({ dealType: 'rent', monthlyRent: 4200 }),
      home({ dealType: 'sale', salePriceSgd: 549_000 }),
      home({ dealType: 'sale', salePriceSgd: 640_000 }),
    ];
    expect(dominantSpread(mixed)?.deal).toBe('sale');
    expect(dominantSpread(mixed)?.count).toBe(2);
  });

  it('falls back to the other side rather than reporting nothing', () => {
    expect(dominantSpread([home({ dealType: 'sale', salePriceSgd: 500_000 })])?.deal).toBe('sale');
    expect(dominantSpread([])).toBeNull();
  });

  it('lists the bedroom counts on offer, once each and in order', () => {
    const s = spread([home({ bedrooms: 3 }), home({ bedrooms: 1 }), home({ bedrooms: 3 })], 'rent')!;
    expect(s.beds).toEqual([1, 3]);
  });
});

/* ------------------------------------------------------- price context */

describe('how an asking price is placed', () => {
  const others = (n: number, rent: number) => Array.from({ length: n }, () => home({ monthlyRent: rent, district: 15, bedrooms: 2 }));

  it('says nothing at all below four comparable homes', () => {
    const target = home({ monthlyRent: 4000 });
    const out = priceContext(target, [target, ...others(2, 3000)]);
    expect(out.status).toBe('thin');
    if (out.status === 'thin') expect(out.count).toBe(3);
  });

  it('reports once there are enough, counting the home itself', () => {
    const target = home({ monthlyRent: 4000 });
    const out = priceContext(target, [target, ...others(3, 3000)]);
    expect(out.status).toBe('ok');
    if (out.status === 'ok') expect(out.count).toBe(ENOUGH);
  });

  it('never compares a home with itself', () => {
    const target = home({ monthlyRent: 4000 });
    /* The same listing twice in the stock must not become two comparables. */
    const out = priceContext(target, [target, target, ...others(3, 3000)]);
    if (out.status === 'ok') expect(out.count).toBe(4);
  });

  it('places the home in the range it is actually in', () => {
    const target = home({ monthlyRent: 9000 });
    const out = priceContext(target, [target, ...others(4, 3000)]);
    expect(out.status).toBe('ok');
    if (out.status === 'ok') {
      expect(out.standing).toBe('above');
      expect(out.rank).toBe(5);
      expect(out.high).toBe(9000);
      expect(out.low).toBe(3000);
    }
  });

  it('calls a price within a tenth of the middle "about"', () => {
    const target = home({ monthlyRent: 3100 });
    const out = priceContext(target, [target, ...others(4, 3000)]);
    if (out.status === 'ok') expect(out.standing).toBe('about');
  });

  it('widens from bedrooms to the whole area rather than reporting nothing', () => {
    const target = home({ bedrooms: 4, monthlyRent: 8000 });
    const out = priceContext(target, [target, ...others(5, 3000)]);
    expect(out.status).toBe('ok');
    if (out.status === 'ok') expect(out.basis).toBe('district');
  });

  it('keeps rentals and sales apart', () => {
    const target = home({ dealType: 'rent', monthlyRent: 4000 });
    const sales = Array.from({ length: 6 }, () => home({ dealType: 'sale', salePriceSgd: 1_500_000 }));
    expect(priceContext(target, [target, ...sales]).status).toBe('thin');
  });
});

/* ------------------------------------------------------ demo marketplace */

describe('the marketplace with Demo Data on', () => {
  const items = demoMarketListings();

  it('has homes in it', () => {
    expect(items.length).toBeGreaterThan(4);
  });

  it('marks every record so it cannot reach the database', () => {
    for (const m of items) {
      expect(m.listing.id.startsWith('demo-'), m.listing.id).toBe(true);
      expect(m.ownerId.startsWith('demo-'), m.ownerId).toBe(true);
    }
  });

  it('strips the unit number, exactly as a live listing does', () => {
    expect(items.every((m) => m.listing.unitNo === '')).toBe(true);
  });

  it('shows only published homes, none expired', () => {
    for (const m of items) {
      expect(m.listing.status).toBe('published');
      expect(new Date(m.listing.expiresAt!).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('is newest first, like the live one', () => {
    const dates = items.map((m) => m.listing.publishedAt ?? '');
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it('gives its agents registration numbers no real salesperson could hold', () => {
    for (const m of items) {
      expect(m.agent.ceaNumber).toMatch(/^DEMO-/);
      expect(m.agent.agencyLicence).toMatch(/^DEMO-/);
      /* Masked, as the sample enquiries already are, so nothing can be dialled. */
      expect(m.agent.mobile).toContain('•');
    }
  });

  it('points at no stored photograph', () => {
    for (const m of items) {
      expect(m.photos).toEqual([]);
      expect(m.thumbs).toEqual([]);
    }
  });

  it('spreads the homes across more than one agent and more than one area', () => {
    expect(new Set(items.map((m) => m.ownerId)).size).toBeGreaterThan(1);
    expect(new Set(items.map((m) => m.listing.district)).size).toBeGreaterThan(1);
  });

  it('resolves one home and one agent by the same keys the live lookups use', () => {
    const first = items[0];
    expect(demoMarketListing(first.ownerId, first.listing.id)?.listing.id).toBe(first.listing.id);
    expect(demoMarketListing('agent-a', 'lst-1')).toBeNull();
    expect(demoMarketAgent(first.ownerId)?.listings.length).toBeGreaterThan(0);
    expect(demoMarketAgent('nobody')).toBeNull();
  });

  it('is a pure function — two calls give the same marketplace', () => {
    expect(JSON.stringify(demoMarketListings())).toBe(JSON.stringify(items));
  });
});

/* ------------------------------------------------------ structured data */

describe('what a search engine is told', () => {
  it('says a rent is per month, so a flat is not read as a S$4,000 purchase', () => {
    const data = listingJsonLd(home({ dealType: 'rent', monthlyRent: 4000 }), 'https://x/y') as Record<string, never>;
    const offer = data.offers as Record<string, unknown>;
    expect((offer.priceSpecification as Record<string, unknown>).unitCode).toBe('MON');
  });

  it('does not put a monthly unit on a sale price', () => {
    const data = listingJsonLd(home({ dealType: 'sale', salePriceSgd: 1_500_000 }), 'https://x/y') as Record<string, never>;
    expect((data.offers as Record<string, unknown>).priceSpecification).toBeUndefined();
    expect((data.offers as Record<string, unknown>).price).toBe(1_500_000);
  });

  it('claims no rating, review or transaction anywhere', () => {
    const blobs = [
      JSON.stringify(listingJsonLd(home(), 'https://x/y')),
      JSON.stringify(agentJsonLd(AGENT, 'https://x/a', 3)),
    ].join(' ');
    for (const forbidden of ['aggregateRating', 'ratingValue', 'reviewCount', 'review']) {
      expect(blobs, forbidden).not.toContain(forbidden);
    }
  });

  it('leaves out what the listing does not have rather than defaulting it', () => {
    const bare = listingJsonLd(home({ description: undefined, amenities: undefined, lat: undefined, lng: undefined }), 'https://x/y');
    expect(bare).not.toHaveProperty('description');
    expect(bare.about).not.toHaveProperty('geo');
    expect(bare.about).not.toHaveProperty('amenityFeature');
    expect(bare).not.toHaveProperty('image');
  });

  it('carries the registration number as an identifier, where Singapore looks for it', () => {
    expect(agentJsonLd(AGENT, 'https://x/a', 1).identifier).toBe('R100A');
  });

  it('numbers a breadcrumb from one', () => {
    const crumbs = breadcrumbJsonLd([{ name: 'Rent', url: 'https://x/r' }, { name: 'Katong', url: 'https://x/k' }]);
    expect((crumbs.itemListElement as { position: number }[]).map((x) => x.position)).toEqual([1, 2]);
  });
});

/* ------------------------------------------------------------- the wiring */

describe('promises the source has to keep', () => {
  it('no public screen turns a distance into minutes', () => {
    /* What this replaced did exactly that — metres × 1.3 ÷ 80, printed as
       "4 min walk" — on the page where a tenant decides whether a flat is
       near enough to the station. */
    for (const file of ['components/phase1/market/Nearby.tsx', 'components/phase1/market/NearbyPanel.tsx']) {
      const src = code(file);
      expect(src, file).not.toMatch(/min walk/);
      expect(src, file).not.toMatch(/metres?\s*[*/]\s*\d|\/\s*80\b/);
    }
  });

  it('shows a travel time only for a route that was measured', () => {
    const src = code('components/phase1/market/NearbyPanel.tsx');
    const calls = src.match(/formatDuration\([^)]*\)/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(call).toMatch(/\.seconds|NaN/);
  });

  it('keeps the illustrative marketplace out of the live path', () => {
    const src = code('lib/phase1/market-demo.ts');
    expect(src).not.toMatch(/workspaces\.|readWorkspace|listAccounts|\.put\(/);
  });

  it('reads the one Demo Data switch rather than inventing a second', () => {
    const src = code('lib/phase1/marketplace.ts');
    expect(src).toMatch(/demoDataOnServer\(\)/);
    expect(src).not.toMatch(/process\.env\.\w*DEMO\w*_PUBLIC|publicDemo|marketDemoToggle/);
  });

  it('never falls back from live data to the demo set', () => {
    /* A catch that returned the demo marketplace would turn an outage into a
       page of sample homes that looked real. */
    expect(code('lib/phase1/marketplace.ts')).not.toMatch(/catch[\s\S]{0,120}demoMarket/);
  });

  it('keeps the agent workspace out of the search index', () => {
    const src = source('app/robots.ts');
    for (const path of ['/phase1/dashboard', '/phase1/admin', '/phase1/enquiries', '/api/', '/phase1/share/']) {
      expect(src, path).toContain(path);
    }
    expect(src).toContain("allow: ['/phase1/homes']");
  });

  it('does not put generated transaction figures on a public page', () => {
    for (const file of [
      'components/phase1/market/PriceContext.tsx',
      'components/phase1/market/Collection.tsx',
      'lib/phase1/market-compare.ts',
    ]) {
      expect(code(file), file).not.toMatch(/from '.*phase1\/market'|TRANSACTIONS|MARKET_SOURCE/);
    }
  });
});
