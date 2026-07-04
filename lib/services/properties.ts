import { Property, mockProperties } from '../mock-data/properties';

export interface ListingFilters {
  listingType?: 'Buy' | 'Rent' | 'New Launch';
  propertyType?: ('Condo' | 'HDB' | 'Landed' | 'Commercial' | 'EC')[];
  districts?: number[];
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number[];
  minSize?: number;
  maxSize?: number;
  tenure?: ('99-year Leasehold' | 'Freehold' | '999-year Leasehold')[];
  query?: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getListings = async (filters?: ListingFilters): Promise<Property[]> => {
  await delay(400); // Simulate network latency
  let listings = [...mockProperties];

  if (!filters) return listings;

  if (filters.listingType) {
    listings = listings.filter(p => p.listingType === filters.listingType);
  }

  if (filters.propertyType && filters.propertyType.length > 0) {
    listings = listings.filter(p => filters.propertyType!.includes(p.propertyType));
  }

  if (filters.districts && filters.districts.length > 0) {
    listings = listings.filter(p => filters.districts!.includes(p.district));
  }

  if (filters.minPrice !== undefined) {
    listings = listings.filter(p => p.price >= filters.minPrice!);
  }

  if (filters.maxPrice !== undefined) {
    listings = listings.filter(p => p.price <= filters.maxPrice!);
  }

  if (filters.bedrooms && filters.bedrooms.length > 0) {
    listings = listings.filter(p => {
      // If 4 bedrooms is selected, treat it as "4 or more"
      if (filters.bedrooms!.includes(4)) {
        return p.bedrooms >= 4 || filters.bedrooms!.includes(p.bedrooms);
      }
      return filters.bedrooms!.includes(p.bedrooms);
    });
  }

  if (filters.minSize !== undefined) {
    listings = listings.filter(p => p.sizeSqft >= filters.minSize!);
  }

  if (filters.maxSize !== undefined) {
    listings = listings.filter(p => p.sizeSqft <= filters.maxSize!);
  }

  if (filters.tenure && filters.tenure.length > 0) {
    listings = listings.filter(p => filters.tenure!.includes(p.tenure));
  }

  if (filters.query) {
    const q = filters.query.toLowerCase();
    listings = listings.filter(p => 
      p.title.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.areaName.toLowerCase().includes(q) ||
      p.mrtStation.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }

  return listings;
};

export const getListingById = async (id: string): Promise<Property | null> => {
  await delay(200);
  const found = mockProperties.find(p => p.id === id);
  return found || null;
};

export const getFeaturedListings = async (): Promise<Property[]> => {
  await delay(300);
  return mockProperties.filter(p => p.featured);
};
