"use client";

/**
 * Dialog, confirmation and drawer with the accessibility basics:
 * Escape closes, focus moves in and returns, background scroll locks, role/aria-modal set.
 *
 * Every overlay is rendered into `document.body` rather than where it is
 * written. A `position: fixed` element is only positioned against the viewport
 * while no ancestor has a transform, a filter or a backdrop-filter; any of
 * those makes that ancestor the containing block instead. A portal is the only
 * reliable fix, and it also lifts the panel clear of every stacking context.
 *
 * The look follows one pattern for every decision in the product: a tinted
 * icon that says what kind of decision this is, a title that is the question,
 * one line of consequence, anything the person needs to see before deciding,
 * and two buttons of equal weight with the safe one on the left. On a phone
 * the dialog rises from the bottom as a sheet.
 */

import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { Button, cx } from './kit';

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

function useOverlay(open: boolean, onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], button:not([data-close]), [href], input, select, textarea');
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

export type DialogTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_BADGE: Record<DialogTone, string> = {
  primary: 'bg-p1-primary-soft text-p1-primary ring-p1-primary-soft/50',
  success: 'bg-p1-success-soft text-p1-success ring-p1-success-soft/50',
  warning: 'bg-p1-warning-soft text-p1-warning ring-p1-warning-soft/50',
  danger: 'bg-p1-danger-soft text-p1-danger ring-p1-danger-soft/50',
  neutral: 'bg-p1-subtle text-p1-text-2 ring-p1-subtle/50',
};

/** The tinted icon at the top of a dialog. A second soft ring gives it presence without colour shouting. */
export function DialogIcon({ tone = 'primary', children }: { tone?: DialogTone; children: React.ReactNode }) {
  return (
    <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-[6px]', TONE_BADGE[tone])} aria-hidden>
      {children}
    </span>
  );
}

export function Dialog({
  open, onClose, title, description, children, footer, size = 'md', icon, tone = 'primary', layout = 'stacked',
}: {
  open: boolean; onClose: () => void; title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** An icon for the badge. Omitted, no badge is drawn. */
  icon?: React.ReactNode;
  tone?: DialogTone;
  /** `stacked`: icon above the title, for confirmations. `inline`: icon beside it, for forms. */
  layout?: 'stacked' | 'inline';
}) {
  const panel = useOverlay(open, onClose);
  const tid = useId();
  const did = useId();
  if (!open) return null;
  const w = { sm: 'sm:max-w-[440px]', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size];
  return (
    <Portal>
      <div className="p1 p1-portal fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
        <div className="p1-overlay fixed inset-0 bg-[#0B1220]/55 backdrop-blur-[2px] dark:bg-black/70" onClick={onClose} aria-hidden />
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={tid}
          aria-describedby={description ? did : undefined}
          tabIndex={-1}
          className={cx('p1-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[20px] bg-p1-surface text-p1-text shadow-p1-lg ring-1 ring-black/5 focus:outline-none dark:ring-white/10 sm:rounded-[20px]', w)}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <span className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-p1-border-strong sm:hidden" aria-hidden />
          <button
            type="button"
            data-close
            onClick={onClose}
            aria-label="Close"
            className="p1-field absolute right-3.5 top-3.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-p1-text-3 transition-colors hover:bg-p1-subtle hover:text-p1-text focus-visible:shadow-[0_0_0_2px_var(--p1-primary)]"
          >
            <X size={18} />
          </button>

          <div className={cx('px-5 pt-5 sm:px-6 sm:pt-6', layout === 'inline' ? 'flex items-start gap-4 pr-14' : 'pr-14')}>
            {icon && <div className={layout === 'stacked' ? 'mb-4' : ''}><DialogIcon tone={tone}>{icon}</DialogIcon></div>}
            <div className="min-w-0">
              <h2 id={tid} className="text-[17px] font-semibold leading-6 tracking-[-0.01em] text-p1-text">{title}</h2>
              {description && <p id={did} className="mt-1 text-[14px] leading-[1.55] text-p1-text-2">{description}</p>}
            </div>
          </div>

          {children && <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pt-4 sm:px-6">{children}</div>}

          {footer && <div className="mt-auto flex gap-3 px-5 pb-5 pt-6 sm:px-6 sm:pb-6">{footer}</div>}
          {!footer && <div className="pb-5 sm:pb-6" />}
        </div>
      </div>
    </Portal>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false, children, loading, confirmDisabled = false,
  tone, icon,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: React.ReactNode; description?: React.ReactNode; confirmLabel?: string; cancelLabel?: string;
  destructive?: boolean; children?: React.ReactNode; loading?: boolean; confirmDisabled?: boolean;
  tone?: DialogTone;
  icon?: React.ReactNode;
}) {
  const t: DialogTone = tone ?? (destructive ? 'danger' : 'primary');
  const glyph = icon ?? (t === 'danger' ? <AlertTriangle size={20} /> : t === 'warning' ? <ShieldAlert size={20} /> : t === 'success' ? <CheckCircle2 size={20} /> : <Info size={20} />);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      icon={glyph}
      tone={t}
      footer={<>
        <Button variant="outline" size="lg" onClick={onClose} disabled={loading} className="flex-1">{cancelLabel}</Button>
        {/* Held until whatever the dialog asks for is there — better than
            letting someone confirm and meet a failure. */}
        <Button variant={t === 'danger' ? 'danger' : 'primary'} size="lg" onClick={onConfirm} loading={loading} disabled={confirmDisabled} data-autofocus className="flex-1">{confirmLabel}</Button>
      </>}
    >
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
    <Portal>
      <div className="p1 p1-portal fixed inset-0 z-[100]">
        <div className="p1-overlay fixed inset-0 bg-[#0B1220]/55 backdrop-blur-[2px] dark:bg-black/70" onClick={onClose} aria-hidden />
        <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={tid} tabIndex={-1}
          className={cx('fixed inset-y-0 flex w-full flex-col bg-p1-surface text-p1-text shadow-p1-lg focus:outline-none', w,
            side === 'right' ? 'right-0 border-l border-p1-border p1-drawer' : 'left-0 border-r border-p1-border p1-drawer-left')}>
          <div className="flex items-start justify-between gap-4 border-b border-p1-border px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id={tid} className="text-[17px] font-semibold leading-6 tracking-[-0.01em]">{title}</h2>
              {description && <p className="mt-0.5 text-[13.5px] leading-5 text-p1-text-2">{description}</p>}
            </div>
            <button type="button" data-close onClick={onClose} aria-label="Close" className="p1-field -mr-1.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-p1-text-3 hover:bg-p1-subtle hover:text-p1-text focus-visible:shadow-[0_0_0_2px_var(--p1-primary)]"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
          {footer && <div className="flex flex-col-reverse gap-2 border-t border-p1-border bg-p1-bg/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}
