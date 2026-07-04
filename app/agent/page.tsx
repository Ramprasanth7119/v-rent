"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Input';
import { getLeads, updateLeadStage, addLeadNote } from '../../lib/services/crm';
import { getListings } from '../../lib/services/properties';
import { Lead } from '../../lib/mock-data/leads';
import { Property } from '../../lib/mock-data/properties';
import { 
  Users, Home, Sparkles, FolderKanban, Plus, 
  MapPin, CheckCircle, Clock, AlertTriangle, Play,
  LineChart, TrendingUp, DollarSign, Shield, ArrowUpRight, BarChart2, X,
  RefreshCw, Bell, Timer, Zap, ToggleLeft, ToggleRight
} from 'lucide-react';

function AgentDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Tabs: crm | listings | analytics | generator
  const activeTab = searchParams.get('tab') || 'crm';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [listings, setListings] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Lead details overlay
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newNoteText, setNewNoteText] = useState('');

  // AI Listing generator state
  const [genCategory, setGenCategory] = useState('Condo');
  const [genBeds, setGenBeds] = useState(3);
  const [genArea, setGenArea] = useState('Orchard');
  const [genOutput, setGenOutput] = useState('');
  const [genLoading, setGenLoading] = useState(false);

  // Visibility Boost campaign states
  const [boostingProperty, setBoostingProperty] = useState<Property | null>(null);
  const [selectedBoost, setSelectedBoost] = useState<'Standard' | 'Turbo' | 'Premium'>('Turbo');
  const [isFeaturedSlot, setIsFeaturedSlot] = useState(false);
  const [boostSuccess, setBoostSuccess] = useState(false);
  const [propertyBoosts, setPropertyBoosts] = useState<Record<string, { level: 'Standard' | 'Turbo' | 'Premium'; featured: boolean }>>({
    'prop-1': { level: 'Premium', featured: true },
    'prop-2': { level: 'Standard', featured: false },
    'prop-3': { level: 'Turbo', featured: false }
  });

  // Advanced Prospecting State
  const [prospectDistrict, setProspectDistrict] = useState('9');
  const [prospectData, setProspectData] = useState<any>(null);
  const [prospectLoading, setProspectLoading] = useState(false);

  // Auto-Repost / Listing Refresh Automation state
  interface RepostRule {
    id: string;
    propertyTitle: string;
    interval: string;
    nextRefresh: string;
    active: boolean;
    totalRefreshes: number;
  }
  const [repostRules, setRepostRules] = useState<RepostRule[]>([
    { id: 'rule-1', propertyTitle: 'The Ritz-Carlton Residences, Orchard', interval: 'Every 3 Days', nextRefresh: 'In 1d 4h', active: true, totalRefreshes: 12 },
    { id: 'rule-2', propertyTitle: 'The Florence Residences, Hougang', interval: 'Every 7 Days', nextRefresh: 'In 5d 2h', active: true, totalRefreshes: 4 },
    { id: 'rule-3', propertyTitle: 'Tanjong Rhu Waterfront EC', interval: 'Every 1 Day', nextRefresh: 'In 6h', active: false, totalRefreshes: 28 },
  ]);
  const [newRuleProperty, setNewRuleProperty] = useState('');
  const [newRuleInterval, setNewRuleInterval] = useState('Every 3 Days');
  const [repostNotifications, setRepostNotifications] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const lRes = await getLeads('agent-1');
    const pRes = await getListings();
    setLeads(lRes);
    setListings(pRes.filter(p => p.agentId === 'agent-1' || p.id === 'prop-1' || p.id === 'prop-2'));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleStageChange = async (leadId: string, newStage: Lead['stage']) => {
    const updated = await updateLeadStage(leadId, newStage);
    if (updated) {
      loadData();
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(updated);
      }
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !newNoteText.trim()) return;
    const updated = await addLeadNote(selectedLead.id, newNoteText, 'Marcus Lim');
    if (updated) {
      setNewNoteText('');
      setSelectedLead(updated);
      loadData();
    }
  };

  const handleGenerateListing = (e: React.FormEvent) => {
    e.preventDefault();
    setGenLoading(true);
    setGenOutput('');
    
    setTimeout(() => {
      setGenLoading(false);
      setGenOutput(
        `[RECOMMENDED TITLE]\nLuxury ${genBeds}-Bedroom Sanctuary in Prime ${genArea} Enclave\n\n[DRAFTED DESCRIPTION]\nNestled within Singapore's premium ${genArea} district, this exquisite ${genBeds}-bedroom residence commands sweeping skyline views and premium high-floor privacy. Designed with spatial density discipline, the layout flows seamlessly into a private lift lobby. \n\nKey Highlights:\n- Walking distance to regional MRT transit grids.\n- Premium brand-new appliances & fittings.\n- Optimum capital preservation yields under URA zoning grids.\n\nReady for immediate preview.`
      );
    }, 1200);
  };

  // Launch Prospect Analysis
  const handleProspectMarket = (e: React.FormEvent) => {
    e.preventDefault();
    setProspectLoading(true);
    setProspectData(null);

    setTimeout(() => {
      setProspectLoading(false);
      
      const regionMap: Record<string, any> = {
        '9': {
          demand: '9.6/10 - Extreme Demand',
          gap: 'Severe under-supply of 2BR layouts priced below S$2.3M. Highly active buyers are looking for direct Orchard Road transport lines.',
          leadsCount: 142,
          avgYield: '3.65% gross yield',
          opportunityScore: 92
        },
        '10': {
          demand: '8.9/10 - High Demand',
          gap: 'Shortage of premium freehold units near Nanyang Primary School. Buyers prioritizing layout efficiency.',
          leadsCount: 98,
          avgYield: '3.42% gross yield',
          opportunityScore: 85
        },
        '15': {
          demand: '9.2/10 - High Demand',
          gap: 'Boom in interest along the East Coast due to TEL MRT connection. Under-supplied with sea-view 3BR listings.',
          leadsCount: 115,
          avgYield: '4.15% gross yield',
          opportunityScore: 94
        },
        '22': {
          demand: '8.2/10 - Moderate Demand',
          gap: 'Resurgence in Jurong Gateway due to second CBD projections. Demand for EC resale layouts.',
          leadsCount: 65,
          avgYield: '4.28% gross yield',
          opportunityScore: 88
        }
      };

      setProspectData(regionMap[prospectDistrict] || regionMap['9']);
    }, 800);
  };

  // Trigger listing promotion upgrade
  const handleConfirmBoost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boostingProperty) return;

    setPropertyBoosts(prev => ({
      ...prev,
      [boostingProperty.id]: {
        level: selectedBoost,
        featured: isFeaturedSlot
      }
    }));

    setBoostSuccess(true);
    setTimeout(() => {
      setBoostSuccess(false);
      setBoostingProperty(null);
    }, 1800);
  };

  const handleTabSwitch = (tabName: string) => {
    router.push(`/agent?tab=${tabName}`);
  };

  const handleToggleRepostRule = (ruleId: string) => {
    setRepostRules(prev => prev.map(r =>
      r.id === ruleId ? { ...r, active: !r.active } : r
    ));
  };

  const handleManualRefresh = (ruleId: string) => {
    setRepostRules(prev => prev.map(r =>
      r.id === ruleId ? { ...r, totalRefreshes: r.totalRefreshes + 1, nextRefresh: 'In 3d 0h' } : r
    ));
  };

  const handleAddRepostRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleProperty.trim()) return;
    const newRule: RepostRule = {
      id: `rule-${Date.now()}`,
      propertyTitle: newRuleProperty,
      interval: newRuleInterval,
      nextRefresh: 'In 3d 0h',
      active: true,
      totalRefreshes: 0
    };
    setRepostRules(prev => [newRule, ...prev]);
    setNewRuleProperty('');
  };

  const kanbanColumns: Lead['stage'][] = [
    'New', 'Contacted', 'Viewing Scheduled', 'Offer', 'Under Contract', 'Closed/Lost'
  ];

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. AGENT DASHBOARD TABS NAVBAR */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border pb-2">
        <div className="flex border-b border-transparent overflow-x-auto whitespace-nowrap gap-1">
          {[
            { id: 'crm', label: 'CRM Pipeline Board', icon: FolderKanban },
            { id: 'listings', label: 'My Listings Manager', icon: Home },
            { id: 'analytics', label: 'Advanced Analytics Suite', icon: LineChart },
            { id: 'autopost', label: 'Auto-Repost Engine', icon: RefreshCw },
            { id: 'generator', label: 'AI Listing Writer', icon: Sparkles },
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

        <Button size="sm" variant="gold" leftIcon={<Plus className="h-4 w-4" />} onClick={() => alert("Shortcut: Creating a new lead record.")}>
          New Lead / Listing
        </Button>
      </div>

      {/* 2. TAB CONTENT PANELS */}
      {loading ? (
        <div className="h-72 border border-border shimmer-bg animate-shimmer rounded-2xl" />
      ) : activeTab === 'crm' ? (
        
        /* TAB A: CRM KANBAN BOARD */
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 overflow-x-auto pb-4">
            {kanbanColumns.map((col) => {
              const colLeads = leads.filter(l => l.stage === col);
              return (
                <div key={col} className="bg-neutral-50/50 dark:bg-neutral-900/30 border border-border rounded-xl p-3 min-w-[200px] flex flex-col h-[500px]">
                  
                  {/* Column Header */}
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-border/60">
                    <span className="text-[10px] font-black uppercase text-neutral-500 tracking-wider truncate">{col}</span>
                    <span className="px-2 py-0.5 rounded bg-neutral-200/50 dark:bg-neutral-800 text-[9px] text-neutral-400 font-bold">
                      {colLeads.length}
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {colLeads.map((lead) => (
                      <div 
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="p-3 border border-border rounded-lg bg-card hover:border-brand-gold/30 cursor-pointer shadow-sm hover:shadow transition-all space-y-2.5 active:scale-97 select-none"
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-foreground truncate max-w-[70%]">{lead.name}</h4>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase ${
                            lead.aiScore >= 90 ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {lead.aiScore} Hot
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400 truncate">Source: {lead.source}</p>
                        
                        <div className="pt-2 border-t border-border flex justify-between gap-1">
                          <span className="text-[9px] text-brand-gold font-bold uppercase truncate max-w-[60%]">
                            {lead.aiSentiment}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })}
          </div>

          {/* CRM Lead details dialog modal */}
          {selectedLead && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <Card className="w-full max-w-2xl bg-card border-border p-6 space-y-6 max-h-[85vh] overflow-y-auto relative">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b border-border pb-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{selectedLead.name}</h3>
                    <p className="text-xs text-neutral-400 mt-1">{selectedLead.phone} · {selectedLead.email}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedLead(null)} 
                    className="text-xs font-bold text-neutral-500 hover:text-foreground cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* Details layout Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Lead Metadata */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-neutral-400 uppercase tracking-widest text-[9px]">Lead Profile</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between font-semibold">
                        <span>Lead Status Stage:</span>
                        <div className="relative">
                          <select
                            value={selectedLead.stage}
                            onChange={(e) => handleStageChange(selectedLead.id, e.target.value as any)}
                            className="bg-neutral-100 dark:bg-neutral-800 text-foreground px-2.5 py-1 rounded text-xs focus:outline-none cursor-pointer"
                          >
                            {kanbanColumns.map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Acquisition Source:</span>
                        <span className="text-foreground">{selectedLead.source}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>AI Lead Score:</span>
                        <Badge variant="gold">{selectedLead.aiScore}/100 Hotness</Badge>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>AI Sentiment Profile:</span>
                        <Badge variant="ai">{selectedLead.aiSentiment}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Notes & Timelines */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-neutral-400 uppercase tracking-widest text-[9px]">Add Activity Note</h4>
                    <form onSubmit={handleAddNote} className="space-y-2">
                      <textarea
                        required
                        placeholder="Type phone logs, WhatsApp notes..."
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                      />
                      <Button size="sm" variant="gold" type="submit" className="w-full">
                        Add to Log
                      </Button>
                    </form>
                  </div>
                </div>

                {/* Timeline History log */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <h4 className="font-bold text-neutral-400 uppercase tracking-widest text-[9px]">Activity Log History</h4>
                  <div className="space-y-2 text-xs">
                    {selectedLead.timeline.map((evt) => (
                      <div key={evt.id} className="p-3 border border-border rounded-lg bg-neutral-50/30 dark:bg-neutral-900/30 flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="font-bold text-foreground">{evt.title}</span>
                          <p className="text-neutral-500 dark:text-neutral-400">{evt.description}</p>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-bold whitespace-nowrap">
                          {evt.timestamp.substring(11, 16)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </Card>
            </div>
          )}

        </div>

      ) : activeTab === 'listings' ? (
        
        /* TAB B: MY LISTINGS MANAGER & PAID VISIBILITY CONTROLS */
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Promoted campaigns analytics overview widget */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wider block">Promoted Impressions</span>
                <span className="text-lg font-black text-foreground block mt-1 font-mono">42,850</span>
              </div>
              <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            </Card>
            <Card className="p-4 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wider block">Total Leads Generated</span>
                <span className="text-lg font-black text-foreground block mt-1 font-mono">114 Leads</span>
              </div>
              <Badge variant="success" className="text-[9px] font-bold">2.6% CTR</Badge>
            </Card>
            <Card className="p-4 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wider block">Visibility Boost Level</span>
                <span className="text-xs font-black text-brand-gold uppercase block mt-1">1 Premium · 1 Turbo</span>
              </div>
              <Shield className="h-5 w-5 text-brand-gold animate-pulse" />
            </Card>
            <Card className="p-4 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wider block">Boost Credits Balance</span>
                <span className="text-lg font-black text-foreground block mt-1 font-mono">375 <span className="text-[9px] text-neutral-400 font-bold uppercase">Credits</span></span>
              </div>
              <DollarSign className="h-5 w-5 text-brand-gold" />
            </Card>
          </div>

          <Table
            columns={[
              { key: 'title', header: 'Property Title', render: (row) => (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-12 rounded bg-neutral-100 dark:bg-neutral-900 overflow-hidden flex-shrink-0">
                    <img src={row.images[0]} alt={row.title} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-xs">{row.title}</h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{row.address}</p>
                  </div>
                </div>
              )},
              { key: 'price', header: 'Asking Price', render: (row) => (
                <span className="font-bold text-brand-navy dark:text-brand-gold text-xs">
                  S${row.price.toLocaleString()}
                </span>
              )},
              { key: 'sizeSqft', header: 'Campaign Tier Boost', render: (row) => {
                const boost = propertyBoosts[row.id] || { level: 'Standard', featured: false };
                return (
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${
                        boost.level === 'Premium' ? 'bg-purple-400 animate-ping' : (boost.level === 'Turbo' ? 'bg-amber-400' : 'bg-neutral-400')
                      }`} />
                      <span className="font-bold uppercase text-[9px] tracking-wider text-foreground">
                        {boost.level} Boost
                      </span>
                    </div>
                    {boost.featured && (
                      <span className="text-[8px] font-bold text-brand-gold uppercase tracking-wider">
                        ★ Featured Slot Active
                      </span>
                    )}
                  </div>
                );
              }},
              { key: 'district', header: 'Views / Leads', render: (row) => {
                const boost = propertyBoosts[row.id] || { level: 'Standard', featured: false };
                const multiplier = boost.level === 'Premium' ? 5 : (boost.level === 'Turbo' ? 2.5 : 1);
                return (
                  <div className="flex flex-col gap-0.5 text-xs text-neutral-500 font-bold">
                    <span>{Math.round(row.district * 24 * multiplier)} views</span>
                    <span className="text-[9px] text-neutral-400">{Math.round(row.district * 2 * multiplier)} leads generated</span>
                  </div>
                );
              }},
              { key: 'verified', header: 'Visibility Actions', render: (row) => (
                <div className="flex gap-2">
                  <Badge variant={row.verified ? 'success' : 'warning'}>
                    {row.verified ? 'Active verified' : 'Pending Verification'}
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="gold" 
                    className="text-[10px] uppercase font-black py-1 h-7 px-3" 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      setBoostingProperty(row);
                      const current = propertyBoosts[row.id] || { level: 'Standard', featured: false };
                      setSelectedBoost(current.level);
                      setIsFeaturedSlot(current.featured);
                    }}
                  >
                    🚀 Boost
                  </Button>
                </div>
              )}
            ]}
            data={listings}
          />
        </div>

      ) : activeTab === 'analytics' ? (
        
        /* TAB C: ADVANCED AGENT ANALYTICS SUITE (PROSPECTING, RENTAL YIELDS, PRICE INDEX) */
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Section A: Prospecting & yields */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Prospecting query tool */}
            <Card className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-1.5 pb-2 border-b border-border">
                <Sparkles className="h-4.5 w-4.5 text-brand-gold" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Market Prospecting Tool</h3>
              </div>

              <form onSubmit={handleProspectMarket} className="space-y-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <div className="space-y-1.5">
                  <label className="text-[9px] block">Target District</label>
                  <select
                    value={prospectDistrict}
                    onChange={(e) => setProspectDistrict(e.target.value)}
                    className="w-full text-xs font-bold rounded-lg border border-border bg-background p-2.5 text-foreground focus:outline-none focus:border-brand-gold cursor-pointer"
                  >
                    <option value="9">District 9 (Orchard / River Valley)</option>
                    <option value="10">District 10 (Holland / Tanglin)</option>
                    <option value="15">District 15 (East Coast / Marine Parade)</option>
                    <option value="22">District 22 (Jurong East Gateway)</option>
                  </select>
                </div>

                <Button type="submit" variant="gold" className="w-full font-bold uppercase tracking-wider py-2.5" isLoading={prospectLoading}>
                  Prospect Opportunities
                </Button>
              </form>

              {prospectData && (
                <div className="p-4 bg-brand-navy-dark text-white rounded-xl border border-neutral-800 space-y-3 animate-in fade-in duration-150">
                  <div className="flex justify-between items-baseline border-b border-neutral-800 pb-2">
                    <span className="text-[8px] font-black uppercase text-brand-gold tracking-wider">Prospecting Index</span>
                    <span className="text-xs font-bold text-emerald-400">{prospectData.demand}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] text-neutral-500 uppercase font-black">Market Supply Deficit:</span>
                    <p className="text-[10px] text-neutral-300 leading-normal normal-case font-normal">{prospectData.gap}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1 border-t border-neutral-800">
                    <div>
                      <span className="text-[8px] text-neutral-500 uppercase font-black block">Avg Yield</span>
                      <span className="font-bold text-white block mt-0.5">{prospectData.avgYield}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-neutral-500 uppercase font-black block">Match Score</span>
                      <span className="font-bold text-brand-gold block mt-0.5 font-mono">{prospectData.opportunityScore}%</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Rental yield district analysis */}
            <Card className="md:col-span-7 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4.5 w-4.5 text-brand-gold" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Rental Yield Analysis (Gross Returns)</h3>
                </div>
                <Badge variant="gold" className="text-[8px] uppercase tracking-wider font-mono">Updated Weekly</Badge>
              </div>

              <div className="space-y-3">
                {[
                  { region: 'D15 East Coast Condos', yield: '4.15% Avg Yield', range: 'S$4.20 - S$5.10 /sqft rent', indexColor: 'text-emerald-400' },
                  { region: 'D22 Jurong East EC/Condos', yield: '4.28% Avg Yield', range: 'S$3.80 - S$4.40 /sqft rent', indexColor: 'text-emerald-400' },
                  { region: 'D9 Orchard Luxury Suites', yield: '3.65% Avg Yield', range: 'S$6.50 - S$8.20 /sqft rent', indexColor: 'text-amber-400' },
                  { region: 'D10 Bukit Timah / Holland', yield: '3.42% Avg Yield', range: 'S$5.80 - S$7.10 /sqft rent', indexColor: 'text-amber-400' }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 border border-border rounded-xl bg-card hover:bg-neutral-50 dark:hover:bg-neutral-950/10 transition-colors">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-foreground block">{item.region}</span>
                      <span className="text-[9px] text-neutral-400 block font-bold uppercase">{item.range}</span>
                    </div>
                    <span className={`text-xs font-bold font-mono ${item.indexColor}`}>{item.yield}</span>
                  </div>
                ))}
              </div>
            </Card>

          </div>

          {/* Section B: Popular price analysis & sales index */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Price tier demand distributions */}
            <Card className="md:col-span-6 space-y-4">
              <div className="flex items-center gap-1.5 pb-2 border-b border-border">
                <BarChart2 className="h-4.5 w-4.5 text-brand-gold" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Inquiry Price Tier Distribution</h3>
              </div>

              <div className="space-y-4">
                {[
                  { tier: 'Under S$1.0 Million', pct: 15, leads: '34 active buyers', color: 'bg-neutral-400' },
                  { tier: 'S$1.0M - S$2.0 Million', pct: 45, leads: '102 active buyers', color: 'bg-brand-gold' },
                  { tier: 'S$2.0M - S$4.0 Million', pct: 30, leads: '68 active buyers', color: 'bg-brand-navy-light' },
                  { tier: 'Above S$4.0 Million', pct: 10, leads: '22 active buyers', color: 'bg-purple-500' }
                ].map((tier, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold uppercase">
                      <span className="text-foreground">{tier.tier}</span>
                      <span className="text-neutral-400">{tier.pct}% ({tier.leads})</span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2">
                      <div className={`${tier.color} h-2 rounded-full`} style={{ width: `${tier.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Sales index trend (Visual SVG representation) */}
            <Card className="md:col-span-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <LineChart className="h-4.5 w-4.5 text-brand-gold" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Project Price Index (5-Yr Trend)</h3>
                </div>
                <Badge variant="success" className="text-[8px] font-bold">+18.4% growth</Badge>
              </div>

              <div className="h-36 w-full flex items-center justify-center pt-2">
                <svg viewBox="0 0 300 100" className="w-full h-full">
                  <path d="M 10 90 L 70 80 L 130 65 L 190 40 L 250 20 L 290 10" fill="none" stroke="var(--brand-gold)" strokeWidth="2.5" />
                  <circle cx="10" cy="90" r="3.5" className="fill-brand-navy stroke-brand-gold" strokeWidth="1.5" />
                  <circle cx="70" cy="80" r="3.5" className="fill-brand-navy stroke-brand-gold" strokeWidth="1.5" />
                  <circle cx="130" cy="65" r="3.5" className="fill-brand-navy stroke-brand-gold" strokeWidth="1.5" />
                  <circle cx="190" cy="40" r="3.5" className="fill-brand-navy stroke-brand-gold" strokeWidth="1.5" />
                  <circle cx="250" cy="20" r="3.5" className="fill-brand-navy stroke-brand-gold" strokeWidth="1.5" />
                  <circle cx="290" cy="10" r="3.5" className="fill-brand-navy stroke-brand-gold" strokeWidth="1.5" />
                  <line x1="10" y1="95" x2="290" y2="95" stroke="rgba(148,163,184,0.2)" strokeWidth="1" />
                </svg>
              </div>
              <div className="flex justify-between text-[8px] text-neutral-400 font-bold uppercase pt-1 px-1">
                <span>2022</span>
                <span>2023</span>
                <span>2024</span>
                <span>2025</span>
                <span>2026</span>
              </div>
            </Card>

          </div>

        </div>

      ) : activeTab === 'autopost' ? (

        /* TAB E: AUTO-REPOST / LISTING REFRESH AUTOMATION ENGINE */
        <div className="space-y-6 animate-in fade-in duration-200">

          {/* Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wider block">Active Schedules</span>
                <span className="text-lg font-black text-foreground block mt-1 font-mono">{repostRules.filter(r => r.active).length} Rules</span>
              </div>
              <RefreshCw className="h-5 w-5 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
            </Card>
            <Card className="p-4 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wider block">Total Refreshes Fired</span>
                <span className="text-lg font-black text-foreground block mt-1 font-mono">{repostRules.reduce((s, r) => s + r.totalRefreshes, 0)}</span>
              </div>
              <Zap className="h-5 w-5 text-brand-gold" />
            </Card>
            <Card className="p-4 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wider block">Next Scheduled Refresh</span>
                <span className="text-xs font-black text-brand-gold block mt-1 uppercase">In 6 Hours</span>
              </div>
              <Timer className="h-5 w-5 text-purple-400" />
            </Card>
            <Card className="p-4 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wider block">Email Notifications</span>
                <span className="text-xs font-black text-foreground block mt-1 uppercase">{repostNotifications ? 'Enabled' : 'Disabled'}</span>
              </div>
              <button onClick={() => setRepostNotifications(!repostNotifications)} className="cursor-pointer">
                {repostNotifications
                  ? <Bell className="h-5 w-5 text-emerald-400" />
                  : <Bell className="h-5 w-5 text-neutral-400" />
                }
              </button>
            </Card>
          </div>

          {/* Add New Rule */}
          <Card className="p-5 space-y-4 border-dashed border-brand-gold/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-brand-gold" />
              Schedule New Auto-Refresh Rule
            </h3>
            <form onSubmit={handleAddRepostRule} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-6 space-y-1">
                <label className="text-[9px] font-bold uppercase text-neutral-500 block">Listing Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parc Clematis 2BR Sky Suite"
                  value={newRuleProperty}
                  onChange={(e) => setNewRuleProperty(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-brand-gold font-sans font-normal normal-case"
                />
              </div>
              <div className="md:col-span-4 space-y-1">
                <label className="text-[9px] font-bold uppercase text-neutral-500 block">Refresh Frequency</label>
                <select
                  value={newRuleInterval}
                  onChange={(e) => setNewRuleInterval(e.target.value)}
                  className="w-full text-xs font-bold rounded-lg border border-border bg-background p-2 text-foreground focus:outline-none focus:border-brand-gold cursor-pointer"
                >
                  <option value="Every 1 Day">Every 1 Day</option>
                  <option value="Every 3 Days">Every 3 Days</option>
                  <option value="Every 7 Days">Every 7 Days</option>
                  <option value="Every 14 Days">Every 14 Days</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" variant="gold" className="w-full font-bold uppercase tracking-wider text-[10px]" leftIcon={<Plus className="h-4 w-4" />}>
                  Add Rule
                </Button>
              </div>
            </form>
          </Card>

          {/* Active Rules Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Active Refresh Schedule Rules</h3>
            <div className="space-y-3">
              {repostRules.map((rule) => (
                <Card key={rule.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${rule.active ? 'border-border' : 'opacity-60 border-dashed border-neutral-300 dark:border-neutral-700'}`}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`h-9 w-9 flex-shrink-0 rounded-xl flex items-center justify-center ${rule.active ? 'bg-emerald-500/10' : 'bg-neutral-100 dark:bg-neutral-900'}`}>
                      <RefreshCw className={`h-4.5 w-4.5 ${rule.active ? 'text-emerald-400 animate-spin' : 'text-neutral-400'}`} style={{ animationDuration: '4s' }} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-foreground truncate">{rule.propertyTitle}</h4>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[9px] text-neutral-400 font-bold uppercase">{rule.interval}</span>
                        <span className="text-[9px] text-brand-gold font-bold uppercase flex items-center gap-0.5">
                          <Timer className="h-3 w-3" /> {rule.nextRefresh}
                        </span>
                        <span className="text-[9px] text-neutral-500 font-bold uppercase">{rule.totalRefreshes} refreshes total</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={rule.active ? 'success' : 'secondary'} className="text-[8px] uppercase font-black">
                      {rule.active ? 'Active' : 'Paused'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] font-bold uppercase py-1 h-7 px-2"
                      onClick={() => handleManualRefresh(rule.id)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <button
                      onClick={() => handleToggleRepostRule(rule.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${rule.active ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${rule.active ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* How it works explanation */}
          <Card className="p-5 bg-neutral-50/50 dark:bg-neutral-900/30 border border-border space-y-3">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-400">How Auto-Repost Works</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-500">
              {[
                { step: '01', title: 'Schedule Created', desc: 'Set a refresh interval for each listing. V-RENT automatically re-publishes at peak search hours.' },
                { step: '02', title: 'Visibility Reset', desc: 'Each refresh resets your listing\'s "New" badge and bumps ranking in fresh-listings search feeds.' },
                { step: '03', title: 'Analytics Tracked', desc: 'Monitor view and lead growth per refresh cycle from the Listings Manager analytics dashboard.' },
              ].map((item) => (
                <div key={item.step} className="space-y-1.5">
                  <span className="text-brand-gold font-black text-lg font-mono block">{item.step}</span>
                  <span className="text-foreground font-bold text-xs block">{item.title}</span>
                  <p className="leading-relaxed normal-case font-normal text-[10px]">{item.desc}</p>
                </div>
              ))}
            </div>
          </Card>

        </div>

      ) : (
        
        /* TAB D: AI LISTINGS DESCRIPTION GENERATOR */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-200">
          <form onSubmit={handleGenerateListing} className="md:col-span-5 space-y-4">
            <Card className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Specifications</h3>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Property Class Category</label>
                <Select
                  options={[
                    { value: 'Condo', label: 'Private Condominium' },
                    { value: 'HDB', label: 'HDB Flat' },
                    { value: 'Landed', label: 'Landed Bungalow' },
                    { value: 'EC', label: 'Executive Condominium' }
                  ]}
                  value={genCategory}
                  onChange={(e: any) => setGenCategory(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Bedrooms Count</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  required
                  value={genBeds}
                  onChange={(e) => setGenBeds(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Core Region Location</label>
                <Select
                  options={[
                    { value: 'Orchard', label: 'D9 - Orchard / Cairnhill' },
                    { value: 'River Valley', label: 'D9 - River Valley' },
                    { value: 'Holland', label: 'D10 - Holland Village' },
                    { value: 'Marine Parade', label: 'D15 - Marine Parade' },
                    { value: 'Punggol', label: 'D19 - Punggol Walk' },
                    { value: 'Jurong', label: 'D22 - Jurong East Gateway' }
                  ]}
                  value={genArea}
                  onChange={(e: any) => setGenArea(e.target.value)}
                />
              </div>

              <Button type="submit" variant="gold" className="w-full font-bold uppercase tracking-wider py-3" isLoading={genLoading}>
                Generate Listing Assets
              </Button>
            </Card>
          </form>

          <div className="md:col-span-7 h-full">
            {genOutput ? (
              <Card className="bg-brand-navy-dark text-white border-neutral-800 p-6 flex flex-col justify-between h-full space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                    <span className="text-[10px] font-black tracking-widest text-brand-gold uppercase">AI Copilot Draft Ready</span>
                    <Badge variant="ai">Generated via Ava</Badge>
                  </div>
                  <pre className="text-xs font-mono whitespace-pre-wrap text-neutral-300 leading-relaxed max-h-[300px] overflow-y-auto">
                    {genOutput}
                  </pre>
                </div>
                <div className="flex justify-end gap-2 border-t border-neutral-800 pt-4">
                  <Button size="sm" variant="outline" className="text-white border-neutral-700 font-bold" onClick={() => alert("Copied to clipboard.")}>
                    Copy to Clipboard
                  </Button>
                  <Button size="sm" variant="gold" className="font-bold" onClick={() => alert("Saved directly as a draft listing.")}>
                    Save as Draft Listing
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="h-full border-dashed border-border flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[300px]">
                <div className="h-10 w-10 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center text-neutral-400">
                  <Sparkles className="h-5 w-5 text-neutral-400" />
                </div>
                <h4 className="text-sm font-bold uppercase text-foreground">Waiting for generator parameters</h4>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  Fill in the unit details on the left and click generate to compose professional headlines and descriptions.
                </p>
              </Card>
            )}
          </div>
        </div>

      )}

      {/* 3. VISIBILITY UPGRADE BOOST CAMPAIGN MODAL */}
      {boostingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 space-y-5 animate-in zoom-in duration-150 text-left bg-card">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div className="space-y-1">
                <span className="text-[8px] font-black text-brand-gold uppercase tracking-wider block">Promotional Campaigns Control</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Boost Listing Visibility</h3>
              </div>
              <button onClick={() => setBoostingProperty(null)} className="text-neutral-400 hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {boostSuccess ? (
              <div className="p-8 text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl space-y-2 animate-in zoom-in duration-150">
                <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="font-bold text-xs uppercase text-emerald-400">Promotion Activated</h4>
                <p className="text-[10px] text-neutral-400">Visibility campaign has been successfully deployed onto the V-RENT marketplace feed.</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmBoost} className="space-y-5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900/40 rounded-lg border border-border">
                  <span className="text-[8px] font-bold text-neutral-400 block">Target Listing:</span>
                  <span className="text-xs font-bold text-foreground block normal-case font-sans mt-0.5">{boostingProperty.title}</span>
                </div>

                {/* Campaign Tier boost options */}
                <div className="space-y-2">
                  <label className="text-[9px] block">Select Boost Tier</label>
                  <div className="space-y-2">
                    {[
                      { id: 'Standard', label: 'Standard Tier (1x reach, 0 credits)', desc: 'Standard placement in default searches.' },
                      { id: 'Turbo', label: 'Turbo Tier (2.5x reach, 25 credits/wk)', desc: 'Accelerated matching index on related listings.' },
                      { id: 'Premium', label: 'Premium Tier (5.0x reach, 50 credits/wk)', desc: 'Top of page sponsor badge and instant lead notifications.' }
                    ].map((opt) => (
                      <div 
                        key={opt.id}
                        onClick={() => setSelectedBoost(opt.id as any)}
                        className={`p-3 border rounded-xl cursor-pointer transition-all ${
                          selectedBoost === opt.id 
                            ? 'border-brand-gold bg-brand-gold/5' 
                            : 'border-border hover:bg-neutral-50 dark:hover:bg-neutral-950/20'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-foreground">{opt.id} Campaign</span>
                          <input 
                            type="radio" 
                            name="boostTier" 
                            checked={selectedBoost === opt.id} 
                            onChange={() => setSelectedBoost(opt.id as any)} 
                            className="text-brand-gold focus:ring-brand-gold"
                          />
                        </div>
                        <p className="text-[9px] text-neutral-400 mt-1 font-normal normal-case leading-normal">{opt.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Featured Agent Slot Toggle */}
                <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-card hover:bg-neutral-50 dark:hover:bg-neutral-950/20 transition-colors">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-foreground block">Featured Agent Slot</span>
                    <p className="text-[9px] text-neutral-400 font-normal normal-case leading-normal">
                      Display your profile next to search results in this district (+15 credits/week).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isFeaturedSlot}
                    onChange={(e) => setIsFeaturedSlot(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold cursor-pointer"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" type="button" onClick={() => setBoostingProperty(null)}>Cancel</Button>
                  <Button variant="gold" type="submit">Activate Campaign</Button>
                </div>
              </form>
            )}

          </Card>
        </div>
      )}

    </div>
  );
}

export default function AgentDashboard() {
  return (
    <React.Suspense fallback={<div className="text-xs uppercase font-bold text-neutral-400">Loading Agent Console...</div>}>
      <AgentDashboardContent />
    </React.Suspense>
  );
}
