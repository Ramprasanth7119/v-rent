"use client";

/**
 * The property type, chosen the way agents think about it.
 *
 * Categories down the left, the subtypes of the chosen one on the right, the
 * residential ones first because that is most of the work. It is a disclosure
 * rather than a dropdown of sixty entries: an agent listing a four-room flat
 * should see the four-room types, not scroll past the industrial ones.
 *
 * Nothing is chosen until a subtype is. A category on its own is not an answer
 * — "HDB" is what the old five-word list said, and the whole point of this
 * control is to stop that being the last word.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cx } from '../kit';
import {
  PROPERTY_CATEGORIES, SECTORS, categoriesIn, categoryOf, propertyTypeLabel,
  type PropertyCategory,
} from '../../../lib/phase1/property-types';

export function PropertyTypePicker({
  category,
  subtype,
  onChange,
  label = 'Property type',
  required,
  error,
}: {
  category: PropertyCategory;
  subtype?: string;
  onChange: (category: PropertyCategory, subtype: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pane, setPane] = useState<PropertyCategory>(category);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const chosen = categoryOf(pane) ?? PROPERTY_CATEGORIES[0];
  const summary = subtype
    ? propertyTypeLabel({ propertyType: chosen.label, propertySubtype: subtype, propertyCategory: category })
    : 'Choose a property type';

  return (
    <div ref={root} className="relative">
      <div className="mb-1.5 text-[13.5px] font-medium text-p1-text">
        {label}{required && <span className="ml-0.5 text-p1-danger" aria-hidden>*</span>}
      </div>

      <button
        type="button"
        onClick={() => { setPane(category); setOpen((v) => !v); }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={error ? 'property-type-error' : undefined}
        className={cx(
          'p1-field flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border bg-p1-surface px-3.5 text-left text-[14px] transition-[border-color,box-shadow]',
          error ? 'border-p1-danger' : 'border-p1-border-strong hover:border-p1-text-3/60',
          subtype ? 'text-p1-text' : 'text-p1-text-3',
        )}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown size={16} className={cx('shrink-0 text-p1-text-3 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {error && <p id="property-type-error" role="alert" className="mt-1.5 text-[13px] text-p1-danger">{error}</p>}

      {open && (
        <div
          role="dialog"
          aria-label="Property type"
          className="p1-panel absolute left-0 top-full z-50 mt-2 flex w-full min-w-[320px] max-w-[640px] overflow-hidden rounded-xl border border-p1-border bg-p1-elevated shadow-p1-lg sm:w-[min(640px,90vw)]"
        >
          {/* categories */}
          <div className="w-[136px] shrink-0 overflow-y-auto border-r border-p1-border bg-p1-bg py-2" style={{ maxHeight: 340 }}>
            {SECTORS.map((sector) => (
              <div key={sector} className="mb-1">
                <div className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-p1-text-3">{sector}</div>
                {categoriesIn(sector).map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setPane(c.key)}
                    className={cx(
                      'mx-2 mb-1 flex w-[calc(100%-16px)] cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left text-[13.5px] font-medium',
                      pane === c.key ? 'bg-p1-primary-soft text-p1-primary' : 'text-p1-text-2 hover:bg-p1-subtle hover:text-p1-text',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* subtypes of the category being looked at */}
          <div className="min-w-0 flex-1 overflow-y-auto p-3" style={{ maxHeight: 340 }}>
            {chosen.groups.map((group, gi) => (
              <div key={group.label ?? gi} className={cx(gi > 0 && 'mt-3')}>
                {group.label && (
                  <div className="mb-1.5 border-b border-p1-border pb-1 text-[11.5px] font-semibold text-p1-text-2">{group.label}</div>
                )}
                <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
                  {group.items.map((item) => {
                    const on = pane === category && subtype === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => { onChange(pane, item); setOpen(false); }}
                        className={cx(
                          'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13.5px]',
                          on ? 'font-medium text-p1-primary' : 'text-p1-text hover:bg-p1-subtle',
                        )}
                      >
                        <span
                          aria-hidden
                          className={cx(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                            on ? 'border-p1-primary bg-p1-primary text-p1-primary-on' : 'border-p1-border-strong',
                          )}
                        >
                          {on && <Check size={10} strokeWidth={3} />}
                        </span>
                        <span className="truncate">{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
