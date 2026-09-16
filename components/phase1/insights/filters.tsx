"use client";

/**
 * The controls that say what a screen is about.
 *
 * On a desktop these sit in one strip under the title, because the filters and
 * the figures they produced have to be visible together — a median whose
 * qualifier has scrolled away is a number waiting to be misquoted.
 *
 * On a phone there is no room for both, so the strip becomes a summary line and
 * a button, and the controls move into a sheet. The summary is the important
 * half: it keeps saying what the figures are about even when the controls are
 * put away, and it is a button, so the way back to them is the thing already
 * under the reader's thumb.
 */

import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X, RotateCcw, Check } from 'lucide-react';
import { Button, cx } from '../kit';

/** True while the media query matches. Used to render controls in one place only. */
export function useMedia(query: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/* ------------------------------------------------------------- the sheet */

/**
 * The bottom sheet the filters move into on a phone.
 *
 * Rendered into `document.body` rather than where it is written. It is written
 * inside the header panel, because that is where the control that opens it
 * lives and that is what keeps the two in one component — but a `position:
 * fixed` element is positioned against the nearest ancestor that has a
 * transform, a filter or containment, not against the viewport. The header
 * panel animates in, and an animated element holds a transform for as long as
 * the animation is filling. The sheet was coming to rest halfway up the page
 * with no overlay behind it, and it was the header's own entrance that did it.
 *
 * A portal is the fix rather than a workaround: an overlay covers the document,
 * so it belongs to the document. It also settles the other half of the problem,
 * which is that the header clips its own overflow and would have cropped the
 * sheet even once the positioning was right.
 */
function FilterSheet({
  open, onClose, onReset, title, count, children,
}: {
  open: boolean;
  onClose: () => void;
  onReset?: () => void;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  /* There is no `document` on the server, so the portal only exists once the
     component has mounted in a browser. */
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- a one-shot latch: the portal target only exists after mount
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open || !mounted) return null;
  return createPortal((
    <div className="p1 p1-ins fixed inset-0 z-[80] font-p1sans md:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <div className="p1-overlay absolute inset-0 bg-[#0B1220]/55" onClick={onClose} aria-hidden />
      <div className="p1-sheet absolute inset-x-0 bottom-0 flex max-h-[86vh] flex-col rounded-t-2xl border-t border-ins-line bg-ins-panel shadow-p1-lg">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ins-line px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-p1-text">{title}</h2>
            {count > 0 && (
              <span className="rounded-full bg-p1-primary-soft px-2 py-0.5 text-[11.5px] font-semibold text-p1-primary">{count}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-p1-text-3 hover:bg-ins-inset hover:text-p1-text"
          >
            <X size={19} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="grid gap-4">{children}</div>
        </div>

        <div
          className="flex shrink-0 gap-2 border-t border-ins-line px-4 py-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          {onReset && (
            <Button variant="ghost" leftIcon={<RotateCcw size={15} />} onClick={onReset} className="flex-1">
              Reset
            </Button>
          )}
          <Button variant="primary" leftIcon={<Check size={16} />} onClick={onClose} className="flex-1">
            Show results
          </Button>
        </div>
      </div>
    </div>
  ), document.body);
}

/* --------------------------------------------------------------- the strip */

export function ContextBar({
  summary,
  children,
  actions,
  count = 0,
  onReset,
  sheetTitle = 'Refine',
  className = '',
}: {
  /** What the figures are about, said in words. Always visible. */
  summary: React.ReactNode;
  /** The controls. Rendered inline on a desktop and inside the sheet on a phone. */
  children: React.ReactNode;
  /** Things that are not filters: an export, a link to another module. */
  actions?: React.ReactNode;
  count?: number;
  onReset?: () => void;
  sheetTitle?: string;
  className?: string;
}) {
  const wide = useMedia('(min-width: 768px)');
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className={cx('min-w-0', className)}>
      {wide ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">{children}</div>
          {(actions || (onReset && count > 0)) && (
            <div className="flex shrink-0 items-center gap-2 pb-0.5">
              {onReset && count > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold text-p1-primary transition-colors hover:bg-p1-primary-soft dark:text-p1-info"
                >
                  <RotateCcw size={13} aria-hidden />
                  Reset {count}
                </button>
              )}
              {actions}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? id : undefined}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl border border-ins-line bg-ins-panel px-3 py-2.5 text-left transition-colors active:bg-ins-inset"
          >
            <SlidersHorizontal size={16} className="shrink-0 text-p1-text-3" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium uppercase tracking-[0.04em] text-p1-text-3">Showing</span>
              <span className="block truncate text-[13px] font-medium text-p1-text">{summary}</span>
            </span>
            {count > 0 && (
              <span className="shrink-0 rounded-full bg-p1-primary px-2 py-0.5 text-[11.5px] font-semibold text-p1-primary-on">{count}</span>
            )}
          </button>
          {actions}
        </div>
      )}

      {!wide && (
        <FilterSheet open={open} onClose={() => setOpen(false)} onReset={onReset} title={sheetTitle} count={count}>
          {children}
        </FilterSheet>
      )}
    </div>
  );
}

