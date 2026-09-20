/**
 * The printed property directory.
 *
 * A server component for the same reason the directory is: the listings come
 * from every agent's workspace. What reaches the browser is the tenant-safe
 * projection, so printing cannot reveal anything browsing would not.
 *
 * `mine` is resolved here rather than in the document, because it is the one
 * part of the query that depends on who is asking.
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { currentUser } from '../../../../lib/auth/session';
import { marketListings } from '../../../../lib/phase1/marketplace';
import { readWorkspace } from '../../../../lib/phase1/workspace-store';
import { preferredName } from '../../../../lib/phase1/workspace';
import DirectoryReport from './DirectoryReport';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Property directory — V-RENT',
};

export default async function DirectoryExportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  if (!user) redirect('/phase1/login');

  const [listings, workspace, params] = await Promise.all([
    marketListings(),
    readWorkspace(user.id),
    searchParams,
  ]);

  const mineOnly = params.mine === 'true';
  const items = mineOnly ? listings.filter((m) => m.ownerId === user.id) : listings;

  const profile = workspace?.profile;
  const name = preferredName(profile?.fullName || user.fullName);
  const agency = profile?.agency ?? '';
  const cea = profile?.ceaNumber ?? user.cea?.registrationNo ?? '';

  return (
    <Suspense fallback={null}>
      <DirectoryReport
        items={items}
        preparedBy={name}
        agentLine={[name, agency, cea && `CEA ${cea}`].filter(Boolean).join(' · ')}
      />
    </Suspense>
  );
}
