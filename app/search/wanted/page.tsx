"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { getListings } from '../../../lib/services/properties';
import { Property } from '../../../lib/mock-data/properties';
import { Compass, Sparkles, User, MapPin, Send, Plus, X, Tag, ShieldCheck } from 'lucide-react';

interface Pitch {
  id: string;
  agentName: string;
  agentAvatar: string;
  propertyTitle: string;
  propertyPrice: number;
  propertyId: string;
  timestamp: string;
}

interface BuyerRequirement {
  id: string;
  buyerName: string;
  title: string;
  category: string;
  budgetMin: number;
  budgetMax: number;
  district: string;
  bedrooms: number;
  specifics: string;
  timestamp: string;
  pitches: Pitch[];
}

export default function BuyerRequirementBoard() {
  const [requirements, setRequirements] = useState<BuyerRequirement[]>([
    {
      id: "req-1",
      buyerName: "Samuel G.",
      title: "Looking for 3BR Condo near TEL MRT station under S$2.3M",
      category: "Condo",
      budgetMin: 1800000,
      budgetMax: 2300000,
      district: "District 15 (East Coast / Katong)",
      bedrooms: 3,
      specifics: "We are an upgrading family looking for a layout-efficient 3-bedroom unit near Amber or Marine Parade MRT. Freehold preferred but 99-year with >85 years remaining is fine. Direct transit access to CBD is a must.",
      timestamp: "1 hour ago",
      pitches: [
        {
          id: "ptch-1",
          agentName: "Sherry Tan",
          agentAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80",
          propertyTitle: "The Florence Residences",
          propertyPrice: 2230000,
          propertyId: "prop-2",
          timestamp: "30 mins ago"
        }
      ]
    },
    {
      id: "req-2",
      buyerName: "Hui Min & Isaac",
      title: "4-Room HDB Resale unit in Clementi/Queenstown (high floor)",
      category: "HDB",
      budgetMin: 700000,
      budgetMax: 950000,
      district: "District 5 (Clementi / Queenstown)",
      bedrooms: 3,
      specifics: "First-time buyers looking for resale HDB. Prefer high floor (>15) with clean unblocked views. Walkable to Clementi MRT (under 8 minutes). Must be eligible for EIP quota for Chinese buyers.",
      timestamp: "5 hours ago",
      pitches: []
    }
  ]);

  const [agentListings, setAgentListings] = useState<Property[]>([]);
  const [selectedReqForPitch, setSelectedReqForPitch] = useState<string | null>(null);
  
  // Post modal states
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postCategory, setPostCategory] = useState('Condo');
  const [postBudgetMin, setPostBudgetMin] = useState(1000000);
  const [postBudgetMax, setPostBudgetMax] = useState(2000000);
  const [postDistrict, setPostDistrict] = useState('District 15');
  const [postBeds, setPostBeds] = useState(3);
  const [postSpecifics, setPostSpecifics] = useState('');

  const [pitchSuccess, setPitchSuccess] = useState(false);

  useEffect(() => {
    // Load Marcus Lim's mock listings to enable pitching simulations
    getListings().then(res => {
      setAgentListings(res.filter(p => p.agentId === 'agent-1' || p.id === 'prop-2'));
    });
  }, []);

  // Post Buyer Wanted request
  const handlePostRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postSpecifics.trim()) return;

    const newReq: BuyerRequirement = {
      id: `req-u-${Date.now()}`,
      buyerName: "You (Demo Buyer)",
      title: postTitle,
      category: postCategory,
      budgetMin: postBudgetMin,
      budgetMax: postBudgetMax,
      district: postDistrict,
      bedrooms: postBeds,
      specifics: postSpecifics,
      timestamp: "Just now",
      pitches: []
    };

    setRequirements(prev => [newReq, ...prev]);
    setPostTitle('');
    setPostSpecifics('');
    setIsPostModalOpen(false);

    // Simulate Agent pitching to your requirement 3 seconds later!
    setTimeout(() => {
      const mockPitch: Pitch = {
        id: `ptch-mock-${Date.now()}`,
        agentName: "Marcus Lim",
        agentAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
        propertyTitle: "The Ritz-Carlton Residences",
        propertyPrice: 9800000,
        propertyId: "prop-1",
        timestamp: "Just now"
      };

      setRequirements(prev => prev.map(req => {
        if (req.id === newReq.id) {
          return { ...req, pitches: [mockPitch] };
        }
        return req;
      }));
    }, 3000);
  };

  // Pitch listing dynamic action
  const handlePitchListing = (reqId: string, propertyId: string) => {
    const p = agentListings.find(l => l.id === propertyId);
    if (!p) return;

    const newPitch: Pitch = {
      id: `ptch-${Date.now()}`,
      agentName: "Marcus Lim",
      agentAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
      propertyTitle: p.title,
      propertyPrice: p.price,
      propertyId: p.id,
      timestamp: "Just now"
    };

    setRequirements(prev => prev.map(req => {
      if (req.id === reqId) {
        return { ...req, pitches: [newPitch, ...req.pitches] };
      }
      return req;
    }));

    setPitchSuccess(true);
    setTimeout(() => {
      setPitchSuccess(false);
      setSelectedReqForPitch(null);
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-20 text-left">
      
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-foreground">Buyer Requirement wanted Board</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Browse match requirements posted by buyers. Verified agents can pitch their active portfolio listings directly.
          </p>
        </div>
        <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsPostModalOpen(true)}>
          Post Wanted Requirement
        </Button>
      </div>

      {/* Main Board Feed */}
      <div className="grid grid-cols-1 gap-6 max-w-4xl">
        {requirements.map((req) => (
          <Card key={req.id} className="p-6 text-left space-y-4 hover:border-brand-gold/30 transition-all duration-200">
            
            {/* Top row */}
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="gold" className="text-[8px] uppercase tracking-wider">{req.category}</Badge>
                <Badge variant="secondary" className="text-[8px] uppercase tracking-wider">{req.bedrooms} Bedrooms</Badge>
                <span className="text-[9px] text-neutral-400 font-bold uppercase">{req.timestamp}</span>
              </div>
              <span className="text-xs font-black text-brand-navy dark:text-brand-gold">
                S${req.budgetMin.toLocaleString()} - S${req.budgetMax.toLocaleString()}
              </span>
            </div>

            {/* Title & specifics */}
            <div className="space-y-1">
              <h3 className="text-sm font-black text-foreground">{req.title}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal leading-relaxed normal-case font-sans">
                {req.specifics}
              </p>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 font-bold uppercase">
              <MapPin className="h-3 w-3" />
              <span>Target: {req.district}</span>
            </div>

            {/* Pitch list */}
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                  Pitched Listings ({req.pitches.length})
                </h4>
                
                {/* Agent Pitch Button */}
                {selectedReqForPitch === req.id ? (
                  <div className="flex items-center gap-2">
                    {pitchSuccess ? (
                      <span className="text-[9px] font-bold text-emerald-400 uppercase">Pitch Submitted!</span>
                    ) : (
                      <>
                        <select
                          onChange={(e) => handlePitchListing(req.id, e.target.value)}
                          defaultValue=""
                          className="text-[10px] font-bold rounded border border-border bg-card p-1 text-foreground focus:outline-none cursor-pointer"
                        >
                          <option value="" disabled>-- Pitch a Property --</option>
                          {agentListings.map(l => (
                            <option key={l.id} value={l.id}>{l.title} (S${l.price.toLocaleString()})</option>
                          ))}
                        </select>
                        <button onClick={() => setSelectedReqForPitch(null)} className="text-[9px] font-bold text-neutral-400">Cancel</button>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedReqForPitch(req.id)}
                    className="text-[9px] font-black text-brand-gold hover:text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="h-3 w-3" /> Pitch My Listing
                  </button>
                )}
              </div>

              {/* Renders pitches */}
              {req.pitches.length === 0 ? (
                <p className="text-[10px] text-neutral-500 italic">No listings pitched yet. Be the first expert to respond!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {req.pitches.map((p) => (
                    <Card key={p.id} className="p-3 bg-neutral-50/50 dark:bg-neutral-900/30 border border-border/80 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                          <img src={p.agentAvatar} alt={p.agentName} className="h-full w-full object-cover" />
                        </div>
                        <div className="truncate text-left">
                          <span className="text-[9px] text-foreground font-black block">{p.propertyTitle}</span>
                          <span className="text-[8px] text-neutral-400 block font-bold mt-0.5">S${p.propertyPrice.toLocaleString()} · {p.agentName}</span>
                        </div>
                      </div>
                      <a href={`/property/${p.propertyId}`} className="flex-shrink-0">
                        <Badge variant="gold" className="text-[8px] font-black uppercase py-0.5 px-2 hover:bg-white transition-colors cursor-pointer">
                          View
                        </Badge>
                      </a>
                    </Card>
                  ))}
                </div>
              )}
            </div>

          </Card>
        ))}
      </div>

      {/* POST WANTED REQUIREMENT MODAL */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 space-y-5 animate-in zoom-in duration-150 text-left bg-card">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Post Buyer Requirement</h3>
              <button onClick={() => setIsPostModalOpen(false)} className="text-neutral-400 hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handlePostRequirement} className="space-y-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <div className="space-y-1.5">
                <label className="text-[10px] block">Short Requirement Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Looking for high floor 3BR Condo under S$2.0M near Newton"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold normal-case font-normal font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] block">Property Class</label>
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold cursor-pointer"
                  >
                    <option value="Condo">Condo</option>
                    <option value="HDB">HDB Resale</option>
                    <option value="Landed">Landed Estate</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] block">Target Bedrooms</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    required
                    value={postBeds}
                    onChange={(e) => setPostBeds(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] block">Min Budget (SGD)</label>
                  <input
                    type="number"
                    value={postBudgetMin}
                    onChange={(e) => setPostBudgetMin(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold font-sans"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] block">Max Budget (SGD)</label>
                  <input
                    type="number"
                    value={postBudgetMax}
                    onChange={(e) => setPostBudgetMax(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] block">Target Neighborhood</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. District 15 Marine Parade / Tanjong Rhu"
                  value={postDistrict}
                  onChange={(e) => setPostDistrict(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold normal-case font-normal font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] block">Specific Needs</label>
                <textarea
                  required
                  rows={4}
                  placeholder="State specific needs such as schools proximity, MRT distance, renovation status, or eligibility requirements..."
                  value={postSpecifics}
                  onChange={(e) => setPostSpecifics(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold normal-case font-normal"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" type="button" onClick={() => setIsPostModalOpen(false)}>Cancel</Button>
                <Button variant="gold" type="submit">Post Wanted Request</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
