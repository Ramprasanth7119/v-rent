"use client";

/**
 * The home page's one question: where do you want to live?
 *
 * Suggestions come from what is actually listed — districts, their everyday
 * names, developments and stations — so every suggestion leads to results.
 * Arrow keys move through them and Enter chooses.
 */

import { useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Search, TrainFront } from 'lucide-react';
import { cx } from '../kit';

export interface Suggestion {
  kind: 'district' | 'project' | 'station';
  label: string;
  hint: string;
  /** What goes in the search. */
  query: Record<string, string>;
}

export function HeroSearch({ suggestions }: { suggestions: Suggestion[] }) {
  const router = useRouter();
  const [deal, setDeal] = useState<'rent' | 'sale'>('rent');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return suggestions.filter((s) => s.kind === 'district').slice(0, 5);
    return suggestions.filter((s) => `${s.label} ${s.hint}`.toLowerCase().includes(needle)).slice(0, 6);
  }, [q, suggestions]);

  const go = (extra: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    if (deal === 'sale') params.set('deal', 'sale');
    if (extra.district) params.set('district', extra.district);
    const text = extra.q ?? (extra.district ? '' : q.trim());
    if (text) params.set('q', text);
    router.push(`/phase1/homes/search${params.toString() ? `?${params}` : ''}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setCursor((c) => Math.min(matches.length - 1, c + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(-1, c - 1)); }
    if (e.key === 'Escape') { setOpen(false); setCursor(-1); }
    if (e.key === 'Enter' && open && cursor >= 0 && matches[cursor]) { e.preventDefault(); go(matches[cursor].query); }
  };

  const Icon = { district: MapPin, project: Building2, station: TrainFront };

  return (
    <div className="w-full max-w-[640px]">
      <div role="tablist" aria-label="Rent or buy" className="mb-3 inline-flex rounded-lg bg-p1-subtle p-1">
        {(['rent', 'sale'] as const).map((d) => (
          <button key={d} role="tab" type="button" aria-selected={deal === d} onClick={() => setDeal(d)}
            className={cx('h-8 cursor-pointer rounded-md px-4 text-[13.5px] font-medium transition-[background-color,color,box-shadow] duration-150', deal === d ? 'bg-p1-surface text-p1-text shadow-p1-sm' : 'text-p1-text-2 hover:text-p1-text')}>
            {d === 'rent' ? 'Rent' : 'Buy'}
          </button>
        ))}
      </div>

      <form role="search" onSubmit={(e) => { e.preventDefault(); go(); }} className="relative">
        <div className="flex items-center gap-2 rounded-xl border border-p1-border-strong bg-p1-surface p-1.5 shadow-p1-md transition-[border-color,box-shadow] duration-200 focus-within:border-p1-primary focus-within:shadow-[0_0_0_4px_var(--p1-ring)]">
          <Search size={19} className="ml-2.5 shrink-0 text-p1-text-3" aria-hidden />
          <label htmlFor={`${listId}-q`} className="sr-only">Search by area, project or postal code</label>
          <input
            ref={input}
            id={`${listId}-q`}
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setCursor(-1); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKey}
            placeholder="Search by area, project or postal code"
            autoComplete="off"
            role="combobox"
            aria-expanded={open && matches.length > 0}
            aria-controls={listId}
            aria-activedescendant={cursor >= 0 ? `${listId}-${cursor}` : undefined}
            className="p1-bare-input h-11 min-w-0 flex-1 bg-transparent text-[15px] text-p1-text placeholder:text-p1-text-3 focus:outline-none focus-visible:outline-none"
          />
          <button type="submit" className="p1-press flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-p1-primary px-5 text-[14.5px] font-medium text-p1-primary-on hover:bg-p1-primary-hover">
            <span className="hidden sm:inline">Search</span>
            <Search size={17} className="sm:hidden" aria-hidden />
            <span className="sr-only sm:hidden">Search</span>
          </button>
        </div>

        {open && matches.length > 0 && (
          <ul id={listId} role="listbox" className="p1-panel absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-p1-border bg-p1-elevated py-1.5 shadow-p1-lg">
            {!q.trim() && <li className="px-4 pb-1 pt-1.5 text-[12px] font-medium text-p1-text-3" role="presentation">Popular areas</li>}
            {matches.map((s, i) => {
              const I = Icon[s.kind];
              return (
                <li key={`${s.kind}-${s.label}`} id={`${listId}-${i}`} role="option" aria-selected={i === cursor}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(s.query)} onMouseEnter={() => setCursor(i)}
                    className={cx('flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left', i === cursor && 'bg-p1-subtle')}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-p1-subtle text-p1-text-2"><I size={15} aria-hidden /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-p1-text">{s.label}</span>
                      <span className="block truncate text-[12.5px] text-p1-text-3">{s.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </form>
    </div>
  );
}
