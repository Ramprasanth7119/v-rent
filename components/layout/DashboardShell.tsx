"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { usePersona, PersonaType } from './PersonaContext';
import { Navbar, Footer } from './Navbar';
import { AgentSidebar } from './AgentSidebar';
import { InvestorSidebar } from './InvestorSidebar';
import { AdminSidebar } from './AdminSidebar';
import { CommandPalette } from '../ui/CommandPalette';
import { Terminal, Shield, Briefcase, TrendingUp, Compass, Search, Sun, Moon } from 'lucide-react';

interface DashboardShellProps {
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ children }) => {
  const pathname = usePathname();
  const { 
    persona, 
    setPersona, 
    isDarkMode, 
    setDarkMode, 
    commandPaletteOpen, 
    setCommandPaletteOpen 
  } = usePersona();

  const [panelExpanded, setPanelExpanded] = useState(false);
  const isMapPage = pathname === '/map';

  // Draggable State for Persona Switcher Capsule
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0 });
  const hasDraggedRef = React.useRef(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only
    const target = e.target as HTMLElement;
    if (target.closest('.no-drag')) {
      return;
    }
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: e.clientX - dragPos.x,
      y: e.clientY - dragPos.y
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.no-drag')) {
      return;
    }
    const touch = e.touches[0];
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: touch.clientX - dragPos.x,
      y: touch.clientY - dragPos.y
    };
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      hasDraggedRef.current = true;
      setDragPos({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  React.useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      hasDraggedRef.current = true;
      const touch = e.touches[0];
      setDragPos({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y
      });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const personas: { type: PersonaType; label: string; icon: any; color: string }[] = [
    { type: 'consumer', label: 'Consumer', icon: Compass, color: 'bg-emerald-500 text-white' },
    { type: 'agent', label: 'Agent CRM', icon: Briefcase, color: 'bg-brand-gold text-brand-navy' },
    { type: 'agency', label: 'Agency ERP', icon: Shield, color: 'bg-blue-500 text-white' },
    { type: 'investor', label: 'Investor Wealth', icon: TrendingUp, color: 'bg-purple-500 text-white' },
    { type: 'admin', label: 'System Admin', icon: Terminal, color: 'bg-red-500 text-white' },
  ];

  // Determine which sidebar to show
  const renderSidebar = () => {
    switch (persona) {
      case 'agent':
      case 'agency':
        return <AgentSidebar />;
      case 'investor':
        return <InvestorSidebar />;
      case 'admin':
        return <AdminSidebar />;
      default:
        return null;
    }
  };

  const isDashboardMode = persona !== 'consumer';

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      
      {/* Dynamic Shell Layout */}
      {!isDashboardMode ? (
        // Consumer Shell
        <div className={`flex flex-col ${isMapPage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
          <Navbar />
          <main className={`flex-grow w-full ${isMapPage ? 'h-[calc(100vh-4rem)] overflow-hidden' : ''}`}>
            {isMapPage || pathname === '/' ? (
              children
            ) : (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </div>
            )}
          </main>
          {!isMapPage && <Footer />}
        </div>
      ) : (
        // Dashboard Shell
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          {renderSidebar()}

          {/* Main Dashboard Workspace */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Dashboard Workspace Header */}
            <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8 flex-shrink-0">
              <div className="flex items-center gap-4">
                <h1 className="text-sm font-bold uppercase tracking-widest text-neutral-400">
                  {persona === 'agency' ? 'Agency ERP Core' : `${persona} Portal`}
                </h1>
                
                {/* Search Shortcut */}
                <button 
                  onClick={() => setCommandPaletteOpen(true)}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-neutral-400 hover:text-foreground cursor-pointer transition-colors"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Search commands...</span>
                  <kbd className="px-1.5 py-0.5 border border-border rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] font-mono">
                    ⌘K
                  </kbd>
                </button>
              </div>

              {/* Header Right Widgets */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setDarkMode(!isDarkMode)}
                  className="p-2 text-neutral-400 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg cursor-pointer"
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <div className="h-4 w-px bg-border"></div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-brand-gold/10 border border-brand-gold flex items-center justify-center font-bold text-xs text-brand-gold">
                    {persona[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">
                    {persona === 'agency' ? 'Agency Administrator' : persona} Mode
                  </span>
                </div>
              </div>
            </header>

            {/* Scrollable Contents viewport */}
            <main className="flex-1 overflow-y-auto bg-neutral-50/30 dark:bg-background/20 p-6">
              {children}
            </main>
          </div>
        </div>
      )}

      {/* Sleek Minimizable Persona Switcher Capsule */}
      <div 
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ transform: `translate(${dragPos.x}px, ${dragPos.y}px)`, touchAction: 'none' }}
        className={`fixed bottom-6 right-6 z-50 select-none flex flex-col items-end gap-2 ${isDragging ? 'cursor-grabbing scale-102' : 'cursor-grab hover:scale-101'}`}
      >
        {panelExpanded ? (
          <div className="bg-neutral-900/95 dark:bg-neutral-950/95 backdrop-blur-md rounded-2xl border border-neutral-800 shadow-2xl p-4 flex flex-col sm:flex-row items-center gap-4 max-w-[95vw] animate-in slide-in-from-bottom-8 duration-200">
            <div className="flex items-center gap-2 border-b sm:border-b-0 sm:border-r border-neutral-800 pb-2 sm:pb-0 sm:pr-4">
              <div className="h-5 w-5 bg-brand-gold rounded flex items-center justify-center font-black text-brand-navy text-[10px]">V</div>
              <div className="text-left">
                <h5 className="text-[10px] font-black text-white uppercase tracking-wider leading-none">Persona Switcher</h5>
                <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5 leading-none">Demo Simulator</p>
              </div>
            </div>

            {/* Button Strip */}
            <div className="flex flex-wrap justify-center gap-2">
              {personas.map((p) => {
                const Icon = p.icon;
                const isSelected = persona === p.type;
                return (
                  <button
                    key={p.type}
                    onClick={() => {
                      setPersona(p.type);
                      setPanelExpanded(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer no-drag ${
                      isSelected
                        ? `${p.color} font-black scale-105 shadow-md`
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPanelExpanded(false)}
              className="text-neutral-400 hover:text-white text-[10px] font-bold uppercase tracking-wider border border-neutral-800 hover:border-neutral-700 rounded-md px-2.5 py-1 cursor-pointer no-drag"
            >
              Minimize
            </button>
          </div>
        ) : (
          /* Compact trigger */
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!hasDraggedRef.current) {
                setPanelExpanded(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setPanelExpanded(true);
              }
            }}
            className="bg-neutral-900/90 dark:bg-neutral-950/90 hover:bg-neutral-800/90 border border-neutral-800 text-white rounded-full px-4 py-2.5 flex items-center gap-2 shadow-2xl cursor-grab active:cursor-grabbing transition-all hover:scale-105"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-wider">
              🎭 Persona: {persona === 'consumer' ? 'Consumer' : persona === 'agent' ? 'Agent CRM' : persona === 'agency' ? 'Agency ERP' : persona === 'investor' ? 'Investor' : 'Admin'}
            </span>
            <svg className="h-3 w-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
            </svg>
          </div>
        )}
      </div>

      {/* global Command Palette */}
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
        onSelectPersona={(p) => setPersona(p)}
      />
    </div>
  );
};
export default DashboardShell;
