"use client";

/**
 * A select that looks the same in every browser, and a floating layer that
 * nothing can clip.
 *
 * The native `<select>` opens the operating system's own menu — a grey Windows
 * list on one machine, a wheel on an iPhone — and cannot be styled. `SelectMenu`
 * is a button and a listbox with the keyboard behaviour people expect from a
 * select: arrows, Home and End, Enter or Space to choose, Escape to close, and
 * typing a letter to jump.
 *
 * Both render their panel into `document.body` at a fixed position under their
 * anchor, so an `overflow-hidden` hero or a card painted above cannot cut them
 * off. The panel flips above the anchor when there is no room below.
 */

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cx } from './primitives';

/* ----------------------------------------------------------- anchored layer */

interface Place { left: number; top: number; width: number; maxHeight: number; above: boolean }

/** Where a panel goes under (or, without room, over) its anchor, kept inside the viewport. */
function placeUnder(el: HTMLElement, o: { minWidth: number; gap: number; matchWidth: boolean; align: 'start' | 'end' }): Place {
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(vw - 16, Math.max(o.minWidth, o.matchWidth ? r.width : o.minWidth));
  let left = o.align === 'end' ? r.right - width : r.left;
  left = Math.max(8, Math.min(left, vw - width - 8));
  const below = vh - r.bottom - o.gap - 8;
  const aboveRoom = r.top - o.gap - 8;
  const above = below < 220 && aboveRoom > below;
  const maxHeight = Math.max(160, Math.min(360, above ? aboveRoom : below));
  return { left, top: above ? r.top - o.gap : r.bottom + o.gap, width, maxHeight, above };
}

