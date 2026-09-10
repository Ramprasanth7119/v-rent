/**
 * Reports and audit. A server component so the audit file is read on the
 * server; the view itself is a client component for its filters.
 */

import { readAudit } from '../../../../lib/phase1/audit';
import ReportsView from './ReportsView';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  return <ReportsView auditRows={await readAudit()} />;
}
