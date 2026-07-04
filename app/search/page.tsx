"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Filter, Grid, List as ListIcon, Map as MapIcon, 
  Sparkles, SlidersHorizontal, ArrowUpDown, RefreshCw 
} from 'lucide-react';
import { getListings, ListingFilters } from '../../lib/services/properties';
import { Property } from '../../lib/mock-data/properties';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import PropertyCard from '../../components/property/PropertyCard';
import InteractiveSVGMap from '../../components/property/InteractiveSVGMap';

function SearchPageContent() {
  const searchParams = useSearchParams();
  
  // URL query parameters
  const initialQuery = searchParams.get('query') || '';
  const initialType = searchParams.get('type') || '';
  
  const [listings, setListings] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  
  // Filters State
  const [query, setQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState<Property['propertyType'][]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [bedrooms, setBedrooms] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'ai_score'>('ai_score');
  
  // Filter sidebar visibility
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [showAiReasoning, setShowAiReasoning] = useState(!!initialQuery);

  // Fetch results when filters change
  const fetchResults = async () => {
    setLoading(true);
    
    // Map selected region to district numbers
    let districts: number[] = [];
    if (selectedRegion === 'central') districts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 21];
    else if (selectedRegion === 'east') districts = [14, 15, 16, 17, 18];
    else if (selectedRegion === 'northeast') districts = [19, 20, 28];
    else if (selectedRegion === 'north') districts = [25, 26, 27];
    else if (selectedRegion === 'west') districts = [22, 23, 24];

    const filterObj: ListingFilters = {
      query,
      propertyType: selectedType.length > 0 ? selectedType : undefined,
      districts: districts.length > 0 ? districts : undefined,
      minPrice,
      maxPrice,
      bedrooms: bedrooms.length > 0 ? bedrooms : undefined,
    };

    if (initialType === 'Rent') filterObj.listingType = 'Rent';
    else if (initialType === 'New Launch') filterObj.listingType = 'New Launch';
    else if (initialType === 'Buy') filterObj.listingType = 'Buy';

    const res = await getListings(filterObj);

    // Sorting
    if (sortBy === 'price_asc') res.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') res.sort((a, b) => b.price - a.price);
    else res.sort((a, b) => b.aiMatchedScore - a.aiMatchedScore);

    setListings(res);
    setLoading(false);
  };

  useEffect(() => {
    fetchResults();
  }, [query, selectedType, selectedRegion, minPrice, maxPrice, bedrooms, sortBy]);

  const togglePropertyType = (type: Property['propertyType']) => {
    setSelectedType(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleBedrooms = (beds: number) => {
    setBedrooms(prev => 
      prev.includes(beds) ? prev.filter(b => b !== beds) : [...prev, beds]
    );
  };

  const handleResetFilters = () => {
    setQuery('');
    setSelectedType([]);
    setSelectedRegion(null);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setBedrooms([]);
    setShowAiReasoning(false);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP HEADER & FILTER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-foreground">Property Marketplace</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Showing {listings.length} verified listings in Singapore.
          </p>
        </div>

        {/* View & Sort controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            leftIcon={<SlidersHorizontal className="h-4 w-4" />}
            onClick={() => setFilterPanelOpen(true)}
          >
            Filters
          </Button>

          {/* Sort selector */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none rounded-lg border border-border bg-card px-3 py-2 pr-8 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold cursor-pointer"
            >
              <option value="ai_score">Sort: Best Match</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
            <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400 pointer-events-none" />
          </div>

          {/* View Mode Toggle */}
          <div className="flex border border-border rounded-lg bg-card p-1">
            {(['grid', 'list', 'map'] as const).map((mode) => {
              const Icon = mode === 'grid' ? Grid : (mode === 'list' ? ListIcon : MapIcon);
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`p-1.5 rounded cursor-pointer transition-colors ${
                    viewMode === mode
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-brand-gold'
                      : 'text-neutral-400 hover:text-foreground'
                  }`}
                  title={`${mode} view`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. AI INTERPRETATION STRIP */}
      {showAiReasoning && query && (
        <Card className="border-purple-200 dark:border-purple-800/40 bg-purple-50/20 dark:bg-purple-950/5 p-4 flex gap-4 items-start relative animate-in fade-in duration-200">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5 animate-pulse-slow" />
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-purple-900 dark:text-purple-300">Ava AI Query Parser</span>
              <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded">Parsed Successfully</span>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300">
              Parsed query: <span className="font-bold font-mono">"{query}"</span>
            </p>
            <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed pt-1">
              <span className="font-semibold text-foreground">AI Match Rationale:</span> Prioritizing units based on proximity to transit nodes, tenure constraints, and price ceilings. Correlating listing properties against URA transaction averages.
            </p>
          </div>
          <button 
            onClick={() => setShowAiReasoning(false)}
            className="absolute top-3 right-3 text-neutral-400 hover:text-foreground cursor-pointer text-xs"
          >
            Dismiss
          </button>
        </Card>
      )}

      {/* 3. SPLIT PANEL VIEW WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[50vh]">
        {/* Left Listings Results Panel */}
        <div className={`${viewMode === 'map' ? 'hidden' : viewMode === 'list' ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-6`}>
          {loading ? (
            // Skeleton Loader Cards
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Card key={idx} className="h-72 bg-card border-border shimmer-bg animate-shimmer" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-12 text-center space-y-4">
              <div className="h-12 w-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-400">
                <SlidersHorizontal className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground uppercase">No Properties Matched</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                We couldn't find any listings matching your search constraints. Try resetting filters or searching with a broader query.
              </p>
              <Button size="sm" variant="gold" onClick={handleResetFilters}>Reset Filters</Button>
            </div>
          ) : (
            // Listings Render
            <div className={viewMode === 'list' ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}>
              {listings.map((p) => (
                <PropertyCard key={p.id} property={p} layout={viewMode === 'list' ? 'list' : 'grid'} />
              ))}
            </div>
          )}
        </div>

        {/* Right Map View Panel (Split screen overlay) */}
        {viewMode !== 'list' && (
          <div className={`${viewMode === 'map' ? 'lg:col-span-12' : 'lg:col-span-4'} sticky top-24 self-start w-full`}>
            <InteractiveSVGMap 
              priceHeatmap 
              showMrtLines
              activeRegion={selectedRegion}
              onSelectRegion={(reg) => setSelectedRegion(reg)}
            />
          </div>
        )}
      </div>

      {/* 4. SLIDE-OUT FILTER SIDEBAR DRAWER */}
      {filterPanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-neutral-900/60 dark:bg-black/80 backdrop-blur-sm"
            onClick={() => setFilterPanelOpen(false)}
          />
          {/* Drawer container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md bg-card border-l border-border text-foreground shadow-2xl flex flex-col h-full">
              {/* Header */}
              <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Advanced Search Filters</h3>
                <button 
                  onClick={() => setFilterPanelOpen(false)}
                  className="rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                >
                  Close
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Natural Language Query input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Search Keywords</label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter keywords..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-brand-gold"
                  />
                </div>

                {/* Property Type checklist */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Property Type</label>
                  <div className="flex flex-wrap gap-2">
                    {(['Condo', 'HDB', 'Landed', 'Commercial', 'EC'] as const).map((type) => {
                      const isSelected = selectedType.includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() => togglePropertyType(type)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-brand-gold text-brand-navy' 
                              : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500 hover:text-foreground'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Region Selector */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Singapore Region</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'central', name: 'Central (D1-11, 21)' },
                      { id: 'east', name: 'East (D14-18)' },
                      { id: 'northeast', name: 'North-East (D19, 20)' },
                      { id: 'north', name: 'North (D25-27)' },
                      { id: 'west', name: 'West (D22-24)' }
                    ].map((reg) => {
                      const isSelected = selectedRegion === reg.id;
                      return (
                        <button
                          key={reg.id}
                          onClick={() => setSelectedRegion(isSelected ? null : reg.id)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-brand-gold text-brand-navy' 
                              : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500 hover:bg-neutral-800'
                          }`}
                        >
                          {reg.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bedrooms Selection */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Bedrooms</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((beds) => {
                      const isSelected = bedrooms.includes(beds);
                      return (
                        <button
                          key={beds}
                          onClick={() => toggleBedrooms(beds)}
                          className={`h-9 w-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-brand-gold text-brand-navy font-extrabold' 
                              : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500 hover:bg-neutral-800'
                          }`}
                        >
                          {beds === 4 ? '4+' : beds}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price bounds */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Price Budget (SGD)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minPrice || ''}
                      onChange={(e) => setMinPrice(Number(e.target.value) || undefined)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
                    />
                    <span className="text-neutral-400">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxPrice || ''}
                      onChange={(e) => setMaxPrice(Number(e.target.value) || undefined)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
                    />
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-5 border-t border-border flex items-center gap-3">
                <Button variant="outline" className="flex-1 font-bold" onClick={handleResetFilters}>
                  Clear All
                </Button>
                <Button variant="gold" className="flex-1 font-bold" onClick={() => setFilterPanelOpen(false)}>
                  Apply Filters
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SearchPage() {
  return (
    <React.Suspense fallback={<div className="text-xs uppercase font-bold text-neutral-400">Loading marketplace...</div>}>
      <SearchPageContent />
    </React.Suspense>
  );
}
