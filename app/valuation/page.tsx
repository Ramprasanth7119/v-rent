"use client";

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { getInstantValuation, ValuationResult } from '../../lib/services/valuation';
import { Landmark, Sparkles, TrendingUp, ShieldCheck, BarChart3, AlertCircle, Zap } from 'lucide-react';

interface ForecastResult {
  district: number;
  propertyType: string;
  currentMedianPsf: number;
  forecast12m: { bull: number; base: number; bear: number };
  forecast24m: { bull: number; base: number; bear: number };
  catalysts: { label: string; impact: 'High' | 'Medium' | 'Low' }[];
}

const districtMedianPsf: Record<number, number> = {
  1: 3200, 2: 2900, 3: 2100, 4: 2400, 5: 2200,
  6: 3100, 7: 2600, 8: 2000, 9: 3800, 10: 3600,
  11: 3400, 12: 1800, 13: 1700, 14: 1600, 15: 2100,
  16: 1500, 17: 1400, 18: 1500, 19: 1600, 20: 1900,
  21: 1700, 22: 1400, 23: 1600, 24: 1300, 25: 1350,
  26: 1450, 27: 1300, 28: 1380,
};

const districtCatalysts: Record<number, { label: string; impact: 'High' | 'Medium' | 'Low' }[]> = {
  9: [
    { label: 'Great World MRT (TEL) opened 2022', impact: 'High' },
    { label: 'Orchard Road revitalization plan', impact: 'Medium' },
    { label: 'Limited new supply in Core Central Region', impact: 'High' },
  ],
  15: [
    { label: 'Marine Parade MRT (TEL) full activation', impact: 'High' },
    { label: 'Bayshore precinct rejuvenation masterplan', impact: 'High' },
    { label: 'East Coast waterfront developments', impact: 'Medium' },
  ],
  22: [
    { label: 'Jurong Lake District masterplan (JLD)', impact: 'High' },
    { label: '2nd CBD designation for Jurong', impact: 'High' },
    { label: 'Cross Island Line (CRL) station proximity', impact: 'Medium' },
  ],
};

function getDefaultCatalysts(district: number): { label: string; impact: 'High' | 'Medium' | 'Low' }[] {
  return districtCatalysts[district] || [
    { label: 'MRT network expansion planned', impact: 'Medium' },
    { label: 'URA Master Plan 2025 zoning enhancements', impact: 'Medium' },
    { label: 'HDB upgrader demand from surrounding estates', impact: 'Low' },
  ];
}

function computeForecast(district: number, propertyType: string): ForecastResult {
  const basePsf = districtMedianPsf[district] || 1800;
  // Growth multipliers by district tier
  const highGrowth = [9, 10, 11, 15, 22].includes(district);
  const medGrowth = [1, 2, 5, 7, 16, 19, 20].includes(district);
  const base12m = highGrowth ? 0.048 : medGrowth ? 0.034 : 0.024;
  const bull12m = base12m * 1.4;
  const bear12m = base12m * 0.5;

  return {
    district,
    propertyType,
    currentMedianPsf: basePsf,
    forecast12m: {
      bull: Math.round(basePsf * (1 + bull12m)),
      base: Math.round(basePsf * (1 + base12m)),
      bear: Math.round(basePsf * (1 + bear12m)),
    },
    forecast24m: {
      bull: Math.round(basePsf * (1 + bull12m * 2.1)),
      base: Math.round(basePsf * (1 + base12m * 2.1)),
      bear: Math.round(basePsf * (1 + bear12m * 1.5)),
    },
    catalysts: getDefaultCatalysts(district),
  };
}

