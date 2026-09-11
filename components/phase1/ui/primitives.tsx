"use client";

/**
 * Phase 1 primitives: class helper, buttons, avatar, keyboard hint.
 * Controls are 44px tall by default; the small size (36px) is reserved for dense rows.
 */

import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export const cx = (...a: unknown[]) => a.filter((x) => typeof x === 'string' && x).join(' ');

export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cx('animate-spin', className)} aria-hidden />;
}

/* ------------------------------------------------------------------ button */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'danger' | 'danger-outline' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  block?: boolean;
}

export const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:          'bg-p1-primary text-p1-primary-on shadow-p1-sm hover:bg-p1-primary-hover hover:shadow-p1-md',
  secondary:        'bg-p1-primary-soft text-p1-primary hover:bg-p1-primary-soft/70 dark:text-p1-text',
  outline:          'border border-p1-border-strong bg-p1-surface text-p1-text hover:bg-p1-subtle',
  ghost:            'text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text',
  /* Gold is for a navy surface, where blue would disappear. On a light page
     the action colour is blue — two competing call-to-action colours on one
     screen is what makes an interface look assembled rather than designed. */
  accent:           'bg-p1-accent text-p1-accent-on hover:bg-p1-accent-hover font-semibold shadow-p1-sm',
  danger:           'bg-p1-danger text-white hover:opacity-90',
  'danger-outline': 'border border-p1-danger-border bg-p1-surface text-p1-danger hover:bg-p1-danger-soft',
  link:             'text-p1-primary underline-offset-4 hover:underline px-0 h-auto dark:text-p1-info',
};

export const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-full',
  md: 'h-11 px-5 text-[14px] gap-2 rounded-full',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-full',
};

const BTN_BASE = 'inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-[background-color,box-shadow,transform,opacity,border-color] duration-150 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, block, className = '', disabled, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(BTN_BASE, BTN_VARIANT[variant], variant !== 'link' && BTN_SIZE[size], block && 'w-full', className)}
      {...rest}
    >
      {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : leftIcon && <span className="shrink-0" aria-hidden>{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="shrink-0" aria-hidden>{rightIcon}</span>}
    </button>
  );
});

/** A Link styled exactly like a Button. */
export function LinkButton({
  href, variant = 'primary', size = 'md', leftIcon, rightIcon, block, className = '', children, ...rest
}: { href: string; variant?: ButtonVariant; size?: ButtonSize; leftIcon?: React.ReactNode; rightIcon?: React.ReactNode; block?: boolean; className?: string; children: React.ReactNode } & Omit<React.ComponentProps<typeof Link>, 'href' | 'className' | 'children'>) {
  return (
    <Link
      href={href}
      className={cx(BTN_BASE, BTN_VARIANT[variant], variant !== 'link' && BTN_SIZE[size], block && 'w-full', className)}
      {...rest}
    >
      {leftIcon && <span className="shrink-0" aria-hidden>{leftIcon}</span>}
      {children}
      {rightIcon && <span className="shrink-0" aria-hidden>{rightIcon}</span>}
    </Link>
  );
}

/** Square icon-only button with a mandatory accessible label. */
export const IconButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: 'sm' | 'md'; variant?: 'ghost' | 'outline' }>(function IconButton(
  { label, size = 'md', variant = 'ghost', className = '', children, ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'h-9 w-9' : 'h-11 w-11',
        variant === 'outline' ? 'border border-p1-border-strong bg-p1-surface text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text' : 'text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

/* ------------------------------------------------------------------ avatar */

export function Avatar({ name, size = 'md', className = '', tone = 'primary' }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; className?: string; tone?: 'primary' | 'accent' | 'neutral' }) {
  const initials = name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const sz = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-[12px]', md: 'h-10 w-10 text-[14px]', lg: 'h-14 w-14 text-[18px]', xl: 'h-20 w-20 text-[26px]' }[size];
  const bg = { primary: 'bg-p1-primary text-white', accent: 'bg-p1-accent text-p1-accent-on', neutral: 'bg-p1-subtle text-p1-text-2' }[tone];
  return <span className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', bg, sz, className)} aria-hidden>{initials}</span>;
}

/** Keyboard shortcut hint. */
export function Kbd({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <kbd className={cx('inline-flex h-5 min-w-5 items-center justify-center rounded border border-p1-border-strong bg-p1-subtle px-1 font-sans text-[11px] font-medium text-p1-text-2', className)}>{children}</kbd>;
}
