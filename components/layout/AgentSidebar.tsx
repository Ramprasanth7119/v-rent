"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, Home, Bot, FileText, Settings, 
  ChevronRight, Award, Compass, CreditCard 
} from 'lucide-react';
import { usePersona } from './PersonaContext';

export const AgentSidebar: React.FC = () => {
  const pathname = usePathname();
  const { setPersona } = usePersona();

  const links = [
    { name: 'CRM Dashboard', href: '/agent', icon: LayoutDashboard },
    { name: 'My Listings', href: '/agent?tab=listings', icon: Home },
    { name: 'Agent AI Copilot', href: '/advisor?mode=copilot', icon: Bot },
    { name: 'Document Vault', href: '/vault', icon: FileText },
    { name: 'Billing & Subscriptions', href: '/agency?tab=billing', icon: CreditCard },
  ];

  return (
    <aside className="w-64 bg-sidebar-bg border-r border-neutral-800 text-sidebar-fg flex flex-col h-full flex-shrink-0">
      {/* Branding */}
      <div className="h-16 px-6 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-brand-gold flex items-center justify-center font-bold text-brand-navy">V</div>
          <span className="font-bold tracking-tight text-white uppercase text-sm">V-Rent Agent</span>
        </div>
      </div>

      {/* User Status Profile */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center gap-3 bg-neutral-900/60 p-3 rounded-lg border border-neutral-800">
          <div className="h-9 w-9 rounded-full bg-neutral-800 overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80" 
              alt="Marcus Lim" 
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white truncate">Marcus Lim</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">CEA R058921A</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                isActive 
                  ? 'bg-brand-gold text-brand-navy font-extrabold shadow-sm' 
                  : 'hover:bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Exit Portal */}
      <div className="p-4 border-t border-neutral-800">
        <button
          onClick={() => setPersona('consumer')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer"
        >
          <Compass className="h-4 w-4" />
          <span>Exit Dashboard</span>
        </button>
      </div>
    </aside>
  );
};
export default AgentSidebar;
