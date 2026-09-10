/**
 * Verification queue. A server component: it reads the account store and
 * re-checks each application against the CEA register before rendering.
 */

import { pendingApplications } from '../../../../lib/phase1/admin-verification';
import { verificationPolicy } from '../../../../lib/phase1/verification-policy';
import VerificationQueue from './VerificationQueue';

export const dynamic = 'force-dynamic';

export default async function VerificationPage() {
  const [applications, policy] = await Promise.all([pendingApplications(), verificationPolicy()]);
  return <VerificationQueue applications={applications} policy={policy} />;
}
