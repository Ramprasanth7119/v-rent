export interface Property {
  id: string;
  title: string;
  address: string;
  district: number;
  areaName: string;
  propertyType: 'Condo' | 'HDB' | 'Landed' | 'Commercial' | 'EC';
  listingType: 'Buy' | 'Rent' | 'New Launch';
  price: number;
  psf: number;
  bedrooms: number;
  bathrooms: number;
  sizeSqft: number;
  tenure: '99-year Leasehold' | 'Freehold' | '999-year Leasehold';
  buildYear: number;
  mrtStation: string;
  mrtDistanceMeters: number;
  agentId: string;
  verified: boolean;
  featured: boolean;
  aiMatchedScore: number;
  description: string;
  images: string[];
  coordinates: { lat: number; lng: number };
  amenities: string[];
}

export const mockProperties: Property[] = [
  // District 9 - Orchard / River Valley (Condos)
  {
    id: "prop-d9-1",
    title: "The Ritz-Carlton Residences",
    address: "65 Cairnhill Road, Singapore 229721",
    district: 9,
    areaName: "Orchard",
    propertyType: "Condo",
    listingType: "Buy",
    price: 9800000,
    psf: 3450,
    bedrooms: 4,
    bathrooms: 4,
    sizeSqft: 2842,
    tenure: "Freehold",
    buildYear: 2013,
    mrtStation: "Newton MRT",
    mrtDistanceMeters: 450,
    agentId: "agent-1",
    verified: true,
    featured: true,
    aiMatchedScore: 98,
    description: "Ultra-luxury residence with 24-hour Ritz-Carlton concierge service. Designer fittings, private lift lobby, and breathtaking city view.",
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3065, lng: 103.8398 },
    amenities: ["Private Lift", "Concierge", "Pool", "Gym", "Tennis Court"]
  },
  {
    id: "prop-d9-2",
    title: "Martin Modern Premium Corner Unit",
    address: "8 Martin Place, Singapore 237992",
    district: 9,
    areaName: "River Valley",
    propertyType: "Condo",
    listingType: "Buy",
    price: 3600000,
    psf: 2820,
    bedrooms: 3,
    bathrooms: 2,
    sizeSqft: 1277,
    tenure: "99-year Leasehold",
    buildYear: 2021,
    mrtStation: "Great World MRT",
    mrtDistanceMeters: 300,
    agentId: "agent-2",
    verified: true,
    featured: false,
    aiMatchedScore: 89,
    description: "Botanical luxury in River Valley. Features high ceiling, premium views of the Singapore River, and high-end smart-home system installed.",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.2936, lng: 103.8375 },
    amenities: ["Gym", "Botanical Garden", "Lap Pool", "Smart Home", "24h Security"]
  },
  {
    id: "prop-d9-3",
    title: "High-Floor Studio at OUE Twin Peaks",
    address: "33 Leonie Hill Road, Singapore 239197",
    district: 9,
    areaName: "Orchard",
    propertyType: "Condo",
    listingType: "Rent",
    price: 5200,
    psf: 9.1,
    bedrooms: 1,
    bathrooms: 1,
    sizeSqft: 571,
    tenure: "99-year Leasehold",
    buildYear: 2015,
    mrtStation: "Orchard MRT",
    mrtDistanceMeters: 600,
    agentId: "agent-3",
    verified: true,
    featured: false,
    aiMatchedScore: 92,
    description: "Fully furnished designer studio apartment. Move-in ready, iconic architecture, short walk to Takashimaya and Orchard shopping belt.",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3005, lng: 103.8344 },
    amenities: ["Fully Furnished", "Pool", "Gym", "Concierge", "Spa Lounge"]
  },

  // District 10 - Bukit Timah / Holland / Tanglin
  {
    id: "prop-d10-1",
    title: "Modern GCB at Cluny Hill",
    address: "12 Cluny Hill, Singapore 259600",
    district: 10,
    areaName: "Tanglin",
    propertyType: "Landed",
    listingType: "Buy",
    price: 48000000,
    psf: 3200,
    bedrooms: 6,
    bathrooms: 7,
    sizeSqft: 15000,
    tenure: "Freehold",
    buildYear: 2023,
    mrtStation: "Botanic Gardens MRT",
    mrtDistanceMeters: 800,
    agentId: "agent-1",
    verified: true,
    featured: true,
    aiMatchedScore: 95,
    description: "Architectural masterpiece. Good Class Bungalow (GCB) with private 25m pool, basement cinema, wine cellar, and lush garden borders.",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3155, lng: 103.8164 },
    amenities: ["Private Pool", "Home Cinema", "Wine Cellar", "Private Lift", "GCB Enclave"]
  },
  {
    id: "prop-d10-2",
    title: "Leedon Green 2-Bedroom Oasis",
    address: "26 Leedon Heights, Singapore 267953",
    district: 10,
    areaName: "Holland",
    propertyType: "Condo",
    listingType: "Buy",
    price: 1980000,
    psf: 2440,
    bedrooms: 2,
    bathrooms: 2,
    sizeSqft: 812,
    tenure: "Freehold",
    buildYear: 2024,
    mrtStation: "Farrer Road MRT",
    mrtDistanceMeters: 550,
    agentId: "agent-4",
    verified: true,
    featured: false,
    aiMatchedScore: 87,
    description: "Brand new freehold unit in prime Holland region. Elegant layouts with luxury appliances, quiet pool view, and superb spatial layout.",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3129, lng: 103.8045 },
    amenities: ["Pool", "Gym", "Freehold Status", "Brand New", "Tennis Court"]
  },
  {
    id: "prop-d10-3",
    title: "Park Imperial Duplex Penthouse",
    address: "18 Holland Green, Singapore 276135",
    district: 10,
    areaName: "Holland",
    propertyType: "Condo",
    listingType: "Rent",
    price: 11000,
    psf: 4.8,
    bedrooms: 4,
    bathrooms: 4,
    sizeSqft: 2280,
    tenure: "Freehold",
    buildYear: 2011,
    mrtStation: "Holland Village MRT",
    mrtDistanceMeters: 400,
    agentId: "agent-5",
    verified: false,
    featured: false,
    aiMatchedScore: 84,
    description: "Massive duplex penthouse with roof terrace. Ideal for hosting parties, overlooking landed estate views, extremely spacious bedrooms.",
    images: [
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3101, lng: 103.7958 },
    amenities: ["Roof Terrace", "Penthouse Duplex", "Pool", "Security", "Barbecue Pit"]
  },

  // District 15 - Marine Parade / East Coast / Katong
  {
    id: "prop-d15-1",
    title: "Meyer Mansion Sea View Residence",
    address: "7 Meyer Road, Singapore 437901",
    district: 15,
    areaName: "Marine Parade",
    propertyType: "Condo",
    listingType: "Buy",
    price: 3880000,
    psf: 2600,
    bedrooms: 3,
    bathrooms: 3,
    sizeSqft: 1492,
    tenure: "Freehold",
    buildYear: 2024,
    mrtStation: "Katong Park MRT",
    mrtDistanceMeters: 200,
    agentId: "agent-2",
    verified: true,
    featured: true,
    aiMatchedScore: 96,
    description: "Premium sea-facing luxury unit. Features private lift access, massive balcony overlooking East Coast beachfront, and luxury marble flooring.",
    images: [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.2987, lng: 103.8892 },
    amenities: ["Sea View", "Private Lift", "Infinity Pool", "Clubhouse", "Gym"]
  },
  {
    id: "prop-d15-2",
    title: "Charming Inter-Terrace at Siglap",
    address: "42 Siglap Walk, Singapore 455321",
    district: 15,
    areaName: "East Coast",
    propertyType: "Landed",
    listingType: "Buy",
    price: 5900000,
    psf: 1840,
    bedrooms: 5,
    bathrooms: 5,
    sizeSqft: 3200,
    tenure: "Freehold",
    buildYear: 2018,
    mrtStation: "Siglap MRT",
    mrtDistanceMeters: 750,
    agentId: "agent-6",
    verified: true,
    featured: false,
    aiMatchedScore: 91,
    description: "Beautifully renovated 3-story terrace home with attic and internal courtyard. Fully air-conditioned, parking for 2 cars.",
    images: [
      "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3142, lng: 103.9248 },
    amenities: ["Attic", "Internal Courtyard", "Car Porch", "Bathtub", "Freehold Status"]
  },
  {
    id: "prop-d15-3",
    title: "Stunning 4-Bedroom at Cote D'Azur",
    address: "62 Marine Parade Road, Singapore 449298",
    district: 15,
    areaName: "Marine Parade",
    propertyType: "Condo",
    listingType: "Rent",
    price: 6800,
    psf: 5.1,
    bedrooms: 4,
    bathrooms: 3,
    sizeSqft: 1334,
    tenure: "99-year Leasehold",
    buildYear: 2004,
    mrtStation: "Marine Parade MRT",
    mrtDistanceMeters: 150,
    agentId: "agent-7",
    verified: true,
    featured: false,
    aiMatchedScore: 90,
    description: "Directly next to Parkway Parade mall. High floor with gorgeous pool views, fully renovated kitchen, and spacious living room.",
    images: [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3023, lng: 103.9056 },
    amenities: ["MRT Adjacent", "Shopping Adjacent", "Pool", "Gym", "Renovated Kitchen"]
  },

  // District 19 - Hougang / Punggol / Sengkang
  {
    id: "prop-d19-1",
    title: "High-Floor 5-Room HDB at Punggol Walk",
    address: "211A Punggol Walk, Singapore 821211",
    district: 19,
    areaName: "Punggol",
    propertyType: "HDB",
    listingType: "Buy",
    price: 760000,
    psf: 630,
    bedrooms: 3,
    bathrooms: 2,
    sizeSqft: 1205,
    tenure: "99-year Leasehold",
    buildYear: 2016,
    mrtStation: "Punggol MRT",
    mrtDistanceMeters: 250,
    agentId: "agent-3",
    verified: true,
    featured: false,
    aiMatchedScore: 94,
    description: "Premium DBSS-like layout. Mint condition, corner unit with full privacy, close to Waterway Point and Punggol MRT.",
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.4035, lng: 103.9002 },
    amenities: ["Corner Unit", "Renovated", "Aircon", "Near Mall", "Waterway Proximity"]
  },
  {
    id: "prop-d19-2",
    title: "The Florence Residences 2BR",
    address: "83 Hougang Avenue 2, Singapore 538865",
    district: 19,
    areaName: "Hougang",
    propertyType: "Condo",
    listingType: "Buy",
    price: 1350000,
    psf: 1980,
    bedrooms: 2,
    bathrooms: 2,
    sizeSqft: 680,
    tenure: "99-year Leasehold",
    buildYear: 2023,
    mrtStation: "Kovan MRT",
    mrtDistanceMeters: 700,
    agentId: "agent-8",
    verified: true,
    featured: false,
    aiMatchedScore: 88,
    description: "New club-condo concept with 128 facilities. High floor pool-facing pool view, smart digital lock, ideal for young couples or investors.",
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3655, lng: 103.8864 },
    amenities: ["Smart Lock", "Massive Facilities", "Lap Pool", "Gym", "Concierge Bar"]
  },
  {
    id: "prop-d19-3",
    title: "Piermont Grand EC (Executive Condo)",
    address: "26 Sumang Walk, Singapore 828695",
    district: 19,
    areaName: "Punggol",
    propertyType: "EC",
    listingType: "Buy",
    price: 1580000,
    psf: 1450,
    bedrooms: 3,
    bathrooms: 2,
    sizeSqft: 1090,
    tenure: "99-year Leasehold",
    buildYear: 2022,
    mrtStation: "Sumang LRT",
    mrtDistanceMeters: 100,
    agentId: "agent-4",
    verified: true,
    featured: false,
    aiMatchedScore: 86,
    description: "Luxury waterfront executive condominium. Rare unit, recently reached MOP, extremely bright, cross-ventilated design.",
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.4082, lng: 103.8968 },
    amenities: ["Waterfront View", "Full Condo Facilities", "MOP Just Met", "LRT Connected"]
  },
  {
    id: "prop-d19-4",
    title: "Cozy Room at Jewel @ Buangkok",
    address: "8 Compassvale Bow, Singapore 544983",
    district: 19,
    areaName: "Sengkang",
    propertyType: "Condo",
    listingType: "Rent",
    price: 3200,
    psf: 5.8,
    bedrooms: 1,
    bathrooms: 1,
    sizeSqft: 550,
    tenure: "99-year Leasehold",
    buildYear: 2016,
    mrtStation: "Buangkok MRT",
    mrtDistanceMeters: 100,
    agentId: "agent-9",
    verified: true,
    featured: false,
    aiMatchedScore: 91,
    description: "Spacious 1-bedroom apartment right next to Buangkok MRT. Immediate availability, professional tenants preferred.",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3828, lng: 103.8932 },
    amenities: ["MRT Adjacent", "24h Supermarket Nearby", "Pool", "Gym"]
  },

  // District 22 - Jurong / Lakeside
  {
    id: "prop-d22-1",
    title: "Lake Grande 3-Bedroom Premium",
    address: "2 Lakeside Drive, Singapore 648316",
    district: 22,
    areaName: "Jurong",
    propertyType: "Condo",
    listingType: "Buy",
    price: 1890000,
    psf: 1960,
    bedrooms: 3,
    bathrooms: 2,
    sizeSqft: 969,
    tenure: "99-year Leasehold",
    buildYear: 2020,
    mrtStation: "Lakeside MRT",
    mrtDistanceMeters: 350,
    agentId: "agent-10",
    verified: true,
    featured: false,
    aiMatchedScore: 89,
    description: "Breathtaking views of Jurong Lake Gardens. High floor, premium smart home setup, close to Jurong Lake District transformation.",
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3362, lng: 103.7224 },
    amenities: ["Lake View", "Smart Home", "Pool", "Gym", "BBQ Pit"]
  },
  {
    id: "prop-d22-2",
    title: "4-Room HDB at Jurong East Street 32",
    address: "312 Jurong East Street 32, Singapore 600312",
    district: 22,
    areaName: "Jurong",
    propertyType: "HDB",
    listingType: "Buy",
    price: 520000,
    psf: 510,
    bedrooms: 3,
    bathrooms: 2,
    sizeSqft: 1020,
    tenure: "99-year Leasehold",
    buildYear: 1998,
    mrtStation: "Chinese Garden MRT",
    mrtDistanceMeters: 500,
    agentId: "agent-11",
    verified: false,
    featured: false,
    aiMatchedScore: 80,
    description: "Spacious layout, no odd shapes, walk to Chinese Garden. Serious seller, all ethnic groups eligible.",
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3444, lng: 103.7348 },
    amenities: ["Spacious Layout", "Low Floor", "Close to MRT", "Food Centre Nearby"]
  },
  {
    id: "prop-d22-3",
    title: "Jem Office Space Sublet",
    address: "50 Jurong Gateway Road, Singapore 608549",
    district: 22,
    areaName: "Jurong",
    propertyType: "Commercial",
    listingType: "Rent",
    price: 18000,
    psf: 7.2,
    bedrooms: 0,
    bathrooms: 4,
    sizeSqft: 2500,
    tenure: "99-year Leasehold",
    buildYear: 2013,
    mrtStation: "Jurong East MRT",
    mrtDistanceMeters: 50,
    agentId: "agent-12",
    verified: true,
    featured: true,
    aiMatchedScore: 93,
    description: "Premium grade-A office layout inside Jem. Fully fitted with 30 workstations, corporate boardroom, and pantry. Directly integrated with MRT.",
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3332, lng: 103.7431 },
    amenities: ["Grade-A Office", "Integrated MRT", "Boardroom", "Workstations", "Fitted Pantry"]
  },

  // District 1 - Raffles Place / Marina Bay
  {
    id: "prop-d1-1",
    title: "Marina Bay Suites Premium 4BR",
    address: "3 Marina Boulevard, Singapore 018981",
    district: 1,
    areaName: "Marina Bay",
    propertyType: "Condo",
    listingType: "Buy",
    price: 11200000,
    psf: 4160,
    bedrooms: 4,
    bathrooms: 4,
    sizeSqft: 2691,
    tenure: "99-year Leasehold",
    buildYear: 2013,
    mrtStation: "Downtown MRT",
    mrtDistanceMeters: 100,
    agentId: "agent-1",
    verified: true,
    featured: true,
    aiMatchedScore: 97,
    description: "Iconic waterfront living. Full Marina Bay views, private lift, marble floors, and concierge service.",
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.2801, lng: 103.8532 },
    amenities: ["Marina Views", "Private Lift", "Concierge", "Downtown MRT Access", "Infinity Pool"]
  },
  {
    id: "prop-d1-2",
    title: "Raffles Place Grade-A Office Space",
    address: "80 Raffles Place, UOB Plaza, Singapore 048624",
    district: 1,
    areaName: "Raffles Place",
    propertyType: "Commercial",
    listingType: "Rent",
    price: 45000,
    psf: 12.5,
    bedrooms: 0,
    bathrooms: 6,
    sizeSqft: 3600,
    tenure: "999-year Leasehold",
    buildYear: 1995,
    mrtStation: "Raffles Place MRT",
    mrtDistanceMeters: 30,
    agentId: "agent-13",
    verified: true,
    featured: true,
    aiMatchedScore: 95,
    description: "High zone premium office with panoramic views of the CBD skyline. Premium corporate lobby, fully secure server room.",
    images: [
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.2848, lng: 103.8511 },
    amenities: ["CBD Views", "Raffles Place MRT", "24/7 Security", "Server Room", "Fitted Cubicles"]
  },

  // District 3 - Queenstown / Tiong Bahru
  {
    id: "prop-d3-1",
    title: "SkyTerrace @ Dawson Multi-Gen",
    address: "91 Dawson Road, Singapore 142091",
    district: 3,
    areaName: "Queenstown",
    propertyType: "HDB",
    listingType: "Buy",
    price: 1380000,
    psf: 1100,
    bedrooms: 4,
    bathrooms: 3,
    sizeSqft: 1250,
    tenure: "99-year Leasehold",
    buildYear: 2015,
    mrtStation: "Queenstown MRT",
    mrtDistanceMeters: 450,
    agentId: "agent-2",
    verified: true,
    featured: true,
    aiMatchedScore: 96,
    description: "Award-winning architectural project. Rare high floor multi-generational unit, stunning loft concept, panoramic green views.",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.2942, lng: 103.8118 },
    amenities: ["Loft Concept", "Multi-Gen Layout", "Sky Gardens", "MRT Walkable", "Greenery Views"]
  },
  {
    id: "prop-d3-2",
    title: "Charming Walk-up at Tiong Bahru",
    address: "78 Yong Siak Street, Singapore 163078",
    district: 3,
    areaName: "Tiong Bahru",
    propertyType: "HDB",
    listingType: "Rent",
    price: 4900,
    psf: 5.4,
    bedrooms: 2,
    bathrooms: 1,
    sizeSqft: 900,
    tenure: "99-year Leasehold",
    buildYear: 1965,
    mrtStation: "Tiong Bahru MRT",
    mrtDistanceMeters: 550,
    agentId: "agent-14",
    verified: true,
    featured: false,
    aiMatchedScore: 92,
    description: "Heritage art-deco conservation apartment. Beautiful exposed brick walls, timber floorboards, hipster cafe hub at your doorstep.",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.2831, lng: 103.8291 },
    amenities: ["Conservation Heritage", "Hipster Enclave", "Aircon", "Art-Deco Interior"]
  },

  // District 15 New Launch
  {
    id: "prop-new-1",
    title: "Grand Dunman (New Launch)",
    address: "2 Dunman Road, Singapore 439188",
    district: 15,
    areaName: "Marine Parade",
    propertyType: "Condo",
    listingType: "New Launch",
    price: 2150000,
    psf: 2520,
    bedrooms: 3,
    bathrooms: 2,
    sizeSqft: 853,
    tenure: "99-year Leasehold",
    buildYear: 2028,
    mrtStation: "Dakota MRT",
    mrtDistanceMeters: 100,
    agentId: "agent-15",
    verified: true,
    featured: true,
    aiMatchedScore: 94,
    description: "Direct access to MRT. Over 1,000 units with mega facilities. Early bird VVIP discounts available. Fully integrated smart apps.",
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3082, lng: 103.8885 },
    amenities: ["Direct MRT Link", "Brand New", "Mega Facilities", "Smart Home Apps", "VVIP Pricing"]
  },

  // District 21 - Clementi / Upper Bukit Timah
  {
    id: "prop-d21-1",
    title: "Ki Residences At Brookvale 4BR",
    address: "2 Brookvale Drive, Singapore 599968",
    district: 21,
    areaName: "Clementi",
    propertyType: "Condo",
    listingType: "Buy",
    price: 3200000,
    psf: 2210,
    bedrooms: 4,
    bathrooms: 3,
    sizeSqft: 1445,
    tenure: "999-year Leasehold",
    buildYear: 2024,
    mrtStation: "Beauty World MRT",
    mrtDistanceMeters: 1200,
    agentId: "agent-3",
    verified: true,
    featured: false,
    aiMatchedScore: 88,
    description: "Rare 999-year leasehold condo nestled in sunset way landed enclave. Direct shuttle bus to Clementi MRT, quiet forest greenery facing.",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3323, lng: 103.7701 },
    amenities: ["999-year Status", "Forest View", "Shuttle Service", "Landed Enclave", "Quiet Living"]
  }
];

