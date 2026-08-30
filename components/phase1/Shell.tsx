"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, UserPlus, LogIn, ShieldCheck, IdCard, ClipboardList, CreditCard, Wallet,
  LayoutDashboard, Building2, Upload, Plus, Gavel, Receipt, BarChart3, Users,
  RotateCcw, FastForward, Menu, X, Sun, Moon, Bell, HelpCircle, ChevronDown, LogOut,
  Check, LayoutGrid, MapPinned, Search, BookOpen, MessageCircle, Phone,
} from 'lucide-react';
import { useDemo } from '../../lib/phase1/DemoContext';
import { usePersona } from '../layout/PersonaContext';
import { useTheme } from './hooks';
import { Avatar, cx } from './kit';
import { StatusBadge } from './status';

interface NavItem { href: string; label: string; icon: React.ComponentType<{ size?: number | string; className?: string }>; done?: boolean; exact?: boolean }
interface NavGroup { title: string; items: NavItem[] }

function useNav(): NavGroup[] {
  const { state } = useDemo();
  return [
    { title: 'Start', items: [
      { href: '/phase1', label: 'Overview', icon: Home, exact: true },
      { href: '/phase1/signup', label: 'Create account', icon: UserPlus },
      { href: '/phase1/login', label: 'Sign in', icon: LogIn },
    ] },
    { title: 'Onboarding', items: [
      { href: '/phase1/verify', label: 'Verify contact', icon: ShieldCheck, done: state.emailVerified && state.mobileVerified },
      { href: '/phase1/profile', label: 'Profile & CEA', icon: IdCard, done: state.profileSubmitted },
      { href: '/phase1/status', label: 'Application status', icon: ClipboardList, done: state.approval === 'approved' },
      { href: '/phase1/plans', label: 'Choose a plan', icon: CreditCard, done: !!state.plan },
      { href: '/phase1/checkout', label: 'Payment', icon: Wallet, done: state.subscription === 'active' },
    ] },
    { title: 'Workspace', items: [
      { href: '/phase1/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/phase1/properties', label: 'Properties', icon: MapPinned },
      { href: '/phase1/listings', label: 'Listings', icon: Building2, exact: true },
      { href: '/phase1/listings/new', label: 'Create listing', icon: Plus },
      { href: '/phase1/listings/import', label: 'Bulk import', icon: Upload },
    ] },
    { title: 'Administration', items: [
      { href: '/phase1/admin', label: 'Admin overview', icon: LayoutGrid, exact: true },
      { href: '/phase1/admin/agents', label: 'Agents', icon: Users },
      { href: '/phase1/admin/verification', label: 'Verification queue', icon: ShieldCheck },
      { href: '/phase1/admin/moderation', label: 'Moderation queue', icon: Gavel },
      { href: '/phase1/admin/subscriptions', label: 'Subscriptions', icon: Receipt },
      { href: '/phase1/admin/reports', label: 'Reports & audit', icon: BarChart3 },
    ] },
  ];
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

/** Breadcrumb trail derived from the route. */
const TITLES: Record<string, string> = {
  phase1: 'Home', signup: 'Create account', login: 'Sign in', verify: 'Verify contact', profile: 'Profile',
  status: 'Application status', plans: 'Plans', checkout: 'Payment', dashboard: 'Dashboard', properties: 'Properties',
  listings: 'Listings', new: 'Create listing', import: 'Bulk import', admin: 'Administration', agents: 'Agents',
  verification: 'Verification queue', moderation: 'Moderation queue', subscriptions: 'Subscriptions', reports: 'Reports & audit',
};

function useCrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts.map((p, i) => ({ label: TITLES[p] ?? (p.startsWith('lst-') || p.startsWith('imp-') ? 'Listing' : p.startsWith('agt-') ? 'Agent' : p), href: '/' + parts.slice(0, i + 1).join('/') }));
}

/* ------------------------------------------------------------------ popover */

