import { MarketDataGate } from '../../../components/phase1/MarketDataGate';

/** The market screens show their illustrative contracts only with Demo Data ON. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <MarketDataGate>{children}</MarketDataGate>;
}
