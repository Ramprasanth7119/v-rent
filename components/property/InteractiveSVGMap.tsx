"use client";

import React, { useState } from 'react';
import { MapPin, Info, Layers, Train } from 'lucide-react';

interface InteractiveSVGMapProps {
  onSelectRegion?: (region: string | null) => void;
  activeRegion?: string | null;
  priceHeatmap?: boolean;
  showMrtLines?: boolean;
  compact?: boolean;
  listings?: any[];
  onSelectProperty?: (property: any) => void;
}

export const InteractiveSVGMap: React.FC<InteractiveSVGMapProps> = ({
  onSelectRegion,
  activeRegion = null,
  priceHeatmap = false,
  showMrtLines = false,
  compact = false,
  listings = [],
  onSelectProperty,
}) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Singapore Regions definition with realistic SVG Paths and coordinates (viewBox 0 0 400 200)
  const regions = [
    {
      id: 'central',
      name: 'Central Region',
      districts: 'D1-D11, D21',
      // Southern/Central core
      path: 'M 135 135 C 140 120, 145 105, 145 95 C 155 98, 170 95, 180 95 C 192 90, 205 100, 220 105 C 230 110, 235 112, 245 115 C 250 120, 252 130, 255 135 C 240 142, 225 145, 215 148 C 195 148, 175 145, 155 140 C 145 138, 140 136, 135 135 Z',
      avgPsf: '$2,450 psf',
      avgRent: '$6,200/mo',
      colorClass: 'fill-[#0B1E3F]/5 dark:fill-[#0B1E3F]/20 hover:fill-brand-gold/20 stroke-neutral-300 dark:stroke-neutral-800',
      heatmapGrad: 'url(#grad-central)',
      center: { x: 190, y: 122 }
    },
    {
      id: 'east',
      name: 'East Region',
      districts: 'D14-D18',
      // Eastern tail
      path: 'M 310 75 C 325 78, 340 82, 350 90 Q 365 92, 375 98 C 382 105, 388 112, 385 120 C 375 128, 355 135, 335 138 C 310 138, 290 138, 270 136 C 255 135 C 252 130, 250 120, 245 115 C 270 115, 280 102, 310 75 Z',
      avgPsf: '$1,920 psf',
      avgRent: '$4,100/mo',
      colorClass: 'fill-[#0B1E3F]/5 dark:fill-[#0B1E3F]/20 hover:fill-brand-gold/20 stroke-neutral-300 dark:stroke-neutral-800',
      heatmapGrad: 'url(#grad-east)',
      center: { x: 315, y: 115 }
    },
    {
      id: 'northeast',
      name: 'North-East Region',
      districts: 'D19, D20, D28',
      // North-Eastern cluster
      path: 'M 220 42 C 235 40, 250 38, 260 40 C 275 42, 288 48, 298 55 C 305 60, 308 68, 310 75 C 300 85, 290 95, 280 102 C 275 108, 272 112, 270 115 C 255 112, 245 110, 235 108 C 220 105, 205 100, 180 95 C 190 90, 200 80, 220 42 Z',
      avgPsf: '$1,550 psf',
      avgRent: '$3,400/mo',
      colorClass: 'fill-[#0B1E3F]/5 dark:fill-[#0B1E3F]/20 hover:fill-brand-gold/20 stroke-neutral-300 dark:stroke-neutral-800',
      heatmapGrad: 'url(#grad-northeast)',
      center: { x: 250, y: 75 }
    },
    {
      id: 'north',
      name: 'North Region',
      districts: 'D25-D27',
      // Northern border
      path: 'M 125 50 C 135 45, 145 35, 155 32 C 170 30, 185 30, 195 32 C 205 32, 215 35, 220 42 C 215 50, 212 60, 208 70 C 200 80, 190 90, 180 95 C 170 95, 155 98, 145 95 C 140 80, 130 70, 125 50 Z',
      avgPsf: '$1,220 psf',
      avgRent: '$2,800/mo',
      colorClass: 'fill-[#0B1E3F]/5 dark:fill-[#0B1E3F]/20 hover:fill-brand-gold/20 stroke-neutral-300 dark:stroke-neutral-800',
      heatmapGrad: 'url(#grad-north)',
      center: { x: 172, y: 56 }
    },
    {
      id: 'west',
      name: 'West Region',
      districts: 'D22-D24',
      // Western industrial/residential hub
      path: 'M 10 110 C 15 90, 30 75, 45 70 C 60 65, 80 50, 95 40 C 105 40, 120 40, 125 50 C 130 70, 140 80, 145 95 C 145 105, 140 120, 135 135 C 125 140, 105 142, 95 135 C 85 130, 70 128, 55 125 C 35 128, 20 125, 10 110 Z',
      avgPsf: '$1,380 psf',
      avgRent: '$3,150/mo',
      colorClass: 'fill-[#0B1E3F]/5 dark:fill-[#0B1E3F]/20 hover:fill-brand-gold/20 stroke-neutral-300 dark:stroke-neutral-800',
      heatmapGrad: 'url(#grad-west)',
      center: { x: 80, y: 95 }
    }
  ];

  // Decorative Islands for extreme realism
  const islands = [
    { id: 'sentosa', parentId: 'central', name: 'Sentosa Island', path: 'M 185 152 C 190 152, 198 153, 203 155 C 205 158, 198 160, 190 160 C 182 160, 180 157, 185 152 Z' },
    { id: 'jurong', parentId: 'west', name: 'Jurong Island', path: 'M 35 138 C 45 138, 55 140, 60 145 C 65 150, 55 155, 45 152 C 35 150, 30 145, 35 138 Z' },
    { id: 'ubin', parentId: 'northeast', name: 'Pulau Ubin', path: 'M 298 50 C 305 48, 315 48, 320 52 C 322 55, 315 58, 308 58 C 300 58, 295 55, 298 50 Z' },
    { id: 'tekong', parentId: 'east', name: 'Pulau Tekong', path: 'M 335 60 C 345 55, 360 58, 368 65 C 372 72, 365 80, 355 82 C 345 82, 332 75, 335 60 Z' }
  ];

  const handleRegionClick = (id: string) => {
    if (onSelectRegion) {
      if (activeRegion === id) {
        onSelectRegion(null);
      } else {
        onSelectRegion(id);
      }
    }
  };

  const getRegionFillValue = (rId: string) => {
    const isSelected = activeRegion === rId;
    const isHovered = hoveredRegion === rId;
    
    if (isSelected) return 'rgba(212, 175, 55, 0.45)'; // Gold selected
    if (isHovered) return 'rgba(212, 175, 55, 0.25)'; // Soft gold hover
    
    if (priceHeatmap) {
      switch (rId) {
        case 'central': return 'rgba(239, 68, 68, 0.75)'; // Red
        case 'east': return 'rgba(249, 115, 22, 0.7)';  // Orange
        case 'northeast': return 'rgba(245, 158, 11, 0.65)'; // Amber
        case 'west': return 'rgba(245, 158, 11, 0.6)'; // Amber-Yellow
        case 'north': return 'rgba(234, 179, 8, 0.5)'; // Yellow
        default: return 'rgba(11, 30, 63, 0.1)';
      }
    }
    
    return 'rgba(11, 30, 63, 0.08)'; // Navy-tinted neutral
  };

  const getRegionStrokeValue = (rId: string) => {
    const isSelected = activeRegion === rId;
    const isHovered = hoveredRegion === rId;
    
    if (isSelected || isHovered) return '#D4AF37'; // Gold
    return '#94a3b8'; // Default slate border
  };

  // Helper to project Singapore Lat/Lng to SVG coordinates
  const projectLatLng = (lat: number, lng: number) => {
    const minLng = 103.58;
    const maxLng = 104.05;
    const minLat = 1.22;
    const maxLat = 1.48;
    
    let x = ((lng - minLng) / (maxLng - minLng)) * 400;
    let y = 180 - (((lat - minLat) / (maxLat - minLat)) * 180);
    
    // Calibrate shifts to match the SVG boundaries
    x = x * 0.88 + 24;
    y = y * 0.8 + 20;
    
    return { x, y };
  };

  return (
    <div className={compact ? "relative w-full h-full flex flex-col overflow-hidden" : "relative border border-border rounded-2xl bg-card p-4 flex flex-col h-full min-h-[380px] overflow-hidden shadow-lg transition-all"}>
      {/* Map Header Indicators */}
      {!compact && (
        <div className="flex justify-between items-center mb-4 z-10 text-left">
          <div className="flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-brand-gold animate-pulse" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">District Density Heatmap</h3>
              <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Singapore Regional Outlines</p>
            </div>
          </div>
          
          {/* Info Tooltip (Glassmorphism) */}
          {hoveredRegion && (
            <div className="px-3 py-1.5 bg-neutral-950/80 backdrop-blur-md border border-neutral-800 text-[10px] font-bold text-white rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150 shadow-xl">
              <Info className="h-3.5 w-3.5 text-brand-gold" />
              <span className="text-neutral-300">{regions.find(r => r.id === hoveredRegion)?.name}</span>
              <span className="text-brand-gold font-mono font-black">{regions.find(r => r.id === hoveredRegion)?.avgPsf}</span>
              <span className="text-neutral-500 font-mono">({regions.find(r => r.id === hoveredRegion)?.avgRent})</span>
            </div>
          )}
        </div>
      )}

      {/* SVG Canvas Workspace */}
      <div className="flex-1 flex items-center justify-center relative w-full h-full">
        {/* Background Subtle Radar Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(212,175,55,0.04)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-60" />

        <svg 
          viewBox="0 0 400 180" 
          className="w-full h-auto max-h-[320px] transition-all filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)] z-10"
        >
          {/* Defs filter glow for transit */}
          <defs>
            <filter id="mrt-glow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Draw Main Regions */}
          <g className="cursor-pointer">
            {regions.map((r) => (
              <path
                key={r.id}
                d={r.path}
                style={{
                  fill: getRegionFillValue(r.id),
                  stroke: getRegionStrokeValue(r.id),
                  strokeWidth: activeRegion === r.id ? 2 : 1,
                  transition: 'all 0.3s ease',
                }}
                className="hover:opacity-90"
                onMouseEnter={() => setHoveredRegion(r.id)}
                onMouseLeave={() => setHoveredRegion(null)}
                onClick={() => handleRegionClick(r.id)}
              />
            ))}
          </g>

          {/* Draw Real Realism Islands */}
          <g className="cursor-pointer opacity-95">
            {islands.map((isl) => (
              <path
                key={isl.id}
                d={isl.path}
                style={{
                  fill: getRegionFillValue(isl.parentId),
                  stroke: getRegionStrokeValue(isl.parentId),
                  strokeWidth: activeRegion === isl.parentId ? 1.5 : 1,
                  transition: 'all 0.3s ease',
                }}
                className="hover:opacity-90"
                onMouseEnter={() => setHoveredRegion(isl.parentId)}
                onMouseLeave={() => setHoveredRegion(null)}
                onClick={() => handleRegionClick(isl.parentId)}
              />
            ))}
          </g>

          {/* Glowing MRT transit lines overlays */}
          {showMrtLines && (
            <g filter="url(#mrt-glow)" strokeWidth="1.2" fill="none" opacity="0.8" className="pointer-events-none animate-in fade-in duration-500">
              {/* East West Line (Green) */}
              <path d="M 15 110 L 45 105 Q 60 100, 75 95 L 110 115 Q 125 125, 145 130 L 180 140 Q 190 142, 200 142 L 210 135 L 240 122 Q 270 122, 295 125 L 330 112 Q 330 98, 330 85" stroke="#10b981" />
              <path d="M 330 112 L 375 118" stroke="#10b981" />
              {/* North South Line (Red) */}
              <path d="M 75 95 Q 78 85, 80 75 Q 100 50, 135 48 L 160 42 Q 185 40, 200 40 L 205 58 Q 205 75, 200 92 L 192 102 Q 185 115, 180 125 L 210 135 L 212 148" stroke="#ef4444" />
              {/* Circle Line (Orange) */}
              <path d="M 180 140 Q 155 125, 145 112 Q 155 90, 180 95 Q 215 95, 228 108 L 240 122 L 210 135" stroke="#f59e0b" strokeWidth="1" />
              {/* North East Line (Purple) */}
              <path d="M 170 145 L 190 138 Q 194 133, 198 128 Q 215 112, 235 100 L 265 85 L 280 70 L 290 52" stroke="#a855f7" />

              {/* Station Indicators */}
              <circle cx="75" cy="95" r="2" fill="#ffffff" stroke="#1f2937" strokeWidth="0.5" />
              <circle cx="160" cy="42" r="2" fill="#ffffff" stroke="#1f2937" strokeWidth="0.5" />
              <circle cx="192" cy="102" r="2" fill="#ffffff" stroke="#1f2937" strokeWidth="0.5" />
              <circle cx="210" cy="135" r="2" fill="#ffffff" stroke="#1f2937" strokeWidth="0.5" />
              <circle cx="290" cy="52" r="2" fill="#ffffff" stroke="#1f2937" strokeWidth="0.5" />
              <circle cx="330" cy="112" r="2" fill="#ffffff" stroke="#1f2937" strokeWidth="0.5" />
              <circle cx="375" cy="118" r="2" fill="#ffffff" stroke="#1f2937" strokeWidth="0.5" />
            </g>
          )}

          {/* Region Text Labels */}
          <g pointerEvents="none" className="select-none font-sans">
            {regions.map((r) => {
              const isSelected = activeRegion === r.id;
              return (
                <g key={r.id} transform={`translate(${r.center.x}, ${r.center.y})`}>
                  <text 
                    textAnchor="middle" 
                    className={`text-[7px] font-black uppercase tracking-wider ${
                      isSelected 
                        ? 'fill-brand-navy dark:fill-brand-navy font-extrabold' 
                        : 'fill-neutral-700 dark:fill-neutral-200 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] dark:drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]'
                    }`}
                  >
                    {r.name.split(' ')[0]}
                  </text>
                  <text 
                    y="7" 
                    textAnchor="middle" 
                    className={`text-[5.5px] font-extrabold ${
                      isSelected 
                        ? 'fill-brand-navy/80 dark:fill-brand-navy/80 font-black' 
                        : 'fill-neutral-500 dark:fill-neutral-400'
                    }`}
                  >
                    {r.districts}
                  </text>
                </g>
              );
            })}
          </g>
          {/* Property Pins */}
          {!compact && listings && listings.length > 0 && (
            <g>
              {listings.map((p) => {
                const { x, y } = projectLatLng(p.coordinates.lat, p.coordinates.lng);
                
                // Keep pins within bounds
                if (x < 0 || x > 400 || y < 0 || y > 180) return null;
                
                const formattedPrice = p.price >= 1e6 
                  ? `S$${(p.price/1e6).toFixed(1)}M` 
                  : `S$${(p.price/1000).toFixed(0)}K`;
                
                return (
                  <g
                    key={p.id}
                    transform={`translate(${x}, ${y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectProperty) onSelectProperty(p);
                    }}
                    className="cursor-pointer group/pin"
                  >
                    <title>{p.title} · {formattedPrice}</title>
                    
                    {/* Glowing background ring */}
                    <circle r="8" className="fill-brand-gold/0 group-hover/pin:fill-brand-gold/20 transition-all duration-300 animate-pulse" />
                    
                    {/* Pin Drop shadow overlay */}
                    <path
                      d="M0 -10 C-3 -10, -5 -8, -5 -5 C-5 -2, 0 0, 0 0 C0 0, 5 -2, 5 -5 C5 -8, 3 -10, 0 -10 Z"
                      className="fill-brand-navy stroke-brand-gold stroke-[0.8] dark:fill-brand-gold dark:stroke-brand-navy drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.35)] transition-transform duration-200 group-hover/pin:scale-125"
                    />
                    
                    {/* Inner core circle */}
                    <circle cy="-5" r="1.5" className="fill-white dark:fill-brand-navy" />
                    
                    {/* Tiny Price Tag overlay shown on hover */}
                    <g className="opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none" transform="translate(0, -15)">
                      <rect x="-24" y="-8" width="48" height="12" rx="3" className="fill-neutral-950/90 stroke-brand-gold stroke-[0.5]" />
                      <text textAnchor="middle" y="0" className="fill-brand-gold text-[6px] font-black font-mono tracking-wider">{formattedPrice}</text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {/* Map Legend (Glassmorphism Layout) */}
        {!compact && (
          <div className="absolute bottom-2 left-2 bg-neutral-950/80 backdrop-blur-md border border-neutral-800/80 rounded-xl p-2.5 flex flex-col gap-1.5 text-[8px] text-neutral-400 uppercase tracking-widest font-black font-mono shadow-2xl z-20">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-gold filter drop-shadow-[0_0_4px_rgba(212,175,55,0.6)]"></span>
              <span className="text-white">Selected Area</span>
            </div>
            {priceHeatmap && (
              <>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-600"></span>
                  <span>$2.2K - $4K+ PSF</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  <span>$1.3K - $2.2K PSF</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-400/50 border border-yellow-400/30"></span>
                  <span>Under $1.3K PSF</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Footer disclaimer */}
      {!compact && (
        <div className="mt-2 text-[9px] text-neutral-500 flex items-center gap-1.5 justify-center z-10">
          <MapPin className="h-3 w-3 text-brand-gold animate-bounce" />
          <span className="font-bold uppercase tracking-wider">Click region to filter property listings instantly.</span>
        </div>
      )}
    </div>
  );
};

export default InteractiveSVGMap;
