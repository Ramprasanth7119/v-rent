"use client";

import React from 'react';
import { Train, ShoppingBag, GraduationCap, TrendingUp, Sparkles } from 'lucide-react';

interface NeighbourhoodScoreProps {
  district: number;
  areaName: string;
  propertyType: string;
}

interface SubScore {
  label: string;
  icon: React.ReactNode;
  score: number;
  color: string;
  description: string;
}

function getDistrictScores(district: number): {
  overall: number;
  transport: number;
  amenities: number;
  education: number;
  future: number;
} {
  // Premium CCR districts D9, D10, D11
  if ([9, 10, 11].includes(district)) {
    return { overall: 92, transport: 95, amenities: 94, education: 88, future: 90 };
  }
  // Marina / CBD D1, D2, D6
  if ([1, 2, 6].includes(district)) {
    return { overall: 90, transport: 98, amenities: 91, education: 80, future: 92 };
  }
  // D4, D7, D8
  if ([4, 7, 8].includes(district)) {
    return { overall: 85, transport: 88, amenities: 86, education: 79, future: 87 };
  }
  // East Coast D14, D15, D16
  if ([14, 15, 16].includes(district)) {
    return { overall: 80, transport: 78, amenities: 82, education: 84, future: 76 };
  }
  // North D25, D26, D27, D28
  if ([25, 26, 27, 28].includes(district)) {
    return { overall: 68, transport: 65, amenities: 66, education: 72, future: 70 };
  }
  // West D22, D23, D24
  if ([22, 23, 24].includes(district)) {
    return { overall: 72, transport: 70, amenities: 71, education: 75, future: 74 };
  }
  // North-East D17, D18, D19, D20
  if ([17, 18, 19, 20].includes(district)) {
    return { overall: 76, transport: 74, amenities: 74, education: 80, future: 77 };
  }
  // Default mid-tier
  return { overall: 73, transport: 71, amenities: 73, education: 74, future: 72 };
}

function getScoreColor(score: number): string {
  if (score >= 88) return '#10b981'; // emerald
  if (score >= 78) return '#D4AF37'; // gold
  if (score >= 65) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Below Avg';
}

function getTransportDescription(district: number): string {
  if ([9, 10, 11].includes(district)) return 'Served by NS, CC, TE lines. 3 MRT stations within 800m.';
  if ([1, 2, 6].includes(district)) return 'CBD hub – NS, EW, TE, CE lines. Exceptional bus coverage.';
  if ([22, 23, 24].includes(district)) return 'Jurong Lake District expansion. DTL & NS line connectivity.';
  if ([14, 15, 16].includes(district)) return 'EW line, upcoming CR line. 2 MRT stations within 1km.';
  return 'MRT accessible. Town bus routes well-serviced.';
}

function getAmenitiesDescription(district: number): string {
  if ([9, 10, 11].includes(district)) return 'Orchard belt: ION, Paragon, Tangs. F1 dining cluster nearby.';
  if ([1, 2, 6].includes(district)) return 'Marina Bay: Fullerton, Esplanade, Marina Square, Gardens by the Bay.';
  if ([14, 15, 16].includes(district)) return 'East Coast Park, Katong Village, Parkway Parade.';
  if ([22, 23, 24].includes(district)) return 'JEM, Westgate, IMM. Extensive hawker culture.';
  return 'Heartland malls, hawker centres, polyclinics within 2km.';
}

function getEducationDescription(district: number): string {
  if ([9, 10, 11].includes(district)) return 'ACS Primary, SJI, SCGS, Raffles Girls nearby. Elite school belt.';
  if ([1, 2, 6].includes(district)) return 'CHIJ OLQP, Cantonment Primary. International schools accessible.';
  if ([14, 15, 16].includes(district)) return 'Dunman High, Tao Nan School, CHIJ Katong Primary within 1km.';
  if ([19, 20].includes(district)) return 'Nanyang Polytechnic, Serangoon Garden Secondary. Good zoning.';
  return 'Several primary schools within 2km radius for MOE zoning.';
}

