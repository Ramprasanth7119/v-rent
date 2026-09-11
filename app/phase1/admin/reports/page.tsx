/**
 * Reports and audit. A server component so the audit file, the request log and
 * every agent's workspace are read on the server; the view is a client
 * component for its filters and charts.
 */

import { opsSnapshot } from '../../../../lib/phase1/admin-insight';
import ReportsView from './ReportsView';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  return <ReportsView snapshot={await opsSnapshot()} now={new Date().toISOString()} />;
}
