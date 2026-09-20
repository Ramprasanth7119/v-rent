"use client";

/**
 * Tells the server that this listing was opened.
 *
 * A component rather than something the page does while rendering, because
 * rendering happens for reasons that are not a person looking: a prefetch, a
 * metadata request, a crawler. Mounting in a browser is the closest thing to
 * somebody actually opening the page.
 *
 * It draws nothing, it is never awaited, and a failure is silence. Nothing on
 * this page depends on the beacon, and a page that broke because a count could
 * not be written would be a poor trade for a count.
 *
 * Who is counted is decided on the server — an agent, never the owner, never a
 * tenant. This end knows only which listing it is looking at.
 */

import { useEffect } from 'react';

export function ViewBeacon({ ownerId, listingId }: { ownerId: string; listingId: string }) {
  useEffect(() => {
    /* `keepalive` so the request survives the tab being closed straight after,
       which is exactly what a quick look is. */
    void fetch('/api/phase1/views', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ownerId, listingId }),
      keepalive: true,
    }).catch(() => {});
  }, [ownerId, listingId]);

  return null;
}
