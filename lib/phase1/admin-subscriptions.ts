/**
 * What each agent is paying, from their own record.
 *
 * The plan, the standing and the payment method all live on the agent's
 * workspace, so this is a join rather than a table of its own — and it stays
 * right when an agent changes plan, because there is nowhere else for it to
 * drift out of step with.
 *
 * Server only: it reads the account store.
 */

import { listAccounts } from '../auth/store';
import { readWorkspace } from './workspace-store';
import { SubscriptionRow } from './data';
import { planByCode, preferredName } from './workspace';

export interface SubscriptionEntry extends SubscriptionRow {
  accountId: string;
  /** True for an account on this instance rather than sample data. */
  real: boolean;
  email: string;
}

/** A year from the day they subscribed, which is how the plans are sold. */
function renewalFrom(createdAt: string): string {
  const start = new Date(createdAt);
  if (Number.isNaN(start.getTime())) return '';
  start.setFullYear(start.getFullYear() + 1);
  return start.toISOString().slice(0, 10);
}

export async function realSubscriptions(): Promise<SubscriptionEntry[]> {
  const accounts = (await listAccounts()).filter((a) => a.role === 'agent');

  const rows = await Promise.all(
    accounts.map(async (a): Promise<SubscriptionEntry | null> => {
      const w = await readWorkspace(a.id);
      const plan = planByCode(w?.planCode ?? null);
      // No plan is not a subscription. An agent who has not chosen one belongs
      // in the directory, not in a billing list.
      if (!w || !plan || w.subscription === 'none') return null;

      return {
        accountId: a.id,
        real: true,
        email: a.email,
        agent: preferredName(w.profile.fullName || a.fullName),
        plan: plan.name,
        status: w.subscription,
        method: w.paymentMethod === 'Card' ? 'Card' : 'PayNow',
        renewsOn: renewalFrom(a.createdAt),
        amountSgd: plan.priceYearSgd,
      };
    }),
  );

  return rows.filter((r): r is SubscriptionEntry => r !== null);
}
