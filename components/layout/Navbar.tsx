"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Compass, Bot, Calculator, Search, FileText, ArrowRight, User, Menu, X, 
  Landmark, Sun, Moon, ClipboardList, Building2, Home, Wrench, ChevronDown, Trophy, Globe
} from 'lucide-react';
import { usePersona } from './PersonaContext';
import { Button } from '../ui/Button';

type LangCode = 'EN' | 'ZH' | 'MS' | 'TA';

const languages: { code: LangCode; label: string; flag: string }[] = [
  { code: 'EN', label: 'English', flag: '🇬🇧' },
  { code: 'ZH', label: '中文 (ZH)', flag: '🇸🇬' },
  { code: 'MS', label: 'Melayu (MS)', flag: '🇸🇬' },
  { code: 'TA', label: 'தமிழ் (TA)', flag: '🇸🇬' },
];

const translations: Record<LangCode, Record<string, string>> = {
  EN: {
    Marketplace: 'Marketplace',
    'Wanted Board': 'Wanted Board',
    'Interactive Map': 'Interactive Map',
    'AI Advisor': 'AI Advisor',
    Calculators: 'Calculators',
    Valuation: 'Valuation',
    Vault: 'Vault',
    Commercial: 'Commercial',
    'Co-living': 'Co-living',
    Renovation: 'Renovation',
    'Loyalty Rewards': 'Loyalty Rewards',
    'SEO Directory': 'SEO Directory',
    'Agent Login': 'Agent Login',
    'Get Started': 'Get Started',
    More: 'More'
  },
  ZH: {
    Marketplace: '房源市场',
    'Wanted Board': '买家征集',
    'Interactive Map': '互动地图',
    'AI Advisor': 'AI 顾问',
    Calculators: '计算器',
    Valuation: '房屋估值',
    Vault: '保险箱',
    Commercial: '商业地产',
    'Co-living': '共享公寓',
    Renovation: '装修估算',
    'Loyalty Rewards': '积分奖励',
    'SEO Directory': '快捷目录',
    'Agent Login': '经纪登录',
    'Get Started': '立即开始',
    More: '更多'
  },
  MS: {
    Marketplace: 'Pasaran',
    'Wanted Board': 'Papan Pembeli',
    'Interactive Map': 'Peta Hartanah',
    'AI Advisor': 'Penasihat AI',
    Calculators: 'Kalkulator',
    Valuation: 'Penilaian',
    Vault: 'Bilik Dokumen',
    Commercial: 'Komersial',
    'Co-living': 'Kediaman Bersama',
    Renovation: 'Kos Hiasan',
    'Loyalty Rewards': 'Ganjaran Ganjil',
    'SEO Directory': 'Direktori SEO',
    'Agent Login': 'Log Ejen',
    'Get Started': 'Mula Sekarang',
    More: 'Lebih'
  },
  TA: {
    Marketplace: 'சந்தை',
    'Wanted Board': 'வாங்குபவர் வாரியம்',
    'Interactive Map': 'வரைபடம்',
    'AI Advisor': 'AI ஆலோசகர்',
    Calculators: 'கணக்கீடுகள்',
    Valuation: 'மதிப்பீடு',
    Vault: 'காப்பகம்',
    Commercial: 'வணிகப் பிரிவு',
    'Co-living': 'கூட்டு வாழ்க்கை',
    Renovation: 'புதுப்பித்தல்',
    'Loyalty Rewards': 'விருதுகள்',
    'SEO Directory': 'SEO அடைவு',
    'Agent Login': 'உள்நுழைவு',
    'Get Started': 'தொடங்குங்கள்',
    More: 'மேலும்'
  }
};

