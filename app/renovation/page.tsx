"use client";

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Calculator,
  Home,
  Star,
  CheckSquare,
  Square,
  ChevronRight,
  Clock,
  Info,
  Award,
  MessageCircle,
  Hammer,
  Layers,
  Sparkles,
  DollarSign,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type PropertyType = 'HDB' | 'Condo' | 'Landed' | 'Commercial';
type StyleTier = 'budget' | 'standard' | 'premium';

interface RoomItem {
  id: string;
  label: string;
  icon: string;
  budgetRange: [number, number]; // min-max multiplier per sqft fraction (flat cost ranges)
}

interface Partner {
  id: number;
  name: string;
  photo: string;
  rating: number;
  reviews: number;
  specializations: string[];
  categories: string[];
  startingPrice: string;
  startingPriceNum: number;
  established: number;
  projects: number;
  description: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROPERTY_TYPES: PropertyType[] = ['HDB', 'Condo', 'Landed', 'Commercial'];

const STYLE_TIERS: {
  id: StyleTier;
  label: string;
  range: string;
  minPsf: number;
  maxPsf: number;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    id: 'budget',
    label: 'Budget',
    range: 'S$300–500 / sqft',
    minPsf: 300,
    maxPsf: 500,
    description: 'Practical & functional. Laminate flooring, standard cabinetry, off-the-shelf fixtures.',
    icon: <Layers className="h-5 w-5" />,
    color: 'border-blue-500 bg-blue-500/5',
  },
  {
    id: 'standard',
    label: 'Standard',
    range: 'S$500–800 / sqft',
    minPsf: 500,
    maxPsf: 800,
    description: 'Mid-range quality. Engineered wood, semi-custom carpentry, quality tiles.',
    icon: <Home className="h-5 w-5" />,
    color: 'border-brand-gold bg-brand-gold/5',
  },
  {
    id: 'premium',
    label: 'Premium',
    range: 'S$800–1,500 / sqft',
    minPsf: 800,
    maxPsf: 1500,
    description: 'Luxury & custom. Marble, bespoke joinery, smart-home integration, European brands.',
    icon: <Sparkles className="h-5 w-5" />,
    color: 'border-purple-500 bg-purple-500/5',
  },
];

const ROOMS: RoomItem[] = [
  { id: 'living', label: 'Living Room', icon: '🛋️', budgetRange: [12000, 45000] },
  { id: 'master_bed', label: 'Master Bedroom', icon: '🛏️', budgetRange: [10000, 38000] },
  { id: 'add_bed', label: 'Additional Bedrooms', icon: '🚪', budgetRange: [8000, 28000] },
  { id: 'kitchen', label: 'Kitchen', icon: '🍳', budgetRange: [18000, 75000] },
  { id: 'bathroom', label: 'Bathrooms', icon: '🚿', budgetRange: [8000, 32000] },
  { id: 'study', label: 'Study / Home Office', icon: '📚', budgetRange: [6000, 22000] },
  { id: 'yard', label: 'Yard / Balcony', icon: '🌿', budgetRange: [4000, 18000] },
];

const TIMELINES: Record<StyleTier, string> = {
  budget: '8–12 weeks',
  standard: '10–16 weeks',
  premium: '14–24 weeks',
};

