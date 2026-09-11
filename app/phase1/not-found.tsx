/**
 * A wrong address inside the agent platform.
 *
 * Without this, Next falls back to the application-wide 404, which renders in
 * the marketing site's chrome — a different header, a different navigation, and
 * no sign that the agent is still signed in. It also hydrates badly there,
 * because that shell reads the browser before React has caught up.
 *
 * Keeping a not-found inside this segment means a mistyped URL stays in the
 * product: same shell, same sidebar, and a way back to work.
 */

import { Compass } from 'lucide-react';
import { EmptyState, LinkButton } from '../../components/phase1/kit';

export default function Phase1NotFound() {
  return (
    <div className="rounded-xl border border-p1-border bg-p1-surface">
      <EmptyState
        icon={<Compass size={24} />}
        title="That page isn't here"
        description={
          'The address may have changed, or the link that brought you here is out of date. '
          + 'Everything else is where you left it.'
        }
        action={
          <>
            <LinkButton href="/phase1/dashboard">Back to dashboard</LinkButton>
            <LinkButton href="/phase1/listings" variant="outline">My listings</LinkButton>
          </>
        }
      />
    </div>
  );
}
