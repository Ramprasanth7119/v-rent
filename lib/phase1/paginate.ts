/**
 * Page breaks for the printed shortlist.
 *
 * Every printed sheet is a fixed A4 page, so content that does not fit is not
 * pushed onto the next page by the browser: it is cut off. The document is
 * therefore laid out as a flow of blocks — a heading with its paragraph, a
 * table with its header, a photograph with its facts — whose heights are
 * measured in the browser, and this decides which blocks share a page.
 *
 * The rules are the ones a typesetter would use:
 *  - a block is never split, so a table header stays with its rows and an
 *    image stays with its caption (long tables are split into blocks by the
 *    caller, each repeating its header);
 *  - `keepWithNext` holds a heading on the page of the block after it;
 *  - `breakBefore` starts a new page, and so does a change of orientation;
 *  - a block taller than a page gets a page of its own and is reported, so the
 *    overflow is visible instead of silently cut.
 *
 * Pure: heights in, pages out.
 */

export type Orientation = 'portrait' | 'landscape';

export interface FlowItem {
  height: number;
  orientation: Orientation;
  breakBefore?: boolean;
  keepWithNext?: boolean;
}

export interface PackedPage {
  orientation: Orientation;
  /** Indexes into the items, in order. */
  items: number[];
  /** Content height used, gaps included. */
  used: number;
  /** True when a single block is taller than the page. */
  overflow: boolean;
}

export function packPages(items: FlowItem[], capacity: Record<Orientation, number>, gap = 20): PackedPage[] {
  const pages: PackedPage[] = [];
  let page: PackedPage | null = null;

  /* A block and every keep-with-next block before it travel together. */
  const groups: number[][] = [];
  let run: number[] = [];
  items.forEach((item, i) => {
    const startsFresh = item.breakBefore || (run.length > 0 && items[run[0]].orientation !== item.orientation);
    if (startsFresh && run.length) { groups.push(run); run = []; }
    run.push(i);
    if (!item.keepWithNext) { groups.push(run); run = []; }
  });
  if (run.length) groups.push(run);

  const heightOf = (group: number[]) => group.reduce((sum, i, k) => sum + items[i].height + (k ? gap : 0), 0);

  for (const group of groups) {
    const first = items[group[0]];
    const h = heightOf(group);
    const cap = capacity[first.orientation];
    const fits = page !== null
      && page.orientation === first.orientation
      && !first.breakBefore
      && page.used + gap + h <= cap;
    if (fits && page) {
      page.items.push(...group);
      page.used += gap + h;
    } else {
      page = { orientation: first.orientation, items: [...group], used: h, overflow: h > cap };
      pages.push(page);
    }
  }
  return pages;
}

/** Splits rows into runs for tables that repeat their header on every page. */
export function chunk<T>(rows: T[], first: number, rest = first): T[][] {
  if (rows.length === 0) return [];
  const out: T[][] = [rows.slice(0, first)];
  for (let k = first; k < rows.length; k += rest) out.push(rows.slice(k, k + rest));
  return out;
}
