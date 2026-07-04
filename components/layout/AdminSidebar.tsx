"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ShieldAlert, Compass, Users, Settings, Database, 
  DollarSign, Activity, FileCheck 
} from 'lucide-react';
import { usePersona } from './PersonaContext';

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const { setPersona } = usePersona();

  const links = [
    { name: 'Moderation Queue', href: '/admin', icon: ShieldAlert },
    { name: 'User Directory', href: '/admin?tab=users', icon: Users },
    { name: 'Revenue Metrics', href: '/admin?tab=revenue', icon: DollarSign },
    { name: 'Integrations Nodes', href: '/admin?tab=integrations', icon: Database },
    { name: 'Compliance Audits', href: '/admin?tab=audit', icon: FileCheck },
  ];

  return (
    <aside className="w-64 bg-sidebar-bg border-r border-neutral-800 text-sidebar-fg flex flex-col h-full flex-shrink-0">
      {/* Branding */}
      <div className="h-16 px-6 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-brand-gold flex items-center justify-center font-bold text-brand-navy">V</div>
          <span className="font-bold tracking-tight text-white uppercase text-sm">V-Rent Admin</span>
        </div>
      </div>

      {/* Role */}
      <div className="p-4 border-b border-neutral-800">
        <div className="bg-neutral-900/60 p-3 rounded-lg border border-neutral-800">
          <h4 className="text-xs font-bold text-white">System SuperUser</h4>
          <p className="text-[10px] text-red-400 font-semibold uppercase mt-0.5">Platform Controller</p>
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
export default AdminSidebar;
