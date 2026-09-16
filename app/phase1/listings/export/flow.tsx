"use client";

/**
 * A document laid out as a flow of blocks, broken into A4 sheets by measuring
 * rather than guessing.
 *
 * Each block is rendered once in an invisible frame the exact size of a
 * printed page body, its height is read, and `packPages` decides which blocks
 * share a sheet. The sheets are then rendered with those blocks, so a long
 * property name, a missing photograph or a longer analysis moves the next block
 * to the next page instead of being cut off at the bottom of this one.
 *
 * After the sheets render, each is checked once more: a sheet whose content is
 * still taller than the page is reported to the caller, which shows it in the
 * toolbar. The check only runs where the sheet on screen is the printed size.
 *
 * The sheets are rendered straight into the caller's `.vr-doc` article, after
 * the measuring frame, so the print rules that address the article's sheets
 * apply to them unchanged.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { packPages, type Orientation, type PackedPage } from '../../../../lib/phase1/paginate';
import { Sheet, type FrameProps } from './ui';

export interface Block {
  key: string;
  /** Running header of the sheet this block starts. */
  section: string;
  node: React.ReactNode;
  landscape?: boolean;
  breakBefore?: boolean;
  keepWithNext?: boolean;
}

export interface FlowLayout {
  pages: number;
  /** Page numbers whose content is taller than the sheet. */
  overflow: number[];
}

/** Space between blocks on a sheet, in CSS pixels. */
export const FLOW_GAP = 18;

const orientationOf = (b: Block): Orientation => (b.landscape ? 'landscape' : 'portrait');

export function FlowDocument({ blocks, frame, onLayout }: {
  blocks: Block[];
  frame: Omit<FrameProps, 'n' | 'total' | 'section'>;
  onLayout?: (layout: FlowLayout) => void;
}) {
  const probe = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PackedPage[] | null>(null);
  const [, setFonts] = useState(0);

  /* Web fonts change every height; measure again once they are in. */
  useEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => { if (live) setFonts((n) => n + 1); });
    return () => { live = false; };
  }, []);

  /* Measure on every render and keep the result only when it changed, so data
     arriving late re-paginates and an unchanged document does not loop. */
  useLayoutEffect(() => {
    const root = probe.current;
    if (!root) return;
    const capacity = (o: Orientation) => {
      const body = root.querySelector<HTMLElement>(`[data-probe="${o}"] [data-sheet-body]`);
      if (!body) return 0;
      const pad = parseFloat(getComputedStyle(body).paddingTop) || 0;
      return body.clientHeight - pad;
    };
    const heights = blocks.map((b) => root.querySelector<HTMLElement>(`[data-measure="${CSS.escape(b.key)}"]`)?.offsetHeight ?? 0);
    const next = packPages(
      blocks.map((b, i) => ({ height: heights[i], orientation: orientationOf(b), breakBefore: b.breakBefore, keepWithNext: b.keepWithNext })),
      { portrait: capacity('portrait'), landscape: capacity('landscape') },
      FLOW_GAP,
    );
    const sig = (ps: PackedPage[] | null) => JSON.stringify(ps?.map((p) => [p.orientation, p.items, p.overflow]));
    if (sig(next) !== sig(pages)) setPages(next);
  }, [blocks, pages]);

  /* The sheets as rendered: anything still taller than its page is reported. */
  useEffect(() => {
    const article = probe.current?.parentElement;
    if (!pages || !article) return;
    const fixed = window.matchMedia('(min-width: 860px)').matches;
    const bodies = Array.from(article.querySelectorAll<HTMLElement>(':scope > .vr-page [data-sheet-body]'));
    const overflow = bodies
      .map((b, i) => ((fixed && b.scrollHeight > b.clientHeight + 1) || pages[i]?.overflow ? i + 1 : 0))
      .filter(Boolean);
    onLayout?.({ pages: pages.length, overflow });
  });

  const hasLandscape = blocks.some((b) => b.landscape);
  const measureSheet = (o: Orientation) => (
    <Sheet n={0} total={0} section="" {...frame} landscape={o === 'landscape'}>
      {blocks.filter((b) => orientationOf(b) === o).map((b) => (
        <div key={b.key} data-measure={b.key} style={{ display: 'flow-root' }}>{b.node}</div>
      ))}
    </Sheet>
  );

  return (
    <>
      <div ref={probe} className="vr-probe" aria-hidden>
        <div data-probe="portrait">{measureSheet('portrait')}</div>
        {hasLandscape && <div data-probe="landscape">{measureSheet('landscape')}</div>}
      </div>
      {pages?.map((page, k) => (
        <Sheet key={`${k}-${blocks[page.items[0]].key}`} n={k + 1} total={pages.length} section={blocks[page.items[0]].section}
          {...frame} landscape={page.orientation === 'landscape'} overflow={page.overflow}>
          <div className="grid grid-cols-[minmax(0,1fr)]" style={{ rowGap: FLOW_GAP }}>
            {page.items.map((i) => (
              <div key={blocks[i].key} style={{ display: 'flow-root' }}>{blocks[i].node}</div>
            ))}
          </div>
        </Sheet>
      ))}
    </>
  );
}
