import { KPISkeleton, Skeleton } from '../../../components/phase1/kit';

/** The dashboard's shape, so content arrives into place rather than pushing it. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <div className="mb-6"><KPISkeleton /></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="rounded-xl border border-p1-border bg-p1-surface p-5">
            <Skeleton className="h-4 w-36" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="mt-4 flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-lg" /><div className="flex-1"><Skeleton className="h-3.5 w-3/5" /><Skeleton className="mt-2 h-3 w-2/5" /></div></div>
            ))}
          </div>
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-[320px] rounded-xl" />
          <Skeleton className="h-[140px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
