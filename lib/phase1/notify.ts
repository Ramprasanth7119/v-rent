/**
 * Telling an agent something happened.
 *
 * Two channels, one decision. Every notice is written to the agent's own record
 * so it appears in the bell whether or not mail is working; the email is sent
 * as well when the agent has asked for that event by email.
 *
 * Some notices are not optional. A rejected listing and a lapsed registration
 * stop the agent advertising, and an agent who has turned those off has turned
 * off the thing that tells them why their livelihood stopped. The settings
 * screen says so rather than offering a switch that quietly does nothing.
 *
 * Server only.
 */

import { randomUUID } from 'node:crypto';
import type { PublicAccount } from '../auth/store';
import { loadWorkspace, patchWorkspace } from './workspace-store';
import { send } from '../mail';
import { preferredName } from './workspace';

/** Which preference row an event answers to. */
export type AlertKind = 'enquiry' | 'views' | 'moderation' | 'expiry' | 'cea' | 'billing' | 'product';

export interface Alert {
  id: string;
  at: string;
  kind: AlertKind;
  title: string;
  body: string;
  /** Where to go to do something about it. */
  href?: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
  read: boolean;
}

/** Notices that are sent whatever the preferences say. */
const ALWAYS_EMAIL: AlertKind[] = ['moderation', 'cea'];

/** An inbox, not an archive. */
const MAX_ALERTS = 100;

export interface NotifyInput {
  kind: AlertKind;
  title: string;
  body: string;
  href?: string;
  tone?: Alert['tone'];
  /** Set false for something the agent chose to do themselves. */
  email?: boolean;
}

/**
 * Record a notice against an account and send it if it should be sent.
 *
 * Never throws. A notification that fails must not turn a completed moderation
 * decision into an error the officer retries.
 */
export async function notify(account: PublicAccount, input: NotifyInput): Promise<void> {
  try {
    const workspace = await loadWorkspace(account);

    const alert: Alert = {
      id: randomUUID().slice(0, 12),
      at: new Date().toISOString(),
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href,
      tone: input.tone ?? 'info',
      read: false,
    };

    await patchWorkspace(account, {
      alerts: [alert, ...(workspace.alerts ?? [])].slice(0, MAX_ALERTS),
    });

    const wantsEmail = ALWAYS_EMAIL.includes(input.kind)
      || (workspace.notifications[input.kind]?.email ?? false);
    if (input.email === false || !wantsEmail) return;

    await send({
      to: account.email,
      subject: input.title,
      body: [
        `Hello ${preferredName(workspace.profile.fullName || account.fullName)},`,
        '',
        input.body,
        ...(input.href ? ['', `Open it here: ${input.href}`] : []),
        '',
        'V-RENT',
      ].join('\n'),
    });
  } catch (err) {
    console.error('[v-rent] notification failed', err);
  }
}