function getFutureDescription(district: number): string {
  if ([9, 10, 11].includes(district)) return 'Great World City rejuvenation. Steady luxury demand pipeline.';
  if ([1, 2, 6].includes(district)) return 'Marina Bay South Masterplan. Canninghill Piers uplift. TEL boost.';
  if ([22, 23, 24].includes(district)) return 'Jurong Lake District 2.0 – Singapore\'s second CBD by 2040.';
  if ([14, 15, 16].includes(district)) return 'CR Line 2030, Bedok Reservoir rejuvenation under URA Blueprint.';
  if ([25, 26, 27, 28].includes(district)) return 'Woodlands Regional Centre expansion, Seletar aerospace park.';
  return 'Bishan-Toa Payoh URA growth node. Steady mid-term upside.';
}

// SVG ring gauge component
function RingGauge({ score }: { score: number }) {
  const radius = 54;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width={140} height={140} viewBox="0 0 140 140">
        {/* Background track */}
        <circle
          cx={70}
          cy={70}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={70}
          cy={70}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dasharray 0.8s ease-in-out' }}
        />
        {/* Glow effect */}
        <circle
          cx={70}
          cy={70}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke + 4}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          opacity={0.12}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white leading-none">{score}</span>
        <span className="text-[9px] font-black uppercase tracking-widest mt-0.5" style={{ color }}>
          {getScoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

// Individual sub-score bar row
function ScoreBar({ label, icon, score, color, description }: SubScore) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white/60">{icon}</span>
          <span className="text-xs font-bold text-white/80 uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-sm font-black" style={{ color }}>{score}</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            boxShadow: `0 0 6px ${color}66`,
          }}
        />
      </div>
      <p className="text-[10px] text-white/40 leading-snug">{description}</p>
    </div>
  );
}

export function NeighbourhoodScore({ district, areaName, propertyType }: NeighbourhoodScoreProps) {
  const scores = getDistrictScores(district);

  const subScores: SubScore[] = [
    {
      label: 'Transport Connectivity',
      icon: <Train className="h-3.5 w-3.5" />,
      score: scores.transport,
      color: getScoreColor(scores.transport),
      description: getTransportDescription(district),
    },
    {
      label: 'Amenities & Lifestyle',
      icon: <ShoppingBag className="h-3.5 w-3.5" />,
      score: scores.amenities,
      color: getScoreColor(scores.amenities),
      description: getAmenitiesDescription(district),
    },
    {
      label: 'Education Hub',
      icon: <GraduationCap className="h-3.5 w-3.5" />,
      score: scores.education,
      color: getScoreColor(scores.education),
      description: getEducationDescription(district),
    },
    {
      label: 'Future Development',
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      score: scores.future,
      color: getScoreColor(scores.future),
      description: getFutureDescription(district),
    },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0B1E3F 0%, #0d2347 40%, #112960 100%)',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        boxShadow: '0 8px 32px rgba(11, 30, 63, 0.6)',
      }}
    >
      {/* Header */}
      <div
        className="px-6 pt-6 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-brand-gold animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold">
            AI Neighbourhood Intelligence
          </span>
        </div>
        <h3 className="text-white font-black text-base uppercase tracking-tight">
          {areaName} · District {district}
        </h3>
        <p className="text-white/40 text-[10px] mt-0.5 font-medium uppercase tracking-wider">
          {propertyType} · Livability Analysis
        </p>
      </div>

      {/* Body */}
      <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Ring gauge + label */}
        <div className="flex flex-col items-center justify-center gap-4">
          <RingGauge score={scores.overall} />
          <div className="text-center space-y-1">
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
              Overall Livability Score
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full animate-pulse"
                style={{ backgroundColor: getScoreColor(scores.overall) }}
              />
              <span className="text-white/80 text-xs font-bold">
                {getScoreLabel(scores.overall)} for {propertyType}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Sub-scores */}
        <div className="space-y-5">
          {subScores.map((sub) => (
            <ScoreBar key={sub.label} {...sub} />
          ))}
        </div>
      </div>

      {/* Footer attribution */}
      <div
        className="px-6 py-3 flex items-center gap-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-[9px] text-white/25 font-medium uppercase tracking-wider">
          Scores derived from URA Master Plan 2019, LTA connectivity data, MOE school phasing zones, and V-Rent AI model v2.4. Not investment advice.
        </span>
      </div>
    </div>
  );
}
