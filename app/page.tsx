"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, Bot, Sparkles, Map, TrendingUp, Calculator, 
  ArrowRight, Landmark, ArrowUpRight, ShieldCheck, Trophy,
  ThumbsUp, MessageSquare, Plus, User, CheckCircle, HelpCircle,
  Send, ChevronDown, ChevronUp
} from 'lucide-react';
import { useRef } from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { getFeaturedListings } from '../lib/services/properties';
import { Property } from '../lib/mock-data/properties';
import { mockInsights } from '../lib/mock-data/insights';
import PropertyCard from '../components/property/PropertyCard';
import InteractiveSVGMap from '../components/property/InteractiveSVGMap';
import { usePersona } from '../components/layout/PersonaContext';

const homeTranslations = {
  EN: {
    heroBadge: "AI-powered Real Estate Engine",
    heroTitle: "Find. Rent. Manage. Grow.",
    heroPlatform: "Your Complete PropTech Super Platform",
    heroDesc: "unifying residential search, agent CRM pipelines, bank pre-qualification algorithms, and digital portfolio management into a single, high-fidelity secure ecosystem.",
    searchBtn: "Search Engine",
    marketPulse: "V-RENT Market Pulse:",
    gateways: "Super Platform Gateways",
    gatewaysDesc: "Instant shortcuts into specialized real-estate intelligence matrices.",
    hubTitle: "Ava AI & AskGuru Intelligence Hub",
    hubDesc: "Get instant AI calculations or explore verified answers from certified real estate experts.",
    talkAva: "Talk to Ava AI",
    askGuru: "AskGuru Community Q&A",
    chatPlaceholder: "Ask Ava about HDB Resale, ABSD rates, or loan calculators...",
    qnaPlaceholder: "Ask your property query here (e.g. Can PRs buy HDB resale?)...",
    ready: "Ready"
  },
  ZH: {
    heroBadge: "AI 智能房产搜索引擎",
    heroTitle: "寻房 · 租房 · 管理 · 投资",
    heroPlatform: "您的一站式智能房产超级平台",
    heroDesc: "将住宅搜索、经纪人CRM管线、银行贷款预审算法和数字化资产管理整合进一个高保密、安全的生态系统。",
    searchBtn: "搜房引擎",
    marketPulse: "V-RENT 实时市场脉搏:",
    gateways: "超级平台入口",
    gatewaysDesc: "快速访问专业房产情报与分析矩阵。",
    hubTitle: "Ava AI 与 AskGuru 智能中心",
    hubDesc: "获取即时AI贷款计算或浏览认证房产专家的权威解答。",
    talkAva: "咨询 Ava AI 顾问",
    askGuru: "AskGuru 专家问答社区",
    chatPlaceholder: "向 Ava 提问关于HDB转售、ABSD税率或房贷计算器...",
    qnaPlaceholder: "在此输入您的房产问题（例如：永久居民可以购买转售组屋吗？）...",
    ready: "在线"
  },
  MS: {
    heroBadge: "Enjin Hartanah Dikuasakan AI",
    heroTitle: "Cari. Sewa. Urus. Labur.",
    heroPlatform: "Platform Super PropTech Lengkap Anda",
    heroDesc: "menyatukan carian kediaman, ejen CRM, algoritma kelayakan pinjaman bank, dan pengurusan portfolio digital ke dalam satu ekosistem selamat berprestasi tinggi.",
    searchBtn: "Enjin Carian",
    marketPulse: "Denyutan Pasaran V-RENT:",
    gateways: "Pintu Masuk Platform Super",
    gatewaysDesc: "Pintasan pratikal ke dalam maklumat hartanah khusus.",
    hubTitle: "Ava AI & Hub Pintar AskGuru",
    hubDesc: "Dapatkan pengiraan AI segera atau terokai jawapan sah daripada pakar hartanah bertauliah.",
    talkAva: "Hubungi Ava AI",
    askGuru: "Komuniti Soal Jawab AskGuru",
    chatPlaceholder: "Tanya Ava tentang Resale HDB, kadar ABSD, atau kalkulator pinjaman...",
    qnaPlaceholder: "Tulis soalan hartanah anda di sini...",
    ready: "Sedia"
  },
  TA: {
    heroBadge: "AI-ஆல் இயங்கும் ரியல் எஸ்டேட் இயந்திரம்",
    heroTitle: "தேடுங்கள். வாடகைக்கு விடுங்கள். நிர்வகியுங்கள். வளருங்கள்.",
    heroPlatform: "உங்களின் முழுமையான புரோப்டெக் சூப்பர் பிளாட்ஃபார்ம்",
    heroDesc: "குடியிருப்பு தேடல், முகவர் CRM பைப்லைன்கள், வங்கி கடன் தகுதி அல்காரிதம்கள் மற்றும் டிஜிட்டல் போர்ட்ஃபோலியோ மேலாண்மை ஆகியவற்றை ஒரே பாதுகாப்பான சுற்றுச்சூழல் அமைப்பாக இணைக்கிறது.",
    searchBtn: "தேடுபொறி",
    marketPulse: "V-RENT சந்தை துடிப்பு:",
    gateways: "சூப்பர் பிளாட்ஃபார்ம் நுழைவாயில்கள்",
    gatewaysDesc: "ரியல் எஸ்டேட் நுண்ணறிவு குறிகாட்டிகளுக்கான உடனடி குறுக்குவழிகள்.",
    hubTitle: "அவா AI & அஸ்குரு நுண்ணறிவு மையம்",
    hubDesc: "உடனடி AI கணக்கீடுகளைப் பெறுங்கள் அல்லது சான்றளிக்கப்பட்ட ரியல் எஸ்டேட் நிபுணர்களிடமிருந்து சரிபார்க்கப்பட்ட பதில்களை ஆராயுங்கள்.",
    talkAva: "அவா AI-உடன் பேசுங்கள்",
    askGuru: "அஸ்குரு சமூக கேள்வி-பதில்",
    chatPlaceholder: "அவாவிடம் HDB மறுவிற்பனை, ABSD கட்டணம் அல்லது கடன் கால்குலேட்டர்கள் பற்றி கேளுங்கள்...",
    qnaPlaceholder: "உங்கள் சொத்து வினவலை இங்கே கேளுங்கள்...",
    ready: "தயார்"
  }
};

