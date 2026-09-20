"use client";

/**
 * A set of suggested chips, plus whatever the agent needs that is not on it.
 *
 * Every fixed list of amenities is wrong for somebody. A development with a
 * bowling alley, a flat that comes with a piano, a shophouse with a goods lift
 * — the agent knows the thing that will let the unit, and a picker that cannot
 * hold it teaches them to put it in the description instead, where nothing can
 * filter or compare it.
 *
 * So the suggestions are chips and the rest is a field. Anything typed becomes
 * a chip of its own, kept in a row of its own under "Added by you", because an
 * agent scanning back through thirty chips needs to see at a glance which ones
 * were their own words and are therefore theirs to correct.
 *
 * Framed as a card, like the floor plan and the video and the eligibility
 * field, so a long step reads as a handful of things rather than as a wall.
 */

import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../kit';

function Chip({ on, children, onClick }: { on: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        'p1-press inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium',
        on
          ? 'border-p1-primary bg-p1-primary-soft text-p1-primary'
          : 'border-p1-border-strong bg-p1-surface text-p1-text-2 hover:border-p1-text-3/60 hover:text-p1-text',
      )}
    >
      {on && <Check size={14} strokeWidth={2.5} aria-hidden />}
      {children}
    </button>
  );
}

export function ChipPicker({
  icon,
  legend,
  hint,
  suggestions,
  value,
  onChange,
  placeholder = 'Something else…',
  max = 30,
}: {
  icon?: ReactNode;
  legend: string;
  hint?: string;
  suggestions: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [typed, setTyped] = useState('');

  const toggle = (item: string) =>
    onChange(value.includes(item) ? value.filter((x) => x !== item) : [...value, item]);

  /* Compared case-insensitively so "Aircon" is not added beside "aircon", and
     trimmed so a trailing space does not create a second entry. */
  const add = () => {
    const item = typed.trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!item || value.length >= max) return;
    if (!value.some((x) => x.toLowerCase() === item.toLowerCase())) onChange([...value, item]);
    setTyped('');
  };

  /* What the agent typed in, as opposed to what was suggested. */
  const extras = value.filter((v) => !suggestions.includes(v));
  const full = value.length >= max;

  return (
    <fieldset className="rounded-xl border border-p1-border bg-p1-surface">
      <legend className="sr-only">{legend}</legend>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-p1-border px-4 py-3">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-p1-text" aria-hidden>
          {icon && <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-p1-subtle text-p1-text-2">{icon}</span>}
          {legend}
        </h3>
        <span className={cx('text-[12px] tabular-nums', value.length ? 'font-medium text-p1-primary' : 'text-p1-text-3')}>
          {value.length ? `${value.length} selected` : 'None yet'}
        </span>
      </div>

      <div className="p-4">
        {hint && <p className="mb-3 text-[12.5px] leading-5 text-p1-text-3">{hint}</p>}

        <div className="flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <Chip key={item} on={value.includes(item)} onClick={() => toggle(item)}>{item}</Chip>
          ))}
        </div>

        {extras.length > 0 && (
          <div className="mt-3.5 border-t border-dashed border-p1-border pt-3">
            <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-p1-text-3">Added by you</div>
            <div className="flex flex-wrap gap-2">
              {extras.map((item) => (
                <span
                  key={item}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-p1-primary bg-p1-primary-soft pl-3 pr-1.5 text-[13px] font-medium text-p1-primary"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => toggle(item)}
                    aria-label={`Remove ${item}`}
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md hover:bg-p1-primary/15"
                  >
                    <X size={13} aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3.5 flex gap-2 border-t border-p1-border pt-3.5">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              /* Enter adds the entry rather than submitting the step, which is
                 what a form would otherwise do halfway through a list. */
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
            }}
            placeholder={placeholder}
            maxLength={60}
            disabled={full}
            aria-label={`Add to ${legend.toLowerCase()}`}
            className="p1-field h-9 min-w-0 flex-1 rounded-lg border border-p1-border-strong bg-p1-surface px-3 text-[13.5px] text-p1-text placeholder:text-p1-text-3 focus:border-p1-primary focus:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none disabled:opacity-50 sm:max-w-xs"
          />
          <button
            type="button"
            onClick={add}
            disabled={!typed.trim() || full}
            className="p1-press inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-p1-border-strong px-3 text-[13px] font-medium text-p1-text hover:bg-p1-subtle disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} aria-hidden /> Add
          </button>
        </div>

        <p className="mt-2 text-[12px] text-p1-text-3">
          {full ? `That is the limit of ${max}.` : 'Not on the list? Type it and press Enter.'}
        </p>
      </div>
    </fieldset>
  );
}
