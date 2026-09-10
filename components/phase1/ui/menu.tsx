"use client";

/**
 * Dropdown menu for row and page actions. Dangerous items sit below a divider in danger colour.
 * Keyboard: Escape closes, arrows move, Enter activates; focus returns to the trigger.
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { cx, IconButton, Button, ButtonVariant, ButtonSize } from './primitives';

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
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current?.focus(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const els = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
        if (!els.length) return;
        const i = els.indexOf(document.activeElement as HTMLElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length;
        els[next].focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    const first = root.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])');
    first?.focus();
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={root} className={cx('relative inline-flex', className)} onClick={(e) => e.stopPropagation()}>
      {trigger ? (
        <Button ref={btn} variant={trigger.variant ?? 'outline'} size={trigger.size ?? 'md'} leftIcon={trigger.leftIcon} rightIcon={trigger.rightIcon} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
          {trigger.label}
        </Button>
      ) : (
        <IconButton ref={btn} label={label} size={size} variant="ghost" aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
          <MoreHorizontal size={18} />
        </IconButton>
      )}
      {open && (
        <div id={id} role="menu" aria-label={label} className={cx('p1-panel absolute top-full z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-lg border border-p1-border bg-p1-elevated py-1 shadow-p1-lg', align === 'right' ? 'right-0' : 'left-0')}>
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
      )}
    </div>
  );
}
