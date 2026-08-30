"use client";

import React, { createContext, useCallback, useContext, useState } from 'react';
import { Check, AlertTriangle, Info, X, AlertCircle } from 'lucide-react';

type Tone = 'success' | 'warn' | 'info' | 'error';
interface Toast { id: number; title: string; body?: string; tone: Tone; action?: { label: string; onClick: () => void } }

const Ctx = createContext<{ push: (t: Omit<Toast, 'id'>) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-3), { ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), t.tone === 'error' ? 7000 : 4500);
  }, []);

  const icon = { success: Check, warn: AlertTriangle, info: Info, error: AlertCircle };
  const tone = {
    success: 'bg-p1-success text-white',
    warn: 'bg-p1-warning text-white',
    info: 'bg-p1-primary text-white',
    error: 'bg-p1-danger text-white',
  };

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="p1 pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2.5 max-sm:bottom-20">
        {items.map((t) => {
          const Icon = icon[t.tone];
          return (
            <div key={t.id} role="status"
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-p1-border bg-p1-elevated p-3.5 shadow-p1-lg"
              style={{ animation: 'vr-toast-in 220ms cubic-bezier(0.16,1,0.3,1)' }}>
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone[t.tone]}`} aria-hidden>
                <Icon size={14} strokeWidth={3} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold leading-5 text-p1-text">{t.title}</div>
                {t.body && <div className="mt-0.5 text-[13px] leading-5 text-p1-text-2">{t.body}</div>}
                {t.action && (
                  <button type="button" onClick={() => { t.action!.onClick(); setItems((s) => s.filter((x) => x.id !== t.id)); }}
                    className="mt-1.5 text-[13px] font-semibold text-p1-accent-text underline-offset-4 hover:underline cursor-pointer">
                    {t.action.label}
                  </button>
                )}
              </div>
              <button type="button" onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} aria-label="Dismiss notification"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-p1-text-3 hover:bg-p1-subtle hover:text-p1-text cursor-pointer">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes vr-toast-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (prefers-reduced-motion: reduce) { @keyframes vr-toast-in { from { opacity: 1; } to { opacity: 1; } } }
      `}</style>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used inside ToastProvider');
  return v;
}
