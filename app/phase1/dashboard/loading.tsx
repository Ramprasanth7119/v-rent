import { Skeleton } from '../../../components/phase1/kit';

/** The dashboard's shape, so content arrives into place rather than pushing it. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-72" />
          <Skeleton className="mt-2 h-4 w-52" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      <div className="space-y-5">
        {/* the snapshot: one figure, then four */}
        <div className="grid gap-px overflow-hidden rounded-xl border border-p1-border bg-p1-border lg:grid-cols-[minmax(0,384px)_minmax(0,1fr)]">
          <div className="bg-p1-surface p-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-12 w-40" />
            <Skeleton className="mt-3 h-3.5 w-52" />
            <Skeleton className="mt-6 h-[58px] w-full" />
          </div>
          <div className="grid grid-cols-2 gap-px bg-p1-border sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-p1-surface p-5">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="mt-3 h-7 w-16" />
                <Skeleton className="mt-2.5 h-3.5 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* performance, and what is waiting */}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_344px]">
          <Skeleton className="h-[392px] rounded-xl" />
          <div className="rounded-xl border border-p1-border bg-p1-surface p-5">
            <Skeleton className="h-4 w-36" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="mt-4 flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1"><Skeleton className="h-3.5 w-3/5" /><Skeleton className="mt-2 h-3 w-2/5" /></div>
              </div>
            ))}
          </div>
        </div>

        {/* the properties */}
        <div>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3.5 w-80" />
          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Skeleton className="h-[440px] rounded-xl" />
            <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)}
            </div>
          </div>
        </div>

        {/* the month, and the people */}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_344px]">
          <div className="space-y-5">
            <Skeleton className="h-[330px] rounded-xl" />
            <Skeleton className="h-[290px] rounded-xl" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-[330px] rounded-xl" />
            <Skeleton className="h-[150px] rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
