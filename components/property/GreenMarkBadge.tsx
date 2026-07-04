"use client";

import React from 'react';
import { Leaf } from 'lucide-react';

type GreenMarkRating = 'Platinum' | 'GoldPlus' | 'Gold' | 'Certified' | null;

interface GreenMarkBadgeProps {
  rating: GreenMarkRating;
}

interface TierStyle {
  label: string;
  bg: string;
  text: string;
  border: string;
  iconColor: string;
}

const TIER_STYLES: Record<NonNullable<GreenMarkRating>, TierStyle> = {
  Platinum: {
    label: 'Platinum',
    bg: 'bg-emerald-950/30',
    text: 'text-emerald-300',
    border: 'border-emerald-700/40',
    iconColor: 'text-emerald-300',
  },
  GoldPlus: {
    label: 'Gold Plus',
    bg: 'bg-emerald-900/20',
    text: 'text-emerald-400',
    border: 'border-emerald-600/30',
    iconColor: 'text-emerald-400',
  },
  Gold: {
    label: 'Gold',
    bg: 'bg-green-900/20',
    text: 'text-green-400',
    border: 'border-green-600/30',
    iconColor: 'text-green-400',
  },
  Certified: {
    label: 'Certified',
    bg: 'bg-teal-900/20',
    text: 'text-teal-400',
    border: 'border-teal-600/30',
    iconColor: 'text-teal-400',
  },
};

export function GreenMarkBadge({ rating }: GreenMarkBadgeProps) {
  if (!rating) return null;

  const style = TIER_STYLES[rating];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}
    >
      <Leaf className={`h-3 w-3 ${style.iconColor} flex-shrink-0`} />
      <span>BCA Green Mark</span>
      <span className="opacity-70">·</span>
      <span>{style.label}</span>
    </div>
  );
}
