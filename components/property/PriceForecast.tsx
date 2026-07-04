"use client";

import React, { useState } from 'react';
import { TrendingUp, Zap, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface PriceForecastProps {
  district: number;
  propertyType: string;
  currentPsf: number;
}

interface Catalyst {
  title: string;
  impact: 'High' | 'Medium' | 'Low';
  eta: string;
  description: string;
}

function getCatalysts(district: number): Catalyst[] {
  const base: Catalyst[] = [
    {
      title: 'MAS Cooling Measure Review',
      impact: 'High',
      eta: 'Q1 2027',
      description: 'Potential ABSD rate adjustment for Singapore citizens; historically drives 4–6% demand surge.',
    },
    {
      title: 'URA Blueprint 2025 Rezoning',
      impact: 'Medium',
      eta: 'Q3 2027',
      description: 'New mixed-use zones uplift adjacent residential values by an estimated 3–5% over 24 months.',
    },
  ];

  if ([1, 2, 6, 9, 10, 11].includes(district)) {
    return [
      {
        title: 'Marina Bay South Masterplan',
        impact: 'High',
        eta: 'Q2 2027',
        description: '29ha waterfront precinct launch expected to generate 6–9% CCR-wide premium uplift.',
      },
      {
        title: 'TEL Phase 4 – Orchard Extension',
        impact: 'High',
        eta: 'Q4 2026',
        description: 'Thomson-East Coast Line Orchard connectivity boosts last-mile MRT access by 40%.',
      },
      ...base,
    ];
  }
  if ([22, 23, 24].includes(district)) {
    return [
      {
        title: 'Jurong Lake District 2.0',
        impact: 'High',
        eta: 'Q3 2027',
        description: 'Singapore\'s second CBD designation; projected +8–12% residential premium within 2km.',
      },
      {
        title: 'JLD MRT Interchange Opening',
        impact: 'High',
        eta: 'Q1 2027',
        description: 'New interchange station creates unprecedented transit node; drives 5–7% lift nearby.',
      },
      ...base,
    ];
  }
  if ([14, 15, 16].includes(district)) {
    return [
      {
        title: 'Cross Island Line (CRL) Launch',
        impact: 'High',
        eta: 'Q2 2030',
        description: 'CRL stage 1 connects East Coast to Changi. Anticipatory premium begins 24 months pre-opening.',
      },
      {
        title: 'East Coast Park Revitalisation',
        impact: 'Medium',
        eta: 'Q4 2027',
        description: 'NEA masterplan adds 8km of new cycling infrastructure and F&B promenade.',
      },
      ...base,
    ];
  }
  if ([25, 26, 27, 28].includes(district)) {
    return [
      {
        title: 'Woodlands Regional Centre Expansion',
        impact: 'High',
        eta: 'Q2 2028',
        description: 'New commercial GFA of 700,000 sqm drives employment and residential demand northward.',
      },
      {
        title: 'RTS Link Singapore–JB',
        impact: 'High',
        eta: 'Q4 2026',
        description: 'Johor Bahru rapid transit link positions Woodlands as key cross-border gateway.',
      },
      ...base,
    ];
  }
  return base;
}

// Generate historical PSF data (past 12 months)
function generateHistoricalData(currentPsf: number): number[] {
  const base = currentPsf * 0.92;
  const noise = [0, 0.5, 1.2, 0.8, 1.8, 2.1, 1.5, 2.8, 3.0, 3.5, 4.2, 5.0];
  return noise.map((n) => Math.round(base + (base * n) / 100));
}

// Generate forecast data (next 12 months) — base, bull, bear
function generateForecastData(currentPsf: number): {
  base: number[];
  bull: number[];
  bear: number[];
} {
  const baseGrowth = [0.5, 0.9, 1.3, 1.7, 2.0, 2.4, 2.8, 3.2, 3.6, 3.9, 4.3, 4.5];
  const bullBonus = 1.3;
  const bearPenalty = 0.6;
  return {
    base: baseGrowth.map((g) => Math.round(currentPsf * (1 + g / 100))),
    bull: baseGrowth.map((g) => Math.round(currentPsf * (1 + (g * bullBonus) / 100))),
    bear: baseGrowth.map((g) => Math.round(currentPsf * (1 + (g * bearPenalty) / 100))),
  };
}

const MONTHS_HIST = ['Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26'];
const MONTHS_FORE = ['Jul 26', 'Aug 26', 'Sep 26', 'Oct 26', 'Nov 26', 'Dec 26', 'Jan 27', 'Feb 27', 'Mar 27', 'Apr 27', 'May 27', 'Jun 27'];

function toSvgPoints(
  values: number[],
  minVal: number,
  maxVal: number,
  startX: number,
  stepX: number,
  chartHeight: number,
  topPad: number
): string {
  return values
    .map((v, i) => {
      const x = startX + i * stepX;
      const y = topPad + chartHeight - ((v - minVal) / (maxVal - minVal)) * chartHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function toSvgPath(points: string): string {
  const pts = points.split(' ');
  if (pts.length === 0) return '';
  return `M ${pts[0]} ` + pts.slice(1).map((p) => `L ${p}`).join(' ');
}

const impactColors: Record<string, string> = {
  High: 'text-red-400 bg-red-500/10 border-red-500/20',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

export function PriceForecast({ district, propertyType, currentPsf }: PriceForecastProps) {
  const [showCatalysts, setShowCatalysts] = useState(true);
  const historical = generateHistoricalData(currentPsf);
  const forecast = generateForecastData(currentPsf);
  const catalysts = getCatalysts(district);

  // Combine all values to determine chart scale
  const allValues = [...historical, ...forecast.bull, ...forecast.bear];
  const minVal = Math.floor(Math.min(...allValues) * 0.993);
  const maxVal = Math.ceil(Math.max(...allValues) * 1.003);

  // SVG layout constants
  const SVG_W = 560;
  const SVG_H = 220;
  const LEFT_PAD = 52;
  const RIGHT_PAD = 16;
  const TOP_PAD = 16;
  const BOT_PAD = 36;
  const chartW = SVG_W - LEFT_PAD - RIGHT_PAD;
  const chartH = SVG_H - TOP_PAD - BOT_PAD;

  // Historical: 12 points (indices 0–11)
  const totalPoints = 24; // 12 hist + 12 fore
  const stepX = chartW / (totalPoints - 1);

  const histPoints = historical.map((v, i) => {
    const x = LEFT_PAD + i * stepX;
    const y = TOP_PAD + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
    return { x, y };
  });

  const foreBasePoints = forecast.base.map((v, i) => {
    const x = LEFT_PAD + (12 + i) * stepX;
    const y = TOP_PAD + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
    return { x, y };
  });

  const foreBullPoints = forecast.bull.map((v, i) => {
    const x = LEFT_PAD + (12 + i) * stepX;
    const y = TOP_PAD + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
    return { x, y };
  });

  const foreBearPoints = forecast.bear.map((v, i) => {
    const x = LEFT_PAD + (12 + i) * stepX;
    const y = TOP_PAD + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
    return { x, y };
  });

  // Build SVG path strings
  const histPath = `M ${histPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
  const foreBasePath = `M ${histPoints[11].x.toFixed(1)},${histPoints[11].y.toFixed(1)} L ${foreBasePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;

  // Confidence band polygon (bull top, bear bottom, reversed)
  const bandTop = [histPoints[11], ...foreBullPoints];
  const bandBottom = [...foreBearPoints].reverse();
  const bandPolygon = [
    ...bandTop.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    ...bandBottom.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
  ].join(' ');

  // Y axis grid lines (3 levels)
  const gridLevels = [0.25, 0.5, 0.75, 1.0].map((frac) => ({
    y: TOP_PAD + chartH * (1 - frac),
    label: `$${Math.round(minVal + (maxVal - minVal) * frac).toLocaleString()}`,
  }));

  // X axis labels: show every 3rd
  const allLabels = [...MONTHS_HIST, ...MONTHS_FORE];

  // Projection callouts
  const psf12Bull = forecast.bull[11];
  const psf12Bear = forecast.bear[11];
  const psf24Bull = forecast.bull[11]; // same array but label 24-month
  const pct12Bull = (((psf12Bull - currentPsf) / currentPsf) * 100).toFixed(1);
  const pct12Bear = (((psf12Bear - currentPsf) / currentPsf) * 100).toFixed(1);

  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-lg">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-brand-gold" />
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold">
              V-Rent AI Price Forecast Engine
            </span>
          </div>
          <h3 className="text-sm font-black uppercase tracking-tight text-foreground">
            24-Month PSF Projection · District {district} {propertyType}
          </h3>
        </div>
        {/* Summary chips */}
        <div className="flex gap-2 flex-wrap">
          <div className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-bold uppercase tracking-wider">
            12M Bull: +{pct12Bull}%
          </div>
          <div className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400 font-bold uppercase tracking-wider">
            12M Bear: +{pct12Bear}%
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="px-4 pt-4 pb-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          style={{ minWidth: 340, height: 220 }}
          aria-label="Price forecast chart"
        >
          {/* Grid lines */}
          {gridLevels.map((gl, i) => (
            <g key={i}>
              <line
                x1={LEFT_PAD}
                y1={gl.y}
                x2={SVG_W - RIGHT_PAD}
                y2={gl.y}
                stroke="rgba(148,163,184,0.12)"
                strokeWidth={1}
              />
              <text
                x={LEFT_PAD - 4}
                y={gl.y + 4}
                textAnchor="end"
                className="fill-neutral-400"
                style={{ fontSize: 8, fontWeight: 700, fontFamily: 'monospace' }}
              >
                {gl.label}
              </text>
            </g>
          ))}

          {/* Divider line between historical and forecast */}
          <line
            x1={LEFT_PAD + 11 * stepX}
            y1={TOP_PAD - 4}
            x2={LEFT_PAD + 11 * stepX}
            y2={TOP_PAD + chartH + 4}
            stroke="rgba(212,175,55,0.25)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text
            x={LEFT_PAD + 11 * stepX + 4}
            y={TOP_PAD + 10}
            className="fill-brand-gold"
            style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '0.08em', fill: '#D4AF37' }}
          >
            FORECAST ›
          </text>
          <text
            x={LEFT_PAD + 11 * stepX - 6}
            y={TOP_PAD + 10}
            textAnchor="end"
            style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '0.08em', fill: 'rgba(148,163,184,0.6)' }}
          >
            ‹ HISTORICAL
          </text>

          {/* Confidence band polygon */}
          <polygon
            points={bandPolygon}
            fill="#D4AF37"
            fillOpacity={0.07}
          />

          {/* Bull line (dashed) */}
          <polyline
            points={[histPoints[11], ...foreBullPoints]
              .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
              .join(' ')}
            fill="none"
            stroke="#10b981"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            strokeOpacity={0.7}
          />

          {/* Bear line (dashed) */}
          <polyline
            points={[histPoints[11], ...foreBearPoints]
              .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
              .join(' ')}
            fill="none"
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            strokeOpacity={0.7}
          />

          {/* Base forecast line (dashed gold) */}
          <path
            d={foreBasePath}
            fill="none"
            stroke="#D4AF37"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            strokeLinecap="round"
          />

          {/* Historical solid gold line */}
          <path
            d={histPath}
            fill="none"
            stroke="#D4AF37"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Historical data points */}
          {histPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="#0B1E3F" stroke="#D4AF37" strokeWidth={2} />
          ))}

          {/* Forecast base end point */}
          {foreBasePoints[11] && (
            <circle
              cx={foreBasePoints[11].x}
              cy={foreBasePoints[11].y}
              r={4}
              fill="#D4AF37"
              stroke="#0B1E3F"
              strokeWidth={2}
            />
          )}

          {/* X axis labels */}
          {allLabels.map((label, i) => {
            if (i % 3 !== 0 && i !== 23) return null;
            const x = LEFT_PAD + i * stepX;
            return (
              <text
                key={i}
                x={x}
                y={SVG_H - 6}
                textAnchor="middle"
                style={{ fontSize: 7.5, fill: 'rgba(148,163,184,0.7)', fontWeight: 700 }}
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="px-6 pb-4 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-brand-gold rounded" />
          <span>Historical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 border-t-2 border-brand-gold border-dashed" />
          <span>Base Case</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 border-t-2 border-emerald-400 border-dashed" />
          <span>Bull Case</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 border-t-2 border-red-400 border-dashed" />
          <span>Bear Case</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded-sm bg-brand-gold/10 border border-brand-gold/20" />
          <span>Confidence Band</span>
        </div>
      </div>

      {/* Projection summary boxes */}
      <div className="px-6 pb-5 grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl border border-border bg-neutral-50/5 space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">12-Month Projection</span>
          <div className="text-lg font-black text-foreground">
            S${psf12Bear.toLocaleString()}–${psf12Bull.toLocaleString()} <span className="text-xs text-neutral-400 font-normal">/psf</span>
          </div>
          <div className="text-xs font-bold text-emerald-400">+{pct12Bear}% to +{pct12Bull}% range</div>
        </div>
        <div className="p-4 rounded-xl border border-brand-gold/20 bg-brand-gold/5 space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-brand-gold">24-Month Projection</span>
          <div className="text-lg font-black text-foreground">
            S${Math.round(currentPsf * 1.065).toLocaleString()}–${Math.round(currentPsf * 1.112).toLocaleString()} <span className="text-xs text-neutral-400 font-normal">/psf</span>
          </div>
          <div className="text-xs font-bold text-brand-gold">+6.5% to +11.2% range</div>
        </div>
      </div>

      {/* Growth Catalysts */}
      <div className="px-6 pb-5 border-t border-border pt-5">
        <button
          onClick={() => setShowCatalysts(!showCatalysts)}
          className="w-full flex items-center justify-between mb-4 group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand-gold" />
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              Key Growth Catalysts
            </span>
            <span className="text-[9px] text-neutral-400 font-bold uppercase">{catalysts.length} identified</span>
          </div>
          {showCatalysts ? (
            <ChevronUp className="h-4 w-4 text-neutral-400 group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="h-4 w-4 text-neutral-400 group-hover:text-foreground transition-colors" />
          )}
        </button>

        {showCatalysts && (
          <div className="space-y-3">
            {catalysts.map((cat, i) => (
              <div
                key={i}
                className="flex gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-neutral-50/5 transition-colors"
              >
                <div className="pt-0.5">
                  <Zap className="h-3.5 w-3.5 text-brand-gold flex-shrink-0" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold text-foreground">{cat.title}</span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${impactColors[cat.impact]}`}
                    >
                      {cat.impact} Impact
                    </span>
                    <span className="text-[9px] text-neutral-400 font-bold uppercase">{cat.eta}</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-snug">{cat.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MAS Disclaimer */}
      <div className="px-6 py-3 border-t border-border flex items-start gap-2">
        <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-[9px] text-neutral-400 leading-snug">
          <strong className="text-amber-400">MAS Disclaimer:</strong> Price forecasts are generated by V-Rent AI models using historical URA caveats, macroeconomic indicators, and sentiment analysis. They do not constitute financial or investment advice under the Financial Advisers Act (Cap. 110). Past performance is not indicative of future results. Consult a licensed financial adviser before making any property investment decision.
        </p>
      </div>
    </div>
  );
}
