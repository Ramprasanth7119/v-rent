"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { mockAgents } from '../../lib/mock-data/agents';
import { Trophy, CreditCard, GitFork, UserCheck, ShieldCheck, Mail } from 'lucide-react';

function AgencyDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'leaderboard';

  // State
  const [routingMethod, setRoutingMethod] = useState<'round-robin' | 'score-based'>('round-robin');
  const [routingToggles, setRoutingToggles] = useState({
    districtMatch: true,
    ratingFilter: true,
    languageMatch: false
  });

  const handleTabSwitch = (tab: string) => {
    router.push(`/agency?tab=${tab}`);
  };

  const handleRoutingToggle = (key: keyof typeof routingToggles) => {
    setRoutingToggles(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* 1. AGENCY ERP TABS NAVBAR */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border pb-2">
        <div className="flex border-b border-transparent overflow-x-auto whitespace-nowrap gap-1">
          {[
            { id: 'leaderboard', label: 'Agent Performance Leaderboard', icon: Trophy },
            { id: 'billing', label: 'Billing & seats', icon: CreditCard },
            { id: 'routing', label: 'Lead Distribution Engine', icon: GitFork },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                  isActive 
                    ? 'border-brand-gold text-brand-gold font-black' 
                    : 'border-transparent text-neutral-500 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TAB CONTENT PANELS */}
      {activeTab === 'leaderboard' ? (
        
        /* TAB A: AGENT PERFORMANCE LEADERBOARD */
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <Card className="p-4 bg-card text-center">
              <span className="block text-neutral-400 uppercase font-bold text-[10px]">Active Agents</span>
              <span className="block text-xl font-black text-foreground mt-1">15 Roster</span>
            </Card>
            <Card className="p-4 bg-card text-center">
              <span className="block text-neutral-400 uppercase font-bold text-[10px]">Agency Listings Live</span>
              <span className="block text-xl font-black text-foreground mt-1">104 Properties</span>
            </Card>
            <Card className="p-4 bg-card text-center">
              <span className="block text-neutral-400 uppercase font-bold text-[10px]">Cumulative Revenue</span>
              <span className="block text-xl font-black text-brand-navy dark:text-brand-gold mt-1">S$12.4M</span>
            </Card>
            <Card className="p-4 bg-card text-center">
              <span className="block text-neutral-400 uppercase font-bold text-[10px]">Conversion Rate</span>
              <span className="block text-xl font-black text-foreground mt-1">14.2%</span>
            </Card>
          </div>

          <Table
            columns={[
              { key: 'name', header: 'Agent Profile', render: (row) => (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex-shrink-0">
                    <img src={row.avatar} alt={row.name} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-xs">{row.name}</h4>
                    <p className="text-[9px] text-neutral-400 mt-0.5">{row.ceaNumber}</p>
                  </div>
                </div>
              )},
              { key: 'activeListingsCount', header: 'Active Listings', render: (row) => (
                <span className="text-xs font-bold">{row.activeListingsCount} Live</span>
              )},
              { key: 'rating', header: 'Client Rating', render: (row) => (
                <span className="text-xs font-bold text-brand-gold flex items-center gap-1">
                  ★ {row.rating}
                </span>
              )},
              { key: 'salesVolumeSGD', header: 'GTV Sales Volume (SGD)', render: (row) => (
                <span className="text-xs font-black text-brand-navy dark:text-brand-gold">
                  S${(row.salesVolumeSGD / 1000000).toFixed(1)}M
                </span>
              )},
              { key: 'id', header: 'Actions', render: (row) => (
                <Button size="sm" variant="outline" className="text-[10px] uppercase font-bold" onClick={() => alert(`Sending message to ${row.name}`)}>
                  Manage Team
                </Button>
              )}
            ]}
            data={mockAgents.slice(0, 8)}
          />
        </div>

      ) : activeTab === 'billing' ? (
        
        /* TAB B: BILLING & SUBSCRIPTION SEATS */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Active plan card */}
          <Card className="md:col-span-5 bg-brand-navy-dark text-white border-neutral-800 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <span className="text-[9px] font-black tracking-widest text-brand-gold uppercase">Enterprise Subscription</span>
              <h3 className="text-xl font-black uppercase text-white">Agency Elite Tier</h3>
              <p className="text-xs text-neutral-400">Next renewal: August 01, 2026</p>
            </div>
            
            <div className="space-y-2 text-xs font-bold">
              <div className="flex justify-between py-1.5 border-b border-neutral-800">
                <span>Active Seats:</span>
                <span>15 / 20 Seats Used</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800">
                <span>Central Boost Credits:</span>
                <span>4,120 credits</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Monthly Cost:</span>
                <span className="text-brand-gold">S$1,850/month</span>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800">
              <Button size="sm" variant="gold" className="w-full font-bold uppercase tracking-wider" onClick={() => alert("Purchasing additional seats...")}>
                Manage Seats / Upgrade Plan
              </Button>
            </div>
          </Card>

          {/* Invoices List */}
          <Card className="md:col-span-7 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Invoice Receipts</h3>
            <div className="space-y-3 text-xs">
              {[
                { inv: "INV-2026-006", date: "2026-07-01", amt: "S$1,850.00", status: "Paid" },
                { inv: "INV-2026-005", date: "2026-06-01", amt: "S$1,850.00", status: "Paid" },
                { inv: "INV-2026-004", date: "2026-05-01", amt: "S$1,850.00", status: "Paid" }
              ].map((i) => (
                <div key={i.inv} className="p-3 border border-border rounded-lg bg-neutral-50/20 dark:bg-neutral-900/10 flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="font-bold text-foreground">{i.inv}</span>
                    <span className="text-neutral-400 text-[10px] block">{i.date}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-brand-navy dark:text-brand-gold">{i.amt}</span>
                    <Badge variant="success">{i.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

      ) : (
        
        /* TAB C: LEAD ROUTING RULE ENGINE */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-200">
          <Card className="md:col-span-6 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Routing Protocols</h3>
            
            {/* Round robin checkbox selection */}
            <div className="space-y-4">
              <div 
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  routingMethod === 'round-robin' 
                    ? 'border-brand-gold bg-brand-gold/5' 
                    : 'border-border bg-card'
                }`}
                onClick={() => setRoutingMethod('round-robin')}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="routing"
                    checked={routingMethod === 'round-robin'}
                    onChange={() => {}}
                    className="mt-1"
                  />
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-foreground block">Cyclical Round Robin</span>
                    <p className="text-neutral-400 leading-relaxed">
                      Distribute leads equally across all active branch agents in cyclic rotation, ignoring ratings or seniority.
                    </p>
                  </div>
                </div>
              </div>

              <div 
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  routingMethod === 'score-based' 
                    ? 'border-brand-gold bg-brand-gold/5' 
                    : 'border-border bg-card'
                }`}
                onClick={() => setRoutingMethod('score-based')}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="routing"
                    checked={routingMethod === 'score-based'}
                    onChange={() => {}}
                    className="mt-1"
                  />
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-foreground block">Score-based Allocation</span>
                    <p className="text-neutral-400 leading-relaxed">
                      Route high-value hot leads (AI Score &gt;90) to premium agents with review scores exceeding 4.8.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Contextual modifiers checks */}
          <Card className="md:col-span-6 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Algorithmic Filters</h3>
            
            <div className="space-y-4 text-xs">
              {[
                { key: 'districtMatch', title: 'Route via district specialization maps', desc: ' Orchard enquiries route automatically to District 9 specialists.' },
                { key: 'ratingFilter', title: 'Prioritize ratings profiles', desc: 'Exclude agents with rating scores under 4.6 stars from auto-routing.' },
                { key: 'languageMatch', title: 'Bilingual alignment check', desc: 'Align customer preferred spoken language metadata against agents.' }
              ].map((item) => (
                <div 
                  key={item.key}
                  onClick={() => handleRoutingToggle(item.key as any)}
                  className="p-4 border border-border bg-neutral-50/20 dark:bg-neutral-900/10 rounded-xl flex items-start gap-3 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={routingToggles[item.key as keyof typeof routingToggles]}
                    onChange={() => {}}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <span className="font-bold text-foreground block">{item.title}</span>
                    <p className="text-neutral-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

      )}

    </div>
  );
}

export default function AgencyDashboard() {
  return (
    <React.Suspense fallback={<div className="text-xs uppercase font-bold text-neutral-400">Loading team statistics...</div>}>
      <AgencyDashboardContent />
    </React.Suspense>
  );
}
