"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  Bot, Send, Sparkles, Plus, ThumbsUp, MessageSquare, 
  User, CheckCircle, HelpCircle, Shield, ArrowRight, X, Globe, Moon, Sun, ChevronDown
} from 'lucide-react';
import { usePersona } from '../../components/layout/PersonaContext';

const advisorTranslations = {
  EN: {
    headerTitle: "AI Advisor & Expert Community Hub",
    headerDesc: "Access V-RENT's suite of AI portfolio analysis, Agent copywriting Copilot, and the AskGuru community board.",
    workspaceTitle: "Ava Real Estate Copilot",
    workspaceQnaTitle: "AskGuru Expert Community",
    workspaceActive: "AI Active Hub",
    workspaceQnaActive: "Verified Expert Answers",
    tabChat: "🤖 Ava AI Chat",
    tabQna: "💬 AskGuru Experts",
    tabCopilot: "💼 Agent Copilot",
    threadsTitle: "Trending Q&A Threads",
    askBtn: "Ask Question",
    inputPlaceholder: "Type your message to Ava...",
    ready: "Ready"
  },
  ZH: {
    headerTitle: "AI 顾问与专家社区中心",
    headerDesc: "使用 V-RENT 的 AI 投资组合分析、经纪人文案撰写 Copilot 以及 AskGuru 社区问答板块。",
    workspaceTitle: "Ava 房产智能助理",
    workspaceQnaTitle: "AskGuru 专家社区问答",
    workspaceActive: "AI 主动中心",
    workspaceQnaActive: "已验证的专家解答",
    tabChat: "🤖 Ava AI 对话",
    tabQna: "💬 AskGuru 专家",
    tabCopilot: "💼 经纪人 Copilot",
    threadsTitle: "热门问答话题",
    askBtn: "提问问题",
    inputPlaceholder: "输入您的咨询内容...",
    ready: "在线"
  },
  MS: {
    headerTitle: "Hub AI Penasihat & Komuniti Pakar",
    headerDesc: "Akses suite analisis portfolio AI V-RENT, Copilot penulisan Ejen, dan papan komuniti AskGuru.",
    workspaceTitle: "Ava Copilot Hartanah",
    workspaceQnaTitle: "Komuniti Pakar AskGuru",
    workspaceActive: "Hub Aktif AI",
    workspaceQnaActive: "Jawapan Pakar yang Disahkan",
    tabChat: "🤖 Sembang Ava AI",
    tabQna: "💬 Pakar AskGuru",
    tabCopilot: "💼 Copilot Ejen",
    threadsTitle: "Soalan Hangat Komuniti",
    askBtn: "Tanya Soalan",
    inputPlaceholder: "Tulis mesej anda ke Ava...",
    ready: "Sedia"
  },
  TA: {
    headerTitle: "AI ஆலோசகர் & நிபுணர் சமூக மையம்",
    headerDesc: "V-RENT இன் AI போர்ட்ஃபோலியோ பகுப்பாய்வு, முகவர் நகல் எழுதும் கோபிலட் மற்றும் அஸ்குரு சமூக வாரியத்தை அணுகவும்.",
    workspaceTitle: "அவா ரியல் எஸ்டேட் கோபிலட்",
    workspaceQnaTitle: "அஸ்குரு நிபுணர் சமூகம்",
    workspaceActive: "AI செயலில் உள்ள மையம்",
    workspaceQnaActive: "சரிபார்க்கப்பட்ட நிபுணர் பதில்கள்",
    tabChat: "🤖 அவா AI அரட்டை",
    tabQna: "💬 அஸ்குரு நிபுணர்கள்",
    tabCopilot: "💼 முகவர் கோபிலட்",
    threadsTitle: "பிரபலமான கேள்வி-பதில் இழைகள்",
    askBtn: "கேள்வி கேள்",
    inputPlaceholder: "அவாவிடம் உங்கள் செய்தியை தட்டச்சு செய்யவும்...",
    ready: "தயார்"
  }
};

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  structuredCard?: {
    type: 'valuation' | 'recommendation' | 'policy' | 'mrt';
    title: string;
    details: string;
    confidence: string;
    sources: string;
    actionLabel?: string;
  };
}

interface Answer {
  id: string;
  agentName: string;
  agentAvatar: string;
  agentCea: string;
  content: string;
  upvotes: number;
  verified: boolean;
  timestamp: string;
}