// Let's add remaining mock properties up to 40 items dynamically to guarantee depth
for (let i = 1; i <= 20; i++) {
  const districtList = [9, 10, 15, 19, 22, 3, 5, 12, 11, 23];
  const areaMap: Record<number, string> = {
    9: "Orchard", 10: "Holland", 15: "East Coast", 19: "Punggol", 
    22: "Jurong", 3: "Tiong Bahru", 5: "Clementi", 12: "Balestier",
    11: "Novena", 23: "Bukit Panjang"
  };
  const district = districtList[i % districtList.length];
  const area = areaMap[district];
  const isBuy = i % 2 === 0;
  
  let propertyType: 'Condo' | 'HDB' | 'Landed' | 'Commercial' | 'EC' = 'Condo';
  if (i % 5 === 0) propertyType = 'HDB';
  else if (i % 7 === 0) propertyType = 'Landed';
  else if (i % 9 === 0) propertyType = 'Commercial';
  else if (i % 11 === 0) propertyType = 'EC';

  const bedrooms = propertyType === 'Commercial' ? 0 : (i % 4) + 1;
  const bathrooms = propertyType === 'Commercial' ? 2 : Math.max(1, bedrooms - 1);
  const sizeSqft = propertyType === 'Landed' ? 4500 + i * 200 : 500 + i * 80;
  const price = isBuy 
    ? (propertyType === 'HDB' ? 450000 + i * 25000 : (propertyType === 'Landed' ? 6000000 + i * 300000 : 1200000 + i * 75000))
    : (propertyType === 'Commercial' ? 8000 + i * 1000 : 2500 + i * 200);

  const psf = Math.round(price / sizeSqft);

  mockProperties.push({
    id: `prop-gen-${i}`,
    title: `${propertyType} near ${area} District`,
    address: `${100 + i} ${area} Ave ${1 + (i % 5)}, Singapore ${123400 + i * 13}`,
    district,
    areaName: area,
    propertyType,
    listingType: isBuy ? (i % 5 === 0 ? "New Launch" : "Buy") : "Rent",
    price,
    psf,
    bedrooms,
    bathrooms,
    sizeSqft,
    tenure: i % 3 === 0 ? "Freehold" : "99-year Leasehold",
    buildYear: 2000 + (i % 25),
    mrtStation: `${area} MRT`,
    mrtDistanceMeters: 200 + (i * 35) % 800,
    agentId: `agent-${(i % 15) + 1}`,
    verified: i % 3 !== 0,
    featured: i % 6 === 0,
    aiMatchedScore: 70 + (i * 7) % 29,
    description: `Stunning ${propertyType} offering prime rental yields/capital appreciation in ${area}. Excellent accessibility and MRT convenience.`,
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: { lat: 1.3 + (i * 0.005), lng: 103.7 + (i * 0.009) },
    amenities: ["Aircon", "Pool", "Supermarket Nearby", "Gym"]
  });
}
