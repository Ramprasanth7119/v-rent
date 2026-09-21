"use client";

/**
 * A list of facilities that opens rather than arriving open.
 *
 * A development with a pool, a gym, a tennis court, a function room, two BBQ
 * pits, covered parking and twenty-four hour security is a good development and
 * a bad wall of text: on a phone those eight lines push the price, the agent
 * and the enquiry button off the screen, and the eighth is read by nobody. So
 * the first couple are shown and the rest are one tap away, with the count on
 * the button so the tap is an informed one — "Show all 8" says there is
 * something behind it, where a bare "More" does not.
 *
 * Two is the opening number because it is enough to establish what kind of list
 * this is without becoming the list.
 *
 * The items that are not shown are not rendered at all rather than hidden with
 * CSS. A screen reader should find what is on the screen and nothing else, and
 * the button that reveals the rest says how many there are.
 */

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../kit';

export function FacilityList({
  items,
  renderItem,
  initial = 2,
  className = '',
  listClassName = '',
  noun = 'items',
}: {
  items: string[];
  renderItem: (item: string) => ReactNode;
  /** How many to show before the button. */
  initial?: number;
  className?: string;
  /** The wrapper the items sit in — a chip row on one screen, a grid on another. */
  listClassName?: string;
  /** For the button's accessible name: "Show all 8 amenities". */
  noun?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const hidden = items.length - initial;
  const shown = open ? items : items.slice(0, initial);

  return (
    <div className={className}>
      <div id={id} className={listClassName}>
        {shown.map((item) => renderItem(item))}
      </div>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          aria-label={open ? `Show fewer ${noun}` : `Show all ${items.length} ${noun}`}
          className="mt-2.5 inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-md text-[13px] font-medium text-p1-primary underline-offset-4 hover:underline"
        >
          {open ? 'Show fewer' : `Show all ${items.length}`}
          <ChevronDown size={14} aria-hidden className={cx('transition-transform duration-200', open && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}