interface Question {
  id: string;
  category: string;
  title: string;
  content: string;
  upvotes: number;
  author: string;
  timestamp: string;
  answers: Answer[];
}

function AdvisorPageContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') || 'advisor'; // 'advisor' | 'copilot' | 'qna'

  const [mode, setMode] = useState<'advisor' | 'copilot' | 'qna'>(initialMode as any);

  // Sync mode with URL search parameters to ensure reload stability
  useEffect(() => {
    const queryMode = searchParams.get('mode') || 'advisor';
    if (queryMode === 'advisor' || queryMode === 'copilot' || queryMode === 'qna') {
      setMode(queryMode as any);
    }
  }, [searchParams]);

  const changeMode = (newMode: 'advisor' | 'copilot' | 'qna') => {
    setMode(newMode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', newMode);
      window.history.pushState({}, '', url.pathname + url.search);
    }
  };
  const { language } = usePersona();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const at = (key: keyof typeof advisorTranslations['EN']) => {
    return advisorTranslations[language][key] || advisorTranslations['EN'][key];
  };

  // Q&A Community State
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isPostingModalOpen, setIsPostingModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('ABSD');
  const [newContent, setNewContent] = useState('');
  
  // Selected question detail modal
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  // Initial mock Q&A data
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "q-1",
      category: "ABSD",
      title: "Can I use a trust for my 15-year-old child to buy a condo and avoid ABSD?",
      content: "I want to purchase a second residential property in Singapore for investment purposes. Since ABSD is 20% for citizens on their 2nd property, can I set up a trust for my underage son to buy the unit as his first property to qualify for 0% ABSD?",
      upvotes: 24,
      author: "Jasmine Koh",
      timestamp: "2 hours ago",
      answers: [
        {
          id: "ans-1",
          agentName: "Marcus Lim",
          agentAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
          agentCea: "R058921A",
          content: "Under the latest MAS and IRAS regulations, any transfer of residential property into a living trust is subject to an ABSD (Trust) of 65% upfront. While you can apply for a refund if the child is a Singapore Citizen and holds absolute beneficial ownership, banks will not grant a home loan to a trust with a minor beneficiary. You would need to pay 100% of the property value in cash upfront. Speak to a legal counsel regarding the clawback rules.",
          upvotes: 18,
          verified: true,
          timestamp: "1 hour ago"
        }
      ]
    },
    {
      id: "q-2",
      category: "HDB BTO",
      title: "What happens if we cancel our BTO queue number after booking a flat?",
      content: "My partner and I booked a 4-room BTO in Bedok. However, due to personal reasons, we are considering cancelling it before signing the Agreement for Lease. Will we lose our booking fee, and are we barred from future applications?",
      upvotes: 15,
      author: "Kelvin Ho",
      timestamp: "Yesterday",
      answers: [
        {
          id: "ans-2",
          agentName: "Daniel Teo",
          agentAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
          agentCea: "R049281I",
          content: "If you cancel after booking but before signing the Agreement for Lease, you will forfeit your booking fee (usually S$1,000 to S$2,000 depending on flat type). Additionally, you will be barred from applying for another BTO flat or EC under HDB for 1 year. If you have already received housing grants, you will have to repay them as well. Weigh this decision carefully.",
          upvotes: 12,
          verified: true,
          timestamp: "18 hours ago"
        }
      ]
    },
    {
      id: "q-3",
      category: "Refinancing",
      title: "Should I lock in a fixed rate loan now or choose a floating SORA-pegged rate?",
      content: "My 3-year fixed home loan is expiring next month. Currently, local banks are offering 3.1% fixed rates, while the floating rate based on 3-month compounded SORA is hovering around 3.65%. Which is the safer option for the next 24 months?",
      upvotes: 19,
      author: "Adeline Yeo",
      timestamp: "3 days ago",
      answers: [
        {
          id: "ans-3",
          agentName: "Sherry Tan",
          agentAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80",
          agentCea: "R061483D",
          content: "As global rate cuts begin to settle, SORA rates are expected to experience mild downward pressure over the next 12 months. However, a 3.1% fixed rate is already quite competitive relative to the current SORA. If you prefer payment stability, locking in 3.1% provides peace of mind. If you expect SORA to drop below 2.8% within the year, a floating rate package with a free conversion option is a viable choice.",
          upvotes: 14,
          verified: true,
          timestamp: "2 days ago"
        }
      ]
    }
  ]);

  useEffect(() => {
    // Initial welcome message
    setMessages([
      {
        id: "msg-welcome",
        sender: "assistant",
        content: mode === 'advisor'
          ? "Hello, I'm Ava, your V-RENT Executive Real Estate Advisor. I can analyze Singapore ABSD tax brackets, calculate project lease decay risk, compare regional transaction yields, or evaluate specific listings. How can I help you plan your portfolio today?"
          : "Welcome to Agent Copilot. I can draft high-converting descriptions from listing parameters, generate social captions, review CEA regulatory disclosures, or score lead queries. What description or facts should I draft today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [mode]);

  // Scroll internally within message window container (avoids whole page viewports jumping)
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
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let replyContent = "";
      let structuredCard: ChatMessage['structuredCard'] = undefined;

      const lowerText = text.toLowerCase();

      if (lowerText.includes('absd') || lowerText.includes('stamp')) {
        replyContent = "I've analyzed the current MAS Additional Buyer's Stamp Duty (ABSD) regulations. For a Singapore Citizen upgrading to their 2nd residential property, a 20% ABSD rate applies. For PRs, the rate is 30% for a second property.";
        structuredCard = {
          type: 'policy',
          title: "Singapore ABSD Brackets (2024+)",
          details: "SC: 1st (0%), 2nd (20%), 3rd+ (30%)\nPR: 1st (5%), 2nd (30%), 3rd+ (35%)\nForeigners: 60% flat across all purchases.",
          confidence: "High confidence · Verified against Inland Revenue Authority (IRAS) guidelines",
          sources: "IRAS Circular on Stamp Duty, Q2 2026",
          actionLabel: "Open ABSD Calculator"
        };
      } else if (lowerText.includes('yield') || lowerText.includes('district 15')) {
        replyContent = "Based on recent URA listings, District 15 (Marine Parade / East Coast) properties are yielding averages of 3.8% to 4.2% annually, driven by Thomson-East Coast Line extensions.";
        structuredCard = {
          type: 'recommendation',
          title: "District 15 Investment Summary",
          details: "Average Purchase Price: $2.4M\nMedian PSF: $1,920\nKey Drivers: Dakota MRT, Marine Parade MRT, Katong Park MRT connectivity.",
          confidence: "High confidence · Correlated URA transactional datasets",
          sources: "Urban Redevelopment Authority (URA) Real Estate Information, May 2026",
          actionLabel: "View D15 Properties"
        };
      } else {
        replyContent = mode === 'advisor'
          ? "I've reviewed your request. To provide a precise valuation or portfolio assessment under MAS rules, could you specify the district, property category (HDB vs Condo vs Landed), or tenure requirements?"
          : "Here is a drafted premium description for your listing:\n\n'Presenting a gorgeous, high-floor premium sanctuary. Fully fitted with smart home credentials and walking distance to prime MRT transport loops.'";
      }

      const assistantMsg: ChatMessage = {
        id: `msg-a-${Date.now()}`,
        sender: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        structuredCard
      };

      setMessages(prev => [...prev, assistantMsg]);
    }, 900);
  };

  // Upvote Question
  const handleUpvoteQuestion = (qId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return { ...q, upvotes: q.upvotes + 1 };
      }
      return q;
    }));
  };

  // Upvote Answer
  const handleUpvoteAnswer = (qId: string, aId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          answers: q.answers.map(ans => {
            if (ans.id === aId) {
              return { ...ans, upvotes: ans.upvotes + 1 };
            }
            return ans;
          })
        };
      }
      return q;
    }));

    // Update selected question details modal on upvote
    if (selectedQuestion && selectedQuestion.id === qId) {
      setSelectedQuestion(prev => {
        if (!prev) return null;
        return {
          ...prev,
          answers: prev.answers.map(ans => {
            if (ans.id === aId) {
              return { ...ans, upvotes: ans.upvotes + 1 };
            }
            return ans;
          })
        };
      });
    }
  };

  // Submit new Question
  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newQId = `q-user-${Date.now()}`;
    const newQ: Question = {
      id: newQId,
      category: newCategory,
      title: newTitle,
      content: newContent,
      upvotes: 1,
      author: "You (Demo User)",
      timestamp: "Just now",
      answers: []
    };

    setQuestions(prev => [newQ, ...prev]);
    setNewTitle('');
    setNewContent('');
    setIsPostingModalOpen(false);

    // Simulate verified agent replying 2.5 seconds later!
    setTimeout(() => {
      const mockAnswers = [
        {
          id: `ans-mock-${Date.now()}`,
          agentName: "Sherry Tan",
          agentAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80",
          agentCea: "R061483D",
          content: "Good question! Based on my transactional records, HDB has strict criteria for this. Generally, MAS limits debt ratios via TDSR (55%) and MSR (30%). I suggest checking your combined CPF Ordinary Account balance first to evaluate the maximum leverage you can secure.",
          upvotes: 3,
          verified: true,
          timestamp: "Just now"
        }
      ];

      setQuestions(prev => prev.map(q => {
        if (q.id === newQId) {
          return { ...q, answers: mockAnswers };
        }
        return q;
      }));
    }, 2500);
  };

  const quickChips = mode === 'advisor' 
    ? [
        "Explain current Singapore ABSD rules",
        "What are the rental yields in District 15?",
        "How is HDB Loan MSR ratio calculated?",
      ]
    : [
        "Draft title for 3BR Condo at River Valley",
        "Explain CEA compliance rules for advertising",
        "Draft follow-up email template for hot lead",
      ];

  const categories = ["All", "ABSD", "HDB BTO", "Refinancing", "EC Eligibility", "Rental Guides"];
  const filteredQuestions = activeCategory === 'All' 
    ? questions 
    : questions.filter(q => q.category === activeCategory);

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 overflow-hidden">
      
      {/* 1. LEFT SIDEBAR */}
      <Card className="hidden md:flex w-64 flex-col bg-card border-border p-4 flex-shrink-0 h-full text-left">
        {mode === 'qna' ? (
          /* Q&A CATEGORIES SIDEBAR */
          <div className="flex flex-col h-full justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Trending Guru Topics</span>
              </div>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all duration-150 uppercase tracking-wider block ${
                      activeCategory === cat
                        ? 'text-brand-gold bg-brand-navy-light/10 font-extrabold shadow-sm'
                        : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="gold"
              className="w-full font-bold uppercase tracking-wider text-[10px] py-2"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsPostingModalOpen(true)}
            >
              Ask Community
            </Button>
          </div>
        ) : (
          /* CHAT SESSION HISTORY SIDEBAR */
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Advisor Sessions</span>
              <button className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 cursor-pointer">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              <button className="w-full text-left p-2 rounded-lg text-xs font-bold text-brand-gold bg-brand-navy-light/10 block uppercase tracking-wider">
                Current Analysis Session
              </button>
              <button className="w-full text-left p-2 rounded-lg text-xs text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900 block uppercase tracking-wider">
                D9 Decoupling Enquiry (Jun 25)
              </button>
              <button className="w-full text-left p-2 rounded-lg text-xs text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900 block uppercase tracking-wider">
                Meyer Mansion yields (Jun 12)
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Right Column (combining header and workspace panel vertically!) */}
      <div className="flex-1 flex flex-col h-full gap-4 overflow-hidden">
        {/* 1. TOP HEADER */}
        <div className="text-left space-y-1 pb-4 border-b border-border flex-shrink-0">
          <h1 className="text-xl font-black uppercase tracking-wider text-foreground">
            {at('headerTitle')}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {at('headerDesc')}
          </p>
        </div>

        {/* 2. MAIN WORKSPACE PANEL */}
      <div className="flex-1 flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden relative">
        
        {/* Workspace Mode Header */}
        <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/15 flex-shrink-0">
          <div className="flex items-center gap-3 text-left">
            <div className="h-8 w-8 rounded-full bg-purple-500/10 border border-purple-400 flex items-center justify-center text-purple-400 relative flex-shrink-0">
              <Bot className="h-4 w-4" />
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-card animate-ping"></span>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                {mode === 'qna' ? at('workspaceQnaTitle') : at('workspaceTitle')}
              </h3>
              <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5 block">
                {mode === 'qna' ? at('workspaceQnaActive') : at('workspaceActive')}
              </span>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex border border-border rounded-lg bg-background p-1">
            <button
              onClick={() => changeMode('advisor')}
              className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                mode === 'advisor' 
                  ? 'bg-brand-gold text-brand-navy font-black shadow' 
                  : 'text-neutral-400'
              }`}
            >
              {at('tabChat')}
            </button>
            <button
              onClick={() => changeMode('qna')}
              className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                mode === 'qna' 
                  ? 'bg-brand-gold text-brand-navy font-black shadow' 
                  : 'text-neutral-400'
              }`}
            >
              {at('tabQna')}
            </button>
            <button
              onClick={() => changeMode('copilot')}
              className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                mode === 'copilot' 
                  ? 'bg-brand-gold text-brand-navy font-black shadow' 
                  : 'text-neutral-400'
              }`}
            >
              {at('tabCopilot')}
            </button>
          </div>
        </div>

        {mode === 'qna' ? (
          /* Q&A GURU COMMUNITY MODULE BOARD */
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">{at('threadsTitle')}</h3>
              <Button
                variant="outline"
                size="sm"
                className="md:hidden text-[9px] font-bold uppercase tracking-wider"
                onClick={() => setIsPostingModalOpen(true)}
              >
                {at('askBtn')}
              </Button>
            </div>

            <div className="space-y-4">
              {filteredQuestions.map((q) => (
                <Card 
                  key={q.id} 
                  className="p-5 hover:border-brand-gold/30 cursor-pointer transition-all duration-200 text-left space-y-3"
                  onClick={() => setSelectedQuestion(q)}
                >
                  <div className="flex justify-between items-start">
                    <Badge variant="gold" className="text-[8px] uppercase tracking-wider">{q.category}</Badge>
                    <span className="text-[9px] text-neutral-400 font-bold uppercase">{q.timestamp}</span>
                  </div>

                  <h4 className="text-sm font-black text-foreground hover:text-brand-gold leading-snug transition-colors">
                    {q.title}
                  </h4>
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                    {q.content}
                  </p>

                  <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
                    <span className="text-[9px] text-neutral-400 font-bold uppercase">Asked by: {q.author}</span>
                    
                    <div className="flex items-center gap-3.5">
                      <button
                        onClick={(e) => handleUpvoteQuestion(q.id, e)}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 hover:text-brand-gold transition-colors cursor-pointer"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>{q.upvotes} Upvotes</span>
                      </button>

                      <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-400">
                        <MessageSquare className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{q.answers.length} {q.answers.length === 1 ? 'Answer' : 'Answers'}</span>
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* CHAT ADVISOR / COPILOT PANEL */
          <>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex items-start gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in duration-200`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    msg.sender === 'user' 
                      ? 'bg-neutral-200 dark:bg-neutral-800 text-foreground' 
                      : 'bg-purple-500/10 border border-purple-400 text-purple-400'
                  }`}>
                    {msg.sender === 'user' ? 'U' : <Bot className="h-4.5 w-4.5" />}
                  </div>

                  <div className={`max-w-[70%] space-y-4 ${msg.sender === 'user' ? 'text-right' : ''}`}>
                    <div className={`rounded-xl px-4 py-2.5 text-xs leading-relaxed inline-block ${
                      msg.sender === 'user'
                        ? 'bg-brand-gold text-brand-navy font-semibold text-left'
                        : 'bg-neutral-50 dark:bg-neutral-900 border border-border text-foreground text-left'
                    }`}>
                      {msg.content}
                    </div>

                    {msg.structuredCard && (
                      <Card className="bg-brand-navy-dark text-white border-neutral-800 p-5 space-y-4 text-left">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-gold">{msg.structuredCard.title}</h4>
                          <Badge variant="success" className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Structured Feed
                          </Badge>
                        </div>
                        <pre className="text-xs font-sans whitespace-pre-line text-neutral-300 leading-relaxed">
                          {msg.structuredCard.details}
                        </pre>
                        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[8px] text-neutral-400 font-bold uppercase tracking-widest font-mono">
                          <span>{msg.structuredCard.confidence}</span>
                          <span>Source: {msg.structuredCard.sources}</span>
                        </div>
                      </Card>
                    )}

                    <span className="block text-[9px] text-neutral-400 uppercase font-bold pt-1">{msg.timestamp}</span>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-start gap-4 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-purple-500/10 border border-purple-400 flex items-center justify-center text-purple-400 flex-shrink-0">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                  <div className="bg-neutral-100 dark:bg-neutral-900 rounded-xl px-4 py-2 text-xs text-neutral-400">
                    Ava is compiling market records...
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-neutral-50/20 dark:bg-neutral-950/10 space-y-3 flex-shrink-0">
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin whitespace-nowrap">
                {quickChips.map((chip, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(chip)}
                    className="px-3 py-1.5 border border-border hover:border-brand-gold rounded-full bg-card hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[10px] text-neutral-500 hover:text-foreground font-bold uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={mode === 'advisor' ? "Ask about ABSD calculations, yield averages..." : "Paste specifications to draft..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend(inputText)}
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-xs text-foreground placeholder-neutral-400 focus:outline-none focus:border-brand-gold transition-colors"
                />
                <Button 
                  variant="gold" 
                  className="font-bold text-xs uppercase px-5 py-3 cursor-pointer"
                  onClick={() => handleSend(inputText)}
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  {language === 'TA' ? 'அனுப்பு' : language === 'ZH' ? '发送' : language === 'MS' ? 'Hantar' : 'Send'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>

      {/* 3. POST QUESTION MODAL */}
      {isPostingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 space-y-5 animate-in zoom-in duration-150 text-left bg-card">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Post Community Question</h3>
              <button onClick={() => setIsPostingModalOpen(false)} className="text-neutral-400 hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <div className="space-y-1.5">
                <label className="text-[10px] block">Topic Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Can PR buy resale HDB without 3 years wait?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] block">Select Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold cursor-pointer"
                >
                  <option value="ABSD">ABSD Tax</option>
                  <option value="HDB BTO">HDB BTO / Resale</option>
                  <option value="Refinancing">Mortgages / Refinancing</option>
                  <option value="EC Eligibility">EC Eligibility Rules</option>
                  <option value="Rental Guides">Rental Agreements</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] block">Details Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your property query with specific details (budget, household status) so verified experts can answer precisely..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:border-brand-gold normal-case font-normal"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" type="button" onClick={() => setIsPostingModalOpen(false)}>Cancel</Button>
                <Button variant="gold" type="submit">Submit Question</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 4. QUESTION ANSWERS DETAIL MODAL */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl max-h-[85vh] flex flex-col p-6 space-y-5 animate-in zoom-in duration-150 text-left bg-card overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-border pb-3 flex-shrink-0">
              <div className="space-y-1 text-left">
                <Badge variant="gold" className="text-[8px] uppercase tracking-wider">{selectedQuestion.category}</Badge>
                <h3 className="text-sm font-black text-foreground leading-snug">{selectedQuestion.title}</h3>
              </div>
              <button onClick={() => setSelectedQuestion(null)} className="text-neutral-400 hover:text-foreground p-1 ml-4">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1.5">
              
              {/* Question details description */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border border-border">
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
                  {selectedQuestion.content}
                </p>
                <div className="flex justify-between items-center mt-3 text-[9px] text-neutral-400 font-bold uppercase pt-2 border-t border-border/10">
                  <span>Author: {selectedQuestion.author}</span>
                  <span>{selectedQuestion.timestamp}</span>
                </div>
              </div>

              {/* Answers feed */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  Verified Agent Answers ({selectedQuestion.answers.length})
                </h4>

                {selectedQuestion.answers.length === 0 ? (
                  <p className="text-center py-6 text-xs text-neutral-400">Verified agents are compiling responses. Check back shortly!</p>
                ) : (
                  selectedQuestion.answers.map((ans) => (
                    <Card key={ans.id} className="p-4 border-l-4 border-l-emerald-500 space-y-3">
                      {/* Agent details */}
                      <div className="flex justify-between items-center">
                        <div className="flex gap-3 items-center">
                          <div className="h-9 w-9 rounded-full overflow-hidden bg-neutral-100 flex-shrink-0">
                            <img src={ans.agentAvatar} alt={ans.agentName} className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground flex items-center gap-1">
                              {ans.agentName}
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                            </span>
                            <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block mt-0.5">
                              CEA {ans.agentCea} · Expert
                            </span>
                          </div>
                        </div>
                        <Badge variant="success" className="text-[8px] tracking-wider py-0.5">Verified</Badge>
                      </div>

                      {/* Content */}
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
                        {ans.content}
                      </p>

                      {/* Footer Actions */}
                      <div className="flex justify-between items-center pt-2 border-t border-border/50 text-[9px] text-neutral-400 font-bold uppercase">
                        <span>Answered {ans.timestamp}</span>
                        <button
                          onClick={() => handleUpvoteAnswer(selectedQuestion.id, ans.id)}
                          className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 hover:text-emerald-500 transition-colors cursor-pointer"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          <span>{ans.upvotes} Upvotes</span>
                        </button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="pt-3 border-t border-border flex justify-end flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => setSelectedQuestion(null)}>Close Thread</Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}

export default function AdvisorPage() {
  return (
    <React.Suspense fallback={<div className="text-xs uppercase font-bold text-neutral-400">Loading AI Assistant...</div>}>
      <AdvisorPageContent />
    </React.Suspense>
  );
}
