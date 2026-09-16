/**
 * One agent in the operations console. Resolved on the server so a real
 * account's record and its workspace are read there, and a link to an id that
 * no longer exists lands on a page that says so.
 */

import { PageHeader, Card, EmptyState, LinkButton } from '../../../../../components/phase1/kit';
import { agentDetail } from '../../../../../lib/phase1/admin-directory';
import { demoDataOnServer } from '../../../../../lib/phase1/report-data/server';
import AgentDetail from './AgentDetail';

export const dynamic = 'force-dynamic';

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await agentDetail(id, { demo: await demoDataOnServer() });

  if (!found) {
    return (
      <>
        <PageHeader eyebrow="Administration" title="Agent not found" />
        <Card>
          <EmptyState
            title="No agent with that reference"
            description="The account may have been removed, or the link is out of date."
            action={<LinkButton href="/phase1/admin/agents" variant="outline">Back to agents</LinkButton>}
          />
        </Card>
      </>
    );
  }

  return <AgentDetail agent={found.agent} listings={found.listings} />;
}
