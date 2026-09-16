/**
 * The enquiries waiting on the agent.
 *
 * Its own screen now: it used to be a tab of /phase1/performance, which put a
 * page of traffic figures between the agent and the people waiting for a reply.
 */

import { Suspense } from 'react';
import EnquiriesView from './EnquiriesView';
import Loading from './loading';

export default function EnquiriesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EnquiriesView />
    </Suspense>
  );
}
