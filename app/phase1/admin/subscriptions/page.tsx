/**
 * Subscriptions. A server component, so the accounts are read on the server
 * and joined with each agent's own plan and standing.
 */

import { realSubscriptions } from '../../../../lib/phase1/admin-subscriptions';
import SubscriptionsView from './SubscriptionsView';

export const dynamic = 'force-dynamic';

export default async function SubscriptionsPage() {
  return <SubscriptionsView subscriptions={await realSubscriptions()} />;
}
