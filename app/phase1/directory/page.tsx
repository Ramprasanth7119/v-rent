/**
 * Every property on the platform, as an agent sees it.
 *
 * A server component because the listings come from every agent's workspace,
 * which only the server may read. What is handed to the browser is the same
 * tenant-safe projection the public site gets — so one agent cannot learn
 * another's unit numbers by opening this page.
 */

import { currentUser } from '../../../lib/auth/session';
import { marketListings } from '../../../lib/phase1/marketplace';
import { readWorkspace } from '../../../lib/phase1/workspace-store';
import { viewCounts } from '../../../lib/phase1/views';
import DirectoryView from './DirectoryView';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Property directory — V-RENT',
};

export default async function DirectoryPage() {
  const [user, listings] = await Promise.all([currentUser(), marketListings()]);

  /* How many agents have opened each of this agent's own listings, so the
     count can sit on their own cards. Read here because it comes from their
     workspace, which the browser never sees. */
  const workspace = user ? await readWorkspace(user.id) : null;
  const counts = workspace ? viewCounts(workspace.views) : {};

  return <DirectoryView items={listings} viewerId={user?.id ?? null} viewCounts={counts} />;
}
