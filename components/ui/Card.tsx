import React from 'react';

// Card Primitive
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  glassmorphism?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  glassmorphism = false,
  ...props
}) => {
  const hasBg = className.includes('bg-');
  const hasText = className.includes('text-');
  const hasBorder = className.includes('border-') || className.includes('border ');

  const baseStyle = [
    'rounded-xl p-5 transition-all duration-200',
    hasBorder ? '' : 'border border-border',
    hasBg ? '' : 'bg-card',
    hasText ? '' : 'text-foreground'
  ].filter(Boolean).join(' ');
  const hoverStyle = hoverEffect ? 'hover:-translate-y-1 hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700' : '';
  const glassStyle = glassmorphism ? 'glass' : '';

  return (
    <div
      className={`${baseStyle} ${hoverStyle} ${glassStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};


