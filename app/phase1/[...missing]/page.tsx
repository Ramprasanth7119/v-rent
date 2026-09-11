/**
 * Any address under /phase1 that matches no real page.
 *
 * A segment's `not-found` only fires when something inside it calls
 * `notFound()`; an address that matches no route at all falls through to the
 * application-wide 404 instead, which renders in the marketing site's chrome.
 * This catch-all sits below every real route, so a mistyped URL lands on
 * `app/phase1/not-found.tsx` and stays inside the product.
 */

import { notFound } from 'next/navigation';

export default function Missing() {
  notFound();
}
