"use client";

/**
 * Dropdown menu for row and page actions. Dangerous items sit below a divider in danger colour.
 * Keyboard: Escape closes, arrows move, Enter activates; focus returns to the trigger.
 *
 * The panel is drawn into `document.body` through `AnchoredLayer`, the same
 * floating layer the selects use. A menu drawn where it is written gets trapped
 * by its own surroundings: a heading that has finished its rise animation still
 * carries a transform, which makes it a stacking context, so a toolbar further
 * down the page paints over the open menu; and a table that scrolls sideways
 * clips whatever hangs below its last row. Neither can reach the panel here.
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { cx, IconButton, Button, ButtonVariant, ButtonSize } from './primitives';
import { AnchoredLayer } from './listbox';

export interface MenuItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}

export function Menu({
  items, label = 'More actions', align = 'right', trigger, size = 'sm', className = '',
}: {
  items: (MenuItem | 'divider')[]; label?: string; align?: 'left' | 'right';
  trigger?: { label: React.ReactNode; variant?: ButtonVariant; size?: ButtonSize; leftIcon?: React.ReactNode; rightIcon?: React.ReactNode }; size?: 'sm' | 'md'; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const itemsIn = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current?.focus(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const els = itemsIn();
        if (!els.length) return;
        const i = els.indexOf(document.activeElement as HTMLElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length;
        els[next].focus();
      }
    };
    document.addEventListener('keydown', onKey);
    /* The panel is measured and placed before it is drawn, so it exists a frame
       after the menu opens rather than on this one. */
    const frame = requestAnimationFrame(() => itemsIn()[0]?.focus());
    return () => { document.removeEventListener('keydown', onKey); cancelAnimationFrame(frame); };
  }, [open]);

  const close = () => setOpen(false);

  return (
    /* A menu inside a clickable row: the trigger is the row's business, the panel is not in it. */
    <div className={cx('relative inline-flex', className)} onClick={(e) => e.stopPropagation()}>
      {trigger ? (
        <Button ref={btn} variant={trigger.variant ?? 'outline'} size={trigger.size ?? 'md'} leftIcon={trigger.leftIcon} rightIcon={trigger.rightIcon} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
          {trigger.label}
        </Button>
      ) : (
        <IconButton ref={btn} label={label} size={size} variant="ghost" aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
          <MoreHorizontal size={18} />
        </IconButton>
      )}

      <AnchoredLayer anchor={btn} open={open} onClose={close} matchWidth={false} minWidth={208} gap={6} align={align === 'right' ? 'end' : 'start'}>
        <div ref={panel} id={id} role="menu" aria-label={label} className="min-h-0 overflow-y-auto overscroll-contain py-1">
          {items.map((it, i) => {
            if (it === 'divider') return <div key={`d${i}`} role="separator" className="my-1 h-px bg-p1-border" />;
            const cls = cx('flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13.5px] transition-colors focus:outline-none focus-visible:bg-p1-subtle',
              it.disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer hover:bg-p1-subtle',
              it.danger ? 'text-p1-danger' : 'text-p1-text');
            const body = <>{it.icon && <span className={cx('shrink-0', it.danger ? 'text-p1-danger' : 'text-p1-text-3')} aria-hidden>{it.icon}</span>}<span className="flex-1">{it.label}</span>{it.hint && <span className="text-[12px] text-p1-text-3">{it.hint}</span>}</>;
            if (it.href && !it.disabled) return <Link key={it.key} role="menuitem" href={it.href} className={cls} onClick={close}>{body}</Link>;
            return (
              <button key={it.key} type="button" role="menuitem" aria-disabled={it.disabled || undefined} disabled={it.disabled} className={cls}
                onClick={() => { if (it.disabled) return; close(); it.onSelect?.(); btn.current?.focus(); }}>
                {body}
              </button>
            );
          })}
        </div>
      </AnchoredLayer>
    </div>
  );
}
