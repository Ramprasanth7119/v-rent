"use client";

/**
 * The tenant site's header. Where to look (rent or buy), what you have saved,
 * and a way across for the agent who landed here.
 */

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Heart, Moon, Sun, LayoutDashboard } from 'lucide-react';
import { usePersona } from '../../layout/PersonaContext';
import { useTheme } from '../hooks';
import { useSession } from '../../../lib/phase1/SessionContext';
import { cx } from '../kit';
import { useSaved } from './saved';

function DealLinks() {
  const pathname = usePathname();
  const params = useSearchParams();
  const onSearch = pathname.startsWith('/phase1/homes/search');
  const deal = params.get('deal') === 'sale' ? 'sale' : 'rent';
  const items = [
    { key: 'rent', label: 'Rent', href: '/phase1/homes/search' },
    { key: 'sale', label: 'Buy', href: '/phase1/homes/search?deal=sale' },
  ];
  return (
    <nav aria-label="Browse" className="hidden items-center gap-1 md:flex">
      {items.map((i) => {
        const active = onSearch && deal === i.key;
        return (
          <Link key={i.key} href={i.href} aria-current={active ? 'page' : undefined}
            className={cx('relative flex h-9 items-center rounded-lg px-3 text-[14px] font-medium transition-colors', active ? 'text-p1-text' : 'text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text')}>
            {i.label}
            {active && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-p1-primary" aria-hidden />}
          </Link>
        );
      })}
    </nav>
  );
}

export function MarketHeader() {
  const { isDarkMode, setDarkMode } = usePersona();
  const { toggle, ready: themeReady } = useTheme(setDarkMode, isDarkMode);
  const { user } = useSession();
  const { ids, ready } = useSaved();
  const pathname = usePathname();

  return (
    <header data-print-hide className="sticky top-0 z-40 border-b border-p1-border bg-p1-surface/90 backdrop-blur supports-[backdrop-filter]:bg-p1-surface/80">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/phase1/homes" className="mr-3 flex items-center gap-2.5" aria-label="V-RENT home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-p1-primary text-[15px] font-bold text-p1-primary-on" aria-hidden>V</span>
          <span className="text-[16px] font-semibold tracking-tight text-p1-text">V-RENT</span>
        </Link>

        <Suspense fallback={null}><DealLinks /></Suspense>

        <div className="flex-1" />

        <Link href={user && user.role === 'agent' ? '/phase1/dashboard' : user?.role === 'admin' ? '/phase1/admin' : '/phase1'}
          className="hidden h-9 items-center gap-2 rounded-lg px-3 text-[14px] font-medium text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text sm:flex">
          {user ? <><LayoutDashboard size={16} aria-hidden /> {user.role === 'admin' ? 'Operations' : 'My workspace'}</> : 'For agents'}
        </Link>

        <Link href="/phase1/homes/saved" aria-current={pathname === '/phase1/homes/saved' ? 'page' : undefined}
          className="relative flex h-9 items-center gap-2 rounded-lg px-2.5 text-[14px] font-medium text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text"
          aria-label={`Saved homes${ready && ids.length ? `, ${ids.length}` : ''}`}>
          <Heart size={17} className={cx(ready && ids.length > 0 && 'fill-p1-danger text-p1-danger')} aria-hidden />
          <span className="hidden sm:inline">Saved</span>
          {ready && ids.length > 0 && <span key={ids.length} className="vr-pop flex h-5 min-w-5 items-center justify-center rounded-full bg-p1-subtle px-1.5 text-[11.5px] font-semibold tabular-nums text-p1-text">{ids.length}</span>}
        </Link>

        <button type="button" onClick={toggle} aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text">
          {themeReady && isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {!user && (
          <Link href="/phase1/login" className="ml-1 hidden h-9 items-center rounded-lg border border-p1-border-strong px-3.5 text-[14px] font-medium text-p1-text hover:bg-p1-subtle sm:flex">
            Agent sign in
          </Link>
        )}
      </div>
    </header>
  );
}
