"use client";

/**
 * Dashboard-local pieces.
 *
 * `IconTile`, `Delta`, `SectionHead` and `CardHead` began here and were
 * promoted into the shared kit once Listings, Enquiries, Viewings and the
 * admin queues wanted the same four. They are re-exported rather than moved so
 * the panels in this folder keep importing from one place — and so there is
 * exactly one definition of each, which was the point of promoting them.
 */

export { IconTile, Delta, SectionHead, CardHead } from '../kit';
export type { TileTone } from '../kit';
