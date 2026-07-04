"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { getListings } from '../../lib/services/properties';
import { Property } from '../../lib/mock-data/properties';
import { 
  Landmark, TrendingUp, Sparkles, AlertCircle, Compass, ArrowRight, 
  MapPin, Calendar, DollarSign, BarChart3, Clock, CheckCircle2, 
  Building, Globe, FileSearch, ExternalLink, ChevronDown, ChevronUp, X,
  Briefcase, FileSpreadsheet
} from 'lucide-react';

interface GlsSite {
  id: string;
  siteName: string;
  location: string;
  district: string;
  gfa: string;
  allowedUse: string;
  status: 'Awarded' | 'Closed - Pending Award' | 'Tender Open' | 'Confirmed List';
  tenderClose: string;
  topBidder?: string;
  topBidPsm?: string;
  topBidTotal?: string;
  estimatedUnits?: number;
  expectedTop?: string;
}

const glsSites: GlsSite[] = [
  {
    id: 'gls-1',
    siteName: 'Marina Gardens Crescent Parcel B',
    location: 'Marina Bay', district: 'D01',
    gfa: '95,000 sqm', allowedUse: 'Residential (Mixed)',
    status: 'Awarded',
    tenderClose: 'Mar 2025', topBidder: 'City Developments Limited',
    topBidPsm: 'S$1,640 ppr', topBidTotal: 'S$1.28B',
    estimatedUnits: 790, expectedTop: 'Q1 2028'
  },
  {
    id: 'gls-2',
    siteName: 'Lentor Gardens Road',
    location: 'Lentor', district: 'D26',
    gfa: '58,700 sqm', allowedUse: 'Residential',
    status: 'Awarded',
    tenderClose: 'Dec 2024', topBidder: 'GuocoLand & Hong Leong Holdings',
    topBidPsm: 'S$984 ppr', topBidTotal: 'S$435M',
    estimatedUnits: 530, expectedTop: 'Q3 2027'
  },
  {
    id: 'gls-3',
    siteName: 'Tengah Plantation Loop',
    location: 'Tengah (Jurong Lake)', district: 'D22',
    gfa: '42,000 sqm', allowedUse: 'Executive Condominium (EC)',
    status: 'Tender Open',
    tenderClose: 'Aug 2026',
    estimatedUnits: 495, expectedTop: 'Q2 2029'
  },
  {
    id: 'gls-4',
    siteName: 'Bayshore Road Parcel A',
    location: 'Bayshore / East Coast', district: 'D16',
    gfa: '78,000 sqm', allowedUse: 'Residential',
    status: 'Confirmed List',
    tenderClose: 'Q4 2026',
    estimatedUnits: 700, expectedTop: 'Q4 2030'
  },
  {
    id: 'gls-5',
    siteName: 'Orchard Boulevard Parcel B',
    location: 'Orchard / Scotts Road', district: 'D10',
    gfa: '32,000 sqm', allowedUse: 'Residential (Prime)',
    status: 'Closed - Pending Award',
    tenderClose: 'Jun 2026',
    estimatedUnits: 265, expectedTop: 'Q1 2030'
  },
  {
    id: 'gls-6',
    siteName: 'Woodlands Ave 12 Commercial',
    location: 'Woodlands Regional Centre', district: 'D25',
    gfa: '55,000 sqm', allowedUse: 'Commercial / Hotel',
    status: 'Confirmed List',
    tenderClose: 'Q1 2027',
    estimatedUnits: undefined, expectedTop: 'Q2 2031'
  },
];

import { Input, Select } from '../../components/ui/Input';

interface PortfolioProperty {
  id: string;
  name: string;
  type: string;
  district: string;
  purchasePrice: number;
  currentValue: number;
  monthlyRent: number;
  tenure: string;
  purchaseYear: number;
}

