import { Skeleton } from '../../../components/phase1/kit';

/** The inbox's shape, so the enquiries arrive into place rather than pushing it. */
export default function Loading() {
  const card = 'rounded-2xl border border-p1-border bg-p1-surface';
  return (
    <div aria-busy="true" aria-label="Loading enquiries">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 sm:mb-6">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg sm:w-80" />
      </div>
      <div className="space-y-4 sm:space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${card} flex items-center gap-3.5 p-4 sm:px-5`}>
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="flex-1"><Skeleton className="h-6 w-10" /><Skeleton className="mt-2 h-3.5 w-28" /></div>
            </div>
          ))}
        </div>
        <div className={`${card} overflow-hidden`}>
          <div className="flex items-center justify-between gap-3 border-b border-p1-border px-5 py-3">
            <Skeleton className="h-8 w-full max-w-md rounded-lg" />
            <Skeleton className="hidden h-9 w-64 rounded-lg md:block" />
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-p1-border px-5 py-3 last:border-0">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1"><Skeleton className="h-3.5 w-36" /><Skeleton className="mt-2 h-3 w-24" /></div>
              <Skeleton className="hidden h-10 w-12 rounded-lg md:block" />
              <div className="hidden flex-1 md:block"><Skeleton className="h-3.5 w-40" /><Skeleton className="mt-2 h-3 w-28" /></div>
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
