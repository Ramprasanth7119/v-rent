import { notFound } from 'next/navigation';
import { currentUser } from '../../../lib/auth/session';

/**
 * The operations console.
 *
 * This is the authorisation boundary for everything under `/phase1/admin`:
 * verification queues, moderation, the agent directory, subscriptions and the
 * audit trail. An agent who types the URL gets the same not-found page as a
 * stranger — the console is not advertised to people who cannot use it, and no
 * admin data is fetched before the role is known.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user || user.role !== 'admin') notFound();
  return <>{children}</>;
}