/**
 * One control in the context strip, with its label.
 *
 * It exists so that a select, a search box and a segmented control sitting in
 * the same row wear the same label at the same size on the same baseline. The
 * selects bring their own label from the form kit; the other two did not, so
 * the strip read as three controls from three different screens.
 *
 * The label is `aria-hidden`: the control inside already carries its own
 * accessible name, and announcing it twice is worse than not drawing it.
 */
export function ContextField({
  label, children, className = '',
}: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('min-w-0', className)}>
      {/* The wrapper matches the form kit's own label row, so a control here
          sits on the same baseline as a select that brought its label with it. */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span aria-hidden className="text-[13.5px] font-medium text-p1-text">{label}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * The desktop summary line: the same sentence the phone shows on its button.
 *
 * Kept as its own component because it is the sentence a screenshot needs to
 * carry, and every module has to say it the same way.
 */
export function ContextSummary({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cx('text-[12.5px] leading-5 text-p1-text-2', className)}>
      <span className="font-medium uppercase tracking-[0.04em] text-p1-text-3">Showing </span>
      {children}
    </p>
  );
}

/* --------------------------------------------------------------- the chips */

/**
 * A row of exclusive choices — the period, the metric on a chart.
 *
 * A segmented control rather than a dropdown wherever there are five options or
 * fewer: the reader can see what else is available, which on a period selector
 * is the whole question.
 */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: {
  label: string;
  options: { key: T; label: React.ReactNode; hint?: string }[];
  value: T;
  onChange: (k: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = options.findIndex((o) => o.key === value);
    const next = options[(i + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length];
    onChange(next.key);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
      className={cx(
        'inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-ins-line bg-ins-inset p-1',
        /* Matches the height of a form control beside it in a context strip; the
           small size is for a panel header, where it sits beside a heading. */
        size === 'sm' ? 'h-8' : 'h-10',
        className,
      )}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            title={o.hint}
            onClick={() => onChange(o.key)}
            className={cx(
              'cursor-pointer rounded-[7px] font-medium transition-[background-color,color,box-shadow] duration-150',
              'flex h-full items-center',
              size === 'sm' ? 'px-2.5 text-[12px]' : 'px-3 text-[12.5px]',
              on
                ? 'bg-ins-panel text-p1-text shadow-p1-sm ring-1 ring-ins-line'
                : 'text-p1-text-3 hover:text-p1-text',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A filter currently in force, with the way to drop it. */
export function ActiveChip({
  children, onRemove, className = '',
}: { children: React.ReactNode; onRemove: () => void; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full bg-p1-primary-soft py-1 pl-2.5 pr-1 text-[12px] font-medium text-p1-primary dark:text-p1-info', className)}>
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-p1-primary/20"
        aria-label={`Remove filter ${typeof children === 'string' ? children : ''}`}
      >
        <X size={11} aria-hidden />
      </button>
    </span>
  );
}
