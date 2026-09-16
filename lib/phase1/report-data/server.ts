/**
 * The Demo Data switch, as a server component reads it.
 *
 * The browser keeps the switch in a session cookie (`switch.ts`); pages that
 * read their data on the server — the operations console — read the same
 * cookie here, so both halves of a page agree on which data it shows.
 *
 * Server only.
 */

import { cookies } from 'next/headers';
import { DEMO_DATA_COOKIE } from './index';

export async function demoDataOnServer(): Promise<boolean> {
  return (await cookies()).get(DEMO_DATA_COOKIE)?.value === 'on';
}
