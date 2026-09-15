import { Skeleton, SkeletonPropertyCard } from '../../../components/phase1/kit';

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading homes">
      <div className="border-b border-p1-border bg-p1-surface">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <Skeleton className="h-6 w-56 rounded-full" />
            <Skeleton className="mt-5 h-14 w-4/5" />
            <Skeleton className="mt-3 h-14 w-3/5" />
            <Skeleton className="mt-8 h-14 w-full max-w-[640px] rounded-xl" />
          </div>
          <Skeleton className="hidden h-[460px] rounded-2xl lg:block" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-[1440px] gap-5 px-4 pt-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonPropertyCard key={i} />)}
      </div>
    </div>
  );
}
