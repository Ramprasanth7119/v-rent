/**
 * What is around a home: the nearest stations, schools and healthcare.
 *
 * A server component, streamed in behind a skeleton: the national datasets can
 * take a few seconds on a cold instance and the rest of the listing should not
 * wait for them. A source that does not answer in time says so instead of
 * showing nothing, which would read as "there are no schools here".
 */

import { GraduationCap, HeartPulse, TrainFront } from 'lucide-react';
import { placesAround, type PlaceKind, type PlacesLookup } from '../../../lib/phase1/places';
import { Skeleton } from '../kit';

const KINDS: { kind: PlaceKind; label: string; icon: typeof TrainFront }[] = [
  { kind: 'mrt', label: 'Transport', icon: TrainFront },
  { kind: 'schools', label: 'Schools', icon: GraduationCap },
  { kind: 'healthcare', label: 'Healthcare', icon: HeartPulse },
];

const withTimeout = (p: Promise<PlacesLookup>, kind: PlaceKind, ms = 9000): Promise<PlacesLookup> =>
  Promise.race([
    p.catch((): PlacesLookup => ({ status: 'failed', kind, reason: 'Could not reach the data source.' })),
    new Promise<PlacesLookup>((resolve) => setTimeout(() => resolve({ status: 'failed', kind, reason: 'Still loading from the source.' }), ms)),
  ]);

const walk = (m: number) => `${Math.max(1, Math.round((m * 1.3) / 80))} min walk`;
const dist = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);

export async function Nearby({ lat, lng, postal }: { lat: number; lng: number; postal?: string }) {
  const found = await Promise.all(KINDS.map((k) => withTimeout(placesAround(k.kind, lat, lng, { postal }), k.kind)));

  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-p1-border bg-p1-border sm:grid-cols-3">
      {KINDS.map((k, i) => {
        const r = found[i];
        return (
          <div key={k.kind} className="bg-p1-surface p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-p1-text">
              <k.icon size={15} className="text-p1-text-3" aria-hidden /> {k.label}
            </div>
            {r.status !== 'ok' ? (
              <p className="mt-3 text-[13px] leading-5 text-p1-text-3">Not available right now.</p>
            ) : r.items.length === 0 ? (
              <p className="mt-3 text-[13px] leading-5 text-p1-text-3">None within {dist(r.radius)}.</p>
            ) : (
              <ul className="mt-2.5 space-y-2.5">
                {r.items.slice(0, 3).map((p) => (
                  <li key={`${p.name}-${p.metres}`} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                    <span className="min-w-0">
                      <span className="block truncate text-p1-text">{p.name}</span>
                      {p.detail && <span className="block truncate text-[12px] text-p1-text-3">{p.detail}</span>}
                    </span>
                    <span className="shrink-0 text-right text-[12.5px] tabular-nums text-p1-text-3" title={dist(p.metres)}>{k.kind === 'mrt' ? walk(p.metres) : dist(p.metres)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function NearbySkeleton() {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-p1-border bg-p1-border sm:grid-cols-3" aria-busy="true" aria-label="Loading what is nearby">
      {KINDS.map((k) => (
        <div key={k.kind} className="bg-p1-surface p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-p1-text"><k.icon size={15} className="text-p1-text-3" aria-hidden /> {k.label}</div>
          <Skeleton className="mt-3 h-3.5 w-4/5" />
          <Skeleton className="mt-2.5 h-3.5 w-3/5" />
          <Skeleton className="mt-2.5 h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}