const PARTNERS: Partner[] = [
  {
    id: 1,
    name: 'Fuse Concept',
    photo: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=600&q=80',
    rating: 4.8,
    reviews: 312,
    specializations: ['HDB Specialist', 'Modern Minimalist', 'BTO Ready'],
    categories: ['HDB Specialist'],
    startingPrice: 'from S$45k',
    startingPriceNum: 45000,
    established: 2012,
    projects: 890,
    description: 'Singapore\'s top HDB renovation studio. Renowned for maximising small-space efficiency.',
  },
  {
    id: 2,
    name: 'Neu Concept',
    photo: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80',
    rating: 4.7,
    reviews: 198,
    specializations: ['Modern Minimalist', 'Japandi', 'Condo'],
    categories: ['All'],
    startingPrice: 'from S$68k',
    startingPriceNum: 68000,
    established: 2015,
    projects: 540,
    description: 'Crafting serene, minimalist interiors that balance form with function.',
  },
  {
    id: 3,
    name: 'Renozone',
    photo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    rating: 4.6,
    reviews: 245,
    specializations: ['Industrial', 'Eclectic', 'HDB', 'Condo'],
    categories: ['HDB Specialist'],
    startingPrice: 'from S$52k',
    startingPriceNum: 52000,
    established: 2010,
    projects: 760,
    description: 'Bold industrial aesthetics meet practical everyday living. Signature brick & steel details.',
  },
  {
    id: 4,
    name: 'Carpenters Interior',
    photo: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80',
    rating: 4.9,
    reviews: 89,
    specializations: ['Classic Luxury', 'Bespoke Carpentry', 'Landed'],
    categories: ['Landed'],
    startingPrice: 'from S$120k',
    startingPriceNum: 120000,
    established: 2008,
    projects: 320,
    description: 'Purveyors of heirloom-quality bespoke furniture and luxury residential interiors.',
  },
  {
    id: 5,
    name: 'The Local INN.terior',
    photo: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600&q=80',
    rating: 4.8,
    reviews: 167,
    specializations: ['Scandinavian', 'Cozy Contemporary', 'HDB'],
    categories: ['HDB Specialist'],
    startingPrice: 'from S$58k',
    startingPriceNum: 58000,
    established: 2016,
    projects: 430,
    description: 'Warm Scandinavian-inspired spaces with a distinct local identity. Hygge living, Singapore style.',
  },
  {
    id: 6,
    name: 'Versaform',
    photo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
    rating: 4.7,
    reviews: 54,
    specializations: ['Landed', 'Commercial', 'F&B', 'Office Fit-out'],
    categories: ['Landed', 'Commercial'],
    startingPrice: 'from S$200k',
    startingPriceNum: 200000,
    established: 2014,
    projects: 215,
    description: 'Premium residential & commercial design-build firm. Specialises in GCBs and F&B concepts.',
  },
];

