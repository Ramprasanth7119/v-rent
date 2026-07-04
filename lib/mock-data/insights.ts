export interface InsightArticle {
  id: string;
  title: string;
  category: 'Market Trends' | 'Policy Update' | 'Area Analysis' | 'Investor Guide';
  date: string;
  readTime: string;
  author: string;
  summary: string;
  content: string;
  coverImage: string;
  featured: boolean;
}

export const mockInsights: InsightArticle[] = [
  {
    id: "insight-1",
    title: "Understanding Additional Buyer's Stamp Duty (ABSD) Framework",
    category: "Policy Update",
    date: "2026-06-20",
    readTime: "6 min read",
    author: "Priya Murugan (Tax Specialist)",
    summary: "A comprehensive guide on current ABSD rates in Singapore for citizens, PRs, and foreigners, explaining options for decoupling.",
    content: "The MAS (Monetary Authority of Singapore) framework for Additional Buyer's Stamp Duty continues to impact local transaction volumes. For Singapore Citizens buying their second property, the ABSD is set at 20%, while third and subsequent properties attract 30%. Permanent Residents pay 5% on their first purchase, 30% on their second, and 35% on their third. Foreign buyers face 60% ABSD unless covered under Free Trade Agreements (FTAs) like US citizens. We analyze decoupling methods and family-trust configurations allowed under CEA regulatory guidelines.",
    coverImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80",
    featured: true
  },
  {
    id: "insight-2",
    title: "District 15 Marine Parade: The New Launch Powerhouse",
    category: "Area Analysis",
    date: "2026-06-18",
    readTime: "5 min read",
    author: "Sherry Tan (East Coast Director)",
    summary: "Why properties along Meyer and Amber Road continue to pull top-tier pricing, supported by the Thomson-East Coast Line.",
    content: "District 15 has historically been a favorite for local homeowners seeking sea views and rich food culture. With the full operations of the Thomson-East Coast Line (TEL), connectivity to the CBD is now under 15 minutes from Marine Parade. Projects like Meyer Mansion and Grand Dunman are commanding prices above $2,500 psf, proving that buyers are willing to pay premiums for coastal lifestyle paired with transit efficiency.",
    coverImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80",
    featured: true
  },
  {
    id: "insight-3",
    title: "EC vs. Private Condo: The Upgraders Dilemma",
    category: "Investor Guide",
    date: "2026-06-10",
    readTime: "8 min read",
    author: "Daniel Teo (HDB & EC Expert)",
    summary: "We break down the financial math of upgrading from an HDB to an Executive Condo versus entering the private property market directly.",
    content: "Executive Condominiums (ECs) remain Singapore's unique hybrid housing asset. Sold with initial HDB eligibility rules, they fully privatize after 10 years. For an HDB owner whose household income is under the $16,000 cap, ECs offer a substantial discount of 20-30% compared to equivalent private launches. However, buyers must navigate Mortgage Servicing Ratio (MSR) caps of 30%, which are far tighter than the private market's Total Debt Servicing Ratio (TDSR) of 55%.",
    coverImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80",
    featured: false
  },
  {
    id: "insight-4",
    title: "Jurong Lake District: Decentered Hubs Take Shape",
    category: "Market Trends",
    date: "2026-05-28",
    readTime: "7 min read",
    author: "Farhan Syarif (Commercial Lead)",
    summary: "As the government builds the largest mixed-use business district outside the CBD, commercial yields in Jurong East climb.",
    content: "The Jurong Lake District (JLD) transformation is moving into Phase 2. Designed as a sustainable, car-lite district connecting local academic institutes and high-tech manufacturing corridors, it is drawing multinational entities away from Central Raffles Place. Rental yields for grade-A office spaces in Jem and Westgate offices have reached a healthy 4.2%, outperforming several traditional CBD developments.",
    coverImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80",
    featured: false
  },
  {
    id: "insight-5",
    title: "Is Freehold Truly Worth the Premium?",
    category: "Investor Guide",
    date: "2026-05-15",
    readTime: "10 min read",
    author: "Marcus Lim (Luxury Portfolio Partner)",
    summary: "Historical transaction analysis of leasehold vs freehold condos in Bukit Timah shows surprising ROI differentials.",
    content: "A leasehold condo loses value as it approaches the end of its 99-year lease (referred to as lease decay). Freehold properties escape this, but carry an initial premium of 15% to 25%. Our analysis of transactions over 20 years shows that for holding periods under 10 years, leasehold properties often yield higher capital gains due to lower entry prices. However, for multigenerational preservation, freehold remains the gold standard in Districts 9 and 10.",
    coverImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80",
    featured: false
  },
  {
    id: "insight-6",
    title: "Navigating MAS Mortgage Pre-Qualifications",
    category: "Policy Update",
    date: "2026-05-02",
    readTime: "4 min read",
    author: "V-RENT Mortgage Desk",
    summary: "How to prepare your paperwork for instant pre-qualification under the latest TDSR guidelines.",
    content: "Securing a home loan in Singapore requires matching strict rules set by MAS. The Total Debt Servicing Ratio (TDSR) requires that your monthly debt repayments (car, credit cards, mortgages) do not exceed 55% of your gross monthly income. We outline how variable income is haircut by 30% during assessment, and how to verify your identity securely via Singpass integration.",
    coverImage: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80",
    featured: false
  }
];
