import { Skeleton } from '../../../../../components/phase1/kit';

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pt-5 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading home">
      <Skeleton className="mb-4 h-4 w-48" />
      <Skeleton className="h-[260px] w-full rounded-2xl sm:h-[420px]" />
      <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="mt-3 h-6 w-64" />
          <Skeleton className="mt-2 h-4 w-80" />
          <div className="mt-6 flex gap-6"><Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-24" /></div>
        </div>
        <Skeleton className="hidden h-64 rounded-2xl lg:block" />
      </div>
    </div>
  );
}
