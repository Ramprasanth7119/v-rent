"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAgentById } from '../../../lib/services/agents';
import { getListings } from '../../../lib/services/properties';
import { Agent } from '../../../lib/mock-data/agents';
import { Property } from '../../../lib/mock-data/properties';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import PropertyCard from '../../../components/property/PropertyCard';
import { Star, ShieldCheck, Mail, Phone, MapPin, MessageSquare, Plus, Check } from 'lucide-react';

interface ClientReview {
  id: string;
  author: string;
  rating: number;
  content: string;
  date: string;
  verifiedTransaction: boolean;
}

function AgentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [listings, setListings] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Reviews state
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewsSubmitted, setReviewsSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    
    Promise.all([
      getAgentById(id),
      getListings()
    ]).then(([agentData, allListings]) => {
      setAgent(agentData);
      setListings(allListings.filter(p => p.agentId === id));
      
      // Load default reviews
      setReviews([
        {
          id: "rev-1",
          author: "Adrian & Jocelyn Tan",
          rating: 5,
          content: `${agentData?.name || 'This agent'} was extremely professional in handling our upgrading process. Helped us negotiate S$40k below valuation and structured our decoupling timeline perfectly. Highly recommended!`,
          date: "2 weeks ago",
          verifiedTransaction: true
        },
        {
          id: "rev-2",
          author: "Linus Cheng",
          rating: 5,
          content: "Fast responses and outstanding market data support. Provided detailed yield projection reports for our District 15 investment acquisition.",
          date: "1 month ago",
          verifiedTransaction: true
        }
      ]);
      setLoading(false);
    });
  }, [id]);

  const handlePostReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewText.trim()) return;

    const newRev: ClientReview = {
      id: `rev-u-${Date.now()}`,
      author: reviewName,
      rating: reviewRating,
      content: reviewText,
      date: "Just now",
      verifiedTransaction: false
    };

    setReviews(prev => [newRev, ...prev]);
    
    // Dynamically adjust agent stats for simulation feel
    if (agent) {
      const newReviewsCount = agent.reviewsCount + 1;
      const newRating = Number(((agent.rating * agent.reviewsCount + reviewRating) / newReviewsCount).toFixed(2));
      setAgent({
        ...agent,
        reviewsCount: newReviewsCount,
        rating: newRating
      });
    }

    setReviewName('');
    setReviewText('');
    setReviewsSubmitted(true);
    
    setTimeout(() => {
      setReviewsSubmitted(false);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="h-8 w-8 rounded-full border-4 border-brand-gold border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Loading Agent Profile Hub...</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-lg font-black uppercase text-foreground">Agent Profile Not Found</h2>
        <Button size="sm" variant="gold" onClick={() => router.push('/agents')}>Back to Directory</Button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 text-left">
      
      {/* 1. AGENT HERO PANEL */}
      <section className="bg-brand-navy-dark text-white rounded-3xl p-6 md:p-8 border border-neutral-800 flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">
        {/* Glow effect background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Profile photo */}
        <div className="h-32 w-32 md:h-36 md:w-36 rounded-2xl overflow-hidden bg-neutral-800 border-2 border-brand-gold flex-shrink-0 relative shadow-2xl">
          <img src={agent.avatar} alt={agent.name} className="h-full w-full object-cover" />
          <div className="absolute bottom-2 right-2 bg-emerald-500 h-3.5 w-3.5 rounded-full ring-2 ring-brand-navy-dark" title="Online Active" />
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="space-y-1.5">
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
              <h1 className="text-2xl font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                {agent.name}
              </h1>
              <ShieldCheck className="h-5 w-5 text-brand-gold" />
              <Badge variant="gold" className="text-[8px] tracking-widest font-black py-0.5">VERIFIED GURU</Badge>
            </div>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest leading-none">
              {agent.agencyName} · {agent.branchName}
            </p>
            <span className="text-[10px] text-neutral-500 block font-mono">CEA Registration No: {agent.ceaNumber}</span>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-bold uppercase">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-brand-gold text-brand-gold" />
              <span className="text-white">{agent.rating} Rating</span>
              <span className="text-neutral-500">({agent.reviewsCount} reviews)</span>
            </div>
            <div className="text-neutral-500">•</div>
            <div className="text-white">{agent.experienceYears} Years Experience</div>
            <div className="text-neutral-500">•</div>
            <div className="text-brand-gold">S${(agent.salesVolumeSGD / 1000000).toFixed(1)}M Vol Closed</div>
          </div>

          <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed normal-case font-normal">
            {agent.bio} Specialized in Singapore regional market restructuring, asset appreciation, and first-time buyer leveraging.
          </p>

          <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
            {agent.specializations.map((spec, idx) => (
              <Badge key={idx} variant="secondary" className="text-[8px] bg-neutral-900 border-neutral-800 text-neutral-300 uppercase font-bold py-0.5">{spec}</Badge>
            ))}
            {agent.languages.map((lang, idx) => (
              <Badge key={`l-${idx}`} variant="gold" className="text-[8px] font-black uppercase py-0.5">🗣️ {lang}</Badge>
            ))}
          </div>

          {/* Action portals */}
          <div className="flex flex-wrap gap-3 pt-3 justify-center md:justify-start">
            <a href={`mailto:${agent.email}`}>
              <Button size="sm" variant="gold" leftIcon={<Mail className="h-4 w-4" />}>Email Agent</Button>
            </a>
            <a href={`tel:${agent.phone.replace(/ /g, '')}`}>
              <Button size="sm" variant="outline" className="text-white border-neutral-800 hover:bg-neutral-800" leftIcon={<Phone className="h-4 w-4" />}>Call {agent.phone}</Button>
            </a>
          </div>
        </div>
      </section>

      {/* 2. BODY CONTENT SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left listings grid (~8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-baseline border-b border-border pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Active Listings ({listings.length})</h2>
            <span className="text-[10px] text-neutral-400 font-bold uppercase">Showing current inventory</span>
          </div>

          {listings.length === 0 ? (
            <Card className="p-12 text-center text-neutral-500 text-xs">
              This agent does not have any active inventory listed on V-RENT today.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {listings.map((p) => (
                <div key={p.id} onClick={() => router.push(`/property/${p.id}`)} className="cursor-pointer hover:scale-[1.01] transition-transform duration-200">
                  <PropertyCard property={p} layout="grid" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right review suite (~4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Write a review */}
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Submit Client Feedback</h3>
            
            {reviewsSubmitted ? (
              <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-center space-y-2">
                <Check className="h-8 w-8 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-[10px] uppercase">Review Submitted</h4>
                <p className="text-[10px] text-neutral-400">Your feedback has been logged. Thank you for rating Marcus.</p>
              </div>
            ) : (
              <form onSubmit={handlePostReview} className="space-y-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <div className="space-y-1.5">
                  <label className="text-[10px] block">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samuel Lim"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold normal-case font-normal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] block">Rating (Stars)</label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold cursor-pointer font-bold"
                  >
                    <option value="5">★★★★★ (5 Stars)</option>
                    <option value="4">★★★★☆ (4 Stars)</option>
                    <option value="3">★★★☆☆ (3 Stars)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] block">Review Details</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe your property transaction experience with this agent..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold normal-case font-normal"
                  />
                </div>

                <Button type="submit" variant="gold" className="w-full font-bold uppercase tracking-wider py-2">
                  Post Review
                </Button>
              </form>
            )}
          </Card>

          {/* Reviews list */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Client Reviews ({reviews.length})</h3>
            <div className="space-y-4">
              {reviews.map((rev) => (
                <Card key={rev.id} className="p-4 space-y-2 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">{rev.author}</span>
                    <span className="text-[9px] text-neutral-400 font-bold uppercase">{rev.date}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-xs text-brand-gold">
                    <Star className="h-3.5 w-3.5 fill-brand-gold text-brand-gold" />
                    <span>{rev.rating}.0 Stars</span>
                    {rev.verifiedTransaction && (
                      <Badge variant="success" className="text-[7px] py-0 px-1 border-emerald-500/20">Verified Deal</Badge>
                    )}
                  </div>

                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal normal-case pt-1">
                    {rev.content}
                  </p>
                </Card>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default function AgentProfilePageWithSuspense() {
  return (
    <React.Suspense fallback={<div className="text-xs uppercase font-bold text-neutral-400">Loading Agent Portal...</div>}>
      <AgentProfilePage />
    </React.Suspense>
  );
}
