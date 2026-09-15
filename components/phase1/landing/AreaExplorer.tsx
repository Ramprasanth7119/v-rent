"use client";

/**
 * Every district, in the three bands Singapore prices by — the core central
 * region, the city fringe, and everywhere outside central. A district with
 * homes shows how many and from what rent; one without still links, so the
 * list is a map of the island rather than of our current stock.
 */

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { DISTRICTS, districtCode } from '../../../lib/phase1/districts';
import { Tabs, cx } from '../kit';

const REGIONS = [
  { key: 'ccr', label: 'Core Central', blurb: 'Orchard, Marina Bay, Tanglin and Newton', districts: [1, 2, 4, 6, 9, 10, 11] },
  { key: 'rcr', label: 'City fringe', blurb: 'Tiong Bahru, Balestier, Katong and Geylang', districts: [3, 5, 7, 8, 12, 13, 14, 15] },
  { key: 'ocr', label: 'Outside central', blurb: 'The heartlands, east to west', districts: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28] },
] as const;

type Region = (typeof REGIONS)[number]['key'];

export function AreaExplorer({ stock }: { stock: Record<number, { count: number; from: number | null }> }) {
  const [region, setRegion] = useState<Region>('ccr');
  const current = REGIONS.find((r) => r.key === region)!;
  const regionCount = (key: Region) => REGIONS.find((r) => r.key === key)!.districts.reduce((n, d) => n + (stock[d]?.count ?? 0), 0);

  return (
    <div>
      <Tabs<Region>
        label="Region"
        value={region}
        onChange={setRegion}
        items={REGIONS.map((r) => ({ key: r.key, label: r.label, count: regionCount(r.key) }))}
      />
      <p className="mt-3 text-[13.5px] text-p1-text-3">{current.blurb}</p>
      <ul key={region} className="vr-stagger mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {current.districts.map((d) => {
          const s = stock[d];
          const has = Boolean(s?.count);
          return (
            <li key={d}>
              <Link
                href={`/phase1/homes/search?district=${d}`}
                className={cx(
                  'group flex h-full items-center gap-3 rounded-xl border px-3.5 py-3 transition-[border-color,background-color,box-shadow] duration-200',
                  has ? 'border-p1-border bg-p1-surface hover:border-p1-border-strong hover:shadow-p1-md' : 'border-transparent bg-p1-subtle/60 hover:bg-p1-subtle',
                )}
              >
                <span className={cx('flex h-10 w-12 shrink-0 items-center justify-center rounded-lg text-[12.5px] font-semibold tabular-nums', has ? 'bg-p1-primary-soft text-p1-primary' : 'bg-p1-surface text-p1-text-3')}>
                  {districtCode(d)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx('block truncate text-[14px] font-medium', has ? 'text-p1-text' : 'text-p1-text-2')}>{DISTRICTS[d].name}</span>
                  <span className="block truncate text-[12.5px] text-p1-text-3">
                    {has ? <>{s!.count} {s!.count === 1 ? 'home' : 'homes'}{s!.from ? ` · from S$${s!.from.toLocaleString('en-SG')}` : ''}</> : DISTRICTS[d].areas}
                  </span>
                </span>
                <ArrowUpRight size={15} className="shrink-0 text-p1-text-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