const PARTNER_FILTER_TABS = ['All', 'HDB Specialist', 'Landed', 'Commercial'];

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatSGD(n: number) {
  if (n >= 1_000_000) return `S$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `S$${Math.round(n / 1000)}k`;
  return `S$${n.toLocaleString()}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      <Star className="h-3.5 w-3.5 fill-brand-gold text-brand-gold" />
      <span className="text-xs font-bold text-foreground">{rating.toFixed(1)}</span>
    </span>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <Card hoverEffect className="overflow-hidden p-0 group">
      <div className="relative h-44 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={partner.photo}
          alt={partner.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <span className="text-white font-bold text-sm drop-shadow">{partner.name}</span>
          <span className="bg-white/90 rounded-full px-2 py-0.5 text-[10px] font-bold text-brand-navy">
            Est. {partner.established}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <StarRating rating={partner.rating} />
          <span className="text-[10px] text-neutral-500">{partner.reviews} reviews</span>
        </div>

        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2">
          {partner.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {partner.specializations.slice(0, 3).map((s) => (
            <Badge key={s} variant="secondary" className="text-[9px] px-2 py-0.5">
              {s}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div>
            <p className="text-[9px] text-neutral-500 uppercase font-semibold tracking-wider">Starting</p>
            <p className="text-sm font-black text-brand-gold">{partner.startingPrice}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-neutral-500 uppercase font-semibold tracking-wider">Projects</p>
            <p className="text-sm font-bold text-foreground">{partner.projects}+</p>
          </div>
        </div>

        <Button variant="gold" size="sm" className="w-full">
          <MessageCircle className="h-3.5 w-3.5" />
          Get Quote
        </Button>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RenovationPage() {
  // Estimator state
  const [propertyType, setPropertyType] = useState<PropertyType>('HDB');
  const [sqft, setSqft] = useState<number>(1000);
  const [styleTier, setStyleTier] = useState<StyleTier>('standard');
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(
    new Set(['living', 'master_bed', 'kitchen', 'bathroom'])
  );
  const [estimate, setEstimate] = useState<{
    min: number;
    max: number;
    rooms: { label: string; icon: string; min: number; max: number }[];
    timeline: string;
  } | null>(null);

  // Partner filter state
  const [partnerFilter, setPartnerFilter] = useState('All');

  const toggleRoom = (id: string) => {
    setSelectedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const calculateEstimate = () => {
    const tier = STYLE_TIERS.find((t) => t.id === styleTier)!;
    const tierMultiplier = {
      budget: 1.0,
      standard: 1.6,
      premium: 2.8,
    }[styleTier];

    const roomBreakdown = ROOMS.filter((r) => selectedRooms.has(r.id)).map((room) => {
      const roomMin = Math.round(room.budgetRange[0] * tierMultiplier);
      const roomMax = Math.round(room.budgetRange[1] * tierMultiplier);
      return { label: room.label, icon: room.icon, min: roomMin, max: roomMax };
    });

    const totalMin = roomBreakdown.reduce((s, r) => s + r.min, 0);
    const totalMax = roomBreakdown.reduce((s, r) => s + r.max, 0);

    // Adjust by sqft factor
    const sqftFactor = Math.max(0.7, Math.min(1.5, sqft / 1000));

    setEstimate({
      min: Math.round(totalMin * sqftFactor),
      max: Math.round(totalMax * sqftFactor),
      rooms: roomBreakdown,
      timeline: TIMELINES[styleTier],
    });
  };

  const filteredPartners =
    partnerFilter === 'All'
      ? PARTNERS
      : PARTNERS.filter((p) =>
          p.categories.some((c) => c === partnerFilter || c === 'All')
        );

  const selectedTier = STYLE_TIERS.find((t) => t.id === styleTier)!;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Hammer className="h-5 w-5 text-brand-gold" />
            <h1 className="text-xl font-black uppercase tracking-wider text-foreground">
              Renovation Hub
            </h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Estimate your Singapore renovation budget and connect with top-rated interior designers.
          </p>
        </div>
        <Badge variant="ai" className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          AI-Powered Cost Estimates
        </Badge>
      </div>

      {/* ── 2-Panel Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* ══════════════════════════════════════════
            LEFT PANEL — Cost Estimator
        ══════════════════════════════════════════ */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-brand-gold/10 flex items-center justify-center">
                <Calculator className="h-4 w-4 text-brand-gold" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
                  Smart Renovation Cost Estimator
                </h2>
                <p className="text-[10px] text-neutral-500 mt-0.5">Based on Singapore market rates 2025</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Property Type */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">
                  Property Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PROPERTY_TYPES.map((pt) => (
                    <button
                      key={pt}
                      onClick={() => setPropertyType(pt)}
                      className={`py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        propertyType === pt
                          ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                          : 'border-border text-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-600'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Input */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">
                  Property Size (sqft)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={sqft}
                    min={200}
                    max={10000}
                    onChange={(e) => setSqft(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 transition-all pr-16"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-400 uppercase">
                    sqft
                  </span>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[700, 1000, 1300, 1800, 2500].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSqft(s)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                        sqft === s
                          ? 'border-brand-gold text-brand-gold bg-brand-gold/5'
                          : 'border-border text-neutral-400 hover:border-neutral-400'
                      }`}
                    >
                      {s} sqft
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Tier */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">
                  Renovation Style Tier
                </label>
                <div className="space-y-2.5">
                  {STYLE_TIERS.map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setStyleTier(tier.id)}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                        styleTier === tier.id
                          ? tier.color
                          : 'border-border hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                              styleTier === tier.id ? 'bg-white/60 dark:bg-white/10' : 'bg-neutral-100 dark:bg-neutral-900'
                            }`}
                          >
                            {tier.icon}
                          </span>
                          <div>
                            <p className="text-sm font-black text-foreground">{tier.label}</p>
                            <p className="text-[10px] text-brand-gold font-bold">{tier.range}</p>
                          </div>
                        </div>
                        <div
                          className={`h-4 w-4 rounded-full border-2 flex-shrink-0 mt-1 transition-all ${
                            styleTier === tier.id
                              ? 'border-brand-gold bg-brand-gold'
                              : 'border-neutral-300 dark:border-neutral-600'
                          }`}
                        />
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed">{tier.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Room Checklist */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">
                  Rooms to Renovate
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ROOMS.map((room) => {
                    const checked = selectedRooms.has(room.id);
                    return (
                      <button
                        key={room.id}
                        onClick={() => toggleRoom(room.id)}
                        className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          checked
                            ? 'border-brand-gold bg-brand-gold/5'
                            : 'border-border hover:border-neutral-300 dark:hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-lg flex-shrink-0">{room.icon}</span>
                        <span className="text-[11px] font-bold text-foreground flex-1 leading-tight">
                          {room.label}
                        </span>
                        {checked ? (
                          <CheckSquare className="h-4 w-4 text-brand-gold flex-shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-neutral-300 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                variant="gold"
                size="lg"
                className="w-full font-bold uppercase tracking-wider"
                onClick={calculateEstimate}
                disabled={selectedRooms.size === 0}
                leftIcon={<Calculator className="h-4 w-4" />}
              >
                Calculate Estimate
              </Button>
            </div>
          </Card>

          {/* ── Results Panel ── */}
          {estimate ? (
            <Card className="border-brand-gold/30 bg-gradient-to-br from-brand-navy-dark to-brand-navy text-white">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-4 w-4 text-brand-gold" />
                <h3 className="text-xs font-black uppercase tracking-wider text-brand-gold">
                  Renovation Cost Estimate
                </h3>
              </div>

              {/* Total Range */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <p className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider mb-1">
                  Total Estimated Range
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-brand-gold">
                    {formatSGD(estimate.min)}
                  </span>
                  <span className="text-neutral-400 text-sm">–</span>
                  <span className="text-2xl font-black text-white">
                    {formatSGD(estimate.max)}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1.5">
                  {propertyType} · {sqft.toLocaleString()} sqft · {selectedTier.label} finish
                </p>
              </div>

              {/* Room Breakdown */}
              <div className="space-y-2 mb-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Per-Room Breakdown
                </p>
                {estimate.rooms.map((room) => (
                  <div
                    key={room.label}
                    className="flex items-center justify-between py-2 border-b border-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{room.icon}</span>
                      <span className="text-[11px] font-semibold text-neutral-300">{room.label}</span>
                    </div>
                    <span className="text-[11px] font-bold text-white">
                      {formatSGD(room.min)} – {formatSGD(room.max)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Extra Notes */}
              <div className="space-y-2.5">
                {propertyType === 'HDB' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Award className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-emerald-300 leading-relaxed">
                      <span className="font-bold">CPF Usage Eligible:</span> HDB owners may use CPF Ordinary Account (OA)
                      savings to finance HDB upgrading works under approved renovation schemes.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
                  <Clock className="h-3.5 w-3.5 text-brand-gold flex-shrink-0" />
                  <div>
                    <p className="text-[9px] text-neutral-400 uppercase font-bold">Typical Timeline</p>
                    <p className="text-xs font-bold text-white">{estimate.timeline} for full renovation</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5">
                  <Info className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-neutral-400 leading-relaxed">
                    Estimates are indicative. Final costs vary with site conditions, materials selection, and ID firm pricing.
                    Get 3 quotes before committing.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-dashed min-h-[120px] flex flex-col items-center justify-center gap-2 text-center p-6">
              <Calculator className="h-8 w-8 text-neutral-300 dark:text-neutral-700" />
              <p className="text-xs font-bold text-neutral-400">
                Configure your renovation above, then click Calculate to see cost estimates.
              </p>
            </Card>
          )}
        </div>

        {/* ══════════════════════════════════════════
            RIGHT PANEL — Partner ID Directory
        ══════════════════════════════════════════ */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Award className="h-4 w-4 text-brand-gold" />
                  Top Rated Interior Designers
                </h2>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  {filteredPartners.length} verified studios · CEA Registered
                </p>
              </div>
              <Badge variant="success" className="text-[9px]">
                ✓ All Verified
              </Badge>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap mb-4">
              {PARTNER_FILTER_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPartnerFilter(tab)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                    partnerFilter === tab
                      ? 'bg-brand-navy text-white border-brand-navy dark:bg-brand-gold dark:text-brand-navy dark:border-brand-gold'
                      : 'border-border text-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Partner Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredPartners.map((partner) => (
                <PartnerCard key={partner.id} partner={partner} />
              ))}
              {filteredPartners.length === 0 && (
                <div className="col-span-2 py-8 text-center text-neutral-400 text-sm">
                  No partners found for this category.
                </div>
              )}
            </div>

            {/* Bottom CTA */}
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-brand-navy to-brand-navy-light text-white text-center space-y-2">
              <p className="text-xs font-bold">Not sure which ID to choose?</p>
              <p className="text-[10px] text-neutral-300">
                Our AI matchmaker pairs you with the best studio based on your style, budget, and timeline.
              </p>
              <Button variant="gold" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                Match Me with an ID
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
