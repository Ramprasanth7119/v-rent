"use client";

/**
 * The frame a signed-out visitor sees at /phase1: a portal header, the page
 * edge to edge, and a footer with somewhere to go from every column.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu as MenuIcon, Moon, Sun, X } from 'lucide-react';
import { usePersona } from '../../layout/PersonaContext';
import { useTheme } from '../hooks';
import { cx } from '../kit';

const NAV = [
  { href: '/phase1/homes/search', label: 'Rent' },
  { href: '/phase1/homes/search?deal=sale', label: 'Buy' },
  { href: '/phase1/homes#agents', label: 'Find an agent' },
  { href: '/phase1#for-agents', label: 'For agents' },
  { href: '/phase1#pricing', label: 'Pricing' },
];

const FOOTER = [
  { title: 'Rent', links: [
    { href: '/phase1/homes/search', label: 'All homes to rent' },
    { href: '/phase1/homes/search?district=9', label: 'Orchard · D09' },
    { href: '/phase1/homes/search?district=10', label: 'Tanglin · D10' },
    { href: '/phase1/homes/search?district=15', label: 'Katong · D15' },
    { href: '/phase1/homes/search?type=HDB', label: 'HDB flats' },
  ] },
  { title: 'Buy', links: [
    { href: '/phase1/homes/search?deal=sale', label: 'Homes for sale' },
    { href: '/phase1/homes/search?deal=sale&type=Condominium', label: 'Condominiums' },
    { href: '/phase1/homes/saved', label: 'Saved homes' },
  ] },
  { title: 'For agents', links: [
    { href: '/phase1/signup', label: 'Create an account' },
    { href: '/phase1/login', label: 'Sign in' },
    { href: '/phase1#pricing', label: 'Plans and pricing' },
    { href: '/phase1#for-agents', label: 'What you get' },
  ] },
];

export function PublicFrame({ children }: { children: React.ReactNode }) {
  const { isDarkMode, setDarkMode } = usePersona();
  const { toggle, ready } = useTheme(setDarkMode, isDarkMode);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <div className="p1 flex min-h-screen flex-col font-p1sans">
      <a href="#p1-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-p1-primary focus:px-4 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-p1-primary-on">Skip to content</a>

      <header className={cx('sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-200', scrolled ? 'border-p1-border bg-p1-surface/95 shadow-p1-sm backdrop-blur' : 'border-transparent bg-p1-surface')}>
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Link href="/phase1" className="mr-4 flex items-center gap-2.5" aria-label="V-RENT home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-p1-primary text-[15px] font-bold text-p1-primary-on" aria-hidden>V</span>
            <span className="text-[16px] font-semibold tracking-tight text-p1-text">V-RENT</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
            {NAV.map((n) => (
              <Link key={n.label} href={n.href} className="flex h-9 items-center rounded-lg px-3 text-[14px] font-medium text-p1-text-2 transition-colors hover:bg-p1-subtle hover:text-p1-text">{n.label}</Link>
            ))}
          </nav>
          <div className="flex-1" />
          <button type="button" onClick={toggle} aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text">
            {ready && isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <Link href="/phase1/login" className="hidden h-9 items-center rounded-lg px-3 text-[14px] font-medium text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text sm:flex">Agent sign in</Link>
          <Link href="/phase1/signup" className="p1-press hidden h-9 items-center rounded-lg bg-p1-primary px-3.5 text-[14px] font-medium text-p1-primary-on hover:bg-p1-primary-hover sm:flex">List with V-RENT</Link>
          <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-label={menu ? 'Close menu' : 'Open menu'} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-p1-text-2 hover:bg-p1-subtle lg:hidden">
            {menu ? <X size={19} /> : <MenuIcon size={19} />}
          </button>
        </div>
        {menu && (
          <nav aria-label="Main" className="p1-panel border-t border-p1-border bg-p1-surface px-4 py-3 lg:hidden">
            <ul className="grid gap-0.5">
              {NAV.map((n) => <li key={n.label}><Link href={n.href} onClick={() => setMenu(false)} className="flex h-11 items-center rounded-lg px-3 text-[15px] font-medium text-p1-text hover:bg-p1-subtle">{n.label}</Link></li>)}
            </ul>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-p1-border pt-3">
              <Link href="/phase1/login" className="flex h-11 items-center justify-center rounded-lg border border-p1-border-strong text-[14px] font-medium text-p1-text">Agent sign in</Link>
              <Link href="/phase1/signup" className="flex h-11 items-center justify-center rounded-lg bg-p1-primary text-[14px] font-medium text-p1-primary-on">List with V-RENT</Link>
            </div>
          </nav>
        )}
      </header>

      <main id="p1-main" className="flex-1" tabIndex={-1}>{children}</main>

      <footer className="border-t border-p1-border bg-p1-surface">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))] lg:px-8">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/phase1" className="flex items-center gap-2.5" aria-label="V-RENT home">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-p1-primary text-[15px] font-bold text-p1-primary-on" aria-hidden>V</span>
              <span className="text-[16px] font-semibold tracking-tight text-p1-text">V-RENT</span>
            </Link>
            <p className="mt-3 max-w-xs text-[13.5px] leading-6 text-p1-text-3">
              Homes in Singapore from agents checked against the Council for Estate Agencies register.
            </p>
            <p className="mt-4 text-[12.5px] leading-5 text-p1-text-3">
              Addresses and maps from OneMap, Singapore Land Authority. Registration data from data.gov.sg.
            </p>
          </div>
          {FOOTER.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-[13px] font-semibold text-p1-text">{col.title}</h2>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => <li key={l.label}><Link href={l.href} className="text-[13.5px] text-p1-text-3 transition-colors hover:text-p1-text">{l.label}</Link></li>)}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-p1-border">
          <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-[12.5px] text-p1-text-3 sm:px-6 lg:px-8">
            <span>© 2026 V-RENT · Singapore · Proof of concept</span>
            <span>Prices in Singapore dollars</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
