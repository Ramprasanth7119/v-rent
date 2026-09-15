/**
 * The property report's data switch.
 *
 * The toolbar switch is labelled "Demo Data":
 *   ON  → the property's original data (`originalDataProvider`)
 *   OFF → illustrative demo data (`demoDataProvider`)
 *
 * It is on unless the address carries `demo=off`, so a report link opens with
 * the original data unless it was deliberately shared in demo mode.
 */

import { demoDataProvider } from './demo';
import { originalDataProvider } from './original';
import type { ReportDataProvider } from './types';

export type { Around, ReportDataMode, ReportDataProvider } from './types';
export { originalDataProvider } from './original';
export { DEMO_ID_PREFIX, DEMO_NOTICE, demoDataProvider } from './demo';

export const DEMO_DATA_PARAM = 'demo';
export const DEMO_DATA_TOOLTIP = "ON uses the property's original data. OFF uses illustrative demo data for visualization.";

export function providerFor(demoDataOn: boolean): ReportDataProvider {
  return demoDataOn ? originalDataProvider : demoDataProvider;
}

export function isDemoDataOn(params: { get(name: string): string | null }): boolean {
  return params.get(DEMO_DATA_PARAM) !== 'off';
}

/** The query string with the switch set, everything else kept. */
export function withDemoData(search: string, on: boolean): string {
  const q = new URLSearchParams(search);
  if (on) q.delete(DEMO_DATA_PARAM);
  else q.set(DEMO_DATA_PARAM, 'off');
  return q.toString();
}
