"use client";

/**
 * Phase 1 application shell.
 *
 * Two navigation models share one frame: the agent workspace (Workspace / Business / Account)
 * and the operations console for staff. Which one a person sees follows the role on their
 * session, and the console is only offered to accounts that can actually open it — the
 * authorisation itself is enforced server-side in `app/phase1/admin/layout.tsx`.
 *
 * Sign-in and sign-up render without this frame: there is no navigation to offer someone
 * who is not signed in.
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, ShieldCheck, IdCard, CreditCard, LayoutDashboard, Building2, Upload, Plus, Gavel, Receipt, BarChart3, Users,
  Menu as MenuIcon, X, Sun, Moon, Bell, HelpCircle, ChevronDown, LogOut, LayoutGrid, MapPinned,
  Search, BookOpen, MessageCircle, Phone, Settings, TrendingUp, ChevronRight, ArrowLeftRight,
} from 'lucide-react';
import { useDemo } from '../../lib/phase1/DemoContext';
import { usePersona } from '../layout/PersonaContext';
import { useTheme } from './hooks';
import { Avatar, Kbd, cx } from './kit';
import { StatusBadge } from './status';
import { useSession, shortName, agencyLabel } from '../../lib/phase1/SessionContext';
import { MODERATION_QUEUE, VERIFICATION_QUEUE } from '../../lib/phase1/data';

type Icon = React.ComponentType<{ size?: number | string; className?: string }>;
interface NavItem { href: string; label: string; icon: Icon; exact?: boolean; badge?: number; badgeTone?: 'neutral' | 'warning' | 'danger' | 'info' }
interface NavGroup { title?: string; items: NavItem[] }

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

const TITLES: Record<string, string> = {
  phase1: 'Agent hub', signup: 'Create account', login: 'Sign in', verify: 'Verify contact', profile: 'Profile',
  status: 'Verification', plans: 'Plans', checkout: 'Subscription', payment: 'Payment', sandbox: 'Sandbox checkout', dashboard: 'Dashboard', properties: 'Properties',
  listings: 'Listings', new: 'Create listing', import: 'Bulk import', admin: 'Operations', agents: 'Agents', performance: 'Performance', settings: 'Settings',
  verification: 'Verification queue', moderation: 'Moderation queue', subscriptions: 'Subscriptions', reports: 'Reports & audit',
};

/** Account ids are UUIDs; a raw one in a breadcrumb tells a reader nothing. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function crumbLabel(segment: string): string {
  if (TITLES[segment]) return TITLES[segment];
  if (segment.startsWith('lst-') || segment.startsWith('imp-') || segment.startsWith('oth-')) return 'Listing';
  if (segment.startsWith('agt-') || UUID.test(segment)) return 'Agent';
  return segment;
}

function useCrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts.map((p, i) => ({ label: crumbLabel(p), href: '/' + parts.slice(0, i + 1).join('/') }));
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

/* ----------------------------------------------------------------- sidebar */

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate: () => void }) {
  const active = isActive(pathname, item);
  const Icon = item.icon;
  const badgeCls = { neutral: 'bg-white/15 text-white/80', warning: 'bg-p1-warning text-white', danger: 'bg-p1-danger text-white', info: 'bg-p1-info text-white' }[item.badgeTone ?? 'neutral'];
  return (
    <Link href={item.href} aria-current={active ? 'page' : undefined} onClick={onNavigate}
      className={cx('group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13.5px] transition-colors',
        active ? 'bg-white/12 font-semibold text-white' : 'text-white/72 hover:bg-white/8 hover:text-white')}>
      {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-p1-accent" aria-hidden />}
      <Icon size={17} className={cx('shrink-0', active ? 'text-p1-accent' : 'text-white/50 group-hover:text-white/80')} aria-hidden />
      <span className="flex-1 truncate">{item.label}</span>
      {typeof item.badge === 'number' && item.badge > 0 && (
        <span className={cx('flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums', badgeCls)}>{item.badge}</span>
      )}
    </Link>
  );
}

function SidebarGroups({ groups, pathname, onNavigate }: { groups: NavGroup[]; pathname: string; onNavigate: () => void }) {
  return (
    <>
      {groups.map((g, i) => (
        <div key={g.title ?? i} className="mb-3">
          {g.title && <div className="px-3 pb-1.5 pt-2.5 text-[11.5px] font-semibold text-white/45">{g.title}</div>}
          <ul className="flex flex-col gap-px">
            {g.items.map((item) => <li key={item.href}><NavLink item={item} pathname={pathname} onNavigate={onNavigate} /></li>)}
          </ul>
        </div>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------- shell */

const BARE_ROUTES = ['/phase1/login', '/phase1/signup'];
/**
 * Pages that bring their own frame: a shared listing is tenant-facing, and the
 * shortlist is a document — workspace navigation would end up in the PDF.
 */
const BARE_PREFIXES = ['/phase1/share/', '/phase1/listings/export'];

export function Phase1Shell({ children }: { children: React.ReactNode }) {
  const pathnameForFrame = usePathname();
  const { user } = useSession();
  // The share page carries its own `.p1` wrapper because it is not part of the
  // workspace; sign-in and sign-up still need one from here.
  if (BARE_PREFIXES.some((p) => pathnameForFrame.startsWith(p))) return <>{children}</>;
  if (BARE_ROUTES.includes(pathnameForFrame)) {
    return <div className="p1 font-p1sans">{children}</div>;
  }
  // Only the agent hub is reachable signed out. Offering the workspace navigation
  // to a visitor who cannot open any of it would be a menu of locked doors.
  if (!user) return <PublicFrame>{children}</PublicFrame>;
  return <Phase1Frame>{children}</Phase1Frame>;
}

/**
 * The frame a signed-out visitor sees on the agent hub: a marketing header with
 * the two things they can actually do, and nothing that implies an account.
 */
function PublicFrame({ children }: { children: React.ReactNode }) {
  const { isDarkMode, setDarkMode } = usePersona();
  const { toggle: toggleTheme, ready: themeReady } = useTheme(setDarkMode, isDarkMode);

  return (
    <div className="p1 flex min-h-screen flex-col font-p1sans">
      <a href="#p1-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-p1-accent focus:px-4 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-p1-accent-on">Skip to content</a>

      <header className="sticky top-0 z-40 border-b border-p1-border bg-p1-surface/90 backdrop-blur supports-[backdrop-filter]:bg-p1-surface/80">
        <div className="mx-auto flex h-14 w-full max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/phase1" className="flex items-center gap-2.5" aria-label="V-RENT agent hub">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-p1-primary font-p1display text-[19px] font-semibold text-white">V</span>
            <span className="hidden sm:block">
              <span className="block text-[15px] font-semibold leading-4 tracking-tight text-p1-text">V-RENT</span>
              <span className="block text-[11.5px] font-medium text-p1-text-3">Agent hub</span>
            </span>
          </Link>

          <div className="flex-1" />

          <button type="button" onClick={toggleTheme} aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} className="flex h-10 w-10 items-center justify-center rounded-lg text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text cursor-pointer">
            {themeReady && isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link href="/phase1/login" className="flex h-10 items-center rounded-lg px-3 text-[14px] font-medium text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text">Sign in</Link>
          <Link href="/phase1/signup" className="flex h-10 items-center rounded-lg bg-p1-primary px-4 text-[14px] font-medium text-p1-primary-on hover:bg-p1-primary-hover">Create account</Link>
        </div>
      </header>

      <main id="p1-main" className="flex-1" tabIndex={-1}>
        <div className="vr-fade mx-auto w-full max-w-[1320px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</div>
      </main>

      <footer className="mt-6 border-t border-p1-border bg-p1-surface">
        <div className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-[12.5px] text-p1-text-3 sm:px-6 lg:px-8">
          <span>V-RENT is for CEA-registered salespersons. Registrations are checked against the public register.</span>
          <span className="flex items-center gap-4">
            <Link href="/phase1/login" className="hover:text-p1-text">Sign in</Link>
            <Link href="/phase1/signup" className="hover:text-p1-text">Create an account</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

function Phase1Frame({ children }: { children: React.ReactNode }) {
  const { state } = useDemo();
  const { user, isAdmin: isAdminAccount, signOut } = useSession();
  const { isDarkMode, setDarkMode } = usePersona();
  const { toggle: toggleTheme, ready: themeReady } = useTheme(setDarkMode, isDarkMode);
  const pathname = usePathname();
  const router = useRouter();
  const crumbs = useCrumbs(pathname);
  const searchRef = useRef<HTMLInputElement>(null);

  const [drawer, setDrawer] = useState(false);
  const [pop, setPop] = useState<null | 'bell' | 'help' | 'user'>(null);
  const [q, setQ] = useState('');
  const close = () => setDrawer(false);

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

  // Keyboard: "/" or Ctrl+K focuses search; "n" opens the create wizard from the agent workspace.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
      if (e.key === 'n' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && !pathname.startsWith('/phase1/admin')) { e.preventDefault(); router.push('/phase1/listings/new'); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pathname, router]);

  // Which console is on screen follows the URL; whether it may be opened follows the account.
  const isAdmin = isAdminAccount && pathname.startsWith('/phase1/admin');

  // Queue sizes come from the server for staff: a badge that disagrees with the
  // page it points at is worse than no badge. Fixtures are the fallback until
  // the first response lands.
  const [queues, setQueues] = useState({ verification: VERIFICATION_QUEUE.length, moderation: MODERATION_QUEUE.length });
  useEffect(() => {
    if (!isAdminAccount) return;
    let live = true;
    fetch('/api/phase1/admin/queues')
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { verification?: number; moderation?: number } | null) => {
        if (!live || !body) return;
        setQueues({
          verification: body.verification ?? VERIFICATION_QUEUE.length,
          moderation: body.moderation ?? MODERATION_QUEUE.length,
        });
      })
      .catch(() => {});
    return () => { live = false; };
  }, [isAdminAccount, pathname]);

  const attention = state.listings.filter((l) => !l.archived && (l.status === 'rejected' || (l.status === 'draft' && l.images === 0))).length;
  const newEnquiries = state.enquiries.filter((e) => e.status === 'new').length;

  const agentGroups: NavGroup[] = [
    { title: 'Workspace', items: [
      { href: '/phase1', label: 'Agent hub', icon: Home, exact: true },
      { href: '/phase1/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/phase1/listings', label: 'Listings', icon: Building2, exact: true, badge: attention, badgeTone: 'danger' },
      { href: '/phase1/properties', label: 'Properties', icon: MapPinned },
      { href: '/phase1/listings/new', label: 'Create listing', icon: Plus },
      { href: '/phase1/listings/import', label: 'Bulk import', icon: Upload },
    ] },
    { title: 'Business', items: [
      { href: '/phase1/checkout', label: 'Subscription', icon: CreditCard },
      { href: '/phase1/performance', label: 'Performance', icon: TrendingUp },
    ] },
    { title: 'Account', items: [
      { href: '/phase1/profile', label: 'Profile', icon: IdCard },
      { href: '/phase1/status', label: 'Verification', icon: ShieldCheck },
      { href: '/phase1/settings', label: 'Settings', icon: Settings },
    ] },
  ];

  const adminGroups: NavGroup[] = [
    { items: [{ href: '/phase1/admin', label: 'Overview', icon: LayoutGrid, exact: true }] },
    { title: 'Queues', items: [
      { href: '/phase1/admin/verification', label: 'Verification', icon: ShieldCheck, badge: queues.verification, badgeTone: 'warning' },
      { href: '/phase1/admin/moderation', label: 'Moderation', icon: Gavel, badge: queues.moderation, badgeTone: 'warning' },
    ] },
    { title: 'Directory', items: [{ href: '/phase1/admin/agents', label: 'Agents', icon: Users }] },
    { title: 'Billing', items: [{ href: '/phase1/admin/subscriptions', label: 'Subscriptions', icon: Receipt }] },
    { title: 'Insight', items: [{ href: '/phase1/admin/reports', label: 'Reports & audit', icon: BarChart3 }] },
  ];

  const notifications = [
    ...state.enquiries.filter((e) => e.status === 'new').slice(0, 2).map((e) => ({ t: `New enquiry from ${e.name}`, b: e.message, tone: 'info' as const, href: `/phase1/listings/${e.listingId}?tab=enquiries` })),
    state.approval === 'under_review' && { t: 'Application received', b: 'A verification officer will review your CEA details, usually within one business day.', tone: 'info' as const },
    state.approval === 'approved' && !state.plan && { t: 'You are verified', b: 'Choose a plan to start publishing listings.', tone: 'success' as const, href: '/phase1/plans' },
    state.subscription === 'past_due' && { t: 'Renewal payment failed', b: 'Update your payment method. Listings stay live during the grace period.', tone: 'warning' as const, href: '/phase1/checkout' },
    !state.ceaValid && { t: 'CEA registration lapsed', b: 'Publication is paused until the register shows a valid registration.', tone: 'danger' as const, href: '/phase1/status' },
    state.listings.some((l) => l.id === 'lst-5' && l.status === 'rejected') && { t: 'Listing VR-24058 rejected', b: 'Photographs appear to show a different unit. Correct and resubmit.', tone: 'danger' as const, href: '/phase1/listings/lst-5' },
  ].filter(Boolean) as { t: string; b: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral'; href?: string }[];

  const userName = shortName(user) || 'Signed out';
  const userSub = user?.role === 'admin'
    ? 'Operations'
    : agencyLabel(user, { short: true }) || user?.email || '';

  const sidebar = (
    <div className={cx('flex h-full flex-col text-white', isAdmin ? 'bg-p1-sidebar-2' : 'bg-p1-sidebar')}>
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <Link href={isAdmin ? '/phase1/admin' : '/phase1/dashboard'} className="flex items-center gap-2.5 rounded-lg" aria-label="V-RENT home">
          <span className={cx('flex h-9 w-9 items-center justify-center rounded-lg font-p1display text-[20px] font-semibold', isAdmin ? 'bg-white/10 text-p1-accent ring-1 ring-white/20' : 'bg-p1-accent text-[#0B1E3F]')}>V</span>
          <span>
            <span className="block text-[15px] font-semibold leading-5 tracking-tight">V-RENT</span>
            <span className={cx('block text-[11.5px] font-medium', isAdmin ? 'text-white/55' : 'text-p1-accent')}>{isAdmin ? 'Operations console' : 'Agent workspace'}</span>
          </span>
        </Link>
        <button type="button" onClick={close} className="flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white xl:hidden cursor-pointer" aria-label="Close menu"><X size={20} /></button>
      </div>

      {isAdmin && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-p1-warning/40 bg-p1-warning/10 px-3 py-2 text-[12px] text-white/85">
          <span className="h-1.5 w-1.5 rounded-full bg-p1-warning" aria-hidden /> Internal · staff only
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 pb-3" aria-label="Main">
        <SidebarGroups groups={isAdmin ? adminGroups : agentGroups} pathname={pathname} onNavigate={close} />
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        {isAdminAccount && (
          isAdmin ? (
            <Link href="/phase1/dashboard" className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] text-white/70 hover:bg-white/8 hover:text-white">
              <ArrowLeftRight size={15} aria-hidden /> Switch to agent workspace
            </Link>
          ) : (
            <Link href="/phase1/admin" className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] text-white/70 hover:bg-white/8 hover:text-white">
              <ArrowLeftRight size={15} aria-hidden /> Open operations console
            </Link>
          )
        )}
        <div className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2">
          <Avatar name={userName} size="sm" tone={isAdmin ? 'neutral' : 'accent'} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-white">{userName}</div>
            <div className="truncate text-[11.5px] text-white/55">{userSub}</div>
          </div>
          <button type="button" onClick={() => void signOut()} title="Sign out" aria-label="Sign out"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white">
            <LogOut size={15} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );

  const bottomNav: (NavItem | { menu: true })[] = isAdmin
    ? [{ href: '/phase1/admin', label: 'Overview', icon: LayoutGrid, exact: true }, { href: '/phase1/admin/verification', label: 'Verify', icon: ShieldCheck }, { href: '/phase1/admin/moderation', label: 'Moderate', icon: Gavel }, { href: '/phase1/admin/agents', label: 'Agents', icon: Users }, { menu: true }]
    : [{ href: '/phase1/dashboard', label: 'Dashboard', icon: LayoutDashboard }, { href: '/phase1/listings', label: 'Listings', icon: Building2, exact: true }, { href: '/phase1/listings/new', label: 'Create', icon: Plus }, { href: '/phase1/properties', label: 'Properties', icon: MapPinned }, { menu: true }];

  const submitSearch = () => {
    const term = q.trim();
    router.push(isAdmin ? `/phase1/admin/agents${term ? `?q=${encodeURIComponent(term)}` : ''}` : `/phase1/listings${term ? `?q=${encodeURIComponent(term)}` : ''}`);
  };

  return (
    <div className="p1 min-h-screen font-p1sans">
      <a href="#p1-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-p1-accent focus:px-4 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-p1-accent-on">Skip to content</a>

      {drawer && (
        <div className="fixed inset-0 z-[60] xl:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="p1-overlay absolute inset-0 bg-black/50" onClick={close} aria-hidden />
          <div className="p1-drawer-left absolute inset-y-0 left-0 w-[288px] max-w-[85vw] shadow-p1-lg">{sidebar}</div>
        </div>
      )}

      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[256px] shrink-0 xl:block">{sidebar}</aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-p1-border bg-p1-surface/90 backdrop-blur supports-[backdrop-filter]:bg-p1-surface/80">
            <div className="flex h-14 items-center gap-2 px-3 sm:px-5 lg:px-6">
              <button type="button" onClick={() => setDrawer(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-p1-text-2 hover:bg-p1-subtle xl:hidden cursor-pointer" aria-label="Open menu"><MenuIcon size={21} /></button>
              <Link href={isAdmin ? '/phase1/admin' : '/phase1/dashboard'} className="flex items-center gap-2 xl:hidden" aria-label="V-RENT home">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-p1-primary font-p1display text-[16px] font-semibold text-white">V</span>
              </Link>

              <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 md:block">
                <ol className="flex items-center gap-1 text-[13px] text-p1-text-3">
                  {crumbs.map((c, i) => (
                    <li key={c.href} className="flex min-w-0 items-center gap-1">
                      {i < crumbs.length - 1 ? <Link href={c.href} className="truncate rounded hover:text-p1-text hover:underline underline-offset-4">{c.label}</Link> : <span className="truncate font-medium text-p1-text" aria-current="page">{c.label}</span>}
                      {i < crumbs.length - 1 && <ChevronRight size={13} aria-hidden className="shrink-0 text-p1-border-strong" />}
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="flex-1 md:hidden" />

              <div className="flex items-center gap-0.5">
                <form className="relative hidden md:block" role="search" onSubmit={(e) => { e.preventDefault(); submitSearch(); }}>
                  <label htmlFor="p1-global-search" className="sr-only">{isAdmin ? 'Search agents' : 'Search listings'}</label>
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-p1-text-3" aria-hidden />
                  <input ref={searchRef} id="p1-global-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={isAdmin ? 'Search agents, CEA numbers' : 'Search listings, references'} className="h-9 w-48 rounded-lg border border-p1-border bg-p1-bg pl-9 pr-9 text-[13.5px] text-p1-text placeholder:text-p1-text-3 hover:border-p1-border-strong lg:w-64" />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"><Kbd>/</Kbd></span>
                </form>

                <button type="button" onClick={toggleTheme} aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={isDarkMode ? 'Light mode' : 'Dark mode'} className="flex h-10 w-10 items-center justify-center rounded-lg text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text cursor-pointer">
                  {themeReady && isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <div className="relative">
                  <button type="button" onClick={() => setPop(pop === 'bell' ? null : 'bell')} aria-haspopup="dialog" aria-expanded={pop === 'bell'} aria-label={`Notifications, ${notifications.length} unread`} className="relative flex h-10 w-10 items-center justify-center rounded-lg text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text cursor-pointer">
                    <Bell size={18} />
                    {notifications.length > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-p1-danger px-1 text-[10px] font-bold text-white">{notifications.length}</span>}
                  </button>
                  <Popover open={pop === 'bell'} onClose={() => setPop(null)} width="w-96">
                    <div className="flex items-center justify-between border-b border-p1-border px-4 py-3">
                      <span className="text-[14px] font-semibold text-p1-text">Notifications</span>
                      {!isAdmin && newEnquiries > 0 && <Link href="/phase1/dashboard#enquiries" onClick={() => setPop(null)} className="text-[12.5px] font-medium text-p1-primary hover:underline underline-offset-4 dark:text-p1-info">{newEnquiries} new enquir{newEnquiries === 1 ? 'y' : 'ies'}</Link>}
                    </div>
                    <ul className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-p1-text-3">You are all caught up.</li>}
                      {notifications.map((n, i) => {
                        const dot = { info: 'bg-p1-info', success: 'bg-p1-success', warning: 'bg-p1-warning', danger: 'bg-p1-danger', neutral: 'bg-p1-text-3' }[n.tone];
                        const body = (
                          <div className="flex gap-3 px-4 py-3">
                            <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', dot)} aria-hidden />
                            <div className="min-w-0">
                              <div className="text-[13.5px] font-medium leading-5 text-p1-text">{n.t}</div>
                              <div className="mt-0.5 line-clamp-2 text-[12.5px] leading-5 text-p1-text-2">{n.b}</div>
                            </div>
                          </div>
                        );
                        return <li key={i} className="border-b border-p1-border last:border-b-0 hover:bg-p1-subtle/60">{n.href ? <Link href={n.href} onClick={() => setPop(null)}>{body}</Link> : body}</li>;
                      })}
                    </ul>
                  </Popover>
                </div>

                <div className="relative hidden sm:block">
                  <button type="button" onClick={() => setPop(pop === 'help' ? null : 'help')} aria-haspopup="dialog" aria-expanded={pop === 'help'} aria-label="Help and support" className="flex h-10 w-10 items-center justify-center rounded-lg text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text cursor-pointer">
                    <HelpCircle size={18} />
                  </button>
                  <Popover open={pop === 'help'} onClose={() => setPop(null)} width="w-72">
                    <div className="px-4 py-3 text-[14px] font-semibold text-p1-text">Help and support</div>
                    <ul className="border-t border-p1-border py-1 text-[13.5px]">
                      {[{ i: BookOpen, t: 'Agent guide', d: 'How listings, plans and verification work' }, { i: MessageCircle, t: 'Chat with support', d: 'Weekdays 9am – 6pm SGT' }, { i: Phone, t: 'Call +65 6000 0000', d: 'Urgent account issues' }].map((h) => (
                        <li key={h.t}><button type="button" className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-p1-subtle/60 cursor-pointer"><h.i size={16} className="mt-0.5 shrink-0 text-p1-text-3" aria-hidden /><span><span className="block font-medium text-p1-text">{h.t}</span><span className="block text-[12.5px] text-p1-text-3">{h.d}</span></span></button></li>
                      ))}
                    </ul>
                    <div className="border-t border-p1-border px-4 py-2.5 text-[12px] text-p1-text-3">
                      Shortcuts: <Kbd>/</Kbd> search{!isAdmin && <> · <Kbd>n</Kbd> new listing</>}
                    </div>
                  </Popover>
                </div>

                <div className="relative ml-1">
                  <button type="button" onClick={() => setPop(pop === 'user' ? null : 'user')} aria-haspopup="menu" aria-expanded={pop === 'user'} className="flex h-10 items-center gap-2 rounded-lg pl-1 pr-1.5 hover:bg-p1-subtle cursor-pointer">
                    <Avatar name={userName} size="sm" tone={isAdmin ? 'neutral' : 'primary'} />
                    <ChevronDown size={14} className="text-p1-text-3" aria-hidden />
                  </button>
                  <Popover open={pop === 'user'} onClose={() => setPop(null)} width="w-72">
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <Avatar name={userName} size="md" />
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-semibold text-p1-text">{userName}</div>
                        <div className="truncate text-[12.5px] text-p1-text-3">{isAdmin ? 'ops.lena@v-rent.sg' : state.profile.email}</div>
                      </div>
                    </div>
                    {!isAdmin && (
                      <div className="border-t border-p1-border px-4 py-3">
                        <div className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-p1-text-3">Account standing</div>
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge kind="agent" value={state.profileSubmitted ? state.approval : 'not_submitted'} size="sm" />
                          <StatusBadge kind="subscription" value={state.subscription} size="sm" />
                        </div>
                      </div>
                    )}
                    <ul className="border-t border-p1-border py-1 text-[13.5px]">
                      {!isAdmin && <li><Link href="/phase1/profile" onClick={() => setPop(null)} className="flex h-10 items-center gap-3 px-4 hover:bg-p1-subtle/60"><IdCard size={15} className="text-p1-text-3" aria-hidden /> My profile</Link></li>}
                      {!isAdmin && <li><Link href="/phase1/checkout" onClick={() => setPop(null)} className="flex h-10 items-center gap-3 px-4 hover:bg-p1-subtle/60"><Receipt size={15} className="text-p1-text-3" aria-hidden /> Subscription and billing</Link></li>}
                      {!isAdmin && <li><Link href="/phase1/settings" onClick={() => setPop(null)} className="flex h-10 items-center gap-3 px-4 hover:bg-p1-subtle/60"><Settings size={15} className="text-p1-text-3" aria-hidden /> Settings</Link></li>}
                      <li><Link href="/phase1/login" onClick={() => setPop(null)} className="flex h-10 items-center gap-3 px-4 hover:bg-p1-subtle/60"><LogOut size={15} className="text-p1-text-3" aria-hidden /> Sign out</Link></li>
                    </ul>

                  </Popover>
                </div>
              </div>
            </div>
          </header>

          <main id="p1-main" className="flex-1 pb-24 xl:pb-10" tabIndex={-1}>
            <div key={pathname} className="vr-fade mx-auto w-full max-w-[1320px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>

      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-p1-border bg-p1-surface/95 backdrop-blur xl:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="grid grid-cols-5">
          {bottomNav.map((item, i) => {
            if ('menu' in item) {
              return (
                <li key="menu">
                  <button type="button" onClick={() => setDrawer(true)} className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-p1-text-3 cursor-pointer" aria-label="Open full menu">
                    <span className="flex h-7 w-12 items-center justify-center rounded-full"><MenuIcon size={19} aria-hidden /></span>
                    More
                  </button>
                </li>
              );
            }
            const active = isActive(pathname, item);
            const Icon = item.icon;
            const isCreate = item.href === '/phase1/listings/new';
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? 'page' : undefined} className={cx('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium', active ? 'text-p1-primary dark:text-p1-accent' : 'text-p1-text-3')}>
                  <span className={cx('flex h-7 w-12 items-center justify-center rounded-full', isCreate ? 'bg-p1-accent text-p1-accent-on' : active && 'bg-p1-primary-soft')}><Icon size={19} aria-hidden /></span>
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
