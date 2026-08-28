"use client";

import React, { createContext, useCallback, useContext, useState } from 'react';
import { Check, AlertTriangle, Info, X } from 'lucide-react';

type Tone = 'success' | 'warn' | 'info';
interface Toast { id: number; title: string; body?: string; tone: Tone }

const Ctx = createContext<{ push: (t: Omit<Toast, 'id'>) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4200);
  }, []);

  const icon = { success: Check, warn: AlertTriangle, info: Info };
  const tone = {
    success: 'border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/80 dark:text-emerald-300',
    warn: 'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/80 dark:text-amber-300',
    info: 'border-border bg-card text-foreground',
  };

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(22rem,calc(100vw-2.5rem))] flex-col gap-2">
        {items.map((t) => {
          const Icon = icon[t.tone];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg backdrop-blur ${tone[t.tone]}`}
              style={{ animation: 'vr-toast-in 220ms cubic-bezier(0.16,1,0.3,1)' }}
            >
              <Icon size={15} className="mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold">{t.title}</div>
                {t.body && <div className="mt-0.5 text-[11px] leading-snug opacity-80">{t.body}</div>}
              </div>
              <button
                onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))}
                className="flex-shrink-0 opacity-50 transition-opacity hover:opacity-100"
                aria-label="Dismiss"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes vr-toast-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes vr-toast-in { from { opacity: 1; } to { opacity: 1; } }
        }
      `}</style>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used inside ToastProvider');
  return v;
}
