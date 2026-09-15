"use client";

/**
 * Phase 1 primitives: class helper, buttons, avatar, keyboard hint.
 * Controls are 44px tall by default; the small size (36px) is reserved for dense rows.
 */

import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

/**
 * The display utilities that conflict with one another at the same breakpoint.
 * Responsive ones (`md:flex`) are left alone — they do not clash with a base.
 */
const DISPLAY = new Set([
  'hidden', 'block', 'inline', 'inline-block', 'flex', 'inline-flex',
  'grid', 'inline-grid', 'table', 'contents', 'flow-root', 'list-item',
]);

/**
 * Join class names, last one winning where two set the same thing.
 *
 * Every component here writes its own classes first and the caller's
 * `className` last, on the reasonable assumption that later wins. For most
 * utilities it does — two `px-*` rules have equal specificity, so the one
 * further down the generated stylesheet applies, and Tailwind orders those by
 * the order it found them. `display` is the exception that bites: a component
 * whose base is `inline-flex` and a caller passing `hidden md:inline-flex`
 * produced an element that stayed visible on a phone and dragged the page into
 * a horizontal scroll, because which of the two won was decided by the
 * stylesheet rather than by the class attribute.
 *
 * So resolve it here, where the intent is unambiguous: the caller wrote theirs
 * last and meant it.
 */
/**
 * Which family a class belongs to, for the families where two values cannot
 * both apply and the winner must be the one written last.
 *
 * Only unprefixed classes are grouped: `md:h-10` and `h-11` are not in conflict,
 * they are different breakpoints, and collapsing them would break every
 * responsive override in the kit.
 */
const POSITION = new Set(['static', 'relative', 'absolute', 'fixed', 'sticky']);

const family = (token: string): string | null => {
  if (token.includes(':')) return null;
  if (DISPLAY.has(token)) return 'display';
  // A base of `relative` and a caller's `absolute inset-0` resolved by stylesheet
  // order left the map wrapper static and zero pixels tall.
  if (POSITION.has(token)) return 'position';
  const m = /^(h|w)-/.exec(token);
  return m ? m[1] : null;
};

export const cx = (...a: unknown[]) => {
  const tokens = a
    .filter((x): x is string => typeof x === 'string' && x !== '')
    .join(' ')
    .split(/\s+/)
    .filter(Boolean);

  /* Count each family first, so the pass below can keep only the last of any
     family that appears more than once and leave everything else alone. */
  const counts = new Map<string, number>();
  for (const t of tokens) {
    const f = family(t);
    if (f) counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  if (![...counts.values()].some((n) => n > 1)) return tokens.join(' ');

  return tokens
    .filter((t) => {
      const f = family(t);
      if (!f) return true;
      const left = (counts.get(f) ?? 1) - 1;
      counts.set(f, left);
      return left === 0;
    })
    .join(' ');
};

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
  primary:          'bg-p1-primary text-p1-primary-on shadow-p1-sm hover:bg-p1-primary-hover',
  secondary:        'bg-p1-primary-soft text-p1-primary hover:bg-p1-primary-soft/70',
  outline:          'border border-p1-border-strong bg-p1-surface text-p1-text hover:border-p1-text-3/40 hover:bg-p1-subtle',
  ghost:            'text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text',
  /* Amber is reserved for "featured". One action colour per screen is what
     keeps an interface from looking assembled. */
  accent:           'bg-p1-accent text-p1-accent-on hover:bg-p1-accent-hover shadow-p1-sm',
  danger:           'bg-p1-danger text-white hover:opacity-90 dark:text-p1-bg',
  'danger-outline': 'border border-p1-danger-border bg-p1-surface text-p1-danger hover:bg-p1-danger-soft',
  link:             'text-p1-primary underline-offset-4 hover:underline px-0 h-auto',
};

/* Controls are 10px radius, not pills: a pill reads as a tag, a button should
   read as a button. Heights keep a 40px minimum tap target on the small size. */
export const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-[14px] gap-2 rounded-lg',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-lg',
};

const BTN_BASE = 'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,box-shadow,transform,opacity,border-color,color] duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 cursor-pointer';

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
        'inline-flex shrink-0 items-center justify-center rounded-lg transition-[background-color,color,transform] duration-150 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'h-9 w-9' : 'h-10 w-10',
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
  // Soft fills rather than solid ones: a column of solid blue discs is louder than
  // the names beside them.
  const bg = { primary: 'bg-p1-primary-soft text-p1-primary', accent: 'bg-p1-accent-soft text-p1-accent-text', neutral: 'bg-p1-subtle text-p1-text-2' }[tone];
  return <span className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight', bg, sz, className)} aria-hidden>{initials}</span>;
}

/** Keyboard shortcut hint. */
export function Kbd({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <kbd className={cx('inline-flex h-5 min-w-5 items-center justify-center rounded border border-p1-border-strong bg-p1-subtle px-1 font-sans text-[11px] font-medium text-p1-text-2', className)}>{children}</kbd>;
}
