"use client";

/**
 * Dialog, confirmation and drawer with the accessibility basics:
 * Escape closes, focus moves in and returns, background scroll locks, role/aria-modal set.
 */

import React, { useEffect, useId, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button, cx } from './kit';

function useOverlay(open: boolean, onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], button, [href], input, select, textarea');
    (first ?? panel.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && panel.current) {
        const f = Array.from(panel.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute('disabled'));
        if (!f.length) return;
        const firstEl = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      restore.current?.focus?.();
    };
  }, [open, onClose]);

  return panel;
}

export function Dialog({
  open, onClose, title, description, children, footer, size = 'md',
}: { open: boolean; onClose: () => void; title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const panel = useOverlay(open, onClose);
  const tid = useId();
  const did = useId();
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }[size];
  return (
    <div className="p1 fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="p1-overlay fixed inset-0 bg-[#0B1E3F]/55 backdrop-blur-[2px] dark:bg-black/70" onClick={onClose} aria-hidden />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={tid} aria-describedby={description ? did : undefined} tabIndex={-1}
        className={cx('p1-panel relative w-full rounded-t-2xl border border-p1-border bg-p1-surface text-p1-text shadow-p1-lg sm:rounded-2xl', w)}>
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <h2 id={tid} className="text-[18px] font-semibold leading-6">{title}</h2>
            {description && <p id={did} className="mt-1 text-[14px] leading-5 text-p1-text-2">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-p1-text-3 hover:bg-p1-subtle hover:text-p1-text cursor-pointer"><X size={18} /></button>
        </div>
        {children && <div className="max-h-[65vh] overflow-y-auto px-5 py-4 sm:px-6">{children}</div>}
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-p1-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false, children, loading,
}: { open: boolean; onClose: () => void; onConfirm: () => void; title: React.ReactNode; description?: React.ReactNode; confirmLabel?: string; cancelLabel?: string; destructive?: boolean; children?: React.ReactNode; loading?: boolean }) {
  return (
    <Dialog open={open} onClose={onClose} title={
      <span className="flex items-center gap-2.5">
        {destructive && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-p1-danger-soft text-p1-danger" aria-hidden><AlertTriangle size={18} /></span>}
        {title}
      </span>
    } description={description} size="sm"
      footer={<>
        <Button variant="outline" onClick={onClose}>{cancelLabel}</Button>
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} data-autofocus>{confirmLabel}</Button>
      </>}>
      {children}
    </Dialog>
  );
}

export function Drawer({
  open, onClose, title, description, children, footer, side = 'right', width = 'md',
}: { open: boolean; onClose: () => void; title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; side?: 'left' | 'right'; width?: 'sm' | 'md' | 'lg' }) {
  const panel = useOverlay(open, onClose);
  const tid = useId();
  if (!open) return null;
  const w = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[width];
  return (
    <div className="p1 fixed inset-0 z-[70]">
      <div className="p1-overlay fixed inset-0 bg-[#0B1E3F]/55 backdrop-blur-[2px] dark:bg-black/70" onClick={onClose} aria-hidden />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={tid} tabIndex={-1}
        className={cx('fixed inset-y-0 flex w-full flex-col border-p1-border bg-p1-surface text-p1-text shadow-p1-lg', w,
          side === 'right' ? 'right-0 border-l p1-drawer' : 'left-0 border-r p1-drawer-left')}>
        <div className="flex items-start justify-between gap-4 border-b border-p1-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={tid} className="text-[18px] font-semibold leading-6">{title}</h2>
            {description && <p className="mt-0.5 text-[14px] text-p1-text-2">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-p1-text-3 hover:bg-p1-subtle hover:text-p1-text cursor-pointer"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-p1-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}
