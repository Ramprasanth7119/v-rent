/**
 * The tenant site: its own header and footer, outside the agent workspace
 * frame, reachable by anybody.
 */

import Link from 'next/link';
import { MarketHeader } from '../../../components/phase1/market/MarketHeader';
import { demoDataOnServer } from '../../../lib/phase1/report-data/server';

export const metadata = {
  title: 'V-RENT — Homes to rent in Singapore',
  description: 'Verified rental listings from CEA-registered agents across Singapore.',
};

export default async function HomesLayout({ children }: { children: React.ReactNode }) {
  /* Read on the server so the strip is in the first paint rather than
     appearing a moment later. A tenant-facing page showing sample homes has to
     say so before anyone reads a price off it. This is a notice, not a second
     switch: the only control is the one in the agent workspace header, and it
     writes the cookie this reads. */
  const demo = await demoDataOnServer();

  return (
    <div className="p1 flex min-h-screen flex-col font-p1sans">
      <a href="#homes-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-p1-primary focus:px-4 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-p1-primary-on">Skip to content</a>
      <MarketHeader />
      {demo && (
        <div role="status" className="border-b border-p1-demo-border bg-p1-demo-soft">
          <p className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-[12.5px] text-p1-text-2 sm:px-6 lg:px-8">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-p1-demo" aria-hidden />
            <span className="font-semibold text-p1-text">Demo data.</span>
            <span>These homes, agents and neighbourhoods are illustrative. Nothing here is advertised for real.</span>
          </p>
        </div>
      )}
      <main id="homes-main" className="flex-1" tabIndex={-1}>{children}</main>
      <footer data-print-hide className="border-t border-p1-border bg-p1-surface">
        <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 py-8 text-[13px] text-p1-text-3 sm:grid-cols-[1fr_auto] sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2 text-p1-text">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-p1-primary text-[11px] font-bold text-p1-primary-on" aria-hidden>V</span>
              <span className="text-[14px] font-semibold">V-RENT</span>
            </div>
            <p className="mt-2 max-w-md leading-5">Every listing is advertised by a salesperson on the Council for Estate Agencies register. Addresses are matched to OneMap.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-start gap-x-6 gap-y-2">
            <Link href="/phase1/homes/search" className="hover:text-p1-text">Rent</Link>
            <Link href="/phase1/homes/search?deal=sale" className="hover:text-p1-text">Buy</Link>
            <Link href="/phase1/homes/explore" className="hover:text-p1-text">Explore</Link>
            <Link href="/phase1/homes/agents" className="hover:text-p1-text">Agents</Link>
            <Link href="/phase1/homes/saved" className="hover:text-p1-text">Saved</Link>
            <Link href="/phase1" className="hover:text-p1-text">For agents</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
