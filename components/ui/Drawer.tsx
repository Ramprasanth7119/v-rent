import React from 'react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-neutral-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className={`fixed inset-y-0 ${position === 'left' ? 'left-0' : 'right-0'} flex max-w-full z-10`}>
        <div className={`relative w-screen ${sizeStyles[size]} bg-card border-l border-border text-foreground shadow-2xl flex flex-col h-full transform transition-all duration-300`}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            {title ? (
              <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
            ) : (
              <div />
            )}
            <button 
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-foreground cursor-pointer transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Drawer;
