import { Skeleton } from '../../../components/phase1/kit';

/** The dashboard's shape, so content arrives into place rather than pushing it. */
export default function Loading() {
  const card = 'rounded-2xl border border-p1-border bg-p1-surface';
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 sm:mb-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <div className="space-y-4 sm:space-y-5">
        {/* four figures */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${card} flex items-center gap-3.5 p-4 sm:px-5`}>
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="flex-1"><Skeleton className="h-6 w-12" /><Skeleton className="mt-2 h-3.5 w-24" /></div>
            </div>
          ))}
        </div>

        {/* the chart, and activity */}
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className={`${card} p-5`}>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-5 h-8 w-28" />
            <Skeleton className="mt-5 h-[290px] w-full" />
          </div>
          <div className={`${card} p-5`}>
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mt-4 flex items-center gap-3">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <div className="flex-1"><Skeleton className="h-3.5 w-3/5" /><Skeleton className="mt-2 h-3 w-2/5" /></div>
              </div>
            ))}
          </div>
        </div>

        {/* enquiries, and viewings */}
        <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Skeleton className="h-[400px] rounded-2xl" />
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>

        {/* the listings */}
        <div className={`${card} p-5`}>
          <Skeleton className="h-4 w-48" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[290px] rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
