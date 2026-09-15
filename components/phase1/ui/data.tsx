"use client";

/**
 * Data display: filter chips, toolbars, pagination, tables, tabs.
 * Tables keep the primary column strong and metadata muted; headers stick inside their scroll box.
 */

import React, { useId, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cx, Button } from './primitives';
import { EmptyState } from './feedback';
import { INPUT_BASE } from './form';

export function FilterChips<T extends string>({ options, value, onChange, label = 'Filter', size = 'md', scroll = false }: { options: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void; label?: string; size?: 'sm' | 'md'; scroll?: boolean }) {
  return (
    <div role="group" aria-label={label} className={cx('flex gap-1.5', scroll ? 'p1-noscrollbar -mx-1 overflow-x-auto px-1' : 'flex-wrap')}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button key={o.key} type="button" aria-pressed={on} onClick={() => onChange(o.key)}
            className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium transition-[background-color,border-color,color] duration-150 cursor-pointer', size === 'sm' ? 'h-8 px-3 text-[12.5px]' : 'h-9 px-3.5 text-[13px]',
              on ? 'border-p1-text bg-p1-text text-p1-bg' : 'border-p1-border bg-p1-surface text-p1-text-2 hover:border-p1-border-strong hover:text-p1-text')}>
            {o.label}
            {typeof o.count === 'number' && <span className={cx('text-[12px] tabular-nums', on ? 'opacity-70' : 'text-p1-text-3')}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Toolbar that holds search, chips and view controls. Flat by default so it does not read as another card. */
export function FilterBar({ children, className = '', boxed = false }: { children: React.ReactNode; className?: string; boxed?: boolean }) {
  return <div className={cx('mb-4 flex flex-col gap-3', boxed && 'rounded-xl border border-p1-border bg-p1-surface p-3', className)}>{children}</div>;
}

export function SortButton<T extends string>({ options, value, onChange, className = '' }: { options: { key: T; label: string }[]; value: T; onChange: (k: T) => void; className?: string }) {
  const id = useId();
  return (
    <div className={cx('relative', className)}>
      <label htmlFor={id} className="sr-only">Sort by</label>
      <ArrowUpDown size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-p1-text-3" aria-hidden />
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={cx(INPUT_BASE, 'h-10 w-auto appearance-none border-p1-border-strong pl-8.5 pr-8 text-[13.5px]')} style={{ paddingLeft: 34 }}>
        {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-p1-text-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
    </div>
  );
}

/* --------------------------------------------------------------- pagination */

export function usePagination<T>(rows: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safe = Math.min(page, pages);
  const slice = rows.slice((safe - 1) * pageSize, safe * pageSize);
  return { page: safe, pages, setPage, slice, total: rows.length, from: rows.length ? (safe - 1) * pageSize + 1 : 0, to: Math.min(safe * pageSize, rows.length) };
}

export function Pagination({ page, pages, onChange, from, to, total, className = '', noun = 'results' }: { page: number; pages: number; onChange: (p: number) => void; from: number; to: number; total: number; className?: string; noun?: string }) {
  if (total === 0) return null;
  return (
    <nav aria-label="Pagination" className={cx('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="text-[13px] text-p1-text-3">{from}–{to} of <span className="font-medium text-p1-text">{total}</span> {noun}</p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1} leftIcon={<ChevronLeft size={15} />} aria-label="Previous page">Previous</Button>
          <div className="hidden items-center gap-0.5 sm:flex">
            {Array.from({ length: pages }).map((_, i) => (
              <button key={i} type="button" onClick={() => onChange(i + 1)} aria-current={page === i + 1 ? 'page' : undefined}
                className={cx('h-9 min-w-9 rounded-lg px-2 text-[13px] font-medium tabular-nums cursor-pointer', page === i + 1 ? 'bg-p1-primary text-p1-primary-on dark:bg-p1-info' : 'text-p1-text-2 hover:bg-p1-subtle')}>
                {i + 1}
              </button>
            ))}
          </div>
          <span className="px-2 text-[13px] tabular-nums text-p1-text-3 sm:hidden">{page} / {pages}</span>
          <Button variant="outline" size="sm" onClick={() => onChange(page + 1)} disabled={page >= pages} rightIcon={<ChevronRight size={15} />} aria-label="Next page">Next</Button>
        </div>
      )}
    </nav>
  );
}

/* --------------------------------------------------------------- data table */

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
  width?: string;
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  /** Muted secondary column. */
  muted?: boolean;
  /** Keep cell contents on one line. */
  nowrap?: boolean;
}

export function useSort<T>(rows: T[], columns: Column<T>[], initial?: { key: string; dir: 'asc' | 'desc' }) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | undefined>(initial);
  const col = sort ? columns.find((c) => c.key === sort.key) : undefined;
  const sorted = col?.sortValue
    ? [...rows].sort((a, b) => {
        const va = col.sortValue!(a), vb = col.sortValue!(b);
        const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
        return sort!.dir === 'asc' ? r : -r;
      })
    : rows;
  const onSort = (key: string) => setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
  return { sort, onSort, sorted };
}