export function AnchoredLayer({
  anchor, open, onClose, children, minWidth = 220, gap = 8, className = '', matchWidth = true, align = 'start',
}: {
  anchor: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  minWidth?: number;
  gap?: number;
  className?: string;
  matchWidth?: boolean;
  align?: 'start' | 'end';
}) {
  const layer = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Place | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = anchor.current;
      if (el) setPlace(placeUnder(el, { minWidth, gap, matchWidth, align }));
    };
    // Measuring the anchor is what this effect is for: the panel is placed from the DOM.
    measure();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (layer.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, anchor, minWidth, gap, matchWidth, align, onClose]);

  if (!open || !place || typeof document === 'undefined') return null;

  return createPortal(
    // The outer layer carries the tokens and the position; it must stay transparent
    // (`.p1-portal`). The surface is the inner panel, so its background is not overridden.
    <div
      ref={layer}
      className="p1 p1-portal fixed z-[120]"
      style={{
        left: place.left,
        width: place.width,
        ...(place.above ? { bottom: window.innerHeight - place.top } : { top: place.top }),
      }}
    >
      <div
        className={cx('p1-panel flex flex-col overflow-hidden rounded-xl border border-p1-border bg-p1-elevated text-p1-text shadow-p1-lg', className)}
        style={{ maxHeight: place.maxHeight, transformOrigin: place.above ? 'bottom center' : 'top center' }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------- select menu */

export interface SelectOption { value: string; label: string; hint?: string }

export function SelectMenu({
  label, value, options, onChange, variant = 'field', className = '', placeholder, id: idProp, hideLabel = false,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** `field`: a small label above the value, for search cards. `button`: a bordered control. */
  variant?: 'field' | 'button' | 'ghost';
  className?: string;
  placeholder?: string;
  id?: string;
  hideLabel?: boolean;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActiveState] = useState(0);
  // The latest highlighted option, for a keypress that lands before the re-render.
  const activeRef = useRef(0);
  const setActive = (next: number | ((a: number) => number)) => {
    const value = typeof next === 'function' ? next(activeRef.current) : next;
    activeRef.current = value;
    setActiveState(value);
  };
  const typed = useRef({ text: '', at: 0 });

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options.find((o) => o.value === value);

  const openMenu = (at = selectedIndex) => { setActive(at); setOpen(true); };
  const close = useCallback((refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus(); }, []);
  const choose = (i: number) => { const o = options[i]; if (o) onChange(o.value); close(); };

  useEffect(() => {
    if (!open) return;
    const el = list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const typeAhead = (key: string) => {
    const now = Date.now();
    const t = typed.current;
    t.text = now - t.at < 600 ? t.text + key.toLowerCase() : key.toLowerCase();
    t.at = now;
    const start = open ? activeRef.current + 1 : selectedIndex + 1;
    const order = [...options.slice(start), ...options.slice(0, start)];
    const hit = order.find((o) => o.label.toLowerCase().startsWith(t.text));
    return hit ? options.indexOf(hit) : -1;
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu(); }
      else if (e.key.length === 1 && /\S/.test(e.key)) { const i = typeAhead(e.key); if (i >= 0) onChange(options[i].value); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(activeRef.current); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { close(false); }
    else if (e.key.length === 1 && /\S/.test(e.key)) { const i = typeAhead(e.key); if (i >= 0) setActive(i); }
  };

  const labelId = `${id}-label`;
  const listId = `${id}-list`;

  return (
    <div className={cx('relative min-w-0', className)}>
      {variant === 'button' && !hideLabel && <span id={labelId} className="mb-1.5 block text-[13.5px] font-medium text-p1-text">{label}</span>}
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={variant === 'button' && !hideLabel ? `${labelId} ${id}` : undefined}
        aria-label={variant !== 'button' || hideLabel ? `${label}: ${current?.label ?? placeholder ?? ''}` : undefined}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKey}
        className={cx(
          'p1-field group flex w-full min-w-0 cursor-pointer items-center gap-2 text-left transition-[background-color,border-color,box-shadow] duration-150',
          variant === 'field'
            ? cx('h-full rounded-lg px-3 py-2 hover:bg-p1-subtle focus-visible:bg-p1-subtle focus-visible:shadow-[inset_0_0_0_2px_var(--p1-primary)]', open && 'bg-p1-subtle')
            : variant === 'ghost'
            ? cx('h-9 w-auto rounded-lg px-2.5 text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text focus-visible:shadow-[0_0_0_2px_var(--p1-primary)]', open && 'bg-p1-subtle text-p1-text')
            : cx('h-11 rounded-lg border bg-p1-surface px-3.5 hover:border-p1-text-3/60 focus-visible:border-p1-primary focus-visible:shadow-[0_0_0_3px_var(--p1-ring)]', open ? 'border-p1-primary shadow-[0_0_0_3px_var(--p1-ring)]' : 'border-p1-border-strong'),
        )}
      >
        <span className="min-w-0 flex-1">
          {variant === 'field' && <span className="block text-[11.5px] font-medium text-p1-text-3">{label}</span>}
          <span className={cx('block truncate', variant === 'button' ? 'text-[14px]' : 'text-[14px] font-medium', current ? 'text-p1-text' : 'text-p1-text-3')}>
            {current?.label ?? placeholder ?? 'Select'}
          </span>
        </span>
        <ChevronDown size={15} className={cx('shrink-0 text-p1-text-3 transition-transform duration-200', open && 'rotate-180', variant === 'field' && 'self-end mb-0.5')} aria-hidden />
      </button>

      <AnchoredLayer anchor={trigger} open={open} onClose={() => close(false)} minWidth={200}>
        <ul ref={list} id={listId} role="listbox" aria-label={label} className="overflow-y-auto overscroll-contain py-1.5">
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={selected}
                onPointerMove={() => setActive(i)}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={cx('mx-1.5 flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-[14px]', i === active && 'bg-p1-subtle', selected ? 'font-medium text-p1-text' : 'text-p1-text-2')}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.label}</span>
                  {o.hint && <span className="block truncate text-[12px] text-p1-text-3">{o.hint}</span>}
                </span>
                <Check size={15} className={cx('shrink-0 text-p1-primary', selected ? 'opacity-100' : 'opacity-0')} aria-hidden />
              </li>
            );
          })}
        </ul>
      </AnchoredLayer>
    </div>
  );
}