const initialPortfolioProperties: PortfolioProperty[] = [
  { id: 'pp-1', name: 'Martin Modern', type: 'Condo', district: 'D09', purchasePrice: 2480000, currentValue: 2890000, monthlyRent: 9800, tenure: 'Freehold', purchaseYear: 2021 },
  { id: 'pp-2', name: 'The Antares', type: 'Condo', district: 'D14', purchasePrice: 1280000, currentValue: 1460000, monthlyRent: 5200, tenure: '99-year', purchaseYear: 2022 },
  { id: 'pp-3', name: 'Tanjong Pagar Shophouse', type: 'Shophouse', district: 'D02', purchasePrice: 4600000, currentValue: 5480000, monthlyRent: 18500, tenure: 'Freehold', purchaseYear: 2019 },
];

const glsStatusColor: Record<GlsSite['status'], string> = {
  'Awarded': 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30',
  'Closed - Pending Award': 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
  'Tender Open': 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  'Confirmed List': 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
};

function InvestorDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'portfolio';

  const [opps, setOpps] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGls, setExpandedGls] = useState<string | null>(null);

  // Dynamic Portfolio State
  const [portfolio, setPortfolio] = useState<PortfolioProperty[]>(initialPortfolioProperties);

  // Add Property Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState('Condo');
  const [addDistrict, setAddDistrict] = useState('D09');
  const [addPurchasePrice, setAddPurchasePrice] = useState(1500000);
  const [addCurrentValue, setAddCurrentValue] = useState(1650000);
  const [addMonthlyRent, setAddMonthlyRent] = useState(5200);
  const [addTenure, setAddTenure] = useState('Freehold');
  const [addPurchaseYear, setAddPurchaseYear] = useState(2023);

  useEffect(() => {
    setLoading(true);
    getListings().then(res => {
      setOpps(res.filter(p => p.aiMatchedScore >= 90).slice(0, 3));
      setLoading(false);
    });
  }, []);

  const totalPortfolioValue = portfolio.reduce((s, p) => s + p.currentValue, 0);
  const totalPurchaseValue = portfolio.reduce((s, p) => s + p.purchasePrice, 0);
  const totalMonthlyRent = portfolio.reduce((s, p) => s + p.monthlyRent, 0);
  const avgYield = ((totalMonthlyRent * 12) / totalPortfolioValue * 100).toFixed(2);
  const appreciation = (((totalPortfolioValue - totalPurchaseValue) / totalPurchaseValue) * 100).toFixed(1);

  const handleAddPropertySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return;

    const newProp: PortfolioProperty = {
      id: `pp-${Date.now()}`,
      name: addName,
      type: addType,
      district: addDistrict,
      purchasePrice: addPurchasePrice,
      currentValue: addCurrentValue,
      monthlyRent: addMonthlyRent,
      tenure: addTenure,
      purchaseYear: addPurchaseYear
    };

    setPortfolio(prev => [...prev, newProp]);
    setAddModalOpen(false);
    setAddName('');
    alert("Property asset added successfully. Wealth scorecard parameters updated.");
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 pb-4 border-b border-border text-left">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-foreground">
            {activeTab === 'portfolio' ? 'Investor Portfolio Summary' : activeTab === 'opportunities' ? 'AI Investment Opportunities' : activeTab === 'intel' ? 'Private Market Intel & GLS Supply' : 'Premium Financial Reports'}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {activeTab === 'portfolio' ? 'Real-time yield metrics, asset values, appreciation trends, and net performance scores.' : activeTab === 'opportunities' ? 'AI-filtered deals with high yield potential and market matching characteristics.' : activeTab === 'intel' ? 'District-level price indices, YoY growth statistics, and government land sales tracking.' : 'Downloadable compliance audits, asset statements, and portfolio tax estimations.'}
          </p>
        </div>
        <Badge variant="gold" className="text-xs py-1.5 px-3">Elite Portfolio Status</Badge>
      </div>

      {/* PORTFOLIO TAB */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          {/* PORTFOLIO METRICS HEADER */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 flex flex-col justify-between text-left">
              <div className="flex justify-between items-center text-xs font-bold text-neutral-400 uppercase">
                <span>Portfolio Value</span>
                <Landmark className="h-4 w-4 text-brand-gold" />
              </div>
              <div className="mt-3">
                <span className="text-xl font-black text-foreground">S${(totalPortfolioValue / 1e6).toFixed(2)}M</span>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-1">▲ {appreciation}% Total Return</p>
              </div>
            </Card>
            <Card className="p-5 flex flex-col justify-between text-left">
              <div className="flex justify-between items-center text-xs font-bold text-neutral-400 uppercase">
                <span>Gross Rental Yield</span>
                <TrendingUp className="h-4 w-4 text-brand-gold" />
              </div>
              <div className="mt-3">
                <span className="text-xl font-black text-foreground">{avgYield}% Avg</span>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">S${totalMonthlyRent.toLocaleString('en-US')}/mo total rent</p>
              </div>
            </Card>
            <Card className="p-5 flex flex-col justify-between text-left">
              <div className="flex justify-between items-center text-xs font-bold text-neutral-400 uppercase">
                <span>Properties Held</span>
                <Building className="h-4 w-4 text-brand-gold" />
              </div>
              <div className="mt-3">
                <span className="text-xl font-black text-foreground">{portfolio.length} Assets</span>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">Across {new Set(portfolio.map(p => p.district)).size} districts</p>
              </div>
            </Card>
            <Card className="p-5 flex flex-col justify-between bg-gradient-to-br from-brand-navy to-brand-navy-light text-white border-brand-gold/15 text-left">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-brand-gold tracking-widest">
                <span>Portfolio Score</span>
                <Sparkles className="h-4 w-4 text-brand-gold animate-pulse" />
              </div>
              <div className="mt-3">
                <span className="text-xl font-black text-white">92 / 100</span>
                <p className="text-[10px] text-neutral-300 mt-1">Elite diversification & low vacancy</p>
              </div>
            </Card>
          </div>

          {/* Capital Appreciation Chart */}
          <Card className="p-6 space-y-4 text-left">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Capital Appreciation Sparkline (Past 5 Years)</h3>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">▲ {appreciation}% Total</span>
            </div>
            <div className="h-48 w-full">
              <svg viewBox="0 0 500 150" className="w-full h-full">
                {[20, 70, 120].map(y => <line key={y} x1="30" y1={y} x2="480" y2={y} stroke="rgba(148, 163, 184, 0.07)" strokeWidth="1" />)}
                <text x="5" y="25" fontSize="8" fill="#94a3b8">15M</text>
                <text x="5" y="75" fontSize="8" fill="#94a3b8">12M</text>
                <text x="5" y="125" fontSize="8" fill="#94a3b8">9M</text>
                {['2022','2023','2024','2025','2026'].map((y, i) => (
                  <text key={y} x={35 + i * 110} y="140" fontSize="8" fill="#94a3b8">{y}</text>
                ))}
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#c9a84c" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M 35 120 C 80 115, 140 100, 245 90 C 350 80, 410 40, 475 30 L 475 130 L 35 130 Z" fill="url(#areaGrad)" />
                <path d="M 35 120 C 80 115, 140 100, 245 90 C 350 80, 410 40, 475 30" fill="none" stroke="#c9a84c" strokeWidth="3"/>
                <circle cx="475" cy="30" r="5" fill="#c9a84c" />
              </svg>
            </div>
          </Card>

          {/* Portfolio Properties Table */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center whitespace-nowrap">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Portfolio Holdings</h3>
              <Button 
                size="sm" 
                variant="gold" 
                className="text-[10px] uppercase font-bold tracking-wider"
                onClick={() => setAddModalOpen(true)}
              >
                + Add Property
              </Button>
            </div>
            <div className="divide-y divide-border">
              {portfolio.map(p => {
                const gain = p.currentValue - p.purchasePrice;
                const gainPct = ((gain / p.purchasePrice) * 100).toFixed(1);
                const grossYield = ((p.monthlyRent * 12) / p.currentValue * 100).toFixed(2);
                return (
                  <div key={p.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors text-left">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-brand-gold/10 flex items-center justify-center flex-shrink-0">
                        <Building className="h-5 w-5 text-brand-gold" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-neutral-400 font-bold uppercase">{p.district} · {p.type}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-bold uppercase">{p.tenure}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-400 uppercase font-bold">Current Value</p>
                        <p className="text-sm font-black text-foreground">S${p.currentValue.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-400 uppercase font-bold">Capital Gain</p>
                        <p className="text-sm font-black text-emerald-500">+S${gain.toLocaleString()} ({gainPct}%)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-400 uppercase font-bold">Gross Yield</p>
                        <p className="text-sm font-black text-brand-gold">{grossYield}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-400 uppercase font-bold">Monthly Rent</p>
                        <p className="text-sm font-black text-foreground">S${p.monthlyRent.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* MARKET INTEL & GLS TRACKER TAB */}
      {activeTab === 'intel' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Market Intel Analytics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase">
                <span>Top Growth District</span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <span className="text-xl font-black text-foreground">District 09 (Orchard / River Valley)</span>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-1">▲ +8.2% YoY Appreciation</p>
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase">
                <span>Private Rent Index</span>
                <Building className="h-4 w-4 text-brand-gold" />
              </div>
              <div>
                <span className="text-xl font-black text-foreground">164.8 Points</span>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">S$5.85 avg rental PSF pm</p>
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase">
                <span>Market Transaction Velocity</span>
                <Clock className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <span className="text-xl font-black text-foreground">Average 24 Days on Portal</span>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">High demand in central/west zones</p>
              </div>
            </Card>
          </div>

          {/* District Growth Performance Table */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-border text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Singapore District Performance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-neutral-50/50 dark:bg-neutral-950/20 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5">District</th>
                    <th className="px-5 py-3.5">Primary Localities</th>
                    <th className="px-5 py-3.5 text-right">Avg Resale PSF</th>
                    <th className="px-5 py-3.5 text-right">YoY Growth</th>
                    <th className="px-5 py-3.5 text-right">Transaction Vol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {[
                    { dist: 'D09', areas: 'Orchard, River Valley, Cairnhill', psf: 'S$2,850', growth: '+8.2%', vol: '382 deals' },
                    { dist: 'D10', areas: 'Tanglin, Holland, Bukit Timah', psf: 'S$2,920', growth: '+5.4%', vol: '298 deals' },
                    { dist: 'D15', areas: 'Katong, Joo Chiat, Amber Road', psf: 'S$1,980', growth: '+6.1%', vol: '424 deals' },
                    { dist: 'D22', areas: 'Jurong, Boon Lay, Tuas (GLS Hub)', psf: 'S$1,350', growth: '+9.4%', vol: '512 deals' }
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-900/10">
                      <td className="px-5 py-3.5 font-bold text-brand-gold">{row.dist}</td>
                      <td className="px-5 py-3.5 text-neutral-500">{row.areas}</td>
                      <td className="px-5 py-3.5 text-right font-mono">{row.psf}</td>
                      <td className="px-5 py-3.5 text-right text-emerald-500 font-bold">{row.growth}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-neutral-400">{row.vol}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* GLS Sites Supply Section Title */}
          <div className="pt-2 text-left">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">URA Government Land Sales Supply Tracker</h3>
          </div>

          {/* GLS Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Active GLS Sites', value: '6', sub: 'H1 2026 confirmed list', color: 'text-blue-400' },
              { label: 'Total GFA Pipeline', value: '360,700 sqm', sub: 'Residential + Commercial', color: 'text-purple-400' },
              { label: 'Estimated New Units', value: '~2,780', sub: 'From awarded + open sites', color: 'text-emerald-400' },
              { label: 'Avg Land Rate', value: 'S$1,312 ppr', sub: 'Last 3 awarded sites average', color: 'text-brand-gold' },
            ].map(m => (
              <Card key={m.label} className="p-4">
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{m.label}</p>
                <p className={`text-lg font-black mt-1 ${m.color}`}>{m.value}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">{m.sub}</p>
              </Card>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-[10px] font-bold uppercase text-neutral-400">Status Legend:</span>
            {Object.entries(glsStatusColor).map(([status, cls]) => (
              <span key={status} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{status}</span>
            ))}
          </div>

          {/* GLS Sites List */}
          <div className="space-y-3">
            {glsSites.map(site => (
              <Card key={site.id} className="overflow-hidden">
                <div
                  className="p-4 flex flex-wrap gap-4 items-start cursor-pointer hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors"
                  onClick={() => setExpandedGls(expandedGls === site.id ? null : site.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${glsStatusColor[site.status]}`}>{site.status}</span>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase">{site.district} · {site.allowedUse}</span>
                    </div>
                    <h4 className="text-sm font-bold text-foreground">{site.siteName}</h4>
                    <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {site.location}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-6 items-center">
                    <div className="text-right">
                      <p className="text-[10px] text-neutral-400 font-bold uppercase">GFA</p>
                      <p className="text-sm font-black text-foreground">{site.gfa}</p>
                    </div>
                    {site.estimatedUnits && (
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-400 font-bold uppercase">Est. Units</p>
                        <p className="text-sm font-black text-foreground">~{site.estimatedUnits}</p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-[10px] text-neutral-400 font-bold uppercase">Tender Close</p>
                      <p className="text-sm font-black text-foreground">{site.tenderClose}</p>
                    </div>
                    <div className="text-neutral-400">
                      {expandedGls === site.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {expandedGls === site.id && (
                  <div className="px-4 pb-4 border-t border-border pt-4 bg-neutral-50/30 dark:bg-neutral-900/20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {site.topBidder && (
                        <>
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase mb-1">Top Bidder</p>
                            <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {site.topBidder}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase mb-1">Winning Bid (Land Rate)</p>
                            <p className="text-sm font-bold text-brand-gold">{site.topBidPsm}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase mb-1">Total Bid Amount</p>
                            <p className="text-sm font-bold text-foreground">{site.topBidTotal}</p>
                          </div>
                        </>
                      )}
                      {site.expectedTop && (
                        <div>
                          <p className="text-[10px] text-neutral-400 font-bold uppercase mb-1">Expected TOP</p>
                          <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-brand-gold" /> {site.expectedTop}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase mb-1">Investor Implication</p>
                        <p className="text-xs text-neutral-500">
                          {site.status === 'Awarded' 
                            ? 'Monitor developer launch pricing for early-bird investment entry opportunities.'
                            : site.status === 'Tender Open'
                            ? 'Land bid results will determine launch pricing benchmark for surrounding resale market.'
                            : 'Upcoming supply — watch for pricing pressure on existing surrounding developments.'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                        <ExternalLink className="h-3 w-3 mr-1" /> URA Website
                      </Button>
                      <Button size="sm" variant="gold" className="text-[10px] uppercase font-bold tracking-wider">
                        Set Price Alert
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* GLS Source Attribution */}
          <Card className="p-3 border-blue-500/20 bg-blue-500/5 flex gap-2 items-center text-left">
            <Globe className="h-4 w-4 text-blue-400 flex-shrink-0" />
            <p className="text-[10px] text-neutral-500">
              Data sourced from <span className="font-bold text-blue-400">URA (Urban Redevelopment Authority) Government Land Sales Programme</span>. Refreshed quarterly. Verify with official URA GLS circulars for legal compliance.
            </p>
          </Card>
        </div>
      )}

      {/* AI OPPORTUNITIES DEAL FLOW TAB */}
      {activeTab === 'opportunities' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-64 rounded-xl bg-card border border-border animate-pulse" />
              ))
            ) : (
              opps.map((p) => (
                <Card key={p.id} className="p-0 overflow-hidden flex flex-col justify-between hover:border-brand-gold/30 transition-colors">
                  <div className="h-36 bg-neutral-100 overflow-hidden relative">
                    <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-3">
                      <Badge variant="ai" className="text-[9px]">{p.aiMatchedScore}% AI MATCH</Badge>
                    </div>
                  </div>
                  <div className="p-4 space-y-3 flex-grow">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">{p.areaName} · {p.propertyType}</span>
                      <h4 className="text-sm font-bold text-foreground mt-0.5">{p.title}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <p className="text-neutral-400 font-bold uppercase">Price</p>
                        <p className="font-black text-brand-gold">S${p.price.toLocaleString('en-US')}</p>
                      </div>
                      <div>
                        <p className="text-neutral-400 font-bold uppercase">PSF</p>
                        <p className="font-black text-foreground">S${p.psf}</p>
                      </div>
                    </div>
                    <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Est. Rental Yield: {(3.8 + Math.random() * 0.8).toFixed(1)}%
                    </div>
                  </div>
                  <div className="px-4 pb-4 pt-2 border-t border-border">
                    <a href={`/property/${p.id}`} className="block">
                      <Button size="sm" variant="gold" className="w-full text-[10px] uppercase font-bold tracking-wider">
                        Review Deal Metrics
                      </Button>
                    </a>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* FINANCIAL REPORTS TAB */}
      {activeTab === 'reports' && (
        <div className="space-y-6 text-left animate-in fade-in duration-200">
          {/* Section: Download Hub */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center whitespace-nowrap">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Premium Wealth Reports (Downloads)</h3>
              <Badge variant="gold" className="text-[10px]">Elite Access Active</Badge>
            </div>
            <div className="divide-y divide-border">
              {[
                { title: 'Singapore Residential Supply Pipeline Forecast 2026', desc: 'In-depth analysis of URA Master Plan additions and estimated launch rates.', date: 'Jun 2026', size: '4.8 MB' },
                { title: 'Central Core Region (CCR) Shophouse Capital Appreciation Audit', desc: 'Historical performance registry of Conservation Shophouses across D01, D02, D08.', date: 'May 2026', size: '8.2 MB' },
                { title: 'HDB Resale Index & Million-Dollar Flat Density Assessment', desc: 'Tracks flat premium values across mature estate blocks.', date: 'Apr 2026', size: '3.1 MB' },
                { title: 'URA Master Plan 2026: Land Reclamation & Infrastructure Impact Study', desc: 'Identifies high-growth locations ahead of MRT expansion phases.', date: 'Mar 2026', size: '12.4 MB' }
              ].map((doc, idx) => (
                <div key={idx} className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded bg-brand-gold/10 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="h-4.5 w-4.5 text-brand-gold" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{doc.title}</h4>
                      <p className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed">{doc.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right whitespace-nowrap text-[10px]">
                      <span className="text-neutral-400 font-bold block">Refreshed</span>
                      <span className="font-semibold text-neutral-500">{doc.date}</span>
                    </div>
                    <div className="text-right whitespace-nowrap text-[10px]">
                      <span className="text-neutral-400 font-bold block">Size</span>
                      <span className="font-semibold text-neutral-500">{doc.size}</span>
                    </div>
                    <Button size="sm" variant="outline" className="text-[9px] uppercase font-bold tracking-wider py-1 px-2.5 h-7">
                      Download PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Section: Tax & Net Returns Evaluation */}
          <Card className="p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Net Portfolio ROI Breakdown</h3>
              <p className="text-[10px] text-neutral-500">Includes Buyer Stamp Duty (BSD), ABSD estimates, and accumulated rental revenues.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-neutral-50/50 dark:bg-neutral-950/20 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Property Asset</th>
                    <th className="px-5 py-3 text-right">Tax & Stamp Duties</th>
                    <th className="px-5 py-3 text-right">Total Rent Collected</th>
                    <th className="px-5 py-3 text-right">Net ROI %</th>
                    <th className="px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {[
                    { name: 'Martin Modern', tax: 'S$99,200', rent: 'S$470,400', roi: '18.4%' },
                    { name: 'The Antares', tax: 'S$51,200', rent: 'S$187,200', roi: '14.1%' },
                    { name: 'Tanjong Pagar Shophouse', tax: 'S$184,000', rent: 'S$1,110,000', roi: '38.2%' }
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-900/10">
                      <td className="px-5 py-3.5 font-bold text-foreground">{row.name}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-neutral-400">{row.tax}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-500 font-bold">+{row.rent}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-brand-gold font-bold">{row.roi}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-emerald-500">
                        <Badge variant="success">Secured</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* MAS REGULATORY DISCLOSURE */}
      <Card className="p-4 border-amber-200 dark:border-amber-800/40 bg-amber-500/5 flex gap-3.5 items-start">
        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400 font-sans normal-case text-left">
          <span className="font-bold text-foreground">MAS Regulatory Disclaimer</span>
          <p className="leading-relaxed">
            All pricing estimations, rental yields, GLS pipeline forecasts, and capital appreciation models generated by the V-RENT AI platform are illustrative and for portfolio planning purposes only. They do not constitute formal tax advice or legal financial consultations under the Monetary Authority of Singapore (MAS) code. Investors should obtain verified legal opinions.
          </p>
        </div>
      </Card>

      {/* ADD PROPERTY TO PORTFOLIO DIALOG MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in text-left">
          <Card className="w-full max-w-md p-6 space-y-4 text-left bg-card border-border relative">
            <button 
              onClick={() => setAddModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-foreground cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <div className="space-y-1 text-left">
              <span className="text-[9px] text-brand-gold font-black uppercase tracking-widest block">Portfolio Operations</span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Add Custom Asset</h3>
            </div>

            <form onSubmit={handleAddPropertySubmit} className="space-y-4">
              <Input
                label="Development Name"
                required
                placeholder="e.g. Parc Clematis"
                value={addName}
                onChange={e => setAddName(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-neutral-500 block">Property Type</label>
                  <select
                    value={addType}
                    onChange={e => setAddType(e.target.value)}
                    className="w-full text-xs font-bold rounded-lg border border-border bg-card p-2.5 text-foreground focus:outline-none"
                  >
                    <option value="Condo">Condominium</option>
                    <option value="HDB">HDB Flat</option>
                    <option value="Landed">Landed House</option>
                    <option value="Shophouse">Shophouse</option>
                  </select>
                </div>
                <Input
                  label="District"
                  required
                  placeholder="e.g. D19"
                  value={addDistrict}
                  onChange={e => setAddDistrict(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Purchase Price (S$)"
                  type="number"
                  required
                  value={addPurchasePrice}
                  onChange={e => setAddPurchasePrice(Number(e.target.value))}
                />
                <Input
                  label="Current Value (S$)"
                  type="number"
                  required
                  value={addCurrentValue}
                  onChange={e => setAddCurrentValue(Number(e.target.value))}
                />
                <Input
                  label="Monthly Rent (S$)"
                  type="number"
                  required
                  value={addMonthlyRent}
                  onChange={e => setAddMonthlyRent(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-neutral-500 block">Tenure</label>
                  <select
                    value={addTenure}
                    onChange={e => setAddTenure(e.target.value)}
                    className="w-full text-xs font-bold rounded-lg border border-border bg-card p-2.5 text-foreground focus:outline-none"
                  >
                    <option value="Freehold">Freehold</option>
                    <option value="99-year">99-year Leasehold</option>
                    <option value="999-year">999-year Leasehold</option>
                  </select>
                </div>
                <Input
                  label="Purchase Year"
                  type="number"
                  required
                  value={addPurchaseYear}
                  onChange={e => setAddPurchaseYear(Number(e.target.value))}
                />
              </div>

              <div className="flex gap-2 justify-end border-t border-border pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="gold"
                  className="font-bold uppercase tracking-wider"
                >
                  Save Asset
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}

export default function InvestorDashboard() {
  return (
    <React.Suspense fallback={<div className="text-xs uppercase font-bold text-neutral-400">Loading Wealth Center...</div>}>
      <InvestorDashboardContent />
    </React.Suspense>
  );
}
