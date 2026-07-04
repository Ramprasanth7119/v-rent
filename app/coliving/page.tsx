"use client";

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Search,
  MapPin,
  Calendar,
  DollarSign,
  Star,
  Wifi,
  Dumbbell,
  Coffee,
  Waves,
  Monitor,
  Car,
  ChevronDown,
  ChevronRight,
  Users,
  Building,
  Sparkles,
  Train,
  Home,
  Eye,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ColivingListing {
  id: number;
  operator: string;
  name: string;
  location: string;
  mrt: string;
  roomType: string;
  roomTypeVariant: 'primary' | 'gold' | 'info' | 'success';
  price: number;
  minStay: string;
  amenities: string[];
  amenityIcons: React.ReactNode[];
  photo: string;
  rating: number;
  reviews: number;
  totalRooms: number;
  district: string;
  tags: string[];
  highlight?: string;
}

interface Operator {
  id: number;
  name: string;
  emoji: string;
  totalRooms: number;
  avgPrice: number;
  locations: string[];
  established: number;
  description: string;
  gradient: string;
}

interface FAQ {
  q: string;
  a: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LISTINGS: ColivingListing[] = [
  {
    id: 1,
    operator: 'Hmlet',
    name: 'Hmlet Cantonment',
    location: 'Cantonment Rd, Tanjong Pagar',
    mrt: 'Tanjong Pagar MRT',
    roomType: 'Private Room',
    roomTypeVariant: 'primary',
    price: 1450,
    minStay: 'Min 3 months',
    amenities: ['Gym', 'Co-working', 'Laundry', 'WiFi'],
    amenityIcons: [
      <Dumbbell key="gym" className="h-3 w-3" />,
      <Monitor key="cw" className="h-3 w-3" />,
      <Coffee key="lau" className="h-3 w-3" />,
      <Wifi key="wifi" className="h-3 w-3" />,
    ],
    photo: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80',
    rating: 4.7,
    reviews: 128,
    totalRooms: 42,
    district: 'D02',
    tags: ['CBD Fringe', 'Business District'],
    highlight: 'Most Popular',
  },
  {
    id: 2,
    operator: 'Cove',
    name: 'Cove @ Yishun',
    location: '8 Yishun Ave 2, Yishun',
    mrt: 'Yishun MRT',
    roomType: 'Private Room',
    roomTypeVariant: 'primary',
    price: 980,
    minStay: 'Monthly',
    amenities: ['Pool', 'Co-working', 'Gym', 'WiFi'],
    amenityIcons: [
      <Waves key="pool" className="h-3 w-3" />,
      <Monitor key="cw" className="h-3 w-3" />,
      <Dumbbell key="gym" className="h-3 w-3" />,
      <Wifi key="wifi" className="h-3 w-3" />,
    ],
    photo: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80',
    rating: 4.5,
    reviews: 89,
    totalRooms: 68,
    district: 'D27',
    tags: ['North Singapore', 'Flexible Lease'],
    highlight: 'Best Value',
  },
  {
    id: 3,
    operator: 'Lyf by Ascott',
    name: 'Lyf Funan',
    location: '67 Hill St, Clarke Quay',
    mrt: 'Clarke Quay MRT',
    roomType: 'Ensuite Studio',
    roomTypeVariant: 'gold',
    price: 2200,
    minStay: 'Min 1 month',
    amenities: ['Rooftop Pool', 'Gym', 'Co-working', 'Café'],
    amenityIcons: [
      <Waves key="pool" className="h-3 w-3" />,
      <Dumbbell key="gym" className="h-3 w-3" />,
      <Monitor key="cw" className="h-3 w-3" />,
      <Coffee key="cafe" className="h-3 w-3" />,
    ],
    photo: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
    rating: 4.9,
    reviews: 245,
    totalRooms: 112,
    district: 'D06',
    tags: ['5-Star Amenities', 'River Views'],
    highlight: 'Premium Pick',
  },
  {
    id: 4,
    operator: 'The Assembly Place',
    name: 'TAP @ Lavender',
    location: '21 Kallang Ave, Lavender',
    mrt: 'Lavender MRT',
    roomType: 'Private Ensuite',
    roomTypeVariant: 'info',
    price: 1650,
    minStay: 'Quarterly',
    amenities: ['Rooftop Terrace', 'Laundry', 'WiFi', 'BBQ'],
    amenityIcons: [
      <Building key="roof" className="h-3 w-3" />,
      <Coffee key="lau" className="h-3 w-3" />,
      <Wifi key="wifi" className="h-3 w-3" />,
      <Star key="bbq" className="h-3 w-3" />,
    ],
    photo: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=600&q=80',
    rating: 4.6,
    reviews: 76,
    totalRooms: 35,
    district: 'D08',
    tags: ['Rooftop Access', 'Community Events'],
  },
  {
    id: 5,
    operator: 'Coliwoo',
    name: 'Coliwoo Orchard',
    location: '15 Cairnhill Rd, Orchard',
    mrt: 'Somerset MRT',
    roomType: 'Studio',
    roomTypeVariant: 'gold',
    price: 3100,
    minStay: 'Monthly',
    amenities: ['Gym', 'Concierge', 'Co-working', 'Parking'],
    amenityIcons: [
      <Dumbbell key="gym" className="h-3 w-3" />,
      <Star key="con" className="h-3 w-3" />,
      <Monitor key="cw" className="h-3 w-3" />,
      <Car key="park" className="h-3 w-3" />,
    ],
    photo: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80',
    rating: 4.8,
    reviews: 103,
    totalRooms: 28,
    district: 'D09',
    tags: ['Orchard Prime', 'Luxury Finishes'],
    highlight: 'Luxury',
  },
  {
    id: 6,
    operator: 'Commontown',
    name: 'Commontown Queenstown',
    location: '3 Commonwealth Ave West',
    mrt: 'Queenstown MRT',
    roomType: 'Master Ensuite',
    roomTypeVariant: 'success',
    price: 1800,
    minStay: 'Min 3 months',
    amenities: ['Pool', 'Gym', 'Study Room', 'WiFi'],
    amenityIcons: [
      <Waves key="pool" className="h-3 w-3" />,
      <Dumbbell key="gym" className="h-3 w-3" />,
      <Monitor key="study" className="h-3 w-3" />,
      <Wifi key="wifi" className="h-3 w-3" />,
    ],
    photo: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80',
    rating: 4.6,
    reviews: 58,
    totalRooms: 50,
    district: 'D03',
    tags: ['Family-Friendly', 'Near Schools'],
  },
];

const OPERATORS: Operator[] = [
  {
    id: 1,
    name: 'Hmlet',
    emoji: '🏙️',
    totalRooms: 2400,
    avgPrice: 1550,
    locations: ['Tanjong Pagar', 'Tiong Bahru', 'Bugis', 'One-North'],
    established: 2016,
    description: 'Southeast Asia\'s largest co-living operator with 6,000+ homes across SG, HK & JP.',
    gradient: 'from-blue-600 to-indigo-700',
  },
  {
    id: 2,
    name: 'Cove',
    emoji: '🌊',
    totalRooms: 1800,
    avgPrice: 1100,
    locations: ['Yishun', 'Jurong', 'Tampines', 'Pasir Ris'],
    established: 2018,
    description: 'Flexible co-living designed for young professionals with seamless digital experience.',
    gradient: 'from-teal-600 to-cyan-700',
  },
  {
    id: 3,
    name: 'Lyf by Ascott',
    emoji: '✨',
    totalRooms: 950,
    avgPrice: 2400,
    locations: ['Clarke Quay', 'Farrer Park', 'One-North'],
    established: 2019,
    description: 'Premium social living by The Ascott Limited. World-class amenities & curated community.',
    gradient: 'from-amber-600 to-orange-700',
  },
  {
    id: 4,
    name: 'The Assembly Place',
    emoji: '🏛️',
    totalRooms: 620,
    avgPrice: 1700,
    locations: ['Lavender', 'Joo Chiat', 'Farrer Park', 'Toa Payoh'],
    established: 2020,
    description: 'Community-first living. Curated events, rooftop spaces, and a tight-knit residents program.',
    gradient: 'from-purple-600 to-pink-700',
  },
];

const FILTER_PILLS = [
  'All',
  'Private Room',
  'Ensuite',
  'Studio',
  'Master Suite',
  'Dhoby Ghaut MRT',
  'Tanjong Pagar MRT',
  'Bugis MRT',
  'Orchard MRT',
  'Queenstown MRT',
];

const FAQS: FAQ[] = [
  {
    q: 'What is co-living and how does it differ from HDB rental?',
    a: 'Co-living spaces are professionally managed, fully furnished shared living environments with inclusive community amenities (gyms, co-working lounges, laundry). Unlike traditional HDB rentals, co-living includes utilities, WiFi, and regular housekeeping, with flexible lease terms starting from 1 month. You get a private room or studio with access to shared communal spaces.',
  },
  {
    q: 'Are co-living spaces legal in Singapore?',
    a: 'Yes. Licensed co-living operators in Singapore comply with URA, HDB, and BCA regulations. Operators like Hmlet, Cove, and Lyf by Ascott hold the required approvals. Always verify that the operator is a licensed Short-Term Accommodation or Residential Accommodation provider to ensure compliance.',
  },
  {
    q: 'Can foreigners rent co-living spaces in Singapore?',
    a: 'Absolutely. Co-living operators actively cater to expats, EP/S-Pass holders, international students, and digital nomads. You\'ll typically need a valid passport, visa documentation, and proof of income or employment letter. Most operators accept foreign bank transfers or Wise/Revolut payments.',
  },
  {
    q: 'What\'s typically included in the monthly price?',
    a: 'Most co-living packages include: fully furnished private room, utilities (electricity, water, gas), high-speed WiFi, weekly housekeeping, access to shared amenities (gym, pool, co-working), and building maintenance. Some premium operators also include monthly social events, complimentary café credits, and concierge services.',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ListingCard({ listing }: { listing: ColivingListing }) {
  return (
    <Card hoverEffect className="overflow-hidden p-0 group h-full flex flex-col">
      {/* Photo */}
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.photo}
          alt={listing.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Operator badge top-left */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 dark:bg-black/80 text-[9px] font-black uppercase tracking-wider text-brand-navy dark:text-white rounded-full px-2.5 py-1">
            {listing.operator}
          </span>
        </div>

        {/* Highlight badge top-right */}
        {listing.highlight && (
          <div className="absolute top-3 right-3">
            <Badge variant="gold" className="text-[9px]">{listing.highlight}</Badge>
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <Badge
            variant={listing.roomTypeVariant}
            className="text-[9px] mb-1.5"
          >
            {listing.roomType}
          </Badge>
          <h3 className="text-white font-bold text-sm leading-tight">{listing.name}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Location */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-neutral-500">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="text-[10px]">{listing.location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-500">
            <Train className="h-3 w-3 flex-shrink-0 text-brand-gold" />
            <span className="text-[10px] text-brand-gold font-semibold">{listing.mrt}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {listing.tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] font-semibold text-neutral-500 dark:text-neutral-400 border border-border rounded-full px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Amenities */}
        <div className="flex gap-1.5 flex-wrap">
          {listing.amenities.map((amenity, i) => (
            <div
              key={amenity}
              className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 rounded-full px-2 py-1"
            >
              <span className="text-brand-gold">{listing.amenityIcons[i]}</span>
              <span className="text-[9px] font-semibold text-neutral-600 dark:text-neutral-400">{amenity}</span>
            </div>
          ))}
        </div>

        {/* Price + Rating */}
        <div className="flex items-end justify-between pt-1 mt-auto border-t border-border">
          <div>
            <p className="text-[9px] text-neutral-400 uppercase font-semibold tracking-wider">From</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-foreground">S${listing.price.toLocaleString()}</span>
              <span className="text-[10px] text-neutral-500">/mo</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Calendar className="h-2.5 w-2.5 text-neutral-400" />
              <span className="text-[9px] text-neutral-400 font-semibold">{listing.minStay}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-0.5 justify-end">
              <Star className="h-3 w-3 fill-brand-gold text-brand-gold" />
              <span className="text-xs font-bold">{listing.rating}</span>
            </div>
            <span className="text-[9px] text-neutral-400">{listing.reviews} reviews</span>
          </div>
        </div>

        <Button variant="primary" size="sm" className="w-full" leftIcon={<Eye className="h-3.5 w-3.5" />}>
          Book Viewing
        </Button>
      </div>
    </Card>
  );
}

function OperatorCard({ op }: { op: Operator }) {
  return (
    <Card hoverEffect className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${op.gradient} rounded-t-xl`} />
      <div className="pt-2">
        <div className="flex items-start gap-3 mb-3">
          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${op.gradient} flex items-center justify-center text-2xl flex-shrink-0`}>
            {op.emoji}
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground">{op.name}</h3>
            <p className="text-[9px] text-neutral-500 uppercase font-semibold tracking-wider">Est. {op.established}</p>
          </div>
        </div>

        <p className="text-[10px] text-neutral-500 leading-relaxed mb-3">{op.description}</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg p-2 text-center">
            <p className="text-[9px] text-neutral-400 uppercase font-bold">Rooms</p>
            <p className="text-sm font-black text-foreground">{op.totalRooms.toLocaleString()}+</p>
          </div>
          <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg p-2 text-center">
            <p className="text-[9px] text-neutral-400 uppercase font-bold">Avg / mo</p>
            <p className="text-sm font-black text-brand-gold">S${op.avgPrice.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {op.locations.map((loc) => (
            <span
              key={loc}
              className="text-[9px] font-semibold text-neutral-500 border border-border rounded-full px-2 py-0.5"
            >
              {loc}
            </span>
          ))}
        </div>

        <Button variant="outline" size="sm" className="w-full" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
          View All Rooms
        </Button>
      </div>
    </Card>
  );
}

function FAQItem({ faq, isOpen, onToggle }: { faq: FAQ; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors cursor-pointer"
      >
        <span className="text-sm font-bold text-foreground pr-4">{faq.q}</span>
        <ChevronDown
          className={`h-4 w-4 text-neutral-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-border">
          <p className="text-xs text-neutral-500 leading-relaxed pt-3">{faq.a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ColivingPage() {
  const [areaInput, setAreaInput] = useState('');
  const [leaseType, setLeaseType] = useState('any');
  const [maxBudget, setMaxBudget] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const filteredListings = LISTINGS.filter((l) => {
    if (activeFilter === 'All') return true;
    if (['Private Room', 'Ensuite', 'Studio', 'Master Suite'].includes(activeFilter)) {
      return l.roomType.toLowerCase().includes(activeFilter.toLowerCase());
    }
    // MRT filter
    return l.mrt.toLowerCase().includes(activeFilter.toLowerCase().replace(' mrt', ''));
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already reactive via filter; this could trigger API call
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">

      {/* ══════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 p-8 md:p-12">
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="ai" className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              New — Co-living Marketplace
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
            Singapore Co-living Spaces
          </h1>
          <p className="text-indigo-200 text-base mb-8 leading-relaxed">
            Flexible, furnished, community-focused living. Move in ready — from 1 month.
          </p>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-4 shadow-2xl shadow-black/30 grid grid-cols-1 sm:grid-cols-4 gap-3"
          >
            <div className="sm:col-span-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Area or MRT station"
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:border-brand-gold transition-all"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <select
                value={leaseType}
                onChange={(e) => setLeaseType(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:border-brand-gold transition-all appearance-none cursor-pointer"
              >
                <option value="any">Any Lease</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="min3">Min 3 months</option>
              </select>
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="number"
                placeholder="Max budget/mo"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:border-brand-gold transition-all"
              />
            </div>
            <Button
              type="submit"
              variant="gold"
              className="w-full font-bold"
              leftIcon={<Search className="h-4 w-4" />}
            >
              Search
            </Button>
          </form>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          {[
            { label: 'Rooms Available', value: '480+', icon: <Home className="h-4 w-4" /> },
            { label: 'Starting From', value: 'S$950/mo', icon: <DollarSign className="h-4 w-4" /> },
            { label: 'Operators', value: '25+', icon: <Building className="h-4 w-4" /> },
            { label: 'Fully Furnished', value: '100%', icon: <Star className="h-4 w-4" /> },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5 flex items-center gap-3">
              <span className="text-indigo-200">{stat.icon}</span>
              <div>
                <p className="text-white font-black text-lg leading-none">{stat.value}</p>
                <p className="text-indigo-300 text-[10px] font-semibold mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          FILTER PILLS
      ══════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-gold" />
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              Browse Rooms
            </h2>
          </div>
          <span className="text-xs text-neutral-500">{filteredListings.length} rooms found</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill}
              onClick={() => setActiveFilter(pill)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === pill
                  ? 'bg-brand-navy text-white border-brand-navy dark:bg-indigo-600 dark:border-indigo-600'
                  : 'border-border text-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-600 hover:text-foreground'
              }`}
            >
              {pill.includes('MRT') ? (
                <span className="flex items-center gap-1">
                  <Train className="h-2.5 w-2.5" />
                  {pill}
                </span>
              ) : pill}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          LISTINGS GRID
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
        {filteredListings.length === 0 && (
          <div className="col-span-3 py-16 text-center">
            <Search className="h-10 w-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
            <p className="text-sm font-bold text-neutral-400">No co-living spaces match your filters.</p>
            <button
              onClick={() => setActiveFilter('All')}
              className="text-xs text-brand-gold hover:underline mt-2 cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          OPERATOR PROFILES
      ══════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Building className="h-4 w-4 text-brand-gold" />
          <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
            Co-living Operators
          </h2>
        </div>
        <p className="text-xs text-neutral-500 -mt-2 mb-4">
          Singapore's leading professionally managed co-living brands.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {OPERATORS.map((op) => (
            <OperatorCard key={op.id} op={op} />
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          WHY CO-LIVING BANNER
      ══════════════════════════════════════════ */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-navy to-brand-navy-light p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
        <div className="md:col-span-1">
          <h3 className="text-lg font-black mb-2">Why Co-living?</h3>
          <p className="text-sm text-indigo-200 leading-relaxed">
            Perfect for young professionals, expats, and digital nomads who want flexibility without the hassle of a long-term lease.
          </p>
        </div>
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { icon: '📦', title: 'Move-in Ready', desc: 'Fully furnished. Bring just your suitcase.' },
            { icon: '📅', title: 'Flexible Leases', desc: 'From 1 month. Scale up or down freely.' },
            { icon: '🤝', title: 'Built-in Community', desc: 'Events, shared lounges, instant friends.' },
            { icon: '💡', title: 'All Bills Included', desc: 'Utilities, WiFi, cleaning — one invoice.' },
            { icon: '🏋️', title: 'Premium Amenities', desc: 'Gyms, pools, co-working hubs on-site.' },
            { icon: '🔒', title: '24/7 Security', desc: 'Professional management. Always on.' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-2.5">
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-xs font-bold">{item.title}</p>
                <p className="text-[10px] text-indigo-300 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          FAQ SECTION
      ══════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              isOpen={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? null : i)}
            />
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-400 mb-3">Still have questions about co-living in Singapore?</p>
          <Button variant="outline" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
            Chat with Our Co-living Advisor
          </Button>
        </div>
      </div>

    </div>
  );
}
