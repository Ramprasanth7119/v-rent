"use client";

/**
 * The mobile number field.
 *
 * One control, used everywhere a Singapore mobile number is asked for, because
 * a number typed into four differently-behaved boxes is four different sets of
 * complaints. The rules it enforces are the ones in `lib/phase1/mobile.ts` —
 * the same module the routes validate against — so a number this field accepts
 * cannot be refused by the server that stores it.
 *
 * The code is drawn, not typed. V-RENT is a Singapore product: the agents are
 * CEA-registered, the tenants are renting here, and a number from anywhere else
 * is refused on the way in. A country menu with one country in it is a menu
 * that wastes a tap and implies a choice that does not exist, so `+65` sits
 * beside the box as a fixed part of the field. What the agent types is the
 * eight digits that are actually theirs.
 *
 * Two things this fixes that a plain text input got wrong:
 *
 *   - `+65 9123 4567` had to be typed in full, or typed without the code and
 *     silently tidied on blur, so the field never looked the same while it was
 *     being filled in as it did afterwards;
 *   - a number pasted from a name card arrived with its code, its spaces and
 *     sometimes its brackets, and landed in the box as typed.
 *
 * Both are handled here: the code is stripped off anything pasted, everything
 * that is not a digit is dropped, and the digits group themselves 4-4 as they
 * are typed — which is how a person checks they have typed eight and not seven.
 */

import React, { useId, useLayoutEffect, useRef } from 'react';
import { cx } from './primitives';
import { FormField } from './form';
import {
  SG_DIAL_CODE, SG_SUBSCRIBER_DIGITS, groupSgMobile, sgSubscriberDigits,
} from '../../../lib/phase1/mobile';

/**
 * The flag, drawn rather than set in emoji.
 *
 * Windows ships no flag glyphs, so `🇸🇬` renders there as the letters SG in two
 * boxes — on the one control that is meant to look considered. Eleven elements
 * of SVG always look the same. The five stars are circles: at fourteen pixels
 * a five-pointed star is four grey pixels, and a circle reads as the thing the
 * flag has where a star would be.
 */
function SingaporeFlag() {
  return (
    <svg viewBox="0 0 30 20" width="21" height="14" aria-hidden className="shrink-0 rounded-[2px] ring-1 ring-black/10 dark:ring-white/15">
      <rect width="30" height="10" fill="#ED2939" />
      <rect y="10" width="30" height="10" fill="#fff" />
      {/* Crescent: a white disc with a red one laid over its right-hand side. */}
      <circle cx="7.4" cy="5" r="3.9" fill="#fff" />
      <circle cx="9.5" cy="5" r="3.9" fill="#ED2939" />
      {[
        [12.4, 2.6], [14.9, 4.4], [17.4, 2.6], [13.4, 6.9], [16.4, 6.9],
      ].map(([cx1, cy1]) => (
        <circle key={`${cx1}-${cy1}`} cx={cx1} cy={cy1} r="0.85" fill="#fff" />
      ))}
    </svg>
  );
}

export function PhoneNumberInput({
  label = 'Mobile number',
  value,
  onChange,
  hint,
  error,
  required,
  optional,
  help,
  id,
  disabled,
  autoFocus,
  onBlur,
  className = '',
  containerClassName,
  name,
}: {
  label?: string;
  /** Whatever is stored, in any shape. Only the digits in it are used. */
  value: string;
  /**
   * The number as it should be stored: `+65 9123 4567` once eight digits are
   * there, the bare digits until then.
   *
   * Emitting the bare digits rather than a half-finished `+65 912` is what lets
   * the existing checks keep working unchanged — `sgMobileProblem` counts the
   * digits it is given and says "8 digits" about a short one, which is the
   * message the agent needs while they are still typing.
   */
  onChange: (next: string) => void;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  help?: string;
  id?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  className?: string;
  containerClassName?: string;
  name?: string;
}) {
  const codeId = useId();
  const digits = sgSubscriberDigits(value);

  const box = useRef<HTMLInputElement>(null);
  /* Where to put the caret once the reformatted value has been painted. */
  const caret = useRef<number | null>(null);

  /**
   * Put the caret back.
   *
   * The field shows a grouped number but holds ungrouped digits, so every
   * keystroke replaces the whole string — and a replaced string puts the caret
   * at the end. Correcting the second digit of a number would throw the caret
   * past the eighth. The position is counted in digits, which the space does
   * not move, and restored before the browser paints so nothing is seen to jump.
   */
  useLayoutEffect(() => {
    if (caret.current === null || !box.current) return;
    const at = caret.current;
    caret.current = null;
    box.current.setSelectionRange(at, at);
  });

  const emit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const typed = e.target.value;
    const digitsBefore = typed.slice(0, e.target.selectionStart ?? typed.length).replace(/[^0-9]/g, '').length;

    const next = sgSubscriberDigits(typed);
    /* One space, after the fourth digit, so anything past it sits one further on. */
    caret.current = Math.min(digitsBefore + (digitsBefore > 4 ? 1 : 0), groupSgMobile(next).length);

    onChange(next.length === SG_SUBSCRIBER_DIGITS ? `${SG_DIAL_CODE} ${groupSgMobile(next)}` : next);
  };

  return (
    <FormField
      label={label} hint={hint} error={error} required={required} optional={optional} help={help}
      id={id} className={containerClassName}
    >
      {(fid, by) => (
        <div
          className={cx(
            /* The ring is on the group, not the box, so the code and the digits
               light up as the one field they are. */
            'p1-field flex w-full items-stretch overflow-hidden rounded-lg border bg-p1-surface transition-[border-color,box-shadow] duration-150',
            'focus-within:shadow-[0_0_0_3px_var(--p1-ring)]',
            error
              ? 'border-p1-danger focus-within:border-p1-danger focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--p1-danger)_22%,transparent)]'
              : 'border-p1-border-strong hover:border-p1-text-3/60 focus-within:border-p1-primary',
            disabled && 'cursor-not-allowed bg-p1-subtle opacity-70',
            className,
          )}
        >
          {/* Not a button and not a select: there is nothing here to choose. */}
          <span
            id={codeId}
            className="flex h-11 shrink-0 items-center gap-2 border-r border-p1-border bg-p1-subtle/70 pl-3 pr-2.5 text-[14px] font-medium tabular-nums text-p1-text-2"
          >
            <SingaporeFlag />
            {SG_DIAL_CODE}
            <span className="sr-only">Singapore. Singapore numbers only.</span>
          </span>

          <input
            id={fid}
            ref={box}
            name={name}
            type="tel"
            /* `numeric` rather than `tel`: the code is not the agent's to type,
               so the keypad does not need the * and # a telephone pad carries. */
            inputMode="numeric"
            autoComplete="tel-national"
            /* Eight digits and the one space between them. */
            maxLength={SG_SUBSCRIBER_DIGITS + 1}
            disabled={disabled}
            autoFocus={autoFocus}
            aria-describedby={[by, codeId].filter(Boolean).join(' ') || undefined}
            aria-invalid={!!error || undefined}
            aria-required={required || undefined}
            placeholder="9123 4567"
            value={groupSgMobile(digits)}
            onChange={emit}
            onBlur={onBlur}
            className="h-11 w-full min-w-0 bg-transparent px-3.5 text-[14px] tabular-nums tracking-[0.01em] text-p1-text placeholder:tracking-normal placeholder:text-p1-text-3 focus:outline-none disabled:cursor-not-allowed"
          />
        </div>
      )}
    </FormField>
  );
}
