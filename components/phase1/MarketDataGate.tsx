"use client";

/**
 * The market modules — Transactions and Compare — without a market feed.
 *
 * Their contracts are an illustrative set in URA's format (`MARKET_SOURCE`).
 * That set is demo data, so it is shown only with Demo Data ON. With it OFF,
 * and until the URA feed is connected, these screens keep their Insights frame
 * and say the data is unavailable instead of presenting generated contracts as
 * the market.
 *
 * One gate, in the route layout, so neither page has to ask.
 */

import { usePathname } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { LinkButton } from './kit';
import { InsightsHeader, InsightsShell, MarketUnavailable, useMarketAvailable } from './insights';

const SCREENS: Record<string, { module: string; title: string }> = {
  '/phase1/market/transactions': { module: 'transactions', title: 'Rental transactions' },
  '/phase1/market/compare': { module: 'compare', title: 'Compare developments' },
};

export function MarketDataGate({ children }: { children: React.ReactNode }) {
  const available = useMarketAvailable();
  const pathname = usePathname();
  if (available) return <>{children}</>;
  const screen = SCREENS[pathname] ?? { module: 'overview', title: 'Property intelligence' };

  return (
    <InsightsShell>
      <InsightsHeader
        module={screen.module}
        title={screen.title}
        actions={<LinkButton href="/phase1/neighbourhood" variant="outline" leftIcon={<MapPin size={15} />}>Neighbourhood</LinkButton>}
      />
      <MarketUnavailable />
    </InsightsShell>
  );
}
