import { marketListings } from '../../../../lib/phase1/marketplace';
import { SavedView } from '../../../../components/phase1/market/SavedView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Saved homes — V-RENT' };

export default async function SavedPage() {
  return <SavedView items={await marketListings()} />;
}
