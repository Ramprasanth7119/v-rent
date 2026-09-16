/**
 * The application's data providers, and the one switch between them.
 *
 * The switch is labelled "Demo Data" and means what it says:
 *   ON  → the demo account and illustrative figures (`demoDataProvider`)
 *   OFF → the signed-in agent's own records (`originalDataProvider`)
 *
 * The value itself is held in `switch.ts`; the header carries the only control.
 */

import { demoDataProvider } from './demo';
import { originalDataProvider } from './original';
import type { ReportDataProvider } from './types';

export type { Around, EnquirySet, ReportDataMode, ReportDataProvider } from './types';
export { DEMO_ENQUIRY_COUNT } from './demo-enquiries';
export { originalDataProvider } from './original';
export { DEMO_ID_PREFIX, DEMO_NOTICE, demoDataProvider } from './demo';

export { demoWorkspace, isDemoId } from './demo-workspace';

export const DEMO_DATA_PARAM = 'demo';
/** Session cookie holding the switch, so the server renders in the same mode as the browser. */
export const DEMO_DATA_COOKIE = 'vrent_demo_data';
/** The two states, as the switch's tooltip says them. */
export const DEMO_DATA_TOOLTIP_ON = 'ON: showing demo data. Changes you make here are not saved.';
/** OFF names where the live data comes from — MongoDB on a deployment, files on a laptop without one. */
export const demoDataTooltipOff = (backend: 'mongodb' | 'files') =>
  backend === 'mongodb' ? 'OFF: showing live data from MongoDB.' : 'OFF: showing live data from this server.';
/** Both states, for a reader that needs the whole explanation at once. */
export const DEMO_DATA_TOOLTIP = 'On shows sample data and nothing you change is saved. Off shows your live data.';

/**
 * Said when an action would change a live record while Demo Data is ON. Demo
 * mode never writes to the store, so the action is held back rather than sent.
 */
export const DEMO_LIVE_ACTION_BLOCKED = {
  tone: 'info' as const,
  title: 'Demo data is on',
  body: 'Nothing was changed. Turn Demo data off in the header to act on live records.',
};

export function providerFor(demoDataOn: boolean): ReportDataProvider {
  return demoDataOn ? demoDataProvider : originalDataProvider;
}

export function isDemoDataOn(params: { get(name: string): string | null }): boolean {
  return params.get(DEMO_DATA_PARAM) === 'on';
}

/** The query string with the switch set, everything else kept. */
export function withDemoData(search: string, on: boolean): string {
  const q = new URLSearchParams(search);
  if (on) q.set(DEMO_DATA_PARAM, 'on');
  else q.delete(DEMO_DATA_PARAM);
  return q.toString();
}
