"use client";

/**
 * The landing page's search card.
 *
 * Four questions a tenant or buyer asks first — where, what kind, how many
 * bedrooms, up to what price — on one line, with rent and buy as tabs above.
 * Location suggestions come from what is actually listed, so every suggestion
 * leads somewhere. The answer is the search page with those filters applied.
 *
 * The menus and the suggestion list are drawn by V-RENT rather than the
 * browser, and float above the page, so they look the same in every browser
 * and nothing on the page can clip them.
 */

import { useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Search, TrainFront, X } from 'lucide-react';
import { AnchoredLayer, SelectMenu, cx } from '../kit';
import type { Suggestion } from '../market/HeroSearch';

const TYPES = ['Condominium', 'HDB', 'Apartment', 'Executive Condominium', 'Landed'];
const RENT_MAX = [2000, 3000, 4000, 5000, 7000, 10000];
const SALE_MAX = [800_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000];

const money = (n: number) => (n >= 1_000_000 ? `S$${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : `S$${(n / 1000).toFixed(0)}k`);

const KIND_ICON = { district: MapPin, project: Building2, station: TrainFront };
const KIND_LABEL = { district: 'Districts', project: 'Developments', station: 'Stations' };

export function PortalSearch({ suggestions }: { suggestions: Suggestion[] }) {
  const router = useRouter();
  const listId = useId();
  const field = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [deal, setDeal] = useState<'rent' | 'sale'>('rent');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Suggestion | null>(null);
  const [type, setType] = useState('');
  const [beds, setBeds] = useState('any');
  const [max, setMax] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return suggestions.filter((s) => s.kind === 'district').slice(0, 6);
    return suggestions.filter((s) => `${s.label} ${s.hint}`.toLowerCase().includes(needle)).slice(0, 8);
  }, [q, suggestions]);

  // The latest cursor, for a keypress that lands before the re-render.
  const cursorRef = useRef(-1);
  const moveCursor = (next: number) => { cursorRef.current = next; setCursor(next); };

  const go = (choice: Suggestion | null = picked) => {
    const p = new URLSearchParams();
    if (deal === 'sale') p.set('deal', 'sale');
    if (choice?.query.district) p.set('district', choice.query.district);
    const text = choice?.query.q ?? (choice ? '' : q.trim());
    if (text) p.set('q', text);
    if (type) p.set('type', type);
    if (beds !== 'any') p.set('beds', beds);
    if (max) p.set('max', max);
    router.push(`/phase1/homes/search${p.toString() ? `?${p}` : ''}`);
  };

  const choose = (s: Suggestion) => { setPicked(s); setQ(s.label); setOpen(false); moveCursor(-1); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); moveCursor(Math.min(matches.length - 1, cursorRef.current + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveCursor(Math.max(-1, cursorRef.current - 1)); }
    else if (e.key === 'Escape') { setOpen(false); moveCursor(-1); }
    else if (e.key === 'Tab') setOpen(false);
    else if (e.key === 'Enter' && open && cursorRef.current >= 0 && matches[cursorRef.current]) { e.preventDefault(); choose(matches[cursorRef.current]); }
  };

  const grouped = useMemo(() => {
    const out: { kind: Suggestion['kind']; items: { s: Suggestion; i: number }[] }[] = [];
    matches.forEach((s, i) => {
      const g = out.find((x) => x.kind === s.kind) ?? (out.push({ kind: s.kind, items: [] }), out[out.length - 1]);
      g.items.push({ s, i });
    });
    return out;
  }, [matches]);

  return (
    <div className="w-full rounded-2xl bg-p1-surface p-2 text-p1-text shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] ring-1 ring-black/5 sm:p-3">
      <div role="tablist" aria-label="Rent or buy" className="flex gap-1 px-1 pb-2 sm:px-2">
        {(['rent', 'sale'] as const).map((d) => (
          <button key={d} role="tab" type="button" aria-selected={deal === d} onClick={() => { setDeal(d); setMax(''); }}
            className={cx('p1-field relative h-9 cursor-pointer rounded-md px-3 text-[14.5px] font-semibold transition-colors focus-visible:bg-p1-subtle', deal === d ? 'text-p1-text' : 'text-p1-text-3 hover:text-p1-text')}>
            {d === 'rent' ? 'Rent' : 'Buy'}
            <span className={cx('absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-p1-primary transition-transform duration-200', deal === d ? 'scale-x-100' : 'scale-x-0')} aria-hidden />
          </button>
        ))}
      </div>

      <form role="search" onSubmit={(e) => { e.preventDefault(); go(); }}
        className="grid grid-cols-2 gap-1 rounded-xl border border-p1-border p-1 sm:grid-cols-3 lg:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))_auto] lg:items-stretch">
        {/* location */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <div
            ref={field}
            onClick={() => input.current?.focus()}
            className={cx(
              'flex h-full cursor-text items-center gap-2.5 rounded-lg px-3 py-2 transition-[background-color,box-shadow] duration-150 hover:bg-p1-subtle',
              'focus-within:bg-p1-subtle focus-within:shadow-[inset_0_0_0_2px_var(--p1-primary)]',
            )}
          >
            <Search size={18} className="shrink-0 text-p1-text-3" aria-hidden />
            <div className="min-w-0 flex-1">
              <label htmlFor={`${listId}-q`} className="block text-[11.5px] font-medium text-p1-text-3">Location</label>
              <input
                ref={input}
                id={`${listId}-q`}
                value={q}
                onChange={(e) => { setQ(e.target.value); setPicked(null); setOpen(true); moveCursor(-1); }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKey}
                placeholder="District, project or MRT"
                autoComplete="off"
                enterKeyHint="search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open && matches.length > 0}
                aria-controls={listId}
                aria-activedescendant={cursor >= 0 ? `${listId}-${cursor}` : undefined}
                className="p1-bare-input block w-full min-w-0 appearance-none truncate border-0 bg-transparent p-0 text-[14.5px] font-medium leading-6 text-p1-text placeholder:font-normal placeholder:text-p1-text-3 focus:outline-none"
              />
            </div>
            {q && (
              <button type="button" onClick={(e) => { e.stopPropagation(); setQ(''); setPicked(null); input.current?.focus(); }}
                aria-label="Clear location" className="p1-field flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-p1-text-3 hover:bg-p1-border hover:text-p1-text focus-visible:shadow-[0_0_0_2px_var(--p1-primary)]">
                <X size={14} aria-hidden />
              </button>
            )}
          </div>

          <AnchoredLayer anchor={field} open={open && matches.length > 0} onClose={() => setOpen(false)} matchWidth minWidth={360}>
            <ul id={listId} role="listbox" aria-label="Location suggestions" className="overflow-y-auto overscroll-contain py-1.5">
              {grouped.map((g) => (
                <li key={g.kind} role="presentation">
                  <div className="px-4 pb-1 pt-2 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-p1-text-3">
                    {!q.trim() ? 'Where homes are listed' : KIND_LABEL[g.kind]}
                  </div>
                  <ul role="presentation">
                    {g.items.map(({ s, i }) => {
                      const I = KIND_ICON[s.kind];
                      return (
                        <li
                          key={`${s.kind}-${s.label}`}
                          id={`${listId}-${i}`}
                          role="option"
                          aria-selected={i === cursor}
                          onPointerDown={(e) => e.preventDefault()}
                          onPointerMove={() => moveCursor(i)}
                          onClick={() => choose(s)}
                          className={cx('mx-1.5 flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2', i === cursor && 'bg-p1-subtle')}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-p1-subtle text-p1-text-2" aria-hidden><I size={15} /></span>
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] font-medium text-p1-text">{s.label}</span>
                            <span className="block truncate text-[12.5px] text-p1-text-3">{s.hint}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </AnchoredLayer>
        </div>

        <SelectMenu label="Property type" value={type} onChange={setType}
          options={[{ value: '', label: 'All types' }, ...TYPES.map((t) => ({ value: t, label: t === 'Executive Condominium' ? 'Executive condo' : t }))]} />
        <SelectMenu label="Bedrooms" value={beds} onChange={setBeds}
          options={[{ value: 'any', label: 'Any' }, { value: '1', label: '1 bedroom' }, { value: '2', label: '2 bedrooms' }, { value: '3', label: '3 bedrooms' }, { value: '4+', label: '4 or more' }]} />
        <SelectMenu className="col-span-2 sm:col-span-1" label={deal === 'sale' ? 'Max price' : 'Max rent'} value={max} onChange={setMax}
          options={[{ value: '', label: 'No limit' }, ...(deal === 'sale' ? SALE_MAX : RENT_MAX).map((v) => ({ value: String(v), label: `Up to ${money(v)}${deal === 'rent' ? ' / mo' : ''}` }))]} />

        <div className="col-span-2 sm:col-span-3 lg:col-span-1 lg:pl-1">
          <button type="submit" className="p1-press p1-field flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-p1-primary px-6 text-[15px] font-semibold text-p1-primary-on hover:bg-p1-primary-hover focus-visible:shadow-[0_0_0_3px_var(--p1-ring)] lg:h-full lg:min-h-12 lg:w-auto">
            <Search size={17} aria-hidden /> Search
          </button>
        </div>
      </form>
    </div>
  );
}