export function DataTable<T>({
  columns, rows, rowKey, onRowClick, sort, onSort, empty, caption, minWidth = 640, rowClassName, maxHeight, dense = false, selected, flush = false,
}: {
  columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void;
  sort?: { key: string; dir: 'asc' | 'desc' }; onSort?: (key: string) => void; empty?: React.ReactNode; caption?: string; minWidth?: number;
  rowClassName?: (r: T) => string; maxHeight?: number | string; dense?: boolean; selected?: (r: T) => boolean; flush?: boolean;
}) {
  const hide = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' };
  const align = (a?: Column<T>['align']) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : '');
  return (
    <div className={cx('overflow-auto', !flush && 'rounded-xl border border-p1-border bg-p1-surface')} style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full border-collapse text-left text-[13.5px]" style={{ minWidth }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="sticky top-0 z-[1]">
          <tr className="border-b border-p1-border bg-p1-surface">
            {columns.map((c) => {
              const sortable = !!c.sortValue && !!onSort;
              const active = sort?.key === c.key;
              return (
                <th key={c.key} scope="col" style={{ width: c.width }} aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cx('whitespace-nowrap px-4 py-2.5 text-[12px] font-medium text-p1-text-3', align(c.align), c.hideBelow && hide[c.hideBelow])}>
                  {sortable ? (
                    <button type="button" onClick={() => onSort!(c.key)} className={cx('inline-flex items-center gap-1 rounded hover:text-p1-text cursor-pointer', c.align === 'right' && 'flex-row-reverse', active && 'text-p1-text')}>
                      {c.header}
                      {active ? (sort!.dir === 'asc' ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />) : <ArrowUpDown size={12} className="opacity-40" aria-hidden />}
                    </button>
                  ) : c.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-p1-border">
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-10">{empty ?? <EmptyState compact title="Nothing to show" />}</td></tr>
          ) : rows.map((r) => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cx('transition-colors', onRowClick && 'cursor-pointer hover:bg-p1-subtle/60', selected?.(r) && 'bg-p1-primary-soft/40', rowClassName?.(r))}>
              {columns.map((c) => (
                <td key={c.key} className={cx('px-4 align-middle', dense ? 'py-2' : 'py-3', c.muted ? 'text-p1-text-2' : 'text-p1-text', c.nowrap && 'whitespace-nowrap', align(c.align), c.hideBelow && hide[c.hideBelow])}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------- tabs */

/**
 * Tabs with one indicator that slides to the selected tab, so the eye follows
 * the change instead of looking for which underline appeared. Arrow keys move
 * between tabs, as a tablist should.
 */
export function Tabs<T extends string>({ items, value, onChange, label = 'Sections', className = '' }: { items: { key: T; label: string; count?: number; icon?: React.ReactNode }[]; value: T; onChange: (k: T) => void; label?: string; className?: string }) {
  const list = React.useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);

  React.useLayoutEffect(() => {
    const measure = () => {
      const el = list.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (list.current) ro?.observe(list.current);
    return () => ro?.disconnect();
  }, [value, items.length]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = items.findIndex((t) => t.key === value);
    const next = items[(i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length];
    onChange(next.key);
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
  };

  return (
    <div ref={list} role="tablist" aria-label={label} onKeyDown={onKey} className={cx('p1-noscrollbar relative flex gap-1 overflow-x-auto border-b border-p1-border', className)}>
      {items.map((t) => {
        const on = t.key === value;
        return (
          <button key={t.key} role="tab" type="button" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => onChange(t.key)}
            className={cx('relative flex h-11 shrink-0 items-center gap-2 px-3 text-[14px] font-medium transition-colors duration-150 cursor-pointer',
              on ? 'text-p1-text' : 'text-p1-text-3 hover:text-p1-text')}>
            {t.icon && <span aria-hidden className={on ? 'text-p1-text' : 'text-p1-text-3'}>{t.icon}</span>}
            {t.label}
            {typeof t.count === 'number' && <span className={cx('min-w-5 rounded-full px-1.5 text-center text-[12px] tabular-nums', on ? 'bg-p1-primary-soft text-p1-primary' : 'bg-p1-subtle text-p1-text-3')}>{t.count}</span>}
          </button>
        );
      })}
      {bar && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-p1-primary transition-[transform,width] duration-200 ease-out"
          style={{ width: bar.width, transform: `translateX(${bar.left}px)` }}
        />
      )}
    </div>
  );
}
