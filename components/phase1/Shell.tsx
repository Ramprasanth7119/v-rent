"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, UserPlus, ShieldCheck, IdCard, ClipboardList, CreditCard, Wallet,
  LayoutDashboard, Building2, Upload, GaugeCircle, Gavel, Receipt, BarChart3, Users,
  RotateCcw, FastForward, Menu, X, Sun, Moon, LogIn,
} from 'lucide-react';
import { useDemo } from '../../lib/phase1/DemoContext';
import { usePersona } from '../layout/PersonaContext';
import { useTheme } from './hooks';

interface NavItem {
  href: string;
  label: string;
  module: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

const AGENT_NAV: NavItem[] = [
  { href: '/phase1', label: 'Start here', module: '', icon: Home },
  { href: '/phase1/signup', label: 'Create account', module: 'M1', icon: UserPlus },
  { href: '/phase1/login', label: 'Sign in', module: 'M1', icon: LogIn },
  { href: '/phase1/verify', label: 'Verify contact', module: 'M2', icon: ShieldCheck },
  { href: '/phase1/profile', label: 'Profile & CEA', module: 'M6', icon: IdCard },
  { href: '/phase1/status', label: 'Application status', module: 'M8', icon: ClipboardList },
  { href: '/phase1/plans', label: 'Choose a plan', module: 'M9', icon: CreditCard },
  { href: '/phase1/checkout', label: 'Payment', module: 'M10', icon: Wallet },
  { href: '/phase1/dashboard', label: 'Agent dashboard', module: 'M9', icon: LayoutDashboard },
  { href: '/phase1/listings', label: 'My listings', module: 'M12', icon: Building2 },
  { href: '/phase1/listings/new', label: 'Create listing', module: 'M12', icon: GaugeCircle },
  { href: '/phase1/listings/import', label: 'Bulk import', module: 'M12', icon: Upload },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/phase1/admin/agents', label: 'Agents', module: 'M14', icon: Users },
  { href: '/phase1/admin/verification', label: 'Verification queue', module: 'M7', icon: ShieldCheck },
  { href: '/phase1/admin/moderation', label: 'Moderation queue', module: 'M13', icon: Gavel },
  { href: '/phase1/admin/subscriptions', label: 'Subscriptions', module: 'M10', icon: Receipt },
  { href: '/phase1/admin/reports', label: 'Reports & audit', module: 'M14', icon: BarChart3 },
];

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const pathname = usePathname();
  const active =
    pathname === item.href ||
    (item.href !== '/phase1' && pathname.startsWith(item.href + '/'));
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-white/12 text-white font-medium'
          : 'text-slate-300/80 hover:bg-white/6 hover:text-white'
      }`}
    >
      <Icon size={15} className={active ? 'text-brand-gold' : 'text-slate-400 group-hover:text-slate-200'} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.module && (
        <span className="font-mono text-[10px] text-slate-500 group-hover:text-slate-400">
          {item.module}
        </span>
      )}
    </Link>
  );
}

export function Phase1Shell({ children }: { children: React.ReactNode }) {
  const { reset, skipToActive, state } = useDemo();
  const { isDarkMode, setDarkMode } = usePersona();
  const { toggle: toggleTheme, ready: themeReady } = useTheme(setDarkMode, isDarkMode);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const pageKey = usePathname();

  const statusLabel =
    state.approval === 'approved'
      ? state.subscription === 'active'
        ? 'Approved · Subscribed'
        : 'Approved · No plan'
      : state.approval === 'under_review'
      ? 'Under review'
      : state.approval === 'suspended'
      ? 'Suspended'
      : 'Not submitted';

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-navy-dark">
      <div className="px-5 pt-6 pb-5 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-gold text-brand-navy-dark text-xs font-bold">
            V
          </div>
          <div className="text-sm font-semibold tracking-tight text-white">V-RENT</div>
        </div>
        <div className="mt-2.5 text-[10px] font-mono uppercase tracking-[0.14em] text-brand-gold">
          Phase 1 · Agent Platform
        </div>
        <div className="mt-1 text-[11px] text-slate-400">Static prototype — no live data</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Agent journey
        </div>
        <div className="flex flex-col gap-0.5">
          {AGENT_NAV.map((i) => <NavLink key={i.href} item={i} onNavigate={close} />)}
        </div>

        <div className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Back office
        </div>
        <div className="flex flex-col gap-0.5">
          {ADMIN_NAV.map((i) => <NavLink key={i.href} item={i} onNavigate={close} />)}
        </div>
      </nav>

      <div className="border-t border-white/8 px-4 py-4">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[11px] text-slate-400">
            Demo state: <span className="font-medium text-slate-200">{statusLabel}</span>
          </span>
          <button
            onClick={toggleTheme}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="relative flex h-6 w-11 flex-shrink-0 items-center rounded-full bg-white/12 px-0.5 transition-colors hover:bg-white/20"
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-gold text-brand-navy-dark transition-transform duration-300"
              style={{ transform: themeReady && isDarkMode ? 'translateX(20px)' : 'translateX(0)' }}
            >
              {isDarkMode ? <Moon size={11} /> : <Sun size={11} />}
            </span>
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { skipToActive(); close(); }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-white/16 transition-colors"
          >
            <FastForward size={12} /> Skip ahead
          </button>
          <button
            onClick={() => { reset(); close(); }}
            className="flex items-center justify-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-white/16 transition-colors"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>
        <Link
          href="/"
          className="mt-3 block text-center text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Leave the prototype
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-border bg-brand-navy-dark px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-brand-gold text-brand-navy-dark text-[10px] font-bold">V</div>
          <span className="text-sm font-semibold text-white">V-RENT Phase 1</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-slate-200 p-1" aria-label="Toggle navigation">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[80%]">{sidebar}</div>
          <div className="flex-1 bg-black/50" onClick={close} />
        </div>
      )}

      <div className="flex">
        <aside className="hidden lg:block w-64 flex-shrink-0 h-screen sticky top-0">{sidebar}</aside>
        <main className="min-w-0 flex-1">
          <div key={pageKey} className="vr-fade mx-auto max-w-5xl px-5 sm:px-8 py-8 sm:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
