/**
 * Agent directory. A server component so the account store is read on the
 * server and never reaches a browser that has no business with it; the table
 * itself is a client component fed with the joined result.
 *
 * Authorisation is the admin layout's job — it calls `notFound()` for anyone
 * who is not staff before this renders.
 */

import { agentDirectory } from '../../../../lib/phase1/admin-directory';
import AgentsTable from './AgentsTable';

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  return <AgentsTable agents={await agentDirectory()} />;
}
