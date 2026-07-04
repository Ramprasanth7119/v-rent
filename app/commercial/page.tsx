"use client";

import React, { useState, useMemo } from 'react';
import {
  Search, Building2, MapPin, Ruler, TrendingUp, TrendingDown,
  Star, Leaf, ChevronRight, Award, BarChart3, Globe, Factory,
  ShoppingBag, Stethoscope, UtensilsCrossed, ArrowRight,
  CheckCircle2, Zap, Shield, Clock, Eye, Heart
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

// ─── Types ────────────────────────────────────────────────────────────────────

type CommercialCategory = 'All' | 'Office' | 'Retail' | 'Industrial' | 'Shophouse' | 'Medical Suite' | 'F&B';

interface CommercialListing {
  id: string;
  title: string;
  address: string;
  district: string;
  category: CommercialCategory;
  size: number; // sqft
  sqm: number;
  psfPerMonth?: number; // S$ psf/mo
  salePrice?: number; // S$ total
  tenure: '30-year' | '60-year' | '99-year' | 'Freehold';
  greenMark?: 'Platinum' | 'Gold' | 'Certified';
  grade?: 'Grade A' | 'Grade B' | 'Conserved';
  mrt?: string;
  image: string;
  features: string[];
  available: string;
  floor?: string;
}

// ─── Mock Listings ─────────────────────────────────────────────────────────────

const LISTINGS: CommercialListing[] = [
  {
    id: 'mbfc-t3',
    title: 'Marina Bay Financial Centre Tower 3',
    address: '12 Marina Boulevard, MBFC Tower 3',
    district: 'D01',
    category: 'Office',
    size: 5000,
    sqm: 465,
    psfPerMonth: 12.50,
    tenure: 'Freehold',
    greenMark: 'Platinum',
    grade: 'Grade A',
    mrt: 'Bayfront MRT (CE1/DT16)',
    image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
    features: ['Column-free floors', 'Raised flooring', 'CBRE managed', '24/7 security', 'Concierge'],
    available: 'Immediate',
    floor: '28F'
  },
  {
    id: 'millenia-tower',
    title: 'Millenia Tower',
    address: '1 Temasek Avenue, Suntec City',
    district: 'D09',
    category: 'Office',
    size: 2800,
    sqm: 260,
    psfPerMonth: 10.80,
    tenure: 'Freehold',
    mrt: 'Promenade MRT (CC4/DT15)',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&q=80',
    features: ['City & Marina views', 'Smart building', 'Fibre-ready', 'Collaborative zones'],
    available: '1 Aug 2026',
    floor: '14F'
  },
  {
    id: 'great-world-city',
    title: 'Great World City Mall',
    address: '1 Kim Seng Promenade, #03-25',
    district: 'D03',
    category: 'Retail',
    size: 1200,
    sqm: 111,
    psfPerMonth: 28.00,
    tenure: '99-year',
    mrt: 'Great World MRT (TE15)',
    image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&q=80',
    features: ['Anchor tenant mall', 'High footfall', 'Riverside frontage', 'Anchor floor'],
    available: '15 Sep 2026',
    floor: '03'
  },
  {
    id: 'jurong-east-mrt',
    title: 'Jurong East MRT Hub F&B Lot',
    address: '10 Jurong East Street 12, #B1-05',
    district: 'D22',
    category: 'F&B',
    size: 600,
    sqm: 56,
    psfPerMonth: 15.00,
    tenure: '30-year',
    mrt: 'Jurong East MRT (NS1/EW24)',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    features: ['Direct MRT access', '50,000+ daily commuters', 'Exhaust ducting', 'F&B approved'],
    available: 'Immediate',
    floor: 'B1'
  },
  {
    id: 'tanjong-pagar-shophouse',
    title: 'Tanjong Pagar Conservation Shophouse',
    address: '46 Tanjong Pagar Road',
    district: 'D02',
    category: 'Shophouse',
    size: 800,
    sqm: 74,
    salePrice: 5_200_000,
    tenure: 'Freehold',
    grade: 'Conserved',
    mrt: 'Tanjong Pagar MRT (EW15)',
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80',
    features: ['URA conservation status', 'Heritage façade', 'Air-well atrium', 'Office + retail'],
    available: 'Immediate',
    floor: 'Ground + Upper'
  },
  {
    id: 'ann-siang-shophouse',
    title: 'Ann Siang Road Heritage Shophouse',
    address: '32 Ann Siang Road',
    district: 'D02',
    category: 'Shophouse',
    size: 1500,
    sqm: 139,
    salePrice: 7_800_000,
    tenure: 'Freehold',
    grade: 'Conserved',
    mrt: 'Chinatown MRT (NE4/DT19)',
    image: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&q=80',
    features: ['4-storey + attic', 'Prime Chinatown fringe', 'Restaurant/F&B zoned', 'Heritage certificate'],
    available: 'By negotiation',
    floor: 'Ground – 4F'
  },
  {
    id: 'biopolis-medical',
    title: 'Biopolis Life Sciences Hub',
    address: '31 Biopolis Way, Nanos Building',
    district: 'D05',
    category: 'Medical Suite',
    size: 4000,
    sqm: 372,
    psfPerMonth: 6.80,
    tenure: '60-year',
    greenMark: 'Gold',
    mrt: 'one-north MRT (CC23)',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=80',
    features: ['Lab-ready', 'Pharma-grade ventilation', 'Biohazard compliance', 'A*STAR campus'],
    available: '1 Oct 2026',
    floor: '05F'
  },
  {
    id: 'tuas-industrial',
    title: 'Tuas South Industrial Factory B2',
    address: '28 Tuas South Boulevard',
    district: 'D22',
    category: 'Industrial',
    size: 8000,
    sqm: 743,
    psfPerMonth: 2.10,
    tenure: '30-year',
    mrt: 'Pioneer MRT (EW28)',
    image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=600&q=80',
    features: ['10m clear height', '40-tonne floor loading', 'Drive-in access', 'Loading dock x4', 'JTC approved'],
    available: 'Immediate',
    floor: 'Ground'
  }
];

// ─── Featured Projects ─────────────────────────────────────────────────────────

const FEATURED_PROJECTS = [
  {
    id: 'one-marina-gardens',
    title: 'One Marina Gardens',
    type: 'Grade A Office Tower',
    district: 'D01 – Marina Bay',
    status: 'TOP 2027 Q3',
    price: 'From S$13.80 psf/mo',
    size: '50,000 – 150,000 sqft whole-floors',
    developer: 'Keppel Land',
    greenMark: 'Platinum',
    description: 'Singapore\'s next trophy waterfront office tower with panoramic bay views, AI-powered building management, and LEED Platinum certification.',
    gradient: 'from-blue-900 via-brand-navy to-brand-navy-dark',
    accentColor: 'blue',
    specs: ['36 storeys', 'Column-free 40m plates', 'EV charging podium', 'Green roof terraces'],
    image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80'
  },
  {
    id: 'orchard-turn-retail',
    title: 'Orchard Turn Iconic Retail',
    type: 'Prime Orchard Retail',
    district: 'D09 – Orchard Road',
    status: 'Leasing Now',
    price: 'From S$35 psf/mo',
    size: '500 – 5,000 sqft',
    developer: 'ION Property Pte Ltd',
    description: 'Singapore\'s most iconic retail destination at Orchard/Paterson. Floor-to-ceiling glazed frontage, 300,000+ sqft GFA, flagship ready.',
    gradient: 'from-emerald-900 via-emerald-800 to-brand-navy-dark',
    accentColor: 'emerald',
    specs: ['Levels B4 to L4', '300k sqft GFA', 'Directly above ION Orchard MRT', 'CBRE/JLL managed'],
    image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80'
  },
  {
    id: 'one-north-biomed',
    title: 'Helios Biomedical Park',
    type: 'Life Sciences Campus',
    district: 'D05 – One-North',
    status: 'Phase 2 Launching',
    price: 'From S$5.50 psf/mo',
    size: '2,000 – 20,000 sqft',
    developer: 'JTC Corporation',
    greenMark: 'Platinum',
    description: 'JTC\'s landmark biomedical research campus within Singapore\'s innovation corridor. GMP lab-ready suites, co-locate with A*STAR and EDB-supported companies.',
    gradient: 'from-purple-900 via-purple-800 to-brand-navy-dark',
    accentColor: 'purple',
    specs: ['GMP-grade labs', 'BSL-2 compliant', 'Vivarium facilities', '60-year lease'],
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80'
  }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Office: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  Retail: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  Industrial: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
  Shophouse: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300',
  'Medical Suite': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300',
  'F&B': 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Office: <Building2 className="h-3.5 w-3.5" />,
  Retail: <ShoppingBag className="h-3.5 w-3.5" />,
  Industrial: <Factory className="h-3.5 w-3.5" />,
  Shophouse: <Globe className="h-3.5 w-3.5" />,
  'Medical Suite': <Stethoscope className="h-3.5 w-3.5" />,
  'F&B': <UtensilsCrossed className="h-3.5 w-3.5" />,
};

const GREEN_MARK_COLORS: Record<string, string> = {
  Platinum: 'bg-emerald-600 text-white',
  Gold: 'bg-amber-500 text-white',
  Certified: 'bg-teal-600 text-white',
};

function formatPSF(psf: number) {
  return `S$${psf.toFixed(2)} psf/mo`;
}

function formatPrice(price: number) {
  if (price >= 1_000_000) return `S$${(price / 1_000_000).toFixed(1)}M`;
  return `S$${price.toLocaleString()}`;
}

function formatSqft(sqft: number) {
  return `${sqft.toLocaleString()} sqft`;
}

// ─── Listing Card ─────────────────────────────────────────────────────────────

function ListingCard({ listing }: { listing: CommercialListing }) {
  const [saved, setSaved] = useState(false);

  return (
    <div className="group rounded-xl overflow-hidden border border-border bg-card hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={listing.image}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top badges row */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${CATEGORY_COLORS[listing.category]}`}>
            {CATEGORY_ICONS[listing.category]}
            {listing.category}
          </span>
          {listing.greenMark && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${GREEN_MARK_COLORS[listing.greenMark]}`}>
              <Leaf className="h-2.5 w-2.5" />
              BCA {listing.greenMark}
            </span>
          )}
          {listing.grade && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-gold text-brand-navy">
              {listing.grade}
            </span>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={() => setSaved(s => !s)}
          className={`absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer ${saved ? 'bg-rose-500 text-white' : 'bg-black/30 text-white hover:bg-black/50'}`}
        >
          <Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
        </button>

        {/* Bottom: District pill */}
        <div className="absolute bottom-3 right-3">
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-black/50 backdrop-blur-sm text-white uppercase tracking-wider">
            {listing.district}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-sm text-foreground leading-tight line-clamp-2 group-hover:text-brand-gold transition-colors">
            {listing.title}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{listing.address}</span>
          </div>
        </div>

        {/* Size */}
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Ruler className="h-3 w-3" />
          <span className="font-medium text-foreground">{formatSqft(listing.size)}</span>
          <span className="text-neutral-400">({listing.sqm} sqm)</span>
          {listing.floor && (
            <>
              <span className="text-neutral-300 dark:text-neutral-700">·</span>
              <span>Floor {listing.floor}</span>
            </>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div>
            {listing.psfPerMonth ? (
              <div>
                <p className="text-lg font-black text-foreground">{formatPSF(listing.psfPerMonth)}</p>
                <p className="text-[10px] text-neutral-500 font-medium">
                  ≈ S${Math.round(listing.psfPerMonth * listing.size).toLocaleString()}/mo total
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-black text-foreground">{formatPrice(listing.salePrice!)}</p>
                <p className="text-[10px] text-neutral-500 font-medium">
                  ≈ S${Math.round(listing.salePrice! / listing.sqm / 10.764).toLocaleString()} psf
                </p>
              </div>
            )}
          </div>
          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
            listing.tenure === 'Freehold'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
          }`}>
            {listing.tenure}
          </span>
        </div>

        {/* MRT */}
        {listing.mrt && (
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 bg-neutral-50 dark:bg-neutral-900 rounded-lg px-2.5 py-1.5">
            <div className="h-2 w-2 rounded-full bg-brand-gold flex-shrink-0" />
            <span>{listing.mrt}</span>
          </div>
        )}

        {/* Availability */}
        <div className="flex items-center gap-1.5 text-[10px]">
          <Clock className="h-3 w-3 text-neutral-400" />
          <span className="text-neutral-500">Available:</span>
          <span className={`font-semibold ${listing.available === 'Immediate' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
            {listing.available}
          </span>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-1">
          {listing.features.slice(0, 3).map(f => (
            <span key={f} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              {f}
            </span>
          ))}
          {listing.features.length > 3 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
              +{listing.features.length - 3}
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="flex gap-2 pt-1">
          <Button variant="gold" size="sm" className="flex-1 font-bold" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
            View Details
          </Button>
          <Button variant="outline" size="sm" className="px-3">
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Featured Project Card ────────────────────────────────────────────────────

function FeaturedProjectCard({ project }: { project: typeof FEATURED_PROJECTS[0] }) {
  return (
    <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${project.gradient} text-white group hover:-translate-y-1 hover:shadow-2xl transition-all duration-300`}>
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img src={project.image} alt={project.title} className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-300 scale-105" />
      </div>

      <div className="relative z-10 p-6 space-y-4 h-full flex flex-col">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                project.status === 'Leasing Now' ? 'bg-emerald-500 text-white' :
                project.status === 'TOP 2027 Q3' ? 'bg-brand-gold text-brand-navy' :
                'bg-purple-500 text-white'
              }`}>
                {project.status}
              </span>
              {project.greenMark && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/80 text-white flex items-center gap-1">
                  <Leaf className="h-2.5 w-2.5" /> BCA {project.greenMark}
                </span>
              )}
            </div>
            <h3 className="text-xl font-black leading-tight">{project.title}</h3>
            <p className="text-xs text-white/70 mt-0.5 font-medium">{project.type}</p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-white/80">
          <MapPin className="h-4 w-4 text-brand-gold flex-shrink-0" />
          <span>{project.district}</span>
          <span className="text-white/40">·</span>
          <Building2 className="h-4 w-4 text-white/60" />
          <span>{project.developer}</span>
        </div>

        {/* Description */}
        <p className="text-sm text-white/80 leading-relaxed flex-1">{project.description}</p>

        {/* Key specs grid */}
        <div className="grid grid-cols-2 gap-2">
          {project.specs.map(spec => (
            <div key={spec} className="flex items-center gap-1.5 text-xs text-white/70">
              <CheckCircle2 className="h-3 w-3 text-brand-gold flex-shrink-0" />
              <span>{spec}</span>
            </div>
          ))}
        </div>

        {/* Price & Size */}
        <div className="border-t border-white/10 pt-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-0.5">Starting From</p>
            <p className="text-lg font-black text-brand-gold">{project.price}</p>
            <p className="text-[10px] text-white/60 mt-0.5">{project.size}</p>
          </div>
          <Button
            variant="gold"
            size="sm"
            rightIcon={<ChevronRight className="h-4 w-4" />}
            className="font-bold"
          >
            Enquire Now
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Market Intelligence Widget ───────────────────────────────────────────────

function MarketWidget() {
  const metrics = [
    {
      label: 'Office Vacancy Rate',
      value: '10.2%',
      change: '-1.2pp',
      trend: 'down' as const,
      subtitle: 'vs 11.4% prev quarter',
      color: 'text-emerald-500'
    },
    {
      label: 'Retail Avg PSF (Orchard)',
      value: 'S$29.80',
      change: '+3.1%',
      trend: 'up' as const,
      subtitle: 'psf/mo · Orchard Core',
      color: 'text-rose-500'
    },
    {
      label: 'Industrial Average',
      value: 'S$2.40',
      change: '+0.4%',
      trend: 'up' as const,
      subtitle: 'psf/mo · Island-wide avg',
      color: 'text-orange-500'
    },
    {
      label: 'URA GFA Pipeline',
      value: '450,000',
      change: 'sqm',
      trend: null,
      subtitle: 'Commercial space under construction',
      color: 'text-blue-500'
    }
  ];

  const topDistricts = [
    { district: 'D01', name: 'CBD / Marina Bay', type: 'Office', psf: 'S$12–15 psf/mo', score: 98 },
    { district: 'D09', name: 'Orchard / River Valley', type: 'Retail', psf: 'S$25–35 psf/mo', score: 94 },
    { district: 'D02', name: 'Tanjong Pagar', type: 'Shophouse', psf: 'S$5–8M sale', score: 89 },
    { district: 'D05', name: 'One-North / Buona Vista', type: 'Medical / Tech', psf: 'S$5–7 psf/mo', score: 85 },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-brand-gold" />
        <h2 className="text-sm font-black uppercase tracking-wider text-foreground">Market Intelligence</h2>
        <span className="ml-auto text-[10px] text-neutral-400 font-medium">Q2 2026 · URA Data</span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(m => (
          <Card key={m.label} className="p-3 space-y-1 bg-card border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 leading-tight">{m.label}</p>
            <div className="flex items-end gap-1.5">
              <p className="text-xl font-black text-foreground">{m.value}</p>
              {m.trend && (
                <div className={`flex items-center gap-0.5 pb-0.5 text-xs font-bold ${m.trend === 'down' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {m.trend === 'down' ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {m.change}
                </div>
              )}
              {!m.trend && <p className="text-xs text-neutral-400 pb-0.5">{m.change}</p>}
            </div>
            <p className="text-[10px] text-neutral-500">{m.subtitle}</p>
          </Card>
        ))}
      </div>

      {/* Top Districts */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Top Commercial Districts</p>
        {topDistricts.map(d => (
          <div key={d.district} className="flex items-center gap-3 group cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-brand-navy text-white flex items-center justify-center text-[10px] font-black flex-shrink-0 group-hover:bg-brand-gold group-hover:text-brand-navy transition-colors">
              {d.district}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground truncate">{d.name}</p>
                <p className="text-[10px] font-bold text-brand-gold ml-2 flex-shrink-0">{d.psf}</p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">{d.type}</span>
                <div className="flex-1 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-gold to-brand-navy rounded-full"
                    style={{ width: `${d.score}%` }}
                  />
                </div>
                <span className="text-[9px] text-neutral-400 w-6 text-right">{d.score}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Trend note */}
      <Card className="bg-brand-navy dark:bg-brand-navy-dark border-0 p-4 text-white space-y-1.5">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-brand-gold" />
          <p className="text-xs font-bold uppercase tracking-wider text-brand-gold">Market Insight</p>
        </div>
        <p className="text-xs text-white/80 leading-relaxed">
          CBD Grade A offices see tightening vacancy as tech and finance firms return to flight-to-quality. 
          Industrial rents hold firm amid supply constraints in Tuas & Jurong.
        </p>
      </Card>

      {/* Quick Links */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Quick Tools</p>
        {[
          { label: 'PSF Rent Calculator', icon: <BarChart3 className="h-3.5 w-3.5" /> },
          { label: 'Stamp Duty Estimator', icon: <Shield className="h-3.5 w-3.5" /> },
          { label: 'URA Zone Check', icon: <Globe className="h-3.5 w-3.5" /> },
          { label: 'Schedule Site Visit', icon: <Clock className="h-3.5 w-3.5" /> },
        ].map(item => (
          <button
            key={item.label}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-foreground transition-colors cursor-pointer text-left group"
          >
            <span className="text-neutral-400 group-hover:text-brand-gold transition-colors">{item.icon}</span>
            {item.label}
            <ChevronRight className="h-3 w-3 ml-auto text-neutral-300 group-hover:text-neutral-500" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Stats Strip ──────────────────────────────────────────────────────────────

function StatsStrip() {
  const stats = [
    { label: 'Commercial Listings', value: '4,200+', icon: <Building2 className="h-5 w-5" /> },
    { label: 'Avg PSF/mo', value: 'S$8.90', icon: <BarChart3 className="h-5 w-5" /> },
    { label: 'YoY Market Growth', value: '12%', icon: <TrendingUp className="h-5 w-5" /> },
    { label: 'Districts Covered', value: '28', icon: <MapPin className="h-5 w-5" /> },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4">
      {stats.map(stat => (
        <div key={stat.label} className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-brand-gold">
            {stat.icon}
          </div>
          <p className="text-2xl font-black text-white">{stat.value}</p>
          <p className="text-xs text-white/60 font-medium">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Category Tab Button ───────────────────────────────────────────────────────

const CATEGORIES: CommercialCategory[] = ['All', 'Office', 'Retail', 'Industrial', 'Shophouse', 'Medical Suite'];

function CategoryTabs({
  active,
  onChange
}: {
  active: CommercialCategory;
  onChange: (cat: CommercialCategory) => void;
}) {
  const counts: Record<string, number> = { All: LISTINGS.length };
  LISTINGS.forEach(l => {
    counts[l.category] = (counts[l.category] || 0) + 1;
  });

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
      {CATEGORIES.map(cat => {
        const isActive = cat === active;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
              isActive
                ? 'bg-brand-gold text-brand-navy shadow-sm'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-foreground'
            }`}
          >
            {cat !== 'All' && (
              <span className={isActive ? 'text-brand-navy' : 'text-neutral-400'}>
                {CATEGORY_ICONS[cat]}
              </span>
            )}
            {cat}
            <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
              isActive
                ? 'bg-brand-navy/20 text-brand-navy'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
            }`}>
              {counts[cat] || 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommercialPage() {
  const [activeCategory, setActiveCategory] = useState<CommercialCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [sortOrder, setSortOrder] = useState<'default' | 'psf_asc' | 'psf_desc' | 'size_asc'>('default');

  // Filtered listings
  const filteredListings = useMemo(() => {
    let results = LISTINGS;

    if (activeCategory !== 'All') {
      results = results.filter(l => l.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        l.district.toLowerCase().includes(q)
      );
    }

    if (selectedDistrict) {
      results = results.filter(l => l.district === selectedDistrict);
    }

    // Sort
    if (sortOrder === 'psf_asc') {
      results = [...results].sort((a, b) => (a.psfPerMonth || 999) - (b.psfPerMonth || 999));
    } else if (sortOrder === 'psf_desc') {
      results = [...results].sort((a, b) => (b.psfPerMonth || 0) - (a.psfPerMonth || 0));
    } else if (sortOrder === 'size_asc') {
      results = [...results].sort((a, b) => a.size - b.size);
    }

    return results;
  }, [activeCategory, searchQuery, selectedDistrict, sortOrder]);

  return (
    <div className="space-y-0">

      {/* ── HERO SECTION ────────────────────────────────────────────────── */}
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy-dark" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        {/* Gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-gold to-transparent" />

        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 space-y-8">

          {/* Headline */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/70 uppercase tracking-widest">
              <Award className="h-3.5 w-3.5 text-brand-gold" />
              Singapore Commercial Real Estate
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Singapore Commercial Property
            </h1>
            <p className="text-base text-white/60 font-medium">
              Office · Retail · Industrial · Shophouse
            </p>
          </div>

          {/* Search bar */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-2 p-2 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              {/* Text input */}
              <div className="flex-1 flex items-center gap-2 bg-white dark:bg-neutral-900 rounded-xl px-4 py-3">
                <Search className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search address, building, district…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder-neutral-400 focus:outline-none"
                />
              </div>

              {/* Category dropdown */}
              <div className="relative sm:w-48">
                <select
                  value={selectedTypeFilter}
                  onChange={e => {
                    setSelectedTypeFilter(e.target.value);
                    setActiveCategory(e.target.value as CommercialCategory);
                  }}
                  className="w-full appearance-none bg-white dark:bg-neutral-900 text-foreground text-sm rounded-xl px-4 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-gold border-0 font-medium cursor-pointer"
                >
                  {['All', 'Office', 'Retail', 'Industrial', 'Shophouse', 'Medical Suite', 'F&B'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* District dropdown */}
              <div className="relative sm:w-48">
                <select
                  value={selectedDistrict}
                  onChange={e => setSelectedDistrict(e.target.value)}
                  className="w-full appearance-none bg-white dark:bg-neutral-900 text-foreground text-sm rounded-xl px-4 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-gold border-0 font-medium cursor-pointer"
                >
                  <option value="">All Districts</option>
                  {['D01', 'D02', 'D03', 'D04', 'D05', 'D07', 'D08', 'D09', 'D10', 'D11', 'D14', 'D15', 'D19', 'D20', 'D22', 'D23', 'D27', 'D28'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Search button */}
              <Button variant="gold" size="md" leftIcon={<Search className="h-4 w-4" />} className="font-bold sm:px-6 rounded-xl">
                Search
              </Button>
            </div>
          </div>

          {/* Stats strip */}
          <StatsStrip />
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <div className="pt-8 space-y-8">

        {/* ── FEATURED PROJECTS ──────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <Star className="h-5 w-5 text-brand-gold" />
                Featured Commercial Projects
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">Premium developments — direct developer leasing</p>
            </div>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-4 w-4" />}>
              See All Projects
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {FEATURED_PROJECTS.map(project => (
              <FeaturedProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>

        {/* ── LISTINGS + SIDEBAR ──────────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

            {/* Listings main panel */}
            <div className="xl:col-span-8 space-y-5">

              {/* Section header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-border">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-wider text-foreground">
                    Commercial Listings
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {filteredListings.length} {activeCategory !== 'All' ? activeCategory : ''} {filteredListings.length === 1 ? 'listing' : 'listings'} found
                  </p>
                </div>

                {/* Sort control */}
                <div className="sm:ml-auto flex items-center gap-2">
                  <span className="text-xs text-neutral-500 font-medium whitespace-nowrap">Sort by:</span>
                  <div className="relative">
                    <select
                      value={sortOrder}
                      onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
                      className="appearance-none rounded-lg border border-border bg-card px-3 py-1.5 pr-7 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold cursor-pointer"
                    >
                      <option value="default">Recommended</option>
                      <option value="psf_asc">PSF: Low → High</option>
                      <option value="psf_desc">PSF: High → Low</option>
                      <option value="size_asc">Size: Smallest First</option>
                    </select>
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Category tabs */}
              <CategoryTabs active={activeCategory} onChange={cat => {
                setActiveCategory(cat);
                setSelectedTypeFilter(cat);
              }} />

              {/* Listings grid */}
              {filteredListings.length === 0 ? (
                <div className="border border-dashed border-border rounded-2xl p-12 text-center space-y-4">
                  <div className="h-14 w-14 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto">
                    <Building2 className="h-7 w-7 text-neutral-400" />
                  </div>
                  <h3 className="text-base font-bold text-foreground uppercase">No Listings Found</h3>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    No commercial listings match your current filters. Try adjusting the category or search query.
                  </p>
                  <Button
                    size="sm"
                    variant="gold"
                    onClick={() => {
                      setActiveCategory('All');
                      setSearchQuery('');
                      setSelectedDistrict('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
                  {filteredListings.map(listing => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}

              {/* Load more */}
              {filteredListings.length > 0 && (
                <div className="pt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="md"
                    className="font-bold px-10"
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                  >
                    Load More Listings
                  </Button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-4 space-y-6">
              {/* Sticky wrapper */}
              <div className="xl:sticky xl:top-20">
                <Card className="p-5 bg-card border-border">
                  <MarketWidget />
                </Card>

                {/* CTA Card */}
                <Card className="mt-4 p-5 bg-gradient-to-br from-brand-navy to-brand-navy-dark border-0 text-white space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-brand-gold" />
                    <p className="font-bold text-sm uppercase tracking-wider">Expert Advisory</p>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Connect with Singapore's top commercial property specialists. CEA-licensed, specialising in CBD office, Shophouses & Industrial.
                  </p>
                  <div className="space-y-1.5">
                    {[
                      'Free lease review & market analysis',
                      'Off-market listings access',
                      'Tenant representation services',
                    ].map(f => (
                      <div key={f} className="flex items-start gap-2 text-[11px] text-white/70">
                        <CheckCircle2 className="h-3 w-3 text-brand-gold flex-shrink-0 mt-0.5" />
                        {f}
                      </div>
                    ))}
                  </div>
                  <Button variant="gold" size="sm" className="w-full font-bold mt-2">
                    Speak to a Commercial Specialist
                  </Button>
                </Card>
              </div>
            </div>

          </div>
        </section>

        {/* ── WHY V-RENT COMMERCIAL ─────────────────────────────────────── */}
        <section className="rounded-2xl bg-gradient-to-br from-neutral-50 to-white dark:from-neutral-900/50 dark:to-neutral-900 border border-border p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-black uppercase tracking-wider text-foreground">Why V-Rent Commercial</h2>
            <p className="text-xs text-neutral-500">Singapore's most comprehensive commercial property platform</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Zap className="h-6 w-6 text-brand-gold" />, title: 'AI-Powered Matching', desc: 'Smart recommendations based on business type, headcount & budget' },
              { icon: <Shield className="h-6 w-6 text-brand-gold" />, title: 'Verified Listings', desc: 'All listings verified with BizSafe, CEA and URA zoning checks' },
              { icon: <Globe className="h-6 w-6 text-brand-gold" />, title: 'All Sectors Covered', desc: 'Office, retail, industrial, shophouse, medical & data centres' },
              { icon: <Star className="h-6 w-6 text-brand-gold" />, title: 'Off-Market Access', desc: 'Exclusive listings not advertised anywhere else in Singapore' },
            ].map(f => (
              <div key={f.title} className="text-center space-y-2">
                <div className="h-12 w-12 rounded-xl bg-brand-gold/10 flex items-center justify-center mx-auto">
                  {f.icon}
                </div>
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">{f.title}</p>
                <p className="text-[11px] text-neutral-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
