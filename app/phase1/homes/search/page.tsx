import { Suspense } from 'react';
import { marketListings } from '../../../../lib/phase1/marketplace';
import { SearchView } from '../../../../components/phase1/market/SearchView';
import SearchLoading from './loading';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Search homes — V-RENT',
  description: 'Homes to rent and buy across Singapore, on a map, from verified agents.',
};

export default async function SearchPage() {
  const items = await marketListings();
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchView items={items} />
    </Suspense>
  );
}