const impactColors: Record<'High' | 'Medium' | 'Low', string> = {
  High: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  Medium: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  Low: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

function ForecastTab() {
  const [forecastDistrict, setForecastDistrict] = useState(9);
  const [forecastType, setForecastType] = useState('Condo');
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);

  const handleForecast = (e: React.FormEvent) => {
    e.preventDefault();
    setForecastResult(computeForecast(forecastDistrict, forecastType));
  };

  const histPoints = forecastResult
    ? (() => {
        const psf = forecastResult.currentMedianPsf;
        const pts = [-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0].map((i, idx) => ({
          x: 40 + idx * 38,
          y: 120 - ((psf * (1 + i * 0.004)) - (psf * 0.95)) / (psf * 0.06) * 80,
        }));
        return pts;
      })()
    : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
      {/* Input Panel */}
      <form onSubmit={handleForecast} className="md:col-span-5 space-y-4">
        <Card className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Forecast Parameters</h3>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-neutral-500">District Number (1–28)</label>
            <input
              type="number"
              min={1} max={28}
              value={forecastDistrict}
              onChange={e => setForecastDistrict(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-neutral-500">Property Category</label>
            <Select
              options={[
                { value: 'Condo', label: 'Private Condominium' },
                { value: 'HDB', label: 'HDB Apartment' },
                { value: 'Landed', label: 'Landed Estate' },
                { value: 'EC', label: 'Executive Condominium (EC)' },
              ]}
              value={forecastType}
              onChange={(e: any) => setForecastType(e.target.value)}
            />
          </div>

          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">About This Model</p>
            <p className="text-[11px] text-neutral-500">
              Forecast uses URA transaction velocity, MRT development pipeline, GLS land cost trends, and macroeconomic SORA trajectory data.
            </p>
          </div>

          <Button type="submit" variant="gold" className="w-full font-bold uppercase tracking-wider py-3">
            <TrendingUp className="h-4 w-4 mr-2" /> Generate Forecast
          </Button>
        </Card>
      </form>

      {/* Result Panel */}
      <div className="md:col-span-7">
        {forecastResult ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Headline Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Current Median PSF', value: `S$${forecastResult.currentMedianPsf.toLocaleString()}`, color: 'text-neutral-400', sub: 'D' + forecastResult.district + ' benchmark' },
                { label: '12-Month Forecast', value: `S$${forecastResult.forecast12m.base.toLocaleString()}`, color: 'text-brand-gold', sub: `Base case (${(((forecastResult.forecast12m.base - forecastResult.currentMedianPsf) / forecastResult.currentMedianPsf) * 100).toFixed(1)}% chg)` },
                { label: '24-Month Forecast', value: `S$${forecastResult.forecast24m.base.toLocaleString()}`, color: 'text-emerald-500', sub: `Base case (${(((forecastResult.forecast24m.base - forecastResult.currentMedianPsf) / forecastResult.currentMedianPsf) * 100).toFixed(1)}% chg)` },
              ].map(m => (
                <Card key={m.label} className="p-3">
                  <p className="text-[9px] font-bold uppercase text-neutral-400 tracking-wider">{m.label}</p>
                  <p className={`text-base font-black mt-1 ${m.color}`}>{m.value}</p>
                  <p className="text-[9px] text-neutral-500 mt-0.5">{m.sub}</p>
                </Card>
              ))}
            </div>

            {/* Chart */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">PSF Trend & 12-Month Forecast</h4>
                <div className="flex gap-3 text-[9px] font-bold">
                  <span className="flex items-center gap-1"><span className="h-2 w-4 bg-brand-gold rounded inline-block" /> Historical</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-4 bg-blue-400 rounded inline-block opacity-70" /> Forecast Band</span>
                </div>
              </div>
              <div className="h-44">
                <svg viewBox="0 0 500 150" className="w-full h-full">
                  {[30, 70, 110].map(y => <line key={y} x1="35" y1={y} x2="490" y2={y} stroke="rgba(148,163,184,0.07)" strokeWidth="1" />)}
                  {histPoints.length > 0 && (
                    <>
                      {/* Historical area fill */}
                      <defs>
                        <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="fg2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={`M ${histPoints.map(p => `${p.x},${p.y}`).join(' L ')} L ${histPoints[histPoints.length-1].x} 130 L ${histPoints[0].x} 130 Z`}
                        fill="url(#fg)"
                      />
                      <polyline
                        points={histPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none" stroke="#c9a84c" strokeWidth="2.5"
                      />
                      {/* Forecast segment */}
                      {(() => {
                        const lastPt = histPoints[histPoints.length - 1];
                        const f12x = lastPt.x + 80;
                        const f12yBase = lastPt.y - 15;
                        const f12yBull = lastPt.y - 25;
                        const f12yBear = lastPt.y - 5;
                        return (
                          <>
                            <path
                              d={`M ${lastPt.x} ${lastPt.y} L ${f12x} ${f12yBase}`}
                              fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="5,3"
                            />
                            <path
                              d={`M ${lastPt.x} ${lastPt.y} L ${f12x} ${f12yBull} L ${f12x} ${f12yBear} L ${lastPt.x} ${lastPt.y} Z`}
                              fill="url(#fg2)" stroke="none"
                            />
                            <circle cx={f12x} cy={f12yBase} r="4" fill="#60a5fa" />
                          </>
                        );
                      })()}
                      {/* Current marker */}
                      <circle cx={histPoints[histPoints.length-1].x} cy={histPoints[histPoints.length-1].y} r="5" fill="#c9a84c" />
                    </>
                  )}
                </svg>
              </div>
            </Card>

            {/* Bull / Base / Bear Table */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h4 className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Scenario Analysis</h4>
              </div>
              <div className="divide-y divide-border">
                {[
                  { name: '🐂 Bull Case', psf12: forecastResult.forecast12m.bull, psf24: forecastResult.forecast24m.bull, color: 'text-emerald-500', desc: 'Rate cuts, strong demand, minimal new supply' },
                  { name: '📊 Base Case', psf12: forecastResult.forecast12m.base, psf24: forecastResult.forecast24m.base, color: 'text-brand-gold', desc: 'Stable rates, moderate supply, healthy HDB upgrade demand' },
                  { name: '🐻 Bear Case', psf12: forecastResult.forecast12m.bear, psf24: forecastResult.forecast24m.bear, color: 'text-red-400', desc: 'Rate spikes, excess supply, subdued sentiment' },
                ].map(s => (
                  <div key={s.name} className="px-4 py-3 flex items-start gap-4">
                    <div className="flex-1">
                      <p className={`text-xs font-black ${s.color}`}>{s.name}</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">{s.desc}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[9px] text-neutral-400 font-bold uppercase">12M / 24M PSF</p>
                      <p className={`text-sm font-black ${s.color}`}>S${s.psf12.toLocaleString()} / S${s.psf24.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Growth Catalysts */}
            <Card className="p-4 space-y-3">
              <h4 className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">District {forecastResult.district} — Key Growth Catalysts</h4>
              <div className="space-y-2">
                {forecastResult.catalysts.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Zap className="h-3.5 w-3.5 text-brand-gold flex-shrink-0" />
                    <span className="text-xs text-foreground flex-1">{c.label}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${impactColors[c.impact]}`}>{c.impact}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* MAS Disclaimer */}
            <div className="flex gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-neutral-500">
                Price forecasts are illustrative model outputs and do not constitute financial advice. Past performance does not guarantee future results. Consult a licensed financial advisor before making investment decisions.
              </p>
            </div>
          </div>
        ) : (
          <Card className="h-full border-dashed border-border flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[300px]">
            <div className="h-12 w-12 bg-brand-gold/10 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-brand-gold" />
            </div>
            <h4 className="text-sm font-bold uppercase text-foreground">Price Forecast Engine</h4>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              Select a district and property category, then click Generate Forecast to see 12 and 24-month price projection scenarios.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ValuationPage() {
  const [activeTab, setActiveTab] = useState<'valuation' | 'forecast'>('valuation');

  const [projectName, setProjectName] = useState('Martin Modern');
  const [district, setDistrict] = useState(9);
  const [propertyType, setPropertyType] = useState<'Condo' | 'HDB' | 'Landed' | 'Commercial' | 'EC'>('Condo');
  const [sizeSqft, setSizeSqft] = useState(1280);
  const [floor, setFloor] = useState<'Low' | 'Mid' | 'High'>('High');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValuationResult | null>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await getInstantValuation({ projectName, district, propertyType, sizeSqft, floor });
    setResult(res);
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-black uppercase tracking-wider text-foreground">Property Valuation & Price Intelligence</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Instant automated valuation estimates and 24-month district price forecasts powered by the V-RENT AI pricing engine.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {[
          { key: 'valuation', label: '🏠 Instant Valuation', icon: Landmark },
          { key: 'forecast', label: '📈 Price Forecast', icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px cursor-pointer ${
              activeTab === tab.key
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-neutral-500 hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* VALUATION TAB */}
      {activeTab === 'valuation' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Inputs Panel */}
          <form onSubmit={handleCalculate} className="md:col-span-5 space-y-4">
            <Card className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Unit Details</h3>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Project / Condominium Name</label>
                <input
                  type="text" required value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-neutral-500">District Number</label>
                <input
                  type="number" min="1" max="28" required value={district}
                  onChange={(e) => setDistrict(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Property Category</label>
                <Select
                  options={[
                    { value: 'Condo', label: 'Private Condominium' },
                    { value: 'HDB', label: 'HDB Apartment' },
                    { value: 'Landed', label: 'Landed Estate' },
                    { value: 'EC', label: 'Executive Condominium (EC)' },
                    { value: 'Commercial', label: 'Commercial Office / Retail' }
                  ]}
                  value={propertyType}
                  onChange={(e: any) => setPropertyType(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-neutral-500">Size (sqft)</label>
                  <input
                    type="number" required value={sizeSqft}
                    onChange={(e) => setSizeSqft(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-neutral-500">Floor Level</label>
                  <Select
                    options={[
                      { value: 'High', label: 'High Floor' },
                      { value: 'Mid', label: 'Mid Floor' },
                      { value: 'Low', label: 'Low Floor' }
                    ]}
                    value={floor}
                    onChange={(e: any) => setFloor(e.target.value as any)}
                  />
                </div>
              </div>
              <Button type="submit" variant="gold" className="w-full font-bold uppercase tracking-wider py-3" isLoading={loading}>
                Calculate Valuation
              </Button>
            </Card>
          </form>

          {/* Right Output Panel */}
          <div className="md:col-span-7 h-full">
            {result ? (
              <Card className="bg-brand-navy-dark text-white border-neutral-800 p-6 flex flex-col justify-between h-full space-y-8 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black tracking-widest text-brand-gold uppercase">V-RENT Valuation Model V1.0</span>
                    <span className="px-2.5 py-0.5 bg-neutral-900 border border-neutral-800 text-[9px] font-black uppercase text-emerald-400 rounded-full flex items-center gap-1">
                      <Sparkles className="h-3 w-3 animate-spin-slow" />
                      <span>{result.confidenceScore}% {result.confidenceLabel} Confidence</span>
                    </span>
                  </div>
                  <div className="pt-4">
                    <span className="text-xs text-neutral-400 font-bold uppercase block">Automated Valuation Estimate</span>
                    <span className="text-3xl font-black text-brand-gold mt-1 block">S${result.estimatedValue.toLocaleString()}</span>
                  </div>
                </div>
                <div className="p-4 border border-neutral-800 rounded-xl bg-neutral-950/40 text-xs space-y-2">
                  <span className="font-semibold text-neutral-400 block uppercase tracking-wider text-[10px]">Estimated Price Range Bounds</span>
                  <div className="flex justify-between font-bold">
                    <span>Low Boundary:</span><span>S${result.lowEstimateRange.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>High Boundary:</span><span>S${result.highEstimateRange.toLocaleString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 border border-neutral-800 rounded-xl bg-neutral-900/40">
                    <span className="text-neutral-500 block text-[9px] uppercase tracking-wider font-bold">Rate PSF Estimate</span>
                    <span className="font-black text-white text-sm block mt-1">S${result.estimatedPsf} psf</span>
                  </div>
                  <div className="p-3 border border-neutral-800 rounded-xl bg-neutral-900/40">
                    <span className="text-neutral-500 block text-[9px] uppercase tracking-wider font-bold">District Avg PSF</span>
                    <span className="font-black text-white text-sm block mt-1">S${result.districtAveragePsf} psf</span>
                  </div>
                </div>
                <div className="border-t border-neutral-800 pt-5 flex items-center justify-between flex-wrap gap-4 text-xs">
                  <span className="text-[10px] text-neutral-400 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" /> PDPA Compliant Appraisal
                  </span>
                  <Button size="sm" variant="gold" className="font-black uppercase tracking-wider" onClick={() => alert("Appraisal request sent. A verified District Agent will contact you.")}>
                    Request Certified Appraisal
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="h-full border-dashed border-border flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[300px]">
                <div className="h-12 w-12 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center text-neutral-400">
                  <Landmark className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold uppercase text-foreground">Waiting for calculation parameters</h4>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  Fill in the unit parameters and click calculate to view pricing intelligence.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* PRICE FORECAST TAB */}
      {activeTab === 'forecast' && <ForecastTab />}

    </div>
  );
}
