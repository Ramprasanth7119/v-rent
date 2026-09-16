/**
 * The operations overview.
 *
 * A server component, because every figure on it is derived from stores that
 * only the server can read: the account file, each agent's workspace, the audit
 * trail and the request log. The client half does the drawing and nothing else.
 */

import { opsSnapshot } from '../../../lib/phase1/admin-insight';
import { demoDataOnServer } from '../../../lib/phase1/report-data/server';
import OverviewView from './OverviewView';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  return <OverviewView snapshot={await opsSnapshot({ demo: await demoDataOnServer() })} />;
}
