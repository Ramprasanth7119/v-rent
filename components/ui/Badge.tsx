import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'ai';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  variant = 'primary',
  ...props
}) => {
  const baseStyle = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wider uppercase';
  
  const variantStyles = {
    primary: 'bg-brand-navy text-white dark:bg-neutral-800 dark:text-neutral-200',
    secondary: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-400',
    gold: 'bg-brand-gold-light text-brand-navy-dark dark:bg-brand-gold dark:text-brand-navy-dark',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400',
    danger: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400',
    ai: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 animate-pulse-slow',
  };

  return (
    <span
      className={`${baseStyle} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
export default Badge;
