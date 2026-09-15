"use client";

/**
 * Phase 1 application shell.
 *
 * Two navigation models share one frame: the agent workspace and the
 * operations console for staff. Which one a person sees follows the role on
 * their session, and the console is only offered to accounts that can actually
 * open it — the authorisation itself is enforced server-side in
 * `app/phase1/admin/layout.tsx`.
 *
 * The navigation is deliberately short. Seven places an agent goes every day
 * sit at the top; the tools they reach for weekly fold into two groups that
 * open on their own when the current page is inside them; everything about the
 * account lives under the avatar. Both follow the theme through the same
 * tokens; the console is told apart by its "Ops" mark and its own navigation.
 *
 * Sign-in, sign-up, share links, the client document and the public
 * marketplace render without this frame.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from './Toast';
import {
  FileSpreadsheet, ShieldCheck, IdCard, CreditCard, LayoutDashboard, Building2, Plus, Gavel, Receipt, BarChart3, Users,
  Menu as MenuIcon, X, Sun, Moon, Bell, HelpCircle, LogOut, LayoutGrid, Search, BookOpen, MessageCircle, Phone,
  Settings, TrendingUp, ChevronRight, ChevronDown, ArrowLeftRight, Rocket, RefreshCw, FileText, CalendarClock, LineChart,
  GitCompareArrows, LayoutPanelTop, Trees, QrCode, Star, LifeBuoy, Video, Megaphone, Compass, PanelLeftClose, PanelLeftOpen,
  Globe, Home,
} from 'lucide-react';
import { useDemo } from '../../lib/phase1/DemoContext';
import { usePersona } from '../layout/PersonaContext';
import { useTheme } from './hooks';
import { Avatar, Kbd, Tooltip, cx } from './kit';
import { StatusBadge } from './status';
import { useSession, shortName, agencyLabel } from '../../lib/phase1/SessionContext';
import { MODERATION_QUEUE, VERIFICATION_QUEUE } from '../../lib/phase1/data';
import { PublicFrame } from './landing/PublicFrame';

type Icon = React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;
interface NavItem { href: string; label: string; icon: Icon; exact?: boolean; badge?: number; badgeTone?: 'neutral' | 'warning' | 'danger' | 'info'; also?: string[] }
interface NavGroup { key: string; title?: string; items: NavItem[]; collapsible?: boolean; icon?: Icon }

function isActive(pathname: string, item: NavItem) {
  const match = (href: string) => pathname === href || pathname.startsWith(href + '/');
  if (item.exact) return pathname === item.href || (item.also ?? []).some(match);
  return match(item.href) || (item.also ?? []).some(match);
}

const TITLES: Record<string, string> = {
  phase1: 'Home', signup: 'Create account', login: 'Sign in', verify: 'Verify contact', profile: 'Profile',
  status: 'Verification', plans: 'Plans', checkout: 'Subscription', payment: 'Payment', sandbox: 'Sandbox checkout', dashboard: 'Dashboard', properties: 'Properties',
  listings: 'Listings', new: 'Create listing', import: 'Bulk import', reports: 'Reports', admin: 'Operations', agents: 'Agents', performance: 'Performance', settings: 'Settings',
  verification: 'Verification', moderation: 'Moderation', subscriptions: 'Subscriptions',
  featured: 'Featured placement', refresh: 'Automatic refresh', placement: 'Search placement',
  viewings: 'Viewings', whatsapp: 'WhatsApp handover', shortlists: 'Client shortlists',
  market: 'Market data', transactions: 'Transactions', compare: 'Compare projects',
  floorplans: 'Floor plans', neighbourhood: 'Neighbourhood', agent: 'Public page', qr: 'QR code',
  learn: 'Guides', sessions: 'Sessions', support: 'Support', print: 'Printable report',
  export: 'Export', shortlist: 'Shortlist', enquiries: 'Enquiries',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const QUEUE_POLL_MS = 15_000;
const COLLAPSE_KEY = 'vrent_nav_collapsed';

function crumbLabel(segment: string): string {
  if (TITLES[segment]) return TITLES[segment];
  if (segment.startsWith('lst-') || segment.startsWith('imp-') || segment.startsWith('oth-')) return 'Listing';
  if (segment.startsWith('agt-') || UUID.test(segment)) return 'Agent';
  return segment;
}

/** Crumbs only where they help: on a page two levels below a section. */
function useCrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean).slice(1);
  if (parts.length < 2) return [];
  return parts.map((p, i) => ({ label: crumbLabel(p), href: '/phase1/' + parts.slice(0, i + 1).join('/') }));
}

