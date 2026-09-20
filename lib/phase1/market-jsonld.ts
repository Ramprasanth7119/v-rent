/**
 * Structured data for the public pages — what a search engine reads instead of
 * guessing from the markup.
 *
 * Built from the same listing the page draws, and holding nothing the page
 * does not show. That is not a style rule: structured data that claims more
 * than the page is what search engines penalise, and it is the same dishonesty
 * as an invented figure, addressed to a machine instead of a person.
 *
 * So there is no `aggregateRating` (nothing records one), no `datePosted` on a
 * listing that has not been published, and no floor area on a listing whose
 * agent left it blank. Fields are omitted rather than defaulted.
 *
 * Client-safe: plain objects in, plain objects out.
 */

import type { MarketListing, PublicAgent } from './marketplace';
import { DISTRICTS, districtLabel } from './districts';
import { dealOf, priceOf } from './market-explore';

type Json = Record<string, unknown>;

/** Drops every key whose value is undefined, null or an empty string. */
function only(obj: Json): Json {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

const SITE = 'V-RENT';

/**
 * One home.
 *
 * `RealEstateListing` describes the advertisement; `about` describes the home
 * itself. The price goes on an `Offer`, with the unit code that says it is a
 * monthly rent rather than a purchase price — the distinction a portal that
 * gets this wrong is read as offering a S$4,200 condominium.
 */
export function listingJsonLd(m: MarketListing, url: string): Json {
  const l = m.listing;
  const sale = dealOf(l) === 'sale';
  const area = DISTRICTS[l.district];

  const address = only({
    '@type': 'PostalAddress',
    streetAddress: l.address,
    addressLocality: area?.name,
    addressRegion: districtLabel(l.district),
    postalCode: l.postalCode,
    addressCountry: 'SG',
  });

  const home = only({
    '@type': sale ? 'Residence' : 'Apartment',
    name: l.project,
    address,
    numberOfBedrooms: l.bedrooms > 0 ? l.bedrooms : undefined,
    numberOfBathroomsTotal: l.bathrooms > 0 ? l.bathrooms : undefined,
    floorSize: l.sizeSqft > 0
      ? { '@type': 'QuantitativeValue', value: l.sizeSqft, unitCode: 'FTK' }
      : undefined,
    amenityFeature: (l.amenities ?? []).length
      ? l.amenities!.map((name) => ({ '@type': 'LocationFeatureSpecification', name, value: true }))
      : undefined,
    geo: l.lat !== undefined && l.lng !== undefined
      ? { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng }
      : undefined,
  });

  const price = priceOf(l);

  return only({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': url,
    url,
    name: `${l.bedrooms > 0 ? `${l.bedrooms} bedroom ` : ''}${l.propertyType} ${sale ? 'for sale' : 'for rent'} in ${l.project}`,
    description: l.description || undefined,
    datePosted: l.publishedAt,
    image: m.photos.length ? m.photos : undefined,
    about: home,
    offers: price > 0 ? only({
      '@type': 'Offer',
      price,
      priceCurrency: 'SGD',
      availability: l.status === 'published' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      availabilityStarts: l.availableFrom,
      /* A rent is a price per month; a sale price is not. Saying so is the
         difference between a S$4,200 flat and a S$4,200 condominium. */
      priceSpecification: sale ? undefined : {
        '@type': 'UnitPriceSpecification',
        price,
        priceCurrency: 'SGD',
        unitCode: 'MON',
      },
    }) : undefined,
    provider: agentJsonLdRef(m.agent),
  });
}

/** The advertiser, as far as a listing needs to name them. */
function agentJsonLdRef(a: PublicAgent): Json {
  return only({
    '@type': 'RealEstateAgent',
    name: a.registeredName || a.name,
    /* The registration number is the identifier that means something in
       Singapore, so it is given as one rather than buried in a description. */
    identifier: a.ceaNumber || undefined,
    worksFor: a.agency ? only({ '@type': 'Organization', name: a.agency, identifier: a.agencyLicence || undefined }) : undefined,
  });
}

/** One agent's profile page. */
export function agentJsonLd(a: PublicAgent, url: string, listings: number): Json {
  return only({
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': url,
    url,
    name: a.registeredName || a.name,
    alternateName: a.name !== a.registeredName ? a.name : undefined,
    description: a.bio || undefined,
    identifier: a.ceaNumber || undefined,
    areaServed: { '@type': 'Country', name: 'Singapore' },
    worksFor: a.agency ? only({ '@type': 'Organization', name: a.agency, identifier: a.agencyLicence || undefined }) : undefined,
    makesOffer: listings > 0 ? { '@type': 'Offer', name: `${listings} ${listings === 1 ? 'home' : 'homes'} available` } : undefined,
    parentOrganization: { '@type': 'Organization', name: SITE },
  });
}

/** A named set of homes — a district, a station, a development. */
export function collectionJsonLd(opts: { url: string; name: string; description: string; items: MarketListing[]; origin: string }): Json {
  return only({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': opts.url,
    url: opts.url,
    name: opts.name,
    description: opts.description,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: opts.items.length,
      itemListElement: opts.items.slice(0, 50).map((m, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${opts.origin}/phase1/homes/${m.ownerId}/${m.listing.id}`,
        name: m.listing.project,
      })),
    },
  });
}

/** The trail above a page's heading, as a search engine reads it. */
export function breadcrumbJsonLd(trail: { name: string; url: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: t.url })),
  };
}
