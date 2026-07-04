"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  getListingById, 
  getFeaturedListings 
} from '../../../lib/services/properties';
import { Property } from '../../../lib/mock-data/properties';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { NeighbourhoodScore } from '../../../components/property/NeighbourhoodScore';
import { PriceForecast } from '../../../components/property/PriceForecast';
import { GreenMarkBadge } from '../../../components/property/GreenMarkBadge';
import FraudDetectionPanel from '../../../components/property/FraudDetectionPanel';
import VirtualStaging from '../../../components/property/VirtualStaging';
import { 
  MapPin, Heart, Share2, Compass, Landmark, ShieldCheck, 
  Calendar, MessageSquare, ArrowRight, UserCheck, Sparkles 
} from 'lucide-react';

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [featured, setFeatured] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive States
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Commute Hub Interactive States
  const [leafletReady, setLeafletReady] = useState(false);
  const [activeMapTab, setActiveMapTab] = useState<'commute' | 'mrt' | 'schools' | 'bus' | 'stores'>('commute');
  const [commuteMode, setCommuteMode] = useState<'public' | 'drive' | 'taxi'>('public');
  const [mapInstance, setMapInstance] = useState<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic Leaflet CSS/JS Injection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) {
      setLeafletReady(true);
      return;
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletReady(true);
      document.head.appendChild(script);
    }
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || !property || typeof window === 'undefined') return;
    const L = (window as any).L;

    if ((mapContainerRef.current as any)._leaflet_id) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      zoomControlOptions: { position: 'topright' }
    }).setView([property.coordinates.lat, property.coordinates.lng], 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Main property marker
    const mainIcon = L.divIcon({
      className: 'main-property-marker',
      html: `<div style="background-color: #0B1E3F; border: 3px solid #D4AF37; width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 8px rgba(11,30,63,0.5);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    L.marker([property.coordinates.lat, property.coordinates.lng], { icon: mainIcon })
      .addTo(map)
      .bindPopup(`<b>${property.title}</b>`)
      .openPopup();

    setMapInstance(map);
  }, [leafletReady, property]);

  // Update map markers when tabs or modes swap
  useEffect(() => {
    if (!mapInstance || !property || typeof window === 'undefined') return;
    const L = (window as any).L;

    // Clear everything except the main property marker
    mapInstance.eachLayer((layer: any) => {
      if (layer instanceof L.Marker && layer.getPopup() && !layer.getPopup().getContent().includes(property.title)) {
        mapInstance.removeLayer(layer);
      }
      if (layer instanceof L.Polyline) {
        mapInstance.removeLayer(layer);
      }
    });

    // Plot markers
    if (activeMapTab === 'commute') {
      const hubs = [
        { name: 'Orchard Road', lat: 1.3048, lng: 103.8318, time: commuteMode === 'public' ? 14 : (commuteMode === 'drive' ? 7 : 8) },
        { name: 'Raffles Place', lat: 1.2830, lng: 103.8510, time: commuteMode === 'public' ? 18 : (commuteMode === 'drive' ? 9 : 11) },
        { name: 'Changi Airport', lat: 1.3644, lng: 103.9915, time: commuteMode === 'public' ? 52 : (commuteMode === 'drive' ? 22 : 24) }
      ];

      hubs.forEach((hub) => {
        const hubIcon = L.divIcon({
          className: 'hub-marker',
          html: `<div style="background-color: #D4AF37; border: 2px solid #0B1E3F; width: 12px; height: 12px; border-radius: 50%;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        L.marker([hub.lat, hub.lng], { icon: hubIcon })
          .addTo(mapInstance)
          .bindPopup(`<b>${hub.name}</b><br/>Commute: ${hub.time} mins (${commuteMode})`);

        // Dotted route line
        L.polyline([
          [property.coordinates.lat, property.coordinates.lng],
          [hub.lat, hub.lng]
        ], {
          color: '#D4AF37',
          weight: 2,
          dashArray: '4, 6'
        }).addTo(mapInstance);
      });
    } else if (activeMapTab === 'mrt') {
      const mrts = [
        { name: property.mrtStation, lat: property.coordinates.lat + 0.002, lng: property.coordinates.lng - 0.003, dist: property.mrtDistanceMeters }
      ];
      mrts.forEach((mrt) => {
        const icon = L.divIcon({
          className: 'mrt-marker',
          html: `<div style="background-color: #10b981; border: 2px solid #fff; width: 12px; height: 12px; border-radius: 50%;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
        L.marker([mrt.lat, mrt.lng], { icon })
          .addTo(mapInstance)
          .bindPopup(`<b>${mrt.name}</b><br/>Walk: ${mrt.dist}m`);
      });
    } else if (activeMapTab === 'schools') {
      const items = [
        { name: 'Anglo-Chinese School (Primary)', lat: property.coordinates.lat + 0.004, lng: property.coordinates.lng + 0.003, dist: 450 },
        { name: 'St. Margaret\'s Primary School', lat: property.coordinates.lat - 0.003, lng: property.coordinates.lng - 0.004, dist: 780 }
      ];
      items.forEach((item) => {
        const icon = L.divIcon({
          className: 'school-marker',
          html: `<div style="background-color: #3b82f6; border: 2px solid #fff; width: 12px; height: 12px; border-radius: 50%;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
        L.marker([item.lat, item.lng], { icon })
          .addTo(mapInstance)
          .bindPopup(`<b>${item.name}</b><br/>Dist: ${item.dist}m`);
      });
    } else if (activeMapTab === 'bus') {
      const items = [
        { name: 'Cairnhill Rd Block 15', lat: property.coordinates.lat + 0.001, lng: property.coordinates.lng - 0.001, dist: 120 },
        { name: 'Opp Orchard Stn', lat: property.coordinates.lat - 0.002, lng: property.coordinates.lng + 0.002, dist: 280 }
      ];
      items.forEach((item) => {
        const icon = L.divIcon({
          className: 'bus-marker',
          html: `<div style="background-color: #f59e0b; border: 2px solid #fff; width: 12px; height: 12px; border-radius: 50%;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
        L.marker([item.lat, item.lng], { icon })
          .addTo(mapInstance)
          .bindPopup(`<b>${item.name}</b><br/>Dist: ${item.dist}m`);
      });
    } else if (activeMapTab === 'stores') {
      const items = [
        { name: 'Cold Storage Paragon', lat: property.coordinates.lat - 0.003, lng: property.coordinates.lng + 0.001, dist: 350 },
        { name: 'Don Don Donki Orchard', lat: property.coordinates.lat - 0.004, lng: property.coordinates.lng - 0.002, dist: 510 }
      ];
      items.forEach((item) => {
        const icon = L.divIcon({
          className: 'store-marker',
          html: `<div style="background-color: #ec4899; border: 2px solid #fff; width: 12px; height: 12px; border-radius: 50%;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
        L.marker([item.lat, item.lng], { icon })
          .addTo(mapInstance)
          .bindPopup(`<b>${item.name}</b><br/>Dist: ${item.dist}m`);
      });
    }
  }, [mapInstance, activeMapTab, commuteMode, property]);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getListingById(id).then(res => {
        setProperty(res);
        setLoading(false);
      });
    }
    getFeaturedListings().then(res => setFeatured(res.slice(0, 3)));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="h-8 w-8 rounded-full border-4 border-brand-gold border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Retrieving listing from network...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-lg font-black uppercase text-foreground">Property Listing Not Found</h2>
        <Button size="sm" variant="gold" onClick={() => router.push('/search')}>Back to Search</Button>
      </div>
    );
  }

  const formatPrice = (p: number) => {
    return `$${p.toLocaleString()}`;
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate || !bookingTime) return;
    setBookingSuccess(true);
  };

  const handleAiQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    
    setTimeout(() => {
      setAiLoading(false);
      setAiResponse(
        `Based on the district averages for ${property.areaName} (D${property.district}) and historical URA transaction records, this unit at $${property.psf} psf is priced within 4% of the regional median. The lease decay curve indicates value retention for the next 15 years before steeper depreciation commences. Recommendation: Ideal for long-term owner-occupation.`
      );
    }, 1000);
  };

  return (
    <div className="space-y-10 pb-20 relative">
      
      {/* 1. MEDIA GALLERY HERO */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:h-[350px] h-auto">
        <div className="md:col-span-2 rounded-2xl overflow-hidden bg-neutral-100 relative h-48 md:h-full">
          <img 
            src={property.images[0]} 
            alt={property.title} 
            className="h-full w-full object-cover"
          />
          <div className="absolute top-4 left-4 flex gap-2">
            {property.verified && <Badge variant="success">Verified Metadata</Badge>}
            {property.featured && <Badge variant="gold">Featured Launch</Badge>}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-1 md:grid-rows-2 gap-4 h-auto md:h-full">
          {property.images[1] ? (
            <div className="rounded-2xl overflow-hidden bg-neutral-100 h-28 md:h-full">
              <img src={property.images[1]} alt={property.title} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600 font-bold uppercase text-[10px] h-28 md:h-full">
              No additional photos
            </div>
          )}
          <div className="rounded-2xl bg-brand-navy-dark text-white p-4 md:p-6 border border-neutral-800 flex flex-col justify-between h-28 md:h-full text-left">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-gold">V-RENT Valuation Engine</span>
              <h4 className="text-xs md:text-sm font-bold uppercase">Instant PSF Estimate</h4>
            </div>
            <div>
              <span className="text-xl md:text-2xl font-black text-brand-gold">S${property.psf} <span className="text-[10px] text-white">/psf</span></span>
              <p className="text-[8px] md:text-[10px] text-neutral-400 mt-1">Based on 214 transactions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BODY CONTENT SPLIT WITH SCHEDULER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left main info pane (~8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Header titles */}
          <div className="space-y-3 pb-6 border-b border-border">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <span className="text-xs font-black text-brand-gold uppercase tracking-widest block mb-1">
                  District {property.district} · {property.areaName}
                </span>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground uppercase">
                  {property.title}
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-neutral-400" />
                  {property.address}
                </p>
                <div className="mt-2">
                  <GreenMarkBadge rating={property.district <= 11 ? 'GoldPlus' : property.district <= 16 ? 'Gold' : null} />
                </div>
              </div>
              <Badge variant="ai" className="text-xs py-1.5 px-3">
                {property.aiMatchedScore}% Match For You
              </Badge>
            </div>

            {/* Price Tags */}
            <div className="flex items-baseline gap-4 pt-2">
              <span className="text-3xl font-black text-brand-navy dark:text-brand-gold">
                {formatPrice(property.price)}
                {property.listingType === 'Rent' && <span className="text-lg font-normal text-neutral-400">/m</span>}
              </span>
              <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
                S${property.psf} psf · {property.sizeSqft} sqft
              </span>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs font-bold uppercase tracking-wider text-neutral-500">
            <Card className="p-4 bg-card">
              <span className="block text-foreground font-black text-base">{property.bedrooms}</span>
              <span className="text-[9px] mt-0.5 block">Bedrooms</span>
            </Card>
            <Card className="p-4 bg-card">
              <span className="block text-foreground font-black text-base">{property.bathrooms}</span>
              <span className="text-[9px] mt-0.5 block">Bathrooms</span>
            </Card>
            <Card className="p-4 bg-card">
              <span className="block text-foreground font-black text-base">{property.sizeSqft}</span>
              <span className="text-[9px] mt-0.5 block">Sqft Size</span>
            </Card>
            <Card className="p-4 bg-card">
              <span className="block text-foreground font-black text-base">{property.tenure.split(' ')[0]}</span>
              <span className="text-[9px] mt-0.5 block">Tenure Type</span>
            </Card>
          </div>

          {/* AI Recommendation Reasoning */}
          <Card className="border-purple-200 dark:border-purple-800/40 bg-purple-50/10 dark:bg-purple-950/5 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                Why this property matches your profile
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-foreground">MRT Proximity (High Match):</span>
                <p className="text-neutral-500 dark:text-neutral-400">
                  Located within {property.mrtDistanceMeters}m of {property.mrtStation}, saving an average of 22 minutes on daily CBD commutes.
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-foreground">Capital Appreciation Potential:</span>
                <p className="text-neutral-500 dark:text-neutral-400">
                  District {property.district} has shown {property.district === 9 ? '2.3% growth' : 'positive growth'} over the last 12 months.
                </p>
              </div>
            </div>
          </Card>

          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Property Description</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {property.description} This premium unit features an extremely layout-efficient configuration, designed to maximize spatial density while offering stunning structural clearances. Fitted with high-end corporate standard appliances, secure access cards, and fully soundproof double-glazed window panels.
            </p>
          </div>

          {/* Location & Commute Hub (99.co Style) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Location & Commute Hub</h3>
            <Card className="p-6 overflow-hidden">
              <div className="flex flex-col md:flex-row gap-6 md:h-[400px] h-auto">
                {/* Left Side: Amenity tabs & commute lists */}
                <div className="w-full md:w-[45%] flex flex-col justify-between h-auto md:h-full text-left">
                  {/* Tabs menu */}
                  <div className="flex flex-wrap gap-1 border-b border-border pb-3">
                    {[
                      { id: 'commute', label: 'Commute' },
                      { id: 'mrt', label: 'MRT Stations' },
                      { id: 'schools', label: 'Schools' },
                      { id: 'bus', label: 'Bus Stops' },
                      { id: 'stores', label: 'Supermarkets' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveMapTab(tab.id as any)}
                        className={`px-2.5 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                          activeMapTab === tab.id
                            ? 'bg-brand-gold text-brand-navy font-black'
                            : 'text-neutral-500 hover:text-foreground'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Contents */}
                  <div className="flex-1 py-4 overflow-y-auto">
                    {activeMapTab === 'commute' && (
                      <div className="space-y-4">
                        {/* Transport selector */}
                        <div className="flex border border-border rounded-lg bg-neutral-55 dark:bg-neutral-900 p-1 w-full text-center text-[10px] font-bold uppercase tracking-wider">
                          {[
                            { id: 'public', label: 'Public Transport' },
                            { id: 'drive', label: 'Driving' },
                            { id: 'taxi', label: 'Taxi' }
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setCommuteMode(mode.id as any)}
                              className={`flex-1 py-1 rounded cursor-pointer transition-colors ${
                                commuteMode === mode.id
                                  ? 'bg-brand-gold text-brand-navy font-black shadow'
                                  : 'text-neutral-500 hover:text-foreground'
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>

                        {/* Commute items */}
                        <div className="space-y-3 pt-1">
                          {[
                            { name: 'Orchard Road', public: '14 mins', drive: '7 mins', taxi: '8 mins', desc: 'Direct bus line 143' },
                            { name: 'Raffles Place (CBD)', public: '18 mins', drive: '9 mins', taxi: '11 mins', desc: 'Direct MRT ride on East-West Line' },
                            { name: 'Changi Airport', public: '52 mins', drive: '22 mins', taxi: '24 mins', desc: '1 transfer via Expo Station' }
                          ].map((hub) => (
                            <div key={hub.name} className="flex justify-between items-center p-3 border border-border rounded-xl bg-card hover:bg-neutral-50 dark:hover:bg-neutral-950/20 transition-colors">
                              <div>
                                <span className="text-xs font-black text-foreground block">{hub.name}</span>
                                <span className="text-[9px] text-neutral-400 block mt-0.5 font-bold uppercase">{hub.desc}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-black text-brand-navy dark:text-brand-gold">
                                  {commuteMode === 'public' ? hub.public : (commuteMode === 'drive' ? hub.drive : hub.taxi)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeMapTab === 'mrt' && (
                      <div className="space-y-3">
                        <div className="p-3.5 border border-border rounded-xl bg-card hover:bg-neutral-50 dark:hover:bg-neutral-950/20 transition-colors flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black text-foreground block">{property.mrtStation}</span>
                            <span className="text-[9px] text-emerald-500 font-bold uppercase block mt-0.5">Primary Transit Link</span>
                          </div>
                          <Badge variant="success" className="text-[9px] font-black">{property.mrtDistanceMeters}m Walk</Badge>
                        </div>
                      </div>
                    )}

                    {activeMapTab === 'schools' && (
                      <div className="space-y-3">
                        <div className="p-3.5 border border-border rounded-xl bg-card hover:bg-neutral-50 dark:hover:bg-neutral-950/20 transition-colors flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black text-foreground block">Anglo-Chinese School (Primary)</span>
                            <span className="text-[9px] text-blue-500 font-bold uppercase block mt-0.5">Under 1km Zone</span>
                          </div>
                          <Badge variant="primary" className="text-[9px] font-black">450m</Badge>
                        </div>
                        <div className="p-3.5 border border-border rounded-xl bg-card hover:bg-neutral-50 dark:hover:bg-neutral-950/20 transition-colors flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black text-foreground block">St. Margaret's Primary School</span>
                            <span className="text-[9px] text-neutral-400 font-bold uppercase block mt-0.5">Co-Ed Elementary</span>
                          </div>
                          <Badge variant="secondary" className="text-[9px] font-black">780m</Badge>
                        </div>
                      </div>
                    )}

                    {activeMapTab === 'bus' && (
                      <div className="space-y-3">
                        <div className="p-3.5 border border-border rounded-xl bg-card hover:bg-neutral-50 dark:hover:bg-neutral-950/20 transition-colors flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black text-foreground block">Cairnhill Rd Block 15</span>
                            <span className="text-[9px] text-neutral-400 font-bold uppercase block mt-0.5">Buses: 65, 143, 162, 502</span>
                          </div>
                          <Badge variant="secondary" className="text-[9px] font-black">120m</Badge>
                        </div>
                        <div className="p-3.5 border border-border rounded-xl bg-card hover:bg-neutral-50 dark:hover:bg-neutral-950/20 transition-colors flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black text-foreground block">Opp Orchard Stn</span>
                            <span className="text-[9px] text-neutral-400 font-bold uppercase block mt-0.5">Buses: 7, 36, 77, 106, 175</span>
                          </div>
                          <Badge variant="secondary" className="text-[9px] font-black">280m</Badge>
                        </div>
                      </div>
                    )}

                    {activeMapTab === 'stores' && (
                      <div className="space-y-3">
                        <div className="p-3.5 border border-border rounded-xl bg-card hover:bg-neutral-50 dark:hover:bg-neutral-950/20 transition-colors flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black text-foreground block">Cold Storage Paragon</span>
                            <span className="text-[9px] text-pink-500 font-bold uppercase block mt-0.5">Organic & Fresh Produce</span>
                          </div>
                          <Badge variant="secondary" className="text-[9px] font-black text-pink-500 border-pink-500/20 bg-pink-500/5">350m</Badge>
                        </div>
                        <div className="p-3.5 border border-border rounded-xl bg-card hover:bg-neutral-50 dark:hover:bg-neutral-950/20 transition-colors flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black text-foreground block">Don Don Donki Orchard</span>
                            <span className="text-[9px] text-pink-500 font-bold uppercase block mt-0.5">Discount Japanese Market</span>
                          </div>
                          <Badge variant="secondary" className="text-[9px] font-black text-pink-500 border-pink-500/20 bg-pink-500/5">510m</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Leaflet map canvas */}
                <div className="w-full md:flex-1 h-64 md:h-full rounded-xl border border-border overflow-hidden relative bg-neutral-100">
                  <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
                  {!leafletReady && (
                    <div className="absolute inset-0 bg-neutral-50 flex items-center justify-center text-[10px] text-neutral-400 font-bold uppercase tracking-wider font-sans">
                      Loading Commute Map Canvas...
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* 3. TRANSACTION HISTORY SVG GRAPH (Out-of-the-box native SVG) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Project Transaction History</h3>
            <Card className="p-6">
              <div className="h-56 w-full flex items-center justify-center">
                {/* Custom SVG line chart */}
                <svg viewBox="0 0 400 150" className="w-full h-full">
                  {/* Grid Lines */}
                  <line x1="30" y1="20" x2="380" y2="20" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
                  <line x1="30" y1="70" x2="380" y2="70" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
                  <line x1="30" y1="120" x2="380" y2="120" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" />
                  
                  {/* Axis labels */}
                  <text x="5" y="25" className="text-[8px] fill-neutral-400 font-bold">$2,800</text>
                  <text x="5" y="75" className="text-[8px] fill-neutral-400 font-bold">$2,500</text>
                  <text x="5" y="125" className="text-[8px] fill-neutral-400 font-bold">$2,200</text>
                  
                  <text x="35" y="140" className="text-[8px] fill-neutral-400 font-bold">2024</text>
                  <text x="205" y="140" className="text-[8px] fill-neutral-400 font-bold">2025</text>
                  <text x="365" y="140" className="text-[8px] fill-neutral-400 font-bold">2026</text>

                  {/* Draw Chart Line */}
                  <path 
                    d="M 35 120 L 120 100 L 205 90 L 290 60 L 365 30" 
                    fill="none" 
                    stroke="var(--brand-gold)" 
                    strokeWidth="3"
                    className="stroke-brand-gold"
                  />
                  
                  {/* Data Points */}
                  <circle cx="35" cy="120" r="4.5" className="fill-brand-navy stroke-brand-gold" strokeWidth="2" />
                  <circle cx="120" cy="100" r="4.5" className="fill-brand-navy stroke-brand-gold" strokeWidth="2" />
                  <circle cx="205" cy="90" r="4.5" className="fill-brand-navy stroke-brand-gold" strokeWidth="2" />
                  <circle cx="290" cy="60" r="4.5" className="fill-brand-navy stroke-brand-gold" strokeWidth="2" />
                  <circle cx="365" cy="30" r="4.5" className="fill-brand-navy stroke-brand-gold" strokeWidth="2" />
                </svg>
              </div>
              <p className="text-[10px] text-neutral-400 text-center uppercase tracking-widest font-mono mt-2">
                Monthly Average Transaction Rates (SGD/psf) for {property.title.split(' ')[0]}
              </p>
            </Card>
          </div>

          {/* Lease Decay Calculator (if leasehold) */}
          {property.tenure.includes('Leasehold') && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Lease Decay Estimator (Bala's Curve Representation)</h3>
              <Card className="p-5 space-y-4">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-neutral-400">
                  <span>Current Lease Remaining</span>
                  <span className="text-foreground">89 Years Left</span>
                </div>
                
                {/* Bala's curve Progress Bar */}
                <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 h-3 rounded-full" 
                    style={{ width: '89%' }}
                  />
                </div>

                <div className="grid grid-cols-3 text-center text-[9px] text-neutral-400 font-bold uppercase pt-1">
                  <span>Critical Decay (&lt;30 yrs)</span>
                  <span>Mid Depreciation (30-60 yrs)</span>
                  <span>Optimum Value (60-99 yrs)</span>
                </div>
              </Card>
            </div>
          )}

          {/* Fraud Detection Panel */}
          <FraudDetectionPanel
            propertyPrice={property.price}
            districtMedianPsf={property.psf * 1.05}
            listingPsf={property.psf}
            agentIsNew={false}
            hasVerifiedMedia={property.images && property.images.length > 0}
            agentCea={property.agentId || 'CEA123456A'}
          />

          {/* AI Virtual Staging Studio */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">AI Virtual Staging</h3>
            <VirtualStaging />
          </div>

          {/* AI Neighbourhood Intelligence */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Neighbourhood Intelligence</h3>
            <NeighbourhoodScore
              district={property.district}
              areaName={property.areaName}
              propertyType={property.propertyType}
            />
          </div>

          {/* Price Forecast */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">AI Price Forecast</h3>
            <PriceForecast
              district={property.district}
              propertyType={property.propertyType}
              currentPsf={property.psf}
            />
          </div>

          {/* Inline Copilot query assistant */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Ask Ava AI about this unit</h3>
            <Card className="p-5 space-y-4 border-brand-gold/15 bg-neutral-50/30 dark:bg-neutral-900/30">
              <form onSubmit={handleAiQuestionSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Is this unit overpriced? What is the rental yield?"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-brand-gold"
                />
                <Button variant="gold" size="sm" type="submit" isLoading={aiLoading}>Analyze</Button>
              </form>
              
              {aiResponse && (
                <div className="p-4 rounded-lg bg-purple-50/20 dark:bg-purple-950/10 border border-purple-200/50 dark:border-purple-800/20 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-pulse-slow" />
                    <span className="font-bold text-purple-900 dark:text-purple-300">Ava AI Advisor Reply</span>
                  </div>
                  {aiResponse}
                </div>
              )}
            </Card>
          </div>

        </div>

        {/* Right sticky action panel (~4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Scheduling Viewing Card */}
          <Card className="p-6 space-y-6 border-brand-navy-light/10 shadow-lg sticky top-24">
            <h3 className="text-base font-bold uppercase tracking-wider text-foreground">Schedule Site Preview</h3>
            
            {bookingSuccess ? (
              <div className="p-4 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-center space-y-2">
                <UserCheck className="h-8 w-8 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-emerald-800 dark:text-emerald-300 uppercase">Viewing Requested</h4>
                <p className="text-neutral-500 dark:text-neutral-400">
                  We've notified the verified agent. A scheduling confirmation will arrive shortly in your messages channel.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <div className="space-y-2">
                  <label className="text-[10px] block">Select Date</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold font-sans"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] block">Select Time Slot</label>
                  <select
                    required
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold cursor-pointer"
                  >
                    <option value="">-- Choose time --</option>
                    <option value="10:00">10:00 AM (Morning)</option>
                    <option value="14:00">02:00 PM (Afternoon)</option>
                    <option value="16:30">04:30 PM (Late Afternoon)</option>
                    <option value="19:30">07:30 PM (Evening)</option>
                  </select>
                </div>
                
                <Button type="submit" variant="gold" className="w-full font-bold uppercase tracking-wider pt-3 pb-3">
                  Book Preview Tour
                </Button>
              </form>
            )}

            {/* Divider */}
            <div className="h-px bg-border my-6"></div>

            {/* Verified Agent Contact */}
            <div className="space-y-4">
              <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">Verified Listing Broker</span>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-neutral-800 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80" 
                    alt="Agent avatar" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Marcus Lim</h4>
                  <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-widest mt-0.5 block">
                    CEA R058921A · D9 Lead
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <a href="tel:+6591234567" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full font-bold">Call Broker</Button>
                </a>
                <a href="https://wa.me/6591234567" className="flex-1">
                  <Button variant="primary" size="sm" className="w-full font-bold bg-brand-navy-light text-white">WhatsApp</Button>
                </a>
              </div>
            </div>

          </Card>
        </div>

      </div>

    </div>
  );
}
