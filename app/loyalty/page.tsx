"use client";

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  Trophy, Gift, Award, Share2, Copy, Check, Users, Sparkles, 
  ArrowUpRight, Star, Coins, Zap, ShieldCheck, ChevronRight
} from 'lucide-react';

interface RewardItem {
  id: string;
  title: string;
  pointsCost: number;
  description: string;
  category: 'voucher' | 'credit' | 'cashback';
  image: string;
}

const rewardCatalog: RewardItem[] = [
  {
    id: 'rew-1',
    title: 'S$20 Grab Ride Voucher',
    pointsCost: 2000,
    description: 'Get S$20 off your next Grab ride in Singapore.',
    category: 'voucher',
    image: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=300&h=200&q=80'
  },
  {
    id: 'rew-2',
    title: 'S$50 Capitaland Voucher',
    pointsCost: 4800,
    description: 'Redeem S$50 shopping voucher accepted at all Capitaland Malls.',
    category: 'voucher',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&h=200&q=80'
  },
  {
    id: 'rew-3',
    title: '5x Listing Turbo Boosts',
    pointsCost: 6000,
    description: 'Boost 5 property listings to Turbo visibility for 7 days (Agents only).',
    category: 'credit',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=300&h=200&q=80'
  },
  {
    id: 'rew-4',
    title: 'S$200 HDB Valuation Rebate',
    pointsCost: 15000,
    description: 'Cashback rebate offset against official HDB appraisal valuations.',
    category: 'cashback',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?auto=format&fit=crop&w=300&h=200&q=80'
  },
  {
    id: 'rew-5',
    title: 'S$500 Bank Mortgage Cashback',
    pointsCost: 35000,
    description: 'Get S$500 cash rebate when you apply for refinancing through V-RENT.',
    category: 'cashback',
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=300&h=200&q=80'
  }
];

export default function LoyaltyPage() {
  const [points, setPoints] = useState(6450);
  const [copied, setCopied] = useState(false);
  const [redeemedItem, setRedeemedItem] = useState<string | null>(null);

  const referralCode = "VRENT-SHARE-9812";
  const referralLink = `https://v-rent.sg/register?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRedeem = (item: RewardItem) => {
    if (points < item.pointsCost) {
      alert("Insufficient points balances.");
      return;
    }
    setPoints(prev => prev - item.pointsCost);
    setRedeemedItem(item.title);
    setTimeout(() => setRedeemedItem(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-foreground">Referrals & Loyalty Rewards</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Earn points from property referrals, verified agent reviews, and successful transactions. Redeem for luxury vouchers & cashback.
          </p>
        </div>
        <Badge variant="gold" className="text-xs py-1.5 px-3 flex items-center gap-1">
          <Trophy className="h-3.5 w-3.5" /> Platinum Club Member
        </Badge>
      </div>

      {/* 1. POINTS SCOREBOARD & REFERRAL CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Points Display */}
        <Card className="p-5 flex flex-col justify-between h-44 bg-gradient-to-br from-brand-navy to-brand-navy-light text-white border-brand-gold/15">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-brand-gold">
            <span>My Reward Points</span>
            <Coins className="h-5 w-5 text-brand-gold animate-bounce" />
          </div>
          <div>
            <span className="text-4xl font-black text-white">{points.toLocaleString()}</span>
            <p className="text-[10px] text-neutral-300 font-bold uppercase tracking-wider mt-1.5">
              ≈ S${Math.round(points / 100)} Est. Value in Voucher Credits
            </p>
          </div>
        </Card>

        {/* Quick Referral Actions */}
        <Card className="p-5 md:col-span-2 flex flex-col justify-between h-44">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Share & Earn Points</h4>
              <p className="text-xs text-foreground font-black mt-1">Earn 500 points when friends register & 5,000 points on their first deal!</p>
            </div>
            <Users className="h-5 w-5 text-brand-gold" />
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border border-border bg-neutral-50/50 dark:bg-neutral-900/30 px-3.5 py-2 flex items-center justify-between text-xs min-w-0">
              <span className="font-mono text-neutral-400 truncate">{referralLink}</span>
              <button 
                onClick={handleCopy}
                className="text-brand-gold hover:text-brand-gold/80 flex-shrink-0 cursor-pointer"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <Button variant="gold" className="text-[10px] font-black uppercase tracking-wider px-5" onClick={handleCopy}>
              <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
            </Button>
          </div>
        </Card>
      </div>

      {/* 2. HOW TO EARN POINTS */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">How to earn reward points</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
          {[
            { title: 'Invite Friends', pts: '+500 pts', desc: 'When they complete phone registration.' },
            { title: 'Write Reviews', pts: '+200 pts', desc: 'When you post a verified agent rating review.' },
            { title: 'Close Tenancy', pts: '+2,000 pts', desc: 'For every lease contract signed on V-RENT.' },
            { title: 'Purchase Deal', pts: '+10,000 pts', desc: 'For buying a residential property through our portal.' },
          ].map((act, i) => (
            <Card key={i} className="p-4 flex flex-col justify-between h-32 hover:border-brand-gold/20 transition-all">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">{act.title}</span>
              <div>
                <p className="text-lg font-black text-brand-gold">{act.pts}</p>
                <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">{act.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. REWARDS CATALOGUE */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Rewards Catalogue</h3>
          {redeemedItem && (
            <span className="text-xs font-black uppercase bg-emerald-500/15 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/30 animate-pulse flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Redeemed {redeemedItem}!
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rewardCatalog.map((item) => {
            const canAfford = points >= item.pointsCost;
            return (
              <Card key={item.id} className="p-0 overflow-hidden flex flex-col justify-between hover:border-brand-gold/20 transition-colors h-full">
                <div className="h-36 bg-neutral-100 overflow-hidden relative">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  <span className="absolute bottom-2 left-3 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[9px] font-black uppercase tracking-wider text-brand-gold">
                    {item.pointsCost.toLocaleString()} POINTS
                  </span>
                </div>
                
                <div className="p-4 space-y-2 flex-grow text-left">
                  <span className="text-[8px] font-black uppercase tracking-wider text-neutral-400">{item.category}</span>
                  <h4 className="text-xs font-bold text-foreground line-clamp-1">{item.title}</h4>
                  <p className="text-[10px] text-neutral-500 leading-relaxed line-clamp-2">{item.description}</p>
                </div>

                <div className="px-4 pb-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Cost: {item.pointsCost} pts</span>
                  <Button 
                    size="sm" 
                    variant={canAfford ? 'gold' : 'outline'} 
                    disabled={!canAfford}
                    className="text-[10px] uppercase font-bold tracking-wider py-1.5"
                    onClick={() => handleRedeem(item)}
                  >
                    Redeem Reward
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

    </div>
  );
}
