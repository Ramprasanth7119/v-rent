/**
 * Moderation queue. Server component: the queue is assembled from every
 * agent's stored workspace, which is data no browser should be handed.
 */

import { moderationQueue } from '../../../../lib/phase1/admin-moderation';
import ModerationQueue from './ModerationQueue';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  return <ModerationQueue items={await moderationQueue()} />;
}
