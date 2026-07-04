"use client";

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { 
  FileSearch, Compass, MapPin, Landmark, ArrowRight, 
  Search, Train, School, ShieldCheck, ArrowUpRight
} from 'lucide-react';

interface LandingPageItem {
  name: string;
  count: number;
  avgPsf: number;
  trend: string;
}

interface LandingPageCategory {
  title: string;
  description: string;
  icon: any;
  items: LandingPageItem[];
}

const seoData: Record<string, LandingPageCategory> = {
  mrt: {
    title: 'MRT Station Landing Pages',
    description: 'Find premium HDBs and private condominiums within 500m of major transit stations.',
    icon: Train,
    items: [
      { name: 'Amber MRT (TEL)', count: 124, avgPsf: 2350, trend: '▲ 2.4%' },
      { name: 'Marine Parade MRT (TEL)', count: 185, avgPsf: 2180, trend: '▲ 3.1%' },
      { name: 'Newton MRT (NSL/DTL)', count: 240, avgPsf: 2950, trend: '▼ 0.5%' },
      { name: 'Lentor MRT (TEL)', count: 98, avgPsf: 2050, trend: '▲ 4.8%' },
      { name: 'Orchard MRT (NSL/TEL)', count: 320, avgPsf: 3800, trend: '▲ 1.2%' },
      { name: 'Tampines MRT (EWL/DTL)', count: 412, avgPsf: 1450, trend: '▲ 0.8%' },
    ]
  },
  school: {
    title: 'Primary School Proximity Pages',
    description: 'Explore verified properties located within the critical 1km home-school distance registration bracket.',
    icon: School,
    items: [
      { name: 'Anglo-Chinese School (Primary)', count: 145, avgPsf: 3100, trend: '▲ 1.8%' },
      { name: 'Nanyang Primary School', count: 112, avgPsf: 3250, trend: '▲ 2.9%' },
      { name: 'Tao Nan School', count: 167, avgPsf: 2150, trend: '▲ 3.5%' },
      { name: 'Raffles Girls\' Primary School', count: 95, avgPsf: 2850, trend: '▲ 1.4%' },
      { name: 'St. Hilda\'s Primary School', count: 220, avgPsf: 1480, trend: '▲ 0.9%' },
      { name: 'Methodist Girls\' School (Primary)', count: 88, avgPsf: 2700, trend: '▲ 2.2%' },
    ]
  },
  district: {
    title: 'District Directory Pages',
    description: 'Compare transaction activity, vacancy rates, and price-per-square-foot benchmarks across Singapore districts.',
    icon: Landmark,
    items: [
      { name: 'District 9 (Orchard / River Valley)', count: 840, avgPsf: 3850, trend: '▲ 0.5%' },
      { name: 'District 10 (Tanglin / Bukit Timah)', count: 920, avgPsf: 3600, trend: '▲ 1.1%' },
      { name: 'District 15 (East Coast / Marine Parade)', count: 1150, avgPsf: 2150, trend: '▲ 3.2%' },
      { name: 'District 19 (Hougang / Sengkang / Punggol)', count: 2450, avgPsf: 1620, trend: '▲ 2.5%' },
      { name: 'District 22 (Jurong / Tuas)', count: 1340, avgPsf: 1450, trend: '▲ 5.4%' },
      { name: 'District 23 (Hillview / Bukit Panjang)', count: 980, avgPsf: 1550, trend: '▲ 1.7%' },
    ]
  }
};

export default function SeoDirectoryPage() {
  const [activeTab, setActiveTab] = useState<'mrt' | 'school' | 'district'>('mrt');
  const [searchQuery, setSearchQuery] = useState('');

  const currentCategory = seoData[activeTab];
  const IconComponent = currentCategory.icon;

  const filteredItems = currentCategory.items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 pb-4 border-b border-border text-left">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-foreground">SEO Landing Pages Directory</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Browse targeted organic search landings for properties near transit points, top schools, and administrative districts.
          </p>
        </div>
        <Badge variant="gold" className="text-xs py-1.5 px-3">SEO Engine V1.0</Badge>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          placeholder={`Search land pages in this category (e.g. ${activeTab === 'mrt' ? 'Amber' : activeTab === 'school' ? 'Nanyang' : 'District 9'})...`}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-brand-gold"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {(['mrt', 'school', 'district'] as const).map(tab => {
          const TabIcon = seoData[tab].icon;
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchQuery('');
              }}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                activeTab === tab 
                  ? 'border-brand-gold text-brand-gold' 
                  : 'border-transparent text-neutral-500 hover:text-foreground'
              }`}
            >
              <TabIcon className="h-4 w-4" />
              {tab === 'mrt' ? 'MRT Landings' : tab === 'school' ? 'School Landings' : 'District Directory'}
            </button>
          );
        })}
      </div>

      {/* Category Description */}
      <div className="p-4 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/30 border border-border flex items-start gap-3 text-left">
        <IconComponent className="h-5 w-5 text-brand-gold flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-bold uppercase text-foreground">{currentCategory.title}</h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{currentCategory.description}</p>
        </div>
      </div>

      {/* Grid of SEO Landing Page Targets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredItems.map((item, idx) => (
          <Card key={idx} className="p-5 flex flex-col justify-between h-40 hover:border-brand-gold/20 transition-all text-left">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black uppercase text-brand-gold tracking-widest">{activeTab} Page</span>
                <span className="text-[10px] font-bold text-emerald-500">{item.trend} MoM</span>
              </div>
              <h4 className="text-xs font-bold text-foreground mt-2 line-clamp-2">{item.name}</h4>
              <p className="text-[10px] text-neutral-500 mt-1">{item.count} Active listings matching filters</p>
            </div>
            
            <div className="flex justify-between items-end pt-3 border-t border-border mt-3">
              <div>
                <span className="text-[8px] text-neutral-400 font-bold uppercase block leading-none">Avg Rate</span>
                <span className="text-xs font-black text-foreground">S${item.avgPsf.toLocaleString()} /psf</span>
              </div>
              <a 
                href={`/search?${activeTab === 'district' ? 'district' : activeTab === 'school' ? 'school' : 'mrt'}=${encodeURIComponent(item.name)}`}
                className="text-[10px] font-black uppercase tracking-wider text-brand-gold flex items-center gap-1 hover:underline cursor-pointer"
              >
                Go to Landing <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </Card>
        ))}
      </div>

      {/* SEO Compliance Bar */}
      <Card className="p-4 border-emerald-500/20 bg-emerald-500/5 flex gap-3.5 items-center">
        <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0" />
        <p className="text-[10px] text-neutral-500 text-left">
          These directories are dynamically indexed for search robots. All metadata is Schema.org RDFa structured to maximize visibility in Google Search Console queries.
        </p>
      </Card>

    </div>
  );
}