export const Navbar: React.FC = () => {
  const { setPersona, isDarkMode, setDarkMode, language, setLanguage } = usePersona();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const desktopLangRef = useRef<HTMLDivElement>(null);
  const mobileLangRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
      const clickedDesktop = desktopLangRef.current && desktopLangRef.current.contains(e.target as Node);
      const clickedMobile = mobileLangRef.current && mobileLangRef.current.contains(e.target as Node);
      if (!clickedDesktop && !clickedMobile) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLangChange = (code: LangCode) => {
    setLanguage(code);
    setLangDropdownOpen(false);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  const navLinks = [
    { name: 'Marketplace', label: t('Marketplace'), href: '/search', icon: Compass },
    { name: 'Interactive Map', label: t('Interactive Map'), href: '/map', icon: Search },
    { name: 'AI Advisor', label: t('AI Advisor'), href: '/advisor', icon: Bot },
    { name: 'Calculators', label: t('Calculators'), href: '/calculator', icon: Calculator },
    { name: 'Compare', label: 'Compare', href: '/compare', icon: Search },
    { name: 'List Property', label: 'List Property', href: '/listing/new', icon: ClipboardList },
    { name: 'Profile', label: 'My Profile', href: '/profile', icon: User },
    { name: 'Vault', label: t('Vault'), href: '/vault', icon: FileText },
  ];

  const moreLinks = [
    // These extra links are hidden from the menu bar on smaller laptop screens, so we display them inside the More dropdown for those screens.
    { name: 'AI Advisor', label: t('AI Advisor'), href: '/advisor', icon: Bot, responsiveOnly: true },
    { name: 'Compare', label: 'Compare', href: '/compare', icon: Search, responsiveOnly: true },
    { name: 'List Property', label: 'List Property', href: '/listing/new', icon: ClipboardList, responsiveOnly: true },
    { name: 'Profile', label: 'My Profile', href: '/profile', icon: User, responsiveOnly: true },
    { name: 'Vault', label: t('Vault'), href: '/vault', icon: FileText, responsiveOnly: true },

    { name: 'Commercial', label: t('Commercial'), href: '/commercial', icon: Building2, badge: 'NEW' },
    { name: 'Co-living', label: t('Co-living'), href: '/coliving', icon: Home, badge: 'NEW' },
    { name: 'Renovation', label: t('Renovation'), href: '/renovation', icon: Wrench, badge: 'NEW' },
    { name: 'Loyalty Rewards', label: t('Loyalty Rewards'), href: '/loyalty', icon: Trophy, badge: 'NEW' },
    { name: 'SEO Directory', label: t('SEO Directory'), href: '/seo', icon: Search, badge: 'SEO' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-brand-navy dark:bg-brand-gold flex items-center justify-center transition-transform group-hover:scale-105 shadow-md flex-shrink-0">
              <span className="font-black text-white dark:text-brand-navy text-xl">V</span>
            </div>
            <div className="flex flex-col justify-center text-left flex-shrink-0">
              <span className="font-black text-base tracking-wider text-brand-navy dark:text-white uppercase leading-none whitespace-nowrap">V-Rent</span>
              <span className="mt-1 px-1.5 py-0.5 rounded bg-brand-gold/15 text-[8px] text-brand-gold font-black uppercase tracking-widest leading-none w-fit whitespace-nowrap">Super Platform</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const isExtraLink = ['Compare', 'List Property', 'Profile', 'Vault', 'AI Advisor'].includes(link.name);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`py-1.5 font-bold text-neutral-700 dark:text-neutral-300 hover:text-brand-navy dark:hover:text-brand-gold hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50 rounded-lg transition-colors whitespace-nowrap ${
                    isExtraLink ? 'hidden xl:inline-block' : 'inline-block'
                  } ${
                    language === 'TA' ? 'px-1.5 text-[11px] xl:text-[12.5px]' : 'px-2.5 text-[13px]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            
            {/* More Dropdown */}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[13px] font-bold text-neutral-700 dark:text-neutral-300 hover:text-brand-navy dark:hover:text-brand-gold hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50 rounded-lg transition-colors whitespace-nowrap cursor-pointer animate-none"
              >
                {t('More')} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>
              {moreOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {moreLinks.map(link => {
                    const Icon = link.icon;
                    const responsiveClass = link.responsiveOnly ? 'xl:hidden' : 'block';
                    return (
                      <Link
                        key={link.name}
                        href={link.href}
                        onClick={() => setMoreOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors ${responsiveClass}`}
                      >
                        <Icon className="h-4 w-4 text-brand-gold" />
                        {link.label}
                        {link.badge && (
                          <span className="ml-auto text-[9px] font-black bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded-full uppercase">{link.badge}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Action CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Language Selector Dropdown */}
            <div ref={desktopLangRef} className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
              >
                <Globe className="h-4 w-4" />
                <span>{language}</span>
                <ChevronDown className="h-3 w-3 text-neutral-400" />
              </button>
              {langDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-36 bg-card border border-border rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1.5 duration-100">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleLangChange(lang.code)}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold transition-colors cursor-pointer ${
                        language === lang.code 
                          ? 'text-brand-gold bg-brand-navy-light/10 font-extrabold'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setDarkMode(!isDarkMode)}
              className="p-2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg cursor-pointer"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            
            <Button
              variant="outline"
              size="sm"
              leftIcon={<User className="h-4 w-4" />}
              onClick={() => setPersona('agent')}
            >
              {t('Agent Login')}
            </Button>
            <Link href="/auth">
              <Button size="sm" variant="gold" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                {t('Get Started')}
              </Button>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            {/* Language Trigger (Mobile) */}
            <div ref={mobileLangRef} className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg cursor-pointer"
              >
                <Globe className="h-4 w-4" />
              </button>
              {langDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded-xl shadow-2xl py-1 z-50">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleLangChange(lang.code)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setDarkMode(!isDarkMode)}
              className="p-2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg cursor-pointer"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-border bg-card px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg"
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
              {moreLinks.filter(link => !link.responsiveOnly).map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg"
                  >
                    <Icon className="h-4 w-4 text-brand-gold" />
                    {link.label}
                    {link.badge && (
                      <span className="ml-auto text-[9px] font-black bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded-full uppercase">{link.badge}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border pt-4 flex flex-col gap-2">
              <Button
                variant="outline"
                leftIcon={<User className="h-4 w-4" />}
                onClick={() => {
                  setPersona('agent');
                  setMobileMenuOpen(false);
                }}
              >
                {t('Agent Login')}
              </Button>
              <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="gold" className="w-full">
                  {t('Get Started')}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-950 border-t border-neutral-900 text-neutral-400 text-xs py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Branding */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand-gold flex items-center justify-center">
              <span className="font-bold text-brand-navy text-sm">V</span>
            </div>
            <span className="font-black text-white text-base uppercase tracking-tight">V-RENT</span>
          </div>
          <p className="text-neutral-500 text-[11px] leading-relaxed">
            Find. Rent. Manage. Grow.<br />
            AI-Powered. Secure. Scalable. Future Ready.
          </p>
          <div className="flex items-center gap-3 text-[10px] text-neutral-600 font-bold">
            <span className="px-2 py-1 border border-neutral-800 rounded bg-neutral-900/30">PDPA COMPLIANT</span>
            <span className="px-2 py-1 border border-neutral-800 rounded bg-neutral-900/30">CEA REGULATED</span>
          </div>
        </div>

        {/* Sitemap cols */}
        <div>
          <h4 className="text-white font-bold uppercase tracking-wider mb-3 text-[10px]">Marketplace</h4>
          <ul className="space-y-2 text-[11px]">
            <li><Link href="/search?type=Buy" className="hover:text-white transition-colors">Properties for Sale</Link></li>
            <li><Link href="/search?type=Rent" className="hover:text-white transition-colors">Rental Properties</Link></li>
            <li><Link href="/search?type=New+Launch" className="hover:text-white transition-colors">New Condominium Launches</Link></li>
            <li><Link href="/search/wanted" className="hover:text-white transition-colors">Buyer Wanted Board</Link></li>
            <li><Link href="/agents" className="hover:text-white transition-colors">Agent Directory</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold uppercase tracking-wider mb-3 text-[10px]">Financial Tools</h4>
          <ul className="space-y-2 text-[11px]">
            <li><Link href="/calculator" className="hover:text-white transition-colors">Mortgage Affordability</Link></li>
            <li><Link href="/calculator" className="hover:text-white transition-colors">Singapore ABSD Calculator</Link></li>
            <li><Link href="/calculator" className="hover:text-white transition-colors">TDSR Loan Estimator</Link></li>
            <li><Link href="/calculator" className="hover:text-white transition-colors">Mortgage Pre-Qualification</Link></li>
            <li><Link href="/valuation" className="hover:text-white transition-colors">Instant Automated Valuation</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold uppercase tracking-wider mb-3 text-[10px]">Company & Policy</h4>
          <ul className="space-y-2 text-[11px]">
            <li><Link href="/advisor" className="hover:text-white transition-colors">V-RENT Ava Assistant</Link></li>
            <li><Link href="/agents" className="hover:text-white transition-colors">Find a Verified Agent</Link></li>
            <li><span className="text-neutral-600">Privacy & PDPA Policy (Indicative)</span></li>
            <li><span className="text-neutral-600">CEA Code of Practice (Indicative)</span></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-neutral-900 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-neutral-600 gap-4 text-[10px]">
        <p>© 2026 V-RENT PropTech Platform. All rights reserved. Built for Singapore Agency Network demonstration.</p>
        <p>Disclaimer: Financial calculations and projections are illustrative and not legal or tax advice.</p>
      </div>
    </footer>
  );
};
