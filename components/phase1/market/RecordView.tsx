"use client";

/**
 * Notes, in this browser only, that this home was opened.
 *
 * Renders nothing. It exists so the saved page can offer "recently viewed"
 * without an account: the record is a key in local storage on the visitor's
 * own device, it is never sent anywhere, and a browser that blocks storage
 * simply does not remember.
 */

import { useEffect } from 'react';
import { rememberViewed, savedKey } from './saved';

export function RecordView({ ownerId, listingId }: { ownerId: string; listingId: string }) {
  useEffect(() => { rememberViewed(savedKey(ownerId, listingId)); }, [ownerId, listingId]);
  return null;
}
