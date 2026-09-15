"use client";

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** A value that copies on click and says so. */
export function CopyText({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
      }}
      aria-label={`Copy ${label}`}
      className="group inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-p1-border bg-p1-surface px-2 font-mono text-[12.5px] text-p1-text hover:border-p1-border-strong"
    >
      {value}
      {copied
        ? <span className="p1-in inline-flex items-center gap-1 font-sans text-[11.5px] font-medium text-p1-success"><Check size={12} aria-hidden /> Copied</span>
        : <Copy size={12} className="text-p1-text-3 group-hover:text-p1-text" aria-hidden />}
    </button>
  );
}
