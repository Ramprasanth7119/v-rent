import { Skeleton } from '../../../components/phase1/kit';

/** The inbox's shape, so the enquiries arrive into place rather than pushing it. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading enquiries">
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)}
      </div>
      <Skeleton className="mb-4 h-9 w-full max-w-xl rounded-full" />
      <div className="rounded-xl border border-p1-border bg-p1-surface">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-p1-border px-4 py-3 last:border-0">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1"><Skeleton className="h-3.5 w-40" /><Skeleton className="mt-2 h-3 w-64 max-w-full" /></div>
            <Skeleton className="hidden h-11 w-[60px] rounded-md md:block" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