function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/* ------------------------------------------------------------------ popover */

function Popover({ open, onClose, children, align = 'right', width = 'w-80' }: { open: boolean; onClose: () => void; children: React.ReactNode; align?: 'left' | 'right'; width?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onClose(); };
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

function NavLink({ item, pathname, onNavigate, rail }: { item: NavItem; pathname: string; onNavigate: () => void; rail: boolean }) {
  const active = isActive(pathname, item);
  const Icon = item.icon;
  const hasBadge = typeof item.badge === 'number' && item.badge > 0;
  const badgeCls = {
    neutral: 'bg-p1-subtle text-p1-text-2',
    warning: 'bg-p1-warning-soft text-p1-warning',
    danger: 'bg-p1-danger-soft text-p1-danger',
    info: 'bg-p1-primary-soft text-p1-primary',
  }[item.badgeTone ?? 'neutral'];

  const link = (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      aria-label={rail ? `${item.label}${hasBadge ? `, ${item.badge}` : ''}` : undefined}
      onClick={onNavigate}
      className={cx(
        'group relative z-[1] flex h-9 items-center gap-3 rounded-lg text-[13.5px] transition-colors duration-150',
        rail ? 'justify-center px-0' : 'px-2.5',
        active ? 'font-medium text-p1-text' : 'text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text',
      )}
    >
      <Icon
        size={17}
        strokeWidth={active ? 2.2 : 1.9}
        className={cx('shrink-0 transition-colors', active ? 'text-p1-primary' : 'text-p1-text-3 group-hover:text-p1-text-2')}
        aria-hidden
      />
      {!rail && <span className="flex-1 truncate">{item.label}</span>}
      {hasBadge && !rail && (
        <span className={cx('flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums', badgeCls)}>{item.badge}</span>
      )}
      {hasBadge && rail && (
        <span className={cx('absolute right-2 top-1.5 h-2 w-2 rounded-full ring-2', item.badgeTone === 'danger' ? 'bg-p1-danger' : 'bg-p1-warning', 'ring-p1-surface')} aria-hidden />
      )}
    </Link>
  );

  return rail ? <Tooltip content={item.label} side="right">{link}</Tooltip> : link;
}

function SidebarNav({ groups, pathname, onNavigate, rail }: { groups: NavGroup[]; pathname: string; onNavigate: () => void; rail: boolean }) {
  const holder = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // A group opens on its own when the page you are on is inside it.
  const groupOpen = (g: NavGroup) => !g.collapsible || rail || open[g.key] || g.items.some((i) => isActive(pathname, i));

  /* The active highlight is one element that slides between items, so moving
     from Listings to Enquiries reads as a move rather than two flashes. */
  const measure = useCallback(() => {
    const el = holder.current?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!el || !holder.current) { setIndicator(null); return; }
    const box = holder.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setIndicator({ top: r.top - box.top + holder.current.scrollTop, height: r.height });
  }, []);

  useLayoutEffect(() => { measure(); }, [measure, pathname, rail, open]);
  useEffect(() => {
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (holder.current) ro?.observe(holder.current);
    return () => ro?.disconnect();
  }, [measure]);

  return (
    <div ref={holder} className="relative">
      {indicator && (
        <span
          aria-hidden
          className={cx('pointer-events-none absolute inset-x-0 z-0 rounded-lg transition-[transform,height] duration-200 ease-out', 'bg-p1-primary-soft/70 dark:bg-p1-subtle')}
          style={{ height: indicator.height, transform: `translateY(${indicator.top}px)`, top: 0 }}
        />
      )}
      {groups.map((g, gi) => {
        const expanded = groupOpen(g);
        const GroupIcon = g.icon;
        return (
          <div key={g.key} className={cx(gi > 0 && (rail ? 'mt-2 border-t pt-2' : g.collapsible ? 'mt-1' : 'mt-5'), gi === 1 && !rail && 'mt-5', rail && 'border-p1-border')}>
            {g.title && !rail && (
              g.collapsible ? (
                <button
                  type="button"
                  onClick={() => setOpen((s) => ({ ...s, [g.key]: !expanded }))}
                  aria-expanded={expanded}
                  className={cx('mb-1 flex h-8 w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 text-[13.5px] transition-colors', 'text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text')}
                >
                  {GroupIcon && <GroupIcon size={17} strokeWidth={1.9} className="text-p1-text-3" aria-hidden />}
                  <span className="flex-1 text-left">{g.title}</span>
                  <ChevronDown size={14} className={cx('transition-transform duration-200', expanded ? 'rotate-0' : '-rotate-90', 'text-p1-text-3')} aria-hidden />
                </button>
              ) : (
                <div className="px-2.5 pb-1.5 text-[11.5px] font-medium text-p1-text-3">{g.title}</div>
              )
            )}
            {/* Grid rows animate the height of a group without measuring it. */}
            <div className={cx('grid transition-[grid-template-rows] duration-200 ease-out', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <ul className={cx('flex min-h-0 flex-col gap-0.5 overflow-hidden', g.collapsible && !rail && 'pl-4', g.collapsible && !rail && expanded && 'pb-1')} onTransitionEnd={measure}>
                {g.items.map((item) => (
                  <li key={item.href}><NavLink item={item} pathname={pathname} onNavigate={onNavigate} rail={rail} /></li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-p1-primary text-[15px] font-bold tracking-tight text-p1-primary-on', className)} aria-hidden>
      V
    </span>
  );
}

/* -------------------------------------------------------------------- shell */

const BARE_ROUTES = ['/phase1/login', '/phase1/signup', '/phase1/forgot', '/phase1/reset'];
/**
 * Pages that bring their own frame: a shared listing and the public
 * marketplace are tenant-facing, and the shortlist is a document — workspace
 * navigation would end up in the PDF.
 */
const BARE_PREFIXES = ['/phase1/share/', '/phase1/listings/export', '/phase1/homes'];

export function Phase1Shell({ children }: { children: React.ReactNode }) {
  const pathnameForFrame = usePathname();
  const { user } = useSession();
  if (BARE_PREFIXES.some((p) => pathnameForFrame.startsWith(p))) return <>{children}</>;
  if (BARE_ROUTES.includes(pathnameForFrame)) {
    return <div className="p1 font-p1sans">{children}</div>;
  }
  if (!user) return <PublicFrame>{children}</PublicFrame>;
  return <Phase1Frame>{children}</Phase1Frame>;
}

function Phase1Frame({ children }: { children: React.ReactNode }) {
  const { state, markAlertsRead } = useDemo();
  const { user, isAdmin: isAdminAccount, signOut } = useSession();
  const { isDarkMode, setDarkMode } = usePersona();
  const { toggle: toggleTheme, ready: themeReady } = useTheme(setDarkMode, isDarkMode);
  const pathname = usePathname();
  const router = useRouter();
  const { push } = useToast();

  /* Signing out navigates to the sign-in page, which on its own is hard to
     tell from a session that expired. Saying it was deliberate is the point. */
  const signOutAndSay = () => {
    push({ tone: 'success', title: 'Signed out', body: 'Your session on this device has ended.' });
    void signOut();
  };
  const crumbs = useCrumbs(pathname);
  const searchRef = useRef<HTMLInputElement>(null);

  const [drawer, setDrawer] = useState(false);
  const [pop, setPop] = useState<null | 'bell' | 'help' | 'user'>(null);
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const wide = useMedia('(min-width: 1280px)');
  const close = () => setDrawer(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a remembered preference, read once after mount
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1'); } catch { /* storage blocked: stay expanded */ }
  }, []);
  const toggleCollapsed = () => setCollapsed((c) => {
    try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* not remembered, still toggles */ }
    return !c;
  });
  /** Icons only: always between 1024 and 1279, and above that when the agent chose it. */
  const rail = !wide || collapsed;

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

  const isAdmin = isAdminAccount && pathname.startsWith('/phase1/admin');

  // Queue sizes come from the server for staff: a badge that disagrees with the
  // page it points at is worse than no badge. Fixtures are the fallback until
  // the first response lands.
  const [queues, setQueues] = useState({ verification: VERIFICATION_QUEUE.length, moderation: MODERATION_QUEUE.length });
  const seen = useRef<{ verification: number; moderation: number } | null>(null);
  useEffect(() => {
    if (!isAdminAccount) return;
    let live = true;

    /**
     * Work arrives from other people. When the count has changed, the screen
     * itself is re-rendered from the server too — that is what brings the new
     * row into the list rather than only moving a number in the sidebar.
     */
    const poll = async () => {
      if (!live || document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/phase1/admin/queues', { cache: 'no-store' });
        if (!res.ok || !live) return;
        const body = (await res.json()) as { verification?: number; moderation?: number };
        const next = {
          verification: body.verification ?? VERIFICATION_QUEUE.length,
          moderation: body.moderation ?? MODERATION_QUEUE.length,
        };
        if (!live) return;
        setQueues(next);
        const before = seen.current;
        seen.current = next;
        if (before && (before.verification !== next.verification || before.moderation !== next.moderation)) {
          router.refresh();
        }
      } catch {
        /* offline or mid-deploy: leave the badge as it stands */
      }
    };

    void poll();
    const id = setInterval(poll, QUEUE_POLL_MS);
    document.addEventListener('visibilitychange', poll);
    return () => {
      live = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [isAdminAccount, pathname, router]);

  const attention = state.listings.filter((l) => !l.archived && (l.status === 'rejected' || (l.status === 'draft' && l.images === 0))).length;
  const newEnquiries = state.enquiries.filter((e) => e.status === 'new').length;

  const agentGroups: NavGroup[] = [
    { key: 'main', items: [
      { href: '/phase1/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/phase1/listings', label: 'Listings', icon: Building2, badge: attention, badgeTone: 'danger', also: ['/phase1/properties'] },
      { href: '/phase1/enquiries', label: 'Enquiries', icon: MessageCircle, badge: newEnquiries, badgeTone: 'info' },
      { href: '/phase1/viewings', label: 'Viewings', icon: CalendarClock },
      { href: '/phase1/performance', label: 'Performance', icon: TrendingUp },
    ] },
    { key: 'grow', title: 'Marketing', icon: Megaphone, collapsible: true, items: [
      { href: '/phase1/featured', label: 'Featured placement', icon: Rocket },
      { href: '/phase1/refresh', label: 'Automatic refresh', icon: RefreshCw },
      { href: '/phase1/placement', label: 'Search placement', icon: Star },
      { href: '/phase1/shortlists', label: 'Client shortlists', icon: FileText },
      { href: '/phase1/whatsapp', label: 'WhatsApp handover', icon: Phone },
      { href: '/phase1/agent', label: 'Public page', icon: Globe },
      { href: '/phase1/qr', label: 'QR code', icon: QrCode },
    ] },
    { key: 'insight', title: 'Insights', icon: LineChart, collapsible: true, items: [
      { href: '/phase1/market/transactions', label: 'Transactions', icon: LineChart },
      { href: '/phase1/market/compare', label: 'Compare projects', icon: GitCompareArrows },
      { href: '/phase1/floorplans', label: 'Floor plans', icon: LayoutPanelTop },
      { href: '/phase1/neighbourhood', label: 'Neighbourhood', icon: Trees },
      { href: '/phase1/reports', label: 'Reports', icon: FileSpreadsheet },
    ] },
    { key: 'account', title: 'Account', items: [
      { href: '/phase1/checkout', label: 'Subscription', icon: CreditCard, also: ['/phase1/plans', '/phase1/payment'] },
      { href: '/phase1/profile', label: 'Profile & CEA', icon: IdCard, also: ['/phase1/status'] },
    ] },
  ];

  const adminGroups: NavGroup[] = [
    { key: 'main', items: [{ href: '/phase1/admin', label: 'Overview', icon: LayoutGrid, exact: true }] },
    { key: 'queues', title: 'Queues', items: [
      { href: '/phase1/admin/verification', label: 'Verification', icon: ShieldCheck, badge: queues.verification, badgeTone: 'warning' },
      { href: '/phase1/admin/moderation', label: 'Moderation', icon: Gavel, badge: queues.moderation, badgeTone: 'warning' },
    ] },
    { key: 'manage', title: 'Manage', items: [
      { href: '/phase1/admin/agents', label: 'Agents', icon: Users },
      { href: '/phase1/admin/subscriptions', label: 'Subscriptions', icon: Receipt },
      { href: '/phase1/admin/reports', label: 'Reports & audit', icon: BarChart3 },
    ] },
  ];

  const alerts = state.alerts;
  const unread = alerts.filter((a) => !a.read).length;

  const userName = shortName(user) || 'Signed out';
  const userSub = user?.role === 'admin'
    ? 'Operations'
    : agencyLabel(user, { short: true }) || user?.email || '';

  const sidebar = (forceExpanded: boolean) => {
    const r = forceExpanded ? false : rail;
    return (
      <div className="flex h-full flex-col border-r border-p1-border bg-p1-surface text-p1-text">
        <div className={cx('flex h-14 shrink-0 items-center', r ? 'justify-center px-2' : 'justify-between px-4')}>
          <Link href={isAdmin ? '/phase1/admin' : '/phase1/dashboard'} className="flex items-center gap-2.5 rounded-lg" aria-label="V-RENT home">
            <LogoMark />
            {!r && (
              <span className="flex items-center gap-2">
                <span className="text-[15px] font-semibold tracking-tight">V-RENT</span>
                {isAdmin && <span className="rounded-md bg-p1-subtle px-1.5 py-0.5 text-[11px] font-medium text-p1-text-2">Ops</span>}
              </span>
            )}
          </Link>
          {forceExpanded && (
            <button type="button" onClick={close} className={cx('flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg', 'text-p1-text-3 hover:bg-p1-subtle')} aria-label="Close menu"><X size={19} /></button>
          )}
        </div>

        <nav className={cx('flex-1 overflow-y-auto pb-3', r ? 'px-2' : 'px-3')} aria-label="Main">
          <SidebarNav groups={isAdmin ? adminGroups : agentGroups} pathname={pathname} onNavigate={close} rail={r} />
        </nav>

        <div className={cx('shrink-0 border-t py-2', r ? 'px-2' : 'px-3', 'border-p1-border')}>
          {isAdminAccount && (
            <NavLink
              item={isAdmin
                ? { href: '/phase1/dashboard', label: 'Agent workspace', icon: ArrowLeftRight }
                : { href: '/phase1/admin', label: 'Operations console', icon: ArrowLeftRight, exact: true }}
              pathname="" onNavigate={close} rail={r}
            />
          )}
          {!isAdmin && <NavLink item={{ href: '/phase1', label: 'All tools', icon: Compass, exact: true }} pathname={pathname} onNavigate={close} rail={r} />}
          {!forceExpanded && wide && (
            <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right" disabled={!collapsed}>
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className={cx('mt-0.5 flex h-9 w-full cursor-pointer items-center gap-3 rounded-lg text-[13.5px] transition-colors', r ? 'justify-center' : 'px-2.5',
                  'text-p1-text-3 hover:bg-p1-subtle hover:text-p1-text')}
              >
                {collapsed ? <PanelLeftOpen size={17} aria-hidden /> : <PanelLeftClose size={17} aria-hidden />}
                {!r && <span>Collapse</span>}
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    );
  };

  const bottomNav: (NavItem | { menu: true })[] = isAdmin
    ? [{ href: '/phase1/admin', label: 'Overview', icon: LayoutGrid, exact: true }, { href: '/phase1/admin/verification', label: 'Verify', icon: ShieldCheck, badge: queues.verification }, { href: '/phase1/admin/moderation', label: 'Moderate', icon: Gavel, badge: queues.moderation }, { href: '/phase1/admin/agents', label: 'Agents', icon: Users }, { menu: true }]
    : [{ href: '/phase1/dashboard', label: 'Home', icon: LayoutDashboard }, { href: '/phase1/listings', label: 'Listings', icon: Building2 }, { href: '/phase1/listings/new', label: 'Create', icon: Plus }, { href: '/phase1/enquiries', label: 'Enquiries', icon: MessageCircle, badge: newEnquiries }, { menu: true }];

  const submitSearch = () => {
    const term = q.trim();
    router.push(isAdmin ? `/phase1/admin/agents${term ? `?q=${encodeURIComponent(term)}` : ''}` : `/phase1/listings${term ? `?q=${encodeURIComponent(term)}` : ''}`);
  };

  const iconBtn = 'relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-p1-text-2 transition-colors hover:bg-p1-subtle hover:text-p1-text';

  return (
    <div className="p1 min-h-screen font-p1sans">
      <a href="#p1-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-p1-primary focus:px-4 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-p1-primary-on">Skip to content</a>

      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="p1-overlay absolute inset-0 bg-[#0B1220]/50" onClick={close} aria-hidden />
          <div className="p1-drawer-left absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-p1-lg">{sidebar(true)}</div>
        </div>
      )}

      <div className="flex min-h-screen">
        <aside data-print-hide className={cx('sticky top-0 hidden h-screen shrink-0 transition-[width] duration-200 ease-out lg:block', rail ? 'w-[64px]' : 'w-[232px]')}>
          {sidebar(false)}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header data-print-hide className="sticky top-0 z-40 border-b border-p1-border bg-p1-bg/85 backdrop-blur supports-[backdrop-filter]:bg-p1-bg/75">
            <div className="flex h-14 items-center gap-2 px-3 sm:px-5 lg:px-8">
              <button type="button" onClick={() => setDrawer(true)} className={cx(iconBtn, 'lg:hidden')} aria-label="Open menu"><MenuIcon size={20} /></button>
              <Link href={isAdmin ? '/phase1/admin' : '/phase1/dashboard'} className="flex items-center gap-2 lg:hidden" aria-label="V-RENT home">
                <LogoMark className="h-7 w-7 text-[13px]" />
              </Link>

              {crumbs.length > 0 ? (
                <nav aria-label="Breadcrumb" className="hidden min-w-0 md:block">
                  <ol className="flex items-center gap-1 text-[13px] text-p1-text-3">
                    {crumbs.map((c, i) => (
                      <li key={c.href} className="flex min-w-0 items-center gap-1">
                        {i < crumbs.length - 1 ? <Link href={c.href} className="truncate rounded hover:text-p1-text">{c.label}</Link> : <span className="truncate font-medium text-p1-text" aria-current="page">{c.label}</span>}
                        {i < crumbs.length - 1 && <ChevronRight size={13} aria-hidden className="shrink-0 text-p1-border-strong" />}
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}

              <div className="flex-1" />

              <form className="relative hidden md:block" role="search" onSubmit={(e) => { e.preventDefault(); submitSearch(); }}>
                <label htmlFor="p1-global-search" className="sr-only">{isAdmin ? 'Search agents' : 'Search listings'}</label>
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-p1-text-3" aria-hidden />
                <input ref={searchRef} id="p1-global-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={isAdmin ? 'Search agents or CEA numbers' : 'Search listings'} className="h-9 w-56 rounded-lg border border-p1-border bg-p1-surface pl-9 pr-14 text-[13.5px] text-p1-text transition-[width,border-color,box-shadow] duration-200 placeholder:text-p1-text-3 hover:border-p1-border-strong focus:w-72 focus:border-p1-primary focus:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none lg:w-64" />
                <span className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 gap-0.5"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
              </form>

              <div className="ml-1 flex items-center gap-0.5">
                <Tooltip content={isDarkMode ? 'Light mode' : 'Dark mode'} side="bottom">
                  <button type="button" onClick={toggleTheme} aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} className={iconBtn}>
                    {themeReady && isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
                  </button>
                </Tooltip>

                <div className="relative hidden sm:block">
                  <button type="button" onClick={() => setPop(pop === 'help' ? null : 'help')} aria-haspopup="dialog" aria-expanded={pop === 'help'} aria-label="Help and support" className={iconBtn}>
                    <HelpCircle size={17} />
                  </button>
                  <Popover open={pop === 'help'} onClose={() => setPop(null)} width="w-72">
                    <ul className="py-1.5 text-[13.5px]">
                      {[
                        { i: BookOpen, t: 'Guides', href: '/phase1/learn' },
                        { i: Video, t: 'Product sessions', href: '/phase1/learn/sessions' },
                        { i: LifeBuoy, t: 'Contact support', href: '/phase1/support' },
                        ...(!isAdmin ? [{ i: Compass, t: 'All tools', href: '/phase1' }] : []),
                      ].map((h) => (
                        <li key={h.t}><Link href={h.href} onClick={() => setPop(null)} className="flex h-9 items-center gap-3 px-4 hover:bg-p1-subtle"><h.i size={15} className="text-p1-text-3" aria-hidden />{h.t}</Link></li>
                      ))}
                    </ul>
                    <div className="border-t border-p1-border px-4 py-2.5 text-[12px] text-p1-text-3">
                      <Kbd>/</Kbd> search{!isAdmin && <> · <Kbd>N</Kbd> new listing</>}
                    </div>
                  </Popover>
                </div>

                <div className="relative">
                  <button type="button" onClick={() => { const opening = pop !== 'bell'; setPop(opening ? 'bell' : null); if (opening && unread > 0) markAlertsRead(); }} aria-haspopup="dialog" aria-expanded={pop === 'bell'} aria-label={`Notifications, ${unread} unread`} className={iconBtn}>
                    <Bell size={17} />
                    {unread > 0 && <span className="vr-pop absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-p1-danger px-1 text-[10px] font-bold text-white ring-2 ring-p1-bg">{unread}</span>}
                  </button>
                  <Popover open={pop === 'bell'} onClose={() => setPop(null)} width="w-[380px]">
                    <div className="flex items-center justify-between border-b border-p1-border px-4 py-3">
                      <span className="text-[14px] font-semibold text-p1-text">Notifications</span>
                      {!isAdmin && newEnquiries > 0 && <Link href="/phase1/enquiries" onClick={() => setPop(null)} className="text-[12.5px] font-medium text-p1-primary hover:underline underline-offset-4">{newEnquiries} new enquir{newEnquiries === 1 ? 'y' : 'ies'}</Link>}
                    </div>
                    <ul className="max-h-96 overflow-y-auto">
                      {alerts.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-p1-text-3">You&apos;re all caught up.</li>}
                      {alerts.slice(0, 12).map((n) => {
                        const dot = { info: 'bg-p1-info', success: 'bg-p1-success', warning: 'bg-p1-warning', danger: 'bg-p1-danger' }[n.tone];
                        const body = (
                          <div className={cx('flex gap-3 px-4 py-3', !n.read && 'bg-p1-primary-soft/40')}>
                            <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', dot)} aria-hidden />
                            <div className="min-w-0">
                              <div className="text-[13.5px] font-medium leading-5 text-p1-text">{n.title}</div>
                              <div className="mt-0.5 line-clamp-2 text-[12.5px] leading-5 text-p1-text-2">{n.body}</div>
                              <div className="mt-1 text-[11.5px] text-p1-text-3">{n.at.slice(0, 16).replace('T', ' ')}</div>
                            </div>
                          </div>
                        );
                        const href = n.href?.replace(/^https?:\/\/[^/]+/, '');
                        return (
                          <li key={n.id} className="border-b border-p1-border last:border-b-0 hover:bg-p1-subtle/60">
                            {href ? <Link href={href} onClick={() => setPop(null)}>{body}</Link> : body}
                          </li>
                        );
                      })}
                    </ul>
                  </Popover>
                </div>

                <div className="relative ml-1">
                  <button type="button" onClick={() => setPop(pop === 'user' ? null : 'user')} aria-haspopup="menu" aria-expanded={pop === 'user'} aria-label="Account menu" className="flex h-9 cursor-pointer items-center rounded-full p-0.5 transition-shadow hover:shadow-[0_0_0_3px_var(--p1-border)]">
                    <Avatar name={userName} size="sm" tone={isAdmin ? 'neutral' : 'primary'} />
                  </button>
                  <Popover open={pop === 'user'} onClose={() => setPop(null)} width="w-72">
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <Avatar name={userName} size="md" tone={isAdmin ? 'neutral' : 'primary'} />
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-semibold text-p1-text">{userName}</div>
                        <div className="truncate text-[12.5px] text-p1-text-3">{userSub}</div>
                      </div>
                    </div>
                    {!isAdmin && (
                      <div className="flex flex-wrap gap-1.5 border-t border-p1-border px-4 py-2.5">
                        <StatusBadge kind="agent" value={state.profileSubmitted ? state.approval : 'not_submitted'} size="sm" />
                        <StatusBadge kind="subscription" value={state.subscription} size="sm" />
                      </div>
                    )}
                    <ul className="border-t border-p1-border py-1 text-[13.5px]">
                      {!isAdmin && [
                        { href: '/phase1/profile', label: 'Profile & CEA', icon: IdCard },
                        { href: '/phase1/status', label: 'Verification status', icon: ShieldCheck },
                        { href: '/phase1/checkout', label: 'Subscription and billing', icon: Receipt },
                        { href: '/phase1/properties', label: 'Properties', icon: Building2 },
                      ].map((m) => (
                        <li key={m.href}><Link href={m.href} onClick={() => setPop(null)} className="flex h-9 items-center gap-3 px-4 hover:bg-p1-subtle"><m.icon size={15} className="text-p1-text-3" aria-hidden /> {m.label}</Link></li>
                      ))}
                      <li><Link href="/phase1/settings" onClick={() => setPop(null)} className="flex h-9 items-center gap-3 px-4 hover:bg-p1-subtle"><Settings size={15} className="text-p1-text-3" aria-hidden /> Settings</Link></li>
                      <li><Link href="/phase1/homes" onClick={() => setPop(null)} className="flex h-9 items-center gap-3 px-4 hover:bg-p1-subtle"><Home size={15} className="text-p1-text-3" aria-hidden /> View the tenant site</Link></li>
                    </ul>
                    <div className="border-t border-p1-border py-1">
                      <button type="button" onClick={() => { setPop(null); signOutAndSay(); }} className="flex h-9 w-full cursor-pointer items-center gap-3 px-4 text-left text-[13.5px] hover:bg-p1-subtle">
                        <LogOut size={15} className="text-p1-text-3" aria-hidden /> Sign out
                      </button>
                    </div>
                  </Popover>
                </div>
              </div>
            </div>
          </header>

          <main id="p1-main" className="flex-1 pb-24 lg:pb-12" tabIndex={-1}>
            <div key={pathname} className="vr-fade mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">{children}</div>
          </main>
        </div>
      </div>

      <nav data-print-hide aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-p1-border bg-p1-surface/95 backdrop-blur lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="grid grid-cols-5">
          {bottomNav.map((item) => {
            if ('menu' in item) {
              return (
                <li key="menu">
                  <button type="button" onClick={() => setDrawer(true)} className="flex h-14 w-full cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-p1-text-3" aria-label="Open full menu">
                    <MenuIcon size={20} aria-hidden />
                    More
                  </button>
                </li>
              );
            }
            const isCreate = item.href === '/phase1/listings/new';
            const active = !isCreate && isActive(pathname, item) && !(item.href === '/phase1/listings' && pathname === '/phase1/listings/new');
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? 'page' : undefined} className={cx('relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors', active ? 'text-p1-primary' : 'text-p1-text-3')}>
                  {isCreate ? (
                    <span className="flex h-9 w-12 items-center justify-center rounded-xl bg-p1-primary text-p1-primary-on shadow-p1-sm"><Icon size={20} aria-hidden /></span>
                  ) : (
                    <>
                      <span className="relative">
                        <Icon size={20} strokeWidth={active ? 2.2 : 1.9} aria-hidden />
                        {typeof item.badge === 'number' && item.badge > 0 && <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-p1-danger px-1 text-[10px] font-bold text-white">{item.badge}</span>}
                      </span>
                      {item.label}
                    </>
                  )}
                  {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-p1-primary" aria-hidden />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
