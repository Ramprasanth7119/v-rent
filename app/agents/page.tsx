"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { getAgents } from '../../lib/services/agents';
import { Agent } from '../../lib/mock-data/agents';
import { Search, Compass, Star, ShieldCheck, Mail, Phone, MapPin, Award } from 'lucide-react';

export default function AgentDirectoryPage() {
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  
  // Filter States
  const [query, setQuery] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [language, setLanguage] = useState('');
  const [location, setLocation] = useState('');
  const [minRating, setMinRating] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);

  // Fetch agents initially
  useEffect(() => {
    setLoading(true);
    getAgents().then(res => {
      setAllAgents(res);
      setFilteredAgents(res);
      setLoading(false);
    });
  }, []);

  // Filter evaluation logic
  useEffect(() => {
    let list = [...allAgents];

    // 1. Text Query (Name, Agency, CEA)
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(a => 
        a.name.toLowerCase().includes(q) ||
        a.agencyName.toLowerCase().includes(q) ||
        a.ceaNumber.toLowerCase().includes(q)
      );
    }

    // 2. Specialization
    if (specialization) {
      list = list.filter(a => a.specializations.includes(specialization));
    }

    // 3. Spoken Language
    if (language) {
      list = list.filter(a => a.languages.includes(language));
    }

    // 4. Regional Location (Singapore Districts)
    if (location) {
      const loc = location.toLowerCase();
      list = list.filter(a => {
        const textToSearch = (a.branchName + " " + a.bio).toLowerCase();
        if (loc === 'central') {
          return textToSearch.includes('central') || textToSearch.includes('orchard') || textToSearch.includes('marina') || textToSearch.includes('newton') || textToSearch.includes('holland');
        }
        if (loc === 'east') {
          return textToSearch.includes('east') || textToSearch.includes('tampines') || textToSearch.includes('katong');
        }
        if (loc === 'west') {
          return textToSearch.includes('west') || textToSearch.includes('jurong') || textToSearch.includes('clementi');
        }
        if (loc === 'north') {
          return textToSearch.includes('north') || textToSearch.includes('yishun') || textToSearch.includes('woodlands');
        }
        if (loc === 'northeast') {
          return textToSearch.includes('northeast') || textToSearch.includes('hougang') || textToSearch.includes('sengkang') || textToSearch.includes('punggol');
        }
        return true;
      });
    }

    // 5. Ratings minimum
    if (minRating > 0) {
      list = list.filter(a => a.rating >= minRating);
    }

    setFilteredAgents(list);
  }, [query, specialization, language, location, minRating, allAgents]);

  return (
    <div className="space-y-8 pb-20 text-left">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-black uppercase tracking-wider text-foreground">Verified Agent Directory</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Search CEA-registered estate agents, filtered by district specializations, ratings, and language proficiencies.
        </p>
      </div>

      {/* Filter Options */}
      <div className="space-y-4 border-b border-border pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name & CEA search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </span>
            <input
              type="text"
              placeholder="Search agent name, agency, or CEA number..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-card text-xs text-foreground placeholder-neutral-400 focus:outline-none focus:border-brand-gold transition-colors"
            />
          </div>

          {/* District Location filter */}
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full text-xs font-semibold rounded-lg border border-border bg-card p-2.5 text-foreground focus:outline-none focus:border-brand-gold cursor-pointer"
          >
            <option value="">All Regions (Singapore Districts)</option>
            <option value="central">Central (D1-D11, D21 Orchard/Holland)</option>
            <option value="east">East Region (D14-D18 Bedok/Tampines)</option>
            <option value="west">West Region (D22-D24 Jurong/Clementi)</option>
            <option value="north">North Region (D25-D27 Woodlands/Yishun)</option>
            <option value="northeast">Northeast Region (D19-D20 Sengkang/Punggol)</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Specialization select */}
          <select
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            className="w-full text-xs font-semibold rounded-lg border border-border bg-card p-2.5 text-foreground focus:outline-none focus:border-brand-gold cursor-pointer"
          >
            <option value="">All Specializations</option>
            <option value="Luxury Condos">Luxury Condos</option>
            <option value="HDB Resale Expert">HDB Resale</option>
            <option value="Commercial Properties">Commercial Spaces</option>
            <option value="Holland Landed Estates">Landed Estates</option>
            <option value="Investment Yield Optimizing">Investment Yields</option>
          </select>

          {/* Spoken Language select */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full text-xs font-semibold rounded-lg border border-border bg-card p-2.5 text-foreground focus:outline-none focus:border-brand-gold cursor-pointer"
          >
            <option value="">All Languages</option>
            <option value="English">English</option>
            <option value="Mandarin">Mandarin</option>
            <option value="Malay">Malay</option>
            <option value="Tamil">Tamil</option>
            <option value="Hokkien">Hokkien</option>
            <option value="Teochew">Teochew</option>
          </select>

          {/* Ratings filter */}
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="w-full text-xs font-semibold rounded-lg border border-border bg-card p-2.5 text-foreground focus:outline-none focus:border-brand-gold cursor-pointer"
          >
            <option value="0">All Ratings</option>
            <option value="4.9">4.9+ Stars (Top Rated)</option>
            <option value="4.8">4.8+ Stars (Highly Rated)</option>
            <option value="4.7">4.7+ Stars (Highly Rated)</option>
          </select>
        </div>
      </div>

      {/* Agent Roster Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="h-64 bg-card border-border shimmer-bg animate-shimmer" />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Compass className="h-8 w-8 text-neutral-300 mx-auto animate-pulse" />
          <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">No Agents Found</p>
          <p className="text-[10px] text-neutral-500 max-w-xs mx-auto">
            Try adjusting your location, rating limits, or language search criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <Card key={agent.id} className="p-5 flex flex-col justify-between h-[340px] hover:border-brand-gold/30 transition-all duration-200">
              
              {/* Profile top */}
              <div className="space-y-4">
                <div className="flex gap-4 items-center">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-neutral-100 flex-shrink-0">
                    <img src={agent.avatar} alt={agent.name} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-snug flex items-center gap-1">
                      {agent.name}
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    </h3>
                    <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest block mt-0.5">
                      CEA {agent.ceaNumber}
                    </span>
                  </div>
                </div>

                {/* Ratings & Volume */}
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="text-brand-gold flex items-center gap-0.5">
                    <Star className="h-3.5 w-3.5 fill-brand-gold text-brand-gold" />
                    {agent.rating}
                  </span>
                  <span className="text-neutral-400">({agent.reviewsCount} reviews)</span>
                </div>

                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-3 leading-relaxed font-normal">
                  {agent.bio}
                </p>

                {/* Info Badges */}
                <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 font-bold uppercase">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[90%]">{agent.branchName}</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {agent.specializations.map((spec, index) => (
                    <Badge key={index} variant="secondary" className="text-[8px] tracking-wider py-0.5">
                      {spec}
                    </Badge>
                  ))}
                  {agent.languages.map((lang, index) => (
                    <Badge key={`lang-${index}`} variant="gold" className="text-[8px] tracking-wider py-0.5 font-bold uppercase">
                      🗣️ {lang}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Contact Footer */}
              <div className="border-t border-border pt-4 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-neutral-500 font-bold uppercase">
                  <Award className="h-4 w-4 text-brand-gold" />
                  <span>{agent.experienceYears} Years Exp</span>
                </div>
                <div className="flex gap-1.5">
                  <a href={`tel:${agent.phone.replace(/ /g, '')}`}>
                    <Button size="sm" variant="outline" className="p-2 cursor-pointer">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </a>
                  <a href={`mailto:${agent.email}`}>
                    <Button size="sm" variant="outline" className="p-2 cursor-pointer">
                      <Mail className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>

            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