function Popover({ open, onClose, children, align = 'right', width = 'w-80' }: { open: boolean; onClose: () => void; children: React.ReactNode; align?: 'left' | 'right'; width?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={ref} className={cx('p1-panel absolute top-full z-50 mt-2 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-p1-border bg-p1-elevated shadow-p1-lg', width, align === 'right' ? 'right-0' : 'left-0')}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------- shell */

export function Phase1Shell({ children }: { children: React.ReactNode }) {
  const { reset, skipToActive, state } = useDemo();
  const { isDarkMode, setDarkMode } = usePersona();
  const { toggle: toggleTheme, ready: themeReady } = useTheme(setDarkMode, isDarkMode);
  const pathname = usePathname();
  const nav = useNav();
  const crumbs = useCrumbs(pathname);

  const [drawer, setDrawer] = useState(false);
  const [pop, setPop] = useState<null | 'bell' | 'help' | 'user'>(null);
  const close = () => setDrawer(false);

  // Close the drawer on navigation; lock scroll while open.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close overlays on navigation
  useEffect(() => { setDrawer(false); setPop(null); }, [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [drawer]);

  const isAdmin = pathname.startsWith('/phase1/admin');
  const agentStatus = state.approval === 'approved' ? (state.subscription === 'active' ? 'approved' : 'approved') : state.approval;

  const notifications = [
    state.approval === 'under_review' && { t: 'Application received', b: 'A verification officer will review your CEA details, usually within one business day.', tone: 'info' as const },
    state.approval === 'approved' && !state.plan && { t: 'You are verified', b: 'Choose a plan to start publishing listings.', tone: 'success' as const, href: '/phase1/plans' },
    state.subscription === 'past_due' && { t: 'Renewal payment failed', b: 'Update your payment method. Listings stay live during the grace period.', tone: 'warning' as const, href: '/phase1/checkout' },
    !state.ceaValid && { t: 'CEA registration lapsed', b: 'Publication is paused until the register shows a valid registration.', tone: 'danger' as const },
    { t: 'Register synchronised', b: 'CEA register copy of 28 Aug 2026, 06:00 applied to all agents.', tone: 'neutral' as const },
    { t: 'Listing VR-24058 rejected', b: 'Photographs appear to show a different unit. Correct and resubmit.', tone: 'danger' as const, href: '/phase1/listings/lst-5' },
  ].filter(Boolean) as { t: string; b: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral'; href?: string }[];

  const sidebar = (
    <div className="flex h-full flex-col bg-p1-sidebar text-white">
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <Link href="/phase1" className="flex items-center gap-2.5 rounded-lg" aria-label="V-RENT home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-p1-accent font-p1display text-[20px] font-semibold text-[#0B1E3F]">V</span>
          <span>
            <span className="block text-[16px] font-semibold tracking-tight leading-5">V-RENT</span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-p1-accent">Agent platform</span>
          </span>
        </Link>
        <button type="button" onClick={close} className="flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white xl:hidden cursor-pointer" aria-label="Close menu"><X size={20} /></button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
        {nav.map((g) => (
          <div key={g.title} className="mb-4">
            <div className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">{g.title}</div>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href} aria-current={active ? 'page' : undefined}
                      className={cx('group flex h-11 items-center gap-3 rounded-lg px-3 text-[14px] transition-colors',
                        active ? 'bg-white/12 font-semibold text-white shadow-[inset_3px_0_0_var(--p1-accent)]' : 'text-white/75 hover:bg-white/8 hover:text-white')}>
                      <Icon size={18} className={cx('shrink-0', active ? 'text-p1-accent' : 'text-white/55 group-hover:text-white/80')} aria-hidden />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.done && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-p1-success/25 text-p1-success" title="Completed"><Check size={12} strokeWidth={3} aria-hidden /><span className="sr-only">completed</span></span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="mb-3 rounded-lg bg-white/6 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">Presenter controls</div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => { skipToActive(); close(); }} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-[13px] font-medium text-white hover:bg-white/16 cursor-pointer" title="Jump to an approved, subscribed agent">
              <FastForward size={14} aria-hidden /> Skip ahead
            </button>
            <button type="button" onClick={() => { reset(); close(); }} className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-[13px] font-medium text-white hover:bg-white/16 cursor-pointer" title="Return the walkthrough to the start">
              <RotateCcw size={14} aria-hidden /> Reset
            </button>
          </div>
        </div>
        <Link href="/" className="flex h-10 items-center justify-center gap-2 rounded-lg text-[13px] text-white/55 hover:bg-white/8 hover:text-white">
          <LogOut size={14} aria-hidden /> Leave the prototype
        </Link>
      </div>
    </div>
  );

  const bottomNav: NavItem[] = isAdmin
    ? [{ href: '/phase1/admin', label: 'Overview', icon: LayoutGrid, exact: true }, { href: '/phase1/admin/agents', label: 'Agents', icon: Users }, { href: '/phase1/admin/verification', label: 'Verify', icon: ShieldCheck }, { href: '/phase1/admin/moderation', label: 'Moderate', icon: Gavel }, { href: '/phase1/admin/reports', label: 'Reports', icon: BarChart3 }]
    : [{ href: '/phase1/dashboard', label: 'Dashboard', icon: LayoutDashboard }, { href: '/phase1/listings', label: 'Listings', icon: Building2, exact: true }, { href: '/phase1/listings/new', label: 'Create', icon: Plus }, { href: '/phase1/properties', label: 'Properties', icon: MapPinned }, { href: '/phase1/profile', label: 'Profile', icon: IdCard }];

  return (
    <div className="p1 min-h-screen font-p1sans">
      {/* Skip link */}
      <a href="#p1-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-p1-accent focus:px-4 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-p1-accent-on">Skip to content</a>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[60] xl:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="p1-overlay absolute inset-0 bg-black/50" onClick={close} aria-hidden />
          <div className="p1-drawer-left absolute inset-y-0 left-0 w-[300px] max-w-[85vw] shadow-p1-lg">{sidebar}</div>
        </div>
      )}

      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 xl:block">{sidebar}</aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-p1-border bg-p1-surface/90 backdrop-blur supports-[backdrop-filter]:bg-p1-surface/80">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <button type="button" onClick={() => setDrawer(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-p1-text-2 hover:bg-p1-subtle xl:hidden cursor-pointer" aria-label="Open menu"><Menu size={22} /></button>
              <Link href="/phase1" className="flex items-center gap-2 xl:hidden" aria-label="V-RENT home">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-p1-primary font-p1display text-[17px] font-semibold text-white">V</span>
              </Link>

              <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 sm:block">
                <ol className="flex items-center gap-1.5 text-[13px] text-p1-text-3">
                  {crumbs.map((c, i) => (
                    <li key={c.href} className="flex min-w-0 items-center gap-1.5">
                      {i < crumbs.length - 1 ? <Link href={c.href} className="truncate hover:text-p1-text hover:underline underline-offset-4">{c.label}</Link> : <span className="truncate font-medium text-p1-text" aria-current="page">{c.label}</span>}
                      {i < crumbs.length - 1 && <span aria-hidden className="text-p1-border-strong">/</span>}
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="flex-1 sm:hidden" />

              <div className="flex items-center gap-1">
                <div className="relative hidden md:block">
                  <label htmlFor="p1-global-search" className="sr-only">Search listings and agents</label>
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-p1-text-3" aria-hidden />
                  <input id="p1-global-search" placeholder="Search…" className="h-10 w-44 rounded-lg border border-p1-border bg-p1-bg pl-9 pr-3 text-[14px] text-p1-text placeholder:text-p1-text-3 hover:border-p1-border-strong xl:w-60" />
                </div>

                <button type="button" onClick={toggleTheme} aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={isDarkMode ? 'Light mode' : 'Dark mode'} className="flex h-11 w-11 items-center justify-center rounded-lg text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text cursor-pointer">
                  {themeReady && isDarkMode ? <Sun size={19} /> : <Moon size={19} />}
                </button>

                <div className="relative">
                  <button type="button" onClick={() => setPop(pop === 'bell' ? null : 'bell')} aria-haspopup="dialog" aria-expanded={pop === 'bell'} aria-label={`Notifications, ${notifications.length} unread`} className="relative flex h-11 w-11 items-center justify-center rounded-lg text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text cursor-pointer">
                    <Bell size={19} />
                    {notifications.length > 0 && <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-p1-danger px-1 text-[10px] font-bold text-white">{notifications.length}</span>}
                  </button>
                  <Popover open={pop === 'bell'} onClose={() => setPop(null)} width="w-96">
                    <div className="flex items-center justify-between border-b border-p1-border px-4 py-3">
                      <span className="text-[14px] font-semibold text-p1-text">Notifications</span>
                      <button type="button" className="text-[13px] text-p1-text-3 hover:text-p1-text cursor-pointer">Mark all read</button>
                    </div>
                    <ul className="max-h-96 overflow-y-auto">
                      {notifications.map((n, i) => {
                        const dot = { info: 'bg-p1-info', success: 'bg-p1-success', warning: 'bg-p1-warning', danger: 'bg-p1-danger', neutral: 'bg-p1-text-3' }[n.tone];
                        const body = (
                          <div className="flex gap-3 px-4 py-3">
                            <span className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', dot)} aria-hidden />
                            <div className="min-w-0">
                              <div className="text-[14px] font-medium leading-5 text-p1-text">{n.t}</div>
                              <div className="mt-0.5 text-[13px] leading-5 text-p1-text-2">{n.b}</div>
                            </div>
                          </div>
                        );
                        return <li key={i} className="border-b border-p1-border last:border-b-0 hover:bg-p1-subtle/60">{n.href ? <Link href={n.href} onClick={() => setPop(null)}>{body}</Link> : body}</li>;
                      })}
                    </ul>
                  </Popover>
                </div>

                <div className="relative">
                  <button type="button" onClick={() => setPop(pop === 'help' ? null : 'help')} aria-haspopup="dialog" aria-expanded={pop === 'help'} aria-label="Help and support" className="flex h-11 w-11 items-center justify-center rounded-lg text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text cursor-pointer">
                    <HelpCircle size={19} />
                  </button>
                  <Popover open={pop === 'help'} onClose={() => setPop(null)} width="w-72">
                    <div className="px-4 py-3 text-[14px] font-semibold text-p1-text">Help and support</div>
                    <ul className="border-t border-p1-border py-1 text-[14px]">
                      {[{ i: BookOpen, t: 'Agent guide', d: 'How listings, plans and verification work' }, { i: MessageCircle, t: 'Chat with support', d: 'Weekdays 9am – 6pm SGT' }, { i: Phone, t: 'Call +65 6000 0000', d: 'Urgent account issues' }].map((h) => (
                        <li key={h.t}><button type="button" className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-p1-subtle/60 cursor-pointer"><h.i size={17} className="mt-0.5 shrink-0 text-p1-text-3" aria-hidden /><span><span className="block font-medium text-p1-text">{h.t}</span><span className="block text-[13px] text-p1-text-3">{h.d}</span></span></button></li>
                      ))}
                    </ul>
                  </Popover>
                </div>

                <div className="relative ml-1">
                  <button type="button" onClick={() => setPop(pop === 'user' ? null : 'user')} aria-haspopup="menu" aria-expanded={pop === 'user'} className="flex h-11 items-center gap-2 rounded-lg pl-1 pr-2 hover:bg-p1-subtle cursor-pointer">
                    <Avatar name={isAdmin ? 'Lena Ops' : state.profile.fullName} size="sm" />
                    <span className="hidden text-left xl:block">
                      <span className="block max-w-[140px] truncate text-[13px] font-semibold leading-4 text-p1-text">{isAdmin ? 'Lena Ops' : state.profile.fullName}</span>
                      <span className="block text-[12px] leading-4 text-p1-text-3">{isAdmin ? 'Verification officer' : state.profile.agency.replace(' Pte Ltd', '')}</span>
                    </span>
                    <ChevronDown size={15} className="text-p1-text-3" aria-hidden />
                  </button>
                  <Popover open={pop === 'user'} onClose={() => setPop(null)} width="w-72">
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <Avatar name={isAdmin ? 'Lena Ops' : state.profile.fullName} size="md" />
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-semibold text-p1-text">{isAdmin ? 'Lena Ops' : state.profile.fullName}</div>
                        <div className="truncate text-[13px] text-p1-text-3">{isAdmin ? 'ops.lena@v-rent.sg' : state.profile.email}</div>
                      </div>
                    </div>
                    {!isAdmin && (
                      <div className="border-t border-p1-border px-4 py-3">
                        <div className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-p1-text-3">Account standing</div>
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge kind="agent" value={agentStatus} size="sm" />
                          <StatusBadge kind="subscription" value={state.subscription} size="sm" />
                        </div>
                      </div>
                    )}
                    <ul className="border-t border-p1-border py-1 text-[14px]">
                      <li><Link href="/phase1/profile" onClick={() => setPop(null)} className="flex h-10 items-center gap-3 px-4 hover:bg-p1-subtle/60"><IdCard size={16} className="text-p1-text-3" aria-hidden /> My profile</Link></li>
                      <li><Link href="/phase1/checkout" onClick={() => setPop(null)} className="flex h-10 items-center gap-3 px-4 hover:bg-p1-subtle/60"><Receipt size={16} className="text-p1-text-3" aria-hidden /> Billing</Link></li>
                      <li><Link href="/phase1/login" onClick={() => setPop(null)} className="flex h-10 items-center gap-3 px-4 hover:bg-p1-subtle/60"><LogOut size={16} className="text-p1-text-3" aria-hidden /> Sign out</Link></li>
                    </ul>
                  </Popover>
                </div>
              </div>
            </div>
          </header>

          <main id="p1-main" className="flex-1 pb-24 xl:pb-10" tabIndex={-1}>
            <div key={pathname} className="vr-fade mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
          </main>
        </div>
      </div>

      {/* Bottom navigation on small screens */}
      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-p1-border bg-p1-surface/95 backdrop-blur xl:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="grid grid-cols-5">
          {bottomNav.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? 'page' : undefined} className={cx('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium', active ? 'text-p1-primary dark:text-p1-accent' : 'text-p1-text-3')}>
                  <span className={cx('flex h-7 w-12 items-center justify-center rounded-full', active && 'bg-p1-primary-soft')}><Icon size={19} aria-hidden /></span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
