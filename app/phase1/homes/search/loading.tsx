import { Skeleton, SkeletonPropertyCard } from '../../../../components/phase1/kit';

export default function SearchLoading() {
  return (
    <div aria-busy="true" aria-label="Loading search">
      <div className="border-b border-p1-border bg-p1-surface">
        <div className="mx-auto flex h-[60px] w-full max-w-[1440px] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-full max-w-xs rounded-lg" />
          <Skeleton className="hidden h-10 w-28 rounded-lg md:block" />
          <Skeleton className="hidden h-10 w-24 rounded-lg md:block" />
          <Skeleton className="hidden h-10 w-20 rounded-lg md:block" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1440px] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(400px,42%)]">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton className="h-6 w-44" />
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonPropertyCard key={i} />)}
          </div>
        </div>
        <Skeleton className="hidden rounded-none lg:block lg:h-[calc(100dvh-126px)]" />
      </div>
    </div>
  );
}
