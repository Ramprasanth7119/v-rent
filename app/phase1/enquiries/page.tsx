/**
 * The enquiries waiting for a reply.
 *
 * The same view as /phase1/performance, opened on its enquiries tab. It has its
 * own address because the sidebar offers it as its own errand — previously both
 * entries pointed at the same URL, so whichever you clicked the other one lit
 * up too and "Enquiries" looked like it had taken you to the wrong screen.
 */

import PerformanceView from '../performance/PerformanceView';

export default function EnquiriesPage() {
  return <PerformanceView initialTab="enquiries" />;
}