export default function HomePage() {
  const { language } = usePersona();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [featured, setFeatured] = useState<Property[]>([]);
  const [activeSearchTab, setActiveSearchTab] = useState<'Buy' | 'Rent' | 'New Launch'>('Buy');

  // Interactive Home Loan & Budget Slider States
  const [sliderIncome, setSliderIncome] = useState(12000);
  const [sliderSavings, setSliderSavings] = useState(250000);

  // Interactive Chatbot State
  const [chatMessages, setChatMessages] = useState<any[]>([
    { id: '1', sender: 'assistant', content: "Hello! I'm Ava, your V-RENT real estate AI consultant. Feel free to ask me about Singapore ABSD rates, loan calculators (TDSR limits), or district property trends!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatTyping, setChatTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const ht = (key: keyof typeof homeTranslations['EN']) => {
    return homeTranslations[language][key] || homeTranslations['EN'][key];
  };

  // AskGuru Q&A State
  const [qnaCategory, setQnaCategory] = useState('All');
  const [expandedQId, setExpandedQId] = useState<string | null>(null);
  const [qnaInput, setQnaInput] = useState('');
  const [upvotedQIds, setUpvotedQIds] = useState<string[]>([]);
  const [qnaQuestions, setQnaQuestions] = useState<any[]>([
    {
      id: "q-1",
      category: "ABSD",
      title: "Is ABSD payable for my first HDB purchase as a Singapore Citizen?",
      content: "My wife and I are buying our first HDB flat. Do we need to pay any ABSD upfront or is it only applicable for private properties or second properties?",
      upvotes: 42,
      author: "Adeline Tan",
      time: "2 hours ago",
      answer: {
        agentName: "Marcus Lim",
        agentCea: "R058921A",
        agentAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
        content: "No, Singapore Citizens purchasing their first residential property (whether HDB resale, BTO, or private condo) are subject to 0% ABSD. You will only pay the standard Buyer's Stamp Duty (BSD). ABSD is only applicable from your second residential property onwards."
      }
    },
    {
      id: "q-2",
      category: "HDB BTO",
      title: "Can single citizens buy a 3-room HDB BTO flat?",
      content: "I am a single Singapore Citizen turning 35 soon. I know singles can buy 2-room Flexi flats, but has the policy changed to allow us to buy 3-room BTO flats?",
      upvotes: 28,
      author: "Derrick Goh",
      time: "1 day ago",
      answer: {
        agentName: "Daniel Teo",
        agentCea: "R049281I",
        agentAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
        content: "Under the latest HDB BTO rules announced in 2024, eligible single citizens aged 35 and above can now apply for new 2-room Flexi BTO flats in all locations (Standard, Plus, Prime). However, you are still restricted to 2-room flats for BTO. If you want a 3-room or larger flat, you must buy from the HDB Resale market."
      }
    },
    {
      id: "q-3",
      category: "Loans",
      title: "How does the latest MAS cooling measures affect the LTV for bank loans?",
      content: "I am planning to buy a resale executive condo. What is the current maximum Loan-to-Value (LTV) ratio for bank loans, and does it require cash or CPF for downpayment?",
      upvotes: 35,
      author: "Rachel Lee",
      time: "3 days ago",
      answer: {
        agentName: "Sherry Tan",
        agentCea: "R061483D",
        agentAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80",
        content: "For bank loans, the maximum LTV ratio remains at 75% for your first housing loan. This means a minimum 25% downpayment is required, of which at least 5% must be paid in cash. The remaining 20% can be paid using cash and/or your CPF Ordinary Account savings."
      }
    }
  ]);

  // Scroll chatbot internally without shifting outer window viewport
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    handlePresetSubmit(chatInput);
    setChatInput('');
  };

  const handlePresetSubmit = (text: string) => {
    const userMsg = { id: Date.now().toString(), sender: 'user', content: text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatTyping(true);

    setTimeout(() => {
      let reply = "";
      const lower = text.toLowerCase();
      
      if (lower.includes('absd') || lower.includes('stamp duty') || lower.includes('tax')) {
        reply = "Under current IRAS rules, Singapore Citizens pay 0% ABSD on their 1st residential property, 20% on their 2nd, and 30% on their 3rd+. Permanent Residents (PRs) pay 5% on their 1st, 30% on their 2nd, and 35% on their 3rd+. Foreigners pay a flat 60% ABSD. US Citizens and citizens of Iceland, Liechtenstein, Norway, and Switzerland enjoy ABSD treatment similar to SCs under Free Trade Agreements.";
      } else if (lower.includes('loan') || lower.includes('salary') || lower.includes('tdsr') || lower.includes('borrow')) {
        reply = "Singapore bank loans are subject to a maximum 75% LTV (Loan-To-Value) and a 55% TDSR (Total Debt Servicing Ratio) under MAS regulations. For example, if you earn S$10,000/mo and have no other monthly debt obligations, your maximum monthly mortgage installment cannot exceed S$5,500. At a 4% stress-test interest rate over 25 years, this supports an estimated max bank loan of S$1,155,000.";
      } else if (lower.includes('hdb') || lower.includes('bto') || lower.includes('resale') || lower.includes('clementi')) {
        reply = "Clementi 4-Room HDB Resale transactions average S$840,000. Newer blocks near Clementi MRT command up to S$1,050,000 ($980 PSF) due to central location. For new BTOs, the Prime/Plus classification restricts buyers with a 10-year MOP and a subsidy recovery clause.";
      } else {
        reply = "Interesting query! V-RENT's AI is analyzing historical transaction trends and cooling measure frameworks for Singapore districts to match your question. To get complete detail calculations, you can head over to our 'Calculators' tab, or check the 'AI Advisor' tab for a full structural report!";
      }

      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: reply
      }]);
      setChatTyping(false);
    }, 1000);
  };

  const handleQnaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qnaInput.trim()) return;

    const newQuestionId = `q-${Date.now()}`;
    const newQuestion = {
      id: newQuestionId,
      category: "ABSD",
      title: qnaInput,
      content: "No additional details provided. Posted from V-RENT home page.",
      upvotes: 1,
      author: "You (Demo User)",
      time: "Just now",
      answer: null
    };

    setQnaQuestions(prev => [newQuestion, ...prev]);
    const questionText = qnaInput;
    setQnaInput('');
    setExpandedQId(newQuestionId);

    // Simulate agent responding 3 seconds later!
    setTimeout(() => {
      setQnaQuestions(prev => prev.map(q => {
        if (q.id === newQuestionId) {
          return {
            ...q,
            answer: {
              agentName: "Marcus Lim",
              agentCea: "R058921A",
              agentAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
              content: `Great question! Regarding "${questionText}": under Singapore's standard property regulations and CEA guidelines, this is subject to ABSD and cooling measures. We suggest reviewing your options with a registered agent to calculate the exact ABSD offsets or decoupling possibilities. Please reach out to me via my V-RENT mini-website if you need custom assistance!`
            }
          };
        }
        return q;
      }));
    }, 3000);
  };

  const handleUpvote = (qId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (upvotedQIds.includes(qId)) return;

    setQnaQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return { ...q, upvotes: q.upvotes + 1 };
      }
      return q;
    }));
    setUpvotedQIds(prev => [...prev, qId]);
  };

  const searchPlaceholders = [
    "3-bedroom condo near Orchard MRT under $2.5M",
    "Cozy HDB flat in Punggol under $800k with balcony",
    "Luxury Freehold penthouse in Holland Village",
    "Fitted office space near Jurong East MRT for sublet",
  ];

  useEffect(() => {
    // Rotation animation for search bar placeholder text
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % searchPlaceholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load featured properties
    getFeaturedListings().then(res => setFeatured(res.slice(0, 3)));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?query=${encodeURIComponent(searchQuery)}&type=${activeSearchTab}`);
  };

  // Slider calculations under MAS regulations
  const sliderTdsrCap = sliderIncome * 0.55;
  const sliderMaxInstallment = Math.max(0, sliderTdsrCap - 1200); // assume 1200 car/card debt
  const sliderR = 0.04 / 12;
  const sliderN = 25 * 12;
  const sliderMaxLoan = sliderMaxInstallment * (Math.pow(1 + sliderR, sliderN) - 1) / (sliderR * Math.pow(1 + sliderR, sliderN));
  
  const sliderMaxPriceByLtv = sliderMaxLoan / 0.75;
  const sliderMaxPriceBySavings = sliderSavings / 0.25;
  
  const sliderBudget = Math.round(Math.min(sliderMaxPriceByLtv, sliderMaxPriceBySavings));
  const sliderApprovedLoan = Math.round(sliderBudget * 0.75);
  const sliderMinCash = Math.round(sliderBudget * 0.05);
  const sliderCpfDownpayment = Math.round(sliderBudget * 0.20);

  return (
    <div className="space-y-16 pb-20 -mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
      
      {/* 1. HERO SECTION WITH INTEGRATED AI SEARCH */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        {/* Parallax skyline grid background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy-dark via-brand-navy to-brand-navy-light opacity-95 dark:opacity-100 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8 text-white pt-8">
          <Badge variant="gold" className="px-3 py-1 text-[10px] tracking-widest font-black uppercase text-brand-navy">
            {ht('heroBadge')}
          </Badge>
          
          <h1 className={`font-black tracking-tight leading-tight max-w-4xl mx-auto ${language === 'TA' ? 'text-2xl sm:text-4xl' : 'text-4xl sm:text-6xl'}`}>
            {ht('heroTitle')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-amber-300 to-amber-500 font-extrabold">
              {ht('heroPlatform')}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            {ht('heroDesc')}
          </p>

          {/* AI Search Panel */}
          <div className="max-w-3xl mx-auto bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 p-2 rounded-2xl shadow-2xl">
            {/* Quick-toggle Chips */}
            <div className="flex gap-2 mb-2 p-1 bg-black/40 rounded-lg max-w-max">
              {(['Buy', 'Rent', 'New Launch'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSearchTab(tab)}
                  className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                    activeSearchTab === tab
                      ? 'bg-brand-gold text-brand-navy font-black'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Input form */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                  type="text"
                  placeholder={`Try: "${searchPlaceholders[placeholderIndex]}"`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-neutral-950/40 border border-neutral-800 text-sm rounded-xl placeholder-neutral-500 text-white focus:outline-none focus:border-brand-gold transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-brand-gold animate-pulse-slow" />
                  <span className="text-[9px] font-black text-brand-gold uppercase tracking-wider hidden md:inline">Ava AI Active</span>
                </div>
              </div>
              
              <Button variant="gold" type="submit" className="w-full sm:w-auto h-full py-3.5 px-6 font-bold cursor-pointer">
                {ht('searchBtn')}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* 2. LIVE MARKET PULSE STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="bg-card border border-border rounded-xl shadow-md p-4 flex flex-wrap justify-between items-center gap-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{ht('marketPulse')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-neutral-600 dark:text-neutral-400 font-bold">
            <span className="flex items-center gap-1.5">
              Condo Avg PSF D9: <span className="text-foreground font-black">$2,820</span> <span className="text-emerald-500 text-[10px]">▲2.3%</span>
            </span>
            <span className="flex items-center gap-1.5">
              HDB Resale Volume: <span className="text-foreground font-black">2,481 new</span> <span className="text-emerald-500 text-[10px]">▲5.1%</span>
            </span>
            <span className="flex items-center gap-1.5">
              Weighted Prime Yield: <span className="text-foreground font-black">4.25%</span> <span className="text-neutral-500 text-[10px]">Stable</span>
            </span>
            <span className="flex items-center gap-1.5">
              Active Agents: <span className="text-foreground font-black">35,000+ verified</span> <span className="text-brand-gold text-[10px]">CEA Sync</span>
            </span>
          </div>
        </div>
      </section>

      {/* INTERACTIVE BUDGET & HOME LOAN SLIDER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Card className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4 text-left">
            <div>
              <Badge variant="gold" className="text-[9px] uppercase tracking-widest font-black mb-2">Singapore Housing Budget Calculator</Badge>
              <h2 className="text-xl font-black uppercase tracking-wider text-foreground">Interactive Buying Power Estimator</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed max-w-2xl">
                Slide to adjust your household monthly income and savings. V-RENT calculates your maximum purchase budget instantly based on MAS TDSR (55%) and LTV (75%) regulatory constraints.
              </p>
            </div>
            <Link href="/calculator">
              <Button size="sm" variant="outline" className="text-[10px] font-black uppercase tracking-wider py-1 px-3 border-brand-gold/30 text-brand-gold hover:bg-brand-gold/5 cursor-pointer">
                Full Financial Hub →
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
            {/* Input Sliders (7 columns) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Slider 1: Income */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold uppercase text-neutral-400">Monthly Household Income</label>
                  <span className="text-lg font-black text-brand-gold font-mono">S${sliderIncome.toLocaleString()} <span className="text-[10px] text-neutral-400 font-bold">/mo</span></span>
                </div>
                <input 
                  type="range" 
                  min={3000} 
                  max={30000} 
                  step={500} 
                  value={sliderIncome} 
                  onChange={(e) => setSliderIncome(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-brand-gold focus:outline-none"
                />
                <div className="flex justify-between text-[8px] font-mono text-neutral-500 font-bold uppercase">
                  <span>S$3,000</span>
                  <span>S$15,000</span>
                  <span>S$30,000+</span>
                </div>
              </div>

              {/* Slider 2: Savings */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold uppercase text-neutral-400">Combined CPF & Cash Savings</label>
                  <span className="text-lg font-black text-brand-gold font-mono">S${sliderSavings.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min={50000} 
                  max={1500000} 
                  step={10000} 
                  value={sliderSavings} 
                  onChange={(e) => setSliderSavings(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-brand-gold focus:outline-none"
                />
                <div className="flex justify-between text-[8px] font-mono text-neutral-500 font-bold uppercase">
                  <span>S$50,000</span>
                  <span>S$750,000</span>
                  <span>S$1.5M+</span>
                </div>
              </div>

              {/* Slider details info note */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900/30 rounded-xl border border-border text-[9px] text-neutral-500 leading-relaxed normal-case">
                * Note: Assumes 4.0% interest rate stress-test, 25 years loan tenure, 75% LTV bank cap, and S$1,200 existing monthly liabilities. Minimum 5% downpayment must be paid in Cash, the remaining 20% in CPF or Cash.
              </div>
            </div>

            {/* Output Card (5 columns) */}
            <div className="lg:col-span-5">
              <Card className="bg-brand-navy-dark text-white border-brand-gold/20 p-6 flex flex-col justify-between h-72">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-brand-gold font-black uppercase tracking-widest">Buying Limit</span>
                    <Badge variant="ai">MAS Compliant</Badge>
                  </div>
                  <div className="py-2">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase block">Max Property Purchase Price</span>
                    <span className="text-2xl md:text-3xl font-black text-brand-gold mt-1 block font-mono">
                      SGD {sliderBudget.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-neutral-800 pt-4 text-xs font-semibold">
                  <div className="flex justify-between text-[10px] border-b border-neutral-800 pb-1.5">
                    <span className="text-neutral-400 uppercase text-[9px]">Supported Bank Loan (75%):</span>
                    <span className="font-mono">S${sliderApprovedLoan.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] border-b border-neutral-800 pb-1.5">
                    <span className="text-neutral-400 uppercase text-[9px]">Min Cash Downpayment (5%):</span>
                    <span className="font-mono">S${sliderMinCash.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-neutral-400 uppercase text-[9px]">CPF / Cash Downpayment (20%):</span>
                    <span className="font-mono">S${sliderCpfDownpayment.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href={`/search?priceMax=${sliderBudget}`} className="block">
                    <Button variant="gold" className="w-full text-[10px] font-black uppercase tracking-wider py-2">
                      View Properties Under S${(sliderBudget / 1e6).toFixed(2)}M
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </Card>
      </section>

      {/* 3. BENTO GRID OF ENTRY POINTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">{ht('gateways')}</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{ht('gatewaysDesc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Map search - Double Width in Bento */}
          <Card hoverEffect className="md:col-span-2 relative overflow-hidden h-72 flex flex-col justify-between group cursor-pointer" onClick={() => router.push('/map')}>
            <div className="absolute inset-0 bg-neutral-900 opacity-20 group-hover:opacity-10 transition-opacity z-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
            
            {/* Background Graphic */}
            <div className="absolute right-0 bottom-0 top-0 w-full sm:w-3/5 opacity-55 dark:opacity-40 group-hover:scale-105 transition-transform duration-500 pointer-events-none z-0 select-none overflow-hidden py-4 pr-4">
              <InteractiveSVGMap priceHeatmap={true} showMrtLines={true} compact={true} />
            </div>

            <Badge variant="gold" className="max-w-max relative z-20">Map Discovery</Badge>
            
            <div className="relative z-20 space-y-2 text-white">
              <h3 className="text-xl font-black uppercase tracking-wide">Interactive Map Explorer</h3>
              <p className="text-xs text-neutral-300 max-w-md">
                Search visually across Singapore regions. Filter by price density heatmaps, view MRT lines, and inspect listings via sliding property drawers.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-brand-gold font-bold pt-2">
                <span>Open Map Interface</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>

          {/* AI assistant portal */}
          <Card hoverEffect className="relative overflow-hidden h-72 flex flex-col justify-between group cursor-pointer bg-gradient-to-br from-brand-navy to-brand-navy-light text-white border-brand-gold/20" onClick={() => router.push('/advisor')}>
            <div className="absolute top-4 right-4 animate-ping-slow">
              <Sparkles className="h-6 w-6 text-brand-gold" />
            </div>
            
            <Badge variant="ai" className="max-w-max bg-purple-950/60 text-purple-200">System Core</Badge>

            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase tracking-wide">Ava AI Assistant</h3>
              <p className="text-xs text-neutral-300">
                Ask about ABSD calculations, lease decay metrics, historical valuations, or generate premium marketing listings in seconds.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-brand-gold font-bold pt-2">
                <span>Start Consultation</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>

          {/* Mortgage Calculator */}
          <Card hoverEffect className="flex flex-col justify-between h-56 cursor-pointer" onClick={() => router.push('/calculator')}>
            <div className="flex justify-between items-start">
              <div className="p-3 bg-brand-gold/10 rounded-xl text-brand-gold">
                <Calculator className="h-6 w-6" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold uppercase tracking-wider text-foreground">Mortgage & Financial Hub</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Calculate buyer stamp duty (ABSD) fees and test TDSR ratios under MAS guidelines.</p>
            </div>
          </Card>

          {/* Instant Valuation */}
          <Card hoverEffect className="flex flex-col justify-between h-56 cursor-pointer" onClick={() => router.push('/valuation')}>
            <div className="flex justify-between items-start">
              <div className="p-3 bg-brand-gold/10 rounded-xl text-brand-gold">
                <Landmark className="h-6 w-6" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold uppercase tracking-wider text-foreground">Instant Property Valuation</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Input unit specifics and get immediate estimate bounds from transaction databases.</p>
            </div>
          </Card>

          {/* Document Vault */}
          <Card hoverEffect className="flex flex-col justify-between h-56 cursor-pointer" onClick={() => router.push('/vault')}>
            <div className="flex justify-between items-start">
              <div className="p-3 bg-brand-gold/10 rounded-xl text-brand-gold">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold uppercase tracking-wider text-foreground">Secure Document Vault</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Manage digital transaction paperwork, NRIC verifications, and Option to Purchase forms.</p>
            </div>
          </Card>

        </div>
      </section>

      {/* 4. FEATURED LISTINGS CAROUSEL */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">Featured Residences</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Handpicked properties commanding premium yields and verified metadata.</p>
          </div>
          <Link href="/search" className="text-xs font-bold text-brand-gold flex items-center gap-1.5 uppercase hover:underline">
            <span>Explore All Marketplace</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>

      {/* 5. NEIGHBOURHOOD DIRECTORY SPOTLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">District Spotlights</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Quick pricing metrics across core regional growth centers of Singapore.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { district: 'D9', area: 'Orchard', psf: '$2,820 psf', status: '▲ 2.3%', color: 'text-emerald-500' },
            { district: 'D10', area: 'Holland', psf: '$2,440 psf', status: '▲ 1.8%', color: 'text-emerald-500' },
            { district: 'D15', area: 'East Coast', psf: '$1,920 psf', status: '▼ 0.5%', color: 'text-red-400' },
            { district: 'D19', area: 'Punggol', psf: '$1,380 psf', status: '▲ 4.2%', color: 'text-emerald-500' },
            { district: 'D22', area: 'Jurong', psf: '$1,650 psf', status: 'Stable', color: 'text-neutral-400' },
          ].map((d) => (
            <Card key={d.district} className="p-4 flex flex-col justify-between items-center text-center cursor-pointer hover:border-brand-gold/30" onClick={() => router.push(`/search?districts=${d.district.substring(1)}`)}>
              <div className="h-10 w-10 rounded-full bg-brand-gold/10 flex items-center justify-center font-black text-brand-gold text-xs">
                {d.district}
              </div>
              <div className="mt-3">
                <h4 className="text-xs font-bold text-foreground uppercase">{d.area}</h4>
                <p className="text-[10px] text-neutral-400 font-bold uppercase mt-1">{d.psf}</p>
                <span className={`text-[9px] font-bold ${d.color} mt-0.5 block`}>{d.status}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 5.5 AVA AI CHATBOT & ASKGURU Q&A INTEGRATION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">{ht('hubTitle')}</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{ht('hubDesc')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Column 1: Ava AI Chatbot Widget (5 cols) */}
          <Card className="lg:col-span-5 flex flex-col justify-between p-5 border border-border h-[480px] bg-card overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground">{ht('talkAva')}</h4>
                  <p className="text-[8px] text-neutral-400 font-bold uppercase">Real Estate Advisor</p>
                </div>
              </div>
              <Badge variant="ai" className="text-[8px] uppercase tracking-wider font-mono">{ht('ready')}</Badge>
            </div>

            {/* Message Feed */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto my-3 space-y-3 pr-1 text-left text-xs font-medium scrollbar-thin">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl p-3 leading-relaxed transition-all duration-300 ${
                    msg.sender === 'user' 
                      ? 'bg-brand-navy text-white rounded-tr-none dark:bg-brand-gold dark:text-brand-navy' 
                      : 'bg-neutral-50 dark:bg-neutral-900 border border-border text-foreground rounded-tl-none animate-in fade-in slide-in-from-bottom-2 duration-355'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatTyping && (
                <div className="flex justify-start">
                  <div className="bg-neutral-50 dark:bg-neutral-900 border border-border rounded-xl rounded-tl-none p-3 flex gap-1 items-center animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompts & Input */}
            <div className="space-y-3 flex-shrink-0 pt-2 border-t border-border">
              <div className="flex flex-wrap gap-1.5 justify-start">
                {[
                  { label: "📊 ABSD Rates", prompt: "What are the latest ABSD rates for second property?" },
                  { label: "💰 Max Loan", prompt: "How much loan can I get with $10k salary?" },
                  { label: "🏢 Clementi HDB", prompt: "What is the average resale HDB price in Clementi?" }
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => handlePresetSubmit(p.prompt)}
                    className="px-2 py-1 bg-neutral-100 hover:bg-brand-gold/15 dark:bg-neutral-900 border border-border rounded-lg text-[9px] font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask Ava about stamp duties, loan calculations..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  className="flex-grow rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:border-brand-gold text-foreground font-sans font-normal"
                />
                <Button type="submit" variant="gold" size="sm" className="px-3">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </Card>

          {/* Column 2: AskGuru Expert Q&A (7 cols) */}
          <Card className="lg:col-span-7 flex flex-col justify-between p-5 border border-border h-[480px] bg-card overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                  <HelpCircle className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground">AskGuru Community Q&A</h4>
                  <p className="text-[8px] text-neutral-400 font-bold uppercase">Verified Expert Answers</p>
                </div>
              </div>
              
              {/* Category Filter Chips */}
              <div className="flex gap-1">
                {['All', 'ABSD', 'HDB BTO', 'Loans'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setQnaCategory(cat)}
                    className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                      qnaCategory === cat 
                        ? 'bg-brand-gold text-brand-navy' 
                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions Feed */}
            <div className="flex-grow overflow-y-auto my-3 space-y-3 pr-1 text-left">
              {qnaQuestions
                .filter(q => qnaCategory === 'All' || q.category === qnaCategory)
                .map(q => {
                  const isExpanded = expandedQId === q.id;
                  const isUpvoted = upvotedQIds.includes(q.id);
                  return (
                    <div key={q.id} className="p-3.5 border border-border rounded-xl bg-neutral-50/50 dark:bg-neutral-900/10 space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="gold" className="text-[7px] uppercase tracking-wider">{q.category}</Badge>
                            <span className="text-[8px] text-neutral-400 font-bold uppercase">{q.time} · by {q.author}</span>
                          </div>
                          <h5 className="text-xs font-black text-foreground cursor-pointer hover:text-brand-gold transition-colors" onClick={() => setExpandedQId(isExpanded ? null : q.id)}>
                            {q.title}
                          </h5>
                        </div>

                        {/* Upvote button */}
                        <button
                          onClick={(e) => handleUpvote(q.id, e)}
                          className={`flex flex-col items-center p-1 px-2 border rounded-lg transition-colors cursor-pointer ${
                            isUpvoted 
                              ? 'border-brand-gold bg-brand-gold/15 text-brand-gold' 
                              : 'border-border bg-background hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500'
                          }`}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          <span className="text-[8px] font-black font-mono mt-0.5">{q.upvotes}</span>
                        </button>
                      </div>

                      {/* Expandable answers */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-border/80 space-y-3 animate-in fade-in duration-200">
                          <p className="text-[11px] text-neutral-500 font-normal leading-relaxed normal-case font-sans">
                            {q.content}
                          </p>

                          {q.answer ? (
                            <div className="p-3 rounded-lg bg-card border border-border space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                                    <img src={q.answer.agentAvatar} alt={q.answer.agentName} className="h-full w-full object-cover" />
                                  </div>
                                  <div className="text-[9px] font-bold text-foreground">
                                    <span className="block font-black">{q.answer.agentName}</span>
                                    <span className="block text-neutral-400 uppercase">CEA: {q.answer.agentCea}</span>
                                  </div>
                                </div>
                                <Badge variant="success" className="text-[7px] uppercase font-black">Verified Agent</Badge>
                              </div>
                              <p className="text-[10px] text-neutral-600 dark:text-neutral-300 normal-case font-normal leading-relaxed font-sans">
                                {q.answer.content}
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg bg-card border border-dashed border-brand-gold/30 text-center flex items-center justify-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-brand-gold animate-ping" />
                              <span className="text-[9px] font-black uppercase text-brand-gold tracking-wider">Awaiting Verified Expert Responses...</span>
                            </div>
                          )}
                        </div>
                      )}

                      {!isExpanded && (
                        <button onClick={() => setExpandedQId(q.id)} className="text-[9px] font-black text-brand-gold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                          <MessageSquare className="h-3 w-3" /> 
                          {q.answer ? 'Read expert answer →' : 'Expand Details'}
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Ask the experts input form */}
            <form onSubmit={handleQnaSubmit} className="flex gap-2 flex-shrink-0 pt-2 border-t border-border">
              <input
                type="text"
                placeholder="Ask property questions... e.g. How does ABSD affect married couples?"
                value={qnaInput}
                onChange={e => setQnaInput(e.target.value)}
                className="flex-grow rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:border-brand-gold text-foreground font-sans font-normal"
              />
              <Button type="submit" variant="gold" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                Ask Experts
              </Button>
            </form>
          </Card>
        </div>
      </section>

      {/* 6. EDITORIAL BLOG STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">Market Insights</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Regulatory updates and investment research curated by our analysts.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockInsights.slice(0, 3).map((article) => (
            <Card key={article.id} hoverEffect className="p-0 overflow-hidden flex flex-col justify-between h-full">
              <div className="h-40 w-full overflow-hidden bg-neutral-100">
                <img 
                  src={article.coverImage} 
                  alt={article.title} 
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-5 space-y-2 flex-grow">
                <span className="text-[9px] font-black uppercase tracking-widest text-brand-gold">{article.category}</span>
                <h3 className="text-sm font-bold text-foreground line-clamp-1">{article.title}</h3>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">{article.summary}</p>
              </div>
              <div className="px-5 pb-5 pt-3 border-t border-border flex items-center justify-between text-[10px] text-neutral-500 font-bold uppercase">
                <span>{article.author.split(' ')[0]}</span>
                <span>{article.readTime}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 7. AGENT/AGENCY CTA BAND */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-brand-navy dark:bg-neutral-900 border border-neutral-800 text-white p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-brand-gold/10 to-transparent opacity-30"></div>
          <div className="space-y-4 max-w-2xl relative z-10">
            <Badge variant="gold" className="px-2 py-0.5 text-[8px] font-black uppercase">Enterprise SaaS Suite</Badge>
            <h2 className="text-xl md:text-3xl font-black uppercase tracking-wide">Are you a Professional Agent or Agency Manager?</h2>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Unify your pipeline workflow. V-RENT provides branch-level round-robin routing controls, bulk CSV listing uploads, Singpass KYC parsing, and automatic AI-powered description generation.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 relative z-10 w-full md:w-auto">
            <Link href="/auth">
              <Button variant="gold" className="w-full font-bold uppercase tracking-wider cursor-pointer">Register CEA License</Button>
            </Link>
            <Button variant="outline" className="w-full text-white border-neutral-700 hover:bg-neutral-800 font-bold uppercase tracking-wider" onClick={() => router.push('/agent')}>
              Live Agent Sandbox
            </Button>
          </div>
        </div>
      </section>

      {/* 8. TRUST/ENTERPRISE BAND */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-t border-border text-center">
        <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest mb-6">Governed by Institutional Standards</p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-30 dark:opacity-20 select-none">
          <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider">
            <ShieldCheck className="h-5 w-5" />
            <span>PDPA Compliant Vault</span>
          </div>
          <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider">
            <Trophy className="h-5 w-5" />
            <span>CEA Regulated Sync</span>
          </div>
          <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider">
            <Landmark className="h-5 w-5" />
            <span>Singapore Bank API Node</span>
          </div>
        </div>
      </section>

    </div>
  );
}
